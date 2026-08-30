import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { APP_ROUTES } from "@score/shared";
import { EntitlementGate } from "../../../../components/EntitlementGate";
import { ScoreLibraryManager, type ScoreImportView } from "../../../../components/ScoreLibraryManager";
import { getAuthMessages } from "../../../../lib/auth-messages";
import { readAppLocale } from "../../../../lib/locale";
import { getScoreEntryMessages } from "../../../../lib/score-entry-messages";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const SUPPORTED_SOURCES = new Set<ScoreImportView>(["scan", "jianpu", "musicxml", "midi", "audio", "backup"]);

export default async function ScoreSourcePage({ params }: { params: Promise<{ source: string }> }) {
  const { source } = await params;
  if (!SUPPORTED_SOURCES.has(source as ScoreImportView)) notFound();
  if (source === "audio" && process.env.NEXT_PUBLIC_AUDIO_TRANSCRIPTION_AVAILABLE !== "true") notFound();

  const view = source as ScoreImportView;
  const locale = await readAppLocale();
  const messages = getScoreEntryMessages(locale);
  const entitlementCopy = getAuthMessages(locale).entitlement;
  const copy = messages.pages.source;
  const headings: Record<Exclude<ScoreImportView, "library">, { eyebrow: string; title: string; body: string }> = copy.headings;
  const heading = headings[view as Exclude<ScoreImportView, "library">];

  return (
    <section className="container page-shell">
      <div className="page-banner">
        <p className="eyebrow">{heading.eyebrow}</p>
        <h1 className="page-title">{heading.title}</h1>
        <p className="body-copy large">{heading.body}</p>
        <div className="button-row">
          <Link href={`${APP_ROUTES.scores}/new`} className="button button-secondary">
            {copy.chooseAnother}
          </Link>
        </div>
      </div>

      <EntitlementGate allowFreePreview={view === "scan"} copy={entitlementCopy}>
        <ScoreLibraryManager view={view} copy={messages.library} />
      </EntitlementGate>
    </section>
  );
}
