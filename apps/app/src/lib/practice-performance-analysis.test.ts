import assert from "node:assert/strict";
import test from "node:test";
import type { PlaybackDocument, PlaybackNoteEvent } from "@score/shared";
import { analyzePracticePerformance, detectActiveAudioRegion, detectFundamentalFrequency } from "./practice-performance-analysis.js";

const sampleRate = 8_000;

function sineRecording(frequency: number, startSeconds: number, endSeconds: number, durationSeconds = 1.2) {
  const samples = new Float32Array(Math.round(durationSeconds * sampleRate));
  for (let index = Math.round(startSeconds * sampleRate); index < Math.round(endSeconds * sampleRate); index += 1) {
    samples[index] = Math.sin((2 * Math.PI * frequency * index) / sampleRate) * 0.6;
  }
  return samples;
}

function note(overrides: Partial<PlaybackNoteEvent> = {}): PlaybackNoteEvent {
  return {
    id: "playback-event", sourceEventId: "score-event", partId: "P1", measureId: "m1", measureNumber: "1",
    voice: "1", pitch: { step: "A", alter: 0, octave: 4 }, midi: 69, noteName: "A4", startBeat: 0,
    durationBeats: 1, velocity: 90, ...overrides,
  };
}

function playback(events: PlaybackNoteEvent[]): PlaybackDocument {
  return {
    schemaVersion: 1, title: "Practice", tempoBpm: 120, downbeatEvery: 4, totalBeats: 1,
    parts: [{ id: "P1", name: "Voice" }], measureMarkers: [{ id: "marker", partId: "P1", measureId: "m1", measureNumber: "1", occurrence: 1, startBeat: 0 }],
    events, metadata: { sourceRevisionParser: "musicxml-basic-v1", generatedAt: "2026-07-15T00:00:00Z", eventCount: events.length, warnings: [] },
  };
}

test("detects active audio and the fundamental frequency of a monophonic tone", () => {
  const samples = sineRecording(440, 0.2, 0.7);
  const region = detectActiveAudioRegion(samples, sampleRate);
  assert.ok(region);
  assert.ok(Math.abs(region.startSeconds - 0.2) < 0.03);
  const pitch = detectFundamentalFrequency(samples.slice(Math.round(0.25 * sampleRate), Math.round(0.6 * sampleRate)), sampleRate);
  assert.ok(pitch);
  assert.ok(Math.abs(pitch.frequencyHz - 440) < 5);
  assert.ok(pitch.confidence > 0.8);
});

test("produces revision-bound per-note and per-measure explainable feedback without a single opaque score", () => {
  const result = analyzePracticePerformance({ samples: sineRecording(440, 0.2, 0.7), sampleRate, playback: playback([note()]), scoreRevisionId: "revision-1" });
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].status, "matched");
  assert.ok(Math.abs(result.events[0].pitchCents ?? 999) < 20);
  assert.equal(result.completeness.ratio, 1);
  assert.equal(result.measures[0].measureNumber, "1");
  assert.equal(result.scoreRevisionId, "revision-1");
  assert.equal("score" in result, false);
});

test("silence is reported as missing and simultaneous notes are not given monophonic pitch verdicts", () => {
  const silent = analyzePracticePerformance({ samples: new Float32Array(sampleRate), sampleRate, playback: playback([note()]) });
  assert.equal(silent.events[0].status, "missing");
  assert.equal(silent.completeness.ratio, 0);

  const chordEvents = [note(), note({ id: "event-2", sourceEventId: "score-event-2", midi: 72, noteName: "C5" })];
  const chord = analyzePracticePerformance({ samples: sineRecording(440, 0.2, 0.7), sampleRate, playback: playback(chordEvents) });
  assert.ok(chord.events.every((event) => event.status === "polyphonic_unscored"));
  assert.ok(chord.warnings.some((warning) => warning.includes("polyphonic")));
});
