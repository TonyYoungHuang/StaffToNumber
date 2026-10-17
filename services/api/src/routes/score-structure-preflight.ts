import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { acquireScorePreflightSlot, runScoreStructurePreflight, ScorePreflightError } from "../lib/score-structure-preflight.js";
import { inspectPdfStructurePreflight, inspectPdfRasterSafety, UploadSecurityError, storeVerifiedUpload, uploadErrorResponse, uploadKinds } from "../lib/upload-security.js";
import { stageOmrUpload } from "../lib/staged-omr-uploads.js";
import { assessRecognitionSource, parsePhotoCorners, RecognitionAdmissionError } from "../lib/recognition-memory-estimate.js";

export function registerScoreStructurePreflightRoute(app: FastifyInstance) {
  app.post("/scores/import/omr/preflight", { preHandler: app.requireScorePreviewAccess }, async (request, reply) => {
    const response = await (async () => {
    let workspace: string | undefined;
    let release: (() => void) | undefined;
    const cancellation = new AbortController();
    const abort = () => cancellation.abort();
    const close = () => { if (!reply.raw.writableEnded) cancellation.abort(); };
    request.raw.once("aborted", abort);
    reply.raw.once("close", close);
    const deadline = setTimeout(abort, 200_000);
    try {
      const file = await request.file({ limits: { files: 1, fileSize: Math.min(config.uploadMaxBytes, 20 * 1024 * 1024) } });
      if (!file) return { statusCode: 400, body: { code: "EMPTY_FILE", error: "No PDF or image file uploaded." } };
      const cancelUpload = () => file.file.destroy(new ScorePreflightError("SCORE_PREFLIGHT_TIMEOUT", "The structure check ended before upload completed. Please retry.", 504));
      cancellation.signal.addEventListener("abort", cancelUpload, { once: true });
      if (cancellation.signal.aborted) cancelUpload();
      // Reuse the paid OMR's configured scanner and format checks. Free PDF inspection
      // validates metadata, then renders lazily under its own smaller budget.
      // A successful check retains only a user-bound, expiring staged source.
      // No file database row, score, job, revision or credit reservation is created.
      const tempRoot = path.join(config.storageDir, ".preflight");
      await fs.mkdir(tempRoot, { recursive: true });
      workspace = await fs.mkdtemp(path.join(tempRoot, "check-"));
      const sourcePath = path.join(workspace, "source.upload");
      let verified;
      try { verified = await storeVerifiedUpload({ stream: file.file, targetPath: sourcePath, allowedKinds: uploadKinds.omr }); }
      finally { cancellation.signal.removeEventListener("abort", cancelUpload); }
      // A slow multipart transfer must not occupy a scarce renderer slot.
      release = await acquireScorePreflightSlot(request.authUserId!, cancellation.signal);
      if (verified.detectedKind === "pdf") await inspectPdfStructurePreflight(await fs.readFile(sourcePath));
      let recognitionSupport: import("@score/shared").ScoreStructurePreflight["recognitionSupport"] = { supported: true, code: "READY" };
      if (verified.detectedKind === "pdf") {
        try {
          const plan = await inspectPdfRasterSafety(await fs.readFile(sourcePath));
          recognitionSupport = { supported: true, code: plan.pages.some(page => page.dpi !== plan.dpi) ? "PDF_ADAPTIVE_RENDER" : "READY", pageDpi: plan.pages.map(page => page.dpi ?? plan.dpi) };
        } catch (error) {
          if (!(error instanceof UploadSecurityError)) throw error;
          recognitionSupport = { supported: false, code: error.code === "PDF_PAGE_PIXEL_LIMIT" || error.code === "PDF_TOTAL_PIXEL_LIMIT" ? error.code : "PDF_INVALID" };
        }
      }
      const preflight = await runScoreStructurePreflight({ sourcePath, workspace, signal: cancellation.signal });
      const cornerField = file.fields.photoCorners;
      const photoCorners = parsePhotoCorners(cornerField && !Array.isArray(cornerField) && cornerField.type === "field" ? cornerField.value : undefined);
      const memoryAssessment = recognitionSupport.supported ? await assessRecognitionSource({ sourcePath, ...verified, preflight, photoCorners }) :
        { version: 1 as const, capacityVersion: "pixel-safety-v1", lane: "unsupported" as const, estimatedMemoryMb: 0,
          reasonCodes: [recognitionSupport.code], waitEstimateSeconds: [0, 0] as [number, number], sourcePageCount: preflight.sourcePageCount, maxPagePixels: 0, enabled: true };
      if (memoryAssessment.lane === "unsupported" && recognitionSupport.supported) {
        recognitionSupport = { supported: false, code: "RECOGNITION_CAPACITY_LIMIT" };
      }
      const assessedPreflight = { ...preflight, recognitionSupport, memoryAssessment };
      if (cancellation.signal.aborted) throw new ScorePreflightError("SCORE_PREFLIGHT_TIMEOUT", "The structure check was cancelled. Please retry.", 504);
      const staged = await stageOmrUpload({ sourcePath, userId: request.authUserId!, filename: file.filename || "score-source.pdf", ...verified, memoryAssessment, preflight: assessedPreflight, photoCorners });
      return { statusCode: 200, body: { preflight: assessedPreflight, stagedUploadId: staged.id, stagedUploadExpiresAt: staged.expiresAt } };
    } catch (error) {
      if (error instanceof RecognitionAdmissionError) return { statusCode: error.statusCode, body: { code: error.code, error: error.message } };
      if (cancellation.signal.aborted) return { statusCode: 504, body: { code: "SCORE_PREFLIGHT_TIMEOUT", error: "The structure check was cancelled or timed out. Your file was not imported; please retry." } };
      if (error instanceof ScorePreflightError) {
        if (error.statusCode === 429) reply.header("Retry-After", error.code === "SCORE_PREFLIGHT_RATE_LIMIT" ? "60" : "5");
        return { statusCode: error.statusCode, body: { code: error.code, error: error.message } };
      }
      if (error && typeof error === "object" && "code" in error && error.code === "FST_REQ_FILE_TOO_LARGE") {
        return { statusCode: 413, body: { code: "FILE_TOO_LARGE", error: "The uploaded file exceeds the free structure check size limit." } };
      }
      const response = uploadErrorResponse(error);
      return response;
    } finally {
      clearTimeout(deadline);
      request.raw.removeListener("aborted", abort);
      reply.raw.removeListener("close", close);
      try { if (workspace) await fs.rm(workspace, { recursive: true, force: true, maxRetries: 3, retryDelay: 20 }); }
      finally { release?.(); }
    }
    })();
    return reply.code(response.statusCode).send(response.body);
  });
}
