import { headers } from "next/headers";
import { isSupportedLocale, type SupportedLocale } from "@score/shared";
import { ROUTE_LOCALE_HEADER } from "./locale-routing";

export const defaultSiteLocale: SupportedLocale = "en";

export async function readSiteLocale() {
  const requestHeaders = await headers();
  const routeLocale = requestHeaders.get(ROUTE_LOCALE_HEADER);

  if (isSupportedLocale(routeLocale)) {
    return routeLocale;
  }

  return defaultSiteLocale;
}
