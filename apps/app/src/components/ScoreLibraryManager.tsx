"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatDateTime, formatMessage, formatNumber, localizeBrowserApiError, resolveRecognitionRequestFailure, type SupportedLocale } from "@score/i18n";
import { fetchScorePreflight, parseStagedPreflightMetadata, stagedScoreRecognitionBody, forgetStagedScorePreflight, getSingleScorePassCopy, readScoreTaskIntent, recognitionRejectionMessageKey, scorePreflightFileKey, scoreTaskDocumentPath, scoreTaskEntryPath, type ScoreTaskIntent } from "@score/shared";
import { ProcessingProgress, PhotoCornerEditor, RecognitionPlanSummary, RecognitionRejection, needsBigRecognitionLane, type PhotoCorners } from "@score/ui";
import { API_BASE_URL, apiRequest } from "../lib/api";
import { trackFunnelEvent } from "../lib/analytics";
import { getStoredToken, subscribeAuthChanges } from "../lib/auth-storage";
import { useFlowMessages } from "../lib/flow-messages/client";
import { currentWorkPath, upgradePath } from "../lib/flow-return";
import { clearImportDraft, detectScoreImport, GUEST_IMPORT_OWNER_ID, loadImportDraft, resumeImportDraft, saveGuestImportDraft, saveImportDraft } from "../lib/import-draft";
import { useAppAuthModal } from "./AppAuthModal";
import type { ScoreEntryMessages } from "../lib/score-entry-messages/types";
import { useAppLocale } from "./AppLocaleProvider";
import { RecognitionModeCards } from "./RecognitionModeCards";
import { OneScorePassUpsell } from "./OneScorePassUpsell";
import { ScoreRecognitionPreflight } from "./ScoreRecognitionPreflight";
import { canConfirmScoreRecognition, defaultRecognitionMode, isFreeSimpleScanPath, isScoreRecognitionRejected, parseScoreRecognitionPreflight, PreflightRequestGuard, type ScoreRecognitionPreflightState } from "../lib/score-recognition-preflight";
import { recognitionOption, type RecognitionMode, type RecognitionOptions } from "../lib/recognition-options";
import { boundedScoreTransfer, fetchScoreUpload, forgetUploadReceipt, getUploadReceipt, latestUploadReceipt, ScoreTransferError } from "../lib/score-transfer-request";
import { scoreTransferCopy, scoreGenerationError } from "../lib/score-transfer-messages/client";
import { uploadDraftCheckoutContext, uploadDraftCopy, uploadDraftPrepareKey, type UploadCheckoutDraft, type UploadCheckoutOrder } from "../lib/upload-draft-checkout";
import { isCreditUpgradeError, scoreCheckoutPath, saveContinuationNotice, type CheckoutContinuationResult } from "../lib/score-pass-checkout";
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
  const flow = useFlowMessages();
  const experience = flow.recognitionExperience;
  const recognitionCopy = flow.ensemble;
  const preflightCopy = flow.preflight;
  const stagedCopy = flow.stagedUpload;
  const router = useRouter();
  const signIn = useAppAuthModal();
  const taskCopy = flow.scoreTasks;
  const transferCopy = scoreTransferCopy(locale);
  const serverDraftCopy = uploadDraftCopy(locale);
  const draftFailure = (problem: { error?: string; code?: string; status?: number }) =>
    resolveRecognitionRequestFailure(experience, problem.code) ?? (["UPLOAD_DRAFT_NOT_FOUND", "CHECKOUT_SOURCE_NOT_FOUND", "STAGED_UPLOAD_EXPIRED", "STAGED_UPLOAD_NOT_FOUND", "STAGED_UPLOAD_CONSUMED"].includes(problem.code ?? "")
      ? serverDraftCopy.unavailable : problem.code === "CHECKOUT_NOT_READY" ? serverDraftCopy.waiting : localizeBrowserApiError(problem));
  const [taskIntent, setTaskIntent] = useState<ScoreTaskIntent | null>(null);
  const taskIntentRef = useRef<ScoreTaskIntent | null>(null);
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setToken(getStoredToken());
    sync();
    return subscribeAuthChanges(sync);
  }, []);
  const audioAvailable = process.env.NEXT_PUBLIC_AUDIO_TRANSCRIPTION_AVAILABLE === "true";
  const [scores, setScores] = useState<ScoreDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [slowRead, setSlowRead] = useState(false);
  const [access, setAccess] = useState<AccessUser | null>(null);
  const [mode, setMode] = useState<"file" | "jianpu">(view === "jianpu" ? "jianpu" : "file");
  const [file, setFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoCorners, setPhotoCorners] = useState<PhotoCorners | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
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
  const [preflightAttempt, setPreflightAttempt] = useState<string | number>(0);
  const [showAdvancedModes, setShowAdvancedModes] = useState(false);
  const preflightGuard = useRef(new PreflightRequestGuard());
  const preflightMessages = useRef({ locale, experience, failed: preflightCopy.failed, timeout: transferCopy.preflightTimeout, network: transferCopy.preflightNetwork });
  preflightMessages.current = { locale, experience, failed: preflightCopy.failed, timeout: transferCopy.preflightTimeout, network: transferCopy.preflightNetwork };
  const submitLock = useRef(false);
  const uploadAbort = useRef<AbortController | null>(null);
  const [uploadRecovery, setUploadRecovery] = useState<{ key: string; identity: string } | null>(null);
  const [serverDraft, setServerDraft] = useState<UploadCheckoutDraft | null>(null);
  const [draftOrder, setDraftOrder] = useState<UploadCheckoutOrder | null>(null);
  const [draftRestoreAttempt, setDraftRestoreAttempt] = useState(0);
  useEffect(() => {
    if (!access || !token) return;
    const query = new URLSearchParams(window.location.search);
    const id = query.get("uploadDraft");
    if (!id) return;
    let active = true;
    const orderId = query.get("checkoutOrderId");
    void apiRequest<{ draft: UploadCheckoutDraft; order?: UploadCheckoutOrder }>(`/api/scores/upload-drafts/${encodeURIComponent(id)}${orderId ? `?checkoutOrderId=${encodeURIComponent(orderId)}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(result => {
      if (!active) return;
      if (!result.ok) { setStatus(draftFailure(result)); setFailed(true); return; }
      setServerDraft(result.data.draft); setDraftOrder(result.data.order ?? null);
      edited.current = true;
      setSelectedRecognitionMode(result.data.draft.mode);
      const resumed = result.data.order?.resumeResult;
      setStatus(resumed?.error ? draftFailure(resumed) : (result.data.draft.taskId ? serverDraftCopy.queued : serverDraftCopy.ready));
      setFailed(Boolean(resumed?.error));
    });
    return () => { active = false; };
  }, [access?.id, token, draftRestoreAttempt, serverDraftCopy.unavailable, serverDraftCopy.ready, serverDraftCopy.queued]);
  useEffect(() => () => { uploadAbort.current?.abort(); }, [token, view]);
  useEffect(() => {
    if (!access) { setUploadRecovery(null); return; }
    const receipt = latestUploadReceipt(access.id);
    if (receipt) { setUploadRecovery(receipt); setStatus(transferCopy.uploadUnknown); setFailed(true); }
  }, [access?.id, transferCopy.uploadUnknown]);
  const edited = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const intent = readScoreTaskIntent(new URLSearchParams(window.location.search));
    taskIntentRef.current = intent;
    setTaskIntent(intent);
    if (intent?.task === "jianpu-input") setMode("jianpu");
  }, []);
  function restoreDraft(draft: Awaited<ReturnType<typeof loadImportDraft>>) {
    const draftKind = draft?.file ? detectScoreImport(draft.file.name) : null;
    const supportedDraft = recognitionMode === "simple" || (draft?.mode === "file" && ["omr", "musicxml", "score-json"].includes(draftKind ?? ""));
    if (!draft || !supportedDraft || edited.current) return;
    setFile(draft.file); setPhotoCorners((draft.photoCorners as PhotoCorners | null) ?? null); setTitle(draft.title); setJianpuText(draft.text); setMode(draft.mode);
    if (!taskIntentRef.current && draft.intent) {
      taskIntentRef.current = draft.intent;
      setTaskIntent(draft.intent);
      if (view === "library") window.history.replaceState(window.history.state, "", scoreTaskEntryPath(draft.intent));
    }
    const receipt = access ? latestUploadReceipt(access.id) : null;
    setStatus(receipt ? transferCopy.uploadUnknown : flow.savedFile); setFailed(Boolean(receipt));
  }
  useEffect(() => {
    // Signing in from the page header can remount the guest form before submit.
    // Keep edits in the existing draft store so that path retains the file too.
    if (token || access || !edited.current) return;
    if ((mode === "file" && !file) || (mode === "jianpu" && !jianpuText.trim())) {
      void clearImportDraft(GUEST_IMPORT_OWNER_ID);
      return;
    }
    void saveGuestImportDraft({ file, title, text: jianpuText, mode, createdAt: Date.now(), intent: taskIntent ?? undefined, photoCorners }).catch(() => {
      setDraftFailed(true); setStatus(flow.fileLost); setFailed(true);
    });
  }, [token, access, file, photoCorners, title, jianpuText, mode, taskIntent, flow.fileLost]);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true); setSlowRead(false);
    const slowTimer = window.setTimeout(() => { if (active) setSlowRead(true); }, 5_000);
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    void apiRequest<{ scores: ScoreDocument[] }>("/api/scores", { headers, signal: controller.signal }).then(result => {
      if (!active) return;
      clearTimeout(slowTimer);
      setLoading(false); setSlowRead(false);
      if (result.ok) setScores(result.data.scores);
      else if (result.status === 401) { setScores([]); setFailed(false); }
      else { setStatus(result.error); setFailed(true); }
    });
    void apiRequest<{ user: AccessUser }>("/api/auth/me", { headers, signal: controller.signal }).then(async result => {
      if (!active) return;
      if (!result.ok) {
        if (result.status === 401) {
          setAccess(null); setFailed(false); setStatus(null);
          const guest = await loadImportDraft(GUEST_IMPORT_OWNER_ID);
          if (active) restoreDraft(guest);
          return;
        }
        setStatus(result.error); setFailed(true); return;
      }
      setAccess(result.data.user);
      try {
        const draft = await resumeImportDraft(result.data.user.id);
        if (active) restoreDraft(draft);
      } catch {
        if (active) { setDraftFailed(true); setStatus(flow.fileLost); setFailed(true); }
      }
    });
    return () => { active = false; clearTimeout(slowTimer); controller.abort(); };
  }, [token, accessAttempt, flow.savedFile, flow.fileLost, recognitionMode, view]);
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
    if (mode !== "file" || kind !== "omr" || !file || !access || serverDraft || new URLSearchParams(window.location.search).has("uploadDraft")) {
      preflightGuard.current.invalidate();
      setPreflight({ status: "idle", file: null });
      return;
    }
    const request = preflightGuard.current.start();
    setPreflight({ status: "checking", file, uploadProgress: 0 }); setSelectedRecognitionMode(null);
    const waiting = setTimeout(() => {
      if (!preflightGuard.current.isCurrent(request)) return;
      setPreflight(current => current.status === "checking" ? { ...current, status: "waiting" } : current);
    }, 2_000);
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    void (async () => {
      try {
        const response = await fetchScorePreflight<{ preflight?: unknown; stagedUploadId?: string; stagedUploadExpiresAt?: string; error?: string; code?: string }>(`${API_BASE_URL}/api/scores/import/omr/preflight`, file, {
          headers, signal: request.signal, accountId: access.id, retryKey: preflightAttempt, photoCorners: photoCorners ?? undefined,
          onUploadProgress: uploadProgress => {
            if (preflightGuard.current.isCurrent(request)) setPreflight(current => current.status === "checking" || current.status === "waiting" ? { ...current, uploadProgress } : current);
          },
        });
        const data = response.payload;
        if (!preflightGuard.current.isCurrent(request)) return;
        const messages = preflightMessages.current;
        if (!response.ok) throw new Error(resolveRecognitionRequestFailure(messages.experience, data?.code) ?? scoreGenerationError({ error: data?.error, code: data?.code }, messages.locale) ?? localizeBrowserApiError({ error: data?.error ?? messages.failed, code: data?.code, status: response.status }));
        const result = parseScoreRecognitionPreflight(data?.preflight);
        const staged = parseStagedPreflightMetadata(data);
        if (!result || !staged) throw new Error(messages.failed);
        setPreflight({ status: "ready", file, result, ...staged });
        setSelectedRecognitionMode(defaultRecognitionMode(result));
        // Complex recommendation keeps the mode picker visible; simple/uncertain stays one-tap.
        setShowAdvancedModes(result.recommendation === "complex");
      } catch (error) {
        if (!preflightGuard.current.isCurrent(request)) return;
        const messages = preflightMessages.current;
        setPreflight({ status: "failed", file, error: error instanceof Error && error.name === "AbortError" ? messages.timeout : error instanceof TypeError ? messages.network : error instanceof Error ? error.message : messages.failed });
      } finally {
        clearTimeout(waiting);
      }
    })();
    return () => { clearTimeout(waiting); preflightGuard.current.invalidate(); };
  // Changing display language must not replay bytes after failure or cancellation.
  }, [file, photoCorners, kind, mode, access?.id, token, preflightAttempt, serverDraft?.id]);
  const recognitionQuote = selectedRecognitionMode ? recognitionOption(recognitionOptions, selectedRecognitionMode) : null;
  const simpleQuote = recognitionOption(recognitionOptions, "simple");
  const memory = preflight.status === "ready" ? preflight.result.memoryAssessment : null;
  const preflightRejected = preflight.status === "ready" && isScoreRecognitionRejected(preflight.result);
  const bigNeedsPayment = !preflightRejected && needsBigRecognitionLane(memory, selectedRecognitionMode) && recognitionQuote?.creditSource !== "plan" && recognitionQuote?.creditSource !== "score_pass";
  const recognitionReady = !bigNeedsPayment && canConfirmScoreRecognition({ file, preflight, selectedMode: selectedRecognitionMode, quote: recognitionQuote, quoteLoading, quoteError });
  const freeSimplePath = Boolean(access) && kind === "omr" && isFreeSimpleScanPath({
    freeTrialAvailable: access?.freeTrial.available === true && !bigNeedsPayment,
    selectedMode: selectedRecognitionMode,
    simpleQuote,
    preflight,
  });
  const showModePicker = mode === "file" && kind === "omr" && Boolean(access) && preflight.status === "ready" && !preflightRejected && (!freeSimplePath || showAdvancedModes);
  const hasUnusedPass = access?.scorePasses?.some(p => !p.documentId) ?? false;
  const recognitionNeedsPurchase = bigNeedsPayment || (recognitionQuote?.canSubmit === false && access?.entitlement.status !== "active" && !hasUnusedPass);
  const canImport = mode === "file" && kind === "omr" ? recognitionQuote?.canSubmit === true : access?.entitlement.status === "active";
  function chooseFile(selected: File | null, corners: PhotoCorners | null = null, photoChecked = false) {
    setPhotoFile(null); setPhotoCorners(corners);
    setServerDraft(null); setDraftOrder(null);
    const sourceUrl = new URL(window.location.href);
    sourceUrl.searchParams.delete("uploadDraft"); sourceUrl.searchParams.delete("checkoutOrderId");
    window.history.replaceState(window.history.state, "", sourceUrl.pathname + sourceUrl.search + sourceUrl.hash);
    preflightGuard.current.invalidate(); setPreflight({ status: "idle", file: null }); setSelectedRecognitionMode(null); setShowAdvancedModes(false);
    edited.current = true; setStatus(null); setFailed(false); setDraftFailed(false);
    if (selected && (!detectScoreImport(selected.name) || (recognitionMode === "complex" && !["omr", "musicxml", "score-json"].includes(detectScoreImport(selected.name) ?? "")) || (detectScoreImport(selected.name) === "audio" && !audioAvailable))) {
      setFile(null); setStatus(flow.unsupported); setFailed(true); return;
    }
    if (selected && selected.size > 20 * 1024 * 1024) { setFile(null); setStatus(flow.tooLarge); setFailed(true); return; }
    if (selected && /\.(png|jpe?g|webp)$/iu.test(selected.name) && !photoChecked) { setFile(null); setPhotoFile(selected); return; }
    setFile(selected);
  }
  async function saveDraftBeforePass() {
    if (!access) return false;
    try {
      if (serverDraft) return uploadDraftCheckoutContext(serverDraft, currentWorkPath());
      if (mode === "file" && kind === "omr") {
        if (preflight.status !== "ready" || isScoreRecognitionRejected(preflight.result) || !selectedRecognitionMode || !token) throw new Error(preflightCopy.notReady);
        // The server source is sufficient for payment recovery; IndexedDB only
        // provides a convenient local fallback and must not block promotion.
        await saveImportDraft({ ownerId: access.id, file, title, text: jianpuText, mode, createdAt: Date.now(), intent: taskIntent ?? undefined, photoCorners }).catch(() => setDraftFailed(true));
        const key = uploadDraftPrepareKey(access.id, preflight.stagedUploadId, selectedRecognitionMode, title);
        const result = await apiRequest<{ draft: UploadCheckoutDraft }>("/api/scores/upload-drafts/prepare", {
          method: "POST", headers: { Authorization: `Bearer ${token}`, "Idempotency-Key": key },
          body: JSON.stringify({ stagedUploadId: preflight.stagedUploadId, recognitionMode: selectedRecognitionMode, title }),
        });
        if (!result.ok) throw new Error(draftFailure(result));
        setServerDraft(result.data.draft);
        const context = uploadDraftCheckoutContext(result.data.draft, currentWorkPath());
        window.history.replaceState(window.history.state, "", context.returnPath);
        return context;
      }
      await saveImportDraft({ ownerId: access.id, file, title, text: jianpuText, mode, createdAt: Date.now(), intent: taskIntent ?? undefined, photoCorners });
      return true;
    } catch (error) {
      setDraftFailed(true); setStatus(error instanceof Error ? error.message : flow.fileLost); setFailed(true);
      return false;
    }
  }
  async function upgrade() {
    if (!access || submitLock.current) return;
    // Canonical funnel step 6 (see docs/operations/google-seo-funnel-runbook.md).
    // upgrade_click for this path is tracked by OneScorePassUpsell as score_import_subscription.
    submitLock.current = true; setBusy(true);
    try {
      const prepared = await saveDraftBeforePass();
      if (!prepared) return;
      router.push(typeof prepared === "object" ? scoreCheckoutPath(prepared.targetDocumentId, prepared.intendedAction, false, prepared.returnPath, prepared.returnState) : upgradePath(currentWorkPath()));
    } catch {
      setDraftFailed(true); setStatus(flow.fileLost); setFailed(true);
    } finally { submitLock.current = false; setBusy(false); }
  }
  async function confirmServerDraft() {
    if (!serverDraft || !draftOrder || !token || submitLock.current) return;
    if (draftOrder.status !== "paid") { setStatus(serverDraftCopy.waiting); setFailed(false); return; }
    submitLock.current = true; setBusy(true); setFailed(false);
    try {
      const result = await apiRequest<CheckoutContinuationResult>(`/api/payments/orders/${encodeURIComponent(draftOrder.id)}/continue`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ token: draftOrder.token, confirmed: true }),
      });
      if (!result.ok) throw new Error(draftFailure(result));
      if (result.data.error) throw new Error(draftFailure({ error: result.data.error, code: result.data.code, status: result.data.statusCode }));
      saveContinuationNotice({ ...result.data, actionType: "recognition" });
      setStatus(serverDraftCopy.queued);
      await clearImportDraft(access!.id).catch(() => undefined);
      router.push(scoreTaskDocumentPath(serverDraft.documentId, taskIntent, serverDraft.mode === "complex"));
    } catch (error) { setStatus(error instanceof Error ? error.message : serverDraftCopy.unavailable); setFailed(true); }
    finally { submitLock.current = false; setBusy(false); }
  }
  function releaseUploadReceipt(key: string) {
    if (!access) return;
    forgetUploadReceipt(access.id, key);
    setUploadRecovery(latestUploadReceipt(access.id));
  }
  async function lookupUpload(receipt: { key: string; identity: string }, signal?: AbortSignal): Promise<"retry" | "stop"> {
    if (!access) return "stop";
    const result = await apiRequest<{ state: "processing" | "completed" | "failed" | "unknown"; scoreId?: string; error?: string; code?: string }>(`/api/scores/uploads/${receipt.key}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined, signal,
    });
    if (signal?.aborted) return "stop";
    if (result.ok && result.data.state === "completed" && typeof result.data.scoreId === "string") {
      releaseUploadReceipt(receipt.key);
      await boundedScoreTransfer(() => clearImportDraft(access.id), { timeoutMs: 5_000, signal }).catch(() => undefined);
      if (signal?.aborted) return "stop";
      router.push(scoreTaskDocumentPath(result.data.scoreId, taskIntent, receipt.identity.endsWith(":complex") || recognitionMode === "complex"));
      return "stop";
    }
    if ((!result.ok && result.status === 404) || (result.ok && result.data.state === "failed")) {
      setStatus(result.ok ? transferCopy.uploadFailed : transferCopy.uploadUnseen); setFailed(true);
      return "retry";
    }
    setStatus(result.ok && result.data.state === "processing" ? transferCopy.uploadPending : result.ok && result.data.state === "unknown" ? `${transferCopy.uploadNeedsSupport} ${receipt.key}` : transferCopy.uploadUnknown);
    setFailed(true);
    return "stop";
  }
  async function checkOriginalUpload() {
    if (!uploadRecovery || submitLock.current) return;
    const controller = new AbortController(); uploadAbort.current = controller;
    submitLock.current = true; setBusy(true);
    try { await lookupUpload(uploadRecovery, controller.signal); }
    finally { if (uploadAbort.current === controller) uploadAbort.current = null; submitLock.current = false; setBusy(false); }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    if (!access) {
      if (mode === "file" && !file) return;
      if (mode === "jianpu" && !jianpuText.trim()) return;
      setStatus(copy.signInFirst); setFailed(false);
      const saved = saveGuestImportDraft({ file, title, text: jianpuText, mode, createdAt: Date.now(), intent: taskIntent ?? undefined, photoCorners });
      // Open Google in this submit gesture. Persisting the file runs alongside
      // the popup and must complete before a blocked-popup redirect leaves.
      signIn("login", () => {
        void saved.then(() => setAccessAttempt(n => n + 1)).catch(() => { setDraftFailed(true); setStatus(flow.fileLost); setFailed(true); });
      }, { beforeRedirect: () => saved.then(() => undefined) });
      void saved.catch(() => { setDraftFailed(true); setStatus(flow.fileLost); setFailed(true); });
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
    const controller = new AbortController(); uploadAbort.current = controller;
    let attempt: { key: string; identity: string } | null = null;
    let uploadSent = false;
    try {
      let imported: ScoreDocument;
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const sourceIdentity = await boundedScoreTransfer(() => mode === "file" ? scorePreflightFileKey(file!) : crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify({ title, text: jianpuText }))).then(hash => Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, "0")).join("")), { signal: controller.signal, timeoutMs: 15_000 });
      const identity = `${sourceIdentity}:${mode === "jianpu" ? "jianpu" : kind}:${kind === "omr" ? selectedRecognitionMode : ""}`;
      const receipt = getUploadReceipt(access.id, identity); attempt = receipt;
      setUploadRecovery(receipt);
      // Only reconcile an earlier request for these same inputs. Other pending
      // receipts stay recoverable while a distinct file or import can proceed.
      if (receipt.reused && await lookupUpload(receipt, controller.signal) !== "retry") return;
      let confirmedQuote = recognitionQuote;
      if (isRecognition) {
        const quoteController = new AbortController();
        const cancelQuote = () => quoteController.abort(); controller.signal.addEventListener("abort", cancelQuote, { once: true });
        const quoteTimeout = setTimeout(() => quoteController.abort(), 15_000);
        let fresh: Awaited<ReturnType<typeof apiRequest<RecognitionOptions>>>;
        try {
          fresh = await apiRequest<RecognitionOptions>("/api/scores/recognition-options", { headers, signal: quoteController.signal });
        } finally { clearTimeout(quoteTimeout); controller.signal.removeEventListener("abort", cancelQuote); }
        if (!fresh.ok) { setQuoteError(fresh.error); throw new Error(fresh.error); }
        const freshQuote = selectedRecognitionMode ? recognitionOption(fresh.data, selectedRecognitionMode) : null;
        setRecognitionOptions(fresh.data); setQuoteError(null);
        if (!freshQuote?.canSubmit) {
          // The updated quote presents checkout while preserving the staged source.
          releaseUploadReceipt(receipt.key);
          setStatus(null); setFailed(false); return;
        }
        if (freshQuote.creditCost !== confirmedQuote?.creditCost) {
          releaseUploadReceipt(receipt.key);
          setStatus(preflightCopy.priceChanged); setFailed(true); return;
        }
        confirmedQuote = freshQuote;
      }
      const uploadHeaders = new Headers(headers); uploadHeaders.set("Idempotency-Key", receipt.key);
      // A refresh after a lost response retains both the input and the original request.
      await boundedScoreTransfer(() => saveImportDraft({ ownerId: access.id, file, title, text: jianpuText, mode, createdAt: Date.now(), intent: taskIntent ?? undefined, photoCorners }), { timeoutMs: 5_000, signal: controller.signal }).catch(() => setDraftFailed(true));
      if (controller.signal.aborted) throw new ScoreTransferError("CANCELLED");
      if (mode === "jianpu") {
        uploadHeaders.set("Content-Type", "application/json");
        uploadSent = true;
        const data = await fetchScoreUpload<{ score: ScoreDocument }>(`${API_BASE_URL}/api/scores/import/jianpu`, { method: "POST", headers: uploadHeaders, body: JSON.stringify({ title, text: jianpuText }) }, { signal: controller.signal });
        imported = data.score;
      } else {
        const recognitionQuery = kind === "omr" ? `?recognitionMode=${selectedRecognitionMode}&expectedCreditCost=${confirmedQuote!.creditCost}` : "";
        let body: BodyInit;
        if (isRecognition) {
          if (preflight.status !== "ready") throw new Error(preflightCopy.notReady);
          uploadHeaders.set("Content-Type", "application/json");
          body = JSON.stringify(stagedScoreRecognitionBody(preflight.stagedUploadId, selectedRecognitionMode!, confirmedQuote!.creditCost));
        } else {
          const form = new FormData(); form.append("file", file!); body = form;
        }
        uploadSent = true;
        const data = await fetchScoreUpload<{ score: ScoreDocument }>(`${API_BASE_URL}/api/scores/import/${kind}${recognitionQuery}`, { method: "POST", headers: uploadHeaders, body }, { signal: controller.signal });
        imported = data.score;
        // Fires for every OMR creation; free_trial=true marks the free-plan step of the funnel, false means a paid/active account.
        if (kind === "omr") trackFunnelEvent("free_omr_created", { free_trial: access.entitlement.status !== "active", source_type: file!.name.toLowerCase().endsWith(".pdf") ? "pdf" : "image", recognition_mode: selectedRecognitionMode ?? "unknown" });
      }
      if (!imported || typeof imported.id !== "string" || !imported.id) throw new ScoreTransferError("RESPONSE");
      if (isRecognition && preflight.status === "ready") forgetStagedScorePreflight(preflight.stagedUploadId);
      if (controller.signal.aborted) return;
      releaseUploadReceipt(receipt.key);
      await boundedScoreTransfer(() => clearImportDraft(access.id), { timeoutMs: 5_000, signal: controller.signal }).catch(() => undefined);
      const targetMode = isRecognition ? selectedRecognitionMode : recognitionMode;
      router.push(scoreTaskDocumentPath(imported.id, taskIntent, targetMode === "complex"));
    } catch (error) {
      if (error instanceof ScoreTransferError) {
        const server = error.server;
        if (server?.code === "OMR_PRICE_CHANGED") setQuoteAttempt(n => n + 1);
        const stagedUnavailable = ["STAGED_UPLOAD_EXPIRED", "STAGED_UPLOAD_NOT_FOUND", "STAGED_UPLOAD_CONSUMED"].includes(server?.code ?? "");
        const stagedError = server?.code === "STAGED_UPLOAD_EXPIRED" ? stagedCopy.expired : stagedUnavailable ? stagedCopy.unavailable : server?.code === "STAGED_UPLOAD_BUSY" ? stagedCopy.busy : null;
        if (stagedUnavailable && file) setPreflight({ status: "failed", file, error: stagedError!, stagedUnavailable: true });
        const knownRejected = server && server.status >= 400 && server.status < 500 && !["UPLOAD_IN_PROGRESS", "UPLOAD_RESULT_UNKNOWN", "IDEMPOTENCY_KEY_REUSED", "UPLOAD_IDEMPOTENCY_MISMATCH"].includes(server.code ?? "");
        if (knownRejected && attempt) releaseUploadReceipt(attempt.key);
        if (server && isCreditUpgradeError(server)) {
          setRecognitionOptions(current => current ? { ...current, options: current.options.map(option => option.mode === selectedRecognitionMode ? { ...option, canSubmit: false, reason: server.code ?? null, creditSource: null } : option) } : current);
          setAccessAttempt(n => n + 1);
          setStatus(null); setFailed(false); return;
        }
        setStatus(error.code === "CANCELLED" ? transferCopy.uploadCancelled : stagedError ?? (knownRejected ? resolveRecognitionRequestFailure(experience, server.code) ?? scoreGenerationError(server, locale) ?? localizeBrowserApiError(server) : transferCopy.uploadUnknown));
      } else {
        // No upload has been sent for quote or local-input failures.
        if (!uploadSent && attempt) releaseUploadReceipt(attempt.key);
        setStatus(uploadSent ? transferCopy.uploadUnknown : error instanceof Error ? error.message : copy.musicxml.importFailed);
      }
      setFailed(true);
    } finally {
      if (uploadAbort.current === controller) uploadAbort.current = null;
      submitLock.current = false; setBusy(false);
    }
  }
  return <div className="page-stack flow-library">
    <section id="free-scan" className="surface-panel stack-lg flow-import">
      <h2 className="card-title">{taskIntent ? taskCopy.tasks[taskIntent.task] : flow.importTitle}</h2>
      {serverDraft ? <div className="stack-sm" data-server-upload-draft={serverDraft.id}>
        {serverDraft.memoryAssessment?.lane === "unsupported" ? <RecognitionRejection messages={experience} messageKey={recognitionRejectionMessageKey(serverDraft.memoryAssessment)} /> : <>
        <p className="body-copy">{serverDraftCopy.ready}</p>
        {serverDraft.memoryAssessment ? <div data-recognition-lane={serverDraft.memoryAssessment.lane}><strong>{serverDraft.memoryAssessment.lane === "big" ? experience.bigLane : experience.normalLane}</strong>{serverDraft.memoryAssessment.lane === "big" ? <><p data-large-file-reason>{formatMessage(experience.bigReason, { pages: formatNumber(serverDraft.memoryAssessment.sourcePageCount, locale) })}</p><p>{experience.bigBody}</p></> : <p>{experience.normalBody}</p>}</div> : null}
        <RecognitionPlanSummary messages={experience} />
        <p>{serverDraft.filename} · {serverDraft.mode === "complex" ? preflightCopy.complexTitle : preflightCopy.simpleTitle} · {serverDraftCopy.credits}: {formatNumber(serverDraft.creditCost, locale)}</p>
        <div className="button-row">
          {serverDraft.taskId ? <Link href={scoreTaskDocumentPath(serverDraft.documentId, taskIntent, serverDraft.mode === "complex")} className="button button-primary">{copy.list.open}</Link>
            : draftOrder?.status === "paid" ? <button type="button" className="button button-primary" disabled={busy} onClick={() => void confirmServerDraft()}>{serverDraftCopy.continue}</button>
            : draftOrder?.status === "pending" ? <Link href={`/checkout/success?order_id=${encodeURIComponent(draftOrder.id)}&token=${encodeURIComponent(draftOrder.token)}`} className="button button-primary">{flow.retry}</Link>
            : <button type="button" className="button button-primary" disabled={busy} onClick={() => {
              const context = uploadDraftCheckoutContext(serverDraft, currentWorkPath());
              router.push(scoreCheckoutPath(context.targetDocumentId, context.intendedAction, false, context.returnPath, context.returnState));
            }}>{flow.upgrade}</button>}
          <button type="button" className="button button-secondary" disabled={busy} onClick={() => setDraftRestoreAttempt(n => n + 1)}>{flow.retry}</button>
        </div>
        </>}
      </div> : null}
      {taskIntent ? <div className="stack-sm" data-score-task={taskIntent.task}>
        <p className="body-copy">{taskCopy.body}</p>
        {taskIntent.targetTonic ? <p className="helper-copy">{formatMessage(taskCopy.target, { target: taskIntent.targetTonic })}</p> : taskIntent.semitones !== undefined ? <p className="helper-copy">{formatMessage(taskCopy.shift, { value: formatNumber(taskIntent.semitones, locale) })}</p> : null}
        <div className="button-row">
          {mode === "file" ? <button type="button" className="button button-primary" disabled={busy} onClick={() => inputRef.current?.click()}>{taskCopy.chooseFile}</button> : <a className="button button-primary" href="#jianpu-input">{copy.jianpu.textLabel}</a>}
          {view === "library" && access ? <a className="button button-secondary" href="#saved-scores">{taskCopy.existing}</a> : null}
        </div>
      </div> : null}
      <div className="button-row" role="group" aria-label={flow.importTitle} hidden={Boolean(serverDraft)}>
        <button type="button" disabled={busy} className={`button ${mode === "file" ? "button-primary" : "button-secondary"}`} aria-pressed={mode === "file"} onClick={() => { edited.current = true; if (mode !== "file") { preflightGuard.current.invalidate(); setPreflight({ status: "idle", file: null }); } setMode("file"); }}>{flow.chooseFile}</button>
        {recognitionMode === "simple" ? <button type="button" disabled={busy} className={`button ${mode === "jianpu" ? "button-primary" : "button-secondary"}`} aria-pressed={mode === "jianpu"} onClick={() => { edited.current = true; preflightGuard.current.invalidate(); setPreflight({ status: "idle", file: null }); setSelectedRecognitionMode(null); setMode("jianpu"); }}>{copy.jianpu.title}</button> : null}
      </div>
      <form onSubmit={submit} className="stack-lg" hidden={Boolean(serverDraft)} onKeyDown={event => {
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
          <div className="button-row"><button type="button" className="button button-secondary" disabled={busy} onClick={() => cameraRef.current?.click()}>{experience.photoCapture}</button></div>
          <input ref={cameraRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label={experience.photoCapture} disabled={busy} onChange={event => { chooseFile(event.target.files?.[0] ?? null); event.target.value = ""; }} />
          <p className="helper-copy">{experience.photoGuide}</p>
          {photoFile ? <PhotoCornerEditor file={photoFile} messages={experience} onContinue={corners => chooseFile(photoFile, corners, true)} /> : null}
          <input ref={inputRef} id="score-file-input" className="sr-only" type="file" aria-label={flow.chooseFile} accept={recognitionMode === "complex" ? ".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,.xml,.musicxml,.mxl,.json" : ".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,.xml,.musicxml,.mxl,.mid,.midi,.json" + (audioAvailable ? ",.wav,.mp3,.m4a,.aac,.flac,.ogg,.aif,.aiff" : "")} disabled={busy} onChange={e => { chooseFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
        </> : <>
          <label className="field-group"><span>{copy.jianpu.titleLabel}</span><input className="field-control" value={title} disabled={busy} onChange={e => { edited.current = true; setTitle(e.target.value); }} /></label>
          <label id="jianpu-input" className="field-group"><span>{copy.jianpu.textLabel}</span><textarea className="field-control" rows={5} value={jianpuText} disabled={busy} onChange={e => { edited.current = true; setJianpuText(e.target.value); }} /></label>
        </>}
        {mode === "file" && kind === "omr" ? <>
          <ScoreRecognitionPreflight state={preflight} mode={selectedRecognitionMode} compact={freeSimplePath || (preflight.status === "checking" && Boolean(access?.freeTrial.available))} onRetry={() => setPreflightAttempt(crypto.randomUUID())} />
          {(preflight.status === "checking" || preflight.status === "waiting") && file ? <button type="button" className="button button-secondary" onClick={() => { preflightGuard.current.invalidate(); setPreflight({ status: "failed", file, error: transferCopy.preflightCancelled }); }}>{transferCopy.cancel}</button> : null}
          {showModePicker ? <RecognitionModeCards options={recognitionOptions} selected={selectedRecognitionMode ?? undefined} loading={quoteLoading} error={quoteError} disabled={busy || preflight.status !== "ready" || preflight.file !== file} onSelect={selected => { setSelectedRecognitionMode(selected); setStatus(null); }} onRetry={() => setQuoteAttempt(n => n + 1)} /> : null}
          {freeSimplePath && !showAdvancedModes ? <div className="stack-sm">
            <p className="helper-copy" data-recognition-quote="simple" data-free-simple-path="true">{preflightCopy.freeProjectPrice}</p>
            <button type="button" className="button button-tertiary" disabled={busy} onClick={() => setShowAdvancedModes(true)}>{preflightCopy.showModes}</button>
          </div> : null}
          {freeSimplePath && showAdvancedModes ? <button type="button" className="button button-tertiary" disabled={busy} onClick={() => { setShowAdvancedModes(false); setSelectedRecognitionMode("simple"); }}>{preflightCopy.hideModes}</button> : null}
          {!preflightRejected && !freeSimplePath && recognitionQuote ? <p className="helper-copy" data-recognition-quote={selectedRecognitionMode}>{recognitionNeedsPurchase ? `${experience.passPlan} · ${experience.starterPlan}` : recognitionQuote.canSubmit ? formatMessage(preflightCopy.price, { credits: formatNumber(recognitionQuote.creditCost, locale) }) : preflightCopy.noCredit}</p> : null}
        </> : mode === "file" && !file ? <p className="helper-copy">{preflightCopy.freeBody}</p> : null}
        {recognitionMode === "complex" ? <p className="helper-copy">{recognitionCopy.structuredImport}</p> : null}
        {access && !preflightRejected && !bigNeedsPayment && access.entitlement.status !== "active" && (kind !== "omr" || selectedRecognitionMode) && !freeSimplePath ? <p className="helper-copy">{hasUnusedPass ? getSingleScorePassCopy(locale).paid : access.freeTrial.available ? copy.scan.freeBody : copy.scan.exhaustedBody}</p> : null}
        <div className="button-row">
          {!preflightRejected && !recognitionNeedsPurchase ? <button className="button button-primary" type="submit" data-recognition-confirm={mode === "file" && kind === "omr" && access ? "true" : undefined} disabled={busy || (mode === "file" ? !file || (Boolean(access) && kind === "omr" && !recognitionReady) : !jianpuText.trim())}>{busy ? flow.processing : !access ? copy.signInFirst : mode === "file" && kind === "omr" ? recognitionReady ? (freeSimplePath ? preflightCopy.startRecognition : formatMessage(preflightCopy.confirmRecognition, { mode: selectedRecognitionMode === "simple" ? preflightCopy.simpleTitle : preflightCopy.complexTitle, credits: formatNumber(recognitionQuote!.creditCost, locale) })) : (preflight.status === "checking" ? preflightCopy.checking : preflightCopy.notReady) : canImport ? flow.start : flow.upgrade}</button> : null}
          {mode === "file" && kind === "omr" && preflight.status === "ready" && !preflightRejected && recognitionQuote && (!recognitionQuote.canSubmit || bigNeedsPayment) ? <OneScorePassUpsell starterPrimary={bigNeedsPayment} source="score_import" disabled={busy} beforeCheckout={saveDraftBeforePass} onSubscriptionClick={() => { void upgrade(); }} /> : null}
          {file && !busy && mode === "file" ? <button type="button" className="button button-secondary" onClick={() => chooseFile(null)}>{copy.common.clearSelection}</button> : null}
          {draftFailed ? <Link className="button button-secondary" href={upgradePath(currentWorkPath())} onClick={() => trackFunnelEvent("upgrade_click", { source: "score_import_draft_failed" })}>{flow.upgrade}</Link> : null}
          {!access && failed ? <button type="button" className="button button-secondary" onClick={() => setAccessAttempt(n => n + 1)}>{flow.retry}</button> : null}
          {uploadRecovery && access ? <button type="button" className="button button-secondary" disabled={busy} onClick={() => void checkOriginalUpload()}>{transferCopy.checkUpload}</button> : null}
          {busy && uploadAbort.current ? <button type="button" className="button button-secondary" onClick={() => { uploadAbort.current?.abort(); setStatus(transferCopy.uploadCancelled); setFailed(true); }}>{transferCopy.cancel}</button> : null}
        </div>
      </form>
      <ProcessingProgress active={busy} label={flow.processing} error={failed} operationKey={`${mode}:${file?.name ?? "jianpu"}`} locale={locale} />
      {status ? <p className={`form-status ${failed ? "error" : "success"}`} role={failed ? "alert" : "status"}>{status}</p> : null}
    </section>
    <section className="surface-panel">
        {view === "library" ? <div id="saved-scores" className="preview-side">
          <div className="stack-sm">
            <p className="eyebrow">{copy.list.eyebrow}</p>
            <h2 className="card-title">{copy.list.title}</h2>
            <p className="body-copy">{copy.list.body}</p>
          </div>

          <ProcessingProgress active={loading} label={copy.list.loading} error={failed && !loading} locale={locale} />
          {loading && slowRead ? <p>{flow.requestWaiting.detail}</p> : null}
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
                  <Link href={scoreTaskDocumentPath(score.id, taskIntent)} className="button button-secondary button-ghost">
                    {taskIntent ? taskCopy.tasks[taskIntent.task] : copy.list.open}
                  </Link>
                  <Link href={scoreTaskDocumentPath(score.id, taskIntent, true)} className="button button-secondary button-ghost">{recognitionCopy.ensembleTitle}</Link>
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
