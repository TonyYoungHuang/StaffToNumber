declare module "midi-writer-js" {
  class Track {
    addEvent(event: unknown): Track;
    addTrackName(text: string): Track;
    addInstrumentName(text: string): Track;
    setTempo(bpm: number, tick?: number): Track;
    controllerChange(number: number, value: number, channel?: number, delta?: number): Track;
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

  class Writer {
    constructor(tracks: Track[], options?: { ticksPerBeat?: number });
    buildFile(): Uint8Array;
  }

  const MidiWriter: {
    Track: typeof Track;
    NoteEvent: typeof NoteEvent;
    ProgramChangeEvent: typeof ProgramChangeEvent;
    Writer: typeof Writer;
  };

  export default MidiWriter;
}
