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

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, ms);
    function abort() { clearTimeout(timer); reject(abortError()); }
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}

export type ScorePreflightResponse<T> = { ok: boolean; status: number; payload: T | null };

/** Retry only the explicitly retryable capacity response; never replay a failed upload. */
export async function fetchScorePreflight<T extends { code?: string }>(url: string, file: File, options: {
  signal?: AbortSignal;
  headers?: HeadersInit;
  accountId?: string;
  pages?: string;
  fetch?: typeof fetch;
  wait?: (ms: number, signal: AbortSignal) => Promise<void>;
  now?: () => number;
} = {}): Promise<ScorePreflightResponse<T>> {
  const identity = await scorePreflightFileKey(file, options.pages);
  const headers = new Headers(options.headers);
  const key = `preflight:${url}:${headers.get("authorization") ?? options.accountId ?? "session"}:${identity}`;
  return sharedInFlightRequest(key, async sharedSignal => {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    sharedSignal.addEventListener("abort", cancel, { once: true });
    const timeout = setTimeout(cancel, SCORE_PREFLIGHT_CLIENT_TIMEOUT_MS);
    const now = options.now ?? Date.now;
    const deadline = now() + SCORE_PREFLIGHT_CLIENT_TIMEOUT_MS;
    try {
      for (let attempt = 0; ; attempt += 1) {
        const body = new FormData(); body.append("file", file);
        const response = await (options.fetch ?? fetch)(url, { method: "POST", headers, body, credentials: "include", cache: "no-store", signal: controller.signal });
        const payload = await response.json().catch(() => null) as T | null;
        const result = { ok: response.ok, status: response.status, payload };
        if (response.status !== 429 || payload?.code !== "SCORE_PREFLIGHT_BUSY" || attempt >= 2) return result;
        const delay = Math.max(retryAfterMilliseconds(response.headers.get("Retry-After"), now()) ?? 0, Math.min(8_000, 1_000 * 2 ** attempt));
        // A bounded retry must not disregard a longer server Retry-After.
        if (delay >= deadline - now()) return result;
        await (options.wait ?? wait)(delay, controller.signal);
      }
    } finally {
      clearTimeout(timeout);
      sharedSignal.removeEventListener("abort", cancel);
    }
  // The server may already be rendering. Keep bounded preflight work available to
  // resumed drafts, while the disconnected UI subscription aborts immediately.
  }, options.signal, { cancelWhenUnused: false });
}
