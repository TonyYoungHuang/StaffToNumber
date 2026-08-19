export type PracticeDemoState = {
  tempo: number;
  loopEnabled: boolean;
  metronomeEnabled: boolean;
  loopStart: number;
  loopEnd: number;
};

export const PRACTICE_DEMO_DEFAULTS: PracticeDemoState = {
  tempo: 96,
  loopEnabled: true,
  metronomeEnabled: true,
  loopStart: 1,
  loopEnd: 3,
};

const MIN_TEMPO = 60;
const MAX_TEMPO = 144;
const TEMPO_STEP = 4;
const LOOP_PATTERN = /^(\d)-(\d)$/;

type ParsedLoop =
  | { loopEnabled: false }
  | { loopEnabled: true; loopStart: number; loopEnd: number };

function validTempo(value: string | null) {
  if (value === null) return null;
  const tempo = Number(value);
  return Number.isInteger(tempo)
    && tempo >= MIN_TEMPO
    && tempo <= MAX_TEMPO
    && (tempo - MIN_TEMPO) % TEMPO_STEP === 0
    ? tempo
    : null;
}

function validLoop(value: string | null): ParsedLoop | null {
  if (value === null) return null;
  if (value === "off") return { loopEnabled: false } as const;
  const match = LOOP_PATTERN.exec(value);
  if (!match) return null;
  const startValue = match[1];
  const endValue = match[2];
  if (startValue === undefined || endValue === undefined) return null;
  const loopStart = Number(startValue) - 1;
  const loopEnd = Number(endValue);
  return loopStart >= 0 && loopStart <= 2 && loopEnd >= 2 && loopEnd <= 4 && loopStart < loopEnd
    ? { loopEnabled: true, loopStart, loopEnd } as const
    : null;
}

export function parsePracticeDemoState(search: string): PracticeDemoState {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const tempo = validTempo(params.get("tempo")) ?? PRACTICE_DEMO_DEFAULTS.tempo;
  const loop = validLoop(params.get("loop"));
  const metronome = params.get("metro");

  return {
    tempo,
    loopEnabled: loop?.loopEnabled ?? PRACTICE_DEMO_DEFAULTS.loopEnabled,
    metronomeEnabled: metronome === "0" ? false : metronome === "1" ? true : PRACTICE_DEMO_DEFAULTS.metronomeEnabled,
    loopStart: loop?.loopEnabled ? loop.loopStart : PRACTICE_DEMO_DEFAULTS.loopStart,
    loopEnd: loop?.loopEnabled ? loop.loopEnd : PRACTICE_DEMO_DEFAULTS.loopEnd,
  };
}

export function serializePracticeDemoState(state: PracticeDemoState, sourceSearch = "") {
  const params = new URLSearchParams(sourceSearch.startsWith("?") ? sourceSearch.slice(1) : sourceSearch);
  params.set("tempo", String(state.tempo));
  params.set("loop", state.loopEnabled ? `${state.loopStart + 1}-${state.loopEnd}` : "off");
  params.set("metro", state.metronomeEnabled ? "1" : "0");
  return params.toString();
}
