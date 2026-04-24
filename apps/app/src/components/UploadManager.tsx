"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { APP_ROUTES } from "@score/shared";
import { DownloadIcon, FileStackIcon, PreviewStaffGraphic, UploadIcon } from "@score/ui";
import { API_BASE_URL, apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { useAppLocale } from "./AppLocaleProvider";

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
  const router = useRouter();
  const { locale } = useAppLocale();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const token = useMemo(() => getStoredToken(), []);
  const copy =
    locale === "zh-CN"
      ? {
          signInFirst: "请先登录。",
          chooseFile: "请选择 PDF 文件。",
          uploadFailed: "上传失败。",
          downloadFailed: "下载失败。",
          uploaded: (name: string) => `已成功上传 ${name}。`,
          metrics: {
            stored: ["已存储乐谱", "每次上传都会形成一个可重复使用的源文件。"],
            format: ["支持格式", "当前正式环境只接受五线谱 PDF。"],
            storage: ["总存储量", "便于在批量上传前快速了解空间占用。"],
          },
          upload: {
            eyebrow: "上传乐谱",
            title: "把五线谱带入工作台",
            body: "左侧专注上传，右侧提供实时预览语境，不再暴露未完成功能。",
            dropTitle: "拖拽乐谱到这里，或点击选择文件",
            dropBody: "当前仅支持五线谱 PDF。图片上传和反向转换暂未上线。",
            maxSize: "最大大小遵循 API 限制",
            cloud: "云端导入",
            planned: "规划中",
            selected: "已选择并可上传。",
            empty: "尚未选择文件。请选择一个 PDF 生成可复用的源文件记录。",
            uploadButton: "上传 PDF",
            uploading: "上传中...",
            clear: "清空选择",
            jobs: "前往任务页",
          },
          preview: {
            eyebrow: "实时预览",
            title: "当前上传上下文",
            ready: "准备进入队列",
            numbered: "简谱预览",
            previewBody: "清晰的 PDF 后续可升级为最终结果；质量不稳定的素材会保留草稿交付。",
            latest: "最新源文件",
            latestEmpty: "暂无已存储源文件",
            latestHint: "上传一个 PDF 后即可进入任务队列。",
            next: "下一步",
            nextTitle: "创建转换任务",
            nextBody: "文件入库后，任务页会继续保持“五线谱 PDF -> 简谱”的锁定方向。",
            openQueue: "打开任务队列",
            downloadSource: "下载源文件",
          },
          stored: {
            eyebrow: "已存储文件",
            title: "已上传的五线谱 PDF",
            body: "这些文件都可以作为任务输入，下载可用于核对 API 中保存的源文件。",
            loading: "文件加载中...",
            empty: "还没有上传文件。先上传一个五线谱 PDF 才能创建任务。",
            download: "下载",
          },
        }
      : {
          signInFirst: "Please sign in first.",
          chooseFile: "Please choose a PDF file.",
          uploadFailed: "Upload failed.",
          downloadFailed: "Download failed.",
          uploaded: (name: string) => `Uploaded ${name} successfully.`,
          metrics: {
            stored: ["Stored scores", "Every upload becomes a reusable source for later conversion jobs."],
            format: ["Accepted format", "Current production scope is intentionally limited to staff PDFs."],
            storage: ["Total storage", "Helpful when checking batch uploads before creating jobs."],
          },
          upload: {
            eyebrow: "Upload score",
            title: "Bring a staff score into the studio",
            body: "The upload area now mirrors the Stitch converter composition: focused dropzone on the left, live preview context on the right, and no extra unfinished routes.",
            dropTitle: "Drop a score here or choose a file",
            dropBody: "Currently supports five-line staff PDF only. Image uploads and reverse conversion stay outside this release.",
            maxSize: "Maximum size follows API limits",
            cloud: "Import from cloud",
            planned: "Planned",
            selected: "selected and ready to upload.",
            empty: "No file selected yet. Choose one PDF to create a reusable source record.",
            uploadButton: "Upload PDF",
            uploading: "Uploading...",
            clear: "Clear selection",
            jobs: "Go to jobs",
          },
          preview: {
            eyebrow: "Real-time preview",
            title: "Current upload context",
            ready: "Ready for queueing",
            numbered: "Numbered preview",
            previewBody: "A clear PDF can later promote to final output. Weak material remains eligible for draft-only delivery.",
            latest: "Latest stored source",
            latestEmpty: "No stored source yet",
            latestHint: "Upload one PDF to unlock the job queue.",
            next: "Next step",
            nextTitle: "Create the conversion job",
            nextBody: "Once the PDF is stored, the job queue keeps the direction locked to Staff PDF -> Jianpu.",
            openQueue: "Open job queue",
            downloadSource: "Download source",
          },
          stored: {
            eyebrow: "Stored files",
            title: "Uploaded staff PDFs",
            body: "These files are available as inputs for job creation. Downloading lets you verify the exact source stored by the API.",
            loading: "Loading files...",
            empty: "No files uploaded yet. Start with one staff PDF so jobs can be queued.",
            download: "Download",
          },
        };

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
        router.replace(APP_ROUTES.checkout);
        return;
      }
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
          router.replace(APP_ROUTES.checkout);
          setUploading(false);
          return;
        }
        setStatus(nextError);
        setStatusKind("error");
        setUploading(false);
        return;
      }

      const uploadedFileName = payload && "file" in payload ? payload.file.originalName : "file";
      setStatus(copy.uploaded(uploadedFileName));
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
    anchor.download = originalName;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  const totalSizeLabel = formatSize(files.reduce((sum, file) => sum + file.sizeBytes, 0));
  const statusTone = status ? statusKind : null;
  const newestStoredFile = files[0] ?? null;
  const previewName = selectedFile?.name ?? newestStoredFile?.originalName ?? "Awaiting PDF upload";

  return (
    <div className="page-stack">
      <div className="metric-grid">
        <div className="metric-card">
          <p className="metric-label">{copy.metrics.stored[0]}</p>
          <p className="metric-value">{files.length}</p>
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
                <p className="item-meta">{formatSize(selectedFile.size)} {copy.upload.selected}</p>
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

          {status && statusTone ? <p className={`form-status ${statusTone}`}>{status}</p> : null}
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
                {newestStoredFile ? `${formatSize(newestStoredFile.sizeBytes)} | ${formatLocal(newestStoredFile.createdAt, locale)}` : copy.preview.latestHint}
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
                    {formatSize(file.sizeBytes)} | {formatLocal(file.createdAt, locale)} | {translateFileKind(file.fileKind, locale)}
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

function formatSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatLocal(value: string, locale: string) {
  return new Date(value).toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US");
}

function translateFileKind(fileKind: string, locale: string) {
  if (locale !== "zh-CN") {
    return fileKind;
  }

  return fileKind === "input_pdf" ? "输入 PDF" : fileKind;
}
