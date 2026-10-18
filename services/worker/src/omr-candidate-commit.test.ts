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
      updated_at TEXT, completed_at TEXT, params_json TEXT
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
      asset_kind TEXT NOT NULL, created_at TEXT NOT NULL, params_json TEXT, revision_id TEXT
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

test("completes a free scan without recording a paid credit settlement", () => {
  const db = candidateDatabase("processing");
  db.prepare("UPDATE score_jobs SET params_json = ? WHERE id = 'job-1'")
    .run(JSON.stringify({ freeTrial: true, creditSource: "free_trial", creditCost: 1 }));
  const revisionId = commitOmrCandidate(db, {
    jobId: "job-1", documentId: "document-1", scoreJson: score, musicXmlFileId: "musicxml-1",
    outputFileIds: ["musicxml-1"], assets: [],
    creditSettlement: { quotedCredits: 1, sourcePageCount: 2, deliveredPages: [1] },
  });
  assert.ok(revisionId);
  const job = db.prepare("SELECT status, params_json FROM score_jobs WHERE id = 'job-1'").get() as { status: string; params_json: string };
  assert.equal(job.status, "completed");
  const params = JSON.parse(job.params_json);
  assert.equal(params.freeTrial, true);
  assert.equal(params.creditSource, "free_trial");
  assert.equal(params.creditSettlement, undefined);
  assert.equal(params.settledCreditCost, undefined);
  assert.equal(params.creditsReturned, undefined);
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

test("publishes one result manifest atomically while preserving admission and billing params", () => {
  const db = candidateDatabase("processing");
  db.prepare("UPDATE score_jobs SET params_json = ? WHERE id = 'job-1'").run(JSON.stringify({ recognitionMode: "complex", creditSource: "prepaid", creditCost: 5, recoveryOfJobId: "original-job" }));
  const manifest = { schemaVersion: 1, manifestVersion: 1, selectedCandidateId: "piece-1", candidates: [{ id: "piece-1", fileId: "musicxml-1" }, { id: "piece-2", fileId: "musicxml-2" }] };
  assert.ok(commitOmrCandidate(db, { jobId: "job-1", documentId: "document-1", scoreJson: score, musicXmlFileId: "musicxml-1",
    outputFileIds: ["musicxml-1", "musicxml-2"], assets: [{ fileId: "musicxml-1", assetKind: "score_musicxml", params: { candidateId: "piece-1" } },
      { fileId: "musicxml-2", assetKind: "score_musicxml", params: { candidateId: "piece-2" } }], resultManifest: manifest,
    paramsPatch: { deliveredPages: 8, sourcePageCount: 10 } }));
  const job = db.prepare("SELECT params_json, output_file_ids_json FROM score_jobs WHERE id = 'job-1'").get() as { params_json: string; output_file_ids_json: string };
  const params = JSON.parse(job.params_json);
  assert.equal(params.creditCost, 5);
  assert.equal(params.creditSource, "prepaid");
  assert.equal(params.recoveryOfJobId, "original-job");
  assert.deepEqual(params.resultManifest, manifest);
  assert.equal(params.deliveredPages, 8);
  assert.deepEqual(JSON.parse(job.output_file_ids_json), ["musicxml-1", "musicxml-2"]);
  assert.equal((db.prepare("SELECT COUNT(*) AS count FROM score_revisions").get() as { count: number }).count, 1);
  const assets = db.prepare("SELECT params_json, revision_id FROM score_assets ORDER BY file_id").all() as Array<{ params_json: string; revision_id: string | null }>;
  assert.deepEqual(assets.map(asset => JSON.parse(asset.params_json).candidateId), ["piece-1", "piece-2"]);
  assert.ok(assets.every(asset => asset.revision_id === null));
  db.close();
});

test("identical candidate bytes share a file while each asset keeps its own source metadata", () => {
  const db = candidateDatabase("processing");
  assert.ok(commitOmrCandidate(db, { jobId: "job-1", documentId: "document-1", scoreJson: score, musicXmlFileId: "same-file",
    outputFileIds: ["same-file"], assets: [
      { fileId: "same-file", assetKind: "score_musicxml", params: { candidateId: "original", sourcePages: [1] } },
      { fileId: "same-file", assetKind: "score_musicxml", params: { candidateId: "assembled", memberIds: ["original"] } },
    ] }));
  const assets = db.prepare("SELECT params_json FROM score_assets").all() as Array<{ params_json: string }>;
  assert.deepEqual(assets.map(asset => JSON.parse(asset.params_json).candidateId).sort(), ["assembled", "original"]);
  db.close();
});
