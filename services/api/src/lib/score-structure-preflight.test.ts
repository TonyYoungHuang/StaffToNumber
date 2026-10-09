import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash, randomUUID } from "node:crypto";
import { request as httpRequest } from "node:http";
import test from "node:test";
import Fastify from "fastify";
import multipart from "@fastify/multipart";
import { PDFDocument } from "pdf-lib";
import { config } from "../config.js";
import { db, initDb } from "../db.js";
import { createSession, createUser } from "../repositories/auth-repository.js";
import { authPlugin } from "../plugins/auth.js";
import { registerScoreStructurePreflightRoute } from "../routes/score-structure-preflight.js";
import { getPlanQuotaUsage } from "./plan-quotas.js";
import { getRecognitionOptions } from "./recognition-options.js";
import { runScoreStructurePreflight, ScorePreflightError } from "./score-structure-preflight.js";
import { inspectPdfRasterSafety, UploadSecurityError } from "./upload-security.js";

const validResult = {
  schemaVersion: 1, recommendation: "simple", confidence: "high", sourcePageCount: 1, pagesAnalyzed: 1, complete: true,
  reasonCodes: ["SINGLE_STAFF_LAYOUT"], pages: [{ page: 1, staffCount: 4, systemCount: 4, maxStavesPerSystem: 1, hasTab: false, uncertain: false }],
};

async function fixture(code: string) {
  initDb();
  const user = createUser(`${randomUUID()}@preflight.test`, "hash", "salt")!;
  const token = randomUUID(); createSession(user.id, token, 1);
  const adapterDir = await fs.mkdtemp(path.join(os.tmpdir(), "score-preflight-adapter-"));
  const adapterPath = path.join(adapterDir, "adapter.cjs");
  await fs.writeFile(adapterPath, `const fs=require('node:fs');const args=process.argv;
    const request=JSON.parse(fs.readFileSync(args[args.indexOf('--request')+1],'utf8'));
    const response=args[args.indexOf('--response')+1]; ${code}`);
  const oldConfig = { python: config.scorePreflightPythonCommand, adapter: config.scorePreflightAdapterPath, timeout: config.scorePreflightTimeoutMs };
  config.scorePreflightPythonCommand = process.execPath;
  config.scorePreflightAdapterPath = adapterPath;
  const app = Fastify({ logger: false });
  await app.register(multipart); await app.register(authPlugin); registerScoreStructurePreflightRoute(app);
  const pdf = await PDFDocument.create(); pdf.addPage([200, 300]);
  const validPdf = Buffer.from(await pdf.save());
  const upload = (bytes = validPdf, auth = true) => {
    const boundary = "free-preflight-boundary";
    const payload = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="score.pdf"\r\nContent-Type: application/pdf\r\n\r\n`), bytes, Buffer.from(`\r\n--${boundary}--\r\n`)]);
    return app.inject({ method: "POST", url: "/scores/import/omr/preflight", headers: {
      ...(auth ? { authorization: `Bearer ${token}` } : {}), "content-type": `multipart/form-data; boundary=${boundary}`,
    }, payload });
  };
  const close = async () => {
    await app.close(); config.scorePreflightPythonCommand = oldConfig.python;
    config.scorePreflightAdapterPath = oldConfig.adapter; config.scorePreflightTimeoutMs = oldConfig.timeout;
    await fs.rm(adapterDir, { recursive: true, force: true });
  };
  return { user, upload, close };
}

async function assertTemporaryFilesCleared() {
  for (const dir of [".preflight", ".quarantine"]) {
    const files = await fs.readdir(path.join(config.storageDir, dir)).catch(() => []);
    assert.deepEqual(files, [], `temporary ${dir} files must be removed`);
  }
}

function persistentCounts(userId: string) {
  return ["files", "score_documents", "score_jobs", "jobs"].map(table =>
    (db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE user_id=?`).get(userId) as {count:number}).count);
}

test("free structure preflight requires login, is available without recognition credits and never persists or bills a score", async () => {
  const f = await fixture(`if(request.limits.maxPages!==60 || request.limits.maxTotalPixels!==30000000)process.exit(1);
    fs.writeFileSync(response,JSON.stringify(${JSON.stringify(validResult)}));`);
  const oldQuota = config.quotaFreeJobsPerMonth, oldTrial = config.freeTrialOmrJobs;
  config.quotaFreeJobsPerMonth = 0; config.freeTrialOmrJobs = 0;
  try {
    assert.equal(getRecognitionOptions(f.user.id).options.every(option => !option.canSubmit), true);
    assert.equal((await f.upload(undefined, false)).statusCode, 401);
    const before = persistentCounts(f.user.id), beforeCredits = getPlanQuotaUsage(f.user.id).jobs.used;
    const response = await f.upload(); assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().preflight.recommendation, "simple");
    assert.deepEqual(persistentCounts(f.user.id), before);
    assert.equal(getPlanQuotaUsage(f.user.id).jobs.used, beforeCredits);
    await assertTemporaryFilesCleared();
  } finally { config.quotaFreeJobsPerMonth = oldQuota; config.freeTrialOmrJobs = oldTrial; await f.close(); }
});

test("partial-page inspection never recommends simple and discards all temporary input and result files", async () => {
  const f = await fixture(`fs.writeFileSync(response,JSON.stringify(${JSON.stringify({ ...validResult, sourcePageCount: 4, complete: false })}));`);
  try {
    const response = await f.upload(); assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().preflight.recommendation, "uncertain");
    assert.equal(response.json().preflight.confidence, "low");
    assert.equal(response.json().preflight.reasonCodes.includes("INCOMPLETE_ANALYSIS"), true);
    assert.deepEqual(persistentCounts(f.user.id), [0, 0, 0, 0]); await assertTemporaryFilesCleared();
  } finally { await f.close(); }
});

test("corrupt PDF is rejected by existing OMR safety checks without launching recognition or retaining uploads", async () => {
  const f = await fixture("process.exit(1);");
  try {
    const response = await f.upload(Buffer.from("%PDF-1.7 corrupt content"));
    assert.equal(response.statusCode, 422, response.body); assert.equal(response.json().code, "PDF_INVALID");
    assert.deepEqual(persistentCounts(f.user.id), [0, 0, 0, 0]); await assertTemporaryFilesCleared();
  } finally { await f.close(); }
});

test("preflight discloses unsupported formal PDF admission before any credit reservation", async () => {
  const f = await fixture(`fs.writeFileSync(response,JSON.stringify(${JSON.stringify(validResult)}));`);
  const pdf = await PDFDocument.create(); pdf.addPage([40 * 72, 60 * 72]);
  try {
    const checked = await f.upload(Buffer.from(await pdf.save()));
    assert.equal(checked.statusCode, 200, checked.body);
    assert.deepEqual(checked.json().preflight.recognitionSupport, { supported: false, code: "PDF_PAGE_PIXEL_LIMIT" });
    assert.deepEqual(persistentCounts(f.user.id), [0, 0, 0, 0]);
    await assertTemporaryFilesCleared();
  } finally { await f.close(); }
});

test("oversized preflight upload returns a size error and leaves no partial file", async () => {
  const f = await fixture("process.exit(1);"); const previousLimit = config.uploadMaxBytes;
  config.uploadMaxBytes = 128;
  try {
    const response = await f.upload(); assert.equal(response.statusCode, 413, response.body);
    assert.equal(response.json().code, "FILE_TOO_LARGE");
    assert.deepEqual(persistentCounts(f.user.id), [0, 0, 0, 0]); await assertTemporaryFilesCleared();
  } finally { config.uploadMaxBytes = previousLimit; await f.close(); }
});

test("timed-out adapter is killed, releases capacity and cleans source/request/response files", async () => {
  const f = await fixture("setTimeout(()=>{},60000);"); config.scorePreflightTimeoutMs = 150;
  try {
    const response = await f.upload(); assert.equal(response.statusCode, 504, response.body);
    assert.equal(response.json().code, "SCORE_PREFLIGHT_TIMEOUT");
    assert.deepEqual(persistentCounts(f.user.id), [0, 0, 0, 0]); await assertTemporaryFilesCleared();
    // A second request must reach the adapter rather than leave a stuck concurrency slot.
    assert.equal((await f.upload()).json().code, "SCORE_PREFLIGHT_TIMEOUT");
  } finally { await f.close(); }
});

test("malformed or oversized adapter responses fail explicitly, never create jobs and clean temporary files", async () => {
  for (const code of ["fs.writeFileSync(response,'{');", "fs.writeFileSync(response,'x'.repeat(128001));", "process.stdout.write('x'.repeat(40000));setTimeout(()=>{},60000);", "process.exit(3);"]) {
    const f = await fixture(code);
    try {
      const response = await f.upload(); assert.equal(response.statusCode, 503, response.body);
      assert.equal(response.json().code, code === "process.exit(3);" ? "SCORE_PREFLIGHT_UNAVAILABLE" : "SCORE_PREFLIGHT_FAILED");
      assert.deepEqual(persistentCounts(f.user.id), [0, 0, 0, 0]); await assertTemporaryFilesCleared();
    } finally { await f.close(); }
  }
});

test("free preflight rate and process limits return retryable responses without billing", async () => {
  const f = await fixture(`setTimeout(()=>fs.writeFileSync(response,JSON.stringify(${JSON.stringify(validResult)})),200);`);
  const previousLimit = config.scorePreflightRequestsPerMinute; config.scorePreflightRequestsPerMinute = 1;
  try {
    const first = f.upload();
    await new Promise(resolve => setTimeout(resolve, 40));
    const concurrent = await f.upload(); assert.equal(concurrent.statusCode, 429, concurrent.body);
    assert.equal(concurrent.json().code, "SCORE_PREFLIGHT_BUSY"); assert.equal(concurrent.headers["retry-after"], "5");
    assert.equal((await first).statusCode, 200);
    const limited = await f.upload(); assert.equal(limited.statusCode, 429, limited.body);
    assert.equal(limited.json().code, "SCORE_PREFLIGHT_RATE_LIMIT"); assert.equal(limited.headers["retry-after"], "60");
    assert.deepEqual(persistentCounts(f.user.id), [0, 0, 0, 0]); await assertTemporaryFilesCleared();
  } finally { config.scorePreflightRequestsPerMinute = previousLimit; await f.close(); }
});

test("real model-free Python adapter inspects authored PDF pages through the authenticated API", { skip: !process.env.SCORE_PREFLIGHT_INTEGRATION_PYTHON }, async () => {
  const f = await fixture("process.exit(1);");
  config.scorePreflightPythonCommand = process.env.SCORE_PREFLIGHT_INTEGRATION_PYTHON!;
  config.scorePreflightAdapterPath = path.resolve("../worker/python/score_structure_preflight.py");
  try {
    const pdf = await PDFDocument.create();
    for (let pageNumber = 0; pageNumber < 2; pageNumber++) {
      const page = pdf.addPage([400, 500]);
      for (let system = 0; system < 3; system++) {
        const y = 410 - system * 120;
        for (let line = 0; line < 5; line++) page.drawLine({ start: { x: 50, y: y - line * 5 }, end: { x: 350, y: y - line * 5 }, thickness: 0.6 });
        // Original authored margin and note shapes; no customer content.
        page.drawRectangle({ x: 55, y: y - 30, width: 5, height: 45 });
        for (const x of [120, 170, 220, 270]) {
          page.drawEllipse({ x, y: y - 15, xScale: 3, yScale: 2 });
          page.drawLine({ start: { x: x + 3, y: y - 15 }, end: { x: x + 3, y: y + 6 }, thickness: 0.7 });
        }
      }
    }
    const response = await f.upload(Buffer.from(await pdf.save()));
    assert.equal(response.statusCode, 200, response.body);
    const preflight = response.json().preflight;
    assert.equal(preflight.sourcePageCount, 2); assert.equal(preflight.pagesAnalyzed, 2); assert.equal(preflight.complete, true);
    assert.equal(preflight.pages.every((page: {staffCount:number;hasTab:boolean}) => page.staffCount >= 3 && !page.hasTab), true);
    assert.deepEqual(persistentCounts(f.user.id), [0, 0, 0, 0]); await assertTemporaryFilesCleared();
  } finally { await f.close(); }
});

test("client cancellation after the upload kills inspection and releases the user slot", async () => {
  // Exercise an actual response socket close. This resource test needs no DB.
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "score-preflight-cancel-"));
  const adapterPath = path.join(tempRoot, "adapter.cjs"), markerPath = path.join(tempRoot, "started");
  await fs.writeFile(adapterPath, `const fs=require('node:fs');const a=process.argv;const response=a[a.indexOf('--response')+1];
    const marker=${JSON.stringify(markerPath)};
    if(!fs.existsSync(marker)){fs.writeFileSync(marker,'started');setTimeout(()=>{},60000);}
    else fs.writeFileSync(response,JSON.stringify(${JSON.stringify(validResult)}));`);
  const original = { python: config.scorePreflightPythonCommand, adapter: config.scorePreflightAdapterPath, storage: config.storageDir };
  config.scorePreflightPythonCommand = process.execPath; config.scorePreflightAdapterPath = adapterPath;
  config.storageDir = path.join(tempRoot, "storage");
  const userId = randomUUID();
  const app = Fastify({ logger: false });
  app.decorate("requireScorePreviewAccess", async request => { request.authUserId = userId; });
  await app.register(multipart); registerScoreStructurePreflightRoute(app);
  const origin = await app.listen({ host: "127.0.0.1", port: 0 });
  const pdf = await PDFDocument.create(); pdf.addPage([200, 300]);
  const boundary = "preflight-cancel-boundary";
  const payload = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="score.pdf"\r\nContent-Type: application/pdf\r\n\r\n`), Buffer.from(await pdf.save()), Buffer.from(`\r\n--${boundary}--\r\n`)]);
  const waitUntil = async (predicate: () => Promise<boolean>) => {
    const deadline = Date.now() + 4000;
    while (!await predicate()) { assert.equal(Date.now() < deadline, true, "cancellation must release the slot promptly"); await new Promise(resolve => setTimeout(resolve, 25)); }
  };
  const client = httpRequest(`${origin}/scores/import/omr/preflight`, { method: "POST", headers: { "content-type": `multipart/form-data; boundary=${boundary}`, "content-length": String(payload.length) } });
  client.on("error", () => undefined); client.end(payload);
  try {
    await waitUntil(() => fs.stat(markerPath).then(() => true, () => false));
    client.destroy();
    await waitUntil(() => fs.readdir(path.join(config.storageDir, ".preflight")).then(files => files.length === 0));
    const next = await app.inject({ method: "POST", url: "/scores/import/omr/preflight", headers: { "content-type": `multipart/form-data; boundary=${boundary}` }, payload });
    assert.equal(next.statusCode, 200, next.body); await assertTemporaryFilesCleared();
  } finally {
    client.destroy(); await app.close(); config.scorePreflightPythonCommand = original.python;
    config.scorePreflightAdapterPath = original.adapter; config.storageDir = original.storage;
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("missing adapter reports service unavailable without blaming or retaining the score", async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "score-preflight-missing-"));
  const previous = config.scorePreflightAdapterPath;
  config.scorePreflightAdapterPath = path.join(workspace, "missing.py");
  try {
    await assert.rejects(() => runScoreStructurePreflight({ sourcePath: path.join(workspace, "source.pdf"), workspace }),
      (error: unknown) => error instanceof ScorePreflightError && error.code === "SCORE_PREFLIGHT_UNAVAILABLE" && error.statusCode === 503);
    assert.deepEqual(await fs.readdir(workspace), []);
  } finally { config.scorePreflightAdapterPath = previous; await fs.rm(workspace, { recursive: true, force: true }); }
});

test("normal twenty-page PDF gets free inspection without the paid raster limit or trimming its original pages", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "score-preflight-long-pdf-"));
  const pdf = await PDFDocument.create(); for (let page = 0; page < 20; page++) pdf.addPage([595.28, 841.89]);
  const bytes = Buffer.from(await pdf.save());
  // Free and formal admission agree, and all pages fit an adaptive plan.
  const plan = await inspectPdfRasterSafety(bytes);
  assert.equal(plan.pageCount, 20);
  assert.equal(plan.pages.every(page => page.dpi! >= 150 && page.dpi! < 300), true);
  assert.ok(plan.totalPixels <= 120_000_000);
  const expectedHash = createHash("sha256").update(bytes).digest("hex");
  const adapterPath = path.join(tempRoot, "verify-original.cjs");
  const partialResult = { ...validResult, recommendation: "uncertain", confidence: "low", sourcePageCount: 20, pagesAnalyzed: 0, complete: false, pages: [] };
  await fs.writeFile(adapterPath, `const fs=require('node:fs');const crypto=require('node:crypto');const args=process.argv;
    const request=JSON.parse(fs.readFileSync(args[args.indexOf('--request')+1],'utf8'));
    if(crypto.createHash('sha256').update(fs.readFileSync(request.sourcePath)).digest('hex')!==${JSON.stringify(expectedHash)})process.exit(2);
    fs.writeFileSync(args[args.indexOf('--response')+1],JSON.stringify(${JSON.stringify(partialResult)}));`);
  const original = { python: config.scorePreflightPythonCommand, adapter: config.scorePreflightAdapterPath, storage: config.storageDir };
  config.scorePreflightPythonCommand = process.execPath; config.scorePreflightAdapterPath = adapterPath; config.storageDir = path.join(tempRoot, "storage");
  const app = Fastify({ logger: false }); const userId = randomUUID();
  app.decorate("requireScorePreviewAccess", async request => { request.authUserId = userId; });
  await app.register(multipart); registerScoreStructurePreflightRoute(app);
  const boundary = "preflight-long-pdf-boundary";
  const payload = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="twenty-pages.pdf"\r\nContent-Type: application/pdf\r\n\r\n`), bytes, Buffer.from(`\r\n--${boundary}--\r\n`)]);
  const upload = () => app.inject({ method: "POST", url: "/scores/import/omr/preflight", headers: { "content-type": `multipart/form-data; boundary=${boundary}` }, payload });
  try {
    const checked = await upload(); assert.equal(checked.statusCode, 200, checked.body);
    assert.equal(checked.json().preflight.recognitionSupport.supported, true);
    assert.equal(checked.json().preflight.recognitionSupport.code, "PDF_ADAPTIVE_RENDER");
    assert.equal(checked.json().preflight.recognitionSupport.pageDpi.length, 20);
    assert.equal(checked.json().preflight.sourcePageCount, 20); assert.equal(checked.json().preflight.recommendation, "uncertain");
    await assertTemporaryFilesCleared();
    if (process.env.SCORE_PREFLIGHT_INTEGRATION_PYTHON) {
      config.scorePreflightPythonCommand = process.env.SCORE_PREFLIGHT_INTEGRATION_PYTHON;
      config.scorePreflightAdapterPath = path.resolve("../worker/python/score_structure_preflight.py");
      const real = await upload(); assert.equal(real.statusCode, 200, real.body);
      assert.equal(real.json().preflight.sourcePageCount, 20);
      assert.equal(real.json().preflight.pagesAnalyzed, 20); assert.equal(real.json().preflight.complete, true);
      assert.equal(real.json().preflight.recommendation, "uncertain"); await assertTemporaryFilesCleared();
    }
  } finally {
    await app.close(); config.scorePreflightPythonCommand = original.python; config.scorePreflightAdapterPath = original.adapter;
    config.storageDir = original.storage; await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
