import { SUPPORTED_LOCALES, type SupportedLocale } from "@score/i18n";
import { HOMEPAGE_DEMO_MEDIA_SLUGS, getHomepageDemoProductMedia } from "../product-media";

export type HomepageMediaSourceLocale = SupportedLocale | null;

export const HOMEPAGE_MEDIA_SOURCE_LOCALES = Object.fromEntries(
  SUPPORTED_LOCALES.map((locale) => {
    const complete = HOMEPAGE_DEMO_MEDIA_SLUGS.every((slug) => getHomepageDemoProductMedia(slug, locale)?.sourceLocale === locale);
    return [locale, complete ? locale : null];
  }),
) as Readonly<Record<SupportedLocale, HomepageMediaSourceLocale>>;

export function getHomepageMediaSourceLocale(locale: SupportedLocale): HomepageMediaSourceLocale {
  return HOMEPAGE_MEDIA_SOURCE_LOCALES[locale];
}
