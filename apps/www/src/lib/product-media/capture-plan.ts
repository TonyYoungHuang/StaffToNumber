import type { SupportedLocale } from "@score/i18n";
import {
  FEATURE_PRODUCT_MEDIA_SLUGS,
  HOMEPAGE_DEMO_MEDIA_SLUGS,
  type FeatureProductMediaSlug,
  type HomepageDemoMediaSlug,
  type ProductMediaCapturePlan,
  type ProductMediaSlot,
} from "./types";

const scoreRoute = "/scores/{scoreId}";
const standardViewport = [1440, 900] as const;
const demoViewport = [1280, 720] as const;
const jpegImageSlots = new Set<ProductMediaSlot>([
  "feature.transpose-score",
  "feature.score-to-audio",
  "feature.audio-to-score",
  "feature.musicxml-midi",
  "feature.pdf-to-musicxml",
  "feature.pricing",
  "workspace.preview",
]);

const featureTargets = {
  "staff-to-jianpu": { routeTemplate: scoreRoute, selector: "#jianpu-preview" },
  "jianpu-to-staff": { routeTemplate: scoreRoute, selector: "#omr-comparison .score-preview-shell" },
  "transpose-score": { routeTemplate: scoreRoute, selector: "#transpose-score" },
  "score-editor": { routeTemplate: scoreRoute, selector: "#visual-editor" },
  "score-to-audio": { routeTemplate: scoreRoute, selector: "#playback-practice" },
  "audio-to-score": { routeTemplate: scoreRoute, selector: "#score-jobs" },
  "musicxml-midi": { routeTemplate: scoreRoute, selector: "#export-center" },
  "pdf-score-scanner": { routeTemplate: scoreRoute, selector: "#omr-comparison" },
  "pdf-to-musicxml": { routeTemplate: scoreRoute, selector: "#score-json-model" },
  teaching: { routeTemplate: scoreRoute, selector: "#teaching-workflow" },
  pricing: { routeTemplate: "/billing", selector: ".page-shell" },
} as const satisfies Record<FeatureProductMediaSlug, { routeTemplate: string; selector: string }>;

const demoInteractions = {
  "score-editor": "editor-nudge",
  "transpose-score": "transpose-preview",
  "staff-to-jianpu": "jianpu-refresh",
  "score-to-audio": "playback-preview",
} as const satisfies Record<HomepageDemoMediaSlug, NonNullable<ProductMediaCapturePlan["interaction"]>>;

const demoSelectors = {
  "score-editor": "#visual-editor",
  "transpose-score": "#transpose-score",
  "staff-to-jianpu": "#jianpu-preview",
  "score-to-audio": "#playback-practice",
} as const satisfies Record<HomepageDemoMediaSlug, string>;

const featurePlans = FEATURE_PRODUCT_MEDIA_SLUGS.map((slug) => ({
  slot: `feature.${slug}`,
  kind: "image",
  fileStem: `feature-${slug}-real`,
  requiresScoreFixture: slug !== "pricing",
  target: {
    ...featureTargets[slug],
    viewport: standardViewport,
    settleMs: slug === "score-to-audio" || slug === "jianpu-to-staff" ? 2_000 : 1_200,
  },
} as const satisfies ProductMediaCapturePlan));

const demoPlans = HOMEPAGE_DEMO_MEDIA_SLUGS.map((slug) => ({
  slot: `homepage-demo.${slug}`,
  kind: "demo",
  fileStem: `demo-${slug}`,
  requiresScoreFixture: true,
  target: { routeTemplate: scoreRoute, selector: demoSelectors[slug], viewport: demoViewport, settleMs: 1_500 },
  interaction: demoInteractions[slug],
} as const satisfies ProductMediaCapturePlan));

export const PRODUCT_MEDIA_CAPTURE_PLANS = [
  ...featurePlans,
  ...demoPlans,
  {
    slot: "workspace.preview",
    kind: "image",
    fileStem: "score-preview-output-real",
    requiresScoreFixture: true,
    target: { routeTemplate: scoreRoute, selector: "#revision-history", viewport: standardViewport, settleMs: 1_200 },
  },
] as const satisfies readonly ProductMediaCapturePlan[];

export const PRODUCT_MEDIA_SLOT_IDS = PRODUCT_MEDIA_CAPTURE_PLANS.map((plan) => plan.slot) as readonly ProductMediaSlot[];

export function productMediaLocaleToken(locale: SupportedLocale) {
  return locale.toLowerCase();
}

export function getProductMediaCapturePlan(slot: ProductMediaSlot): ProductMediaCapturePlan {
  const plan = PRODUCT_MEDIA_CAPTURE_PLANS.find((candidate) => candidate.slot === slot);
  if (!plan) throw new Error(`Unknown product media slot: ${slot}`);
  return plan;
}

export function getPlannedProductMediaSources(slot: ProductMediaSlot, locale: SupportedLocale) {
  const plan = getProductMediaCapturePlan(slot);
  const root = `/product/localized/${productMediaLocaleToken(locale)}`;
  if (plan.kind === "demo") {
    return {
      poster: `${root}/${plan.fileStem}-poster.jpg`,
      video: `${root}/${plan.fileStem}.webm`,
    } as const;
  }
  const imageExtension = jpegImageSlots.has(slot) ? "jpg" : "png";
  return { image: `${root}/${plan.fileStem}.${imageExtension}` } as const;
}

export function featureProductMediaSlot(slug: FeatureProductMediaSlug): ProductMediaSlot {
  return `feature.${slug}`;
}

export function homepageDemoMediaSlot(slug: HomepageDemoMediaSlug): ProductMediaSlot {
  return `homepage-demo.${slug}`;
}
