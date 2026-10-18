import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import { db, initDb } from "../db.js";
import { config } from "../config.js";
import type { StoredFileKind } from "@score/shared";
import { authPlugin } from "../plugins/auth.js";
import { scoreRoutes } from "../routes/scores.js";
import { fileRoutes } from "../routes/files.js";
import { createToken } from "./auth.js";
import { getFreeTrialAccess } from "./free-trial.js";
import { parseJianpuToScoreJson } from "./jianpu-score-parser.js";
import { scoreJsonToMusicXml } from "./score-musicxml-export.js";
import { getPlanQuotaUsage, processingJobCreditCost } from "./plan-quotas.js";
import { bindScorePass, ScorePassError } from "./score-passes.js";
import { getScoreExportOptions, scoreExportPriceMatches } from "./score-export-options.js";
import { createSession, createUser, generateActivationCodes, redeemActivationCode, signInWithActivationCode } from "../repositories/auth-repository.js";
import { createCandidateScoreRevisionFromScoreJson, createScoreDocumentFromDerivedScoreJson, createScoreExportJob } from "../repositories/score-repository.js";

function fixture(plan: "free" | "credits-50" | "single-score" = "free") {
  initDb();
  let userId: string;
  if (plan === "free") userId = createUser(`${randomUUID()}@export-quote.test`, "hash", "salt")!.id;
  else {
    const code = generateActivationCodes({ planCode: plan, quantity: 1, entitlementDays: 30 }).codes[0]!;
    const login = signInWithActivationCode(code.code);
    assert.ok(login.ok);
    userId = login.userId;
  }
  const scoreJson = parseJianpuToScoreJson({ text: "1=C\n4/4\n| 1 2 3 4 |", importedAt: new Date().toISOString(), sourceOriginalName: "quote.jianpu.txt" });
  const document = createScoreDocumentFromDerivedScoreJson({ userId, title: "Quote fixture", scoreJson, createdFrom: "system" })!;
  if (plan === "single-score") bindScorePass(db, userId, document.id, 11);
  return { userId, documentId: document.id };
}

test("export quotes are read-only and match the existing monthly, prepaid and dedicated-pass charges", () => {
  for (const [plan, source] of [["free", "monthly"], ["credits-50", "prepaid"], ["single-score", "score_pass"]] as const) {
    const f = fixture(plan);
    const quotaBefore = getPlanQuotaUsage(f.userId);
    const trialBefore = getFreeTrialAccess(f.userId);
    const jobsBefore = db.prepare("SELECT COUNT(*) AS n FROM score_jobs WHERE user_id = ?").get(f.userId);
    const quote = getScoreExportOptions(f.userId, f.documentId);
    assert.deepEqual(getPlanQuotaUsage(f.userId), quotaBefore);
    assert.deepEqual(getFreeTrialAccess(f.userId), trialBefore);
    assert.deepEqual(db.prepare("SELECT COUNT(*) AS n FROM score_jobs WHERE user_id = ?").get(f.userId), jobsBefore);
    assert.equal(quote.balance.creditSource, source);
    assert.equal(quote.downloadCreditCost, 0);
    for (const option of quote.options.filter(o => !["jianpu", "score-json"].includes(o.format))) {
      assert.equal(option.creditCost, processingJobCreditCost({ job_type: "render_export", params_json: null }));
      assert.equal(option.canSubmit, plan !== "free");
      assert.equal(option.reason, plan === "free" ? "SCORE_PASS_REQUIRED" : undefined);
    }
    if (plan === "free") {
      assert.equal(quote.balance.available, 0);
      assert.throws(() => createScoreExportJob({ ...f, params: { format: "pdf" } }), error => error instanceof ScorePassError && error.code === "SCORE_PASS_REQUIRED");
      continue;
    }
    const job = createScoreExportJob({ ...f, params: { format: "pdf" } });
    assert.ok(job);
    assert.equal(getScoreExportOptions(f.userId, f.documentId).balance.available, quote.balance.available - 1);
    assert.deepEqual(getFreeTrialAccess(f.userId), trialBefore);
  }
});

test("a bound pass preserves priority and exhaustion rules; an unbound pass cannot fund another score", () => {
  const f = fixture("single-score");
  for (let i = 0; i < 10; i++) createScoreExportJob({ ...f, params: { format: "pdf" } });
  const quote = getScoreExportOptions(f.userId, f.documentId);
  assert.equal(quote.balance.creditSource, "score_pass");
  assert.equal(quote.balance.available, 0);
  assert.equal(quote.options.find(o => o.format === "pdf")!.canSubmit, false);
  assert.equal(getPlanQuotaUsage(f.userId).monthly.limit, 0);
  assert.throws(() => createScoreExportJob({ ...f, params: {} }), /10 processing credits/);
  for (const format of ["jianpu", "score-json"]) {
    const option = quote.options.find(o => o.format === format)!;
    assert.equal(option.creditCost, 0);
    assert.equal(option.canSubmit, true);
  }
  const other = fixture();
  const code = generateActivationCodes({ planCode: "single-score", quantity: 1, entitlementDays: 30 }).codes[0]!;
  assert.ok(redeemActivationCode(other.userId, code.code).ok);
  assert.equal(getScoreExportOptions(other.userId, other.documentId).balance.creditSource, "monthly");
});

test("an active plan uses monthly then prepaid credits before falling back to its bound pass", () => {
  const f = fixture("single-score");
  const monthlyCode = generateActivationCodes({ planCode: "starter-monthly", quantity: 1, entitlementDays: 30 }).codes[0]!;
  assert.ok(redeemActivationCode(f.userId, monthlyCode.code).ok);
  assert.equal(getScoreExportOptions(f.userId, f.documentId).balance.creditSource, "monthly");
  const monthlyLimit = getPlanQuotaUsage(f.userId).monthly.limit;
  const now = new Date().toISOString();
  for (let i = 0; i < monthlyLimit; i++) db.prepare("INSERT INTO score_jobs (id,user_id,document_id,job_type,status,created_at,updated_at) VALUES (?,?,?,'render_export','completed',?,?)")
    .run(randomUUID(), f.userId, f.documentId, now, now);
  assert.equal(getScoreExportOptions(f.userId, f.documentId).balance.creditSource, "score_pass");
  const prepaidCode = generateActivationCodes({ planCode: "credits-50", quantity: 1, entitlementDays: 30 }).codes[0]!;
  assert.ok(redeemActivationCode(f.userId, prepaidCode.code).ok);
  const quote = getScoreExportOptions(f.userId, f.documentId);
  assert.equal(quote.balance.creditSource, "prepaid");
  assert.equal(quote.balance.available, 50);
  createScoreExportJob({ ...f, params: { format: "pdf" } });
  assert.equal(getScoreExportOptions(f.userId, f.documentId).balance.available, 49);
});

test("API quote, changed-price rejection, generated exports and direct TXT/JSON preserve billing", async () => {
  const f = fixture("credits-50");
  const token = createToken();
  createSession(f.userId, token, 1);
  const app = Fastify({ logger: false });
  await app.register(authPlugin);
  await app.register(scoreRoutes, { prefix: "/api" });
  await app.ready();
  const headers = { authorization: `Bearer ${token}` };
  const base = `/api/scores/${f.documentId}`;
  const before = getPlanQuotaUsage(f.userId);
  try {
    const anonymous = await app.inject({ method: "GET", url: `${base}/export-options` });
    assert.equal(anonymous.statusCode, 401);
    const quoted = await app.inject({ method: "GET", url: `${base}/export-options`, headers });
    assert.equal(quoted.statusCode, 200, quoted.body);
    assert.deepEqual(getPlanQuotaUsage(f.userId), before);
    assert.equal(quoted.json().balance.available, 50);
    const changed = await app.inject({ method: "POST", url: `${base}/exports`, headers, payload: { format: "pdf", options: {}, expectedCreditCost: 2 } });
    assert.equal(changed.statusCode, 409, changed.body);
    assert.equal(changed.json().code, "EXPORT_PRICE_CHANGED");
    assert.deepEqual(getPlanQuotaUsage(f.userId), before);
    for (const format of ["jianpu", "score-json"]) {
      const direct = await app.inject({ method: "POST", url: `${base}/export/${format}`, headers });
      assert.equal(direct.statusCode, 201, direct.body);
      assert.deepEqual(getPlanQuotaUsage(f.userId).prepaid, before.prepaid);
      assert.deepEqual(getPlanQuotaUsage(f.userId).monthly, before.monthly);
    }
    const generated = await app.inject({ method: "POST", url: `${base}/exports`, headers, payload: { format: "pdf", options: {}, expectedCreditCost: 1 } });
    assert.equal(generated.statusCode, 202, generated.body);
    assert.equal(getPlanQuotaUsage(f.userId).prepaid.remaining, 49);
    const legacyClient = await app.inject({ method: "POST", url: `${base}/exports`, headers, payload: { format: "midi", options: {} } });
    assert.equal(legacyClient.statusCode, 202, legacyClient.body);
    assert.equal(getPlanQuotaUsage(f.userId).prepaid.remaining, 48);
    const other = fixture("credits-50");
    const privateQuote = await app.inject({ method: "GET", url: `/api/scores/${other.documentId}/export-options`, headers });
    assert.equal(privateQuote.statusCode, 404, privateQuote.body);
    const pass = fixture("single-score");
    const passToken = createToken();
    createSession(pass.userId, passToken, 1);
    for (const format of ["jianpu", "score-json"]) {
      const direct = await app.inject({ method: "POST", url: `/api/scores/${pass.documentId}/export/${format}`, headers: { authorization: `Bearer ${passToken}` } });
      assert.equal(direct.statusCode, 201, direct.body);
      assert.equal(getScoreExportOptions(pass.userId, pass.documentId).balance.available, 10);
    }
  } finally { await app.close(); }
});

test("optional expected-cost guard preserves old clients and only accepts the authoritative current price", () => {
  const f = fixture();
  const quote = getScoreExportOptions(f.userId, f.documentId);
  assert.equal(scoreExportPriceMatches(undefined, "pdf", quote), true);
  assert.equal(scoreExportPriceMatches(1, "pdf", quote), true);
  for (const cost of [0, 2, "1", null]) assert.equal(scoreExportPriceMatches(cost, "pdf", quote), false);
});

test("an existing free project can quote, export TXT/JSON and download with no monthly credits left", async () => {
  const f = fixture();
  const now = new Date().toISOString();
  // Represent the completed lifetime free scan that grants editing access.
  db.prepare("INSERT INTO score_jobs (id,user_id,document_id,job_type,status,params_json,created_at,updated_at) VALUES (?,?,?,'omr_import','completed',?,?,?)")
    .run(randomUUID(), f.userId, f.documentId, JSON.stringify({ freeTrial: true }), now, now);
  const remaining = getPlanQuotaUsage(f.userId).monthly.remaining;
  for (let i = 0; i < remaining; i++) db.prepare("INSERT INTO score_jobs (id,user_id,document_id,job_type,status,created_at,updated_at) VALUES (?,?,?,'render_export','completed',?,?)")
    .run(randomUUID(), f.userId, f.documentId, now, now);
  const token = createToken();
  createSession(f.userId, token, 1);
  const app = Fastify({ logger: false });
  await app.register(authPlugin);
  await app.register(scoreRoutes, { prefix: "/api" });
  await app.register(fileRoutes, { prefix: "/api" });
  await app.ready();
  const headers = { authorization: `Bearer ${token}` };
  const before = getPlanQuotaUsage(f.userId);
  const trialBefore = getFreeTrialAccess(f.userId);
  const jobsBefore = db.prepare("SELECT COUNT(*) AS n FROM score_jobs WHERE user_id = ?").get(f.userId);
  try {
    assert.equal(before.monthly.remaining, 0);
    assert.equal(trialBefore.omrJobsRemaining, 0);
    const response = await app.inject({ method: "GET", url: `/api/scores/${f.documentId}/export-options`, headers });
    assert.equal(response.statusCode, 200, response.body);
    const quote = response.json() as ReturnType<typeof getScoreExportOptions>;
    assert.equal(quote.balance.available, 0);
    assert.equal(quote.options.find(option => option.format === "pdf")!.canSubmit, false);
    for (const format of ["pdf", "musicxml", "midi", "svg", "png", "audio/wav", "audio/mp3"]) {
      const direct = await app.inject({ method: "POST", url: `/api/scores/${f.documentId}/export/${format}`, headers });
      assert.equal(direct.statusCode, 403, direct.body);
      assert.equal(direct.json().code, "SCORE_PASS_REQUIRED");
    }
    for (const format of ["pdf", "musicxml", "midi", "svg", "png", "wav", "mp3"]) {
      const queued = await app.inject({ method: "POST", url: `/api/scores/${f.documentId}/exports`, headers, payload: { format, options: {} } });
      assert.equal(queued.statusCode, 403, queued.body);
      assert.equal(queued.json().code, "SCORE_PASS_REQUIRED");
    }
    for (const format of ["jianpu", "score-json"]) {
      assert.equal(quote.options.find(option => option.format === format)!.creditCost, 0);
      assert.equal(quote.options.find(option => option.format === format)!.canSubmit, true);
      const direct = await app.inject({ method: "POST", url: `/api/scores/${f.documentId}/export/${format}`, headers });
      assert.equal(direct.statusCode, 201, direct.body);
      const download = await app.inject({ method: "GET", url: `/api/files/${direct.json().file.id}/download`, headers });
      assert.equal(download.statusCode, 200, download.body);
      assert.ok(download.rawPayload.length > 0);
    }
    assert.deepEqual(getPlanQuotaUsage(f.userId).monthly, before.monthly);
    assert.deepEqual(getPlanQuotaUsage(f.userId).prepaid, before.prepaid);
    assert.deepEqual(getFreeTrialAccess(f.userId), trialBefore);
    assert.deepEqual(db.prepare("SELECT COUNT(*) AS n FROM score_jobs WHERE user_id = ?").get(f.userId), jobsBefore);
  } finally { await app.close(); }
});

test("free file downloads cannot bypass paid formats, while source images, score data and structured previews remain free", async () => {
  const f = fixture(), now = new Date().toISOString();
  db.prepare("INSERT INTO score_jobs (id,user_id,document_id,job_type,status,params_json,created_at,updated_at) VALUES (?,?,?,'omr_import','completed',?,?,?)")
    .run(randomUUID(), f.userId, f.documentId, JSON.stringify({ freeTrial: true }), now, now);
  const token = createToken(); createSession(f.userId, token, 1);
  const app = Fastify({ logger: false });
  await app.register(authPlugin); await app.register(scoreRoutes, { prefix: "/api" }); await app.register(fileRoutes, { prefix: "/api" });
  const headers = { authorization: `Bearer ${token}` };
  const paidKinds: StoredFileKind[] = ["score_musicxml", "output_pdf", "rendered_pdf", "rendered_svg", "rendered_png", "output_midi", "output_audio"];
  const freeKinds: StoredFileKind[] = ["source_pdf", "source_image", "score_json_snapshot", "output_jianpu", "omr_page_image", "omr_bundle"];
  const directory = path.join(config.storageDir, f.userId, "download-test"); fs.mkdirSync(directory, { recursive: true });
  const files = [...paidKinds, ...freeKinds].map(kind => {
    const id = randomUUID(), filename = `${id}.dat`, storagePath = path.join(directory, filename);
    fs.writeFileSync(storagePath, kind);
    db.prepare("INSERT INTO files (id,user_id,original_name,stored_name,storage_path,mime_type,size_bytes,file_kind,created_at) VALUES (?,?,?,?,?,'application/octet-stream',?,?,?)")
      .run(id, f.userId, filename, filename, storagePath, kind.length, kind, now);
    db.prepare("INSERT INTO score_assets (id,document_id,file_id,asset_kind,created_at) VALUES (?,?,?,?,?)").run(randomUUID(), f.documentId, id, kind, now);
    return { id, kind };
  });
  const rawXmlFile = files.find(file => file.kind === "score_musicxml")!;
  const rawRevision = db.prepare("SELECT id,score_json FROM score_revisions WHERE document_id = ?").get(f.documentId) as { id: string; score_json: string };
  const rawXml = scoreJsonToMusicXml(JSON.parse(rawRevision.score_json)).replace("<score-partwise", "<!-- retained original engraving -->\n<score-partwise");
  const rawXmlPath = path.join(directory, `${rawXmlFile.id}.dat`); fs.writeFileSync(rawXmlPath, rawXml);
  db.prepare("UPDATE files SET size_bytes = ? WHERE id = ?").run(Buffer.byteLength(rawXml), rawXmlFile.id);
  db.prepare("UPDATE score_revisions SET musicxml_file_id = ? WHERE id = ?").run(rawXmlFile.id, rawRevision.id);
  try {
    for (const { id, kind } of files) {
      for (const query of ["", "?inline=1"]) {
        const response = await app.inject({ method: "GET", url: `/api/files/${id}/download${query}`, headers });
        assert.equal(response.statusCode, paidKinds.includes(kind) ? 403 : 200, `${kind}: ${response.body}`);
        if (paidKinds.includes(kind)) assert.equal(response.json().code, "SCORE_PASS_REQUIRED");
      }
    }
    const preview = await app.inject({ method: "GET", url: `/api/scores/${f.documentId}/musicxml-preview`, headers });
    assert.equal(preview.statusCode, 200, preview.body);
    assert.equal(preview.json().musicXml, rawXml);
    const candidate = createCandidateScoreRevisionFromScoreJson({ documentId: f.documentId, scoreJson: JSON.parse(rawRevision.score_json),
      createdFrom: "omr_import", musicxmlFileId: rawXmlFile.id })!;
    const candidatePreview = await app.inject({ method: "GET", url: `/api/scores/${f.documentId}/candidate/musicxml-preview`, headers });
    assert.equal(candidatePreview.statusCode, 200, candidatePreview.body);
    assert.equal(candidatePreview.json().revisionId, candidate.id);
    assert.equal(candidatePreview.json().musicXml, rawXml);
    const pass = generateActivationCodes({ planCode: "single-score", quantity: 1, entitlementDays: 30 }).codes[0]!;
    assert.ok(redeemActivationCode(f.userId, pass.code).ok); bindScorePass(db, f.userId, f.documentId, 1);
    for (const { id, kind } of files.filter(file => paidKinds.includes(file.kind))) {
      const response = await app.inject({ method: "GET", url: `/api/files/${id}/download`, headers });
      assert.equal(response.statusCode, 200, `${kind}: ${response.body}`);
    }
    assert.equal(getPlanQuotaUsage(f.userId).monthly.used, 0);
  } finally { await app.close(); }
});
