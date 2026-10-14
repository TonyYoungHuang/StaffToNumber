import { localizeBrowserApiError } from "@score/i18n";
import { sharedInFlightRequest, SCORE_READ_TIMEOUT_MS } from "@score/shared";
import { ApiTransportError, withApiDeadline } from "./api-deadline";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number; code?: string; data?: T };

type ApiRequestOptions = RequestInit & { timeoutMs?: number };

function transportFailure(error: unknown) {
  const code = error instanceof ApiTransportError ? error.code
    : error instanceof Error && error.name === "AbortError" ? "API_REQUEST_CANCELLED" : "API_NETWORK_ERROR";
  const chinese = typeof document !== "undefined" && /^zh/iu.test(document.documentElement.lang);
  const messages = {
    API_REQUEST_TIMEOUT: chinese ? "请求超时，请先查看原操作结果，再重试。" : "The request timed out. Check the original result before retrying.",
    API_REQUEST_CANCELLED: chinese ? "请求已取消，可重新查看结果。" : "Request cancelled. You can check the result again.",
    API_INVALID_RESPONSE: chinese ? "服务器响应不完整，请查看原操作结果后重试。" : "The server response was incomplete. Check the original result before retrying.",
    API_NETWORK_ERROR: chinese ? "网络连接中断，请检查网络后重新查看结果。" : "The connection was interrupted. Check your connection and retry reading the result.",
  };
  return { ok: false as const, status: 0, code, error: messages[code] };
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<ApiResult<T>> {
  const scoreRead = (options.method ?? "GET").toUpperCase() === "GET" && /^\/api\/scores(?:\?[^#]*)?$|^\/api\/scores\/[^/?]+(?:\/jobs)?(?:\?[^#]*)?$/u.test(path);
  if (!scoreRead) return performApiRequest<T>(path, options);
  const headers = new Headers(options.headers);
  const timeoutMs = options.timeoutMs ?? (/\/jobs(?:\?|$)/u.test(path) ? 30_000 : SCORE_READ_TIMEOUT_MS);
  const key = `score-read:${API_BASE_URL}${path}:${timeoutMs}:${JSON.stringify(Array.from(headers.entries()))}`;
  try {
    return await sharedInFlightRequest(key, async signal => {
      return performApiRequest<T>(path, { ...options, signal, timeoutMs });
    }, options.signal ?? undefined);
  } catch (error) {
    return transportFailure(error);
  }
}

async function performApiRequest<T>(path: string, options: ApiRequestOptions): Promise<ApiResult<T>> {
  try {
    const { timeoutMs = 60_000, ...requestOptions } = options;
    return await withApiDeadline(async signal => {
    const headers = new Headers(options.headers);
    if (options.body != null && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      signal,
      headers,
      cache: "no-store",
      credentials: "include",
    });

    const payload = await response.json().catch(() => null) as (T & { error?: string; code?: string }) | null;

    if (!response.ok) {
      return {
        ok: false,
        error: localizeBrowserApiError({ error: payload?.error ?? "Request failed.", code: payload?.code, status: response.status }),
        status: response.status,
        ...(payload?.code ? { code: payload.code } : {}),
        ...(payload ? { data: payload } : {}),
      };
    }

    if (response.status !== 204 && (payload === null || typeof payload !== "object")) throw new ApiTransportError("API_INVALID_RESPONSE", "Incomplete response.");
    return {
      ok: true,
      data: payload as T,
    };
    }, { signal: options.signal, timeoutMs });
  } catch (error) {
    return transportFailure(error);
  }
}

export async function apiMultipartRequest<T>(path: string, formData: FormData, token: string, options: ApiRequestOptions = {}): Promise<ApiResult<T>> {
  try {
    return await withApiDeadline(async signal => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      cache: "no-store",
      credentials: "include",
      signal,
    });
    const payload = await response.json().catch(() => null) as (T & { error?: string; code?: string }) | null;
    if (!response.ok) return { ok: false, error: localizeBrowserApiError({ error: payload?.error ?? "Upload failed.", code: payload?.code, status: response.status }), status: response.status, ...(payload?.code ? { code: payload.code } : {}), ...(payload ? { data: payload } : {}) };
    if (payload === null || typeof payload !== "object") throw new ApiTransportError("API_INVALID_RESPONSE", "Incomplete upload response.");
    return { ok: true, data: payload as T };
    }, { signal: options.signal, timeoutMs: options.timeoutMs ?? 180_000 });
  } catch (error) {
    return transportFailure(error);
  }
}

export async function downloadAuthenticatedFile(path: string, token: string, fallbackName = "download") {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      credentials: "include",
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string; code?: string } | null;
      return { ok: false as const, error: localizeBrowserApiError({ error: payload?.error ?? "Download failed.", code: payload?.code, status: response.status }), status: response.status };
    }
    const encodedName = response.headers.get("content-disposition")?.match(/filename\*=UTF-8''([^;]+)/iu)?.[1];
    const fileName = encodedName ? decodeURIComponent(encodedName) : fallbackName;
    const objectUrl = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    return { ok: true as const, fileName };
  } catch (error) {
    return { ok: false as const, error: localizeBrowserApiError({ error: error instanceof Error ? error.message : "Network request failed.", status: 0 }), status: 0 };
  }
}
