import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { db, initDb } from "../db.js";
import { createUser, getUserProfile } from "../repositories/auth-repository.js";
import { createPaymentOrder, completePaymentOrder } from "../repositories/payment-repository.js";
import { prepareOneTimePurchase, fulfillOneTimePurchase, applyOneTimeRefund } from "../repositories/one-time-purchase-repository.js";
import { createOmrImportScoreDocument, createScoreExportJob, retryScoreJob } from "../repositories/score-repository.js";
import { getPlanQuotaUsage } from "./plan-quotas.js";
import { listScorePasses, ScorePassError, scorePassForDocument } from "./score-passes.js";
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
import { recognitionCreditCost } from "./plan-quotas.js";

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
  const create = (pageCount = 11, freeTrial = false) => createOmrImportScoreDocument({ userId: user.id, title: "English score", sourceFileId: fileId,
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

test("one eleven-page document binds the pass even with a legacy page cap, without consuming the free project", () => {
  const { user, session, create } = fixture();
  fulfillOneTimePurchase(db, session);
  db.prepare("UPDATE score_passes SET max_pages = 1 WHERE purchase_id = ?").run(session.metadata.orderId);
  const paid = create(11);
  assert.equal(listScorePasses(db, user.id)[0].documentId, paid.document!.id);
  assert.equal(listScorePasses(db, user.id)[0].remaining, 9);
  assert.equal(Object.hasOwn(listScorePasses(db, user.id)[0], "maxPages"), false);
  assert.equal(JSON.parse(paid.job!.params_json!).freeTrial, false);
  assert.equal(getFreeTrialAccess(user.id).omrJobsUsed, 0);
  assert.ok(db.prepare("SELECT job_id FROM score_pass_jobs WHERE job_id = ?").get(paid.job!.id));
  assert.throws(() => create(1), /Buy a One Score Pass/);
  assert.equal(listScorePasses(db, user.id)[0].remaining, 9);
  assert.equal(listScorePasses(db, user.id)[0].documentId, paid.document!.id);
  const free = create(1, true);
  assert.ok(free.document);
  assert.equal(listScorePasses(db, user.id)[0].remaining, 9);
  assert.equal(scorePassForDocument(db, "another-user", paid.document!.id), undefined);
  assert.equal(scorePassForDocument(db, user.id, free.document!.id), undefined);
});

test("invalid page counts reject atomically without binding, charging credits or using the free trial", () => {
  const { user, session } = fixture();
  fulfillOneTimePurchase(db, session);
  const file = db.prepare("SELECT id FROM files WHERE user_id = ?").get(user.id) as { id: string };
  for (const pageCount of [undefined, 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => createOmrImportScoreDocument({ userId: user.id, title: "Invalid source", sourceFileId: file.id,
      sourceFileKind: "source_pdf", sourceOriginalName: "score.pdf", pageCount }),
    (error: unknown) => error instanceof ScorePassError && error.code === "SCORE_SOURCE_PAGE_COUNT_INVALID" && error.statusCode === 422);
    assert.equal(listScorePasses(db, user.id)[0].documentId, null);
    assert.equal(listScorePasses(db, user.id)[0].remaining, 10);
    assert.equal(getFreeTrialAccess(user.id).omrJobsUsed, 0);
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM score_documents WHERE user_id = ?").get(user.id) as { n: number }).n, 0);
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM score_pass_jobs WHERE purchase_id = ?").get(session.metadata.orderId) as { n: number }).n, 0);
  }
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

const TIFF_ENTRY_COUNT = 9;
const TIFF_NEXT_IFD_OFFSET = 2 + TIFF_ENTRY_COUNT * 12;
const TIFF_PAGE_BYTES = TIFF_NEXT_IFD_OFFSET + 4 + 1;

function tiffPages(pageCount: number) {
  // Real uncompressed 1x1 grayscale frames: dimensions and pixel strips let
  // both the directory validator and memory admission inspect the same source.
  const bytes = new Uint8Array(8 + pageCount * TIFF_PAGE_BYTES), view = new DataView(bytes.buffer);
  bytes[0] = bytes[1] = 0x49; view.setUint16(2, 42, true); view.setUint32(4, 8, true);
  for (let i = 0; i < pageCount; i++) {
    const offset = 8 + i * TIFF_PAGE_BYTES;
    const stripOffset = offset + TIFF_NEXT_IFD_OFFSET + 4;
    view.setUint16(offset, TIFF_ENTRY_COUNT, true);
    const entries = [[256, 4, 1], [257, 4, 1], [258, 3, 8], [259, 3, 1], [262, 3, 1],
      [273, 4, stripOffset], [277, 3, 1], [278, 4, 1], [279, 4, 1]] as const;
    entries.forEach(([tag, type, value], index) => {
      const entry = offset + 2 + index * 12;
      view.setUint16(entry, tag, true); view.setUint16(entry + 2, type, true);
      view.setUint32(entry + 4, 1, true); view.setUint32(entry + 8, value, true);
    });
    view.setUint32(offset + TIFF_NEXT_IFD_OFFSET, i === pageCount - 1 ? 0 : offset + TIFF_PAGE_BYTES, true);
    bytes[stripOffset] = 255;
  }
  return bytes;
}

test("multi-page TIFF counts all eleven pages; malformed and cyclic directories after page six fail closed", () => {
  const bytes = tiffPages(11), view = new DataView(bytes.buffer);
  assert.equal(countTiffPages(bytes), 11);
  const lastNext = 8 + 10 * TIFF_PAGE_BYTES + TIFF_NEXT_IFD_OFFSET;
  view.setUint32(lastNext, 8, true); assert.equal(countTiffPages(bytes), 0);
  view.setUint32(lastNext, bytes.length, true); assert.equal(countTiffPages(bytes), 0);
  view.setUint32(lastNext, 0, true); assert.equal(countTiffPages(bytes), 11);
  view.setUint32(8 + TIFF_NEXT_IFD_OFFSET, 8, true); assert.equal(countTiffPages(bytes), 0);
  view.setUint16(2, 43, true); assert.equal(countTiffPages(bytes), 0);
});

for (const mode of ["simple", "complex"] as const) for (const hasFreeScore of [false, true]) test(`HTTP eleven-page PDF binds the paid pass in ${mode} mode with free score used=${hasFreeScore}, and scopes editing`, async () => {
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
    return app.inject({ method: "POST", url: `/api/scores/import/omr?recognitionMode=${mode}&expectedCreditCost=${recognitionCreditCost(mode)}`, headers: { authorization: `Bearer ${token}`, "content-type": `multipart/form-data; boundary=${boundary}` }, payload });
  };
  try {
    const accepted = await upload(11); assert.equal(accepted.statusCode, 201, accepted.body);
    const id = accepted.json().score.id;
    assert.equal(listScorePasses(db, user.id)[0].documentId, id);
    const remaining = 10 - recognitionCreditCost(mode);
    assert.equal(listScorePasses(db, user.id)[0].remaining, remaining);
    assert.equal(accepted.json().recognition.creditSource, "score_pass");
    assert.equal(accepted.json().job.params.freeTrial, false);
    assert.equal(accepted.json().job.params.creditCost, recognitionCreditCost(mode));
    assert.equal((db.prepare("SELECT purchase_id FROM score_pass_jobs WHERE job_id = ?").get(accepted.json().job.id) as { purchase_id: string }).purchase_id, session.metadata.orderId);
    assert.equal(getFreeTrialAccess(user.id).omrJobsUsed, hasFreeScore ? 1 : 0);
    const second = await upload(1);
    assert.equal(second.statusCode, hasFreeScore || mode === "complex" ? 403 : 201, second.body);
    if (second.statusCode === 201) {
      assert.notEqual(second.json().score.id, id);
      assert.equal(second.json().job.params.freeTrial, true);
      assert.equal(db.prepare("SELECT job_id FROM score_pass_jobs WHERE job_id = ?").get(second.json().job.id), undefined);
    }
    assert.equal(listScorePasses(db, user.id)[0].documentId, id);
    assert.equal(listScorePasses(db, user.id)[0].remaining, remaining);
    const jobs = await app.inject({ method: "GET", url: `/api/scores/${id}/jobs`, headers: { authorization: `Bearer ${token}` } });
    assert.equal(jobs.statusCode, 200, jobs.body);
    assert.equal((await app.inject({ method: "POST", url: `/api/scores/${id}/export/pdf`, headers: { authorization: `Bearer ${token}` }, payload: {} })).statusCode, 409);
    applyOneTimeRefund(db, { payment_intent: session.payment_intent, amount: 299, amount_refunded: 299, metadata: session.metadata });
    assert.equal((await app.inject({ method: "POST", url: `/api/scores/${id}/exports`, headers: { authorization: `Bearer ${token}` }, payload: {} })).statusCode, 403);
  } finally { await app.close(); }
});

test("reservation binds eleven pages to a pass bought after a free-trial quote", () => {
  const { user, session } = fixture();
  assert.equal(getRecognitionOptions(user.id).options[0].creditSource, "free_trial");
  fulfillOneTimePurchase(db, session);
  const file = db.prepare("SELECT id FROM files WHERE user_id = ?").get(user.id) as { id: string };
  const input = { userId: user.id, title: "Synthetic score", sourceFileId: file.id,
    sourceFileKind: "source_pdf" as const, sourceOriginalName: "score.pdf" };
  const result = createOmrImportScoreDocument({ ...input, pageCount: 11 });
  assert.equal(JSON.parse(result.job!.params_json!).creditSource, "score_pass");
  assert.equal(JSON.parse(result.job!.params_json!).freeTrial, false);
  assert.equal(listScorePasses(db, user.id)[0].documentId, result.document!.id);
  assert.equal(listScorePasses(db, user.id)[0].remaining, 9);
  assert.ok(db.prepare("SELECT job_id FROM score_pass_jobs WHERE job_id = ?").get(result.job!.id));
  assert.equal(getFreeTrialAccess(user.id).omrJobsUsed, 0);
});

for (const paid of [false, true]) test(`HTTP TIFF admission with pass=${paid} counts eleven pages and rejects a late cyclic directory`, async () => {
  const { user, session } = fixture();
  if (paid) fulfillOneTimePurchase(db, session);
  const token = randomUUID(); createSession(user.id, token, 1);
  const app = Fastify();
  await app.register(multipart); await app.register(authPlugin); await app.register(scoreRoutes, { prefix: "/api" });
  const upload = (bytes: Uint8Array) => {
    const boundary = "score-tiff-boundary";
    const payload = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="score.tiff"\r\nContent-Type: image/tiff\r\n\r\n`), Buffer.from(bytes), Buffer.from(`\r\n--${boundary}--\r\n`)]);
    return app.inject({ method: "POST", url: "/api/scores/import/omr", headers: { authorization: `Bearer ${token}`, "content-type": `multipart/form-data; boundary=${boundary}` }, payload });
  };
  try {
    const malformed = tiffPages(11);
    new DataView(malformed.buffer).setUint32(8 + 10 * TIFF_PAGE_BYTES + TIFF_NEXT_IFD_OFFSET, 8, true);
    const rejected = await upload(malformed);
    assert.equal(rejected.statusCode, 422, rejected.body);
    assert.equal(rejected.json().code, "SCORE_SOURCE_PAGE_COUNT_INVALID");
    assert.equal(getFreeTrialAccess(user.id).omrJobsUsed, 0);
    if (paid) {
      assert.equal(listScorePasses(db, user.id)[0].documentId, null);
      assert.equal(listScorePasses(db, user.id)[0].remaining, 10);
    }
    const accepted = await upload(tiffPages(11));
    assert.equal(accepted.statusCode, 201, accepted.body);
    assert.equal(accepted.json().recognition.creditSource, paid ? "score_pass" : "free_trial");
    assert.equal(accepted.json().job.params.freeTrial, !paid);
    if (paid) {
      assert.equal(listScorePasses(db, user.id)[0].documentId, accepted.json().score.id);
      assert.equal(listScorePasses(db, user.id)[0].remaining, 9);
      assert.ok(db.prepare("SELECT job_id FROM score_pass_jobs WHERE job_id = ?").get(accepted.json().job.id));
    }
  } finally { await app.close(); }
});

test("the paid pass still obeys the shared PDF pixel safety budget without binding or charging", async () => {
  const { user, session } = fixture(); fulfillOneTimePurchase(db, session);
  const token = randomUUID(); createSession(user.id, token, 1);
  const app = Fastify();
  await app.register(multipart); await app.register(authPlugin); await app.register(scoreRoutes, { prefix: "/api" });
  try {
    const pdf = await PDFDocument.create(); pdf.addPage([20_000, 20_000]);
    const boundary = "score-pixel-boundary";
    const payload = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="score.pdf"\r\nContent-Type: application/pdf\r\n\r\n`), Buffer.from(await pdf.save()), Buffer.from(`\r\n--${boundary}--\r\n`)]);
    const response = await app.inject({ method: "POST", url: "/api/scores/import/omr", headers: { authorization: `Bearer ${token}`, "content-type": `multipart/form-data; boundary=${boundary}` }, payload });
    assert.equal(response.statusCode, 413, response.body);
    assert.equal(response.json().code, "PDF_PAGE_PIXEL_LIMIT");
    assert.equal(listScorePasses(db, user.id)[0].documentId, null);
    assert.equal(listScorePasses(db, user.id)[0].remaining, 10);
    assert.equal(getFreeTrialAccess(user.id).omrJobsUsed, 0);
  } finally { await app.close(); }
});
