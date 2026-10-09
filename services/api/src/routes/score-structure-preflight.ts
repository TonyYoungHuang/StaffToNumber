import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { acquireScorePreflightSlot, runScoreStructurePreflight, ScorePreflightError } from "../lib/score-structure-preflight.js";
import { inspectPdfStructurePreflight, inspectPdfRasterSafety, UploadSecurityError, storeVerifiedUpload, uploadErrorResponse, uploadKinds } from "../lib/upload-security.js";

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
    try {
      release = acquireScorePreflightSlot(request.authUserId!);
      const file = await request.file({ limits: { files: 1, fileSize: Math.min(config.uploadMaxBytes, 20 * 1024 * 1024) } });
      if (!file) return { statusCode: 400, body: { code: "EMPTY_FILE", error: "No PDF or image file uploaded." } };
      // Reuse the paid OMR's scanner and format checks. Free PDF inspection
      // validates metadata, then renders lazily under its own smaller budget.
      // No source is promoted into files, score documents, jobs or revisions.
      const tempRoot = path.join(config.storageDir, ".preflight");
      await fs.mkdir(tempRoot, { recursive: true });
      workspace = await fs.mkdtemp(path.join(tempRoot, "check-"));
      const sourcePath = path.join(workspace, "source.upload");
      const verified = await storeVerifiedUpload({ stream: file.file, targetPath: sourcePath, allowedKinds: uploadKinds.omr });
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
      return { statusCode: 200, body: { preflight: { ...preflight, recognitionSupport } } };
    } catch (error) {
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
      request.raw.removeListener("aborted", abort);
      reply.raw.removeListener("close", close);
      try { if (workspace) await fs.rm(workspace, { recursive: true, force: true, maxRetries: 3, retryDelay: 20 }); }
      finally { release?.(); }
    }
    })();
    return reply.code(response.statusCode).send(response.body);
  });
}
