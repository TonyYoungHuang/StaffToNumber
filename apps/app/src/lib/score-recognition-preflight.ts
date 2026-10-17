import { needsBigRecognitionLane } from "@score/ui";
import type { RecognitionMode, RecognitionOption } from "./recognition-options";
import type { ScoreStructurePreflight } from "@score/shared";

export type ScoreRecognitionPreflight = ScoreStructurePreflight;

export type ScoreRecognitionPreflightState =
  | { status: "idle" | "checking" | "waiting"; file: File | null; uploadProgress?: number | null }
  | { status: "ready"; file: File; result: ScoreRecognitionPreflight; stagedUploadId: string; stagedUploadExpiresAt: string }
  | { status: "failed"; file: File; error: string; stagedUnavailable?: boolean };

const isCount = (value: unknown, minimum = 0): value is number => Number.isSafeInteger(value) && Number(value) >= minimum;

/** Reject malformed coverage rather than letting an unusable response authorize recognition. */
export function parseScoreRecognitionPreflight(value: unknown): ScoreRecognitionPreflight | null {
  if (!value || typeof value !== "object") return null;
  const result = value as Record<string, unknown>;
  if (result.schemaVersion !== 1 || !["simple", "complex", "uncertain"].includes(String(result.recommendation)) ||
    !["high", "medium", "low"].includes(String(result.confidence)) || !isCount(result.sourcePageCount, 1) ||
    !isCount(result.pagesAnalyzed) || result.pagesAnalyzed > result.sourcePageCount || typeof result.complete !== "boolean" ||
    !Array.isArray(result.reasonCodes) || !result.reasonCodes.every(code => typeof code === "string") || !Array.isArray(result.pages) ||
    result.pages.length !== result.pagesAnalyzed || (result.complete && result.pagesAnalyzed !== result.sourcePageCount)) return null;
  const seenPages = new Set<number>();
  for (const rawPage of result.pages) {
    if (!rawPage || typeof rawPage !== "object") return null;
    const page = rawPage as Record<string, unknown>;
    if (!isCount(page.page, 1) || page.page > result.sourcePageCount || seenPages.has(page.page) ||
      !isCount(page.staffCount) || !isCount(page.systemCount) || !isCount(page.maxStavesPerSystem) ||
      page.maxStavesPerSystem > page.staffCount || typeof page.hasTab !== "boolean" || typeof page.uncertain !== "boolean") return null;
    seenPages.add(page.page);
  }
  if (result.recognitionSupport !== undefined) {
    if (!result.recognitionSupport || typeof result.recognitionSupport !== "object") return null;
    const support = result.recognitionSupport as Record<string, unknown>;
    if (typeof support.supported !== "boolean" || !["READY", "PDF_ADAPTIVE_RENDER", "PDF_PAGE_PIXEL_LIMIT", "PDF_TOTAL_PIXEL_LIMIT", "PDF_INVALID", "RECOGNITION_CAPACITY_LIMIT"].includes(String(support.code)) ||
        (support.pageDpi !== undefined && (!Array.isArray(support.pageDpi) || support.pageDpi.length !== result.sourcePageCount || !support.pageDpi.every(dpi => isCount(dpi, 1))))) return null;
    if (support.supported !== ["READY", "PDF_ADAPTIVE_RENDER"].includes(String(support.code))) return null;
  }
  if (result.memoryAssessment !== undefined) {
    const memory = result.memoryAssessment as Record<string, unknown>;
    if (!memory || typeof memory !== "object" || memory.version !== 1 || !["normal", "big", "unsupported"].includes(String(memory.lane)) ||
      !isCount(memory.estimatedMemoryMb, memory.lane === "unsupported" ? 0 : 1) || typeof memory.capacityVersion !== "string" || !Array.isArray(memory.waitEstimateSeconds) || memory.waitEstimateSeconds.length !== 2 ||
      !memory.waitEstimateSeconds.every(seconds => isCount(seconds)) || Number(memory.waitEstimateSeconds[0]) > Number(memory.waitEstimateSeconds[1]) ||
      !Array.isArray(memory.reasonCodes) || !memory.reasonCodes.every(reason => typeof reason === "string")) return null;
  }
  const parsed = result as unknown as ScoreRecognitionPreflight;
  if (parsed.memoryAssessment?.lane === "unsupported" && parsed.recognitionSupport?.supported === true) return null;
  if (parsed.recognitionSupport?.code === "RECOGNITION_CAPACITY_LIMIT" && parsed.memoryAssessment?.lane !== "unsupported") return null;
  // Partial page coverage must never silently select the more expensive recognition.
  return result.complete ? parsed : { ...parsed, recommendation: "uncertain" };
}

/** Every presentation and action must honor either source of an admission refusal. */
export function isScoreRecognitionRejected(result: ScoreRecognitionPreflight): boolean {
  return result.memoryAssessment?.lane === "unsupported" || result.recognitionSupport?.supported === false;
}

export function recommendedRecognitionMode(result: ScoreRecognitionPreflight): RecognitionMode | null {
  return result.complete && result.recommendation !== "uncertain" ? result.recommendation : null;
}

export function defaultRecognitionMode(result: ScoreRecognitionPreflight): RecognitionMode {
  return recommendedRecognitionMode(result) ?? "simple";
}

/** Free-trial simple path: skip the mode picker and use one-tap start. */
export function isFreeSimpleScanPath(input: {
  freeTrialAvailable: boolean;
  selectedMode: RecognitionMode | null;
  simpleQuote: RecognitionOption | null;
  preflight: ScoreRecognitionPreflightState;
}) {
  if (input.selectedMode !== "simple") return false;
  if (input.preflight.status !== "ready") return false;
  if (isScoreRecognitionRejected(input.preflight.result) || needsBigRecognitionLane(input.preflight.result.memoryAssessment)) return false;
  const quote = input.simpleQuote;
  if (!quote?.canSubmit || quote.mode !== "simple") return false;
  return input.freeTrialAvailable || quote.creditSource === "free_trial";
}

export function canConfirmScoreRecognition(input: {
  file: File | null;
  preflight: ScoreRecognitionPreflightState;
  selectedMode: RecognitionMode | null;
  quote: RecognitionOption | null;
  quoteLoading: boolean;
  quoteError: string | null;
}) {
  return input.file !== null && input.preflight.status === "ready" && input.preflight.file === input.file && Boolean(input.preflight.stagedUploadId?.trim()) && !isScoreRecognitionRejected(input.preflight.result) &&
    !(needsBigRecognitionLane(input.preflight.result.memoryAssessment, input.selectedMode) && input.quote?.creditSource !== "plan" && input.quote?.creditSource !== "score_pass") &&
    input.selectedMode !== null && input.quote?.mode === input.selectedMode && input.quote.canSubmit &&
    Number.isSafeInteger(input.quote.creditCost) && input.quote.creditCost > 0 && !input.quoteLoading && !input.quoteError;
}

/** An async result may update the UI only while it still belongs to the selected upload. */
export class PreflightRequestGuard {
  private version = 0;
  private controller: AbortController | null = null;

  invalidate() { this.version += 1; this.controller?.abort(); this.controller = null; }
  start() {
    this.invalidate();
    this.controller = new AbortController();
    return { version: this.version, signal: this.controller.signal };
  }
  isCurrent(request: { version: number; signal: AbortSignal }) {
    return request.version === this.version && !request.signal.aborted;
  }
}
