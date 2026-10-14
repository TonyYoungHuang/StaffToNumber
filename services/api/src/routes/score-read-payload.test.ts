import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { db, initDb } from "../db.js";
import { parseJianpuToScoreJson } from "../lib/jianpu-score-parser.js";
import { authPlugin } from "../plugins/auth.js";
import { createSession } from "../repositories/auth-repository.js";
import { createCandidateScoreRevisionFromScoreJson, createScoreRevisionFromScoreJson } from "../repositories/score-repository.js";
import { scoreRoutes } from "./scores.js";

test("score detail carries a single candidate model and lists keep revision metadata only", async t => {
  initDb();
  const userId = crypto.randomUUID(), documentId = crypto.randomUUID(), token = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare("INSERT INTO users (id,email,password_hash,password_salt,created_at,updated_at,account_status) VALUES (?,?,'hash','salt',?,?,'active')")
    .run(userId, `${userId}@read-payload.test`, now, now);
  createSession(userId, token, 1);
  db.prepare("INSERT INTO score_documents (id,user_id,title,status,created_at,updated_at) VALUES (?,?,'Read payload','candidate',?,?)")
    .run(documentId, userId, now, now);
  db.prepare("INSERT INTO score_jobs (id,user_id,document_id,job_type,status,params_json,created_at,updated_at) VALUES (?,?,?,'omr_import','completed',?,?,?)")
    .run(crypto.randomUUID(), userId, documentId, JSON.stringify({ freeTrial: true }), now, now);
  const model = parseJianpuToScoreJson({ text: "1=C\n4/4\n| 1 2 3 4 |", importedAt: now, sourceOriginalName: "payload.jianpu.txt" });
  createCandidateScoreRevisionFromScoreJson({ documentId, scoreJson: model, createdFrom: "omr_import" });
  const candidate = createScoreRevisionFromScoreJson({ documentId, scoreJson: model, createdFrom: "manual_edit" })!;
  const app = Fastify({ logger: false });
  await app.register(authPlugin); await app.register(scoreRoutes, { prefix: "/api" });
  const headers = { authorization: `Bearer ${token}` };
  try {
    const detail = await app.inject({ method: "GET", url: `/api/scores/${documentId}`, headers });
    assert.equal(detail.statusCode, 200, detail.body);
    const payload = detail.json();
    assert.equal(payload.score.pendingRevision.id, candidate.id);
    assert.ok(payload.score.pendingRevision.scoreJson.measures.length > 0);
    assert.equal(payload.revisions.length, 2);
    assert.ok(payload.revisions.every((revision: Record<string, unknown>) => !("scoreJson" in revision)));
    assert.equal((detail.body.match(/"scoreJson":/g) ?? []).length, 1);
    const list = await app.inject({ method: "GET", url: "/api/scores", headers });
    assert.equal(list.statusCode, 200, list.body);
    const summary = list.json().scores.find((score: { id: string }) => score.id === documentId);
    assert.equal(summary.pendingRevision.id, candidate.id);
    assert.equal(summary.pendingRevision.status, "candidate");
    assert.equal(summary.pendingRevision.createdFrom, "manual_edit");
    assert.equal("scoreJson" in summary.pendingRevision, false);
    assert.equal(typeof summary.pendingRevision.hasAudioTranscriptionCleanup, "boolean");
    const cleanupReport = { profile: "monophonic", inputNotes: 1, outputNotes: 1, removedShortNotes: 0, removedLowVelocityNotes: 0,
      removedDuplicates: 0, meanTimingCorrectionTicks: 0, peakPolyphony: 1, voiceCount: 1, reviewRequired: false, warnings: [] };
    for (const [name, cleanup, expected] of [["empty cleanup array preserves the OMR review banner", [], false], ["nonempty cleanup array identifies audio cleanup", [cleanupReport], true]] as const) {
      await t.test(name, async () => {
        db.prepare("UPDATE score_revisions SET score_json = ? WHERE id = ?")
          .run(JSON.stringify({ ...model, metadata: { ...model.metadata, audioTranscriptionCleanup: cleanup } }), candidate.id);
        const response = await app.inject({ method: "GET", url: "/api/scores", headers });
        assert.equal(response.statusCode, 200, response.body);
        const updated = response.json().scores.find((score: { id: string }) => score.id === documentId);
        assert.equal(updated.pendingRevision.hasAudioTranscriptionCleanup, expected);
        assert.equal(updated.pendingRevision.id, candidate.id);
      });
    }
  } finally { await app.close(); }
});
