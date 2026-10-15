import assert from "node:assert/strict";
import test from "node:test";
import { createHash, createHmac, randomUUID } from "node:crypto";
import Fastify from "fastify";
import rawBody from "fastify-raw-body";

// Local signatures only; no Paddle, Stripe, email or database network calls.
process.env.PADDLE_WEBHOOK_SECRET = "pdl_local_recovery_secret";
process.env.PADDLE_DEFAULT_PAYMENT_LINK = "https://scoretransposer.com/checkout/paddle";
process.env.PUBLIC_SITE_URL = "https://scoretransposer.com";
process.env.POSTGRES_URL = "";
process.env.RESEND_API_KEY = "";
const { db, initDb } = await import("../db.js");
const { paymentWebhookRoutes } = await import("./payment-webhooks.js");
const { createUser } = await import("../repositories/auth-repository.js");
const { createPaymentOrder, findPaymentOrderById } = await import("../repositories/payment-repository.js");

async function fixture(provider: "stripe" | "paddle" = "paddle") {
  initDb();
  const user = createUser(`${randomUUID()}@paddle-recovery.test`, "hash", "salt")!;
  const order = createPaymentOrder({ userId: user.id, provider, entitlementDays: 30, locale: "fr", billingKind: "subscription" })!;
  db.prepare("UPDATE payment_orders SET provider_checkout_started_at = ? WHERE id = ?").run(new Date().toISOString(), order.id);
  const app = Fastify(); await app.register(rawBody, { global: false, encoding: false }); await app.register(paymentWebhookRoutes, { prefix: "/api" });
  const transactionId = `txn_${randomUUID().replaceAll("-", "")}`;
  const transaction = { id: transactionId, status: "ready", custom_data: { orderId: order.id, userId: user.id, orderTokenHash: createHash("sha256").update(order.public_token).digest("hex") }, checkout: { url: "https://evil.invalid/collect?return_token=must-not-copy" } };
  const post = (eventType: string, data: unknown = transaction, valid = true) => {
    const payload = JSON.stringify({ event_id: `evt_${randomUUID()}`, event_type: eventType, occurred_at: new Date().toISOString(), data });
    const ts = String(Math.floor(Date.now() / 1000));
    const signature = createHmac("sha256", valid ? "pdl_local_recovery_secret" : "invalid_secret").update(`${ts}:${payload}`).digest("hex");
    return app.inject({ method: "POST", url: "/api/webhooks/paddle", payload, headers: { "content-type": "application/json", "paddle-signature": `ts=${ts};h1=${signature}` } });
  };
  return { app, user, order, transactionId, transaction, post };
}

test("signed Paddle lifecycle events recover the original lost checkout response and use configured safe URLs", async () => {
  const f = await fixture();
  try {
    for (const event of ["transaction.created", "transaction.ready", "transaction.updated"]) {
      const response = await f.post(event); assert.equal(response.statusCode, 200, response.body);
      const order = findPaymentOrderById(f.order.id)!;
      assert.equal(order.status, "pending"); assert.equal(order.transaction_id, f.transactionId);
      const checkout = new URL(order.checkout_url!);
      assert.equal(checkout.origin, "https://scoretransposer.com");
      assert.equal(checkout.pathname, "/fr/checkout/paddle");
      assert.equal(checkout.searchParams.get("_ptxn"), f.transactionId);
      assert.equal(checkout.searchParams.get("order_id"), f.order.id);
      const success = new URL(checkout.searchParams.get("success_url")!);
      assert.equal(success.origin, "https://scoretransposer.com");
      assert.equal(success.pathname, "/fr/checkout/success");
      assert.equal(success.searchParams.get("token"), f.order.public_token);
      assert.equal(success.searchParams.has("return_token"), false);
      assert.equal(order.checkout_url!.includes("evil.invalid"), false);
      assert.equal((db.prepare("SELECT COUNT(*) AS n FROM payment_orders WHERE user_id = ?").get(f.user.id) as { n: number }).n, 1);
    }
  } finally { await f.app.close(); }
});

test("signed lifecycle replay cannot replace an attached transaction and can repair only the same checkout URL", async () => {
  const f = await fixture();
  try {
    assert.equal((await f.post("transaction.created")).statusCode, 200);
    const original = findPaymentOrderById(f.order.id)!;
    const response = await f.post("transaction.updated", { ...f.transaction, id: "txn_different" });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(findPaymentOrderById(f.order.id)!.transaction_id, f.transactionId);
    assert.equal(findPaymentOrderById(f.order.id)!.checkout_url, original.checkout_url);
    db.prepare("UPDATE payment_orders SET checkout_url = NULL WHERE id = ?").run(f.order.id);
    assert.equal((await f.post("transaction.ready")).statusCode, 200);
    assert.equal(findPaymentOrderById(f.order.id)!.checkout_url, original.checkout_url);
  } finally { await f.app.close(); }
});

test("invalid signatures, foreign user metadata, other providers and already paid orders cannot recover a Paddle checkout", async () => {
  const f = await fixture(), stripe = await fixture("stripe");
  try {
    assert.equal((await f.post("transaction.created", f.transaction, false)).statusCode, 400);
    assert.equal(findPaymentOrderById(f.order.id)!.transaction_id, null);
    assert.equal((await f.post("transaction.created", { ...f.transaction, custom_data: { ...f.transaction.custom_data, userId: stripe.user.id } })).statusCode, 200);
    assert.equal(findPaymentOrderById(f.order.id)!.transaction_id, null);
    assert.equal((await stripe.post("transaction.created")).statusCode, 200);
    assert.equal(findPaymentOrderById(stripe.order.id)!.transaction_id, null);
    db.prepare("UPDATE payment_orders SET status = 'paid', paid_at = ? WHERE id = ?").run(new Date().toISOString(), f.order.id);
    assert.equal((await f.post("transaction.ready")).statusCode, 200);
    assert.equal(findPaymentOrderById(f.order.id)!.transaction_id, null);
  } finally { await Promise.all([f.app.close(), stripe.app.close()]); }
});

test("Paddle recovery requires the original creation claim and exact user and locator proof; legacy attachments remain unchanged", async () => {
  const f = await fixture();
  try {
    db.prepare("UPDATE payment_orders SET provider_checkout_started_at = NULL WHERE id = ?").run(f.order.id);
    assert.equal((await f.post("transaction.created")).statusCode, 200);
    assert.equal(findPaymentOrderById(f.order.id)!.transaction_id, null);
    db.prepare("UPDATE payment_orders SET provider_checkout_started_at = ? WHERE id = ?").run(new Date().toISOString(), f.order.id);
    for (const custom_data of [
      { orderId: f.order.id, orderTokenHash: f.transaction.custom_data.orderTokenHash },
      { orderId: f.order.id, userId: f.user.id },
      { ...f.transaction.custom_data, orderTokenHash: "0".repeat(64) },
      { ...f.transaction.custom_data, orderTokenHash: "invalid" },
    ]) {
      const response = await f.post("transaction.ready", { ...f.transaction, custom_data });
      assert.equal(response.statusCode, 200, response.body);
      assert.equal(findPaymentOrderById(f.order.id)!.transaction_id, null);
    }
    const legacyUrl = "https://scoretransposer.com/checkout/paddle?_ptxn=txn_legacy";
    db.prepare("UPDATE payment_orders SET provider_checkout_started_at = NULL, transaction_id = 'txn_legacy', checkout_url = ? WHERE id = ?").run(legacyUrl, f.order.id);
    const legacy = await f.post("transaction.updated", { ...f.transaction, id: "txn_legacy", custom_data: { orderId: f.order.id } });
    assert.equal(legacy.statusCode, 200, legacy.body);
    assert.equal(findPaymentOrderById(f.order.id)!.transaction_id, "txn_legacy");
    assert.equal(findPaymentOrderById(f.order.id)!.checkout_url, legacyUrl);
  } finally { await f.app.close(); }
});
