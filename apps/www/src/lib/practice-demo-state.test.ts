import assert from "node:assert/strict";
import test from "node:test";
import {
  PRACTICE_DEMO_DEFAULTS,
  parsePracticeDemoState,
  serializePracticeDemoState,
} from "./practice-demo-state.js";

test("practice demo state parses valid share parameters", () => {
  assert.deepEqual(parsePracticeDemoState("?tempo=120&loop=1-4&metro=0"), {
    tempo: 120,
    loopEnabled: true,
    metronomeEnabled: false,
    loopStart: 0,
    loopEnd: 4,
  });
  assert.deepEqual(parsePracticeDemoState("?tempo=72&loop=off&metro=1"), {
    tempo: 72,
    loopEnabled: false,
    metronomeEnabled: true,
    loopStart: 1,
    loopEnd: 3,
  });
});

test("practice demo state rejects invalid values and round-trips canonical values", () => {
  assert.deepEqual(parsePracticeDemoState("?tempo=999&loop=4-1&metro=maybe"), PRACTICE_DEMO_DEFAULTS);

  const serialized = serializePracticeDemoState({
    tempo: 132,
    loopEnabled: true,
    metronomeEnabled: false,
    loopStart: 2,
    loopEnd: 4,
  }, "?source=practice-card");
  const params = new URLSearchParams(serialized);
  assert.equal(params.get("source"), "practice-card");
  assert.deepEqual(parsePracticeDemoState(serialized), {
    tempo: 132,
    loopEnabled: true,
    metronomeEnabled: false,
    loopStart: 2,
    loopEnd: 4,
  });
});
