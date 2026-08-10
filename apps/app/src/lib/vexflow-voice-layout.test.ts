import assert from "node:assert/strict";
import test from "node:test";
import type { ScoreEvent } from "@score/shared";
import { buildVexFlowVoiceCollisionShifts, buildVexFlowVoiceLayout } from "./vexflow-voice-layout";

function note(id: string, voice: string, step: Extract<ScoreEvent, { type: "note" }>["pitch"]["step"], options: Partial<Extract<ScoreEvent, { type: "note" }>> = {}): Extract<ScoreEvent, { type: "note" }> {
  return {
    id,
    type: "note",
    pitch: { step, alter: 0, octave: 4 },
    duration: 1,
    durationType: "quarter",
    dots: 0,
    voice,
    staff: 1,
    chord: false,
    ties: [],
    lyrics: [],
    ...options,
  };
}

test("assigns opposite stem and rest lanes to two SATB voices on one staff", () => {
  assert.deepEqual(buildVexFlowVoiceLayout(["2", "1"]), [
    { voiceId: "1", stemDirection: 1, restLine: 4, horizontalShift: 0 },
    { voiceId: "2", stemDirection: -1, restLine: 2, horizontalShift: 0 },
  ]);
});

test("sorts named voices and separates third and fourth voice engraving lanes", () => {
  assert.deepEqual(buildVexFlowVoiceLayout(["tenor", "bass", "alto", "soprano"]), [
    { voiceId: "alto", stemDirection: 1, restLine: 4, horizontalShift: 0 },
    { voiceId: "bass", stemDirection: -1, restLine: 2, horizontalShift: 0 },
    { voiceId: "soprano", stemDirection: 1, restLine: 5, horizontalShift: 6 },
    { voiceId: "tenor", stemDirection: -1, restLine: 1, horizontalShift: -6 },
  ]);
});

test("offsets only simultaneous unison and second collisions across voices", () => {
  const shifts = buildVexFlowVoiceCollisionShifts([
    note("v1-c", "1", "C"),
    note("v1-g", "1", "G"),
    note("v2-d", "2", "D", { duration: 2, durationType: "half" }),
    note("v3-c", "3", "C", { duration: 2, durationType: "half" }),
    note("v4-f", "4", "F", { duration: 2, durationType: "half" }),
  ], 1);

  assert.equal(shifts.get("v1-c"), 4);
  assert.equal(shifts.get("v2-d"), -4);
  assert.equal(shifts.get("v3-c"), 6);
  assert.equal(shifts.has("v1-g"), false);
  assert.equal(shifts.has("v4-f"), false);
});

test("applies one collision shift to every notehead in a chord", () => {
  const shifts = buildVexFlowVoiceCollisionShifts([
    note("root", "1", "C"),
    note("third", "1", "E", { chord: true }),
    note("other-voice", "2", "D"),
  ], 1);

  assert.equal(shifts.get("root"), 4);
  assert.equal(shifts.get("third"), 4);
  assert.equal(shifts.get("other-voice"), -4);
});
