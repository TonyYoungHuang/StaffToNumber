import assert from "node:assert/strict";
import test from "node:test";
import type { ScoreJson } from "@score/shared";
import { applyScoreNotePatch } from "./score-edit.js";

const score: ScoreJson = {
  schemaVersion: 2,
  title: "Missing source pitch",
  source: { kind: "musicxml", originalName: "fixture.musicxml" },
  metadata: { importedAt: "2026-10-05T00:00:00Z", parser: "musicxml-basic-v1", measureCount: 1, noteCount: 0, restCount: 1, warnings: [] },
  parts: [{id:"P1",name:"Guitar",measureCount:1}],
  measures: [{id:"m1",partId:"P1",number:"1",sequence:1,events:[{id:"missing",type:"rest",duration:1,durationType:"16th",dots:0,measureRest:false,printObject:false,recognition:{confidence:null,source:"structural",issues:["Missing source pitch; silent placeholder, not an original rest."]}}]}],
};

test("changing only an unresolved placeholder's rhythm keeps it hidden and marked", () => {
  const result = applyScoreNotePatch({score,patch:{eventId:"missing",duration:2,durationType:"eighth"}});
  const event = result.measures[0]!.events[0]!;
  assert.equal(event.type,"rest");
  assert.equal(event.printObject,false);
  assert.ok(event.recognition?.issues.length);
});

test("supplying a real note makes the unresolved placeholder visible and clears its old missing-pitch marker", () => {
  const result = applyScoreNotePatch({score,patch:{eventId:"missing",eventType:"note",step:"F",alter:1,octave:3}});
  const event = result.measures[0]!.events[0]!;
  assert.equal(event.type,"note");
  assert.notEqual(event.printObject,false);
  assert.equal(event.recognition,undefined);
  assert.ok(event.type === "note");
  assert.deepEqual(event.pitch,{step:"F",alter:1,octave:3});
});
