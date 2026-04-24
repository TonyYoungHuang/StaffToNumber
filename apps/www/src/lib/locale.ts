import { cookies } from "next/headers";
import { isSupportedLocale, LOCALE_COOKIE_NAME, type SupportedLocale } from "@score/shared";

export const defaultSiteLocale: SupportedLocale = "en";

export async function readSiteLocale() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  if (isSupportedLocale(cookieLocale)) {
    return cookieLocale;
  }

  return defaultSiteLocale;
}

