"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SupportedLocale } from "@score/i18n";
import type { ScoreSharingMessages } from "./types";

type ScoreSharingMessagesContextValue = {
  locale: SupportedLocale;
  messages: ScoreSharingMessages;
};

const ScoreSharingMessagesContext = createContext<ScoreSharingMessagesContextValue | null>(null);

export function ScoreSharingMessagesProvider({
  locale,
  messages,
  children,
}: ScoreSharingMessagesContextValue & { children: ReactNode }) {
  return (
    <ScoreSharingMessagesContext.Provider value={{ locale, messages }}>
      {children}
    </ScoreSharingMessagesContext.Provider>
  );
}

export function useScoreSharingMessages(): ScoreSharingMessagesContextValue {
  const value = useContext(ScoreSharingMessagesContext);
  if (!value) throw new Error("Score sharing messages are not available.");
  return value;
}
