import type { PlaybackDocument, PlaybackTempoChange } from "@score/shared";

export type PlaybackTempoSegment = {
  startBeat: number;
  bpm: number;
};

export function buildPlaybackTempoSegments(playback: Pick<PlaybackDocument, "tempoBpm" | "tempoChanges">, tempoOverride?: number) {
  const sourceBase = clamp(playback.tempoBpm, 20, 400);
  const targetBase = clamp(tempoOverride ?? sourceBase, 20, 400);
  const ratio = targetBase / sourceBase;
  const changes = [...(playback.tempoChanges ?? [])]
    .filter(validTempoChange)
    .sort((left, right) => left.startBeat - right.startBeat || left.id.localeCompare(right.id));
  const byBeat = new Map<number, PlaybackTempoSegment>([[0, { startBeat: 0, bpm: targetBase }]]);
  for (const change of changes) {
    byBeat.set(change.startBeat, { startBeat: change.startBeat, bpm: clamp(Number((change.bpm * ratio).toFixed(6)), 20, 400) });
  }
  return [...byBeat.values()].sort((left, right) => left.startBeat - right.startBeat);
}

export function playbackSecondsAtBeat(segments: PlaybackTempoSegment[], targetBeat: number) {
  const beat = Math.max(0, targetBeat);
  let seconds = 0;
  let cursorBeat = 0;
  let bpm = segments[0]?.bpm ?? 96;
  for (const segment of segments.slice(1)) {
    if (segment.startBeat >= beat) break;
    seconds += (segment.startBeat - cursorBeat) * 60 / bpm;
    cursorBeat = segment.startBeat;
    bpm = segment.bpm;
  }
  return seconds + (beat - cursorBeat) * 60 / bpm;
}

export function playbackTempoAtBeat(segments: PlaybackTempoSegment[], targetBeat: number) {
  let bpm = segments[0]?.bpm ?? 96;
  for (const segment of segments) {
    if (segment.startBeat > targetBeat) break;
    bpm = segment.bpm;
  }
  return bpm;
}

function validTempoChange(change: PlaybackTempoChange) {
  return Number.isFinite(change.startBeat) && change.startBeat >= 0 && Number.isFinite(change.bpm) && change.bpm > 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
