import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import type { ScoreJson } from "@score/shared";

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), "score-export-lifecycle-"));
process.env.DB_FILE = path.join(testDir, "test.sqlite");
process.env.STORAGE_DIR = path.join(testDir, "storage");

const { db, initDb } = await import("../db.js");
const {
  cancelScoreJob,
  createScoreAsset,
  createScoreDocumentFromDerivedScoreJson,
  createScoreExportJob,
  createOmrImportScoreDocument,
  createScoreShare,
  createScoreRevisionFromScoreJson,
  findCurrentRevisionForDocument,
  findScoreDocumentById,
  listScoreAssetsByDocumentId,
  mapScoreAssetForApi,
  mapScoreShareForApi,
  retryScoreJob,
} = await import("./score-repository.js");

initDb();
const timestamp = new Date(0).toISOString();
const userId = "export-test-user";
db.prepare("INSERT INTO users (id, email, password_hash, password_salt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
  .run(userId, "export@example.com", "hash", "salt", timestamp, timestamp);

after(() => {
  db.close();
  fs.rmSync(testDir, { recursive: true, force: true });
});

function scoreFixture(title: string): ScoreJson {
  return {
    version: "1.0",
    title,
    metadata: {
      parser: "export-lifecycle-test",
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

test("export jobs can be cancelled and retried without replacing their immutable snapshot", () => {
  const document = createScoreDocumentFromDerivedScoreJson({ userId, title: "Queue", scoreJson: scoreFixture("Queue"), createdFrom: "system" });
  assert.ok(document);
  const revision = findCurrentRevisionForDocument(document);
  assert.ok(revision);
  const snapshot = { schemaVersion: 1, format: "musicxml", revisionId: revision.id, revisionNumber: 1, title: "Queue", options: {}, musicXml: "<score-partwise/>" };
  const job = createScoreExportJob({ userId, documentId: document.id, params: snapshot });
  assert.equal(job?.status, "queued");
  assert.equal(job?.attempt_count, 0);

  const cancelled = cancelScoreJob({ jobId: job!.id, userId, documentId: document.id });
  assert.equal(cancelled?.status, "cancelled");
  assert.ok(cancelled?.cancel_requested_at);

  const retried = retryScoreJob({ jobId: job!.id, userId, documentId: document.id });
  assert.equal(retried?.status, "queued");
  assert.equal(retried?.cancel_requested_at, null);
  assert.deepEqual(JSON.parse(retried!.params_json!), snapshot);
});

test("OMR imports use the same cancellable and retryable long-job contract", () => {
  const sourcePath = path.join(testDir, "scan.png");
  fs.writeFileSync(sourcePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const sourceFileId = "omr-cancel-source";
  db.prepare("INSERT INTO files (id, user_id, original_name, stored_name, storage_path, mime_type, size_bytes, file_kind, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(sourceFileId, userId, "scan.png", "scan.png", sourcePath, "image/png", fs.statSync(sourcePath).size, "source_image", timestamp);
  const created = createOmrImportScoreDocument({
    userId,
    title: "Cancelable scan",
    sourceFileId,
    sourceFileKind: "source_image",
    sourceOriginalName: "scan.png",
  });
  assert.ok(created.document);
  assert.equal(created.job?.job_type, "omr_import");

  const cancelled = cancelScoreJob({ jobId: created.job!.id, userId, documentId: created.document!.id });
  assert.equal(cancelled?.status, "cancelled");
  assert.ok(cancelled?.cancel_requested_at);
  assert.equal(cancelled?.result_revision_id, null);

  const retried = retryScoreJob({ jobId: created.job!.id, userId, documentId: created.document!.id });
  assert.equal(retried?.status, "queued");
  assert.equal(retried?.cancel_requested_at, null);
});

test("revision-bound export assets become stale when a new official revision is created", () => {
  const row = db.prepare("SELECT id FROM score_documents WHERE user_id = ? LIMIT 1").get(userId) as { id: string };
  const document = findScoreDocumentById(row.id);
  assert.ok(document);
  const revision = findCurrentRevisionForDocument(document);
  assert.ok(revision);
  const filePath = path.join(testDir, "rendered.pdf");
  fs.writeFileSync(filePath, "%PDF test");
  const fileId = "rendered-file";
  db.prepare("INSERT INTO files (id, user_id, original_name, stored_name, storage_path, mime_type, size_bytes, file_kind, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(fileId, userId, "rendered.pdf", "rendered.pdf", filePath, "application/pdf", fs.statSync(filePath).size, "rendered_pdf", timestamp);
  createScoreAsset({ documentId: document.id, fileId, assetKind: "rendered_pdf", revisionId: revision.id, params: { format: "pdf" }, checksumSha256: "abc" });

  const next = createScoreRevisionFromScoreJson({ documentId: document.id, scoreJson: scoreFixture("Queue v2"), createdFrom: "manual_edit" });
  assert.ok(next);
  const asset = mapScoreAssetForApi(listScoreAssetsByDocumentId(document.id)[0]);
  assert.equal(asset.revisionId, revision.id);
  assert.equal(asset.isStale, true);
  assert.ok(asset.staleAt);
  assert.equal(asset.checksumSha256, "abc");
});

test("score collaboration shares persist the selected role", () => {
  const row = db.prepare("SELECT id FROM score_documents WHERE user_id = ? LIMIT 1").get(userId) as { id: string };
  const share = createScoreShare({ documentId: row.id, userId, permission: "edit" });
  assert.ok(share);
  assert.equal(mapScoreShareForApi(share).permission, "edit");
});
