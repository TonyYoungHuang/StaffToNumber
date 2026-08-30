import { headers } from "next/headers";
import { DEFAULT_LOCALE, normalizeLocale, type SupportedLocale } from "@score/i18n";
import { ROUTE_LOCALE_HEADER } from "./locale-routing";

export const defaultSiteLocale: SupportedLocale = DEFAULT_LOCALE;

export async function readSiteLocale() {
  const requestHeaders = await headers();
  const routeLocale = requestHeaders.get(ROUTE_LOCALE_HEADER);

  return normalizeLocale(routeLocale) ?? defaultSiteLocale;
}
