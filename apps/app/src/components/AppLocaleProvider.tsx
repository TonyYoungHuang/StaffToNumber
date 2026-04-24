"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { LOCALE_COOKIE_NAME, type SupportedLocale } from "@score/shared";

type AppLocaleContextValue = {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
};

const AppLocaleContext = createContext<AppLocaleContextValue | null>(null);

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

export function AppLocaleProvider({ locale, children }: { locale: SupportedLocale; children: ReactNode }) {
  const value = useMemo<AppLocaleContextValue>(
    () => ({
      locale,
      setLocale(nextLocale) {
        document.cookie = buildCookie(nextLocale);
      },
    }),
    [locale],
  );

  return <AppLocaleContext.Provider value={value}>{children}</AppLocaleContext.Provider>;
}

export function useAppLocale() {
  const context = useContext(AppLocaleContext);
  if (!context) {
    throw new Error("useAppLocale must be used inside AppLocaleProvider.");
  }

  return context;
}

