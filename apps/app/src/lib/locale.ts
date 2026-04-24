import { cookies } from "next/headers";
import { isSupportedLocale, LOCALE_COOKIE_NAME, type SupportedLocale } from "@score/shared";

export const defaultAppLocale: SupportedLocale = "en";

export async function readAppLocale() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  if (isSupportedLocale(cookieLocale)) {
    return cookieLocale;
  }

  return defaultAppLocale;
}

export function localeLabel(locale: SupportedLocale) {
  return locale === "zh-CN" ? "简体中文" : "English";
}

