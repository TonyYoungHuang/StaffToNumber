import type { ScoreJson, ScoreNoteEvent } from "@score/shared";
import { transposeScoreJson } from "../../../services/api/src/lib/score-transpose.ts";

/** Offline fixture preparation only; personal-score transposition is unchanged. */
export function transposeGuestSampleScore(input: {
  score: ScoreJson;
  semitones: number;
  targetKey: { tonic: string; mode: string; fifths: number };
  generatedAt: string;
}) {
  const sourceCopy = structuredClone(input.score);
  const transformed = input.semitones === 0 ? sourceCopy : transposeScoreJson({ ...input, score: sourceCopy });
  const sourceNotes = input.score.measures.flatMap((measure) => measure.events)
    .filter((event): event is ScoreNoteEvent => event.type === "note");
  const pitchesById = new Map(transformed.measures.flatMap((measure) => measure.events)
    .filter((event): event is ScoreNoteEvent => event.type === "note")
    .map((event) => [event.id, event.pitch]));

  // Every harmony root in this one fixture also occurs as a melody note. Use
  // those authoritative transposed pitches rather than a separate pitch engine.
  for (const measure of transformed.measures) {
    for (const harmony of measure.harmonies ?? []) {
      const probe = sourceNotes.find((note) => note.pitch.step === harmony.rootStep && note.pitch.alter === harmony.rootAlter);
      const pitch = probe ? pitchesById.get(probe.id) : undefined;
      if (!pitch) throw new Error(`Sample harmony ${harmony.id} has no matching pitch probe.`);
      harmony.rootStep = pitch.step;
      harmony.rootAlter = pitch.alter;
      if (harmony.text) {
        const root = pitch.step + (pitch.alter > 0 ? "#".repeat(pitch.alter) : "b".repeat(-pitch.alter));
        harmony.text = harmony.text.replace(/^[A-G](?:[#b♯♭])*/u, root);
      }
    }
  }
  return transformed;
}
