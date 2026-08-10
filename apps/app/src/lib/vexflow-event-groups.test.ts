import assert from "node:assert/strict";
import test from "node:test";
import type { ScoreEvent } from "@score/shared";
import { buildVexFlowStaffTimeline, findVexFlowChordDurationConflicts, groupVoiceEventsForVexFlow } from "./vexflow-event-groups";

function note(id: string, options: Partial<Extract<ScoreEvent, { type: "note" }>> = {}): Extract<ScoreEvent, { type: "note" }> {
  return {
    id,
    type: "note",
    pitch: { step: "C", alter: 0, octave: 4 },
    duration: 1,
    durationType: "quarter",
    dots: 0,
    chord: false,
    ties: [],
    lyrics: [],
    ...options,
  };
}

test("groups chord followers into one VexFlow tickable", () => {
  const groups = groupVoiceEventsForVexFlow([
    note("c4"),
    note("e4", { chord: true, pitch: { step: "E", alter: 0, octave: 4 } }),
    note("g4", { chord: true, pitch: { step: "G", alter: 0, octave: 4 } }),
    note("d4", { pitch: { step: "D", alter: 0, octave: 4 } }),
  ]);

  assert.deepEqual(groups.map((group) => group.events.map((event) => event.id)), [["c4", "e4", "g4"], ["d4"]]);
  assert.equal(groups[0]?.durationConflict, false);
});

test("does not attach orphan chord notes or mix grace and normal notes", () => {
  const groups = groupVoiceEventsForVexFlow([
    note("orphan", { chord: true }),
    note("grace", { chord: true, grace: { id: "grace-1" }, duration: 0 }),
    note("normal"),
  ]);

  assert.deepEqual(groups.map((group) => group.events.map((event) => event.id)), [["orphan"], ["grace"], ["normal"]]);
});

test("keeps chord semantics while flagging inconsistent rhythmic values", () => {
  const groups = groupVoiceEventsForVexFlow([note("anchor"), note("third", { chord: true, duration: 2, durationType: "half" })]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.durationConflict, true);
});

test("reports legacy chord duration conflicts by measure without mixing voices", () => {
  const conflicts = findVexFlowChordDurationConflicts([
    {
      id: "measure-1",
      partId: "P1",
      number: "1",
      sequence: 1,
      events: [
        note("voice-1-root", { voice: "1" }),
        note("voice-2-note", { voice: "2", duration: 2, durationType: "half" }),
        note("voice-1-third", { voice: "1", chord: true, duration: 2, durationType: "half" }),
      ],
    },
  ]);

  assert.deepEqual(conflicts, [{ measureId: "measure-1", eventIds: ["voice-1-root", "voice-1-third"] }]);
});

test("keeps cross-staff notes on a shared voice timeline with placeholders", () => {
  const events = [
    note("upper", { staff: 1, durationType: "eighth" }),
    note("lower", { staff: 2, durationType: "eighth", pitch: { step: "C", alter: 0, octave: 3 } }),
  ];

  assert.deepEqual(buildVexFlowStaffTimeline(events, 1).map((unit) => [unit.kind, unit.group.events[0]?.id]), [
    ["event", "upper"],
    ["placeholder", "lower"],
  ]);
  assert.deepEqual(buildVexFlowStaffTimeline(events, 2).map((unit) => [unit.kind, unit.group.events[0]?.id]), [
    ["placeholder", "upper"],
    ["event", "lower"],
  ]);
});

test("does not allocate rhythmic placeholders for grace notes on another staff", () => {
  const events = [note("upper-grace", { staff: 1, duration: 0, grace: { id: "g1" } }), note("lower", { staff: 2 })];
  assert.deepEqual(buildVexFlowStaffTimeline(events, 2).map((unit) => [unit.kind, unit.group.events[0]?.id]), [["event", "lower"]]);
});
