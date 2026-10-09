import assert from "node:assert/strict";
import test from "node:test";
import type { ScoreEvent } from "@score/shared";
import { buildVexFlowBeamGroups } from "./vexflow-beam-groups";

function note(
  id: string,
  staff: number,
  voice: string,
  beamType?: "begin" | "continue" | "end",
  options: Partial<Extract<ScoreEvent, { type: "note" }>> = {},
): Extract<ScoreEvent, { type: "note" }> {
  return {
    id,
    type: "note",
    pitch: { step: "C", alter: 0, octave: 4 },
    duration: 1,
    durationType: "eighth",
    dots: 0,
    voice,
    staff,
    chord: false,
    ties: [],
    lyrics: [],
    beams: beamType ? [{ id: `${id}-beam`, number: 1, type: beamType }] : [],
    ...options,
  };
}

test("groups a complete beam across staves in the same voice", () => {
  const groups = buildVexFlowBeamGroups([
    note("upper", 1, "1", "begin"),
    note("middle", 2, "1", "continue"),
    note("lower", 2, "1", "end"),
  ]);

  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0]?.eventIds, ["upper", "middle", "lower"]);
  assert.deepEqual(groups[0]?.staffNumbers, [1, 2]);
  assert.equal(groups[0]?.crossStaff, true);
});

test("keeps equal beam numbers isolated by voice and ignores incomplete groups", () => {
  const groups = buildVexFlowBeamGroups([
    note("v1-start", 1, "1", "begin"),
    note("v2-start", 1, "2", "begin"),
    note("v1-end", 1, "1", "end"),
  ]);

  assert.deepEqual(groups.map((group) => group.eventIds), [["v1-start", "v1-end"]]);
  assert.equal(groups[0]?.crossStaff, false);
});

test("maps a chord beam marker to one tickable without duplicating its notehead", () => {
  const groups = buildVexFlowBeamGroups([
    note("root", 1, "1", "begin"),
    note("third", 1, "1", undefined, { chord: true, pitch: { step: "E", alter: 0, octave: 4 } }),
    note("next", 1, "1", "end"),
  ]);

  assert.deepEqual(groups[0]?.eventIds, ["root", "third", "next"]);
});

test("leaves a malformed OMR quarter-note beam unconnected and preserves the next valid group", () => {
  const groups = buildVexFlowBeamGroups([
    note("omr-quarter", 1, "1", "begin", { duration: 4, durationType: "quarter" }),
    note("omr-eighth", 1, "1", "end"),
    note("valid-start", 1, "1", "begin", { durationType: "16th" }),
    note("valid-end", 1, "1", "end", { durationType: "16th" }),
  ]);

  assert.deepEqual(groups.map((group) => group.eventIds), [["valid-start", "valid-end"]]);
});

test("does not beam an unknown duration that the renderer treats as a quarter note", () => {
  const groups = buildVexFlowBeamGroups([
    note("unknown", 1, "1", "begin", { durationType: undefined }),
    note("eighth", 1, "1", "end"),
  ]);

  assert.deepEqual(groups, []);
});

test("uses the chord root duration for beam eligibility", () => {
  const groups = buildVexFlowBeamGroups([
    note("quarter-root", 1, "1", undefined, { durationType: "quarter" }),
    note("chord-marker", 1, "1", "begin", { chord: true }),
    note("eighth", 1, "1", "end"),
  ]);

  assert.deepEqual(groups, []);
});
