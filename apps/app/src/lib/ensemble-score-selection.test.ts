import assert from "node:assert/strict";
import { test } from "node:test";
import type { ScoreJson, ScoreNoteEvent } from "@score/shared";
import { chordMembers, collectEnsembleEvents, neighboringEnsembleEvent } from "./ensemble-score-selection";

const note = (id: string, extra: Partial<ScoreNoteEvent> = {}): ScoreNoteEvent => ({ id, type: "note", pitch: { step: "C", octave: 4, alter: 0 }, duration: 1, dots: 0, chord: false, ties: [], lyrics: [], ...extra });
const score = {
  parts: [{ id: "p1", name: "Piano", measureCount: 2 }, { id: "p2", name: "Drums", measureCount: 1 }],
  measures: [
    { id: "m1", partId: "p1", number: "1", sequence: 0, events: [note("a"), note("b", { chord: true }), note("c", { voice: "2" }), note("d", { staff: 2 }), note("hidden", { printObject: false })] },
    { id: "m2", partId: "p1", number: "2", sequence: 1, events: [note("e")] },
    { id: "dr1", partId: "p2", number: "1", sequence: 0, events: [note("dr", { unpitched: { displayStep: "C", displayOctave: 5, midiPitch: 38 } })] },
  ],
  recognitionLayer: { symbols: [{ eventId: "e", page: 2 }], coverage: { staffs: [{ page: 1, eventIds: ["a", "b"] }] } },
} as unknown as ScoreJson;

test("Smoosic selectors retain every chord member, voice and physical staff", () => {
  const events = collectEnsembleEvents(score);
  assert.equal(events.length, 6);
  const a = events.find(row => row.event.id === "a")!;
  assert.deepEqual(chordMembers(events, a).map(row => row.event.id), ["a", "b"]);
  assert.notEqual(events.find(row => row.event.id === "c")!.selector.voice, a.selector.voice);
  assert.notEqual(events.find(row => row.event.id === "d")!.selector.staff, a.selector.staff);
  assert.deepEqual(events.find(row => row.event.id === "e")!.sourcePages, [2]);
  assert.deepEqual(a.sourcePages, [1]);
  assert.equal(neighboringEnsembleEvent(events, "a", 1)?.event.id, "b");
});

test("navigation keeps persistent event identity across score revisions", () => {
  const changed = structuredClone(score);
  const event = changed.measures[0].events[0] as ScoreNoteEvent;
  event.pitch.step = "F";
  event.lyrics = [{ text: "あ" }];
  const before = collectEnsembleEvents(score).find(row => row.event.id === "a")!;
  const after = collectEnsembleEvents(changed).find(row => row.event.id === "a")!;
  assert.deepEqual(after.selector, before.selector);
  assert.equal(after.event.id, "a");
});
