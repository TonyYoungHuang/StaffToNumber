import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { db, initDb } from "../db.js";
import { createUser, getUserProfile } from "../repositories/auth-repository.js";
import { createPaymentOrder, completePaymentOrder } from "../repositories/payment-repository.js";
import { prepareOneTimePurchase, fulfillOneTimePurchase, applyOneTimeRefund } from "../repositories/one-time-purchase-repository.js";
import { createOmrImportScoreDocument, createScoreExportJob, retryScoreJob } from "../repositories/score-repository.js";
import { getPlanQuotaUsage } from "./plan-quotas.js";
import { listScorePasses, scorePassForDocument } from "./score-passes.js";
import { countTiffPages } from "./score-pass-pages.js";
import { getRecognitionOptions } from "./recognition-options.js";
import { getFreeTrialAccess } from "./free-trial.js";
import { buildStripeCheckoutSessionParams, getCheckoutPriceId } from "./payments.js";
import Fastify from "fastify";
import multipart from "@fastify/multipart";
import { PDFDocument } from "pdf-lib";
import { authPlugin } from "../plugins/auth.js";
import { scoreRoutes } from "../routes/scores.js";
import { createSession } from "../repositories/auth-repository.js";

function fixture() {
  initDb();
  const user = createUser(`${randomUUID()}@example.invalid`, "hash", "salt")!;
  const order = createPaymentOrder({ userId: user.id, provider: "stripe", billingKind: "one_time", entitlementDays: 0 })!;
  const metadata = { orderId: order.id, userId: user.id, planCode: "single-score" as const, priceId: "price_score_299", billingKind: "one_time" };
  prepareOneTimePurchase(db, { orderId: order.id, userId: user.id, planCode: "single-score", priceId: metadata.priceId });
  const session = { id: `cs_${randomUUID()}`, mode: "payment", status: "complete", payment_status: "paid", amount_total: 299, currency: "usd", payment_intent: `pi_${randomUUID()}`, metadata };
  const fileId = randomUUID(), now = new Date().toISOString();
  db.prepare(`INSERT INTO files (id,user_id,original_name,stored_name,storage_path,mime_type,size_bytes,file_kind,created_at)
    VALUES (?,?,'score.pdf','score.pdf','/unused/score.pdf','application/pdf',100,'source_pdf',?)`).run(fileId, user.id, now);
  const create = (pageCount = 5, freeTrial = false) => createOmrImportScoreDocument({ userId: user.id, title: "English score", sourceFileId: fileId,
    sourceFileKind: "source_pdf", sourceOriginalName: "score.pdf", scorePass: !freeTrial, freeTrial, pageCount });
  return { user, order, session, create };
}

test("$2.99 pass is payment mode only; unpaid, forged and duplicate payments grant no extra credit", () => {
  const { user, order, session } = fixture();
  assert.equal(fulfillOneTimePurchase(db, { ...session, payment_status: "unpaid" }), null);
  assert.equal(listScorePasses(db, user.id).length, 0);
  assert.throws(() => fulfillOneTimePurchase(db, { ...session, metadata: { ...session.metadata, userId: "wrong" } }), /does not match/);
  const purchase = fulfillOneTimePurchase(db, session)!;
  assert.equal(purchase.ends_at, null);
  fulfillOneTimePurchase(db, session, "2030-01-01T00:00:00.000Z");
  assert.equal(listScorePasses(db, user.id).length, 1);
  assert.equal(listScorePasses(db, user.id)[0].remaining, 10);
  assert.equal(getUserProfile(user.id)!.entitlement.status, "inactive");
  assert.equal(completePaymentOrder({ orderId: order.id, createdBy: "local-test" })!.activation_code_id, null);
  assert.equal(getCheckoutPriceId("stripe", "single-score", "subscription"), null);
  assert.equal(getCheckoutPriceId("paddle", "single-score", "one_time"), null);
  const params = buildStripeCheckoutSessionParams({ orderId: order.id, publicToken: "local", priceId: "price_score_299", planCode: "single-score", billingKind: "one_time" });
  assert.equal(params.mode, "payment"); assert.equal(params.subscription_data, undefined);
});

test("one project and five pages are enforced atomically, without consuming the free project", () => {
  const { user, session, create } = fixture();
  fulfillOneTimePurchase(db, session);
  assert.throws(() => create(6), /up to 5 pages/);
  assert.equal(listScorePasses(db, user.id)[0].documentId, null);
  const free = create(5, true);
  assert.ok(free.document);
  assert.equal(listScorePasses(db, user.id)[0].remaining, 10);
  const paid = create(5);
  assert.equal(listScorePasses(db, user.id)[0].documentId, paid.document!.id);
  assert.equal(listScorePasses(db, user.id)[0].remaining, 9);
  assert.throws(() => create(1), /Buy a One Score Pass/);
  assert.equal(scorePassForDocument(db, "another-user", paid.document!.id), undefined);
  assert.equal(scorePassForDocument(db, user.id, free.document!.id), undefined);
});

test("ten dedicated credits survive month changes, release on failure, and cannot be overspent by retry", () => {
  const { user, session, create } = fixture();
  fulfillOneTimePurchase(db, session);
  const { document, job } = create();
  const ids = [job!.id];
  for (let i = 0; i < 9; i++) ids.push(createScoreExportJob({ userId: user.id, documentId: document!.id, params: {} })!.id);
  assert.equal(listScorePasses(db, user.id)[0].remaining, 0);
  assert.equal(getPlanQuotaUsage(user.id).jobs.used, 0);
  assert.throws(() => createScoreExportJob({ userId: user.id, documentId: document!.id, params: {} }), /10 processing credits/);
  db.prepare("UPDATE score_jobs SET status = 'failed', created_at = '2020-01-01T00:00:00.000Z' WHERE id = ?").run(ids[1]);
  assert.equal(listScorePasses(db, user.id)[0].remaining, 1);
  createScoreExportJob({ userId: user.id, documentId: document!.id, params: {} });
  assert.throws(() => retryScoreJob({ userId: user.id, documentId: document!.id, jobId: ids[1] }), /10 processing credits/);
  db.prepare("UPDATE score_jobs SET status = 'cancelled' WHERE id = ?").run(ids[2]);
  assert.ok(retryScoreJob({ userId: user.id, documentId: document!.id, jobId: ids[1] }));
  assert.equal(listScorePasses(db, user.id)[0].remaining, 0);
  db.prepare("UPDATE score_jobs SET created_at = '2020-01-01T00:00:00.000Z' WHERE user_id = ?").run(user.id);
  assert.equal(listScorePasses(db, user.id)[0].remaining, 0);
});

test("full and out-of-order refunds revoke a pass and duplicate paid events cannot restore it", () => {
  for (const early of [false, true]) {
    const { user, session, create } = fixture();
    if (!early) { fulfillOneTimePurchase(db, session); create(); }
    applyOneTimeRefund(db, { payment_intent: session.payment_intent, amount: 299, amount_refunded: 299, metadata: session.metadata });
    fulfillOneTimePurchase(db, session);
    assert.equal(listScorePasses(db, user.id).length, 0);
    assert.throws(() => create(), /Buy a One Score Pass/);
  }
});

test("multi-page TIFF cannot bypass the page limit; malformed and cyclic directories fail closed", () => {
  const bytes = new Uint8Array(8 + 6 * 6), view = new DataView(bytes.buffer);
  bytes[0] = bytes[1] = 0x49; view.setUint16(2, 42, true); view.setUint32(4, 8, true);
  for (let i = 0; i < 6; i++) view.setUint32(8 + i * 6 + 2, i === 5 ? 0 : 8 + (i + 1) * 6, true);
  assert.equal(countTiffPages(bytes), 6);
  view.setUint32(8 + 4 * 6 + 2, 0, true); assert.equal(countTiffPages(bytes), 5);
  view.setUint32(10, 8, true); assert.equal(countTiffPages(bytes), 0);
  view.setUint16(2, 43, true); assert.equal(countTiffPages(bytes), 0);
});

for (const hasFreeScore of [false, true]) test(`HTTP import binds the paid pass with free score used=${hasFreeScore}, enforces page count, and scopes editing`, async () => {
  const { user, session, create } = fixture();
  if (hasFreeScore) create(1, true);
  fulfillOneTimePurchase(db, session);
  assert.equal(getRecognitionOptions(user.id).options[0].creditSource, "score_pass");
  const token = randomUUID(); createSession(user.id, token, 1);
  const app = Fastify();
  await app.register(multipart); await app.register(authPlugin); await app.register(scoreRoutes, { prefix: "/api" });
  const upload = async (pages: number) => {
    const pdf = await PDFDocument.create(); for (let i = 0; i < pages; i++) pdf.addPage([200, 300]);
    const boundary = "score-test-boundary";
    const payload = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="English-score.pdf"\r\nContent-Type: application/pdf\r\n\r\n`), Buffer.from(await pdf.save()), Buffer.from(`\r\n--${boundary}--\r\n`)]);
    return app.inject({ method: "POST", url: "/api/scores/import/omr", headers: { authorization: `Bearer ${token}`, "content-type": `multipart/form-data; boundary=${boundary}` }, payload });
  };
  try {
    const large = await upload(11); assert.equal(large.statusCode, 403, large.body); assert.equal(large.json().code, "SCORE_PASS_PAGE_LIMIT");
    assert.equal(listScorePasses(db, user.id)[0].remaining, 10);
    assert.equal(listScorePasses(db, user.id)[0].documentId, null);
    assert.equal(getFreeTrialAccess(user.id).omrJobsUsed, hasFreeScore ? 1 : 0);
    const accepted = await upload(5); assert.equal(accepted.statusCode, 201, accepted.body);
    const id = accepted.json().score.id;
    assert.equal(listScorePasses(db, user.id)[0].documentId, id);
    assert.equal(listScorePasses(db, user.id)[0].remaining, 9);
    assert.equal(accepted.json().recognition.creditSource, "score_pass");
    assert.equal(accepted.json().job.params.freeTrial, false);
    assert.ok(db.prepare("SELECT job_id FROM score_pass_jobs WHERE job_id = ?").get(accepted.json().job.id));
    assert.equal(getFreeTrialAccess(user.id).omrJobsUsed, hasFreeScore ? 1 : 0);
    assert.equal((await upload(1)).statusCode, hasFreeScore ? 403 : 201);
    const jobs = await app.inject({ method: "GET", url: `/api/scores/${id}/jobs`, headers: { authorization: `Bearer ${token}` } });
    assert.equal(jobs.statusCode, 200, jobs.body);
    assert.equal((await app.inject({ method: "POST", url: `/api/scores/${id}/export/pdf`, headers: { authorization: `Bearer ${token}` }, payload: {} })).statusCode, 409);
    applyOneTimeRefund(db, { payment_intent: session.payment_intent, amount: 299, amount_refunded: 299, metadata: session.metadata });
    assert.equal((await app.inject({ method: "POST", url: `/api/scores/${id}/exports`, headers: { authorization: `Bearer ${token}` }, payload: {} })).statusCode, 403);
  } finally { await app.close(); }
});

test("reservation resolves a pass bought after a free-trial quote and still enforces its page limit", () => {
  const { user, session } = fixture();
  assert.equal(getRecognitionOptions(user.id).options[0].creditSource, "free_trial");
  fulfillOneTimePurchase(db, session);
  const file = db.prepare("SELECT id FROM files WHERE user_id = ?").get(user.id) as { id: string };
  const input = { userId: user.id, title: "Synthetic score", sourceFileId: file.id,
    sourceFileKind: "source_pdf" as const, sourceOriginalName: "score.pdf" };
  assert.throws(() => createOmrImportScoreDocument({ ...input, pageCount: 11 }), /up to 5 pages/);
  assert.equal(listScorePasses(db, user.id)[0].documentId, null);
  const result = createOmrImportScoreDocument({ ...input, pageCount: 1 });
  assert.equal(JSON.parse(result.job!.params_json!).creditSource, "score_pass");
  assert.equal(listScorePasses(db, user.id)[0].documentId, result.document!.id);
  assert.equal(getFreeTrialAccess(user.id).omrJobsUsed, 0);
});
