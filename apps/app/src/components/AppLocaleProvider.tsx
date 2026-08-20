"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { type SupportedLocale } from "@score/shared";

type AppLocaleContextValue = {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
};

const AppLocaleContext = createContext<AppLocaleContextValue | null>(null);

export function AppLocaleProvider({ locale, children }: { locale: SupportedLocale; children: ReactNode }) {
  const [currentLocale, setCurrentLocale] = useState(locale);

  useEffect(() => {
    setCurrentLocale(locale);
  }, [locale]);

  const value = useMemo<AppLocaleContextValue>(
    () => ({
      locale: currentLocale,
      setLocale(nextLocale) {
        setCurrentLocale(nextLocale);
      },
    }),
    [currentLocale],
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

