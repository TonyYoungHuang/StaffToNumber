import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import { normalizeCheckoutReturnState, resolveCheckoutReturnContext, validateCheckoutReturnPath } from "@score/shared";
import { db, initDb } from "../db.js";
import { createSession, createUser } from "../repositories/auth-repository.js";
import { createPaymentOrder, findPaymentOrderById, attachPaddleTransaction, type PaymentOrderRow } from "../repositories/payment-repository.js";
import { authPlugin } from "../plugins/auth.js";
import { paymentRoutes } from "../routes/payments.js";
import { CHECKOUT_RETURN_TOKEN_TTL_MS, checkoutReturnTokenHash, consumeCheckoutReturnToken, issueCheckoutReturnToken, recoverCheckoutReturnToken, orderCheckoutReturnContext, validateCheckoutReturn } from "./checkout-return.js";
import { PAYMENT_RETURN_COLUMNS } from "./score-pass-schema.js";
import { config } from "../config.js";
import type Stripe from "stripe";
import { buildStripeCheckoutSessionParams, buildStripeCheckoutRequestOptions, type createStripeCheckoutSession } from "./payments.js";

function fixture() {
  initDb();
  const user = createUser(`${randomUUID()}@example.invalid`, "hash", "salt")!;
  const auth = randomUUID(); createSession(user.id, auth, 1);
  const credential = issueCheckoutReturnToken();
  const order = createPaymentOrder({ userId: user.id, provider: "stripe", entitlementDays: 0,
    returnSite: "app", returnPath: "/scores?mode=scan#upload", returnStateJson: JSON.stringify({ version: 1, intent: "restore_view" }),
    returnTokenHash: credential.hash, returnTokenExpiresAt: credential.expiresAt })!;
  return { user, auth, credential, order };
}

test("return path retains query/hash while rejecting open redirects, encoded bypasses and checkout/login loops", () => {
  assert.equal(validateCheckoutReturnPath("app", "/scores/abc?part=violin&view=editor#export-center"), "/scores/abc?part=violin&view=editor#export-center");
  assert.equal(validateCheckoutReturnPath("www", "/zh-cn/pricing?cycle=annual#plans"), "/zh-cn/pricing?cycle=annual#plans");
  assert.equal(validateCheckoutReturnPath("app", "/scores?token=secret&part=one#export-center"), "/scores?part=one#export-center");
  for (const path of ["https://evil.invalid", "//evil.invalid/path", "/\\evil.invalid", "/%2f%2fevil.invalid", "/%252f%252fevil.invalid", "/scores%5c..%5ccheckout", "/scores/%2e%2e/checkout", "/scores\n", "/%63heckout/success", "/login?next=/scores", "/checkout/success", "/zh-cn/checkout/cancel", "/zh-CN/login", "/api/auth", "/scores/%00", "/scores?x=%0a"]) {
    assert.equal(validateCheckoutReturnPath(path.startsWith("/zh") ? "www" : "app", path), null, path);
  }
  assert.equal(validateCheckoutReturnPath("app", "/scores?x=" + "a".repeat(4096)), null);
});

test("versioned state limits fields/size and server values take precedence over local fallback", () => {
  assert.equal(normalizeCheckoutReturnState({ version: 2, intent: "restore_view" }), null);
  assert.equal(normalizeCheckoutReturnState({ version: 1, intent: "restore_view", arbitrary: "value" }), null);
  assert.equal(normalizeCheckoutReturnState({ version: 1, intent: "restore_view", panel: "unknown" }), null);
  assert.equal(normalizeCheckoutReturnState({ version: 1, intent: "restore_view", tab: "a".repeat(9000) }), null);
  const server = validateCheckoutReturn({ returnSite: "app", returnPath: "/scores/abc#export-center", returnState: { version: 1, intent: "continue_action", panel: "export-center" } }, "abc", true);
  const cached = validateCheckoutReturn({ returnSite: "app", returnPath: "/scores/stale" }, null, false);
  assert.equal(resolveCheckoutReturnContext(server, cached), server);
  assert.equal(resolveCheckoutReturnContext(null, cached), cached);
});

test("www success uses the app upload workbench, cancellation preserves origin, concrete actions return to the exact score", () => {
  const context = validateCheckoutReturn({ returnSite: "www", returnPath: "/features?cycle=annual#scan" }, null, false);
  assert.equal(context.successSite, "app"); assert.equal(context.successPath, "/scores");
  assert.equal(context.site, "www"); assert.equal(context.path, "/features?cycle=annual#scan");
  assert.equal(context.state.intent, "restore_view");
  const concrete = validateCheckoutReturn({ returnSite: "www", returnPath: "/pricing#one-score" }, "owned-score", true);
  assert.equal(concrete.successPath, "/scores/owned-score");
  const existing = validateCheckoutReturn({ returnSite: "app", returnPath: "/scores/owned-score?part=violin#export-center" }, "owned-score", true);
  assert.equal(existing.successPath, existing.path);
  assert.equal(validateCheckoutReturn({ returnSite: "app", returnPath: "/scores/owned-score/ensemble?part=violin#export-center" }, "owned-score", true).successPath, "/scores/owned-score/ensemble?part=violin#export-center");
});

test("return credential is hash-only, expires at 24 hours, and atomically consumes only for the original account", () => {
  const { user, credential, order } = fixture();
  assert.equal(order.return_token_hash, credential.hash); assert.notEqual(order.return_token_hash, credential.token);
  assert.ok(Math.abs(Date.parse(credential.expiresAt) - Date.now() - CHECKOUT_RETURN_TOKEN_TTL_MS) < 5000);
  assert.equal(consumeCheckoutReturnToken(db, order.id, randomUUID(), credential.token), false);
  assert.equal(consumeCheckoutReturnToken(db, order.id, user.id, "invalid"), false);
  assert.equal(consumeCheckoutReturnToken(db, order.id, user.id, credential.token, new Date(Date.parse(credential.expiresAt) + 1).toISOString()), false);
  assert.equal(consumeCheckoutReturnToken(db, order.id, user.id, credential.token), true);
  assert.equal(consumeCheckoutReturnToken(db, order.id, user.id, credential.token), false);
  assert.ok(orderCheckoutReturnContext(findPaymentOrderById(order.id)!));
});

test("Paddle callback credentials stay out of stored checkout URLs and recovered order snapshots", () => {
  const { credential, order } = fixture();
  const callback = new URL("https://scoretransposer.com/checkout/success");
  callback.searchParams.set("order_id", order.id); callback.searchParams.set("return_token", credential.token);
  const checkout = new URL("https://scoretransposer.com/checkout/paddle"); checkout.searchParams.set("success_url", callback.toString()); checkout.searchParams.set("_ptxn", "txn_local_fixture");
  const saved = attachPaddleTransaction(order.id, "txn_local_fixture", checkout.toString())!;
  assert.equal(saved.checkout_url!.includes(credential.token), false);
  assert.equal(new URL(new URL(saved.checkout_url!).searchParams.get("success_url")!).searchParams.has("return_token"), false);
  assert.equal(new URL(new URL(saved.checkout_url!).searchParams.get("success_url")!).searchParams.get("order_id"), order.id);
  assert.equal(saved.return_token_hash, credential.hash);
});

test("GET prefetch and login do not consume credentials; wrong-account and concurrent POST handoffs fail closed; owner can recover an expired/used link", async () => {
  const { user, auth, credential, order } = fixture();
  const stranger = createUser(`${randomUUID()}@example.invalid`, "hash", "salt")!, otherAuth = randomUUID(); createSession(stranger.id, otherAuth, 1);
  const app = Fastify(); await app.register(authPlugin); await app.register(paymentRoutes, { prefix: "/api" });
  try {
    const prefetched = await app.inject({ method: "GET", url: `/api/payments/orders/${order.id}?token=${order.public_token}`, headers: { purpose: "prefetch" } });
    assert.equal(prefetched.statusCode, 200);
    for (const field of ["returnContext", "intendedAction", "targetDocumentId", "continuation", "checkoutUrl", "customerEmail"]) assert.equal(prefetched.json().order[field], null, field);
    const wrongAccount = await app.inject({ method: "GET", url: `/api/payments/orders/${order.id}?token=${order.public_token}`, headers: { authorization: `Bearer ${otherAuth}` } });
    assert.equal(wrongAccount.statusCode, 200); assert.equal(wrongAccount.json().order.returnContext, null);
    const originalAccount = await app.inject({ method: "GET", url: `/api/payments/orders/${order.id}?token=${order.public_token}`, headers: { authorization: `Bearer ${auth}` } });
    assert.equal(originalAccount.json().order.returnContext.path, "/scores?mode=scan#upload");
    assert.equal(findPaymentOrderById(order.id)!.return_token_consumed_at, null);
    assert.equal((await app.inject({ method: "POST", url: `/api/payments/orders/${order.id}/return`, payload: { returnToken: credential.token } })).statusCode, 401);
    assert.equal((await app.inject({ method: "POST", url: `/api/payments/orders/${order.id}/return`, headers: { authorization: `Bearer ${otherAuth}` }, payload: { returnToken: credential.token } })).statusCode, 404);
    const replies = await Promise.all([1, 2].map(() => app.inject({ method: "POST", url: `/api/payments/orders/${order.id}/return`, headers: { authorization: `Bearer ${auth}` }, payload: { returnToken: credential.token } })));
    assert.deepEqual(replies.map(reply => reply.statusCode).sort(), [200, 409]);
    assert.equal((await app.inject({ method: "GET", url: `/api/payments/orders/${order.id}/owned`, headers: { authorization: `Bearer ${auth}` } })).json().order.returnContext.path, "/scores?mode=scan#upload");
    const recovered = await app.inject({ method: "POST", url: `/api/payments/orders/${order.id}/return`, headers: { authorization: `Bearer ${auth}` }, payload: {} });
    assert.equal(recovered.statusCode, 200); assert.equal(recovered.json().returnContext.path, "/scores?mode=scan#upload");
    assert.equal(recovered.headers["cache-control"], "no-store");
    assert.equal((await app.inject({ method: "GET", url: `/api/payments/orders/${order.id}/owned`, headers: { authorization: `Bearer ${otherAuth}` } })).statusCode, 404);
    assert.equal(user.id, findPaymentOrderById(order.id)!.user_id);
  } finally { await app.close(); }
});

test("fresh, 26-to-27 and already-run old 27 schema additions are repeatable without replacing existing order data", () => {
  const { order } = fixture();
  for (const version of [26, 27]) {
    db.exec("DROP INDEX IF EXISTS idx_payment_orders_checkout_intent");
    for (const column of PAYMENT_RETURN_COLUMNS) db.exec(`ALTER TABLE payment_orders DROP COLUMN ${column}`);
    db.exec(`PRAGMA user_version = ${version}`);
    initDb(); initDb();
    const columns = db.prepare("PRAGMA table_info(payment_orders)").all() as Array<{ name: string }>;
    for (const column of PAYMENT_RETURN_COLUMNS) assert.ok(columns.some(item => item.name === column), column);
    assert.equal(findPaymentOrderById(order.id)!.public_token, order.public_token);
    assert.equal((db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version, 27);
    for (const table of ["score_document_derivations", "score_upload_drafts"]) assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table));
  }
});

test("stable purchase intent recovers the original order across refresh, blocks context changes and never opens a new session after payment", async () => {
  const { auth } = fixture();
  config.paymentProviders = ["stripe"]; config.stripeSingleScorePriceId = "price_return_test";
  config.stripeSecretKey = "sk_test_LocalReturnFixture12345678901234567890";
  const intent = randomUUID(); let sessions = 0;
  const app = Fastify(); await app.register(authPlugin);
  await app.register(paymentRoutes, { prefix: "/api", paymentServices: {
    createStripeCheckoutSession: async () => { sessions += 1; return { id: `cs_${randomUUID()}`, url: "https://checkout.stripe.com/local-fixture" } as Stripe.Checkout.Session; },
    sendTransactionalEmail: async () => ({ mode: "preview" as const }),
  } });
  const headers = { authorization: `Bearer ${auth}`, "idempotency-key": intent };
  const payload = { provider: "stripe", planCode: "single-score", billingKind: "one_time", returnSite: "www", returnPath: "/pricing?cycle=annual#one-score", returnState: { version: 1, intent: "restore_view" } };
  try {
    const first = await app.inject({ method: "POST", url: "/api/payments/checkout/authenticated", headers, payload });
    assert.equal(first.statusCode, 201, first.body);
    const order = findPaymentOrderById(first.json().orderId)!;
    assert.equal(order.return_path, payload.returnPath); assert.ok(order.return_token_hash); assert.equal(order.return_token_hash!.includes(first.json().returnToken), false);
    const reloaded = await app.inject({ method: "GET", url: `/api/payments/orders/by-intent?provider=stripe&intent_id=${intent}`, headers });
    assert.equal(reloaded.statusCode, 200, reloaded.body); assert.equal(reloaded.json().orderId, order.id);
    assert.equal(reloaded.json().order.returnContext.successPath, "/scores");
    assert.equal((await app.inject({ method: "POST", url: "/api/payments/checkout/authenticated", headers, payload })).json().orderId, order.id);
    assert.equal((await app.inject({ method: "POST", url: "/api/payments/checkout/authenticated", headers, payload: { ...payload, returnPath: "/features#different" } })).statusCode, 409);
    db.prepare("UPDATE payment_orders SET status = 'paid', paid_at = ? WHERE id = ?").run(new Date().toISOString(), order.id);
    assert.equal((await app.inject({ method: "POST", url: "/api/payments/checkout/authenticated", headers, payload })).json().status, "paid");
    assert.equal(sessions, 1);
    const list = await app.inject({ method: "GET", url: "/api/payments/orders", headers });
    assert.ok(list.json().orders.some((item: { id: string; token: string }) => item.id === order.id && item.token === order.public_token));
  } finally { await app.close(); }
});

test("Paddle creates one transaction per durable order across concurrent requests and never retries an unknown provider outcome", async () => {
  const { auth } = fixture();
  config.paymentProviders = ["paddle"]; config.paddleStarterMonthlyPriceId = "pri_local_fixture";
  config.paddleApiKey = "pdl_local_fixture"; config.paddleDefaultPaymentLink = "https://scoretransposer.com/checkout/paddle";
  let started!: () => void, finish!: () => void;
  const entered = new Promise<void>(resolve => { started = resolve; });
  const release = new Promise<void>(resolve => { finish = resolve; });
  let calls = 0, unknownOutcome = false;
  const app = Fastify(); await app.register(authPlugin); await app.register(paymentRoutes, { prefix: "/api", paymentServices: {
    createPaddleTransaction: async () => {
      calls++;
      if (unknownOutcome) throw new Error("Simulated response lost after provider create.");
      started(); await release;
      return { id: "txn_localfixture123", status: "draft", checkout: { url: config.paddleDefaultPaymentLink } };
    },
    sendTransactionalEmail: async () => ({ mode: "preview" as const }),
  } });
  const intent = randomUUID();
  const payload = { provider: "paddle", planCode: "starter-monthly", billingKind: "subscription", returnSite: "www", returnPath: "/pricing#plans" };
  const headers = { authorization: `Bearer ${auth}`, "idempotency-key": intent };
  try {
    const firstPending = app.inject({ method: "POST", url: "/api/payments/checkout/authenticated", headers, payload });
    await entered;
    const concurrent = await app.inject({ method: "POST", url: "/api/payments/checkout/authenticated", headers, payload });
    assert.equal(concurrent.statusCode, 503, concurrent.body); assert.equal(concurrent.json().code, "CHECKOUT_PREPARATION_PENDING");
    finish();
    const first = await firstPending; assert.equal(first.statusCode, 201, first.body);
    const order = findPaymentOrderById(first.json().orderId)!;
    assert.ok(order.provider_checkout_started_at); assert.equal(calls, 1);
    assert.equal(order.checkout_url!.includes(first.json().returnToken), false);
    const replay = await app.inject({ method: "POST", url: "/api/payments/checkout/authenticated", headers, payload });
    assert.equal(replay.statusCode, 200); assert.equal(replay.json().orderId, order.id); assert.equal(calls, 1);
    assert.throws(() => attachPaddleTransaction(order.id, "txn_differentfixture", config.paddleDefaultPaymentLink), /different Paddle transaction/);
    unknownOutcome = true;
    const failedHeaders = { ...headers, "idempotency-key": randomUUID() };
    const failed = await app.inject({ method: "POST", url: "/api/payments/checkout/authenticated", headers: failedHeaders, payload });
    assert.equal(failed.statusCode, 500);
    const original = await app.inject({ method: "GET", url: `/api/payments/orders/by-intent?provider=paddle&intent_id=${failedHeaders["idempotency-key"]}`, headers: failedHeaders });
    assert.equal(original.statusCode, 200); assert.ok(original.json().order.providerCheckoutStartedAt);
    const unknownRetry = await app.inject({ method: "POST", url: "/api/payments/checkout/authenticated", headers: failedHeaders, payload });
    assert.equal(unknownRetry.statusCode, 503); assert.equal(calls, 2);
  } finally { finish(); await app.close(); }
});

test("Stripe lost-response recovery reconstructs the identical first request after restart while keeping the original credential expiry, locale and customer email", async () => {
  const { user, auth } = fixture();
  config.paymentProviders = ["stripe"]; config.stripeStarterMonthlyPriceId = "price_stripe_timeout_fixture";
  config.stripeSecretKey = "sk_test_LocalTimeoutFixture12345678901234567890"; config.stripeManagedPaymentsEnabled = false;
  const intent = randomUUID(), inputs: Array<Parameters<typeof createStripeCheckoutSession>[0]> = [], requests: unknown[] = [];
  let first = true;
  const service: typeof createStripeCheckoutSession = async input => {
    inputs.push(structuredClone(input));
    requests.push({ params: buildStripeCheckoutSessionParams(input), options: buildStripeCheckoutRequestOptions(input.orderId) });
    if (first) { first = false; throw new Error("Provider created the session; response was lost."); }
    return { id: "cs_original_timeout_fixture", url: "https://checkout.stripe.com/original-timeout-fixture" } as unknown as Awaited<ReturnType<typeof createStripeCheckoutSession>>;
  };
  const openApp = async () => { const app = Fastify(); await app.register(authPlugin); await app.register(paymentRoutes, { prefix: "/api", paymentServices: { createStripeCheckoutSession: service, sendTransactionalEmail: async () => ({ mode: "preview" as const }) } }); return app; };
  const headers = { authorization: `Bearer ${auth}`, "idempotency-key": intent };
  const payload = { provider: "stripe", planCode: "starter-monthly", billingKind: "subscription", locale: "fr", returnSite: "app", returnPath: "/scores?mode=scan#upload" };
  let app = await openApp();
  try {
    assert.equal((await app.inject({ method: "POST", url: "/api/payments/checkout/authenticated", headers, payload })).statusCode, 500);
    const saved = findPaymentOrderById(inputs[0].orderId)!;
    assert.ok(saved.provider_checkout_started_at); assert.ok(saved.provider_checkout_params_hash); assert.equal(saved.checkout_session_id, null);
    const originalToken = new URL(inputs[0].successUrl!).searchParams.get("return_token")!;
    assert.equal(saved.return_token_hash, checkoutReturnTokenHash(originalToken));
    assert.equal(JSON.stringify(saved).includes(originalToken), false);
    await app.close();
    db.prepare("UPDATE users SET email = ? WHERE id = ?").run(`${randomUUID()}@changed.test`, user.id);
    app = await openApp();
    const recovered = await app.inject({ method: "POST", url: "/api/payments/checkout/authenticated", headers, payload: { ...payload, locale: "ja" } });
    assert.equal(recovered.statusCode, 201, recovered.body); assert.equal(recovered.json().orderId, saved.id);
    assert.deepEqual(requests[1], requests[0]); assert.deepEqual(inputs[1], inputs[0]);
    assert.equal(inputs[1].locale, "fr"); assert.equal(inputs[1].customerEmail, saved.customer_email);
    assert.equal(recovered.json().returnToken, originalToken);
    const after = findPaymentOrderById(saved.id)!;
    assert.equal(after.return_token_expires_at, saved.return_token_expires_at);
    assert.equal(after.provider_checkout_started_at, saved.provider_checkout_started_at);
    assert.equal(after.provider_checkout_params_hash, saved.provider_checkout_params_hash);
    assert.equal(after.checkout_session_id, "cs_original_timeout_fixture");
  } finally { await app.close(); }
});

test("Stripe unknown checkout fails safely before another provider request after secret/config drift, expired idempotency retention or a missing original fingerprint", async () => {
  const { auth } = fixture();
  config.paymentProviders = ["stripe"]; config.stripeStarterMonthlyPriceId = "price_stripe_drift_fixture";
  config.stripeSecretKey = "sk_test_LocalOriginalFixture12345678901234567890"; config.stripeManagedPaymentsEnabled = false;
  const original = { secret: config.stripeSecretKey, price: config.stripeStarterMonthlyPriceId, site: config.publicSiteUrl };
  const intent = randomUUID(); let calls = 0, orderId = "";
  const app = Fastify(); await app.register(authPlugin); await app.register(paymentRoutes, { prefix: "/api", paymentServices: {
    createStripeCheckoutSession: async (input: Parameters<typeof createStripeCheckoutSession>[0]) => { calls++; orderId = input.orderId; throw new Error("Original provider result unknown."); },
    sendTransactionalEmail: async () => ({ mode: "preview" as const }),
  } });
  const headers = { authorization: `Bearer ${auth}`, "idempotency-key": intent };
  const payload = { provider: "stripe", planCode: "starter-monthly", billingKind: "subscription", returnSite: "app", returnPath: "/scores" };
  const retry = () => app.inject({ method: "POST", url: "/api/payments/checkout/authenticated", headers, payload });
  try {
    assert.equal((await retry()).statusCode, 500); assert.equal(calls, 1);
    const saved = findPaymentOrderById(orderId)!;
    config.stripeSecretKey = "sk_test_LocalRotatedFixture12345678901234567890";
    assert.equal(recoverCheckoutReturnToken({ secret: config.stripeSecretKey, orderId, hash: saved.return_token_hash, expiresAt: saved.return_token_expires_at }), null);
    assert.equal((await retry()).statusCode, 503); assert.equal(calls, 1); config.stripeSecretKey = original.secret;
    config.stripeStarterMonthlyPriceId = "price_changed_after_timeout";
    assert.equal((await retry()).statusCode, 503); assert.equal(calls, 1); config.stripeStarterMonthlyPriceId = original.price;
    config.stripeManagedPaymentsEnabled = true;
    assert.equal((await retry()).statusCode, 503); assert.equal(calls, 1); config.stripeManagedPaymentsEnabled = false;
    config.publicSiteUrl = "https://changed-origin.test";
    assert.equal((await retry()).statusCode, 503); assert.equal(calls, 1); config.publicSiteUrl = original.site;
    db.prepare("UPDATE payment_orders SET provider_checkout_started_at = ? WHERE id = ?").run(new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), orderId);
    assert.equal((await retry()).statusCode, 503); assert.equal(calls, 1);
    db.prepare("UPDATE payment_orders SET provider_checkout_started_at = ?, provider_checkout_params_hash = NULL WHERE id = ?").run(new Date().toISOString(), orderId);
    assert.equal((await retry()).statusCode, 503); assert.equal(calls, 1);
    assert.equal(findPaymentOrderById(orderId)!.checkout_session_id, null);
  } finally {
    config.stripeSecretKey = original.secret; config.stripeStarterMonthlyPriceId = original.price; config.publicSiteUrl = original.site; config.stripeManagedPaymentsEnabled = false;
    await app.close();
  }
});

test("mirror-only owner recovery restores the server view with atomic one-use handoff while never replaying a task, charging credits or calling a provider", async () => {
  const { user, auth, credential, order } = fixture();
  const documentId = randomUUID(), timestamp = new Date().toISOString();
  db.prepare("INSERT INTO score_documents (id,user_id,title,status,created_at,updated_at) VALUES (?,?,'Mirror recovery score','ready',?,?)").run(documentId, user.id, timestamp, timestamp);
  const mirror: PaymentOrderRow = { ...order, public_token: "", status: "paid", target_document_id: documentId,
    intended_action_json: JSON.stringify({ kind: "export", format: "pdf" }), return_path: `/scores/${documentId}?part=violin#export-center` };
  db.prepare("DELETE FROM payment_orders WHERE id = ?").run(order.id);
  const stranger = createUser(`${randomUUID()}@mirror-stranger.test`, "hash", "salt")!, strangerAuth = randomUUID(); createSession(stranger.id, strangerAuth, 1);
  let consumed = false, providerCalls = 0;
  const app = Fastify(); await app.register(authPlugin); await app.register(paymentRoutes, { prefix: "/api",
    paymentServices: { retrieveStripeCheckoutSession: async () => { providerCalls++; throw new Error("Mirror views must never call Stripe."); } },
    durableServices: {
      findById: async (id: string) => id === mirror.id ? { ...mirror } : undefined,
      findForPublic: async (id: string, token: string) => id === mirror.id && token === order.public_token ? { ...mirror, public_token: token } : undefined,
      consumeReturnToken: async (input: { orderId: string; userId: string; token: string; now?: string }) => {
        await Promise.resolve();
        if (input.orderId !== mirror.id || input.userId !== mirror.user_id || consumed || checkoutReturnTokenHash(input.token) !== mirror.return_token_hash || Date.parse(mirror.return_token_expires_at!) <= Date.now()) return false;
        consumed = true; mirror.return_token_consumed_at = new Date().toISOString(); return true;
      },
    },
  });
  const headers = { authorization: `Bearer ${auth}` }, wrong = { authorization: `Bearer ${strangerAuth}` };
  try {
    const prefetch = await app.inject({ method: "GET", url: `/api/payments/orders/${order.id}?token=${order.public_token}`, headers: { purpose: "prefetch" } });
    assert.equal(prefetch.statusCode, 200); assert.equal(prefetch.json().order.returnContext, null); assert.equal(consumed, false);
    assert.equal((await app.inject({ method: "GET", url: `/api/payments/orders/${order.id}/owned`, headers: wrong })).statusCode, 404);
    assert.equal((await app.inject({ method: "POST", url: `/api/payments/orders/${order.id}/return`, headers: wrong, payload: { returnToken: credential.token } })).statusCode, 404);
    const owned = await app.inject({ method: "GET", url: `/api/payments/orders/${order.id}/owned`, headers });
    assert.equal(owned.statusCode, 200); assert.equal(owned.json().order.mirrorOnly, true);
    assert.equal(owned.json().order.returnContext.path, mirror.return_path);
    assert.equal(owned.json().order.continuation.available, false);
    assert.equal(owned.json().order.continuation.result.code, "CHECKOUT_RECOVERY_ACTION_UNAVAILABLE");
    assert.equal(owned.json().verification.status, "waiting_fulfillment");
    const handoffs = await Promise.all([1, 2].map(() => app.inject({ method: "POST", url: `/api/payments/orders/${order.id}/return`, headers, payload: { returnToken: credential.token } })));
    assert.deepEqual(handoffs.map(response => response.statusCode).sort(), [200, 409]);
    assert.equal(handoffs.find(response => response.statusCode === 200)!.json().mirrorOnly, true);
    consumed = false; mirror.return_token_consumed_at = null; mirror.return_token_expires_at = new Date(Date.now() - 1).toISOString();
    assert.equal((await app.inject({ method: "POST", url: `/api/payments/orders/${order.id}/return`, headers, payload: { returnToken: credential.token } })).statusCode, 409);
    const recovered = await app.inject({ method: "POST", url: `/api/payments/orders/${order.id}/return`, headers, payload: {} });
    assert.equal(recovered.statusCode, 200); assert.equal(recovered.json().returnContext.path, mirror.return_path);
    mirror.resume_consumed_at = timestamp; mirror.resume_result_json = JSON.stringify({ documentId, job: { id: "job_already_created" } });
    const completed = await app.inject({ method: "GET", url: `/api/payments/orders/${order.id}/owned`, headers });
    assert.equal(completed.json().order.continuation.consumed, true); assert.equal(completed.json().order.continuation.result.job.id, "job_already_created");
    mirror.status = "pending";
    const pending = await app.inject({ method: "GET", url: `/api/payments/orders/${order.id}/owned`, headers });
    assert.equal(pending.json().verification.status, "verification_failed");
    assert.equal(findPaymentOrderById(order.id), undefined);
    assert.equal((db.prepare("SELECT count(*) AS n FROM score_jobs WHERE document_id = ?").get(documentId) as { n: number }).n, 0);
    assert.equal(providerCalls, 0);
  } finally { await app.close(); }
});
