import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { parseMusicXmlToScoreJson } from "../../../../services/api/src/lib/musicxml-score-parser";
import { transposeScoreJson } from "../../../../services/api/src/lib/score-transpose";
import { scoreJsonToJianpu } from "../../../../services/api/src/lib/jianpu-converter";
import { scoreJsonToPlayback } from "../../../../services/api/src/lib/score-playback";
import { publicScoreLibrary } from "./public-score-library";
import { guestSampleCopy } from "./guest-sample-copy";
import { GUEST_SAMPLE_KEYS, guestSample, guestSampleDuration, guestSampleFrequency, guestSampleTaskSource } from "./guest-sample";
import { transposeGuestSampleScore } from "../../scripts/guest-sample-transpose";
import { scoreJsonToMusicXml } from "../../../../services/api/src/lib/score-musicxml-export";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const generatedAt = "2026-10-13T00:00:00.000Z";

test("guest demo reuses the entire existing CC0 source without importing a personal scan", () => {
  const source = publicScoreLibrary.find((entry) => entry.slug === guestSample.source.slug)!;
  assert.equal(source.workRights, "CC0");
  assert.equal(source.localMusicXmlUrl, guestSample.source.musicXmlUrl);
  const parsed = parseMusicXmlToScoreJson({
    musicXml: fs.readFileSync(path.join(appRoot, "public", guestSample.source.musicXmlUrl), "utf8"),
    title: "Product Workflow Etude", sourceFileId: "public-cc0-product-workflow-etude",
    sourceOriginalName: "product-workflow-etude.musicxml", importedAt: generatedAt,
  });
  delete parsed.interchange;
  assert.deepEqual(guestSample.score, JSON.parse(JSON.stringify(parsed)));
  assert.equal(guestSample.score.measures.length, 5);
});

test("all prepared keys preserve complete rhythms and match authoritative transpose, Jianpu and playback outputs", () => {
  for (const key of GUEST_SAMPLE_KEYS) {
    const variant = guestSample.variants[key];
    const score = variant.semitones === 0 ? guestSample.score : transposeScoreJson({
      score: guestSample.score, semitones: variant.semitones,
      targetKey: { tonic: key, mode: "major", fifths: variant.fifths }, generatedAt,
    });
    const jianpu = scoreJsonToJianpu(score, generatedAt);
    const playback = scoreJsonToPlayback(score, generatedAt);
    assert.equal(variant.jianpu.length, 5);
    assert.deepEqual(variant.jianpu.map((measure) => measure.events), jianpu.parts[0].measures.map((measure) => measure.events.map((event) => ({
      id: event.id, type: event.type, durationType: event.durationType, dots: event.dots,
      ...(event.type === "note" ? { degree: event.degree, accidental: event.accidental, octaveShift: event.octaveShift } : {}),
    }))));
    assert.deepEqual(variant.playback.events, playback.events.map(({ sourceEventId, measureId, midi, startBeat, durationBeats, soundDurationBeats, velocity }) => ({
      sourceEventId, measureId, midi, startBeat, durationBeats, soundDurationBeats: soundDurationBeats ?? durationBeats, velocity,
    })));
    assert.equal(variant.playback.totalBeats, playback.totalBeats);
    assert.ok(variant.playback.measures.some((measure) => measure.measureId === score.measures[4].id), `${key} includes the final measure`);
    assert.ok(guestSampleDuration(variant) > 10, "playback covers the complete short score, including repeats");
    const svg = fs.readFileSync(path.join(appRoot, "public", variant.staffImage), "utf8");
    assert.ok(svg.startsWith("<svg"));
    assert.deepEqual([...svg.matchAll(/class="vf-measure" id="([^"]+)"/gu)].map((match) => match[1]), ["1", "2", "3", "4", "5"]);
  }
  assert.equal(guestSample.variants.D.playback.events[0].midi - guestSample.variants.C.playback.events[0].midi, 2);
  assert.equal(guestSample.variants.Bb.playback.events[0].midi - guestSample.variants.C.playback.events[0].midi, -2);
  assert.equal(guestSampleFrequency(69), 440);
});

test("sample controls and accessibility copy are native in all nine locales", () => {
  assert.deepEqual(Object.keys(guestSampleCopy).sort(), [...SUPPORTED_LOCALES].sort());
  for (const locale of SUPPORTED_LOCALES) {
    const copy = guestSampleCopy[locale];
    assert.deepEqual(Object.keys(copy).sort(), Object.keys(guestSampleCopy.en).sort());
    assert.deepEqual(Object.keys(copy.keyNames), [...GUEST_SAMPLE_KEYS]);
    for (const value of Object.values(copy)) {
      if (typeof value === "string") assert.ok(value.trim(), `${locale} has complete copy`);
      else for (const name of Object.values(value)) assert.ok(name.trim());
    }
    if (locale !== "en") {
      for (const name of ["badge", "title", "body", "allowance", "source", "key", "staff", "play", "stop", "useMyScore", "error", "progress"] as const) {
        assert.notEqual(copy[name], guestSampleCopy.en[name], `${locale}: ${name}`);
      }
    }
  }
});

test("prepared sample harmonies transpose with the melody and preserve the CC0 original", () => {
  const original = JSON.stringify(guestSample.score);
  const expected = { C: ["F", "G7"], D: ["G", "A7"], F: ["Bb", "C7"], G: ["C", "D7"], Bb: ["Eb", "F7"] };
  for (const key of GUEST_SAMPLE_KEYS) {
    const variant = guestSample.variants[key];
    const score = transposeGuestSampleScore({
      score: guestSample.score, semitones: variant.semitones,
      targetKey: { tonic: key, mode: "major", fifths: variant.fifths }, generatedAt,
    });
    const harmonies = score.measures.flatMap((measure) => measure.harmonies ?? []);
    assert.deepEqual(harmonies.map((harmony) => harmony.text), expected[key]);
    assert.deepEqual(variant.harmonyLabels, expected[key], `${key}: regenerated harmony labels`);
    assert.deepEqual(harmonies.map((harmony) => harmony.kind), ["major", "dominant"]);
    const xml = scoreJsonToMusicXml(score);
    for (const label of expected[key]) assert.ok(xml.includes(`text="${label}"`), `${key}: exported ${label}`);
    assert.equal(JSON.stringify(guestSample.score), original, `${key}: preparing a variant never mutates the original score`);
  }
});

test("use-my-score chooses the matching existing app task after demo interaction", () => {
  assert.equal(guestSampleTaskSource("C", "staff"), "home");
  assert.equal(guestSampleTaskSource("C", "jianpu"), "staff-to-jianpu");
  assert.equal(guestSampleTaskSource("D", "staff"), "transpose-score");
  assert.equal(guestSampleTaskSource("Bb", "jianpu"), "staff-to-jianpu");
});
