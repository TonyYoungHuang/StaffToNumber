import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { attachMusicXmlPreservation, MusicXmlPreservationError } from "@score/shared";
import { db, initDb } from "../db.js";
import { createSession, createUser } from "./auth-repository.js";
import { authPlugin } from "../plugins/auth.js";
import { scoreRoutes } from "../routes/scores.js";
import { getPlanQuotaUsage } from "../lib/plan-quotas.js";
import { parseJianpuToScoreJson } from "../lib/jianpu-score-parser.js";
import { scoreJsonToMusicXml } from "../lib/score-musicxml-export.js";
import { createCandidateScoreRevisionFromScoreJson, createScoreDocumentFromDerivedScoreJson, createScoreRevisionFromScoreJson, findScoreDocumentById, findScoreRevisionById, listScoreRevisionsByDocumentId } from "./score-repository.js";

test("an edit that cannot preserve unresolved source notes is rejected before replacing the current revision", () => {
  initDb();
  const user = createUser(`${crypto.randomUUID()}@preservation.test`, "hash", "salt")!;
  const score = parseJianpuToScoreJson({ text: "1=C\n4/4\n| 1 2 3 4 |", importedAt: new Date().toISOString(), sourceOriginalName: "source.jianpu.txt" });
  const source = scoreJsonToMusicXml(score).replace("    </measure>", '      <backup><duration>4</duration></backup><note id="unmapped-source-voice"><rest/><duration>4</duration><voice>2</voice><type>whole</type></note>\n    </measure>');
  const preserved = attachMusicXmlPreservation(score, source);
  const document = createScoreDocumentFromDerivedScoreJson({ userId: user.id, title: score.title, scoreJson: preserved, createdFrom: "system" })!;
  const before = document.current_revision_id, revisionCount = listScoreRevisionsByDocumentId(document.id).length;
  const changed = structuredClone(preserved); changed.measures[0].events[0].duration += 1;
  assert.throws(() => createScoreRevisionFromScoreJson({ documentId: document.id, scoreJson: changed, createdFrom: "manual_edit" }), MusicXmlPreservationError);
  assert.equal(findScoreDocumentById(document.id)!.current_revision_id, before);
  assert.equal(listScoreRevisionsByDocumentId(document.id).length, revisionCount);

  // A pitch correction can retain that source-only voice and still save normally.
  const pitchCorrection = structuredClone(preserved), note = pitchCorrection.measures[0].events[0];
  assert.equal(note.type, "note"); if (note.type === "note") note.pitch.step = "D";
  assert.ok(createScoreRevisionFromScoreJson({ documentId: document.id, scoreJson: pitchCorrection, createdFrom: "manual_edit" }));
  assert.equal(listScoreRevisionsByDocumentId(document.id).length, revisionCount + 1);
  assert.match(scoreJsonToMusicXml(pitchCorrection), /unmapped-source-voice/);
});

test("coverage candidates require explicit review without changing automatic gaps, original candidate or credits", async () => {
  initDb();
  const user = createUser(`${crypto.randomUUID()}@coverage.test`, "hash", "salt")!, token = crypto.randomUUID();
  createSession(user.id, token, 1);
  const score = parseJianpuToScoreJson({ text: "1=C\n4/4\n| 1 2 3 4 |", importedAt: new Date().toISOString(), sourceOriginalName: "coverage.jianpu.txt" });
  score.recognitionLayer = { engine: "hybrid", recognitionMode: "complex", symbols: [], coverage: {
    schemaVersion: 1, status: "incomplete", sourcePageCount: 2, coverageBasis: "detected-layout", pages: [], staffs: [], attempts: [],
    gaps: [{ id: "missing-staff", kind: "missing-staff", page: 2, message: "Review an unresolved source staff.", severity: "error" }],
  } };
  const document = createScoreDocumentFromDerivedScoreJson({ userId: user.id, title: score.title, scoreJson: score, createdFrom: "system" })!;
  // Gives this synthetic test document the same owner-scoped editing gate as an existing free project.
  const now = new Date().toISOString();
  db.prepare("INSERT INTO score_jobs (id,user_id,document_id,job_type,status,params_json,created_at,updated_at) VALUES (?,?,?,'omr_import','completed',?,?,?)")
    .run(crypto.randomUUID(), user.id, document.id, JSON.stringify({ freeTrial: true }), now, now);
  const candidate = createCandidateScoreRevisionFromScoreJson({ documentId: document.id, scoreJson: score, createdFrom: "omr_import" })!;
  const before = findScoreDocumentById(document.id)!, count = listScoreRevisionsByDocumentId(document.id).length, credits = getPlanQuotaUsage(user.id).jobs.used;
  const app = Fastify({ logger: false }); await app.register(authPlugin); await app.register(scoreRoutes, { prefix: "/api" });
  const confirm = (coverageReviewed: unknown) => app.inject({ method: "POST", url: `/api/scores/${document.id}/candidate/accept`, headers: { authorization: `Bearer ${token}` }, payload: { pendingRevisionId: candidate.id, coverageReviewed } });
  try {
    for (const value of [undefined, false, "true"]) {
      const rejected = await confirm(value); assert.equal(rejected.statusCode, 409, rejected.body); assert.equal(rejected.json().code, "SCORE_COVERAGE_REVIEW_REQUIRED");
      assert.equal(findScoreDocumentById(document.id)!.pending_revision_id, candidate.id);
      assert.equal(findScoreDocumentById(document.id)!.current_revision_id, before.current_revision_id);
      assert.equal(listScoreRevisionsByDocumentId(document.id).length, count);
    }
    const accepted = await confirm(true); assert.equal(accepted.statusCode, 200, accepted.body);
    const coverage = accepted.json().revision.scoreJson.recognitionLayer.coverage;
    assert.equal(coverage.status, "incomplete"); assert.equal(coverage.gaps[0].id, "missing-staff");
    assert.equal(coverage.manualReview.sourcePageCount, 2); assert.ok(Number.isFinite(Date.parse(coverage.manualReview.reviewedAt)));
    assert.equal(JSON.parse(findScoreRevisionById(candidate.id)!.score_json).recognitionLayer.coverage.manualReview, undefined);
    assert.equal(findScoreDocumentById(document.id)!.status, "ready");
    assert.equal(getPlanQuotaUsage(user.id).jobs.used, credits);
  } finally { await app.close(); }
});
