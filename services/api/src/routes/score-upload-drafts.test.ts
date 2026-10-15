import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import { PDFDocument } from "pdf-lib";
import { db, initDb } from "../db.js";
import { config } from "../config.js";
import { authPlugin } from "../plugins/auth.js";
import { createUser, createSession, generateActivationCodes, redeemActivationCode } from "../repositories/auth-repository.js";
import { createPaymentOrder } from "../repositories/payment-repository.js";
import { createScoreRevisionFromScoreJson, findScoreDocumentById, listScoreJobsByDocumentId } from "../repositories/score-repository.js";
import { scoreRoutes } from "./scores.js";
import { stageOmrUpload } from "../lib/staged-omr-uploads.js";
import { cleanupExpiredScoreUploadDrafts, findScoreUploadDraft, reconcileExpiredUploadDraftOrders } from "../lib/score-upload-drafts.js";
import { normalizeCheckoutContinuation } from "../lib/checkout-continuation.js";
import { bindScorePass, scorePassForDocument } from "../lib/score-passes.js";
import { hashPaymentOrderToken, type retrieveStripeCheckoutSession } from "../lib/payments.js";
import { parseJianpuToScoreJson } from "../lib/jianpu-score-parser.js";

async function fixture(mode: "simple" | "complex" = "simple") {
  initDb();
  const user = createUser(`${randomUUID()}@drafts.test`, "hash", "salt")!;
  const token = randomUUID(); createSession(user.id, token, 1);
  const app = Fastify(); await app.register(authPlugin); await app.register(scoreRoutes, { prefix: "/api" });
  const pdf = await PDFDocument.create(); pdf.addPage([100, 100]);
  const source = path.join(config.storageDir, `${randomUUID()}.pdf`); await fs.mkdir(config.storageDir, { recursive: true }); await fs.writeFile(source, await pdf.save());
  const staged = await stageOmrUpload({ sourcePath: source, userId: user.id, filename: "source.pdf", sizeBytes: (await fs.stat(source)).size,
    mimeType: "application/pdf", detectedKind: "pdf" });
  const key = randomUUID();
  const headers = { authorization: `Bearer ${token}`, "idempotency-key": key };
  const payload = { stagedUploadId: staged.id, recognitionMode: mode, title: "Draft score" };
  const prepare = () => app.inject({ method: "POST", url: "/api/scores/upload-drafts/prepare", headers, payload });
  const first = await prepare(); assert.equal(first.statusCode, 201, first.body);
  return { app, user, headers, key, payload, prepare, draft: first.json().draft as { id: string; documentId: string; mode: string } };
}
function paidOrder(f: Awaited<ReturnType<typeof fixture>>) {
  const action = normalizeCheckoutContinuation(f.user.id, f.draft.documentId, { kind: "recognition", uploadDraftId: f.draft.id, mode: f.draft.mode });
  const payment = createPaymentOrder({ userId: f.user.id, provider: "stripe", entitlementDays: 0,
    targetDocumentId: f.draft.documentId, intendedActionJson: JSON.stringify(action) })!;
  db.prepare("UPDATE payment_orders SET status = 'paid', paid_at = ? WHERE id = ?").run(new Date().toISOString(), payment.id);
  const code = generateActivationCodes({ planCode: "single-score", quantity: 1, entitlementDays: 30 }).codes[0]!;
  assert.ok(redeemActivationCode(f.user.id, code.code).ok);
  bindScorePass(db, f.user.id, f.draft.documentId, 1);
  return payment;
}

test("prepare promotes an owned staged source once without a task or debit, and survives receipt replay", async () => {
  const f = await fixture();
  try {
    const replay = await f.prepare(); assert.equal(replay.statusCode, 200, replay.body); assert.deepEqual(replay.json().draft, f.draft);
    assert.equal(listScoreJobsByDocumentId(f.draft.documentId).length, 0);
    assert.ok(findScoreDocumentById(f.draft.documentId)?.source_file_id);
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM files WHERE user_id = ?").get(f.user.id) as { n: number }).n, 1);
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM score_documents WHERE user_id = ?").get(f.user.id) as { n: number }).n, 1);
    const conflict = await f.app.inject({ method: "POST", url: "/api/scores/upload-drafts/prepare", headers: f.headers, payload: { ...f.payload, recognitionMode: "complex" } });
    assert.equal(conflict.statusCode, 409); assert.equal(conflict.json().code, "IDEMPOTENCY_KEY_REUSED");
    const other = createUser(`${randomUUID()}@drafts.test`, "hash", "salt")!; const token = randomUUID(); createSession(other.id, token, 1);
    const read = await f.app.inject({ method: "GET", url: `/api/scores/upload-drafts/${f.draft.id}`, headers: { authorization: `Bearer ${token}` } });
    assert.equal(read.statusCode, 404);
    const steal = await f.app.inject({ method: "POST", url: "/api/scores/upload-drafts/prepare", headers: { authorization: `Bearer ${token}`, "idempotency-key": randomUUID() }, payload: f.payload });
    assert.equal(steal.statusCode, 404);
  } finally { await f.app.close(); }
});

for (const [mode, cost] of [["simple", 1], ["complex", 5]] as const) test(`paid ${mode} draft needs confirmation and concurrent replay creates one task with ${cost} credits`, async () => {
  const f = await fixture(mode), payment = paidOrder(f);
  const submit = (confirmed?: boolean) => f.app.inject({ method: "POST", url: `/api/payments/orders/${payment.id}/continue`, headers: f.headers, payload: { token: payment.public_token, ...(confirmed === undefined ? {} : { confirmed }) } });
  try {
    for (const confirmed of [undefined, false]) {
      const response = await submit(confirmed); assert.equal(response.statusCode, 409, response.body); assert.equal(response.json().code, "CHECKOUT_CONFIRMATION_REQUIRED");
    }
    assert.equal(listScoreJobsByDocumentId(f.draft.documentId).length, 0);
    assert.equal(scorePassForDocument(db, f.user.id, f.draft.documentId)!.remaining, 10);
    assert.equal((db.prepare("SELECT resume_consumed_at FROM payment_orders WHERE id = ?").get(payment.id) as { resume_consumed_at: unknown }).resume_consumed_at, null);
    const replies = await Promise.all(Array.from({ length: 5 }, () => submit(true)));
    for (const response of replies) { assert.equal(response.statusCode, 200, response.body); assert.deepEqual(response.json(), replies[0].json()); }
    assert.equal(listScoreJobsByDocumentId(f.draft.documentId).length, 1);
    assert.equal(scorePassForDocument(db, f.user.id, f.draft.documentId)!.remaining, 10 - cost);
    const jobId = replies[0].json().job.id;
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM job_dispatch_outbox WHERE job_id = ?").get(jobId) as { n: number }).n, 1);
    assert.equal(findScoreUploadDraft(f.user.id, f.draft.id)?.task_id, jobId);
    assert.deepEqual((await submit()).json(), replies[0].json());
    const restored = await f.app.inject({ method: "GET", url: `/api/scores/upload-drafts/${f.draft.id}?checkoutOrderId=${payment.id}`, headers: f.headers });
    assert.equal(restored.json().order.resumeResult.job.id, jobId);
  } finally { await f.app.close(); }
});

test("unpaid drafts expire after 24 hours; pending sessions and paid scores are preserved", async () => {
  const unpaid = await fixture(), pending = await fixture(), paid = await fixture(), unknown = await fixture();
  const later = new Date(Date.now() + 25 * 60 * 60 * 1000);
  try {
    const pendingOrder = createPaymentOrder({ userId: pending.user.id, provider: "stripe", entitlementDays: 0, targetDocumentId: pending.draft.documentId })!;
    db.prepare("UPDATE payment_orders SET checkout_session_id = 'cs_confirming' WHERE id = ?").run(pendingOrder.id);
    const unknownOrder = createPaymentOrder({ userId: unknown.user.id, provider: "stripe", entitlementDays: 0, targetDocumentId: unknown.draft.documentId })!;
    db.prepare("UPDATE payment_orders SET updated_at = ? WHERE id = ?").run(new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), unknownOrder.id);
    paidOrder(paid);
    const result = cleanupExpiredScoreUploadDrafts(later);
    assert.ok(result.deleted >= 1); assert.ok(result.paymentPending >= 1); assert.ok(result.retained >= 1);
    assert.equal(findScoreDocumentById(unpaid.draft.documentId), undefined);
    assert.equal(findScoreUploadDraft(unpaid.user.id, unpaid.draft.id), undefined);
    assert.ok(findScoreDocumentById(pending.draft.documentId));
    assert.ok(findScoreDocumentById(unknown.draft.documentId), "a crash before session attachment has an unknown payment outcome and must remain held");
    assert.equal(findScoreUploadDraft(paid.user.id, paid.draft.id)?.status, "retained");
    assert.ok(findScoreDocumentById(paid.draft.documentId)?.source_file_id);
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM storage_deletion_queue WHERE source_file_id IS NOT NULL").get() as { n: number }).n >= 1, true);
    db.prepare("UPDATE payment_orders SET status = 'cancelled' WHERE id = ?").run(pendingOrder.id);
    cleanupExpiredScoreUploadDrafts(later);
    assert.equal(findScoreDocumentById(pending.draft.documentId), undefined);
  } finally { await Promise.all([unpaid.app.close(), pending.app.close(), paid.app.close(), unknown.app.close()]); }
});

test("draft checkout cannot change saved recognition mode or borrow another draft", async () => {
  const f = await fixture();
  try {
    assert.throws(() => normalizeCheckoutContinuation(f.user.id, f.draft.documentId, { kind: "recognition", uploadDraftId: randomUUID(), mode: "simple" }), /not available/);
    assert.throws(() => normalizeCheckoutContinuation(f.user.id, f.draft.documentId, { kind: "recognition", uploadDraftId: f.draft.id, mode: "complex" }), /mode cannot be changed/);
  } finally { await f.app.close(); }
});

test("automatic reconciliation clears only verified unpaid expired sessions and preserves pending or concurrently paid sources", async () => {
  const expired = await fixture(), confirming = await fixture(), racing = await fixture();
  const fixtures = [expired, confirming, racing];
  const later = new Date(Date.now() + 25 * 60 * 60 * 1000);
  const orders = fixtures.map(f => {
    const order = createPaymentOrder({ userId: f.user.id, provider: "stripe", entitlementDays: 0, targetDocumentId: f.draft.documentId })!;
    db.prepare("UPDATE payment_orders SET checkout_session_id = ? WHERE id = ?").run(`cs_${order.id}`, order.id);
    return order;
  });
  try {
    const result = await reconcileExpiredUploadDraftOrders(later, {
      retrieveStripeCheckoutSession: async id => {
        // Prove provider retrieval runs without an open cleanup transaction.
        db.exec("BEGIN IMMEDIATE"); db.exec("ROLLBACK");
        const order = orders.find(candidate => `cs_${candidate.id}` === id)!;
        if (order.id === orders[2].id) db.prepare("UPDATE payment_orders SET status = 'paid', paid_at = ? WHERE id = ?").run(later.toISOString(), order.id);
        return { id, status: order.id === orders[1].id ? "complete" : "expired", payment_status: "unpaid",
          metadata: { orderId: order.id, orderTokenHash: hashPaymentOrderToken(order.public_token) } } as unknown as Awaited<ReturnType<typeof retrieveStripeCheckoutSession>>;
      },
      retrievePaddleTransaction: async () => { throw new Error("not used"); },
    });
    assert.equal(result.resolved, 1);
    assert.equal(result.unresolved, 1);
    cleanupExpiredScoreUploadDrafts(later);
    assert.equal(findScoreDocumentById(expired.draft.documentId), undefined);
    assert.ok(findScoreDocumentById(confirming.draft.documentId));
    assert.ok(findScoreDocumentById(racing.draft.documentId));
    assert.equal(findScoreUploadDraft(racing.user.id, racing.draft.id)?.status, "retained");
  } finally { await Promise.all(fixtures.map(f => f.app.close())); }
});

test("a recognized upload becomes an ordinary score: later export auto-continues and recognition creates a fresh retry", async () => {
  const f = await fixture(), payment = paidOrder(f);
  const post = (orderId: string, publicToken: string, confirmed?: boolean) => f.app.inject({ method: "POST", url: `/api/payments/orders/${orderId}/continue`, headers: f.headers, payload: { token: publicToken, ...(confirmed ? { confirmed } : {}) } });
  try {
    const initial = await post(payment.id, payment.public_token, true); assert.equal(initial.statusCode, 200, initial.body);
    const initialJobId = initial.json().job.id;
    db.prepare("UPDATE score_jobs SET status = 'completed' WHERE id = ?").run(initialJobId);
    const model = parseJianpuToScoreJson({ text: "1=C\n4/4\n| 1 2 3 4 |", importedAt: new Date().toISOString(), sourceOriginalName: "recognized.xml" });
    createScoreRevisionFromScoreJson({ documentId: f.draft.documentId, scoreJson: model, createdFrom: "system" });
    const makeOrder = (action: unknown) => {
      const normalized = normalizeCheckoutContinuation(f.user.id, f.draft.documentId, action);
      const order = createPaymentOrder({ userId: f.user.id, provider: "stripe", entitlementDays: 0, targetDocumentId: f.draft.documentId, intendedActionJson: JSON.stringify(normalized) })!;
      db.prepare("UPDATE payment_orders SET status = 'paid' WHERE id = ?").run(order.id);
      return { ...order, normalized };
    };
    const exportOrder = makeOrder({ kind: "export", format: "pdf" });
    const exported = await post(exportOrder.id, exportOrder.public_token); assert.equal(exported.statusCode, 200, exported.body); assert.ok(exported.json().job?.id, exported.body);
    const recognitionOrder = makeOrder({ kind: "recognition", mode: "simple" });
    assert.equal(recognitionOrder.normalized?.kind, "retry");
    const recognized = await post(recognitionOrder.id, recognitionOrder.public_token); assert.equal(recognized.statusCode, 200, recognized.body);
    assert.notEqual(recognized.json().job?.id, initialJobId);
    assert.equal(listScoreJobsByDocumentId(f.draft.documentId).length, 3);
    assert.equal(scorePassForDocument(db, f.user.id, f.draft.documentId)!.remaining, 7);
  } finally { await f.app.close(); }
});

test("draft promotion failure rolls back the formal file, document and asset and leaves the staged source retryable", async () => {
  const f = await fixture();
  const source = path.join(config.storageDir, `${randomUUID()}.pdf`);
  const pdf = await PDFDocument.create(); pdf.addPage([100, 100]); await fs.writeFile(source, await pdf.save());
  const staged = await stageOmrUpload({ sourcePath: source, userId: f.user.id, filename: "retry.pdf", sizeBytes: (await fs.stat(source)).size, mimeType: "application/pdf", detectedKind: "pdf" });
  const triggerName = `fail_draft_${randomUUID().replaceAll("-", "")}`;
  const key = randomUUID();
  const prepare = () => f.app.inject({ method: "POST", url: "/api/scores/upload-drafts/prepare", headers: { ...f.headers, "idempotency-key": key }, payload: { stagedUploadId: staged.id, recognitionMode: "simple" } });
  try {
    db.exec(`CREATE TEMP TRIGGER ${triggerName} BEFORE INSERT ON score_upload_drafts WHEN NEW.user_id = '${f.user.id}' BEGIN SELECT RAISE(ABORT, 'local draft failure'); END;`);
    assert.equal((await prepare()).statusCode, 500);
    for (const table of ["files", "score_documents", "score_upload_drafts"]) {
      assert.equal((db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id = ?`).get(f.user.id) as { n: number }).n, 1, table);
    }
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM score_assets WHERE document_id IN (SELECT id FROM score_documents WHERE user_id = ?)").get(f.user.id) as { n: number }).n, 1);
    db.exec(`DROP TRIGGER ${triggerName}`);
    const retry = await prepare(); assert.equal(retry.statusCode, 201, retry.body);
    assert.equal(listScoreJobsByDocumentId(retry.json().draft.documentId).length, 0);
  } finally {
    db.exec(`DROP TRIGGER IF EXISTS ${triggerName}`);
    await f.app.close();
  }
});
