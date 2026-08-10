import MidiWriter from "midi-writer-js";
import type { PlaybackDocument, PlaybackNoteEvent } from "@score/shared";

const TICKS_PER_BEAT = 128;

export type PlaybackMidiExportOptions = {
  tempoBpm?: number;
  soloPartIds?: string[];
  mutedPartIds?: string[];
  partVolumes?: Record<string, number>;
  loopEnabled?: boolean;
  loopStartBeat?: number;
  loopEndBeat?: number;
};

function ticksFromBeats(beats: number) {
  return Math.max(1, Math.round(beats * TICKS_PER_BEAT));
}

function startTicksFromBeats(beats: number) {
  return Math.max(0, Math.round(beats * TICKS_PER_BEAT));
}

function channelForIndex(index: number) {
  // MIDI channel 10 is percussion; skip it for notation playback exports.
  const channel = (index % 15) + 1;
  return channel >= 10 ? channel + 1 : channel;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function volumeForPart(partId: string, options: PlaybackMidiExportOptions) {
  return clamp(options.partVolumes?.[partId] ?? 1, 0, 1.5);
}

function programChangeInstrument(midiProgram: number | undefined) {
  if (midiProgram === undefined || !Number.isInteger(midiProgram)) {
    return undefined;
  }

  // MusicXML midi-program is 1-128, while MIDI Program Change is 0-127.
  return Math.min(127, Math.max(0, midiProgram - 1));
}

function midiTimeSignature(playback: PlaybackDocument) {
  if (playback.timeSignature?.senzaMisura) return undefined;
  const beats = playback.timeSignature?.beats;
  const beatType = playback.timeSignature?.beatType;
  const numerator = beats && /^\d{1,2}$/.test(beats) ? Number(beats) : undefined;
  const denominator = beatType && /^(1|2|4|8|16|32|64)$/.test(beatType) ? Number(beatType) : undefined;

  if (!numerator || !denominator) {
    return undefined;
  }

  return { numerator, denominator };
}

function midiKeySignatureMode(playback: PlaybackDocument) {
  return playback.keySignature?.mode === "minor" ? 1 : 0;
}

function lyricTextForEvent(event: PlaybackNoteEvent) {
  const lyrics = event.lyrics?.map((lyric, index) => {
    const text = lyric.text.trim();
    if (!text) {
      return "";
    }

    return event.lyrics && event.lyrics.length > 1 ? `${lyric.number ?? index + 1}:${text}` : text;
  }).filter(Boolean);

  return lyrics && lyrics.length > 0 ? lyrics.join(" / ") : undefined;
}

function addLyricsToTrack(track: InstanceType<typeof MidiWriter.Track>, events: PlaybackNoteEvent[], sectionStartBeat: number) {
  const lyricEvents = events
    .map((event) => ({
      tick: startTicksFromBeats(event.startBeat - sectionStartBeat),
      text: lyricTextForEvent(event),
    }))
    .filter((event): event is { tick: number; text: string } => Boolean(event.text))
    .sort((left, right) => left.tick - right.tick || left.text.localeCompare(right.text));

  let previousTick = 0;
  for (const lyricEvent of lyricEvents) {
    const delta = Math.max(0, lyricEvent.tick - previousTick);
    track.addEvent(new MidiWriter.LyricEvent({ text: lyricEvent.text, delta }));
    previousTick = lyricEvent.tick;
  }
}

function markerLabel(input: { measureNumber: string; occurrence: number }) {
  return input.occurrence > 1 ? `Measure ${input.measureNumber} repeat ${input.occurrence}` : `Measure ${input.measureNumber}`;
}

function addMeasureMarkersToTrack(track: InstanceType<typeof MidiWriter.Track>, playback: PlaybackDocument, sectionStartBeat: number, options: PlaybackMidiExportOptions) {
  const firstPartId = playback.parts[0]?.id;
  if (!firstPartId) {
    return;
  }

  const sectionEnd = options.loopEnabled && options.loopEndBeat !== undefined ? Math.max(sectionStartBeat + 0.25, options.loopEndBeat) : undefined;
  const markers = playback.measureMarkers
    .filter((marker) => marker.partId === firstPartId)
    .filter((marker) => marker.startBeat >= sectionStartBeat && (sectionEnd === undefined || marker.startBeat < sectionEnd))
    .map((marker) => ({
      tick: startTicksFromBeats(marker.startBeat - sectionStartBeat),
      text: markerLabel(marker),
    }))
    .sort((left, right) => left.tick - right.tick || left.text.localeCompare(right.text));

  let previousTick = 0;
  for (const marker of markers) {
    const delta = Math.max(0, marker.tick - previousTick);
    track.addEvent(new MidiWriter.MarkerEvent({ text: marker.text, delta }));
    previousTick = marker.tick;
  }
}

function addTempoChangesToTrack(track: InstanceType<typeof MidiWriter.Track>, playback: PlaybackDocument, sectionStartBeat: number, options: PlaybackMidiExportOptions) {
  const baseTempo = clamp(playback.tempoBpm, 20, 400);
  const requestedTempo = clamp(options.tempoBpm ?? baseTempo, 20, 400);
  const ratio = requestedTempo / baseTempo;
  const sectionEnd = options.loopEnabled && options.loopEndBeat !== undefined ? Math.max(sectionStartBeat + 0.25, options.loopEndBeat) : Number.POSITIVE_INFINITY;
  const changes = (playback.tempoChanges ?? []).filter((change) => change.startBeat >= sectionStartBeat && change.startBeat < sectionEnd);
  for (const change of changes) {
    track.setTempo(Math.round(clamp(change.bpm * ratio, 20, 400)), startTicksFromBeats(change.startBeat - sectionStartBeat));
  }
}

function filterEvents(events: PlaybackNoteEvent[], options: PlaybackMidiExportOptions) {
  const soloPartIds = options.soloPartIds ?? [];
  const mutedPartIds = options.mutedPartIds ?? [];
  const sectionStart = options.loopEnabled ? Math.max(0, options.loopStartBeat ?? 0) : 0;
  const sectionEnd = options.loopEnabled && options.loopEndBeat !== undefined ? Math.max(sectionStart + 0.25, options.loopEndBeat) : undefined;
  const partEvents =
    soloPartIds.length > 0
      ? events.filter((event) => soloPartIds.includes(event.partId))
      : events.filter((event) => !mutedPartIds.includes(event.partId));

  if (sectionEnd === undefined) {
    return partEvents;
  }

  return partEvents.filter((event) => event.startBeat >= sectionStart && event.startBeat < sectionEnd);
}

export function countPlaybackMidiEvents(playback: PlaybackDocument, options: PlaybackMidiExportOptions = {}) {
  return filterEvents(playback.events, options).length;
}

export function playbackToMidiFile(playback: PlaybackDocument, options: PlaybackMidiExportOptions = {}): Uint8Array {
  const tempoBpm = Math.min(240, Math.max(40, Math.round(options.tempoBpm ?? playback.tempoBpm)));
  const sectionStartBeat = options.loopEnabled ? Math.max(0, options.loopStartBeat ?? 0) : 0;
  const events = filterEvents(playback.events, options);
  const tracks = playback.parts.map((part, index) => {
    const track = new MidiWriter.Track();
    track.addTrackName(part.name);
    track.addInstrumentName(part.name);

    if (index === 0) {
      track.setTempo(tempoBpm, 0);
      addTempoChangesToTrack(track, playback, sectionStartBeat, options);
      const timeSignature = midiTimeSignature(playback);
      if (timeSignature) {
        track.setTimeSignature(timeSignature.numerator, timeSignature.denominator);
      }

      if (playback.keySignature) {
        track.setKeySignature(playback.keySignature.fifths, midiKeySignatureMode(playback));
      }

      addMeasureMarkersToTrack(track, playback, sectionStartBeat, options);
    }

    const channel = channelForIndex(index);
    const instrument = programChangeInstrument(part.midiProgram);
    if (instrument !== undefined) {
      track.addEvent(new MidiWriter.ProgramChangeEvent({ instrument, channel }));
    }

    const partEvents = events.filter((event) => event.partId === part.id);
    addLyricsToTrack(track, partEvents, sectionStartBeat);

    for (const event of partEvents) {
      track.addEvent(
        new MidiWriter.NoteEvent({
          pitch: [event.noteName],
          duration: `T${ticksFromBeats(event.soundDurationBeats ?? event.durationBeats)}`,
          startTick: startTicksFromBeats(event.startBeat - sectionStartBeat),
          velocity: Math.round(clamp(event.velocity * volumeForPart(event.partId, options), 0, 1) * 100),
          channel,
        }),
      );
    }

    return track;
  });

  const writer = new MidiWriter.Writer(tracks.length > 0 ? tracks : [new MidiWriter.Track()], {
    ticksPerBeat: TICKS_PER_BEAT,
  });
  return writer.buildFile();
}
