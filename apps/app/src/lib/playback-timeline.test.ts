import assert from "node:assert/strict";
import test from "node:test";
import { buildPlaybackTempoSegments, playbackSecondsAtBeat, playbackTempoAtBeat } from "./playback-timeline.js";

test("schedules a mid-measure tempo change at its exact fractional beat", () => {
  const segments = buildPlaybackTempoSegments({
    tempoBpm: 120,
    tempoChanges: [{ id: "tempo-1", sourceTempoId: "tempo-1", measureId: "m1", measureNumber: "1", occurrence: 1, startBeat: 2.5, bpm: 60 }],
  });
  assert.deepEqual(segments, [{ startBeat: 0, bpm: 120 }, { startBeat: 2.5, bpm: 60 }]);
  assert.equal(playbackSecondsAtBeat(segments, 2.5), 1.25);
  assert.equal(playbackSecondsAtBeat(segments, 4), 2.75);
  assert.equal(playbackTempoAtBeat(segments, 2.49), 120);
  assert.equal(playbackTempoAtBeat(segments, 2.5), 60);
});

test("a 30-minute variable-tempo rehearsal timeline has no accumulated arithmetic drift", () => {
  const segments = buildPlaybackTempoSegments({
    tempoBpm: 120,
    tempoChanges: [{ id: "tempo-slow", sourceTempoId: "tempo-slow", measureId: "m101", measureNumber: "101", occurrence: 1, startBeat: 1200, bpm: 60 }],
  });
  assert.equal(playbackSecondsAtBeat(segments, 2400), 1800);
  assert.equal(playbackSecondsAtBeat(segments, 2400) - playbackSecondsAtBeat(segments, 2399), 1);
});

test("practice tempo scales the complete source tempo map rather than flattening it", () => {
  const segments = buildPlaybackTempoSegments({
    tempoBpm: 100,
    tempoChanges: [{ id: "tempo-2", sourceTempoId: "tempo-2", measureId: "m2", measureNumber: "2", occurrence: 1, startBeat: 4, bpm: 80 }],
  }, 50);
  assert.deepEqual(segments, [{ startBeat: 0, bpm: 50 }, { startBeat: 4, bpm: 40 }]);
});
