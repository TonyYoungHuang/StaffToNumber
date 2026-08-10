import assert from "node:assert/strict";
import test from "node:test";
import { parseAudiverisMusicXmlToScoreJson } from "./musicxml-score-parser.js";

const fixture = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>Audiveris professional symbols</work-title></work>
  <part-list>
    <part-group number="1" type="start">
      <group-name>Keyboard</group-name><group-symbol>brace</group-symbol>
    </part-group>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
    <part-group number="1" type="stop"/>
  </part-list>
  <part id="P1">
    <measure number="1" width="280">
      <print new-system="yes"><staff-layout><staff-distance>72</staff-distance></staff-layout></print>
      <attributes>
        <divisions>6</divisions><staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
      <direction placement="above"><direction-type><rehearsal>B</rehearsal></direction-type></direction>
      <note id="n1">
        <grace slash="yes" steal-time-following="10"/>
        <pitch><step>D</step><octave>5</octave></pitch><voice>1</voice><type>eighth</type>
        <beam number="1">begin</beam><staff>2</staff>
        <notations>
          <tuplet type="start" number="1" bracket="yes" show-number="actual"/>
          <ornaments><trill-mark placement="above"/><tremolo>2</tremolo></ornaments>
        </notations>
      </note>
      <note id="n2">
        <pitch><step>E</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>eighth</type>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
        <beam number="1">end</beam><staff>2</staff>
        <notations><tuplet type="stop" number="1"/></notations>
      </note>
    </measure>
  </part>
</score-partwise>`;

test("Audiveris MusicXML preserves professional notation in Score JSON v2", () => {
  const score = parseAudiverisMusicXmlToScoreJson({
    musicXml: fixture,
    title: "fallback",
    sourceFileId: "fixture-file",
    sourceOriginalName: "fixture.musicxml",
    importedAt: "2026-07-14T00:00:00.000Z",
  });

  assert.equal(score.schemaVersion, 2);
  assert.deepEqual(score.staffGroups?.[0]?.partIds, ["P1"]);
  assert.equal(score.staffGroups?.[0]?.symbol, "brace");
  assert.equal(score.parts[0]?.staffCount, 2);

  const measure = score.measures[0];
  assert.deepEqual(measure?.layout, {
    id: `${measure?.id}-layout`,
    newSystem: true,
    measureWidth: 280,
    staffDistance: 72,
  });
  assert.equal(measure?.rehearsalMarks?.[0]?.text, "B");
  assert.deepEqual(measure?.attributes?.clefs?.map(({ number, sign, line }) => ({ number, sign, line })), [
    { number: 1, sign: "G", line: 2 },
    { number: 2, sign: "F", line: 4 },
  ]);

  const grace = measure?.events.find((event) => event.type === "note");
  assert.equal(grace?.type, "note");
  if (grace?.type !== "note") throw new Error("Expected n1 to be a note.");
  assert.equal(grace.staff, 2);
  assert.deepEqual(grace.grace && { slash: grace.grace.slash, stealTimeFollowing: grace.grace.stealTimeFollowing }, {
    slash: true,
    stealTimeFollowing: 10,
  });
  assert.deepEqual(grace.beams?.map(({ number, type }) => ({ number, type })), [{ number: 1, type: "begin" }]);
  assert.deepEqual(grace.tuplets?.map(({ type, number, bracket, showNumber }) => ({ type, number, bracket, showNumber })), [
    { type: "start", number: "1", bracket: true, showNumber: "actual" },
  ]);
  assert.deepEqual(grace.ornaments?.map(({ type, placement, value }) => ({ type, placement, value })), [
    { type: "trill-mark", placement: "above", value: undefined },
    { type: "tremolo", placement: undefined, value: "2" },
  ]);
});
