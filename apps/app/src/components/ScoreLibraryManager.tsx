"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatDateTime, formatMessage, formatNumber, getScorePreflightMessages, getScoreProcessingMessages, localizeBrowserApiError, type SupportedLocale } from "@score/i18n";
import { APP_ROUTES, getSingleScorePassCopy } from "@score/shared";
import { API_BASE_URL, apiRequest } from "../lib/api";
import { trackFunnelEvent } from "../lib/analytics";
import { getStoredToken, subscribeAuthChanges } from "../lib/auth-storage";
import { useFlowMessages } from "../lib/flow-messages/client";
import { currentWorkPath, upgradePath } from "../lib/flow-return";
import { claimGuestImportDraft, clearImportDraft, detectScoreImport, loadImportDraft, saveGuestImportDraft, saveImportDraft } from "../lib/import-draft";
import { useAppAuthModal } from "./AppAuthModal";
import type { ScoreEntryMessages } from "../lib/score-entry-messages/types";
import { useAppLocale } from "./AppLocaleProvider";
import { RecognitionModeCards } from "./RecognitionModeCards";
import { OneScorePassUpsell } from "./OneScorePassUpsell";
import { ScoreRecognitionPreflight } from "./ScoreRecognitionPreflight";
import { canConfirmScoreRecognition, defaultRecognitionMode, isFreeSimpleScanPath, parseScoreRecognitionPreflight, PreflightRequestGuard, type ScoreRecognitionPreflightState } from "../lib/score-recognition-preflight";
import { getEnsembleMessages } from "../lib/ensemble-messages";
import { recognitionOption, type RecognitionMode, type RecognitionOptions } from "../lib/recognition-options";
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


type AccessUser = { id: string; entitlement: { status: string }; freeTrial: { available: boolean }; scorePasses?: Array<{ documentId: string | null }> };
export type ScoreImportView = "library" | "musicxml" | "backup" | "midi" | "scan" | "audio" | "jianpu";
export function ScoreLibraryManager({ view = "library", copy, recognitionMode = "simple" }: { view?: ScoreImportView; copy: ScoreEntryMessages["library"]; recognitionMode?: RecognitionMode }) {
  const { locale } = useAppLocale();
  const recognitionCopy = getEnsembleMessages(locale);
  const preflightCopy = getScorePreflightMessages(locale);
  const flow = useFlowMessages();
  const router = useRouter();
  const signIn = useAppAuthModal();
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setToken(getStoredToken());
    sync();
    return subscribeAuthChanges(sync);
  }, []);
  const audioAvailable = process.env.NEXT_PUBLIC_AUDIO_TRANSCRIPTION_AVAILABLE === "true";
  const [scores, setScores] = useState<ScoreDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<AccessUser | null>(null);
  const [mode, setMode] = useState<"file" | "jianpu">(view === "jianpu" ? "jianpu" : "file");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [jianpuText, setJianpuText] = useState("1=C\n4/4\n1 2 3 4 | 5 - 5 - |");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [draftFailed, setDraftFailed] = useState(false);
  const [accessAttempt, setAccessAttempt] = useState(0);
  const [recognitionOptions, setRecognitionOptions] = useState<RecognitionOptions | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteAttempt, setQuoteAttempt] = useState(0);
  const [selectedRecognitionMode, setSelectedRecognitionMode] = useState<RecognitionMode | null>(recognitionMode);
  const [preflight, setPreflight] = useState<ScoreRecognitionPreflightState>({ status: "idle", file: null });
  const [preflightAttempt, setPreflightAttempt] = useState(0);
  const [showAdvancedModes, setShowAdvancedModes] = useState(false);
  const preflightGuard = useRef(new PreflightRequestGuard());
  const submitLock = useRef(false);
  const edited = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true;
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    void apiRequest<{ scores: ScoreDocument[] }>("/api/scores", { headers }).then(result => {
      if (!active) return;
      setLoading(false);
      if (result.ok) setScores(result.data.scores);
      else if (result.status === 401) { setScores([]); setFailed(false); }
      else { setStatus(result.error); setFailed(true); }
    });
    void apiRequest<{ user: AccessUser }>("/api/auth/me", { headers }).then(async result => {
      if (!active) return;
      if (!result.ok) {
        if (result.status === 401) { setAccess(null); setFailed(false); setStatus(null); return; }
        setStatus(result.error); setFailed(true); return;
      }
      setAccess(result.data.user);
      const draft = (await loadImportDraft(result.data.user.id)) ?? (await claimGuestImportDraft(result.data.user.id));
      const draftKind = draft?.file ? detectScoreImport(draft.file.name) : null;
      const supportedDraft = recognitionMode === "simple" || (draft?.mode === "file" && ["omr", "musicxml", "score-json"].includes(draftKind ?? ""));
      if (active && draft && supportedDraft && !edited.current) {
        setFile(draft.file); setTitle(draft.title); setJianpuText(draft.text); setMode(draft.mode);
        setStatus(flow.savedFile); setFailed(false);
      }
    });
    return () => { active = false; };
  }, [token, accessAttempt, flow.savedFile, recognitionMode]);
  useEffect(() => {
    let active = true;
    setQuoteLoading(true); setQuoteError(null);
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    void apiRequest<RecognitionOptions>("/api/scores/recognition-options", { headers }).then(result => {
      if (!active) return;
      setQuoteLoading(false);
      if (result.ok) setRecognitionOptions(result.data);
      else if (result.status === 401) { setRecognitionOptions(null); setQuoteError(null); }
      else { setRecognitionOptions(null); setQuoteError(result.error); }
    });
    return () => { active = false; };
  }, [token, accessAttempt, quoteAttempt]);
  const kind = file ? detectScoreImport(file.name) : null;
  useEffect(() => {
    if (mode !== "file" || kind !== "omr" || !file || !access) {
      preflightGuard.current.invalidate();
      setPreflight({ status: "idle", file: null });
      return;
    }
    const request = preflightGuard.current.start();
    setPreflight({ status: "checking", file }); setSelectedRecognitionMode(null);
    const timeout = setTimeout(() => {
      if (!preflightGuard.current.isCurrent(request)) return;
      setPreflight({ status: "failed", file, error: preflightCopy.failed });
      preflightGuard.current.invalidate();
    }, 30_000);
    const form = new FormData(); form.append("file", file);
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    void (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/scores/import/omr/preflight`, {
          method: "POST", headers, body: form, credentials: "include", cache: "no-store", signal: request.signal,
        });
        const data = await response.json().catch(() => null) as { preflight?: unknown; error?: string; code?: string } | null;
        if (!preflightGuard.current.isCurrent(request)) return;
        if (!response.ok) throw new Error(localizeBrowserApiError({ error: data?.error ?? preflightCopy.failed, code: data?.code, status: response.status }));
        const result = parseScoreRecognitionPreflight(data?.preflight);
        if (!result) throw new Error(preflightCopy.failed);
        setPreflight({ status: "ready", file, result });
        setSelectedRecognitionMode(defaultRecognitionMode(result));
        // Complex recommendation keeps the mode picker visible; simple/uncertain stays one-tap.
        setShowAdvancedModes(result.recommendation === "complex");
      } catch (error) {
        if (!preflightGuard.current.isCurrent(request)) return;
        setPreflight({ status: "failed", file, error: error instanceof Error ? error.message : preflightCopy.failed });
      } finally {
        clearTimeout(timeout);
      }
    })();
    return () => { clearTimeout(timeout); preflightGuard.current.invalidate(); };
  }, [file, kind, mode, access?.id, token, preflightAttempt, preflightCopy.failed]);
  const recognitionQuote = selectedRecognitionMode ? recognitionOption(recognitionOptions, selectedRecognitionMode) : null;
  const simpleQuote = recognitionOption(recognitionOptions, "simple");
  const recognitionReady = canConfirmScoreRecognition({ file, preflight, selectedMode: selectedRecognitionMode, quote: recognitionQuote, quoteLoading, quoteError });
  const freeSimplePath = Boolean(access) && kind === "omr" && isFreeSimpleScanPath({
    freeTrialAvailable: access?.freeTrial.available === true,
    selectedMode: selectedRecognitionMode,
    simpleQuote,
    preflight,
  });
  const showModePicker = mode === "file" && kind === "omr" && Boolean(access) && preflight.status === "ready" && (!freeSimplePath || showAdvancedModes);
  const hasUnusedPass = access?.scorePasses?.some(p => !p.documentId) ?? false;
  const canImport = mode === "file" && kind === "omr" ? recognitionQuote?.canSubmit === true : access?.entitlement.status === "active";
  function chooseFile(selected: File | null) {
    preflightGuard.current.invalidate(); setPreflight({ status: "idle", file: null }); setSelectedRecognitionMode(null); setShowAdvancedModes(false);
    edited.current = true; setStatus(null); setFailed(false); setDraftFailed(false);
    if (selected && (!detectScoreImport(selected.name) || (recognitionMode === "complex" && !["omr", "musicxml", "score-json"].includes(detectScoreImport(selected.name) ?? "")) || (detectScoreImport(selected.name) === "audio" && !audioAvailable))) {
      setFile(null); setStatus(flow.unsupported); setFailed(true); return;
    }
    if (selected && selected.size > 20 * 1024 * 1024) { setFile(null); setStatus(flow.tooLarge); setFailed(true); return; }
    setFile(selected);
  }
  async function saveDraftBeforePass() {
    if (!access) return false;
    try {
      await saveImportDraft({ ownerId: access.id, file, title, text: jianpuText, mode, createdAt: Date.now() });
      return true;
    } catch {
      setDraftFailed(true); setStatus(flow.fileLost); setFailed(true);
      return false;
    }
  }
  async function upgrade() {
    if (!access || submitLock.current) return;
    // Canonical funnel step 6 (see docs/operations/google-seo-funnel-runbook.md).
    // upgrade_click for this path is tracked by OneScorePassUpsell as score_import_subscription.
    submitLock.current = true; setBusy(true);
    try {
      await saveImportDraft({ ownerId: access.id, file, title, text: jianpuText, mode, createdAt: Date.now() });
      router.push(upgradePath(currentWorkPath()));
    } catch {
      setDraftFailed(true); setStatus(flow.fileLost); setFailed(true);
    } finally { submitLock.current = false; setBusy(false); }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    if (!access) {
      if (mode === "file" && !file) return;
      if (mode === "jianpu" && !jianpuText.trim()) return;
      try {
        await saveGuestImportDraft({ file, title, text: jianpuText, mode, createdAt: Date.now() });
      } catch {
        setDraftFailed(true); setStatus(flow.fileLost); setFailed(true); return;
      }
      setStatus(copy.signInFirst); setFailed(false);
      signIn("login", () => setAccessAttempt(n => n + 1));
      return;
    }
    const isRecognition = mode === "file" && kind === "omr";
    if (isRecognition) {
      const submitter = (event.nativeEvent as SubmitEvent).submitter;
      if (!recognitionReady || !(submitter instanceof HTMLElement) || submitter.dataset.recognitionConfirm !== "true") return;
    } else if (!canImport) { await upgrade(); return; }
    if (mode === "file" && (!file || !kind)) return;
    if (mode === "jianpu" && !jianpuText.trim()) return;
    submitLock.current = true; setBusy(true); setStatus(null); setFailed(false);
    try {
      let imported: ScoreDocument;
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      let confirmedQuote = recognitionQuote;
      if (isRecognition) {
        const quoteController = new AbortController();
        const quoteTimeout = setTimeout(() => quoteController.abort(), 15_000);
        let fresh: Awaited<ReturnType<typeof apiRequest<RecognitionOptions>>>;
        try {
          fresh = await apiRequest<RecognitionOptions>("/api/scores/recognition-options", { headers, signal: quoteController.signal });
        } finally { clearTimeout(quoteTimeout); }
        if (!fresh.ok) { setQuoteError(fresh.error); throw new Error(fresh.error); }
        const freshQuote = selectedRecognitionMode ? recognitionOption(fresh.data, selectedRecognitionMode) : null;
        setRecognitionOptions(fresh.data); setQuoteError(null);
        if (!freshQuote?.canSubmit) throw new Error(preflightCopy.noCredit);
        if (freshQuote.creditCost !== confirmedQuote?.creditCost) {
          setStatus(preflightCopy.priceChanged); setFailed(false); submitLock.current = false; setBusy(false); return;
        }
        confirmedQuote = freshQuote;
      }
      if (mode === "jianpu") {
        const result = await apiRequest<{ score: ScoreDocument }>("/api/scores/import/jianpu", {
          method: "POST", headers, body: JSON.stringify({ title, text: jianpuText }),
        });
        if (!result.ok) throw new Error(result.error);
        imported = result.data.score;
      } else {
        const form = new FormData(); form.append("file", file!);
        const recognitionQuery = kind === "omr" ? `?recognitionMode=${selectedRecognitionMode}&expectedCreditCost=${confirmedQuote!.creditCost}` : "";
        const response = await fetch(`${API_BASE_URL}/api/scores/import/${kind}${recognitionQuery}`, { method: "POST", headers, body: form, credentials: "include", cache: "no-store" });
        const data = await response.json();
        if (data.code === "OMR_PRICE_CHANGED") {
          if (Array.isArray(data.options)) setRecognitionOptions(data as RecognitionOptions);
          else setQuoteAttempt(n => n + 1);
          throw new Error(preflightCopy.priceChanged);
        }
        if (!response.ok) throw new Error(data.error || copy.musicxml.importFailed);
        imported = data.score;
        // Fires for every OMR creation; free_trial=true marks the free-plan step of the funnel, false means a paid/active account.
        if (kind === "omr") trackFunnelEvent("free_omr_created", { free_trial: access.entitlement.status !== "active", source_type: file!.name.toLowerCase().endsWith(".pdf") ? "pdf" : "image", recognition_mode: selectedRecognitionMode ?? "unknown" });
      }
      await clearImportDraft(access.id);
      const targetMode = isRecognition ? selectedRecognitionMode : recognitionMode;
      router.push(`${APP_ROUTES.scores}/${encodeURIComponent(imported.id)}${targetMode === "complex" ? "/ensemble" : ""}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : copy.musicxml.importFailed); setFailed(true);
      submitLock.current = false; setBusy(false);
    }
  }
  return <div className="page-stack flow-library">
    <section id="free-scan" className="surface-panel stack-lg flow-import">
      <h2 className="card-title">{flow.importTitle}</h2>
      <div className="button-row" role="group" aria-label={flow.importTitle}>
        <button type="button" disabled={busy} className={`button ${mode === "file" ? "button-primary" : "button-secondary"}`} aria-pressed={mode === "file"} onClick={() => { edited.current = true; if (mode !== "file") { preflightGuard.current.invalidate(); setPreflight({ status: "idle", file: null }); } setMode("file"); }}>{flow.chooseFile}</button>
        {recognitionMode === "simple" ? <button type="button" disabled={busy} className={`button ${mode === "jianpu" ? "button-primary" : "button-secondary"}`} aria-pressed={mode === "jianpu"} onClick={() => { edited.current = true; preflightGuard.current.invalidate(); setPreflight({ status: "idle", file: null }); setSelectedRecognitionMode(null); setMode("jianpu"); }}>{copy.jianpu.title}</button> : null}
      </div>
      <form onSubmit={submit} className="stack-lg" onKeyDown={event => {
        if (mode !== "file" || kind !== "omr" || event.key !== "Enter" || event.nativeEvent.isComposing) return;
        const target = event.target as HTMLElement;
        // Native Enter on a control such as a mode radio must not implicitly confirm a paid recognition.
        if (!target.closest('button, a, [role="button"]')) event.preventDefault();
      }}>
        {mode === "file" ? <>
          <button type="button" className="file-dropzone" disabled={busy} onClick={() => inputRef.current?.click()}>
            <span className="stack-sm"><strong className="dropzone-title">{file?.name || flow.chooseFile}</strong><span className="dropzone-copy">{file ? formatSize(file.size, locale) : flow.formats}</span></span>
            {kind ? <span className="status-chip tone-cyan">{kind.toUpperCase()}</span> : null}
          </button>
          <input ref={inputRef} id="score-file-input" className="sr-only" type="file" aria-label={flow.chooseFile} accept={recognitionMode === "complex" ? ".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,.xml,.musicxml,.mxl,.json" : ".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,.xml,.musicxml,.mxl,.mid,.midi,.json" + (audioAvailable ? ",.wav,.mp3,.m4a,.aac,.flac,.ogg,.aif,.aiff" : "")} disabled={busy} onChange={e => { chooseFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
        </> : <>
          <label className="field-group"><span>{copy.jianpu.titleLabel}</span><input className="field-control" value={title} disabled={busy} onChange={e => { edited.current = true; setTitle(e.target.value); }} /></label>
          <label className="field-group"><span>{copy.jianpu.textLabel}</span><textarea className="field-control" rows={5} value={jianpuText} disabled={busy} onChange={e => { edited.current = true; setJianpuText(e.target.value); }} /></label>
        </>}
        {mode === "file" && kind === "omr" ? <>
          <ScoreRecognitionPreflight state={preflight} compact={freeSimplePath || (preflight.status === "checking" && Boolean(access?.freeTrial.available))} onRetry={() => setPreflightAttempt(n => n + 1)} />
          {showModePicker ? <RecognitionModeCards options={recognitionOptions} selected={selectedRecognitionMode ?? undefined} loading={quoteLoading} error={quoteError} disabled={busy || preflight.status !== "ready" || preflight.file !== file} onSelect={selected => { setSelectedRecognitionMode(selected); setStatus(null); }} onRetry={() => setQuoteAttempt(n => n + 1)} /> : null}
          {freeSimplePath && !showAdvancedModes ? <div className="stack-sm">
            <p className="helper-copy" data-recognition-quote="simple" data-free-simple-path="true">{preflightCopy.freeProjectPrice}</p>
            <button type="button" className="button button-tertiary" disabled={busy} onClick={() => setShowAdvancedModes(true)}>{preflightCopy.showModes}</button>
          </div> : null}
          {freeSimplePath && showAdvancedModes ? <button type="button" className="button button-tertiary" disabled={busy} onClick={() => { setShowAdvancedModes(false); setSelectedRecognitionMode("simple"); }}>{preflightCopy.hideModes}</button> : null}
          {!freeSimplePath && recognitionQuote ? <p className="helper-copy" data-recognition-quote={selectedRecognitionMode}>{recognitionQuote.canSubmit ? formatMessage(preflightCopy.price, { credits: formatNumber(recognitionQuote.creditCost, locale) }) : preflightCopy.noCredit}</p> : null}
        </> : mode === "file" && !file ? <p className="helper-copy">{preflightCopy.freeBody}</p> : null}
        {recognitionMode === "complex" ? <p className="helper-copy">{recognitionCopy.structuredImport}</p> : null}
        {access && access.entitlement.status !== "active" && (kind !== "omr" || selectedRecognitionMode) && !freeSimplePath ? <p className="helper-copy">{(kind === "omr" ? selectedRecognitionMode : recognitionMode) === "simple" && access.freeTrial.available ? copy.scan.freeBody : hasUnusedPass ? getSingleScorePassCopy(locale).paid : kind === "omr" && selectedRecognitionMode === "complex" ? preflightCopy.noCredit : copy.scan.exhaustedBody}</p> : null}
        <div className="button-row">
          <button className="button button-primary" type="submit" data-recognition-confirm={mode === "file" && kind === "omr" && access ? "true" : undefined} disabled={busy || (mode === "file" ? !file || (Boolean(access) && kind === "omr" && !recognitionReady) : !jianpuText.trim())}>{busy ? flow.processing : !access ? copy.signInFirst : mode === "file" && kind === "omr" ? recognitionReady ? (freeSimplePath ? preflightCopy.startRecognition : formatMessage(preflightCopy.confirmRecognition, { mode: selectedRecognitionMode === "simple" ? preflightCopy.simpleTitle : preflightCopy.complexTitle, credits: formatNumber(recognitionQuote!.creditCost, locale) })) : (preflight.status === "checking" ? preflightCopy.checking : preflightCopy.notReady) : canImport ? flow.start : flow.upgrade}</button>
          {mode === "file" && kind === "omr" && preflight.status === "ready" && recognitionQuote && !recognitionQuote.canSubmit ? <OneScorePassUpsell source="score_import" disabled={busy} beforeCheckout={saveDraftBeforePass} onSubscriptionClick={() => { void upgrade(); }} /> : null}
          {file && !busy && mode === "file" ? <button type="button" className="button button-secondary" onClick={() => chooseFile(null)}>{copy.common.clearSelection}</button> : null}
          {draftFailed ? <Link className="button button-secondary" href={upgradePath(currentWorkPath())} onClick={() => trackFunnelEvent("upgrade_click", { source: "score_import_draft_failed" })}>{flow.upgrade}</Link> : null}
          {!access && failed ? <button type="button" className="button button-secondary" onClick={() => setAccessAttempt(n => n + 1)}>{flow.retry}</button> : null}
        </div>
      </form>
      {busy && mode === "file" && kind === "omr" ? <div role="status" className="surface-panel stack-sm"><strong>{getScoreProcessingMessages(locale).uploadTitle}</strong><progress aria-label={getScoreProcessingMessages(locale).uploadTitle} style={{ width: "100%" }} /><p>{getScoreProcessingMessages(locale).uploadBody}</p></div> : null}
      {status ? <p className={`form-status ${failed ? "error" : "success"}`} role={failed ? "alert" : "status"}>{status}</p> : null}
    </section>
    <section className="surface-panel">
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
                  <Link href={`${APP_ROUTES.scores}/${score.id}/ensemble`} className="button button-secondary button-ghost">{recognitionCopy.ensembleTitle}</Link>
                </div>
              ))}
            </div>
          ) : null}
          <div className="button-row">
            <Link href="#free-scan" className="button button-primary">
              {copy.createNew}
            </Link>
          </div>
        </div> : null}


    </section>
  </div>;
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
