import assert from "node:assert/strict";
import test from "node:test";
import type { ScoreBarline, ScoreJson, ScoreMeasure } from "@score/shared";
import { parseJianpuToScoreJson } from "./jianpu-score-parser.js";
import { parseMusicXmlToScoreJson } from "./musicxml-score-parser.js";
import { scoreJsonToMusicXml } from "./score-musicxml-export.js";
import { playbackToMidiFile } from "./score-midi-export.js";
import { buildPlaybackMeasureSequence, scoreJsonToPlayback } from "./score-playback.js";

const importedAt = "2026-07-14T00:00:00.000Z";

function scoreWithMeasures(count: number): ScoreJson {
  const body = Array.from({ length: count }, (_, index) => `${(index % 7) + 1}`).join(" | ");
  return parseJianpuToScoreJson({
    text: `1=C\nMeter: 4/4\n| ${body} |`,
    importedAt,
    sourceOriginalName: "playback-navigation.txt",
  });
}

function measure(score: ScoreJson, number: number) {
  const result = score.measures.find((candidate) => candidate.number === String(number));
  assert.ok(result);
  return result;
}

function addBarline(target: ScoreMeasure, barline: Omit<ScoreBarline, "id">) {
  target.barlines = [...(target.barlines ?? []), { id: `barline-${target.id}-${target.barlines?.length ?? 0}`, ...barline }];
}

function addRepeat(target: ScoreMeasure, direction: "forward" | "backward", repeatTimes?: number) {
  addBarline(target, { location: direction === "forward" ? "left" : "right", repeatDirection: direction, repeatTimes });
}

function addEnding(target: ScoreMeasure, number: string) {
  addBarline(target, { location: "left", ending: { number, type: "start" } });
  addBarline(target, { location: "right", ending: { number, type: "stop" } });
}

function addNavigation(target: ScoreMeasure, type: NonNullable<ScoreMeasure["navigationMarks"]>[number]["type"], text: string) {
  target.navigationMarks = [...(target.navigationMarks ?? []), { id: `nav-${target.id}-${type}`, type, text }];
}

function sequence(score: ScoreJson) {
  const warnings: string[] = [];
  const result = buildPlaybackMeasureSequence({ partId: score.parts[0].id, measures: score.measures, warnings });
  return { numbers: result.playbackMeasures.map((item) => Number(item.measure.number)), graph: result.graph, warnings };
}

test("nested repeats replay inner regions on each outer pass", () => {
  const score = scoreWithMeasures(5);
  addRepeat(measure(score, 1), "forward");
  addRepeat(measure(score, 2), "forward");
  addRepeat(measure(score, 3), "backward");
  addRepeat(measure(score, 4), "backward");

  const result = sequence(score);
  assert.deepEqual(result.numbers, [1, 2, 3, 2, 3, 4, 1, 2, 3, 2, 3, 4, 5]);
  assert.equal(result.graph.jumpCount, 3);
  assert.equal(result.graph.terminatedBy, "end");
});

test("first and second endings select the matching repeat pass", () => {
  const score = scoreWithMeasures(5);
  addRepeat(measure(score, 1), "forward");
  addEnding(measure(score, 3), "1");
  addRepeat(measure(score, 3), "backward");
  addEnding(measure(score, 4), "2");

  const result = sequence(score);
  assert.deepEqual(result.numbers, [1, 2, 3, 1, 2, 4, 5]);
  assert.ok(result.graph.steps.some((step) => step.action === "skip-ending" && step.measureNumber === "3"));
});

test("MusicXML repeat times and volta ranges support a third ending", () => {
  const score = scoreWithMeasures(5);
  addRepeat(measure(score, 1), "forward");
  addEnding(measure(score, 3), "1-2");
  addRepeat(measure(score, 3), "backward", 3);
  addEnding(measure(score, 4), "3");

  const result = sequence(score);
  assert.deepEqual(result.numbers, [1, 2, 3, 1, 2, 3, 1, 2, 4, 5]);
  assert.equal(result.graph.jumpCount, 2);
  const musicXml = scoreJsonToMusicXml(score);
  assert.match(musicXml, /<repeat direction="backward" times="3"\/>/);
  const reparsed = parseMusicXmlToScoreJson({ musicXml, title: "Repeat roundtrip", sourceFileId: "repeat", sourceOriginalName: "repeat.musicxml", importedAt });
  assert.equal(measure(reparsed, 3).barlines?.find((barline) => barline.repeatDirection === "backward")?.repeatTimes, 3);
});

test("D.C. al Fine jumps once, stops at Fine, and reports unreachable tail measures", () => {
  const score = scoreWithMeasures(5);
  addNavigation(measure(score, 2), "fine", "Fine");
  addNavigation(measure(score, 4), "dc", "D.C. al Fine");

  const result = sequence(score);
  assert.deepEqual(result.numbers, [1, 2, 3, 4, 1, 2]);
  assert.equal(result.graph.terminatedBy, "fine");
  assert.deepEqual(result.graph.unreachableMeasureIds, [measure(score, 5).id]);
  assert.ok(result.graph.steps.some((step) => step.action === "dc-jump"));
  assert.ok(result.graph.steps.some((step) => step.action === "fine-stop"));
});

test("D.S. al Coda follows Segno, To Coda, and Coda in order", () => {
  const score = scoreWithMeasures(8);
  addNavigation(measure(score, 2), "segno", "Segno");
  addNavigation(measure(score, 4), "to-coda", "To Coda");
  addNavigation(measure(score, 6), "ds", "D.S. al Coda");
  addNavigation(measure(score, 7), "coda", "Coda");

  const result = sequence(score);
  assert.deepEqual(result.numbers, [1, 2, 3, 4, 5, 6, 2, 3, 4, 7, 8]);
  assert.equal(result.graph.jumpCount, 2);
  assert.ok(result.graph.steps.some((step) => step.action === "ds-jump" && step.targetMeasureId === measure(score, 2).id));
  assert.ok(result.graph.steps.some((step) => step.action === "coda-jump" && step.targetMeasureId === measure(score, 7).id));
});

test("playback document exposes occurrence markers and the navigation graph", () => {
  const score = scoreWithMeasures(3);
  addRepeat(measure(score, 1), "forward");
  addRepeat(measure(score, 2), "backward");
  const playback = scoreJsonToPlayback(score, importedAt);

  assert.deepEqual(playback.measureMarkers.map((marker) => marker.measureNumber), ["1", "2", "1", "2", "3"]);
  assert.equal(playback.navigationGraphs?.[0].jumpCount, 1);
  assert.equal(playback.events.filter((event) => event.measureNumber === "1").length, 2);
});

test("playback schedules beat-unit-aware tempo changes at fractional measure offsets", () => {
  const score = scoreWithMeasures(2);
  const first = measure(score, 1);
  first.attributes = { ...(first.attributes ?? {}), divisions: 4 };
  first.tempos = [
    { id: "tempo-start", bpm: 120, beatUnit: "quarter" },
    { id: "tempo-middle", bpm: 120, beatUnit: "eighth", offsetDivisions: 2 },
  ];
  const playback = scoreJsonToPlayback(score, importedAt);
  assert.equal(playback.tempoBpm, 120);
  assert.deepEqual(playback.tempoChanges?.map((tempo) => [tempo.startBeat, tempo.bpm]), [[0, 120], [0.5, 60]]);
  assert.equal(playback.metadata.warnings.some((warning) => warning.includes("not yet scheduled")), false);
});

test("MIDI export preserves the piecewise tempo map", () => {
  const score = scoreWithMeasures(2);
  const first = measure(score, 1);
  first.attributes = { ...(first.attributes ?? {}), divisions: 4 };
  first.tempos = [
    { id: "tempo-start", bpm: 120, beatUnit: "quarter" },
    { id: "tempo-middle", bpm: 120, beatUnit: "eighth", offsetDivisions: 2 },
  ];

  const midi = playbackToMidiFile(scoreJsonToPlayback(score, importedAt));
  assert.equal(includesBytes(midi, [0xff, 0x51, 0x03, 0x07, 0xa1, 0x20]), true, "Expected 120 BPM tempo metadata.");
  assert.equal(includesBytes(midi, [0xff, 0x51, 0x03, 0x0f, 0x42, 0x40]), true, "Expected 60 BPM tempo metadata after the fractional change.");
});

function includesBytes(haystack: Uint8Array, needle: number[]) {
  return haystack.some((_, index) => needle.every((byte, offset) => haystack[index + offset] === byte));
}
