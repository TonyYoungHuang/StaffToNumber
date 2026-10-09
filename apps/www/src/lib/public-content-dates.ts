import type { SupportedLocale } from "@score/i18n";
import { FEATURE_TRANSLATION_SLUGS } from "./feature-localization/types";

// Editorial dates, not build dates. Unchanged languages keep their original dates.
const frenchRevisedPaths = new Set([
  "/", "/about", "/faq", "/features", "/support", "/terms",
  ...FEATURE_TRANSLATION_SLUGS.map(slug => `/${slug}`),
]);

const englishOnPageRevisedPaths = new Set([
  "/", "/sheet-music-scanner", "/pdf-to-musicxml", "/score-editor",
  "/musicxml-midi", "/transpose-score", "/staff-to-jianpu",
  "/jianpu-to-staff", "/score-to-audio", "/audio-to-score", "/teaching",
]);
const enEsRevisedPaths = new Set([
  "/", "/about", "/faq", "/support", "/terms", "/privacy", "/copyright-complaint", "/library",
  ...FEATURE_TRANSLATION_SLUGS.map(slug => `/${slug}`),
]);
const nineLocaleSeoPaths = new Set(["/", "/sheet-music-scanner", "/pdf-to-musicxml", "/score-editor", "/musicxml-midi", "/transpose-score"]);
const jianpuRevisedLocales = new Set<SupportedLocale>(["zh-CN", "zh-TW", "ja", "ko"]);

export function localizedContentLastUpdated<T extends string | Date | undefined>(pathname: string, locale: SupportedLocale, fallback: T): T | string {
  if (nineLocaleSeoPaths.has(pathname) || (jianpuRevisedLocales.has(locale) && (pathname === "/staff-to-jianpu" || pathname === "/jianpu-to-staff"))) return "2026-09-30";
  if (locale === "en" && englishOnPageRevisedPaths.has(pathname)) return "2026-09-30";
  if ((locale === "en" || locale === "es") && enEsRevisedPaths.has(pathname)) return "2026-09-30";
  if ((locale === "de" || locale === "ru") && frenchRevisedPaths.has(pathname)) return "2026-09-30";
  return locale === "fr" && (frenchRevisedPaths.has(pathname) || pathname.startsWith("/library/"))
    ? "2026-09-29"
    : fallback;
}
