import assert from 'node:assert/strict';
import test from 'node:test';
import { XMLParser } from 'fast-xml-parser';
import { parseMusicXmlToScoreJson } from './musicxml-score-parser.js';
import { applyScoreNotePatch, applyScoreNoteInsertPatch, applyScoreEventDeletePatch, applyScoreEventBatchPatch, applyScoreEventReorderPatch, validateScoreNotePatch } from './score-edit.js';
import { scoreJsonToMusicXml } from './score-musicxml-export.js';
import { scoreJsonToPlayback } from './score-playback.js';
import { transposeScoreJson } from './score-transpose.js';
import { addManualScorePart } from './score-add-part.js';

const xml = `<score-partwise version="4.0"><work><work-title>Layer fixture &amp; edit</work-title></work><defaults><music-font font-family="Bravura"/></defaults>
<part-list><score-part id="G"><part-name>Guitar</part-name><score-instrument id="G-I"><instrument-name>Guitar</instrument-name></score-instrument></score-part></part-list>
<part id="G"><measure number="1"><attributes><divisions>1</divisions><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>TAB</sign><line>5</line></clef><staff-details number="2"><staff-lines>6</staff-lines><staff-tuning line="1"><tuning-step>E</tuning-step><tuning-octave>2</tuning-octave></staff-tuning><staff-tuning line="6"><tuning-step>E</tuning-step><tuning-octave>4</tuning-octave></staff-tuning></staff-details></attributes>
<direction placement="above"><direction-type><words font-style="italic">Keep &amp; play</words></direction-type></direction>
<note id="standard"><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><staff>1</staff><notations><technical><harmonic><natural/></harmonic></technical></notations><lyric number="1"><syllabic>single</syllabic><text>Ah &amp; oh</text><extend type="start"/></lyric></note>
<note id="extend"><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><staff>1</staff><lyric number="1"><extend type="stop"/></lyric></note>
<backup><duration>2</duration></backup>
<note id="tab"><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><staff>2</staff><notations><technical><string>1</string><fret>1</fret><hammer-on type="start" number="1">H</hammer-on><bend><bend-alter>1</bend-alter><release/></bend><tap>T</tap></technical></notations></note>
<note id="tab-after"><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><staff>2</staff><notations><technical><string>1</string><fret>3</fret><hammer-on type="stop" number="1"/></technical></notations></note>
<barline location="right"><bar-style>light-heavy</bar-style></barline></measure></part></score-partwise>`;
const parse = (input = xml) => parseMusicXmlToScoreJson({ musicXml: input, title: 'Fixture', sourceFileId: 'fixture', sourceOriginalName: 'fixture.musicxml', importedAt: '2026-01-01T00:00:00Z' });
const xmlObject = (input: string) => new XMLParser({ ignoreAttributes: false }).parse(input);

test('manual missing-part entry consumes blank staff duration and produces visible notes without changing other staffs', () => {
  let score = addManualScorePart(parse(), { name: 'Missing piano', staffCount: 2, kind: 'pitched' }).score;
  const part = score.parts.at(-1)!;
  const measure = score.measures.find(item => item.partId === part.id)!;
  const secondStaff = measure.events[1];
  score = applyScoreNoteInsertPatch({ score, patch: { measureId: measure.id, afterEventId: secondStaff.id, duration: 1, durationType: 'quarter', step: 'E' } });
  let edited = score.measures.find(item => item.id === measure.id)!;
  assert.equal(edited.events.filter(event => event.staff === 1).reduce((sum, event) => sum + event.duration, 0), 4);
  assert.equal(edited.events.filter(event => event.staff === 2).reduce((sum, event) => sum + event.duration, 0), 4);
  assert.equal(edited.events.filter(event => event.staff === 2 && event.type === 'note').length, 1);
  assert.equal(edited.events.find(event => event.type === 'note')?.printObject, undefined);
  const rest = edited.events.find(event => event.staff === 2 && event.type === 'rest')!;
  score = applyScoreNoteInsertPatch({ score, patch: { measureId: measure.id, beforeEventId: rest.id, duration: 2, durationType: 'half' } });
  const remainingRest = score.measures.find(item => item.id === measure.id)!.events.find(event => event.staff === 2 && event.type === 'rest')!;
  score = applyScoreNoteInsertPatch({ score, patch: { measureId: measure.id, beforeEventId: remainingRest.id, duration: 1, durationType: 'quarter' } });
  edited = score.measures.find(item => item.id === measure.id)!;
  assert.equal(edited.events.filter(event => event.staff === 2 && event.type === 'rest').length, 0);
  assert.equal(part.manualCompletion?.status, 'needs_review');
  // Editing a separate original hidden placeholder also restores visibility.
  const untouched = addManualScorePart(parse(), { name: 'Missing flute', staffCount: 1, kind: 'pitched' }).score;
  const hidden = untouched.measures.at(-1)!.events[0];
  const visible = applyScoreNotePatch({ score: untouched, patch: { eventId: hidden.id, eventType: 'note', duration: 1, durationType: 'quarter' } });
  assert.equal(visible.measures.at(-1)!.events[0].printObject, undefined);
  assert.equal(visible.measures.at(-1)!.events.reduce((duration, event) => duration + event.duration, 0), 4);
  assert.equal(visible.measures.at(-1)!.events[1].type, 'rest');
  assert.throws(() => applyScoreNotePatch({ score: untouched, patch: { eventId: hidden.id, eventType: 'note', duration: 8 } }), /exceeds/);
  assert.ok(scoreJsonToMusicXml(score).includes('<part-name>Missing piano</part-name>'));
});

test('inserting before a filled manual note keeps the requested ordering while consuming blank time', () => {
  let score = addManualScorePart(parse(), { name: 'Manual melody', staffCount: 1, kind: 'pitched' }).score;
  const measureId = score.measures.at(-1)!.id;
  score = applyScoreNoteInsertPatch({ score, patch: { measureId, step: 'E', duration: 1, durationType: 'quarter' } });
  const firstNote = score.measures.at(-1)!.events.find(event => event.type === 'note')!;
  score = applyScoreNoteInsertPatch({ score, patch: { measureId, beforeEventId: firstNote.id, step: 'F', duration: 1, durationType: 'quarter' } });
  const events = score.measures.at(-1)!.events;
  assert.deepEqual(events.filter(event => event.type === 'note').map(event => event.pitch.step), ['F', 'E']);
  assert.equal(events.reduce((sum, event) => sum + event.duration, 0), 4);
});

test('linked notation cannot silently split its onset or staff identity through property edits', () => {
  const score = parse();
  for (const patch of [
    { eventId: 'tab-after', chord: true },
    { eventId: 'tab-after', voice: '2' },
    { eventId: 'tab-after', staff: 3 },
    { eventId: 'tab-after', grace: { id: 'new-grace', slash: true } },
  ]) assert.throws(() => applyScoreNotePatch({ score, patch }), /linked standard\/TAB/);
  assert.doesNotThrow(() => applyScoreNotePatch({ score, patch: { eventId: 'tab-after', chord: false, staff: 2, voice: '1' } }));
});

test('manual drum entry exposes unpitched properties and remains silent until its drum sound is selected', () => {
  const score = addManualScorePart(parse(), { name: 'Manual drums', staffCount: 1, kind: 'percussion' }).score;
  const measure = score.measures.at(-1)!;
  const inserted = applyScoreNoteInsertPatch({ score, patch: { measureId: measure.id, step: 'F', octave: 5, duration: 1, durationType: 'quarter' } });
  const converted = applyScoreNotePatch({ score, patch: { eventId: measure.events[0].id, eventType: 'note', step: 'F', octave: 5, duration: 1, durationType: 'quarter' } });
  for (const candidate of [inserted, converted]) {
    const note = candidate.measures.at(-1)!.events.find(event => event.type === 'note')!;
    assert.ok(note.type === 'note');
    assert.deepEqual(note.unpitched, { displayStep: 'F', displayOctave: 5 });
    assert.equal(scoreJsonToPlayback(candidate).events.filter(event => event.partId === measure.partId).length, 0);
    const sounded = applyScoreNotePatch({ score: candidate, patch: { eventId: note.id, unpitched: { displayStep: 'F', displayOctave: 5, midiPitch: 42 } } });
    const attack = scoreJsonToPlayback(sounded).events.find(event => event.partId === measure.partId)!;
    assert.equal(attack.midi, 42); assert.equal(attack.midiChannel, 10);
    assert.match(scoreJsonToMusicXml(sounded), /<midi-unpitched>43<\/midi-unpitched>/);
  }
});

test('an imported source and a single pitch edit retain TAB, tuning, unknown techniques, entities and lyric-only extensions', () => {
  const imported = parse();
  const extension = imported.measures[0].events[1];
  assert.ok(extension.type === 'note'); assert.deepEqual(extension.lyrics, [{ text: '', extend: { type: 'stop' }, number: '1' }]);
  const tab = imported.measures[0].events[2];
  assert.ok(tab.type === 'note'); assert.deepEqual(tab.technical, { string: 1, fret: 1, bend: 1, hammerOn: 'start' });
  assert.equal(imported.interchange?.anchors.find(a => a.eventId === 'tab')?.alternateEventId, 'standard');
  const changed = applyScoreNotePatch({ score: imported, patch: { eventId: 'extend', step: 'A' } });
  const output = scoreJsonToMusicXml(changed);
  for (const tag of ['staff-tuning', 'harmonic', 'natural', 'hammer-on', 'tap', 'release', 'music-font']) assert.match(output, new RegExp(`<${tag}\\b`));
  assert.match(output, /<extend type="stop"\s*\/>/);
  assert.equal(xmlObject(output)['score-partwise'].part.measure.direction['direction-type'].words['#text'], 'Keep & play');
  const reopened = parse(output); assert.ok(reopened.measures[0].events[1].type === 'note'); assert.equal(reopened.measures[0].events[1].pitch.step, 'A');
  assert.equal((output.match(/<note\b/g) ?? []).length, 4);
});

test('technical edits preserve techniques outside the edited field and lyric extension-only records remain editable', () => {
  const score = applyScoreNotePatch({ score: parse(), patch: validateScoreNotePatch({ eventId: 'tab', technical: { fret: 2 }, lyrics: [{ text: '', extend: { type: 'continue' } }] }) });
  const output = scoreJsonToMusicXml(score);
  assert.match(output, /<tap>T<\/tap>/); assert.match(output, /<fret>2<\/fret>/); assert.match(output, /<extend type="continue"\s*\/>/);
  assert.match(output, /<release\s*\/>/); assert.match(output, /<hammer-on type="start" number="1">H<\/hammer-on>/);
  const reparsed = parse(output); const standard = reparsed.measures[0].events[0];
  assert.ok(standard.type === 'note'); assert.deepEqual(standard.pitch, { step: 'F', alter: 1, octave: 4 });
  assert.throws(() => validateScoreNotePatch({ eventId: 'tab', technical: { string: 0 } }), /TAB/);
  assert.throws(() => validateScoreNotePatch({ eventId: 'tab', unpitched: { displayStep: 'C', displayOctave: 4, midiPitch: 128 } }), /percussion/);
});

test('structural edits preserve non-note annotations while rebuilding independent staff timing', () => {
  const imported = parse();
  const changed = applyScoreNoteInsertPatch({ score: imported, patch: { measureId: imported.measures[0].id, afterEventId: 'extend', staff: 1, voice: '1', step: 'A', duration: 1 }, generatedAt: 'fixture' });
  const output = scoreJsonToMusicXml(changed);
  assert.match(output, /<backup>\s*<duration>3<\/duration>\s*<\/backup>/);
  assert.match(output, /<words font-style="italic">Keep &amp; play<\/words>/);
  assert.match(output, /<staff-tuning/); assert.equal((output.match(/<note\b/g) ?? []).length, 5);
  assert.equal((output.match(/<barline\b/g) ?? []).length, 1);
});

test('verified alternate TAB notes play once and independent staff voices remain simultaneous', () => {
  const playback = scoreJsonToPlayback(parse());
  assert.deepEqual(playback.events.map(event => [event.sourceEventId, event.startBeat]), [['standard', 0], ['extend', 1]]);
  assert.equal(playback.totalBeats, 2);
});

test('transposing linked standard and TAB notation updates fret positions and keeps sound single', () => {
  const shifted = transposeScoreJson({ score: parse(), semitones: 2 });
  const output = parse(scoreJsonToMusicXml(shifted));
  const tab = output.measures[0].events.find(event => event.id === 'tab');
  assert.ok(tab?.type === 'note'); assert.equal(tab.technical?.fret, 3);
  assert.equal(scoreJsonToPlayback(output).events.length, 2);
});

test('changing one drum MIDI pitch creates a separate instrument without retuning other notes', () => {
  const source = `<score-partwise><part-list><score-part id="D"><part-name>Drums</part-name><score-instrument id="snare"><instrument-name>Snare</instrument-name></score-instrument><midi-instrument id="snare"><midi-channel>10</midi-channel><midi-unpitched>39</midi-unpitched></midi-instrument></score-part></part-list><part id="D"><measure number="1"><attributes><divisions>1</divisions><clef><sign>percussion</sign></clef></attributes>${['one','two'].map(id => `<note id="${id}"><unpitched><display-step>C</display-step><display-octave>5</display-octave></unpitched><duration>1</duration><instrument id="snare"/><type>quarter</type></note>`).join('')}</measure></part></score-partwise>`;
  const edited = applyScoreNotePatch({ score: parse(source), patch: { eventId: 'one', unpitched: { displayStep: 'F', displayOctave: 4, instrumentId: 'snare', midiPitch: 36 } } });
  const reopened = parse(scoreJsonToMusicXml(edited));
  assert.deepEqual(reopened.measures[0].events.map(event => event.type === 'note' ? event.unpitched?.midiPitch : null), [36,38]);
  assert.deepEqual(scoreJsonToPlayback(reopened).events.map(event => event.midi), [36,38]);
});

test('interleaved staff-group boundaries retain the same instrument membership', () => {
  const source = `<score-partwise><part-list><part-group number="1" type="start"><group-symbol>brace</group-symbol></part-group><score-part id="A"><part-name>A</part-name></score-part><part-group number="1" type="stop"/><score-part id="B"><part-name>B</part-name></score-part></part-list>${['A','B'].map(id=>`<part id="${id}"><measure number="1"><attributes><divisions>1</divisions></attributes><note><rest/><duration>1</duration></note></measure></part>`).join('')}</score-partwise>`;
  const imported = parse(source), reopened = parse(scoreJsonToMusicXml(imported));
  assert.deepEqual(reopened.staffGroups, imported.staffGroups);
  assert.deepEqual(reopened.staffGroups?.[0].partIds, ['A']);
});

test('inserting into an empty source measure retains divisions and directions before the first note', () => {
  const imported = parse(`<score-partwise><part-list><score-part id="P"><part-name>Piano</part-name></score-part></part-list><part id="P"><measure number="1"><attributes><divisions>4</divisions></attributes><direction><direction-type><words>Allegro</words></direction-type></direction><barline location="right"><bar-style>light-heavy</bar-style></barline></measure></part></score-partwise>`);
  const inserted = applyScoreNoteInsertPatch({ score: imported, patch: { measureId: imported.measures[0].id, duration: 4, step: 'C' } });
  const output = scoreJsonToMusicXml(inserted);
  assert.ok(output.indexOf('<attributes>') < output.indexOf('<note '));
  assert.ok(output.indexOf('<direction>') < output.indexOf('<note '));
  assert.ok(output.indexOf('<barline ') > output.indexOf('</note>'));
  assert.equal(scoreJsonToPlayback(parse(output)).totalBeats, 1);
});

test('changing navigation preserves unrelated textual performance directions', () => {
  const imported = parse(`<score-partwise><part-list><score-part id="P"><part-name>Strings</part-name></score-part></part-list><part id="P"><measure number="1"><attributes><divisions>1</divisions></attributes><direction><direction-type><words>con sord.</words></direction-type></direction><direction><direction-type><words>D.C. al Fine</words></direction-type></direction><note><rest/><duration>1</duration></note></measure></part></score-partwise>`);
  imported.measures[0].navigationMarks = [];
  const output = scoreJsonToMusicXml(imported);
  assert.match(output, /<words>con sord\.<\/words>/);
  assert.doesNotMatch(output, /D\.C\. al Fine/);
});

test('deleting either notation view deletes the verified logical event and cannot revive its TAB playback', () => {
  for (const id of ['standard','tab']) {
    const edited = applyScoreEventDeletePatch({ score: parse(), patch: { eventId: id } });
    assert.equal(edited.measures[0].events.some(event => event.id === 'standard' || event.id === 'tab'), false);
    assert.deepEqual(scoreJsonToPlayback(parse(scoreJsonToMusicXml(edited))).events.map(event => event.sourceEventId), ['extend']);
  }
  const deleted = applyScoreEventBatchPatch({ score: parse(), patch: { action: 'delete', eventIds: ['standard'] } });
  assert.equal(deleted.measures[0].events.length, 2);
  const imported = parse();
  assert.throws(() => applyScoreEventReorderPatch({ score: imported, patch: { eventId: 'standard', targetMeasureId: imported.measures[0].id, targetIndex: 1 } }), /linked standard\/TAB/);
});

test('explicit source forward timing cannot be silently collapsed by structural edits', () => {
  const imported = parse(`<score-partwise><part-list><score-part id="P"><part-name>Piano</part-name></score-part></part-list><part id="P"><measure number="1"><attributes><divisions>1</divisions></attributes><note id="first"><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note><forward><duration>1</duration></forward><note id="last"><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration></note></measure></part></score-partwise>`);
  const changedPitch = applyScoreNotePatch({ score: imported, patch: { eventId: 'last', step: 'E' } });
  assert.match(scoreJsonToMusicXml(changedPitch), /<forward><duration>1<\/duration><\/forward>/);
  const inserted = applyScoreNoteInsertPatch({ score: imported, patch: { measureId: imported.measures[0].id, afterEventId: 'last', step: 'F' } });
  assert.throws(() => scoreJsonToMusicXml(inserted), /explicit source timing gaps/);
});
