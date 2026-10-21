import { db } from "../db.js";
import { getUserProfile } from "../repositories/auth-repository.js";
import { getPlanQuotaUsage, processingJobCreditCost } from "./plan-quotas.js";
import { scorePassForDocument } from "./score-passes.js";
import { processingChargeDecision } from "./processing-charge-decision.js";

const QUEUED_EXPORT_FORMATS = ["musicxml", "midi", "pdf", "svg", "png", "wav", "mp3"] as const;

type ScoreExportOptionsQuote = {
  balance: { available: number; creditSource: "monthly" | "prepaid" | "score_pass" | "lifetime" };
  downloadCreditCost: number;
  scorePass?: { rootDocumentId: string | null; remaining: number; sharedWithParts: true };
  options: { format: string; creditCost: number; canSubmit: boolean; reason?: "SCORE_PASS_REQUIRED" }[];
};

/** Read-only quote of the existing export paths. Reservation still happens in createScoreExportJob. */
export function getScoreExportOptions(userId: string, documentId: string): ScoreExportOptionsQuote {
  const quota = getPlanQuotaUsage(userId);
  const creditCost = quota.unlimited ? 0 : processingJobCreditCost({ job_type: "render_export", params_json: null });
  const pass = scorePassForDocument(db, userId, documentId);
  const paid = getUserProfile(userId)?.entitlement.status === "active";
  // Match createScoreExportJob: monthly/prepaid credits precede a bound pass.
  // Unbound passes cannot pay for this score.
  const decision = processingChargeDecision({ unlimited: quota.unlimited, paid, monthlyRemaining: quota.monthly.remaining, prepaidRemaining: quota.prepaid.remaining,
    passRemaining: pass?.remaining ?? null, creditCost });
  const creditSource = decision.source as "monthly" | "prepaid" | "score_pass" | "lifetime";
  const { available, paidAccess, canSubmit } = decision;
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
