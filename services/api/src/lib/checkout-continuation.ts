import type { ScoreRecognitionMode } from "@score/shared";
import { db } from "../db.js";
import { normalizeRecognitionMode } from "./recognition-options.js";
import { normalizeScoreExportRequest } from "./score-export-request.js";
import { lockScorePassAccount, scorePassForDocument } from "./score-passes.js";
import { getUserProfile } from "../repositories/auth-repository.js";

export type NormalizedCheckoutAction =
  | ({ kind: "export" } & ReturnType<typeof normalizeScoreExportRequest>)
  | { kind: "retry"; jobId: string; recognitionMode?: ScoreRecognitionMode; restartRecognition?: true };

export class CheckoutContinuationError extends Error {
  constructor(readonly code: string, message: string, readonly statusCode = 400) { super(message); }
}

export type CheckoutContinuationResult = { documentId: string; job?: unknown; error?: string; code?: string; statusCode?: number };

/** The action, reservation, dispatch outbox and consumed result commit together. */
export function consumeCheckoutContinuation(input: {
  userId: string; orderId: string; token: unknown;
  execute: (action: NormalizedCheckoutAction, documentId: string) => { job: unknown };
}): CheckoutContinuationResult {
  db.exec("BEGIN IMMEDIATE");
  try {
    lockScorePassAccount(db, input.userId);
    const order = db.prepare(`SELECT status, target_document_id, intended_action_json, resume_consumed_at, resume_result_json
      FROM payment_orders WHERE id = ? AND user_id = ? AND public_token = ?`).get(input.orderId, input.userId, typeof input.token === "string" ? input.token : "") as {
      status: string; target_document_id: string | null; intended_action_json: string | null; resume_consumed_at: string | null; resume_result_json: string | null;
    } | undefined;
    if (!order) throw new CheckoutContinuationError("CHECKOUT_ORDER_NOT_FOUND", "Payment order not found.", 404);
    if (order.status !== "paid") throw new CheckoutContinuationError("CHECKOUT_NOT_READY", "Wait for payment and entitlement confirmation before continuing.", 409);
    if (!order.target_document_id || !order.intended_action_json) throw new CheckoutContinuationError("CHECKOUT_ACTION_NOT_FOUND", "This payment has no score operation to continue.", 404);
    if (order.resume_consumed_at) {
      if (!order.resume_result_json) throw new CheckoutContinuationError("CHECKOUT_ACTION_ALREADY_CONSUMED", "This checkout operation has already been attempted.", 409);
      const stored = JSON.parse(order.resume_result_json) as CheckoutContinuationResult;
      db.exec("COMMIT");
      return stored;
    }
    const documentId = order.target_document_id;
    if (!db.prepare("SELECT id FROM score_documents WHERE id = ? AND user_id = ? AND status NOT IN ('deleted', 'archived')").get(documentId, input.userId)) {
      throw new CheckoutContinuationError("CHECKOUT_SCORE_NOT_FOUND", "Score document not found.", 404);
    }
    if (getUserProfile(input.userId)?.entitlement.status !== "active" && !scorePassForDocument(db, input.userId, documentId)) {
      throw new CheckoutContinuationError("CHECKOUT_NOT_READY", "Wait for the score entitlement to become available.", 409);
    }
    let result: CheckoutContinuationResult;
    db.exec("SAVEPOINT checkout_action");
    try {
      result = { documentId, ...input.execute(JSON.parse(order.intended_action_json) as NormalizedCheckoutAction, documentId) };
      db.exec("RELEASE SAVEPOINT checkout_action");
    } catch (error) {
      db.exec("ROLLBACK TO SAVEPOINT checkout_action");
      db.exec("RELEASE SAVEPOINT checkout_action");
      const problem = error as { code?: unknown; statusCode?: unknown; message?: unknown };
      result = { documentId, error: typeof problem.message === "string" ? problem.message : "The score operation could not continue.",
        code: typeof problem.code === "string" ? problem.code : "CHECKOUT_ACTION_FAILED",
        statusCode: typeof problem.statusCode === "number" ? problem.statusCode : 500 };
    }
    const consumed = db.prepare("UPDATE payment_orders SET resume_consumed_at = ?, resume_result_json = ?, updated_at = ? WHERE id = ? AND resume_consumed_at IS NULL")
      .run(new Date().toISOString(), JSON.stringify(result), new Date().toISOString(), input.orderId);
    if (consumed.changes !== 1) throw new CheckoutContinuationError("CHECKOUT_ACTION_ALREADY_CONSUMED", "This checkout operation has already been attempted.", 409);
    db.exec("COMMIT");
    return result;
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}

/** Only the authenticated checkout may persist an action. Never accept score metadata as proof of ownership. */
export function normalizeCheckoutContinuation(userId: string, targetDocumentId: unknown, action: unknown): NormalizedCheckoutAction | null {
  if (targetDocumentId === undefined || targetDocumentId === null || targetDocumentId === "") {
    if (action !== undefined && action !== null) throw new CheckoutContinuationError("CHECKOUT_TARGET_REQUIRED", "Choose the score to continue.");
    return null;
  }
  if (typeof targetDocumentId !== "string" || !db.prepare("SELECT id FROM score_documents WHERE id = ? AND user_id = ? AND status NOT IN ('deleted', 'archived')").get(targetDocumentId, userId)) {
    throw new CheckoutContinuationError("CHECKOUT_SCORE_NOT_FOUND", "Score document not found.", 404);
  }
  if (action === undefined || action === null) return null;
  if (!action || typeof action !== "object" || Array.isArray(action)) throw new CheckoutContinuationError("INVALID_CHECKOUT_ACTION", "Invalid action to continue.");
  const body = action as Record<string, unknown>;
  if (body.kind === "export") return { kind: "export", ...normalizeScoreExportRequest(body) };
  let jobId = body.jobId;
  let recognitionMode: ScoreRecognitionMode | undefined;
  if (body.kind === "recognition") {
    recognitionMode = normalizeRecognitionMode(body.mode);
    const source = db.prepare(`SELECT id FROM score_jobs WHERE document_id = ? AND user_id = ? AND job_type = 'omr_import'
      AND input_file_id IS NOT NULL ORDER BY created_at DESC, id DESC LIMIT 1`).get(targetDocumentId, userId) as { id: string } | undefined;
    jobId = source?.id;
  } else if (body.kind === "retry") {
    if (body.recognitionMode !== undefined) recognitionMode = normalizeRecognitionMode(body.recognitionMode);
  } else throw new CheckoutContinuationError("INVALID_CHECKOUT_ACTION", "Invalid action to continue.");
  const job = typeof jobId === "string" ? db.prepare(`SELECT job_type, status, input_file_id FROM score_jobs
    WHERE id = ? AND document_id = ? AND user_id = ?`).get(jobId, targetDocumentId, userId) as { job_type: string; status: string; input_file_id: string | null } | undefined : undefined;
  if (!job || !["omr_import", "render_export", "audio_transcribe"].includes(job.job_type)) {
    throw new CheckoutContinuationError("CHECKOUT_JOB_NOT_FOUND", "The score operation to continue was not found.", 404);
  }
  if (recognitionMode && (job.job_type !== "omr_import" || !job.input_file_id)) {
    throw new CheckoutContinuationError("INVALID_CHECKOUT_ACTION", "Recognition requires the original uploaded score source.");
  }
  if (job.job_type === "omr_import" && (!job.input_file_id || !db.prepare("SELECT id FROM files WHERE id = ? AND user_id = ?").get(job.input_file_id, userId))) {
    throw new CheckoutContinuationError("CHECKOUT_SOURCE_NOT_FOUND", "The original score source is no longer available.", 404);
  }
  if (body.kind === "recognition" && !["failed", "cancelled", "completed"].includes(job.status)) {
    throw new CheckoutContinuationError("CHECKOUT_JOB_NOT_RETRYABLE", "Wait for the current recognition to finish before trying again.", 409);
  }
  if (body.kind !== "recognition" && !["failed", "cancelled"].includes(job.status)) {
    throw new CheckoutContinuationError("CHECKOUT_JOB_NOT_RETRYABLE", "Only failed or cancelled operations can be retried.", 409);
  }
  return { kind: "retry", jobId: jobId as string, ...(recognitionMode ? { recognitionMode } : {}), ...(body.kind === "recognition" ? { restartRecognition: true as const } : {}) };
}
