"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { SupportedLocale } from "@score/i18n";
import type { PlaybackPracticeMessages } from "./types";

type PlaybackPracticeMessagesContextValue = {
  locale: SupportedLocale;
  messages: PlaybackPracticeMessages;
};

const PlaybackPracticeMessagesContext = createContext<PlaybackPracticeMessagesContextValue | null>(null);

export function PlaybackPracticeMessagesProvider({
  locale,
  messages,
  children,
}: PlaybackPracticeMessagesContextValue & { children: ReactNode }) {
  const value = useMemo(() => ({ locale, messages }), [locale, messages]);
  return (
    <PlaybackPracticeMessagesContext.Provider value={value}>
      {children}
    </PlaybackPracticeMessagesContext.Provider>
  );
}

export function usePlaybackPracticeMessages() {
  const value = useContext(PlaybackPracticeMessagesContext);
  if (!value) throw new Error("Playback and practice messages are not available.");
  return value;
}
