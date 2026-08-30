"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SupportedLocale } from "@score/i18n";
import type { ScoreEditorMessages } from "./types";

type ScoreEditorMessagesContextValue = {
  locale: SupportedLocale;
  messages: ScoreEditorMessages;
};

const ScoreEditorMessagesContext = createContext<ScoreEditorMessagesContextValue | null>(null);

export function ScoreEditorMessagesProvider({
  locale,
  messages,
  children,
}: ScoreEditorMessagesContextValue & { children: ReactNode }) {
  return <ScoreEditorMessagesContext.Provider value={{ locale, messages }}>{children}</ScoreEditorMessagesContext.Provider>;
}

export function useScoreEditorMessages(): ScoreEditorMessagesContextValue {
  const value = useContext(ScoreEditorMessagesContext);
  if (!value) throw new Error("Score editor messages are not available.");
  return value;
}
