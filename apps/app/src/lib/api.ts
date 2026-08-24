export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number; data?: T };

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const headers = new Headers(options.headers);
    if (options.body != null && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      cache: "no-store",
      credentials: "include",
    });

    const payload = await response.json().catch(() => null) as (T & { error?: string }) | null;

    if (!response.ok) {
      return {
        ok: false,
        error: payload?.error ?? "Request failed.",
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
      error: error instanceof Error ? error.message : "Network request failed.",
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
    const payload = await response.json().catch(() => null) as (T & { error?: string }) | null;
    if (!response.ok) return { ok: false, error: payload?.error ?? "Upload failed.", status: response.status, ...(payload ? { data: payload } : {}) };
    return { ok: true, data: payload as T };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Network request failed.", status: 0 };
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
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      return { ok: false as const, error: payload?.error ?? "Download failed.", status: response.status };
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
    return { ok: false as const, error: error instanceof Error ? error.message : "Network request failed.", status: 0 };
  }
}
