import type { ScoreJson } from "@score/shared";

export type AudiverisConfidenceSummary = {
  confidence: number | null;
  sourcePageCount: number | null;
  symbolCount: number;
};

export function summarizeAudiverisConfidence(scoreJson: ScoreJson): AudiverisConfidenceSummary {
  const symbols = scoreJson.recognitionLayer?.engine === "audiveris" ? scoreJson.recognitionLayer.symbols : [];
  const symbolConfidences = symbols
    .map((symbol) => symbol.confidence)
    .filter((confidence): confidence is number => confidence !== null && Number.isFinite(confidence));
  const eventConfidences = scoreJson.measures
    .flatMap((measure) => measure.events)
    .filter((event) => event.recognition?.source === "omr-engine")
    .map((event) => event.recognition?.confidence)
    .filter((confidence): confidence is number => confidence !== null && confidence !== undefined && Number.isFinite(confidence));
  const confidences = symbolConfidences.length > 0 ? symbolConfidences : eventConfidences;
  const pages = symbols.map((symbol) => symbol.page).filter((page) => Number.isInteger(page) && page > 0);

  return {
    confidence:
      confidences.length > 0
        ? Number((confidences.reduce((sum, confidence) => sum + confidence, 0) / confidences.length).toFixed(4))
        : null,
    sourcePageCount: pages.length > 0 ? Math.max(...pages) : null,
    symbolCount: symbols.length,
  };
}
