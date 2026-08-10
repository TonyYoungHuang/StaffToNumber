import assert from "node:assert/strict";
import test from "node:test";
import type { ScoreJson, ScoreMeasure } from "@score/shared";
import { buildVexFlowScoreLayout, VEXFLOW_LAYOUT } from "./vexflow-layout.js";

function createScore(): ScoreJson {
  const measures: ScoreMeasure[] = [];
  for (const partId of ["P1", "P2"]) {
    for (let index = 0; index < 7; index += 1) {
      measures.push({
        id: `${partId}-m${index + 1}`,
        partId,
        number: String(index + 1),
        sequence: index + 1,
        attributes: index === 0 ? { divisions: 1, staves: partId === "P1" ? 2 : 1, time: { beats: "4", beatType: "4" } } : undefined,
        layout: index === 2 ? { id: `${partId}-layout-3`, newSystem: true } : index === 5 ? { id: `${partId}-layout-6`, newPage: true } : undefined,
        events: [
          {
            id: `${partId}-e${index + 1}`,
            type: "note",
            pitch: { step: "C", alter: 0, octave: 4 },
            duration: 1,
            durationType: "quarter",
            dots: 0,
            voice: "1",
            staff: partId === "P1" && index === 1 ? 2 : 1,
            chord: false,
            ties: [],
            lyrics: [],
          },
        ],
      });
    }
  }
  return {
    schemaVersion: 2,
    title: "Layout fixture",
    source: { kind: "score_json", originalName: "layout-fixture.json" },
    metadata: {
      importedAt: "2026-07-14T00:00:00.000Z",
      parser: "score-json-snapshot-v1",
      measureCount: measures.length,
      noteCount: measures.length,
      restCount: 0,
      warnings: [],
    },
    parts: [
      { id: "P1", name: "Piano", abbreviation: "Pno.", staffCount: 2, measureCount: 7 },
      { id: "P2", name: "Flute", abbreviation: "Fl.", staffCount: 1, measureCount: 7 },
    ],
    measures,
  };
}

test("wraps systems responsively and honors MusicXML system/page breaks", () => {
  const layout = buildVexFlowScoreLayout(createScore(), 900);
  assert.equal(layout.measuresPerSystem, 3);
  assert.deepEqual(layout.systems.map(({ startMeasureIndex, endMeasureIndex }) => [startMeasureIndex, endMeasureIndex]), [
    [0, 2],
    [2, 5],
    [5, 7],
  ]);
  assert.equal(layout.systems[2]?.pageBreakBefore, true);
  assert.equal(layout.pages.length, 2);
  assert.deepEqual(layout.pages.map((page) => page.systemIndexes), [[0, 1], [2]]);
  assert.deepEqual(layout.systems.map((system) => system.pageIndex), [0, 0, 1]);
  assert.equal(layout.systems[2]?.automaticPageBreakBefore, false);
  assert.ok((layout.systems[2]?.y ?? 0) - (layout.systems[1]?.y ?? 0) > layout.systems[1]!.height + VEXFLOW_LAYOUT.systemGap);
  for (const system of layout.systems) {
    const page = layout.pages[system.pageIndex];
    assert.ok(page);
    assert.ok(system.y >= page.contentTop);
    assert.ok(system.y + system.height <= page.contentBottom);
  }
});

test("automatically paginates systems that exceed the printable page area", () => {
  const score = createScore();
  for (const measure of score.measures) {
    if (measure.layout?.newPage) measure.layout = undefined;
  }
  const layout = buildVexFlowScoreLayout(score, 700);

  assert.equal(layout.pages.length, 2);
  assert.deepEqual(layout.pages.map((page) => page.systemIndexes), [[0, 1], [2, 3]]);
  assert.equal(layout.systems[2]?.pageBreakBefore, false);
  assert.equal(layout.systems[2]?.automaticPageBreakBefore, true);
  assert.equal(layout.pages[1]?.y, layout.pages[0]!.y + layout.pageHeight + VEXFLOW_LAYOUT.pageGap);
});

test("aligns parts by system and allocates every effective staff", () => {
  const score = createScore();
  const pianoMeasure = score.measures.find((measure) => measure.id === "P1-m1");
  pianoMeasure?.events.push({
    id: "P1-cross-staff",
    type: "note",
    pitch: { step: "E", alter: 0, octave: 3 },
    duration: 1,
    durationType: "quarter",
    dots: 0,
    voice: "2",
    staff: 3,
    chord: false,
    ties: [],
    lyrics: [],
  });
  const layout = buildVexFlowScoreLayout(score, 900);
  const firstSystem = layout.systems[0];
  const piano = firstSystem?.parts.find((part) => part.partId === "P1");
  const flute = firstSystem?.parts.find((part) => part.partId === "P2");
  assert.equal(piano?.staves.length, 3);
  assert.equal(piano?.staves[1]?.y - piano!.staves[0]!.y, VEXFLOW_LAYOUT.staffSpacing);
  assert.ok((flute?.y ?? 0) > (piano?.y ?? 0) + piano!.height);
  assert.equal(piano?.measures[0]?.x, flute?.measures[0]?.x);
  assert.equal(piano?.measures[1]?.x, flute?.measures[1]?.x);
});

test("reserves page-aware vertical space for event and measure annotations", () => {
  const score = createScore();
  const upper = score.measures.find((measure) => measure.id === "P1-m1");
  const lower = score.measures.find((measure) => measure.id === "P1-m2");
  assert.equal(upper?.events[0]?.type, "note");
  assert.equal(lower?.events[0]?.type, "note");
  if (upper?.events[0]?.type !== "note" || lower?.events[0]?.type !== "note") throw new Error("Expected note fixtures.");
  upper.events[0].lyrics = [{ text: "one" }, { text: "two" }, { text: "three" }];
  lower.events[0].fingerings = ["1", "2"];
  lower.events[0].fermatas = [{ type: "upright" }];
  upper.rehearsalMarks = [{ id: "r1", text: "B" }];
  upper.tempos = [{ id: "t1", bpm: 108 }];
  upper.harmonies = [{ id: "h1", rootStep: "D", rootAlter: 0, kind: "minor" }];
  upper.navigationMarks = [{ id: "nav1", type: "ds", text: "D.S." }];
  upper.dynamics = [
    { id: "d1", value: "p" },
    { id: "d2", value: "mf" },
    { id: "d3", value: "ff" },
    { id: "d4", value: "f" },
    { id: "d5", value: "pp" },
  ];

  const layout = buildVexFlowScoreLayout(score, 900);
  const piano = layout.systems[0]?.parts.find((part) => part.partId === "P1");
  assert.ok(piano);
  assert.ok(piano.topReserve > 0);
  assert.ok(piano.bottomReserve > 0);
  assert.ok(piano.staffSpacing > VEXFLOW_LAYOUT.staffSpacing);
  const page = layout.pages[layout.systems[0]!.pageIndex];
  assert.ok(page);
  assert.ok(layout.systems[0]!.y + layout.systems[0]!.height <= page.contentBottom);
});

test("keeps a complete measure viewport on narrow screens", () => {
  const layout = buildVexFlowScoreLayout(createScore(), 360);
  assert.equal(layout.measuresPerSystem, 1);
  assert.ok(layout.width >= layout.contentX + VEXFLOW_LAYOUT.minimumMeasureWidth + VEXFLOW_LAYOUT.pageMargin);
  assert.equal(layout.systems.length, 7);
  assert.equal(layout.pages.length, 7);
  assert.ok(layout.pages.every((page) => page.systemIndexes.length === 1));
});
