import type { ScoreArticulation, ScoreBeam, ScoreClef, ScoreDynamic, ScoreEvent, ScoreFermata, ScoreGrace, ScoreJson, ScoreLyric, ScoreOrnament, ScorePart, ScorePitchStep, ScoreSlur, ScoreTempo, ScoreTie, ScoreTimeModification, ScoreTuplet, ScoreWedge } from "@score/shared";

export type ScoreNotePatch = {
  eventId: string;
  eventType?: "note" | "rest";
  step?: ScorePitchStep;
  alter?: number;
  octave?: number;
  duration?: number;
  durationType?: string;
  dots?: number;
  voice?: string;
  staff?: number;
  chord?: boolean;
  lyricText?: string;
  lyrics?: ScoreLyric[];
  fingeringText?: string;
  fingerings?: string[];
  ties?: ScoreTie[];
  slurs?: ScoreSlur[];
  articulations?: ScoreArticulation[];
  fermatas?: ScoreFermata[];
  timeModification?: ScoreTimeModification | null;
  beams?: ScoreBeam[];
  tuplets?: ScoreTuplet[];
  grace?: ScoreGrace | null;
  ornaments?: ScoreOrnament[];
  measureRest?: boolean;
};

export type ScoreNoteInsertPatch = {
  measureId: string;
  afterEventId?: string;
  beforeEventId?: string;
  step?: ScorePitchStep;
  alter?: number;
  octave?: number;
  duration?: number;
  durationType?: string;
  voice?: string;
  staff?: number;
  chord?: boolean;
};

export type ScoreEventDeletePatch = {
  eventId: string;
};

export type ScoreEventReorderPatch = {
  eventId: string;
  targetMeasureId: string;
  targetIndex: number;
  semitoneDelta?: number;
  balanceMeasures?: boolean;
};

export type ScoreEventBatchPatch = {
  action: "delete" | "duplicate" | "move";
  eventIds: string[];
  targetMeasureId?: string;
  afterEventId?: string;
  balanceMeasures?: boolean;
};

export type ScoreMeasureAttributesPatch = {
  measureId: string;
  divisions?: number;
  keyFifths?: number;
  keyMode?: string;
  timeBeats?: string;
  timeBeatType?: string;
  clefSign?: ScoreClef["sign"];
  clefLine?: number;
  clefOctaveChange?: number;
  newSystem?: boolean;
  newPage?: boolean;
  measureWidth?: number | null;
  staffDistance?: number | null;
};

export type ScoreHarmonyPatch = {
  measureId: string;
  rootStep?: ScorePitchStep;
  rootAlter?: number;
  kind?: string;
  text?: string;
  clear?: boolean;
};

export type ScoreBarlinePatch = {
  measureId: string;
  location?: "left" | "right" | "middle";
  barStyle?: string;
  repeatDirection?: "forward" | "backward" | "none";
  repeatTimes?: number;
  clear?: boolean;
};

export type ScoreDynamicPatch = {
  measureId: string;
  value?: ScoreDynamic["value"];
  placement?: "above" | "below";
  clear?: boolean;
};

export type ScoreTempoPatch = {
  measureId: string;
  tempoId?: string;
  bpm?: number;
  beatUnit?: string;
  placement?: "above" | "below";
  offsetDivisions?: number;
  clear?: boolean;
};

export type ScoreWedgePatch = {
  measureId: string;
  type?: ScoreWedge["type"];
  placement?: "above" | "below";
  number?: string;
  clear?: boolean;
};

export type ScorePartPatch = {
  partId: string;
  name?: string;
  abbreviation?: string;
  midiProgram?: number | null;
};

const SCORE_PITCH_STEPS = new Set<string>(["A", "B", "C", "D", "E", "F", "G"]);
const DURATION_TYPES = new Set(["1024th", "512th", "256th", "128th", "64th", "32nd", "16th", "eighth", "quarter", "half", "whole", "breve", "long", "maxima"]);
const KEY_MODES = new Set(["major", "minor"]);
const HARMONY_KINDS = new Set(["major", "minor", "dominant", "major-seventh", "minor-seventh", "diminished", "augmented", "suspended-fourth", "suspended-second", "none"]);
const BARLINE_LOCATIONS = new Set(["left", "right", "middle"]);
const BARLINE_STYLES = new Set(["regular", "dotted", "dashed", "heavy", "light-light", "light-heavy", "heavy-light", "heavy-heavy", "tick", "short", "none"]);
const REPEAT_DIRECTIONS = new Set(["forward", "backward", "none"]);
const LYRIC_SYLLABICS = new Set(["single", "begin", "middle", "end"]);
const TIE_TYPES = new Set(["start", "stop"]);
const SLUR_TYPES = new Set(["start", "stop"]);
const ARTICULATION_TYPES = new Set(["accent", "staccato", "tenuto", "breath-mark", "caesura"]);
const FERMATA_TYPES = new Set(["upright", "inverted"]);
const BEAM_TYPES = new Set(["begin", "continue", "end", "forward-hook", "backward-hook"]);
const TUPLET_TYPES = new Set(["start", "stop"]);
const TUPLET_SHOW_NUMBERS = new Set(["actual", "both", "none"]);
const ORNAMENT_TYPES = new Set(["trill-mark", "turn", "delayed-turn", "inverted-turn", "mordent", "inverted-mordent", "tremolo"]);
const DYNAMIC_VALUES = new Set(["ppp", "pp", "p", "mp", "mf", "f", "ff", "fff"]);
const DYNAMIC_PLACEMENTS = new Set(["above", "below"]);
const TEMPO_BEAT_UNITS = new Set(["whole", "half", "quarter", "eighth", "16th", "32nd"]);
const WEDGE_TYPES = new Set(["crescendo", "diminuendo", "stop"]);
const CLEF_SIGNS = new Set(["G", "F", "C", "percussion", "TAB"]);

function validateOptionalPitch(input: { step?: unknown; alter?: unknown; octave?: unknown }) {
  if (input.step !== undefined && !SCORE_PITCH_STEPS.has(String(input.step))) {
    throw new Error("Pitch step must be one of A, B, C, D, E, F, G.");
  }

  if (input.alter !== undefined && (typeof input.alter !== "number" || !Number.isInteger(input.alter) || input.alter < -2 || input.alter > 2)) {
    throw new Error("Pitch alter must be an integer from -2 to 2.");
  }

  if (input.octave !== undefined && (typeof input.octave !== "number" || !Number.isInteger(input.octave) || input.octave < 0 || input.octave > 9)) {
    throw new Error("Pitch octave must be an integer from 0 to 9.");
  }
}

function validateOptionalDuration(input: { duration?: unknown; durationType?: unknown }) {
  if (input.duration !== undefined && (typeof input.duration !== "number" || !Number.isFinite(input.duration) || input.duration <= 0)) {
    throw new Error("Duration must be a positive number.");
  }

  if (input.durationType !== undefined && (typeof input.durationType !== "string" || !DURATION_TYPES.has(input.durationType))) {
    throw new Error("Duration type is not supported.");
  }
}

function accidentalFromAlter(alter: number) {
  if (alter === 2) {
    return "double-sharp";
  }
  if (alter === 1) {
    return "sharp";
  }
  if (alter === -1) {
    return "flat";
  }
  if (alter === -2) {
    return "double-flat";
  }
  return undefined;
}

function createManualEventId(score: ScoreJson, measureId: string, generatedAt: string, reservedIds?: Set<string>) {
  const existingIds = reservedIds ?? new Set(score.measures.flatMap((measure) => measure.events.map((event) => event.id)));
  const timestamp = generatedAt.replace(/\D/g, "").slice(0, 14) || String(Date.now());
  const baseId = `${measureId}-manual-${timestamp}`;

  if (!existingIds.has(baseId)) {
    existingIds.add(baseId);
    return baseId;
  }

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${baseId}-${suffix}`;
    if (!existingIds.has(candidate)) {
      existingIds.add(candidate);
      return candidate;
    }
  }

  throw new Error("Could not allocate a unique score event id.");
}

function pitchToMidi(pitch: { step: ScorePitchStep; alter: number; octave: number }) {
  const pitchClass: Record<ScorePitchStep, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  return (pitch.octave + 1) * 12 + pitchClass[pitch.step] + pitch.alter;
}

function pitchFromMidi(midi: number) {
  const spellings: Array<{ step: ScorePitchStep; alter: number }> = [
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
  const normalized = Math.min(127, Math.max(0, midi));
  return {
    ...spellings[((normalized % 12) + 12) % 12],
    octave: Math.floor(normalized / 12) - 1,
  };
}

function renewNestedEventIds(event: ScoreEvent) {
  if (event.type === "note") {
    event.beams = event.beams?.map((beam, index) => ({ ...beam, id: `${event.id}-beam-${beam.number}-${index + 1}` }));
    event.tuplets = event.tuplets?.map((tuplet, index) => ({ ...tuplet, id: `${event.id}-tuplet-${index + 1}` }));
    event.grace = event.grace ? { ...event.grace, id: `${event.id}-grace` } : undefined;
    event.ornaments = event.ornaments?.map((ornament, index) => ({ ...ornament, id: `${event.id}-ornament-${index + 1}` }));
    return;
  }
  event.beams = event.beams?.map((beam, index) => ({ ...beam, id: `${event.id}-beam-${beam.number}-${index + 1}` }));
  event.tuplets = event.tuplets?.map((tuplet, index) => ({ ...tuplet, id: `${event.id}-tuplet-${index + 1}` }));
}

function rhythmicDuration(event: ScoreEvent) {
  if (event.type === "note" && (event.chord || event.grace)) {
    return 0;
  }
  return event.duration;
}

function measureCapacity(score: ScoreJson, measureId: string) {
  const target = score.measures.find((measure) => measure.id === measureId);
  if (!target) return undefined;
  const measures = score.measures
    .filter((measure) => measure.partId === target.partId && measure.sequence <= target.sequence)
    .sort((a, b) => a.sequence - b.sequence);
  let divisions: number | undefined;
  let beats: string | undefined;
  let beatType: string | undefined;
  let senzaMisura = false;
  for (const measure of measures) {
    divisions = measure.attributes?.divisions ?? divisions;
    beats = measure.attributes?.time?.beats ?? beats;
    beatType = measure.attributes?.time?.beatType ?? beatType;
    if (measure.attributes?.time) senzaMisura = Boolean(measure.attributes.time.senzaMisura);
  }
  if (senzaMisura) return undefined;
  const beatCount = beats?.split("+").reduce((sum, value) => sum + (Number.parseInt(value, 10) || 0), 0);
  const denominator = Number.parseInt(beatType ?? "", 10);
  if (!divisions || !beatCount || !denominator) return undefined;
  return { divisions, beats, beatType, duration: divisions * beatCount * (4 / denominator) };
}

type RestDurationFragment = {
  duration: number;
  durationType: string;
  dots: number;
};

function restDurationValues(divisions: number): RestDurationFragment[] {
  const baseTypes: Array<[string, number]> = [
    ["maxima", divisions * 32],
    ["long", divisions * 16],
    ["breve", divisions * 8],
    ["whole", divisions * 4],
    ["half", divisions * 2],
    ["quarter", divisions],
    ["eighth", divisions / 2],
    ["16th", divisions / 4],
    ["32nd", divisions / 8],
    ["64th", divisions / 16],
    ["128th", divisions / 32],
    ["256th", divisions / 64],
    ["512th", divisions / 128],
    ["1024th", divisions / 256],
  ];
  return baseTypes
    .flatMap(([durationType, base]) =>
      Array.from({ length: 5 }, (_, dots) => ({
        duration: base * (2 - 1 / 2 ** dots),
        durationType,
        dots,
      })),
    )
    .sort((left, right) => right.duration - left.duration || left.dots - right.dots);
}

function decomposeRestDuration(duration: number, divisions: number): RestDurationFragment[] {
  const tolerance = 0.000001;
  const values = restDurationValues(divisions);
  const fragments: RestDurationFragment[] = [];
  let remaining = duration;
  while (remaining > tolerance && fragments.length < 64) {
    const value = values.find((candidate) => candidate.duration <= remaining + tolerance);
    if (!value) break;
    fragments.push(value);
    remaining = Math.max(0, remaining - value.duration);
  }
  if (remaining > tolerance) {
    throw new Error("The balanced duration cannot be represented as readable notation with the current divisions.");
  }
  return fragments;
}

function splitRestEvent(event: Extract<ScoreEvent, { type: "rest" }>, duration: number, divisions: number, occupiedIds: Set<string>) {
  return decomposeRestDuration(duration, divisions).map((fragment, index): ScoreEvent => {
    let id = index === 0 ? event.id : `${event.id}-split-${index + 1}`;
    let suffix = index + 1;
    while (occupiedIds.has(id)) {
      suffix += 1;
      id = `${event.id}-split-${suffix}`;
    }
    occupiedIds.add(id);
    return {
      id,
      type: "rest",
      ...fragment,
      voice: event.voice,
      staff: event.staff,
      measureRest: false,
    };
  });
}

function isPlainRest(event: ScoreEvent): event is Extract<ScoreEvent, { type: "rest" }> {
  return (
    event.type === "rest" &&
    !event.fermatas?.length &&
    !event.timeModification &&
    !event.beams?.length &&
    !event.tuplets?.length &&
    !event.recognition
  );
}

function metricalBoundaries(timing: { divisions: number; duration: number }, beats: string | undefined, beatType: string | undefined) {
  const denominator = Number.parseInt(beatType ?? "", 10);
  const beatUnit = denominator > 0 ? timing.divisions * (4 / denominator) : timing.divisions;
  const beatGroups = beats?.split("+").map((value) => Number.parseInt(value, 10)).filter((value) => value > 0) ?? [];
  const beatCount = beatGroups.reduce((sum, value) => sum + value, 0);
  let groups: number[];
  if (beatGroups.length > 1) groups = beatGroups.map((value) => value * beatUnit);
  else if (denominator === 8 && beatCount >= 6 && beatCount % 3 === 0) groups = Array.from({ length: beatCount / 3 }, () => beatUnit * 3);
  else if (denominator === 4 && beatCount === 4) groups = [beatUnit * 2, beatUnit * 2];
  else groups = [timing.duration];
  const boundaries: number[] = [];
  let cursor = 0;
  for (const group of groups) {
    cursor += group;
    if (cursor < timing.duration - 0.000001) boundaries.push(cursor);
  }
  return boundaries;
}

function decomposeRestByMeter(
  start: number,
  duration: number,
  timing: { divisions: number; duration: number },
  beats: string | undefined,
  beatType: string | undefined,
) {
  const end = start + duration;
  const points = [start, ...metricalBoundaries(timing, beats, beatType).filter((boundary) => boundary > start + 0.000001 && boundary < end - 0.000001), end];
  return points.slice(0, -1).flatMap((point, index) => decomposeRestDuration(points[index + 1] - point, timing.divisions));
}

function normalizeRestsByMeter(
  events: ScoreEvent[],
  timing: { divisions: number; duration: number },
  beats: string | undefined,
  beatType: string | undefined,
) {
  const tolerance = 0.000001;
  const contextDurations = new Map<string, number>();
  for (const event of events) {
    const context = `${event.voice ?? "1"}:${event.staff ?? 1}`;
    contextDurations.set(context, (contextDurations.get(context) ?? 0) + rhythmicDuration(event));
  }
  const cursors = new Map<string, number>();
  const occupiedIds = new Set(events.map((event) => event.id));
  let index = 0;
  while (index < events.length) {
    const event = events[index];
    const context = `${event.voice ?? "1"}:${event.staff ?? 1}`;
    const start = cursors.get(context) ?? 0;
    if (!isPlainRest(event)) {
      cursors.set(context, start + rhythmicDuration(event));
      index += 1;
      continue;
    }
    let endIndex = index + 1;
    let duration = event.duration;
    while (endIndex < events.length) {
      const next = events[endIndex];
      if (!isPlainRest(next) || `${next.voice ?? "1"}:${next.staff ?? 1}` !== context) break;
      duration += next.duration;
      endIndex += 1;
    }
    const isMeasureRest =
      Math.abs(start) < tolerance &&
      Math.abs(duration - timing.duration) < tolerance &&
      Math.abs((contextDurations.get(context) ?? 0) - timing.duration) < tolerance;
    const fragments = isMeasureRest
      ? [{ duration: timing.duration, durationType: "whole", dots: 0 }]
      : decomposeRestByMeter(start, duration, timing, beats, beatType);
    for (let removeIndex = index; removeIndex < endIndex; removeIndex += 1) occupiedIds.delete(events[removeIndex].id);
    const replacements = fragments.map((fragment, fragmentIndex): ScoreEvent => {
      let id = fragmentIndex === 0 ? event.id : `${event.id}-meter-${fragmentIndex + 1}`;
      let suffix = fragmentIndex + 1;
      while (occupiedIds.has(id)) {
        suffix += 1;
        id = `${event.id}-meter-${suffix}`;
      }
      occupiedIds.add(id);
      return {
        id,
        type: "rest",
        ...fragment,
        voice: event.voice,
        staff: event.staff,
        measureRest: isMeasureRest,
      };
    });
    events.splice(index, endIndex - index, ...replacements);
    cursors.set(context, start + duration);
    index += replacements.length;
  }
}

function consumeRestDuration(events: ScoreEvent[], amount: number, voice: string | undefined, staff: number | undefined, divisions: number) {
  let remaining = amount;
  const occupiedIds = new Set(events.map((event) => event.id));
  for (let index = events.length - 1; index >= 0 && remaining > 0.000001; index -= 1) {
    const event = events[index];
    if (event.type !== "rest" || (event.voice ?? "1") !== (voice ?? "1") || (event.staff ?? 1) !== (staff ?? 1)) {
      continue;
    }
    const consumed = Math.min(event.duration, remaining);
    remaining -= consumed;
    const restDuration = event.duration - consumed;
    occupiedIds.delete(event.id);
    if (restDuration <= 0.000001) {
      events.splice(index, 1);
    } else {
      events.splice(index, 1, ...splitRestEvent(event, restDuration, divisions, occupiedIds));
    }
  }
  if (remaining > 0.000001) {
    throw new Error("The target measure does not contain enough available rest duration for this move.");
  }
}

function chordGroupIndexes(events: ScoreEvent[], eventIndex: number) {
  const event = events[eventIndex];
  if (event?.type !== "note") return [eventIndex];
  let anchorIndex = eventIndex;
  while (anchorIndex > 0) {
    const candidate = events[anchorIndex];
    if (candidate.type !== "note" || !candidate.chord) break;
    anchorIndex -= 1;
  }
  const anchor = events[anchorIndex];
  if (anchor?.type !== "note") return [eventIndex];
  const indexes = [anchorIndex];
  for (let index = anchorIndex + 1; index < events.length; index += 1) {
    const member = events[index];
    if (
      member.type !== "note" ||
      !member.chord ||
      (member.voice ?? "1") !== (anchor.voice ?? "1") ||
      (member.staff ?? 1) !== (anchor.staff ?? 1) ||
      Boolean(member.grace) !== Boolean(anchor.grace)
    ) {
      break;
    }
    indexes.push(index);
  }
  return indexes.includes(eventIndex) ? indexes : [eventIndex];
}

function connectedTupletEventIds(score: ScoreJson, eventId: string) {
  const sourceMeasure = score.measures.find((measure) => measure.events.some((event) => event.id === eventId));
  if (!sourceMeasure) return new Set<string>();
  const events = score.measures
    .filter((measure) => measure.partId === sourceMeasure.partId)
    .sort((left, right) => left.sequence - right.sequence)
    .flatMap((measure) => measure.events);
  const active = new Map<string, string[]>();
  const groups: string[][] = [];
  for (const event of events) {
    const context = `${event.voice ?? "1"}:${event.staff ?? 1}`;
    for (const [key, ids] of active) {
      if (key.startsWith(`${context}:`) && ids.at(-1) !== event.id) ids.push(event.id);
    }
    for (const tuplet of event.tuplets ?? []) {
      const key = `${context}:${tuplet.number ?? "1"}`;
      if (tuplet.type === "stop") {
        const ids = active.get(key);
        if (ids) groups.push(ids);
        active.delete(key);
      }
    }
    for (const tuplet of event.tuplets ?? []) {
      if (tuplet.type !== "start") continue;
      active.set(`${context}:${tuplet.number ?? "1"}`, [event.id]);
    }
  }
  groups.push(...active.values());
  return new Set(groups.filter((group) => group.includes(eventId)).flat());
}

function assertCompleteTupletSelection(score: ScoreJson, eventIds: Set<string>) {
  for (const eventId of eventIds) {
    const group = connectedTupletEventIds(score, eventId);
    if (group.size > 1 && [...group].some((groupEventId) => !eventIds.has(groupEventId))) {
      throw new Error("Tuplet edits must include the complete tuplet group to preserve rhythmic structure.");
    }
  }
}

function validateLyrics(input: unknown): ScoreLyric[] | undefined {
  if (input === undefined) {
    return undefined;
  }

  if (!Array.isArray(input)) {
    throw new Error("Lyrics must be an array.");
  }

  if (input.length > 8) {
    throw new Error("A note can include at most 8 lyric lines.");
  }

  const lyrics = input
    .map((item, index) => {
      const lyric = item as { number?: unknown; syllabic?: unknown; text?: unknown } | null;
      const text = typeof lyric?.text === "string" ? lyric.text.trim() : "";

      if (!text) {
        return null;
      }

      if (text.length > 500) {
        throw new Error("Lyric text is too long.");
      }

      const number = typeof lyric?.number === "string" && lyric.number.trim().length > 0 ? lyric.number.trim().slice(0, 20) : String(index + 1);
      const syllabic =
        typeof lyric?.syllabic === "string" && LYRIC_SYLLABICS.has(lyric.syllabic)
          ? lyric.syllabic
          : "single";

      return {
        number,
        syllabic,
        text,
      };
    })
    .filter((lyric): lyric is { number: string; syllabic: string; text: string } => Boolean(lyric));

  return lyrics;
}

function validateTies(input: unknown): ScoreTie[] | undefined {
  if (input === undefined) {
    return undefined;
  }

  if (!Array.isArray(input)) {
    throw new Error("Ties must be an array.");
  }

  const tieTypes = Array.from(
    new Set(
      input.map((item) => {
        const tie = item as { type?: unknown } | null;
        return typeof tie?.type === "string" ? tie.type : "";
      }),
    ),
  ).filter(Boolean);

  if (tieTypes.some((type) => !TIE_TYPES.has(type))) {
    throw new Error("Tie type must be start or stop.");
  }

  return tieTypes.map((type) => ({ type }));
}

function validateSlurs(input: unknown): ScoreSlur[] | undefined {
  if (input === undefined) {
    return undefined;
  }

  if (!Array.isArray(input)) {
    throw new Error("Slurs must be an array.");
  }

  const slursByType = new Map<string, ScoreSlur>();
  for (const item of input) {
    const slur = item as { type?: unknown; number?: unknown } | null;
    const type = typeof slur?.type === "string" ? slur.type : "";

    if (!type) {
      continue;
    }

    if (!SLUR_TYPES.has(type)) {
      throw new Error("Slur type must be start or stop.");
    }

    const number = typeof slur?.number === "string" ? slur.number.trim() : "";
    if (number && !/^[1-9]\d{0,1}$/.test(number)) {
      throw new Error("Slur number must be a positive integer string up to 99.");
    }

    slursByType.set(type, {
      type: type as ScoreSlur["type"],
      ...(number ? { number } : {}),
    });
  }

  return Array.from(slursByType.values());
}

function validateFingerings(input: unknown): string[] | undefined {
  if (input === undefined) {
    return undefined;
  }

  if (!Array.isArray(input)) {
    throw new Error("Fingerings must be an array.");
  }

  if (input.length > 8) {
    throw new Error("A note can include at most 8 fingerings.");
  }

  return input
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .map((fingering) => {
      if (fingering.length > 50) {
        throw new Error("Fingering text is too long.");
      }

      return fingering;
    });
}

function validateArticulations(input: unknown): ScoreArticulation[] | undefined {
  if (input === undefined) {
    return undefined;
  }

  if (!Array.isArray(input)) {
    throw new Error("Articulations must be an array.");
  }

  const types = Array.from(
    new Set(
      input.map((item) => {
        const articulation = item as { type?: unknown } | null;
        return typeof articulation?.type === "string" ? articulation.type : "";
      }),
    ),
  ).filter(Boolean);

  if (types.some((type) => !ARTICULATION_TYPES.has(type))) {
    throw new Error("Articulation type must be accent, staccato, tenuto, breath-mark, or caesura.");
  }

  return types.map((type) => ({ type: type as ScoreArticulation["type"] }));
}

function validateFermatas(input: unknown): ScoreFermata[] | undefined {
  if (input === undefined) {
    return undefined;
  }

  if (!Array.isArray(input)) {
    throw new Error("Fermatas must be an array.");
  }

  if (input.length > 1) {
    throw new Error("Only one fermata is supported per note or rest in the first-pass editor.");
  }

  return input
    .map((item) => {
      const fermata = item as { type?: unknown; shape?: unknown } | null;
      const type = typeof fermata?.type === "string" ? fermata.type.trim() : "";
      const shape = typeof fermata?.shape === "string" ? fermata.shape.trim() : "";

      if (type && !FERMATA_TYPES.has(type)) {
        throw new Error("Fermata type must be upright or inverted.");
      }

      if (shape.length > 40) {
        throw new Error("Fermata shape text is too long.");
      }

      return {
        ...(type ? { type: type as ScoreFermata["type"] } : {}),
        ...(shape ? { shape } : {}),
      };
    })
    .filter((fermata) => fermata.type || fermata.shape);
}

function stableNotationId(value: unknown, fallback: string) {
  const id = typeof value === "string" ? value.trim() : "";
  if (id.length > 160) {
    throw new Error("Notation ids must be at most 160 characters.");
  }
  return id || fallback;
}

function validateTimeModification(input: unknown): ScoreTimeModification | null | undefined {
  if (input === undefined || input === null) return input;
  if (typeof input !== "object" || Array.isArray(input)) throw new Error("Time modification must be an object or null.");
  const value = input as { actualNotes?: unknown; normalNotes?: unknown };
  if (!Number.isInteger(value.actualNotes) || Number(value.actualNotes) < 1 || Number(value.actualNotes) > 64) {
    throw new Error("Tuplet actual notes must be an integer from 1 to 64.");
  }
  if (!Number.isInteger(value.normalNotes) || Number(value.normalNotes) < 1 || Number(value.normalNotes) > 64) {
    throw new Error("Tuplet normal notes must be an integer from 1 to 64.");
  }
  return { actualNotes: Number(value.actualNotes), normalNotes: Number(value.normalNotes) };
}

function validateBeams(input: unknown, eventId: string): ScoreBeam[] | undefined {
  if (input === undefined) return undefined;
  if (!Array.isArray(input) || input.length > 8) throw new Error("Beams must be an array with at most 8 entries.");
  const seenNumbers = new Set<number>();
  return input.map((item, index) => {
    const beam = item as { id?: unknown; number?: unknown; type?: unknown } | null;
    const number = Number(beam?.number);
    const type = typeof beam?.type === "string" ? beam.type : "";
    if (!Number.isInteger(number) || number < 1 || number > 8 || seenNumbers.has(number)) {
      throw new Error("Each beam level must be a unique integer from 1 to 8.");
    }
    if (!BEAM_TYPES.has(type)) throw new Error("Beam type is not supported.");
    seenNumbers.add(number);
    return {
      id: stableNotationId(beam?.id, `${eventId}-beam-${number}-${index + 1}`),
      number,
      type: type as ScoreBeam["type"],
    };
  });
}

function validateTuplets(input: unknown, eventId: string): ScoreTuplet[] | undefined {
  if (input === undefined) return undefined;
  if (!Array.isArray(input) || input.length > 8) throw new Error("Tuplet markers must be an array with at most 8 entries.");
  return input.map((item, index) => {
    const tuplet = item as { id?: unknown; type?: unknown; number?: unknown; bracket?: unknown; showNumber?: unknown } | null;
    const type = typeof tuplet?.type === "string" ? tuplet.type : "";
    if (!TUPLET_TYPES.has(type)) throw new Error("Tuplet type must be start or stop.");
    const number = typeof tuplet?.number === "string" ? tuplet.number.trim() : "";
    if (number && !/^[1-9]\d{0,1}$/.test(number)) throw new Error("Tuplet number must be from 1 to 99.");
    if (tuplet?.bracket !== undefined && typeof tuplet.bracket !== "boolean") throw new Error("Tuplet bracket must be a boolean.");
    const showNumber = typeof tuplet?.showNumber === "string" ? tuplet.showNumber : "";
    if (showNumber && !TUPLET_SHOW_NUMBERS.has(showNumber)) throw new Error("Tuplet show-number value is not supported.");
    return {
      id: stableNotationId(tuplet?.id, `${eventId}-tuplet-${index + 1}`),
      type: type as ScoreTuplet["type"],
      ...(number ? { number } : {}),
      ...(typeof tuplet?.bracket === "boolean" ? { bracket: tuplet.bracket } : {}),
      ...(showNumber ? { showNumber: showNumber as ScoreTuplet["showNumber"] } : {}),
    };
  });
}

function validateGrace(input: unknown, eventId: string): ScoreGrace | null | undefined {
  if (input === undefined || input === null) return input;
  if (typeof input !== "object" || Array.isArray(input)) throw new Error("Grace configuration must be an object or null.");
  const grace = input as { id?: unknown; slash?: unknown; stealTimePrevious?: unknown; stealTimeFollowing?: unknown; makeTime?: unknown };
  if (grace.slash !== undefined && typeof grace.slash !== "boolean") throw new Error("Grace slash must be a boolean.");
  for (const [label, value] of [["steal-time-previous", grace.stealTimePrevious], ["steal-time-following", grace.stealTimeFollowing]] as const) {
    if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100)) {
      throw new Error(`Grace ${label} must be from 0 to 100.`);
    }
  }
  if (grace.makeTime !== undefined && (typeof grace.makeTime !== "number" || !Number.isFinite(grace.makeTime) || grace.makeTime <= 0)) {
    throw new Error("Grace make-time must be a positive number.");
  }
  return {
    id: stableNotationId(grace.id, `${eventId}-grace`),
    ...(typeof grace.slash === "boolean" ? { slash: grace.slash } : {}),
    ...(typeof grace.stealTimePrevious === "number" ? { stealTimePrevious: grace.stealTimePrevious } : {}),
    ...(typeof grace.stealTimeFollowing === "number" ? { stealTimeFollowing: grace.stealTimeFollowing } : {}),
    ...(typeof grace.makeTime === "number" ? { makeTime: grace.makeTime } : {}),
  };
}

function validateOrnaments(input: unknown, eventId: string): ScoreOrnament[] | undefined {
  if (input === undefined) return undefined;
  if (!Array.isArray(input) || input.length > 8) throw new Error("Ornaments must be an array with at most 8 entries.");
  return input.map((item, index) => {
    const ornament = item as { id?: unknown; type?: unknown; placement?: unknown; value?: unknown } | null;
    const type = typeof ornament?.type === "string" ? ornament.type : "";
    if (!ORNAMENT_TYPES.has(type)) throw new Error("Ornament type is not supported.");
    const placement = typeof ornament?.placement === "string" ? ornament.placement : "";
    if (placement && placement !== "above" && placement !== "below") throw new Error("Ornament placement must be above or below.");
    const value = typeof ornament?.value === "string" ? ornament.value.trim() : "";
    if (value.length > 40) throw new Error("Ornament value is too long.");
    return {
      id: stableNotationId(ornament?.id, `${eventId}-ornament-${index + 1}`),
      type: type as ScoreOrnament["type"],
      ...(placement ? { placement: placement as ScoreOrnament["placement"] } : {}),
      ...(value ? { value } : {}),
    };
  });
}

export function validateScoreNotePatch(input: unknown): ScoreNotePatch {
  const patch = input as ScoreNotePatch | null;

  if (!patch || typeof patch.eventId !== "string" || patch.eventId.trim().length === 0) {
    throw new Error("A note eventId is required.");
  }

  if (patch.step !== undefined && !SCORE_PITCH_STEPS.has(patch.step)) {
    throw new Error("Pitch step must be one of A, B, C, D, E, F, G.");
  }

  if (patch.eventType !== undefined && patch.eventType !== "note" && patch.eventType !== "rest") {
    throw new Error("Event type must be note or rest.");
  }

  if (patch.alter !== undefined && (!Number.isInteger(patch.alter) || patch.alter < -2 || patch.alter > 2)) {
    throw new Error("Pitch alter must be an integer from -2 to 2.");
  }

  if (patch.octave !== undefined && (!Number.isInteger(patch.octave) || patch.octave < 0 || patch.octave > 9)) {
    throw new Error("Pitch octave must be an integer from 0 to 9.");
  }

  if (patch.duration !== undefined && (!Number.isFinite(patch.duration) || patch.duration <= 0)) {
    throw new Error("Duration must be a positive number.");
  }

  if (patch.durationType !== undefined && !DURATION_TYPES.has(patch.durationType)) {
    throw new Error("Duration type is not supported.");
  }

  if (patch.dots !== undefined && (!Number.isInteger(patch.dots) || patch.dots < 0 || patch.dots > 4)) {
    throw new Error("Dots must be an integer from 0 to 4.");
  }

  if (patch.voice !== undefined && (typeof patch.voice !== "string" || patch.voice.trim().length === 0 || patch.voice.trim().length > 20)) {
    throw new Error("Voice must be a non-empty string up to 20 characters.");
  }

  if (patch.staff !== undefined && (!Number.isInteger(patch.staff) || patch.staff < 1 || patch.staff > 8)) {
    throw new Error("Staff must be an integer from 1 to 8.");
  }

  if (patch.chord !== undefined && typeof patch.chord !== "boolean") {
    throw new Error("Chord must be a boolean.");
  }

  if (patch.lyricText !== undefined && typeof patch.lyricText !== "string") {
    throw new Error("Lyric text must be a string.");
  }

  if (patch.lyricText !== undefined && patch.lyricText.length > 500) {
    throw new Error("Lyric text is too long.");
  }

  if (patch.fingeringText !== undefined && typeof patch.fingeringText !== "string") {
    throw new Error("Fingering text must be a string.");
  }

  if (patch.fingeringText !== undefined && patch.fingeringText.length > 50) {
    throw new Error("Fingering text is too long.");
  }

  if (patch.measureRest !== undefined && typeof patch.measureRest !== "boolean") {
    throw new Error("Measure rest must be a boolean.");
  }

  const lyrics = validateLyrics(patch.lyrics);
  const fingerings = validateFingerings(patch.fingerings);
  const ties = validateTies(patch.ties);
  const slurs = validateSlurs(patch.slurs);
  const articulations = validateArticulations(patch.articulations);
  const fermatas = validateFermatas(patch.fermatas);
  const timeModification = validateTimeModification(patch.timeModification);
  const beams = validateBeams(patch.beams, patch.eventId);
  const tuplets = validateTuplets(patch.tuplets, patch.eventId);
  const grace = validateGrace(patch.grace, patch.eventId);
  const ornaments = validateOrnaments(patch.ornaments, patch.eventId);

  return {
    eventId: patch.eventId,
    eventType: patch.eventType,
    step: patch.step,
    alter: patch.alter,
    octave: patch.octave,
    duration: patch.duration,
    durationType: patch.durationType,
    dots: patch.dots,
    voice: patch.voice?.trim(),
    staff: patch.staff,
    chord: patch.chord,
    lyricText: patch.lyricText,
    lyrics,
    fingeringText: patch.fingeringText,
    fingerings,
    ties,
    slurs,
    articulations,
    fermatas,
    timeModification,
    beams,
    tuplets,
    grace,
    ornaments,
    measureRest: patch.measureRest,
  };
}

export function validateScoreNoteInsertPatch(input: unknown): ScoreNoteInsertPatch {
  const patch = input as ScoreNoteInsertPatch | null;

  if (!patch || typeof patch.measureId !== "string" || patch.measureId.trim().length === 0) {
    throw new Error("A measureId is required.");
  }

  if (patch.afterEventId !== undefined && (typeof patch.afterEventId !== "string" || patch.afterEventId.trim().length === 0)) {
    throw new Error("afterEventId must be a non-empty string.");
  }

  if (patch.beforeEventId !== undefined && (typeof patch.beforeEventId !== "string" || patch.beforeEventId.trim().length === 0)) {
    throw new Error("beforeEventId must be a non-empty string.");
  }

  validateOptionalPitch(patch);
  validateOptionalDuration(patch);

  if (patch.voice !== undefined && (typeof patch.voice !== "string" || patch.voice.trim().length > 20)) {
    throw new Error("Voice must be a short string.");
  }

  if (patch.staff !== undefined && (!Number.isInteger(patch.staff) || patch.staff < 1 || patch.staff > 8)) {
    throw new Error("Staff must be an integer from 1 to 8.");
  }

  if (patch.chord !== undefined && typeof patch.chord !== "boolean") {
    throw new Error("Chord must be a boolean.");
  }

  return {
    measureId: patch.measureId.trim(),
    afterEventId: patch.afterEventId?.trim(),
    beforeEventId: patch.beforeEventId?.trim(),
    step: patch.step,
    alter: patch.alter,
    octave: patch.octave,
    duration: patch.duration,
    durationType: patch.durationType,
    voice: patch.voice?.trim() || undefined,
    staff: patch.staff,
    chord: patch.chord,
  };
}

export function validateScoreEventDeletePatch(input: unknown): ScoreEventDeletePatch {
  const patch = input as ScoreEventDeletePatch | null;

  if (!patch || typeof patch.eventId !== "string" || patch.eventId.trim().length === 0) {
    throw new Error("An eventId is required.");
  }

  return {
    eventId: patch.eventId.trim(),
  };
}

export function validateScoreEventBatchPatch(input: unknown): ScoreEventBatchPatch {
  const patch = input as ScoreEventBatchPatch | null;
  if (!patch || !["delete", "duplicate", "move"].includes(patch.action)) {
    throw new Error("Batch action must be delete, duplicate, or move.");
  }
  if (!Array.isArray(patch.eventIds) || patch.eventIds.length === 0 || patch.eventIds.length > 128) {
    throw new Error("Batch editing requires from 1 to 128 event ids.");
  }
  const eventIds = Array.from(new Set(patch.eventIds.map((id) => (typeof id === "string" ? id.trim() : ""))));
  if (eventIds.some((id) => id.length === 0)) {
    throw new Error("Every event id must be a non-empty string.");
  }
  if ((patch.action === "duplicate" || patch.action === "move") && (!patch.targetMeasureId || typeof patch.targetMeasureId !== "string")) {
    throw new Error("A targetMeasureId is required when duplicating or moving events.");
  }
  if (patch.balanceMeasures !== undefined && typeof patch.balanceMeasures !== "boolean") {
    throw new Error("Balance measures must be a boolean.");
  }
  if (patch.balanceMeasures && patch.action !== "move") {
    throw new Error("Measure balancing is only available for batch moves.");
  }
  return {
    action: patch.action,
    eventIds,
    targetMeasureId: patch.targetMeasureId?.trim(),
    afterEventId: typeof patch.afterEventId === "string" ? patch.afterEventId.trim() || undefined : undefined,
    balanceMeasures: patch.balanceMeasures,
  };
}

export function validateScoreEventReorderPatch(input: unknown): ScoreEventReorderPatch {
  const patch = input as ScoreEventReorderPatch | null;

  if (!patch || typeof patch.eventId !== "string" || patch.eventId.trim().length === 0) {
    throw new Error("An eventId is required.");
  }

  if (typeof patch.targetMeasureId !== "string" || patch.targetMeasureId.trim().length === 0) {
    throw new Error("A targetMeasureId is required.");
  }

  if (!Number.isInteger(patch.targetIndex) || patch.targetIndex < 0 || patch.targetIndex > 256) {
    throw new Error("Target index must be an integer from 0 to 256.");
  }

  if (patch.semitoneDelta !== undefined && (!Number.isInteger(patch.semitoneDelta) || patch.semitoneDelta < -48 || patch.semitoneDelta > 48)) {
    throw new Error("Semitone delta must be an integer from -48 to 48.");
  }

  if (patch.balanceMeasures !== undefined && typeof patch.balanceMeasures !== "boolean") {
    throw new Error("Balance measures must be a boolean.");
  }

  return {
    eventId: patch.eventId.trim(),
    targetMeasureId: patch.targetMeasureId.trim(),
    targetIndex: patch.targetIndex,
    semitoneDelta: patch.semitoneDelta,
    balanceMeasures: patch.balanceMeasures,
  };
}

export function validateScoreMeasureAttributesPatch(input: unknown): ScoreMeasureAttributesPatch {
  const patch = input as ScoreMeasureAttributesPatch | null;

  if (!patch || typeof patch.measureId !== "string" || patch.measureId.trim().length === 0) {
    throw new Error("A measureId is required.");
  }

  if (patch.divisions !== undefined && (!Number.isInteger(patch.divisions) || patch.divisions <= 0 || patch.divisions > 4096)) {
    throw new Error("Divisions must be a positive integer up to 4096.");
  }

  if (patch.keyFifths !== undefined && (!Number.isInteger(patch.keyFifths) || patch.keyFifths < -7 || patch.keyFifths > 7)) {
    throw new Error("Key fifths must be an integer from -7 to 7.");
  }

  if (patch.keyMode !== undefined && !KEY_MODES.has(patch.keyMode)) {
    throw new Error("Key mode must be major or minor.");
  }

  if (patch.timeBeats !== undefined && (!/^\d{1,2}$/.test(patch.timeBeats) || Number(patch.timeBeats) <= 0)) {
    throw new Error("Time beats must be a positive integer string.");
  }

  if (patch.timeBeatType !== undefined && !/^(1|2|4|8|16|32|64)$/.test(patch.timeBeatType)) {
    throw new Error("Time beat type must be one of 1, 2, 4, 8, 16, 32, or 64.");
  }

  if (patch.clefSign !== undefined && !CLEF_SIGNS.has(patch.clefSign)) {
    throw new Error("Clef sign must be G, F, C, percussion, or TAB.");
  }

  if (patch.clefLine !== undefined && (!Number.isInteger(patch.clefLine) || patch.clefLine < 1 || patch.clefLine > 5)) {
    throw new Error("Clef line must be an integer from 1 to 5.");
  }

  if (patch.clefOctaveChange !== undefined && (!Number.isInteger(patch.clefOctaveChange) || patch.clefOctaveChange < -2 || patch.clefOctaveChange > 2)) {
    throw new Error("Clef octave change must be an integer from -2 to 2.");
  }

  if (patch.newSystem !== undefined && typeof patch.newSystem !== "boolean") {
    throw new Error("New system must be a boolean.");
  }
  if (patch.newPage !== undefined && typeof patch.newPage !== "boolean") {
    throw new Error("New page must be a boolean.");
  }
  if (patch.measureWidth !== undefined && patch.measureWidth !== null && (!Number.isFinite(patch.measureWidth) || patch.measureWidth < 20 || patch.measureWidth > 2000)) {
    throw new Error("Measure width must be from 20 to 2000 tenths, or null to clear it.");
  }
  if (patch.staffDistance !== undefined && patch.staffDistance !== null && (!Number.isFinite(patch.staffDistance) || patch.staffDistance < 10 || patch.staffDistance > 500)) {
    throw new Error("Staff distance must be from 10 to 500 tenths, or null to clear it.");
  }

  return {
    measureId: patch.measureId,
    divisions: patch.divisions,
    keyFifths: patch.keyFifths,
    keyMode: patch.keyMode,
    timeBeats: patch.timeBeats,
    timeBeatType: patch.timeBeatType,
    clefSign: patch.clefSign,
    clefLine: patch.clefLine,
    clefOctaveChange: patch.clefOctaveChange,
    newSystem: patch.newSystem,
    newPage: patch.newPage,
    measureWidth: patch.measureWidth,
    staffDistance: patch.staffDistance,
  };
}

export function validateScorePartPatch(input: unknown): ScorePartPatch {
  const patch = input as ScorePartPatch | null;

  if (!patch || typeof patch.partId !== "string" || patch.partId.trim().length === 0) {
    throw new Error("A partId is required.");
  }

  const name = typeof patch.name === "string" ? patch.name.trim() : undefined;
  const abbreviation = typeof patch.abbreviation === "string" ? patch.abbreviation.trim() : undefined;
  const midiProgram = patch.midiProgram;

  if (name !== undefined && (name.length === 0 || name.length > 120)) {
    throw new Error("Part name must be from 1 to 120 characters.");
  }

  if (abbreviation !== undefined && abbreviation.length > 40) {
    throw new Error("Part abbreviation is too long.");
  }

  if (midiProgram !== undefined && midiProgram !== null && (!Number.isInteger(midiProgram) || midiProgram < 1 || midiProgram > 128)) {
    throw new Error("MIDI program must be an integer from 1 to 128.");
  }

  return {
    partId: patch.partId,
    name,
    abbreviation,
    midiProgram,
  };
}

export function validateScoreHarmonyPatch(input: unknown): ScoreHarmonyPatch {
  const patch = input as ScoreHarmonyPatch | null;

  if (!patch || typeof patch.measureId !== "string" || patch.measureId.trim().length === 0) {
    throw new Error("A measureId is required.");
  }

  if (patch.clear === true) {
    return {
      measureId: patch.measureId,
      clear: true,
    };
  }

  if (!patch.rootStep || !SCORE_PITCH_STEPS.has(patch.rootStep)) {
    throw new Error("Harmony root step must be one of A, B, C, D, E, F, G.");
  }

  if (patch.rootAlter !== undefined && (!Number.isInteger(patch.rootAlter) || patch.rootAlter < -2 || patch.rootAlter > 2)) {
    throw new Error("Harmony root alter must be an integer from -2 to 2.");
  }

  if (!patch.kind || !HARMONY_KINDS.has(patch.kind)) {
    throw new Error("Harmony kind is not supported.");
  }

  if (patch.text !== undefined && typeof patch.text !== "string") {
    throw new Error("Harmony display text must be a string.");
  }

  if (patch.text !== undefined && patch.text.length > 100) {
    throw new Error("Harmony display text is too long.");
  }

  return {
    measureId: patch.measureId,
    rootStep: patch.rootStep,
    rootAlter: patch.rootAlter ?? 0,
    kind: patch.kind,
    text: patch.text,
  };
}

export function validateScoreBarlinePatch(input: unknown): ScoreBarlinePatch {
  const patch = input as ScoreBarlinePatch | null;

  if (!patch || typeof patch.measureId !== "string" || patch.measureId.trim().length === 0) {
    throw new Error("A measureId is required.");
  }

  if (patch.clear === true) {
    return {
      measureId: patch.measureId,
      clear: true,
    };
  }

  if (!patch.location || !BARLINE_LOCATIONS.has(patch.location)) {
    throw new Error("Barline location must be left, right, or middle.");
  }

  if (patch.barStyle !== undefined && !BARLINE_STYLES.has(patch.barStyle)) {
    throw new Error("Barline style is not supported.");
  }

  if (patch.repeatDirection !== undefined && !REPEAT_DIRECTIONS.has(patch.repeatDirection)) {
    throw new Error("Repeat direction must be forward, backward, or none.");
  }
  if (patch.repeatTimes !== undefined && (!Number.isInteger(patch.repeatTimes) || patch.repeatTimes < 2 || patch.repeatTimes > 16)) {
    throw new Error("Repeat times must be an integer from 2 to 16.");
  }

  return {
    measureId: patch.measureId,
    location: patch.location,
    barStyle: patch.barStyle,
    repeatDirection: patch.repeatDirection,
    repeatTimes: patch.repeatTimes,
  };
}

export function validateScoreDynamicPatch(input: unknown): ScoreDynamicPatch {
  const patch = input as ScoreDynamicPatch | null;

  if (!patch || typeof patch.measureId !== "string" || patch.measureId.trim().length === 0) {
    throw new Error("A measureId is required.");
  }

  if (patch.clear === true) {
    return {
      measureId: patch.measureId,
      clear: true,
    };
  }

  if (!patch.value || !DYNAMIC_VALUES.has(patch.value)) {
    throw new Error("Dynamic value must be one of ppp, pp, p, mp, mf, f, ff, or fff.");
  }

  if (patch.placement !== undefined && !DYNAMIC_PLACEMENTS.has(patch.placement)) {
    throw new Error("Dynamic placement must be above or below.");
  }

  return {
    measureId: patch.measureId,
    value: patch.value,
    placement: patch.placement,
  };
}

export function validateScoreTempoPatch(input: unknown): ScoreTempoPatch {
  const patch = input as ScoreTempoPatch | null;

  if (!patch || typeof patch.measureId !== "string" || patch.measureId.trim().length === 0) {
    throw new Error("A measureId is required.");
  }

  if (patch.clear === true) {
    return {
      measureId: patch.measureId,
      clear: true,
    };
  }

  if (patch.bpm === undefined || !Number.isFinite(patch.bpm) || patch.bpm < 20 || patch.bpm > 400) {
    throw new Error("Tempo BPM must be a number from 20 to 400.");
  }

  if (patch.beatUnit !== undefined && !TEMPO_BEAT_UNITS.has(patch.beatUnit)) {
    throw new Error("Tempo beat unit is not supported.");
  }

  if (patch.placement !== undefined && !DYNAMIC_PLACEMENTS.has(patch.placement)) {
    throw new Error("Tempo placement must be above or below.");
  }

  if (patch.tempoId !== undefined && (typeof patch.tempoId !== "string" || patch.tempoId.trim().length === 0 || patch.tempoId.length > 160)) {
    throw new Error("Tempo id is invalid.");
  }

  if (patch.offsetDivisions !== undefined && (!Number.isFinite(patch.offsetDivisions) || Math.abs(patch.offsetDivisions) > 1_000_000)) {
    throw new Error("Tempo offset must be a finite division value within the measure range.");
  }

  return {
    measureId: patch.measureId,
    tempoId: patch.tempoId,
    bpm: Math.round(patch.bpm),
    beatUnit: patch.beatUnit,
    placement: patch.placement,
    offsetDivisions: patch.offsetDivisions,
  };
}

export function validateScoreWedgePatch(input: unknown): ScoreWedgePatch {
  const patch = input as ScoreWedgePatch | null;

  if (!patch || typeof patch.measureId !== "string" || patch.measureId.trim().length === 0) {
    throw new Error("A measureId is required.");
  }

  if (patch.clear === true) {
    return {
      measureId: patch.measureId,
      clear: true,
    };
  }

  if (!patch.type || !WEDGE_TYPES.has(patch.type)) {
    throw new Error("Wedge type must be crescendo, diminuendo, or stop.");
  }

  if (patch.placement !== undefined && !DYNAMIC_PLACEMENTS.has(patch.placement)) {
    throw new Error("Wedge placement must be above or below.");
  }

  if (patch.number !== undefined && patch.number.trim().length > 0 && !/^[1-9]\d{0,1}$/.test(patch.number.trim())) {
    throw new Error("Wedge number must be a positive integer string up to 99.");
  }

  return {
    measureId: patch.measureId,
    type: patch.type,
    placement: patch.placement,
    number: patch.number?.trim() || undefined,
  };
}

export function applyScoreNotePatch(input: {
  score: ScoreJson;
  patch: ScoreNotePatch;
  generatedAt?: string;
}): ScoreJson {
  let updated = false;
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const hasRhythmPatch =
    input.patch.duration !== undefined ||
    input.patch.durationType !== undefined ||
    input.patch.dots !== undefined ||
    input.patch.timeModification !== undefined;
  const chordRhythmEventIds = new Set<string>();
  if (hasRhythmPatch && input.patch.eventType !== "rest" && input.patch.chord !== false) {
    for (const measure of input.score.measures) {
      const eventIndex = measure.events.findIndex((event) => event.id === input.patch.eventId);
      if (eventIndex < 0) continue;
      for (const index of chordGroupIndexes(measure.events, eventIndex)) {
        chordRhythmEventIds.add(measure.events[index].id);
      }
      break;
    }
  }

  const measures = input.score.measures.map((measure) => ({
    ...measure,
    events: measure.events.map((event): ScoreEvent => {
      if (event.id !== input.patch.eventId && chordRhythmEventIds.has(event.id)) {
        return {
          ...event,
          duration: input.patch.duration ?? event.duration,
          durationType: input.patch.durationType ?? event.durationType,
          dots: input.patch.dots ?? event.dots,
          timeModification:
            input.patch.timeModification === null ? undefined : input.patch.timeModification ?? event.timeModification,
        };
      }
      if (event.id !== input.patch.eventId) {
        return event;
      }

      updated = true;
      const nextEventType = input.patch.eventType ?? event.type;
      const duration = input.patch.duration ?? event.duration;
      const durationType = input.patch.durationType ?? event.durationType;

      if (nextEventType === "rest") {
        const existingFermatas = event.fermatas;
        return {
          id: event.id,
          type: "rest" as const,
          duration,
          durationType,
          dots: input.patch.dots ?? event.dots,
          voice: input.patch.voice ?? event.voice,
          staff: input.patch.staff ?? event.staff,
          measureRest: input.patch.measureRest ?? (event.type === "rest" ? event.measureRest : false),
          fermatas: input.patch.fermatas ?? existingFermatas,
          timeModification: input.patch.timeModification === null ? undefined : input.patch.timeModification ?? event.timeModification,
          beams: input.patch.beams ?? event.beams,
          tuplets: input.patch.tuplets ?? event.tuplets,
        };
      }

      const existingPitch =
        event.type === "note"
          ? event.pitch
          : {
              step: "C" as ScorePitchStep,
              alter: 0,
              octave: 4,
            };
      const existingLyrics = event.type === "note" ? event.lyrics : [];
      const existingFingerings = event.type === "note" ? event.fingerings : undefined;
      const existingTies = event.type === "note" ? event.ties : [];
      const existingSlurs = event.type === "note" ? event.slurs : undefined;
      const existingArticulations = event.type === "note" ? event.articulations : undefined;
      const existingFermatas = event.fermatas;
      const existingTimeModification = event.timeModification;
      const existingBeams = event.beams;
      const existingTuplets = event.tuplets;
      const existingGrace = event.type === "note" ? event.grace : undefined;
      const existingOrnaments = event.type === "note" ? event.ornaments : undefined;

      return {
        ...event,
        type: "note" as const,
        pitch: {
          ...existingPitch,
          step: input.patch.step ?? existingPitch.step,
          alter: input.patch.alter ?? existingPitch.alter,
          octave: input.patch.octave ?? existingPitch.octave,
        },
        duration,
        durationType,
        dots: input.patch.dots ?? event.dots,
        voice: input.patch.voice ?? event.voice,
        staff: input.patch.staff ?? event.staff,
        chord: input.patch.chord ?? (event.type === "note" ? event.chord : false),
        ties: input.patch.ties ?? existingTies,
        slurs: input.patch.slurs ?? existingSlurs,
        articulations: input.patch.articulations ?? existingArticulations,
        fermatas: input.patch.fermatas ?? existingFermatas,
        timeModification: input.patch.timeModification === null ? undefined : input.patch.timeModification ?? existingTimeModification,
        beams: input.patch.beams ?? existingBeams,
        tuplets: input.patch.tuplets ?? existingTuplets,
        grace: input.patch.grace === null ? undefined : input.patch.grace ?? existingGrace,
        ornaments: input.patch.ornaments ?? existingOrnaments,
        lyrics:
          input.patch.lyrics !== undefined
            ? input.patch.lyrics
            : input.patch.lyricText === undefined
              ? existingLyrics
              : input.patch.lyricText.trim().length > 0
                ? [
                    {
                      number: existingLyrics[0]?.number ?? "1",
                      syllabic: existingLyrics[0]?.syllabic ?? "single",
                      text: input.patch.lyricText.trim(),
                    },
                  ]
                : [],
        fingerings:
          input.patch.fingerings !== undefined
            ? input.patch.fingerings
            : input.patch.fingeringText === undefined
              ? existingFingerings
              : input.patch.fingeringText.trim().length > 0
                ? [input.patch.fingeringText.trim()]
                : [],
      };
    }),
  }));

  if (!updated) {
    throw new Error("Score event was not found in the current score revision.");
  }

  return {
    ...input.score,
    metadata: {
      ...input.score.metadata,
      warnings: [...input.score.metadata.warnings, `Manual score event correction applied to ${input.patch.eventId} at ${generatedAt}.`],
    },
    measures,
  };
}

export function applyScoreNoteInsertPatch(input: {
  score: ScoreJson;
  patch: ScoreNoteInsertPatch;
  generatedAt?: string;
}): ScoreJson {
  let updated = false;
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const targetMeasure = input.score.measures.find((measure) => measure.id === input.patch.measureId);

  if (!targetMeasure) {
    throw new Error("Target measure was not found in the current score revision.");
  }

  const newEvent: ScoreEvent = {
    id: createManualEventId(input.score, input.patch.measureId, generatedAt),
    type: "note",
    pitch: {
      step: input.patch.step ?? "C",
      alter: input.patch.alter ?? 0,
      octave: input.patch.octave ?? 4,
    },
    duration: input.patch.duration ?? 1,
    durationType: input.patch.durationType ?? "quarter",
    dots: 0,
    voice: input.patch.voice,
    staff: input.patch.staff,
    accidental: accidentalFromAlter(input.patch.alter ?? 0),
    chord: input.patch.chord ?? false,
    ties: [],
    lyrics: [],
  };

  const measures = input.score.measures.map((measure) => {
    if (measure.id !== input.patch.measureId) {
      return measure;
    }

    updated = true;
    const events = [...measure.events];
    let insertIndex = events.length;

    if (input.patch.beforeEventId) {
      const beforeIndex = events.findIndex((event) => event.id === input.patch.beforeEventId);
      if (beforeIndex < 0) {
        throw new Error("beforeEventId was not found in the target measure.");
      }
      insertIndex = beforeIndex;
    } else if (input.patch.afterEventId) {
      const afterIndex = events.findIndex((event) => event.id === input.patch.afterEventId);
      if (afterIndex < 0) {
        throw new Error("afterEventId was not found in the target measure.");
      }
      insertIndex = afterIndex + 1;
    }

    events.splice(insertIndex, 0, newEvent);
    return {
      ...measure,
      events,
    };
  });

  if (!updated) {
    throw new Error("Target measure was not found in the current score revision.");
  }

  return {
    ...input.score,
    metadata: {
      ...input.score.metadata,
      noteCount: input.score.metadata.noteCount + 1,
      warnings: [...input.score.metadata.warnings, `Manual note insertion applied to ${input.patch.measureId} at ${generatedAt}.`],
    },
    measures,
  };
}

export function applyScoreEventDeletePatch(input: {
  score: ScoreJson;
  patch: ScoreEventDeletePatch;
  generatedAt?: string;
}): ScoreJson {
  let deletedEvent: ScoreEvent | null = null;
  let deletedEventType: ScoreEvent["type"] | null = null;
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  const measures = input.score.measures.map((measure) => {
    const events = measure.events.filter((event) => {
      if (event.id !== input.patch.eventId) {
        return true;
      }
      deletedEvent = event;
      deletedEventType = event.type;
      return false;
    });

    return events.length === measure.events.length
      ? measure
      : {
          ...measure,
          events,
        };
  });

  if (!deletedEvent) {
    throw new Error("Score event was not found in the current score revision.");
  }

  return {
    ...input.score,
    metadata: {
      ...input.score.metadata,
      noteCount: Math.max(0, input.score.metadata.noteCount - (deletedEventType === "note" ? 1 : 0)),
      restCount: Math.max(0, input.score.metadata.restCount - (deletedEventType === "rest" ? 1 : 0)),
      warnings: [...input.score.metadata.warnings, `Manual score event deletion applied to ${input.patch.eventId} at ${generatedAt}.`],
    },
    measures,
  };
}

export function applyScoreEventBatchPatch(input: {
  score: ScoreJson;
  patch: ScoreEventBatchPatch;
  generatedAt?: string;
}): ScoreJson {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const requestedIds = new Set(input.patch.eventIds);
  const sourceEvents = input.score.measures.flatMap((measure) => measure.events).filter((event) => requestedIds.has(event.id));
  if (sourceEvents.length !== requestedIds.size) {
    throw new Error("One or more score events were not found in the current revision.");
  }
  assertCompleteTupletSelection(input.score, requestedIds);

  if (input.patch.action === "delete") {
    const noteCount = sourceEvents.filter((event) => event.type === "note").length;
    const restCount = sourceEvents.length - noteCount;
    return {
      ...input.score,
      metadata: {
        ...input.score.metadata,
        noteCount: Math.max(0, input.score.metadata.noteCount - noteCount),
        restCount: Math.max(0, input.score.metadata.restCount - restCount),
        warnings: [...input.score.metadata.warnings, `Batch deletion of ${sourceEvents.length} events applied at ${generatedAt}.`],
      },
      measures: input.score.measures.map((measure) => ({ ...measure, events: measure.events.filter((event) => !requestedIds.has(event.id)) })),
    };
  }

  const score = structuredClone(input.score);
  const targetMeasure = score.measures.find((measure) => measure.id === input.patch.targetMeasureId);
  if (!targetMeasure) {
    throw new Error("Target measure was not found in the current score revision.");
  }
  const sourcePartIds = new Set(
    score.measures.filter((measure) => measure.events.some((event) => requestedIds.has(event.id))).map((measure) => measure.partId),
  );
  if (sourcePartIds.size !== 1 || !sourcePartIds.has(targetMeasure.partId)) {
    throw new Error("Batch events can only be pasted within the same part.");
  }
  if (input.patch.action === "move" && input.patch.afterEventId && requestedIds.has(input.patch.afterEventId)) {
    throw new Error("The paste anchor cannot be part of the moved selection.");
  }
  const sourceMeasures = score.measures.filter((measure) => measure.events.some((event) => requestedIds.has(event.id)));
  const balancedCrossMeasureMove =
    input.patch.action === "move" && input.patch.balanceMeasures === true && sourceMeasures.every((measure) => measure.id !== targetMeasure.id);
  if (input.patch.action === "move" && input.patch.balanceMeasures && sourceMeasures.length !== 1) {
    throw new Error("Balanced batch moves must originate from one measure.");
  }
  const sourceMeasure = sourceMeasures[0];
  const sourceInsertIndex = sourceMeasure
    ? Math.min(...sourceMeasure.events.map((event, index) => requestedIds.has(event.id) ? index : Number.POSITIVE_INFINITY))
    : 0;
  const sourceDurationBeforeMove = sourceMeasure?.events.reduce((sum, event) => sum + rhythmicDuration(event), 0) ?? 0;
  const timingEvents = sourceEvents.filter((event) => rhythmicDuration(event) > 0.000001);
  const timingContexts = new Set(timingEvents.map((event) => `${event.voice ?? "1"}:${event.staff ?? 1}`));
  if (balancedCrossMeasureMove && timingContexts.size > 1) {
    throw new Error("Balanced batch moves must use one voice and staff.");
  }
  if (input.patch.action === "move") {
    for (const measure of score.measures) {
      measure.events = measure.events.filter((event) => !requestedIds.has(event.id));
      normalizeChordSequence(measure.events);
    }
  }
  const reservedEventIds = new Set(score.measures.flatMap((measure) => measure.events.map((event) => event.id)));
  const insertedEvents = sourceEvents.map((sourceEvent, index) => {
    const inserted = structuredClone(sourceEvent);
    if (input.patch.action === "duplicate") {
      inserted.id = createManualEventId(score, targetMeasure.id, `${generatedAt}-${index}`, reservedEventIds);
      renewNestedEventIds(inserted);
    }
    delete inserted.recognition;
    return inserted;
  });
  if (insertedEvents[0]?.type === "note" && insertedEvents[0].chord) insertedEvents[0].chord = false;

  if (balancedCrossMeasureMove && sourceMeasure) {
    const sourceTiming = measureCapacity(input.score, sourceMeasure.id);
    const targetTiming = measureCapacity(input.score, targetMeasure.id);
    if (!sourceTiming || !targetTiming) throw new Error("Measure timing is required to balance a cross-measure batch move.");
    const sourceDurationAfterMove = sourceMeasure.events.reduce((sum, event) => sum + rhythmicDuration(event), 0);
    const sourceGap = Math.max(0, sourceDurationBeforeMove - sourceDurationAfterMove);
    const movedDuration = insertedEvents.reduce((sum, event) => sum + rhythmicDuration(event), 0);
    const targetDuration = targetMeasure.events.reduce((sum, event) => sum + rhythmicDuration(event), 0);
    const overflow = Math.max(0, targetDuration + movedDuration - targetTiming.duration);
    const timingEvent = timingEvents[0] ?? insertedEvents[0];
    if (overflow > 0.000001) {
      consumeRestDuration(targetMeasure.events, overflow, timingEvent?.voice, timingEvent?.staff, targetTiming.divisions);
    }
    if (sourceGap > 0.000001) {
      const sourceRests = decomposeRestDuration(sourceGap, sourceTiming.divisions).map(
        (fragment, index): ScoreEvent => ({
          id: createManualEventId(input.score, sourceMeasure.id, `${generatedAt}-batch-balance-${index + 1}`, reservedEventIds),
          type: "rest",
          ...fragment,
          voice: timingEvent?.voice,
          staff: timingEvent?.staff,
          measureRest: false,
        }),
      );
      sourceMeasure.events.splice(Math.min(sourceInsertIndex, sourceMeasure.events.length), 0, ...sourceRests);
    }
  }

  let insertIndex = balancedCrossMeasureMove ? 0 : targetMeasure.events.length;
  if (input.patch.afterEventId) {
    const anchorIndex = targetMeasure.events.findIndex((event) => event.id === input.patch.afterEventId);
    if (anchorIndex < 0) throw new Error("afterEventId was not found in the target measure.");
    insertIndex = anchorIndex + 1;
  }
  targetMeasure.events.splice(insertIndex, 0, ...insertedEvents);
  normalizeChordSequence(targetMeasure.events);
  if (balancedCrossMeasureMove && sourceMeasure) {
    const sourceTiming = measureCapacity(input.score, sourceMeasure.id);
    const targetTiming = measureCapacity(input.score, targetMeasure.id);
    if (sourceTiming) normalizeRestsByMeter(sourceMeasure.events, sourceTiming, sourceTiming.beats, sourceTiming.beatType);
    if (targetTiming) normalizeRestsByMeter(targetMeasure.events, targetTiming, targetTiming.beats, targetTiming.beatType);
  }
  score.metadata.noteCount = score.measures.reduce((count, measure) => count + measure.events.filter((event) => event.type === "note").length, 0);
  score.metadata.restCount = score.measures.reduce((count, measure) => count + measure.events.filter((event) => event.type === "rest").length, 0);
  score.metadata.warnings = [
    ...score.metadata.warnings,
    `Batch ${input.patch.action === "duplicate" ? "duplication" : "move"} of ${insertedEvents.length} events applied at ${generatedAt}.`,
  ];
  return score;
}

export function applyScoreEventReorderPatch(input: {
  score: ScoreJson;
  patch: ScoreEventReorderPatch;
  generatedAt?: string;
}): ScoreJson {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const sourceMeasureIndex = input.score.measures.findIndex((measure) => measure.events.some((event) => event.id === input.patch.eventId));
  const targetMeasureIndex = input.score.measures.findIndex((measure) => measure.id === input.patch.targetMeasureId);

  if (sourceMeasureIndex < 0) {
    throw new Error("Score event was not found in the current score revision.");
  }

  if (targetMeasureIndex < 0) {
    throw new Error("Target measure was not found in the current score revision.");
  }

  const sourceMeasure = input.score.measures[sourceMeasureIndex];
  const targetMeasure = input.score.measures[targetMeasureIndex];

  if (sourceMeasure.partId !== targetMeasure.partId) {
    throw new Error("Events can only be reordered within the same part.");
  }

  const originalSourceEventIndex = sourceMeasure.events.findIndex((event) => event.id === input.patch.eventId);
  const movedToAnotherPosition = sourceMeasureIndex !== targetMeasureIndex || input.patch.targetIndex !== originalSourceEventIndex;
  const connectedTuplet = connectedTupletEventIds(input.score, input.patch.eventId);
  if (movedToAnotherPosition && connectedTuplet.size > 1) {
    throw new Error("Tuplet events must be moved as a complete multi-selection to preserve rhythmic structure.");
  }

  const measures = structuredClone(input.score.measures);
  const sourceEvents = measures[sourceMeasureIndex].events;
  const sourceDurationBeforeMove = sourceEvents.reduce((sum, item) => sum + rhythmicDuration(item), 0);
  const sourceEventIndex = sourceEvents.findIndex((event) => event.id === input.patch.eventId);
  const [sourceEvent] = sourceEvents.splice(sourceEventIndex, 1);
  normalizeChordSequence(sourceEvents);
  const event = structuredClone(sourceEvent);
  if (input.patch.semitoneDelta && event.type === "note") {
    const pitch = pitchFromMidi(pitchToMidi(event.pitch) + input.patch.semitoneDelta);
    event.pitch = pitch;
    event.accidental = accidentalFromAlter(pitch.alter);
  }
  const targetEvents = measures[targetMeasureIndex].events;
  if (movedToAnotherPosition && event.type === "note" && event.chord) {
    event.chord = false;
  }
  if (input.patch.balanceMeasures && sourceMeasureIndex !== targetMeasureIndex) {
    const sourceTiming = measureCapacity(input.score, sourceMeasure.id);
    const targetTiming = measureCapacity(input.score, targetMeasure.id);
    if (!sourceTiming || !targetTiming) {
      throw new Error("Measure timing is required to balance a cross-measure move.");
    }
    const sourceDurationAfterMove = sourceEvents.reduce((sum, sourceItem) => sum + rhythmicDuration(sourceItem), 0);
    const sourceGap = Math.max(0, sourceDurationBeforeMove - sourceDurationAfterMove);
    const movedDuration = rhythmicDuration(event);
    const targetDuration = targetEvents.reduce((sum, targetEvent) => sum + rhythmicDuration(targetEvent), 0);
    const overflow = Math.max(0, targetDuration + movedDuration - targetTiming.duration);
    if (overflow > 0.000001) {
      consumeRestDuration(targetEvents, overflow, event.voice, event.staff, targetTiming.divisions);
    }
    if (sourceGap > 0.000001) {
      const reservedEventIds = new Set(measures.flatMap((measure) => measure.events.map((event) => event.id)));
      const sourceRests = decomposeRestDuration(sourceGap, sourceTiming.divisions).map(
        (fragment, index): ScoreEvent => ({
          id: createManualEventId(input.score, sourceMeasure.id, `${generatedAt}-balance-${index + 1}`, reservedEventIds),
          type: "rest",
          ...fragment,
          voice: event.voice,
          staff: event.staff,
          measureRest: false,
        }),
      );
      sourceEvents.splice(sourceEventIndex, 0, ...sourceRests);
    }
  }
  const targetIndex = Math.min(targetEvents.length, Math.max(0, input.patch.targetIndex));
  targetEvents.splice(targetIndex, 0, event);
  normalizeChordSequence(targetEvents);
  if (input.patch.balanceMeasures && sourceMeasureIndex !== targetMeasureIndex) {
    const sourceTiming = measureCapacity(input.score, sourceMeasure.id);
    const targetTiming = measureCapacity(input.score, targetMeasure.id);
    if (sourceTiming) normalizeRestsByMeter(sourceEvents, sourceTiming, sourceTiming.beats, sourceTiming.beatType);
    if (targetTiming) normalizeRestsByMeter(targetEvents, targetTiming, targetTiming.beats, targetTiming.beatType);
  }

  const noteCount = measures.reduce((count, measure) => count + measure.events.filter((item) => item.type === "note").length, 0);
  const restCount = measures.reduce((count, measure) => count + measure.events.filter((item) => item.type === "rest").length, 0);

  return {
    ...input.score,
    metadata: {
      ...input.score.metadata,
      noteCount,
      restCount,
      warnings: [
        ...input.score.metadata.warnings,
        `Manual score event move applied to ${input.patch.eventId}${input.patch.semitoneDelta ? ` with ${input.patch.semitoneDelta} semitone pitch change` : ""} at ${generatedAt}.`,
      ],
    },
    measures,
  };
}

function normalizeChordSequence(events: ScoreEvent[]) {
  let previous: ScoreEvent | undefined;
  for (const event of events) {
    if (event.type === "note" && event.chord) {
      const canAttach =
        previous?.type === "note" &&
        (previous.voice ?? "1") === (event.voice ?? "1") &&
        (previous.staff ?? 1) === (event.staff ?? 1) &&
        Boolean(previous.grace) === Boolean(event.grace);
      if (!canAttach) event.chord = false;
    }
    previous = event;
  }
}

export function applyScoreHarmonyPatch(input: {
  score: ScoreJson;
  patch: ScoreHarmonyPatch;
  generatedAt?: string;
}): ScoreJson {
  let updated = false;
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  const measures = input.score.measures.map((measure) => {
    if (measure.id !== input.patch.measureId) {
      return measure;
    }

    updated = true;
    const existing = measure.harmonies?.[0];
    return {
      ...measure,
      harmonies:
        input.patch.clear === true
          ? []
          : [
              {
                id: existing?.id ?? `${measure.id}-h1`,
                rootStep: input.patch.rootStep!,
                rootAlter: input.patch.rootAlter ?? 0,
                kind: input.patch.kind ?? "major",
                text: input.patch.text?.trim() || undefined,
              },
            ],
    };
  });

  if (!updated) {
    throw new Error("Measure was not found in the current score revision.");
  }

  return {
    ...input.score,
    metadata: {
      ...input.score.metadata,
      warnings: [...input.score.metadata.warnings, `Manual harmony correction applied to ${input.patch.measureId} at ${generatedAt}.`],
    },
    measures,
  };
}

export function applyScoreBarlinePatch(input: {
  score: ScoreJson;
  patch: ScoreBarlinePatch;
  generatedAt?: string;
}): ScoreJson {
  let updated = false;
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  const measures = input.score.measures.map((measure) => {
    if (measure.id !== input.patch.measureId) {
      return measure;
    }

    updated = true;
    const existing = measure.barlines?.[0];
    return {
      ...measure,
      barlines:
        input.patch.clear === true
          ? []
          : [
              {
                id: existing?.id ?? `${measure.id}-b1`,
                location: input.patch.location ?? "right",
                barStyle: input.patch.barStyle === "none" ? undefined : input.patch.barStyle,
                repeatDirection: input.patch.repeatDirection === "none" ? undefined : input.patch.repeatDirection,
                repeatTimes: input.patch.repeatDirection === "backward" ? input.patch.repeatTimes ?? existing?.repeatTimes : undefined,
                ...(existing?.ending ? { ending: existing.ending } : {}),
              },
            ],
    };
  });

  if (!updated) {
    throw new Error("Measure was not found in the current score revision.");
  }

  return {
    ...input.score,
    metadata: {
      ...input.score.metadata,
      warnings: [...input.score.metadata.warnings, `Manual barline correction applied to ${input.patch.measureId} at ${generatedAt}.`],
    },
    measures,
  };
}

export function applyScoreDynamicPatch(input: {
  score: ScoreJson;
  patch: ScoreDynamicPatch;
  generatedAt?: string;
}): ScoreJson {
  let updated = false;
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  const measures = input.score.measures.map((measure) => {
    if (measure.id !== input.patch.measureId) {
      return measure;
    }

    updated = true;
    const existing = measure.dynamics?.[0];
    return {
      ...measure,
      dynamics:
        input.patch.clear === true
          ? []
          : [
              {
                id: existing?.id ?? `${measure.id}-dyn1`,
                value: input.patch.value ?? "mf",
                placement: input.patch.placement,
              },
            ],
    };
  });

  if (!updated) {
    throw new Error("Measure was not found in the current score revision.");
  }

  return {
    ...input.score,
    metadata: {
      ...input.score.metadata,
      warnings: [...input.score.metadata.warnings, `Manual dynamics correction applied to ${input.patch.measureId} at ${generatedAt}.`],
    },
    measures,
  };
}

export function applyScoreTempoPatch(input: {
  score: ScoreJson;
  patch: ScoreTempoPatch;
  generatedAt?: string;
}): ScoreJson {
  let updated = false;
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  const measures = input.score.measures.map((measure) => {
    if (measure.id !== input.patch.measureId) {
      return measure;
    }

    updated = true;
    const tempos = [...(measure.tempos ?? [])];
    const requestedOffset = input.patch.offsetDivisions ?? 0;
    const existingIndex = input.patch.tempoId
      ? tempos.findIndex((tempo) => tempo.id === input.patch.tempoId)
      : tempos.findIndex((tempo) => (tempo.offsetDivisions ?? 0) === requestedOffset);
    const existing = existingIndex >= 0 ? tempos[existingIndex] : undefined;
    const nextTempo = {
      id: existing?.id ?? `${measure.id}-tempo${tempos.length + 1}`,
      bpm: input.patch.bpm ?? 96,
      beatUnit: input.patch.beatUnit || "quarter",
      placement: input.patch.placement,
      ...(requestedOffset !== 0 ? { offsetDivisions: requestedOffset } : {}),
    };
    if (existingIndex >= 0) tempos.splice(existingIndex, 1, nextTempo);
    else tempos.push(nextTempo);
    tempos.sort((left, right) => (left.offsetDivisions ?? 0) - (right.offsetDivisions ?? 0) || left.id.localeCompare(right.id));
    return {
      ...measure,
      tempos:
        input.patch.clear === true
          ? []
          : tempos,
    };
  });

  if (!updated) {
    throw new Error("Measure was not found in the current score revision.");
  }

  return {
    ...input.score,
    metadata: {
      ...input.score.metadata,
      warnings: [...input.score.metadata.warnings, `Manual tempo correction applied to ${input.patch.measureId} at ${generatedAt}.`],
    },
    measures,
  };
}

export function applyScoreWedgePatch(input: {
  score: ScoreJson;
  patch: ScoreWedgePatch;
  generatedAt?: string;
}): ScoreJson {
  let updated = false;
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  const measures = input.score.measures.map((measure) => {
    if (measure.id !== input.patch.measureId) {
      return measure;
    }

    updated = true;
    const existing = measure.wedges?.[0];
    return {
      ...measure,
      wedges:
        input.patch.clear === true
          ? []
          : [
              {
                id: existing?.id ?? `${measure.id}-wedge1`,
                type: input.patch.type ?? "crescendo",
                placement: input.patch.placement,
                number: input.patch.number,
              },
            ],
    };
  });

  if (!updated) {
    throw new Error("Measure was not found in the current score revision.");
  }

  return {
    ...input.score,
    metadata: {
      ...input.score.metadata,
      warnings: [...input.score.metadata.warnings, `Manual wedge correction applied to ${input.patch.measureId} at ${generatedAt}.`],
    },
    measures,
  };
}

export function applyScoreMeasureAttributesPatch(input: {
  score: ScoreJson;
  patch: ScoreMeasureAttributesPatch;
  generatedAt?: string;
}): ScoreJson {
  let updated = false;
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  const measures = input.score.measures.map((measure) => {
    if (measure.id !== input.patch.measureId) {
      return measure;
    }

    updated = true;
    const attributes = {
      ...(measure.attributes ?? {}),
    };

    if (input.patch.divisions !== undefined) {
      attributes.divisions = input.patch.divisions;
    }

    if (input.patch.keyFifths !== undefined || input.patch.keyMode !== undefined) {
      attributes.key = {
        ...(attributes.key ?? { fifths: 0 }),
        fifths: input.patch.keyFifths ?? attributes.key?.fifths ?? 0,
        mode: input.patch.keyMode ?? attributes.key?.mode ?? "major",
      };
    }

    if (input.patch.timeBeats !== undefined || input.patch.timeBeatType !== undefined) {
      attributes.time = {
        ...(attributes.time ?? { beats: "4", beatType: "4" }),
        beats: input.patch.timeBeats ?? attributes.time?.beats ?? "4",
        beatType: input.patch.timeBeatType ?? attributes.time?.beatType ?? "4",
      };
    }

    if (input.patch.clefSign !== undefined || input.patch.clefLine !== undefined || input.patch.clefOctaveChange !== undefined) {
      attributes.clef = {
        ...(attributes.clef ?? { sign: "G", line: 2 }),
        sign: input.patch.clefSign ?? attributes.clef?.sign ?? "G",
        line: input.patch.clefLine ?? attributes.clef?.line ?? 2,
        octaveChange: input.patch.clefOctaveChange ?? attributes.clef?.octaveChange,
      };

      if (attributes.clef.octaveChange === 0) {
        delete attributes.clef.octaveChange;
      }
    }

    const layout = {
      ...(measure.layout ?? { id: `${measure.id}-layout` }),
    };
    if (input.patch.newSystem !== undefined) layout.newSystem = input.patch.newSystem;
    if (input.patch.newPage !== undefined) layout.newPage = input.patch.newPage;
    if (input.patch.measureWidth === null) delete layout.measureWidth;
    else if (input.patch.measureWidth !== undefined) layout.measureWidth = input.patch.measureWidth;
    if (input.patch.staffDistance === null) delete layout.staffDistance;
    else if (input.patch.staffDistance !== undefined) layout.staffDistance = input.patch.staffDistance;
    const hasLayout = Boolean(layout.newSystem || layout.newPage || layout.measureWidth !== undefined || layout.staffDistance !== undefined);

    return {
      ...measure,
      attributes,
      ...(hasLayout ? { layout } : { layout: undefined }),
    };
  });

  if (!updated) {
    throw new Error("Measure was not found in the current score revision.");
  }

  return {
    ...input.score,
    metadata: {
      ...input.score.metadata,
      warnings: [...input.score.metadata.warnings, `Manual measure attributes correction applied to ${input.patch.measureId} at ${generatedAt}.`],
    },
    measures,
  };
}

export function applyScorePartPatch(input: {
  score: ScoreJson;
  patch: ScorePartPatch;
  generatedAt?: string;
}): ScoreJson {
  let updated = false;
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  const parts: ScorePart[] = input.score.parts.map((part) => {
    if (part.id !== input.patch.partId) {
      return part;
    }

    updated = true;
    return {
      ...part,
      name: input.patch.name ?? part.name,
      abbreviation: input.patch.abbreviation !== undefined ? input.patch.abbreviation || undefined : part.abbreviation,
      midiProgram: input.patch.midiProgram !== undefined ? input.patch.midiProgram ?? undefined : part.midiProgram,
    };
  });

  if (!updated) {
    throw new Error("Part was not found in the current score revision.");
  }

  return {
    ...input.score,
    metadata: {
      ...input.score.metadata,
      warnings: [...input.score.metadata.warnings, `Manual part settings correction applied to ${input.patch.partId} at ${generatedAt}.`],
    },
    parts,
  };
}
