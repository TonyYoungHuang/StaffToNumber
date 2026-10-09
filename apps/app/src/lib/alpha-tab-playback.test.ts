import assert from "node:assert/strict";
import test from "node:test";
import * as alphaTab from "@coderline/alphatab";
import type { PlaybackDocument } from "@score/shared";
import { playbackToAlphaMidi } from "./alpha-tab-playback";

test("alphaTab MIDI uses canonical attacks, sounding MIDI, percussion channel and program", () => {
  const rendered = new alphaTab.model.Score();
  for (const name of ["Guitar", "Drums"]) { const track = new alphaTab.model.Track(); track.name = name; rendered.addTrack(track); }
  const document: PlaybackDocument = {
    schemaVersion: 1, title: "Canonical performance", tempoBpm: 110, downbeatEvery: 4, totalBeats: 4,
    timeSignature: { beats: "3+1", beatType: "4" },
    parts: [{ id: "g", name: "Guitar", midiProgram: 25, midiChannel: 1 }, { id: "d", name: "Drums", midiChannel: 10 }],
    measureMarkers: [], tempoChanges: [{ id: "tempo", sourceTempoId: "tempo", measureId: "m", measureNumber: "1", occurrence: 1, startBeat: 2, bpm: 90 }],
    events: [
      { id: "g-attack", sourceEventId: "g-note", partId: "g", measureId: "m", measureNumber: "1", voice: "1", pitch: { step: "B", alter: 0, octave: 5 }, midi: 71, noteName: "B4", startBeat: 0, durationBeats: 1, soundDurationBeats: .8, velocity: .6 },
      { id: "d-attack", sourceEventId: "d-note", partId: "d", measureId: "m", measureNumber: "1", voice: "1", pitch: { step: "F", alter: 0, octave: 5 }, unpitched: { displayStep: "F", displayOctave: 5, midiPitch: 42 }, midiChannel: 10, midi: 42, noteName: "F#2", startBeat: 1, durationBeats: .5, velocity: .7 },
    ], metadata: { sourceRevisionParser: "musicxml-basic-v1", generatedAt: "2026-10-06T00:00:00Z", eventCount: 2, warnings: [] },
  };
  const file = playbackToAlphaMidi(alphaTab, document, rendered);
  const noteOns = file.events.filter((event): event is alphaTab.midi.NoteOnEvent => event instanceof alphaTab.midi.NoteOnEvent);
  assert.equal(noteOns.length, 2);
  assert.deepEqual(noteOns.map(event => [event.track, event.tick, event.noteKey, event.channel]), [[0, 0, 71, 0], [1, 960, 42, 9]]);
  assert.ok(file.toBinary().length > 30);
  assert.equal(file.division, 960);
});

test("alphaTab playback refuses an unmatched track instead of attaching notes to another instrument", () => {
  const rendered = new alphaTab.model.Score();
  const playback = { parts: [{ id: "missing", name: "Unknown" }], events: [{ partId: "missing" }] } as unknown as PlaybackDocument;
  assert.throws(() => playbackToAlphaMidi(alphaTab, playback, rendered), /unique rendered track/);
});

test("a silent manual completion part omitted by the renderer leaves existing playback available", () => {
  const rendered = new alphaTab.model.Score();
  const playback = { parts: [{ id: "silent", name: "Manual part" }], events: [], tempoBpm: 120, totalBeats: 4 } as unknown as PlaybackDocument;
  const file = playbackToAlphaMidi(alphaTab, playback, rendered);
  assert.equal(file.events.filter(event => event instanceof alphaTab.midi.NoteOnEvent).length, 0);
  assert.ok(file.toBinary().length > 0);
});
