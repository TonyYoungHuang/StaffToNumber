"use client";

import { useEffect, useMemo, useState } from "react";
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

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      <form onSubmit={handleUpload} style={panelStyle}>
        <p style={eyebrowStyle}>Upload input PDF</p>
        <h2 style={{ marginTop: 0 }}>Upload a source file</h2>
        <p style={{ color: "#516174", lineHeight: 1.6 }}>
          Module 3 stores uploaded PDF files and records the metadata so later conversion modules can use them.
        </p>
        <input
          id="pdf-upload-input"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          style={{ marginBottom: "16px" }}
        />
        <div>
          <button type="submit" disabled={uploading} style={buttonStyle}>
            {uploading ? "Uploading..." : "Upload PDF"}
          </button>
        </div>
        {status ? <p style={{ marginBottom: 0, color: "#435364" }}>{status}</p> : null}
      </form>

      <section style={panelStyle}>
        <p style={eyebrowStyle}>Stored files</p>
        <h2 style={{ marginTop: 0 }}>Your uploaded PDFs</h2>
        {loading ? <p>Loading files...</p> : null}
        {!loading && files.length === 0 ? <p style={{ color: "#516174" }}>No files uploaded yet.</p> : null}
        <div style={{ display: "grid", gap: "12px" }}>
          {files.map((file) => (
            <div key={file.id} style={fileRowStyle}>
              <div>
                <div style={{ fontWeight: 700 }}>{file.originalName}</div>
                <div style={{ color: "#516174", fontSize: "14px" }}>
                  {formatSize(file.sizeBytes)} | {new Date(file.createdAt).toLocaleString()}
                </div>
              </div>
              <button type="button" style={secondaryButtonStyle} onClick={() => void handleDownload(file.id, file.originalName)}>
                Download
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function formatSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

const panelStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: "24px",
  padding: "24px",
  boxShadow: "0 18px 60px rgba(18, 32, 47, 0.1)",
};

const fileRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "center",
  border: "1px solid #dfe7ee",
  borderRadius: "18px",
  padding: "14px 16px",
};

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 10px",
  color: "#75869a",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontSize: "12px",
};

const buttonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: "14px",
  padding: "12px 18px",
  background: "#12202f",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "#dfe7ee",
  color: "#12202f",
};
