// Per-tab, short-lived continuations are written only by an explicit action.
// They carry no session or Google tokens and are consumed before resuming.
const PREFIX = "score-auth-intent:";
const TTL = 10 * 60 * 1000;
function currentIntentPath() {
  const path = new URL(window.location.pathname + window.location.search + window.location.hash, window.location.origin);
  path.searchParams.delete("google_auth");
  return path.pathname + path.search + path.hash;
}
export function saveAuthIntent<T>(kind: string, value: T) {
  try { window.sessionStorage.setItem(PREFIX + kind, JSON.stringify({ value, path: currentIntentPath(), savedAt: Date.now() })); } catch { /* The popup still retains its in-memory callback. */ }
}
export function consumeAuthIntent<T>(kind: string): T | undefined {
  try {
    const raw = window.sessionStorage.getItem(PREFIX + kind);
    if (!raw) return undefined;
    window.sessionStorage.removeItem(PREFIX + kind);
    const item = JSON.parse(raw);
    const elapsed = Date.now() - item.savedAt;
    return item.path === currentIntentPath() && Number.isFinite(elapsed) && elapsed >= 0 && elapsed <= TTL ? item.value as T : undefined;
  } catch { return undefined; }
}
export function clearAuthIntent(kind: string) { try { window.sessionStorage.removeItem(PREFIX + kind); } catch { /* Ignore storage failures. */ } }
