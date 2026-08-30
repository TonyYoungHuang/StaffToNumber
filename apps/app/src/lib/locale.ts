import { headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  getLocaleConfig,
  readLocaleCookie,
  type SupportedLocale,
} from "@score/i18n";

export const defaultAppLocale: SupportedLocale = DEFAULT_LOCALE;

export function resolveAppLocale(cookieHeader: string | null | undefined): SupportedLocale {
  return readLocaleCookie(cookieHeader) ?? defaultAppLocale;
}

export async function readAppLocale() {
  const requestHeaders = await headers();
  return resolveAppLocale(requestHeaders.get("cookie"));
}

export function localeLabel(locale: SupportedLocale) {
  return getLocaleConfig(locale).label;
}
