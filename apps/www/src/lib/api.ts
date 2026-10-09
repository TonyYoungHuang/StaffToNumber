import { localizeBrowserApiError } from "@score/i18n";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number; code?: string };

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      cache: "no-store",
      credentials: "include",
    });

    const payload = await response.json().catch(() => null) as (T & { error?: string; code?: string }) | null;
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
    return {
      ok: false,
      status: 0,
      error: localizeBrowserApiError({ error: error instanceof Error ? error.message : "Network request failed.", status: 0 }),
    };
  }
}
