import type { PlaybackNavigationGraph, PlaybackNavigationStep } from "@score/shared";

export const PLAYBACK_RECORDER_STATUSES = [
  "idle",
  "requesting",
  "count_in",
  "recording",
  "paused",
  "ready",
  "error",
] as const;

export const PRACTICE_ALIGNMENT_SOURCES = ["automatic", "manual"] as const;

export type PlaybackGraphTerminationReason = PlaybackNavigationGraph["terminatedBy"];
export type PlaybackNavigationAction = PlaybackNavigationStep["action"];

export const PLAYBACK_GRAPH_TERMINATION_REASONS = ["end", "fine", "guard"] as const satisfies readonly PlaybackGraphTerminationReason[];

export const PLAYBACK_NAVIGATION_ACTIONS = [
  "play",
  "skip-ending",
  "repeat-jump",
  "dc-jump",
  "ds-jump",
  "coda-jump",
  "fine-stop",
  "end",
  "guard-stop",
] as const satisfies readonly PlaybackNavigationAction[];

export const PRACTICE_EVENT_STATUSES = [
  "matched",
  "pitch_attention",
  "rhythm_attention",
  "missing",
  "polyphonic_unscored",
] as const;

export type PlaybackRecorderStatus = (typeof PLAYBACK_RECORDER_STATUSES)[number];
export type PracticeAlignmentSource = (typeof PRACTICE_ALIGNMENT_SOURCES)[number];
export type PracticeEventStatus = (typeof PRACTICE_EVENT_STATUSES)[number];

export type PlaybackPanelMessages = {
  eyebrow: string;
  title: string;
  body: string;
  load: string;
  play: string;
  stop: string;
  tempo: string;
  playhead: string;
  loop: string;
  loopStart: string;
  loopEnd: string;
  metronome: string;
  countIn: string;
  loading: string;
  ready: string;
  failed: string;
  empty: string;
  noEvents: string;
  events: string;
  activeEvents: string;
  beats: string;
  parts: string;
  solo: string;
  mute: string;
  allParts: string;
  revision: string;
  speedLadder: string;
  targetTempo: string;
  tempoStep: string;
  ladderComplete: string;
  practiceExports: string;
  startMeasure: string;
  endMeasure: string;
  byBeat: string;
  partVolume: string;
  diagnostics: string;
  playbackPath: string;
  terminated: string;
  unreachableMeasures: string;
  markerTemplate: string;
  repeatedMarkerTemplate: string;
  jumpsTemplate: string;
  selectedSoloTemplate: string;
  selectedMuteTemplate: string;
  soloPartTemplate: string;
  mutePartTemplate: string;
  navigationMeasureTemplate: string;
  terminationReasons: Record<PlaybackGraphTerminationReason, string>;
  navigationActions: Record<PlaybackNavigationAction, string>;
};

export type PracticeRecorderMessages = {
  title: string;
  regionAria: string;
  device: string;
  defaultDevice: string;
  deviceTemplate: string;
  countIn: string;
  beatsTemplate: string;
  start: string;
  requesting: string;
  pause: string;
  resume: string;
  stop: string;
  cancel: string;
  rerecord: string;
  ready: string;
  unsupported: string;
  denied: string;
  recordingStatusTemplate: string;
  pausedStatusTemplate: string;
  countInStatusTemplate: string;
  analysis: string;
  feedbackAria: string;
  analyzing: string;
  analysisFailed: string;
  completeness: string;
  completenessTemplate: string;
  alignment: string;
  startOffset: string;
  timeScale: string;
  applyAlignment: string;
  measureTemplate: string;
  detectedTemplate: string;
  pitchAttentionTemplate: string;
  rhythmAttentionTemplate: string;
  polyphonicTemplate: string;
  jump: string;
  pitchUnavailable: string;
  onsetUnavailable: string;
  centsTemplate: string;
  onsetTemplate: string;
  feedbackButtonTemplate: string;
  statuses: Record<PlaybackRecorderStatus, string>;
  alignmentSources: Record<PracticeAlignmentSource, string>;
  eventStatuses: Record<PracticeEventStatus, string>;
};

export type JianpuViewMessages = {
  regionAria: string;
  empty: string;
  note: string;
  rest: string;
  voice: string;
  staff: string;
  voiceShort: string;
  staffShort: string;
  eventLabelTemplate: string;
  measureAriaTemplate: string;
};

export type AudioWaveformMessages = {
  waveformAria: string;
  waveformValueTemplate: string;
  waveformLoading: string;
  waveformUnavailable: string;
  recordingPlayback: string;
  practiceSpeed: string;
  rateTemplate: string;
};

export type PlaybackPracticeMessages = {
  playback: PlaybackPanelMessages;
  recorder: PracticeRecorderMessages;
  jianpu: JianpuViewMessages;
  waveform: AudioWaveformMessages;
};
