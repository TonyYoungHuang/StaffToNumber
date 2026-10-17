import { formatNumber, type SupportedLocale } from '@score/i18n';
type RecognitionCandidate = { id: string; sourcePages: number[]; title?: string };
const titleKey = (title?: string) => (title ?? "").normalize("NFKC").toLocaleLowerCase("en").replace(/(?:\s*[-–—]\s*\d+|\s*\(\d+\))$/u, "").replace(/[\p{P}\p{Z}\s]/gu, "");
/** Page candidates are atomic; alternate readings of the same page are compared, never concatenated. */
export function selectRecognitionCandidate(current: string[], candidate: RecognitionCandidate, candidates: RecognitionCandidate[], mode: "append" | "parallel" = "append"): string[] {
  if (current.includes(candidate.id)) return current.filter(id => id !== candidate.id);
  if (mode === "parallel") return [...current, candidate.id];
  const pages = new Set(candidate.sourcePages);
  return [...current.filter(id => {
    const existing = candidates.find(item => item.id === id);
    if (!existing?.sourcePages.some(page => pages.has(page))) return true;
    const previousTitle = titleKey(existing.title), nextTitle = titleKey(candidate.title);
    // Differently named pieces may share a printed page; joining them is explicit.
    return Boolean(previousTitle && nextTitle && previousTitle !== nextTitle);
  }), candidate.id];
}

export type RecognitionCreditSettlement = { quotedCredits: number; settledCreditCost: number; creditsReturned: number; refundMethod: 'credits-only' };
export function recognitionSettlementNumbers(settlement: RecognitionCreditSettlement, locale: SupportedLocale) {
  const options = { maximumFractionDigits: 4 };
  return { charged: formatNumber(settlement.settledCreditCost, locale, options), returned: formatNumber(settlement.creditsReturned, locale, options), quoted: formatNumber(settlement.quotedCredits, locale, options) };
}
