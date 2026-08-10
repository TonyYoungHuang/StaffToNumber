import assert from "node:assert/strict";
import test from "node:test";
import type { ScoreEvent, ScoreJson } from "@score/shared";
import { scoreJsonToJianpu } from "./jianpu-converter.js";
import { parseJianpuToScoreJson } from "./jianpu-score-parser.js";
import { parseMusicXmlToScoreJson } from "./musicxml-score-parser.js";
import { scoreJsonToMusicXml } from "./score-musicxml-export.js";
import { JIANPU_GOLD_CASES } from "./fixtures/jianpu-gold-cases.js";

const importedAt = "2026-07-14T00:00:00.000Z";

function parse(text: string) {
  return parseJianpuToScoreJson({
    text,
    importedAt,
    sourceOriginalName: "jianpu-roundtrip.txt",
  });
}

function eventSemantics(event: ScoreEvent) {
  const shared = {
    type: event.type,
    duration: event.duration,
    durationType: event.durationType,
    dots: event.dots,
    voice: event.voice ?? "1",
    staff: event.staff ?? 1,
    timeModification: event.timeModification,
    tuplets: event.tuplets?.map((tuplet) => ({ type: tuplet.type, number: tuplet.number })),
  };
  if (event.type === "rest") {
    return { ...shared, measureRest: event.measureRest };
  }
  return {
    ...shared,
    pitch: event.pitch,
    chord: event.chord,
    ties: event.ties.map((tie) => tie.type),
    ...(event.slurs?.length ? { slurs: event.slurs.map((slur) => ({ type: slur.type, number: slur.number })) } : {}),
    ...(event.ornaments?.length
      ? { ornaments: event.ornaments.map((ornament) => ({ type: ornament.type, placement: ornament.placement, value: ornament.value })) }
      : {}),
  };
}

function scoreSemantics(score: ScoreJson) {
  return score.measures.map((measure) => measure.events.map(eventSemantics));
}

test("Jianpu parser preserves chords, voices, staffs, dotted durations, and cross-measure ties", () => {
  const score = parse(`Title: Jianpu semantics
1=A (minor)
Meter: 4/4
| v1:[1.~,3.~,5.~] v2@s2:0- | v1:[~1,~3,~5] |`);

  assert.equal(score.metadata.importDiagnostics?.length, 0);
  assert.equal(score.measures.length, 2);
  assert.equal(score.measures[0].attributes?.divisions, 16);
  const firstMeasure = score.measures[0].events;
  assert.deepEqual(firstMeasure.slice(0, 3).map(eventSemantics), [
    {
      type: "note", duration: 24, durationType: "quarter", dots: 1, voice: "1", staff: 1,
      timeModification: undefined, tuplets: undefined, pitch: { step: "A", alter: 0, octave: 4 }, chord: false, ties: ["start"],
    },
    {
      type: "note", duration: 24, durationType: "quarter", dots: 1, voice: "1", staff: 1,
      timeModification: undefined, tuplets: undefined, pitch: { step: "C", alter: 0, octave: 5 }, chord: true, ties: ["start"],
    },
    {
      type: "note", duration: 24, durationType: "quarter", dots: 1, voice: "1", staff: 1,
      timeModification: undefined, tuplets: undefined, pitch: { step: "E", alter: 0, octave: 5 }, chord: true, ties: ["start"],
    },
  ]);
  assert.deepEqual(eventSemantics(firstMeasure[3]), {
    type: "rest", duration: 32, durationType: "half", dots: 0, voice: "2", staff: 2,
    timeModification: undefined, tuplets: undefined, measureRest: false,
  });
  assert.deepEqual(
    score.measures[1].events.map((event) => event.type === "note" ? event.ties.map((tie) => tie.type) : []),
    [["stop"], ["stop"], ["stop"]],
  );
});

test("Jianpu tuplets retain their ratio and boundary markers", () => {
  const score = parse(`1=C
Meter: 4/4
| 1_{3:2:start} 2_{3:2} 3_{3:2:stop} |`);
  const events = score.measures[0].events;
  assert.deepEqual(events.map((event) => event.duration), [8, 8, 8]);
  assert.deepEqual(events.map((event) => event.timeModification), [
    { actualNotes: 3, normalNotes: 2 },
    { actualNotes: 3, normalNotes: 2 },
    { actualNotes: 3, normalNotes: 2 },
  ]);
  assert.deepEqual(events.map((event) => event.tuplets?.[0]?.type), ["start", undefined, "stop"]);
});

test("Jianpu pickup measures remain implicit across text and MusicXML round trips", () => {
  const score = parse(`1=C
Meter: 4/4
| 1 | 2 3 4 5 |`);
  assert.equal(score.measures[0].implicit, true);
  assert.equal(score.measures[1].implicit, false);

  const jianpu = scoreJsonToJianpu(score, "2026-07-14T00:00:20.000Z");
  assert.match(jianpu.text, /Pickup: yes/);
  assert.equal(parse(jianpu.text).measures[0].implicit, true);

  const musicXml = scoreJsonToMusicXml(score);
  assert.match(musicXml, /<measure number="1" implicit="yes">/);
  const reparsed = parseMusicXmlToScoreJson({
    musicXml,
    title: "Pickup",
    sourceFileId: "pickup-file",
    sourceOriginalName: "pickup.musicxml",
    importedAt,
  });
  assert.equal(reparsed.measures[0].implicit, true);
});

test("senza misura survives Jianpu and MusicXML round trips without becoming a fixed meter", () => {
  const score = parse(`1=C
Meter: free
| 1 2 3 |`);
  assert.deepEqual(score.measures[0].attributes?.time, { beats: "4", beatType: "4", senzaMisura: true });
  assert.equal(score.measures[0].implicit, false);

  const jianpu = scoreJsonToJianpu(score, "2026-07-14T00:00:25.000Z");
  assert.match(jianpu.text, /Meter: free/);
  assert.equal(parse(jianpu.text).measures[0].attributes?.time?.senzaMisura, true);

  const musicXml = scoreJsonToMusicXml(score);
  assert.match(musicXml, /<senza-misura\/>/);
  const reparsed = parseMusicXmlToScoreJson({
    musicXml,
    title: "Free meter",
    sourceFileId: "free-meter-file",
    sourceOriginalName: "free-meter.musicxml",
    importedAt,
  });
  assert.equal(reparsed.measures[0].attributes?.time?.senzaMisura, true);
});

test("Jianpu slurs and common ornaments survive text round trip", () => {
  const score = parse(`1=C
Meter: 4/4
| 1{slur:start:2}{orn:trill-mark:above} 2{orn:turn:below} 3{slur:stop:2}{orn:tremolo:-:3} |`);
  const notes = score.measures[0].events;
  assert.equal(notes[0].type, "note");
  assert.equal(notes[2].type, "note");
  if (notes[0].type !== "note" || notes[2].type !== "note") throw new Error("Expected notes.");
  assert.deepEqual(notes[0].slurs, [{ type: "start", number: "2" }]);
  assert.deepEqual(notes[0].ornaments?.map(({ type, placement, value }) => ({ type, placement, value })), [
    { type: "trill-mark", placement: "above", value: undefined },
  ]);
  assert.deepEqual(notes[2].slurs, [{ type: "stop", number: "2" }]);
  assert.deepEqual(notes[2].ornaments?.map(({ type, placement, value }) => ({ type, placement, value })), [
    { type: "tremolo", placement: undefined, value: "3" },
  ]);

  const document = scoreJsonToJianpu(score, "2026-07-14T00:00:30.000Z");
  assert.match(document.text, /\{slur:start:2}\{orn:trill-mark:above}/);
  assert.deepEqual(scoreSemantics(parse(document.text)), scoreSemantics(score));
});

test("Jianpu degree spelling preserves flat keys and chromatic alterations", () => {
  const score = parse(`Keys: | 1=Db | 1=Cb |
Meters: | 4/4 | 4/4 |
| 1 b2 #4 | 1 |`);
  assert.deepEqual(
    score.measures.flatMap((measure) => measure.events).filter((event) => event.type === "note").map((event) => event.type === "note" ? event.pitch : null),
    [
      { step: "D", alter: -1, octave: 4 },
      { step: "E", alter: -2, octave: 4 },
      { step: "G", alter: 0, octave: 4 },
      { step: "C", alter: -1, octave: 4 },
    ],
  );

  const reparsed = parse(scoreJsonToJianpu(score, "2026-07-14T00:00:40.000Z").text);
  assert.deepEqual(scoreSemantics(reparsed), scoreSemantics(score));
});

test("fixed-do Jianpu keeps the score key while interpreting degrees from C", () => {
  const score = parse(`1=D
Meter: 4/4
| 1 3 #4 |`);
  const fixedDo = scoreJsonToJianpu(score, "2026-07-14T00:00:45.000Z", {
    pitchSystem: "fixed-do",
    accidentalStrategy: "preserve",
  });
  assert.equal(fixedDo.metadata.pitchSystem, "fixed-do");
  assert.match(fixedDo.text, /1=D \(major\)/);
  assert.match(fixedDo.text, /System: fixed-do/);
  assert.match(fixedDo.text, /\| 2 #4 #5 \|/);
  assert.deepEqual(scoreSemantics(parse(fixedDo.text)), scoreSemantics(score));
});

test("fixed-do accidental preference can choose sharp or flat degree spelling", () => {
  const score = parse(`1=C
| #1 |`);
  const sharps = scoreJsonToJianpu(score, "2026-07-14T00:00:46.000Z", {
    pitchSystem: "fixed-do",
    accidentalStrategy: "prefer-sharps",
  });
  const flats = scoreJsonToJianpu(score, "2026-07-14T00:00:47.000Z", {
    pitchSystem: "fixed-do",
    accidentalStrategy: "prefer-flats",
  });
  assert.match(sharps.text, /\| #1 \|/);
  assert.match(flats.text, /\| b2 \|/);
  const sharpPitch = parse(sharps.text).measures[0].events[0];
  const flatPitch = parse(flats.text).measures[0].events[0];
  assert.equal(sharpPitch.type, "note");
  assert.equal(flatPitch.type, "note");
  if (sharpPitch.type !== "note" || flatPitch.type !== "note") throw new Error("Expected notes.");
  const midi = (pitch: typeof sharpPitch.pitch) => (pitch.octave + 1) * 12 + ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[pitch.step]) + pitch.alter;
  assert.equal(midi(sharpPitch.pitch), midi(flatPitch.pitch));
});

test("staff to Jianpu projection keeps event ids and text round-trips musical semantics", () => {
  const score = parse(`Title: Lossless projection
1=A (minor)
Meter: 4/4
| v1:[1.~,3.~,5.~] v2@s2:0- | v1:[~1,~3,~5] 2_{3:2:start} 3_{3:2} 4_{3:2:stop} |`);
  const document = scoreJsonToJianpu(score, "2026-07-14T00:01:00.000Z");

  assert.deepEqual(
    document.parts.flatMap((part) => part.measures.flatMap((measure) => measure.events.map((event) => event.id))),
    score.measures.flatMap((measure) => measure.events.map((event) => event.id)),
  );
  assert.match(document.text, /v2@s2:0-/);
  assert.match(document.text, /\[1\.~,3\.~,5\.~]/);
  assert.match(document.text, /2_\{3:2:start}/);

  const reparsed = parse(document.text);
  assert.deepEqual(scoreSemantics(reparsed), scoreSemantics(score));
  assert.equal(reparsed.metadata.importDiagnostics?.length, 0);
});

test("unsupported Jianpu tokens produce source-located repair diagnostics", () => {
  const source = `Title: Diagnostics
1=C
Meter: 4/4
| 1 X9 2 |`;
  const score = parse(source);
  const diagnostic = score.metadata.importDiagnostics?.[0];

  assert.ok(diagnostic);
  assert.equal(diagnostic.code, "JIANPU_UNSUPPORTED_TOKEN");
  assert.equal(diagnostic.token, "X9");
  assert.equal(diagnostic.line, 4);
  assert.equal(diagnostic.column, 5);
  assert.equal(source.slice(diagnostic.start, diagnostic.end), "X9");
  assert.match(diagnostic.suggestion ?? "", /v2@s2/);
  assert.match(score.metadata.warnings[0], /line 4, column 5/);
  assert.equal(score.metadata.noteCount, 2);
});

test("unsupported Jianpu extensions are diagnosed without discarding the note", () => {
  const score = parse(`1=C
| 1{unknown:effect} |`);
  assert.equal(score.metadata.noteCount, 1);
  assert.equal(score.metadata.importDiagnostics?.[0]?.code, "JIANPU_UNSUPPORTED_EXTENSION");
  assert.equal(score.metadata.importDiagnostics?.[0]?.token, "1{unknown:effect}");
  assert.match(score.metadata.importDiagnostics?.[0]?.suggestion ?? "", /orn:trill-mark/);
});

test("Jianpu projection reports professional symbols that remain only in Score JSON", () => {
  const score = parse(`1=C
| 1 |`);
  const note = score.measures[0].events[0];
  assert.equal(note.type, "note");
  if (note.type !== "note") throw new Error("Expected a note.");
  note.grace = { id: `${note.id}-grace`, slash: true };
  note.articulations = [{ type: "staccato" }];
  score.measures[0].dynamics = [{ id: "dynamic-1", value: "mf", placement: "below" }];

  const document = scoreJsonToJianpu(score, "2026-07-14T00:02:00.000Z");
  assert.equal(document.metadata.warnings.length, 2);
  assert.match(document.metadata.warnings[0], new RegExp(note.id));
  assert.match(document.metadata.warnings[0], /articulations, grace-note timing/);
  assert.match(document.metadata.warnings[1], /dynamics in measure 1/);
});

assert.equal(JIANPU_GOLD_CASES.length, 50);
for (const fixture of JIANPU_GOLD_CASES) {
  test(`Jianpu gold: ${fixture.name}`, () => {
    const score = parse(fixture.text);
    const events = score.measures.flatMap((measure) => measure.events);
    const notes = events.filter((event) => event.type === "note");
    const pitchName = (event: (typeof notes)[number]) => `${event.pitch.step}:${event.pitch.alter}:${event.pitch.octave}`;
    const midi = (event: (typeof notes)[number]) => (event.pitch.octave + 1) * 12 + ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[event.pitch.step]) + event.pitch.alter;

    if (fixture.expected.pitches) assert.deepEqual(notes.map(pitchName), fixture.expected.pitches);
    if (fixture.expected.midis) assert.deepEqual(notes.map(midi), fixture.expected.midis);
    if (fixture.expected.durations) assert.deepEqual(events.map((event) => event.duration), fixture.expected.durations);
    if (fixture.expected.eventTypes) assert.deepEqual(events.map((event) => event.type), fixture.expected.eventTypes);
    if (fixture.expected.voices) assert.deepEqual(events.map((event) => event.voice ?? "1"), fixture.expected.voices);
    if (fixture.expected.staffs) assert.deepEqual(events.map((event) => event.staff ?? 1), fixture.expected.staffs);
    if (fixture.expected.chordFlags) assert.deepEqual(notes.map((event) => event.chord), fixture.expected.chordFlags);
    if (fixture.expected.ties) assert.deepEqual(notes.map((event) => event.ties.map((tie) => tie.type)), fixture.expected.ties);
    if (fixture.expected.tupletRatios) {
      assert.deepEqual(events.map((event) => event.timeModification ? `${event.timeModification.actualNotes}:${event.timeModification.normalNotes}` : null), fixture.expected.tupletRatios);
    }
    assert.equal(score.metadata.importDiagnostics?.length, 0);
  });
}
