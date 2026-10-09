"use client";

import { ScorePassBalance } from "./ScorePassBalance";

import {
  ScoreReviewMessagesProvider,
  type ScoreReviewMessages,
} from "../lib/score-entry-messages/client";
import type { ScoreEntryMessages } from "../lib/score-entry-messages/types";
import { ScoreDetailClient } from "./ScoreDetailClient";

export function ScoreAccessWorkspace({
  reviewMessages,
  ensemble = false,
}: {
  accessCopy: ScoreEntryMessages["access"];
  reviewMessages: ScoreReviewMessages;
  ensemble?: boolean;
}) {
  // EntitlementGate has already checked identity. Project permissions remain
  // enforced by each API operation for both free and paid accounts.
  return (
      <ScoreReviewMessagesProvider messages={reviewMessages}>
        <ScorePassBalance />
        <ScoreDetailClient ensemble={ensemble} />
      </ScoreReviewMessagesProvider>
  );
}
