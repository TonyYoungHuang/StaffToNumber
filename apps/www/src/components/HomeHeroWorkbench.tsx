"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupportedLocale } from "@score/i18n";
import { ArrowNorthEastIcon, CheckSealIcon, SparkIcon, UploadIcon } from "@score/ui";
import { API_BASE_URL, apiRequest } from "../lib/api";
import type { HomepageWorkbenchCopy } from "../lib/homepage-localization/types";
import { localizePublicHref } from "../lib/locale-routing";
import { getAppScoreUrl } from "../lib/site";
import styles from "../app/home-page.module.css";
import { HomeCandidatePreview } from "./HomeCandidatePreview";

type WorkbenchMode = "recognize" | "process" | "transcribe";
type AuthMode = "login" | "register";
type SessionState = "unchecked" | "checking" | "anonymous" | "authenticated";
type JobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";

type AuthPayload = { user: { id: string; email: string } };
type ScorePayload = {
  score: { id: string; title: string; pendingRevisionId?: string | null; currentRevisionId: string | null };
};
type JobPayload = {
  jobs: Array<{ id: string; status: JobStatus; progressPercent: number; errorMessage: string | null }>;
};
type OmrImportPayload = ScorePayload & { job: JobPayload["jobs"][number] };

type HomeHeroWorkbenchProps = {
  locale: SupportedLocale;
  copy: HomepageWorkbenchCopy;
  startUrl: string;
  audioAvailable: boolean;
};

const HOME_SCAN_EVENT = "scoretransposer:start-free-scan";
const acceptedScoreFiles = ".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,application/pdf,image/png,image/jpeg,image/webp,image/tiff";

const modeFormats = {
  recognize: ["PDF", "PNG", "JPG", "WEBP", "TIFF"],
  process: ["MusicXML", "MXL", "MIDI", "Score JSON"],
  transcribe: ["MP3", "WAV", "M4A", "MP4", "MOV"],
} as const;

const toolDefinitions = [
  { icon: "✎", href: "/score-editor" },
  { icon: "⇄", href: "/musicxml-midi" },
  { icon: "↕", href: "/transpose-score" },
  { icon: "1·", href: "/staff-to-jianpu" },
  { icon: "♪", href: "/score-to-audio" },
  { icon: "♫", href: "/audio-to-score" },
] as const;

function apiErrorOrFallback(error: string | undefined, fallback: string) {
  return error?.trim() ? error : fallback;
}

export function HomeHeroWorkbench({ locale, copy, startUrl, audioAvailable }: HomeHeroWorkbenchProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionCheckRef = useRef<Promise<Exclude<SessionState, "unchecked" | "checking">> | null>(null);
  const handledHashRef = useRef(false);
  const [mode, setMode] = useState<WorkbenchMode>("recognize");
  const [session, setSession] = useState<SessionState>("unchecked");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [scoreId, setScoreId] = useState<string | null>(null);
  const [scoreTitle, setScoreTitle] = useState<string | null>(null);
  const [job, setJob] = useState<JobPayload["jobs"][number] | null>(null);
  const [musicXml, setMusicXml] = useState<string | null>(null);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);

  const modes = [
    { id: "recognize" as const, ...copy.modes.recognize, formats: modeFormats.recognize, href: "", experimental: false },
    { id: "process" as const, ...copy.modes.process, formats: modeFormats.process, href: startUrl, experimental: false },
    {
      id: "transcribe" as const,
      ...copy.modes.transcribe,
      formats: modeFormats.transcribe,
      action: audioAvailable ? copy.modes.transcribe.action : (copy.modes.transcribe.unavailableAction ?? copy.modes.transcribe.action),
      href: audioAvailable ? startUrl : "/audio-to-score",
      experimental: true,
    },
  ] as const;
  const activeMode = modes.find((item) => item.id === mode) ?? modes[0];

  const resolveSession = useCallback(async () => {
    if (session === "authenticated" || session === "anonymous") return session;
    if (!sessionCheckRef.current) {
      setSession("checking");
      sessionCheckRef.current = apiRequest<AuthPayload>("/api/auth/me")
        .then((result) => result.ok ? "authenticated" as const : "anonymous" as const)
        .finally(() => { sessionCheckRef.current = null; });
    }
    const resolvedSession = await sessionCheckRef.current;
    setSession(resolvedSession);
    return resolvedSession;
  }, [session]);

  const beginFileSelection = useCallback(async () => {
    setMode("recognize");
    document.getElementById("home-workbench")?.scrollIntoView({ behavior: "smooth", block: "center" });
    const resolvedSession = await resolveSession();
    if (resolvedSession !== "authenticated") {
      setAuthError(null);
      setAuthOpen(true);
      return;
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current?.click();
  }, [resolveSession]);

  useEffect(() => {
    const listener = () => void beginFileSelection();
    window.addEventListener(HOME_SCAN_EVENT, listener);
    return () => window.removeEventListener(HOME_SCAN_EVENT, listener);
  }, [beginFileSelection]);

  useEffect(() => {
    const handleHomepageScanLink = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href="#home-workbench"]') : null;
      if (!link) return;
      event.preventDefault();
      beginFileSelection();
    };
    document.addEventListener("click", handleHomepageScanLink);
    return () => document.removeEventListener("click", handleHomepageScanLink);
  }, [beginFileSelection]);

  useEffect(() => {
    const handleHashStart = () => {
      if (window.location.hash !== "#home-workbench") {
        handledHashRef.current = false;
        return;
      }
      if (handledHashRef.current) return;
      handledHashRef.current = true;
      void beginFileSelection();
    };
    handleHashStart();
    window.addEventListener("hashchange", handleHashStart);
    return () => window.removeEventListener("hashchange", handleHashStart);
  }, [beginFileSelection]);

  useEffect(() => {
    if (!authOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAuthOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [authOpen]);

  const startUpload = useCallback((file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["pdf", "png", "jpg", "jpeg", "webp", "tif", "tiff"].includes(extension)) {
      setRecognitionError(copy.invalidFile);
      return;
    }

    setPendingFile(null);
    setRecognitionError(null);
    setMusicXml(null);
    setScoreId(null);
    setScoreTitle(file.name.replace(/\.[^.]+$/u, ""));
    setJob(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/api/scores/import/omr`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setUploadProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onerror = () => { setUploadProgress(null); setRecognitionError(copy.uploadFailed); };
    xhr.onload = () => {
      setUploadProgress(null);
      let payload: OmrImportPayload | { error?: string } | null = null;
      try { payload = JSON.parse(xhr.responseText || "null") as OmrImportPayload | { error?: string } | null; } catch { payload = null; }
      if (xhr.status === 401) {
        setSession("anonymous");
        setPendingFile(file);
        setAuthOpen(true);
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300 || !payload || !("score" in payload) || !("job" in payload)) {
        setRecognitionError(apiErrorOrFallback(payload && "error" in payload ? payload.error : undefined, copy.uploadFailed));
        return;
      }
      setScoreId(payload.score.id);
      setScoreTitle(payload.score.title);
      setJob(payload.job);
    };
    xhr.send(formData);
  }, [copy.invalidFile, copy.uploadFailed]);

  useEffect(() => {
    if (!scoreId || job?.status === "failed" || job?.status === "cancelled" || (job?.status === "completed" && musicXml)) return;
    let active = true;
    const refresh = async () => {
      const [scoreResult, jobsResult] = await Promise.all([
        apiRequest<ScorePayload>(`/api/scores/${scoreId}`),
        apiRequest<JobPayload>(`/api/scores/${scoreId}/jobs`),
      ]);
      if (!active) return;
      if (!scoreResult.ok || !jobsResult.ok) {
        setRecognitionError(apiErrorOrFallback(!scoreResult.ok ? scoreResult.error : jobsResult.ok ? undefined : jobsResult.error, copy.uploadFailed));
        return;
      }
      const latestJob = jobsResult.data.jobs[0] ?? null;
      setJob(latestJob);
      setScoreTitle(scoreResult.data.score.title);
      const hasCandidate = Boolean(scoreResult.data.score.pendingRevisionId);
      const hasCurrent = Boolean(scoreResult.data.score.currentRevisionId);
      if (latestJob?.status === "completed" && (hasCandidate || hasCurrent)) {
        const preview = await apiRequest<{ musicXml: string }>(hasCandidate ? `/api/scores/${scoreId}/candidate/musicxml-preview` : `/api/scores/${scoreId}/musicxml-preview`);
        if (active && preview.ok) setMusicXml(preview.data.musicXml);
      }
      if (latestJob?.status === "failed") setRecognitionError(apiErrorOrFallback(latestJob.errorMessage ?? undefined, copy.uploadFailed));
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 3_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [copy.uploadFailed, job?.status, musicXml, scoreId]);

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthSubmitting(true);
    setAuthError(null);
    const result = await apiRequest<AuthPayload>(`/api/auth/${authMode}`, { method: "POST", body: JSON.stringify({ email, password }) });
    setAuthSubmitting(false);
    if (!result.ok) { setAuthError(apiErrorOrFallback(result.error, copy.authFailed)); return; }
    setSession("authenticated");
    setAuthOpen(false);
    setPassword("");
    if (pendingFile) startUpload(pendingFile);
    else if (window.location.hash !== "#home-workbench") window.setTimeout(() => fileInputRef.current?.click(), 0);
  }

  async function acceptFile(file: File | undefined) {
    if (!file) return;
    const resolvedSession = await resolveSession();
    if (resolvedSession !== "authenticated") { setPendingFile(file); setAuthOpen(true); return; }
    startUpload(file);
  }

  const jobLabel = job ? copy[job.status] : null;
  const busy = uploadProgress !== null || job?.status === "queued" || job?.status === "processing";

  return (
    <div id="home-workbench" className={styles.workbench} aria-label={copy.workbenchLabel}>
      <input ref={fileInputRef} className={styles.visuallyHidden} type="file" accept={acceptedScoreFiles} tabIndex={-1} aria-hidden="true" onChange={(event) => void acceptFile(event.target.files?.[0])} />
      <div className={styles.workbenchHeading}><span><SparkIcon width={16} height={16} />{copy.workbenchLabel}</span><em>{copy.workbenchBadge}</em></div>

      <div className={styles.modeTabs} role="tablist" aria-label={copy.taskTypeLabel}>
        {modes.map((item) => <button key={item.id} id={`home-workbench-tab-${item.id}`} type="button" role="tab" aria-controls="home-workbench-panel" aria-selected={item.id === mode} tabIndex={item.id === mode ? 0 : -1} className={item.id === mode ? styles.activeTab : undefined} onClick={() => setMode(item.id)}>{item.label}{item.experimental ? <small>{copy.experimentalLabel}</small> : null}</button>)}
      </div>

      <div id="home-workbench-panel" className={styles.workbenchPanel} role="tabpanel" aria-labelledby={`home-workbench-tab-${mode}`}>
        {mode === "recognize" ? (
          <button type="button" className={styles.dropZone} disabled={busy} onClick={beginFileSelection} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void acceptFile(event.dataTransfer.files?.[0]); }}>
            <span className={styles.uploadIcon}><UploadIcon width={24} height={24} /></span><strong>{activeMode.title}</strong><p>{activeMode.body}</p><span className={styles.formatList} aria-label={copy.supportedFormatsLabel}>{activeMode.formats.map((format) => <i key={format}>{format}</i>)}</span>
          </button>
        ) : (
          <a className={styles.dropZone} href={localizePublicHref(activeMode.href, locale)}><span className={styles.uploadIcon}><UploadIcon width={24} height={24} /></span><strong>{activeMode.title}</strong><p>{activeMode.body}</p><span className={styles.formatList}>{activeMode.formats.map((format) => <i key={format}>{format}</i>)}</span></a>
        )}

        {mode === "recognize" ? <button type="button" className={styles.workbenchAction} onClick={beginFileSelection} disabled={busy}>{activeMode.action}<ArrowNorthEastIcon width={16} height={16} /></button> : <a className={styles.workbenchAction} href={localizePublicHref(activeMode.href, locale)}>{activeMode.action}<ArrowNorthEastIcon width={16} height={16} /></a>}

        {mode === "recognize" && (uploadProgress !== null || job || recognitionError) ? (
          <section className={styles.recognitionPanel} aria-live="polite">
            <div className={styles.recognitionHeading}><div><small>{copy.candidateTitle}</small><strong>{scoreTitle ?? activeMode.title}</strong></div><span className={recognitionError ? styles.statusError : job?.status === "completed" ? styles.statusDone : styles.statusWorking}>{recognitionError ? copy.failed : uploadProgress !== null ? `${copy.uploading} · ${uploadProgress}%` : jobLabel}</span></div>
            {busy ? <div className={styles.progressTrack}><span style={{ width: `${uploadProgress ?? Math.max(8, job?.progressPercent ?? 8)}%` }} /></div> : null}
            {recognitionError ? <p className={styles.recognitionError} role="alert">{recognitionError}</p> : null}
            {job?.status === "completed" ? <p>{copy.candidateBody}</p> : null}
            {job?.status === "completed" ? <HomeCandidatePreview musicXml={musicXml} loadingLabel={copy.previewLoading} /> : null}
            <div className={styles.recognitionActions}>{scoreId ? <a href={getAppScoreUrl(scoreId, locale)}>{copy.openProject}<ArrowNorthEastIcon width={15} height={15} /></a> : null}{!busy ? <button type="button" onClick={beginFileSelection}>{copy.retry}</button> : null}</div>
          </section>
        ) : null}
      </div>

      <nav className={styles.toolRail} aria-label={copy.availableToolsLabel}>{toolDefinitions.map((tool, index) => {
        const [title, body] = copy.tools[index];
        return <a key={tool.href} href={localizePublicHref(tool.href, locale)}><span aria-hidden="true">{tool.icon}</span><strong>{title}</strong><small>{body}</small><ArrowNorthEastIcon width={17} height={17} /></a>;
      })}</nav>
      <p className={styles.workbenchStatus}><CheckSealIcon width={15} height={15} />{session === "checking" ? copy.checking : session === "authenticated" ? copy.signedIn : copy.signInFirst}</p>

      {authOpen ? (
        <div className={styles.authBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthOpen(false); }}>
          <section className={styles.authDialog} role="dialog" aria-modal="true" aria-labelledby="home-auth-title">
            <button type="button" className={styles.authClose} aria-label={copy.close} onClick={() => setAuthOpen(false)}>×</button>
            <p className={styles.kicker}>{authMode === "login" ? copy.login : copy.register}</p><h2 id="home-auth-title">{copy.authTitle}</h2><p>{copy.authBody}</p>
            <div className={styles.authTabs} role="tablist"><button type="button" aria-selected={authMode === "login"} onClick={() => { setAuthMode("login"); setAuthError(null); }}>{copy.login}</button><button type="button" aria-selected={authMode === "register"} onClick={() => { setAuthMode("register"); setAuthError(null); }}>{copy.register}</button></div>
            <form onSubmit={submitAuth}><label><span>{copy.email}</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required autoFocus /></label><label><span>{copy.password}</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={authMode === "register" ? "new-password" : "current-password"} minLength={8} required /></label><button type="submit" disabled={authSubmitting}>{authSubmitting ? copy.submitting : authMode === "login" ? copy.login : copy.register}</button></form>
            {authError ? <p className={styles.authError} role="alert">{authError}</p> : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
