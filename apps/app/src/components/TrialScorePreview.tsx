"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatNumber, type SupportedLocale } from "@score/i18n";
import { APP_ROUTES, type ScoreJson } from "@score/shared";
import { apiRequest } from "../lib/api";
import { trackFunnelEvent, trackFunnelEventOnce } from "../lib/analytics";
import { getStoredToken } from "../lib/auth-storage";
import { buildSupportTemplates } from "../lib/support";
import { accountActivationRoute } from "../lib/release";
import {
  ScoreReviewMessagesProvider,
  type ScoreReviewMessages,
} from "../lib/score-entry-messages/client";
import type { ScoreEntryMessages } from "../lib/score-entry-messages/types";
import { ScoreEditorMessagesProvider } from "../lib/score-editor-messages/client";
import type { ScoreEditorMessages } from "../lib/score-editor-messages/types";
import { useAppLocale } from "./AppLocaleProvider";
import { ScoreMusicXmlPreview } from "./ScoreMusicXmlPreview";
import { ScoreCandidateReviewWorkspace } from "./ScoreCandidateReviewWorkspace";

type TrialRevision = {
  id: string;
  revisionNumber: number;
  musicxmlFileId: string | null;
  createdFrom: string;
  createdAt: string;
  scoreJson: ScoreJson;
};

type TrialScore = {
  id: string;
  title: string;
  status: string;
  currentRevisionId: string | null;
  pendingRevisionId?: string | null;
  currentRevision: TrialRevision | null;
  pendingRevision?: TrialRevision | null;
};

type ScorePayload = { score: TrialScore };
type JobsPayload = {
  jobs: Array<{
    id: string;
    status: "queued" | "processing" | "completed" | "failed" | "cancelled";
    progressPercent: number;
    errorMessage: string | null;
  }>;
  omrDiagnostics: Array<{
    id: string;
    diagnostics: Record<string, unknown>;
    confidence: number | null;
    sourcePageCount: number | null;
    createdAt: string;
  }>;
};
type AssetsPayload = {
  assets: Array<{
    assetKind: string;
    file: { id: string; originalName: string; mimeType: string };
  }>;
};

export function TrialScorePreview({
  copy,
  reviewMessages,
  editorMessages,
}: {
  copy: ScoreEntryMessages["trial"];
  reviewMessages: ScoreReviewMessages;
  editorMessages: ScoreEditorMessages;
}) {
  const { locale } = useAppLocale();
  const params = useParams<{ id: string }>();
  const scoreId = params?.id;
  const token = useMemo(() => getStoredToken(), []);
  const [score, setScore] = useState<TrialScore | null>(null);
  const [job, setJob] = useState<JobsPayload["jobs"][number] | null>(null);
  const [diagnostics, setDiagnostics] = useState<JobsPayload["omrDiagnostics"]>([]);
  const [musicXml, setMusicXml] = useState<string | null>(null);
  const [assets, setAssets] = useState<AssetsPayload["assets"]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!scoreId) return;
    const authOptions = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    const [scoreResult, jobsResult, assetsResult] = await Promise.all([
      apiRequest<ScorePayload>(`/api/scores/${scoreId}`, authOptions),
      apiRequest<JobsPayload>(`/api/scores/${scoreId}/jobs`, authOptions),
      apiRequest<AssetsPayload>(`/api/scores/${scoreId}/assets`, authOptions),
    ]);
    if (!scoreResult.ok) {
      setError(scoreResult.error);
      return;
    }
    setError(null);
    setScore(scoreResult.data.score);
    const latestJob = jobsResult.ok ? jobsResult.data.jobs[0] ?? null : null;
    setJob(latestJob);
    setDiagnostics(jobsResult.ok ? jobsResult.data.omrDiagnostics : []);
    setAssets(assetsResult.ok ? assetsResult.data.assets : []);

    const hasCandidate = Boolean(scoreResult.data.score.pendingRevisionId || scoreResult.data.score.pendingRevision);
    const hasCurrent = Boolean(scoreResult.data.score.currentRevisionId || scoreResult.data.score.currentRevision);
    if (!hasCandidate && !hasCurrent) {
      setMusicXml(null);
      return;
    }
    const previewPath = hasCandidate
      ? `/api/scores/${scoreId}/candidate/musicxml-preview`
      : `/api/scores/${scoreId}/musicxml-preview`;
    const preview = await apiRequest<{ musicXml: string }>(previewPath, authOptions);
    setMusicXml(preview.ok ? preview.data.musicXml : null);
  }, [scoreId, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!job || !["queued", "processing"].includes(job.status)) return;
    const timer = window.setInterval(() => void refresh(), 4_000);
    return () => window.clearInterval(timer);
  }, [job, refresh]);

  const scoreJson = score?.pendingRevision?.scoreJson ?? score?.currentRevision?.scoreJson ?? null;
  const latestDiagnostic = diagnostics[0] ?? null;
  const diagnosticSummary = latestDiagnostic ? summarizeTrialDiagnostic(latestDiagnostic, locale, copy) : null;
  const supportHref = useMemo(
    () => buildSupportTemplates(locale).find((item) => item.key === "job")?.href,
    [locale],
  );
  const jobLabel = job
    ? `${copy.statuses[job.status]}${job.status === "processing" ? ` · ${formatNumber(job.progressPercent / 100, locale, { style: "percent", maximumFractionDigits: 0 })}` : ""}`
    : copy.loadingJob;

  useEffect(() => {
    if (job?.status !== "completed" || !scoreJson) return;
    trackFunnelEventOnce(`free-omr-preview-${scoreId}`, "free_omr_preview_viewed", {
      preview_type: "staff_candidate",
    });
  }, [job?.status, scoreId, scoreJson]);

  const sourcePreviewAsset = assets.find((asset) => asset.assetKind === "source_pdf" || asset.assetKind === "source_image") ?? null;
  const omrPageFiles = assets.filter((asset) => asset.assetKind === "omr_page_image").map((asset) => asset.file);

  if (score?.pendingRevision?.scoreJson) {
    return (
      <ScoreReviewMessagesProvider messages={reviewMessages}>
        <ScoreEditorMessagesProvider locale={locale} messages={editorMessages}>
          <ScoreCandidateReviewWorkspace
            title={score.title}
            scoreId={score.id}
            revision={score.pendingRevision}
            sourceFile={sourcePreviewAsset?.file ?? null}
            pageFiles={omrPageFiles}
            token={token}
            locale={locale}
            generatedMusicXml={musicXml}
            selectedEventId={selectedEventId}
            onEventSelect={setSelectedEventId}
            onAccept={() => undefined}
            onReject={() => undefined}
            submittingAction={null}
            actionError={error}
            onCandidateUpdated={refresh}
            onUndo={() => undefined}
            onRedo={() => undefined}
            canUndo={false}
            canRedo={false}
            restoring={false}
            revisionStatus={null}
            revisionStatusKind={null}
            freeEditing
          />
        </ScoreEditorMessagesProvider>
      </ScoreReviewMessagesProvider>
    );
  }

  return (
    <div className="page-stack">
      <section className="page-banner split">
        <div className="stack-sm">
          <p className="eyebrow">{copy.preparing}</p>
          <h1 className="page-title">{score?.title ?? copy.loadingScore}</h1>
          <p className="body-copy large">{copy.intro}</p>
        </div>
        <div className="stack-sm">
          <span className={`status-chip ${job?.status === "failed" ? "tone-red" : job?.status === "completed" ? "tone-green" : "tone-amber"}`}>
            {jobLabel}
          </span>
          <div className="button-row">
            <Link
              href={accountActivationRoute}
              className="button button-primary"
              onClick={() => trackFunnelEvent("upgrade_click", { source: "trial_score_preview" })}
            >
              {copy.unlock}
            </Link>
            <Link href={`${APP_ROUTES.scores}#free-scan`} className="button button-secondary">
              {copy.back}
            </Link>
          </div>
        </div>
      </section>

      {error ? <p className="form-status error" role="alert">{error}</p> : null}
      {job?.status === "failed" ? (
        <section className="surface-panel stack-sm">
          <p className="form-status error" role="alert">{copy.failedTitle}</p>
          <p className="body-copy">{copy.failedBody}</p>
          {job.errorMessage ? <details className="technical-details"><summary>{copy.technicalDetails}</summary><p className="micro-copy">{job.errorMessage}</p></details> : null}
          {supportHref ? <a href={supportHref} className="button button-secondary">{copy.reportIssue}</a> : null}
        </section>
      ) : null}

      {diagnosticSummary ? (
        <section className="surface-panel stack-md">
          <div className="stack-sm">
            <p className="eyebrow">{copy.diagnosticsEyebrow}</p>
            <h2 className="card-title">{copy.diagnosticsTitle}</h2>
            {diagnosticSummary.message ? <p className="body-copy">{diagnosticSummary.message}</p> : null}
            {diagnosticSummary.technicalMessage ? (
              <details className="technical-details">
                <summary>{copy.technicalDetails}</summary>
                <p className="micro-copy">{diagnosticSummary.technicalMessage}</p>
              </details>
            ) : null}
          </div>
          <div className="metric-grid">
            <div className="metric-card">
              <p className="metric-label">{copy.confidenceLabel}</p>
              <p className="metric-value">{diagnosticSummary.confidence}</p>
              <p className="helper-copy">{copy.confidenceHelp}</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">{copy.pagesLabel}</p>
              <p className="metric-value">{diagnosticSummary.pages}</p>
              <p className="helper-copy">{copy.pagesHelp}</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">{copy.warningsLabel}</p>
              <p className="metric-value">{diagnosticSummary.warnings}</p>
              <p className="helper-copy">{diagnosticSummary.engine || copy.engineFallback}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="surface-panel stack-md">
        <div className="stack-sm">
          <p className="eyebrow">{copy.previewEyebrow}</p>
          <h2 className="card-title">{copy.previewTitle}</h2>
        </div>
        <ScoreMusicXmlPreview
          fileId={null}
          token={token}
          musicXml={musicXml}
          scoreJson={scoreJson}
          emptyLabel={copy.previewEmpty}
          loadingLabel={copy.previewLoading}
          errorLabel={copy.previewError}
          retryLabel={copy.previewRetry}
          technicalDetailsLabel={copy.technicalDetails}
          deferredLabel={copy.previewDeferred}
          renderLabel={copy.previewRender}
          eventLabelTemplate={copy.previewEventLabel}
          noteLabel={copy.previewNote}
          restLabel={copy.previewRest}
        />
      </section>
    </div>
  );
}

function summarizeTrialDiagnostic(
  input: JobsPayload["omrDiagnostics"][number],
  locale: SupportedLocale,
  copy: ScoreEntryMessages["trial"],
) {
  const details = input.diagnostics;
  const warnings = Array.isArray(details.warnings) ? details.warnings.length : 0;
  const engine = typeof details.engine === "string" && details.engine.trim() ? details.engine : copy.engineFallback;
  const technicalMessage = typeof details.message === "string" && details.message.trim() ? details.message : null;
  const message = technicalMessage ? copy.diagnosticsWarning : null;
  return {
    confidence: input.confidence === null ? "—" : formatNumber(input.confidence, locale, { style: "percent", maximumFractionDigits: 0 }),
    pages: formatNumber(input.sourcePageCount ?? 1, locale),
    warnings: formatNumber(warnings, locale),
    engine,
    message,
    technicalMessage,
  };
}
