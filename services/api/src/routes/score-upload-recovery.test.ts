import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import multipart from "@fastify/multipart";
import { PDFDocument } from "pdf-lib";
import { db, initDb } from "../db.js";
import { authPlugin } from "../plugins/auth.js";
import { createUser, createSession } from "../repositories/auth-repository.js";
import { scoreRoutes } from "./scores.js";
import { parseJianpuToScoreJson } from "../lib/jianpu-score-parser.js";
import { createScoreRevisionFromScoreJson } from "../repositories/score-repository.js";

test("a lost OMR upload response can be recovered/replayed without duplicate trial reservation", async () => {
  initDb();
  const user = createUser(`${crypto.randomUUID()}@upload.test`, "hash", "salt")!;
  const other = createUser(`${crypto.randomUUID()}@upload.test`, "hash", "salt")!;
  const token = crypto.randomUUID(), otherToken = crypto.randomUUID(), key = crypto.randomUUID();
  createSession(user.id, token, 1); createSession(other.id, otherToken, 1);
  const app = Fastify({ logger: false });
  await app.register(multipart);
  await app.register(authPlugin);
  await app.register(scoreRoutes, { prefix: "/api" });
  const pdf = await PDFDocument.create(); pdf.addPage([100, 100]);
  const pdfBytes = Buffer.from(await pdf.save());
  const boundary = "score-upload-recovery";
  const payload = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="score.pdf"\r\nContent-Type: application/pdf\r\n\r\n`), pdfBytes, Buffer.from(`\r\n--${boundary}--\r\n`)]);
  const headers = { authorization: `Bearer ${token}`, "idempotency-key": key, "content-type": `multipart/form-data; boundary=${boundary}` };
  const url = "/api/scores/import/omr?recognitionMode=simple";
  try {
    const initial = await app.inject({ method: "POST", url, headers, payload });
    assert.equal(initial.statusCode, 201, initial.body);
    const scoreId = initial.json().score.id, jobId = initial.json().job.id;
    const check = await app.inject({ method: "GET", url: `/api/scores/uploads/${key}`, headers: { authorization: `Bearer ${token}` } });
    assert.deepEqual(check.json(), { state: "completed", scoreId });
    // The free trial has now been reserved. Recovery still bypasses new work.
    const replay = await app.inject({ method: "POST", url, headers, payload });
    assert.equal(replay.statusCode, 200, replay.body);
    assert.equal(replay.json().score.id, scoreId);
    assert.equal(replay.json().job.id, jobId);
    assert.equal((db.prepare("SELECT COUNT(*) AS count FROM score_jobs WHERE user_id = ?").get(user.id) as { count: number }).count, 1);
    assert.equal((db.prepare("SELECT COUNT(*) AS count FROM score_documents WHERE user_id = ?").get(user.id) as { count: number }).count, 1);
    const otherCheck = await app.inject({ method: "GET", url: `/api/scores/uploads/${key}`, headers: { authorization: `Bearer ${otherToken}` } });
    assert.equal(otherCheck.statusCode, 404);
    const unauthenticated = await app.inject({ method: "GET", url: `/api/scores/uploads/${key}` });
    assert.equal(unauthenticated.statusCode, 401);
    const mismatch = await app.inject({ method: "POST", url: "/api/scores/import/omr?recognitionMode=complex", headers, payload });
    assert.equal(mismatch.statusCode, 409, mismatch.body);
    assert.equal(mismatch.json().code, "IDEMPOTENCY_KEY_REUSED");
    // Recovery must preserve the detail endpoint's entitlement redaction.
    db.prepare("UPDATE score_jobs SET params_json = ? WHERE id = ?").run(JSON.stringify({ freeTrial: false }), jobId);
    const model = parseJianpuToScoreJson({ text: "1=C\n4/4\n| 1 2 3 4 |", importedAt: new Date().toISOString(), sourceOriginalName: "test.jianpu.txt" });
    createScoreRevisionFromScoreJson({ documentId: scoreId, scoreJson: model, createdFrom: "manual_edit" });
    const restrictedReplay = await app.inject({ method: "POST", url, headers, payload });
    assert.equal(restrictedReplay.statusCode, 200, restrictedReplay.body);
    assert.equal(restrictedReplay.json().score.sourceFileId, null);
    assert.equal(restrictedReplay.json().score.currentRevision.scoreJson, undefined);
    assert.equal(restrictedReplay.json().score.currentRevision.musicxmlFileId, null);
  } finally { await app.close(); }
});
