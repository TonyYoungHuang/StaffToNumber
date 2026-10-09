import assert from "node:assert/strict";
import test from "node:test";
import { parseAudiverisMusicXmlToScoreJson } from "./musicxml-score-parser.js";

test("Audiveris percussion parsing preserves display placement, real MIDI mapping and hidden rests", () => {
  const musicXml = `<score-partwise><part-list><score-part id="Dr"><part-name>Drums</part-name>
    <midi-instrument id="snare"><midi-channel>10</midi-channel><midi-unpitched>39</midi-unpitched></midi-instrument>
    <midi-instrument id="invalid"><midi-channel>10</midi-channel><midi-unpitched>129</midi-unpitched></midi-instrument>
  </score-part></part-list><part id="Dr"><measure number="1"><attributes><divisions>1</divisions><clef><sign>percussion</sign></clef></attributes>
    <note id="n1"><unpitched><display-step>C</display-step><display-octave>5</display-octave></unpitched><duration>1</duration><instrument id="snare"/><notehead>x</notehead></note>
    <note id="n2"><unpitched/><duration>1</duration><instrument id="invalid"/></note>
    <note id="r1" print-object="no"><rest/><duration>1</duration></note>
  </measure></part></score-partwise>`;
  const score = parseAudiverisMusicXmlToScoreJson({ musicXml, title: "Fixture", sourceFileId: "fixture", sourceOriginalName: "fixture.musicxml", importedAt: "2026-01-01T00:00:00Z" });
  assert.equal(score.parts[0].midiChannel, 10);
  assert.equal(score.measures[0].events.length, 3);
  const [snare, unknown, hidden] = score.measures[0].events;
  assert.ok(snare.type === "note" && unknown.type === "note" && hidden.type === "rest");
  assert.deepEqual(snare.unpitched, { displayStep: "C", displayOctave: 5, instrumentId: "snare", midiPitch: 38 });
  assert.equal(snare.notehead, "x");
  assert.deepEqual(unknown.pitch, { step: "B", alter: 0, octave: 4 });
  assert.equal(unknown.unpitched?.midiPitch, undefined);
  assert.equal(hidden.printObject, false);
  assert.match(score.metadata.warnings.join(" "), /no MIDI drum mapping/);
});

test("Audiveris parsing retains octave instrument transpose metadata without altering written pitches", () => {
  const musicXml = `<score-partwise><part-list><score-part id="Gtr"><part-name>Guitar</part-name></score-part><score-part id="Bass"><part-name>Bass</part-name></score-part></part-list>
    ${["Gtr", "Bass"].map((id) => `<part id="${id}"><measure number="1"><attributes><transpose><chromatic>0</chromatic><octave-change>-1</octave-change></transpose></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note></measure></part>`).join("")}
  </score-partwise>`;
  const score = parseAudiverisMusicXmlToScoreJson({ musicXml, title: "Fixture", sourceFileId: "fixture", sourceOriginalName: "fixture.musicxml", importedAt: "2026-01-01T00:00:00Z" });
  assert.deepEqual(score.parts.map((part) => part.transposeSemitones), [-12, -12]);
  for (const measure of score.measures) {
    const note = measure.events[0];
    assert.ok(note.type === "note");
    assert.deepEqual(note.pitch, { step: "C", alter: 0, octave: 4 });
  }
});

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


test("Audiveris hook beams are retained without unsupported-symbol warnings", () => {
  const musicXml=fixture.replace('<beam number="1">begin</beam>','<beam number="1">forward hook</beam><beam number="2">backward hook</beam>');
  const score=parseAudiverisMusicXmlToScoreJson({musicXml,title:"Hooks",sourceFileId:"fixture-hooks",sourceOriginalName:"hooks.musicxml",importedAt:new Date().toISOString()});
  assert.deepEqual(score.measures[0].events[0].beams?.map(beam=>beam.type),["forward-hook","backward-hook"]);
  assert.ok(!score.metadata.warnings.some(warning=>warning.includes("beam")));
});


test("repeated printed measure numbers retain distinct editable note identities", () => {
  const musicXml=`<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Test</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note></measure><measure number="1"><attributes><divisions>1</divisions></attributes><note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note></measure></part></score-partwise>`;
  const score=parseAudiverisMusicXmlToScoreJson({musicXml,title:"Repeated bar numbers",sourceFileId:"repeated-bars",sourceOriginalName:"repeated.musicxml",importedAt:new Date().toISOString()});
  const events=score.measures.flatMap(measure=>measure.events);
  assert.equal(events.length,2);
  assert.equal(new Set(events.map(event=>event.id)).size,2);
  assert.deepEqual(score.measures.map(measure=>measure.number),["1","1"]);
});
