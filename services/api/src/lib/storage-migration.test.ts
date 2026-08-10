import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { migrateLocalFilesToObjectStorage } from "./storage-migration.js";

test("storage migration claims rows, verifies bytes, preserves rollback evidence, and rejects unsafe paths", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "score-storage-migration-"));
  const outside = await fs.promises.mkdtemp(path.join(os.tmpdir(), "score-storage-outside-"));
  const source = path.join(root, "source.musicxml");
  const unsafe = path.join(outside, "unsafe.musicxml");
  await fs.promises.writeFile(source, "<score-partwise/>");
  await fs.promises.writeFile(unsafe, "unsafe");
  const db = new DatabaseSync(":memory:");
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE files (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, stored_name TEXT NOT NULL, storage_path TEXT NOT NULL,
      storage_backend TEXT NOT NULL DEFAULT 'local', storage_key TEXT, checksum_sha256 TEXT,
      mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, created_at TEXT NOT NULL
    );
  `);
  const insert = db.prepare("INSERT INTO files VALUES (?, ?, ?, ?, 'local', NULL, NULL, ?, ?, ?)");
  insert.run("file-1", "user-1", "source.musicxml", source, "application/xml", 17, "2026-01-01T00:00:00.000Z");
  insert.run("file-2", "user-1", "unsafe.musicxml", unsafe, "application/xml", 6, "2026-01-02T00:00:00.000Z");
  const deletedKeys: string[] = [];
  const storage = {
    keyPrefix: "production/scores",
    async persistFile(input: { sourcePath: string; objectKey: string }) {
      const bytes = await fs.promises.readFile(input.sourcePath);
      const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
      return {
        ref: { backend: "s3" as const, storagePath: `s3://bucket/${input.objectKey}`, storageKey: input.objectKey },
        sizeBytes: bytes.length,
        checksumSha256,
      };
    },
    async delete(ref: { storageKey: string | null }) {
      if (ref.storageKey) deletedKeys.push(ref.storageKey);
      return true;
    },
  };

  const report = await migrateLocalFilesToObjectStorage({
    db,
    storage,
    storageRoot: root,
    deleteLocalAfterCommit: true,
    claimedBy: "test-run",
  });
  assert.equal(report.migrated.length, 1);
  assert.equal(report.failed.length, 1);
  assert.match(report.failed[0].error, /outside STORAGE_DIR/u);
  assert.equal(fs.existsSync(source), false);
  assert.equal(fs.existsSync(unsafe), true);
  assert.deepEqual(deletedKeys, []);
  const migrated = db.prepare("SELECT storage_backend, storage_key, checksum_sha256 FROM files WHERE id = 'file-1'").get() as Record<string, unknown>;
  assert.equal(migrated.storage_backend, "s3");
  assert.equal(typeof migrated.storage_key, "string");
  assert.equal(String(migrated.checksum_sha256).length, 64);
  assert.equal((db.prepare("SELECT COUNT(*) AS count FROM storage_migration_claims").get() as { count: number }).count, 0);
  db.close();
  await fs.promises.rm(root, { recursive: true, force: true });
  await fs.promises.rm(outside, { recursive: true, force: true });
});
