import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import type Stripe from "stripe";

process.env.STRIPE_SECRET_KEY = "sk_test_LocalFixture123456789012345678901234567890";
process.env.POSTGRES_URL = "";
process.env.RESEND_API_KEY = "";
const { config } = await import("../config.js");
const { db, initDb } = await import("../db.js");
const { paymentRoutes } = await import("./payments.js");
const { authPlugin } = await import("../plugins/auth.js");
const { createUser, createSession, getUserProfile } = await import("../repositories/auth-repository.js");
const { createPaymentOrder, attachStripeCheckoutSession, findPaymentOrderById } = await import("../repositories/payment-repository.js");
const { prepareOneTimePurchase, findOneTimePurchase, applyOneTimeRefund } = await import("../repositories/one-time-purchase-repository.js");
const { hashPaymentOrderToken } = await import("../lib/payments.js");
const { processBillingWebhookEvent } = await import("../repositories/billing-repository.js");
const { normalizeStripeBillingEvent } = await import("../lib/billing-events.js");
const { retryOperatorNotification } = await import("../lib/operator-notification.js");

function user() { return createUser(`${crypto.randomUUID()}@example.invalid`, "hash", "salt")!; }
function session(value: object) { return value as Stripe.Checkout.Session; }

test("operator notification retries twice without throwing into checkout", async () => {
  let attempts = 0;
  let warnings = 0;
  // Keep the retry timer referenced for this isolated unit test.
  const keepAlive = setTimeout(() => {}, 1_000);
  try {
    await retryOperatorNotification({ orderId: "local-order", retryDelayMs: 1, log: { warn: () => { warnings += 1; } }, send: async () => { attempts += 1; throw new Error("mail unavailable"); } });
    assert.equal(attempts, 2);
    assert.equal(warnings, 2);
  } finally { clearTimeout(keepAlive); }
});

test("authenticated Stripe checkout opens even when notification rejects or never settles, and retries reuse the order", async () => {
  initDb();
  config.paymentProviders = ["stripe"];
  config.stripeSingleScorePriceId = "price_local_pass";
  const account = user();
  const token = crypto.randomUUID();
  createSession(account.id, token, 1);
  let created = 0;
  let delivery: "failed" | "pending" = "failed";
  const app = Fastify();
  await app.register(authPlugin);
  await app.register(paymentRoutes, { prefix: "/api", paymentServices: {
    createStripeCheckoutSession: async (input: { orderId: string }) => { created += 1; return session({ id: `cs_${input.orderId}`, url: "https://checkout.stripe.com/local-fixture" }); },
    sendTransactionalEmail: async () => {
      if (delivery === "failed") throw new Error("local mail failure");
      return new Promise<never>(() => {});
    },
  } });
  const submit = (key: string) => app.inject({ method: "POST", url: "/api/payments/checkout/authenticated", headers: { authorization: `Bearer ${token}`, "idempotency-key": key }, payload: { provider: "stripe", billingKind: "one_time", planCode: "single-score", locale: "zh-CN" } });
  try {
    assert.equal((await app.inject({ method: "POST", url: "/api/payments/checkout/authenticated", payload: { provider: "stripe" } })).statusCode, 401);
    const first = await submit("local-notification-failed");
    assert.equal(first.statusCode, 201, first.body);
    assert.equal(first.json().url, "https://checkout.stripe.com/local-fixture");
    assert.equal(findPaymentOrderById(first.json().orderId)?.status, "pending");
    assert.equal((await submit("local-notification-failed")).json().orderId, first.json().orderId);
    assert.equal(created, 1);
    delivery = "pending";
    const stalledMail = await Promise.race([submit("local-notification-stalled"), new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error("checkout blocked by email")), 1_000); timer.unref(); })]);
    assert.equal(stalledMail.statusCode, 201, stalledMail.body);
    assert.equal(created, 2);
  } finally { await app.close(); }
});

test("order verification separates unpaid, unavailable provider and paid fulfillment failure, then safely retries one pass", async () => {
  initDb();
  const account = user();
  const order = createPaymentOrder({ userId: account.id, provider: "stripe", billingKind: "one_time", entitlementDays: 0 })!;
  prepareOneTimePurchase(db, { orderId: order.id, userId: account.id, planCode: "single-score", priceId: "price_local_pass" });
  attachStripeCheckoutSession(order.id, "cs_local_recovery", null);
  let state: "unpaid" | "network" | "bad-currency" | "paid" = "unpaid";
  const paid = { id: "cs_local_recovery", object: "checkout.session", mode: "payment", status: "complete", payment_status: "paid", amount_total: 299, currency: "usd", payment_intent: "pi_recovery_local", metadata: { billingKind: "one_time", planCode: "single-score", orderId: order.id, orderTokenHash: hashPaymentOrderToken(order.public_token), userId: account.id, priceId: "price_local_pass" } };
  const app = Fastify();
  await app.register(authPlugin);
  await app.register(paymentRoutes, { prefix: "/api", paymentServices: {
    retrieveStripeCheckoutSession: async () => {
      if (state === "network") throw new Error("provider unavailable");
      return session({ ...paid, ...(state === "unpaid" ? { payment_status: "unpaid" } : state === "bad-currency" ? { currency: "eur" } : {}) });
    },
  } });
  const url = `/api/payments/orders/${order.id}?token=${order.public_token}&provider=stripe`;
  try {
    assert.equal((await app.inject({ method: "GET", url: url.replace(order.public_token, "wrong-token") })).statusCode, 404);
    assert.equal((await app.inject({ method: "GET", url })).json().verification.status, "waiting_payment");
    state = "network";
    assert.equal((await app.inject({ method: "GET", url })).json().verification.status, "verification_failed");
    state = "bad-currency";
    const failed = (await app.inject({ method: "GET", url })).json();
    assert.equal(failed.verification.status, "fulfillment_failed");
    assert.equal(failed.verification.retryable, true);
    assert.equal(failed.order.status, "pending");
    state = "paid";
    const retries = await Promise.all(Array.from({ length: 5 }, () => app.inject({ method: "GET", url })));
    for (const retry of retries) { assert.equal(retry.json().verification.status, "ready"); assert.equal(retry.json().order.status, "paid"); }
    const count = db.prepare("SELECT count(*) AS count FROM score_passes WHERE purchase_id = ?").get(order.id) as { count: number };
    assert.equal(count.count, 1);
    const paidAt = findOneTimePurchase(db, order.id)?.paid_at;
    assert.equal((await app.inject({ method: "GET", url })).json().verification.status, "ready");
    assert.equal(findOneTimePurchase(db, order.id)?.paid_at, paidAt);
    applyOneTimeRefund(db, { payment_intent: paid.payment_intent, amount: 299, amount_refunded: 299, metadata: paid.metadata });
    assert.equal((await app.inject({ method: "GET", url })).json().verification.status, "refunded");
    assert.equal(findOneTimePurchase(db, order.id)?.status, "refunded");
  } finally { await app.close(); }
});

test("paid subscription retry repairs from current Stripe state while retaining processed webhook records", async () => {
  initDb();
  const account = user();
  const order = createPaymentOrder({ userId: account.id, provider: "stripe", billingKind: "subscription", entitlementDays: 0 })!;
  attachStripeCheckoutSession(order.id, "cs_local_sub_recovery", null);
  let status = "incomplete";
  const subscription = () => ({ id: `sub_${order.id}`, customer: `cus_${account.id}`, status, metadata: { orderId: order.id, userId: account.id, priceId: "price_local_starter" }, items: { data: [{ price: { id: "price_local_starter" }, quantity: 1, current_period_start: Math.floor(Date.now() / 1000) - 60, current_period_end: Math.floor(Date.now() / 1000) + 3600 }] } });
  const original = { id: `evt_original_${order.id}`, type: "customer.subscription.updated", data: { object: subscription() } };
  processBillingWebhookEvent(db, normalizeStripeBillingEvent(original, Buffer.from(JSON.stringify(original)))!);
  const originalRow = () => db.prepare("SELECT status, payload_sha256, attempts FROM billing_webhook_events WHERE provider_event_id = ?").get(original.id);
  const before = originalRow();
  const app = Fastify();
  await app.register(authPlugin);
  await app.register(paymentRoutes, { prefix: "/api", paymentServices: {
    retrieveStripeCheckoutSession: async () => session({ id: "cs_local_sub_recovery", customer: `cus_${account.id}`, subscription: `sub_${order.id}`, mode: "subscription", status: "complete", payment_status: "paid", amount_total: 1499, currency: "usd", metadata: { orderId: order.id, userId: account.id, orderTokenHash: hashPaymentOrderToken(order.public_token) } }),
    retrieveStripeSubscription: async () => subscription() as unknown as Stripe.Subscription,
  } });
  const url = `/api/payments/orders/${order.id}?token=${order.public_token}&provider=stripe`;
  try {
    assert.equal((await app.inject({ method: "GET", url })).json().verification.status, "fulfillment_failed");
    status = "active";
    const recovered = (await app.inject({ method: "GET", url })).json();
    assert.equal(recovered.verification.status, "ready");
    assert.equal(recovered.order.status, "paid");
    assert.equal(getUserProfile(account.id)?.entitlement.status, "active");
    assert.deepEqual(originalRow(), before);
    assert.equal((await app.inject({ method: "GET", url })).json().verification.status, "ready");
    assert.deepEqual(originalRow(), before);
    status = "canceled";
    const cancelled = (await app.inject({ method: "GET", url })).json();
    assert.equal(cancelled.verification.status, "fulfillment_failed");
    assert.equal(getUserProfile(account.id)?.entitlement.status, "inactive");
    assert.deepEqual(originalRow(), before);
    assert.equal((await app.inject({ method: "GET", url })).json().verification.status, "fulfillment_failed");
    assert.equal(getUserProfile(account.id)?.entitlement.status, "inactive");
  } finally { await app.close(); }
});

test("a modern paid one-time session without its prepared purchase cannot fall back to legacy activation", async () => {
  initDb();
  const account = user();
  const order = createPaymentOrder({ userId: account.id, provider: "stripe", billingKind: "one_time", entitlementDays: 7 })!;
  attachStripeCheckoutSession(order.id, "cs_missing_purchase", null);
  const app = Fastify();
  await app.register(authPlugin);
  await app.register(paymentRoutes, { prefix: "/api", paymentServices: {
    retrieveStripeCheckoutSession: async () => session({ id: "cs_missing_purchase", mode: "payment", status: "complete", payment_status: "paid", amount_total: 299, currency: "usd", metadata: { billingKind: "one_time", planCode: "single-score", orderId: order.id, userId: account.id, priceId: "price_local_pass", orderTokenHash: hashPaymentOrderToken(order.public_token) } }),
  } });
  try {
    const result = (await app.inject({ method: "GET", url: `/api/payments/orders/${order.id}?token=${order.public_token}&provider=stripe` })).json();
    assert.equal(result.verification.status, "fulfillment_failed");
    assert.equal(result.order.status, "pending");
    assert.equal(findPaymentOrderById(order.id)?.activation_code_id, null);
    assert.equal(getUserProfile(account.id)?.entitlement.status, "inactive");
  } finally { await app.close(); }
});

test("expired unpaid Stripe sessions end as cancelled instead of waiting forever", async () => {
  initDb();
  const account = user();
  const order = createPaymentOrder({ userId: account.id, provider: "stripe", billingKind: "one_time", entitlementDays: 0 })!;
  attachStripeCheckoutSession(order.id, "cs_expired_local", null);
  const app = Fastify();
  await app.register(authPlugin);
  await app.register(paymentRoutes, { prefix: "/api", paymentServices: {
    retrieveStripeCheckoutSession: async () => session({ id: "cs_expired_local", mode: "payment", status: "expired", payment_status: "unpaid", amount_total: 299, currency: "usd", metadata: { orderId: order.id, orderTokenHash: hashPaymentOrderToken(order.public_token) } }),
  } });
  try {
    const result = (await app.inject({ method: "GET", url: `/api/payments/orders/${order.id}?token=${order.public_token}&provider=stripe` })).json();
    assert.equal(result.verification.status, "cancelled");
    assert.equal(result.verification.retryable, false);
    assert.equal(result.order.status, "cancelled");
    assert.equal(getUserProfile(account.id)?.entitlement.status, "inactive");
  } finally { await app.close(); }
});
