import { boundedScoreTransfer, ScoreTransferError } from "./score-transfer-request";

export function hasUsableScoreOutputs(outputIds: readonly string[] | null, files: ReadonlyArray<{ id: string; sizeBytes: number; stale?: boolean }>) {
  if (!outputIds?.length) return false;
  const usable = new Set(files.filter(file => file.id && Number.isFinite(file.sizeBytes) && file.sizeBytes > 0 && !file.stale).map(file => file.id));
  return outputIds.every(id => usable.has(id));
}

export async function readScoreDownload(url: string, headers: HeadersInit, options: { signal?: AbortSignal; timeoutMs?: number; fetch?: typeof fetch } = {}): Promise<Blob> {
  return boundedScoreTransfer(async signal => {
    let response: Response;
    try { response = await (options.fetch ?? fetch)(url, { headers, signal, credentials: "include", cache: "no-store" }); }
    catch { throw new ScoreTransferError("NETWORK"); }
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string; code?: string } | null;
      throw new ScoreTransferError("RESPONSE", { error: payload?.error, code: payload?.code, status: response.status });
    }
    const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
    if (contentType === "text/html" || contentType === "application/problem+json") throw new ScoreTransferError("INVALID_FILE");
    let blob: Blob;
    try { blob = await response.blob(); }
    catch { throw new ScoreTransferError("READ"); }
    if (blob.size === 0 || blob.type.startsWith("text/html")) throw new ScoreTransferError("INVALID_FILE");
    // Compare length only when the browser has not decoded a compressed transfer.
    const length = response.headers.get("content-length");
    if (!response.headers.get("content-encoding") && length && /^\d+$/u.test(length) && Number(length) !== blob.size) throw new ScoreTransferError("INVALID_FILE");
    let prefix: string;
    try { prefix = await blob.slice(0, 256).text(); }
    catch { throw new ScoreTransferError("READ"); }
    if (/^\s*(?:<!doctype\s+html|<html\b|\{\s*"(?:error|code)"\s*:)/iu.test(prefix)) throw new ScoreTransferError("INVALID_FILE");
    return blob;
  }, options);
}
