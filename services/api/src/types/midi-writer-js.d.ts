declare module "midi-writer-js" {
  class Track {
    addEvent(event: unknown): Track;
    addTrackName(text: string): Track;
    addInstrumentName(text: string): Track;
    setTempo(bpm: number, tick?: number): Track;
    setTimeSignature(numerator: number, denominator: number, midiClocksPerTick?: number, notesPerMidiClock?: number): Track;
    setKeySignature(fifths: number, mode?: number): Track;
  }

  class NoteEvent {
    constructor(fields: {
      pitch: string[];
      duration: string;
      startTick?: number;
      velocity?: number;
      channel?: number;
    });
  }

  class ProgramChangeEvent {
    constructor(fields: {
      channel?: number;
      delta?: number;
      instrument: number;
    });
  }

  class LyricEvent {
    constructor(fields: {
      text: string;
      delta?: number;
    });
  }

  class MarkerEvent {
    constructor(fields: {
      text: string;
      delta?: number;
    });
  }

  class Writer {
    constructor(tracks: Track[], options?: { ticksPerBeat?: number });
    buildFile(): Uint8Array;
  }

  const MidiWriter: {
    Track: typeof Track;
    NoteEvent: typeof NoteEvent;
    ProgramChangeEvent: typeof ProgramChangeEvent;
    LyricEvent: typeof LyricEvent;
    MarkerEvent: typeof MarkerEvent;
    Writer: typeof Writer;
  };

  export default MidiWriter;
}
