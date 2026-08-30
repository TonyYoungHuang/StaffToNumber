import type { Metadata } from "next";
import Link from "next/link";
import { APP_ROUTES } from "@score/shared";
import { EntitlementGate } from "../../../components/EntitlementGate";
import { getAuthMessages } from "../../../lib/auth-messages";
import { readAppLocale } from "../../../lib/locale";
import { getScoreEntryMessages } from "../../../lib/score-entry-messages";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function NewScorePage() {
  const locale = await readAppLocale();
  const messages = getScoreEntryMessages(locale);
  const copy = messages.pages.newScore;
  const entitlementCopy = getAuthMessages(locale).entitlement;
  const audioAvailable = process.env.NEXT_PUBLIC_AUDIO_TRANSCRIPTION_AVAILABLE === "true";
  const choices = [
    {
      source: "scan",
      ...copy.choices.scan,
      recommended: true,
    },
    {
      source: "jianpu",
      ...copy.choices.jianpu,
      recommended: false,
    },
    {
      source: "musicxml",
      ...copy.choices.musicxml,
      recommended: false,
    },
    {
      source: "midi",
      ...copy.choices.midi,
      recommended: false,
    },
    ...(audioAvailable ? [{
      source: "audio",
      ...copy.choices.audio,
      recommended: false,
    }] : []),
    {
      source: "backup",
      ...copy.choices.backup,
      recommended: false,
    },
  ];

  return (
    <section className="container page-shell">
      <div className="page-banner">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 className="page-title">{copy.title}</h1>
        <p className="body-copy large">{copy.body}</p>
      </div>

      <EntitlementGate allowFreePreview copy={entitlementCopy}>
        <div className="new-score-grid">
          {choices.map((choice) => (
            <Link key={choice.source} href={`${APP_ROUTES.scores}/new/${choice.source}`} className="source-choice">
              <span className={`status-chip ${choice.recommended ? "tone-primary" : "tone-cyan"}`}>
                {choice.recommended ? copy.recommended : copy.choose}
              </span>
              <h2 className="card-title">{choice.title}</h2>
              <p className="body-copy">{choice.body}</p>
            </Link>
          ))}
        </div>
      </EntitlementGate>
    </section>
  );
}
