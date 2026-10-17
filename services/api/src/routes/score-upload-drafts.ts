import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { config } from "../config.js";
import { createId } from "../lib/auth.js";
import { claimStagedOmrUpload, StagedOmrUploadError } from "../lib/staged-omr-uploads.js";
import { ScoreUploadReceipts, UploadReceiptError } from "../lib/score-upload-receipts.js";
import { normalizeRecognitionMode } from "../lib/recognition-options.js";
import { assertScoreSourcePageCount, lockScorePassAccount } from "../lib/score-passes.js";
import { inspectPdfRasterSafety, uploadKinds, UploadSecurityError } from "../lib/upload-security.js";
import { countTiffPages } from "../lib/score-pass-pages.js";
import { deleteStoredFileObject } from "../lib/object-storage.js";
import { createStoredFile } from "../repositories/file-repository.js";
import { findScoreUploadDraft, mapScoreUploadDraft, UPLOAD_DRAFT_TTL_MS } from "../lib/score-upload-drafts.js";
import { assertStorageQuota } from "../lib/plan-quotas.js";
import { assessRecognitionSource, revalidateRecognitionAssessment } from "../lib/recognition-memory-estimate.js";

export function registerScoreUploadDraftRoutes(app: FastifyInstance) {
  const receipts = new ScoreUploadReceipts(path.join(config.storageDir, ".draft-prepare-receipts"), (id, userId) => Boolean(findScoreUploadDraft(userId, id)));
  app.get("/scores/upload-drafts/:id", { preHandler: app.requireScorePreviewAccess }, async (request, reply) => {
    const draft = findScoreUploadDraft(request.authUserId!, (request.params as { id: string }).id);
    if (!draft) return reply.code(404).send({ code: "UPLOAD_DRAFT_NOT_FOUND", error: "This upload draft is not available for your account." });
    reply.header("Cache-Control", "no-store");
    const query = request.query as { checkoutOrderId?: string };
    const order = db.prepare(`SELECT id, public_token, status, resume_result_json FROM payment_orders
      WHERE target_document_id = ? AND user_id = ? ${query.checkoutOrderId ? "AND id = ?" : ""}
      ORDER BY created_at DESC, id DESC LIMIT 1`).get(...(query.checkoutOrderId ? [draft.document_id, draft.user_id, query.checkoutOrderId] : [draft.document_id, draft.user_id])) as
      { id: string; public_token: string; status: string; resume_result_json: string | null } | undefined;
    return { draft: mapScoreUploadDraft(draft), ...(order ? { order: { id: order.id, token: order.public_token, status: order.status,
      resumeResult: order.resume_result_json ? JSON.parse(order.resume_result_json) : null } } : {}) };
  });
  app.post("/scores/upload-drafts/prepare", { preHandler: app.requireScorePreviewAccess }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const userId = request.authUserId!;
    const body = request.body as { stagedUploadId?: unknown; recognitionMode?: unknown; title?: unknown } | null;
    const key = request.headers["idempotency-key"];
    if (typeof key !== "string") return reply.code(400).send({ code: "INVALID_IDEMPOTENCY_KEY", error: "Supply one stable UUID preparation key." });
    let receipt: ReturnType<typeof receipts.begin> | undefined;
    let staged: Awaited<ReturnType<typeof claimStagedOmrUpload>> | undefined;
    let file: Awaited<ReturnType<typeof createStoredFile>> = undefined;
    let targetPath: string | undefined;
    try {
      const recognitionMode = normalizeRecognitionMode(body?.recognitionMode);
      const title = typeof body?.title === "string" ? body.title.trim().slice(0, 200) : "";
      receipt = receipts.begin(userId, key, JSON.stringify([body?.stagedUploadId, recognitionMode, title]));
      if (receipt.replay) return { draft: mapScoreUploadDraft(findScoreUploadDraft(userId, receipt.scoreId)!) };
      staged = await claimStagedOmrUpload(userId, body?.stagedUploadId);
      const memoryAssessment = await assessRecognitionSource({ sourcePath: staged.sourcePath, ...staged.metadata, mode: recognitionMode });
      revalidateRecognitionAssessment(staged.metadata.memoryAssessment);
      revalidateRecognitionAssessment(memoryAssessment);
      if (staged.metadata.sizeBytes > Math.min(config.uploadMaxBytes, 20 * 1024 * 1024)) throw new UploadSecurityError("The checked upload exceeds the current file size limit.", "FILE_TOO_LARGE", 413);
      if (!uploadKinds.omr.some(kind => kind === staged!.metadata.detectedKind)) throw new UploadSecurityError("The checked upload is not a supported score source.", "UNSUPPORTED_FILE_TYPE");
      const bytes = await fs.readFile(staged.sourcePath);
      const pageCount = staged.metadata.detectedKind === "pdf" ? (await inspectPdfRasterSafety(bytes)).pageCount
        : staged.metadata.detectedKind === "tiff" ? countTiffPages(bytes) : 1;
      assertScoreSourcePageCount(pageCount);
      const filename = staged.metadata.filename;
      const storedName = `${createId()}-${filename.replace(/[^\p{L}\p{N}._-]/gu, "_").slice(-160)}`;
      const userDir = path.join(config.storageDir, userId, "scores", "omr-sources");
      await fs.mkdir(userDir, { recursive: true });
      targetPath = path.join(userDir, storedName);
      await fs.copyFile(staged.sourcePath, targetPath, 1);
      const fileKind = staged.metadata.detectedKind === "pdf" ? "source_pdf" : "source_image";
      const draftId = receipt.scoreId;
      const now = new Date();
      file = await createStoredFile({ userId, originalName: filename, storedName, storagePath: targetPath,
        mimeType: staged.metadata.mimeType, sizeBytes: staged.metadata.sizeBytes, fileKind,
        commitRecord: saveRecord => {
          // File, document, source asset and draft receipt commit together. The
          // asynchronous object persistence has already finished outside this transaction.
          db.exec("BEGIN IMMEDIATE");
          try {
            lockScorePassAccount(db, userId);
            const record = saveRecord();
            if (!record) throw new Error("Could not store the score source.");
            assertStorageQuota(userId, 0);
            db.prepare(`INSERT INTO score_documents (id, user_id, title, source_file_id, status, created_at, updated_at)
              VALUES (?, ?, ?, ?, 'candidate', ?, ?)`).run(draftId, userId, title || filename.replace(/\.[^.]+$/u, ""), record.id, now.toISOString(), now.toISOString());
            db.prepare("INSERT INTO score_assets (id, document_id, file_id, asset_kind, created_at) VALUES (?, ?, ?, ?, ?)")
              .run(createId(), draftId, record.id, fileKind, now.toISOString());
            db.prepare("UPDATE score_assets SET params_json = ? WHERE document_id = ? AND file_id = ?")
              .run(JSON.stringify({ memoryAssessment, photoCorners: staged!.metadata.photoCorners, checksumSha256: staged!.metadata.checksumSha256,
                sourceOrientations:Object.fromEntries((staged!.metadata.preflight?.pages??[]).filter(p=>p.orientationCertain && p.rotation!=null).map(p=>[String(p.page),p.rotation])) }), draftId, record.id);
            db.prepare(`INSERT INTO score_upload_drafts (id, user_id, document_id, prepare_intent_id, recognition_mode, status, created_at, updated_at, expires_at)
              VALUES (?, ?, ?, ?, ?, 'awaiting_payment', ?, ?, ?)`)
              .run(draftId, userId, draftId, key, recognitionMode, now.toISOString(), now.toISOString(), new Date(now.getTime() + UPLOAD_DRAFT_TTL_MS).toISOString());
            db.exec("COMMIT");
            return record;
          } catch (error) { db.exec("ROLLBACK"); throw error; }
        } });
      if (!file) throw new Error("Could not store the score source.");
      // A crash after commit is reconciled by the deterministic receipt/document id.
      try { await staged.consume(); }
      catch (error) { request.log.warn({ error, draftId: receipt.scoreId }, "Upload draft committed; staged claim retained until cleanup."); }
      return reply.code(201).send({ draft: mapScoreUploadDraft(findScoreUploadDraft(userId, receipt.scoreId)!) });
    } catch (error) {
      if (file && !db.prepare("SELECT id FROM score_documents WHERE source_file_id = ?").get(file.id)) {
        db.prepare("DELETE FROM files WHERE id = ? AND user_id = ?").run(file.id, userId);
        await deleteStoredFileObject(file).catch(cleanupError => request.log.warn({ cleanupError, fileId: file!.id }, "Unused draft source cleanup failed."));
      }
      if (targetPath && !file) await fs.rm(targetPath, { force: true });
      if (error instanceof UploadReceiptError || error instanceof StagedOmrUploadError || error instanceof UploadSecurityError) {
        return reply.code(error.statusCode).send({ code: error.code, error: error.message });
      }
      const problem = error as { statusCode?: number; code?: string; message?: string };
      if (problem.statusCode) return reply.code(problem.statusCode).send({ code: problem.code, error: problem.message });
      throw error;
    } finally {
      await staged?.release();
      if (receipt && !receipt.replay) {
        try { receipts.finish(userId, key); }
        catch (error) { request.log.warn({ error, draftId: receipt.scoreId }, "Upload preparation receipt requires reconciliation."); }
      }
    }
  });
}
