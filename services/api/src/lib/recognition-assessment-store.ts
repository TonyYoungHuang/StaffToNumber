import { db } from "../db.js";
import type { PhotoCorner, RecognitionMemoryAssessment } from "@score/shared";
import { revalidateRecognitionAssessment, RecognitionAdmissionError } from "./recognition-memory-estimate.js";

/** Private server-written source asset metadata; never accepted from checkout/client JSON. */
export function readDraftAssessment(documentId: string, userId: string) {
  const asset = db.prepare(`SELECT a.params_json FROM score_assets a JOIN score_documents d ON d.id=a.document_id
    WHERE d.id=? AND d.user_id=? AND a.file_id=d.source_file_id AND a.asset_kind IN ('source_pdf','source_image')`).get(documentId,userId) as {params_json:string|null}|undefined;
  const data = asset?.params_json ? JSON.parse(asset.params_json) as { memoryAssessment?:RecognitionMemoryAssessment; photoCorners?: PhotoCorner[]; sourceOrientations?:Record<string,0|90|180|270> } : {};
  return data;
}
export function assertDraftAssessment(documentId: string, userId: string) {
  const draft=db.prepare("SELECT expires_at,task_id FROM score_upload_drafts WHERE document_id = ? AND user_id = ?").get(documentId,userId) as {expires_at:string;task_id:string|null}|undefined;
  if(draft && !draft.task_id && Date.parse(draft.expires_at)<=Date.now() &&
    !db.prepare("SELECT id FROM payment_orders WHERE target_document_id = ? AND user_id = ? AND (status='paid' OR paid_at IS NOT NULL)").get(documentId,userId)) {
    throw new RecognitionAdmissionError("UPLOAD_DRAFT_EXPIRED","This saved upload expired. Check the original again before purchasing.",410);
  }
  const data=readDraftAssessment(documentId,userId);
  revalidateRecognitionAssessment(data.memoryAssessment);
  return data;
}
