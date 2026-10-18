export type ScoreExportQuote = {
  balance: { available: number; creditSource: "monthly" | "prepaid" | "score_pass" };
  downloadCreditCost: number;
  scorePass?: { rootDocumentId: string; remaining: number; sharedWithParts: true };
  options: { format: string; creditCost: number; canSubmit: boolean; reason?: "SCORE_PASS_QUEUED_EXPORT_REQUIRED" | "SCORE_PASS_REQUIRED" }[];
  code?: string;
};

export function exportQuoteOption(quote: ScoreExportQuote | null, format: string) {
  return quote?.options.find(option => option.format === format) ?? null;
}

/** Paid formats remain actionable for free accounts so the action can open checkout. */
export function canRequestScoreExport(quote: ScoreExportQuote | null, format: string) {
  const option = exportQuoteOption(quote, format);
  return option?.canSubmit === true || option?.reason === "SCORE_PASS_REQUIRED";
}

/** An unchanged quote needs no second click; a changed price must be shown first. */
export function checkExportQuote(shown: ScoreExportQuote | null, fresh: ScoreExportQuote | null, format: string) {
  const current = exportQuoteOption(fresh, format);
  if (!current) return "unavailable" as const;
  if (current.reason === "SCORE_PASS_REQUIRED") return "paywall" as const;
  if (current.creditCost !== exportQuoteOption(shown, format)?.creditCost) return "changed" as const;
  if (current.reason === "SCORE_PASS_QUEUED_EXPORT_REQUIRED") return "restricted" as const;
  return current.canSubmit ? "ready" as const : "insufficient" as const;
}
