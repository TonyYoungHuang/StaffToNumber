import assert from "node:assert/strict";
import test from "node:test";
import type { ScoreMeasure } from "@score/shared";
import { buildVexFlowMeasureAnnotations } from "./vexflow-measure-annotations";

test("formats and separates all measure-level notation into deterministic lanes", () => {
  const measure: ScoreMeasure = {
    id: "m1",
    partId: "P1",
    number: "1",
    sequence: 1,
    events: [],
    rehearsalMarks: [{ id: "r1", text: "A" }],
    tempos: [{ id: "t1", bpm: 96, beatUnit: "quarter" }],
    harmonies: [
      { id: "h1", rootStep: "F", rootAlter: 1, kind: "minor" },
      { id: "h2", rootStep: "B", rootAlter: -1, kind: "dominant", text: "Bb7(add9)" },
    ],
    navigationMarks: [{ id: "n1", type: "ds", text: "D.S. al Coda" }],
    dynamics: [{ id: "d1", value: "mf" }],
    wedges: [{ id: "w1", type: "crescendo" }, { id: "w2", type: "stop" }],
  };

  assert.deepEqual(buildVexFlowMeasureAnnotations(measure).map(({ kind, text, position, line }) => [kind, text, position, line]), [
    ["rehearsal", "A", "above", 0],
    ["tempo", "q = 96", "above", 1],
    ["harmony", "F#m", "above", 2],
    ["harmony", "Bb7(add9)", "above", 3],
    ["navigation", "D.S. al Coda", "above", 4],
    ["dynamic", "mf", "below", 0],
    ["wedge", "cresc.", "below", 1],
  ]);
});

test("uses compact tempo and harmony fallbacks", () => {
  const measure: ScoreMeasure = {
    id: "m2",
    partId: "P1",
    number: "2",
    sequence: 2,
    events: [],
    tempos: [{ id: "t2", bpm: 72, beatUnit: "eighth" }],
    harmonies: [{ id: "h3", rootStep: "C", rootAlter: 0, kind: "major" }],
  };
  assert.deepEqual(buildVexFlowMeasureAnnotations(measure).map(({ text }) => text), ["e = 72", "C"]);
});
