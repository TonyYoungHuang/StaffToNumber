import assert from "node:assert/strict";
import test from "node:test";
import { buildExpiredSessionCookie, buildSessionCookie, getSessionCookieName, readSessionCookie, SESSION_COOKIE_NAME } from "./session-cookie.js";

test("production session cookie is shared across scoretransposer subdomains and protected", () => {
  const cookie = buildSessionCookie({ token: "session-token", publicApiUrl: "https://api.scoretransposer.com", sessionDays: 30 });
  assert.match(cookie, new RegExp(`^${SESSION_COOKIE_NAME}=session-token;`));
  assert.match(cookie, /Domain=scoretransposer\.com/u);
  assert.match(cookie, /HttpOnly/u);
  assert.match(cookie, /SameSite=Lax/u);
  assert.match(cookie, /Secure/u);
  assert.match(cookie, /Max-Age=2592000/u);
});

test("local session cookie remains host-only and works without HTTPS", () => {
  const cookie = buildSessionCookie({ token: "local-token", publicApiUrl: "http://localhost:4000", sessionDays: 1 });
  assert.doesNotMatch(cookie, /Domain=/u);
  assert.doesNotMatch(cookie, /; Secure/u);
  assert.match(cookie, /Max-Age=86400/u);
});

test("session cookie reader ignores unrelated cookies and decodes the token", () => {
  const request = { headers: { cookie: `theme=light; ${SESSION_COOKIE_NAME}=token%2Fvalue; locale=zh-CN` } };
  assert.equal(readSessionCookie(request as never, "http://localhost:4000"), "token/value");
});

test("staging and production sessions use different cookie names", () => {
  assert.equal(getSessionCookieName("https://api.scoretransposer.com"), SESSION_COOKIE_NAME);
  assert.equal(getSessionCookieName("https://api-staging.scoretransposer.com"), `${SESSION_COOKIE_NAME}_staging`);
});

test("logout cookie expires the same production scope", () => {
  const cookie = buildExpiredSessionCookie("https://api.scoretransposer.com");
  assert.match(cookie, new RegExp(`^${SESSION_COOKIE_NAME}=;`));
  assert.match(cookie, /Domain=scoretransposer\.com/u);
  assert.match(cookie, /Max-Age=0/u);
  assert.match(cookie, /HttpOnly/u);
});
