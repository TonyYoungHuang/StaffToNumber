import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { createStorageObjectKey, type StoredObjectRef } from "@score/storage";

type MigrationStorage = {
  keyPrefix: string;
  persistFile(input: { sourcePath: string; objectKey: string; contentType: string; removeSource?: boolean }): Promise<{
    ref: StoredObjectRef;
    sizeBytes: number;
    checksumSha256: string;
  }>;
  delete(ref: StoredObjectRef): Promise<boolean>;
};

type LocalFileRow = {
  id: string;
  user_id: string;
  stored_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  checksum_sha256: string | null;
};

function pathInsideRoot(root: string, candidate: string) {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  const normalizedRoot = process.platform === "win32" ? resolvedRoot.toLowerCase() : resolvedRoot;
  const normalizedCandidate = process.platform === "win32" ? resolvedCandidate.toLowerCase() : resolvedCandidate;
  return normalizedCandidate !== normalizedRoot && normalizedCandidate.startsWith(`${normalizedRoot}${path.sep}`);
}

export async function migrateLocalFilesToObjectStorage(input: {
  db: DatabaseSync;
  storage: MigrationStorage;
  storageRoot: string;
  limit?: number;
  dryRun?: boolean;
  deleteLocalAfterCommit?: boolean;
  claimedBy?: string;
}) {
  const limit = Math.max(1, Math.min(100_000, Math.trunc(input.limit ?? 10_000)));
  const claimedBy = input.claimedBy ?? randomUUID();
  input.db.exec(`
    CREATE TABLE IF NOT EXISTS storage_migration_claims (
      file_id TEXT PRIMARY KEY,
      claimed_by TEXT NOT NULL,
      claimed_at TEXT NOT NULL,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
    );
  `);
  const candidates = input.db.prepare(`
    SELECT files.id, files.user_id, files.stored_name, files.storage_path, files.mime_type,
           files.size_bytes, files.checksum_sha256
    FROM files
    WHERE files.storage_backend = 'local'
      AND NOT EXISTS (SELECT 1 FROM storage_migration_claims claims WHERE claims.file_id = files.id)
    ORDER BY datetime(files.created_at), files.id
    LIMIT ?
  `).all(limit) as LocalFileRow[];

  const report: {
    startedAt: string;
    completedAt?: string;
    dryRun: boolean;
    deleteLocalAfterCommit: boolean;
    selected: number;
    migrated: Array<{ fileId: string; localPath: string; objectKey: string; checksumSha256: string; sizeBytes: number; localDeleted: boolean }>;
    failed: Array<{ fileId: string; localPath: string; error: string }>;
  } = {
    startedAt: new Date().toISOString(),
    dryRun: input.dryRun === true,
    deleteLocalAfterCommit: input.deleteLocalAfterCommit === true,
    selected: candidates.length,
    migrated: [],
    failed: [],
  };

  for (const file of candidates) {
    let claimed = false;
    let persisted: Awaited<ReturnType<MigrationStorage["persistFile"]>> | null = null;
    try {
      if (!pathInsideRoot(input.storageRoot, file.storage_path)) throw new Error("Legacy path is outside STORAGE_DIR.");
      const stats = await fs.promises.stat(file.storage_path);
      if (!stats.isFile()) throw new Error("Legacy path is not a regular file.");
      if (stats.size !== file.size_bytes) throw new Error(`Legacy size mismatch: database=${file.size_bytes}, disk=${stats.size}.`);
      const objectKey = createStorageObjectKey({
        prefix: input.storage.keyPrefix,
        userId: file.user_id,
        fileId: file.id,
        storedName: file.stored_name,
      });
      if (input.dryRun) {
        report.migrated.push({
          fileId: file.id,
          localPath: file.storage_path,
          objectKey,
          checksumSha256: file.checksum_sha256 ?? "pending-dry-run",
          sizeBytes: stats.size,
          localDeleted: false,
        });
        continue;
      }

      const claim = input.db.prepare(`
        INSERT OR IGNORE INTO storage_migration_claims (file_id, claimed_by, claimed_at) VALUES (?, ?, ?)
      `).run(file.id, claimedBy, new Date().toISOString());
      if (claim.changes !== 1) continue;
      claimed = true;
      persisted = await input.storage.persistFile({
        sourcePath: file.storage_path,
        objectKey,
        contentType: file.mime_type,
        removeSource: false,
      });
      if (persisted.ref.backend !== "s3" || !persisted.ref.storageKey) throw new Error("Migration target did not return an S3 object reference.");
      if (persisted.sizeBytes !== file.size_bytes) throw new Error("Uploaded object size does not match the database record.");
      if (file.checksum_sha256 && file.checksum_sha256 !== persisted.checksumSha256) {
        throw new Error("Uploaded object checksum does not match the existing file checksum.");
      }

      input.db.exec("BEGIN IMMEDIATE");
      try {
        const update = input.db.prepare(`
          UPDATE files
          SET storage_backend = 's3', storage_path = ?, storage_key = ?, checksum_sha256 = ?
          WHERE id = ? AND storage_backend = 'local'
        `).run(persisted.ref.storagePath, persisted.ref.storageKey, persisted.checksumSha256, file.id);
        if (update.changes !== 1) throw new Error("File changed storage backend while migration was in progress.");
        input.db.prepare("DELETE FROM storage_migration_claims WHERE file_id = ? AND claimed_by = ?").run(file.id, claimedBy);
        input.db.exec("COMMIT");
      } catch (error) {
        input.db.exec("ROLLBACK");
        throw error;
      }
      claimed = false;
      let localDeleted = false;
      if (input.deleteLocalAfterCommit) {
        await fs.promises.rm(file.storage_path, { force: true });
        localDeleted = true;
      }
      report.migrated.push({
        fileId: file.id,
        localPath: file.storage_path,
        objectKey: persisted.ref.storageKey,
        checksumSha256: persisted.checksumSha256,
        sizeBytes: persisted.sizeBytes,
        localDeleted,
      });
    } catch (error) {
      if (persisted) await input.storage.delete(persisted.ref).catch(() => undefined);
      if (claimed) input.db.prepare("DELETE FROM storage_migration_claims WHERE file_id = ? AND claimed_by = ?").run(file.id, claimedBy);
      report.failed.push({
        fileId: file.id,
        localPath: file.storage_path,
        error: error instanceof Error ? error.message : "Storage migration failed.",
      });
    }
  }
  report.completedAt = new Date().toISOString();
  return report;
}
