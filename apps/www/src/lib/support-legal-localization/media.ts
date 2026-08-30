import { SUPPORTED_LOCALES, type SupportedLocale } from "@score/i18n";
import { getSupportLegalProductMedia } from "../product-media";

export type SupportLegalPageKey = "support" | "copyright" | "privacy" | "terms";

export const SUPPORT_LEGAL_MEDIA_SOURCE_LOCALES = Object.fromEntries(
  SUPPORTED_LOCALES.map((locale) => [locale, getSupportLegalProductMedia(locale)?.sourceLocale ?? null]),
) as Readonly<Record<SupportedLocale, SupportedLocale | null>>;

export function getSupportLegalMedia(page: SupportLegalPageKey, locale: SupportedLocale) {
  void page;
  return getSupportLegalProductMedia(locale);
}
