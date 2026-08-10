import assert from "node:assert/strict";
import test from "node:test";
import type { ScoreEvent } from "@score/shared";
import { buildVexFlowModifierPlacements } from "./vexflow-modifier-layout";

function note(id: string, options: Partial<Extract<ScoreEvent, { type: "note" }>> = {}): Extract<ScoreEvent, { type: "note" }> {
  return {
    id,
    type: "note",
    pitch: { step: "C", alter: 0, octave: 4 },
    duration: 1,
    durationType: "quarter",
    dots: 0,
    voice: "1",
    chord: false,
    ties: [],
    lyrics: [],
    ...options,
  };
}

test("separates lyrics, fingerings, articulation, and fermata into stable lanes", () => {
  const placements = buildVexFlowModifierPlacements([
    note("n1", {
      lyrics: [{ number: "1", text: "Hal" }, { number: "2", text: "Wel" }],
      fingerings: ["1", "3"],
      articulations: [{ type: "accent" }],
      fermatas: [{ type: "upright" }],
    }),
  ]);

  assert.deepEqual(placements.map(({ kind, position, textLine }) => [kind, position, textLine]), [
    ["articulation", "below", 0],
    ["fingering", "above", 1],
    ["fingering", "above", 2],
    ["fermata", "above", 4],
    ["lyric", "below", 2],
    ["lyric", "below", 3],
  ]);
});

test("places lower-voice articulations above and keeps breath marks above", () => {
  const placements = buildVexFlowModifierPlacements([
    note("lower", { voice: "2", articulations: [{ type: "staccato" }] }),
    note("breath", { voice: "1", articulations: [{ type: "breath-mark" }, { type: "caesura" }] }),
    note("inverted", { fermatas: [{ type: "inverted" }] }),
  ]);

  assert.deepEqual(placements.map(({ eventId, kind, position, textLine }) => [eventId, kind, position, textLine]), [
    ["lower", "articulation", "above", 0],
    ["breath", "articulation", "above", 0],
    ["breath", "articulation", "above", 0],
    ["inverted", "fermata", "below", 1],
  ]);
});
