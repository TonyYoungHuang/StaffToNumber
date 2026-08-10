import type { ScoreMeasure } from "@score/shared";

export type VexFlowMeasureAnnotation = {
  id: string;
  kind: "harmony" | "tempo" | "rehearsal" | "dynamic" | "wedge" | "navigation";
  text: string;
  position: "above" | "below";
  line: number;
};

export function buildVexFlowMeasureAnnotations(measure: ScoreMeasure): VexFlowMeasureAnnotation[] {
  const above: Array<Omit<VexFlowMeasureAnnotation, "position" | "line">> = [];
  const below: Array<Omit<VexFlowMeasureAnnotation, "position" | "line">> = [];

  for (const mark of measure.rehearsalMarks ?? []) {
    if (mark.text.trim()) above.push({ id: mark.id, kind: "rehearsal", text: mark.text.trim() });
  }
  for (const tempo of measure.tempos ?? []) {
    above.push({ id: tempo.id, kind: "tempo", text: `${beatUnitLabel(tempo.beatUnit)} = ${tempo.bpm}` });
  }
  for (const harmony of measure.harmonies ?? []) {
    above.push({ id: harmony.id, kind: "harmony", text: harmony.text?.trim() || formatHarmony(harmony.rootStep, harmony.rootAlter, harmony.kind) });
  }
  for (const navigation of measure.navigationMarks ?? []) {
    if (navigation.text.trim()) above.push({ id: navigation.id, kind: "navigation", text: navigation.text.trim() });
  }
  for (const dynamic of measure.dynamics ?? []) {
    below.push({ id: dynamic.id, kind: "dynamic", text: dynamic.value });
  }
  for (const wedge of measure.wedges ?? []) {
    if (wedge.type !== "stop") below.push({ id: wedge.id, kind: "wedge", text: wedge.type === "crescendo" ? "cresc." : "dim." });
  }

  return [
    ...above.map((item, line) => ({ ...item, position: "above" as const, line })),
    ...below.map((item, line) => ({ ...item, position: "below" as const, line })),
  ];
}

function formatHarmony(step: string, alter: number, kind: string) {
  const accidental = alter >= 2 ? "##" : alter === 1 ? "#" : alter === -1 ? "b" : alter <= -2 ? "bb" : "";
  const normalizedKind = kind === "major" ? "" : kind === "minor" ? "m" : kind === "dominant" ? "7" : kind;
  return `${step}${accidental}${normalizedKind}`;
}

function beatUnitLabel(beatUnit: string | undefined) {
  if (beatUnit === "half") return "h";
  if (beatUnit === "eighth") return "e";
  if (beatUnit === "16th") return "s";
  return "q";
}
