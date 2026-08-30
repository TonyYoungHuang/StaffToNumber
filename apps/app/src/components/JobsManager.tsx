"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatDateTime, formatMessage, formatNumber } from "@score/i18n";
import type { ConversionDirection } from "@score/shared";
import { APP_ROUTES } from "@score/shared";
import { DotIcon, DownloadIcon, FileStackIcon, SparkIcon, StatusPill } from "@score/ui";
import { API_BASE_URL, apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { useAppLocale } from "./AppLocaleProvider";
import { accountActivationRoute } from "../lib/release";
import type { WorkspaceMessages } from "../lib/workspace-messages/types";

type FileItem = {
  id: string;
  originalName: string;
  createdAt: string;
};

type JobItem = {
  id: string;
  inputFileId: string;
  direction: ConversionDirection;
  status: "queued" | "processing" | "completed" | "failed";
  resultKind: "none" | "final" | "draft";
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  outputFileId: string | null;
  draftBundleFileId: string | null;
  previewText: string | null;
};

type FilesPayload = { files: Array<{ id: string; originalName: string; createdAt: string }> };
type JobsPayload = { jobs: JobItem[] };
type CreateJobPayload = { job: JobItem };

export function JobsManager({ copy }: { copy: WorkspaceMessages["jobs"] }) {
  const router = useRouter();
  const { locale } = useAppLocale();
  const token = useMemo(() => getStoredToken(), []);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);
  const direction: ConversionDirection = "staff_pdf_to_numbered";

  async function loadData() {
    if (!token) {
      setLoading(false);
      setStatus(copy.signInFirst);
      setStatusKind("error");
      return;
    }

    setLoading(true);
    const [filesResult, jobsResult] = await Promise.all([
      apiRequest<FilesPayload>("/api/files", { headers: { Authorization: `Bearer ${token}` } }),
      apiRequest<JobsPayload>("/api/jobs", { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    setLoading(false);

    if (!filesResult.ok) {
      if (filesResult.error === "An active entitlement is required.") {
        router.replace(accountActivationRoute);
        return;
      }
      setStatus(filesResult.error);
      return;
    }

    if (!jobsResult.ok) {
      if (jobsResult.error === "An active entitlement is required.") {
        router.replace(accountActivationRoute);
        return;
      }
      setStatus(jobsResult.error);
      return;
    }

    setFiles(filesResult.data.files);
    setJobs(jobsResult.data.jobs);
    if (!selectedFileId && filesResult.data.files[0]) {
      setSelectedFileId(filesResult.data.files[0].id);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    const interval = window.setInterval(() => {
      void apiRequest<JobsPayload>("/api/jobs", { headers: { Authorization: `Bearer ${token}` } }).then((result) => {
        if (result.ok) {
          setJobs(result.data.jobs);
        }
      });
    }, 3000);

    return () => window.clearInterval(interval);
  }, [token]);

  async function handleCreateJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setStatus(copy.signInFirst);
      setStatusKind("error");
      return;
    }

    if (!selectedFileId) {
      setStatus(copy.uploadFirst);
      setStatusKind("error");
      return;
    }

    setSubmitting(true);
    setStatus(null);
    setStatusKind(null);

    const result = await apiRequest<CreateJobPayload>("/api/jobs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ inputFileId: selectedFileId, direction }),
    });

    setSubmitting(false);

    if (!result.ok) {
      if (result.error === "An active entitlement is required.") {
        router.replace(accountActivationRoute);
        return;
      }
      setStatus(result.error);
      setStatusKind("error");
      return;
    }

    setStatus(formatMessage(copy.createdJob, { id: result.data.job.id }));
    setStatusKind("success");
    await loadData();
  }

  async function handleDownload(fileId: string, fileName: string) {
    if (!token) {
      setStatus(copy.signInFirst);
      setStatusKind("error");
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/files/${fileId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      const nextError = payload?.error ?? copy.downloadFailed;
      if (nextError === "An active entitlement is required.") {
        router.replace(accountActivationRoute);
        return;
      }
      setStatus(nextError);
      setStatusKind("error");
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  const summary = {
    queued: jobs.filter((job) => job.status === "queued").length,
    processing: jobs.filter((job) => job.status === "processing").length,
    completed: jobs.filter((job) => job.status === "completed").length,
  };
  const statusTone = status ? statusKind : null;
  const latestJob = jobs[0] ?? null;
  const selectedFile = files.find((file) => file.id === selectedFileId) ?? null;
  const latestResultTone = latestJob ? mapResultTone(latestJob.resultKind) : "neutral";
  const latestResultClass = latestJob ? latestJob.resultKind : "none";

  return (
    <div className="page-stack">
      <div className="summary-grid">
        <div className="metric-card">
          <p className="metric-label">{copy.summary.queued[0]}</p>
          <p className="metric-value">{formatNumber(summary.queued, locale)}</p>
          <p className="helper-copy">{copy.summary.queued[1]}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">{copy.summary.processing[0]}</p>
          <p className="metric-value">{formatNumber(summary.processing, locale)}</p>
          <p className="helper-copy">{copy.summary.processing[1]}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">{copy.summary.completed[0]}</p>
          <p className="metric-value">{formatNumber(summary.completed, locale)}</p>
          <p className="helper-copy">{copy.summary.completed[1]}</p>
        </div>
      </div>

      <section className="surface-panel studio-split">
        <form onSubmit={handleCreateJob} className="converter-side">
          <div className="stack-sm">
            <p className="eyebrow">{copy.create.eyebrow}</p>
            <h2 className="card-title">{copy.create.title}</h2>
            <p className="body-copy">{copy.create.body}</p>
          </div>

          <label className="field-group">
            <span className="field-label">{copy.create.input}</span>
            <select className="field-select" value={selectedFileId} onChange={(event) => setSelectedFileId(event.target.value)}>
              <option value="">{copy.create.inputPlaceholder}</option>
              {files.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.originalName}
                </option>
              ))}
            </select>
          </label>

          <div className="field-group">
            <span className="field-label">{copy.create.direction}</span>
            <div className="locked-field">{copy.create.lockedDirection}</div>
          </div>

          <div className="editorial-point">
            <span className="info-icon tertiary">
              <SparkIcon width={20} height={20} />
            </span>
            <div>
              <strong>{copy.create.draftTitle}</strong>
              <p className="helper-copy">{copy.create.draftBody}</p>
            </div>
          </div>

          <div className="preview-snapshot">
            <p className="metric-label">{copy.create.source}</p>
            <p className="item-title">{selectedFile ? selectedFile.originalName : copy.create.noSource}</p>
            <p className="helper-copy">
              {selectedFile
                ? formatDateTime(selectedFile.createdAt, locale)
                : copy.create.uploadHint}
            </p>
          </div>

          <div className="button-row">
            <button type="submit" disabled={submitting} className="button button-primary">
              {submitting ? copy.create.creating : copy.create.createButton}
            </button>
            <button type="button" className="button button-secondary" onClick={() => void loadData()}>
              {copy.create.refresh}
            </button>
            <Link href={`${APP_ROUTES.scores}#free-scan`} className="button button-tertiary">
              {copy.create.uploads}
            </Link>
          </div>

          {status && statusTone ? <p className={`form-status ${statusTone}`} role={statusKind === "error" ? "alert" : "status"}>{status}</p> : null}

          <div className="stack-sm">
            <p className="metric-label">{copy.create.recentSources}</p>
            {files.length === 0 ? (
              <div className="empty-state">{copy.create.emptySources}</div>
            ) : (
              <div className="file-library-list">
                {files.slice(0, 3).map((file) => (
                  <div key={file.id} className="file-library-item">
                    <div>
                      <strong>{file.originalName}</strong>
                      <span>{formatDateTime(file.createdAt, locale)}</span>
                    </div>
                    <button type="button" className="button button-secondary button-ghost" onClick={() => setSelectedFileId(file.id)}>
                      {copy.create.useThis}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        <div className="preview-side" aria-label={copy.monitor.liveAria}>
          <div className="queue-toolbar">
            <div className="stack-xs">
              <p className="metric-label">{copy.monitor.eyebrow}</p>
              <p className="item-title">{copy.monitor.title}</p>
            </div>
            <div className="live-indicator">
              <span className="live-dot" />
              {copy.monitor.auto}
            </div>
          </div>

          <div className="queue-summary-grid">
            <div className="queue-summary-chip">
              <span>{copy.summary.queued[0]}</span>
              <strong>{formatNumber(summary.queued, locale)}</strong>
            </div>
            <div className="queue-summary-chip">
              <span>{copy.summary.processing[0]}</span>
              <strong>{formatNumber(summary.processing, locale)}</strong>
            </div>
            <div className="queue-summary-chip">
              <span>{copy.summary.completed[0]}</span>
              <strong>{formatNumber(summary.completed, locale)}</strong>
            </div>
          </div>

          {loading ? <div className="empty-state">{copy.monitor.loading}</div> : null}
          {!loading && !latestJob ? <div className="empty-state">{copy.monitor.empty}</div> : null}

          {latestJob ? (
            <div className="queue-latest-card">
              <div className={`result-spotlight ${latestResultClass}`}>
                <div className="inline-meta">
                  <span className="info-icon">
                    <FileStackIcon width={20} height={20} />
                  </span>
                  <div className="stack-xs">
                    <p className="item-title">{copy.monitor.latest}: {(files.find((item) => item.id === latestJob.inputFileId)?.originalName ?? latestJob.inputFileId)}</p>
                    <p className="item-meta">{copy.monitor.created} {formatDateTime(latestJob.createdAt, locale)}</p>
                  </div>
                </div>
                <div className="inline-meta">
                  <StatusPill tone={mapJobTone(latestJob.status)} icon={<DotIcon width={10} height={10} />}>
                    {copy.statuses[latestJob.status]}
                  </StatusPill>
                  <StatusPill tone={latestResultTone}>{copy.resultKinds[latestJob.resultKind]}</StatusPill>
                </div>
                <div className="stack-xs">
                  <p className="metric-label">{copy.monitor.resultCenter}</p>
                  <p className="item-title">
                    {latestJob.resultKind === "final"
                      ? copy.monitor.final
                      : latestJob.resultKind === "draft"
                        ? copy.monitor.draft
                        : copy.monitor.none}
                  </p>
                </div>
                {latestJob.previewText ? <pre className="preview-block">{latestJob.previewText}</pre> : <p className="helper-copy">{copy.monitor.previewWaiting}</p>}
                {latestJob.errorMessage ? <p className="form-status error">{latestJob.errorMessage}</p> : null}
              </div>

              <div className="signal-grid">
                <div className={`result-outcome-card ${latestJob.outputFileId ? "final" : "none"}`}>
                  <p className="metric-label">{copy.monitor.primary}</p>
                  <p className="item-title">{copy.monitor.primaryTitle}</p>
                  <p className="helper-copy">{copy.monitor.primaryBody}</p>
                  {latestJob.outputFileId ? (
                    <button
                      type="button"
                      className="button button-secondary button-ghost"
                      onClick={() => void handleDownload(latestJob.outputFileId!, `${latestJob.id}-${latestJob.resultKind}.pdf`)}
                    >
                      <DownloadIcon width={16} height={16} />
                      {copy.monitor.downloadPdf}
                    </button>
                  ) : (
                    <span className="status-chip tone-neutral">{copy.monitor.notReady}</span>
                  )}
                </div>
                <div className={`result-outcome-card ${latestJob.draftBundleFileId ? "draft" : "none"}`}>
                  <p className="metric-label">{copy.monitor.fallback}</p>
                  <p className="item-title">{copy.monitor.fallbackTitle}</p>
                  <p className="helper-copy">{copy.monitor.fallbackBody}</p>
                  {latestJob.draftBundleFileId ? (
                    <button
                      type="button"
                      className="button button-tertiary button-ghost"
                      onClick={() => void handleDownload(latestJob.draftBundleFileId!, `${latestJob.id}-draft-bundle.zip`)}
                    >
                      <DownloadIcon width={16} height={16} />
                      {copy.monitor.downloadDraft}
                    </button>
                  ) : (
                    <span className="status-chip tone-neutral">{copy.monitor.notReady}</span>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">{copy.archive.eyebrow}</p>
          <h2 className="card-title">{copy.archive.title}</h2>
          <p className="body-copy">{copy.archive.body}</p>
        </div>

        {!loading && jobs.length > 0 ? (
          <div className="list-grid">
            {jobs.map((job) => {
              const file = files.find((item) => item.id === job.inputFileId);
              const resultTone = mapResultTone(job.resultKind);
              const archiveClass = job.resultKind === "final" ? "final" : job.resultKind === "draft" ? "draft" : "none";
              return (
                <div key={job.id} className={`job-card result-outcome-card ${archiveClass}`}>
                  <div className="job-card-content">
                    <div className="inline-meta">
                      <span className="info-icon">
                        <FileStackIcon width={20} height={20} />
                      </span>
                      <div className="stack-xs">
                        <p className="item-title">{file?.originalName ?? job.inputFileId}</p>
                        <p className="item-meta">{formatDirection(job.direction, copy.directions)} | {copy.monitor.created} {formatDateTime(job.createdAt, locale)}</p>
                      </div>
                    </div>

                    <div className="inline-meta">
                      <StatusPill tone={mapJobTone(job.status)} icon={<DotIcon width={10} height={10} />}>
                        {copy.statuses[job.status]}
                      </StatusPill>
                      <StatusPill tone={resultTone}>{copy.resultKinds[job.resultKind]}</StatusPill>
                    </div>

                    {job.previewText ? <pre className="preview-block">{job.previewText}</pre> : null}
                    {job.errorMessage ? <p className="form-status error">{job.errorMessage}</p> : null}

                    <div className="button-row">
                      {job.outputFileId ? (
                        <button
                          type="button"
                          className="button button-secondary button-ghost"
                          onClick={() => void handleDownload(job.outputFileId!, `${job.id}-${job.resultKind}.pdf`)}
                        >
                          <DownloadIcon width={16} height={16} />
                          {copy.monitor.downloadPdf}
                        </button>
                      ) : null}
                      {job.draftBundleFileId ? (
                        <button
                          type="button"
                          className="button button-tertiary button-ghost"
                          onClick={() => void handleDownload(job.draftBundleFileId!, `${job.id}-draft-bundle.zip`)}
                        >
                          <DownloadIcon width={16} height={16} />
                          {copy.monitor.downloadDraft}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="stack-sm">
                    <span className="status-chip tone-neutral">{job.id.slice(0, 8)}</span>
                    <span className="status-chip tone-primary">{formatJobPhase(job, copy.phases)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function formatDirection(direction: ConversionDirection, copy: WorkspaceMessages["jobs"]["directions"]) {
  return direction === "staff_pdf_to_numbered" ? copy.staff_pdf_to_numbered : direction;
}

function formatJobPhase(job: JobItem, copy: WorkspaceMessages["jobs"]["phases"]) {
  return job.completedAt ? copy.completed : job.startedAt ? copy.running : copy.waiting;
}

function mapJobTone(status: JobItem["status"]) {
  switch (status) {
    case "queued":
      return "neutral";
    case "processing":
      return "amber";
    case "completed":
      return "green";
    case "failed":
      return "red";
    default:
      return "neutral";
  }
}

function mapResultTone(resultKind: JobItem["resultKind"]) {
  switch (resultKind) {
    case "final":
      return "green";
    case "draft":
      return "amber";
    default:
      return "neutral";
  }
}
