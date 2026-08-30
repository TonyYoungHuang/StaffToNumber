import type { SupportedLocale } from "@score/i18n";

export const FEATURE_PRODUCT_MEDIA_SLUGS = [
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

export const HOMEPAGE_DEMO_MEDIA_SLUGS = [
  "score-editor",
  "transpose-score",
  "staff-to-jianpu",
  "score-to-audio",
] as const;

export type FeatureProductMediaSlug = (typeof FEATURE_PRODUCT_MEDIA_SLUGS)[number];
export type HomepageDemoMediaSlug = (typeof HOMEPAGE_DEMO_MEDIA_SLUGS)[number];
export type ProductMediaSlot =
  | `feature.${FeatureProductMediaSlug}`
  | `homepage-demo.${HomepageDemoMediaSlug}`
  | "workspace.preview";

export type ProductMediaOutput = {
  src: string;
  width: number;
  height: number;
  bytes: number;
  sha256: string;
};

export type ProductMediaEvidence = {
  capturedAt: string;
  sourceRoute: string;
  sourceRevision: string;
  fixtureId: string | null;
  captureMethod: "legacy-real-product-capture" | "agent-browser";
};

export type ReadyProductMediaVariant = ProductMediaEvidence & {
  slot: ProductMediaSlot;
  locale: SupportedLocale;
  sourceLocale: SupportedLocale;
  image?: ProductMediaOutput;
  poster?: ProductMediaOutput;
  video?: ProductMediaOutput;
};

export type PendingProductMediaVariant = {
  status: "pending";
  slot: ProductMediaSlot;
  locale: SupportedLocale;
  sourceLocale: null;
  plannedImageSrc?: string;
  plannedPosterSrc?: string;
  plannedVideoSrc?: string;
};

export type AvailableProductMediaVariant = ReadyProductMediaVariant & { status: "ready" };
export type ProductMediaVariant = AvailableProductMediaVariant | PendingProductMediaVariant;

export type ResolvedProductImage = ProductMediaOutput & ProductMediaEvidence & {
  slot: ProductMediaSlot;
  requestedLocale: SupportedLocale;
  sourceLocale: SupportedLocale;
  localized: boolean;
};

export type ResolvedProductDemo = ProductMediaEvidence & {
  slot: ProductMediaSlot;
  requestedLocale: SupportedLocale;
  sourceLocale: SupportedLocale;
  localized: boolean;
  poster: ProductMediaOutput;
  video: ProductMediaOutput;
};

export type ProductMediaCaptureTarget = {
  routeTemplate: string;
  selector: string;
  viewport: readonly [width: number, height: number];
  settleMs: number;
};

export type ProductMediaCapturePlan = {
  slot: ProductMediaSlot;
  kind: "image" | "demo";
  fileStem: string;
  requiresScoreFixture: boolean;
  target: ProductMediaCaptureTarget;
  interaction?: "editor-nudge" | "transpose-preview" | "jianpu-refresh" | "playback-preview";
};

