import { cleanAudioTranscriptionNotes } from "@score/shared";
import type {
  AudioTranscriptionCleanupProfile,
  ScoreEvent,
  ScoreJson,
  ScoreMeasure,
  ScoreMeasureAttributes,
  ScoreNoteEvent,
  ScorePart,
  ScorePitch,
  ScorePitchStep,
  ScoreRestEvent,
  ScoreTempo,
  ScoreTimeSignature,
} from "@score/shared";

type MidiTrackParseResult = {
  name?: string;
  midiProgram?: number;
  notes: ParsedMidiNote[];
  tempos: Array<{ tick: number; bpm: number }>;
  timeSignatures: Array<{ tick: number; beats: string; beatType: string }>;
  warnings: string[];
};

type ParsedMidiNote = {
  midi: number;
  startTick: number;
  durationTicks: number;
  channel: number;
  velocity: number;
  voice?: string;
  chord?: boolean;
};

type ActiveNote = {
  midi: number;
  startTick: number;
  channel: number;
  velocity: number;
};

const PITCHES_BY_CLASS: Array<{ step: ScorePitchStep; alter: number }> = [
  { step: "C", alter: 0 },
  { step: "C", alter: 1 },
  { step: "D", alter: 0 },
  { step: "D", alter: 1 },
  { step: "E", alter: 0 },
  { step: "F", alter: 0 },
  { step: "F", alter: 1 },
  { step: "G", alter: 0 },
  { step: "G", alter: 1 },
  { step: "A", alter: 0 },
  { step: "A", alter: 1 },
  { step: "B", alter: 0 },
];

function readAscii(buffer: Buffer, offset: number, length: number) {
  return buffer.toString("ascii", offset, offset + length);
}

function readVarLength(buffer: Buffer, state: { offset: number }) {
  let value = 0;

  for (let index = 0; index < 4; index += 1) {
    if (state.offset >= buffer.length) {
      throw new Error("Unexpected end of MIDI data while reading variable-length quantity.");
    }

    const byte = buffer[state.offset];
    state.offset += 1;
    value = (value << 7) | (byte & 0x7f);

    if ((byte & 0x80) === 0) {
      return value;
    }
  }

  throw new Error("Invalid MIDI variable-length quantity.");
}

function durationTypeFromDivisions(duration: number, divisions: number) {
  if (duration >= divisions * 4) return "whole";
  if (duration >= divisions * 2) return "half";
  if (duration >= divisions) return "quarter";
  if (duration >= Math.max(1, divisions / 2)) return "eighth";
  return "16th";
}

function midiToPitch(midi: number): ScorePitch {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;

  return {
    ...PITCHES_BY_CLASS[pitchClass],
    octave,
  };
}

function textFromMeta(data: Buffer) {
  return data.toString("utf8").replace(/\u0000/g, "").trim();
}

function parseTrack(track: Buffer): MidiTrackParseResult {
  const state = { offset: 0 };
  const notes: ParsedMidiNote[] = [];
  const tempos: MidiTrackParseResult["tempos"] = [];
  const timeSignatures: MidiTrackParseResult["timeSignatures"] = [];
  const warnings: string[] = [];
  const activeNotes = new Map<string, ActiveNote[]>();
  let tick = 0;
  let runningStatus: number | null = null;
  let name: string | undefined;
  let midiProgram: number | undefined;

  function noteKey(channel: number, midi: number) {
    return `${channel}:${midi}`;
  }

  while (state.offset < track.length) {
    tick += readVarLength(track, state);

    let status = track[state.offset];
    if (status === undefined) {
      break;
    }

    if (status < 0x80) {
      if (runningStatus === null) {
        warnings.push(`Skipped MIDI event at tick ${tick} because running status is missing.`);
        break;
      }
      status = runningStatus;
    } else {
      state.offset += 1;
      runningStatus = status;
    }

    if (status === 0xff) {
      const metaType = track[state.offset];
      state.offset += 1;
      const length = readVarLength(track, state);
      const data = track.subarray(state.offset, state.offset + length);
      state.offset += length;

      if (metaType === 0x03) {
        name = textFromMeta(data) || name;
      } else if (metaType === 0x51 && data.length === 3) {
        const microsecondsPerQuarter = (data[0] << 16) | (data[1] << 8) | data[2];
        if (microsecondsPerQuarter > 0) {
          tempos.push({ tick, bpm: Math.round(60_000_000 / microsecondsPerQuarter) });
        }
      } else if (metaType === 0x58 && data.length >= 2) {
        timeSignatures.push({
          tick,
          beats: String(data[0]),
          beatType: String(2 ** data[1]),
        });
      } else if (metaType === 0x2f) {
        break;
      }

      continue;
    }

    if (status === 0xf0 || status === 0xf7) {
      const length = readVarLength(track, state);
      state.offset += length;
      continue;
    }

    const eventType = status & 0xf0;
    const channel = status & 0x0f;
    const first = track[state.offset];
    const second = track[state.offset + 1];

    if (first === undefined) {
      break;
    }

    if (eventType === 0xc0 || eventType === 0xd0) {
      state.offset += 1;
      if (eventType === 0xc0 && midiProgram === undefined) {
        midiProgram = first + 1;
      }
      continue;
    }

    if (second === undefined) {
      break;
    }

    state.offset += 2;

    if (eventType === 0x90 && second > 0) {
      const key = noteKey(channel, first);
      const stack = activeNotes.get(key) ?? [];
      stack.push({ midi: first, startTick: tick, channel, velocity: second });
      activeNotes.set(key, stack);
      continue;
    }

    if (eventType === 0x80 || (eventType === 0x90 && second === 0)) {
      const key = noteKey(channel, first);
      const stack = activeNotes.get(key) ?? [];
      const active = stack.shift();
      if (stack.length > 0) {
        activeNotes.set(key, stack);
      } else {
        activeNotes.delete(key);
      }

      if (!active) {
        warnings.push(`Skipped note-off at tick ${tick} because no matching note-on was found.`);
        continue;
      }

      notes.push({
        midi: active.midi,
        startTick: active.startTick,
        durationTicks: Math.max(1, tick - active.startTick),
        channel: active.channel,
        velocity: active.velocity,
      });
    }
  }

  for (const stack of activeNotes.values()) {
    for (const active of stack) {
      warnings.push(`Dropped unterminated MIDI note ${active.midi} starting at tick ${active.startTick}.`);
    }
  }

  return {
    name,
    midiProgram,
    notes,
    tempos,
    timeSignatures,
    warnings,
  };
}

function makeRest(id: string, duration: number, divisions: number): ScoreRestEvent {
  return {
    id,
    type: "rest",
    duration,
    durationType: durationTypeFromDivisions(duration, divisions),
    dots: 0,
    voice: "1",
    staff: 1,
    measureRest: false,
  };
}

function makeNote(id: string, note: ParsedMidiNote, duration: number, divisions: number, ties: ScoreNoteEvent["ties"] = [], chord = false): ScoreNoteEvent {
  return {
    id,
    type: "note",
    pitch: midiToPitch(note.midi),
    duration,
    durationType: durationTypeFromDivisions(duration, divisions),
    dots: 0,
    voice: note.voice ?? "1",
    staff: 1,
    chord,
    ties,
    lyrics: [],
  };
}

function latestTimeSignatureAt(timeSignatures: MidiTrackParseResult["timeSignatures"], tick: number, fallback: ScoreTimeSignature): ScoreTimeSignature {
  let result = fallback;

  for (const timeSignature of timeSignatures) {
    if (timeSignature.tick <= tick) {
      result = {
        beats: timeSignature.beats,
        beatType: timeSignature.beatType,
      };
    }
  }

  return result;
}

function ticksPerMeasure(timeSignature: ScoreTimeSignature, ppq: number) {
  const beats = Number(timeSignature.beats) || 4;
  const beatType = Number(timeSignature.beatType) || 4;
  return Math.max(1, Math.round(beats * ppq * (4 / beatType)));
}

function ticksToDivisions(ticks: number, ppq: number, divisions: number) {
  return Math.max(1, Math.round((ticks / ppq) * divisions));
}

function measuresForPart(input: {
  partId: string;
  notes: ParsedMidiNote[];
  tempos: MidiTrackParseResult["tempos"];
  timeSignatures: MidiTrackParseResult["timeSignatures"];
  ppq: number;
  divisions: number;
}) {
  const fallbackTime: ScoreTimeSignature = { beats: "4", beatType: "4" };
  const measures: ScoreMeasure[] = [];
  const orderedNotes = [...input.notes].sort((left, right) => left.startTick - right.startTick || left.midi - right.midi);
  const lastTick = orderedNotes.reduce((max, note) => Math.max(max, note.startTick + note.durationTicks), 0);
  let measureStartTick = 0;
  let measureNumber = 1;

  while (measureStartTick <= lastTick || measureNumber === 1) {
    const timeSignature = latestTimeSignatureAt(input.timeSignatures, measureStartTick, fallbackTime);
    const measureTicks = ticksPerMeasure(timeSignature, input.ppq);
    const measureEndTick = measureStartTick + measureTicks;
    const events: ScoreEvent[] = [];
    let cursorTick = measureStartTick;

    const noteSegments = orderedNotes
      .map((note) => {
        const noteEndTick = note.startTick + note.durationTicks;
        const segmentStartTick = Math.max(note.startTick, measureStartTick);
        const segmentEndTick = Math.min(noteEndTick, measureEndTick);
        return {
          note,
          noteEndTick,
          segmentStartTick,
          segmentEndTick,
        };
      })
      .filter((segment) => segment.segmentStartTick < segment.segmentEndTick)
      .sort(
        (left, right) =>
          left.segmentStartTick - right.segmentStartTick ||
          right.segmentEndTick - left.segmentEndTick ||
          left.note.midi - right.note.midi,
      );
    let previousNoteStartTick: number | null = null;

    for (const segment of noteSegments) {
      const note = segment.note;
      const isChord = note.chord ?? previousNoteStartTick === segment.segmentStartTick;

      if (segment.segmentStartTick > cursorTick) {
        events.push(makeRest(`${input.partId}-m${measureNumber}-r${events.length + 1}`, ticksToDivisions(segment.segmentStartTick - cursorTick, input.ppq, input.divisions), input.divisions));
      }

      const ties: ScoreNoteEvent["ties"] = [];
      if (segment.segmentStartTick > note.startTick) {
        ties.push({ type: "stop" });
      }
      if (segment.segmentEndTick < segment.noteEndTick) {
        ties.push({ type: "start" });
      }

      events.push(
        makeNote(
          `${input.partId}-m${measureNumber}-n${events.length + 1}`,
          note,
          ticksToDivisions(segment.segmentEndTick - segment.segmentStartTick, input.ppq, input.divisions),
          input.divisions,
          ties,
          isChord,
        ),
      );
      cursorTick = Math.max(cursorTick, segment.segmentEndTick);
      previousNoteStartTick = segment.segmentStartTick;
    }

    if (events.length === 0) {
      const measureRest = makeRest(`${input.partId}-m${measureNumber}-rest`, ticksToDivisions(measureTicks, input.ppq, input.divisions), input.divisions);
      measureRest.measureRest = true;
      events.push(measureRest);
    } else if (cursorTick < measureEndTick) {
      events.push(makeRest(`${input.partId}-m${measureNumber}-tail`, ticksToDivisions(measureEndTick - cursorTick, input.ppq, input.divisions), input.divisions));
    }

    const attributes: ScoreMeasureAttributes | undefined =
      measureNumber === 1
        ? {
            divisions: input.divisions,
            key: {
              fifths: 0,
              mode: "major",
            },
            time: timeSignature,
            clef: {
              sign: "G",
              line: 2,
            },
          }
        : undefined;
    const tempos: ScoreTempo[] | undefined = input.tempos
      .filter((tempo) => tempo.tick >= measureStartTick && tempo.tick < measureEndTick)
      .map((tempo, index) => ({
        id: `${input.partId}-m${measureNumber}-tempo${index + 1}`,
        bpm: tempo.bpm,
        beatUnit: "quarter",
        offsetDivisions: Math.round(((tempo.tick - measureStartTick) / input.ppq) * input.divisions),
      }));

    measures.push({
      id: `${input.partId}-m${measureNumber}`,
      partId: input.partId,
      number: String(measureNumber),
      sequence: measureNumber,
      attributes,
      ...(tempos && tempos.length > 0 ? { tempos } : {}),
      events,
    });

    measureStartTick = measureEndTick;
    measureNumber += 1;
  }

  return measures;
}

export function parseMidiToScoreJson(input: {
  midi: Buffer;
  title: string;
  sourceFileId?: string | null;
  sourceOriginalName: string;
  importedAt: string;
  cleanupProfile?: AudioTranscriptionCleanupProfile;
}): ScoreJson {
  let offset = 0;

  if (readAscii(input.midi, offset, 4) !== "MThd") {
    throw new Error("The uploaded file is not a standard MIDI file.");
  }

  offset += 4;
  const headerLength = input.midi.readUInt32BE(offset);
  offset += 4;
  const format = input.midi.readUInt16BE(offset);
  const trackCount = input.midi.readUInt16BE(offset + 2);
  const division = input.midi.readUInt16BE(offset + 4);
  offset += headerLength;

  if ((division & 0x8000) !== 0) {
    throw new Error("SMPTE-timed MIDI files are not supported yet.");
  }

  const ppq = division || 480;
  const trackResults: MidiTrackParseResult[] = [];
  const warnings: string[] = [];

  for (let trackIndex = 0; trackIndex < trackCount && offset + 8 <= input.midi.length; trackIndex += 1) {
    if (readAscii(input.midi, offset, 4) !== "MTrk") {
      warnings.push(`Skipped invalid MIDI track chunk at index ${trackIndex + 1}.`);
      break;
    }

    offset += 4;
    const trackLength = input.midi.readUInt32BE(offset);
    offset += 4;
    const trackBuffer = input.midi.subarray(offset, offset + trackLength);
    offset += trackLength;
    const result = parseTrack(trackBuffer);
    trackResults.push(result);
    warnings.push(...result.warnings);
  }

  const cleanupReports = trackResults.map((track) => {
    const cleanup = cleanAudioTranscriptionNotes({ notes: track.notes, ppq, profile: input.cleanupProfile });
    track.notes = cleanup.notes;
    warnings.push(...cleanup.report.warnings);
    return cleanup.report;
  });
  const tracksWithNotes = trackResults.filter((track) => track.notes.length > 0);
  if (tracksWithNotes.length === 0) {
    throw new Error("No MIDI notes were found.");
  }

  const divisions = 4;
  const globalTempos = trackResults.flatMap((track) => track.tempos).sort((left, right) => left.tick - right.tick);
  const globalTimeSignatures = trackResults.flatMap((track) => track.timeSignatures).sort((left, right) => left.tick - right.tick);
  const parts: ScorePart[] = tracksWithNotes.map((track, index) => ({
    id: `P${index + 1}`,
    name: track.name || `MIDI Track ${index + 1}`,
    midiProgram: track.midiProgram,
    measureCount: 0,
  }));
  const measures = parts.flatMap((part, index) => {
    const track = tracksWithNotes[index];
    const partMeasures = measuresForPart({
      partId: part.id,
      notes: track.notes,
      tempos: index === 0 ? globalTempos : [],
      timeSignatures: globalTimeSignatures,
      ppq,
      divisions,
    });
    part.measureCount = partMeasures.length;
    return partMeasures;
  });
  const noteCount = measures.reduce((count, measure) => count + measure.events.filter((event) => event.type === "note").length, 0);
  const restCount = measures.reduce((count, measure) => count + measure.events.filter((event) => event.type === "rest").length, 0);

  return {
    schemaVersion: 2,
    title: input.title,
    source: {
      kind: "midi",
      fileId: input.sourceFileId ?? null,
      originalName: input.sourceOriginalName,
    },
    metadata: {
      importedAt: input.importedAt,
      parser: "midi-basic-v1",
      workTitle: input.title,
      measureCount: measures.length,
      noteCount,
      restCount,
      warnings: [
        `Imported from MIDI format ${format}. Basic MIDI import quantizes events into Score JSON for preview, playback, conversion, and export.`,
        ...warnings,
      ],
      audioTranscriptionCleanup: cleanupReports.filter((report) => report.inputNotes > 0),
    },
    parts,
    measures,
  };
}
