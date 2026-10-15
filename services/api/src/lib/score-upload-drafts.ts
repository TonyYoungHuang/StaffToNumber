import { db } from "../db.js";
import { findStoredFileById } from "../repositories/file-repository.js";
import { enqueueStorageDeletion } from "../repositories/storage-deletion-repository.js";
import { createOmrImportScoreDocument, findScoreDocumentById, findScoreJobById } from "../repositories/score-repository.js";
import { recognitionCreditCost } from "./plan-quotas.js";
import { lockScorePassAccount } from "./score-passes.js";
import type { ScoreRecognitionMode } from "@score/shared";
import { retrievePaddleTransaction, retrieveStripeCheckoutSession, stripeSessionMatchesPaymentOrder } from "./payments.js";
import { findPaymentOrderById } from "../repositories/payment-repository.js";
import { saveDurablePaymentOrder } from "./payment-order-durable-store.js";

export const UPLOAD_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
export type ScoreUploadDraftRow = {
  id: string; user_id: string; document_id: string; prepare_intent_id: string; recognition_mode: ScoreRecognitionMode;
  status: string; created_at: string; updated_at: string; expires_at: string; confirmed_order_id: string | null; task_id: string | null;
};
export class ScoreUploadDraftError extends Error {
  constructor(readonly code: string, message: string, readonly statusCode = 409) { super(message); }
}
export function findScoreUploadDraft(userId: string, id: string) {
  return db.prepare("SELECT * FROM score_upload_drafts WHERE id = ? AND user_id = ?").get(id, userId) as ScoreUploadDraftRow | undefined;
}
export function scoreUploadDraftForDocument(userId: string, documentId: string) {
  return db.prepare("SELECT * FROM score_upload_drafts WHERE document_id = ? AND user_id = ?").get(documentId, userId) as ScoreUploadDraftRow | undefined;
}
export function mapScoreUploadDraft(draft: ScoreUploadDraftRow) {
  const document = findScoreDocumentById(draft.document_id);
  const source = document?.source_file_id ? findStoredFileById(document.source_file_id) : undefined;
  return { id: draft.id, documentId: draft.document_id, title: document?.title ?? source?.original_name ?? "",
    filename: source?.original_name ?? "", mode: draft.recognition_mode, creditCost: recognitionCreditCost(draft.recognition_mode),
    status: draft.status, expiresAt: draft.expires_at, taskId: draft.task_id, confirmation: "required" as const };
}

/** Called inside checkout's account-locked transaction and savepoint. No placeholder job is created at preparation. */
export function startScoreUploadDraftRecognition(input: { userId: string; draftId: string; documentId: string; orderId: string }) {
  const draft = findScoreUploadDraft(input.userId, input.draftId);
  if (!draft || draft.document_id !== input.documentId) throw new ScoreUploadDraftError("UPLOAD_DRAFT_NOT_FOUND", "This upload draft is not available for your account.", 404);
  if (draft.task_id) {
    const job = findScoreJobById(draft.task_id);
    if (!job || job.user_id !== input.userId || job.document_id !== input.documentId) throw new ScoreUploadDraftError("UPLOAD_DRAFT_NOT_FOUND", "The original recognition task is unavailable.", 404);
    return job;
  }
  const document = findScoreDocumentById(draft.document_id);
  const file = document?.source_file_id ? findStoredFileById(document.source_file_id) : undefined;
  if (!document || document.user_id !== input.userId || !file || file.user_id !== input.userId || !["source_pdf", "source_image"].includes(file.file_kind)) {
    throw new ScoreUploadDraftError("CHECKOUT_SOURCE_NOT_FOUND", "The original score source is no longer available.", 404);
  }
  const result = createOmrImportScoreDocument({ userId: input.userId, documentId: document.id, title: document.title,
    sourceFileId: file.id, sourceFileKind: file.file_kind as "source_pdf" | "source_image", sourceOriginalName: file.original_name,
    recognitionMode: draft.recognition_mode, existingDraft: true, inTransaction: true });
  if (!result.job) throw new Error("Could not start recognition.");
  db.prepare("UPDATE score_upload_drafts SET status = 'queued', task_id = ?, confirmed_order_id = ?, updated_at = ? WHERE id = ? AND task_id IS NULL")
    .run(result.job.id, input.orderId, new Date().toISOString(), draft.id);
  return result.job;
}

/** Pending provider sessions are conservatively held until payment is resolved. Paid drafts become ordinary scores. */
export function cleanupExpiredScoreUploadDrafts(now = new Date()) {
  let deleted = 0, retained = 0, paymentPending = 0;
  db.exec("BEGIN IMMEDIATE");
  try {
    const candidates = db.prepare("SELECT * FROM score_upload_drafts WHERE status = 'awaiting_payment'").all() as ScoreUploadDraftRow[];
    for (const draft of candidates) {
      lockScorePassAccount(db, draft.user_id);
      const paid = db.prepare("SELECT id FROM payment_orders WHERE target_document_id = ? AND user_id = ? AND (status = 'paid' OR paid_at IS NOT NULL)").get(draft.document_id, draft.user_id);
      const used = db.prepare("SELECT id FROM score_jobs WHERE document_id = ? LIMIT 1").get(draft.document_id);
      const revised = db.prepare("SELECT id FROM score_revisions WHERE document_id = ? LIMIT 1").get(draft.document_id);
      if (paid || used || revised) {
        db.prepare("UPDATE score_upload_drafts SET status = 'retained', updated_at = ? WHERE id = ?").run(now.toISOString(), draft.id);
        retained++;
        continue;
      }
      if (Date.parse(draft.expires_at) > now.getTime()) continue;
      const pending = db.prepare(`SELECT id FROM payment_orders WHERE target_document_id = ? AND user_id = ?
        AND status = 'pending' LIMIT 1`).get(draft.document_id, draft.user_id);
      if (pending) { paymentPending++; continue; }
      const document = findScoreDocumentById(draft.document_id);
      const file = document?.source_file_id ? findStoredFileById(document.source_file_id) : undefined;
      db.prepare("DELETE FROM score_upload_drafts WHERE id = ?").run(draft.id);
      db.prepare("DELETE FROM score_assets WHERE document_id = ?").run(draft.document_id);
      db.prepare("DELETE FROM score_documents WHERE id = ? AND user_id = ?").run(draft.document_id, draft.user_id);
      if (file && !db.prepare("SELECT id FROM score_documents WHERE source_file_id = ?").get(file.id)
        && !db.prepare("SELECT id FROM score_assets WHERE file_id = ?").get(file.id)
        && !db.prepare("SELECT id FROM score_jobs WHERE input_file_id = ? OR output_file_ids_json LIKE ?").get(file.id, `%${file.id}%`)
        && !db.prepare("SELECT id FROM jobs WHERE input_file_id = ? OR output_file_id = ? OR draft_bundle_file_id = ?").get(file.id, file.id, file.id)
        && !db.prepare("SELECT id FROM score_revisions WHERE musicxml_file_id = ?").get(file.id)
        && !db.prepare("SELECT id FROM score_assignment_submissions WHERE performance_file_id = ?").get(file.id)
        && !db.prepare("SELECT id FROM score_classroom_resources WHERE file_id = ?").get(file.id)) {
        enqueueStorageDeletion(db, file, now.toISOString());
        db.prepare("DELETE FROM files WHERE id = ? AND user_id = ?").run(file.id, draft.user_id);
      }
      deleted++;
    }
    db.exec("COMMIT");
    return { deleted, retained, paymentPending };
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}

/** Provider calls finish before the cleanup transaction. A paid or still-open
 * session is held; only an authoritative expired/unpaid session can be removed. */
export async function reconcileExpiredUploadDraftOrders(now = new Date(), services = { retrieveStripeCheckoutSession, retrievePaddleTransaction }) {
  const rows = db.prepare(`SELECT p.id, p.provider, p.public_token, p.checkout_session_id, p.transaction_id
    FROM payment_orders p JOIN score_upload_drafts d ON d.document_id = p.target_document_id AND d.user_id = p.user_id
    WHERE d.status = 'awaiting_payment' AND datetime(d.expires_at) <= datetime(?) AND p.status = 'pending' AND p.paid_at IS NULL
      AND (p.checkout_session_id IS NOT NULL OR p.transaction_id IS NOT NULL)
    ORDER BY p.updated_at, p.id LIMIT 50`).all(now.toISOString()) as Array<{ id: string; provider: string; public_token: string; checkout_session_id: string | null; transaction_id: string | null }>;
  let resolved = 0, unresolved = 0;
  for (let offset = 0; offset < rows.length; offset += 4) {
    await Promise.all(rows.slice(offset, offset + 4).map(async order => {
      try {
        let unpaidExpired = false;
        if (order.provider === "stripe" && order.checkout_session_id) {
          const session = await services.retrieveStripeCheckoutSession(order.checkout_session_id);
          unpaidExpired = session.id === order.checkout_session_id && session.status === "expired" && session.payment_status === "unpaid"
            && stripeSessionMatchesPaymentOrder(session, { orderId: order.id, publicToken: order.public_token, sessionId: order.checkout_session_id });
        } else if (order.provider === "paddle" && order.transaction_id) {
          const transaction = await services.retrievePaddleTransaction(order.transaction_id);
          unpaidExpired = transaction.id === order.transaction_id && transaction.status === "canceled";
        }
        if (!unpaidExpired) { unresolved++; return; }
        const changed = db.prepare(`UPDATE payment_orders SET status = 'cancelled', cancelled_at = ?, updated_at = ?
          WHERE id = ? AND status = 'pending' AND paid_at IS NULL`).run(now.toISOString(), now.toISOString(), order.id);
        if (changed.changes === 1) {
          resolved++;
          const current = findPaymentOrderById(order.id);
          if (current) await saveDurablePaymentOrder(current);
        }
      } catch { unresolved++; }
      finally {
        // Rotate unresolved sessions through bounded sweeps instead of letting
        // a fixed batch of long-running payments starve later expired uploads.
        db.prepare("UPDATE payment_orders SET updated_at = ? WHERE id = ? AND status = 'pending' AND paid_at IS NULL").run(now.toISOString(), order.id);
      }
    }));
  }
  return { resolved, unresolved };
}
