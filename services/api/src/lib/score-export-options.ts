import { db } from "../db.js";
import { getUserProfile } from "../repositories/auth-repository.js";
import { getPlanQuotaUsage, processingJobCreditCost } from "./plan-quotas.js";
import { scorePassForDocument } from "./score-passes.js";

const QUEUED_EXPORT_FORMATS = ["musicxml", "midi", "pdf", "svg", "png", "wav", "mp3"] as const;

type ScoreExportOptionsQuote = {
  balance: { available: number; creditSource: "monthly" | "prepaid" | "score_pass" };
  downloadCreditCost: number;
  scorePass?: { rootDocumentId: string | null; remaining: number; sharedWithParts: true };
  options: { format: string; creditCost: number; canSubmit: boolean; reason?: "SCORE_PASS_REQUIRED" }[];
};

/** Read-only quote of the existing export paths. Reservation still happens in createScoreExportJob. */
export function getScoreExportOptions(userId: string, documentId: string): ScoreExportOptionsQuote {
  const creditCost = processingJobCreditCost({ job_type: "render_export", params_json: null });
  const quota = getPlanQuotaUsage(userId);
  const pass = scorePassForDocument(db, userId, documentId);
  const paid = getUserProfile(userId)?.entitlement.status === "active";
  // Match createScoreExportJob: monthly/prepaid credits precede a bound pass.
  // Unbound passes cannot pay for this score.
  const usePass = Boolean(pass) && (!paid ||
    (quota.monthly.remaining < creditCost && quota.prepaid.remaining < creditCost));
  const creditSource = usePass ? "score_pass" as const : quota.monthly.remaining >= creditCost || !paid ? "monthly" as const : "prepaid" as const;
  const available = usePass ? pass!.remaining : creditSource === "monthly" ? quota.monthly.remaining : quota.prepaid.remaining;
  const paidAccess = paid || Boolean(pass);
  const canSubmit = paidAccess && available >= creditCost;
  return {
    balance: { available, creditSource },
    downloadCreditCost: 0,
    ...(pass ? { scorePass: { rootDocumentId: pass.documentId, remaining: pass.remaining, sharedWithParts: true as const } } : {}),
    options: [
      ...QUEUED_EXPORT_FORMATS.map(format => ({ format, creditCost, canSubmit, ...(!paidAccess ? { reason: "SCORE_PASS_REQUIRED" as const } : {}) })),
      // These direct TXT/JSON routes create assets without a processing job.
      ...["jianpu", "score-json"].map(format => ({
        format, creditCost: 0, canSubmit: true,
      })),
    ],
  };
}

export function scoreExportPriceMatches(expectedCreditCost: unknown, format: string, quote: ReturnType<typeof getScoreExportOptions>) {
  return expectedCreditCost === undefined || expectedCreditCost === quote.options.find(option => option.format === format)?.creditCost;
}
