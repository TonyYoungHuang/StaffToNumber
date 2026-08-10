import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import type { ScoreJson } from "@score/shared";
import { commitOmrCandidate } from "./omr-candidate-commit.js";

const score = {
  schemaVersion: 2,
  version: "2.0",
  title: "OMR candidate",
  metadata: { parser: "test", sourceFormat: "musicxml", importedAt: "2026-07-15T00:00:00.000Z", partCount: 0, measureCount: 0, noteCount: 0, restCount: 0, warnings: [] },
  parts: [],
  measures: [],
  navigationMarks: [],
} as unknown as ScoreJson;

function candidateDatabase(jobStatus: "processing" | "cancelled") {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE score_jobs (
      id TEXT PRIMARY KEY, status TEXT NOT NULL, result_revision_id TEXT,
      output_file_ids_json TEXT, error_message TEXT, progress_percent INTEGER,
      updated_at TEXT, completed_at TEXT
    );
    CREATE TABLE score_documents (
      id TEXT PRIMARY KEY, pending_revision_id TEXT, status TEXT NOT NULL, updated_at TEXT
    );
    CREATE TABLE score_revisions (
      id TEXT PRIMARY KEY, document_id TEXT NOT NULL, revision_number INTEGER NOT NULL,
      score_json TEXT NOT NULL, musicxml_file_id TEXT, created_from TEXT NOT NULL,
      status TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE score_assets (
      id TEXT PRIMARY KEY, document_id TEXT NOT NULL, file_id TEXT NOT NULL,
      asset_kind TEXT NOT NULL, created_at TEXT NOT NULL
    );
  `);
  db.prepare("INSERT INTO score_jobs (id, status, progress_percent) VALUES ('job-1', ?, 1)").run(jobStatus);
  db.prepare("INSERT INTO score_documents (id, status, updated_at) VALUES ('document-1', 'candidate', '2026-07-15T00:00:00.000Z')").run();
  return db;
}

function commit(db: DatabaseSync, manageTransaction = true) {
  return commitOmrCandidate(db, {
    jobId: "job-1",
    documentId: "document-1",
    scoreJson: score,
    musicXmlFileId: "musicxml-1",
    outputFileIds: ["musicxml-1", "omr-1"],
    assets: [
      { fileId: "musicxml-1", assetKind: "score_musicxml" },
      { fileId: "omr-1", assetKind: "omr_bundle" },
    ],
    timestamp: "2026-07-15T00:01:00.000Z",
    revisionId: "revision-1",
    manageTransaction,
  });
}

test("atomically publishes an OMR candidate and completes its processing job", () => {
  const db = candidateDatabase("processing");
  assert.equal(commit(db), "revision-1");
  const document = db.prepare("SELECT pending_revision_id, status FROM score_documents WHERE id = 'document-1'").get() as Record<string, unknown>;
  const job = db.prepare("SELECT status, result_revision_id, output_file_ids_json FROM score_jobs WHERE id = 'job-1'").get() as Record<string, unknown>;
  assert.equal(document.pending_revision_id, "revision-1");
  assert.equal(document.status, "needs_review");
  assert.equal(job.status, "completed");
  assert.equal(job.result_revision_id, "revision-1");
  assert.deepEqual(JSON.parse(String(job.output_file_ids_json)), ["musicxml-1", "omr-1"]);
  assert.equal((db.prepare("SELECT COUNT(*) AS count FROM score_assets").get() as { count: number }).count, 2);
  db.close();
});

test("does not create a candidate after cancellation wins the job-state race", () => {
  const db = candidateDatabase("cancelled");
  assert.equal(commit(db), null);
  assert.equal((db.prepare("SELECT COUNT(*) AS count FROM score_revisions").get() as { count: number }).count, 0);
  const document = db.prepare("SELECT pending_revision_id, status FROM score_documents WHERE id = 'document-1'").get() as Record<string, unknown>;
  assert.equal(document.pending_revision_id, null);
  assert.equal(document.status, "candidate");
  assert.equal((db.prepare("SELECT COUNT(*) AS count FROM score_assets").get() as { count: number }).count, 0);
  db.close();
});

test("ignores a duplicate completion after the first candidate commit", () => {
  const db = candidateDatabase("processing");
  assert.equal(commit(db), "revision-1");
  assert.equal(commit(db), null);
  assert.equal((db.prepare("SELECT COUNT(*) AS count FROM score_revisions").get() as { count: number }).count, 1);
  db.close();
});

test("can join a caller-managed transaction without committing it", () => {
  const db = candidateDatabase("processing");
  db.exec("BEGIN IMMEDIATE");
  assert.equal(commit(db, false), "revision-1");
  db.exec("ROLLBACK");
  assert.equal((db.prepare("SELECT COUNT(*) AS count FROM score_revisions").get() as { count: number }).count, 0);
  assert.equal((db.prepare("SELECT status FROM score_jobs WHERE id = 'job-1'").get() as { status: string }).status, "processing");
  db.close();
});
