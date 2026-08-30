"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatDateTime, formatMessage, formatNumber } from "@score/i18n";
import { APP_ROUTES } from "@score/shared";
import { DownloadIcon, FileStackIcon, PreviewStaffGraphic, UploadIcon } from "@score/ui";
import { API_BASE_URL, apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { useAppLocale } from "./AppLocaleProvider";
import { accountActivationRoute } from "../lib/release";
import type { WorkspaceMessages } from "../lib/workspace-messages/types";

type FileItem = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  fileKind: string;
  createdAt: string;
};

type FileListPayload = {
  files: FileItem[];
};

type UploadPayload = {
  file: FileItem;
};

export function UploadManager({ copy }: { copy: WorkspaceMessages["uploads"] }) {
  const router = useRouter();
  const { locale } = useAppLocale();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const token = useMemo(() => getStoredToken(), []);

  async function loadFiles() {
    if (!token) {
      setLoading(false);
      setStatus(copy.signInFirst);
      setStatusKind("error");
      return;
    }

    setLoading(true);
    const result = await apiRequest<FileListPayload>("/api/files", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setLoading(false);

    if (!result.ok) {
      if (result.error === "An active entitlement is required.") {
        router.replace(accountActivationRoute);
        return;
      }
      setStatus(result.error);
      setStatusKind("error");
      return;
    }

    setFiles(result.data.files);
  }

  useEffect(() => {
    void loadFiles();
  }, []);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setStatus(copy.signInFirst);
      setStatusKind("error");
      return;
    }

    if (!selectedFile) {
      setStatus(copy.chooseFile);
      setStatusKind("error");
      return;
    }

    setUploading(true);
    setStatus(null);
    setStatusKind(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`${API_BASE_URL}/api/files/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as UploadPayload | { error?: string } | null;

      if (!response.ok) {
        const nextError = payload && "error" in payload ? payload.error ?? copy.uploadFailed : copy.uploadFailed;
        if (nextError === "An active entitlement is required.") {
          router.replace(accountActivationRoute);
          setUploading(false);
          return;
        }
        setStatus(nextError);
        setStatusKind("error");
        setUploading(false);
        return;
      }

      const uploadedFileName = payload && "file" in payload ? payload.file.originalName : copy.fileKinds.unknown;
      setStatus(formatMessage(copy.uploaded, { name: uploadedFileName }));
      setStatusKind("success");
      setSelectedFile(null);
      const input = document.getElementById("pdf-upload-input") as HTMLInputElement | null;
      if (input) {
        input.value = "";
      }
      await loadFiles();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : copy.uploadFailed);
      setStatusKind("error");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(fileId: string, originalName: string) {
    if (!token) {
      setStatus(copy.signInFirst);
      setStatusKind("error");
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/files/${fileId}/download`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
    anchor.download = originalName;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  const totalSizeLabel = formatSize(files.reduce((sum, file) => sum + file.sizeBytes, 0), locale);
  const statusTone = status ? statusKind : null;
  const newestStoredFile = files[0] ?? null;
  const previewName = selectedFile?.name ?? newestStoredFile?.originalName ?? copy.previewAwaiting;

  return (
    <div className="page-stack">
      <div className="metric-grid">
        <div className="metric-card">
          <p className="metric-label">{copy.metrics.stored[0]}</p>
          <p className="metric-value">{formatNumber(files.length, locale)}</p>
          <p className="helper-copy">{copy.metrics.stored[1]}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">{copy.metrics.format[0]}</p>
          <p className="metric-value">PDF</p>
          <p className="helper-copy">{copy.metrics.format[1]}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">{copy.metrics.storage[0]}</p>
          <p className="metric-value">{totalSizeLabel}</p>
          <p className="helper-copy">{copy.metrics.storage[1]}</p>
        </div>
      </div>

      <section className="surface-panel converter-shell">
        <form onSubmit={handleUpload} className="converter-side">
          <div className="stack-sm">
            <p className="eyebrow">{copy.upload.eyebrow}</p>
            <h2 className="card-title">{copy.upload.title}</h2>
            <p className="body-copy">{copy.upload.body}</p>
          </div>

          <label htmlFor="pdf-upload-input" className="file-dropzone">
            <span className="dropzone-icon">
              <UploadIcon width={22} height={22} />
            </span>
            <div className="stack-xs">
              <p className="dropzone-title">{copy.upload.dropTitle}</p>
              <p className="dropzone-copy">{copy.upload.dropBody}</p>
            </div>
            <span className="status-chip tone-cyan">{copy.upload.maxSize}</span>
          </label>
          <input
            id="pdf-upload-input"
            className="sr-only"
            type="file"
            accept="application/pdf,.pdf"
            aria-label={copy.upload.inputAria}
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />

          <div className="stack-sm">
            <p className="metric-label">{copy.upload.cloud}</p>
            <div className="cloud-import-grid">
              <div className="cloud-import-chip">
                <strong>Google Drive</strong>
                <span>{copy.upload.planned}</span>
              </div>
              <div className="cloud-import-chip">
                <strong>Dropbox</strong>
                <span>{copy.upload.planned}</span>
              </div>
              <div className="cloud-import-chip">
                <strong>WeChat</strong>
                <span>{copy.upload.planned}</span>
              </div>
            </div>
          </div>

          {selectedFile ? (
            <div className="mini-card selected-file">
              <span className="info-icon tertiary">
                <FileStackIcon width={20} height={20} />
              </span>
              <div className="stack-xs">
                <p className="item-title">{selectedFile.name}</p>
                <p className="item-meta">{formatSize(selectedFile.size, locale)} {copy.upload.selected}</p>
              </div>
            </div>
          ) : (
            <div className="empty-state">{copy.upload.empty}</div>
          )}

          <div className="button-row">
            <button type="submit" disabled={uploading} className="button button-primary">
              {uploading ? copy.upload.uploading : copy.upload.uploadButton}
            </button>
            <button type="button" className="button button-secondary" onClick={() => setSelectedFile(null)}>
              {copy.upload.clear}
            </button>
            <Link href={APP_ROUTES.jobs} className="button button-tertiary">
              {copy.upload.jobs}
            </Link>
          </div>

          {status && statusTone ? <p className={`form-status ${statusTone}`} role={statusKind === "error" ? "alert" : "status"}>{status}</p> : null}
        </form>

        <div className="preview-side">
          <div className="preview-header">
            <div className="stack-xs">
              <p className="metric-label">{copy.preview.eyebrow}</p>
              <p className="item-title">{copy.preview.title}</p>
            </div>
            <div className="live-indicator">
              <span className="live-dot" />
              {copy.preview.ready}
            </div>
          </div>

          <div className="preview-frame">
            <PreviewStaffGraphic />
            <div className="sunken-panel numbered-preview-card">
              <div className="stack-xs">
                <p className="metric-label">{copy.preview.numbered}</p>
                <p className="item-title">{previewName}</p>
              </div>
              <div className="hero-notation">
                <span>1</span>
                <span>.</span>
                <span>3</span>
                <span>5</span>
                <span>6</span>
              </div>
              <p className="helper-copy">{copy.preview.previewBody}</p>
            </div>
          </div>

          <div className="download-action-grid">
            <div className="preview-snapshot">
              <p className="metric-label">{copy.preview.latest}</p>
              <p className="item-title">{newestStoredFile ? newestStoredFile.originalName : copy.preview.latestEmpty}</p>
              <p className="helper-copy">
                {newestStoredFile ? `${formatSize(newestStoredFile.sizeBytes, locale)} | ${formatDateTime(newestStoredFile.createdAt, locale)}` : copy.preview.latestHint}
              </p>
              {newestStoredFile ? (
                <button
                  type="button"
                  className="button button-secondary button-ghost"
                  onClick={() => void handleDownload(newestStoredFile.id, newestStoredFile.originalName)}
                >
                  <DownloadIcon width={16} height={16} />
                  {copy.preview.downloadSource}
                </button>
              ) : null}
            </div>
            <div className="preview-snapshot">
              <p className="metric-label">{copy.preview.next}</p>
              <p className="item-title">{copy.preview.nextTitle}</p>
              <p className="helper-copy">{copy.preview.nextBody}</p>
              <Link href={APP_ROUTES.jobs} className="button button-primary button-ghost">
                {copy.preview.openQueue}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">{copy.stored.eyebrow}</p>
          <h2 className="card-title">{copy.stored.title}</h2>
          <p className="body-copy">{copy.stored.body}</p>
        </div>

        {loading ? <div className="empty-state">{copy.stored.loading}</div> : null}
        {!loading && files.length === 0 ? <div className="empty-state">{copy.stored.empty}</div> : null}

        {!loading && files.length > 0 ? (
          <div className="list-grid">
            {files.map((file) => (
              <div key={file.id} className="list-item">
                <div className="list-item-content">
                  <p className="item-title">{file.originalName}</p>
                  <p className="item-meta">
                    {formatSize(file.sizeBytes, locale)} | {formatDateTime(file.createdAt, locale)} | {formatFileKind(file.fileKind, copy.fileKinds)}
                  </p>
                </div>
                <button type="button" className="button button-secondary button-ghost" onClick={() => void handleDownload(file.id, file.originalName)}>
                  <DownloadIcon width={16} height={16} />
                  {copy.stored.download}
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function formatSize(sizeBytes: number, locale: Parameters<typeof formatNumber>[1]) {
  if (sizeBytes < 1024) return `${formatNumber(sizeBytes, locale)} B`;
  if (sizeBytes < 1024 * 1024) return `${formatNumber(sizeBytes / 1024, locale, { maximumFractionDigits: 1 })} KB`;
  return `${formatNumber(sizeBytes / (1024 * 1024), locale, { maximumFractionDigits: 2 })} MB`;
}

function formatFileKind(fileKind: string, copy: WorkspaceMessages["uploads"]["fileKinds"]) {
  return fileKind === "input_pdf" ? copy.input_pdf : copy.unknown;
}
