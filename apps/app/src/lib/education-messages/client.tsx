"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SupportedLocale } from "@score/i18n";
import type { EducationMessages } from "./types";

type EducationMessagesContextValue = { locale: SupportedLocale; messages: EducationMessages };

const EducationMessagesContext = createContext<EducationMessagesContextValue | null>(null);

export function EducationMessagesProvider({ locale, messages, children }: EducationMessagesContextValue & { children: ReactNode }) {
  return <EducationMessagesContext.Provider value={{ locale, messages }}>{children}</EducationMessagesContext.Provider>;
}

export function useEducationMessages(): EducationMessagesContextValue {
  const value = useContext(EducationMessagesContext);
  if (!value) throw new Error("Education messages are not available.");
  return value;
}
