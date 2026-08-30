import { SUPPORTED_LOCALES, type SupportedLocale } from "@score/i18n";
import { getStaticMarketingProductMedia } from "../product-media";

export type StaticMarketingPageKey = "about" | "faq" | "readingGuide" | "numberedNotation";

export const STATIC_MARKETING_MEDIA_SOURCE_LOCALES = Object.fromEntries(
  (["about", "faq", "readingGuide", "numberedNotation"] as const).map((page) => [
    page,
    Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, getStaticMarketingProductMedia(page, locale)?.sourceLocale ?? null])),
  ]),
) as Readonly<Record<StaticMarketingPageKey, Readonly<Record<SupportedLocale, SupportedLocale | null>>>>;

export function getStaticMarketingMedia(
  page: StaticMarketingPageKey,
  locale: SupportedLocale,
) {
  return getStaticMarketingProductMedia(page, locale);
}
