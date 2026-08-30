"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ScoreCorrectionMessages } from "../score-correction-messages/types";
import type { ScoreDetailMessages } from "../score-detail-messages/types";
import type { ScoreEntryMessages } from "./types";

export type ScoreReviewMessages = Pick<ScoreEntryMessages, "candidate" | "omr"> & {
  correction: ScoreCorrectionMessages;
  detail: ScoreDetailMessages;
};

const ScoreReviewMessagesContext = createContext<ScoreReviewMessages | null>(null);

export function ScoreReviewMessagesProvider({
  messages,
  children,
}: {
  messages: ScoreReviewMessages;
  children: ReactNode;
}) {
  return (
    <ScoreReviewMessagesContext.Provider value={messages}>
      {children}
    </ScoreReviewMessagesContext.Provider>
  );
}

export function useScoreReviewMessages(): ScoreReviewMessages {
  const messages = useContext(ScoreReviewMessagesContext);
  if (!messages) throw new Error("Score review messages are not available.");
  return messages;
}
