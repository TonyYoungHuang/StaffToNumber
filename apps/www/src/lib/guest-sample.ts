import type { ScoreJson } from "@score/shared";
import rawSample from "./guest-sample-data.json";

export const GUEST_SAMPLE_KEYS = ["C", "D", "F", "G", "Bb"] as const;
export type GuestSampleKey = (typeof GUEST_SAMPLE_KEYS)[number];
export type GuestSampleNotation = "staff" | "jianpu";
export type GuestSampleEvent = {
  id: string; type: "note" | "rest"; durationType?: string; dots: number;
  degree?: number; accidental?: number; octaveShift?: number;
};
export type GuestSampleVariant = {
  tonic: string; semitones: number; fifths: number; staffImage: string;
  harmonyLabels: string[];
  jianpu: Array<{
    id: string; number: string;
    barlines: Array<{ repeatDirection?: "forward" | "backward"; ending?: { number: string; type: string } }>;
    events: GuestSampleEvent[];
  }>;
  playback: {
    tempoBpm: number; totalBeats: number;
    measures: Array<{ measureId: string; startBeat: number; durationBeats: number }>;
    events: Array<{ sourceEventId: string; measureId: string; midi: number; startBeat: number; durationBeats: number; soundDurationBeats: number; velocity: number }>;
  };
};
export const guestSample = rawSample as unknown as {
  source: { slug: string; license: string; musicXmlUrl: string; image: string };
  score: ScoreJson;
  variants: Record<GuestSampleKey, GuestSampleVariant>;
};

export function guestSampleDuration(variant: GuestSampleVariant) {
  return variant.playback.totalBeats * 60 / variant.playback.tempoBpm;
}

export function guestSampleMeasureAt(variant: GuestSampleVariant, seconds: number) {
  const beat = seconds * variant.playback.tempoBpm / 60;
  return variant.playback.measures.find((measure) => beat >= measure.startBeat && beat < measure.startBeat + measure.durationBeats)?.measureId;
}

export function guestSampleFrequency(midi: number) { return 440 * 2 ** ((midi - 69) / 12); }

/** The demo only selects prepared data; personal work starts through the existing app entry. */
export function guestSampleTaskSource(key: GuestSampleKey, notation: GuestSampleNotation) {
  return notation === "jianpu" ? "staff-to-jianpu" : key !== "C" ? "transpose-score" : "home";
}
