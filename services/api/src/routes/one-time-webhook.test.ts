import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import rawBody from "fastify-raw-body";
import Stripe from "stripe";

// These credentials only sign local fixtures. No Stripe or email network calls.
process.env.STRIPE_SECRET_KEY = "sk_test_LocalFixture123456789012345678901234567890";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_local_fixture";
process.env.RESEND_API_KEY = "";
process.env.POSTGRES_URL = "";
const { db, initDb } = await import("../db.js");
const { paymentWebhookRoutes } = await import("./payment-webhooks.js");
const { createUser, getUserProfile } = await import("../repositories/auth-repository.js");
const { createPaymentOrder, attachStripeCheckoutSession, findPaymentOrderById } = await import("../repositories/payment-repository.js");
const { prepareOneTimePurchase, findOneTimePurchase } = await import("../repositories/one-time-purchase-repository.js");
const { getPlanQuotaUsage } = await import("../lib/plan-quotas.js");
const stripe = new Stripe("sk_test_local_fixture");

test("signed $2.99 payment delivers exactly one score pass, and refund revokes it without a subscription", async () => {
  initDb();
  const app = Fastify();
  await app.register(rawBody, { global: false, encoding: false });
  await app.register(paymentWebhookRoutes, { prefix: "/api" });
  const user = createUser(`${crypto.randomUUID()}@example.invalid`, "hash", "salt")!;
  const order = createPaymentOrder({ userId: user.id, provider: "stripe", billingKind: "one_time", entitlementDays: 0 })!;
  const metadata = { billingKind: "one_time", orderId: order.id, userId: user.id, planCode: "single-score" as const, priceId: "price_score_pass" };
  prepareOneTimePurchase(db, { orderId: order.id, userId: user.id, planCode: metadata.planCode, priceId: metadata.priceId });
  const id = `cs_${crypto.randomUUID()}`, intent = `pi_${crypto.randomUUID()}`;
  attachStripeCheckoutSession(order.id, id, null);
  const session = { id, object: "checkout.session", mode: "payment", status: "complete", payment_status: "paid", amount_total: 299, currency: "usd", payment_intent: intent, metadata };
  const post = (type: string, object: unknown) => {
    const payload = JSON.stringify({ id: `evt_${crypto.randomUUID()}`, object: "event", type, livemode: false, data: { object } });
    return app.inject({ method: "POST", url: "/api/webhooks/stripe", payload, headers: { "content-type": "application/json", "stripe-signature": stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_local_fixture" }) } });
  };
  try {
    assert.equal((await post("checkout.session.async_payment_succeeded", session)).statusCode, 200);
    assert.equal((await post("checkout.session.completed", session)).statusCode, 200);
    const profile = getUserProfile(user.id)!;
    assert.equal(profile.entitlement.status, "inactive");
    assert.equal(profile.scorePasses.length, 1); assert.equal(profile.scorePasses[0].remaining, 10);
    assert.equal(findPaymentOrderById(order.id)?.status, "paid");
    assert.equal(findPaymentOrderById(order.id)?.activation_code_id, null);
    assert.equal(findOneTimePurchase(db, order.id)?.ends_at, null);
    assert.equal((await post("charge.refunded", { id: "ch_pass", payment_intent: intent, amount: 299, amount_refunded: 299, metadata })).statusCode, 200);
    assert.equal(getUserProfile(user.id)!.scorePasses.length, 0);
    assert.equal((await post("checkout.session.completed", session)).statusCode, 200);
    assert.equal(getUserProfile(user.id)!.scorePasses.length, 0);
  } finally { await app.close(); }
});

test("signed delayed payment webhook opens account and quotas once; refund closes paid access", async () => {
  initDb();
  const app = Fastify();
  await app.register(rawBody, { global: false, encoding: false });
  await app.register(paymentWebhookRoutes, { prefix: "/api" });
  const user = createUser(`${crypto.randomUUID()}@example.invalid`, "hash", "salt")!;
  const order = createPaymentOrder({ userId: user.id, provider: "stripe", billingKind: "one_time", entitlementDays: 30 });
  assert.ok(order);
  const metadata = { billingKind: "one_time", orderId: order.id, userId: user.id, planCode: "converter-pro-monthly" as const, priceId: "price_pro_once" };
  prepareOneTimePurchase(db, { orderId: order.id, userId: user.id, planCode: metadata.planCode, priceId: metadata.priceId });
  attachStripeCheckoutSession(order.id, "cs_local_once", null);
  const session = { id: "cs_local_once", object: "checkout.session", mode: "payment", status: "complete", payment_status: "unpaid", amount_total: 1499, currency: "usd", payment_intent: "pi_local_once", metadata };
  const post = (type: string, object: unknown, valid = true) => {
    const payload = JSON.stringify({ id: `evt_${crypto.randomUUID()}`, object: "event", type, livemode: false, data: { object } });
    return app.inject({ method: "POST", url: "/api/webhooks/stripe", payload, headers: { "content-type": "application/json", "stripe-signature": stripe.webhooks.generateTestHeaderString({ payload, secret: valid ? "whsec_local_fixture" : "whsec_invalid" }) } });
  };
  try {
    assert.equal((await post("checkout.session.completed", session, false)).statusCode, 400);
    const unpaidResponse = await post("checkout.session.completed", session);
    assert.equal(unpaidResponse.statusCode, 200, unpaidResponse.body);
    assert.equal(findPaymentOrderById(order.id)?.status, "pending");
    assert.equal(getUserProfile(user.id)?.entitlement.status, "inactive");
    const paid = { ...session, payment_status: "paid" };
    const paidResponse = await post("checkout.session.async_payment_succeeded", paid);
    assert.equal(paidResponse.statusCode, 200, paidResponse.body);
    const end = findOneTimePurchase(db, order.id)?.ends_at;
    assert.ok(end);
    assert.equal(getUserProfile(user.id)?.entitlement.status, "active");
    assert.equal(getPlanQuotaUsage(user.id).jobs.limit, 200);
    assert.equal(getPlanQuotaUsage(user.id).storage.limitBytes, 500 * 1024 * 1024);
    assert.equal(findPaymentOrderById(order.id)?.activation_code_id, null);
    assert.equal((await post("checkout.session.completed", paid)).statusCode, 200);
    assert.equal(findOneTimePurchase(db, order.id)?.ends_at, end);
    assert.equal((await post("charge.refunded", { id: "ch_local", object: "charge", payment_intent: "pi_local_once", amount: 1499, amount_refunded: 1499, metadata })).statusCode, 200);
    assert.equal(getUserProfile(user.id)?.entitlement.status, "inactive");
    assert.equal(getPlanQuotaUsage(user.id).tier, "free");
    assert.equal((await post("checkout.session.completed", paid)).statusCode, 200);
    assert.equal(getUserProfile(user.id)?.entitlement.status, "inactive");
  } finally { await app.close(); }
});
