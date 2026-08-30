import type { PlatformFeaturePage } from "../platform-feature-pages";

export const FEATURE_TRANSLATION_SLUGS = [
  "staff-to-jianpu",
  "jianpu-to-staff",
  "transpose-score",
  "score-editor",
  "score-to-audio",
  "audio-to-score",
  "musicxml-midi",
  "pdf-score-scanner",
  "pdf-to-musicxml",
  "teaching",
  "pricing",
] as const;

export type FeatureTranslationSlug = (typeof FEATURE_TRANSLATION_SLUGS)[number];

export type FeaturePageTranslation = Pick<
  PlatformFeaturePage,
  "title" | "eyebrow" | "description" | "keywords" | "modules" | "workflow" | "details" | "guardrail"
>;

export type FeaturePageTranslationCatalog = Record<FeatureTranslationSlug, FeaturePageTranslation>;

export function defineFeatureTranslation(
  title: string,
  eyebrow: string,
  description: string,
  keywords: string[],
  modules: string[],
  workflow: Array<readonly [title: string, body: string]>,
  details: Array<readonly [title: string, body: string]>,
  guardrail: string,
): FeaturePageTranslation {
  return {
    title,
    eyebrow,
    description,
    keywords,
    modules,
    workflow: workflow.map(([stepTitle, body]) => ({ title: stepTitle, body })),
    details: details.map(([detailTitle, body]) => ({ title: detailTitle, body })),
    guardrail,
  };
}

export type FeaturePageUi = {
  home: string;
  unavailable: string;
  actions: { upload: string; checkout: string; scores: string; unavailable: string };
  pricing: string;
  moduleEyebrow: string;
  moduleTitle: string;
  moduleBody: string;
  moduleLabel: string;
  moduleCardBody: string;
  exampleEyebrow: string;
  exampleTitle: string;
  captured: string;
  englishInterfaceNote: string;
  input: string;
  output: string;
  downloadInput: string;
  downloadOutput: string;
  workflowEyebrow: string;
  workflowTitle: string;
  workflowBody: string;
  detailEyebrow: string;
  detailTitle: string;
  faqEyebrow: string;
  faqTitle: (title: string) => string;
  faqBody: string;
  faqInput: (title: string) => string;
  faqEdit: string;
  faqEditAnswer: string;
  faqCheck: string;
  relatedEyebrow: string;
  relatedTitle: string;
  relatedBody: string;
  statuses: Record<PlatformFeaturePage["status"], string>;
  softwareSubcategory: string;
  operatingSystem: string;
  screenshotEvidence: string;
  screenshotAlt: (title: string) => string;
  exampleNotes: string;
};

export const FORMAL_FEATURE_IDS = [
  "online-editor",
  "playback-practice",
  "smart-transposer",
  "staff-jianpu",
  "version-history",
  "share-collaborate",
  "musicxml-midi",
] as const;

export const BETA_FEATURE_IDS = [
  "part-copy",
  "recording-feedback",
  "real-time-collaboration",
  "image-export",
  "audio-export",
  "school-beta",
] as const;

export type FormalFeatureId = (typeof FORMAL_FEATURE_IDS)[number];
export type BetaFeatureId = (typeof BETA_FEATURE_IDS)[number];

export type FeatureIndexCatalog = {
  metadata: {
    title: string;
    description: string;
    keywords: string[];
    imageAlt: string;
  };
  page: {
    eyebrow: string;
    title: string;
    body: string;
    available: string;
    beta: string;
    betaTitle: string;
    betaBody: string;
    open: string;
    workspace: string;
    structuredDataName: string;
  };
  formal: Record<FormalFeatureId, { title: string; body: string }>;
  betaFeatures: Record<BetaFeatureId, { title: string; body: string }>;
};

export type FeaturePracticeCopy = {
  eyebrow: string;
  title: string;
  body: string;
  play: string;
  pause: string;
  muted: string;
  sound: string;
  tempo: string;
  loop: string;
  metronome: string;
  start: string;
  end: string;
  beat: string;
  ready: string;
  readyDetail: string;
  actionAvailable: string;
  actionUnavailable: string;
  error: string;
  experiment: string;
  experimentTitle: string;
  experimentBody: string;
  copyLink: string;
  copied: string;
  copyFallback: string;
  reset: string;
  resetDone: string;
  shortcuts: string;
  shortcutRegion: string;
  shortcutPlay: string;
  shortcutTempo: string;
  shortcutLoop: string;
  shortcutMetronome: string;
  shortcutReset: string;
};
