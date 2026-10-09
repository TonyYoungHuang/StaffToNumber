import Link from "next/link";
import { getScorePreflightMessages } from "@score/i18n";
import { EntitlementGate } from "./EntitlementGate";
import { ScoreLibraryManager } from "./ScoreLibraryManager";
import { getAuthMessages } from "../lib/auth-messages";
import { readAppLocale } from "../lib/locale";
import { getScoreEntryMessages } from "../lib/score-entry-messages";
import type { RecognitionMode } from "../lib/recognition-options";

export async function ScoreRecognitionPage({ mode }: { mode: RecognitionMode }) {
  const locale = await readAppLocale();
  const messages = getScoreEntryMessages(locale);
  const copy = getScorePreflightMessages(locale);
  return <section className="container page-shell">
    <div className="page-banner"><p className="eyebrow">ScoreTransposer</p><h1 className="page-title">{mode === "simple" ? copy.simpleTitle : copy.complexTitle}</h1><p className="body-copy large">{copy.freeBody}</p><Link href="/scores" className="button button-secondary">{messages.candidate.back}</Link></div>
    <EntitlementGate allowFreePreview copy={getAuthMessages(locale).entitlement}><ScoreLibraryManager view="scan" copy={messages.library} recognitionMode={mode} /></EntitlementGate>
  </section>;
}
