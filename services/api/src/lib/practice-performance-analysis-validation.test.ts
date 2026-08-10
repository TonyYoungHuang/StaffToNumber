import assert from "node:assert/strict";
import test from "node:test";
import { validatePracticePerformanceAnalysis } from "./practice-performance-analysis-validation.js";

function validAnalysis() {
  return {
    schemaVersion: 1, algorithmVersion: "practice-autocorrelation-v1", scoreRevisionId: "revision-1",
    generatedAt: "2026-07-15T00:00:00.000Z",
    alignment: { recordingStartSeconds: 0.2, timeScale: 1, source: "manual" },
    activeRegion: { startSeconds: 0.2, endSeconds: 1.2 }, completeness: { expected: 1, detected: 1, ratio: 1 },
    events: [{
      eventId: "playback-event", sourceEventId: "score-event", measureId: "measure-1", measureNumber: "1", noteName: "A4",
      expectedMidi: 69, recordingTimeSeconds: 0.2, detectedOnsetSeconds: 0.21, onsetDeltaMs: 10,
      detectedFrequencyHz: 440, pitchCents: 0, pitchConfidence: 0.98, status: "matched",
    }],
    measures: [{ measureId: "measure-1", measureNumber: "1", eventCount: 1, detectedCount: 1, pitchAttentionCount: 0, rhythmAttentionCount: 0, polyphonicUnscoredCount: 0 }],
    warnings: [],
  };
}

test("accepts and clones a complete revision-bound practice analysis", () => {
  const input = validAnalysis();
  const result = validatePracticePerformanceAnalysis(input);
  assert.deepEqual(result, input);
  assert.notEqual(result, input);
});

test("rejects unsupported versions, unsafe event values, and inconsistent completeness", () => {
  assert.throws(() => validatePracticePerformanceAnalysis({ ...validAnalysis(), algorithmVersion: "unknown" }), /version/);
  assert.throws(() => validatePracticePerformanceAnalysis({ ...validAnalysis(), events: [{ ...validAnalysis().events[0], status: "perfect" }] }), /status/);
  assert.throws(() => validatePracticePerformanceAnalysis({ ...validAnalysis(), completeness: { expected: 1, detected: 2, ratio: 1 } }), /inconsistent/);
  assert.throws(() => validatePracticePerformanceAnalysis({ ...validAnalysis(), alignment: { recordingStartSeconds: 0, timeScale: 50, source: "manual" } }), /Time scale/);
});

test("accepts null and enforces collection limits", () => {
  assert.equal(validatePracticePerformanceAnalysis(null), null);
  assert.throws(() => validatePracticePerformanceAnalysis({ ...validAnalysis(), events: Array.from({ length: 2_001 }, () => validAnalysis().events[0]) }), /limit/);
});
