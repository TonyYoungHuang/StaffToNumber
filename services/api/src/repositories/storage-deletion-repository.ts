import { randomUUID } from "node:crypto";
import type { RuntimeDatabaseLike } from "@score/runtime-database";
import { objectStorage } from "../lib/object-storage.js";

export type StorageDeletionSource = {
  id: string;
  storage_path: string;
  storage_backend: "local" | "s3";
  storage_key: string | null;
};

export function enqueueStorageDeletion(db: RuntimeDatabaseLike, file: StorageDeletionSource, timestamp = new Date().toISOString()) {
  db.prepare(`
    INSERT INTO storage_deletion_queue (
      id, source_file_id, storage_backend, storage_path, storage_key, status, attempts,
      next_attempt_at, locked_at, last_error, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'queued', 0, ?, NULL, NULL, ?, ?)
  `).run(randomUUID(), file.id, file.storage_backend, file.storage_path, file.storage_key, timestamp, timestamp, timestamp);
}
type ClaimedDeletion = {
  id: string;
  storage_backend: "local" | "s3";
  storage_path: string;
  storage_key: string | null;
  attempts: number;
};

export async function processStorageDeletionQueue(db: RuntimeDatabaseLike, input?: {
  limit?: number;
  lockTimeoutMs?: number;
  retryBaseMs?: number;
  now?: Date;
}) {
  const limit = Math.max(1, Math.min(1_000, Math.trunc(input?.limit ?? 100)));
  const lockTimeoutMs = Math.max(60_000, input?.lockTimeoutMs ?? 15 * 60_000);
  const retryBaseMs = Math.max(1_000, input?.retryBaseMs ?? 60_000);
  let attempted = 0;
  let deleted = 0;
  let failed = 0;

  while (attempted < limit) {
    const now = input?.now ?? new Date();
    const nowIso = now.toISOString();
    const staleIso = new Date(now.getTime() - lockTimeoutMs).toISOString();
    const claimed = db.prepare(`
      UPDATE storage_deletion_queue
      SET status = 'processing', attempts = attempts + 1, locked_at = ?, updated_at = ?
      WHERE id = (
        SELECT id FROM storage_deletion_queue
        WHERE (status = 'queued' AND datetime(next_attempt_at) <= datetime(?))
           OR (status = 'processing' AND datetime(locked_at) <= datetime(?))
        ORDER BY datetime(next_attempt_at), datetime(created_at), id
        LIMIT 1
      )
      RETURNING id, storage_backend, storage_path, storage_key, attempts
    `).get(nowIso, nowIso, nowIso, staleIso) as ClaimedDeletion | undefined;
    if (!claimed) break;
    attempted += 1;
    try {
      const removed = await objectStorage.delete({
        backend: claimed.storage_backend,
        storagePath: claimed.storage_path,
        storageKey: claimed.storage_key,
      });
      if (!removed) throw new Error("Storage deletion was rejected because its location is unsafe or incomplete.");
      db.prepare("DELETE FROM storage_deletion_queue WHERE id = ? AND status = 'processing'").run(claimed.id);
      deleted += 1;
    } catch (error) {
      const delay = Math.min(24 * 60 * 60_000, retryBaseMs * 2 ** Math.min(10, claimed.attempts - 1));
      db.prepare(`
        UPDATE storage_deletion_queue
        SET status = 'queued', next_attempt_at = ?, locked_at = NULL, last_error = ?, updated_at = ?
        WHERE id = ? AND status = 'processing'
      `).run(
        new Date(now.getTime() + delay).toISOString(),
        (error instanceof Error ? error.message : "Storage deletion failed.").slice(0, 2_000),
        nowIso,
        claimed.id,
      );
      failed += 1;
    }
  }
  const pending = (db.prepare("SELECT COUNT(*) AS count FROM storage_deletion_queue").get() as { count: number }).count;
  return { attempted, deleted, failed, pending };
}
