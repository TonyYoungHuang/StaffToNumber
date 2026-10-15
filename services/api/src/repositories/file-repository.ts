import type { StoredFileKind } from "@score/shared";
import { createStorageObjectKey } from "@score/storage";
import { db } from "../db.js";
import { createId } from "../lib/auth.js";
import { objectStorage, objectStorageDiagnostic, ObjectStorageUnavailableError } from "../lib/object-storage.js";
import { assertStorageQuota } from "../lib/plan-quotas.js";
import { nowIso } from "../lib/time.js";

export type FileRow = {
  id: string;
  user_id: string;
  original_name: string;
  stored_name: string;
  storage_path: string;
  storage_backend: "local" | "s3";
  storage_key: string | null;
  checksum_sha256: string | null;
  mime_type: string;
  size_bytes: number;
  file_kind: StoredFileKind;
  created_at: string;
};

export async function createStoredFile(input: {
  userId: string;
  originalName: string;
  storedName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  fileKind: StoredFileKind;
  /** Persist the object first, then synchronously commit its record with the
   * caller's related document records. Never await while a transaction is open. */
  commitRecord?: (saveRecord: () => FileRow | undefined) => FileRow | undefined;
}) {
  assertStorageQuota(input.userId, input.sizeBytes);
  const id = createId();
  const createdAt = nowIso();
  const objectKey = createStorageObjectKey({
    prefix: objectStorage.keyPrefix,
    userId: input.userId,
    fileId: id,
    storedName: input.storedName,
  });
  let persisted: Awaited<ReturnType<typeof objectStorage.persistFile>>;
  try {
    persisted = await objectStorage.persistFile({
      sourcePath: input.storagePath,
      objectKey,
      contentType: input.mimeType,
    });
  } catch (error) {
    const storageError = objectStorageDiagnostic(error);
    console.error(JSON.stringify({
      event: "object_storage.persist_failed",
      ...storageError,
    }));
    throw new ObjectStorageUnavailableError(error);
  }
  if (persisted.sizeBytes !== input.sizeBytes) {
    await objectStorage.delete(persisted.ref).catch(() => undefined);
    throw new Error("Stored file size changed before persistence completed.");
  }

  const saveRecord = () => {
    db.prepare(
      `
        INSERT INTO files (
          id, user_id, original_name, stored_name, storage_path, storage_backend, storage_key,
          checksum_sha256, mime_type, size_bytes, file_kind, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      id,
      input.userId,
      input.originalName,
      input.storedName,
      persisted.ref.storagePath,
      persisted.ref.backend,
      persisted.ref.storageKey,
      persisted.checksumSha256,
      input.mimeType,
      persisted.sizeBytes,
      input.fileKind,
      createdAt,
    );
    return findStoredFileById(id);
  };
  try {
    return input.commitRecord ? input.commitRecord(saveRecord) : saveRecord();
  } catch (error) {
    await objectStorage.delete(persisted.ref).catch(() => undefined);
    throw error;
  }

}

export function findStoredFileById(id: string) {
  return db
    .prepare(
      `
        SELECT id, user_id, original_name, stored_name, storage_path, storage_backend, storage_key,
               checksum_sha256, mime_type, size_bytes, file_kind, created_at
        FROM files
        WHERE id = ?
      `,
    )
    .get(id) as FileRow | undefined;
}

export function listStoredFilesByUserId(userId: string) {
  return db
    .prepare(
      `
        SELECT id, user_id, original_name, stored_name, storage_path, storage_backend, storage_key,
               checksum_sha256, mime_type, size_bytes, file_kind, created_at
        FROM files
        WHERE user_id = ?
        ORDER BY datetime(created_at) DESC
      `,
    )
    .all(userId) as FileRow[];
}
