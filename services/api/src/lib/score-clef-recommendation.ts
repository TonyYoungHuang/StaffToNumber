import type { ScoreClef, ScoreJson, ScoreMeasure, ScoreNoteEvent, ScorePart, ScorePitch } from "@score/shared";

export type ScoreClefRecommendation = {
  partId: string;
  partName: string;
  clef: ScoreClef;
  lowestMidi: number | null;
  highestMidi: number | null;
  averageMidi: number | null;
  noteCount: number;
  reason: string;
  currentClef?: ScoreClef;
};

const STEP_TO_SEMITONE: Record<ScorePitch["step"], number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

function pitchToMidi(pitch: ScorePitch) {
  return (pitch.octave + 1) * 12 + STEP_TO_SEMITONE[pitch.step] + pitch.alter;
}

function notesForPart(score: ScoreJson, partId: string) {
  return score.measures
    .filter((measure) => measure.partId === partId)
    .flatMap((measure) => measure.events)
    .filter((event): event is ScoreNoteEvent => event.type === "note");
}

function firstMeasureForPart(score: ScoreJson, partId: string) {
  return score.measures
    .filter((measure) => measure.partId === partId)
    .sort((left, right) => left.sequence - right.sequence || left.number.localeCompare(right.number))[0];
}

function firstClefForPart(score: ScoreJson, partId: string) {
  return score.measures.find((measure) => measure.partId === partId && measure.attributes?.clef)?.attributes?.clef;
}

const CLEF_CANDIDATES: Array<{ clef: ScoreClef; label: string; comfortableMin: number; comfortableMax: number; center: number }> = [
  { clef: { sign: "G", line: 2 }, label: "treble", comfortableMin: 60, comfortableMax: 81, center: 70 },
  { clef: { sign: "F", line: 4 }, label: "bass", comfortableMin: 36, comfortableMax: 60, center: 48 },
  { clef: { sign: "C", line: 3 }, label: "alto", comfortableMin: 48, comfortableMax: 72, center: 60 },
  { clef: { sign: "C", line: 4 }, label: "tenor", comfortableMin: 45, comfortableMax: 69, center: 57 },
];

function clefReadabilityCost(midiValues: number[], candidate: (typeof CLEF_CANDIDATES)[number]) {
  const ledgerCost = midiValues.reduce((total, midi) => {
    if (midi < candidate.comfortableMin) return total + (candidate.comfortableMin - midi) ** 1.35;
    if (midi > candidate.comfortableMax) return total + (midi - candidate.comfortableMax) ** 1.35;
    return total;
  }, 0);
  const average = midiValues.reduce((total, midi) => total + midi, 0) / midiValues.length;
  return ledgerCost * 10 + Math.abs(average - candidate.center);
}

function clefNamePreference(part: ScorePart, label: string) {
  const name = part.name.toLowerCase();
  if ((name.includes("bass") || name.includes("cello") || name.includes("contrabass") || name.includes("tuba")) && label === "bass") return -40;
  if (name.includes("viola") && label === "alto") return -40;
  if (name.includes("tenor") && label === "tenor") return -32;
  if ((name.includes("violin") || name.includes("flute") || name.includes("soprano") || name.includes("clarinet") || name.includes("trumpet")) && label === "treble") return -32;
  return 0;
}

function recommendClef(input: { part: ScorePart; midiValues: number[]; lowestMidi: number; highestMidi: number; averageMidi: number }): { clef: ScoreClef; reason: string } {
  const name = input.part.name.toLowerCase();

  if (name.includes("tenor") && input.highestMidi <= 76) {
    return {
      clef: { sign: "G", line: 2, octaveChange: -1 },
      reason: "Tenor-labelled part in a vocal working range; treble clef with octave-down marking keeps the staff readable.",
    };
  }

  const ranked = CLEF_CANDIDATES.map((candidate) => ({
    ...candidate,
    cost: clefReadabilityCost(input.midiValues, candidate) + clefNamePreference(input.part, candidate.label),
  })).sort((left, right) => left.cost - right.cost);
  const winner = ranked[0];
  return {
    clef: winner.clef,
    reason: `${winner.label[0].toUpperCase()}${winner.label.slice(1)} clef has the lowest estimated ledger-line cost across ${input.midiValues.length} notes (${input.lowestMidi}-${input.highestMidi} MIDI).`,
  };
}

export function recommendScoreClefs(score: ScoreJson): ScoreClefRecommendation[] {
  return score.parts.map((part) => {
    const notes = notesForPart(score, part.id);
    const midiValues = notes.map((note) => pitchToMidi(note.pitch));
    const currentClef = firstClefForPart(score, part.id);

    if (midiValues.length === 0) {
      return {
        partId: part.id,
        partName: part.name,
        clef: currentClef ?? { sign: "G", line: 2 },
        lowestMidi: null,
        highestMidi: null,
        averageMidi: null,
        noteCount: 0,
        reason: "No pitched notes were found, so the current clef or treble default is kept.",
        currentClef,
      };
    }

    const lowestMidi = Math.min(...midiValues);
    const highestMidi = Math.max(...midiValues);
    const averageMidi = midiValues.reduce((total, midi) => total + midi, 0) / midiValues.length;
    const recommendation = recommendClef({
      part,
      midiValues,
      lowestMidi,
      highestMidi,
      averageMidi,
    });

    return {
      partId: part.id,
      partName: part.name,
      clef: recommendation.clef,
      lowestMidi,
      highestMidi,
      averageMidi,
      noteCount: midiValues.length,
      reason: recommendation.reason,
      currentClef,
    };
  });
}

export function applyScoreClefRecommendations(input: {
  score: ScoreJson;
  recommendations?: ScoreClefRecommendation[];
  generatedAt?: string;
}): ScoreJson {
  const recommendations = input.recommendations ?? recommendScoreClefs(input.score);
  const recommendationByPartId = new Map(recommendations.filter((recommendation) => recommendation.noteCount > 0).map((recommendation) => [recommendation.partId, recommendation]));

  if (recommendationByPartId.size === 0) {
    throw new Error("No pitched parts are available for clef recommendation.");
  }

  const firstMeasureIds = new Set<string>();
  for (const partId of recommendationByPartId.keys()) {
    const measure = firstMeasureForPart(input.score, partId);
    if (measure) {
      firstMeasureIds.add(measure.id);
    }
  }

  const measures: ScoreMeasure[] = input.score.measures.map((measure) => {
    if (!firstMeasureIds.has(measure.id)) {
      return measure;
    }

    const recommendation = recommendationByPartId.get(measure.partId);
    if (!recommendation) {
      return measure;
    }

    return {
      ...measure,
      attributes: {
        ...(measure.attributes ?? {}),
        clef: recommendation.clef,
      },
    };
  });

  const generatedAt = input.generatedAt ?? new Date().toISOString();
  return {
    ...input.score,
    metadata: {
      ...input.score.metadata,
      warnings: [...input.score.metadata.warnings, `Automatic clef recommendations applied at ${generatedAt}.`],
    },
    measures,
  };
}
