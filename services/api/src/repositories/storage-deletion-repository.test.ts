import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { objectStorage } from "../lib/object-storage.js";
import { enqueueStorageDeletion, processStorageDeletionQueue } from "./storage-deletion-repository.js";

function testDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE storage_deletion_queue (
      id TEXT PRIMARY KEY, source_file_id TEXT NOT NULL, storage_backend TEXT NOT NULL,
      storage_path TEXT NOT NULL, storage_key TEXT, status TEXT NOT NULL DEFAULT 'queued',
      attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT NOT NULL, locked_at TEXT,
      last_error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
  `);
  return db;
}

test("storage deletion queue removes successful objects and retries provider failures", async () => {
  const db = testDb();
  const originalDelete = objectStorage.delete.bind(objectStorage);
  let shouldFail = true;
  objectStorage.delete = async () => {
    if (shouldFail) throw new Error("provider unavailable");
    return true;
  };
  const now = new Date("2026-07-16T00:00:00.000Z");
  enqueueStorageDeletion(db, { id: "file-1", storage_backend: "s3", storage_path: "s3://bucket/key", storage_key: "key" }, now.toISOString());
  try {
    const failed = await processStorageDeletionQueue(db, { now, retryBaseMs: 1_000 });
    assert.deepEqual(failed, { attempted: 1, deleted: 0, failed: 1, pending: 1 });
    const queued = db.prepare("SELECT status, attempts, last_error, next_attempt_at FROM storage_deletion_queue").get() as Record<string, unknown>;
    assert.equal(queued.status, "queued");
    assert.equal(queued.attempts, 1);
    assert.match(String(queued.last_error), /provider unavailable/u);
    shouldFail = false;
    const recovered = await processStorageDeletionQueue(db, { now: new Date(String(queued.next_attempt_at)), retryBaseMs: 1_000 });
    assert.deepEqual(recovered, { attempted: 1, deleted: 1, failed: 0, pending: 0 });
  } finally {
    objectStorage.delete = originalDelete;
    db.close();
  }
});
