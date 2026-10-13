export type ScoreExportQuote = {
  balance: { available: number; creditSource: "monthly" | "prepaid" | "score_pass" };
  downloadCreditCost: number;
  options: { format: string; creditCost: number; canSubmit: boolean; reason?: "SCORE_PASS_QUEUED_EXPORT_REQUIRED" }[];
  code?: string;
};

export function exportQuoteOption(quote: ScoreExportQuote | null, format: string) {
  return quote?.options.find(option => option.format === format) ?? null;
}

/** An unchanged quote needs no second click; a changed price must be shown first. */
export function checkExportQuote(shown: ScoreExportQuote | null, fresh: ScoreExportQuote | null, format: string) {
  const current = exportQuoteOption(fresh, format);
  if (!current) return "unavailable" as const;
  if (current.creditCost !== exportQuoteOption(shown, format)?.creditCost) return "changed" as const;
  if (current.reason === "SCORE_PASS_QUEUED_EXPORT_REQUIRED") return "restricted" as const;
  return current.canSubmit ? "ready" as const : "insufficient" as const;
}
