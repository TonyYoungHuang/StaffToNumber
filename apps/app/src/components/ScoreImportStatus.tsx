"use client";

import Link from "next/link";
import { ScoreProcessingPanel, type ScoreProgressJob } from "@score/ui";
import type { SupportedLocale } from "@score/i18n";
import { getScoreImportRecoveryMessages } from "../lib/score-readiness-messages";
import { getScoreRecognitionSupportMessage, getScoreProcessingMessages } from "@score/i18n";
import { useFlowMessages } from "../lib/flow-messages/client";

export function ScoreImportStatus({ title, locale, job, busy, error, onRetry, onRefresh }: {
  title: string;
  locale: SupportedLocale;
  job?: ScoreProgressJob & { progressPercent?: number; errorMessage?: string | null };
  busy: boolean;
  error: string | null;
  onRetry: () => void;
  onRefresh: () => void;
}) {
  const flow = useFlowMessages();
  const copy = flow.scoreReadiness;
  const failed = job?.status === "failed" || job?.status === "cancelled";
  const recovery = getScoreImportRecoveryMessages(locale, job?.errorMessage);
  const pdfFailure = /PDF.*(pixel|safety|raster|budget)|PDF_(PAGE|TOTAL)_PIXEL_LIMIT/iu.test(job?.errorMessage ?? "");
  const finishedWithoutScore = job?.status === "completed";
  const terminal = failed || finishedWithoutScore;
  return <section className="surface-panel stack-lg" data-score-import-status={terminal ? "failed" : "processing"}>
    <h1 className="page-title">{title}</h1>
    <h2 className="card-title" role={terminal ? "alert" : "status"} style={terminal ? { color: "var(--color-error, #b42318)" } : undefined}>{terminal ? copy.failed : copy.processing}</h2>
    <p className="body-copy">{finishedWithoutScore ? copy.newFile : failed ? recovery.recovery : copy.wait}</p>
    {failed && <div role="alert" className="form-status error" style={{ color: "#8f1d14", background: "#fff0ee", border: "2px solid #b42318" }}><strong>{pdfFailure ? getScoreRecognitionSupportMessage(locale, "PDF_PAGE_PIXEL_LIMIT") : recovery.reason}</strong></div>}
    {!terminal && <ScoreProcessingPanel job={job} copy={getScoreProcessingMessages(locale)} locale={locale} connectionError={Boolean(error)} />}
    {failed && job?.errorMessage && <details><summary>{flow.more}</summary><p className="helper-copy">{job.errorMessage}</p></details>}
    {error && <p className="form-status error" role="alert">{error}</p>}
    <div className="button-row">
      {failed && <button type="button" className="button button-primary" disabled={busy} onClick={onRetry}>{flow.retry}</button>}
      <button type="button" className="button button-secondary" disabled={busy} onClick={onRefresh}>{flow.resume}</button>
      {terminal && <Link className="button button-secondary" href="/scores/new">{copy.newFile}</Link>}
      <Link className="button button-secondary" href="/scores">{flow.back}</Link>
    </div>
  </section>;
}
