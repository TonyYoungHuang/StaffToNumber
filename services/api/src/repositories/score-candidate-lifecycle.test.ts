import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import type { ScoreJson } from "@score/shared";

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), "score-candidate-lifecycle-"));
process.env.DB_FILE = path.join(testDir, "test.sqlite");
process.env.STORAGE_DIR = path.join(testDir, "storage");

const { db, initDb } = await import("../db.js");
const {
  acceptPendingScoreRevision,
  createCandidateScoreRevisionFromScoreJson,
  createOmrImportScoreDocument,
  createScoreRevisionFromScoreJson,
  findCurrentRevisionForDocument,
  findPendingRevisionForDocument,
  findScoreDocumentById,
  findScoreRevisionById,
  rejectPendingScoreRevision,
} = await import("./score-repository.js");

initDb();

const userId = "candidate-test-user";
const sourceFileId = "candidate-test-source";
const timestamp = new Date().toISOString();
const sourcePath = path.join(testDir, "source.pdf");
fs.writeFileSync(sourcePath, "%PDF-1.4 test");

db.prepare(
  `
    INSERT INTO users (id, email, password_hash, password_salt, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
).run(userId, "candidate@example.com", "hash", "salt", timestamp, timestamp);
db.prepare(
  `
    INSERT INTO files (id, user_id, original_name, stored_name, storage_path, mime_type, size_bytes, file_kind, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
).run(sourceFileId, userId, "source.pdf", "source.pdf", sourcePath, "application/pdf", 13, "source_pdf", timestamp);

after(() => {
  db.close();
  fs.rmSync(testDir, { recursive: true, force: true });
});

function scoreFixture(title: string): ScoreJson {
  return {
    version: "1.0",
    title,
    metadata: {
      parser: "candidate-lifecycle-test",
      sourceFormat: "musicxml",
      importedAt: timestamp,
      partCount: 0,
      measureCount: 0,
      noteCount: 0,
      restCount: 0,
      warnings: [],
    },
    parts: [],
    measures: [],
    navigationMarks: [],
  } as unknown as ScoreJson;
}

test("OMR candidate requires explicit acceptance before becoming current", () => {
  const created = createOmrImportScoreDocument({
    userId,
    title: "Candidate acceptance",
    sourceFileId,
    sourceFileKind: "source_pdf",
    sourceOriginalName: "source.pdf",
  });
  assert.ok(created.document);

  const candidate = createCandidateScoreRevisionFromScoreJson({
    documentId: created.document.id,
    scoreJson: scoreFixture("Recognized candidate"),
    createdFrom: "omr_import",
  });
  assert.ok(candidate);
  assert.equal(candidate.status, "candidate");

  const awaitingReview = findScoreDocumentById(created.document.id);
  assert.ok(awaitingReview);
  assert.equal(awaitingReview.status, "needs_review");
  assert.equal(awaitingReview.current_revision_id, null);
  assert.equal(awaitingReview.pending_revision_id, candidate.id);
  assert.equal(findCurrentRevisionForDocument(awaitingReview), undefined);
  assert.equal(findPendingRevisionForDocument(awaitingReview)?.id, candidate.id);

  const correctedCandidate = createScoreRevisionFromScoreJson({
    documentId: awaitingReview.id,
    scoreJson: scoreFixture("Corrected candidate"),
    createdFrom: "manual_edit",
  });
  assert.ok(correctedCandidate);
  assert.notEqual(correctedCandidate.id, candidate.id);
  assert.equal(correctedCandidate.status, "candidate");
  assert.equal(findScoreRevisionById(candidate.id)?.status, "superseded");
  assert.equal(findScoreDocumentById(awaitingReview.id)?.current_revision_id, null);
  assert.equal(findScoreDocumentById(awaitingReview.id)?.pending_revision_id, correctedCandidate.id);

  const accepted = acceptPendingScoreRevision({
    documentId: awaitingReview.id,
    pendingRevisionId: correctedCandidate.id,
  });
  assert.ok(accepted?.document);
  assert.ok(accepted.revision);
  assert.notEqual(accepted.revision.id, correctedCandidate.id);
  assert.equal(accepted.revision.status, "accepted");
  assert.equal(accepted.revision.created_from, "candidate_accept");
  assert.equal(accepted.document.current_revision_id, accepted.revision.id);
  assert.equal(accepted.document.pending_revision_id, null);
  assert.equal(accepted.document.status, "ready");
  assert.equal(findScoreRevisionById(correctedCandidate.id)?.status, "superseded");
});

test("rejecting a later candidate preserves the existing official revision", () => {
  const documents = db
    .prepare("SELECT id FROM score_documents WHERE user_id = ? ORDER BY created_at ASC")
    .all(userId) as Array<{ id: string }>;
  const document = findScoreDocumentById(documents[0].id);
  assert.ok(document?.current_revision_id);
  const officialRevisionId = document.current_revision_id;

  const candidate = createCandidateScoreRevisionFromScoreJson({
    documentId: document.id,
    scoreJson: scoreFixture("Rejected replacement"),
    createdFrom: "omr_import",
  });
  assert.ok(candidate);

  const beforeReject = findScoreDocumentById(document.id);
  assert.equal(beforeReject?.current_revision_id, officialRevisionId);
  assert.equal(beforeReject?.pending_revision_id, candidate.id);

  const rejected = rejectPendingScoreRevision({
    documentId: document.id,
    pendingRevisionId: candidate.id,
  });
  assert.ok(rejected);
  assert.equal(rejected.current_revision_id, officialRevisionId);
  assert.equal(rejected.pending_revision_id, null);
  assert.equal(rejected.status, "ready");
  assert.equal(findScoreRevisionById(candidate.id)?.status, "rejected");
});

test("stale candidate ids cannot accept or reject a different pending revision", () => {
  const document = db
    .prepare("SELECT id FROM score_documents WHERE user_id = ? ORDER BY created_at ASC")
    .get(userId) as { id: string };
  const candidate = createCandidateScoreRevisionFromScoreJson({
    documentId: document.id,
    scoreJson: scoreFixture("Protected candidate"),
    createdFrom: "omr_import",
  });
  assert.ok(candidate);

  assert.equal(acceptPendingScoreRevision({ documentId: document.id, pendingRevisionId: "stale-id" }), undefined);
  assert.equal(rejectPendingScoreRevision({ documentId: document.id, pendingRevisionId: "stale-id" }), undefined);
  assert.equal(findScoreDocumentById(document.id)?.pending_revision_id, candidate.id);
  assert.equal(findScoreRevisionById(candidate.id)?.status, "candidate");
});
