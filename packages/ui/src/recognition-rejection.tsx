import * as React from "react";
import type { RecognitionExperienceMessages } from "@score/i18n";

/** Shared by the homepage, app preflight, and restored upload drafts. */
export function RecognitionRejection({ messages, messageKey, supportCode, fallback, className }: {
  messages: RecognitionExperienceMessages; messageKey: "unsupportedLane" | "unsupportedPages" | "unsupportedFileSize" | "unsupportedPixels" | null; supportCode?: string; fallback?: string; className?: string;
}) {
  return <div role="alert" className={className} data-recognition-lane="unsupported" data-recognition-refusal={messageKey ?? supportCode}>
    {messageKey ? messages[messageKey] : fallback ?? messages.unsupportedLane}
  </div>;
}
