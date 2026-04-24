"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { LOCALE_COOKIE_NAME, type SupportedLocale } from "@score/shared";

type SiteLocaleContextValue = {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
};

const SiteLocaleContext = createContext<SiteLocaleContextValue | null>(null);

function buildCookie(locale: SupportedLocale) {
  const parts = [
    `${LOCALE_COOKIE_NAME}=${locale}`,
    "Path=/",
    `Max-Age=${60 * 60 * 24 * 365}`,
    "SameSite=Lax",
  ];

  const cookieDomain = process.env.NEXT_PUBLIC_LOCALE_COOKIE_DOMAIN;
  if (cookieDomain) {
    parts.push(`Domain=${cookieDomain}`);
  }

  return parts.join("; ");
}

export function SiteLocaleProvider({ locale, children }: { locale: SupportedLocale; children: ReactNode }) {
  const value = useMemo<SiteLocaleContextValue>(
    () => ({
      locale,
      setLocale(nextLocale) {
        document.cookie = buildCookie(nextLocale);
      },
    }),
    [locale],
  );

  return <SiteLocaleContext.Provider value={value}>{children}</SiteLocaleContext.Provider>;
}

export function useSiteLocale() {
  const context = useContext(SiteLocaleContext);
  if (!context) {
    throw new Error("useSiteLocale must be used inside SiteLocaleProvider.");
  }

  return context;
}

