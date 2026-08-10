import type { PlaybackDocument, PlaybackNoteEvent } from "@score/shared";

export type PracticeAlignment = {
  recordingStartSeconds: number;
  timeScale: number;
  source: "automatic" | "manual";
};

export type PracticeEventFeedback = {
  eventId: string;
  sourceEventId: string;
  measureId: string;
  measureNumber: string;
  noteName: string;
  expectedMidi: number;
  recordingTimeSeconds: number;
  detectedOnsetSeconds: number | null;
  onsetDeltaMs: number | null;
  detectedFrequencyHz: number | null;
  pitchCents: number | null;
  pitchConfidence: number | null;
  status: "matched" | "pitch_attention" | "rhythm_attention" | "missing" | "polyphonic_unscored";
};

export type PracticeMeasureFeedback = {
  measureId: string;
  measureNumber: string;
  eventCount: number;
  detectedCount: number;
  pitchAttentionCount: number;
  rhythmAttentionCount: number;
  polyphonicUnscoredCount: number;
};

export type PracticePerformanceAnalysis = {
  schemaVersion: 1;
  algorithmVersion: "practice-autocorrelation-v1";
  scoreRevisionId: string | null;
  generatedAt: string;
  alignment: PracticeAlignment;
  activeRegion: { startSeconds: number; endSeconds: number } | null;
  completeness: { expected: number; detected: number; ratio: number };
  events: PracticeEventFeedback[];
  measures: PracticeMeasureFeedback[];
  warnings: string[];
};

type PitchDetection = { frequencyHz: number; confidence: number } | null;

function rms(samples: Float32Array, start: number, end: number) {
  let sum = 0;
  for (let index = start; index < end; index += 1) sum += samples[index] * samples[index];
  return end > start ? Math.sqrt(sum / (end - start)) : 0;
}

export function detectActiveAudioRegion(samples: Float32Array, sampleRate: number) {
  const windowSize = Math.max(32, Math.round(sampleRate * 0.02));
  const values: number[] = [];
  for (let start = 0; start < samples.length; start += windowSize) values.push(rms(samples, start, Math.min(samples.length, start + windowSize)));
  const maximum = Math.max(0, ...values);
  const threshold = Math.max(0.008, maximum * 0.12);
  const first = values.findIndex((value) => value >= threshold);
  let last = -1;
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (values[index] >= threshold) {
      last = index;
      break;
    }
  }
  if (first < 0 || last < first || maximum < 0.008) return null;
  return {
    startSeconds: (first * windowSize) / sampleRate,
    endSeconds: Math.min(samples.length / sampleRate, ((last + 1) * windowSize) / sampleRate),
    threshold,
  };
}

export function detectFundamentalFrequency(samples: Float32Array, sampleRate: number, minHz = 65, maxHz = 1_200): PitchDetection {
  if (samples.length < 64) return null;
  let mean = 0;
  for (const sample of samples) mean += sample;
  mean /= samples.length;
  let energy = 0;
  const centered = new Float32Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / Math.max(1, samples.length - 1));
    centered[index] = (samples[index] - mean) * window;
    energy += centered[index] * centered[index];
  }
  if (energy / samples.length < 0.00002) return null;

  const minimumLag = Math.max(2, Math.floor(sampleRate / maxHz));
  const maximumLag = Math.min(samples.length - 2, Math.ceil(sampleRate / minHz));
  let bestLag = 0;
  let bestCorrelation = -1;
  for (let lag = minimumLag; lag <= maximumLag; lag += 1) {
    let product = 0;
    let leftEnergy = 0;
    let rightEnergy = 0;
    for (let index = 0; index < centered.length - lag; index += 1) {
      const left = centered[index];
      const right = centered[index + lag];
      product += left * right;
      leftEnergy += left * left;
      rightEnergy += right * right;
    }
    const correlation = product / Math.sqrt(Math.max(1e-12, leftEnergy * rightEnergy));
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestLag = lag;
    }
  }
  if (bestLag === 0 || bestCorrelation < 0.35) return null;
  return { frequencyHz: sampleRate / bestLag, confidence: Math.min(1, bestCorrelation) };
}

function detectOnset(samples: Float32Array, sampleRate: number, startSeconds: number, endSeconds: number) {
  const start = Math.max(0, Math.floor(startSeconds * sampleRate));
  const end = Math.min(samples.length, Math.ceil(endSeconds * sampleRate));
  const windowSize = Math.max(16, Math.round(sampleRate * 0.01));
  let localMaximum = 0;
  for (let cursor = start; cursor < end; cursor += windowSize) localMaximum = Math.max(localMaximum, rms(samples, cursor, Math.min(end, cursor + windowSize)));
  const threshold = Math.max(0.008, localMaximum * 0.18);
  for (let cursor = start; cursor < end; cursor += windowSize) {
    if (rms(samples, cursor, Math.min(end, cursor + windowSize)) >= threshold) return cursor / sampleRate;
  }
  return null;
}

function eventGroups(events: PlaybackNoteEvent[]) {
  const groups = new Map<string, PlaybackNoteEvent[]>();
  for (const event of events) {
    const key = event.startBeat.toFixed(6);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return groups;
}

export function analyzePracticePerformance(input: {
  samples: Float32Array;
  sampleRate: number;
  playback: PlaybackDocument;
  events?: PlaybackNoteEvent[];
  scoreRevisionId?: string | null;
  alignment?: { recordingStartSeconds: number; timeScale: number } | null;
}): PracticePerformanceAnalysis {
  const events = (input.events ?? input.playback.events).slice().sort((left, right) => left.startBeat - right.startBeat || left.midi - right.midi);
  const warnings: string[] = [];
  const active = detectActiveAudioRegion(input.samples, input.sampleRate);
  if (events.length === 0) warnings.push("The selected score range has no note events to compare.");
  if (!active) warnings.push("No stable active audio region was detected in the recording.");

  const startBeat = events.length ? Math.min(...events.map((event) => event.startBeat)) : 0;
  const endBeat = events.length ? Math.max(...events.map((event) => event.startBeat + event.durationBeats)) : 1;
  const secondsPerBeat = 60 / Math.max(1, input.playback.tempoBpm);
  const expectedDuration = Math.max(0.1, (endBeat - startBeat) * secondsPerBeat);
  const automaticScale = active ? Math.max(0.5, Math.min(2, (active.endSeconds - active.startSeconds) / expectedDuration)) : 1;
  const alignment: PracticeAlignment = input.alignment
    ? { recordingStartSeconds: Math.max(0, input.alignment.recordingStartSeconds), timeScale: Math.max(0.5, Math.min(2, input.alignment.timeScale)), source: "manual" }
    : { recordingStartSeconds: active?.startSeconds ?? 0, timeScale: automaticScale, source: "automatic" };

  const groups = eventGroups(events);
  if ([...groups.values()].some((group) => group.length > 1)) warnings.push("Simultaneous notes are marked as polyphonic and are not given a monophonic pitch verdict.");
  const feedback = events.map<PracticeEventFeedback>((event) => {
    const expectedTime = alignment.recordingStartSeconds + (event.startBeat - startBeat) * secondsPerBeat * alignment.timeScale;
    const duration = Math.max(0.08, event.durationBeats * secondsPerBeat * alignment.timeScale);
    const onset = detectOnset(input.samples, input.sampleRate, expectedTime - Math.min(0.18, duration * 0.4), expectedTime + Math.min(0.35, duration));
    const group = groups.get(event.startBeat.toFixed(6)) ?? [];
    if (group.length > 1) {
      return {
        eventId: event.id, sourceEventId: event.sourceEventId, measureId: event.measureId, measureNumber: event.measureNumber,
        noteName: event.noteName, expectedMidi: event.midi, recordingTimeSeconds: expectedTime, detectedOnsetSeconds: onset,
        onsetDeltaMs: onset === null ? null : Math.round((onset - expectedTime) * 1_000), detectedFrequencyHz: null,
        pitchCents: null, pitchConfidence: null, status: "polyphonic_unscored",
      };
    }
    if (onset === null) {
      return {
        eventId: event.id, sourceEventId: event.sourceEventId, measureId: event.measureId, measureNumber: event.measureNumber,
        noteName: event.noteName, expectedMidi: event.midi, recordingTimeSeconds: expectedTime, detectedOnsetSeconds: null,
        onsetDeltaMs: null, detectedFrequencyHz: null, pitchCents: null, pitchConfidence: null, status: "missing",
      };
    }
    const pitchStart = Math.min(input.samples.length, Math.max(0, Math.floor((onset + 0.025) * input.sampleRate)));
    const pitchEnd = Math.min(input.samples.length, pitchStart + Math.floor(Math.min(0.45, Math.max(0.12, duration * 0.7)) * input.sampleRate));
    const pitch = detectFundamentalFrequency(input.samples.slice(pitchStart, pitchEnd), input.sampleRate);
    const expectedFrequency = 440 * 2 ** ((event.midi - 69) / 12);
    const cents = pitch ? Math.round(1_200 * Math.log2(pitch.frequencyHz / expectedFrequency)) : null;
    const onsetDelta = Math.round((onset - expectedTime) * 1_000);
    const status = cents !== null && Math.abs(cents) > 50
      ? "pitch_attention"
      : Math.abs(onsetDelta) > 120
        ? "rhythm_attention"
        : "matched";
    return {
      eventId: event.id, sourceEventId: event.sourceEventId, measureId: event.measureId, measureNumber: event.measureNumber,
      noteName: event.noteName, expectedMidi: event.midi, recordingTimeSeconds: expectedTime, detectedOnsetSeconds: onset,
      onsetDeltaMs: onsetDelta, detectedFrequencyHz: pitch ? Math.round(pitch.frequencyHz * 10) / 10 : null,
      pitchCents: cents, pitchConfidence: pitch ? Math.round(pitch.confidence * 100) / 100 : null, status,
    };
  });

  const measureMap = new Map<string, PracticeMeasureFeedback>();
  for (const event of feedback) {
    const current = measureMap.get(event.measureId) ?? {
      measureId: event.measureId, measureNumber: event.measureNumber, eventCount: 0, detectedCount: 0,
      pitchAttentionCount: 0, rhythmAttentionCount: 0, polyphonicUnscoredCount: 0,
    };
    current.eventCount += 1;
    if (event.status !== "missing") current.detectedCount += 1;
    if (event.status === "pitch_attention") current.pitchAttentionCount += 1;
    if (event.status === "rhythm_attention") current.rhythmAttentionCount += 1;
    if (event.status === "polyphonic_unscored") current.polyphonicUnscoredCount += 1;
    measureMap.set(event.measureId, current);
  }
  const detected = feedback.filter((event) => event.status !== "missing").length;
  return {
    schemaVersion: 1,
    algorithmVersion: "practice-autocorrelation-v1",
    scoreRevisionId: input.scoreRevisionId ?? null,
    generatedAt: new Date().toISOString(),
    alignment,
    activeRegion: active ? { startSeconds: active.startSeconds, endSeconds: active.endSeconds } : null,
    completeness: { expected: feedback.length, detected, ratio: feedback.length ? detected / feedback.length : 0 },
    events: feedback,
    measures: [...measureMap.values()],
    warnings,
  };
}
