import { db } from "../db.js";
import { getUserProfile } from "../repositories/auth-repository.js";
import { getPlanQuotaUsage, processingJobCreditCost } from "./plan-quotas.js";
import { scorePassForDocument } from "./score-passes.js";

const QUEUED_EXPORT_FORMATS = ["musicxml", "midi", "pdf", "svg", "png", "wav", "mp3"] as const;

type ScoreExportOptionsQuote = {
  balance: { available: number; creditSource: "monthly" | "prepaid" | "score_pass" };
  downloadCreditCost: number;
  options: { format: string; creditCost: number; canSubmit: boolean; reason?: "SCORE_PASS_QUEUED_EXPORT_REQUIRED" }[];
};

/** Read-only quote of the existing export paths. Reservation still happens in createScoreExportJob. */
export function getScoreExportOptions(userId: string, documentId: string): ScoreExportOptionsQuote {
  const creditCost = processingJobCreditCost({ job_type: "render_export", params_json: null });
  const quota = getPlanQuotaUsage(userId);
  const pass = scorePassForDocument(db, userId, documentId);
  const paid = getUserProfile(userId)?.entitlement.status === "active";
  // Match createScoreExportJob: a bound pass is used before free monthly credits,
  // and after paid monthly/prepaid credits. Unbound passes cannot pay for this score.
  const usePass = Boolean(pass) && (!paid ||
    (quota.monthly.remaining < creditCost && quota.prepaid.remaining < creditCost));
  const creditSource = usePass ? "score_pass" as const : quota.monthly.remaining >= creditCost ? "monthly" as const : "prepaid" as const;
  const available = usePass ? pass!.remaining : creditSource === "monthly" ? quota.monthly.remaining : quota.prepaid.remaining;
  const canSubmit = available >= creditCost;
  return {
    balance: { available, creditSource },
    downloadCreditCost: 0,
    options: [
      ...QUEUED_EXPORT_FORMATS.map(format => ({ format, creditCost, canSubmit })),
      // These direct TXT/JSON routes create assets without a processing job.
      // Existing access rules block legacy /export/* routes for pass-only users.
      ...["jianpu", "score-json"].map(format => ({
        format, creditCost: 0, canSubmit: !pass || paid,
        ...(!paid && pass ? { reason: "SCORE_PASS_QUEUED_EXPORT_REQUIRED" as const } : {}),
      })),
    ],
  };
}

export function scoreExportPriceMatches(expectedCreditCost: unknown, format: string, quote: ReturnType<typeof getScoreExportOptions>) {
  return expectedCreditCost === undefined || expectedCreditCost === quote.options.find(option => option.format === format)?.creditCost;
}
