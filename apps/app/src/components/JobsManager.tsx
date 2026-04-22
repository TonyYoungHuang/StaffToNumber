"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ConversionDirection } from "@score/shared";
import { APP_ROUTES } from "@score/shared";
import { DotIcon, DownloadIcon, FileStackIcon, SparkIcon, StatusPill } from "@score/ui";
import { API_BASE_URL, apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";

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

export function JobsManager() {
  const token = useMemo(() => getStoredToken(), []);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const direction: ConversionDirection = "staff_pdf_to_numbered";

  async function loadData() {
    if (!token) {
      setLoading(false);
      setStatus("Please sign in first.");
      return;
    }

    setLoading(true);
    const [filesResult, jobsResult] = await Promise.all([
      apiRequest<FilesPayload>("/api/files", { headers: { Authorization: `Bearer ${token}` } }),
      apiRequest<JobsPayload>("/api/jobs", { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    setLoading(false);

    if (!filesResult.ok) {
      setStatus(filesResult.error);
      return;
    }

    if (!jobsResult.ok) {
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
      setStatus("Please sign in first.");
      return;
    }

    if (!selectedFileId) {
      setStatus("Please upload a PDF first.");
      return;
    }

    setSubmitting(true);
    setStatus(null);

    const result = await apiRequest<CreateJobPayload>("/api/jobs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ inputFileId: selectedFileId, direction }),
    });

    setSubmitting(false);

    if (!result.ok) {
      setStatus(result.error);
      return;
    }

    setStatus(`Created job ${result.data.job.id}.`);
    await loadData();
  }

  async function handleDownload(fileId: string, fileName: string) {
    if (!token) {
      setStatus("Please sign in first.");
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/files/${fileId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setStatus(payload?.error ?? "Download failed.");
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
  const statusTone = status ? (status.toLowerCase().includes("created job") ? "success" : "error") : null;
  const latestJob = jobs[0] ?? null;
  const selectedFile = files.find((file) => file.id === selectedFileId) ?? null;
  const latestResultTone = latestJob ? mapResultTone(latestJob.resultKind) : "neutral";
  const latestResultClass = latestJob ? latestJob.resultKind : "none";

  return (
    <div className="page-stack">
      <div className="summary-grid">
        <div className="metric-card">
          <p className="metric-label">Queued</p>
          <p className="metric-value">{summary.queued}</p>
          <p className="helper-copy">Waiting for worker pickup.</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Processing</p>
          <p className="metric-value">{summary.processing}</p>
          <p className="helper-copy">Actively generating preview and output package.</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Completed</p>
          <p className="metric-value">{summary.completed}</p>
          <p className="helper-copy">Ready for final PDF or draft bundle download.</p>
        </div>
      </div>

      <section className="surface-panel studio-split">
        <form onSubmit={handleCreateJob} className="converter-side">
          <div className="stack-sm">
            <p className="eyebrow">Create conversion job</p>
            <h2 className="card-title">Queue a staff-to-numbered run</h2>
            <p className="body-copy">
              This panel now follows the Stitch converter rhythm: choose an uploaded source, keep the direction locked, and hand the PDF into the queue.
            </p>
          </div>

          <label className="field-group">
            <span className="field-label">Input file</span>
            <select className="field-select" value={selectedFileId} onChange={(event) => setSelectedFileId(event.target.value)}>
              <option value="">Select an uploaded PDF</option>
              {files.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.originalName}
                </option>
              ))}
            </select>
          </label>

          <div className="field-group">
            <span className="field-label">Direction</span>
            <div className="locked-field">Staff PDF to numbered notation</div>
          </div>

          <div className="editorial-point">
            <span className="info-icon tertiary">
              <SparkIcon width={20} height={20} />
            </span>
            <div>
              <strong>Draft-aware pipeline</strong>
              <p className="helper-copy">Lower-confidence pages can remain draft output instead of being upgraded too early.</p>
            </div>
          </div>

          <div className="preview-snapshot">
            <p className="metric-label">Selected source</p>
            <p className="item-title">{selectedFile ? selectedFile.originalName : "No source selected"}</p>
            <p className="helper-copy">
              {selectedFile
                ? `Uploaded ${new Date(selectedFile.createdAt).toLocaleString()}. This file will be sent into the Staff PDF -> Jianpu queue.`
                : "Upload a source PDF first if the selector is empty."}
            </p>
          </div>

          <div className="button-row">
            <button type="submit" disabled={submitting} className="button button-primary">
              {submitting ? "Creating..." : "Create job"}
            </button>
            <button type="button" className="button button-secondary" onClick={() => void loadData()}>
              Refresh queue
            </button>
            <Link href={APP_ROUTES.upload} className="button button-tertiary">
              Open uploads
            </Link>
          </div>

          {status && statusTone ? <p className={`form-status ${statusTone}`}>{status}</p> : null}

          <div className="stack-sm">
            <p className="metric-label">Recent source library</p>
            {files.length === 0 ? (
              <div className="empty-state">No uploaded PDFs yet. Use the upload page first, then return here to queue the conversion.</div>
            ) : (
              <div className="file-library-list">
                {files.slice(0, 3).map((file) => (
                  <div key={file.id} className="file-library-item">
                    <div>
                      <strong>{file.originalName}</strong>
                      <span>{new Date(file.createdAt).toLocaleString()}</span>
                    </div>
                    <button type="button" className="button button-secondary button-ghost" onClick={() => setSelectedFileId(file.id)}>
                      Use this
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        <div className="preview-side">
          <div className="queue-toolbar">
            <div className="stack-xs">
              <p className="metric-label">Queue monitor</p>
              <p className="item-title">Live conversion surface</p>
            </div>
            <div className="live-indicator">
              <span className="live-dot" />
              Auto-refreshing
            </div>
          </div>

          <div className="queue-summary-grid">
            <div className="queue-summary-chip">
              <span>Queued</span>
              <strong>{summary.queued}</strong>
            </div>
            <div className="queue-summary-chip">
              <span>Processing</span>
              <strong>{summary.processing}</strong>
            </div>
            <div className="queue-summary-chip">
              <span>Completed</span>
              <strong>{summary.completed}</strong>
            </div>
          </div>

          {loading ? <div className="empty-state">Loading jobs...</div> : null}
          {!loading && !latestJob ? <div className="empty-state">No jobs created yet. Pick an uploaded PDF on the left and create the first run.</div> : null}

          {latestJob ? (
            <div className="queue-latest-card">
              <div className={`result-spotlight ${latestResultClass}`}>
                <div className="inline-meta">
                  <span className="info-icon">
                    <FileStackIcon width={20} height={20} />
                  </span>
                  <div className="stack-xs">
                    <p className="item-title">Latest job: {(files.find((item) => item.id === latestJob.inputFileId)?.originalName ?? latestJob.inputFileId)}</p>
                    <p className="item-meta">Created {new Date(latestJob.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="inline-meta">
                  <StatusPill tone={mapJobTone(latestJob.status)} icon={<DotIcon width={10} height={10} />}>
                    {latestJob.status}
                  </StatusPill>
                  <StatusPill tone={latestResultTone}>{latestJob.resultKind}</StatusPill>
                </div>
                <div className="stack-xs">
                  <p className="metric-label">Result center</p>
                  <p className="item-title">
                    {latestJob.resultKind === "final"
                      ? "This run is currently classified as final."
                      : latestJob.resultKind === "draft"
                        ? "This run is currently classified as draft."
                        : "This run has not produced a downloadable outcome yet."}
                  </p>
                </div>
                {latestJob.previewText ? <pre className="preview-block">{latestJob.previewText}</pre> : <p className="helper-copy">Preview text will appear here after the worker emits it.</p>}
                {latestJob.errorMessage ? <p className="form-status error">{latestJob.errorMessage}</p> : null}
              </div>

              <div className="signal-grid">
                <div className={`result-outcome-card ${latestJob.outputFileId ? "final" : "none"}`}>
                  <p className="metric-label">Primary output</p>
                  <p className="item-title">Final PDF</p>
                  <p className="helper-copy">Available when the run upgrades cleanly to final.</p>
                  {latestJob.outputFileId ? (
                    <button
                      type="button"
                      className="button button-secondary button-ghost"
                      onClick={() => void handleDownload(latestJob.outputFileId!, `${latestJob.id}-${latestJob.resultKind}.pdf`)}
                    >
                      <DownloadIcon width={16} height={16} />
                      Download result PDF
                    </button>
                  ) : (
                    <span className="status-chip tone-neutral">Not ready</span>
                  )}
                </div>
                <div className={`result-outcome-card ${latestJob.draftBundleFileId ? "draft" : "none"}`}>
                  <p className="metric-label">Fallback output</p>
                  <p className="item-title">Draft bundle</p>
                  <p className="helper-copy">Available when review artifacts need manual correction outside the browser.</p>
                  {latestJob.draftBundleFileId ? (
                    <button
                      type="button"
                      className="button button-tertiary button-ghost"
                      onClick={() => void handleDownload(latestJob.draftBundleFileId!, `${latestJob.id}-draft-bundle.zip`)}
                    >
                      <DownloadIcon width={16} height={16} />
                      Download draft bundle
                    </button>
                  ) : (
                    <span className="status-chip tone-neutral">Not ready</span>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">Recent jobs</p>
          <h2 className="card-title">Queue archive</h2>
          <p className="body-copy">Preview text, result type, and downloads stay visible here so you can review older runs after the top panel moves on to newer jobs.</p>
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
                        <p className="item-meta">{job.direction} | created {new Date(job.createdAt).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="inline-meta">
                      <StatusPill tone={mapJobTone(job.status)} icon={<DotIcon width={10} height={10} />}>
                        {job.status}
                      </StatusPill>
                      <StatusPill tone={resultTone}>{job.resultKind}</StatusPill>
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
                          Download result PDF
                        </button>
                      ) : null}
                      {job.draftBundleFileId ? (
                        <button
                          type="button"
                          className="button button-tertiary button-ghost"
                          onClick={() => void handleDownload(job.draftBundleFileId!, `${job.id}-draft-bundle.zip`)}
                        >
                          <DownloadIcon width={16} height={16} />
                          Download draft bundle
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="stack-sm">
                    <span className="status-chip tone-neutral">{job.id.slice(0, 8)}</span>
                    <span className="status-chip tone-primary">{job.completedAt ? "Completed" : job.startedAt ? "Running" : "Waiting"}</span>
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
