import type { SupportedLocale } from "@score/i18n";
import type { FeatureSeoRecord } from "../feature-seo";
import type { PlatformFeaturePage } from "../platform-feature-pages";
import {
  getFeatureProductMedia,
  getPendingProductMediaPresentation,
  getProductMediaPresentation,
} from "../product-media";
import type { FeatureProductMediaSlug } from "../product-media";
import { deFeaturePages } from "./locales/de";
import { esFeaturePages } from "./locales/es";
import { frFeaturePages } from "./locales/fr";
import { jaFeaturePages } from "./locales/ja";
import { koFeaturePages } from "./locales/ko";
import { ruFeaturePages } from "./locales/ru";
import { zhCNFeaturePages } from "./locales/zh-CN";
import { zhTWFeaturePages } from "./locales/zh-TW";
import { getFeatureIndexCatalog } from "./feature-index";
import { getFeaturePracticeCopy } from "./practice";
import { FEATURE_OPEN_GRAPH_LOCALES, getFeaturePageUi } from "./ui";
import type { FeaturePageTranslationCatalog, FeatureTranslationSlug } from "./types";

type TranslatedFeatureLocale = Exclude<SupportedLocale, "en">;

const pageTranslationsByLocale = {
  "zh-CN": zhCNFeaturePages,
  "zh-TW": zhTWFeaturePages,
  ja: jaFeaturePages,
  ko: koFeaturePages,
  fr: frFeaturePages,
  es: esFeaturePages,
  de: deFeaturePages,
  ru: ruFeaturePages,
} satisfies Record<TranslatedFeatureLocale, FeaturePageTranslationCatalog>;

function isTranslatedLocale(locale: SupportedLocale): locale is TranslatedFeatureLocale {
  return locale !== "en";
}

export function getFeaturePageTranslationCatalog(locale: SupportedLocale): FeaturePageTranslationCatalog | null {
  return isTranslatedLocale(locale) ? pageTranslationsByLocale[locale] : null;
}

export function localizeFeaturePage(page: PlatformFeaturePage, locale: SupportedLocale): PlatformFeaturePage {
  const catalog = getFeaturePageTranslationCatalog(locale);
  const translation = catalog?.[page.slug as FeatureTranslationSlug];
  return translation ? { ...page, ...translation } : page;
}

export function localizeFeatureEvidence(
  record: FeatureSeoRecord,
  locale: SupportedLocale,
  featureTitle: string,
  featureSlug: FeatureProductMediaSlug,
) {
  const ui = getFeaturePageUi(locale);
  const media = getFeatureProductMedia(featureSlug, locale);
  const mediaPresentation = media ? getProductMediaPresentation(locale, media.sourceLocale, featureTitle) : null;
  const pendingMedia = media ? null : getPendingProductMediaPresentation(locale, featureTitle);
  return {
    ...record,
    screenshot: media ? {
      ...record.screenshot,
      src: media.src,
      width: media.width,
      height: media.height,
      capturedAt: media.capturedAt,
      alt: locale === "en" ? record.screenshot.alt : mediaPresentation?.alt ?? featureTitle,
      evidence: locale === "en" ? record.screenshot.evidence : mediaPresentation?.evidence ?? "",
      sourceLocale: media.sourceLocale,
      sourceRoute: media.sourceRoute,
      sourceRevision: media.sourceRevision,
      interfaceNote: mediaPresentation?.sourceNote ?? "",
    } : null,
    pendingMedia,
    example: {
      ...record.example,
      notes: locale === "en" ? record.example.notes : ui.exampleNotes,
    },
  };
}

export {
  FEATURE_OPEN_GRAPH_LOCALES,
  getFeatureIndexCatalog,
  getFeaturePageUi,
  getFeaturePracticeCopy,
};
export type { FeatureIndexCatalog, FeaturePageUi, FeaturePracticeCopy } from "./types";
