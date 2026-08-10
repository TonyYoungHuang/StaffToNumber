import fs from "node:fs";
import path from "node:path";
import { ObjectStorage, type ResumableUploadPart, type ResumableUploadSession } from "@score/storage";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { db } from "../db.js";
import { createId } from "../lib/auth.js";
import { openStoredFile, storedFileExists } from "../lib/object-storage.js";
import { storeVerifiedUpload, uploadErrorResponse, uploadKinds } from "../lib/upload-security.js";
import { createStoredFile, findStoredFileById, listStoredFilesByUserId } from "../repositories/file-repository.js";

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "-");
}

const RESUMABLE_CHUNK_SIZE = 5 * 1024 * 1024;
const resumableStaging = new ObjectStorage({ backend: "local", localRoot: path.join(config.storageDir, ".resumable") });

type ResumableUploadRow = {
  id: string;
  user_id: string;
  original_name: string;
  stored_name: string;
  mime_type: string;
  expected_size_bytes: number;
  session_json: string;
  status: "uploading" | "completing" | "completed" | "aborted";
  file_id: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

function findResumableUpload(id: string, userId: string) {
  return db.prepare("SELECT * FROM resumable_uploads WHERE id = ? AND user_id = ?").get(id, userId) as ResumableUploadRow | undefined;
}

function resumableParts(uploadId: string) {
  return db.prepare(`
    SELECT part_number, etag, size_bytes, checksum_sha256
    FROM resumable_upload_parts WHERE upload_id = ? ORDER BY part_number
  `).all(uploadId).map((row) => {
    const part = row as { part_number: number; etag: string; size_bytes: number; checksum_sha256: string };
    return { partNumber: part.part_number, etag: part.etag, sizeBytes: part.size_bytes, checksumSha256: part.checksum_sha256 } satisfies ResumableUploadPart;
  });
}

function publicResumableUpload(row: ResumableUploadRow) {
  const parts = resumableParts(row.id);
  return {
    id: row.id,
    originalName: row.original_name,
    mimeType: row.mime_type,
    expectedSizeBytes: row.expected_size_bytes,
    uploadedSizeBytes: parts.reduce((sum, part) => sum + part.sizeBytes, 0),
    uploadedParts: parts.map((part) => ({ partNumber: part.partNumber, sizeBytes: part.sizeBytes, checksumSha256: part.checksumSha256 })),
    chunkSizeBytes: RESUMABLE_CHUNK_SIZE,
    status: row.status,
    fileId: row.file_id,
    expiresAt: row.expires_at,
  };
}

export async function fileRoutes(app: FastifyInstance) {
  app.post("/files/uploads", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const body = request.body as { filename?: unknown; mimeType?: unknown; sizeBytes?: unknown } | null;
    const filename = typeof body?.filename === "string" ? body.filename.trim() : "";
    const mimeType = typeof body?.mimeType === "string" ? body.mimeType.trim().toLowerCase() : "";
    const sizeBytes = typeof body?.sizeBytes === "number" ? body.sizeBytes : Number.NaN;
    if (!filename || filename.length > 255 || !filename.toLowerCase().endsWith(".pdf")) return reply.code(400).send({ error: "Resumable uploads currently accept PDF files only." });
    if (mimeType !== "application/pdf") return reply.code(400).send({ error: "Resumable PDF uploads must use application/pdf." });
    if (!Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > config.uploadMaxBytes) return reply.code(400).send({ error: `Upload size must be from 1 to ${config.uploadMaxBytes} bytes.` });

    const id = createId();
    const storedName = `${createId()}-${sanitizeFilename(filename)}`;
    const session = await resumableStaging.beginResumableUpload({ objectKey: `sessions/${id}/${storedName}`, contentType: mimeType });
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.prepare(`
      INSERT INTO resumable_uploads (
        id, user_id, original_name, stored_name, mime_type, expected_size_bytes,
        session_json, status, file_id, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'uploading', NULL, ?, ?, ?)
    `).run(id, request.authUserId!, filename, storedName, mimeType, sizeBytes, JSON.stringify(session), expiresAt, createdAt, createdAt);
    return reply.code(201).send({ upload: publicResumableUpload(findResumableUpload(id, request.authUserId!)!) });
  });

  app.get("/files/uploads/:id", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const row = findResumableUpload((request.params as { id: string }).id, request.authUserId!);
    if (!row) return reply.code(404).send({ error: "Resumable upload not found." });
    return { upload: publicResumableUpload(row) };
  });

  app.post("/files/uploads/:id/parts/:partNumber", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const params = request.params as { id: string; partNumber: string };
    const row = findResumableUpload(params.id, request.authUserId!);
    if (!row) return reply.code(404).send({ error: "Resumable upload not found." });
    if (row.status !== "uploading" || Date.parse(row.expires_at) <= Date.now()) return reply.code(409).send({ error: "Resumable upload is no longer active." });
    const partNumber = Number(params.partNumber);
    if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10_000) return reply.code(400).send({ error: "Part number must be from 1 to 10000." });
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: "No upload part provided." });
    const body = await file.toBuffer();
    if (body.length === 0 || body.length > RESUMABLE_CHUNK_SIZE) return reply.code(400).send({ error: `Upload parts must be from 1 to ${RESUMABLE_CHUNK_SIZE} bytes.` });
    const session = JSON.parse(row.session_json) as ResumableUploadSession;
    const part = await resumableStaging.uploadResumablePart({ session, partNumber, body });
    db.prepare(`
      INSERT INTO resumable_upload_parts (upload_id, part_number, etag, size_bytes, checksum_sha256, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(upload_id, part_number) DO UPDATE SET
        etag = excluded.etag, size_bytes = excluded.size_bytes,
        checksum_sha256 = excluded.checksum_sha256, created_at = excluded.created_at
    `).run(row.id, part.partNumber, part.etag, part.sizeBytes, part.checksumSha256, new Date().toISOString());
    db.prepare("UPDATE resumable_uploads SET updated_at = ? WHERE id = ?").run(new Date().toISOString(), row.id);
    return reply.code(201).send({ part, upload: publicResumableUpload(findResumableUpload(row.id, request.authUserId!)!) });
  });

  app.post("/files/uploads/:id/complete", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const row = findResumableUpload((request.params as { id: string }).id, request.authUserId!);
    if (!row) return reply.code(404).send({ error: "Resumable upload not found." });
    if (row.status !== "uploading" || Date.parse(row.expires_at) <= Date.now()) return reply.code(409).send({ error: "Resumable upload is no longer active." });
    const parts = resumableParts(row.id);
    if (parts.length === 0 || parts.some((part, index) => part.partNumber !== index + 1)) return reply.code(409).send({ error: "Upload parts must be contiguous and start at part 1." });
    if (parts.reduce((sum, part) => sum + part.sizeBytes, 0) !== row.expected_size_bytes) return reply.code(409).send({ error: "Uploaded bytes do not match the declared file size." });
    db.prepare("UPDATE resumable_uploads SET status = 'completing', updated_at = ? WHERE id = ?").run(new Date().toISOString(), row.id);

    const session = JSON.parse(row.session_json) as ResumableUploadSession;
    let assembledPath: string | null = null;
    const userDir = path.join(config.storageDir, request.authUserId!);
    fs.mkdirSync(userDir, { recursive: true });
    const targetPath = path.join(userDir, row.stored_name);
    try {
      const assembled = await resumableStaging.completeResumableUpload({ session, parts });
      assembledPath = assembled.ref.storagePath;
      const verified = await storeVerifiedUpload({ stream: fs.createReadStream(assembledPath), targetPath, allowedKinds: uploadKinds.pdf });
      const storedFile = await createStoredFile({
        userId: request.authUserId!, originalName: row.original_name, storedName: row.stored_name,
        storagePath: targetPath, mimeType: verified.mimeType, sizeBytes: verified.sizeBytes, fileKind: "input_pdf",
      });
      if (!storedFile) throw new Error("Could not create the stored file record.");
      db.prepare("UPDATE resumable_uploads SET status = 'completed', file_id = ?, updated_at = ? WHERE id = ?").run(storedFile.id, new Date().toISOString(), row.id);
      return reply.code(201).send({ file: { id: storedFile.id, originalName: storedFile.original_name, mimeType: storedFile.mime_type, sizeBytes: storedFile.size_bytes, fileKind: storedFile.file_kind, createdAt: storedFile.created_at } });
    } catch (error) {
      db.prepare("UPDATE resumable_uploads SET status = 'uploading', updated_at = ? WHERE id = ?").run(new Date().toISOString(), row.id);
      const response = uploadErrorResponse(error);
      return reply.code(response.statusCode).send(response.body);
    } finally {
      if (assembledPath) await fs.promises.rm(assembledPath, { force: true });
    }
  });

  app.delete("/files/uploads/:id", { preHandler: app.requireActiveEntitlement }, async (request, reply) => {
    const row = findResumableUpload((request.params as { id: string }).id, request.authUserId!);
    if (!row) return reply.code(404).send({ error: "Resumable upload not found." });
    if (row.status === "completed") return reply.code(409).send({ error: "Completed uploads cannot be aborted." });
    await resumableStaging.abortResumableUpload(JSON.parse(row.session_json) as ResumableUploadSession);
    db.prepare("UPDATE resumable_uploads SET status = 'aborted', updated_at = ? WHERE id = ?").run(new Date().toISOString(), row.id);
    return reply.code(204).send();
  });

  app.get(
    "/files",
    {
      preHandler: app.requireActiveEntitlement,
    },
    async (request) => {
      return {
        files: listStoredFilesByUserId(request.authUserId!).map((file) => ({
          id: file.id,
          originalName: file.original_name,
          mimeType: file.mime_type,
          sizeBytes: file.size_bytes,
          fileKind: file.file_kind,
          createdAt: file.created_at,
        })),
      };
    },
  );

  app.post(
    "/files/upload",
    {
      preHandler: app.requireActiveEntitlement,
    },
    async (request, reply) => {
      const file = await request.file();

      if (!file) {
        return reply.code(400).send({ error: "No file uploaded." });
      }

      const userDir = path.join(config.storageDir, request.authUserId!);
      fs.mkdirSync(userDir, { recursive: true });

      const storedName = `${createId()}-${sanitizeFilename(file.filename || "upload.pdf")}`;
      const targetPath = path.join(userDir, storedName);
      let verified;
      try {
        verified = await storeVerifiedUpload({ stream: file.file, targetPath, allowedKinds: uploadKinds.pdf });
      } catch (error) {
        const response = uploadErrorResponse(error);
        request.log.warn({ error, uploadCode: response.body.code }, "PDF upload rejected.");
        return reply.code(response.statusCode).send(response.body);
      }

      const storedFile = await createStoredFile({
        userId: request.authUserId!,
        originalName: file.filename || "upload.pdf",
        storedName,
        storagePath: targetPath,
        mimeType: verified.mimeType,
        sizeBytes: verified.sizeBytes,
        fileKind: "input_pdf",
      });

      return reply.code(201).send({
        file: {
          id: storedFile!.id,
          originalName: storedFile!.original_name,
          mimeType: storedFile!.mime_type,
          sizeBytes: storedFile!.size_bytes,
          fileKind: storedFile!.file_kind,
          createdAt: storedFile!.created_at,
        },
      });
    },
  );

  app.get(
    "/files/:id/download",
    {
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const file = findStoredFileById(params.id);

      if (!file || file.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "File not found." });
      }

      if (!(await storedFileExists(file))) {
        return reply.code(404).send({ error: "Stored file is missing." });
      }

      reply.header("Content-Type", file.mime_type);
      reply.header("Content-Disposition", `attachment; filename="${encodeURIComponent(file.original_name)}"`);
      return reply.send(await openStoredFile(file));
    },
  );
}
