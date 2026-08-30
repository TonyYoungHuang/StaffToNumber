import type { Metadata } from "next";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getLocaleFromPathname,
  localizePathname,
  stripLocalePrefix,
  type SupportedLocale,
} from "@score/i18n";

export const ROUTE_LOCALE_HEADER = "x-score-route-locale";

function splitPublicHref(href: string) {
  const match = href.match(/^([^?#]*)(.*)$/u);
  return {
    pathname: match?.[1] || "/",
    suffix: match?.[2] || "",
  };
}

function normalizePublicPath(pathname: string) {
  const withoutQuery = pathname.split(/[?#]/u, 1)[0] || "/";
  const withLeadingSlash = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  if (withLeadingSlash === "/") return "/";
  return withLeadingSlash.replace(/\/+$/u, "");
}

export function stripPublicLocalePrefix(pathname: string) {
  return normalizePublicPath(stripLocalePrefix(pathname).pathname);
}

export function localeFromPublicPath(pathname: string): SupportedLocale {
  return getLocaleFromPathname(pathname) ?? DEFAULT_LOCALE;
}

export function localizePublicPath(pathname: string, locale: SupportedLocale) {
  return localizePathname(normalizePublicPath(pathname), locale);
}

export function localizePublicHref(href: string, locale: SupportedLocale) {
  if (!href.startsWith("/") || href.startsWith("//")) return href;

  const { pathname, suffix } = splitPublicHref(href);
  if (/^\/(?:api|_next)(?:\/|$)/u.test(pathname) || /\/[^/]+\.[^/]+$/u.test(pathname)) return href;
  return `${localizePublicPath(pathname, locale)}${suffix}`;
}

export function getPublicLocaleSwitchHref(
  location: { pathname: string; search: string; hash: string },
  locale: SupportedLocale,
) {
  return localizePublicHref(`${location.pathname}${location.search}${location.hash}`, locale);
}

export function getLocalizedAbsoluteUrl(siteUrl: string, pathname: string, locale: SupportedLocale) {
  return new URL(localizePublicPath(pathname, locale), `${siteUrl.replace(/\/+$/u, "")}/`).toString();
}

export function getLocalizedAlternates(pathname: string, locale: SupportedLocale): NonNullable<Metadata["alternates"]> {
  const languages = Object.fromEntries(
    SUPPORTED_LOCALES.map((supportedLocale) => [supportedLocale, localizePublicPath(pathname, supportedLocale)]),
  ) as Record<SupportedLocale, string>;

  return {
    canonical: languages[locale],
    languages: {
      ...languages,
      "x-default": languages[DEFAULT_LOCALE],
    },
  };
}
