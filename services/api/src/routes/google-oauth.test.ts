import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import formbody from "@fastify/formbody";
import { runInNewContext } from "node:vm";
import { normalizeCheckoutReturnState } from "@score/shared";
import { registerGoogleOAuthRoutes } from "./google-oauth.js";
import { createGoogleReplayGuard, createGoogleReturnContextStore, googlePkceChallenge, readGoogleOAuthTransaction, signGoogleOAuthTransaction } from "../lib/google-oauth.js";

const settings = { googleClientId: "existing-test-client-id", googleClientSecret: "fake-unit-test-secret", publicApiUrl: "https://api.scoretransposer.com", publicAppUrl: "https://app.scoretransposer.com", publicSiteUrl: "https://scoretransposer.com", allowedOrigins: ["https://www.scoretransposer.com"], sessionDays: 30 };
const transactionId = "client_transaction_1234567890";

async function fixture(input: { secret?: string; exchangeFails?: boolean; verifyFails?: boolean; mode?: "popup" | "redirect"; returnPath?: string; locale?: string; loseReturnContext?: boolean } = {}) {
  const app = Fastify();
  await app.register(formbody);
  const config = { ...settings, googleClientSecret: input.secret ?? settings.googleClientSecret };
  const exchanges: URLSearchParams[] = [], verifications: unknown[][] = [], authenticated: unknown[] = [];
  const returnContexts = createGoogleReturnContextStore();
  await app.register(async scope => {
    await registerGoogleOAuthRoutes(scope, {
      config,
      claimTransaction: createGoogleReplayGuard(),
      returnContexts: input.loseReturnContext ? { ...returnContexts, consume: () => null } : returnContexts,
      fetch: (async (url, options) => {
        assert.equal(url, "https://oauth2.googleapis.com/token");
        assert.equal(options?.method, "POST");
        assert.equal(options?.redirect, "error");
        exchanges.push(new URLSearchParams(options?.body as URLSearchParams));
        return new Response(JSON.stringify({ id_token: "mock-id-token", access_token: "must-never-leak", refresh_token: "must-never-store" }), { status: input.exchangeFails ? 400 : 200 });
      }) as typeof fetch,
      verifyCredential: async (...args) => {
        verifications.push(args);
        if (input.verifyFails) throw new Error("bad nonce: must not be logged");
        return { subject: "known-account", email: "known@example.invalid", name: null, picture: null };
      },
      authenticate: account => { authenticated.push(account); return "new-random-session-for-test"; },
    });
  }, { prefix: "/api" });
  const startUrl = `/api/auth/google/start?${new URLSearchParams({ origin: config.publicAppUrl, return_path: input.returnPath ?? "/scores?lang=ja#visual-editor", transaction_id: transactionId, mode: input.mode ?? "popup", locale: input.locale ?? "ja" })}`;
  const start = () => app.inject({ method: "GET", url: startUrl, headers: { referer: `${config.publicAppUrl}/scores`, "sec-fetch-site": "same-site" } });
  return { app, config, start, startUrl, exchanges, verifications, authenticated };
}

test("Google start redirects with state/nonce/S256 and only identity scopes; callback creates shared session", async () => {
  const f = await fixture();
  try {
    assert.equal((await f.app.inject("/api/auth/google/config")).json().codeFlowAvailable, true);
    const start = await f.start();
    assert.equal(start.statusCode, 302);
    const auth = new URL(String(start.headers.location));
    assert.equal(auth.origin, "https://accounts.google.com");
    assert.equal(auth.searchParams.get("redirect_uri"), "https://api.scoretransposer.com/api/auth/google/callback");
    assert.equal(auth.searchParams.get("scope"), "openid email profile");
    assert.equal(auth.searchParams.get("response_type"), "code");
    assert.equal(auth.searchParams.get("code_challenge_method"), "S256");
    assert.equal(auth.searchParams.get("hl"), "ja");
    for (const key of ["return_path", "transaction_id", "login_hint", "access_type", "prompt", "client_secret"]) assert.equal(auth.searchParams.has(key), false, key);
    const cookie = String(start.headers["set-cookie"]).split(";")[0]!;
    const state = auth.searchParams.get("state")!;
    const transaction = readGoogleOAuthTransaction(cookie.slice(cookie.indexOf("=") + 1), state, f.config.googleClientSecret)!;
    assert.equal(auth.searchParams.get("code_challenge"), googlePkceChallenge(transaction.verifier));
    assert.equal(auth.searchParams.get("nonce"), transaction.nonce);
    const callback = await f.app.inject({ method: "GET", url: `/api/auth/google/callback?state=${state}&code=mock-code`, headers: { cookie } });
    assert.equal(callback.statusCode, 200);
    assert.match(callback.body, /"type":"score-google-auth"/u);
    assert.match(callback.body, /"status":"success"/u);
    assert.match(callback.body, new RegExp(transactionId, "u"));
    assert.match(callback.body, /postMessage\(message,"https:\/\/app.scoretransposer.com"\)/u);
    assert.match(callback.body, /window.location.replace\("https:\/\/app.scoretransposer.com\/scores\?lang=ja&google_auth=success#visual-editor"\)/u);
    assert.doesNotMatch(callback.body, /new-random-session|mock-code|mock-id-token|must-never/u);
    assert.match(String(callback.headers["set-cookie"]), /score_session=new-random-session-for-test/u);
    assert.match(String(callback.headers["set-cookie"]), /Max-Age=0/u);
    assert.match(String(callback.headers["set-cookie"]), /Domain=scoretransposer.com/u);
    assert.match(String(callback.headers["content-security-policy"]), /frame-ancestors 'none'/u);
    assert.equal(f.exchanges[0]!.get("code_verifier"), transaction.verifier);
    assert.equal(f.exchanges[0]!.get("client_secret"), settings.googleClientSecret);
    assert.deepEqual(f.verifications[0], ["mock-id-token", settings.googleClientId, transaction.nonce]);
    assert.equal(f.authenticated.length, 1);
    const replay = await f.app.inject({ method: "GET", url: `/api/auth/google/callback?state=${state}&code=another-code`, headers: { cookie } });
    assert.equal(replay.statusCode, 400);
    assert.equal(f.exchanges.length, 1);
  } finally { await f.app.close(); }
});

test("POST form start retains a large B2 return snapshot with a small signed browser cookie", async () => {
  const returnState = { version: 1, intent: "restore_view", transpose: { partRangeProfileIds: Object.fromEntries(Array.from({ length: 60 }, (_, index) => [`part-${index}`, `range-${"a".repeat(80)}`])) } };
  assert.ok(normalizeCheckoutReturnState(returnState), "the large snapshot is valid under existing B2 rules");
  const path = `/checkout?plan=single-score&continue=1&passMode=top_up&returnState=${encodeURIComponent(JSON.stringify(returnState))}&order_id=original#payment`;
  assert.ok(path.length > 6000 && path.length <= 24_576);
  const f = await fixture({ mode: "redirect", returnPath: path });
  try {
    const start = await f.app.inject({ method: "POST", url: "/api/auth/google/start", headers: { origin: settings.publicAppUrl, "content-type": "application/x-www-form-urlencoded", "sec-fetch-site": "same-site" }, payload: f.startUrl.split("?")[1]! });
    assert.equal(start.statusCode, 303, start.body);
    const state = new URL(String(start.headers.location)).searchParams.get("state")!, cookie = String(start.headers["set-cookie"]).split(";")[0]!;
    assert.ok(cookie.length < 3800);
    const transaction = readGoogleOAuthTransaction(cookie.slice(cookie.indexOf("=") + 1), state, f.config.googleClientSecret)!;
    assert.equal(transaction.returnPath, "/checkout");
    assert.equal(transaction.returnContextId, state);
    const callback = await f.app.inject({ url: `/api/auth/google/callback?state=${state}&code=mock-code`, headers: { cookie } });
    assert.equal(callback.statusCode, 200);
    assert.equal(callback.headers.location, undefined);
    assert.equal(callback.headers["cache-control"], "no-store");
    assert.equal(callback.headers["referrer-policy"], "no-referrer");
    assert.match(String(callback.headers["content-security-policy"]), /script-src 'nonce-/u);
    assert.match(callback.body, /<html lang="ja">/u);
    const navigations: string[] = [];
    const script = callback.body.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/u)![1]!;
    runInNewContext(script, { history: { replaceState() {} }, window: { opener: { postMessage() { throw new Error("Full-page redirect must not send to an opener."); } }, location: { replace(value: string) { navigations.push(value); } } } });
    assert.equal(navigations.length, 1);
    const target = new URL(navigations[0]!);
    const original = new URL(path, settings.publicAppUrl);
    assert.equal(target.pathname, original.pathname);
    assert.equal(target.hash, original.hash);
    for (const [key, value] of original.searchParams) assert.equal(target.searchParams.get(key), value, key);
    assert.equal(f.authenticated.length, 1);
    assert.equal((await f.app.inject({ method: "POST", url: "/api/auth/google/start", headers: { origin: "https://evil.test", "content-type": "application/x-www-form-urlencoded" }, payload: f.startUrl.split("?")[1]! })).statusCode, 403);
    assert.equal((await f.app.inject({ method: "POST", url: "/api/auth/google/start", headers: { "content-type": "application/x-www-form-urlencoded", referer: `${settings.publicAppUrl}/checkout` }, payload: f.startUrl.split("?")[1]! })).statusCode, 403);
    const tooLarge = new URLSearchParams(f.startUrl.split("?")[1]!);
    tooLarge.set("return_path", `/checkout?returnState=${"x".repeat(24_576)}`);
    assert.equal((await f.app.inject({ method: "POST", url: "/api/auth/google/start", headers: { origin: settings.publicAppUrl, "content-type": "application/x-www-form-urlencoded" }, payload: tooLarge.toString() })).statusCode, 400);
  } finally { await f.app.close(); }
});

test("Losing a large return context on restart fails safe before Google exchange or account issuance", async () => {
  const f = await fixture({ mode: "redirect", returnPath: `/checkout?plan=single-score&returnState=${"x".repeat(7000)}#payment`, loseReturnContext: true });
  try {
    const start = await f.app.inject({ method: "POST", url: "/api/auth/google/start", headers: { origin: settings.publicAppUrl, "content-type": "application/x-www-form-urlencoded" }, payload: f.startUrl.split("?")[1]! });
    const state = new URL(String(start.headers.location)).searchParams.get("state")!;
    const callback = await f.app.inject({ url: `/api/auth/google/callback?state=${state}&code=mock-code`, headers: { cookie: String(start.headers["set-cookie"]).split(";")[0]! } });
    assert.equal(callback.statusCode, 302);
    assert.equal(new URL(String(callback.headers.location)).searchParams.get("google_auth"), "error");
    assert.equal(f.exchanges.length, 0);
    assert.equal(f.authenticated.length, 0);
  } finally { await f.app.close(); }
});

test("Google redirect completion returns to original query and hash, retaining B2 intent/top_up", async () => {
  const path = "/checkout?plan=single-score&continue=1&passMode=top_up&intentId=explicit&orderId=original#payment";
  const f = await fixture({ mode: "redirect", returnPath: path, locale: "zh-TW" });
  try {
    const start = await f.start(), auth = new URL(String(start.headers.location));
    assert.equal(auth.searchParams.get("hl"), "zh-TW");
    const callback = await f.app.inject({ method: "GET", url: `/api/auth/google/callback?state=${auth.searchParams.get("state")}&code=mock-code`, headers: { cookie: String(start.headers["set-cookie"]).split(";")[0]! } });
    assert.equal(callback.statusCode, 302);
    const target = new URL(String(callback.headers.location));
    assert.equal(target.origin, settings.publicAppUrl);
    assert.equal(target.pathname, "/checkout");
    assert.equal(target.searchParams.get("continue"), "1");
    assert.equal(target.searchParams.get("passMode"), "top_up");
    assert.equal(target.searchParams.get("intentId"), "explicit");
    assert.equal(target.searchParams.get("orderId"), "original");
    assert.equal(target.searchParams.get("google_auth"), "success");
    assert.equal(target.hash, "#payment");
    assert.equal(f.authenticated.length, 1);
  } finally { await f.app.close(); }
});

test("Google redirect preserves literal tildes and lowercase percent encodings for exact per-tab intent matching", async () => {
  const path = "/scores?mode=a~b&next=%2fscores#x";
  const f = await fixture({ mode: "redirect", returnPath: path });
  try {
    const start = await f.start(), state = new URL(String(start.headers.location)).searchParams.get("state")!;
    const callback = await f.app.inject({ url: `/api/auth/google/callback?state=${state}&code=mock-code`, headers: { cookie: String(start.headers["set-cookie"]).split(";")[0]! } });
    assert.equal(callback.statusCode, 302);
    assert.equal(callback.headers.location, `${settings.publicAppUrl}/scores?mode=a~b&next=%2fscores&google_auth=success#x`);
  } finally { await f.app.close(); }
});

test("All existing plan and billing combinations survive Google redirect continuation unchanged", async () => {
  for (const plan of ["single-score", "starter-monthly", "starter-annual", "converter-pro-monthly", "converter-pro-annual"]) {
    for (const billing of plan === "single-score" ? ["one_time"] : ["one_time", "subscription"]) {
      const path = `/checkout?plan=${plan}&billing=${billing}&continue=1&return_path=%2Fscores%2Foriginal&intent=explicit${plan === "single-score" ? "&passMode=top_up" : ""}#payment`;
      const f = await fixture({ mode: "redirect", returnPath: path });
      try {
        const start = await f.start(), state = new URL(String(start.headers.location)).searchParams.get("state")!;
        const callback = await f.app.inject({ url: `/api/auth/google/callback?state=${state}&code=mock-code`, headers: { cookie: String(start.headers["set-cookie"]).split(";")[0]! } });
        const target = new URL(String(callback.headers.location));
        target.searchParams.delete("google_auth");
        assert.equal(`${target.pathname}${target.search}${target.hash}`, path);
      } finally { await f.app.close(); }
    }
  }
});

test("Concurrent callbacks exchange a state only once, and expired signed cookies fail before exchange", async () => {
  const f = await fixture();
  try {
    const start = await f.start(), state = new URL(String(start.headers.location)).searchParams.get("state")!, cookie = String(start.headers["set-cookie"]).split(";")[0]!;
    const responses = await Promise.all([1, 2].map(() => f.app.inject({ url: `/api/auth/google/callback?state=${state}&code=same-code`, headers: { cookie } })));
    assert.deepEqual(responses.map(response => response.statusCode).sort(), [200, 400]);
    assert.equal(f.exchanges.length, 1);
    assert.equal(f.authenticated.length, 1);
    const next = await f.start(), nextState = new URL(String(next.headers.location)).searchParams.get("state")!, nextCookie = String(next.headers["set-cookie"]).split(";")[0]!;
    const transaction = readGoogleOAuthTransaction(nextCookie.slice(nextCookie.indexOf("=") + 1), nextState, f.config.googleClientSecret)!;
    transaction.expiresAt = Date.now() - 1;
    const expired = `${nextCookie.slice(0, nextCookie.indexOf("=") + 1)}${signGoogleOAuthTransaction(transaction, f.config.googleClientSecret)}`;
    assert.equal((await f.app.inject({ url: `/api/auth/google/callback?state=${nextState}&code=fresh-code`, headers: { cookie: expired } })).statusCode, 400);
    assert.equal(f.exchanges.length, 1);
  } finally { await f.app.close(); }
});

test("Google start rejects bad origin, source, redirect path and client transaction id", async () => {
  const f = await fixture();
  try {
    for (const value of ["//evil.test", "/%5cevil", "/%252fevil", "/scores?x=%0a", "https://evil.test", "/api/auth/google/callback"]) {
      assert.equal((await f.app.inject(f.startUrl.replace(/return_path=[^&]+/u, `return_path=${encodeURIComponent(value)}`))).statusCode, 400, value);
    }
    assert.equal((await f.app.inject(f.startUrl.replace(encodeURIComponent(settings.publicAppUrl), encodeURIComponent("https://evil.test")))).statusCode, 400);
    assert.equal((await f.app.inject(f.startUrl.replace(transactionId, "short"))).statusCode, 400);
    assert.equal((await f.app.inject({ url: f.startUrl, headers: { origin: "https://evil.test" } })).statusCode, 403);
    assert.equal((await f.app.inject({ url: f.startUrl, headers: { referer: "https://evil.test/", "sec-fetch-site": "cross-site" } })).statusCode, 403);
    assert.equal((await f.app.inject({ url: f.startUrl, headers: { referer: "https://www.scoretransposer.com/" } })).statusCode, 403);
  } finally { await f.app.close(); }
});

test("Google callback rejects missing/tampered browser cookie and mismatched state before exchange", async () => {
  const f = await fixture();
  try {
    const start = await f.start(), state = new URL(String(start.headers.location)).searchParams.get("state")!, cookie = String(start.headers["set-cookie"]).split(";")[0]!;
    assert.equal((await f.app.inject(`/api/auth/google/callback?state=${state}&code=mock-code`)).statusCode, 400);
    assert.equal((await f.app.inject({ url: `/api/auth/google/callback?state=${"x".repeat(43)}&code=mock-code`, headers: { cookie } })).statusCode, 400);
    assert.equal((await f.app.inject({ url: `/api/auth/google/callback?state=${state}&code=mock-code`, headers: { cookie: `${cookie.slice(0, -1)}!` } })).statusCode, 400);
    assert.equal((await f.app.inject({ url: `/api/auth/google/callback?state=${state}&code=mock-code`, headers: { cookie, origin: "https://evil.test" } })).statusCode, 403);
    assert.equal(f.exchanges.length, 0);
    assert.equal(f.authenticated.length, 0);
  } finally { await f.app.close(); }
});

test("Missing secret reports unavailable and safely enables legacy GIS without Google calls", async () => {
  for (const mode of ["popup", "redirect"] as const) {
    const f = await fixture({ secret: "", mode });
    try {
      assert.equal((await f.app.inject("/api/auth/google/config")).json().codeFlowAvailable, false);
      const start = await f.start();
      assert.equal(start.headers["set-cookie"], undefined);
      if (mode === "popup") assert.match(start.body, /"status":"unavailable"/u);
      else assert.equal(new URL(String(start.headers.location)).searchParams.get("google_auth"), "unavailable");
      assert.equal(f.exchanges.length, 0);
      assert.equal(f.authenticated.length, 0);
    } finally { await f.app.close(); }
  }
});

test("Provider rejection, bad nonce and disallowed useragent never issue sessions or leak tokens", async () => {
  for (const scenario of ["exchange", "nonce", "disallowed_useragent", "access_denied"] as const) {
    const f = await fixture({ exchangeFails: scenario === "exchange", verifyFails: scenario === "nonce" });
    try {
      const start = await f.start(), state = new URL(String(start.headers.location)).searchParams.get("state")!;
      const error = ["disallowed_useragent", "access_denied"].includes(scenario) ? `&error=${scenario}` : "&code=mock-code";
      const callback = await f.app.inject({ url: `/api/auth/google/callback?state=${state}${error}`, headers: { cookie: String(start.headers["set-cookie"]).split(";")[0]! } });
      assert.match(callback.body, new RegExp(`"status":"${scenario === "disallowed_useragent" ? scenario : "error"}"`, "u"));
      assert.doesNotMatch(String(callback.headers["set-cookie"]), /score_session=/u);
      assert.doesNotMatch(callback.body, /mock-code|mock-id-token|must-never|bad nonce|fake-unit-test-secret/u);
      assert.equal(f.authenticated.length, 0);
    } finally { await f.app.close(); }
  }
});
