"use client";

import { useEffect, useMemo, useState } from "react";
import type { ConversionDirection } from "@score/shared";
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
  const [direction, setDirection] = useState<ConversionDirection>("staff_pdf_to_numbered");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

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

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      <form onSubmit={handleCreateJob} style={panelStyle}>
        <p style={eyebrowStyle}>Create conversion job</p>
        <h2 style={{ marginTop: 0 }}>Queue a task</h2>
        <p style={{ color: "#516174", lineHeight: 1.6 }}>
          Module 4 creates a reusable task model, and Module 5 now plugs a first staff PDF to numbered-notation engine into it.
        </p>
        <label style={labelStyle}>
          <span>Input file</span>
          <select value={selectedFileId} onChange={(event) => setSelectedFileId(event.target.value)} style={inputStyle}>
            <option value="">Select an uploaded PDF</option>
            {files.map((file) => (
              <option key={file.id} value={file.id}>
                {file.originalName}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          <span>Direction</span>
          <select value={direction} onChange={(event) => setDirection(event.target.value as ConversionDirection)} style={inputStyle}>
            <option value="staff_pdf_to_numbered">Staff PDF to numbered notation</option>
            <option value="numbered_pdf_to_staff">Numbered notation PDF to staff</option>
          </select>
        </label>
        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? "Creating..." : "Create job"}
        </button>
        {status ? <p style={{ marginBottom: 0, color: "#435364" }}>{status}</p> : null}
      </form>

      <section style={panelStyle}>
        <p style={eyebrowStyle}>Jobs</p>
        <h2 style={{ marginTop: 0 }}>Recent tasks</h2>
        {loading ? <p>Loading jobs...</p> : null}
        {!loading && jobs.length === 0 ? <p style={{ color: "#516174" }}>No jobs created yet.</p> : null}
        <div style={{ display: "grid", gap: "12px" }}>
          {jobs.map((job) => {
            const file = files.find((item) => item.id === job.inputFileId);
            return (
              <div key={job.id} style={jobRowStyle}>
                <div style={{ display: "grid", gap: "8px", flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{file?.originalName ?? job.inputFileId}</div>
                  <div style={{ color: "#516174", fontSize: "14px" }}>
                    {job.direction} | status: {job.status} | created: {new Date(job.createdAt).toLocaleString()}
                  </div>
                  {job.previewText ? <pre style={previewStyle}>{job.previewText}</pre> : null}
                  {job.errorMessage ? <div style={{ color: "#915f2b", fontSize: "14px" }}>{job.errorMessage}</div> : null}
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {job.outputFileId ? (
                      <button
                        type="button"
                        style={secondaryButtonStyle}
                        onClick={() => void handleDownload(job.outputFileId!, `${job.id}-${job.resultKind}.pdf`)}
                      >
                        Download result PDF
                      </button>
                    ) : null}
                    {job.draftBundleFileId ? (
                      <button
                        type="button"
                        style={secondaryButtonStyle}
                        onClick={() => void handleDownload(job.draftBundleFileId!, `${job.id}-draft-bundle.zip`)}
                      >
                        Download draft bundle
                      </button>
                    ) : null}
                  </div>
                </div>
                <span style={statusBadge(job.status)}>{job.status}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function statusBadge(status: JobItem["status"]): React.CSSProperties {
  const colors = {
    queued: { background: "#e7eef7", color: "#23405e" },
    processing: { background: "#fff1d8", color: "#8c5b15" },
    completed: { background: "#ddf5e8", color: "#17653b" },
    failed: { background: "#f8dddd", color: "#7b2b2b" },
  } as const;

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "96px",
    borderRadius: "999px",
    padding: "8px 12px",
    fontWeight: 700,
    textTransform: "capitalize",
    ...colors[status],
  };
}

const panelStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: "24px",
  padding: "24px",
  boxShadow: "0 18px 60px rgba(18, 32, 47, 0.1)",
};

const jobRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "flex-start",
  border: "1px solid #dfe7ee",
  borderRadius: "18px",
  padding: "14px 16px",
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
  marginBottom: "16px",
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  border: "1px solid #c9d4df",
  borderRadius: "14px",
  padding: "12px 14px",
  fontSize: "16px",
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

const previewStyle: React.CSSProperties = {
  margin: 0,
  whiteSpace: "pre-wrap",
  fontFamily: "Consolas, monospace",
  fontSize: "13px",
  lineHeight: 1.5,
  background: "#f7f9fb",
  borderRadius: "12px",
  padding: "10px 12px",
  color: "#334658",
};
