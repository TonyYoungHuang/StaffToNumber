import assert from "node:assert/strict";
import test from "node:test";
import { migrateScoreJson } from "@score/shared";
import { parseMusicXmlToScoreJson } from "./musicxml-score-parser.js";
import {
  applyScoreEventBatchPatch,
  applyScoreEventReorderPatch,
  applyScoreMeasureAttributesPatch,
  applyScoreNotePatch,
  validateScoreEventBatchPatch,
  validateScoreEventReorderPatch,
  validateScoreMeasureAttributesPatch,
  validateScoreNotePatch,
} from "./score-edit.js";
import { scoreJsonToMusicXml } from "./score-musicxml-export.js";

const professionalMusicXml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>Professional round trip</work-title></work>
  <part-list>
    <part-group number="1" type="start">
      <group-name>Keyboard</group-name>
      <group-abbreviation>Kbd.</group-abbreviation>
      <group-symbol>brace</group-symbol>
      <group-barline>yes</group-barline>
    </part-group>
    <score-part id="P1"><part-name>Piano upper</part-name></score-part>
    <score-part id="P2"><part-name>Piano lower</part-name></score-part>
    <part-group number="1" type="stop"/>
  </part-list>
  <part id="P1">
    <measure number="1" width="320">
      <print new-system="yes">
        <staff-layout><staff-distance>80</staff-distance></staff-layout>
      </print>
      <attributes>
        <divisions>6</divisions>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
      <direction placement="above"><direction-type><rehearsal>A</rehearsal></direction-type></direction>
      <note id="n1">
        <grace slash="yes" steal-time-following="12.5"/>
        <pitch><step>D</step><octave>5</octave></pitch>
        <voice>1</voice><type>eighth</type>
        <beam number="1">begin</beam>
        <staff>2</staff>
        <notations>
          <tuplet type="start" number="1" bracket="yes" show-number="actual"/>
          <ornaments><trill-mark placement="above"/><tremolo>3</tremolo></ornaments>
        </notations>
      </note>
      <note id="n2">
        <pitch><step>E</step><octave>5</octave></pitch>
        <duration>2</duration><voice>1</voice><type>eighth</type>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
        <beam number="1">end</beam><staff>2</staff>
        <notations><tuplet type="stop" number="1"/></notations>
      </note>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <attributes><divisions>6</divisions><clef><sign>F</sign><line>4</line></clef></attributes>
      <note id="r1"><rest measure="yes"/><duration>24</duration><voice>1</voice><type>whole</type></note>
    </measure>
  </part>
</score-partwise>`;

function parse(xml: string) {
  return parseMusicXmlToScoreJson({
    musicXml: xml,
    title: "fallback",
    sourceFileId: "fixture-file",
    sourceOriginalName: "professional.musicxml",
    importedAt: "2026-07-14T00:00:00.000Z",
  });
}

test("professional MusicXML symbols survive Score JSON round trip", () => {
  const imported = parse(professionalMusicXml);
  assert.equal(imported.schemaVersion, 2);
  assert.deepEqual(imported.staffGroups?.[0], {
    id: "staff-group-1",
    number: "1",
    partIds: ["P1", "P2"],
    name: "Keyboard",
    abbreviation: "Kbd.",
    symbol: "brace",
    barline: true,
  });

  const firstMeasure = imported.measures.find((measure) => measure.partId === "P1");
  assert.ok(firstMeasure);
  assert.deepEqual(firstMeasure.layout, {
    id: `${firstMeasure.id}-layout`,
    newSystem: true,
    measureWidth: 320,
    staffDistance: 80,
  });
  assert.equal(firstMeasure.attributes?.staves, 2);
  assert.deepEqual(firstMeasure.attributes?.clefs?.map((clef) => [clef.number, clef.sign, clef.line]), [
    [1, "G", 2],
    [2, "F", 4],
  ]);
  assert.equal(firstMeasure.rehearsalMarks?.[0]?.text, "A");

  const grace = firstMeasure.events.find((event) => event.id === "n1");
  assert.equal(grace?.type, "note");
  if (grace?.type !== "note") throw new Error("Expected n1 to be a note.");
  assert.equal(grace.staff, 2);
  assert.equal(grace.grace?.slash, true);
  assert.equal(grace.grace?.stealTimeFollowing, 12.5);
  assert.deepEqual(grace.beams?.map((beam) => [beam.number, beam.type]), [[1, "begin"]]);
  assert.deepEqual(grace.tuplets?.map((tuplet) => [tuplet.type, tuplet.number, tuplet.bracket, tuplet.showNumber]), [["start", "1", true, "actual"]]);
  assert.deepEqual(grace.ornaments?.map((ornament) => [ornament.type, ornament.placement, ornament.value]), [
    ["trill-mark", "above", undefined],
    ["tremolo", undefined, "3"],
  ]);

  const reparsed = parse(scoreJsonToMusicXml(imported));
  const reparsedMeasure = reparsed.measures.find((measure) => measure.partId === "P1");
  const reparsedGrace = reparsedMeasure?.events.find((event) => event.id === "n1");
  assert.deepEqual(reparsed.staffGroups, imported.staffGroups);
  assert.deepEqual(reparsedMeasure?.layout, firstMeasure.layout);
  assert.deepEqual(reparsedMeasure?.attributes, firstMeasure.attributes);
  assert.deepEqual(reparsedMeasure?.rehearsalMarks?.map(({ text, placement }) => ({ text, placement })), [{ text: "A", placement: "above" }]);
  assert.equal(reparsedGrace?.type, "note");
  if (reparsedGrace?.type !== "note") throw new Error("Expected reparsed n1 to be a note.");
  assert.deepEqual(reparsedGrace.beams?.map(({ number, type }) => ({ number, type })), grace.beams?.map(({ number, type }) => ({ number, type })));
  assert.deepEqual(reparsedGrace.tuplets?.map(({ type, number, bracket, showNumber }) => ({ type, number, bracket, showNumber })), grace.tuplets?.map(({ type, number, bracket, showNumber }) => ({ type, number, bracket, showNumber })));
  assert.deepEqual(reparsedGrace.grace && { slash: reparsedGrace.grace.slash, stealTimeFollowing: reparsedGrace.grace.stealTimeFollowing }, { slash: true, stealTimeFollowing: 12.5 });
  assert.deepEqual(reparsedGrace.ornaments?.map(({ type, placement, value }) => ({ type, placement, value })), grace.ornaments?.map(({ type, placement, value }) => ({ type, placement, value })));
});

test("schema v1 score snapshots migrate to schema v2 without losing score content", () => {
  const current = parse(professionalMusicXml);
  const legacy = { ...current, schemaVersion: 1 };
  const migrated = migrateScoreJson(legacy);
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.title, current.title);
  assert.deepEqual(migrated.parts, current.parts);
  assert.deepEqual(migrated.measures, current.measures);
});

test("professional note notation edits use stable ids and remain exportable", () => {
  const current = parse(professionalMusicXml);
  const patch = validateScoreNotePatch({
    eventId: "n2",
    timeModification: { actualNotes: 5, normalNotes: 4 },
    beams: [{ number: 1, type: "continue" }],
    tuplets: [{ type: "start", number: "2", bracket: false, showNumber: "both" }],
    grace: { slash: false, stealTimePrevious: 8 },
    ornaments: [{ type: "mordent", placement: "below" }, { type: "tremolo", value: "2" }],
    dots: 1,
    voice: "2",
    staff: 2,
    chord: true,
  });
  const edited = applyScoreNotePatch({ score: current, patch, generatedAt: "2026-07-14T01:00:00.000Z" });
  const editedEvent = edited.measures.flatMap((measure) => measure.events).find((event) => event.id === "n2");
  assert.equal(editedEvent?.type, "note");
  if (editedEvent?.type !== "note") throw new Error("Expected edited n2 to be a note.");
  assert.equal(editedEvent.beams?.[0]?.id, "n2-beam-1-1");
  assert.equal(editedEvent.tuplets?.[0]?.id, "n2-tuplet-1");
  assert.equal(editedEvent.grace?.id, "n2-grace");
  assert.deepEqual(editedEvent.ornaments?.map((ornament) => ornament.id), ["n2-ornament-1", "n2-ornament-2"]);
  assert.equal(editedEvent.dots, 1);
  assert.equal(editedEvent.voice, "2");
  assert.equal(editedEvent.staff, 2);
  assert.equal(editedEvent.chord, true);

  const reparsed = parse(scoreJsonToMusicXml(edited));
  const reparsedEvent = reparsed.measures.flatMap((measure) => measure.events).find((event) => event.id === "n2");
  assert.equal(reparsedEvent?.type, "note");
  if (reparsedEvent?.type !== "note") throw new Error("Expected reparsed n2 to be a note.");
  assert.deepEqual(reparsedEvent.timeModification, { actualNotes: 5, normalNotes: 4 });
  assert.deepEqual(reparsedEvent.beams?.map(({ number, type }) => ({ number, type })), [{ number: 1, type: "continue" }]);
  assert.deepEqual(reparsedEvent.tuplets?.map(({ type, number, bracket, showNumber }) => ({ type, number, bracket, showNumber })), [{ type: "start", number: "2", bracket: false, showNumber: "both" }]);
  assert.deepEqual(reparsedEvent.ornaments?.map(({ type, placement, value }) => ({ type, placement, value })), [
    { type: "mordent", placement: "below", value: undefined },
    { type: "tremolo", placement: undefined, value: "2" },
  ]);
  assert.equal(reparsedEvent.dots, 1);
  assert.equal(reparsedEvent.voice, "2");
  assert.equal(reparsedEvent.staff, 2);
  assert.equal(reparsedEvent.chord, true);
});

test("a glyph drag moves an event across measures and changes pitch in one command", () => {
  const current = parse(professionalMusicXml);
  const sourceMeasure = current.measures.find((measure) => measure.partId === "P1");
  assert.ok(sourceMeasure);
  const movableEvent = sourceMeasure.events.find((event) => event.id === "n2");
  assert.ok(movableEvent);
  const tupletStart = sourceMeasure.events.find((event) => event.id === "n1");
  assert.ok(tupletStart);
  tupletStart.tuplets = undefined;
  movableEvent.timeModification = undefined;
  movableEvent.tuplets = undefined;
  movableEvent.beams = undefined;
  current.measures.push({
    id: "P1-m2-2",
    partId: "P1",
    number: "2",
    sequence: 2,
    events: [],
  });
  const patch = validateScoreEventReorderPatch({
    eventId: "n2",
    targetMeasureId: "P1-m2-2",
    targetIndex: 0,
    semitoneDelta: 2,
  });
  const moved = applyScoreEventReorderPatch({ score: current, patch, generatedAt: "2026-07-14T02:00:00.000Z" });
  assert.equal(moved.measures.find((measure) => measure.id === sourceMeasure.id)?.events.some((event) => event.id === "n2"), false);
  const movedEvent = moved.measures.find((measure) => measure.id === "P1-m2-2")?.events[0];
  assert.equal(movedEvent?.type, "note");
  if (movedEvent?.type !== "note") throw new Error("Expected moved n2 to be a note.");
  assert.deepEqual(movedEvent.pitch, { step: "F", alter: 1, octave: 5 });
  assert.throws(
    () => validateScoreEventReorderPatch({ eventId: "n2", targetMeasureId: "P1-m2-2", targetIndex: 0, semitoneDelta: 49 }),
    /Semitone delta/,
  );
});

test("a balanced cross-measure drag fills the source gap and consumes target rests", () => {
  const current = parse(professionalMusicXml);
  const sourceMeasure = current.measures.find((measure) => measure.partId === "P1");
  const template = sourceMeasure?.events.find((event) => event.id === "n2");
  assert.ok(sourceMeasure);
  assert.equal(template?.type, "note");
  if (template?.type !== "note") throw new Error("Expected a note template.");
  sourceMeasure.attributes = {
    divisions: 1,
    time: { beats: "4", beatType: "4" },
  };
  sourceMeasure.events = Array.from({ length: 4 }, (_, index) => ({
    ...structuredClone(template),
    id: `source-note-${index + 1}`,
    duration: 1,
    durationType: "quarter",
    dots: 0,
    chord: false,
    grace: undefined,
    beams: undefined,
    tuplets: undefined,
    ornaments: undefined,
  }));
  current.measures.push({
    id: "P1-balanced-target",
    partId: "P1",
    number: "2",
    sequence: 2,
    events: [{ id: "target-rest", type: "rest", duration: 4, durationType: "whole", dots: 0, voice: "1", staff: 2, measureRest: true }],
  });
  current.metadata.noteCount = 4;
  current.metadata.restCount = 1;
  const moved = applyScoreEventReorderPatch({
    score: current,
    patch: validateScoreEventReorderPatch({
      eventId: "source-note-1",
      targetMeasureId: "P1-balanced-target",
      targetIndex: 0,
      balanceMeasures: true,
    }),
    generatedAt: "2026-07-14T02:30:00.000Z",
  });
  const balancedSource = moved.measures.find((measure) => measure.id === sourceMeasure.id);
  const balancedTarget = moved.measures.find((measure) => measure.id === "P1-balanced-target");
  assert.equal(balancedSource?.events.reduce((sum, event) => sum + (event.type === "note" && event.chord ? 0 : event.duration), 0), 4);
  assert.equal(balancedTarget?.events.reduce((sum, event) => sum + (event.type === "note" && event.chord ? 0 : event.duration), 0), 4);
  assert.equal(balancedSource?.events.some((event) => event.type === "rest" && event.duration === 1), true);
  assert.deepEqual(balancedTarget?.events.filter((event) => event.type === "rest").map((event) => [event.duration, event.durationType]), [
    [1, "quarter"],
    [2, "half"],
  ]);
  assert.equal(moved.metadata.noteCount, 4);
  assert.equal(moved.metadata.restCount, 4);
});

test("chord-tone drags preserve vertical edits and detach safely from their onset", () => {
  const current = parse(professionalMusicXml);
  const sourceMeasure = current.measures.find((measure) => measure.partId === "P1");
  const template = sourceMeasure?.events.find((event) => event.id === "n2");
  assert.ok(sourceMeasure);
  assert.equal(template?.type, "note");
  if (template?.type !== "note") throw new Error("Expected a note template.");
  sourceMeasure.attributes = { divisions: 1, time: { beats: "4", beatType: "4" } };
  sourceMeasure.events = [
    { ...structuredClone(template), id: "chord-root", duration: 1, durationType: "quarter", chord: false, grace: undefined },
    { ...structuredClone(template), id: "chord-third", duration: 1, durationType: "quarter", chord: true, grace: undefined },
    { id: "source-rest", type: "rest", duration: 3, durationType: "half", dots: 1, voice: "1", staff: 2, measureRest: false },
  ];
  current.measures.push({
    id: "P1-chord-target",
    partId: "P1",
    number: "2",
    sequence: 2,
    attributes: { divisions: 1, time: { beats: "4", beatType: "4" } },
    events: [{ id: "target-rest", type: "rest", duration: 4, durationType: "whole", dots: 0, voice: "1", staff: 2, measureRest: true }],
  });

  const vertical = applyScoreEventReorderPatch({
    score: current,
    patch: validateScoreEventReorderPatch({ eventId: "chord-third", targetMeasureId: sourceMeasure.id, targetIndex: 1, semitoneDelta: 1 }),
  });
  const verticalThird = vertical.measures.find((measure) => measure.id === sourceMeasure.id)?.events[1];
  assert.equal(verticalThird?.type === "note" && verticalThird.chord, true);

  const detached = applyScoreEventReorderPatch({
    score: current,
    patch: validateScoreEventReorderPatch({ eventId: "chord-third", targetMeasureId: "P1-chord-target", targetIndex: 0, balanceMeasures: true }),
  });
  const detachedThird = detached.measures.find((measure) => measure.id === "P1-chord-target")?.events[0];
  assert.equal(detachedThird?.type === "note" && detachedThird.chord, false);
  assert.equal(detached.measures.find((measure) => measure.id === sourceMeasure.id)?.events.some((event) => event.type === "rest" && event.id.includes("manual")), false);
  assert.deepEqual(
    detached.measures.find((measure) => measure.id === "P1-chord-target")?.events.filter((event) => event.type === "rest").map((event) => event.duration),
    [1, 2],
  );

  const movedRoot = applyScoreEventReorderPatch({
    score: current,
    patch: validateScoreEventReorderPatch({ eventId: "chord-root", targetMeasureId: "P1-chord-target", targetIndex: 0, balanceMeasures: true }),
  });
  const promotedThird = movedRoot.measures.find((measure) => measure.id === sourceMeasure.id)?.events[0];
  assert.equal(promotedThird?.type === "note" && promotedThird.chord, false);
});

test("editing one chord tone keeps the entire chord on one rhythmic duration", () => {
  const current = parse(professionalMusicXml);
  const measure = current.measures.find((candidate) => candidate.partId === "P1");
  const template = measure?.events.find((event) => event.id === "n2");
  assert.ok(measure);
  assert.equal(template?.type, "note");
  if (template?.type !== "note") throw new Error("Expected a note template.");
  measure.events = [
    { ...structuredClone(template), id: "duration-root", duration: 2, durationType: "eighth", dots: 0, chord: false },
    { ...structuredClone(template), id: "duration-third", duration: 2, durationType: "eighth", dots: 0, chord: true },
  ];
  const edited = applyScoreNotePatch({
    score: current,
    patch: validateScoreNotePatch({ eventId: "duration-third", duration: 3, durationType: "eighth", dots: 1 }),
  });
  const chord = edited.measures.find((candidate) => candidate.id === measure.id)?.events ?? [];
  assert.deepEqual(chord.map((event) => [event.duration, event.durationType, event.dots]), [
    [3, "eighth", 1],
    [3, "eighth", 1],
  ]);
});

test("copy and paste regenerates event and professional notation ids for a complete tuplet", () => {
  const current = parse(professionalMusicXml);
  const targetMeasure = current.measures.find((measure) => measure.partId === "P1");
  assert.ok(targetMeasure);
  const patch = validateScoreEventBatchPatch({
    action: "duplicate",
    eventIds: ["n1", "n2"],
    targetMeasureId: targetMeasure.id,
    afterEventId: "n2",
  });
  const duplicated = applyScoreEventBatchPatch({ score: current, patch, generatedAt: "2026-07-14T03:00:00.000Z" });
  const events = duplicated.measures.find((measure) => measure.id === targetMeasure.id)?.events ?? [];
  const pastedEvents = events.filter((event) => event.id !== "n1" && event.id !== "n2");
  const pasted = pastedEvents[0];
  assert.equal(pastedEvents.length, 2);
  assert.equal(pasted?.type, "note");
  if (pasted?.type !== "note") throw new Error("Expected duplicated event to be a note.");
  assert.match(pasted.id, new RegExp(`^${targetMeasure.id}-manual-`));
  assert.ok(pasted.beams?.every((beam) => beam.id.startsWith(`${pasted.id}-beam-`)));
  assert.ok(pasted.tuplets?.every((tuplet) => tuplet.id.startsWith(`${pasted.id}-tuplet-`)));
  assert.equal(pasted.grace?.id, `${pasted.id}-grace`);
  assert.ok(pasted.ornaments?.every((ornament) => ornament.id.startsWith(`${pasted.id}-ornament-`)));
  assert.equal(new Set(events.map((event) => event.id)).size, events.length);
});

test("single-event tuplet moves and partial tuplet copies are rejected", () => {
  const current = parse(professionalMusicXml);
  const sourceMeasure = current.measures.find((measure) => measure.partId === "P1");
  assert.ok(sourceMeasure);
  current.measures.push({ id: "P1-tuplet-target", partId: "P1", number: "2", sequence: 2, events: [] });
  assert.throws(
    () =>
      applyScoreEventReorderPatch({
        score: current,
        patch: validateScoreEventReorderPatch({ eventId: "n2", targetMeasureId: "P1-tuplet-target", targetIndex: 0 }),
      }),
    /complete multi-selection/,
  );
  assert.throws(
    () =>
      applyScoreEventBatchPatch({
        score: current,
        patch: validateScoreEventBatchPatch({ action: "duplicate", eventIds: ["n1"], targetMeasureId: sourceMeasure.id }),
      }),
    /complete tuplet group/,
  );
});

test("a complete tuplet batch move preserves markers and balances both measures", () => {
  const current = parse(professionalMusicXml);
  const sourceMeasure = current.measures.find((measure) => measure.partId === "P1");
  const template = sourceMeasure?.events.find((event) => event.id === "n2");
  assert.ok(sourceMeasure);
  assert.equal(template?.type, "note");
  if (template?.type !== "note") throw new Error("Expected a note template.");
  sourceMeasure.attributes = { divisions: 6, time: { beats: "4", beatType: "4" } };
  sourceMeasure.events = [
    { ...structuredClone(template), id: "triplet-1", chord: false, tuplets: [{ id: "triplet-1-start", type: "start", number: "1" }] },
    { ...structuredClone(template), id: "triplet-2", chord: false, tuplets: undefined },
    { ...structuredClone(template), id: "triplet-3", chord: false, tuplets: [{ id: "triplet-3-stop", type: "stop", number: "1" }] },
    { id: "source-fill", type: "rest", duration: 18, durationType: "half", dots: 1, voice: "1", staff: 2, measureRest: false },
  ];
  current.measures.push({
    id: "P1-triplet-target",
    partId: "P1",
    number: "2",
    sequence: 2,
    events: [{ id: "target-fill", type: "rest", duration: 24, durationType: "whole", dots: 0, voice: "1", staff: 2, measureRest: true }],
  });

  const moved = applyScoreEventBatchPatch({
    score: current,
    patch: validateScoreEventBatchPatch({
      action: "move",
      eventIds: ["triplet-1", "triplet-2", "triplet-3"],
      targetMeasureId: "P1-triplet-target",
      balanceMeasures: true,
    }),
  });
  const source = moved.measures.find((measure) => measure.id === sourceMeasure.id);
  const target = moved.measures.find((measure) => measure.id === "P1-triplet-target");
  assert.deepEqual(source?.events.map((event) => [event.type, event.duration, event.durationType, event.dots]), [
    ["rest", 24, "whole", 0],
  ]);
  assert.equal(source?.events[0]?.type === "rest" && source.events[0].measureRest, true);
  assert.deepEqual(target?.events.filter((event) => event.type === "note").map((event) => event.id), ["triplet-1", "triplet-2", "triplet-3"]);
  assert.deepEqual(target?.events.filter((event) => event.type === "rest").map((event) => [event.duration, event.durationType, event.dots]), [
    [6, "quarter", 0],
    [12, "half", 0],
  ]);
  const movedTupletNotes = target?.events.filter((event) => event.type === "note") ?? [];
  assert.equal(movedTupletNotes[0]?.tuplets?.[0]?.type, "start");
  assert.equal(movedTupletNotes[2]?.tuplets?.[0]?.type, "stop");
});

test("balanced moves split remaining rests into readable values and fail atomically", () => {
  const current = parse(professionalMusicXml);
  const sourceMeasure = current.measures.find((measure) => measure.partId === "P1");
  const template = sourceMeasure?.events.find((event) => event.id === "n2");
  assert.ok(sourceMeasure);
  assert.equal(template?.type, "note");
  if (template?.type !== "note") throw new Error("Expected a note template.");
  sourceMeasure.attributes = { divisions: 4, time: { beats: "4", beatType: "4" } };
  sourceMeasure.events = [
    { ...structuredClone(template), id: "three-unit-note", duration: 3, durationType: "eighth", dots: 1, chord: false, timeModification: undefined, tuplets: undefined },
    { id: "source-rest", type: "rest", duration: 13, durationType: "half", dots: 1, voice: "1", staff: 2, measureRest: false },
  ];
  current.measures.push({
    id: "P1-readable-rests",
    partId: "P1",
    number: "2",
    sequence: 2,
    events: [{ id: "whole-target-rest", type: "rest", duration: 16, durationType: "whole", dots: 0, voice: "1", staff: 2, measureRest: true }],
  });
  const moved = applyScoreEventReorderPatch({
    score: current,
    patch: validateScoreEventReorderPatch({ eventId: "three-unit-note", targetMeasureId: "P1-readable-rests", targetIndex: 0, balanceMeasures: true }),
  });
  const targetRests = moved.measures
    .find((measure) => measure.id === "P1-readable-rests")
    ?.events.filter((event) => event.type === "rest") ?? [];
  assert.deepEqual(targetRests.map((event) => [event.duration, event.durationType, event.dots]), [
    [4, "quarter", 0],
    [1, "16th", 0],
    [8, "half", 0],
  ]);

  const atomicTarget = current.measures.find((measure) => measure.id === "P1-readable-rests");
  assert.ok(atomicTarget);
  atomicTarget.events.unshift({
    ...structuredClone(template),
    id: "target-full-note",
    duration: 16,
    durationType: "whole",
    dots: 0,
    chord: false,
    timeModification: undefined,
    tuplets: undefined,
  });
  const originalRest = atomicTarget.events.find((event) => event.id === "whole-target-rest");
  assert.throws(
    () => {
      if (originalRest?.type !== "rest") throw new Error("Expected target rest.");
      originalRest.duration = 1;
      return applyScoreEventReorderPatch({
        score: current,
        patch: validateScoreEventReorderPatch({ eventId: "three-unit-note", targetMeasureId: "P1-readable-rests", targetIndex: 0, balanceMeasures: true }),
      });
    },
    /enough available rest duration/,
  );
  assert.equal(originalRest?.duration, 1);
  assert.equal(sourceMeasure.events.some((event) => event.id === "three-unit-note"), true);
});

test("cut and paste moves a selection atomically and rejects cross-part targets", () => {
  const current = parse(professionalMusicXml);
  const sourceMeasure = current.measures.find((measure) => measure.partId === "P1");
  const otherPartMeasure = current.measures.find((measure) => measure.partId === "P2");
  assert.ok(sourceMeasure);
  assert.ok(otherPartMeasure);
  current.measures.push({
    id: "P1-m2-2",
    partId: "P1",
    number: "2",
    sequence: 2,
    events: [],
  });
  const patch = validateScoreEventBatchPatch({
    action: "move",
    eventIds: ["n1", "n2"],
    targetMeasureId: "P1-m2-2",
  });
  const moved = applyScoreEventBatchPatch({ score: current, patch, generatedAt: "2026-07-14T04:00:00.000Z" });
  assert.deepEqual(moved.measures.find((measure) => measure.id === sourceMeasure.id)?.events, []);
  assert.deepEqual(moved.measures.find((measure) => measure.id === "P1-m2-2")?.events.map((event) => event.id), ["n1", "n2"]);
  assert.equal(moved.metadata.noteCount, current.metadata.noteCount);
  assert.throws(
    () =>
      applyScoreEventBatchPatch({
        score: current,
        patch: validateScoreEventBatchPatch({ action: "move", eventIds: ["n1", "n2"], targetMeasureId: otherPartMeasure.id }),
      }),
    /same part/,
  );
});

test("mid-measure tempo offsets survive MusicXML export and import", () => {
  const current = parse(professionalMusicXml);
  const firstMeasure = current.measures[0];
  assert.ok(firstMeasure);
  firstMeasure.tempos = [{ id: "tempo-mid-measure", bpm: 72, beatUnit: "eighth", placement: "above", offsetDivisions: 3 }];
  const musicXml = scoreJsonToMusicXml(current);
  assert.match(musicXml, /<offset>3<\/offset>/);
  const reparsed = parse(musicXml);
  assert.deepEqual(reparsed.measures[0]?.tempos?.map((tempo) => [tempo.bpm, tempo.beatUnit, tempo.offsetDivisions]), [[72, "eighth", 3]]);
});

test("direct measure layout controls survive MusicXML export and reopen", () => {
  const score = parseMusicXmlToScoreJson({
    musicXml: professionalMusicXml,
    title: "Layout controls",
    sourceFileId: "layout-source",
    sourceOriginalName: "layout.musicxml",
    importedAt: "2026-07-17T00:00:00.000Z",
  });
  const target = score.measures[0];
  assert.ok(target);
  const edited = applyScoreMeasureAttributesPatch({
    score,
    patch: validateScoreMeasureAttributesPatch({
      measureId: target.id,
      newSystem: false,
      newPage: true,
      measureWidth: 360,
      staffDistance: 96,
    }),
    generatedAt: "2026-07-17T00:00:01.000Z",
  });
  assert.deepEqual(edited.measures[0]?.layout, {
    id: target.layout?.id ?? `${target.id}-layout`,
    newSystem: false,
    newPage: true,
    measureWidth: 360,
    staffDistance: 96,
  });

  const musicXml = scoreJsonToMusicXml(edited);
  assert.match(musicXml, /<measure number="1" width="360">/);
  assert.match(musicXml, /<print new-page="yes">/);
  assert.match(musicXml, /<staff-distance>96<\/staff-distance>/);
  const reopened = parseMusicXmlToScoreJson({
    musicXml,
    title: "Layout controls reopened",
    sourceFileId: "layout-reopened",
    sourceOriginalName: "layout-reopened.musicxml",
    importedAt: "2026-07-17T00:00:02.000Z",
  });
  assert.equal(reopened.measures[0]?.layout?.newPage, true);
  assert.equal(reopened.measures[0]?.layout?.measureWidth, 360);
  assert.equal(reopened.measures[0]?.layout?.staffDistance, 96);
});
