import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { attachMusicXmlPreservation, type ScoreJson } from "@score/shared";
import { db, initDb } from "../db.js";
import { authPlugin } from "../plugins/auth.js";
import { scoreRoutes } from "../routes/scores.js";
import { parseJianpuToScoreJson } from "../lib/jianpu-score-parser.js";
import { scoreJsonToMusicXml } from "../lib/score-musicxml-export.js";
import { scoreJsonToPlayback } from "../lib/score-playback.js";
import { getPlanQuotaUsage } from "../lib/plan-quotas.js";
import { addManualScorePart, validateScoreAddPartInput } from "../lib/score-add-part.js";
import { createSession, createUser } from "./auth-repository.js";
import { createCandidateScoreRevisionFromScoreJson, createScoreAsset, createScoreDocumentFromDerivedScoreJson, createScoreRevisionFromScoreJson, findScoreDocumentById, findScoreRevisionById, listScoreAssetsByDocumentId, listScoreRevisionsByDocumentId, ScoreEditRevisionConflictError } from "./score-repository.js";

function fixture(): ScoreJson {
  const score = parseJianpuToScoreJson({ text: "1=C\n4/4\n| 1 2 3 4 | 1 2 3 | 1 2 3 |", importedAt: new Date().toISOString(), sourceOriginalName: "parts.jianpu.txt" });
  for (const measure of score.measures) for (const event of measure.events) event.duration = 1;
  score.measures[0].attributes = { ...score.measures[0].attributes, divisions: 1 };
  score.measures[1].attributes = { divisions: 4, time: { beats: "3", beatType: "4" } };
  for (const measure of score.measures.slice(1)) for (const event of measure.events) event.duration *= 4;
  score.measures[2].attributes = undefined;
  return score;
}

test("manual parts inherit changed meter and divisions, support silent percussion and remain explicitly incomplete", () => {
  const score = fixture();
  const result = addManualScorePart(score, validateScoreAddPartInput({ name: "Drums", staffCount: 2, kind: "percussion" }));
  const measures = result.score.measures.filter(item => item.partId === result.part.id);
  assert.equal(result.part.midiChannel, 10); assert.equal(result.part.manualCompletion?.status, "needs_review");
  assert.deepEqual(measures.map(item => item.events[0].duration), [4, 12, 12]);
  assert.deepEqual(measures.map(item => item.attributes?.divisions), [1, 4, 4]);
  assert.equal(measures[2].attributes?.time?.beats, "3");
  assert.ok(measures.every(item => item.events.length === 2 && item.events.every(event => event.type === "rest" && event.printObject === false)));
  const xml = scoreJsonToMusicXml(result.score); assert.match(xml, /<midi-channel>10<\/midi-channel>/); assert.match(xml, /<backup>/);
  assert.equal(score.parts.length, 1, "building a manual part must not mutate the original revision");
  assert.throws(() => validateScoreAddPartInput({ name: "x".repeat(101), staffCount: 1, kind: "pitched" }), /100/);
  assert.throws(() => validateScoreAddPartInput({ name: "G", staffCount: 0, kind: "pitched" }), /1 to 4/);
});

test("adding a missing part preserves the official revision and source, enforces candidate ownership and CAS, and charges no credits", async () => {
  initDb();
  const user = createUser(`${crypto.randomUUID()}@manual-part.test`, "hash", "salt")!, token = crypto.randomUUID();
  createSession(user.id, token, 1);
  const raw = fixture();
  const xml = scoreJsonToMusicXml(raw).replace("    </measure>", "      <direction><direction-type><words>con sord.</words></direction-type></direction>\n    </measure>");
  const score = attachMusicXmlPreservation(raw, xml);
  score.recognitionLayer = { engine: "hybrid", recognitionMode: "complex", symbols: [], coverage: {
    schemaVersion: 1, status: "incomplete", sourcePageCount: 1, coverageBasis: "detected-layout", pages: [], attempts: [],
    staffs: [{ id: "missing", page: 1, systemId: "s1", lineCount: 6, kind: "tablature", bbox: { x: 0, y: 0, width: 20, height: 10 } },
      { id: "occupied", page: 1, systemId: "s1", lineCount: 5, kind: "standard", partId: score.parts[0].id, bbox: { x: 0, y: 20, width: 20, height: 10 } }],
    gaps: [{ id: "tab-gap", kind: "tab-unrecognized", page: 1, staffId: "missing", message: "Missing TAB music.", severity: "error" }],
    manualReview: { reviewedAt: new Date().toISOString(), sourcePageCount: 1 },
  } };
  const document = createScoreDocumentFromDerivedScoreJson({ userId: user.id, title: score.title, scoreJson: score, createdFrom: "system" })!;
  const now = new Date().toISOString();
  db.prepare("INSERT INTO score_jobs (id,user_id,document_id,job_type,status,params_json,created_at,updated_at) VALUES (?,?,?,'omr_import','completed',?,?,?)")
    .run(crypto.randomUUID(), user.id, document.id, JSON.stringify({ freeTrial: true }), now, now);
  const candidate = createCandidateScoreRevisionFromScoreJson({ documentId: document.id, scoreJson: score, createdFrom: "omr_import" })!;
  const fileId = crypto.randomUUID();
  db.prepare("INSERT INTO files (id,user_id,original_name,stored_name,storage_path,mime_type,size_bytes,file_kind,created_at) VALUES (?,?,?,?,?,'image/png',1,'source_image',?)")
    .run(fileId, user.id, "original.png", "original.png", "fixture-only.png", now);
  createScoreAsset({ documentId: document.id, fileId, assetKind: "omr_page_image", revisionId: candidate.id });
  createScoreAsset({ documentId: document.id, fileId, assetKind: "score_musicxml", revisionId: candidate.id });
  const before = findScoreDocumentById(document.id)!, credits = getPlanQuotaUsage(user.id).jobs.used, count = listScoreRevisionsByDocumentId(document.id).length;
  const app = Fastify({ logger: false }); await app.register(authPlugin); await app.register(scoreRoutes, { prefix: "/api" });
  const add = (payload: Record<string, unknown>, authToken = token) => app.inject({ method: "POST", url: `/api/scores/${document.id}/edit/add-part`, headers: { authorization: `Bearer ${authToken}` }, payload });
  const payload = { name: "Missing guitar TAB", staffCount: 1, kind: "tablature", coverageStaffIds: ["missing"], baseRevisionId: candidate.id };
  try {
    const occupied = await add({ ...payload, coverageStaffIds: ["occupied"] }); assert.equal(occupied.statusCode, 409, occupied.body); assert.equal(occupied.json().code, "SCORE_COVERAGE_STAFF_ALREADY_BOUND");
    const foreign = await add({ ...payload, coverageStaffIds: ["another-revision-staff"] }); assert.equal(foreign.statusCode, 409, foreign.body);
    const stale = await add({ ...payload, baseRevisionId: document.current_revision_id }); assert.equal(stale.statusCode, 409, stale.body); assert.equal(stale.json().code, "SCORE_EDIT_REVISION_CONFLICT");
    assert.equal(listScoreRevisionsByDocumentId(document.id).length, count);
    const other = createUser(`${crypto.randomUUID()}@manual-part.test`, "hash", "salt")!, otherToken = crypto.randomUUID(); createSession(other.id, otherToken, 1);
    const denied = await add(payload, otherToken); assert.ok([403, 404].includes(denied.statusCode), denied.body);
    const accepted = await add(payload); assert.equal(accepted.statusCode, 201, accepted.body);
    const body = accepted.json(), next = body.revision.scoreJson as ScoreJson;
    assert.equal(body.revision.status, "candidate"); assert.equal(body.score.status, "needs_review");
    assert.equal(body.score.currentRevisionId, before.current_revision_id); assert.equal(findScoreDocumentById(document.id)!.pending_revision_id, body.revision.id);
    assert.equal(findScoreRevisionById(candidate.id)!.status, "superseded"); assert.equal(findScoreRevisionById(candidate.id)!.score_json, candidate.score_json);
    // Model an in-flight ordinary note edit: it read the candidate before add-part committed.
    const staleNoteDraft = structuredClone(score), staleNote = staleNoteDraft.measures[0].events[0];
    if (staleNote.type === "note") staleNote.pitch.step = "G";
    assert.throws(() => createScoreRevisionFromScoreJson({ documentId: document.id, scoreJson: staleNoteDraft, createdFrom: "manual_edit", expectedEditableRevisionId: candidate.id }), ScoreEditRevisionConflictError);
    assert.equal(findScoreDocumentById(document.id)!.pending_revision_id, body.revision.id);
    assert.equal(listScoreRevisionsByDocumentId(document.id).length, count + 1, "the stale note edit cannot overwrite the new manual part or save another revision");
    const staleTranspose = await app.inject({ method: "POST", url: `/api/scores/${document.id}/transpose`, headers: { authorization: `Bearer ${token}` }, payload: { semitones: 1 } });
    assert.equal(staleTranspose.statusCode, 409, staleTranspose.body); assert.equal(staleTranspose.json().code, "SCORE_EDIT_REVISION_CONFLICT");
    assert.equal(findScoreDocumentById(document.id)!.pending_revision_id, body.revision.id);
    assert.equal(next.recognitionLayer!.coverage!.staffs[0].partId, body.part.id);
    assert.deepEqual(next.recognitionLayer!.coverage!.gaps, score.recognitionLayer!.coverage!.gaps);
    assert.equal(next.recognitionLayer!.coverage!.status, "incomplete"); assert.equal(next.recognitionLayer!.coverage!.manualReview, undefined);
    assert.match(scoreJsonToMusicXml(next), /con sord\./); assert.match(scoreJsonToMusicXml(next), /<sign>TAB<\/sign>/);
    const assets = listScoreAssetsByDocumentId(document.id);
    assert.equal(assets.filter(item => item.revision_id === candidate.id).length, 2, "historical assets remain attached to the old candidate");
    assert.equal(assets.filter(item => item.revision_id === body.revision.id).length, 1, "only the source page is reusable for changed content");
    assert.equal(getPlanQuotaUsage(user.id).jobs.used, credits); assert.equal(listScoreRevisionsByDocumentId(document.id).length, count + 1);
    const duplicate = await add({ ...payload, baseRevisionId: body.revision.id }); assert.equal(duplicate.statusCode, 409, duplicate.body); assert.equal(duplicate.json().code, "SCORE_COVERAGE_STAFF_ALREADY_BOUND");
    const noCoveragePart = await add({ name: "Manual drums", staffCount: 1, kind: "percussion", baseRevisionId: body.revision.id }); assert.equal(noCoveragePart.statusCode, 201, noCoveragePart.body);
    assert.equal(findScoreDocumentById(document.id)!.current_revision_id, before.current_revision_id);
    const drumsBody = noCoveragePart.json();
    const note = next.measures[0].events.find(event => event.type === "note")!;
    const corrected = await app.inject({ method: "POST", url: `/api/scores/${document.id}/edit/note`, headers: { authorization: `Bearer ${token}` }, payload: { eventId: note.id, step: "D" } });
    assert.equal(corrected.statusCode, 201, corrected.body);
    const editedRevisionId = corrected.json().revision.id;
    assert.ok(listScoreAssetsByDocumentId(document.id).some(item => item.asset_kind === "omr_page_image" && item.revision_id === editedRevisionId && item.stale_at === null), "source page survives the next ordinary note edit");
    assert.notEqual(editedRevisionId, drumsBody.revision.id);
    const candidatePlayback = await app.inject({ method: "GET", url: `/api/scores/${document.id}/candidate/playback`, headers: { authorization: `Bearer ${token}` } });
    assert.equal(candidatePlayback.statusCode, 200, candidatePlayback.body); assert.equal(candidatePlayback.json().revisionId, editedRevisionId);
    const expectedPlayback = JSON.parse(JSON.stringify(scoreJsonToPlayback(corrected.json().revision.scoreJson)));
    expectedPlayback.metadata.generatedAt = candidatePlayback.json().playback.metadata.generatedAt;
    assert.deepEqual(candidatePlayback.json().playback, expectedPlayback);
    const otherPlayback = await app.inject({ method: "GET", url: `/api/scores/${document.id}/candidate/playback`, headers: { authorization: `Bearer ${otherToken}` } });
    assert.equal(otherPlayback.statusCode, 404, otherPlayback.body);
  } finally { await app.close(); }
});
