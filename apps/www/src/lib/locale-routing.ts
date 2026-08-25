import type { Metadata } from "next";
import type { SupportedLocale } from "@score/shared";

export const ROUTE_LOCALE_HEADER = "x-score-route-locale";
export const CHINESE_ROUTE_PREFIX = "/zh-cn";

function normalizePublicPath(pathname: string) {
  const withoutQuery = pathname.split(/[?#]/u, 1)[0] || "/";
  const withLeadingSlash = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  if (withLeadingSlash === "/") return "/";
  return withLeadingSlash.replace(/\/+$/u, "");
}

export function stripPublicLocalePrefix(pathname: string) {
  const normalized = normalizePublicPath(pathname);
  if (normalized.toLowerCase() === CHINESE_ROUTE_PREFIX) return "/";
  if (normalized.toLowerCase().startsWith(`${CHINESE_ROUTE_PREFIX}/`)) {
    return normalized.slice(CHINESE_ROUTE_PREFIX.length) || "/";
  }
  return normalized;
}

export function localeFromPublicPath(pathname: string): SupportedLocale {
  const normalized = normalizePublicPath(pathname).toLowerCase();
  return normalized === CHINESE_ROUTE_PREFIX || normalized.startsWith(`${CHINESE_ROUTE_PREFIX}/`) ? "zh-CN" : "en";
}

export function localizePublicPath(pathname: string, locale: SupportedLocale) {
  const basePath = stripPublicLocalePrefix(pathname);
  if (locale === "en") return basePath;
  return basePath === "/" ? CHINESE_ROUTE_PREFIX : `${CHINESE_ROUTE_PREFIX}${basePath}`;
}

export function localizePublicHref(href: string, locale: SupportedLocale) {
  if (!href.startsWith("/") || href.startsWith("//")) return href;

  const match = href.match(/^([^?#]*)(.*)$/u);
  const pathname = match?.[1] || "/";
  const suffix = match?.[2] || "";
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || pathname.includes(".")) return href;
  return `${localizePublicPath(pathname, locale)}${suffix}`;
}

export function getLocalizedAbsoluteUrl(siteUrl: string, pathname: string, locale: SupportedLocale) {
  return new URL(localizePublicPath(pathname, locale), `${siteUrl.replace(/\/+$/u, "")}/`).toString();
}

export function getLocalizedAlternates(pathname: string, locale: SupportedLocale): NonNullable<Metadata["alternates"]> {
  const englishPath = localizePublicPath(pathname, "en");
  const chinesePath = localizePublicPath(pathname, "zh-CN");
  return {
    canonical: locale === "zh-CN" ? chinesePath : englishPath,
    languages: {
      en: englishPath,
      "zh-CN": chinesePath,
      "x-default": englishPath,
    },
  };
}

