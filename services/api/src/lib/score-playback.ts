import type { PlaybackDocument, PlaybackMeasureMarker, PlaybackNavigationGraph, PlaybackNavigationStep, PlaybackNoteEvent, PlaybackTempoChange, ScoreArticulation, ScoreDynamic, ScoreJson, ScoreMeasure, ScorePitch, ScoreTempo } from "@score/shared";

const PITCH_CLASS_BY_STEP = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
} as const;

const NOTE_NAME_BY_PITCH_CLASS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
const DEFAULT_TEMPO_BPM = 96;
const DEFAULT_VELOCITY = 0.72;
const DEFAULT_DOWNBEAT_EVERY = 4;

const VELOCITY_BY_DYNAMIC: Record<ScoreDynamic["value"], number> = {
  ppp: 0.28,
  pp: 0.38,
  p: 0.48,
  mp: 0.6,
  mf: DEFAULT_VELOCITY,
  f: 0.84,
  ff: 0.94,
  fff: 1,
};

function normalizePitchClass(value: number) {
  return ((value % 12) + 12) % 12;
}

function midiFromPitch(pitch: ScorePitch) {
  return (pitch.octave + 1) * 12 + PITCH_CLASS_BY_STEP[pitch.step] + pitch.alter;
}

function noteNameFromMidi(midi: number) {
  const pitchClass = normalizePitchClass(midi);
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAME_BY_PITCH_CLASS[pitchClass]}${octave}`;
}

function roundBeat(value: number) {
  return Number(value.toFixed(6));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function quarterTempoBpm(tempo: ScoreTempo) {
  const quarterUnits: Record<string, number> = { whole: 4, half: 2, quarter: 1, eighth: 0.5, "16th": 0.25, "32nd": 0.125, "64th": 0.0625 };
  return clamp(Number((tempo.bpm * (quarterUnits[tempo.beatUnit ?? "quarter"] ?? 1)).toFixed(3)), 20, 400);
}

function scoreDownbeatEvery(score: ScoreJson, warnings: string[]) {
  const timeSignature = score.measures.find((measure) => measure.attributes?.time)?.attributes?.time;
  if (timeSignature?.senzaMisura) {
    warnings.push(`Playback metronome uses ${DEFAULT_DOWNBEAT_EVERY} reference beats for senza misura sections.`);
    return DEFAULT_DOWNBEAT_EVERY;
  }
  const beats = timeSignature?.beats;

  if (!beats) {
    return DEFAULT_DOWNBEAT_EVERY;
  }

  const parsedBeats = /^\d{1,2}$/.test(beats) ? Number(beats) : Number.NaN;
  if (!Number.isFinite(parsedBeats) || parsedBeats < 1 || parsedBeats > 16) {
    warnings.push(`Playback metronome could not interpret time signature beats "${beats}", so it uses ${DEFAULT_DOWNBEAT_EVERY} beats per downbeat.`);
    return DEFAULT_DOWNBEAT_EVERY;
  }

  return parsedBeats;
}

function scoreKeySignature(score: ScoreJson) {
  return score.measures.find((measure) => measure.attributes?.key)?.attributes?.key;
}

function scoreTimeSignature(score: ScoreJson) {
  return score.measures.find((measure) => measure.attributes?.time)?.attributes?.time;
}

function velocityFromDynamics(dynamic: ScoreDynamic | undefined) {
  return dynamic ? VELOCITY_BY_DYNAMIC[dynamic.value] : DEFAULT_VELOCITY;
}

function velocityFromArticulations(baseVelocity: number, articulations: ScoreArticulation[] | undefined) {
  if (!articulations?.some((articulation) => articulation.type === "accent")) {
    return baseVelocity;
  }

  return clamp(Number((baseVelocity * 1.18).toFixed(3)), 0.1, 1);
}

function soundDurationFromArticulations(durationBeats: number, articulations: ScoreArticulation[] | undefined) {
  if (articulations?.some((articulation) => articulation.type === "staccato")) {
    return roundBeat(Math.max(0.0625, durationBeats * 0.5));
  }

  if (articulations?.some((articulation) => articulation.type === "caesura")) {
    return roundBeat(Math.max(0.0625, durationBeats * 0.62));
  }

  if (articulations?.some((articulation) => articulation.type === "breath-mark")) {
    return roundBeat(Math.max(0.0625, durationBeats * 0.78));
  }

  if (articulations?.some((articulation) => articulation.type === "tenuto")) {
    return roundBeat(Math.max(0.0625, durationBeats * 0.98));
  }

  return roundBeat(Math.max(0.0625, durationBeats * 0.9));
}

function durationWithFermata(durationBeats: number, fermatas: unknown[] | undefined) {
  return fermatas && fermatas.length > 0 ? roundBeat(durationBeats * 2) : durationBeats;
}

function hasTie(ties: { type: string }[] | undefined, type: "start" | "stop") {
  return ties?.some((tie) => tie.type === type) ?? false;
}

function tieKey(input: { voice: string; staff?: number; midi: number }) {
  return `${input.voice}:${input.staff ?? "none"}:${input.midi}`;
}

function extendTiedPlaybackEvent(playbackEvent: PlaybackNoteEvent, durationBeats: number) {
  const nextDurationBeats = roundBeat(playbackEvent.durationBeats + durationBeats);
  playbackEvent.durationBeats = nextDurationBeats;
  playbackEvent.soundDurationBeats = roundBeat(Math.max(0.0625, nextDurationBeats * 0.98));
}

function hasRepeat(measure: ScoreMeasure, direction: "forward" | "backward") {
  return measure.barlines?.some((barline) => barline.repeatDirection === direction) ?? false;
}

function nextMeasureOccurrenceId(measure: ScoreMeasure, occurrenceCounts: Map<string, number>) {
  const occurrence = (occurrenceCounts.get(measure.id) ?? 0) + 1;
  occurrenceCounts.set(measure.id, occurrence);
  return occurrence;
}

function splitEndingNumbers(value: string) {
  return value
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function annotatedRepeatMeasures(measures: ScoreMeasure[]) {
  const activeEndingNumbers = new Set<string>();

  return measures.map((measure) => {
    const measureEndingNumbers = new Set<string>();
    const endingBarlines = (measure.barlines ?? []).filter((barline) => barline.ending);

    for (const barline of endingBarlines) {
      if (barline.ending?.type === "start") {
        splitEndingNumbers(barline.ending.number).forEach((number) => activeEndingNumbers.add(number));
      }
    }

    activeEndingNumbers.forEach((number) => measureEndingNumbers.add(number));
    for (const barline of endingBarlines) {
      splitEndingNumbers(barline.ending?.number ?? "").forEach((number) => measureEndingNumbers.add(number));
    }

    for (const barline of endingBarlines) {
      if (barline.ending?.type === "stop" || barline.ending?.type === "discontinue") {
        splitEndingNumbers(barline.ending.number).forEach((number) => activeEndingNumbers.delete(number));
      }
    }

    return {
      measure,
      endingNumbers: Array.from(measureEndingNumbers),
    };
  });
}

function isFirstEndingOnly(endingNumbers: string[]) {
  return endingNumbers.includes("1") && !endingNumbers.includes("2");
}

function hasNavigationType(playbackMeasure: { measure: ScoreMeasure }, type: NonNullable<ScoreMeasure["navigationMarks"]>[number]["type"]) {
  return playbackMeasure.measure.navigationMarks?.some((mark) => mark.type === type) ?? false;
}

function findNavigationMark(playbackMeasure: { measure: ScoreMeasure }, types: Array<NonNullable<ScoreMeasure["navigationMarks"]>[number]["type"]>) {
  return playbackMeasure.measure.navigationMarks?.find((mark) => types.includes(mark.type));
}

function navigationTextIncludes(playbackMeasure: { measure: ScoreMeasure }, pattern: RegExp) {
  return playbackMeasure.measure.navigationMarks?.some((mark) => pattern.test(mark.text)) ?? false;
}

function expandNavigationPlayback(input: {
  partId: string;
  playbackMeasures: Array<{ measure: ScoreMeasure; occurrence: number }>;
  occurrenceCounts: Map<string, number>;
  warnings: string[];
}) {
  const commandIndex = input.playbackMeasures.findIndex((playbackMeasure) => findNavigationMark(playbackMeasure, ["dc", "ds"]));
  if (commandIndex < 0) {
    return input.playbackMeasures;
  }

  const commandMeasure = input.playbackMeasures[commandIndex];
  const command = findNavigationMark(commandMeasure, ["dc", "ds"]);
  if (!command) {
    return input.playbackMeasures;
  }

  const jumpTargetIndex =
    command.type === "dc"
      ? 0
      : input.playbackMeasures.findIndex((playbackMeasure, index) => index < commandIndex && hasNavigationType(playbackMeasure, "segno"));

  if (jumpTargetIndex < 0) {
    input.warnings.push(`Playback found ${command.text} in part ${input.partId} measure ${commandMeasure.measure.number}, but no Segno target was found.`);
    return input.playbackMeasures;
  }

  const wantsFine = /fine/i.test(command.text);
  const wantsCoda = /coda/i.test(command.text);
  const nextOccurrence = (measure: ScoreMeasure) => ({
    measure,
    occurrence: nextMeasureOccurrenceId(measure, input.occurrenceCounts),
  });
  const expanded = [...input.playbackMeasures];

  if (wantsCoda) {
    const toCodaIndex = input.playbackMeasures.findIndex(
      (playbackMeasure, index) => index >= jumpTargetIndex && index < commandIndex && hasNavigationType(playbackMeasure, "to-coda"),
    );
    const codaIndex = input.playbackMeasures.findIndex((playbackMeasure, index) => index > toCodaIndex && hasNavigationType(playbackMeasure, "coda"));

    if (toCodaIndex >= 0 && codaIndex > toCodaIndex) {
      input.playbackMeasures.slice(jumpTargetIndex, toCodaIndex + 1).forEach((item) => expanded.push(nextOccurrence(item.measure)));
      input.playbackMeasures.slice(codaIndex).forEach((item) => expanded.push(nextOccurrence(item.measure)));
      input.warnings.push(
        `Playback applies ${command.text} in part ${input.partId}: jumped to ${command.type === "dc" ? "the beginning" : "Segno"}, then used To Coda/Coda markers.`,
      );
      return expanded;
    }

    input.warnings.push(`Playback found ${command.text} in part ${input.partId}, but matching To Coda/Coda markers were incomplete.`);
  }

  if (wantsFine) {
    const fineIndex = input.playbackMeasures.findIndex(
      (playbackMeasure, index) => index >= jumpTargetIndex && index < commandIndex && hasNavigationType(playbackMeasure, "fine"),
    );
    if (fineIndex >= 0) {
      input.playbackMeasures.slice(jumpTargetIndex, fineIndex + 1).forEach((item) => expanded.push(nextOccurrence(item.measure)));
      input.warnings.push(
        `Playback applies ${command.text} in part ${input.partId}: jumped to ${command.type === "dc" ? "the beginning" : "Segno"} and stopped at Fine.`,
      );
      return expanded;
    }

    input.warnings.push(`Playback found ${command.text} in part ${input.partId}, but no Fine marker was found before the jump command.`);
  }

  input.playbackMeasures.slice(jumpTargetIndex).forEach((item) => expanded.push(nextOccurrence(item.measure)));
  input.warnings.push(
    `Playback applies ${command.text} in part ${input.partId} once; no Fine or complete Coda target was available, so it plays from the jump target to the end.`,
  );
  return expanded;
}

function expandRepeatMeasures(input: { partId: string; measures: ScoreMeasure[]; warnings: string[] }) {
  const expanded: Array<{ measure: ScoreMeasure; occurrence: number }> = [];
  const occurrenceCounts = new Map<string, number>();
  const measures = annotatedRepeatMeasures(input.measures);
  let repeatStartIndex = 0;

  const pushMeasure = (measure: ScoreMeasure) => {
    expanded.push({
      measure,
      occurrence: nextMeasureOccurrenceId(measure, occurrenceCounts),
    });
  };

  measures.forEach((playbackMeasure, measureIndex) => {
    const { measure } = playbackMeasure;
    if (hasRepeat(measure, "forward")) {
      repeatStartIndex = measureIndex;
    }

    pushMeasure(measure);

    if (hasRepeat(measure, "backward")) {
      const repeatStart = Math.min(repeatStartIndex, measureIndex);
      const repeatedMeasures = measures.slice(repeatStart, measureIndex + 1);
      const secondPassMeasures = repeatedMeasures.filter((item) => !isFirstEndingOnly(item.endingNumbers));
      const skippedFirstEndingCount = repeatedMeasures.length - secondPassMeasures.length;

      if (secondPassMeasures.length > 0) {
        input.warnings.push(
          skippedFirstEndingCount > 0
            ? `Playback expands repeat in part ${input.partId} from measure ${repeatedMeasures[0].measure.number} to measure ${measure.number} once and skips ${skippedFirstEndingCount} first-ending measure(s) on the repeated pass; nested repeat and alternate-ending rules beyond first endings are not yet fully interpreted.`
            : `Playback expands repeat in part ${input.partId} from measure ${repeatedMeasures[0].measure.number} to measure ${measure.number} once; nested repeat and alternate-ending rules are not yet fully interpreted.`,
        );
        secondPassMeasures.forEach((item) => pushMeasure(item.measure));
      }

      repeatStartIndex = measureIndex + 1;
    }
  });

  const navigationExpanded = expandNavigationPlayback({
    partId: input.partId,
    playbackMeasures: expanded,
    occurrenceCounts,
    warnings: input.warnings,
  });

  if (navigationExpanded.some((item) => navigationTextIncludes(item, /\bD\.?\s*[CS]\.?|da capo|dal segno/i))) {
    input.warnings.push(`Playback interprets one D.C./D.S. navigation command per part ${input.partId}; deeper nested navigation is preserved but not repeatedly expanded.`);
  }

  return navigationExpanded;
}

type RepeatRegion = { startIndex: number; endIndex: number };

function endingPasses(values: string[]) {
  const passes = new Set<number>();
  for (const value of values) {
    for (const token of value.split(/[,\s]+/).filter(Boolean)) {
      const range = /^(\d+)-(\d+)$/.exec(token);
      if (range) {
        const start = Number(range[1]);
        const end = Number(range[2]);
        for (let pass = Math.min(start, end); pass <= Math.max(start, end); pass += 1) passes.add(pass);
      } else if (/^\d+$/.test(token)) {
        passes.add(Number(token));
      }
    }
  }
  return passes;
}

function repeatRegions(measures: ScoreMeasure[]) {
  const stack: number[] = [];
  const regions: RepeatRegion[] = [];
  measures.forEach((measure, index) => {
    if (hasRepeat(measure, "forward")) stack.push(index);
    if (hasRepeat(measure, "backward")) {
      regions.push({ startIndex: stack.pop() ?? 0, endIndex: index });
    }
  });
  return regions.sort((left, right) => left.startIndex - right.startIndex || right.endIndex - left.endIndex);
}

function navigationMarkIndex(measures: ScoreMeasure[], type: NonNullable<ScoreMeasure["navigationMarks"]>[number]["type"], beforeIndex?: number) {
  let match = -1;
  for (let index = 0; index < measures.length; index += 1) {
    if (beforeIndex !== undefined && index >= beforeIndex) break;
    if (measures[index].navigationMarks?.some((mark) => mark.type === type)) match = index;
  }
  return match;
}

export function buildPlaybackMeasureSequence(input: {
  partId: string;
  measures: ScoreMeasure[];
  warnings: string[];
}): { playbackMeasures: Array<{ measure: ScoreMeasure; occurrence: number }>; graph: PlaybackNavigationGraph } {
  const annotated = annotatedRepeatMeasures(input.measures);
  const regions = repeatRegions(input.measures);
  const regionByEnd = new Map(regions.map((region) => [region.endIndex, region]));
  const repeatPassByEnd = new Map<number, number>();
  const occurrenceCounts = new Map<string, number>();
  const usedCommands = new Set<number>();
  const visitCounts = new Map<number, number>();
  const playbackMeasures: Array<{ measure: ScoreMeasure; occurrence: number }> = [];
  const steps: PlaybackNavigationStep[] = [];
  const playedMeasureIds = new Set<string>();
  const maxSteps = Math.max(64, input.measures.length * 32);
  let index = 0;
  let sequence = 0;
  let jumpCount = 0;
  let activeVoltaPass = 1;
  let navigationJumped = false;
  let fineArmed = false;
  let codaArmed = false;
  let terminatedBy: PlaybackNavigationGraph["terminatedBy"] = "end";

  const addStep = (measure: ScoreMeasure, occurrence: number, action: PlaybackNavigationStep["action"], detail?: string, targetIndex?: number) => {
    steps.push({
      sequence: sequence++,
      measureId: measure.id,
      measureNumber: measure.number,
      occurrence,
      action,
      ...(targetIndex !== undefined ? { targetMeasureId: input.measures[targetIndex]?.id } : {}),
      ...(detail ? { detail } : {}),
    });
  };

  while (index >= 0 && index < input.measures.length && sequence < maxSteps) {
    const measure = input.measures[index];
    const containingRegions = regions.filter((region) => region.startIndex <= index && index <= region.endIndex);
    const currentRegion = containingRegions.sort((left, right) => right.startIndex - left.startIndex)[0];
    const currentPass = currentRegion ? repeatPassByEnd.get(currentRegion.endIndex) ?? 1 : activeVoltaPass;
    const passes = endingPasses(annotated[index].endingNumbers);
    const visitCount = (visitCounts.get(index) ?? 0) + 1;
    visitCounts.set(index, visitCount);

    if (visitCount > 8) {
      addStep(measure, occurrenceCounts.get(measure.id) ?? 0, "guard-stop", "Measure visit limit exceeded.");
      input.warnings.push(`Playback navigation stopped in part ${input.partId} at measure ${measure.number} after eight visits to prevent an infinite loop.`);
      terminatedBy = "guard";
      break;
    }

    if (passes.size > 0 && !passes.has(currentPass)) {
      addStep(measure, occurrenceCounts.get(measure.id) ?? 0, "skip-ending", `Skipped ending ${Array.from(passes).join(",")} on pass ${currentPass}.`);
      index += 1;
      continue;
    }

    const occurrence = nextMeasureOccurrenceId(measure, occurrenceCounts);
    playbackMeasures.push({ measure, occurrence });
    playedMeasureIds.add(measure.id);
    addStep(measure, occurrence, "play", `Played on pass ${currentPass}.`);

    if (fineArmed && hasNavigationType({ measure }, "fine")) {
      addStep(measure, occurrence, "fine-stop", "Stopped at Fine after a navigation jump.");
      terminatedBy = "fine";
      break;
    }

    if (codaArmed && hasNavigationType({ measure }, "to-coda")) {
      const codaIndices = input.measures.map((candidate, candidateIndex) => hasNavigationType({ measure: candidate }, "coda") ? candidateIndex : -1).filter((candidateIndex) => candidateIndex >= 0);
      const targetIndex = codaIndices.find((candidateIndex) => candidateIndex > index) ?? codaIndices[0] ?? -1;
      if (targetIndex >= 0 && targetIndex !== index) {
        addStep(measure, occurrence, "coda-jump", "Followed To Coda to the Coda target.", targetIndex);
        codaArmed = false;
        jumpCount += 1;
        index = targetIndex;
        continue;
      }
      input.warnings.push(`Playback found To Coda in part ${input.partId} measure ${measure.number}, but no usable Coda target exists.`);
      codaArmed = false;
    }

    const command = measure.navigationMarks?.find((mark) => mark.type === "dc" || mark.type === "ds");
    if (command && !usedCommands.has(index)) {
      const targetIndex = command.type === "dc" ? 0 : navigationMarkIndex(input.measures, "segno", index);
      if (targetIndex >= 0) {
        usedCommands.add(index);
        fineArmed = /fine/i.test(command.text);
        codaArmed = /coda/i.test(command.text);
        navigationJumped = true;
        repeatPassByEnd.clear();
        activeVoltaPass = 1;
        jumpCount += 1;
        addStep(measure, occurrence, command.type === "dc" ? "dc-jump" : "ds-jump", command.text, targetIndex);
        index = targetIndex;
        continue;
      }
      input.warnings.push(`Playback found ${command.text} in part ${input.partId} measure ${measure.number}, but its jump target is missing.`);
      usedCommands.add(index);
    }

    const repeatRegion = regionByEnd.get(index);
    if (repeatRegion && !navigationJumped) {
      const pass = repeatPassByEnd.get(index) ?? 1;
      const repeatTimes = measure.barlines?.find((barline) => barline.repeatDirection === "backward")?.repeatTimes ?? 2;
      if (pass < repeatTimes) {
        repeatPassByEnd.set(index, pass + 1);
        activeVoltaPass = pass + 1;
        for (const nested of regions) {
          if (nested.startIndex >= repeatRegion.startIndex && nested.endIndex < repeatRegion.endIndex) repeatPassByEnd.delete(nested.endIndex);
        }
        jumpCount += 1;
        addStep(measure, occurrence, "repeat-jump", `Repeated pass ${pass + 1}.`, repeatRegion.startIndex);
        index = repeatRegion.startIndex;
        continue;
      }
      repeatPassByEnd.delete(index);
      activeVoltaPass = pass;
    }

    if (passes.size === 0 && !currentRegion && activeVoltaPass > 1) activeVoltaPass = 1;
    index += 1;
  }

  if (sequence >= maxSteps && index < input.measures.length) {
    const measure = input.measures[Math.max(0, Math.min(index, input.measures.length - 1))];
    addStep(measure, occurrenceCounts.get(measure.id) ?? 0, "guard-stop", `Global navigation limit ${maxSteps} exceeded.`);
    input.warnings.push(`Playback navigation stopped in part ${input.partId} after ${maxSteps} state transitions to prevent an infinite loop.`);
    terminatedBy = "guard";
  } else if (terminatedBy === "end" && input.measures.length > 0) {
    const last = playbackMeasures.at(-1);
    if (last) addStep(last.measure, last.occurrence, "end", "Reached the end of the playback path.");
  }

  return {
    playbackMeasures,
    graph: {
      partId: input.partId,
      steps,
      terminatedBy,
      jumpCount,
      unreachableMeasureIds: input.measures.filter((measure) => !playedMeasureIds.has(measure.id)).map((measure) => measure.id),
    },
  };
}

function hairpinMultiplier(type: "crescendo" | "diminuendo", progress: number) {
  const boundedProgress = clamp(progress, 0, 1);
  const start = type === "crescendo" ? 0.86 : 1.12;
  const end = type === "crescendo" ? 1.16 : 0.82;
  return start + (end - start) * boundedProgress;
}

function applyHairpinRange(input: {
  multipliers: Map<number, number>;
  type: "crescendo" | "diminuendo";
  startIndex: number;
  endIndex: number;
}) {
  const span = Math.max(1, input.endIndex - input.startIndex);
  for (let index = input.startIndex; index <= input.endIndex; index += 1) {
    const progress = (index - input.startIndex) / span;
    input.multipliers.set(index, hairpinMultiplier(input.type, progress));
  }
}

function hairpinVelocityMultipliers(input: {
  partId: string;
  playbackMeasures: Array<{ measure: ScoreMeasure; occurrence: number }>;
  warnings: string[];
}) {
  const multipliers = new Map<number, number>();
  let activeHairpin: { type: "crescendo" | "diminuendo"; startIndex: number; measureNumber: string } | null = null;

  for (let index = 0; index < input.playbackMeasures.length; index += 1) {
    const playbackMeasure = input.playbackMeasures[index];
    const wedge = playbackMeasure.measure.wedges?.[0];

    if (!wedge) {
      continue;
    }

    if (wedge.type === "crescendo" || wedge.type === "diminuendo") {
      activeHairpin = {
        type: wedge.type,
        startIndex: index,
        measureNumber: playbackMeasure.measure.number,
      };
      continue;
    }

    if (wedge.type === "stop") {
      if (!activeHairpin) {
        input.warnings.push(`Hairpin stop in part ${input.partId} measure ${playbackMeasure.measure.number} did not match a crescendo or diminuendo start.`);
        continue;
      }

      applyHairpinRange({
        multipliers,
        type: activeHairpin.type,
        startIndex: activeHairpin.startIndex,
        endIndex: index,
      });
      activeHairpin = null;
    }
  }

  if (activeHairpin) {
    applyHairpinRange({
      multipliers,
      type: activeHairpin.type,
      startIndex: activeHairpin.startIndex,
      endIndex: input.playbackMeasures.length - 1,
    });
    input.warnings.push(`Hairpin starting in part ${input.partId} measure ${activeHairpin.measureNumber} has no stop marking, so playback carries it to the end of the part.`);
  }

  return multipliers;
}

function currentMeasureStartBeat(cursorByVoice: Map<string, number>) {
  const cursors = Array.from(cursorByVoice.values());
  if (cursors.length === 0) {
    return 0;
  }

  return Math.max(...cursors);
}

export function scoreJsonToPlayback(score: ScoreJson, generatedAt = new Date().toISOString()): PlaybackDocument {
  const events: PlaybackNoteEvent[] = [];
  const measureMarkers: PlaybackMeasureMarker[] = [];
  const tempoChanges: PlaybackTempoChange[] = [];
  const warnings: string[] = [];
  const navigationGraphs: PlaybackNavigationGraph[] = [];
  let totalBeats = 0;

  for (const part of score.parts) {
    let activeDivisions = 1;
    const cursorByVoice = new Map<string, number>();
    const lastStartByVoice = new Map<string, number>();
    const measures = score.measures.filter((measure) => measure.partId === part.id);
    let activeVelocity = DEFAULT_VELOCITY;
    const activeTies = new Map<string, PlaybackNoteEvent>();
    const playbackSequence = buildPlaybackMeasureSequence({ partId: part.id, measures, warnings });
    const playbackMeasures = playbackSequence.playbackMeasures;
    navigationGraphs.push(playbackSequence.graph);
    const hairpinMultipliers = hairpinVelocityMultipliers({ partId: part.id, playbackMeasures, warnings });

    if (measures.length === 0) {
      warnings.push(`Part ${part.id} has no measures for playback.`);
      continue;
    }

    for (let playbackMeasureIndex = 0; playbackMeasureIndex < playbackMeasures.length; playbackMeasureIndex += 1) {
      const playbackMeasure = playbackMeasures[playbackMeasureIndex];
      const { measure, occurrence } = playbackMeasure;
      const measureStartBeat = roundBeat(currentMeasureStartBeat(cursorByVoice));
      measureMarkers.push({
        id: occurrence > 1 ? `${measure.id}-repeat${occurrence}` : measure.id,
        partId: part.id,
        measureId: measure.id,
        measureNumber: measure.number,
        occurrence,
        startBeat: measureStartBeat,
      });

      const hairpinVelocityMultiplier = hairpinMultipliers.get(playbackMeasureIndex) ?? 1;
      if (measure.attributes?.divisions && measure.attributes.divisions > 0) {
        activeDivisions = measure.attributes.divisions;
      }

      if (part.id === score.parts[0]?.id) {
        for (const tempo of measure.tempos ?? []) {
          if (!Number.isFinite(tempo.bpm) || tempo.bpm <= 0) continue;
          const offsetBeats = Number.isFinite(tempo.offsetDivisions) ? (tempo.offsetDivisions ?? 0) / activeDivisions : 0;
          tempoChanges.push({
            id: occurrence > 1 ? `${tempo.id}-repeat${occurrence}` : tempo.id,
            sourceTempoId: tempo.id,
            measureId: measure.id,
            measureNumber: measure.number,
            occurrence,
            startBeat: roundBeat(Math.max(0, measureStartBeat + offsetBeats)),
            bpm: quarterTempoBpm(tempo),
          });
        }
      }

      if ((measure.dynamics?.length ?? 0) > 0) {
        activeVelocity = velocityFromDynamics(measure.dynamics?.[0]);

        if ((measure.dynamics?.length ?? 0) > 1) {
          warnings.push(`Playback uses the first dynamics marking in part ${part.id} measure ${measure.number}; additional dynamics are preserved in Score JSON.`);
        }
      }

      for (const event of measure.events) {
        const voice = event.voice ?? "1";
        const currentCursor = cursorByVoice.get(voice) ?? 0;
        const durationBeats = activeDivisions > 0 ? event.duration / activeDivisions : event.duration;
        const playbackDurationBeats = durationWithFermata(durationBeats, event.fermatas);

        if (event.type === "rest") {
          cursorByVoice.set(voice, roundBeat(currentCursor + playbackDurationBeats));
          totalBeats = Math.max(totalBeats, currentCursor + playbackDurationBeats);
          continue;
        }

        const startBeat = event.chord ? lastStartByVoice.get(voice) ?? currentCursor : currentCursor;
        const midi = midiFromPitch(event.pitch);
        const currentTieKey = tieKey({ voice, staff: event.staff, midi });
        const tieStarts = hasTie(event.ties, "start");
        const tieStops = hasTie(event.ties, "stop");
        const activeTiedEvent = activeTies.get(currentTieKey);

        if (tieStops && activeTiedEvent) {
          extendTiedPlaybackEvent(activeTiedEvent, playbackDurationBeats);

          if (tieStarts) {
            activeTies.set(currentTieKey, activeTiedEvent);
          } else {
            activeTies.delete(currentTieKey);
          }

          lastStartByVoice.set(voice, startBeat);
          if (!event.chord) {
            cursorByVoice.set(voice, roundBeat(currentCursor + playbackDurationBeats));
            totalBeats = Math.max(totalBeats, currentCursor + playbackDurationBeats);
          } else {
            totalBeats = Math.max(totalBeats, startBeat + playbackDurationBeats);
          }

          continue;
        }

        const soundDurationBeats = event.fermatas?.length ? playbackDurationBeats : soundDurationFromArticulations(playbackDurationBeats, event.articulations);
        const playbackEvent: PlaybackNoteEvent = {
          id: occurrence > 1 ? `${event.id}-repeat${occurrence}` : event.id,
          sourceEventId: event.id,
          partId: part.id,
          measureId: measure.id,
          measureNumber: measure.number,
          voice,
          staff: event.staff,
          pitch: event.pitch,
          midi,
          noteName: noteNameFromMidi(midi),
          startBeat: roundBeat(startBeat),
          durationBeats: roundBeat(playbackDurationBeats),
          soundDurationBeats,
          velocity: velocityFromArticulations(clamp(Number((activeVelocity * hairpinVelocityMultiplier).toFixed(3)), 0.1, 1), event.articulations),
          lyrics: event.lyrics,
        };
        events.push(playbackEvent);

        if (tieStarts) {
          activeTies.set(currentTieKey, playbackEvent);
        } else if (tieStops) {
          warnings.push(`Tie stop on ${event.id} did not match an active tie start, so playback triggers it as a separate note.`);
        }

        lastStartByVoice.set(voice, startBeat);
        if (!event.chord) {
          cursorByVoice.set(voice, roundBeat(currentCursor + playbackDurationBeats));
          totalBeats = Math.max(totalBeats, currentCursor + playbackDurationBeats);
        } else {
          totalBeats = Math.max(totalBeats, startBeat + playbackDurationBeats);
        }
      }
    }

    if (activeTies.size > 0) {
      warnings.push(`Part ${part.id} has ${activeTies.size} tie start marking(s) without matching tie stop markings.`);
    }
  }

  events.sort((left, right) => left.startBeat - right.startBeat || left.partId.localeCompare(right.partId) || left.midi - right.midi);
  tempoChanges.sort((left, right) => left.startBeat - right.startBeat || left.id.localeCompare(right.id));
  const initialTempo = [...tempoChanges].reverse().find((tempo) => tempo.startBeat <= 0)?.bpm ?? DEFAULT_TEMPO_BPM;

  return {
    schemaVersion: 1,
    title: score.title,
    tempoBpm: initialTempo,
    downbeatEvery: scoreDownbeatEvery(score, warnings),
    keySignature: scoreKeySignature(score),
    timeSignature: scoreTimeSignature(score),
    totalBeats: roundBeat(totalBeats),
    parts: score.parts.map((part) => ({
      id: part.id,
      name: part.name,
      midiProgram: part.midiProgram,
    })),
    measureMarkers: measureMarkers.sort((left, right) => left.startBeat - right.startBeat || left.partId.localeCompare(right.partId) || left.measureNumber.localeCompare(right.measureNumber)),
    tempoChanges,
    navigationGraphs,
    events,
    metadata: {
      sourceRevisionParser: score.metadata.parser,
      generatedAt,
      eventCount: events.length,
      warnings,
    },
  };
}
