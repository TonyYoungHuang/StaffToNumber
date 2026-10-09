"use client";

import { formatMessage, formatNumber, getScorePreflightMessages, getScoreRecognitionSupportMessage, getScoreProcessingMessages, getScoreProcessingFailureMessages, localizeApiError } from "@score/i18n";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupportedLocale } from "@score/i18n";
import type { ScoreRecognitionMode, ScoreRecognitionOption, ScoreStructurePreflight } from "@score/shared";
import { ArrowNorthEastIcon, CheckSealIcon, SparkIcon, UploadIcon, ScoreProcessingPanel } from "@score/ui";
import { API_BASE_URL, apiRequest } from "../lib/api";
import type { HomepageWorkbenchCopy } from "../lib/homepage-localization/types";
import { localizePublicHref } from "../lib/locale-routing";
import { getAppScoreUrl } from "../lib/site";
import styles from "../app/home-page.module.css";
import { HomeCandidatePreview } from "./HomeCandidatePreview";
import { usePurchaseFlow } from "./PurchaseFlowProvider";
import { SESSION_CHANGED_EVENT } from "../lib/purchase-flow";

type WorkbenchMode = "recognize" | "process" | "transcribe";
type SessionState = "checking" | "anonymous" | "authenticated";
type JobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";

type AuthPayload = { user: { id: string; email: string }; isNewUser?: boolean };
type ScorePayload = {
  score: { id: string; title: string; pendingRevisionId?: string | null; currentRevisionId: string | null };
};
type JobPayload = {
  jobs: Array<{ id: string; status: JobStatus; progressPercent: number; errorMessage: string | null; params?: Record<string, unknown> | null; startedAt?: string | null; createdAt?: string; updatedAt?: string; queuePosition?: number | null }>;
};
type OmrImportPayload = ScorePayload & { job: JobPayload["jobs"][number] };
type RecognitionOptionsPayload = { options: ScoreRecognitionOption[] };
type PreflightState = "idle" | "checking" | "ready" | "failed";

type HomeHeroWorkbenchProps = {
  locale: SupportedLocale;
  copy: HomepageWorkbenchCopy;
  startUrl: string;
  audioAvailable: boolean;
};

const HOME_SCAN_EVENT = "scoretransposer:start-free-scan";
const acceptedScoreFiles = ".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,application/pdf,image/png,image/jpeg,image/webp,image/tiff";
const savedOriginalRetryLabels: Record<SupportedLocale, string> = {
  "zh-CN": "用原文件重试", "zh-TW": "使用原檔案重試", en: "Retry saved original",
  ja: "元のファイルで再試行", ko: "저장된 원본으로 재시도", fr: "Réessayer avec l’original",
  es: "Reintentar con el original", de: "Mit Original erneut versuchen", ru: "Повторить с оригиналом",
};

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
  const [mode, setMode] = useState<WorkbenchMode>("recognize");
  const [session, setSession] = useState<SessionState>("checking");
  const flow = usePurchaseFlow();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [scoreId, setScoreId] = useState<string | null>(null);
  const [scoreTitle, setScoreTitle] = useState<string | null>(null);
  const [job, setJob] = useState<JobPayload["jobs"][number] | null>(null);
  const [musicXml, setMusicXml] = useState<string | null>(null);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const progressCopy = getScoreProcessingMessages(locale);
  const preflightCopy = getScorePreflightMessages(locale);
  const [preflightState, setPreflightState] = useState<PreflightState>("idle");
  const [preflight, setPreflight] = useState<ScoreStructurePreflight | null>(null);
  const [recognitionOptions, setRecognitionOptions] = useState<ScoreRecognitionOption[]>([]);
  const [recognitionMode, setRecognitionMode] = useState<ScoreRecognitionMode | null>(null);
  const [submittedMode, setSubmittedMode] = useState<ScoreRecognitionMode>("simple");
  const [confirming, setConfirming] = useState(false);
  const preflightAbort = useRef<AbortController | null>(null);
  const preflightGeneration = useRef(0);
  const waitingForLogin = useRef<File | null>(null);
  const currentFile = useRef<File | null>(null);
  const submissionLock = useRef(false);
  const importRequest = useRef<XMLHttpRequest | null>(null);

  const allModes = [
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
  const modes = allModes.filter(item => audioAvailable || item.id !== "transcribe");
  const activeMode = modes.find((item) => item.id === mode) ?? modes[0];

  const beginFileSelection = useCallback(() => {
    setMode("recognize");
    document.getElementById("home-workbench")?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (session !== "authenticated") {
      flow.signIn();
      return;
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current?.click();
  }, [session, flow.signIn]);

  useEffect(() => {
    const refresh = () => { void apiRequest<AuthPayload>("/api/auth/me").then((result) => setSession(result.ok ? "authenticated" : "anonymous")); };
    refresh();
    window.addEventListener(SESSION_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(SESSION_CHANGED_EVENT, refresh);
  }, []);

  useEffect(() => {
    const listener = () => beginFileSelection();
    window.addEventListener(HOME_SCAN_EVENT, listener);
    return () => window.removeEventListener(HOME_SCAN_EVENT, listener);
  }, [beginFileSelection]);

  useEffect(() => {
    const handleHomepageScanLink = (event: MouseEvent) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!link) return;
      if (link.getAttribute("href") !== "#home-workbench") return;
      event.preventDefault();
      beginFileSelection();
    };
    document.addEventListener("click", handleHomepageScanLink, true);
    return () => document.removeEventListener("click", handleHomepageScanLink, true);
  }, [beginFileSelection, session, startUrl]);

  useEffect(() => {
    const handleHashStart = () => {
      if (session !== "checking" && window.location.hash === "#home-workbench") beginFileSelection();
    };
    handleHashStart();
    window.addEventListener("hashchange", handleHashStart);
    return () => window.removeEventListener("hashchange", handleHashStart);
  }, [beginFileSelection, session]);

  const startPreflight = useCallback(async (file: File) => {
    preflightAbort.current?.abort();
    const generation = ++preflightGeneration.current;
    const controller = new AbortController();
    preflightAbort.current = controller;
    currentFile.current = file;
    setPendingFile(file);
    setPreflight(null);
    setRecognitionOptions([]);
    setRecognitionMode(null);
    setRecognitionError(null);
    setMusicXml(null);
    setConnectionError(false);
    setScoreId(null);
    setJob(null);
    setScoreTitle(file.name.replace(/\.[^.]+$/u, ""));
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["pdf", "png", "jpg", "jpeg", "webp", "tif", "tiff"].includes(extension)) {
      setPreflightState("failed");
      setRecognitionError(copy.invalidFile);
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setPreflightState("failed");
      setRecognitionError(preflightCopy.fileTooLarge);
      return;
    }
    setPreflightState("checking");
    const formData = new FormData();
    formData.append("file", file);
    const timeout = window.setTimeout(() => {
      if (generation !== preflightGeneration.current) return;
      setPreflightState("failed");
      setRecognitionError(preflightCopy.failed);
      controller.abort();
    }, 30_000);
    try {
      const [response, optionsResult] = await Promise.all([
        fetch(`${API_BASE_URL}/api/scores/import/omr/preflight`, { method: "POST", body: formData, credentials: "include", signal: controller.signal }),
        apiRequest<RecognitionOptionsPayload>("/api/scores/recognition-options", { signal: controller.signal }),
      ]);
      const payload = await response.json() as { preflight?: ScoreStructurePreflight; error?: string; code?: string };
      if (controller.signal.aborted || generation !== preflightGeneration.current) return;
      if (response.status === 401 || (!optionsResult.ok && optionsResult.status === 401)) {
        waitingForLogin.current = file;
        setSession("anonymous");
        setPreflightState("idle");
        flow.signIn();
        return;
      }
      if (!response.ok || !payload.preflight || !optionsResult.ok) {
        setPreflightState("failed");
        setRecognitionError(localizeApiError({ error: payload.error ?? (!optionsResult.ok ? optionsResult.error : preflightCopy.failed), status: response.status, code: payload.code }, locale));
        return;
      }
      const result = payload.preflight;
      if (result.schemaVersion !== 1 || !["simple", "complex", "uncertain"].includes(result.recommendation) || !Array.isArray(result.pages) || typeof result.complete !== "boolean" || !Array.isArray(result.reasonCodes) || !Array.isArray(optionsResult.data.options)) {
        setPreflightState("failed");
        setRecognitionError(preflightCopy.failed);
        return;
      }
      setPreflight(result);
      setRecognitionOptions(optionsResult.data.options);
      setRecognitionMode(result.complete && result.recommendation !== "uncertain" ? result.recommendation : null);
      setPreflightState("ready");
    } catch {
      if (controller.signal.aborted || generation !== preflightGeneration.current) return;
      setPreflightState("failed");
      setRecognitionError(preflightCopy.failed);
    } finally {
      window.clearTimeout(timeout);
    }
  }, [copy.invalidFile, flow.signIn, locale, preflightCopy.failed, preflightCopy.fileTooLarge]);

  useEffect(() => () => {
    preflightAbort.current?.abort();
    ++preflightGeneration.current;
    importRequest.current?.abort();
  }, []);

  const startUpload = useCallback((file: File, chosenMode: ScoreRecognitionMode, creditCost: number) => {
    setRecognitionError(null);
    setMusicXml(null);
    setScoreId(null);
    setScoreTitle(file.name.replace(/\.[^.]+$/u, ""));
    setJob(null);
    setUploadProgress(0);
    setSubmittedMode(chosenMode);

    if (preflight?.recognitionSupport?.supported === false) return;
    const formData = new FormData();
    formData.append("file", file);
    const xhr = new XMLHttpRequest();
    importRequest.current = xhr;
    const params = new URLSearchParams({ recognitionMode: chosenMode, expectedCreditCost: String(creditCost) });
    xhr.open("POST", `${API_BASE_URL}/api/scores/import/omr?${params}`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setUploadProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };
    const release = () => { submissionLock.current = false; setConfirming(false); setUploadProgress(null); importRequest.current = null; };
    xhr.onerror = () => { release(); setRecognitionError(copy.uploadFailed); };
    xhr.onabort = release;
    xhr.onload = () => {
      release();
      let payload: OmrImportPayload | { error?: string } | null = null;
      try { payload = JSON.parse(xhr.responseText || "null") as OmrImportPayload | { error?: string } | null; } catch { payload = null; }
      if (xhr.status === 401) {
        setSession("anonymous");
        waitingForLogin.current = file;
        setPreflightState("idle");
        setPreflight(null);
        setRecognitionMode(null);
        flow.signIn();
        return;
      }
      if (xhr.status === 409 && payload && "code" in payload && payload.code === "OMR_PRICE_CHANGED") {
        if ("options" in payload && Array.isArray(payload.options)) setRecognitionOptions(payload.options as ScoreRecognitionOption[]);
        setRecognitionError(preflightCopy.priceChanged);
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300 || !payload || !("score" in payload) || !("job" in payload)) {
        setRecognitionError(localizeApiError({ error: apiErrorOrFallback(payload && "error" in payload ? payload.error : undefined, copy.uploadFailed), status: xhr.status, code: payload && "code" in payload && typeof payload.code === "string" ? payload.code : undefined }, locale));
        return;
      }
      setScoreId(payload.score.id);
      setScoreTitle(payload.score.title);
      setJob(payload.job);
      setPendingFile(null);
      currentFile.current = null;
    };
    try { xhr.send(formData); } catch { release(); setRecognitionError(copy.uploadFailed); }
  }, [copy.uploadFailed, flow.signIn, locale, preflightCopy.priceChanged, preflight]);

  const confirmRecognition = async () => {
    if (preflight?.recognitionSupport?.supported === false) return;
    const file = currentFile.current;
    const selected = recognitionOptions.find(option => option.mode === recognitionMode);
    if (submissionLock.current || !file || preflightState !== "ready" || !preflight || !selected?.canSubmit || !recognitionMode) return;
    submissionLock.current = true;
    setConfirming(true);
    setRecognitionError(null);
    try {
      const fresh = await apiRequest<RecognitionOptionsPayload>("/api/scores/recognition-options", { signal: AbortSignal.timeout(15_000) });
      if (!fresh.ok) {
        setRecognitionError(localizeApiError(fresh, locale));
        return;
      }
      const latest = fresh.data.options.find(option => option.mode === recognitionMode);
      setRecognitionOptions(fresh.data.options);
      if (!latest?.canSubmit) { setRecognitionError(preflightCopy.noCredit); return; }
      if (latest.creditCost !== selected.creditCost) { setRecognitionError(preflightCopy.priceChanged); return; }
      if (currentFile.current !== file) return;
      startUpload(file, recognitionMode, latest.creditCost);
    } catch {
      setRecognitionError(copy.uploadFailed);
    } finally {
      if (!importRequest.current) { submissionLock.current = false; setConfirming(false); }
    }
  };

  useEffect(() => {
    if (!scoreId || job?.status === "failed" || job?.status === "cancelled" || (job?.status === "completed" && musicXml)) return;
    let active = true;
    let refreshing = false;
    const refresh = async () => {
      const [scoreResult, jobsResult] = await Promise.all([
        apiRequest<ScorePayload>(`/api/scores/${scoreId}`),
        apiRequest<JobPayload>(`/api/scores/${scoreId}/jobs`),
      ]);
      if (!active) return;
      if (!scoreResult.ok || !jobsResult.ok) {
        setConnectionError(true);
        setRecognitionError(apiErrorOrFallback(!scoreResult.ok ? scoreResult.error : jobsResult.ok ? undefined : jobsResult.error, copy.uploadFailed));
        return;
      }
      const latestJob = jobsResult.data.jobs[0] ?? null;
      setConnectionError(false); setRecognitionError(null);
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
    const tick = () => { if (!refreshing) { refreshing = true; void refresh().finally(() => { refreshing = false; }); } };
    tick();
    const timer = window.setInterval(tick, 3_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [copy.uploadFailed, job?.status, musicXml, scoreId]);

  useEffect(() => {
    if (session === "authenticated" && waitingForLogin.current) {
      const file = waitingForLogin.current;
      waitingForLogin.current = null;
      void startPreflight(file);
    }
  }, [session, startPreflight]);

  async function retrySavedScore() {
    if (!scoreId || !job || submissionLock.current || retrying) return;
    submissionLock.current = true; setRetrying(true); setRecognitionError(null);
    try {
      const result = await apiRequest<{ job: JobPayload["jobs"][number] }>(`/api/scores/${scoreId}/jobs/${job.id}/retry`, { method: "POST" });
      if (result.ok) { setJob(result.data.job); setConnectionError(false); }
      else setRecognitionError(localizeApiError(result, locale));
    } finally { submissionLock.current = false; setRetrying(false); }
  }

  function acceptFile(file: File | undefined) {
    if (!file || submissionLock.current || uploadProgress !== null || job?.status === "queued" || job?.status === "processing") return;
    if (session !== "authenticated") {
      preflightAbort.current?.abort();
      ++preflightGeneration.current;
      currentFile.current = file;
      setPendingFile(file);
      setPreflightState("idle");
      setPreflight(null);
      setRecognitionMode(null);
      waitingForLogin.current = file;
      flow.signIn();
      return;
    }
    void startPreflight(file);
  }

  const jobLabel = job ? copy[job.status] : null;
  const busy = confirming || retrying || uploadProgress !== null || job?.status === "queued" || job?.status === "processing";
  const chosenOption = recognitionOptions.find(option => option.mode === recognitionMode);

  return (
    <div id="home-workbench" className={styles.workbench} aria-label={copy.workbenchLabel}>
      <input ref={fileInputRef} className={styles.visuallyHidden} type="file" accept={acceptedScoreFiles} tabIndex={-1} aria-hidden="true" onChange={(event) => acceptFile(event.target.files?.[0])} />
      <div className={styles.workbenchHeading}><span><SparkIcon width={16} height={16} />{copy.workbenchLabel}</span><em>{copy.workbenchBadge}</em></div>

      <div className={styles.modeTabs} role="tablist" aria-label={copy.taskTypeLabel}>
        {modes.map((item) => <button key={item.id} id={`home-workbench-tab-${item.id}`} type="button" role="tab" aria-controls="home-workbench-panel" aria-selected={item.id === mode} tabIndex={item.id === mode ? 0 : -1} className={item.id === mode ? styles.activeTab : undefined} onClick={() => setMode(item.id)}>{item.label}{item.experimental ? <small>{copy.experimentalLabel}</small> : null}</button>)}
      </div>

      <div id="home-workbench-panel" className={styles.workbenchPanel} role="tabpanel" aria-labelledby={`home-workbench-tab-${mode}`}>
        {mode === "recognize" ? (
          <button type="button" className={styles.dropZone} disabled={busy} onClick={beginFileSelection} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); acceptFile(event.dataTransfer.files?.[0]); }}>
            <span className={styles.uploadIcon}><UploadIcon width={24} height={24} /></span><strong>{activeMode.title}</strong><p>{activeMode.body}</p><span className={styles.formatList} aria-label={copy.supportedFormatsLabel}>{activeMode.formats.map((format) => <i key={format}>{format}</i>)}</span>
          </button>
        ) : (
          <a className={styles.dropZone} href={localizePublicHref(activeMode.href, locale)}><span className={styles.uploadIcon}><UploadIcon width={24} height={24} /></span><strong>{activeMode.title}</strong><p>{activeMode.body}</p><span className={styles.formatList}>{activeMode.formats.map((format) => <i key={format}>{format}</i>)}</span></a>
        )}

        {mode === "recognize" ? <button type="button" className={styles.workbenchAction} onClick={beginFileSelection} disabled={busy}>{activeMode.action}<ArrowNorthEastIcon width={16} height={16} /></button> : <a className={styles.workbenchAction} href={localizePublicHref(activeMode.href, locale)}>{activeMode.action}<ArrowNorthEastIcon width={16} height={16} /></a>}

        {mode === "recognize" && pendingFile ? <section className={`${styles.recognitionPanel} ${styles.preflightPanel}`} aria-label={preflightCopy.title} data-score-preflight={preflightState} aria-busy={preflightState === "checking"}>
          <strong>{preflightCopy.title}</strong><span className={styles.preflightFile}>{pendingFile.name}</span><p>{preflightCopy.freeBody}</p>
          {preflightState === "checking" ? <div role="status"><p>{preflightCopy.checking}</p><progress aria-label={preflightCopy.checking} /><p>{progressCopy.preflightBody}</p></div> : null}
          {preflightState === "failed" ? <><p>{preflightCopy.failed}</p><button type="button" className={styles.preflightRetry} onClick={() => void startPreflight(pendingFile)}>{preflightCopy.retry}</button></> : null}
          {preflightState === "ready" && preflight ? <>
            <strong role="status">{!preflight.complete || preflight.recommendation === "uncertain" ? preflightCopy.recommendationUncertain : preflight.recommendation === "simple" ? preflightCopy.recommendedSimple : preflightCopy.recommendedComplex}</strong>
            <p>{formatMessage(preflightCopy.summary, { pages: formatNumber(preflight.sourcePageCount, locale), analyzed: formatNumber(preflight.pagesAnalyzed, locale), staves: formatNumber(Math.max(0, ...preflight.pages.map(page => page.maxStavesPerSystem)), locale), systems: formatNumber(preflight.pages.reduce((sum, page) => sum + page.systemCount, 0), locale) })}</p>
            {!preflight.complete ? <p>{preflightCopy.incomplete}</p> : null}
            {preflight.recognitionSupport ? <p role={preflight.recognitionSupport.supported ? "status" : "alert"}>{getScoreRecognitionSupportMessage(locale, preflight.recognitionSupport.code)}</p> : null}
            {preflight.reasonCodes.length ? <ul>{Array.from(new Set(preflight.reasonCodes.map(code => preflightCopy.reasonStrings[code] ?? preflightCopy.uncertainStructure))).map(reason => <li key={reason}>{reason}</li>)}</ul> : null}
            {!preflight.complete || preflight.recommendation === "uncertain" ? <p>{preflightCopy.manualChoice}</p> : null}
            <fieldset className={styles.preflightModes} disabled={busy}><legend>{preflightCopy.chooseMode}</legend>{(["simple", "complex"] as const).map(optionMode => {
              const option = recognitionOptions.find(item => item.mode === optionMode);
              return <label key={optionMode}><input type="radio" name="home-recognition-mode" value={optionMode} checked={recognitionMode === optionMode} onChange={() => { setRecognitionMode(optionMode); setRecognitionError(null); }} /><span><strong>{optionMode === "simple" ? preflightCopy.simpleTitle : preflightCopy.complexTitle}</strong><small>{option ? formatMessage(preflightCopy.price, { credits: formatNumber(option.creditCost, locale) }) : preflightCopy.notReady}</small>{option && !option.canSubmit ? <small>{preflightCopy.noCredit}</small> : null}</span></label>;
            })}</fieldset>
            <p>{preflightCopy.selectedFilePreserved}</p>
          </> : null}
          <button type="button" className={styles.workbenchAction} data-confirm-recognition disabled={busy || preflightState !== "ready" || preflight?.recognitionSupport?.supported === false || !chosenOption?.canSubmit} onClick={() => void confirmRecognition()}>{chosenOption && recognitionMode ? formatMessage(preflightCopy.confirmRecognition, { mode: recognitionMode === "simple" ? preflightCopy.simpleTitle : preflightCopy.complexTitle, credits: formatNumber(chosenOption.creditCost, locale) }) : preflightCopy.notReady}<ArrowNorthEastIcon width={16} height={16} /></button>
        </section> : null}

        {mode === "recognize" && (uploadProgress !== null || job || recognitionError) ? (
          <section className={styles.recognitionPanel} aria-live="polite">
            <div className={styles.recognitionHeading}><div><small>{copy.candidateTitle}</small><strong>{scoreTitle ?? activeMode.title}</strong></div><span className={recognitionError && !connectionError ? styles.statusError : job?.status === "completed" ? styles.statusDone : styles.statusWorking}>{recognitionError && !connectionError ? copy.failed : uploadProgress !== null ? `${copy.uploading} · ${uploadProgress}%` : jobLabel}</span></div>
            {uploadProgress !== null ? <div role="status"><strong>{progressCopy.uploadTitle}</strong><progress max={100} value={uploadProgress} aria-label={progressCopy.uploadTitle} style={{ width: "100%" }} /><p>{progressCopy.uploadBody}</p></div> : null}
            {job && ["queued", "processing"].includes(job.status) ? <ScoreProcessingPanel job={job} copy={progressCopy} locale={locale} connectionError={connectionError} /> : null}
            {job && ["failed", "cancelled"].includes(job.status) ? <div role="alert"><p className={styles.recognitionError}><strong>{getScoreProcessingFailureMessages(locale, job.errorMessage).reason}</strong></p><p>{getScoreProcessingFailureMessages(locale, job.errorMessage).recovery}</p>{job.errorMessage ? <details><summary>{preflightCopy.title}</summary><p>{job.errorMessage}</p></details> : null}</div> : recognitionError && !connectionError ? <p className={styles.recognitionError} role="alert">{recognitionError}</p> : null}
            {job?.status === "completed" ? <p>{copy.candidateBody}</p> : null}
            {job?.status === "completed" ? <HomeCandidatePreview musicXml={musicXml} loadingLabel={copy.previewLoading} /> : null}
            <div className={styles.recognitionActions}>{scoreId ? <a href={getAppScoreUrl(scoreId, locale, submittedMode)}>{copy.openProject}<ArrowNorthEastIcon width={15} height={15} /></a> : null}{!busy ? <button type="button" onClick={() => job && ["failed", "cancelled"].includes(job.status) ? void retrySavedScore() : beginFileSelection()}>{job && ["failed", "cancelled"].includes(job.status) ? savedOriginalRetryLabels[locale] : copy.retry}</button> : null}</div>
          </section>
        ) : null}
      </div>

      <nav className={styles.toolRail} aria-label={copy.availableToolsLabel}>{toolDefinitions.map((tool, index) => {
        if (!audioAvailable && tool.href === "/audio-to-score") return null;
        const [title, body] = copy.tools[index];
        return <a key={tool.href} href={localizePublicHref(tool.href, locale)}><span aria-hidden="true">{tool.icon}</span><strong>{title}</strong><small>{body}</small><ArrowNorthEastIcon width={17} height={17} /></a>;
      })}</nav>
      <p className={styles.workbenchStatus}><CheckSealIcon width={15} height={15} />{session === "checking" ? copy.checking : session === "authenticated" ? copy.signedIn : copy.signInFirst}</p>


    </div>
  );
}
