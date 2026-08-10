import assert from "node:assert/strict";
import test from "node:test";
import type { ScoreJson, ScoreMeasure } from "@score/shared";
import { findVexFlowKeySignature, vexFlowKeySignatureFromFifths } from "./vexflow-key-signature";

test("maps the complete MusicXML fifths range to VexFlow key signatures", () => {
  assert.deepEqual(
    Array.from({ length: 15 }, (_, index) => vexFlowKeySignatureFromFifths(index - 7)),
    ["Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#"],
  );
  assert.equal(vexFlowKeySignatureFromFifths(-99), "Cb");
  assert.equal(vexFlowKeySignatureFromFifths(99), "C#");
});

test("inherits the latest key signature for a new VexFlow system", () => {
  const first = measure("m1", 1, -3);
  const second = measure("m2", 2);
  const third = measure("m3", 3, 2);
  const score = {
    schemaVersion: 2,
    title: "Key context",
    source: { kind: "score_json", originalName: "key-context.json" },
    metadata: { importedAt: "2026-07-15T00:00:00.000Z", parser: "score-json-snapshot-v1", measureCount: 3, noteCount: 0, restCount: 0, warnings: [] },
    parts: [{ id: "P1", name: "Clarinet", measureCount: 3 }],
    measures: [first, second, third],
  } satisfies ScoreJson;

  assert.equal(findVexFlowKeySignature(score, "P1", first), "Eb");
  assert.equal(findVexFlowKeySignature(score, "P1", second), "Eb");
  assert.equal(findVexFlowKeySignature(score, "P1", third), "D");
  assert.equal(findVexFlowKeySignature(score, "missing", third), null);
});

function measure(id: string, sequence: number, fifths?: number): ScoreMeasure {
  return {
    id,
    partId: "P1",
    number: String(sequence),
    sequence,
    attributes: fifths === undefined ? undefined : { key: { fifths, mode: "major" } },
    events: [],
  };
}
