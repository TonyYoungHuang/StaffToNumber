import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGoogleTransactionCookie, createGoogleOAuthTransaction, createGoogleReplayGuard, createGoogleReturnContextStore, googleAllowedOrigins,
  googlePkceChallenge, readGoogleOAuthTransaction, readGoogleTransactionCookie, sanitizeAuthLogUrl,
  signGoogleOAuthTransaction, validateGoogleReturnPath,
} from "./google-oauth.js";

const secret = "test-only-oauth-secret-never-a-real-credential";
const transactionInput = { transactionId: "transaction_12345678", origin: "https://app.scoretransposer.com", returnPath: "/scores?lang=ja#visual-editor", mode: "popup" as const, locale: "ja" };

test("Google transaction uses independent random state, nonce and S256 PKCE", () => {
  const transaction = createGoogleOAuthTransaction(transactionInput, 1000);
  assert.equal(transaction.expiresAt, 301_000);
  assert.equal(new Set([transaction.state, transaction.nonce, transaction.verifier]).size, 3);
  for (const value of [transaction.state, transaction.nonce, transaction.verifier]) assert.match(value, /^[a-zA-Z0-9_-]{43}$/u);
  assert.notEqual(createGoogleOAuthTransaction(transactionInput).state, transaction.state);
  assert.equal(googlePkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
});

test("Google transaction cookie is signed, browser-bound, short lived and HttpOnly", () => {
  const transaction = createGoogleOAuthTransaction(transactionInput, 1000);
  const signed = signGoogleOAuthTransaction(transaction, secret);
  const cookie = buildGoogleTransactionCookie(transaction.state, signed, "https://api.scoretransposer.com");
  assert.match(cookie, /Path=\/api\/auth\/google; Max-Age=300; HttpOnly; SameSite=Lax; Secure$/u);
  assert.doesNotMatch(cookie, /Domain=/u);
  assert.deepEqual(readGoogleOAuthTransaction(readGoogleTransactionCookie(cookie, transaction.state), transaction.state, secret, 1001), transaction);
  assert.equal(readGoogleOAuthTransaction(undefined, transaction.state, secret, 1001), null);
  assert.equal(readGoogleOAuthTransaction(signed, transaction.state, "different-secret", 1001), null);
  assert.equal(readGoogleOAuthTransaction(`${signed.slice(0, -1)}!`, transaction.state, secret, 1001), null);
  assert.equal(readGoogleOAuthTransaction(signed, "x".repeat(43), secret, 1001), null);
  assert.equal(readGoogleOAuthTransaction(signed, transaction.state, secret, transaction.expiresAt), null);
  assert.equal(readGoogleTransactionCookie(`${cookie}; ${cookie}`, transaction.state), undefined);
  assert.throws(() => signGoogleOAuthTransaction(transaction, ""), /unavailable/u);
});

test("Google state is claimed synchronously once, including concurrent callbacks", () => {
  const transaction = createGoogleOAuthTransaction(transactionInput, 1000);
  const claim = createGoogleReplayGuard();
  assert.equal(claim(transaction, 1001), true);
  assert.equal(claim(transaction, 1001), false);
  assert.equal(claim(transaction, transaction.expiresAt), false);
  assert.equal(claim(createGoogleOAuthTransaction(transactionInput, transaction.expiresAt), transaction.expiresAt), true);
});

test("Large Google return contexts are single-use, short-lived and bounded without a database", () => {
  const store = createGoogleReturnContextStore();
  const transaction = createGoogleOAuthTransaction(transactionInput, 1000);
  assert.equal(store.save(transaction.state, "/checkout?state=original", transaction.expiresAt, 1000), true);
  assert.equal(store.save(transaction.state, "/checkout?state=overwrite", transaction.expiresAt, 1000), false);
  assert.equal(store.consume(transaction.state, 1001), "/checkout?state=original");
  assert.equal(store.consume(transaction.state, 1001), null);
  assert.equal(store.save(transaction.state, "/checkout?state=expired", transaction.expiresAt, 1000), true);
  assert.equal(store.consume(transaction.state, transaction.expiresAt), null);
  assert.equal(store.save("bad-state", "/checkout", transaction.expiresAt, 1000), false);
  assert.equal(store.save(transaction.state, "x".repeat(24_577), transaction.expiresAt, 1000), false);
  const contexts = Array.from({ length: 1001 }, () => createGoogleOAuthTransaction(transactionInput, 1000));
  const results = contexts.map(item => store.save(item.state, "x".repeat(24_576), item.expiresAt, 1000));
  assert.ok(results.filter(Boolean).length > 0);
  assert.ok(results.filter(Boolean).length < 1000, "16 MiB limit stops large contexts before the entry limit");
  assert.equal(store.save(transaction.state, "/checkout", transaction.expiresAt + 1, transaction.expiresAt), true, "expired contexts free capacity");
});

test("Google returns preserve complete app and B2 checkout context", () => {
  for (const value of ["/scores/item?lang=zh-CN&task=transpose#visual-editor", "/jobs?mine=1#queue", "/student?lang=ko#assignments", "/checkout?plan=single-score&continue=1&passMode=top_up&orderId=original&return_token=original-return#payment", "/checkout/success?session_id=original&orderId=order#resume", "/activate?next=%2Fscores#redeem", "/login?next=%2Fjobs#email"]) {
    assert.equal(validateGoogleReturnPath(value, true), value);
  }
  assert.equal(validateGoogleReturnPath("/pricing?lang=fr#annual", false), "/pricing?lang=fr#annual");
  assert.equal(validateGoogleReturnPath("/zh-CN/transpose-score?from=home#try", false), "/zh-CN/transpose-score?from=home#try");
  assert.equal(validateGoogleReturnPath("/checkout/success?order_id=original&token=original-return#resume", false), "/checkout/success?order_id=original&token=original-return#resume");
});

test("Google returns reject external, encoded, control-character and callback targets", () => {
  for (const value of ["//evil.test/path", "https://evil.test", "/\\evil.test", "/%5cevil.test", "/%255cevil.test", "/%2fevil.test", "/%252fevil.test", "/%0aevil", "/scores?value=%250d", "/scores\u0000", "/scores\n", "/scores%00", " /scores", "/api/auth/google/callback", "/admin/codes", "/checkout/unknown"]) {
    assert.equal(validateGoogleReturnPath(value, true), null, value);
  }
  assert.equal(validateGoogleReturnPath("/activate", false), null);
});

test("Google origins include existing apex/www/app and explicit staging only", () => {
  const origins = googleAllowedOrigins({ publicSiteUrl: "https://scoretransposer.com", publicAppUrl: "https://app.scoretransposer.com", allowedOrigins: ["https://staging.scoretransposer.com", "https://app-staging.scoretransposer.com", "javascript:alert(1)", "https://owner:password@evil.test", "http://evil.test"] });
  assert.deepEqual([...origins].sort(), ["https://app-staging.scoretransposer.com", "https://app.scoretransposer.com", "https://scoretransposer.com", "https://staging.scoretransposer.com", "https://www.scoretransposer.com"].sort());
});

test("Google callback and start request logs remove all query credentials", () => {
  assert.equal(sanitizeAuthLogUrl("/api/auth/google/callback?code=PRIVATE&state=PRIVATE"), "/api/auth/google/callback");
  assert.equal(sanitizeAuthLogUrl("/api/auth/google/start?return_path=PRIVATE"), "/api/auth/google/start");
  assert.equal(sanitizeAuthLogUrl("/api/auth/google?credential=PRIVATE"), "/api/auth/google");
  assert.equal(sanitizeAuthLogUrl("/health"), "/health");
});
