import assert from "node:assert/strict";
import test from "node:test";
import { TRANSPOSING_INSTRUMENT_PROFILES } from "@score/shared";
import { parseJianpuToScoreJson } from "./jianpu-score-parser.js";
import { parseMusicXmlToScoreJson } from "./musicxml-score-parser.js";
import { scoreJsonToMusicXml } from "./score-musicxml-export.js";
import { recommendScoreClefs } from "./score-clef-recommendation.js";
import {
  semitonesForInstrumentPitchMode,
  semitonesForTargetKey,
  transposeScoreJson,
} from "./score-transpose.js";

const importedAt = "2026-07-14T00:00:00.000Z";

function scoreFromJianpu(text = "1=C\nMeter: 4/4\n| 1 2 3 4 |") {
  return parseJianpuToScoreJson({ text, importedAt, sourceOriginalName: "transpose-gold.txt" });
}

function firstPitch(score: ReturnType<typeof scoreFromJianpu>) {
  const event = score.measures[0].events.find((candidate) => candidate.type === "note");
  assert.ok(event && event.type === "note");
  return event.pitch;
}

test("professional transposer spells all 12 pitch classes with sharp and flat policies", () => {
  const source = scoreFromJianpu("1=C\nMeter: 4/4\n| 1 | ");
  const sharpNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const flatNames = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  const format = (pitch: { step: string; alter: number }) => `${pitch.step}${pitch.alter > 0 ? "#".repeat(pitch.alter) : pitch.alter < 0 ? "b".repeat(-pitch.alter) : ""}`;

  for (let semitones = 0; semitones < 12; semitones += 1) {
    assert.equal(format(firstPitch(transposeScoreJson({ score: source, semitones, spellingPolicy: "prefer-sharps", generatedAt: importedAt }))), sharpNames[semitones]);
    assert.equal(format(firstPitch(transposeScoreJson({ score: source, semitones, spellingPolicy: "prefer-flats", generatedAt: importedAt }))), flatNames[semitones]);
  }
});

test("target keys drive enharmonic spelling and support common church modes", () => {
  const source = scoreFromJianpu();
  const dbMajor = semitonesForTargetKey({ score: source, targetTonic: "Db", targetMode: "major" });
  const dbScore = transposeScoreJson({ score: source, semitones: dbMajor.semitones, targetKey: dbMajor.target, spellingPolicy: "auto", generatedAt: importedAt });
  assert.deepEqual(dbScore.measures[0].attributes?.key, { fifths: -5, mode: "major" });
  assert.deepEqual(firstPitch(dbScore), { step: "D", alter: -1, octave: 4 });

  const modalCases = [
    ["D", "dorian", 0],
    ["E", "phrygian", 0],
    ["F", "lydian", 0],
    ["G", "mixolydian", 0],
    ["B", "locrian", 0],
  ] as const;
  for (const [tonic, mode, fifths] of modalCases) {
    const target = semitonesForTargetKey({ score: source, targetTonic: tonic, targetMode: mode });
    assert.equal(target.target.fifths, fifths);
    assert.equal(target.target.mode, mode);
  }

  const parallelMinor = semitonesForTargetKey({ score: source, targetTonic: "C", targetMode: "minor" });
  assert.equal(parallelMinor.semitones, 0);
  const cMinor = transposeScoreJson({ score: source, semitones: 0, targetKey: parallelMinor.target, spellingPolicy: "auto", generatedAt: importedAt });
  assert.deepEqual(cMinor.measures[0].attributes?.key, { fifths: -3, mode: "minor" });
});

test("all 15 conventional major and minor key signatures resolve to the requested fifths", () => {
  const source = scoreFromJianpu();
  const majorTonics = ["Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#"];
  const minorTonics = ["Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#"];
  for (let index = 0; index < 15; index += 1) {
    assert.equal(semitonesForTargetKey({ score: source, targetTonic: majorTonics[index], targetMode: "major" }).target.fifths, index - 7);
    assert.equal(semitonesForTargetKey({ score: source, targetTonic: minorTonics[index], targetMode: "minor" }).target.fifths, index - 7);
  }
});

test("preserve policy can retain a requested diatonic interval spelling", () => {
  const source = scoreFromJianpu("1=C\nMeter: 4/4\n| 1 | ");
  const minorSecond = transposeScoreJson({
    score: source,
    semitones: 1,
    diatonicSteps: 1,
    spellingPolicy: "preserve",
    generatedAt: importedAt,
  });
  assert.deepEqual(firstPitch(minorSecond), { step: "D", alter: -1, octave: 4 });
});

test("instrument profiles cover production directions and at least 12 common classes", () => {
  assert.ok(TRANSPOSING_INSTRUMENT_PROFILES.length >= 12);
  const bb = TRANSPOSING_INSTRUMENT_PROFILES.find((profile) => profile.id === "bb-soprano");
  const piccolo = TRANSPOSING_INSTRUMENT_PROFILES.find((profile) => profile.id === "piccolo");
  assert.ok(bb && piccolo);
  assert.equal(semitonesForInstrumentPitchMode(bb.semitonesFromConcertPitch, "concert-to-written"), 2);
  assert.equal(semitonesForInstrumentPitchMode(bb.semitonesFromConcertPitch, "written-to-concert"), -2);
  assert.equal(semitonesForInstrumentPitchMode(piccolo.semitonesFromConcertPitch, "concert-to-written"), -12);
});

test("transposed modal and enharmonic semantics survive MusicXML export and import", () => {
  const source = scoreFromJianpu("1=C\nMeter: 4/4\n| 1 #1 2 b3 | ");
  const target = semitonesForTargetKey({ score: source, targetTonic: "Eb", targetMode: "mixolydian" });
  const transposed = transposeScoreJson({ score: source, semitones: target.semitones, targetKey: target.target, spellingPolicy: "prefer-flats", generatedAt: importedAt });
  const reparsed = parseMusicXmlToScoreJson({
    musicXml: scoreJsonToMusicXml(transposed),
    title: "Reimported transpose",
    sourceFileId: "transpose-roundtrip",
    sourceOriginalName: "transpose.musicxml",
    importedAt,
  });
  assert.deepEqual(reparsed.measures[0].attributes?.key, transposed.measures[0].attributes?.key);
  assert.deepEqual(
    reparsed.measures[0].events.filter((event) => event.type === "note").map((event) => event.type === "note" ? event.pitch : null),
    transposed.measures[0].events.filter((event) => event.type === "note").map((event) => event.type === "note" ? event.pitch : null),
  );
});

test("clef comfort scoring reacts to the transposed written register", () => {
  const low = scoreFromJianpu("1=C\nMeter: 4/4\n| 1 3 5 1 | ");
  for (const event of low.measures[0].events) {
    if (event.type === "note") event.pitch.octave = 2;
  }
  assert.equal(recommendScoreClefs(low)[0].clef.sign, "F");

  const high = transposeScoreJson({ score: low, semitones: 36, spellingPolicy: "auto", generatedAt: importedAt });
  assert.equal(recommendScoreClefs(high)[0].clef.sign, "G");
});
