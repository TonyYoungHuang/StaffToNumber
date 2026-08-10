import assert from "node:assert/strict";
import test from "node:test";
import type { ScoreJson, ScoreMeasure } from "@score/shared";
import { buildVexFlowScoreLayout } from "./vexflow-layout";
import { buildVexFlowPageInvalidations } from "./vexflow-page-invalidation";

test("invalidates only the page containing an edited note when pagination is stable", () => {
  const score = multiPageScore();
  const layout = buildVexFlowScoreLayout(score, 720);
  assert.equal(layout.pages.length, 2);
  const before = buildVexFlowPageInvalidations(score, layout, []);
  const edited = structuredClone(score);
  const target = edited.measures.find((measure) => measure.id === "m1")!.events[0]!;
  if (target.type === "note") target.pitch.step = "D";
  const editedLayout = buildVexFlowScoreLayout(edited, 720);
  const after = buildVexFlowPageInvalidations(edited, editedLayout, []);

  assert.notEqual(after[0]!.contentKey, before[0]!.contentKey);
  assert.equal(after[1]!.contentKey, before[1]!.contentKey);
  assert.notEqual(after[0]!.systemInvalidations[0]!.contentKey, before[0]!.systemInvalidations[0]!.contentKey);
  assert.equal(after[0]!.systemInvalidations[1]!.contentKey, before[0]!.systemInvalidations[1]!.contentKey);
});

test("selection invalidation touches only pages containing the old and new events", () => {
  const score = multiPageScore();
  const layout = buildVexFlowScoreLayout(score, 720);
  const first = buildVexFlowPageInvalidations(score, layout, ["n1"]);
  const second = buildVexFlowPageInvalidations(score, layout, ["n3"]);

  assert.notEqual(first[0]!.selectionKey, second[0]!.selectionKey);
  assert.notEqual(first[1]!.selectionKey, second[1]!.selectionKey);
});

test("selection changes on one page do not invalidate systems on another page", () => {
  const score = multiPageScore();
  const layout = buildVexFlowScoreLayout(score, 720);
  const first = buildVexFlowPageInvalidations(score, layout, ["n1"]);
  const second = buildVexFlowPageInvalidations(score, layout, ["n2"]);

  assert.notEqual(first[0]!.systemInvalidations[0]!.selectionKey, second[0]!.systemInvalidations[0]!.selectionKey);
  assert.notEqual(first[0]!.systemInvalidations[1]!.selectionKey, second[0]!.systemInvalidations[1]!.selectionKey);
  assert.equal(first[1]!.systemInvalidations[0]!.selectionKey, second[1]!.systemInvalidations[0]!.selectionKey);
});

test("a key signature change invalidates later pages that inherit it", () => {
  const score = multiPageScore();
  const layout = buildVexFlowScoreLayout(score, 720);
  const before = buildVexFlowPageInvalidations(score, layout, []);
  const edited = structuredClone(score);
  edited.measures[0]!.attributes!.key!.fifths = 2;
  const after = buildVexFlowPageInvalidations(edited, buildVexFlowScoreLayout(edited, 720), []);

  assert.notEqual(after[0]!.contentKey, before[0]!.contentKey);
  assert.notEqual(after[1]!.contentKey, before[1]!.contentKey);
});

function multiPageScore(): ScoreJson {
  const first = measure("m1", "n1", 1, { key: { fifths: 0, mode: "major" }, clef: { sign: "G", line: 2 } });
  const second = measure("m2", "n2", 2);
  second.layout = { id: "layout-m2", newSystem: true };
  const third = measure("m3", "n3", 3);
  third.layout = { id: "layout-m3", newPage: true };
  return {
    schemaVersion: 2,
    title: "Incremental pages",
    source: { kind: "score_json", originalName: "incremental.json" },
    metadata: { importedAt: "2026-07-15T00:00:00.000Z", parser: "score-json-snapshot-v1", measureCount: 3, noteCount: 3, restCount: 0, warnings: [] },
    parts: [{ id: "P1", name: "Piano", measureCount: 3 }],
    measures: [first, second, third],
  };
}

function measure(id: string, eventId: string, sequence: number, attributes?: ScoreMeasure["attributes"]): ScoreMeasure {
  return {
    id,
    partId: "P1",
    number: String(sequence),
    sequence,
    attributes,
    events: [
      {
        id: eventId,
        type: "note",
        pitch: { step: "C", alter: 0, octave: 4 },
        duration: 4,
        durationType: "whole",
        dots: 0,
        chord: false,
        ties: [],
        lyrics: [],
      },
    ],
  };
}
