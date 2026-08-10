import type { ScoreJson, ScoreMeasure } from "@score/shared";

const KEY_SIGNATURES = ["Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#"] as const;

export function findVexFlowKeySignature(score: ScoreJson, partId: string, measure: ScoreMeasure) {
  const key = score.measures
    .filter((item) => item.partId === partId && item.sequence <= measure.sequence && item.attributes?.key)
    .sort((a, b) => b.sequence - a.sequence)[0]?.attributes?.key;
  return key ? vexFlowKeySignatureFromFifths(key.fifths) : null;
}

export function vexFlowKeySignatureFromFifths(fifths: number) {
  const normalized = Math.min(7, Math.max(-7, Number.isFinite(fifths) ? Math.trunc(fifths) : 0));
  return KEY_SIGNATURES[normalized + 7];
}
