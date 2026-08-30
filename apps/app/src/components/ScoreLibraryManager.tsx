"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatDateTime, formatNumber, type SupportedLocale } from "@score/i18n";
import { APP_ROUTES } from "@score/shared";
import { API_BASE_URL, apiRequest } from "../lib/api";
import { trackFunnelEvent } from "../lib/analytics";
import { getStoredToken } from "../lib/auth-storage";
import { accountActivationRoute } from "../lib/release";
import type { ScoreEntryMessages } from "../lib/score-entry-messages/types";
import { useAppLocale } from "./AppLocaleProvider";

type ScoreDocument = {
  id: string;
  title: string;
  status: "imported" | "candidate" | "needs_review" | "ready" | "archived";
  sourceFileId: string | null;
  currentRevisionId: string | null;
  createdAt: string;
  updatedAt: string;
  currentRevision: {
    id: string;
    revisionNumber: number;
    musicxmlFileId: string | null;
    createdFrom: string;
    createdAt: string;
  } | null;
  pendingRevision: {
    id: string;
    revisionNumber: number;
    musicxmlFileId: string | null;
    createdFrom: string;
    createdAt: string;
  } | null;
};

type ScoresPayload = {
  scores: ScoreDocument[];
};

type ImportPayload = {
  score: ScoreDocument;
};

type OmrImportPayload = ImportPayload & {
  job: {
    id: string;
    jobType: string;
    status: string;
  };
};

type AccessPayload = {
  user: {
    entitlement: { status: "inactive" | "active" | "expired" };
    freeTrial: {
      omrJobsUsed: number;
      omrJobsLimit: number;
      omrJobsRemaining: number;
      available: boolean;
    };
  };
};

export type ScoreImportView = "library" | "musicxml" | "backup" | "midi" | "scan" | "audio" | "jianpu";

export function ScoreLibraryManager({
  view = "library",
  copy,
}: {
  view?: ScoreImportView;
  copy: ScoreEntryMessages["library"];
}) {
  const { locale } = useAppLocale();
  const token = useMemo(() => getStoredToken(), []);
  const audioTranscriptionAvailable = process.env.NEXT_PUBLIC_AUDIO_TRANSCRIPTION_AVAILABLE === "true";
  const [scores, setScores] = useState<ScoreDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [scoreJsonImporting, setScoreJsonImporting] = useState(false);
  const [midiImporting, setMidiImporting] = useState(false);
  const [omrImporting, setOmrImporting] = useState(false);
  const [audioImporting, setAudioImporting] = useState(false);
  const [jianpuImporting, setJianpuImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedScoreJsonFile, setSelectedScoreJsonFile] = useState<File | null>(null);
  const [selectedMidiFile, setSelectedMidiFile] = useState<File | null>(null);
  const [selectedOmrFile, setSelectedOmrFile] = useState<File | null>(null);
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [jianpuTitle, setJianpuTitle] = useState("");
  const [jianpuText, setJianpuText] = useState("1=C\n4/4\n1 2 3 4 | 5 - 5 - | 6 5 3 1 | 2 0 1 - |");
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);
  const [access, setAccess] = useState<AccessPayload["user"] | null>(null);

  const commonCopy = copy.common;
  const musicXmlCopy = copy.musicxml;
  const omrCopy = copy.scan;
  const scoreJsonCopy = copy.backup;
  const midiCopy = copy.midi;
  const audioCopy = copy.audio;
  const jianpuCopy = copy.jianpu;
  async function loadScores() {
    if (!token) {
      setLoading(false);
      setStatus(copy.signInFirst);
      setStatusKind("error");
      return;
    }

    setLoading(true);
    const result = await apiRequest<ScoresPayload>("/api/scores", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setLoading(false);

    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }

    setScores(result.data.scores);
  }

  useEffect(() => {
    void loadScores();
    void loadAccess();
  }, []);

  async function loadAccess() {
    if (!token) return;
    const result = await apiRequest<AccessPayload>("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (result.ok) setAccess(result.data.user);
  }

  async function handleImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setStatus(copy.signInFirst);
      setStatusKind("error");
      return;
    }

    if (!selectedFile) {
      setStatus(musicXmlCopy.chooseFile);
      setStatusKind("error");
      return;
    }

    setImporting(true);
    setStatus(null);
    setStatusKind(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`${API_BASE_URL}/api/scores/import/musicxml`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as ImportPayload | { error?: string } | null;
      if (!response.ok) {
        setStatus(payload && "error" in payload && typeof payload.error === "string" ? payload.error : musicXmlCopy.importFailed);
        setStatusKind("error");
        return;
      }

      setStatus(musicXmlCopy.imported);
      setStatusKind("success");
      setSelectedFile(null);
      const input = document.getElementById("musicxml-import-input") as HTMLInputElement | null;
      if (input) {
        input.value = "";
      }
      await loadScores();
      await loadAccess();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : musicXmlCopy.importFailed);
      setStatusKind("error");
    } finally {
      setImporting(false);
    }
  }

  async function handleOmrImport() {
    if (!token) {
      setStatus(copy.signInFirst);
      setStatusKind("error");
      return;
    }

    if (!selectedOmrFile) {
      setStatus(omrCopy.chooseFile);
      setStatusKind("error");
      return;
    }

    setOmrImporting(true);
    setStatus(null);
    setStatusKind(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedOmrFile);

      const response = await fetch(`${API_BASE_URL}/api/scores/import/omr`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as OmrImportPayload | { error?: string } | null;
      if (!response.ok) {
        setStatus(payload && "error" in payload && typeof payload.error === "string" ? payload.error : omrCopy.importFailed);
        setStatusKind("error");
        return;
      }

      setStatus(omrCopy.imported);
      setStatusKind("success");
      const extension = selectedOmrFile.name.split(".").pop()?.toLowerCase() || "unknown";
      trackFunnelEvent("free_omr_created", {
        free_trial: !hasPaidAccess,
        source_type: extension === "pdf" ? "pdf" : "image",
      });
      setSelectedOmrFile(null);
      const input = document.getElementById("score-scan-input") as HTMLInputElement | null;
      if (input) {
        input.value = "";
      }
      await loadScores();
      await loadAccess();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : omrCopy.importFailed);
      setStatusKind("error");
    } finally {
      setOmrImporting(false);
    }
  }

  async function handleScoreJsonImport() {
    if (!token) {
      setStatus(copy.signInFirst);
      setStatusKind("error");
      return;
    }

    if (!selectedScoreJsonFile) {
      setStatus(scoreJsonCopy.chooseFile);
      setStatusKind("error");
      return;
    }

    setScoreJsonImporting(true);
    setStatus(null);
    setStatusKind(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedScoreJsonFile);

      const response = await fetch(`${API_BASE_URL}/api/scores/import/score-json`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as ImportPayload | { error?: string } | null;
      if (!response.ok) {
        setStatus(payload && "error" in payload ? payload.error ?? scoreJsonCopy.importFailed : scoreJsonCopy.importFailed);
        setStatusKind("error");
        return;
      }

      setStatus(scoreJsonCopy.imported);
      setStatusKind("success");
      setSelectedScoreJsonFile(null);
      const input = document.getElementById("score-json-import-input") as HTMLInputElement | null;
      if (input) {
        input.value = "";
      }
      await loadScores();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : scoreJsonCopy.importFailed);
      setStatusKind("error");
    } finally {
      setScoreJsonImporting(false);
    }
  }

  async function handleMidiImport() {
    if (!token) {
      setStatus(copy.signInFirst);
      setStatusKind("error");
      return;
    }

    if (!selectedMidiFile) {
      setStatus(midiCopy.chooseFile);
      setStatusKind("error");
      return;
    }

    setMidiImporting(true);
    setStatus(null);
    setStatusKind(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedMidiFile);

      const response = await fetch(`${API_BASE_URL}/api/scores/import/midi`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as ImportPayload | { error?: string } | null;
      if (!response.ok) {
        setStatus(payload && "error" in payload ? payload.error ?? midiCopy.importFailed : midiCopy.importFailed);
        setStatusKind("error");
        return;
      }

      setStatus(midiCopy.imported);
      setStatusKind("success");
      setSelectedMidiFile(null);
      const input = document.getElementById("midi-import-input") as HTMLInputElement | null;
      if (input) {
        input.value = "";
      }
      await loadScores();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : midiCopy.importFailed);
      setStatusKind("error");
    } finally {
      setMidiImporting(false);
    }
  }

  async function handleAudioImport() {
    if (!token) {
      setStatus(copy.signInFirst);
      setStatusKind("error");
      return;
    }

    if (!selectedAudioFile) {
      setStatus(audioCopy.chooseFile);
      setStatusKind("error");
      return;
    }

    setAudioImporting(true);
    setStatus(null);
    setStatusKind(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedAudioFile);

      const response = await fetch(`${API_BASE_URL}/api/scores/import/audio`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as OmrImportPayload | { error?: string } | null;
      if (!response.ok) {
        setStatus(payload && "error" in payload ? payload.error ?? audioCopy.importFailed : audioCopy.importFailed);
        setStatusKind("error");
        return;
      }

      setStatus(audioCopy.imported);
      setStatusKind("success");
      setSelectedAudioFile(null);
      const input = document.getElementById("audio-import-input") as HTMLInputElement | null;
      if (input) {
        input.value = "";
      }
      await loadScores();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : audioCopy.importFailed);
      setStatusKind("error");
    } finally {
      setAudioImporting(false);
    }
  }

  async function handleJianpuImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setStatus(copy.signInFirst);
      setStatusKind("error");
      return;
    }

    if (!jianpuText.trim()) {
      setStatus(jianpuCopy.empty);
      setStatusKind("error");
      return;
    }

    setJianpuImporting(true);
    setStatus(null);
    setStatusKind(null);

    const result = await apiRequest<ImportPayload>("/api/scores/import/jianpu", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: jianpuTitle,
        text: jianpuText,
      }),
    });

    setJianpuImporting(false);

    if (!result.ok) {
      setStatus(result.error || jianpuCopy.importFailed);
      setStatusKind("error");
      return;
    }

    setStatus(jianpuCopy.imported);
    setStatusKind("success");
    setJianpuTitle("");
    await loadScores();
  }

  const revisionCount = scores.filter((score) => score.pendingRevision || score.currentRevision).length;
  const statusTone = status ? statusKind : null;
  const hasPaidAccess = access?.entitlement.status === "active";
  const freeTrialAvailable = access?.freeTrial.available ?? false;
  const scanWorkspace = (
    <>
      {access === null ? <div className="empty-state" role="status" aria-live="polite">{omrCopy.accessLoading}</div> : null}

      {access && !hasPaidAccess && !freeTrialAvailable ? (
        <div className="converter-side stack-lg" role="status">
          <div className="stack-sm">
            <p className="eyebrow">{omrCopy.exhaustedEyebrow}</p>
            <h2 className="card-title">{omrCopy.exhaustedTitle}</h2>
            <p className="body-copy">{omrCopy.exhaustedBody}</p>
          </div>
          <div className="button-row">
            <Link href={`${APP_ROUTES.scores}#saved-scores`} className="button button-primary">{omrCopy.exhaustedLibrary}</Link>
            <Link
              href={accountActivationRoute}
              className="button button-secondary"
              onClick={() => trackFunnelEvent("upgrade_click", { source: "score_scan_exhausted" })}
            >
              {omrCopy.exhaustedUpgrade}
            </Link>
          </div>
        </div>
      ) : null}

      {access && (hasPaidAccess || freeTrialAvailable) ? <div id="score-scan" className="converter-side">
        <div className="stack-sm">
          <p className="eyebrow">
            {!hasPaidAccess && freeTrialAvailable ? omrCopy.freeEyebrow : omrCopy.eyebrow}
          </p>
          <h2 className="card-title">{omrCopy.title}</h2>
          <p className="body-copy">
            {!hasPaidAccess && freeTrialAvailable ? omrCopy.freeBody : omrCopy.body}
          </p>
        </div>

        <label htmlFor="score-scan-input" className="file-dropzone">
          <div className="stack-xs">
            <p className="dropzone-title">{omrCopy.dropTitle}</p>
            <p className="dropzone-copy">{omrCopy.dropBody}</p>
          </div>
          <span className="status-chip tone-amber">PDF / JPG</span>
        </label>
        <input
          id="score-scan-input"
          className="sr-only"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,application/pdf,image/*"
          onChange={(event) => setSelectedOmrFile(event.target.files?.[0] ?? null)}
        />

        {selectedOmrFile ? (
          <div className="mini-card stack-sm">
            <p className="metric-label">{commonCopy.selected}</p>
            <p className="item-title">{selectedOmrFile.name}</p>
            <p className="helper-copy">{formatSize(selectedOmrFile.size, locale)}</p>
          </div>
        ) : (
          <div className="empty-state">{omrCopy.empty}</div>
        )}

        <div className="button-row">
          <button type="button" disabled={omrImporting || (!hasPaidAccess && !freeTrialAvailable)} className="button button-primary" onClick={() => void handleOmrImport()}>
            {omrImporting ? commonCopy.uploadInProgress : omrCopy.button}
          </button>
          <button type="button" className="button button-secondary" onClick={() => setSelectedOmrFile(null)}>
            {commonCopy.chooseAnother}
          </button>
        </div>
      </div> : null}

      {status && statusTone ? <p className={`form-status ${statusTone}`} role={statusTone === "error" ? "alert" : "status"}>{status}</p> : null}
    </>
  );

  return (
    <div className="page-stack">
      {view === "library" ? <section id="free-scan" className="surface-panel stack-lg">{scanWorkspace}</section> : null}

      {view === "library" ? <div className="metric-grid">
        <div className="metric-card">
          <p className="metric-label">{copy.metrics.projects.label}</p>
          <p className="metric-value">{formatNumber(scores.length, locale)}</p>
          <p className="helper-copy">{copy.metrics.projects.body}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">{copy.metrics.format.label}</p>
          <p className="metric-value">{copy.editable}</p>
          <p className="helper-copy">{copy.metrics.format.body}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">{copy.metrics.revisions.label}</p>
          <p className="metric-value">{formatNumber(revisionCount, locale)}</p>
          <p className="helper-copy">{copy.metrics.revisions.body}</p>
        </div>
      </div> : null}

      <section className={`surface-panel${view === "library" ? "" : " single-task-panel"}`}>
        {view === "musicxml" && hasPaidAccess ? <form id="musicxml-import" onSubmit={handleImport} className="converter-side">
          <div className="stack-sm">
            <p className="eyebrow">{musicXmlCopy.eyebrow}</p>
            <h2 className="card-title">{musicXmlCopy.title}</h2>
            <p className="body-copy">{musicXmlCopy.body}</p>
          </div>

          <label htmlFor="musicxml-import-input" className="file-dropzone">
            <div className="stack-xs">
              <p className="dropzone-title">{musicXmlCopy.dropTitle}</p>
              <p className="dropzone-copy">{musicXmlCopy.dropBody}</p>
            </div>
            <span className="status-chip tone-cyan">MusicXML</span>
          </label>
          <input
            id="musicxml-import-input"
            className="sr-only"
            type="file"
            disabled={!hasPaidAccess}
            accept=".musicxml,.xml,.mxl,application/xml,text/xml,application/vnd.recordare.musicxml+xml,application/vnd.recordare.musicxml"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />

          {selectedFile ? (
            <div className="mini-card stack-sm">
              <p className="metric-label">{commonCopy.selected}</p>
              <p className="item-title">{selectedFile.name}</p>
              <p className="helper-copy">{formatSize(selectedFile.size, locale)}</p>
            </div>
          ) : (
            <div className="empty-state">{musicXmlCopy.empty}</div>
          )}

          <div className="button-row">
            <button type="submit" disabled={importing || !hasPaidAccess} className="button button-primary">
              {importing ? commonCopy.importInProgress : musicXmlCopy.button}
            </button>
            <button type="button" className="button button-secondary" onClick={() => setSelectedFile(null)}>
              {commonCopy.clearSelection}
            </button>
          </div>

          {status && statusTone ? <p className={`form-status ${statusTone}`} role={statusTone === "error" ? "alert" : "status"}>{status}</p> : null}
        </form> : null}

        {view === "backup" && hasPaidAccess ? <div id="score-json-import" className="converter-side">
          <div className="stack-sm">
            <p className="eyebrow">{scoreJsonCopy.eyebrow}</p>
            <h2 className="card-title">{scoreJsonCopy.title}</h2>
            <p className="body-copy">{scoreJsonCopy.body}</p>
          </div>

          <label htmlFor="score-json-import-input" className="file-dropzone">
            <div className="stack-xs">
              <p className="dropzone-title">{scoreJsonCopy.dropTitle}</p>
              <p className="dropzone-copy">{scoreJsonCopy.dropBody}</p>
            </div>
            <span className="status-chip tone-cyan">Score JSON</span>
          </label>
          <input
            id="score-json-import-input"
            className="sr-only"
            type="file"
            disabled={!hasPaidAccess}
            accept=".score.json,.json,application/json"
            onChange={(event) => setSelectedScoreJsonFile(event.target.files?.[0] ?? null)}
          />

          {selectedScoreJsonFile ? (
            <div className="mini-card stack-sm">
              <p className="metric-label">{commonCopy.selected}</p>
              <p className="item-title">{selectedScoreJsonFile.name}</p>
              <p className="helper-copy">{formatSize(selectedScoreJsonFile.size, locale)}</p>
            </div>
          ) : (
            <div className="empty-state">{scoreJsonCopy.empty}</div>
          )}

          <div className="button-row">
            <button type="button" disabled={scoreJsonImporting || !hasPaidAccess} className="button button-primary" onClick={() => void handleScoreJsonImport()}>
              {scoreJsonImporting ? commonCopy.importInProgress : scoreJsonCopy.button}
            </button>
            <button type="button" className="button button-secondary" onClick={() => setSelectedScoreJsonFile(null)}>
              {commonCopy.chooseAnother}
            </button>
          </div>
        </div> : null}

        {view === "midi" && hasPaidAccess ? <div id="midi-import" className="converter-side">
          <div className="stack-sm">
            <p className="eyebrow">{midiCopy.eyebrow}</p>
            <h2 className="card-title">{midiCopy.title}</h2>
            <p className="body-copy">{midiCopy.body}</p>
          </div>

          <label htmlFor="midi-import-input" className="file-dropzone">
            <div className="stack-xs">
              <p className="dropzone-title">{midiCopy.dropTitle}</p>
              <p className="dropzone-copy">{midiCopy.dropBody}</p>
            </div>
            <span className="status-chip tone-primary">MIDI</span>
          </label>
          <input
            id="midi-import-input"
            className="sr-only"
            type="file"
            disabled={!hasPaidAccess}
            accept=".mid,.midi,audio/midi,audio/x-midi"
            onChange={(event) => setSelectedMidiFile(event.target.files?.[0] ?? null)}
          />

          {selectedMidiFile ? (
            <div className="mini-card stack-sm">
              <p className="metric-label">{commonCopy.selected}</p>
              <p className="item-title">{selectedMidiFile.name}</p>
              <p className="helper-copy">{formatSize(selectedMidiFile.size, locale)}</p>
            </div>
          ) : (
            <div className="empty-state">{midiCopy.empty}</div>
          )}

          <div className="button-row">
            <button type="button" disabled={midiImporting || !hasPaidAccess} className="button button-primary" onClick={() => void handleMidiImport()}>
              {midiImporting ? commonCopy.importInProgress : midiCopy.button}
            </button>
            <button type="button" className="button button-secondary" onClick={() => setSelectedMidiFile(null)}>
              {commonCopy.clearSelection}
            </button>
          </div>
        </div> : null}

        {view === "scan" ? scanWorkspace : null}

        {view === "audio" && hasPaidAccess && audioTranscriptionAvailable ? <div id="audio-import" className="converter-side">
          <div className="stack-sm">
            <p className="eyebrow">{audioCopy.eyebrow}</p>
            <h2 className="card-title">{audioCopy.title}</h2>
            <p className="body-copy">{audioCopy.body}</p>
          </div>

          <label htmlFor="audio-import-input" className="file-dropzone">
            <div className="stack-xs">
              <p className="dropzone-title">{audioCopy.dropTitle}</p>
              <p className="dropzone-copy">{audioCopy.dropBody}</p>
            </div>
            <span className="status-chip tone-primary">{audioCopy.formatLabel}</span>
          </label>
          <input
            id="audio-import-input"
            className="sr-only"
            type="file"
            disabled={!hasPaidAccess}
            accept=".wav,.mp3,.m4a,.aac,.flac,.ogg,.aif,.aiff,audio/*"
            onChange={(event) => setSelectedAudioFile(event.target.files?.[0] ?? null)}
          />

          {selectedAudioFile ? (
            <div className="mini-card stack-sm">
              <p className="metric-label">{commonCopy.selected}</p>
              <p className="item-title">{selectedAudioFile.name}</p>
              <p className="helper-copy">{formatSize(selectedAudioFile.size, locale)}</p>
            </div>
          ) : (
            <div className="empty-state">{audioCopy.empty}</div>
          )}

          <div className="button-row">
            <button type="button" disabled={audioImporting || !hasPaidAccess} className="button button-primary" onClick={() => void handleAudioImport()}>
              {audioImporting ? commonCopy.uploadInProgress : audioCopy.button}
            </button>
            <button type="button" className="button button-secondary" onClick={() => setSelectedAudioFile(null)}>
              {commonCopy.chooseAnother}
            </button>
          </div>
        </div> : null}

        {view === "jianpu" && hasPaidAccess ? <form id="jianpu-import" onSubmit={handleJianpuImport} className="converter-side">
          <div className="stack-sm">
            <p className="eyebrow">{jianpuCopy.eyebrow}</p>
            <h2 className="card-title">{jianpuCopy.title}</h2>
            <p className="body-copy">{jianpuCopy.body}</p>
          </div>

          <label className="field-group">
            <span className="field-label">{jianpuCopy.titleLabel}</span>
            <input
              className="field-control"
              disabled={!hasPaidAccess}
              value={jianpuTitle}
              placeholder={jianpuCopy.titlePlaceholder}
              onChange={(event) => setJianpuTitle(event.target.value)}
            />
          </label>

          <label className="field-group">
            <span className="field-label">{jianpuCopy.textLabel}</span>
            <textarea
              className="field-control"
              disabled={!hasPaidAccess}
              rows={8}
              value={jianpuText}
              placeholder={jianpuCopy.textPlaceholder}
              onChange={(event) => setJianpuText(event.target.value)}
            />
          </label>

          <div className="button-row">
            <button type="submit" disabled={jianpuImporting || !hasPaidAccess} className="button button-primary">
              {jianpuImporting ? commonCopy.importInProgress : jianpuCopy.button}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setJianpuTitle("");
                setJianpuText("1=C\n4/4\n1 2 3 4 | 5 - 5 - | 6 5 3 1 | 2 0 1 - |");
              }}
            >
              {jianpuCopy.clear}
            </button>
          </div>
        </form> : null}

        {view === "library" ? <div id="saved-scores" className="preview-side">
          <div className="stack-sm">
            <p className="eyebrow">{copy.list.eyebrow}</p>
            <h2 className="card-title">{copy.list.title}</h2>
            <p className="body-copy">{copy.list.body}</p>
          </div>

          {loading ? <div className="empty-state">{copy.list.loading}</div> : null}
          {!loading && scores.length === 0 ? <div className="empty-state">{copy.list.empty}</div> : null}

          {!loading && scores.length > 0 ? (
            <div className="list-grid">
              {scores.map((score) => (
                <div key={score.id} className="list-item">
                  <div className="list-item-content">
                    <p className="item-title">{score.title}</p>
                    <p className="item-meta">
                      {translateStatus(score.status, copy.statuses)} | {copy.list.revision}{" "}
                      {formatNumber((score.pendingRevision ?? score.currentRevision)?.revisionNumber ?? 0, locale)} | {formatDateTime(score.updatedAt, locale)}
                    </p>
                  </div>
                  <Link href={`${APP_ROUTES.scores}/${score.id}`} className="button button-secondary button-ghost">
                    {copy.list.open}
                  </Link>
                </div>
              ))}
            </div>
          ) : null}
          <div className="button-row">
            <Link href={`${APP_ROUTES.scores}/new`} className="button button-primary">
              {copy.createNew}
            </Link>
          </div>
        </div> : null}

        {view !== "library" && view !== "musicxml" && view !== "scan" && status && statusTone ? (
          <p className={`form-status ${statusTone}`} role={statusTone === "error" ? "alert" : "status"}>{status}</p>
        ) : null}
      </section>
    </div>
  );
}

function formatSize(sizeBytes: number, locale: SupportedLocale) {
  if (sizeBytes < 1024) return `${formatNumber(sizeBytes, locale)} B`;
  if (sizeBytes < 1024 * 1024) {
    return `${formatNumber(sizeBytes / 1024, locale, { maximumFractionDigits: 1 })} KB`;
  }
  return `${formatNumber(sizeBytes / (1024 * 1024), locale, { maximumFractionDigits: 2 })} MB`;
}

function translateStatus(status: ScoreDocument["status"], statuses: ScoreEntryMessages["library"]["statuses"]) {
  return statuses[status];
}
