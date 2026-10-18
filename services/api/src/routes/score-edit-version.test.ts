import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import { db, initDb } from "../db.js";
import { authPlugin } from "../plugins/auth.js";
import { createUser, createSession } from "../repositories/auth-repository.js";
import { createScoreDocumentFromScoreJson, createCandidateScoreRevisionFromScoreJson, findScoreDocumentById, listScoreRevisionsByDocumentId } from "../repositories/score-repository.js";
import { parseJianpuToScoreJson } from "../lib/jianpu-score-parser.js";
import { scoreRoutes } from "./scores.js";

for (const candidate of [false, true]) test(`legacy edit routes require the page's revision and reject stale ${candidate ? "candidate" : "accepted"} edits`, async () => {
  initDb();
  const user = createUser(`${randomUUID()}@version.test`, "hash", "salt")!;
  const token = randomUUID(); createSession(user.id, token, 1);
  const scoreJson = parseJianpuToScoreJson({ text: "1=C\n4/4\n| 1 2 3 4 |", importedAt: new Date().toISOString(), sourceOriginalName: "version.txt" });
  const sourceFileId = randomUUID();
  db.prepare("INSERT INTO files(id,user_id,original_name,stored_name,storage_path,mime_type,size_bytes,file_kind,created_at) VALUES(?,?,'version.json','version.json','/unused','application/json',100,'score_json_snapshot',?)").run(sourceFileId, user.id, new Date().toISOString());
  const document = createScoreDocumentFromScoreJson({ userId: user.id, title: "Version", sourceFileId, sourceOriginalName: "version.json", scoreJson })!;
  if (candidate) createCandidateScoreRevisionFromScoreJson({ documentId: document.id, scoreJson, createdFrom: "omr_import" });
  // A free recognition project is editable, without granting any monthly credits.
  const now = new Date().toISOString();
  db.prepare("INSERT INTO score_jobs(id,user_id,document_id,job_type,status,params_json,created_at,updated_at) VALUES(?,?,?,'omr_import','completed',?,?,?)")
    .run(randomUUID(), user.id, document.id, JSON.stringify({ freeTrial: true }), now, now);
  const app = Fastify(); await app.register(authPlugin); await app.register(scoreRoutes, { prefix: "/api" });
  const headers = { authorization: `Bearer ${token}` };
  const post = (route: string, payload: Record<string, unknown>) => app.inject({ method: "POST", url: `/api/scores/${document.id}/edit/${route}`, headers, payload });
  try {
    const before = findScoreDocumentById(document.id)!;
    const baseRevisionId = before.pending_revision_id ?? before.current_revision_id;
    const count = listScoreRevisionsByDocumentId(document.id).length;
    for (const route of ["part", "note", "note/insert", "event/delete", "events/batch", "event/reorder", "measure-attributes", "harmony", "barline", "dynamics", "wedge", "tempo"]) {
      const missing = await post(route, {});
      assert.equal(missing.statusCode, 409, `${route}: ${missing.body}`);
      assert.equal(missing.json().code, "SCORE_EDIT_REVISION_CONFLICT");
    }
    assert.equal(listScoreRevisionsByDocumentId(document.id).length, count);
    const saved = await post("tempo", { baseRevisionId, measureId: scoreJson.measures[0]!.id, bpm: 110 });
    assert.equal(saved.statusCode, 201, saved.body);
    const stale = await post("tempo", { baseRevisionId, measureId: scoreJson.measures[0]!.id, bpm: 60 });
    assert.equal(stale.statusCode, 409, stale.body);
    assert.equal(stale.json().code, "SCORE_EDIT_REVISION_CONFLICT");
    assert.equal(listScoreRevisionsByDocumentId(document.id).length, count + 1);
    const refreshed = await post("tempo", { baseRevisionId: saved.json().revision.id, measureId: scoreJson.measures[0]!.id, bpm: 120 });
    assert.equal(refreshed.statusCode, 201, refreshed.body);
  } finally { await app.close(); }
});
