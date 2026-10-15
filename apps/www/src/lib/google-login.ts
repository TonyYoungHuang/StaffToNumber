import { validateAuthReturnPath } from "@score/shared";

/** Resolve only our app links, including the existing locale/auth wrappers. */
export function googleLoginDestination(href: string, appUrl: string): string | null {
  try {
    const app = new URL(appUrl);
    const url = new URL(href, app);
    if (url.origin !== app.origin || url.username || url.password) return null;
    let path = `${url.pathname}${url.search}${url.hash}`;
    let locale: string | null = null;
    if (url.pathname === "/api/locale") { path = url.searchParams.get("next") ?? ""; locale = url.searchParams.get("locale"); }
    const target = new URL(path, app);
    if (/^\/(?:login|register)\/?$/u.test(target.pathname)) {
      const next = target.searchParams.get("next");
      // Generic sign-in stays on the current public page.
      if (!next) return null;
      path = next;
    }
    const safe = validateAuthReturnPath("app", path);
    if (!safe) return null;
    if (locale) return new URL(`/api/locale?${new URLSearchParams({ locale, next: safe })}`, app).toString();
    return new URL(safe, app).toString();
  } catch { return null; }
}

export type PublicSessionState = "checking" | "signed-in" | "signed-out";

/** A network failure provides no evidence that the user signed out. */
export function publicSessionState(ok: boolean, status?: number): PublicSessionState {
  return ok ? "signed-in" : status === 401 ? "signed-out" : "checking";
}

export function publicLoginResume(raw: string | null, path: string, appUrl: string, now = Date.now()) {
  try {
    const value = JSON.parse(raw ?? "null") as { savedAt?: unknown; path?: unknown; destination?: unknown; purchase?: unknown } | null;
    if (!value || typeof value.savedAt !== "number" || value.savedAt > now || now - value.savedAt > 10 * 60_000 || value.path !== path) return null;
    return {
      savedAt: value.savedAt,
      destination: typeof value.destination === "string" ? googleLoginDestination(value.destination, appUrl) ?? undefined : undefined,
      purchase: value.purchase === true,
    };
  } catch { return null; }
}
