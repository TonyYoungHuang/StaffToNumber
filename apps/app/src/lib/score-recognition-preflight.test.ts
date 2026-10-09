import assert from "node:assert/strict";
import test from "node:test";
import { canConfirmScoreRecognition, defaultRecognitionMode, isFreeSimpleScanPath, parseScoreRecognitionPreflight, PreflightRequestGuard, recommendedRecognitionMode, type ScoreRecognitionPreflight } from "./score-recognition-preflight";

const result: ScoreRecognitionPreflight = {
  schemaVersion: 1, recommendation: "simple", confidence: "high", sourcePageCount: 1, pagesAnalyzed: 1, complete: true,
  reasonCodes: ["ordinary-staves"], pages: [{ page: 1, staffCount: 4, systemCount: 2, maxStavesPerSystem: 2, hasTab: false, uncertain: false }],
};
const file = new File(["score"], "piano.pdf", { type: "application/pdf" });
const quote = { mode: "simple" as const, creditCost: 1, canSubmit: true, reason: null, creditSource: "plan" as const };

test("free structure review does not permit confirmation until the exact file and valid quote are ready", () => {
  const input = { file, preflight: { status: "ready" as const, file, result }, selectedMode: "simple" as const, quote, quoteLoading: false, quoteError: null };
  assert.equal(canConfirmScoreRecognition(input), true);
  assert.equal(canConfirmScoreRecognition({ ...input, preflight: { status: "checking", file } }), false);
  assert.equal(canConfirmScoreRecognition({ ...input, preflight: { status: "failed", file, error: "timeout" } }), false);
  assert.equal(canConfirmScoreRecognition({ ...input, file: new File(["next"], "next.pdf") }), false);
  assert.equal(canConfirmScoreRecognition({ ...input, selectedMode: null }), false);
  assert.equal(canConfirmScoreRecognition({ ...input, selectedMode: "complex" }), false);
  assert.equal(canConfirmScoreRecognition({ ...input, quote: { ...quote, canSubmit: false } }), false);
  assert.equal(canConfirmScoreRecognition({ ...input, quoteLoading: true }), false);
  assert.equal(canConfirmScoreRecognition({ ...input, quoteError: "offline" }), false);
  assert.equal(canConfirmScoreRecognition({ ...input, preflight: { status: "ready", file, result: { ...result,
    recognitionSupport: { supported: false, code: "PDF_TOTAL_PIXEL_LIMIT" } } } }), false);
});

test("partial structure results and unknown results require an explicit user choice", () => {
  assert.equal(recommendedRecognitionMode(result), "simple");
  assert.equal(recommendedRecognitionMode({ ...result, recommendation: "uncertain" }), null);
  const partial = parseScoreRecognitionPreflight({ ...result, sourcePageCount: 80, recommendation: "complex", complete: false });
  assert.ok(partial);
  assert.equal(partial.recommendation, "uncertain");
  assert.equal(recommendedRecognitionMode(partial), null);
});

test("malformed or inconsistent coverage cannot authorize recognition", () => {
  assert.ok(parseScoreRecognitionPreflight(result));
  for (const invalid of [null, {}, { ...result, sourcePageCount: 2 }, { ...result, pagesAnalyzed: -1 }, { ...result, pages: [] },
    { ...result, pages: [{ ...result.pages[0], maxStavesPerSystem: 10 }] }, { ...result, reasonCodes: [123] }, { ...result, confidence: "guaranteed" }]) {
    assert.equal(parseScoreRecognitionPreflight(invalid), null);
  }
  assert.equal(parseScoreRecognitionPreflight({ ...result, recognitionSupport: { supported: true, code: "PDF_TOTAL_PIXEL_LIMIT" } }), null);
  assert.equal(parseScoreRecognitionPreflight({ ...result, recognitionSupport: { supported: true, code: "READY", pageDpi: [] } }), null);
});

test("changing files aborts stale responses, even if their network handlers settle after the latest result", () => {
  const guard = new PreflightRequestGuard();
  const first = guard.start();
  const second = guard.start();
  assert.equal(first.signal.aborted, true);
  assert.equal(guard.isCurrent(first), false);
  assert.equal(guard.isCurrent(second), true);
  guard.invalidate();
  assert.equal(second.signal.aborted, true);
  assert.equal(guard.isCurrent(second), false);
});

test("defaultRecognitionMode falls back to simple when recommendation is uncertain", () => {
  assert.equal(defaultRecognitionMode({ ...result, recommendation: "uncertain", complete: true }), "simple");
  assert.equal(defaultRecognitionMode({ ...result, recommendation: "complex", complete: true }), "complex");
});

test("isFreeSimpleScanPath requires ready simple free-trial quote", () => {
  const ready = { status: "ready" as const, file: new File(["x"], "a.pdf", { type: "application/pdf" }), result };
  const quote = { mode: "simple" as const, creditCost: 1, canSubmit: true, reason: null, creditSource: "free_trial" as const };
  assert.equal(isFreeSimpleScanPath({ freeTrialAvailable: true, selectedMode: "simple", simpleQuote: quote, preflight: ready }), true);
  assert.equal(isFreeSimpleScanPath({ freeTrialAvailable: true, selectedMode: "complex", simpleQuote: quote, preflight: ready }), false);
  assert.equal(isFreeSimpleScanPath({ freeTrialAvailable: false, selectedMode: "simple", simpleQuote: { ...quote, creditSource: "plan", canSubmit: false }, preflight: ready }), false);
});
