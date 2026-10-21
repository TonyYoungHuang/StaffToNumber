import assert from "node:assert/strict";
import test from "node:test";
import { canConfirmScoreRecognition, defaultRecognitionMode, isFreeSimpleScanPath, isScoreRecognitionRejected, parseScoreRecognitionPreflight, PreflightRequestGuard, recommendedRecognitionMode, type ScoreRecognitionPreflight } from "./score-recognition-preflight";
import { recognitionOption, type RecognitionOptions } from "./recognition-options";

const result: ScoreRecognitionPreflight = {
  schemaVersion: 1, recommendation: "simple", confidence: "high", sourcePageCount: 1, pagesAnalyzed: 1, complete: true,
  reasonCodes: ["ordinary-staves"], pages: [{ page: 1, staffCount: 4, systemCount: 2, maxStavesPerSystem: 2, hasTab: false, uncertain: false }],
};
const file = new File(["score"], "piano.pdf", { type: "application/pdf" });
const quote = { mode: "simple" as const, creditCost: 1, canSubmit: true, reason: null, creditSource: "plan" as const };
const staged = { stagedUploadId: "staged-score-1", stagedUploadExpiresAt: "2026-10-15T00:00:00.000Z" };

test("free structure review does not permit confirmation until the exact file and valid quote are ready", () => {
  const input = { file, preflight: { status: "ready" as const, file, result, ...staged }, selectedMode: "simple" as const, quote, quoteLoading: false, quoteError: null };
  assert.equal(canConfirmScoreRecognition(input), true);
  assert.equal(canConfirmScoreRecognition({ ...input, preflight: { status: "checking", file } }), false);
  assert.equal(canConfirmScoreRecognition({ ...input, preflight: { status: "waiting", file } }), false);
  assert.equal(canConfirmScoreRecognition({ ...input, preflight: { status: "failed", file, error: "timeout" } }), false);
  assert.equal(canConfirmScoreRecognition({ ...input, file: new File(["next"], "next.pdf") }), false);
  assert.equal(canConfirmScoreRecognition({ ...input, selectedMode: null }), false);
  assert.equal(canConfirmScoreRecognition({ ...input, selectedMode: "complex" }), false);
  assert.equal(canConfirmScoreRecognition({ ...input, quote: { ...quote, canSubmit: false } }), false);
  assert.equal(canConfirmScoreRecognition({ ...input, quoteLoading: true }), false);
  assert.equal(canConfirmScoreRecognition({ ...input, quoteError: "offline" }), false);
  assert.equal(canConfirmScoreRecognition({ ...input, preflight: { ...input.preflight, stagedUploadId: "" } }), false);
  assert.equal(canConfirmScoreRecognition({ ...input, preflight: { status: "ready", file, ...staged, result: { ...result,
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
  const ready = { status: "ready" as const, file: new File(["x"], "a.pdf", { type: "application/pdf" }), result, ...staged };
  const quote = { mode: "simple" as const, creditCost: 1, canSubmit: true, reason: null, creditSource: "free_trial" as const };
  assert.equal(isFreeSimpleScanPath({ freeTrialAvailable: true, selectedMode: "simple", simpleQuote: quote, preflight: ready }), true);
  assert.equal(isFreeSimpleScanPath({ freeTrialAvailable: true, selectedMode: "complex", simpleQuote: quote, preflight: ready }), false);
  assert.equal(isFreeSimpleScanPath({ freeTrialAvailable: false, selectedMode: "simple", simpleQuote: { ...quote, creditSource: "plan", canSubmit: false }, preflight: ready }), false);
});

test("the lifetime simple scan confirms with no monthly credit pool", () => {
  const options: RecognitionOptions = { defaultMode: "simple", quota: { jobs: { used: 0, limit: 0, remaining: 0 } },
    freeTrial: { available: true, omrJobsRemaining: 1 }, scorePasses: [],
    options: [{ ...quote, creditSource: "free_trial" }, { ...quote, mode: "complex", creditCost: 5, canSubmit: false, creditSource: null, reason: "COMPLEX_RECOGNITION_ENTITLEMENT_REQUIRED" }] };
  const preflight = { status: "ready" as const, file, result, ...staged };
  const simple = recognitionOption(options, "simple");
  assert.equal(isFreeSimpleScanPath({ freeTrialAvailable: options.freeTrial.available, selectedMode: "simple", simpleQuote: simple, preflight }), true);
  assert.equal(canConfirmScoreRecognition({ file, preflight, selectedMode: "simple", quote: simple, quoteLoading: false, quoteError: null }), true);
  assert.equal(canConfirmScoreRecognition({ file, preflight, selectedMode: "complex", quote: recognitionOption(options, "complex"), quoteLoading: false, quoteError: null }), false);
});

import { selectRecognitionCandidate, recognitionSettlementNumbers } from './recognition-candidates';

test('large-score free offers cannot start; eligible paid quotes use the same recognition mode', () => {
  const memoryAssessment = { version: 1 as const, capacityVersion: 'cx33-test', lane: 'big' as const, estimatedMemoryMb: 3072, reasonCodes: ['DENSE_LAYOUT'], waitEstimateSeconds: [60, 120] as [number, number], sourcePageCount: 1, maxPagePixels: 8_000_000, enabled: true };
  const preflight = { status: 'ready' as const, file, result: { ...result, memoryAssessment }, ...staged };
  const input = { file, preflight, selectedMode: 'simple' as const, quote: { ...quote, creditSource: 'free_trial' as const }, quoteLoading: false, quoteError: null };
  assert.equal(canConfirmScoreRecognition(input), false);
  assert.equal(canConfirmScoreRecognition({ ...input, quote }), true);
  assert.equal(canConfirmScoreRecognition({ ...input, quote: { ...quote, creditSource: 'score_pass' } }), true);
  assert.equal(canConfirmScoreRecognition({ ...input, quote: { ...quote, creditCost: 0, creditSource: 'lifetime' } }), true);
  assert.equal(canConfirmScoreRecognition({ ...input, preflight: { ...preflight, result: { ...preflight.result, memoryAssessment: { ...memoryAssessment, lane: 'unsupported' } } }, quote }), false);
  assert.equal(isFreeSimpleScanPath({ freeTrialAvailable: true, selectedMode: 'simple', simpleQuote: input.quote, preflight }), false);
  const complex = { ...input, selectedMode: 'complex' as const, quote: { ...input.quote, mode: 'complex' as const }, preflight: { ...preflight, result: { ...preflight.result, memoryAssessment: { ...memoryAssessment, lane: 'normal' as const } } } };
  assert.equal(canConfirmScoreRecognition(complex), true);
  assert.equal(canConfirmScoreRecognition({ ...complex, quote: { ...complex.quote, creditSource: 'plan' } }), true);
});

test('memory refusals cannot coexist with support and capacity refusal codes stay consistent', () => {
  const memoryAssessment = { version: 1 as const, capacityVersion: 'cx33-test', lane: 'unsupported' as const, estimatedMemoryMb: 2_000, reasonCodes: ['MEMORY_LIMIT'], waitEstimateSeconds: [0, 0] as [number, number], sourcePageCount: 1, maxPagePixels: 100_000_000, enabled: true };
  const denied = { ...result, memoryAssessment, recognitionSupport: { supported: false, code: 'RECOGNITION_CAPACITY_LIMIT' as const } };
  assert.ok(parseScoreRecognitionPreflight(denied));
  assert.equal(isScoreRecognitionRejected(denied), true);
  assert.equal(parseScoreRecognitionPreflight({ ...denied, recognitionSupport: { supported: true, code: 'READY' } }), null);
  assert.equal(parseScoreRecognitionPreflight({ ...denied, memoryAssessment: { ...memoryAssessment, lane: 'normal' } }), null);
  assert.ok(parseScoreRecognitionPreflight({ ...denied, memoryAssessment: { ...memoryAssessment, estimatedMemoryMb: 0 }, recognitionSupport: { supported: false, code: 'PDF_TOTAL_PIXEL_LIMIT' } }));
  assert.equal(parseScoreRecognitionPreflight({ ...result, memoryAssessment: { ...memoryAssessment, estimatedMemoryMb: 0, lane: 'normal' } }), null);
  assert.equal(isScoreRecognitionRejected({ ...result, recognitionSupport: { supported: false, code: 'PDF_INVALID' } }), true);
});

test('uncertain normal photos keep free and credit recognition available for original and straightened inputs', () => {
  const memoryAssessment = { version: 1 as const, capacityVersion: 'cx33-test', lane: 'normal' as const, estimatedMemoryMb: 600, reasonCodes: ['MEMORY_WITHIN_NORMAL_LIMIT'], waitEstimateSeconds: [0, 0] as [number, number], sourcePageCount: 1, maxPagePixels: 2_796_000, enabled: true };
  for (const name of ['40e5a46b-original.jpg', '40e5a46b-straightened.jpg']) {
    const photo = new File(['photo'], name, { type: 'image/jpeg' });
    const uncertain = { ...result, recommendation: 'uncertain' as const, confidence: 'low' as const, memoryAssessment, recognitionSupport: { supported: true, code: 'READY' as const } };
    const preflight = { status: 'ready' as const, file: photo, result: uncertain, ...staged };
    const freeQuote = { ...quote, creditSource: 'free_trial' as const };
    assert.equal(isFreeSimpleScanPath({ freeTrialAvailable: true, selectedMode: 'simple', simpleQuote: freeQuote, preflight }), true, name);
    for (const creditSource of ['free_trial', 'plan'] as const) {
      const photoQuote = { ...freeQuote, creditSource };
      assert.equal(canConfirmScoreRecognition({ file: photo, preflight, selectedMode: 'simple', quote: photoQuote, quoteLoading: false, quoteError: null }), true, `${name} ${creditSource}`);
    }
  }
});

test('page selection keeps one interpretation per source page and preserves explicit ordering', () => {
  const candidates = [{ id: 'page1-a', sourcePages: [1] }, { id: 'page1-b', sourcePages: [1] }, { id: 'page2', sourcePages: [2] }, { id: 'assembled', sourcePages: [1, 2] }];
  assert.deepEqual(selectRecognitionCandidate(['page2', 'page1-a'], candidates[1]!, candidates), ['page2', 'page1-b']);
  assert.deepEqual(selectRecognitionCandidate(['page1-a', 'page2'], candidates[3]!, candidates), ['assembled']);
  assert.deepEqual(selectRecognitionCandidate(['page2'], candidates[2]!, candidates), []);
  assert.deepEqual(selectRecognitionCandidate(['page1-a'], candidates[1]!, candidates, 'parallel'), ['page1-a', 'page1-b']);
  const pieces = [{ id: 'first', sourcePages: [1], title: 'First song' }, { id: 'second', sourcePages: [1], title: 'Second song' }, { id: 'first-copy', sourcePages: [1], title: 'ＦＩＲＳＴ　ＳＯＮＧ - 1' }];
  assert.deepEqual(selectRecognitionCandidate(['first'], pieces[1]!, pieces), ['first', 'second']);
  assert.deepEqual(selectRecognitionCandidate(['first', 'second'], pieces[2]!, pieces), ['second', 'first-copy']);
});

test('partial-delivery credit display retains fractional charges and credit-only returns', () => {
  assert.deepEqual(recognitionSettlementNumbers({ quotedCredits: 5, settledCreditCost: 4, creditsReturned: 1, refundMethod: 'credits-only' }, 'en'), { charged: '4', returned: '1', quoted: '5' });
  assert.deepEqual(recognitionSettlementNumbers({ quotedCredits: 1, settledCreditCost: .6667, creditsReturned: .3333, refundMethod: 'credits-only' }, 'en'), { charged: '0.6667', returned: '0.3333', quoted: '1' });
});
