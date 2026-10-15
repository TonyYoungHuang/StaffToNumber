import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import Fastify from "fastify";
import type Stripe from "stripe";
import { db, initDb } from "../db.js";
import { config } from "../config.js";
import { authPlugin } from "../plugins/auth.js";
import { paymentRoutes } from "../routes/payments.js";
import { createSession, createUser } from "../repositories/auth-repository.js";
import { createPaymentOrder, findPaymentOrderById } from "../repositories/payment-repository.js";
import { applyOneTimeRefund, findOneTimePurchase, fulfillOneTimePurchase, prepareOneTimePurchase } from "../repositories/one-time-purchase-repository.js";
import { createScoreExportJob } from "../repositories/score-repository.js";
import { assertScorePassCredit, bindPurchasedScorePass, listScorePasses, mapExtractedScorePassDocument, scorePassForDocument } from "./score-passes.js";
import { DATABASE_SCHEMA_VERSION } from "../schema-version.js";

function account() { initDb(); return createUser(`${randomUUID()}@example.invalid`, "hash", "salt")!; }
function document(userId: string, status = "ready") {
  const id = randomUUID(), now = new Date().toISOString();
  db.prepare("INSERT INTO score_documents (id,user_id,title,status,created_at,updated_at) VALUES (?,?,'Existing score',?,?,?)").run(id, userId, status, now, now);
  return id;
}
function purchase(userId: string, targetDocumentId?: string) {
  const order = createPaymentOrder({ userId, provider: "stripe", billingKind: "one_time", entitlementDays: 0, targetDocumentId })!;
  prepareOneTimePurchase(db, { orderId: order.id, userId, planCode: "single-score", priceId: "price_group_test", targetDocumentId });
  const session = { id: `cs_${randomUUID()}`, mode: "payment", status: "complete", payment_status: "paid", amount_total: 299, currency: "usd", payment_intent: `pi_${randomUUID()}`,
    metadata: { orderId: order.id, userId, planCode: "single-score", priceId: "price_group_test", billingKind: "one_time" } };
  return { order, session, pay: () => fulfillOneTimePurchase(db, session), refund: () => applyOneTimeRefund(db, { payment_intent: session.payment_intent, amount: 299, amount_refunded: 299, metadata: session.metadata }) };
}

test("schema 27 maps existing own scores atomically, and duplicate fulfillment cannot move or add credits", () => {
  const user = account(), root = document(user.id), other = document(user.id), bought = purchase(user.id, root);
  assert.equal(DATABASE_SCHEMA_VERSION, 27);
  assert.equal(findOneTimePurchase(db, bought.order.id)!.target_document_id, root);
  assert.equal(scorePassForDocument(db, user.id, root), undefined);
  bought.pay(); bought.pay();
  assert.equal(scorePassForDocument(db, user.id, root)!.remaining, 10);
  assert.equal(listScorePasses(db, user.id).length, 1);
  assert.throws(() => bindPurchasedScorePass(db, user.id, bought.order.id, other), /cannot be moved/);
  assert.equal(scorePassForDocument(db, user.id, other), undefined);
  assert.throws(() => prepareOneTimePurchase(db, { orderId: bought.order.id, userId: user.id, planCode: "single-score", priceId: "price_group_test", targetDocumentId: other }), /original purchase/);
});

test("foreign, deleted, missing and foreign-pass targets fail closed before payment", () => {
  const user = account(), stranger = account(), own = document(user.id);
  for (const target of [document(stranger.id), document(user.id, "deleted"), randomUUID()]) assert.throws(() => purchase(user.id, target), /owned by this account/);
  const foreign = purchase(stranger.id); foreign.pay();
  assert.throws(() => bindPurchasedScorePass(db, user.id, foreign.order.id, own), /another account/);
  db.prepare("UPDATE score_passes SET document_id = ? WHERE purchase_id = ?").run(own, foreign.order.id);
  assert.throws(() => purchase(user.id, own), /another score pass account/);
});

test("ownership is rechecked during fulfillment and a disappeared target rolls back the full grant", () => {
  const user = account(), root = document(user.id), bought = purchase(user.id, root);
  db.prepare("UPDATE score_documents SET status = 'deleted' WHERE id = ?").run(root);
  assert.throws(bought.pay, /owned by this account/);
  assert.equal(findOneTimePurchase(db, bought.order.id)!.paid_at, null);
  assert.equal(db.prepare("SELECT purchase_id FROM score_passes WHERE purchase_id = ?").get(bought.order.id), undefined);
});

test("root and server-extracted parts share topups and a single lifetime credit pool", () => {
  const user = account(), root = document(user.id), part = document(user.id), unrelated = document(user.id);
  const original = purchase(user.id, root); original.pay();
  mapExtractedScorePassDocument(db, user.id, root, part);
  const topup = purchase(user.id, part); topup.pay(); topup.pay();
  const pass = scorePassForDocument(db, user.id, part)!;
  assert.equal(pass.id, original.order.id); assert.equal(pass.documentId, root); assert.equal(pass.credits, 20);
  assert.deepEqual(new Set(pass.documentIds), new Set([root, part]));
  assert.equal(scorePassForDocument(db, user.id, unrelated), undefined);
  assert.equal((db.prepare("SELECT group_pass_id FROM score_passes WHERE purchase_id = ?").get(topup.order.id) as { group_pass_id: string }).group_pass_id, original.order.id);
  for (let index = 0; index < 20; index++) createScoreExportJob({ userId: user.id, documentId: index % 2 ? part : root, params: {} });
  assert.equal(scorePassForDocument(db, user.id, root)!.remaining, 0);
  assert.equal(scorePassForDocument(db, user.id, part)!.remaining, 0);
  assert.throws(() => assertScorePassCredit(db, user.id, part), /20 processing credits/);
  assert.equal((db.prepare("SELECT count(*) AS n FROM score_pass_jobs WHERE purchase_id = ?").get(original.order.id) as { n: number }).n, 20);
  assert.equal((db.prepare("SELECT count(*) AS n FROM score_pass_jobs WHERE purchase_id = ?").get(topup.order.id) as { n: number }).n, 0);
});

test("a topup refund removes its credits; a root refund revokes every part even with another active topup", () => {
  const user = account(), root = document(user.id), part = document(user.id), original = purchase(user.id, root); original.pay();
  mapExtractedScorePassDocument(db, user.id, root, part);
  const topup = purchase(user.id, part); topup.pay(); topup.refund(); topup.pay();
  assert.equal(scorePassForDocument(db, user.id, root)!.credits, 10);
  const next = purchase(user.id, part); next.pay();
  original.refund(); original.pay();
  assert.equal(scorePassForDocument(db, user.id, root), undefined);
  assert.equal(scorePassForDocument(db, user.id, part), undefined);
  const replacement = purchase(user.id, root); replacement.pay(); replacement.pay();
  assert.equal(scorePassForDocument(db, user.id, root)!.id, replacement.order.id);
  assert.equal(scorePassForDocument(db, user.id, root)!.credits, 10);
  assert.equal(scorePassForDocument(db, user.id, root)!.remaining, 10);
  assert.equal(findOneTimePurchase(db, original.order.id)!.status, "refunded");
  assert.equal((db.prepare("SELECT group_pass_id FROM score_passes WHERE purchase_id = ?").get(next.order.id) as { group_pass_id: string }).group_pass_id, original.order.id);
});

test("self-service rebuy retains old charges and never revives old refunded credits or active topups", () => {
  const user = account(), root = document(user.id), original = purchase(user.id, root); original.pay();
  createScoreExportJob({ userId: user.id, documentId: root, params: {} });
  const oldTopup = purchase(user.id, root); oldTopup.pay(); original.refund();
  const replacement = purchase(user.id, root); replacement.pay();
  assert.equal(scorePassForDocument(db, user.id, root)!.remaining, 10);
  assert.equal((db.prepare("SELECT count(*) AS n FROM score_pass_jobs WHERE purchase_id = ?").get(original.order.id) as { n: number }).n, 1);
  assert.equal(findOneTimePurchase(db, original.order.id)!.target_document_id, root);
  assert.equal(findPaymentOrderById(original.order.id)!.target_document_id, root);
  original.pay(); oldTopup.pay(); replacement.pay();
  assert.equal(scorePassForDocument(db, user.id, root)!.credits, 10);
  const freshTopup = purchase(user.id, root); freshTopup.pay(); freshTopup.pay();
  assert.equal(scorePassForDocument(db, user.id, root)!.credits, 20);
  assert.equal(listScorePasses(db, user.id).length, 1);
});

test("pre-purchase historical parts join only with server provenance, same owner and no other group; they grant zero credits", () => {
  const user = account(), root = document(user.id), proven = document(user.id), nested = document(user.id), unproven = document(user.id), otherGroupPart = document(user.id);
  mapExtractedScorePassDocument(db, user.id, root, proven);
  mapExtractedScorePassDocument(db, user.id, proven, nested);
  mapExtractedScorePassDocument(db, user.id, root, otherGroupPart);
  const other = purchase(user.id, otherGroupPart); other.pay();
  const original = purchase(user.id, root); original.pay();
  assert.deepEqual(new Set(scorePassForDocument(db, user.id, root)!.documentIds), new Set([root, proven, nested]));
  assert.equal(scorePassForDocument(db, user.id, root)!.credits, 10);
  assert.equal(scorePassForDocument(db, user.id, unproven), undefined);
  assert.equal(scorePassForDocument(db, user.id, otherGroupPart)!.id, other.order.id);
  assert.throws(() => mapExtractedScorePassDocument(db, user.id, unproven, proven), /different server-recorded source/);
  const foreign = account(), foreignPart = document(foreign.id);
  assert.throws(() => mapExtractedScorePassDocument(db, user.id, root, foreignPart), /owned by this account/);
});

test("sold legacy passes backfill root mapping without extra credits or lost charges; documents cannot join two groups", () => {
  const user = account(), root = document(user.id), original = purchase(user.id); original.pay();
  db.prepare("UPDATE score_passes SET document_id = ? WHERE purchase_id = ?").run(root, original.order.id);
  assert.equal(scorePassForDocument(db, user.id, root)!.credits, 10);
  createScoreExportJob({ userId: user.id, documentId: root, params: {} });
  db.prepare("DELETE FROM score_pass_documents WHERE pass_id = ?").run(original.order.id);
  assert.equal(scorePassForDocument(db, user.id, root)!.remaining, 9);
  const second = purchase(user.id); second.pay();
  assert.throws(() => db.prepare("INSERT INTO score_pass_documents (pass_id,document_id,role,created_at) VALUES (?,?,'root',?)").run(second.order.id, root, new Date().toISOString()), /UNIQUE/);
});

test("SQLite schema 26 upgrades additively to 27 and backfills sold roots without changing credits or charges", () => {
  const user = account(), root = document(user.id), original = purchase(user.id, root); original.pay();
  createScoreExportJob({ userId: user.id, documentId: root, params: {} });
  db.prepare("DELETE FROM score_pass_documents WHERE pass_id = ?").run(original.order.id);
  db.exec("PRAGMA user_version = 26");
  initDb();
  assert.equal((db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version, 27);
  assert.ok(db.prepare("SELECT document_id FROM score_pass_documents WHERE pass_id = ? AND role = 'root'").get(original.order.id));
  assert.equal(scorePassForDocument(db, user.id, root)!.credits, 10);
  assert.equal(scorePassForDocument(db, user.id, root)!.remaining, 9);
  assert.equal((db.prepare("SELECT count(*) AS n FROM score_pass_jobs WHERE purchase_id = ?").get(original.order.id) as { n: number }).n, 1);
});

test("authenticated checkout validates score before Stripe and stores the immutable target before opening hosted checkout", async () => {
  const user = account(), root = document(user.id), stranger = account(), token = randomUUID();
  config.paymentProviders = ["stripe"]; config.stripeSingleScorePriceId = "price_group_test";
  config.stripeSecretKey = "sk_test_LocalGroupFixture12345678901234567890";
  createSession(user.id, token, 1);
  let created = 0;
  const app = Fastify(); await app.register(authPlugin);
  await app.register(paymentRoutes, { prefix: "/api", paymentServices: {
    createStripeCheckoutSession: async (input: { orderId: string }) => {
      created += 1;
      assert.equal(findPaymentOrderById(input.orderId)!.target_document_id, root);
      assert.equal(findOneTimePurchase(db, input.orderId)!.target_document_id, root);
      return { id: `cs_${randomUUID()}`, url: "https://checkout.stripe.com/local-test" } as Stripe.Checkout.Session;
    },
    sendTransactionalEmail: async () => ({ mode: "preview" as const }),
  } });
  const checkout = (targetDocumentId: string) => app.inject({ method: "POST", url: "/api/payments/checkout/authenticated", headers: { authorization: `Bearer ${token}`, "idempotency-key": "score-existing-target" }, payload: { provider: "stripe", planCode: "single-score", billingKind: "one_time", targetDocumentId } });
  try {
    for (const target of [document(stranger.id), document(user.id, "deleted"), randomUUID()]) assert.equal((await checkout(target)).statusCode, 404);
    const first = await checkout(root); assert.equal(first.statusCode, 201, first.body);
    assert.equal((await checkout(root)).json().orderId, first.json().orderId); assert.equal(created, 1);
  } finally { await app.close(); }
});
