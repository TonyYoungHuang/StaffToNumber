import assert from "node:assert/strict";
import test from "node:test";
import { cleanAudioTranscriptionNotes } from "@score/shared";

test("audio transcription cleanup quantizes jitter and removes transient and duplicate notes", () => {
  const result = cleanAudioTranscriptionNotes({
    ppq: 480,
    notes: [
      { midi: 60, startTick: 8, durationTicks: 470, channel: 0, velocity: 90 },
      { midi: 60, startTick: 10, durationTicks: 475, channel: 0, velocity: 70 },
      { midi: 62, startTick: 487, durationTicks: 18, channel: 0, velocity: 100 },
      { midi: 64, startTick: 491, durationTicks: 470, channel: 0, velocity: 4 },
    ],
  });
  assert.equal(result.gridTicks, 120);
  assert.deepEqual(result.notes.map((note) => [note.midi, note.startTick, note.durationTicks]), [[60, 0, 480]]);
  assert.equal(result.report.removedDuplicates, 1);
  assert.equal(result.report.removedShortNotes, 1);
  assert.equal(result.report.removedLowVelocityNotes, 1);
});

test("polyphonic cleanup keeps chords together and assigns overlapping entries to another voice", () => {
  const result = cleanAudioTranscriptionNotes({
    ppq: 480,
    notes: [
      { midi: 60, startTick: 0, durationTicks: 960, channel: 0, velocity: 90 },
      { midi: 64, startTick: 0, durationTicks: 900, channel: 0, velocity: 88 },
      { midi: 67, startTick: 480, durationTicks: 480, channel: 0, velocity: 84 },
    ],
  });
  assert.deepEqual(result.notes.map((note) => [note.midi, note.voice, note.chord]), [[60, "1", false], [64, "1", true], [67, "2", false]]);
  assert.equal(result.report.voiceCount, 2);
  assert.equal(result.report.peakPolyphony, 2);
  assert.equal(result.report.reviewRequired, false);
});

test("scenario quality gate marks voice overflow and monophonic overlap for review", () => {
  const dense = cleanAudioTranscriptionNotes({
    ppq: 480,
    maxVoices: 2,
    notes: [0, 120, 240].map((startTick, index) => ({ midi: 60 + index, startTick, durationTicks: 960, channel: 0, velocity: 90 })),
  });
  assert.equal(dense.report.reviewRequired, true);
  assert.match(dense.report.warnings.join(" "), /voice cleanup limit/);
  const monophonic = cleanAudioTranscriptionNotes({
    ppq: 480,
    profile: "monophonic",
    notes: [
      { midi: 60, startTick: 0, durationTicks: 960, channel: 0, velocity: 90 },
      { midi: 62, startTick: 480, durationTicks: 480, channel: 0, velocity: 90 },
    ],
  });
  assert.equal(monophonic.report.reviewRequired, true);
  assert.match(monophonic.report.warnings.join(" "), /monophonic/);
});
