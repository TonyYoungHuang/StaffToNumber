import type { ScoreJson, ScorePitch, ScoreKeySignature, ScorePitchStep, TransposePitchMode, TransposeSpellingPolicy } from "@score/shared";

export type ScoreRangeProfile = {
  id: string;
  label: string;
  minMidi: number;
  maxMidi: number;
};

export type ScoreRangeAssignment = {
  partId: string;
  profile: ScoreRangeProfile;
};

export type TransposeRangeDiagnostic = {
  profileId: string;
  label: string;
  minMidi: number;
  maxMidi: number;
  checkedPartIds: string[];
  lowestMidi: number | null;
  highestMidi: number | null;
  noteCount: number;
  lowNoteCount: number;
  highNoteCount: number;
  outOfRangeNoteCount: number;
  affectedPartIds: string[];
  warnings: string[];
};

export type TransposeRangeSuggestion = {
  semitones: number;
  directionLabel: string;
  sourceKey: ReturnType<typeof getScoreKeyInfo>;
  targetKey: ReturnType<typeof getScoreKeyInfo>;
  rangeDiagnostic: TransposeRangeDiagnostic;
  rangeDiagnostics: TransposeRangeDiagnostic[];
};

const PITCH_CLASS_BY_STEP = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
} as const;

const SHARP_SPELLING_BY_PITCH_CLASS: Array<Pick<ScorePitch, "step" | "alter">> = [
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

const FLAT_SPELLING_BY_PITCH_CLASS: Array<Pick<ScorePitch, "step" | "alter">> = [
  { step: "C", alter: 0 },
  { step: "D", alter: -1 },
  { step: "D", alter: 0 },
  { step: "E", alter: -1 },
  { step: "E", alter: 0 },
  { step: "F", alter: 0 },
  { step: "G", alter: -1 },
  { step: "G", alter: 0 },
  { step: "A", alter: -1 },
  { step: "A", alter: 0 },
  { step: "B", alter: -1 },
  { step: "B", alter: 0 },
];

const DIATONIC_STEPS: ScorePitchStep[] = ["C", "D", "E", "F", "G", "A", "B"];

const MODE_OFFSETS_FROM_MAJOR = new Map<string, number>([
  ["major", 0],
  ["ionian", 0],
  ["dorian", 2],
  ["phrygian", 4],
  ["lydian", 5],
  ["mixolydian", 7],
  ["minor", 9],
  ["aeolian", 9],
  ["locrian", 11],
]);

const MAJOR_KEY_BY_FIFTHS = new Map<number, string>([
  [-7, "Cb"],
  [-6, "Gb"],
  [-5, "Db"],
  [-4, "Ab"],
  [-3, "Eb"],
  [-2, "Bb"],
  [-1, "F"],
  [0, "C"],
  [1, "G"],
  [2, "D"],
  [3, "A"],
  [4, "E"],
  [5, "B"],
  [6, "F#"],
  [7, "C#"],
]);

const MINOR_KEY_BY_FIFTHS = new Map<number, string>([
  [-7, "Ab"],
  [-6, "Eb"],
  [-5, "Bb"],
  [-4, "F"],
  [-3, "C"],
  [-2, "G"],
  [-1, "D"],
  [0, "A"],
  [1, "E"],
  [2, "B"],
  [3, "F#"],
  [4, "C#"],
  [5, "G#"],
  [6, "D#"],
  [7, "A#"],
]);

const FIFTHS_BY_MAJOR_KEY = new Map<string, number>(Array.from(MAJOR_KEY_BY_FIFTHS, ([fifths, key]) => [key, fifths]));
const FIFTHS_BY_MINOR_KEY = new Map<string, number>(Array.from(MINOR_KEY_BY_FIFTHS, ([fifths, key]) => [key, fifths]));

function normalizePitchClass(value: number) {
  return ((value % 12) + 12) % 12;
}

export function semitonesForInstrumentPitchMode(semitonesFromConcertPitch: number, pitchMode: TransposePitchMode) {
  return pitchMode === "concert-to-written" ? semitonesFromConcertPitch : -semitonesFromConcertPitch;
}

function midiFromPitch(pitch: ScorePitch) {
  return (pitch.octave + 1) * 12 + PITCH_CLASS_BY_STEP[pitch.step] + pitch.alter;
}

function noteNameFromMidi(midi: number) {
  const pitch = pitchFromMidi(midi, "prefer-sharps");
  const accidental = pitch.alter > 0 ? "#".repeat(pitch.alter) : pitch.alter < 0 ? "b".repeat(Math.abs(pitch.alter)) : "";
  return `${pitch.step}${accidental}${pitch.octave}`;
}

function pitchFromMidi(midi: number, policy: "prefer-sharps" | "prefer-flats"): ScorePitch {
  const pitchClass = normalizePitchClass(midi);
  const spelling = (policy === "prefer-flats" ? FLAT_SPELLING_BY_PITCH_CLASS : SHARP_SPELLING_BY_PITCH_CLASS)[pitchClass];
  const octave = Math.floor((midi - PITCH_CLASS_BY_STEP[spelling.step] - spelling.alter) / 12) - 1;

  return {
    step: spelling.step,
    alter: spelling.alter,
    octave,
  };
}

function resolvePitchSpellingPolicy(
  policy: TransposeSpellingPolicy,
  pitch: ScorePitch,
  targetKey: ScoreKeySignature | undefined,
): "prefer-sharps" | "prefer-flats" {
  if (policy === "prefer-sharps" || policy === "prefer-flats") {
    return policy;
  }
  if (policy === "preserve" && pitch.alter !== 0) {
    return pitch.alter < 0 ? "prefer-flats" : "prefer-sharps";
  }
  if ((targetKey?.fifths ?? 0) < 0) {
    return "prefer-flats";
  }
  return "prefer-sharps";
}

function transposePitch(
  pitch: ScorePitch,
  semitones: number,
  policy: TransposeSpellingPolicy,
  targetKey: ScoreKeySignature | undefined,
  diatonicSteps?: number,
) {
  const targetMidi = midiFromPitch(pitch) + semitones;
  if (policy === "preserve" && Number.isInteger(diatonicSteps)) {
    const sourceStepIndex = DIATONIC_STEPS.indexOf(pitch.step);
    const targetDiatonicIndex = pitch.octave * 7 + sourceStepIndex + diatonicSteps!;
    const targetOctave = Math.floor(targetDiatonicIndex / 7);
    const targetStep = DIATONIC_STEPS[((targetDiatonicIndex % 7) + 7) % 7];
    const naturalMidi = (targetOctave + 1) * 12 + PITCH_CLASS_BY_STEP[targetStep];
    return { step: targetStep, alter: targetMidi - naturalMidi, octave: targetOctave };
  }
  return pitchFromMidi(targetMidi, resolvePitchSpellingPolicy(policy, pitch, targetKey));
}

function pitchClassFromName(name: string) {
  const match = /^([A-Ga-g])([#b]{0,2})$/.exec(name.trim());
  if (!match) {
    throw new Error(`Unsupported key tonic "${name}".`);
  }

  const step = match[1].toUpperCase() as keyof typeof PITCH_CLASS_BY_STEP;
  const alter = match[2].split("").reduce((total, accidental) => {
    if (accidental === "#") return total + 1;
    if (accidental === "b") return total - 1;
    return total;
  }, 0);

  return normalizePitchClass(PITCH_CLASS_BY_STEP[step] + alter);
}

function normalizeKeyMode(mode: string | undefined) {
  const normalized = mode?.trim().toLowerCase() || "major";
  return MODE_OFFSETS_FROM_MAJOR.has(normalized) ? normalized : "major";
}

function keyNameFromFifths(key: ScoreKeySignature | undefined) {
  const mode = normalizeKeyMode(key?.mode);
  const fifths = key?.fifths ?? 0;
  if (mode === "major" || mode === "ionian") {
    return MAJOR_KEY_BY_FIFTHS.get(fifths) ?? "C";
  }
  if (mode === "minor" || mode === "aeolian") {
    return MINOR_KEY_BY_FIFTHS.get(fifths) ?? "A";
  }
  const relativeMajor = MAJOR_KEY_BY_FIFTHS.get(fifths) ?? "C";
  const tonicClass = normalizePitchClass(pitchClassFromName(relativeMajor) + (MODE_OFFSETS_FROM_MAJOR.get(mode) ?? 0));
  const spelling = (fifths < 0 ? FLAT_SPELLING_BY_PITCH_CLASS : SHARP_SPELLING_BY_PITCH_CLASS)[tonicClass];
  return `${spelling.step}${spelling.alter > 0 ? "#".repeat(spelling.alter) : spelling.alter < 0 ? "b".repeat(-spelling.alter) : ""}`;
}

function findFirstKey(score: ScoreJson): ScoreKeySignature {
  for (const measure of score.measures) {
    if (measure.attributes?.key) {
      return measure.attributes.key;
    }
  }

  return {
    fifths: 0,
    mode: "major",
  };
}

function fifthsForKey(input: { tonic: string; mode: string }) {
  const mode = normalizeKeyMode(input.mode);
  const normalizedTonic = input.tonic.trim().replace(/^([a-g])/, (letter) => letter.toUpperCase());
  const directFifths = mode === "minor" || mode === "aeolian" ? FIFTHS_BY_MINOR_KEY.get(normalizedTonic) : mode === "major" || mode === "ionian" ? FIFTHS_BY_MAJOR_KEY.get(normalizedTonic) : undefined;
  const candidates = Array.from({ length: 15 }, (_, index) => index - 7).filter(
    (candidate) => pitchClassFromName(keyNameFromFifths({ fifths: candidate, mode })) === pitchClassFromName(normalizedTonic),
  );
  const exactCandidate = candidates.find((candidate) => keyNameFromFifths({ fifths: candidate, mode }) === normalizedTonic);
  const fifths = directFifths ?? exactCandidate ?? candidates.sort((left, right) => Math.abs(left) - Math.abs(right))[0];

  if (fifths === undefined) {
    throw new Error(`Unsupported ${mode} target key "${input.tonic}".`);
  }

  return fifths;
}

export function getScoreKeyInfo(score: ScoreJson) {
  const key = findFirstKey(score);
  const mode = normalizeKeyMode(key.mode);
  const tonic = keyNameFromFifths(key);

  return {
    tonic,
    mode,
    fifths: key.fifths,
    display: `${tonic} ${mode}`,
  };
}

export function semitonesForTargetKey(input: {
  score: ScoreJson;
  targetTonic: string;
  targetMode?: string;
}) {
  const sourceKey = getScoreKeyInfo(input.score);
  const targetMode = normalizeKeyMode(input.targetMode ?? sourceKey.mode);
  const sourceClass = pitchClassFromName(sourceKey.tonic);
  const targetClass = pitchClassFromName(input.targetTonic);
  let semitones = normalizePitchClass(targetClass - sourceClass);

  if (semitones > 6) {
    semitones -= 12;
  }

  return {
    semitones,
    source: sourceKey,
    target: {
      tonic: input.targetTonic,
      mode: targetMode,
      fifths: fifthsForKey({
        tonic: input.targetTonic,
        mode: targetMode,
      }),
      display: `${input.targetTonic} ${targetMode}`,
    },
  };
}

function transposeKeySignature(
  key: ScoreKeySignature | undefined,
  semitones: number,
  spellingPolicy: TransposeSpellingPolicy = "auto",
): ScoreKeySignature | undefined {
  if (!key) {
    return key;
  }

  const mode = normalizeKeyMode(key.mode);
  const sourceTonic = keyNameFromFifths(key);
  const targetPitchClass = normalizePitchClass(pitchClassFromName(sourceTonic) + semitones);
  const candidates = Array.from({ length: 15 }, (_, index) => index - 7).filter(
    (candidate) => pitchClassFromName(keyNameFromFifths({ fifths: candidate, mode })) === targetPitchClass,
  );
  const preferredCandidates = candidates.filter((candidate) =>
    spellingPolicy === "prefer-flats" ? candidate <= 0 : spellingPolicy === "prefer-sharps" ? candidate >= 0 : true,
  );
  const candidate = (preferredCandidates.length > 0 ? preferredCandidates : candidates).sort(
    (left, right) => Math.abs(left) - Math.abs(right),
  )[0];

  return {
    ...key,
    fifths: candidate ?? key.fifths,
    mode,
  };
}

function keyInfoAfterSemitoneMove(score: ScoreJson, semitones: number) {
  const sourceKey = findFirstKey(score);
  const targetKey = transposeKeySignature(sourceKey, semitones) ?? sourceKey;
  const mode = normalizeKeyMode(targetKey.mode);
  const tonic = keyNameFromFifths(targetKey);

  return {
    tonic,
    mode,
    fifths: targetKey.fifths,
    display: `${tonic} ${mode}`,
  };
}

export function transposeScoreJson(input: {
  score: ScoreJson;
  semitones: number;
  targetKey?: {
    tonic: string;
    mode: string;
    fifths: number;
  };
  operationLabel?: string;
  spellingPolicy?: TransposeSpellingPolicy;
  diatonicSteps?: number;
  generatedAt?: string;
}): ScoreJson {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const direction = input.semitones > 0 ? `+${input.semitones}` : String(input.semitones);
  const targetLabel = input.targetKey ? ` to ${input.targetKey.tonic} ${normalizeKeyMode(input.targetKey.mode)}` : "";
  const operationLabel = input.operationLabel ? ` for ${input.operationLabel}` : "";
  const spellingPolicy = input.spellingPolicy ?? "auto";
  let appliedTargetKey = false;

  return {
    ...input.score,
    title: `${input.score.title} (${direction} semitones${targetLabel}${operationLabel})`,
    metadata: {
      ...input.score.metadata,
      warnings: [
        ...input.score.metadata.warnings,
        `Transposed ${direction} semitones${targetLabel}${operationLabel} using ${spellingPolicy} spelling at ${generatedAt}.`,
      ],
    },
    measures: input.score.measures.map((measure) => ({
      ...measure,
      attributes: measure.attributes
        ? {
            ...measure.attributes,
            key:
              input.targetKey && measure.attributes.key && !appliedTargetKey
                ? (() => {
                    appliedTargetKey = true;
                    return {
                      fifths: input.targetKey!.fifths,
                      mode: normalizeKeyMode(input.targetKey!.mode),
                    };
                  })()
                : transposeKeySignature(measure.attributes.key, input.semitones, spellingPolicy),
          }
        : measure.attributes,
      events: measure.events.map((event) => {
        if (event.type === "rest") {
          return event;
        }

        return {
          ...event,
          pitch: transposePitch(
            event.pitch,
            input.semitones,
            spellingPolicy,
            input.targetKey ?? transposeKeySignature(measure.attributes?.key, input.semitones, spellingPolicy),
            input.diatonicSteps,
          ),
        };
      }),
    })),
  };
}

export function analyzeTransposedScoreRange(
  score: ScoreJson,
  profile: ScoreRangeProfile,
  options: {
    partIds?: string[];
  } = {},
): TransposeRangeDiagnostic {
  let lowestMidi: number | null = null;
  let highestMidi: number | null = null;
  let noteCount = 0;
  let lowNoteCount = 0;
  let highNoteCount = 0;
  const affectedPartIds = new Set<string>();
  const checkedPartIds = Array.from(new Set((options.partIds ?? []).filter(Boolean)));
  const checkedPartIdSet = checkedPartIds.length > 0 ? new Set(checkedPartIds) : null;

  for (const measure of score.measures) {
    if (checkedPartIdSet && !checkedPartIdSet.has(measure.partId)) {
      continue;
    }

    for (const event of measure.events) {
      if (event.type !== "note") {
        continue;
      }

      const midi = midiFromPitch(event.pitch);
      noteCount += 1;
      lowestMidi = lowestMidi === null ? midi : Math.min(lowestMidi, midi);
      highestMidi = highestMidi === null ? midi : Math.max(highestMidi, midi);

      if (midi < profile.minMidi) {
        lowNoteCount += 1;
        affectedPartIds.add(measure.partId);
      } else if (midi > profile.maxMidi) {
        highNoteCount += 1;
        affectedPartIds.add(measure.partId);
      }
    }
  }

  const outOfRangeNoteCount = lowNoteCount + highNoteCount;
  const warnings: string[] = [];
  if (noteCount === 0) {
    warnings.push(`Range check for ${profile.label} found no notes to inspect.`);
  } else if (outOfRangeNoteCount > 0) {
    const lowText = lowNoteCount > 0 ? `${lowNoteCount} below ${noteNameFromMidi(profile.minMidi)}` : "";
    const highText = highNoteCount > 0 ? `${highNoteCount} above ${noteNameFromMidi(profile.maxMidi)}` : "";
    warnings.push(
      `Range check for ${profile.label}: ${outOfRangeNoteCount}/${noteCount} notes are outside ${noteNameFromMidi(profile.minMidi)}-${noteNameFromMidi(
        profile.maxMidi,
      )}${lowText || highText ? ` (${[lowText, highText].filter(Boolean).join(", ")})` : ""}.`,
    );
  }

  return {
    profileId: profile.id,
    label: profile.label,
    minMidi: profile.minMidi,
    maxMidi: profile.maxMidi,
    checkedPartIds,
    lowestMidi,
    highestMidi,
    noteCount,
    lowNoteCount,
    highNoteCount,
    outOfRangeNoteCount,
    affectedPartIds: Array.from(affectedPartIds),
    warnings,
  };
}

export function suggestTranspositionsForRange(input: {
  score: ScoreJson;
  profile: ScoreRangeProfile;
  partIds?: string[];
  minSemitones?: number;
  maxSemitones?: number;
  limit?: number;
}): TransposeRangeSuggestion[] {
  const rawMinSemitones = Math.round(input.minSemitones ?? -12);
  const rawMaxSemitones = Math.round(input.maxSemitones ?? 12);
  const minSemitones = Math.max(-24, Math.min(24, Math.min(rawMinSemitones, rawMaxSemitones)));
  const maxSemitones = Math.max(-24, Math.min(24, Math.max(rawMinSemitones, rawMaxSemitones)));
  const limit = Math.max(1, Math.min(24, Math.round(input.limit ?? 6)));
  const suggestions: TransposeRangeSuggestion[] = [];
  const sourceKey = getScoreKeyInfo(input.score);

  for (let semitones = minSemitones; semitones <= maxSemitones; semitones += 1) {
    if (semitones === 0) {
      continue;
    }

    const transposedScore = transposeScoreJson({
      score: input.score,
      semitones,
      operationLabel: `${input.profile.label} range preflight`,
      generatedAt: "range-preflight",
    });
    const rangeDiagnostic = analyzeTransposedScoreRange(transposedScore, input.profile, {
      partIds: input.partIds,
    });
    suggestions.push({
      semitones,
      directionLabel: semitones > 0 ? `+${semitones}` : String(semitones),
      sourceKey,
      targetKey: keyInfoAfterSemitoneMove(input.score, semitones),
      rangeDiagnostic,
      rangeDiagnostics: [rangeDiagnostic],
    });
  }

  return suggestions
    .sort((left, right) => {
      const leftDiagnostic = summarizeRangeDiagnostics(left.rangeDiagnostics);
      const rightDiagnostic = summarizeRangeDiagnostics(right.rangeDiagnostics);
      return (
        leftDiagnostic.outOfRangeNoteCount - rightDiagnostic.outOfRangeNoteCount ||
        leftDiagnostic.highNoteCount - rightDiagnostic.highNoteCount ||
        leftDiagnostic.lowNoteCount - rightDiagnostic.lowNoteCount ||
        Math.abs(left.semitones) - Math.abs(right.semitones) ||
        left.semitones - right.semitones
      );
    })
    .slice(0, limit);
}

export function analyzeAssignedPartRanges(score: ScoreJson, assignments: ScoreRangeAssignment[]): TransposeRangeDiagnostic[] {
  return assignments.map((assignment) =>
    analyzeTransposedScoreRange(score, assignment.profile, {
      partIds: [assignment.partId],
    }),
  );
}

export function suggestTranspositionsForAssignedRanges(input: {
  score: ScoreJson;
  assignments: ScoreRangeAssignment[];
  minSemitones?: number;
  maxSemitones?: number;
  limit?: number;
}): TransposeRangeSuggestion[] {
  if (input.assignments.length === 0) {
    return [];
  }

  const rawMinSemitones = Math.round(input.minSemitones ?? -12);
  const rawMaxSemitones = Math.round(input.maxSemitones ?? 12);
  const minSemitones = Math.max(-24, Math.min(24, Math.min(rawMinSemitones, rawMaxSemitones)));
  const maxSemitones = Math.max(-24, Math.min(24, Math.max(rawMinSemitones, rawMaxSemitones)));
  const limit = Math.max(1, Math.min(24, Math.round(input.limit ?? 6)));
  const sourceKey = getScoreKeyInfo(input.score);
  const suggestions: TransposeRangeSuggestion[] = [];

  for (let semitones = minSemitones; semitones <= maxSemitones; semitones += 1) {
    if (semitones === 0) {
      continue;
    }

    const transposedScore = transposeScoreJson({
      score: input.score,
      semitones,
      operationLabel: "assigned range preflight",
      generatedAt: "range-preflight",
    });
    const rangeDiagnostics = analyzeAssignedPartRanges(transposedScore, input.assignments);
    suggestions.push({
      semitones,
      directionLabel: semitones > 0 ? `+${semitones}` : String(semitones),
      sourceKey,
      targetKey: keyInfoAfterSemitoneMove(input.score, semitones),
      rangeDiagnostic: summarizeRangeDiagnostics(rangeDiagnostics),
      rangeDiagnostics,
    });
  }

  return suggestions
    .sort((left, right) => {
      const leftDiagnostic = left.rangeDiagnostic;
      const rightDiagnostic = right.rangeDiagnostic;
      return (
        leftDiagnostic.outOfRangeNoteCount - rightDiagnostic.outOfRangeNoteCount ||
        leftDiagnostic.highNoteCount - rightDiagnostic.highNoteCount ||
        leftDiagnostic.lowNoteCount - rightDiagnostic.lowNoteCount ||
        Math.abs(left.semitones) - Math.abs(right.semitones) ||
        left.semitones - right.semitones
      );
    })
    .slice(0, limit);
}

export function summarizeRangeDiagnostics(diagnostics: TransposeRangeDiagnostic[]): TransposeRangeDiagnostic {
  if (diagnostics.length === 0) {
    return {
      profileId: "assigned-ranges",
      label: "Assigned part ranges",
      minMidi: 0,
      maxMidi: 0,
      checkedPartIds: [],
      lowestMidi: null,
      highestMidi: null,
      noteCount: 0,
      lowNoteCount: 0,
      highNoteCount: 0,
      outOfRangeNoteCount: 0,
      affectedPartIds: [],
      warnings: [],
    };
  }

  const checkedPartIds = Array.from(new Set(diagnostics.flatMap((diagnostic) => diagnostic.checkedPartIds)));
  const affectedPartIds = Array.from(new Set(diagnostics.flatMap((diagnostic) => diagnostic.affectedPartIds)));
  const minMidi = Math.min(...diagnostics.map((diagnostic) => diagnostic.minMidi));
  const maxMidi = Math.max(...diagnostics.map((diagnostic) => diagnostic.maxMidi));
  const lowestValues = diagnostics.map((diagnostic) => diagnostic.lowestMidi).filter((value): value is number => value !== null);
  const highestValues = diagnostics.map((diagnostic) => diagnostic.highestMidi).filter((value): value is number => value !== null);

  return {
    profileId: diagnostics.length === 1 ? diagnostics[0].profileId : "assigned-ranges",
    label: diagnostics.length === 1 ? diagnostics[0].label : "Assigned part ranges",
    minMidi,
    maxMidi,
    checkedPartIds,
    lowestMidi: lowestValues.length > 0 ? Math.min(...lowestValues) : null,
    highestMidi: highestValues.length > 0 ? Math.max(...highestValues) : null,
    noteCount: diagnostics.reduce((total, diagnostic) => total + diagnostic.noteCount, 0),
    lowNoteCount: diagnostics.reduce((total, diagnostic) => total + diagnostic.lowNoteCount, 0),
    highNoteCount: diagnostics.reduce((total, diagnostic) => total + diagnostic.highNoteCount, 0),
    outOfRangeNoteCount: diagnostics.reduce((total, diagnostic) => total + diagnostic.outOfRangeNoteCount, 0),
    affectedPartIds,
    warnings: diagnostics.flatMap((diagnostic) => diagnostic.warnings),
  };
}
