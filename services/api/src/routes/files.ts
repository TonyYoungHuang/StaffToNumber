import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { createId } from "../lib/auth.js";
import { createStoredFile, findStoredFileById, listStoredFilesByUserId } from "../repositories/file-repository.js";

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function fileRoutes(app: FastifyInstance) {
  app.get(
    "/files",
    {
      preHandler: app.requireAuth,
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
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const file = await request.file();

      if (!file) {
        return reply.code(400).send({ error: "No file uploaded." });
      }

      const isPdf = file.mimetype === "application/pdf" || file.filename.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        return reply.code(400).send({ error: "Only PDF files are supported in Module 3." });
      }

      const userDir = path.join(config.storageDir, request.authUserId!);
      fs.mkdirSync(userDir, { recursive: true });

      const storedName = `${createId()}-${sanitizeFilename(file.filename || "upload.pdf")}`;
      const targetPath = path.join(userDir, storedName);
      await pipeline(file.file, fs.createWriteStream(targetPath));
      const stats = fs.statSync(targetPath);

      const storedFile = createStoredFile({
        userId: request.authUserId!,
        originalName: file.filename || "upload.pdf",
        storedName,
        storagePath: targetPath,
        mimeType: file.mimetype || "application/pdf",
        sizeBytes: stats.size,
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

      if (!fs.existsSync(file.storage_path)) {
        return reply.code(404).send({ error: "Stored file is missing." });
      }

      reply.header("Content-Type", file.mime_type);
      reply.header("Content-Disposition", `attachment; filename="${encodeURIComponent(file.original_name)}"`);
      return reply.send(fs.createReadStream(file.storage_path));
    },
  );
}
