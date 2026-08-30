"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SupportedLocale } from "@score/i18n";

type SiteLocaleContextValue = {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
};

const SiteLocaleContext = createContext<SiteLocaleContextValue | null>(null);

export function SiteLocaleProvider({ locale, children }: { locale: SupportedLocale; children: ReactNode }) {
  const [currentLocale, setCurrentLocale] = useState(locale);

  useEffect(() => {
    setCurrentLocale(locale);
  }, [locale]);

  const value = useMemo<SiteLocaleContextValue>(
    () => ({
      locale: currentLocale,
      setLocale(nextLocale) {
        setCurrentLocale(nextLocale);
      },
    }),
    [currentLocale],
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

