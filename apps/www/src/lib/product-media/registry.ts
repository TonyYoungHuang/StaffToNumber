import { SUPPORTED_LOCALES, isSupportedLocale, type SupportedLocale } from "@score/i18n";
import captureEvidence from "./capture-evidence.json";
import {
  PRODUCT_MEDIA_CAPTURE_PLANS,
  PRODUCT_MEDIA_SLOT_IDS,
  featureProductMediaSlot,
  getPlannedProductMediaSources,
  getProductMediaCapturePlan,
  homepageDemoMediaSlot,
} from "./capture-plan";
import type {
  AvailableProductMediaVariant,
  FeatureProductMediaSlug,
  HomepageDemoMediaSlug,
  PendingProductMediaVariant,
  ProductMediaOutput,
  ProductMediaSlot,
  ProductMediaVariant,
  ReadyProductMediaVariant,
  ResolvedProductDemo,
  ResolvedProductImage,
} from "./types";

type CaptureEvidenceFile = { version: 1; assets: ReadyProductMediaVariant[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function validateOutput(value: unknown, label: string): asserts value is ProductMediaOutput {
  if (!isRecord(value)) throw new Error(`${label} must be an object.`);
  if (typeof value.src !== "string" || !value.src.startsWith("/product/")) throw new Error(`${label}.src must be a public product path.`);
  for (const key of ["width", "height", "bytes"] as const) {
    if (!Number.isInteger(value[key]) || Number(value[key]) <= 0) throw new Error(`${label}.${key} must be a positive integer.`);
  }
  if (typeof value.sha256 !== "string" || !/^[0-9a-f]{64}$/iu.test(value.sha256)) throw new Error(`${label}.sha256 must be a SHA-256 digest.`);
}

function validateCaptureEvidence(value: unknown): asserts value is CaptureEvidenceFile {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.assets)) {
    throw new Error("Product-media capture evidence must use schema version 1.");
  }

  const slots = new Set<string>(PRODUCT_MEDIA_SLOT_IDS);
  const seen = new Set<string>();
  for (const [index, candidate] of value.assets.entries()) {
    if (!isRecord(candidate)) throw new Error(`capture-evidence.assets[${index}] must be an object.`);
    if (typeof candidate.slot !== "string" || !slots.has(candidate.slot)) throw new Error(`Unknown product-media slot at assets[${index}].`);
    if (typeof candidate.locale !== "string" || !isSupportedLocale(candidate.locale)) throw new Error(`Unsupported locale at assets[${index}].`);
    if (candidate.sourceLocale !== candidate.locale) throw new Error(`Ready media ${candidate.slot}/${candidate.locale} must come from the same UI locale.`);
    const key = `${candidate.slot}/${candidate.locale}`;
    if (seen.has(key)) throw new Error(`Duplicate product-media evidence: ${key}.`);
    seen.add(key);
    if (typeof candidate.capturedAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(candidate.capturedAt)) throw new Error(`${key} needs a YYYY-MM-DD capture date.`);
    if (typeof candidate.sourceRoute !== "string" || !candidate.sourceRoute.startsWith("/")) throw new Error(`${key} needs a source route.`);
    if (typeof candidate.sourceRevision !== "string" || candidate.sourceRevision.length < 7) throw new Error(`${key} needs a source revision.`);
    if (candidate.fixtureId !== null && (typeof candidate.fixtureId !== "string" || candidate.fixtureId.length === 0)) throw new Error(`${key} has an invalid fixture id.`);
    if (!['legacy-real-product-capture', 'agent-browser'].includes(String(candidate.captureMethod))) throw new Error(`${key} has an invalid capture method.`);
    const plan = getProductMediaCapturePlan(candidate.slot as ProductMediaSlot);
    if (plan.kind === "image") {
      validateOutput(candidate.image, `${key}.image`);
      if (candidate.poster !== undefined || candidate.video !== undefined) throw new Error(`${key} must contain only one image output.`);
    } else {
      validateOutput(candidate.poster, `${key}.poster`);
      validateOutput(candidate.video, `${key}.video`);
      if (candidate.image !== undefined) throw new Error(`${key} must contain only poster and video outputs.`);
    }
  }
}

validateCaptureEvidence(captureEvidence);

export const PRODUCT_MEDIA_READY_ASSETS = captureEvidence.assets as readonly ReadyProductMediaVariant[];

const readyByKey = new Map(
  PRODUCT_MEDIA_READY_ASSETS.map((asset) => [`${asset.slot}/${asset.locale}`, asset] as const),
);

function readyVariant(slot: ProductMediaSlot, locale: SupportedLocale): AvailableProductMediaVariant | undefined {
  const ready = readyByKey.get(`${slot}/${locale}`);
  return ready ? { ...ready, status: "ready" } : undefined;
}

function pendingVariant(slot: ProductMediaSlot, locale: SupportedLocale): PendingProductMediaVariant {
  const planned = getPlannedProductMediaSources(slot, locale);
  return {
    status: "pending",
    slot,
    locale,
    sourceLocale: null,
    ...(planned.image ? { plannedImageSrc: planned.image } : {}),
    ...(planned.poster ? { plannedPosterSrc: planned.poster } : {}),
    ...(planned.video ? { plannedVideoSrc: planned.video } : {}),
  };
}

export const PRODUCT_MEDIA_REGISTRY = Object.fromEntries(
  PRODUCT_MEDIA_CAPTURE_PLANS.map((plan) => [
    plan.slot,
    Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, readyVariant(plan.slot, locale) ?? pendingVariant(plan.slot, locale)])),
  ]),
) as Readonly<Record<ProductMediaSlot, Readonly<Record<SupportedLocale, ProductMediaVariant>>>>;

export function getProductMediaVariant(slot: ProductMediaSlot, locale: SupportedLocale): ProductMediaVariant {
  return PRODUCT_MEDIA_REGISTRY[slot][locale];
}

function resolveReadyVariant(slot: ProductMediaSlot, locale: SupportedLocale): AvailableProductMediaVariant | null {
  const requested = getProductMediaVariant(slot, locale);
  if (requested.status === "ready") return requested;
  return null;
}

function resolvedImage(slot: ProductMediaSlot, locale: SupportedLocale, output: "image" | "poster"): ResolvedProductImage | null {
  const asset = resolveReadyVariant(slot, locale);
  if (!asset) return null;
  const media = asset[output];
  if (!media) throw new Error(`Product media ${slot}/${asset.locale} has no ${output} output.`);
  return {
    ...media,
    slot,
    requestedLocale: locale,
    sourceLocale: asset.sourceLocale,
    localized: locale === asset.sourceLocale,
    capturedAt: asset.capturedAt,
    sourceRoute: asset.sourceRoute,
    sourceRevision: asset.sourceRevision,
    fixtureId: asset.fixtureId,
    captureMethod: asset.captureMethod,
  };
}

export function getFeatureProductMedia(slug: FeatureProductMediaSlug, locale: SupportedLocale): ResolvedProductImage | null {
  return resolvedImage(featureProductMediaSlot(slug), locale, "image");
}

export function getHomepageDemoProductMedia(slug: HomepageDemoMediaSlug, locale: SupportedLocale): ResolvedProductDemo | null {
  const slot = homepageDemoMediaSlot(slug);
  const asset = resolveReadyVariant(slot, locale);
  if (!asset) return null;
  if (!asset.poster || !asset.video) throw new Error(`Homepage demo ${slug}/${asset.locale} is incomplete.`);
  return {
    slot,
    requestedLocale: locale,
    sourceLocale: asset.sourceLocale,
    localized: locale === asset.sourceLocale,
    poster: asset.poster,
    video: asset.video,
    capturedAt: asset.capturedAt,
    sourceRoute: asset.sourceRoute,
    sourceRevision: asset.sourceRevision,
    fixtureId: asset.fixtureId,
    captureMethod: asset.captureMethod,
  };
}

export function getWorkspacePreviewProductMedia(locale: SupportedLocale): ResolvedProductImage | null {
  return resolvedImage("workspace.preview", locale, "image");
}

export function getHomepageCaseProductMedia(
  slug: "pdf-score-scanner" | "transpose-score" | "score-to-audio",
  locale: SupportedLocale,
): ResolvedProductImage | null {
  return getFeatureProductMedia(slug, locale);
}

export type StaticMarketingProductMediaKey = "about" | "faq" | "readingGuide" | "numberedNotation";

export function getStaticMarketingProductMedia(page: StaticMarketingProductMediaKey, locale: SupportedLocale): ResolvedProductImage | null {
  if (page === "about") return resolvedImage(homepageDemoMediaSlot("score-editor"), locale, "poster");
  if (page === "numberedNotation") return resolvedImage(homepageDemoMediaSlot("staff-to-jianpu"), locale, "poster");
  return getWorkspacePreviewProductMedia(locale);
}

export function getSupportLegalProductMedia(locale: SupportedLocale): ResolvedProductImage | null {
  return getWorkspacePreviewProductMedia(locale);
}

export function listPendingProductMediaOutputs() {
  const pending: Array<{
    slot: ProductMediaSlot;
    locale: SupportedLocale;
    output: "image" | "poster" | "video";
    src: string;
  }> = [];
  for (const plan of PRODUCT_MEDIA_CAPTURE_PLANS) {
    for (const locale of SUPPORTED_LOCALES) {
      const variant = getProductMediaVariant(plan.slot, locale);
      if (variant.status === "ready") continue;
      if (plan.kind === "image") {
        pending.push({ slot: plan.slot, locale, output: "image", src: variant.plannedImageSrc! });
      } else {
        pending.push({ slot: plan.slot, locale, output: "poster", src: variant.plannedPosterSrc! });
        pending.push({ slot: plan.slot, locale, output: "video", src: variant.plannedVideoSrc! });
      }
    }
  }
  return pending;
}

export function getHomepageProductMediaRequestSet(locale: SupportedLocale) {
  const cases = (["pdf-score-scanner", "transpose-score", "score-to-audio"] as const)
    .flatMap((slug) => {
      const media = getHomepageCaseProductMedia(slug, locale);
      return media ? [media.src] : [];
    });
  const demos = (["score-editor", "transpose-score", "staff-to-jianpu", "score-to-audio"] as const)
    .flatMap((slug) => {
      const demo = getHomepageDemoProductMedia(slug, locale);
      return demo ? [demo.poster.src, demo.video.src] : [];
    });
  return [...cases, ...demos] as const;
}
