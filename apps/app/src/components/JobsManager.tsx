"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ConversionDirection } from "@score/shared";
import { APP_ROUTES } from "@score/shared";
import { DotIcon, DownloadIcon, FileStackIcon, SparkIcon, StatusPill } from "@score/ui";
import { API_BASE_URL, apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { useAppLocale } from "./AppLocaleProvider";

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
  const copy =
    locale === "zh-CN"
      ? {
          signInFirst: "请先登录。",
          uploadFirst: "请先上传 PDF。",
          downloadFailed: "下载失败。",
          createdJob: (id: string) => `任务 ${id} 已创建。`,
          summary: {
            queued: ["排队中", "等待 worker 处理。"],
            processing: ["处理中", "正在生成预览和输出包。"],
            completed: ["已完成", "可下载正式 PDF 或草稿包。"],
          },
          create: {
            eyebrow: "创建转换任务",
            title: "发起五线谱转简谱任务",
            body: "选择已上传的源文件，保持转换方向锁定，然后将 PDF 送入任务队列。",
            input: "输入文件",
            inputPlaceholder: "请选择已上传的 PDF",
            direction: "转换方向",
            lockedDirection: "五线谱 PDF 转简谱",
            draftTitle: "草稿优先机制",
            draftBody: "低置信度页面会保留为草稿结果，而不是过早升级为最终版。",
            source: "当前选中的源文件",
            noSource: "尚未选择源文件",
            uploadHint: "如果下拉为空，请先去上传页添加 PDF。",
            createButton: "创建任务",
            creating: "创建中...",
            refresh: "刷新队列",
            uploads: "打开上传页",
            recentSources: "最近源文件库",
            emptySources: "还没有上传 PDF。请先去上传页，再回来创建转换任务。",
            useThis: "使用此文件",
          },
          monitor: {
            eyebrow: "队列监控",
            title: "实时转换面板",
            auto: "自动刷新中",
            loading: "正在加载任务...",
            empty: "还没有任务。先在左侧选择 PDF 并创建第一条任务。",
            latest: "最新任务",
            created: "创建于",
            resultCenter: "结果中心",
            final: "该任务当前已被判定为最终结果。",
            draft: "该任务当前被保留为草稿结果。",
            none: "该任务暂未产出可下载结果。",
            previewWaiting: "worker 输出预览文本后会显示在这里。",
            primary: "主输出",
            primaryTitle: "最终 PDF",
            primaryBody: "当任务顺利提升为 final 时可下载。",
            fallback: "兜底输出",
            fallbackTitle: "草稿包",
            fallbackBody: "当结果仍需人工校对时可下载。",
            downloadPdf: "下载结果 PDF",
            downloadDraft: "下载草稿包",
            notReady: "未就绪",
          },
          archive: {
            eyebrow: "最近任务",
            title: "任务归档",
            body: "预览文本、结果类型和下载入口都会保留，方便回看旧任务。",
          },
        }
      : {
          signInFirst: "Please sign in first.",
          uploadFirst: "Please upload a PDF first.",
          downloadFailed: "Download failed.",
          createdJob: (id: string) => `Created job ${id}.`,
          summary: {
            queued: ["Queued", "Waiting for worker pickup."],
            processing: ["Processing", "Actively generating preview and output package."],
            completed: ["Completed", "Ready for final PDF or draft bundle download."],
          },
          create: {
            eyebrow: "Create conversion job",
            title: "Queue a staff-to-numbered run",
            body: "This panel now follows the Stitch converter rhythm: choose an uploaded source, keep the direction locked, and hand the PDF into the queue.",
            input: "Input file",
            inputPlaceholder: "Select an uploaded PDF",
            direction: "Direction",
            lockedDirection: "Staff PDF to numbered notation",
            draftTitle: "Draft-aware pipeline",
            draftBody: "Lower-confidence pages can remain draft output instead of being upgraded too early.",
            source: "Selected source",
            noSource: "No source selected",
            uploadHint: "Upload a source PDF first if the selector is empty.",
            createButton: "Create job",
            creating: "Creating...",
            refresh: "Refresh queue",
            uploads: "Open uploads",
            recentSources: "Recent source library",
            emptySources: "No uploaded PDFs yet. Use the upload page first, then return here to queue the conversion.",
            useThis: "Use this",
          },
          monitor: {
            eyebrow: "Queue monitor",
            title: "Live conversion surface",
            auto: "Auto-refreshing",
            loading: "Loading jobs...",
            empty: "No jobs created yet. Pick an uploaded PDF on the left and create the first run.",
            latest: "Latest job",
            created: "Created",
            resultCenter: "Result center",
            final: "This run is currently classified as final.",
            draft: "This run is currently classified as draft.",
            none: "This run has not produced a downloadable outcome yet.",
            previewWaiting: "Preview text will appear here after the worker emits it.",
            primary: "Primary output",
            primaryTitle: "Final PDF",
            primaryBody: "Available when the run upgrades cleanly to final.",
            fallback: "Fallback output",
            fallbackTitle: "Draft bundle",
            fallbackBody: "Available when review artifacts need manual correction outside the browser.",
            downloadPdf: "Download result PDF",
            downloadDraft: "Download draft bundle",
            notReady: "Not ready",
          },
          archive: {
            eyebrow: "Recent jobs",
            title: "Queue archive",
            body: "Preview text, result type, and downloads stay visible here so you can review older runs after the top panel moves on to newer jobs.",
          },
        };

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
        router.replace(APP_ROUTES.checkout);
        return;
      }
      setStatus(filesResult.error);
      return;
    }

    if (!jobsResult.ok) {
      if (jobsResult.error === "An active entitlement is required.") {
        router.replace(APP_ROUTES.checkout);
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
      setStatus("Please sign in first.");
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
        router.replace(APP_ROUTES.checkout);
        return;
      }
      setStatus(result.error);
      setStatusKind("error");
      return;
    }

    setStatus(copy.createdJob(result.data.job.id));
    setStatusKind("success");
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
      const nextError = payload?.error ?? copy.downloadFailed;
      if (nextError === "An active entitlement is required.") {
        router.replace(APP_ROUTES.checkout);
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
          <p className="metric-value">{summary.queued}</p>
          <p className="helper-copy">{copy.summary.queued[1]}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">{copy.summary.processing[0]}</p>
          <p className="metric-value">{summary.processing}</p>
          <p className="helper-copy">{copy.summary.processing[1]}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">{copy.summary.completed[0]}</p>
          <p className="metric-value">{summary.completed}</p>
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
                ? `${formatLocal(selectedFile.createdAt, locale)}`
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
            <Link href={APP_ROUTES.upload} className="button button-tertiary">
              {copy.create.uploads}
            </Link>
          </div>

          {status && statusTone ? <p className={`form-status ${statusTone}`}>{status}</p> : null}

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
                      <span>{formatLocal(file.createdAt, locale)}</span>
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

        <div className="preview-side">
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
              <strong>{summary.queued}</strong>
            </div>
            <div className="queue-summary-chip">
              <span>{copy.summary.processing[0]}</span>
              <strong>{summary.processing}</strong>
            </div>
            <div className="queue-summary-chip">
              <span>{copy.summary.completed[0]}</span>
              <strong>{summary.completed}</strong>
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
                    <p className="item-meta">{copy.monitor.created} {formatLocal(latestJob.createdAt, locale)}</p>
                  </div>
                </div>
                <div className="inline-meta">
                  <StatusPill tone={mapJobTone(latestJob.status)} icon={<DotIcon width={10} height={10} />}>
                    {translateJobStatus(latestJob.status, locale)}
                  </StatusPill>
                  <StatusPill tone={latestResultTone}>{translateResultKind(latestJob.resultKind, locale)}</StatusPill>
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
                        <p className="item-meta">{translateDirection(job.direction, locale)} | {copy.monitor.created} {formatLocal(job.createdAt, locale)}</p>
                      </div>
                    </div>

                    <div className="inline-meta">
                      <StatusPill tone={mapJobTone(job.status)} icon={<DotIcon width={10} height={10} />}>
                        {translateJobStatus(job.status, locale)}
                      </StatusPill>
                      <StatusPill tone={resultTone}>{translateResultKind(job.resultKind, locale)}</StatusPill>
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
                    <span className="status-chip tone-primary">{translateJobPhase(job, locale)}</span>
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

function formatLocal(value: string, locale: string) {
  return new Date(value).toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US");
}

function translateJobStatus(status: JobItem["status"], locale: string) {
  if (locale !== "zh-CN") {
    return status;
  }

  switch (status) {
    case "queued":
      return "排队中";
    case "processing":
      return "处理中";
    case "completed":
      return "已完成";
    case "failed":
      return "失败";
    default:
      return status;
  }
}

function translateResultKind(resultKind: JobItem["resultKind"], locale: string) {
  if (locale !== "zh-CN") {
    return resultKind;
  }

  switch (resultKind) {
    case "final":
      return "最终版";
    case "draft":
      return "草稿";
    default:
      return "暂无";
  }
}

function translateDirection(direction: ConversionDirection, locale: string) {
  if (locale !== "zh-CN") {
    return direction;
  }

  return direction === "staff_pdf_to_numbered" ? "五线谱 PDF -> 简谱" : direction;
}

function translateJobPhase(job: JobItem, locale: string) {
  if (locale !== "zh-CN") {
    return job.completedAt ? "Completed" : job.startedAt ? "Running" : "Waiting";
  }

  return job.completedAt ? "已完成" : job.startedAt ? "运行中" : "等待中";
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
