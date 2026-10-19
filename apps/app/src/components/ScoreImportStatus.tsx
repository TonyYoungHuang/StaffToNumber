"use client";

import { useState } from "react";
import { WorkbenchModal, workbenchCopy } from "@score/ui";
import Link from "next/link";
import { ScoreProcessingPanel, type ScoreProgressJob } from "@score/ui";
import type { SupportedLocale } from "@score/i18n";
import { selectImportRecovery } from "../lib/score-readiness-messages/client";
import { getScoreRecognitionSupportMessage, resolveRecognitionFailure, recognitionUsedPaidCredits } from "@score/i18n";
import { useFlowMessages } from "../lib/flow-messages/client";

export function ScoreImportStatus({ title, locale, job, busy, error, onRetry, onRefresh, onChangeFile, embedded = false }: {
  embedded?: boolean;
  onChangeFile?: () => void;
  title: string;
  locale: SupportedLocale;
  job?: ScoreProgressJob & { progressPercent?: number | null; errorMessage?: string | null; params?: Record<string, unknown> | null };
  busy: boolean;
  error: string | null;
  onRetry: () => void;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(true);
  const wb = workbenchCopy[locale];
  const flow = useFlowMessages();
  const experience = flow.recognitionExperience;
  const copy = flow.scoreReadiness;
  const failed = job?.status === "failed" || job?.status === "cancelled";
  const recovery = selectImportRecovery(flow.importRecovery, job?.errorMessage);
  const pdfFailure = /PDF.*(pixel|safety|raster|budget)|PDF_(PAGE|TOTAL)_PIXEL_LIMIT/iu.test(job?.errorMessage ?? "");
  const finishedWithoutScore = job?.status === "completed";
  const terminal = failed || finishedWithoutScore;
  const content = <section className={embedded ? "stack-lg" : "surface-panel stack-lg"} data-score-import-status={terminal ? "failed" : "processing"}>
    {embedded ? <p className="helper-copy">{title}</p> : <h1 className="page-title">{title}</h1>}
    {!embedded ? <h2 className="card-title" role={terminal ? "alert" : "status"} style={terminal ? { color: "var(--color-error, #b42318)" } : undefined}>{terminal ? copy.failed : copy.processing}</h2> : null}
    <p className="body-copy">{finishedWithoutScore ? copy.newFile : failed ? resolveRecognitionFailure(experience, job?.errorMessage) : copy.wait}</p>
    {failed && recognitionUsedPaidCredits(job?.params) ? <p>{experience.creditsOnly}</p> : null}
    {failed && <div role="alert" className="form-status error" style={{ color: "#8f1d14", background: "#fff0ee", border: "2px solid #b42318" }}><strong>{pdfFailure ? getScoreRecognitionSupportMessage(locale, "PDF_PAGE_PIXEL_LIMIT") : recovery.reason}</strong></div>}
    {!terminal && <ScoreProcessingPanel job={job} copy={flow.processing} locale={locale} connectionError={Boolean(error)} />}
    {failed && job?.errorMessage && <details><summary>{flow.more}</summary><p className="helper-copy">{job.errorMessage}</p></details>}
    {error && <p className="form-status error" role="alert">{error}</p>}
    <p>{failed ? wb.retryBody : wb.background}</p>
    <div className="button-row">
      {failed && <button type="button" className="button button-primary" disabled={busy} onClick={onRetry}>{wb.retry}</button>}
      <button type="button" className="button button-secondary" disabled={busy} onClick={onRefresh}>{wb.refresh}</button>
      {terminal && (onChangeFile ? <button type="button" className="button button-secondary" onClick={onChangeFile}>{wb.change}</button> : <Link className="button button-secondary" href="/scores/new">{copy.newFile}</Link>)}
      <Link className="button button-secondary" href="/scores">{flow.back}</Link>
    </div>
  </section>;
  if (embedded) return content;
  return <><button type="button" className="button button-secondary" onClick={() => setOpen(true)}>{wb.refresh}</button>{open ? <WorkbenchModal title={terminal ? copy.failed : copy.processing} closeLabel={wb.close} onClose={() => setOpen(false)}>{content}</WorkbenchModal> : null}</>;
}
