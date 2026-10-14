import { localizeBrowserApiError } from "@score/i18n";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number; code?: string };

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 60_000);
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      cache: "no-store",
      credentials: "include",
    });

    const body = await response.text();
    let payload: (T & { error?: string; code?: string }) | null = null;
    try { payload = JSON.parse(body); } catch { /* Report malformed success responses explicitly below. */ }
    if (response.ok && (!payload || typeof payload !== "object")) {
      return { ok: false, status: response.status, code: "API_INVALID_RESPONSE", error: localizeBrowserApiError({ error: "The server response was incomplete. Please retry.", code: "API_INVALID_RESPONSE", status: response.status }) };
    }
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        code: payload?.code,
        error: localizeBrowserApiError({ error: payload?.error ?? "Request failed.", code: payload?.code, status: response.status }),
      };
    }

    return {
      ok: true,
      data: payload as T,
    };
  } catch (error) {
    const code = timedOut ? "API_REQUEST_TIMEOUT" : options.signal?.aborted ? "API_REQUEST_CANCELLED" : "API_NETWORK_ERROR";
    return {
      ok: false,
      status: 0,
      code,
      error: localizeBrowserApiError({ error: timedOut ? "The request timed out. Please retry." : options.signal?.aborted ? "The request was cancelled." : error instanceof Error ? error.message : "Network request failed.", code, status: 0 }),
    };
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
  }
}
