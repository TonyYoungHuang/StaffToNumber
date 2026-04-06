import type { StoredFileKind } from "@score/shared";
import { db } from "../db.js";
import { createId } from "../lib/auth.js";
import { nowIso } from "../lib/time.js";

type FileRow = {
  id: string;
  user_id: string;
  original_name: string;
  stored_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  file_kind: StoredFileKind;
  created_at: string;
};

export function createStoredFile(input: {
  userId: string;
  originalName: string;
  storedName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  fileKind: StoredFileKind;
}) {
  const id = createId();
  const createdAt = nowIso();

  db.prepare(
    `
      INSERT INTO files (id, user_id, original_name, stored_name, storage_path, mime_type, size_bytes, file_kind, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    id,
    input.userId,
    input.originalName,
    input.storedName,
    input.storagePath,
    input.mimeType,
    input.sizeBytes,
    input.fileKind,
    createdAt,
  );

  return findStoredFileById(id);
}

export function findStoredFileById(id: string) {
  return db
    .prepare(
      `
        SELECT id, user_id, original_name, stored_name, storage_path, mime_type, size_bytes, file_kind, created_at
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
        SELECT id, user_id, original_name, stored_name, storage_path, mime_type, size_bytes, file_kind, created_at
        FROM files
        WHERE user_id = ?
        ORDER BY datetime(created_at) DESC
      `,
    )
    .all(userId) as FileRow[];
}
