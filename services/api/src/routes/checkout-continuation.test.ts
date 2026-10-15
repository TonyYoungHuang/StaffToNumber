import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import { db, initDb } from "../db.js";
import { authPlugin } from "../plugins/auth.js";
import { scoreRoutes } from "./scores.js";
import { createSession, createUser, generateActivationCodes, redeemActivationCode } from "../repositories/auth-repository.js";
import { createPaymentOrder } from "../repositories/payment-repository.js";
import { createScoreDocumentFromDerivedScoreJson, createScoreDocumentFromScoreJson, createScoreExportJob, listScoreJobsByDocumentId, retryScoreJob } from "../repositories/score-repository.js";
import { bindScorePass, scorePassForDocument } from "../lib/score-passes.js";
import { parseJianpuToScoreJson } from "../lib/jianpu-score-parser.js";
import { normalizeCheckoutContinuation, consumeCheckoutContinuation } from "../lib/checkout-continuation.js";
import { getPlanQuotaUsage } from "../lib/plan-quotas.js";

function fixture() {
  initDb();
  const user = createUser(`${randomUUID()}@continuation.test`, "hash", "salt")!;
  const scoreJson = parseJianpuToScoreJson({ text: "1=C\n4/4\n| 1 2 3 4 |", importedAt: new Date().toISOString(), sourceOriginalName: "fixture.txt" });
  const document = createScoreDocumentFromDerivedScoreJson({ userId: user.id, title: "Continuation", scoreJson, createdFrom: "system" })!;
  const code = generateActivationCodes({ planCode: "single-score", quantity: 1, entitlementDays: 30 }).codes[0]!;
  assert.ok(redeemActivationCode(user.id, code.code).ok);
  bindScorePass(db, user.id, document.id, 1);
  const token = randomUUID();
  createSession(user.id, token, 1);
  return { userId: user.id, documentId: document.id, scoreJson, token, headers: { authorization: `Bearer ${token}` } };
}

function order(f: ReturnType<typeof fixture>, action: unknown, paid = true) {
  const normalized = normalizeCheckoutContinuation(f.userId, f.documentId, action);
  const row = createPaymentOrder({ userId: f.userId, provider: "stripe", entitlementDays: 0,
    targetDocumentId: f.documentId, intendedActionJson: JSON.stringify(normalized) })!;
  if (paid) db.prepare("UPDATE payment_orders SET status = 'paid', paid_at = ? WHERE id = ?").run(new Date().toISOString(), row.id);
  return row;
}

async function app() {
  const instance = Fastify();
  await instance.register(authPlugin);
  await instance.register(scoreRoutes, { prefix: "/api" });
  return instance;
}

test("paid checkout continues the validated export exactly once with one credit and one dispatch", async () => {
  const f = fixture(), payment = order(f, { kind: "export", format: "pdf", options: { pageSize: "a4" } });
  const server = await app();
  const url = `/api/payments/orders/${payment.id}/continue`;
  try {
    const requests = await Promise.all(Array.from({ length: 5 }, () => server.inject({ method: "POST", url, headers: f.headers, payload: { token: payment.public_token } })));
    for (const response of requests) { assert.equal(response.statusCode, 200, response.body); assert.deepEqual(response.json(), requests[0].json()); }
    const jobId = requests[0].json().job.id;
    assert.equal(requests[0].json().documentId, f.documentId);
    assert.equal(listScoreJobsByDocumentId(f.documentId).length, 1);
    assert.equal(scorePassForDocument(db, f.userId, f.documentId)!.remaining, 9);
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM job_dispatch_outbox WHERE job_id = ?").get(jobId) as { n: number }).n, 1);
    assert.equal(JSON.parse(listScoreJobsByDocumentId(f.documentId)[0].params_json!).options.pageSize, "a4");
    const wrongToken = await server.inject({ method: "POST", url, headers: f.headers, payload: { token: "wrong" } });
    assert.equal(wrongToken.statusCode, 404);
    const other = fixture();
    assert.equal((await server.inject({ method: "POST", url, headers: other.headers, payload: { token: payment.public_token } })).statusCode, 404);
  } finally { await server.close(); }
});

test("unpaid orders cannot continue, and a failed automatic retry is durably consumed without looping", async () => {
  const f = fixture(), payment = order(f, { kind: "export", format: "pdf" }, false);
  const server = await app();
  const submit = () => server.inject({ method: "POST", url: `/api/payments/orders/${payment.id}/continue`, headers: f.headers, payload: { token: payment.public_token } });
  try {
    assert.equal((await submit()).statusCode, 409);
    assert.equal(listScoreJobsByDocumentId(f.documentId).length, 0);
    db.prepare("UPDATE payment_orders SET status = 'paid' WHERE id = ?").run(payment.id);
    for (let i = 0; i < 10; i++) createScoreExportJob({ ...f, params: { format: "pdf" } });
    const first = await submit();
    assert.equal(first.statusCode, 200, first.body);
    assert.equal(first.json().code, "SCORE_PASS_CREDITS_EXHAUSTED");
    assert.equal(first.json().statusCode, 403);
    assert.deepEqual((await submit()).json(), first.json());
    assert.equal(listScoreJobsByDocumentId(f.documentId).length, 10);
    assert.ok((db.prepare("SELECT resume_consumed_at FROM payment_orders WHERE id = ?").get(payment.id) as { resume_consumed_at: string }).resume_consumed_at);
  } finally { await server.close(); }
});

test("continuation rolls back a partial job and reservation while preserving its terminal error", () => {
  const f = fixture(), payment = order(f, { kind: "export", format: "pdf" });
  const input = { userId: f.userId, orderId: payment.id, token: payment.public_token, execute: () => {
    createScoreExportJob({ ...f, params: { format: "pdf" }, inTransaction: true });
    throw Object.assign(new Error("Deliberate local failure"), { code: "TEST_ACTION_FAILED", statusCode: 409 });
  } };
  const result = consumeCheckoutContinuation(input);
  assert.equal(result.code, "TEST_ACTION_FAILED");
  assert.equal(listScoreJobsByDocumentId(f.documentId).length, 0);
  assert.equal(scorePassForDocument(db, f.userId, f.documentId)!.remaining, 10);
  assert.deepEqual(consumeCheckoutContinuation({ ...input, execute: () => { throw new Error("must not execute twice"); } }), result);
});

test("checkout action validation rejects foreign/deleted scores, foreign jobs, invalid modes and untrusted options", () => {
  const f = fixture(), other = fixture();
  assert.throws(() => normalizeCheckoutContinuation(f.userId, other.documentId, { kind: "export", format: "pdf" }), /not found/);
  assert.throws(() => normalizeCheckoutContinuation(f.userId, undefined, { kind: "export", format: "pdf" }), /Choose the score/);
  assert.throws(() => normalizeCheckoutContinuation(f.userId, f.documentId, { kind: "export", format: "pdf", options: { imageResolutionDpi: 99999 } }), /imageResolutionDpi/);
  const foreign = createScoreExportJob({ ...other, params: { format: "pdf" } })!;
  assert.throws(() => normalizeCheckoutContinuation(f.userId, f.documentId, { kind: "retry", jobId: foreign.id }), /not found/);
  assert.throws(() => normalizeCheckoutContinuation(f.userId, f.documentId, { kind: "recognition", mode: "invented" }), /simple or complex/);
  db.prepare("UPDATE score_documents SET status = 'deleted' WHERE id = ?").run(f.documentId);
  assert.throws(() => normalizeCheckoutContinuation(f.userId, f.documentId, null), /not found/);
});

test("recognition continuation preserves requested complex mode and source and charges five shared credits once", async () => {
  const f = fixture(), now = new Date().toISOString(), sourceId = randomUUID(), oldJobId = randomUUID();
  db.prepare("INSERT INTO files (id,user_id,original_name,stored_name,storage_path,mime_type,size_bytes,file_kind,created_at) VALUES (?,?, 'source.png','source.png','local-fixture','image/png',1,'source_image',?)").run(sourceId, f.userId, now);
  db.prepare("INSERT INTO score_jobs (id,user_id,document_id,input_file_id,job_type,status,params_json,created_at,updated_at) VALUES (?,?,?,?,'omr_import','failed',?,?,?)")
    .run(oldJobId, f.userId, f.documentId, sourceId, JSON.stringify({ recognitionMode: "simple", creditCost: 1, freeTrial: true }), now, now);
  const payment = order(f, { kind: "recognition", mode: "complex" });
  const server = await app();
  const submit = () => server.inject({ method: "POST", url: `/api/payments/orders/${payment.id}/continue`, headers: f.headers, payload: { token: payment.public_token } });
  try {
    const first = await submit();
    assert.equal(first.statusCode, 200, first.body);
    assert.ok(first.json().job, first.body);
    assert.equal(first.json().job.jobType, "omr_import");
    const created = listScoreJobsByDocumentId(f.documentId).find(job => job.id === first.json().job.id)!;
    const params = JSON.parse(created.params_json!);
    assert.equal(params.recognitionMode, "complex"); assert.equal(params.creditCost, 5); assert.equal(params.freeTrial, false);
    assert.equal(created.input_file_id, sourceId);
    assert.equal(scorePassForDocument(db, f.userId, f.documentId)!.remaining, 5);
    assert.deepEqual((await submit()).json(), first.json());
    assert.equal(listScoreJobsByDocumentId(f.documentId).length, 2);
  } finally { await server.close(); }
});

test("an account upgrade funds a failed pass job from monthly credits before the score group", () => {
  const f = fixture(), job = createScoreExportJob({ ...f, params: { format: "pdf" } })!;
  db.prepare("UPDATE score_jobs SET status = 'failed' WHERE id = ?").run(job.id);
  const monthly = generateActivationCodes({ planCode: "starter-monthly", quantity: 1, entitlementDays: 30 }).codes[0]!;
  assert.ok(redeemActivationCode(f.userId, monthly.code).ok);
  const before = getPlanQuotaUsage(f.userId);
  assert.ok(retryScoreJob({ ...f, jobId: job.id }));
  assert.equal(scorePassForDocument(db, f.userId, f.documentId)!.remaining, 10);
  assert.equal(getPlanQuotaUsage(f.userId).monthly.remaining, before.monthly.remaining - 1);
});

test("an account upgrade funds a failed prepaid job from monthly credits before reusing its released reservation", () => {
  const f = fixture();
  const prepaid = generateActivationCodes({ planCode: "credits-50", quantity: 1, entitlementDays: 30 }).codes[0]!;
  assert.ok(redeemActivationCode(f.userId, prepaid.code).ok);
  const job = createScoreExportJob({ ...f, params: { format: "pdf" } })!;
  assert.equal(getPlanQuotaUsage(f.userId).prepaid.remaining, 49);
  db.prepare("UPDATE score_jobs SET status = 'failed' WHERE id = ?").run(job.id);
  const monthly = generateActivationCodes({ planCode: "starter-monthly", quantity: 1, entitlementDays: 30 }).codes[0]!;
  assert.ok(redeemActivationCode(f.userId, monthly.code).ok);
  const before = getPlanQuotaUsage(f.userId);
  assert.ok(retryScoreJob({ ...f, jobId: job.id }));
  assert.equal(getPlanQuotaUsage(f.userId).monthly.remaining, before.monthly.remaining - 1);
  assert.equal(getPlanQuotaUsage(f.userId).prepaid.remaining, 50);
  assert.equal(scorePassForDocument(db, f.userId, f.documentId)!.remaining, 10);
});

test("server extraction and TXT/JSON are free, parts share the pool, and metadata/imports cannot inherit coverage", async () => {
  const f = fixture(), server = await app();
  const before = getPlanQuotaUsage(f.userId);
  try {
    const extracted = await server.inject({ method: "POST", url: `/api/scores/${f.documentId}/extract-parts`, headers: f.headers,
      payload: { partIds: [f.scoreJson.parts[0].id], title: "Part", passId: "untrusted" } });
    assert.equal(extracted.statusCode, 201, extracted.body);
    const partId = extracted.json().score.id;
    const root = scorePassForDocument(db, f.userId, f.documentId)!;
    assert.equal(scorePassForDocument(db, f.userId, partId)!.id, root.id);
    assert.equal((db.prepare("SELECT role FROM score_pass_documents WHERE document_id = ?").get(partId) as { role: string }).role, "part_extract");
    for (const id of [f.documentId, partId]) for (const format of ["jianpu", "score-json"]) {
      const response = await server.inject({ method: "POST", url: `/api/scores/${id}/export/${format}`, headers: f.headers });
      assert.equal(response.statusCode, 201, response.body);
    }
    assert.equal(root.remaining, 10);
    assert.deepEqual(getPlanQuotaUsage(f.userId).monthly, before.monthly);
    assert.equal(listScoreJobsByDocumentId(partId).length, 0);
    createScoreExportJob({ userId: f.userId, documentId: partId, params: { format: "pdf" } });
    assert.equal(scorePassForDocument(db, f.userId, f.documentId)!.remaining, 9);
    createScoreExportJob({ ...f, params: { format: "pdf" } });
    assert.equal(scorePassForDocument(db, f.userId, partId)!.remaining, 8);
    const sourceId = randomUUID();
    db.prepare("INSERT INTO files (id,user_id,original_name,stored_name,storage_path,mime_type,size_bytes,file_kind,created_at) VALUES (?,?, 'export.json','export.json','local-fixture','application/json',1,'score_json',?)").run(sourceId, f.userId, new Date().toISOString());
    const counterfeit = createScoreDocumentFromScoreJson({ userId: f.userId, title: "Reimport", sourceFileId: sourceId, sourceOriginalName: "export.json",
      scoreJson: { ...f.scoreJson, metadata: { ...f.scoreJson.metadata, passId: root.id, documentId: f.documentId } } as typeof f.scoreJson })!;
    assert.equal(scorePassForDocument(db, f.userId, counterfeit.id), undefined);
    const blocked = await server.inject({ method: "POST", url: "/api/scores/import/score-json", headers: f.headers, payload: { documentId: f.documentId, passId: root.id } });
    assert.equal(blocked.statusCode, 403, blocked.body);
  } finally { await server.close(); }
});
