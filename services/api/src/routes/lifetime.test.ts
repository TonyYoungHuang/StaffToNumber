import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import rawBody from "fastify-raw-body";
import Stripe from "stripe";

// Local fixtures only. These strings cannot authorize Stripe network calls.
process.env.STRIPE_SECRET_KEY = "sk_test_LocalLifetimeFixture";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_local_lifetime_fixture";
process.env.STRIPE_TEST_ONLY = "true";
process.env.STRIPE_LIFETIME_AUTOMATIC_TAX = "false";
process.env.POSTGRES_URL = "";
process.env.RESEND_API_KEY = "";
const { db, initDb } = await import("../db.js");
const { config } = await import("../config.js");
const { paymentWebhookRoutes } = await import("./payment-webhooks.js");
const { paymentRoutes } = await import("./payments.js");
const { authPlugin } = await import("../plugins/auth.js");
const { createUser, createSession, getUserProfile, generateActivationCodes, redeemActivationCode } = await import("../repositories/auth-repository.js");
const { createPaymentOrder, attachStripeCheckoutSession, findPaymentOrderById, mapPaymentOrderForPublic } = await import("../repositories/payment-repository.js");
const { prepareOneTimePurchase, fulfillOneTimePurchase } = await import("../repositories/one-time-purchase-repository.js");
const { lifetimeForOrder } = await import("../repositories/lifetime-repository.js");
const { processLifetimeWebhook } = await import("../repositories/lifetime-repository.js");
const { proratedAnnualCredit, quoteAnnualUpgrade, stopAnnualRenewalAfterLifetimePayment } = await import("../repositories/lifetime-upgrade-repository.js");
const { hashPaymentOrderToken, buildStripeCheckoutSessionParams, getCheckoutPriceId, assertStripeTestSafety } = await import("../lib/payments.js");
const { getPlanQuotaUsage, assertStorageQuota, assertProcessingQuota, recordProcessingCredit } = await import("../lib/plan-quotas.js");
const { resolveRecognitionAccess } = await import("../lib/recognition-options.js");
const { getScoreExportOptions } = await import("../lib/score-export-options.js");
const { processBillingWebhookEvent } = await import("../repositories/billing-repository.js");
const { createJob } = await import("../repositories/job-repository.js");
const { createOmrImportScoreDocument, createScoreExportJob, createAudioTranscribeScoreDocument, retryScoreJob } = await import("../repositories/score-repository.js");
const { activeLifetimeEntitlement, assertAccountStorageQuota, claimWithLifetimeLimit, LifetimeRecognitionBusyError, releaseLifetimeRecognitionSlot, LifetimeRecognitionDeferredError } = await import("@score/runtime-database");
const { confirmedPurchaseEvent } = await import("@score/shared");
const stripe = new Stripe("sk_test_LocalLifetimeFixture");

function fixture(accountId?: string) {
  initDb();
  const userId = accountId ?? createUser(`${crypto.randomUUID()}@example.invalid`, "hash", "salt")!.id;
  const order = createPaymentOrder({ userId, provider: "stripe", billingKind: "one_time", checkoutPlanCode: "converter-pro-lifetime", entitlementDays: 0 })!;
  const id = `cs_test_${crypto.randomUUID()}`, intent = `pi_${crypto.randomUUID()}`;
  prepareOneTimePurchase(db, { orderId: order.id, userId, planCode: "converter-pro-lifetime", priceId: "price_lifetime_fixture" });
  attachStripeCheckoutSession(order.id, id, null);
  const metadata = { billingKind: "one_time", planCode: "converter-pro-lifetime", orderId: order.id, userId, priceId: "price_lifetime_fixture", orderTokenHash: hashPaymentOrderToken(order.public_token) };
  const session = { id, object: "checkout.session", mode: "payment", status: "complete", payment_status: "paid", amount_total: 9900, amount_subtotal: 9900, currency: "usd", payment_intent: intent, metadata };
  return { userId, order, session, intent };
}
async function server() {
  const app = Fastify();
  await app.register(rawBody, { global: false, encoding: false });
  await app.register(authPlugin);
  await app.register(paymentWebhookRoutes, { prefix: "/api" });
  await app.register(paymentRoutes, { prefix: "/api", paymentServices: {
    retrieveStripeCheckoutSession: async () => { throw new Error("Lifetime status checks must not grant access via provider polling."); },
    createStripeCheckoutSession: async (input: { orderId: string }) => ({ id: `cs_test_${input.orderId}`, url: "https://checkout.stripe.com/test-fixture" }) as Stripe.Checkout.Session,
    sendTransactionalEmail: async () => ({ mode: "console" as const }),
  } });
  const post = (type: string, object: unknown, options: { eventId?: string; valid?: boolean; live?: boolean } = {}) => {
    const payload = JSON.stringify({ id: options.eventId ?? `evt_${crypto.randomUUID()}`, object: "event", created: Math.floor(Date.now() / 1000), type, livemode: options.live ?? false, data: { object } });
    return app.inject({ method: "POST", url: "/api/webhooks/stripe", payload, headers: { "content-type": "application/json",
      "stripe-signature": stripe.webhooks.generateTestHeaderString({ payload, secret: options.valid === false ? "whsec_wrong_fixture" : process.env.STRIPE_WEBHOOK_SECRET! }) } });
  };
  return { app, post };
}

test("lifetime checkout is a separate $99 one-time Stripe plan; recurring prices and test guards survive", () => {
  config.stripeLifetimePriceId = "price_lifetime_fixture";
  config.stripeConverterProAnnualPriceId = "price_existing_annual";
  assert.equal(getCheckoutPriceId("stripe", "converter-pro-lifetime", "one_time"), "price_lifetime_fixture");
  assert.equal(getCheckoutPriceId("stripe", "converter-pro-lifetime", "subscription"), null);
  assert.equal(getCheckoutPriceId("paddle", "converter-pro-lifetime", "one_time"), null);
  assert.equal(getCheckoutPriceId("stripe", "converter-pro-annual", "subscription"), "price_existing_annual");
  const params = buildStripeCheckoutSessionParams({ orderId: "fixture", publicToken: "fixture", userId: "fixture", planCode: "converter-pro-lifetime", billingKind: "one_time", priceId: "price_lifetime_fixture" });
  assert.equal(params.automatic_tax?.enabled, false);
  const submitText = params.custom_text?.submit;
  assert.ok(submitText && submitText.message.includes("14 days"));
  assert.doesNotMatch(submitText.message, /applicable tax|undefined/);
  assert.equal(params.mode, "payment"); assert.equal(params.allow_promotion_codes, false); assert.equal(params.adaptive_pricing?.enabled, false);
  assert.equal(params.payment_intent_data?.metadata?.planCode, "converter-pro-lifetime");
  assert.equal(buildStripeCheckoutSessionParams({ orderId: "fixture", publicToken: "fixture", userId: "fixture", planCode: "converter-pro-lifetime", billingKind: "one_time", priceId: "price_lifetime_fixture" }, { managedPaymentsEnabled: true }).managed_payments, undefined);
  const key = config.stripeSecretKey;
  try { config.stripeSecretKey = "sk_live_fixture"; assert.throws(assertStripeTestSafety); } finally { config.stripeSecretKey = key; }
});

test("signed async fulfillment is atomic by event and session; browser status cannot create an entitlement", async () => {
  const f = fixture(), { app, post } = await server();
  try {
    const statusUrl = `/api/payments/orders/${f.order.id}?token=${f.order.public_token}&session_id=${f.session.id}`;
    const pending = await app.inject({ method: "GET", url: statusUrl });
    assert.equal(pending.statusCode, 200, pending.body);
    assert.equal(pending.json().verification.status, "waiting_fulfillment");
    assert.equal(confirmedPurchaseEvent(pending.json().order, pending.json().verification), null);
    assert.equal((await post("checkout.session.completed", f.session, { valid: false })).statusCode, 400);
    assert.equal((await post("checkout.session.completed", f.session, { live: true })).statusCode, 400);
    assert.equal((await post("checkout.session.completed", { ...f.session, payment_status: "unpaid" })).statusCode, 200);
    assert.equal((await post("checkout.session.completed", { ...f.session, payment_status: "no_payment_required", amount_total: 0 })).statusCode, 200);
    assert.equal(activeLifetimeEntitlement(db, f.userId), undefined);
    assert.equal(fulfillOneTimePurchase(db, f.session), null);
    for (const mutation of [{ amount_total: 9800 }, { currency: "eur" }, { mode: "subscription" }, { id: "cs_test_wrong" }, { metadata: { ...f.session.metadata, userId: "wrong" } }, { metadata: { ...f.session.metadata, orderTokenHash: "wrong" } }]) {
      assert.equal((await post("checkout.session.completed", { ...f.session, ...mutation })).statusCode, 400);
    }
    const eventId = `evt_${crypto.randomUUID()}`;
    const responses = await Promise.all([post("checkout.session.async_payment_succeeded", f.session, { eventId }), post("checkout.session.async_payment_succeeded", f.session, { eventId })]);
    for (const response of responses) assert.equal(response.statusCode, 200, response.body);
    assert.equal((await post("checkout.session.completed", f.session)).statusCode, 200);
    const entitlement = lifetimeForOrder(db, f.order.id)!;
    assert.equal(entitlement.status, "active"); assert.equal(entitlement.expires_at, null); assert.equal(entitlement.lifetime, 1);
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM lifetime_entitlements WHERE user_id = ?").get(f.userId) as { n: number }).n, 1);
    const ready = await app.inject({ method: "GET", url: statusUrl });
    assert.equal(ready.json().verification.status, "ready");
    assert.equal(confirmedPurchaseEvent(ready.json().order, ready.json().verification)?.transaction_id, f.intent);
    assert.equal(findPaymentOrderById(f.order.id)?.activation_code_id, null);
  } finally { await app.close(); }
});

for (const type of ["charge.refunded", "charge.dispute.created", "charge.dispute.funds_withdrawn"] as const) {
  for (const beforeGrant of [false, true]) test(`${type}: ${beforeGrant ? "revocation before grant" : "grant then revoke"} cannot be undone by replay`, async () => {
    const f = fixture(), { app, post } = await server();
    try {
      const revoke = { id: `ch_${crypto.randomUUID()}`, payment_intent: f.intent, amount: 9900, amount_refunded: 9900, metadata: {} };
      if (!beforeGrant) assert.equal((await post("checkout.session.completed", f.session)).statusCode, 200);
      assert.equal((await post(type, revoke)).statusCode, 200);
      assert.equal((await post("checkout.session.completed", f.session)).statusCode, 200);
      assert.equal((await post("checkout.session.async_payment_succeeded", f.session)).statusCode, 200);
      assert.equal(lifetimeForOrder(db, f.order.id)?.status, "revoked");
      assert.equal(activeLifetimeEntitlement(db, f.userId), undefined);
      assert.notEqual(getUserProfile(f.userId)?.entitlement.status, "active");
      const response = await app.inject({ method: "GET", url: `/api/payments/orders/${f.order.id}?token=${f.order.public_token}` });
      assert.equal(response.json().verification.status, "refunded");
      assert.equal(confirmedPurchaseEvent(response.json().order, response.json().verification), null);
    } finally { await app.close(); }
  });
}

test("partial refunds keep access; revoking one purchase leaves another active purchase intact", async () => {
  const f = fixture(), second = fixture(f.userId), { app, post } = await server();
  try {
    await post("checkout.session.completed", f.session);
    await post("charge.refunded", { id: "ch_partial", payment_intent: f.intent, amount: 9900, amount_refunded: 3000, metadata: {} });
    assert.equal(lifetimeForOrder(db, f.order.id)?.status, "active");
    assert.ok(db.prepare("SELECT event_id FROM lifetime_webhook_events WHERE payment_intent_id = ? AND outcome = 'partial_refund_kept'").get(f.intent));
    await post("checkout.session.completed", second.session);
    await post("charge.refunded", { id: "ch_full", payment_intent: f.intent, amount: 9900, amount_refunded: 9900, metadata: {} });
    assert.equal(getUserProfile(f.userId)?.entitlement.status, "active");
    assert.equal(activeLifetimeEntitlement(db, f.userId)?.source_order_id, second.order.id);
  } finally { await app.close(); }
});

test("subscription cancellation, month resets, and large usage never expire or charge lifetime access", async () => {
  const f = fixture(), { app, post } = await server();
  try {
    await post("checkout.session.completed", f.session);
    const sub = `sub_${crypto.randomUUID()}`;
    for (const status of ["active", "cancelled"] as const) processBillingWebhookEvent(db, {
      provider: "stripe", eventId: `evt_${crypto.randomUUID()}`, eventType: "customer.subscription.updated", eventAt: new Date().toISOString(), rawPayload: "local fixture",
      authoritativeSubscription: true, subscription: { providerSubscriptionId: sub, userId: f.userId, status, planRef: "price_existing_annual", currentPeriodEnd: "2020-01-01T00:00:00.000Z" },
    });
    assert.equal(getUserProfile(f.userId)?.entitlement.source, "lifetime");
    assert.equal(getUserProfile(f.userId)?.entitlement.endsAt, null);
    for (const at of [new Date(), new Date("2099-01-01")]) assert.equal(getPlanQuotaUsage(f.userId, at).creditMode, "unlimited");
    assert.doesNotThrow(() => assertProcessingQuota(f.userId, false, 1_000_000));
    assert.doesNotThrow(() => assertStorageQuota(f.userId, 100_000_000_000));
    assert.doesNotThrow(() => assertAccountStorageQuota(db, f.userId, 100_000_000_000));
    assert.equal(resolveRecognitionAccess(f.userId, "complex").creditCost, 0);
    assert.equal(resolveRecognitionAccess(f.userId, "simple").creditSource, "lifetime");
    const exportQuote = getScoreExportOptions(f.userId, "unused-fixture");
    assert.ok(exportQuote.options.every(option => option.canSubmit && option.creditCost === 0));
    recordProcessingCredit(f.userId, "score", "fixture-unmetered", getPlanQuotaUsage(f.userId), 2000);
    assert.equal(db.prepare("SELECT job_id FROM prepaid_credit_charges WHERE job_id = 'fixture-unmetered'").get(), undefined);
    await post("charge.refunded", { id: "ch_full", payment_intent: f.intent, amount: 9900, amount_refunded: 9900, metadata: {} });
    assert.equal(getPlanQuotaUsage(f.userId).jobs.used, 0, "unmetered work must never become retroactive monthly usage");
  } finally { await app.close(); }
});

test("lifetime admits at most 3 queued legacy jobs and claims only one", async () => {
  const f = fixture(), { app, post } = await server();
  try {
    await post("checkout.session.completed", f.session);
    const file = crypto.randomUUID(), now = new Date().toISOString();
    db.prepare(`INSERT INTO files (id,user_id,original_name,stored_name,storage_path,mime_type,size_bytes,file_kind,created_at)
      VALUES (?,?,'fixture.pdf','fixture.pdf','fixture','application/pdf',1,'source_pdf',?)`).run(file, f.userId, now);
    const enqueue = () => createJob({ userId: f.userId, inputFileId: file, direction: "staff_pdf_to_numbered" })!;
    const first = enqueue(), second = enqueue(); enqueue();
    assert.throws(enqueue, LifetimeRecognitionBusyError);
    const claim = (id: string) => db.prepare("UPDATE jobs SET status = 'processing' WHERE id = ? AND status = 'queued' RETURNING id, user_id").get(id);
    assert.ok(claimWithLifetimeLimit(db, "legacy", first.id, claim));
    enqueue();
    assert.throws(enqueue, LifetimeRecognitionBusyError);
    assert.throws(() => claimWithLifetimeLimit(db, "legacy", second.id, claim), LifetimeRecognitionDeferredError);
    const polled = claimWithLifetimeLimit(db, "legacy", undefined, claim) as { user_id: string } | undefined;
    assert.notEqual(polled?.user_id, f.userId, "Polling may claim other accounts, never a second recognition for this account");
    db.prepare("UPDATE jobs SET status = 'completed' WHERE id = ?").run(first.id);
    releaseLifetimeRecognitionSlot(db, "legacy", first.id);
    assert.ok(claimWithLifetimeLimit(db, "legacy", second.id, claim));
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE user_id = ? AND status = 'processing'").get(f.userId) as { n: number }).n, 1);
    assert.equal(getPlanQuotaUsage(f.userId).jobs.used, 0);
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM lifetime_unmetered_jobs WHERE user_id = ?").get(f.userId) as { n: number }).n, 4);
  } finally { await app.close(); }
});

test("real OMR submission accepts zero credits and shares queue/concurrency limits with legacy recognition", async () => {
  const f = fixture(), { app, post } = await server();
  try {
    const code = generateActivationCodes({ planCode: "credits-50", quantity: 1, entitlementDays: 30 }).codes[0]!;
    assert.ok(redeemActivationCode(f.userId, code.code).ok);
    await post("checkout.session.completed", f.session);
    const file = crypto.randomUUID(), now = new Date().toISOString();
    db.prepare(`INSERT INTO files (id,user_id,original_name,stored_name,storage_path,mime_type,size_bytes,file_kind,created_at)
      VALUES (?,?,'fixture.pdf','fixture.pdf','fixture','application/pdf',1,'source_pdf',?)`).run(file, f.userId, now);
    const enqueue = () => createOmrImportScoreDocument({ userId: f.userId, title: "Lifetime fixture", sourceFileId: file,
      sourceFileKind: "source_pdf", sourceOriginalName: "fixture.pdf", recognitionMode: "complex", expectedCreditCost: 0 });
    const first = enqueue().job!;
    const params = JSON.parse(first.params_json!);
    assert.equal(params.creditCost, 0); assert.equal(params.creditSource, "lifetime");
    const exported = createScoreExportJob({ userId: f.userId, documentId: first.document_id!, params: { format: "pdf" } })!;
    assert.equal(JSON.parse(exported.params_json!).creditCost, 0);
    db.prepare("UPDATE score_jobs SET status = 'completed' WHERE id = ?").run(exported.id);
    const legacy = createJob({ userId: f.userId, inputFileId: file, direction: "staff_pdf_to_numbered" })!;
    enqueue();
    assert.throws(enqueue, LifetimeRecognitionBusyError);
    assert.throws(() => createAudioTranscribeScoreDocument({ userId: f.userId, title: "Audio fixture", sourceFileId: file, sourceOriginalName: "fixture.wav" }), LifetimeRecognitionBusyError);
    const claimScore = (id: string) => db.prepare("UPDATE score_jobs SET status = 'processing' WHERE id = ? AND status = 'queued' RETURNING id, user_id").get(id);
    const claimLegacy = (id: string) => db.prepare("UPDATE jobs SET status = 'processing' WHERE id = ? AND status = 'queued' RETURNING id, user_id").get(id);
    assert.ok(claimWithLifetimeLimit(db, "score", first.id, claimScore));
    assert.throws(() => claimWithLifetimeLimit(db, "legacy", legacy.id, claimLegacy), LifetimeRecognitionDeferredError);
    enqueue();
    assert.throws(enqueue, LifetimeRecognitionBusyError);
    db.prepare("UPDATE score_jobs SET status = 'failed' WHERE id = ?").run(first.id);
    releaseLifetimeRecognitionSlot(db, "score", first.id);
    assert.ok(claimWithLifetimeLimit(db, "legacy", legacy.id, claimLegacy));
    const polled = claimWithLifetimeLimit(db, "score", undefined, claimScore) as { user_id: string } | undefined;
    assert.notEqual(polled?.user_id, f.userId, "Polling may claim other accounts, never a second recognition for this account");
    assert.equal(getPlanQuotaUsage(f.userId).jobs.used, 0);
    assert.equal(getPlanQuotaUsage(f.userId).prepaid.remaining, 50, "Lifetime recognition and exports leave prepaid credits intact");
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM prepaid_credit_charges WHERE user_id = ?").get(f.userId) as { n: number }).n, 0);
    await post("charge.refunded", { id: "ch_revoke", payment_intent: f.intent, amount: 9900, amount_refunded: 9900, metadata: {} });
    db.prepare("UPDATE score_jobs SET status = 'failed' WHERE id = ?").run(exported.id);
    const retry = retryScoreJob({ jobId: exported.id, userId: f.userId, documentId: first.document_id! });
    assert.ok(retry);
    assert.equal(getPlanQuotaUsage(f.userId).prepaid.remaining, 49, "A new attempt after revocation uses the existing paid balance");
  } finally { await app.close(); }
});

test("authenticated lifetime checkout accepts existing subscribers without cancelling or changing their annual plan", async () => {
  const f = fixture(), { app } = await server();
  config.paymentProviders = ["stripe"];
  config.stripeLifetimePriceId = "price_lifetime_fixture";
  const token = crypto.randomUUID(); createSession(f.userId, token, 1);
  processBillingWebhookEvent(db, { provider: "stripe", eventId: crypto.randomUUID(), eventType: "subscription.updated", rawPayload: "fixture",
    subscription: { providerSubscriptionId: crypto.randomUUID(), userId: f.userId, status: "active", currentPeriodEnd: "2099-01-01T00:00:00.000Z" } });
  try {
    const response = await app.inject({ method: "POST", url: "/api/payments/checkout/authenticated", headers: { authorization: `Bearer ${token}`, "idempotency-key": crypto.randomUUID() },
      payload: { provider: "stripe", planCode: "converter-pro-lifetime", billingKind: "one_time", locale: "en" } });
    assert.equal(response.statusCode, 201, response.body);
    const created = findPaymentOrderById(response.json().orderId)!;
    assert.equal(created.checkout_plan_code, "converter-pro-lifetime");
    assert.equal(created.billing_kind, "one_time");
    assert.equal(lifetimeForOrder(db, response.json().orderId), undefined);
    assert.equal(mapPaymentOrderForPublic(findPaymentOrderById(response.json().orderId)!).lifetime, null);
  } finally { await app.close(); }
});

test("annual credit floors fractional cents, clamps elapsed time and cannot make lifetime free", () => {
  assert.equal(proratedAnnualCredit(6000, 100, 400, 200), 4000);
  assert.equal(proratedAnnualCredit(100, 0, 3, 1), 66);
  assert.equal(proratedAnnualCredit(6000, 100, 400, 500), 0);
  assert.equal(proratedAnnualCredit(6000, 100, 400, 0), 6000);
  assert.equal(proratedAnnualCredit(50000, 100, 400, 100), 9899);
  assert.equal(proratedAnnualCredit(-1, 100, 400, 200), 0);
  assert.equal(proratedAnnualCredit(6000, 400, 100, 200), 0);
});

test("annual quotes use the actual paid current invoice and reject mismatched, refunded, unpaid or scheduled subscriptions", async () => {
  const f = fixture(), now = Math.floor(Date.now()/1000), stamp = new Date().toISOString();
  config.stripeConverterProAnnualPriceId = "price_annual_quote";
  const localCustomer = crypto.randomUUID(), subscriptionId = `sub_${crypto.randomUUID()}`;
  db.prepare("INSERT INTO billing_customers (id,provider,provider_customer_id,user_id,created_at,updated_at) VALUES (?,'stripe','cus_quote',?,?,?)").run(localCustomer, f.userId, stamp, stamp);
  db.prepare("INSERT INTO billing_subscriptions (id,provider,provider_subscription_id,customer_id,user_id,status,plan_ref,seat_quantity,created_at,updated_at) VALUES (?,'stripe',?,?,?,'active','price_annual_quote',1,?,?)")
    .run(crypto.randomUUID(), subscriptionId, localCustomer, f.userId, stamp, stamp);
  const subscription = { id: subscriptionId, customer: "cus_quote", livemode: false, status: "active", metadata: { userId: f.userId }, latest_invoice: "in_quote", schedule: null as string | null,
    items: { has_more: false, data: [{ quantity: 1, price: { id: "price_annual_quote", recurring: { interval: "year", interval_count: 1 } }, current_period_start: now - 1000, current_period_end: now + 1000 }] } };
  const invoice = { id: "in_quote", livemode: false, customer: "cus_quote", status: "paid", currency: "usd", amount_paid: 4000, amount_remaining: 0,
    parent: { subscription_details: { subscription: subscriptionId } }, lines: { has_more: false, data: [{ period: { start: now - 1000, end: now + 1000 }, parent: { subscription_item_details: { proration: false } } }] } };
  const charge = { livemode: false, customer: "cus_quote", paid: true, disputed: false, amount_refunded: 0, currency: "usd" };
  const client = { subscriptions: { retrieve: async () => subscription }, invoices: { retrieve: async () => invoice },
    invoicePayments: { list: async () => ({ has_more: false, data: [{ livemode: false, amount_paid: 4000, payment: { charge: "ch_quote" } }] }) },
    charges: { retrieve: async () => charge } } as unknown as Stripe;
  const request: typeof import("../lib/payments.js").stripeRequest = async operation => operation(client);
  const quote = await quoteAnnualUpgrade(db, f.userId, request);
  assert.equal(quote?.paidMinor, 4000); assert.ok(quote!.creditMinor <= 2000 && quote!.creditMinor >= 1990);
  charge.amount_refunded = 100; await assert.rejects(quoteAnnualUpgrade(db, f.userId, request), /Refunded/); charge.amount_refunded = 0;
  subscription.customer = "cus_other"; await assert.rejects(quoteAnnualUpgrade(db, f.userId, request), /ownership/); subscription.customer = "cus_quote";
  invoice.status = "open"; await assert.rejects(quoteAnnualUpgrade(db, f.userId, request), /invoice/); invoice.status = "paid";
  invoice.lines.data[0].period.end = now; await assert.rejects(quoteAnnualUpgrade(db, f.userId, request), /invoice/); invoice.lines.data[0].period.end = now + 1000;
  subscription.schedule = "sub_sched_test"; await assert.rejects(quoteAnnualUpgrade(db, f.userId, request), /review/);
});

test("annual renewal only stops after paid fulfillment; provider failures remain retryable and audited", async () => {
  const f = fixture();
  db.prepare(`INSERT INTO lifetime_upgrade_orders (order_id,user_id,customer_id,subscription_id,invoice_id,paid_minor,period_start,period_end,quoted_at,credit_minor,expires_at,state)
    VALUES (?,?,'cus_retry','sub_retry',?,6000,100,400,200,4000,500,'reserved')`).run(f.order.id, f.userId, `in_${f.order.id}`);
  let reads = 0, updates = 0, fail = true;
  const client = { subscriptions: {
    retrieve: async () => { reads++; return { id: "sub_retry", customer: "cus_retry", status: "active", cancel_at_period_end: false, livemode: false }; },
    update: async (_id: string, params: { cancel_at_period_end: boolean }, options: { idempotencyKey: string }) => {
      updates++; assert.equal(params.cancel_at_period_end, true); assert.equal(options.idempotencyKey, `lifetime-stop-renewal-${f.order.id}`);
      if (fail) throw new Error("temporary provider failure"); return { cancel_at_period_end: true };
    },
  } } as unknown as Stripe;
  const request: typeof import("../lib/payments.js").stripeRequest = async operation => operation(client);
  await stopAnnualRenewalAfterLifetimePayment(db, f.order.id, request);
  assert.equal(reads, 0); assert.equal(updates, 0);
  processLifetimeWebhook(db, { id: `evt_${crypto.randomUUID()}`, type: "checkout.session.completed", created: Math.floor(Date.now()/1000), data: { object: {
    ...f.session, customer: "cus_retry", amount_total: 5900, total_details: { amount_discount: 4000, amount_tax: 0 },
  } } } as unknown as Stripe.Event);
  await assert.rejects(stopAnnualRenewalAfterLifetimePayment(db, f.order.id, request), /temporary/);
  assert.equal(lifetimeForOrder(db, f.order.id)?.status, "active");
  assert.equal((db.prepare("SELECT renewal_error FROM lifetime_upgrade_orders WHERE order_id = ?").get(f.order.id) as { renewal_error: string }).renewal_error, "provider_retry_required");
  fail = false;
  await stopAnnualRenewalAfterLifetimePayment(db, f.order.id, request);
  await stopAnnualRenewalAfterLifetimePayment(db, f.order.id, request);
  assert.equal(updates, 2);
  const audit = db.prepare("SELECT renewal_stopped_at, renewal_error FROM lifetime_upgrade_orders WHERE order_id = ?").get(f.order.id) as { renewal_stopped_at: string; renewal_error: string | null };
  assert.ok(audit.renewal_stopped_at); assert.equal(audit.renewal_error, null);
});

test("lifetime with tax disabled requires exactly $99, zero tax and no unapproved discount", async () => {
  const f = fixture(), { app, post } = await server();
  try {
    for (const wrong of [
      { ...f.session, amount_subtotal: 9800, amount_total: 9900, total_details: { amount_tax: 100, amount_discount: 0 } },
      { ...f.session, amount_total: 9800, total_details: { amount_discount: 100, amount_tax: 0 } },
      { ...f.session, amount_total: 10700, total_details: { amount_discount: 0, amount_tax: 700 } },
      { ...f.session, amount_total: 10700, total_details: { amount_discount: 0, amount_tax: 800 } },
    ]) assert.equal((await post("checkout.session.completed", wrong)).statusCode, 400);
    assert.equal((await post("checkout.session.completed", { ...f.session, total_details: { amount_tax: 0, amount_discount: 0 } })).statusCode, 200);
    assert.equal(findPaymentOrderById(f.order.id)?.amount_minor, 9900);
    assert.equal((db.prepare("SELECT total_minor FROM lifetime_payment_amounts WHERE order_id = ?").get(f.order.id) as { total_minor: number }).total_minor, 9900);
  } finally { await app.close(); }
});

test("discounted fulfillment binds the reserved annual credit to its customer and keeps revocation effective beyond 14 days", () => {
  const f = fixture();
  db.prepare(`INSERT INTO lifetime_upgrade_orders (order_id,user_id,customer_id,subscription_id,invoice_id,paid_minor,period_start,period_end,quoted_at,credit_minor,expires_at,state)
    VALUES (?,?,'cus_upgrade','sub_upgrade',?,6000,100,400,200,4000,500,'reserved')`).run(f.order.id, f.userId, `in_${f.order.id}`);
  const event = (object: unknown) => ({ id: `evt_${crypto.randomUUID()}`, type: "checkout.session.completed", created: Math.floor(Date.now()/1000), data: { object } }) as Stripe.Event;
  const discounted = { ...f.session, customer: "cus_upgrade", amount_total: 5900, total_details: { amount_discount: 4000, amount_tax: 0 } };
  assert.throws(() => processLifetimeWebhook(db, event({ ...discounted, customer: "cus_other" })), /customer/);
  assert.throws(() => processLifetimeWebhook(db, event({ ...discounted, total_details: { amount_discount: 3999, amount_tax: 589 } })), /credit/);
  assert.throws(() => processLifetimeWebhook(db, event({ ...discounted, amount_total: 6490, total_details: { amount_discount: 4000, amount_tax: 590 } })), /tax/);
  processLifetimeWebhook(db, event(discounted));
  assert.equal(findPaymentOrderById(f.order.id)?.amount_minor, 5900);
  const mapped = mapPaymentOrderForPublic(findPaymentOrderById(f.order.id)!);
  assert.equal(confirmedPurchaseEvent(mapped, { status: "ready", canRetry: false, checkedAt: new Date().toISOString() } as never)?.value, 59);
  assert.equal((db.prepare("SELECT state FROM lifetime_upgrade_orders WHERE order_id = ?").get(f.order.id) as { state: string }).state, "paid");
  processLifetimeWebhook(db, { id: `evt_${crypto.randomUUID()}`, type: "charge.refunded", created: Math.floor(Date.now()/1000) + 30 * 86400,
    data: { object: { id: "ch_upgrade", payment_intent: f.intent, amount: 5900, amount_refunded: 5900 } } } as Stripe.Event);
  assert.equal(lifetimeForOrder(db, f.order.id)?.status, "revoked");
});
