type SharedRequest = {
  promise: Promise<unknown>;
  controller: AbortController;
  consumers: number;
  cancelWhenUnused: boolean;
  cancelTimer?: ReturnType<typeof setTimeout>;
};
const inFlight = new Map<string, SharedRequest>();

const abortError = () => new DOMException("Request aborted.", "AbortError");

/** Share the work, but let each mounted consumer cancel its own subscription. */
export function sharedInFlightRequest<T>(key: string, request: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal, options: { cancelWhenUnused?: boolean } = {}): Promise<T> {
  if (signal?.aborted) return Promise.reject(abortError());
  let entry = inFlight.get(key);
  if (!entry) {
    const controller = new AbortController();
    entry = { controller, consumers: 0, cancelWhenUnused: options.cancelWhenUnused !== false, promise: Promise.resolve().then(() => request(controller.signal)) };
    const current = entry;
    inFlight.set(key, current);
    void current.promise.finally(() => {
      if (inFlight.get(key) === current) inFlight.delete(key);
      if (current.cancelTimer) clearTimeout(current.cancelTimer);
    }).catch(() => undefined);
  }
  if (entry.cancelTimer) clearTimeout(entry.cancelTimer);
  entry.cancelTimer = undefined;
  entry.consumers += 1;
  const current = entry;
  return new Promise<T>((resolve, reject) => {
    let released = false;
    function release() {
      if (released) return;
      released = true;
      signal?.removeEventListener("abort", abort);
      current.consumers -= 1;
      // React effect cleanup/remount can replace a consumer in the same turn.
      if (current.cancelWhenUnused && !current.consumers && inFlight.get(key) === current) current.cancelTimer = setTimeout(() => {
        if (!current.consumers) {
          inFlight.delete(key);
          current.controller.abort();
        }
      }, 0);
    }
    function abort() { release(); reject(abortError()); }
    signal?.addEventListener("abort", abort, { once: true });
    current.promise.then(value => { if (!released) { release(); resolve(value as T); } }, error => { if (!released) { release(); reject(error); } });
  });
}

export const SCORE_PREFLIGHT_CLIENT_TIMEOUT_MS = 240_000;
export const SCORE_READ_TIMEOUT_MS = 90_000;
const fileDigests = new WeakMap<File, Promise<string>>();

/** Content identity also covers File objects reconstructed when an import draft resumes. */
export function scorePreflightFileKey(file: File, pages = "all"): Promise<string> {
  let digest = fileDigests.get(file);
  if (!digest) {
    digest = file.arrayBuffer().then(bytes => crypto.subtle.digest("SHA-256", bytes)).then(hash =>
      Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join(""));
    fileDigests.set(file, digest);
  }
  return digest.then(hash => `${hash}:${file.size}:${file.type}:${pages}`);
}

export function retryAfterMilliseconds(value: string | null, now = Date.now()): number | null {
  if (!value) return null;
  if (/^\d+(?:\.\d+)?$/u.test(value.trim())) return Math.ceil(Number(value) * 1_000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : null;
}

export type ScorePreflightResponse<T> = { ok: boolean; status: number; payload: T | null };
type StagedPreflightMetadata = { stagedUploadId: string; stagedUploadExpiresAt: string };
const stagedPreflights = new Map<string, ScorePreflightResponse<unknown>>();
const uploadProgress = new Map<string, { percent: number; listeners: Set<(percent: number) => void> }>();

export function parseStagedPreflightMetadata(value: unknown): StagedPreflightMetadata | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  return typeof data.stagedUploadId === "string" && data.stagedUploadId.trim().length > 0 &&
    typeof data.stagedUploadExpiresAt === "string" && Number.isFinite(Date.parse(data.stagedUploadExpiresAt))
    ? { stagedUploadId: data.stagedUploadId, stagedUploadExpiresAt: data.stagedUploadExpiresAt } : null;
}

/** Confirmation sends the staged reference and accepted price, never the source bytes. */
export function stagedScoreRecognitionBody(stagedUploadId: string, recognitionMode: "simple" | "complex", expectedCreditCost: number) {
  return { stagedUploadId, recognitionMode, expectedCreditCost };
}

/** A later deliberate selection of the same file must get a new unconsumed stage. */
export function forgetStagedScorePreflight(stagedUploadId: string) {
  for (const [key, response] of stagedPreflights) {
    if (parseStagedPreflightMetadata(response.payload)?.stagedUploadId === stagedUploadId) stagedPreflights.delete(key);
  }
}

function uploadPreflight<T>(url: string, file: File, headers: Headers, signal: AbortSignal, report: (percent: number) => void, factory: () => XMLHttpRequest, photoCorners?: Array<{x:number;y:number}>): Promise<ScorePreflightResponse<T>> {
  return new Promise((resolve, reject) => {
    const xhr = factory();
    const abort = () => xhr.abort();
    let settled = false;
    const finish = (result?: ScorePreflightResponse<T>, error?: Error) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", abort);
      if (error) reject(error); else resolve(result!);
    };
    xhr.open("POST", url);
    xhr.withCredentials = true;
    headers.forEach((value, name) => xhr.setRequestHeader(name, value));
    xhr.upload.onprogress = event => {
      if (event.lengthComputable && event.total > 0) report(Math.min(100, Math.max(0, Math.round(event.loaded / event.total * 100))));
    };
    xhr.upload.onload = () => report(100);
    xhr.onerror = () => finish(undefined, new TypeError("Score upload failed."));
    xhr.onabort = () => finish(undefined, abortError());
    xhr.ontimeout = () => finish(undefined, abortError());
    xhr.onload = () => {
      let payload: T | null = null;
      try { payload = JSON.parse(xhr.responseText) as T; } catch { /* Invalid responses cannot authorize confirmation. */ }
      finish({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, payload });
    };
    if (signal.aborted) { finish(undefined, abortError()); return; }
    signal.addEventListener("abort", abort, { once: true });
    const body = new FormData(); if (photoCorners) body.append("photoCorners", JSON.stringify(photoCorners)); body.append("file", file);
    try { xhr.send(body); } catch (error) { finish(undefined, error instanceof Error ? error : new TypeError("Score upload failed.")); }
  });
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => { signal.removeEventListener("abort", abort); reject(abortError()); };
    if (signal.aborted) { abort(); return; }
    signal.addEventListener("abort", abort, { once: true });
    promise.then(value => { signal.removeEventListener("abort", abort); resolve(value); }, error => { signal.removeEventListener("abort", abort); reject(error); });
  });
}

/** Upload once; a rejected or expired stage requires an explicit new attempt. */
export async function fetchScorePreflight<T extends { code?: string }>(url: string, file: File, options: {
  signal?: AbortSignal;
  headers?: HeadersInit;
  accountId?: string;
  pages?: string;
  photoCorners?: Array<{x:number;y:number}>;
  fetch?: typeof fetch;
  onUploadProgress?: (percent: number) => void;
  xhr?: () => XMLHttpRequest;
  /** A user-selected retry changes this key; effect remounts reuse the same staged upload. */
  retryKey?: string | number;
  timeoutMs?: number;
} = {}): Promise<ScorePreflightResponse<T>> {
  const consumerController = new AbortController();
  const cancelConsumer = () => consumerController.abort();
  const timeoutMs = options.timeoutMs ?? SCORE_PREFLIGHT_CLIENT_TIMEOUT_MS;
  const consumerTimeout = setTimeout(cancelConsumer, timeoutMs);
  if (options.signal?.aborted) consumerController.abort();
  else options.signal?.addEventListener("abort", cancelConsumer, { once: true });
  try {
  const identity = await abortable(scorePreflightFileKey(file, options.pages), consumerController.signal);
  const headers = new Headers(options.headers);
  const key = `preflight:${url}:${headers.get("authorization") ?? options.accountId ?? "session"}:${JSON.stringify([file.name, identity, options.photoCorners])}:${options.retryKey ?? 0}`;
  // Keep the reference even when its TTL passes: confirmation reports expiry and
  // the user explicitly chooses a new upload instead of an effect replaying bytes.
  const staged = stagedPreflights.get(key);
  if (staged) { options.onUploadProgress?.(100); return staged as ScorePreflightResponse<T>; }
  let progress = uploadProgress.get(key);
  if (!progress) { progress = { percent: 0, listeners: new Set() }; uploadProgress.set(key, progress); }
  const listener = options.onUploadProgress;
  if (listener) { progress.listeners.add(listener); listener(progress.percent); }
  try { return await sharedInFlightRequest(key, async sharedSignal => {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    sharedSignal.addEventListener("abort", cancel, { once: true });
    const timeout = setTimeout(cancel, timeoutMs);
    try {
      let result: ScorePreflightResponse<T>;
      const report = (percent: number) => {
        progress!.percent = percent;
        for (const notify of progress!.listeners) notify(percent);
      };
      if (options.fetch || (typeof XMLHttpRequest === "undefined" && !options.xhr)) {
        const body = new FormData(); if (options.photoCorners) body.append("photoCorners", JSON.stringify(options.photoCorners)); body.append("file", file);
        const response = await abortable((options.fetch ?? fetch)(url, { method: "POST", headers, body, credentials: "include", cache: "no-store", signal: controller.signal }), controller.signal);
        const payload = await abortable(response.json().catch(() => null), controller.signal) as T | null;
        result = { ok: response.ok, status: response.status, payload };
      } else {
        result = await uploadPreflight<T>(url, file, headers, controller.signal, report, options.xhr ?? (() => new XMLHttpRequest()), options.photoCorners);
      }
      if (result.ok && parseStagedPreflightMetadata(result.payload)) {
        stagedPreflights.set(key, result);
        if (stagedPreflights.size > 64) stagedPreflights.delete(stagedPreflights.keys().next().value!);
      }
      return result;
    } finally {
      clearTimeout(timeout);
      sharedSignal.removeEventListener("abort", cancel);
      if (uploadProgress.get(key) === progress) uploadProgress.delete(key);
    }
  // Changing files or leaving the page releases unused network/rendering work.
  }, consumerController.signal, { cancelWhenUnused: true }); }
  finally { if (listener) progress.listeners.delete(listener); }
  } finally {
    clearTimeout(consumerTimeout);
    options.signal?.removeEventListener("abort", cancelConsumer);
  }
}
