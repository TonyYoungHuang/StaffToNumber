import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import test from "node:test";
import Fastify from "fastify";
import multipart from "@fastify/multipart";
import { PDFDocument } from "pdf-lib";
import { config } from "../config.js";
import { db, initDb } from "../db.js";
import { createUser, createSession } from "../repositories/auth-repository.js";
import { processBillingWebhookEvent } from "../repositories/billing-repository.js";
import { createPaymentOrder } from "../repositories/payment-repository.js";
import { prepareOneTimePurchase, fulfillOneTimePurchase } from "../repositories/one-time-purchase-repository.js";
import { cancelScoreJob, createOmrImportScoreDocument, createScoreExportJob, retryScoreJob } from "../repositories/score-repository.js";
import { authPlugin } from "../plugins/auth.js";
import { scoreRoutes } from "../routes/scores.js";
import { getPlanQuotaUsage, PlanQuotaExceededError } from "./plan-quotas.js";
import { getFreeTrialAccess } from "./free-trial.js";
import { listScorePasses, ScorePassError } from "./score-passes.js";
import { getRecognitionOptions, RecognitionAccessError } from "./recognition-options.js";

function activate(userId: string) {
  processBillingWebhookEvent(db, {
    provider: "stripe", eventId: `evt-${randomUUID()}`, eventType: "customer.subscription.created", rawPayload: "local-recognition-test",
    customer: { providerCustomerId: `cus-${userId}`, userId },
    subscription: { providerSubscriptionId: `sub-${userId}`, providerCustomerId: `cus-${userId}`, userId,
      status: "active", planRef: "price-starter-recognition-test", seatQuantity: 1,
      currentPeriodEnd: new Date(Date.now() + 86400 * 30 * 1000).toISOString() },
  });
}

function fixture(paid = false) {
  initDb();
  const user = createUser(`${randomUUID()}@recognition.test`, "hash", "salt")!;
  if (paid) activate(user.id);
  const fileId = randomUUID();
  db.prepare(`INSERT INTO files (id,user_id,original_name,stored_name,storage_path,mime_type,size_bytes,file_kind,created_at)
    VALUES (?,?,'score.pdf','score.pdf','/unused/score.pdf','application/pdf',100,'source_pdf',?)`).run(fileId, user.id, new Date().toISOString());
  const input = { userId: user.id, title: "Recognition credit test", sourceFileId: fileId,
    sourceFileKind: "source_pdf" as const, sourceOriginalName: "score.pdf", pageCount: 1 };
  return { user, input };
}

function buyPass(userId: string) {
  const order = createPaymentOrder({ userId, provider: "stripe", billingKind: "one_time", entitlementDays: 0 })!;
  const metadata = { orderId: order.id, userId, planCode: "single-score" as const, priceId: "price_score_299", billingKind: "one_time" };
  prepareOneTimePurchase(db, { orderId: order.id, userId, planCode: "single-score", priceId: metadata.priceId });
  fulfillOneTimePurchase(db, { id: `cs-${randomUUID()}`, mode: "payment", status: "complete", payment_status: "paid",
    amount_total: 299, currency: "usd", payment_intent: `pi-${randomUUID()}`, metadata });
}

test("server quotes and reserves simple=1, complex=5; failed/cancelled reservations release and retries keep their original price", () => {
  const { user, input } = fixture(true);
  const oldLimit = config.quotaStarterJobsPerMonth, oldCost = config.omrComplexCreditCost;
  config.quotaStarterJobsPerMonth = 6;
  try {
    assert.deepEqual(getRecognitionOptions(user.id).options.map(option => [option.mode, option.creditCost, option.canSubmit]), [["simple", 1, true], ["complex", 5, true]]);
    const complex = createOmrImportScoreDocument({ ...input, recognitionMode: "complex" });
    const simple = createOmrImportScoreDocument(input);
    assert.equal(JSON.parse(complex.job!.params_json!).creditCost, 5);
    assert.equal(JSON.parse(simple.job!.params_json!).recognitionMode, "simple");
    assert.equal(getPlanQuotaUsage(user.id).jobs.used, 6);
    assert.throws(() => createOmrImportScoreDocument(input), PlanQuotaExceededError);
    assert.equal(getRecognitionOptions(user.id).options.every(option => !option.canSubmit), true);
    cancelScoreJob({ userId: user.id, documentId: complex.document!.id, jobId: complex.job!.id });
    assert.equal(getPlanQuotaUsage(user.id).jobs.used, 1);
    config.omrComplexCreditCost = 9;
    assert.equal(getRecognitionOptions(user.id).options[1].creditCost, 9);
    const retry = retryScoreJob({ userId: user.id, documentId: complex.document!.id, jobId: complex.job!.id })!;
    assert.equal(JSON.parse(retry.params_json!).creditCost, 5);
    assert.equal(JSON.parse(retry.params_json!).recognitionMode, "complex");
    assert.equal(getPlanQuotaUsage(user.id).jobs.used, 6);
    db.prepare("UPDATE score_jobs SET status = 'failed' WHERE id = ?").run(retry.id);
    assert.equal(getPlanQuotaUsage(user.id).jobs.used, 1);
    db.prepare("UPDATE score_jobs SET status = 'completed' WHERE id = ?").run(simple.job!.id);
    assert.equal(getPlanQuotaUsage(user.id).jobs.used, 1);
  } finally { config.quotaStarterJobsPerMonth = oldLimit; config.omrComplexCreditCost = oldCost; }
});

test("free lifetime trial remains simple-only and cannot submit complex through forged trial/pass flags", () => {
  const { user, input } = fixture();
  const quote = getRecognitionOptions(user.id);
  assert.equal(quote.options[0].creditSource, "free_trial");
  assert.equal(quote.options[1].reason, "COMPLEX_RECOGNITION_ENTITLEMENT_REQUIRED");
  for (const extra of [{ freeTrial: true }, { scorePass: true }, { scorePass: true, freeTrial: true }]) {
    assert.throws(() => createOmrImportScoreDocument({ ...input, ...extra, recognitionMode: "complex" }), error => error instanceof RecognitionAccessError || error instanceof ScorePassError);
  }
  assert.equal(getPlanQuotaUsage(user.id).jobs.used, 0);
  const trial = createOmrImportScoreDocument({ ...input, freeTrial: true });
  assert.equal(JSON.parse(trial.job!.params_json!).creditCost, 1);
  assert.equal(getFreeTrialAccess(user.id).omrJobsUsed, 1);
  assert.equal(getRecognitionOptions(user.id).options[0].canSubmit, false);
  cancelScoreJob({ userId: user.id, documentId: trial.document!.id, jobId: trial.job!.id });
  assert.equal(getFreeTrialAccess(user.id).available, true);
  assert.equal(getPlanQuotaUsage(user.id).jobs.used, 0);
});

test("a paid single-score pass spends five for complex, refunds failure, and retry still checks its balance after membership activates", () => {
  const { user, input } = fixture(); buyPass(user.id);
  assert.equal(getRecognitionOptions(user.id).options[1].creditSource, "score_pass");
  const complex = createOmrImportScoreDocument({ ...input, scorePass: true, recognitionMode: "complex" });
  assert.equal(listScorePasses(db, user.id)[0].remaining, 5);
  assert.equal(getFreeTrialAccess(user.id).omrJobsUsed, 0);
  assert.equal(getPlanQuotaUsage(user.id).jobs.used, 0);
  for (let i = 0; i < 5; i++) createScoreExportJob({ userId: user.id, documentId: complex.document!.id, params: { creditCost: 0 } });
  assert.equal(listScorePasses(db, user.id)[0].remaining, 0);
  db.prepare("UPDATE score_jobs SET status = 'failed' WHERE id = ?").run(complex.job!.id);
  assert.equal(listScorePasses(db, user.id)[0].remaining, 5);
  createScoreExportJob({ userId: user.id, documentId: complex.document!.id, params: {} });
  activate(user.id);
  assert.throws(() => retryScoreJob({ userId: user.id, documentId: complex.document!.id, jobId: complex.job!.id }), ScorePassError);
  assert.equal(listScorePasses(db, user.id)[0].remaining, 4);
  assert.equal(getPlanQuotaUsage(user.id).jobs.used, 0);
});

test("retrying an old-month complex job reserves the original five credits in the current month", () => {
  const { user, input } = fixture(true);
  const complex = createOmrImportScoreDocument({ ...input, recognitionMode: "complex" });
  const params = { ...JSON.parse(complex.job!.params_json!), creditReservedAt: "2020-01-01T00:00:00.000Z" };
  db.prepare("UPDATE score_jobs SET status='failed',created_at='2020-01-01T00:00:00.000Z',params_json=? WHERE id=?").run(JSON.stringify(params), complex.job!.id);
  const retry = retryScoreJob({ userId: user.id, documentId: complex.document!.id, jobId: complex.job!.id })!;
  assert.notEqual(retry.created_at, "2020-01-01T00:00:00.000Z");
  assert.equal((db.prepare("SELECT created_at FROM score_jobs WHERE id=?").get(complex.job!.id) as {created_at:string}).created_at, "2020-01-01T00:00:00.000Z");
  assert.equal(getPlanQuotaUsage(user.id).jobs.used, 5);
});

test("HTTP quotes require login and multipart/query modes reject conflicts; client creditCost cannot discount complex", async () => {
  const { user } = fixture(true), token = randomUUID(); createSession(user.id, token, 1);
  const app = Fastify({ logger: false }); await app.register(multipart); await app.register(authPlugin); await app.register(scoreRoutes, { prefix: "/api" });
  const headers = { authorization: `Bearer ${token}` };
  const pdf = await PDFDocument.create(); pdf.addPage([200, 300]); const bytes = Buffer.from(await pdf.save());
  const upload = (query: string, fields: Record<string, string> = {}) => {
    const boundary = "recognition-budget-boundary";
    // Fields follow the file too, as allowed by browser FormData insertion order.
    const payload = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="score.pdf"\r\nContent-Type: application/pdf\r\n\r\n`), bytes,
      ...Object.entries(fields).map(([name, value]) => Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}`)), Buffer.from(`\r\n--${boundary}--\r\n`)]);
    return app.inject({ method: "POST", url: `/api/scores/import/omr${query}`, headers: { ...headers, "content-type": `multipart/form-data; boundary=${boundary}` }, payload });
  };
  try {
    assert.equal((await app.inject({ method: "GET", url: "/api/scores/recognition-options" })).statusCode, 401);
    const options = await app.inject({ method: "GET", url: "/api/scores/recognition-options", headers });
    assert.equal(options.statusCode, 200); assert.equal(options.json().options[1].creditCost, 5);
    const beforeConfirmation = getPlanQuotaUsage(user.id).jobs.used;
    for (const expected of ["1", "4", "6"]) {
      const staleQuote = await upload(`?recognitionMode=complex&expectedCreditCost=${expected}`);
      assert.equal(staleQuote.statusCode, 409, staleQuote.body);
      assert.equal(staleQuote.json().code, "OMR_PRICE_CHANGED");
      assert.equal(staleQuote.json().options.find((option: { mode: string }) => option.mode === "complex").creditCost, 5);
    }
    const fieldQuote = await upload("?expectedCreditCost=1", { recognitionMode: "complex" });
    assert.equal(fieldQuote.statusCode, 409, fieldQuote.body);
    assert.equal(fieldQuote.json().code, "OMR_PRICE_CHANGED");
    const previousPrice = config.omrComplexCreditCost;
    config.omrComplexCreditCost = 7;
    try {
      const changed = await upload("?recognitionMode=complex&expectedCreditCost=5");
      assert.equal(changed.statusCode, 409, changed.body);
      assert.equal(changed.json().options.find((option: { mode: string }) => option.mode === "complex").creditCost, 7);
    } finally { config.omrComplexCreditCost = previousPrice; }
    for (const expected of ["0", "-1", "2.5", "oops"]) {
      const invalid = await upload(`?recognitionMode=simple&expectedCreditCost=${expected}`);
      assert.equal(invalid.statusCode, 400, invalid.body);
      assert.equal(invalid.json().code, "INVALID_EXPECTED_CREDIT_COST");
    }
    assert.equal(getPlanQuotaUsage(user.id).jobs.used, beforeConfirmation);
    assert.equal((db.prepare("SELECT COUNT(*) AS count FROM score_documents WHERE user_id=?").get(user.id) as {count:number}).count, 0);
    assert.equal((db.prepare("SELECT COUNT(*) AS count FROM files WHERE user_id=?").get(user.id) as {count:number}).count, 1);
    for (const [query, fields] of [["?recognitionMode=bogus", {}], ["?recognitionMode=complex&mode=simple", {}], ["?recognitionMode=complex", { mode: "simple" }], ["", { recognitionMode: "complex", mode: "simple" }]] as const) {
      const rejected = await upload(query, fields); assert.equal(rejected.statusCode, 400, rejected.body); assert.equal(rejected.json().code, "INVALID_RECOGNITION_MODE");
    }
    const accepted = await upload("?mode=complex&expectedCreditCost=5", { creditCost: "0" });
    assert.equal(accepted.statusCode, 201, accepted.body); assert.equal(accepted.json().recognition.creditCost, 5);
    assert.equal(accepted.json().job.params.recognitionMode, "complex");
    assert.equal(getPlanQuotaUsage(user.id).jobs.used, 5);
    const fieldMode = await upload("", { recognitionMode: "complex", creditCost: "1" });
    assert.equal(fieldMode.statusCode, 201, fieldMode.body); assert.equal(fieldMode.json().recognition.creditCost, 5);
    assert.equal(getPlanQuotaUsage(user.id).jobs.used, 10);
    const previousLimit = config.quotaStarterJobsPerMonth;
    config.quotaStarterJobsPerMonth = 15;
    try {
      const simultaneous = await Promise.all([upload("?recognitionMode=complex"), upload("?recognitionMode=complex")]);
      assert.deepEqual(simultaneous.map(response => response.statusCode).sort(), [201, 429]);
      assert.equal(getPlanQuotaUsage(user.id).jobs.used, 15);
      const files = db.prepare("SELECT COUNT(*) AS count FROM files WHERE user_id=?").get(user.id) as { count: number };
      assert.equal(files.count, 4); // fixture + three accepted sources; no rejected source consumes storage
    } finally { config.quotaStarterJobsPerMonth = previousLimit; }
  } finally { await app.close(); }
});

test("two API processes cannot reserve two five-credit imports against one five-credit balance", async () => {
  const { user, input } = fixture(true);
  const code = `(async()=>{const {createOmrImportScoreDocument}=await import('./src/repositories/score-repository.ts');
    try {createOmrImportScoreDocument({...JSON.parse(process.env.RECOGNITION_TEST_INPUT),recognitionMode:'complex'});process.stdout.write(JSON.stringify({ok:true}));}
    catch(error){process.stdout.write(JSON.stringify({ok:false,code:error.code}));}
    const {db}=await import('./src/db.ts');db.close();})().catch(error=>{process.stderr.write(String(error));process.exitCode=1;});`;
  const run = () => new Promise<{ ok: boolean; code?: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", "-e", code], { cwd: process.cwd(),
      env: { ...process.env, QUOTA_STARTER_JOBS_PER_MONTH: "5", RECOGNITION_TEST_INPUT: JSON.stringify(input) } });
    let stdout = "", stderr = ""; child.stdout.on("data", chunk => { stdout += chunk; }); child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject); child.on("close", status => { if (status !== 0) reject(new Error(stderr)); else { try { resolve(JSON.parse(stdout)); } catch (error) { reject(error); } } });
  });
  const results = await Promise.all([run(), run()]);
  assert.equal(results.filter(result => result.ok).length, 1);
  assert.equal(results.find(result => !result.ok)?.code, "PLAN_JOB_QUOTA_EXCEEDED");
  assert.equal(getPlanQuotaUsage(user.id).jobs.used, 5);
});
