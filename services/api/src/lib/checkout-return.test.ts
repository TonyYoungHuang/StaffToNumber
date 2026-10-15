import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import { normalizeCheckoutReturnState, resolveCheckoutReturnContext, validateCheckoutReturnPath } from "@score/shared";
import { db, initDb } from "../db.js";
import { createSession, createUser } from "../repositories/auth-repository.js";
import { createPaymentOrder, findPaymentOrderById, attachPaddleTransaction } from "../repositories/payment-repository.js";
import { authPlugin } from "../plugins/auth.js";
import { paymentRoutes } from "../routes/payments.js";
import { CHECKOUT_RETURN_TOKEN_TTL_MS, consumeCheckoutReturnToken, issueCheckoutReturnToken, orderCheckoutReturnContext, validateCheckoutReturn } from "./checkout-return.js";
import { PAYMENT_RETURN_COLUMNS } from "./score-pass-schema.js";
import { config } from "../config.js";
import type Stripe from "stripe";

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
