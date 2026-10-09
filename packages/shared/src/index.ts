import type { SupportedLocale } from "@score/i18n";

export {
  DEFAULT_LOCALE,
  LOCALE_CONFIGS,
  LOCALE_COOKIE_NAME,
  LOCALE_ROUTE_PREFIXES,
  SUPPORTED_LOCALES,
  getLocaleConfig,
  isSupportedLocale,
  normalizeLocale,
  resolveLocale,
  type LocaleConfig,
  type LocaleDirection,
  type LocaleFontGroup,
  type SupportedLocale,
} from "@score/i18n";

export const PRODUCT_NAME = "ScoreTransposer";

export const APP_ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  activate: "/activate",
  checkout: "/checkout",
  checkoutSuccess: "/checkout/success",
  checkoutCancel: "/checkout/cancel",
  billing: "/billing",
  dashboard: "/dashboard",
  scores: "/scores",
  classrooms: "/classrooms",
  student: "/student",
  upload: "/upload",
  jobs: "/jobs",
    adminCodes: "/admin/codes",
    adminSupport: "/admin/support",
    adminSeo: "/admin/seo",
    adminSecurity: "/admin/security",
    adminCopyright: "/admin/copyright",
  } as const;

export const TRANSPOSING_INSTRUMENT_PROFILES = [
  {
    id: "bb-soprano",
    label: "Bb instrument",
    examples: "Clarinet, trumpet, soprano saxophone",
    semitonesFromConcertPitch: 2,
    preferredClef: "G",
  },
  {
    id: "a-clarinet",
    label: "A clarinet",
    examples: "Clarinet in A",
    semitonesFromConcertPitch: 3,
    preferredClef: "G",
  },
  {
    id: "eb-alto",
    label: "Eb instrument",
    examples: "Alto saxophone, baritone saxophone, Eb clarinet",
    semitonesFromConcertPitch: 9,
    preferredClef: "G",
  },
  {
    id: "f-instrument",
    label: "F instrument",
    examples: "Horn in F, English horn",
    semitonesFromConcertPitch: 7,
    preferredClef: "G",
  },
  {
    id: "bb-tenor",
    label: "Bb tenor instrument",
    examples: "Tenor saxophone, bass clarinet",
    semitonesFromConcertPitch: 14,
    preferredClef: "G",
  },
  {
    id: "eb-baritone",
    label: "Eb baritone instrument",
    examples: "Baritone saxophone",
    semitonesFromConcertPitch: 21,
    preferredClef: "G",
  },
  {
    id: "piccolo",
    label: "Piccolo",
    examples: "Sounds one octave above written pitch",
    semitonesFromConcertPitch: -12,
    preferredClef: "G",
  },
  {
    id: "guitar",
    label: "Guitar",
    examples: "Sounds one octave below written pitch",
    semitonesFromConcertPitch: 12,
    preferredClef: "G",
  },
  {
    id: "double-bass",
    label: "Double bass",
    examples: "Sounds one octave below written pitch",
    semitonesFromConcertPitch: 12,
    preferredClef: "F",
  },
  {
    id: "contrabassoon",
    label: "Contrabassoon",
    examples: "Sounds one octave below written pitch",
    semitonesFromConcertPitch: 12,
    preferredClef: "F",
  },
  {
    id: "glockenspiel",
    label: "Glockenspiel",
    examples: "Sounds two octaves above written pitch",
    semitonesFromConcertPitch: -24,
    preferredClef: "G",
  },
  {
    id: "celesta",
    label: "Celesta",
    examples: "Sounds one octave above written pitch",
    semitonesFromConcertPitch: -12,
    preferredClef: "G",
  },
] as const;

export type TransposingInstrumentProfileId = (typeof TRANSPOSING_INSTRUMENT_PROFILES)[number]["id"];
export type TransposeSpellingPolicy = "auto" | "preserve" | "prefer-sharps" | "prefer-flats";
export type TransposePitchMode = "concert-to-written" | "written-to-concert";

export const MIDI_PROGRAM_PRESETS = [
  { program: 1, label: "Acoustic grand piano", family: "keyboard" },
  { program: 7, label: "Harpsichord", family: "keyboard" },
  { program: 20, label: "Church organ", family: "keyboard" },
  { program: 25, label: "Nylon guitar", family: "guitar" },
  { program: 33, label: "Acoustic bass", family: "bass" },
  { program: 41, label: "Violin", family: "strings" },
  { program: 42, label: "Viola", family: "strings" },
  { program: 43, label: "Cello", family: "strings" },
  { program: 44, label: "Contrabass", family: "strings" },
  { program: 49, label: "String ensemble", family: "strings" },
  { program: 53, label: "Choir aahs", family: "voice" },
  { program: 54, label: "Voice oohs", family: "voice" },
  { program: 57, label: "Trumpet", family: "brass" },
  { program: 58, label: "Trombone", family: "brass" },
  { program: 61, label: "French horn", family: "brass" },
  { program: 66, label: "Alto sax", family: "woodwind" },
  { program: 69, label: "Oboe", family: "woodwind" },
  { program: 70, label: "English horn", family: "woodwind" },
  { program: 71, label: "Bassoon", family: "woodwind" },
  { program: 72, label: "Clarinet", family: "woodwind" },
  { program: 74, label: "Flute", family: "woodwind" },
  { program: 75, label: "Recorder", family: "woodwind" },
  { program: 79, label: "Whistle", family: "woodwind" },
  { program: 80, label: "Ocarina", family: "woodwind" },
] as const;

export type MidiProgramPreset = (typeof MIDI_PROGRAM_PRESETS)[number];

const MIDI_PROGRAM_NAME_HINTS = [
  { pattern: /\b(piano|keyboard|keys)\b/i, program: 1 },
  { pattern: /\b(organ)\b/i, program: 20 },
  { pattern: /\b(guitar)\b/i, program: 25 },
  { pattern: /\b(bass clarinet)\b/i, program: 72 },
  { pattern: /\b(double bass|contrabass)\b/i, program: 44 },
  { pattern: /\b(bass)\b/i, program: 33 },
  { pattern: /\b(violin)\b/i, program: 41 },
  { pattern: /\b(viola)\b/i, program: 42 },
  { pattern: /\b(cello|violoncello)\b/i, program: 43 },
  { pattern: /\b(strings|string ensemble)\b/i, program: 49 },
  { pattern: /\b(trumpet)\b/i, program: 57 },
  { pattern: /\b(trombone)\b/i, program: 58 },
  { pattern: /\b(english horn|cor anglais)\b/i, program: 70 },
  { pattern: /\b(french horn|horn)\b/i, program: 61 },
  { pattern: /\b(sax|saxophone)\b/i, program: 66 },
  { pattern: /\b(oboe)\b/i, program: 69 },
  { pattern: /\b(bassoon)\b/i, program: 71 },
  { pattern: /\b(clarinet)\b/i, program: 72 },
  { pattern: /\b(flute|piccolo)\b/i, program: 74 },
  { pattern: /\b(recorder)\b/i, program: 75 },
  { pattern: /\b(choir|chorus|soprano|alto|tenor|baritone|voice|vocal)\b/i, program: 53 },
] as const;

export function suggestMidiProgramPresetForPartName(partName: string): MidiProgramPreset | null {
  const normalized = partName.trim();
  if (!normalized) {
    return null;
  }

  const hint = MIDI_PROGRAM_NAME_HINTS.find((item) => item.pattern.test(normalized));
  return hint ? MIDI_PROGRAM_PRESETS.find((preset) => preset.program === hint.program) ?? null : null;
}

export const SCORE_RANGE_PROFILES = [
  {
    id: "soprano",
    label: "Soprano voice",
    category: "voice",
    minMidi: 60,
    maxMidi: 84,
    description: "Typical choir soprano working range, C4-C6.",
  },
  {
    id: "alto",
    label: "Alto voice",
    category: "voice",
    minMidi: 55,
    maxMidi: 76,
    description: "Typical choir alto working range, G3-E5.",
  },
  {
    id: "tenor",
    label: "Tenor voice",
    category: "voice",
    minMidi: 48,
    maxMidi: 72,
    description: "Typical choir tenor working range, C3-C5.",
  },
  {
    id: "bass",
    label: "Bass voice",
    category: "voice",
    minMidi: 40,
    maxMidi: 64,
    description: "Typical choir bass working range, E2-E4.",
  },
  {
    id: "flute",
    label: "Flute",
    category: "instrument",
    minMidi: 60,
    maxMidi: 98,
    description: "Common written flute range, C4-D7.",
  },
  {
    id: "clarinet-written",
    label: "Clarinet written range",
    category: "instrument",
    minMidi: 52,
    maxMidi: 96,
    description: "Common written clarinet range, E3-C7.",
  },
  {
    id: "trumpet-written",
    label: "Trumpet written range",
    category: "instrument",
    minMidi: 54,
    maxMidi: 86,
    description: "Common written trumpet range, F#3-D6.",
  },
  {
    id: "violin",
    label: "Violin",
    category: "instrument",
    minMidi: 55,
    maxMidi: 105,
    description: "Common violin range, G3-A7.",
  },
] as const;

export type ScoreRangeProfileId = (typeof SCORE_RANGE_PROFILES)[number]["id"];

export type ScoreProjectSettings = {
  defaultRangeProfileId?: ScoreRangeProfileId | null;
  defaultRangePartId?: string | null;
  defaultInstrumentProfileId?: TransposingInstrumentProfileId | null;
  defaultTransposeSpellingPolicy?: TransposeSpellingPolicy;
  defaultTransposePitchMode?: TransposePitchMode;
  partRangeProfileIds?: Record<string, ScoreRangeProfileId>;
};

export type ConversionDirection = "staff_pdf_to_numbered" | "numbered_pdf_to_staff";

export type ActivationCodeStatus = "available" | "redeemed" | "disabled";

export type EntitlementStatus = "inactive" | "active" | "expired";

export type StoredFileKind =
  | "input_pdf"
  | "output_pdf"
  | "draft_bundle"
  | "source_pdf"
  | "source_image"
  | "source_musicxml"
  | "source_jianpu"
  | "source_midi"
  | "source_audio"
  | "score_musicxml"
  | "score_json_snapshot"
  | "rendered_pdf"
  | "rendered_svg"
  | "rendered_png"
  | "output_jianpu"
  | "output_midi"
  | "output_audio"
  | "classroom_resource"
  | "omr_bundle"
  | "omr_page_image";

export type JobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";

export type JobResultKind = "none" | "final" | "draft";

export type ScoreRecognitionMode = "simple" | "complex";
/** Free structural inspection; it does not recognize notes or reserve credits. */
export type ScoreStructurePreflight = {
  schemaVersion: 1;
  recommendation: ScoreRecognitionMode | "uncertain";
  confidence: "high" | "medium" | "low";
  sourcePageCount: number;
  pagesAnalyzed: number;
  complete: boolean;
  reasonCodes: string[];
  elapsedMs?: number;
  /** Admission only, never a promise of note accuracy. */
  recognitionSupport?: {
    supported: boolean;
    code: "READY" | "PDF_ADAPTIVE_RENDER" | "PDF_PAGE_PIXEL_LIMIT" | "PDF_TOTAL_PIXEL_LIMIT" | "PDF_INVALID";
    pageDpi?: number[];
  };
  pages: Array<{
    page: number;
    staffCount: number;
    systemCount: number;
    maxStavesPerSystem: number;
    hasTab: boolean;
    uncertain: boolean;
    width?: number;
    height?: number;
    rotation?: 0 | 90 | 180 | 270 | null;
    orientationCertain?: boolean;
    standardStaffCount?: number;
    tabStaffCount?: number;
    reasonCodes?: string[];
  }>;
};
export { attachMusicXmlPreservation, exportPreservedMusicXml, MusicXmlPreservationError } from "./musicxml-preservation.ts";

export type ScoreRecognitionCreditSource = "plan" | "free_trial" | "score_pass";

export type ScoreRecognitionOption = {
  mode: ScoreRecognitionMode;
  creditCost: number;
  canSubmit: boolean;
  creditSource: ScoreRecognitionCreditSource | null;
  reason: string | null;
};

export const SCORE_PROCESSING_QUEUE = "score-processing" as const;

export type JobBrokerPayload = {
  dispatchId: string;
  family: "legacy" | "score";
  jobId: string;
  requestId?: string;
  traceId?: string;
};

export type ScoreDocumentStatus = "imported" | "candidate" | "needs_review" | "ready" | "archived";

export type ScoreRevisionStatus = "candidate" | "accepted" | "rejected" | "superseded";

export type ScoreRevisionSource =
  | "musicxml_import"
  | "score_json_import"
  | "midi_import"
  | "omr_import"
  | "jianpu_import"
  | "audio_transcribe"
  | "candidate_accept"
  | "manual_edit"
  | "restore"
  | "part_extract"
  | "transpose"
  | "system";

export type ScoreJobType =
  | "omr_import"
  | "musicxml_import"
  | "jianpu_import"
  | "staff_to_jianpu"
  | "jianpu_to_staff"
  | "transpose"
  | "render_pdf"
  | "render_midi"
  | "render_audio"
  | "render_export"
  | "audio_transcribe";

export type ScoreExportFormat = "musicxml" | "midi" | "pdf" | "svg" | "png" | "wav" | "mp3";

export type ScoreExportPageSize = "default" | "a4" | "letter";

export type ScoreExportMarginPreset = "default" | "narrow" | "normal" | "wide";

export type ScoreExportOptions = {
  tempoBpm?: number;
  soloPartIds?: string[];
  mutedPartIds?: string[];
  partVolumes?: Record<string, number>;
  partPans?: Record<string, number>;
  countIn?: boolean;
  metronome?: boolean;
  loopEnabled?: boolean;
  loopStartBeat?: number;
  loopEndBeat?: number;
  sampleRate?: 44100 | 48000 | 96000;
  audioChannels?: 1 | 2;
  soundFontGain?: number;
  reverbEnabled?: boolean;
  chorusEnabled?: boolean;
  normalizeLoudness?: boolean;
  loudnessTargetLufs?: number;
  bitrateKbps?: 128 | 192 | 256 | 320;
  imageResolutionDpi?: number;
  trimImage?: boolean;
  trimImageMargin?: number;
  pageSize?: ScoreExportPageSize;
  marginPreset?: ScoreExportMarginPreset;
  scoreScalePercent?: number;
  staffSpacingMm?: number;
};

export type ScoreExportSnapshot = {
  schemaVersion: 1;
  format: ScoreExportFormat;
  revisionId: string;
  revisionNumber: number;
  title: string;
  musicXml?: string;
  playback?: PlaybackDocument;
  options: ScoreExportOptions;
};

export type ScorePitchStep = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export type ScorePitch = {
  step: ScorePitchStep;
  alter: number;
  octave: number;
};

export type ScoreTimeSignature = {
  beats: string;
  beatType: string;
  senzaMisura?: boolean;
};

export type ScoreKeySignature = {
  fifths: number;
  mode?: string;
};

export type ScoreClef = {
  sign: string;
  number?: number;
  line?: number;
  octaveChange?: number;
};

export type ScoreMeasureAttributes = {
  divisions?: number;
  key?: ScoreKeySignature;
  time?: ScoreTimeSignature;
  staves?: number;
  clef?: ScoreClef;
  clefs?: ScoreClef[];
};

export type ScoreHarmony = {
  id: string;
  rootStep: ScorePitchStep;
  rootAlter: number;
  kind: string;
  text?: string;
};

export type ScoreBarline = {
  id: string;
  location: "left" | "right" | "middle";
  barStyle?: string;
  repeatDirection?: "forward" | "backward";
  repeatTimes?: number;
  ending?: {
    number: string;
    type: "start" | "stop" | "discontinue";
  };
};

export type ScoreDynamic = {
  id: string;
  value: "ppp" | "pp" | "p" | "mp" | "mf" | "f" | "ff" | "fff";
  placement?: "above" | "below";
};

export type ScoreTempo = {
  id: string;
  bpm: number;
  beatUnit?: string;
  placement?: "above" | "below";
  offsetDivisions?: number;
};

export type ScoreWedge = {
  id: string;
  type: "crescendo" | "diminuendo" | "stop";
  placement?: "above" | "below";
  number?: string;
};

export type ScoreNavigationMark = {
  id: string;
  type: "fine" | "dc" | "ds" | "to-coda" | "coda" | "segno";
  text: string;
};

export type ScoreLyric = {
  number?: string;
  syllabic?: string;
  text: string;
  extend?: { type?: "start" | "continue" | "stop" };
};

export type ScoreTie = {
  type: string;
};

export type ScoreSlur = {
  type: "start" | "stop";
  number?: string;
};

export type ScoreArticulation = {
  type: "accent" | "staccato" | "tenuto" | "breath-mark" | "caesura";
};

export type ScoreFermata = {
  type?: "upright" | "inverted";
  shape?: string;
};

export type ScoreTimeModification = {
  actualNotes: number;
  normalNotes: number;
};

export type ScoreBeam = {
  id: string;
  number: number;
  type: "begin" | "continue" | "end" | "forward-hook" | "backward-hook";
};

export type ScoreTuplet = {
  id: string;
  type: "start" | "stop";
  number?: string;
  bracket?: boolean;
  showNumber?: "actual" | "both" | "none";
};

export type ScoreGrace = {
  id: string;
  slash?: boolean;
  stealTimePrevious?: number;
  stealTimeFollowing?: number;
  makeTime?: number;
};

export type ScoreOrnament = {
  id: string;
  type: "trill-mark" | "turn" | "delayed-turn" | "inverted-turn" | "mordent" | "inverted-mordent" | "tremolo";
  placement?: "above" | "below";
  value?: string;
};

export type ScoreRehearsalMark = {
  id: string;
  text: string;
  placement?: "above" | "below";
};

export type ScoreLayoutHint = {
  id: string;
  newSystem?: boolean;
  newPage?: boolean;
  measureWidth?: number;
  staffDistance?: number;
};

export type ScoreStaffGroup = {
  id: string;
  number: string;
  partIds: string[];
  name?: string;
  abbreviation?: string;
  symbol?: "brace" | "bracket" | "line" | "square" | "none";
  barline?: boolean;
};

export type ScoreRecognitionDiagnostic = {
  confidence: number | null;
  source: "structural" | "omr-engine";
  page?: number;
  bbox?: { x: number; y: number; width: number; height: number };
  issues: string[];
};

export type ScoreRecognitionSymbol = {
  id: string;
  engineId: string;
  shape: string;
  grade: number | null;
  contextualGrade: number | null;
  confidence: number | null;
  page: number;
  bbox: { x: number; y: number; width: number; height: number };
  measureId?: string;
  eventId?: string;
  issues: string[];
};

export type ScoreRecognitionPage = {
  page: number;
  width: number;
  height: number;
  imageWidth?: number;
  imageHeight?: number;
  imageTransform?: {
    crop?: { x: number; y: number; width: number; height: number };
    rotation?: 0 | 90 | 180 | 270;
  };
};

export type ScoreRecognitionCoverage = {
  schemaVersion: 1;
  status: "review-required" | "verified" | "incomplete";
  sourcePageCount: number;
  coverageBasis: "detected-layout";
  manualReview?: { reviewedAt: string; sourcePageCount: number };
  pages: Array<{ page: number; width: number; height: number;
    sourceTransform?: { rotationDegrees: 0 | 90 | 180 | 270; exifOrientation?: number;
      sourceWidth: number; sourceHeight: number; sourceToImage: number[]; imageToSource: number[];
    };
    systems: Array<{
    id: string; bbox: { x: number; y: number; width: number; height: number };
    staffIds: string[]; expectedMeasureCount?: number;
    groups?: Array<{ id: string; ordinal: number; staffIds: string[];
      name?: string; labelConfidence?: number; role?: "pitched" | "percussion";
      bbox: { x: number; y: number; width: number; height: number };
    }>;
  }> }>;
  staffs: Array<{ id: string; page: number; systemId: string; lineCount: number;
    instrumentGroupId?: string;
    kind: "standard" | "tablature" | "percussion" | "unknown"; partId?: string;
    bbox: { x: number; y: number; width: number; height: number }; confidence?: number;
  }>;
  gaps: Array<{ id: string; kind: string; page: number; systemId?: string; staffId?: string;
    instrumentGroupId?: string;
    message: string; severity: "warning" | "error";
  }>;
  attempts: Array<{ id: string; engine: "audiveris" | "homr" | "layout";
    scope: "page" | "system" | "instrument-group" | "merge" | "inventory";
    page?: number; systemId?: string;
    status: "succeeded" | "failed" | "cancelled" | "budget-exhausted"; elapsedMs: number;
  }>;
};

export type ScoreRecognitionLayer = {
  engine: "audiveris" | "homr" | "hybrid";
  engineVersion?: string;
  recognitionMode?: ScoreRecognitionMode;
  coverage?: ScoreRecognitionCoverage;
  pages?: ScoreRecognitionPage[];
  symbols: ScoreRecognitionSymbol[];
};

export type ScoreNoteEvent = {
  id: string;
  type: "note";
  pitch: ScorePitch;
  unpitched?: {
    displayStep: ScorePitchStep;
    displayOctave: number;
    midiPitch?: number;
    instrumentId?: string;
  };
  printObject?: boolean;
  notehead?: string;
  duration: number;
  durationType?: string;
  dots: number;
  voice?: string;
  staff?: number;
  accidental?: string;
  chord: boolean;
  ties: ScoreTie[];
  slurs?: ScoreSlur[];
  articulations?: ScoreArticulation[];
  fermatas?: ScoreFermata[];
  lyrics: ScoreLyric[];
  fingerings?: string[];
  technical?: { string?: number; fret?: number; bend?: number; hammerOn?: string; pullOff?: string; slide?: string };
  timeModification?: ScoreTimeModification;
  beams?: ScoreBeam[];
  tuplets?: ScoreTuplet[];
  grace?: ScoreGrace;
  ornaments?: ScoreOrnament[];
  recognition?: ScoreRecognitionDiagnostic;
};

export type ScoreRestEvent = {
  id: string;
  type: "rest";
  printObject?: boolean;
  duration: number;
  durationType?: string;
  dots: number;
  voice?: string;
  staff?: number;
  measureRest: boolean;
  fermatas?: ScoreFermata[];
  timeModification?: ScoreTimeModification;
  beams?: ScoreBeam[];
  tuplets?: ScoreTuplet[];
  recognition?: ScoreRecognitionDiagnostic;
};

export type ScoreEvent = ScoreNoteEvent | ScoreRestEvent;

export type ScorePart = {
  id: string;
  name: string;
  abbreviation?: string;
  midiProgram?: number;
  midiChannel?: number;
  transposeSemitones?: number;
  staffCount?: number;
  measureCount: number;
  manualCompletion?: {
    kind: "pitched" | "percussion" | "tablature";
    status: "needs_review";
    coverageStaffIds: string[];
  };
};

export type ScoreMeasure = {
  id: string;
  partId: string;
  number: string;
  sequence: number;
  implicit?: boolean;
  attributes?: ScoreMeasureAttributes;
  harmonies?: ScoreHarmony[];
  tempos?: ScoreTempo[];
  dynamics?: ScoreDynamic[];
  wedges?: ScoreWedge[];
  navigationMarks?: ScoreNavigationMark[];
  rehearsalMarks?: ScoreRehearsalMark[];
  barlines?: ScoreBarline[];
  layout?: ScoreLayoutHint;
  events: ScoreEvent[];
};

export type ScoreImportDiagnostic = {
  code: string;
  severity: "warning" | "error";
  message: string;
  token: string;
  line: number;
  column: number;
  start: number;
  end: number;
  suggestion?: string;
};

export const SCORE_JSON_SCHEMA_VERSION = 2 as const;

export type ScoreJson = {
  schemaVersion: typeof SCORE_JSON_SCHEMA_VERSION;
  title: string;
  source: {
    kind: "musicxml" | "jianpu" | "score_json" | "midi";
    fileId?: string | null;
    originalName: string;
  };
  metadata: {
    importedAt: string;
    parser: "musicxml-basic-v1" | "jianpu-basic-v1" | "midi-basic-v1" | "score-json-snapshot-v1";
    workTitle?: string;
    movementTitle?: string;
    composer?: string;
    measureCount: number;
    noteCount: number;
    restCount: number;
    warnings: string[];
    importDiagnostics?: ScoreImportDiagnostic[];
    audioTranscriptionCleanup?: AudioTranscriptionCleanupReport[];
  };
  parts: ScorePart[];
  staffGroups?: ScoreStaffGroup[];
  measures: ScoreMeasure[];
  recognitionLayer?: ScoreRecognitionLayer;
  interchange?: {
    version: 1;
    originalMusicXml: string;
    originalEventFingerprints: Record<string, string>;
    anchors: Array<{ eventId: string; partId: string; measureId: string; noteIndex: number;
      notationId: string; staff: number; alternateEventId?: string;
    }>;
  };
};

export function migrateScoreJson(input: unknown): ScoreJson {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Score JSON must be an object.");
  }

  const candidate = input as Record<string, unknown>;
  if (candidate.schemaVersion !== 1 && candidate.schemaVersion !== SCORE_JSON_SCHEMA_VERSION) {
    throw new Error(`Unsupported Score JSON schema version: ${String(candidate.schemaVersion)}.`);
  }

  if (
    typeof candidate.title !== "string" ||
    !candidate.source ||
    typeof candidate.source !== "object" ||
    !candidate.metadata ||
    typeof candidate.metadata !== "object" ||
    !Array.isArray(candidate.parts) ||
    !Array.isArray(candidate.measures)
  ) {
    throw new Error("Score JSON is missing required document fields.");
  }

  return {
    ...(candidate as unknown as Omit<ScoreJson, "schemaVersion">),
    schemaVersion: SCORE_JSON_SCHEMA_VERSION,
  };
}

export type JianpuMode = "major" | "minor";
export type JianpuPitchSystem = "movable-do" | "fixed-do";
export type JianpuAccidentalStrategy = "preserve" | "prefer-sharps" | "prefer-flats";

export type JianpuKey = {
  tonic: string;
  mode: JianpuMode;
  fifths: number;
  display: string;
};

export type JianpuNoteEvent = {
  id: string;
  type: "note";
  degree: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  accidental: number;
  octaveShift: number;
  duration: number;
  durationType?: string;
  dots: number;
  chord: boolean;
  voice?: string;
  staff?: number;
  ties?: ScoreTie[];
  slurs?: ScoreSlur[];
  ornaments?: ScoreOrnament[];
  timeModification?: ScoreTimeModification;
  tuplets?: ScoreTuplet[];
  lyrics: ScoreLyric[];
  sourcePitch: ScorePitch;
  token: string;
};

export type JianpuRestEvent = {
  id: string;
  type: "rest";
  duration: number;
  durationType?: string;
  dots: number;
  measureRest: boolean;
  voice?: string;
  staff?: number;
  timeModification?: ScoreTimeModification;
  tuplets?: ScoreTuplet[];
  token: string;
};

export type JianpuEvent = JianpuNoteEvent | JianpuRestEvent;

export type JianpuLyricLine = {
  number: string;
  text: string;
};

export type JianpuMeasure = {
  id: string;
  number: string;
  sequence: number;
  implicit?: boolean;
  key: JianpuKey;
  timeSignature?: ScoreTimeSignature;
  events: JianpuEvent[];
  text: string;
  chordSymbols: string[];
  lyricLines: JianpuLyricLine[];
};

export type JianpuPart = {
  id: string;
  name: string;
  measures: JianpuMeasure[];
  text: string;
};

export type JianpuDocument = {
  schemaVersion: 1;
  title: string;
  key: JianpuKey;
  timeSignature?: ScoreTimeSignature;
  metadata: {
    sourceRevisionParser: ScoreJson["metadata"]["parser"];
    generatedAt: string;
    measureCount: number;
    noteCount: number;
    restCount: number;
    warnings: string[];
    pitchSystem: JianpuPitchSystem;
    accidentalStrategy: JianpuAccidentalStrategy;
  };
  parts: JianpuPart[];
  text: string;
};

export type PlaybackPart = {
  id: string;
  name: string;
  midiProgram?: number;
  midiChannel?: number;
};

export type PlaybackNoteEvent = {
  id: string;
  sourceEventId: string;
  partId: string;
  measureId: string;
  measureNumber: string;
  voice: string;
  staff?: number;
  pitch: ScorePitch;
  unpitched?: ScoreNoteEvent["unpitched"];
  midiChannel?: number;
  midi: number;
  noteName: string;
  startBeat: number;
  durationBeats: number;
  soundDurationBeats?: number;
  velocity: number;
  lyrics?: ScoreLyric[];
};

export type PlaybackMeasureMarker = {
  id: string;
  partId: string;
  measureId: string;
  measureNumber: string;
  occurrence: number;
  startBeat: number;
};

export type PlaybackTempoChange = {
  id: string;
  sourceTempoId: string;
  measureId: string;
  measureNumber: string;
  occurrence: number;
  startBeat: number;
  bpm: number;
};

export type PlaybackNavigationStep = {
  sequence: number;
  measureId: string;
  measureNumber: string;
  occurrence: number;
  action: "play" | "skip-ending" | "repeat-jump" | "dc-jump" | "ds-jump" | "coda-jump" | "fine-stop" | "end" | "guard-stop";
  targetMeasureId?: string;
  detail?: string;
};

export type PlaybackNavigationGraph = {
  partId: string;
  steps: PlaybackNavigationStep[];
  terminatedBy: "end" | "fine" | "guard";
  jumpCount: number;
  unreachableMeasureIds: string[];
};

export type PlaybackDocument = {
  schemaVersion: 1;
  title: string;
  tempoBpm: number;
  downbeatEvery: number;
  keySignature?: ScoreKeySignature;
  timeSignature?: ScoreTimeSignature;
  totalBeats: number;
  parts: PlaybackPart[];
  measureMarkers: PlaybackMeasureMarker[];
  tempoChanges?: PlaybackTempoChange[];
  navigationGraphs?: PlaybackNavigationGraph[];
  events: PlaybackNoteEvent[];
  metadata: {
    sourceRevisionParser: ScoreJson["metadata"]["parser"];
    generatedAt: string;
    eventCount: number;
    warnings: string[];
  };
};

export type AssignmentPracticeSettings = {
  tempoBpm: number;
  metronomeEnabled: boolean;
  countInEnabled: boolean;
  soloPartIds: string[];
  mutedPartIds: string[];
  partVolumes: Record<string, number>;
  loopEnabled: boolean;
  loopStartBeat: number;
  loopEndBeat: number;
};

export type PaymentProvider = "stripe" | "paddle";

export const CHECKOUT_PLAN_CODES = ["starter-monthly", "starter-annual", "converter-pro-monthly", "converter-pro-annual"] as const;

export type CheckoutPlanCode = (typeof CHECKOUT_PLAN_CODES)[number];
export type CheckoutBillingKind = "subscription" | "one_time";
export function isCheckoutBillingKind(value: unknown): value is CheckoutBillingKind {
  return value === "subscription" || value === "one_time";
}

export function getPurchaseOptionsCopy(locale: SupportedLocale) {
  const rows = {
    "zh-CN": ["购买方式", "自动续费订阅", "单次购买", "1 个月", "1 年", "到期不自动续费；同档位再次购买可顺延有效期。", "按所选周期自动续费，可随时取消后续续费。", "单次购买 {name} · {duration}", "管理订阅", "取消自动续费", "单次购买记录", "有效期至 {date}", "已退款", "有效", "已到期", "即将生效", "查看或取消自动续费", "确认取消自动续费？已付款周期仍可使用，到期后不再扣费。", "返回", "开始时间：{date}", "此账户仍有自动续费订阅，请先在账单页取消后续续费，再购买单次套餐。", "支持单次购买一个月或一年，到期不续费。"],
    "zh-TW": ["購買方式", "自動續費訂閱", "單次購買", "1 個月", "1 年", "到期不自動續費；再次購買同級方案可延長有效期。", "依所選週期自動續費，可隨時取消後續續費。", "單次購買 {name} · {duration}", "管理訂閱", "取消自動續費", "單次購買紀錄", "有效期至 {date}", "已退款", "有效", "已到期", "即將生效", "查看或取消自動續費", "確認取消自動續費？已付款週期仍可使用，到期後不再扣費。", "返回", "開始時間：{date}", "此帳戶仍有自動續費訂閱，請先在帳單頁取消後續續費，再購買單次方案。", "可單次購買一個月或一年，到期不續費。"],
    en: ["Purchase type", "Auto-renewing subscription", "One-time purchase", "1 month", "1 year", "No automatic renewal. Another purchase of the same tier extends your access.", "Renews automatically for the selected period. Cancel future renewals at any time.", "Buy {name} once · {duration}", "Manage subscription", "Cancel auto-renewal", "One-time purchases", "Access until {date}", "Refunded", "Active", "Expired", "Upcoming", "View or cancel auto-renewal", "Cancel auto-renewal? Keep access for your paid period, with no further renewal charge.", "Go back", "Starts: {date}", "You still have an auto-renewing subscription. Cancel future renewals in Billing before buying a one-time plan.", "Buy one month or one year with no automatic renewal."],
    ja: ["購入方法", "自動更新サブスクリプション", "1回払い", "1か月", "1年", "自動更新はありません。同じプランの再購入で有効期間が延長されます。", "選択した周期で自動更新されます。次回更新はいつでも解約できます。", "{name} を1回払いで購入 · {duration}", "契約を管理", "自動更新を解約", "1回払いの購入履歴", "有効期限：{date}", "返金済み", "有効", "期限切れ", "開始予定", "自動更新の確認・解約", "自動更新を解約しますか？お支払い済みの期間は利用でき、次回は請求されません。", "戻る", "開始：{date}", "自動更新契約があります。請求ページで次回更新を解約してから1回払いをご購入ください。", "1か月または1年を自動更新なしで購入できます。"],
    ko: ["구매 방식", "자동 갱신 구독", "일회성 구매", "1개월", "1년", "자동 갱신되지 않습니다. 같은 등급을 다시 구매하면 이용 기간이 연장됩니다.", "선택한 주기로 자동 갱신됩니다. 언제든 다음 갱신을 취소할 수 있습니다.", "{name} 일회성 구매 · {duration}", "구독 관리", "자동 갱신 취소", "일회성 구매 내역", "이용 기한: {date}", "환불됨", "이용 중", "만료됨", "예정", "자동 갱신 확인 또는 취소", "자동 갱신을 취소할까요? 결제한 기간까지 이용할 수 있으며 다음 갱신 요금은 청구되지 않습니다.", "돌아가기", "시작: {date}", "자동 갱신 구독이 있습니다. 청구 페이지에서 다음 갱신을 취소한 후 일회성 요금제를 구매하세요.", "자동 갱신 없이 1개월 또는 1년을 구매하세요."],
    fr: ["Type d’achat", "Abonnement renouvelable", "Achat unique", "1 mois", "1 an", "Sans renouvellement automatique. Un nouvel achat du même niveau prolonge l’accès.", "Renouvellement automatique selon la période choisie. Résiliable à tout moment.", "Acheter {name} une fois · {duration}", "Gérer l’abonnement", "Annuler le renouvellement", "Achats uniques", "Accès jusqu’au {date}", "Remboursé", "Actif", "Expiré", "À venir", "Voir ou annuler le renouvellement", "Annuler le renouvellement ? L’accès reste disponible jusqu’à la fin de la période payée, sans nouvelle facturation.", "Retour", "Début : {date}", "Un abonnement se renouvelle encore. Annulez ses prochains renouvellements dans Facturation avant un achat unique.", "Achetez un mois ou un an sans renouvellement automatique."],
    de: ["Kaufart", "Automatisch verlängertes Abo", "Einmalkauf", "1 Monat", "1 Jahr", "Keine automatische Verlängerung. Ein weiterer Kauf derselben Stufe verlängert den Zugang.", "Automatische Verlängerung im gewählten Zeitraum. Künftige Verlängerungen jederzeit kündbar.", "{name} einmal kaufen · {duration}", "Abo verwalten", "Automatische Verlängerung kündigen", "Einmalkäufe", "Zugang bis {date}", "Erstattet", "Aktiv", "Abgelaufen", "Bevorstehend", "Verlängerung ansehen oder kündigen", "Automatische Verlängerung kündigen? Der bezahlte Zeitraum bleibt nutzbar. Es erfolgt keine weitere Verlängerungszahlung.", "Zurück", "Beginn: {date}", "Ein Abo verlängert sich noch automatisch. Kündigen Sie künftige Verlängerungen unter Abrechnung vor einem Einmalkauf.", "Einen Monat oder ein Jahr ohne automatische Verlängerung kaufen."],
    es: ["Tipo de compra", "Suscripción con renovación", "Compra única", "1 mes", "1 año", "Sin renovación automática. Otra compra del mismo nivel amplía el acceso.", "Se renueva automáticamente según el periodo elegido. Puedes cancelar futuras renovaciones.", "Comprar {name} una vez · {duration}", "Gestionar suscripción", "Cancelar renovación automática", "Compras únicas", "Acceso hasta {date}", "Reembolsado", "Activo", "Caducado", "Próximamente", "Ver o cancelar renovación", "¿Cancelar la renovación? Mantendrás el acceso durante el periodo pagado y no se cobrará otra renovación.", "Volver", "Inicio: {date}", "Todavía tienes una suscripción que se renueva. Cancela futuras renovaciones en Facturación antes de una compra única.", "Compra un mes o un año sin renovación automática."],
    ru: ["Способ покупки", "Подписка с автопродлением", "Разовая покупка", "1 месяц", "1 год", "Без автопродления. Повторная покупка того же тарифа продлевает доступ.", "Автоматическое продление на выбранный период. Будущие продления можно отменить.", "Купить {name} один раз · {duration}", "Управление подпиской", "Отключить автопродление", "Разовые покупки", "Доступ до {date}", "Возвращено", "Активно", "Истекло", "Ожидается", "Просмотр и отмена автопродления", "Отключить автопродление? Доступ сохранится до конца оплаченного периода, повторного списания не будет.", "Назад", "Начало: {date}", "У вас действует автопродление. Отключите его в разделе оплаты перед разовой покупкой.", "Купите один месяц или год без автопродления."],
  } as const;
  const values = rows[locale] ?? rows.en;
  const keys = ["label","subscription","oneTime","month","year","oneTimeNote","subscriptionNote","buyTemplate","manage","cancel","purchases","expiresTemplate","refunded","active","expired","upcoming","manageHint","cancelConfirm","back","startsTemplate","subscriptionConflict","publicNote"] as const;
  return Object.fromEntries(keys.map((key,index)=>[key,values[index]])) as Record<typeof keys[number],string>;
}

export type CheckoutPlanDisplay = {
  code: CheckoutPlanCode;
  badge: string;
  name: string;
  cycle: string;
  price: string;
  unitPrice: string;
  credits: string;
  audience: string;
  benefits: readonly string[];
  resources: readonly string[];
  cta: string;
  featured: boolean;
};

export type PricingPlanCode = "free" | CheckoutPlanCode;

export type PricingPlanDisplay = Omit<CheckoutPlanDisplay, "code"> & {
  code: PricingPlanCode;
};

type PricingCatalogLocale = "en" | "zh-CN";

function getPricingCatalogLocale(locale: SupportedLocale): PricingCatalogLocale {
  return locale === "zh-CN" ? "zh-CN" : "en";
}

const CHECKOUT_PLAN_CATALOG: Record<PricingCatalogLocale, readonly CheckoutPlanDisplay[]> = {
  "zh-CN": [
    {
      code: "starter-monthly",
      badge: "灵活月付",
      name: "Starter",
      cycle: "月付",
      price: "$7.99",
      unitPrice: "$0.16 / 积分",
      credits: "50 积分 / 月",
      audience: "适合持续处理个人乐谱的用户",
      benefits: ["不限一个免费乐谱项目", "在线乐谱编辑、声部分谱副本与多人协作 Beta", "练习播放、浏览器录音反馈 Beta 与智能移调", "五线谱／简谱及 MusicXML／MIDI 转换", "PDF／SVG／PNG 与 WAV／MP3 导出（对应渲染服务可用时）"],
      resources: ["每月 50 积分", "250 MB 文件存储", "个人乐谱库、修订记录与开放曲库", "按月续费，可随时停止后续续费"],
      cta: "选择 Starter 月付",
      featured: false,
    },
    {
      code: "starter-annual",
      badge: "Starter 年付",
      name: "Starter",
      cycle: "年付",
      price: "$49",
      unitPrice: "$0.082 / 积分",
      credits: "50 积分 / 月",
      audience: "适合长期使用并希望降低任务成本的个人用户",
      benefits: ["包含 Starter 月付全部现有能力", "在线乐谱编辑、声部分谱副本与多人协作 Beta", "练习播放、浏览器录音反馈 Beta 与智能移调", "五线谱／简谱及 MusicXML／MIDI 转换", "PDF／SVG／PNG 与 WAV／MP3 导出（对应渲染服务可用时）"],
      resources: ["每月 50 积分，按月重置", "250 MB 文件存储", "相比连续月付一年节省 $46.88", "个人乐谱库、修订记录与开放曲库"],
      cta: "选择 Starter 年付",
      featured: true,
    },
    {
      code: "converter-pro-monthly",
      badge: "更高容量",
      name: "Converter Pro",
      cycle: "月付",
      price: "$14.99",
      unitPrice: "$0.075 / 积分",
      credits: "200 积分 / 月",
      audience: "适合每月处理更多乐谱的高频个人用户",
      benefits: ["包含 Starter 的全部现有能力", "在线乐谱编辑、声部分谱副本与多人协作 Beta", "练习播放、浏览器录音反馈 Beta 与智能移调", "五线谱／简谱及 MusicXML／MIDI 转换", "PDF／SVG／PNG 与 WAV／MP3 导出（对应渲染服务可用时）"],
      resources: ["每月 200 积分", "500 MB 文件存储", "个人乐谱库、修订记录与开放曲库", "按月续费，可随时停止后续续费"],
      cta: "选择 Converter Pro 月付",
      featured: false,
    },
    {
      code: "converter-pro-annual",
      badge: "高容量年付",
      name: "Converter Pro",
      cycle: "年付",
      price: "$99",
      unitPrice: "$0.041 / 积分",
      credits: "200 积分 / 月",
      audience: "适合长期、高频处理个人乐谱的用户",
      benefits: ["包含 Converter Pro 月付全部现有能力", "在线乐谱编辑、声部分谱副本与多人协作 Beta", "练习播放、浏览器录音反馈 Beta 与智能移调", "五线谱／简谱及 MusicXML／MIDI 转换", "PDF／SVG／PNG 与 WAV／MP3 导出（对应渲染服务可用时）"],
      resources: ["每月 200 积分，按月重置", "500 MB 文件存储", "相比连续月付一年节省 $80.88", "个人乐谱库、修订记录与开放曲库"],
      cta: "选择 Converter Pro 年付",
      featured: false,
    },
  ],
  en: [
    {
      code: "starter-monthly",
      badge: "Flexible monthly",
      name: "Starter",
      cycle: "Monthly",
      price: "$7.99",
      unitPrice: "$0.16 per credit",
      credits: "50 credits / month",
      audience: "For people who regularly process personal scores",
      benefits: ["More than the one free score project", "Online editor, Part Copy Generator Beta, and Real-time Collaboration Beta", "Playback, Browser Recording & Practice Feedback Beta, and smart transposition", "Staff ↔ Jianpu and MusicXML ↔ MIDI conversion", "PDF/SVG/PNG and WAV/MP3 export when the corresponding renderer is available"],
      resources: ["50 credits each month", "250 MB file storage", "Personal library, revision history, and open score catalog", "Monthly renewal with no long commitment"],
      cta: "Choose Starter monthly",
      featured: false,
    },
    {
      code: "starter-annual",
      badge: "Starter annual",
      name: "Starter",
      cycle: "Annual",
      price: "$49",
      unitPrice: "$0.082 per credit",
      credits: "50 credits / month",
      audience: "For long-term individual use at a lower cost per credit",
      benefits: ["All current Starter monthly capabilities", "Online editor, Part Copy Generator Beta, and Real-time Collaboration Beta", "Playback, Browser Recording & Practice Feedback Beta, and smart transposition", "Staff ↔ Jianpu and MusicXML ↔ MIDI conversion", "PDF/SVG/PNG and WAV/MP3 export when the corresponding renderer is available"],
      resources: ["50 credits monthly, reset each month", "250 MB file storage", "Save $46.88 versus twelve monthly payments", "Personal library, revision history, and open score catalog"],
      cta: "Choose Starter annual",
      featured: true,
    },
    {
      code: "converter-pro-monthly",
      badge: "Higher capacity",
      name: "Converter Pro",
      cycle: "Monthly",
      price: "$14.99",
      unitPrice: "$0.075 per credit",
      credits: "200 credits / month",
      audience: "For individuals who process more scores each month",
      benefits: ["All current Starter capabilities", "Online editor, Part Copy Generator Beta, and Real-time Collaboration Beta", "Playback, Browser Recording & Practice Feedback Beta, and smart transposition", "Staff ↔ Jianpu and MusicXML ↔ MIDI conversion", "PDF/SVG/PNG and WAV/MP3 export when the corresponding renderer is available"],
      resources: ["200 credits each month", "500 MB file storage", "Personal library, revision history, and open score catalog", "Monthly renewal with no long commitment"],
      cta: "Choose Converter Pro monthly",
      featured: false,
    },
    {
      code: "converter-pro-annual",
      badge: "High-capacity annual",
      name: "Converter Pro",
      cycle: "Annual",
      price: "$99",
      unitPrice: "$0.041 per credit",
      credits: "200 credits / month",
      audience: "For sustained, high-frequency personal score processing",
      benefits: ["All current Converter Pro monthly capabilities", "Online editor, Part Copy Generator Beta, and Real-time Collaboration Beta", "Playback, Browser Recording & Practice Feedback Beta, and smart transposition", "Staff ↔ Jianpu and MusicXML ↔ MIDI conversion", "PDF/SVG/PNG and WAV/MP3 export when the corresponding renderer is available"],
      resources: ["200 credits monthly, reset each month", "500 MB file storage", "Save $80.88 versus twelve monthly payments", "Personal library, revision history, and open score catalog"],
      cta: "Choose Converter Pro annual",
      featured: false,
    },
  ],
};

export function getCheckoutPlanCatalog(locale: SupportedLocale): readonly CheckoutPlanDisplay[] {
  return CHECKOUT_PLAN_CATALOG[getPricingCatalogLocale(locale)];
}

const FREE_PLAN_CATALOG: Record<PricingCatalogLocale, PricingPlanDisplay> = {
  "zh-CN": {
    code: "free",
    badge: "永久免费",
    name: "Free",
    cycle: "终身",
    price: "$0",
    unitPrice: "一个完整乐谱项目",
    credits: "终身 1 个免费识谱项目 · 每月 25 积分（导出等功能）",
    audience: "适合先用一份完整乐谱体验全部项目级能力",
    benefits: ["终身创建一个完整乐谱项目", "在线乐谱编辑、声部分谱副本与多人协作 Beta", "练习播放、浏览器录音反馈 Beta 与智能移调", "五线谱／简谱及 MusicXML／MIDI 转换", "该免费项目内使用已开放的导出与项目级功能"],
    resources: ["每月 25 积分用于导出等功能，按月重置；识别新乐谱需单曲处理包或套餐", "50 MB 文件存储", "开放曲库浏览与 CC0 文件下载", "无需信用卡，免费项目长期保留"],
    cta: "免费创建乐谱",
    featured: false,
  },
  en: {
    code: "free",
    badge: "Free forever",
    name: "Free",
    cycle: "Lifetime",
    price: "$0",
    unitPrice: "One complete score project",
    credits: "1 lifetime free scan project · 25 credits / month for exports & tools",
    audience: "Use every current project-level tool with one complete score",
    benefits: ["Create one complete score project for life", "Online editor, Part Copy Generator Beta, and Real-time Collaboration Beta", "Playback, Browser Recording & Practice Feedback Beta, and smart transposition", "Staff ↔ Jianpu and MusicXML ↔ MIDI conversion", "Use currently released exports and project-level tools on that free score"],
    resources: ["25 credits monthly for exports and tools, reset each month; new scans need a One Score Pass or plan", "50 MB file storage", "Open score library and CC0 downloads", "No credit card required; keep the free project"],
    cta: "Create a free score",
    featured: false,
  },
};

export function getPricingPlanCatalog(locale: SupportedLocale): readonly PricingPlanDisplay[] {
  const catalogLocale = getPricingCatalogLocale(locale);
  return [FREE_PLAN_CATALOG[catalogLocale], ...CHECKOUT_PLAN_CATALOG[catalogLocale]];
}

export function isCheckoutPlanCode(value: unknown): value is CheckoutPlanCode {
  return typeof value === "string" && CHECKOUT_PLAN_CODES.includes(value as CheckoutPlanCode);
}

export type PaymentOrderStatus = "pending" | "paid" | "cancelled" | "failed";
export type AudioTranscriptionCleanupProfile = "monophonic" | "polyphonic-balanced";

export type AudioTranscriptionMidiNote = {
  midi: number;
  startTick: number;
  durationTicks: number;
  channel: number;
  velocity: number;
};

export type CleanedAudioTranscriptionNote = AudioTranscriptionMidiNote & {
  voice: string;
  chord: boolean;
};

export type AudioTranscriptionCleanupReport = {
  profile: AudioTranscriptionCleanupProfile;
  inputNotes: number;
  outputNotes: number;
  removedShortNotes: number;
  removedLowVelocityNotes: number;
  removedDuplicates: number;
  meanTimingCorrectionTicks: number;
  peakPolyphony: number;
  voiceCount: number;
  reviewRequired: boolean;
  warnings: string[];
};

export function cleanAudioTranscriptionNotes(input: {
  notes: AudioTranscriptionMidiNote[];
  ppq: number;
  profile?: AudioTranscriptionCleanupProfile;
  quantizationStepsPerQuarter?: number;
  maxVoices?: number;
}) {
  const profile = input.profile ?? "polyphonic-balanced";
  const steps = clampAudioCleanupInteger(input.quantizationStepsPerQuarter ?? (profile === "monophonic" ? 8 : 4), 1, 32);
  const gridTicks = Math.max(1, Math.round(input.ppq / steps));
  const minimumDurationTicks = Math.max(1, Math.round(gridTicks / 2));
  const minimumVelocity = profile === "monophonic" ? 12 : 8;
  const maxVoices = clampAudioCleanupInteger(input.maxVoices ?? (profile === "monophonic" ? 1 : 8), 1, 16);
  let removedShortNotes = 0;
  let removedLowVelocityNotes = 0;
  let removedDuplicates = 0;
  let timingCorrectionTicks = 0;

  const quantized = input.notes
    .filter((note) => {
      if (note.durationTicks < minimumDurationTicks) {
        removedShortNotes += 1;
        return false;
      }
      if (note.velocity < minimumVelocity) {
        removedLowVelocityNotes += 1;
        return false;
      }
      return Number.isFinite(note.startTick) && Number.isFinite(note.durationTicks) && note.midi >= 0 && note.midi <= 127;
    })
    .map((note) => {
      const startTick = Math.max(0, Math.round(note.startTick / gridTicks) * gridTicks);
      const durationTicks = Math.max(gridTicks, Math.round(note.durationTicks / gridTicks) * gridTicks);
      timingCorrectionTicks += Math.abs(startTick - note.startTick) + Math.abs(durationTicks - note.durationTicks);
      return { ...note, startTick, durationTicks };
    })
    .sort((left, right) => left.startTick - right.startTick || left.midi - right.midi || right.durationTicks - left.durationTicks);

  const deduplicated: AudioTranscriptionMidiNote[] = [];
  for (const note of quantized) {
    const existingIndex = deduplicated.findIndex((candidate) => candidate.startTick === note.startTick && candidate.midi === note.midi);
    if (existingIndex < 0) {
      deduplicated.push(note);
      continue;
    }
    removedDuplicates += 1;
    const existing = deduplicated[existingIndex];
    deduplicated[existingIndex] = {
      ...existing,
      durationTicks: Math.max(existing.durationTicks, note.durationTicks),
      velocity: Math.max(existing.velocity, note.velocity),
    };
  }

  const onsetGroups = new Map<number, AudioTranscriptionMidiNote[]>();
  for (const note of deduplicated) {
    const group = onsetGroups.get(note.startTick) ?? [];
    group.push(note);
    onsetGroups.set(note.startTick, group);
  }

  const voiceEnds: number[] = [];
  const notes: CleanedAudioTranscriptionNote[] = [];
  let peakPolyphony = 0;
  let forcedVoiceAssignments = 0;
  for (const [startTick, group] of [...onsetGroups].sort(([left], [right]) => left - right)) {
    const activeVoices = voiceEnds.filter((endTick) => endTick > startTick).length;
    peakPolyphony = Math.max(peakPolyphony, activeVoices + 1);
    let voiceIndex = voiceEnds.findIndex((endTick) => endTick <= startTick);
    if (voiceIndex < 0 && voiceEnds.length < maxVoices) {
      voiceIndex = voiceEnds.length;
      voiceEnds.push(0);
    } else if (voiceIndex < 0) {
      voiceIndex = voiceEnds.reduce((best, endTick, index) => endTick < voiceEnds[best] ? index : best, 0);
      forcedVoiceAssignments += 1;
    }

    const normalizedDuration = Math.max(...group.map((note) => note.durationTicks));
    [...group].sort((left, right) => left.midi - right.midi).forEach((note, index) => {
      notes.push({ ...note, durationTicks: normalizedDuration, voice: String(voiceIndex + 1), chord: index > 0 });
    });
    voiceEnds[voiceIndex] = Math.max(voiceEnds[voiceIndex] ?? 0, startTick + normalizedDuration);
  }

  const warnings: string[] = [];
  if (removedShortNotes > 0) warnings.push(`Removed ${removedShortNotes} sub-grid transient note(s).`);
  if (removedLowVelocityNotes > 0) warnings.push(`Removed ${removedLowVelocityNotes} low-velocity note(s).`);
  if (removedDuplicates > 0) warnings.push(`Merged ${removedDuplicates} duplicate pitch onset(s).`);
  if (forcedVoiceAssignments > 0) warnings.push(`${forcedVoiceAssignments} onset group(s) exceeded the ${maxVoices}-voice cleanup limit.`);
  if (profile === "monophonic" && peakPolyphony > 1) warnings.push("Overlapping onsets were detected in a monophonic transcription profile.");

  const report: AudioTranscriptionCleanupReport = {
    profile,
    inputNotes: input.notes.length,
    outputNotes: notes.length,
    removedShortNotes,
    removedLowVelocityNotes,
    removedDuplicates,
    meanTimingCorrectionTicks: quantized.length > 0 ? Number((timingCorrectionTicks / quantized.length).toFixed(3)) : 0,
    peakPolyphony,
    voiceCount: voiceEnds.length,
    reviewRequired: forcedVoiceAssignments > 0 || (profile === "monophonic" && peakPolyphony > 1),
    warnings,
  };

  return { notes, report, gridTicks };
}

function clampAudioCleanupInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export type PdfRasterBudgetPolicy = {
  dpi: number;
  maxPagePixels: number;
  maxTotalPixels: number;
};

export type PdfPagePointSize = {
  widthPoints: number;
  heightPoints: number;
};

/** PDFium renders the visible CropBox clipped to MediaBox, including rotation. */
export function pdfVisiblePageSize(page: {
  getMediaBox(): { x: number; y: number; width: number; height: number };
  getCropBox(): { x: number; y: number; width: number; height: number };
  getRotation(): { angle: number };
}): PdfPagePointSize {
  const media = page.getMediaBox(), crop = page.getCropBox();
  const width = Math.min(media.x + media.width, crop.x + crop.width) - Math.max(media.x, crop.x);
  const height = Math.min(media.y + media.height, crop.y + crop.height) - Math.max(media.y, crop.y);
  return Math.abs(page.getRotation().angle % 180) === 90 ? { widthPoints: height, heightPoints: width } : { widthPoints: width, heightPoints: height };
}

export type PdfRasterPageEstimate = PdfPagePointSize & {
  dpi?: number;
  pageNumber: number;
  widthPixels: number;
  heightPixels: number;
  pixelCount: number;
};

export type PdfRasterBudgetResult =
  | {
      ok: true;
      dpi: number;
      pageCount: number;
      totalPixels: number;
      pages: PdfRasterPageEstimate[];
    }
  | {
      ok: false;
      reason: "invalid_page_size" | "page_pixel_limit" | "total_pixel_limit";
      dpi: number;
      pageCount: number;
      totalPixels: number;
      page?: PdfRasterPageEstimate;
      pages: PdfRasterPageEstimate[];
    };

/** Estimate the raster workload before an untrusted PDF reaches an OMR engine. */
export function evaluatePdfRasterBudget(
  pageSizes: readonly PdfPagePointSize[],
  policy: PdfRasterBudgetPolicy,
): PdfRasterBudgetResult {
  for (const [name, value] of Object.entries(policy)) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new RangeError(`PDF raster budget ${name} must be a positive safe integer.`);
    }
  }

  const pages: PdfRasterPageEstimate[] = [];
  let totalPixels = 0;
  for (let index = 0; index < pageSizes.length; index += 1) {
    const { widthPoints, heightPoints } = pageSizes[index];
    if (!Number.isFinite(widthPoints) || widthPoints <= 0 || !Number.isFinite(heightPoints) || heightPoints <= 0) {
      return {
        ok: false,
        reason: "invalid_page_size",
        dpi: policy.dpi,
        pageCount: pageSizes.length,
        totalPixels,
        pages,
      };
    }

    const widthPixels = Math.ceil((widthPoints / 72) * policy.dpi);
    const heightPixels = Math.ceil((heightPoints / 72) * policy.dpi);
    const pixelCount = widthPixels * heightPixels;
    const page: PdfRasterPageEstimate = {
      pageNumber: index + 1,
      widthPoints,
      heightPoints,
      widthPixels,
      heightPixels,
      pixelCount,
    };
    if (!Number.isSafeInteger(pixelCount) || pixelCount <= 0) {
      return {
        ok: false,
        reason: "invalid_page_size",
        dpi: policy.dpi,
        pageCount: pageSizes.length,
        totalPixels,
        page,
        pages,
      };
    }

    pages.push(page);
    totalPixels += pixelCount;
    if (pixelCount > policy.maxPagePixels) {
      return {
        ok: false,
        reason: "page_pixel_limit",
        dpi: policy.dpi,
        pageCount: pageSizes.length,
        totalPixels,
        page,
        pages,
      };
    }
    if (!Number.isSafeInteger(totalPixels) || totalPixels > policy.maxTotalPixels) {
      return {
        ok: false,
        reason: "total_pixel_limit",
        dpi: policy.dpi,
        pageCount: pageSizes.length,
        totalPixels,
        page,
        pages,
      };
    }
  }

  return { ok: true, dpi: policy.dpi, pageCount: pageSizes.length, totalPixels, pages };
}

/** Bound bitmap allocation while keeping every page at a useful reading resolution.
 * Equal shares of the total budget prevent a large early page starving later pages.
 * The returned per-page DPI is mandatory for the renderer, not just an estimate.
 */
export function planPdfRasterBudget(
  pageSizes: readonly PdfPagePointSize[], policy: PdfRasterBudgetPolicy, minimumDpi = Math.min(150, policy.dpi),
): PdfRasterBudgetResult {
  evaluatePdfRasterBudget([], policy); // validate configuration
  if (!Number.isSafeInteger(minimumDpi) || minimumDpi <= 0 || minimumDpi > policy.dpi) throw new RangeError("Invalid minimum PDF DPI.");
  if (!pageSizes.length) return { ok: false, reason: "invalid_page_size", dpi: policy.dpi, pageCount: 0, totalPixels: 0, pages: [] };
  // PDFium reads page coordinates as floats; reserve a small rounding margin.
  const pageBudget = Math.floor(Math.min(policy.maxPagePixels, Math.floor(policy.maxTotalPixels / pageSizes.length)) * .99);
  const pages: PdfRasterPageEstimate[] = [];
  let totalPixels = 0;
  for (let index = 0; index < pageSizes.length; index++) {
    const size = pageSizes[index];
    const failure = (reason: "invalid_page_size" | "page_pixel_limit" | "total_pixel_limit", page?: PdfRasterPageEstimate): PdfRasterBudgetResult =>
      ({ ok: false, reason, dpi: policy.dpi, pageCount: pageSizes.length, totalPixels, pages, page });
    if (![size.widthPoints, size.heightPoints].every(value => Number.isFinite(value) && value > 0)) return failure("invalid_page_size");
    const at = (dpi: number): PdfRasterPageEstimate => {
      const widthPixels = Math.ceil(size.widthPoints * dpi / 72), heightPixels = Math.ceil(size.heightPoints * dpi / 72);
      return { ...size, pageNumber: index + 1, dpi, widthPixels, heightPixels, pixelCount: widthPixels * heightPixels };
    };
    const floor = at(minimumDpi);
    if (!Number.isSafeInteger(floor.pixelCount) || floor.pixelCount <= 0) return failure("invalid_page_size");
    if (floor.pixelCount > pageBudget) return failure(floor.pixelCount > policy.maxPagePixels ? "page_pixel_limit" : "total_pixel_limit", floor);
    let low = minimumDpi, high = policy.dpi;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (at(middle).pixelCount <= pageBudget) low = middle;
      else high = middle - 1;
    }
    const page = at(low);
    pages.push(page); totalPixels += page.pixelCount;
  }
  return { ok: true, dpi: policy.dpi, pageCount: pages.length, totalPixels, pages };
}

/** A score pass is a one-off product, never a recurring plan. */
export const SINGLE_SCORE_PASS = { code: "single-score", amountMinor: 299, currency: "usd", maxPages: 5, credits: 10 } as const;
export type PurchasePlanCode = CheckoutPlanCode | typeof SINGLE_SCORE_PASS.code;
export function isPurchasePlanCode(value: unknown): value is PurchasePlanCode {
  return value === SINGLE_SCORE_PASS.code || isCheckoutPlanCode(value);
}

export { getSingleScorePassCopy } from "./single-score-copy.ts";
