import { localizeBrowserApiError } from "@score/i18n";
import { sharedInFlightRequest, SCORE_READ_TIMEOUT_MS } from "@score/shared";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number; data?: T };

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const scoreRead = (options.method ?? "GET").toUpperCase() === "GET" && /^\/api\/scores(?:\?[^#]*)?$|^\/api\/scores\/[^/?]+(?:\?[^#]*)?$/u.test(path);
  if (!scoreRead) return performApiRequest<T>(path, options);
  const headers = new Headers(options.headers);
  const key = `score-read:${API_BASE_URL}${path}:${JSON.stringify(Array.from(headers.entries()))}`;
  try {
    return await sharedInFlightRequest(key, async signal => {
      const controller = new AbortController();
      const cancel = () => controller.abort();
      signal.addEventListener("abort", cancel, { once: true });
      const timeout = setTimeout(cancel, SCORE_READ_TIMEOUT_MS);
      try { return await performApiRequest<T>(path, { ...options, signal: controller.signal }); }
      finally { clearTimeout(timeout); signal.removeEventListener("abort", cancel); }
    }, options.signal ?? undefined);
  } catch (error) {
    return { ok: false, status: 0, error: localizeBrowserApiError({ error: error instanceof Error ? error.message : "Network request failed.", status: 0 }) };
  }
}

async function performApiRequest<T>(path: string, options: RequestInit): Promise<ApiResult<T>> {
  try {
    const headers = new Headers(options.headers);
    if (options.body != null && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
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
        ...(payload ? { data: payload } : {}),
      };
    }

    return {
      ok: true,
      data: payload as T,
    };
  } catch (error) {
    return {
      ok: false,
      error: localizeBrowserApiError({ error: error instanceof Error ? error.message : "Network request failed.", status: 0 }),
      status: 0,
    };
  }
}

export async function apiMultipartRequest<T>(path: string, formData: FormData, token: string): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      cache: "no-store",
      credentials: "include",
    });
    const payload = await response.json().catch(() => null) as (T & { error?: string; code?: string }) | null;
    if (!response.ok) return { ok: false, error: localizeBrowserApiError({ error: payload?.error ?? "Upload failed.", code: payload?.code, status: response.status }), status: response.status, ...(payload ? { data: payload } : {}) };
    return { ok: true, data: payload as T };
  } catch (error) {
    return { ok: false, error: localizeBrowserApiError({ error: error instanceof Error ? error.message : "Network request failed.", status: 0 }), status: 0 };
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
