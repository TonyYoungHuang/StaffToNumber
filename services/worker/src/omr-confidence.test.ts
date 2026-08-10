import assert from "node:assert/strict";
import test from "node:test";
import type { ScoreJson } from "@score/shared";
import { summarizeAudiverisConfidence } from "./omr-confidence.js";

function scoreFixture(overrides: Partial<ScoreJson>): ScoreJson {
  return {
    version: "1.0",
    title: "OMR confidence",
    metadata: {
      parser: "omr-confidence-test",
      sourceFormat: "musicxml",
      importedAt: new Date(0).toISOString(),
      partCount: 0,
      measureCount: 0,
      noteCount: 0,
      restCount: 0,
      warnings: [],
    },
    parts: [],
    measures: [],
    navigationMarks: [],
    ...overrides,
  } as unknown as ScoreJson;
}

test("aggregates real Audiveris symbol confidence and page count", () => {
  const summary = summarizeAudiverisConfidence(
    scoreFixture({
      recognitionLayer: {
        engine: "audiveris",
        symbols: [
          { id: "a", engineId: "a", shape: "NOTEHEAD_BLACK", grade: 0.8, contextualGrade: 0.9, confidence: 0.9, page: 1, bbox: { x: 1, y: 2, width: 3, height: 4 }, issues: [] },
          { id: "b", engineId: "b", shape: "REST_QUARTER", grade: 0.6, contextualGrade: null, confidence: 0.6, page: 3, bbox: { x: 5, y: 6, width: 7, height: 8 }, issues: [] },
          { id: "c", engineId: "c", shape: "CLEF_G", grade: null, contextualGrade: null, confidence: null, page: 2, bbox: { x: 9, y: 10, width: 11, height: 12 }, issues: [] },
        ],
      },
    }),
  );

  assert.deepEqual(summary, { confidence: 0.75, sourcePageCount: 3, symbolCount: 3 });
});

test("does not present structural diagnostics as Audiveris probability", () => {
  const summary = summarizeAudiverisConfidence(
    scoreFixture({
      measures: [
        {
          id: "m1",
          partId: "p1",
          number: "1",
          sequence: 1,
          events: [
            {
              id: "n1",
              type: "note",
              pitch: { step: "C", alter: 0, octave: 4 },
              duration: 1,
              dots: 0,
              chord: false,
              ties: [],
              lyrics: [],
              recognition: { confidence: 0.94, source: "structural", issues: [] },
            },
          ],
        },
      ],
    }),
  );

  assert.deepEqual(summary, { confidence: null, sourcePageCount: null, symbolCount: 0 });
});
