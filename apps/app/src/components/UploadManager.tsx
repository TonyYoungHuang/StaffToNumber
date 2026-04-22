"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { APP_ROUTES } from "@score/shared";
import { DownloadIcon, FileStackIcon, PreviewStaffGraphic, UploadIcon } from "@score/ui";
import { API_BASE_URL, apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";

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

export function UploadManager() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const token = useMemo(() => getStoredToken(), []);

  async function loadFiles() {
    if (!token) {
      setLoading(false);
      setStatus("Please sign in first.");
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
      setStatus(result.error);
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
      setStatus("Please sign in first.");
      return;
    }

    if (!selectedFile) {
      setStatus("Please choose a PDF file.");
      return;
    }

    setUploading(true);
    setStatus(null);

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
        setStatus(payload && "error" in payload ? payload.error ?? "Upload failed." : "Upload failed.");
        setUploading(false);
        return;
      }

      const uploadedFileName = payload && "file" in payload ? payload.file.originalName : "file";
      setStatus(`Uploaded ${uploadedFileName} successfully.`);
      setSelectedFile(null);
      const input = document.getElementById("pdf-upload-input") as HTMLInputElement | null;
      if (input) {
        input.value = "";
      }
      await loadFiles();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(fileId: string, originalName: string) {
    if (!token) {
      setStatus("Please sign in first.");
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/files/${fileId}/download`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
    anchor.download = originalName;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  const totalSizeLabel = formatSize(files.reduce((sum, file) => sum + file.sizeBytes, 0));
  const statusTone = status ? (status.toLowerCase().includes("successfully") ? "success" : "error") : null;
  const newestStoredFile = files[0] ?? null;
  const previewName = selectedFile?.name ?? newestStoredFile?.originalName ?? "Awaiting PDF upload";

  return (
    <div className="page-stack">
      <div className="metric-grid">
        <div className="metric-card">
          <p className="metric-label">Stored scores</p>
          <p className="metric-value">{files.length}</p>
          <p className="helper-copy">Every upload becomes a reusable source for later conversion jobs.</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Accepted format</p>
          <p className="metric-value">PDF</p>
          <p className="helper-copy">Current production scope is intentionally limited to staff PDFs.</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Total storage</p>
          <p className="metric-value">{totalSizeLabel}</p>
          <p className="helper-copy">Helpful when checking batch uploads before creating jobs.</p>
        </div>
      </div>

      <section className="surface-panel converter-shell">
        <form onSubmit={handleUpload} className="converter-side">
          <div className="stack-sm">
            <p className="eyebrow">Upload score</p>
            <h2 className="card-title">Bring a staff score into the studio</h2>
            <p className="body-copy">
              The upload area now mirrors the Stitch converter composition: focused dropzone on the left, live preview context on the right, and no extra unfinished routes.
            </p>
          </div>

          <label htmlFor="pdf-upload-input" className="file-dropzone">
            <span className="dropzone-icon">
              <UploadIcon width={22} height={22} />
            </span>
            <div className="stack-xs">
              <p className="dropzone-title">Drop a score here or choose a file</p>
              <p className="dropzone-copy">Currently supports five-line staff PDF only. Image uploads and reverse conversion stay outside this release.</p>
            </div>
            <span className="status-chip tone-cyan">Maximum size follows API limits</span>
          </label>
          <input
            id="pdf-upload-input"
            className="sr-only"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />

          <div className="stack-sm">
            <p className="metric-label">Import from cloud</p>
            <div className="cloud-import-grid">
              <div className="cloud-import-chip">
                <strong>Google Drive</strong>
                <span>Planned</span>
              </div>
              <div className="cloud-import-chip">
                <strong>Dropbox</strong>
                <span>Planned</span>
              </div>
              <div className="cloud-import-chip">
                <strong>WeChat</strong>
                <span>Planned</span>
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
                <p className="item-meta">{formatSize(selectedFile.size)} selected and ready to upload.</p>
              </div>
            </div>
          ) : (
            <div className="empty-state">No file selected yet. Choose one PDF to create a reusable source record.</div>
          )}

          <div className="button-row">
            <button type="submit" disabled={uploading} className="button button-primary">
              {uploading ? "Uploading..." : "Upload PDF"}
            </button>
            <button type="button" className="button button-secondary" onClick={() => setSelectedFile(null)}>
              Clear selection
            </button>
            <Link href={APP_ROUTES.jobs} className="button button-tertiary">
              Go to jobs
            </Link>
          </div>

          {status && statusTone ? <p className={`form-status ${statusTone}`}>{status}</p> : null}
        </form>

        <div className="preview-side">
          <div className="preview-header">
            <div className="stack-xs">
              <p className="metric-label">Real-time preview</p>
              <p className="item-title">Current upload context</p>
            </div>
            <div className="live-indicator">
              <span className="live-dot" />
              Ready for queueing
            </div>
          </div>

          <div className="preview-frame">
            <PreviewStaffGraphic />
            <div className="sunken-panel numbered-preview-card">
              <div className="stack-xs">
                <p className="metric-label">Numbered preview</p>
                <p className="item-title">{previewName}</p>
              </div>
              <div className="hero-notation">
                <span>1</span>
                <span>.</span>
                <span>3</span>
                <span>5</span>
                <span>6</span>
              </div>
              <p className="helper-copy">A clear PDF can later promote to final output. Weak material remains eligible for draft-only delivery.</p>
            </div>
          </div>

          <div className="download-action-grid">
            <div className="preview-snapshot">
              <p className="metric-label">Latest stored source</p>
              <p className="item-title">{newestStoredFile ? newestStoredFile.originalName : "No stored source yet"}</p>
              <p className="helper-copy">
                {newestStoredFile ? `${formatSize(newestStoredFile.sizeBytes)} stored and ready for job creation.` : "Upload one PDF to unlock the job queue."}
              </p>
              {newestStoredFile ? (
                <button
                  type="button"
                  className="button button-secondary button-ghost"
                  onClick={() => void handleDownload(newestStoredFile.id, newestStoredFile.originalName)}
                >
                  <DownloadIcon width={16} height={16} />
                  Download source
                </button>
              ) : null}
            </div>
            <div className="preview-snapshot">
              <p className="metric-label">Next step</p>
              <p className="item-title">Create the conversion job</p>
              <p className="helper-copy">Once the PDF is stored, the job queue keeps the direction locked to Staff PDF {"->"} Jianpu.</p>
              <Link href={APP_ROUTES.jobs} className="button button-primary button-ghost">
                Open job queue
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">Stored files</p>
          <h2 className="card-title">Uploaded staff PDFs</h2>
          <p className="body-copy">These files are available as inputs for job creation. Downloading lets you verify the exact source stored by the API.</p>
        </div>

        {loading ? <div className="empty-state">Loading files...</div> : null}
        {!loading && files.length === 0 ? <div className="empty-state">No files uploaded yet. Start with one staff PDF so jobs can be queued.</div> : null}

        {!loading && files.length > 0 ? (
          <div className="list-grid">
            {files.map((file) => (
              <div key={file.id} className="list-item">
                <div className="list-item-content">
                  <p className="item-title">{file.originalName}</p>
                  <p className="item-meta">
                    {formatSize(file.sizeBytes)} | {new Date(file.createdAt).toLocaleString()} | {file.fileKind}
                  </p>
                </div>
                <button type="button" className="button button-secondary button-ghost" onClick={() => void handleDownload(file.id, file.originalName)}>
                  <DownloadIcon width={16} height={16} />
                  Download
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function formatSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}
