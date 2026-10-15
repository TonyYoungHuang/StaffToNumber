import { randomBytes } from "node:crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import { getGoogleLocale, withGoogleAuthStatus } from "@score/shared";
import { verifyGoogleCredential, type GoogleAccount } from "../lib/google-auth.js";
import {
  buildGoogleTransactionCookie, createGoogleOAuthTransaction, createGoogleReplayGuard, createGoogleReturnContextStore, googleAllowedOrigins,
  googlePkceChallenge, readGoogleOAuthTransaction, readGoogleTransactionCookie, signGoogleOAuthTransaction,
  validateGoogleReturnPath, type GoogleOAuthTransaction,
} from "../lib/google-oauth.js";
import { buildSessionCookie } from "../lib/session-cookie.js";

type OAuthConfig = {
  googleClientId: string;
  googleClientSecret: string;
  publicApiUrl: string;
  publicAppUrl: string;
  publicSiteUrl: string;
  allowedOrigins: string[];
  sessionDays: number;
};
type OAuthDependencies = {
  config: OAuthConfig;
  authenticate: (account: GoogleAccount) => string;
  fetch?: typeof fetch;
  verifyCredential?: typeof verifyGoogleCredential;
  claimTransaction?: ReturnType<typeof createGoogleReplayGuard>;
  returnContexts?: ReturnType<typeof createGoogleReturnContextStore>;
};
type CompletionStatus = "success" | "unavailable" | "disallowed_useragent" | "error";
const claimTransaction = createGoogleReplayGuard();

function safeJson(value: unknown) { return JSON.stringify(value).replace(/</gu, "\\u003c").replace(/\u2028/gu, "\\u2028").replace(/\u2029/gu, "\\u2029"); }

function complete(reply: FastifyReply, transaction: Pick<GoogleOAuthTransaction, "origin" | "returnPath" | "transactionId" | "mode" | "locale">, status: CompletionStatus) {
  reply.header("Cache-Control", "no-store").header("Referrer-Policy", "no-referrer");
  // Also mark the no-opener escape from a popup (e.g. a browser COOP policy).
  const target = withGoogleAuthStatus(new URL(transaction.returnPath, transaction.origin).href, status);
  // Avoid an oversized Location response header for a valid large B2 snapshot.
  if (transaction.mode === "redirect" && target.length <= 6000) return reply.redirect(target);
  const nonce = randomBytes(18).toString("base64url");
  reply.header("Content-Type", "text/html; charset=utf-8")
    .header("Content-Security-Policy", `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`)
    .header("X-Content-Type-Options", "nosniff");
  return reply.send(`<!doctype html><html lang="${getGoogleLocale(transaction.locale).htmlLang}"><head><meta charset="utf-8"><title>Google</title></head><body><script nonce="${nonce}">history.replaceState(null,"","/api/auth/google/callback");const message=${safeJson({ type: "score-google-auth", transactionId: transaction.transactionId, status })};if(${transaction.mode === "popup"}&&window.opener){window.opener.postMessage(message,${safeJson(transaction.origin)});window.close();}else{window.location.replace(${safeJson(target)});}</script></body></html>`);
}

export async function registerGoogleOAuthRoutes(app: FastifyInstance, dependencies: OAuthDependencies) {
  const settings = dependencies.config;
  const origins = googleAllowedOrigins(settings);
  const appOrigin = new URL(settings.publicAppUrl).origin;
  const redirectUri = new URL("/api/auth/google/callback", settings.publicApiUrl).href;
  const configured = () => Boolean(settings.googleClientId && settings.googleClientSecret);
  const exchange = dependencies.fetch ?? fetch;
  const verify = dependencies.verifyCredential ?? verifyGoogleCredential;
  const claim = dependencies.claimTransaction ?? claimTransaction;
  const returnContexts = dependencies.returnContexts ?? createGoogleReturnContextStore();

  app.get("/auth/google/config", async (_request, reply) => {
    return reply.header("Cache-Control", "no-store").send({ codeFlowAvailable: configured() });
  });

  app.route({ method: ["GET", "POST"], url: "/auth/google/start", handler: async (request, reply) => {
    reply.header("Cache-Control", "no-store").header("Referrer-Policy", "no-referrer");
    const query = (request.method === "POST" ? request.body ?? {} : request.query) as Record<string, unknown>;
    const origin = typeof query.origin === "string" ? query.origin : "";
    const returnPath = validateGoogleReturnPath(query.return_path, origin === appOrigin);
    const transactionId = typeof query.transaction_id === "string" ? query.transaction_id : "";
    if (!origins.has(origin) || !returnPath || !/^[a-zA-Z0-9_-]{16,128}$/u.test(transactionId) || !["popup", "redirect"].includes(String(query.mode))) {
      return reply.code(400).send({ error: "Invalid Google sign-in target." });
    }
    // A navigation often has no Origin. Validate its Referer and Fetch Metadata instead.
    const source = request.headers.origin ?? request.headers.referer;
    let sourceOrigin: string | null = null;
    try { if (source) sourceOrigin = new URL(source).origin; } catch { sourceOrigin = "invalid"; }
    if (sourceOrigin && sourceOrigin !== origin || request.headers["sec-fetch-site"] === "cross-site"
      || request.method === "POST" && request.headers.origin !== origin) {
      return reply.code(403).send({ error: "Google sign-in must start from this site." });
    }
    let transaction = createGoogleOAuthTransaction({ origin, returnPath, transactionId, mode: query.mode as "popup" | "redirect", locale: getGoogleLocale(query.locale).htmlLang });
    if (!configured()) return complete(reply, transaction, "unavailable");
    let signed = signGoogleOAuthTransaction(transaction, settings.googleClientSecret);
    if (signed.length > 3800) {
      const pathname = new URL(returnPath, origin).pathname;
      transaction = { ...transaction, returnPath: pathname.length <= 512 ? pathname : origin === appOrigin ? "/scores" : "/", returnContextId: transaction.state };
      if (!returnContexts.save(transaction.state, returnPath, transaction.expiresAt)) return complete(reply, transaction, "error");
      signed = signGoogleOAuthTransaction(transaction, settings.googleClientSecret);
    }
    reply.header("Set-Cookie", buildGoogleTransactionCookie(transaction.state, signed, settings.publicApiUrl));
    const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    for (const [key, value] of Object.entries({ client_id: settings.googleClientId, redirect_uri: redirectUri, response_type: "code", scope: "openid email profile", state: transaction.state, nonce: transaction.nonce, code_challenge: googlePkceChallenge(transaction.verifier), code_challenge_method: "S256", hl: getGoogleLocale(transaction.locale).hl })) authorization.searchParams.set(key, value);
    // No URL-provided account hints, forced consent, offline access or refresh tokens.
    return reply.code(request.method === "POST" ? 303 : 302).redirect(authorization.href);
  } });

  app.get("/auth/google/callback", async (request, reply) => {
    reply.header("Cache-Control", "no-store").header("Referrer-Policy", "no-referrer");
    const query = request.query as Record<string, unknown>;
    const state = typeof query.state === "string" ? query.state : "";
    let transaction = readGoogleOAuthTransaction(readGoogleTransactionCookie(request.headers.cookie, state), state, settings.googleClientSecret);
    const callbackOrigin = request.headers.origin;
    if (callbackOrigin && !origins.has(callbackOrigin) && callbackOrigin !== new URL(settings.publicApiUrl).origin && callbackOrigin !== "https://accounts.google.com") {
      return reply.code(403).send({ error: "Invalid Google callback origin." });
    }
    if (!transaction || !origins.has(transaction.origin) || !validateGoogleReturnPath(transaction.returnPath, transaction.origin === appOrigin) || !claim(transaction)) {
      return reply.code(400).send({ error: "Google sign-in expired or was already used. Please start again." });
    }
    const expiredCookie = buildGoogleTransactionCookie(state, "", settings.publicApiUrl, true);
    reply.header("Set-Cookie", expiredCookie);
    if (transaction.returnContextId) {
      const returnPath = returnContexts.consume(transaction.returnContextId);
      if (!returnPath || !validateGoogleReturnPath(returnPath, transaction.origin === appOrigin)) return complete(reply, transaction, "error");
      transaction = { ...transaction, returnPath };
    }
    if (!configured()) return complete(reply, transaction, "unavailable");
    if (query.error) return complete(reply, transaction, query.error === "disallowed_useragent" ? "disallowed_useragent" : "error");
    if (typeof query.code !== "string" || !query.code || query.code.length > 4096 || /[\u0000-\u0020\u007f]/u.test(query.code)) return complete(reply, transaction, "error");
    try {
      const response = await exchange("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({ grant_type: "authorization_code", code: query.code, client_id: settings.googleClientId, client_secret: settings.googleClientSecret, redirect_uri: redirectUri, code_verifier: transaction.verifier }),
        signal: AbortSignal.timeout(10_000),
        redirect: "error",
      });
      if (!response.ok) throw new Error("Google code exchange failed.");
      const body = await response.json() as { id_token?: unknown };
      if (typeof body.id_token !== "string" || body.id_token.length > 20_000) throw new Error("Google ID token missing.");
      const account = await verify(body.id_token, settings.googleClientId, transaction.nonce);
      const token = dependencies.authenticate(account);
      reply.header("Set-Cookie", [expiredCookie, buildSessionCookie({ token, publicApiUrl: settings.publicApiUrl, sessionDays: settings.sessionDays })]);
      return complete(reply, transaction, "success");
    } catch {
      // Provider bodies, codes, ID tokens and secret-bearing exchange errors are never logged.
      request.log.warn({ event: "auth.google_code_failed" }, "Google code sign-in could not be completed.");
      return complete(reply, transaction, "error");
    }
  });
}
