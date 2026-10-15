import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { validateAuthReturnPath } from "@score/shared";

export const GOOGLE_OAUTH_TTL_MS = 5 * 60_000;
const randomValue = () => randomBytes(32).toString("base64url");
const randomPattern = /^[a-zA-Z0-9_-]{43}$/u;

export type GoogleOAuthTransaction = {
  version: 1;
  state: string;
  nonce: string;
  verifier: string;
  transactionId: string;
  origin: string;
  returnPath: string;
  returnContextId?: string;
  mode: "popup" | "redirect";
  locale: string;
  expiresAt: number;
};

/** Auth can return to checkout/activation themselves; payment returns cannot. */
export function validateGoogleReturnPath(value: unknown, appOrigin: boolean): string | null {
  return validateAuthReturnPath(appOrigin ? "app" : "www", value);
}

export function googleAllowedOrigins(input: { publicSiteUrl: string; publicAppUrl: string; allowedOrigins: string[] }) {
  const origins = new Set<string>();
  for (const value of [input.publicSiteUrl, input.publicAppUrl, ...input.allowedOrigins]) {
    try {
      const url = new URL(value);
      if (!url.username && !url.password && (url.protocol === "https:" || /^localhost$|^127\.0\.0\.1$/u.test(url.hostname))) origins.add(url.origin);
      if (url.protocol === "https:" && ["scoretransposer.com", "www.scoretransposer.com"].includes(url.hostname)) {
        origins.add("https://scoretransposer.com");
        origins.add("https://www.scoretransposer.com");
      }
    } catch { /* Invalid configured origins grant no access. */ }
  }
  return origins;
}

export function createGoogleOAuthTransaction(input: Omit<GoogleOAuthTransaction, "version" | "state" | "nonce" | "verifier" | "expiresAt">, now = Date.now()): GoogleOAuthTransaction {
  return { ...input, version: 1, state: randomValue(), nonce: randomValue(), verifier: randomValue(), expiresAt: now + GOOGLE_OAUTH_TTL_MS };
}

export function googlePkceChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

function signature(value: string, secret: string) {
  return createHmac("sha256", secret).update(`score-google-oauth-v1\0${value}`).digest("base64url");
}

export function signGoogleOAuthTransaction(transaction: GoogleOAuthTransaction, secret: string) {
  if (!secret) throw new Error("Google code sign-in is unavailable.");
  const payload = Buffer.from(JSON.stringify(transaction)).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

export function readGoogleOAuthTransaction(value: string | undefined, state: string, secret: string, now = Date.now()): GoogleOAuthTransaction | null {
  if (!secret || !value || value.length > 4096 || !randomPattern.test(state)) return null;
  const [payload, suppliedSignature, extra] = value.split(".");
  if (!payload || !suppliedSignature || extra) return null;
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(signature(payload, secret));
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const transaction = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as GoogleOAuthTransaction;
    if (transaction.version !== 1 || transaction.state !== state || !randomPattern.test(transaction.nonce) || !randomPattern.test(transaction.verifier)
      || !/^[a-zA-Z0-9_-]{16,128}$/u.test(transaction.transactionId)
      || !["popup", "redirect"].includes(transaction.mode) || typeof transaction.origin !== "string" || typeof transaction.returnPath !== "string"
      || transaction.returnContextId !== undefined && transaction.returnContextId !== state
      || typeof transaction.locale !== "string" || !Number.isSafeInteger(transaction.expiresAt) || transaction.expiresAt <= now || transaction.expiresAt > now + GOOGLE_OAUTH_TTL_MS) return null;
    return transaction;
  } catch { return null; }
}

export function googleTransactionCookieName(state: string) {
  return `score_google_oauth_${createHash("sha256").update(state).digest("hex").slice(0, 24)}`;
}

export function buildGoogleTransactionCookie(state: string, value: string, publicApiUrl: string, expired = false) {
  return `${googleTransactionCookieName(state)}=${value}; Path=/api/auth/google; Max-Age=${expired ? 0 : GOOGLE_OAUTH_TTL_MS / 1000}; HttpOnly; SameSite=Lax${publicApiUrl.startsWith("https://") ? "; Secure" : ""}`;
}

export function readGoogleTransactionCookie(header: string | undefined, state: string) {
  const name = googleTransactionCookieName(state);
  const matches = header?.split(";").map(part => part.trim()).filter(part => part.startsWith(`${name}=`));
  // Duplicate cookies are ambiguous, including cookies planted by a sibling subdomain.
  return matches?.length === 1 ? matches[0]!.slice(name.length + 1) : undefined;
}

/** Cookies survive restart; Google also enforces single-use code + this PKCE verifier. */
export function createGoogleReplayGuard() {
  const consumed = new Map<string, number>();
  return (transaction: GoogleOAuthTransaction, now = Date.now()) => {
    for (const [key, expiry] of consumed) if (expiry <= now) consumed.delete(key);
    if (transaction.expiresAt <= now || consumed.has(transaction.state)) return false;
    // Fail closed under exceptional traffic rather than evicting a live consumed state.
    if (consumed.size >= 20_000) return false;
    consumed.set(transaction.state, transaction.expiresAt);
    return true;
  };
}

/** Large B2 snapshots must not overflow cookies. No Google/session credentials are stored here. */
export function createGoogleReturnContextStore() {
  const contexts = new Map<string, { path: string; expiresAt: number; bytes: number }>();
  let totalBytes = 0;
  function remove(state: string) {
    const item = contexts.get(state);
    if (item) { contexts.delete(state); totalBytes -= item.bytes; }
  }
  function prune(now: number) { for (const [state, item] of contexts) if (item.expiresAt <= now) remove(state); }
  return {
    save(state: string, path: string, expiresAt: number, now = Date.now()) {
      prune(now);
      const bytes = Buffer.byteLength(path, "utf8");
      if (!randomPattern.test(state) || contexts.has(state) || path.length > 24_576 || expiresAt <= now || expiresAt > now + GOOGLE_OAUTH_TTL_MS
        || contexts.size >= 1000 || totalBytes + bytes > 16 * 1024 * 1024) return false;
      contexts.set(state, { path, expiresAt, bytes }); totalBytes += bytes;
      return true;
    },
    consume(state: string, now = Date.now()) {
      prune(now);
      const item = contexts.get(state);
      remove(state);
      return item?.path ?? null;
    },
  };
}

/** Never serialize OAuth query credentials into application request logs. */
export function sanitizeAuthLogUrl(value: string) {
  return /^\/api\/auth\/google(?:\/|\?|$)/u.test(value) ? value.split("?")[0]! : value;
}
