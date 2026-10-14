export class ScoreTransferError extends Error {
  constructor(public readonly code: "TIMEOUT" | "CANCELLED" | "NETWORK" | "RESPONSE" | "READ" | "INVALID_FILE", public readonly server?: { error?: string; code?: string; status: number }) {
    super(code);
  }
}

/** The deadline covers receiving headers and reading the response body. */
export async function boundedScoreTransfer<T>(operation: (signal: AbortSignal) => Promise<T>, options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<T> {
  const controller = new AbortController();
  let timeout = false;
  const cancel = () => controller.abort();
  const timer = setTimeout(() => { timeout = true; controller.abort(); }, options.timeoutMs ?? 180_000);
  if (options.signal?.aborted) controller.abort();
  else options.signal?.addEventListener("abort", cancel, { once: true });
  let abort!: () => void;
  const aborted = new Promise<never>((_, reject) => {
    abort = () => reject(new ScoreTransferError(timeout ? "TIMEOUT" : "CANCELLED"));
    if (controller.signal.aborted) abort();
    else controller.signal.addEventListener("abort", abort, { once: true });
  });
  try { return await Promise.race([operation(controller.signal), aborted]); }
  finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
    controller.signal.removeEventListener("abort", abort);
  }
}

export async function fetchScoreUpload<T>(url: string, init: RequestInit, options: { signal?: AbortSignal; timeoutMs?: number; fetch?: typeof fetch } = {}): Promise<T> {
  return boundedScoreTransfer(async signal => {
    let response: Response;
    try { response = await (options.fetch ?? fetch)(url, { ...init, signal, cache: "no-store", credentials: "include" }); }
    catch { throw new ScoreTransferError("NETWORK"); }
    let payload: (T & { error?: string; code?: string }) | null;
    try { payload = await response.json(); }
    catch { throw new ScoreTransferError("RESPONSE", { status: response.status }); }
    if (!response.ok) throw new ScoreTransferError("RESPONSE", { error: payload?.error, code: payload?.code, status: response.status });
    if (!payload || typeof payload !== "object") throw new ScoreTransferError("RESPONSE", { status: response.status });
    return payload;
  }, options);
}

type UploadReceipt = { identity: string; key: string };
const receipts = new Map<string, UploadReceipt[]>();
const storageKey = (accountId: string) => `score-upload-requests:v1:${accountId}`;
function readReceipts(accountId: string) {
  let existing = receipts.get(accountId);
  if (!existing) {
    try {
      const raw = JSON.parse(sessionStorage.getItem(storageKey(accountId)) ?? "[]") as unknown;
      existing = Array.isArray(raw) ? raw.filter((item): item is UploadReceipt => typeof item?.identity === "string" && /^[a-f0-9-]{36}$/iu.test(item?.key)) : [];
    } catch { existing = []; }
    receipts.set(accountId, existing);
  }
  return existing;
}
function writeReceipts(accountId: string, values: UploadReceipt[]) {
  receipts.set(accountId, values);
  try { sessionStorage.setItem(storageKey(accountId), JSON.stringify(values)); } catch { /* Keep the in-memory identity when storage is unavailable. */ }
}
/** Hashes contain no file names or contents; account boundaries prevent receipt reuse. */
export function getUploadReceipt(accountId: string, identity: string) {
  const values = readReceipts(accountId);
  const existing = values.find(item => item.identity === identity);
  if (existing) return { ...existing, reused: true };
  const receipt = { identity, key: crypto.randomUUID() };
  writeReceipts(accountId, [...values, receipt]);
  return { ...receipt, reused: false };
}
export function latestUploadReceipt(accountId: string) {
  return readReceipts(accountId).at(-1) ?? null;
}
export function forgetUploadReceipt(accountId: string, key: string) {
  writeReceipts(accountId, readReceipts(accountId).filter(item => item.key !== key));
}
