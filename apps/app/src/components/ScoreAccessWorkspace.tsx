"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import {
  ScoreReviewMessagesProvider,
  type ScoreReviewMessages,
} from "../lib/score-entry-messages/client";
import type { ScoreEntryMessages } from "../lib/score-entry-messages/types";
import { ScoreDetailClient } from "./ScoreDetailClient";

type AccessPayload = {
  user: {
    entitlement: { status: "inactive" | "active" | "expired" };
  };
};

export function ScoreAccessWorkspace({
  accessCopy,
  reviewMessages,
}: {
  accessCopy: ScoreEntryMessages["access"];
  reviewMessages: ScoreReviewMessages;
}) {
  const [access, setAccess] = useState<"checking" | "paid" | "preview" | "error">("checking");
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<AccessPayload>("/api/auth/me").then((result) => {
      if (!result.ok) {
        setAccessError(result.error);
        setAccess("error");
      }
      else setAccess(result.data.user.entitlement.status === "active" ? "paid" : "preview");
    });
  }, []);

  if (access === "paid" || access === "preview") {
    return (
      <ScoreReviewMessagesProvider messages={reviewMessages}>
        <ScoreDetailClient />
      </ScoreReviewMessagesProvider>
    );
  }
  return (
    <div className="surface-panel stack-sm" role={access === "error" ? "alert" : "status"} aria-live="polite">
      <p className="eyebrow">
        {access === "checking" ? accessCopy.checking : accessError ?? accessCopy.errorFallback}
      </p>
    </div>
  );
}
