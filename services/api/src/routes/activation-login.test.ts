import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import { db, initDb } from "../db.js";
import { authPlugin } from "../plugins/auth.js";
import { authRoutes } from "./auth.js";
import { activationRoutes } from "./activation.js";
import { createUser, createSession, createActivationCode, generateActivationCodes, redeemActivationCode, signInWithActivationCode, enableActivationCodeLogin, getUserProfile } from "../repositories/auth-repository.js";
import { getPlanQuotaUsage } from "../lib/plan-quotas.js";

function code() { initDb(); return generateActivationCodes({ quantity: 1, entitlementDays: 30, planCode: "converter-pro-monthly", prefix: "QA" }).codes[0]!; }
function count(table: "users" | "user_entitlements") { return (db.prepare(`SELECT count(*) AS total FROM ${table}`).get() as { total: number }).total; }

test("code alone opens one account; repeat login preserves identity, dates and quota", () => {
  const item = code(), usersBefore = count("users"), grantsBefore = count("user_entitlements");
  assert.match(item.code, /^QA-(?:[A-F0-9]{4}-){7}[A-F0-9]{4}$/);
  const first = signInWithActivationCode(item.code.toLowerCase().replaceAll("-", "— "));
  assert.ok(first.ok); assert.equal(first.isNewUser, true);
  const profile = getUserProfile(first.userId)!;
  assert.equal(profile.codeLoginEnabled, true);
  assert.equal(profile.entitlement.status, "active");
  assert.equal(getPlanQuotaUsage(first.userId).tier, "converter-pro");
  const second = signInWithActivationCode(item.code);
  assert.ok(second.ok); assert.equal(second.isNewUser, false); assert.equal(second.userId, first.userId);
  assert.deepEqual(getUserProfile(second.userId), profile);
  assert.equal(count("users"), usersBefore + 1); assert.equal(count("user_entitlements"), grantsBefore + 1);
});

test("missing, disabled and unredeemed expired codes never create accounts", () => {
  const item = code();
  db.prepare("UPDATE activation_codes SET status = 'disabled' WHERE id = ?").run(item.id);
  const expired = randomUUID(); createActivationCode({ code: expired, entitlementDays: 30, expiresAt: "2020-01-01T00:00:00Z" });
  const before = count("users");
  assert.deepEqual(signInWithActivationCode(randomUUID()), { ok: false, reason: "not_found" });
  assert.deepEqual(signInWithActivationCode(item.code), { ok: false, reason: "disabled" });
  assert.deepEqual(signInWithActivationCode(expired), { ok: false, reason: "expired" });
  assert.equal(count("users"), before);
});

test("existing email accounts require their owner's explicit opt-in; wrong owners cannot enable login", () => {
  const item = code(), owner = createUser(`${randomUUID()}@example.invalid`, "hash", "salt")!, other = createUser(`${randomUUID()}@example.invalid`, "hash", "salt")!;
  assert.ok(redeemActivationCode(owner.id, item.code).ok);
  assert.deepEqual(signInWithActivationCode(item.code), { ok: false, reason: "login_not_enabled" });
  assert.equal(enableActivationCodeLogin(other.id, item.code), false);
  assert.equal(enableActivationCodeLogin(owner.id, code().code), false);
  assert.equal(enableActivationCodeLogin(owner.id, item.code), true);
  const signed = signInWithActivationCode(item.code); assert.ok(signed.ok); assert.equal(signed.userId, owner.id);
});

test("activated codes can log in after redemption deadline or plan expiry, but deletion and disabled codes cannot", () => {
  const item = code(), signed = signInWithActivationCode(item.code); assert.ok(signed.ok);
  db.prepare("UPDATE activation_codes SET expires_at = ? WHERE id = ?").run("2020-01-01T00:00:00Z", item.id);
  db.prepare("UPDATE user_entitlements SET ends_at = ? WHERE activation_code_id = ?").run("2020-01-01T00:00:00Z", item.id);
  assert.ok(signInWithActivationCode(item.code).ok); assert.equal(getUserProfile(signed.userId)!.entitlement.status, "expired");
  assert.equal(getPlanQuotaUsage(signed.userId).tier, "free");
  db.prepare("UPDATE users SET account_status = 'deletion_pending' WHERE id = ?").run(signed.userId);
  assert.deepEqual(signInWithActivationCode(item.code), { ok: false, reason: "account_unavailable" });
  db.prepare("UPDATE activation_codes SET status = 'disabled' WHERE id = ?").run(item.id);
  assert.deepEqual(signInWithActivationCode(item.code), { ok: false, reason: "disabled" });
});

test("renewal extends the original account, requires original login code and never silently grants new login credentials", () => {
  const original = code(), first = signInWithActivationCode(original.code); assert.ok(first.ok);
  const oldEnd = getUserProfile(first.userId)!.entitlement.endsAt;
  const renewal = code(), grant = redeemActivationCode(first.userId, renewal.code); assert.ok(grant.ok);
  assert.equal(grant.entitlement.starts_at, oldEnd);
  assert.deepEqual(signInWithActivationCode(renewal.code), { ok: false, reason: "login_not_enabled" });
  const next = signInWithActivationCode(original.code); assert.ok(next.ok); assert.equal(next.userId, first.userId);
  assert.equal(getUserProfile(first.userId)!.entitlement.endsAt, grant.entitlement.ends_at);
});

test("account creation and entitlement claim roll back together on storage failure", () => {
  const item = code(), before = count("users");
  db.exec("CREATE TRIGGER qa_reject_grant BEFORE INSERT ON user_entitlements BEGIN SELECT RAISE(ABORT, 'qa storage failure'); END;");
  try { assert.throws(() => signInWithActivationCode(item.code), /qa storage failure/); }
  finally { db.exec("DROP TRIGGER qa_reject_grant;"); }
  assert.equal(count("users"), before);
  const retry = signInWithActivationCode(item.code); assert.ok(retry.ok); assert.equal(retry.isNewUser, true);
});

test("HTTP code login returns an ordinary session, authenticates cookie-only requests and supports logout", async () => {
  const item = code(), app = Fastify();
  await app.register(authPlugin); await app.register(authRoutes, { prefix: "/api" }); await app.register(activationRoutes, { prefix: "/api" });
  try {
    for (const value of [undefined, {}, " ", "x".repeat(129)]) {
      assert.equal((await app.inject({ method: "POST", url: "/api/auth/activation-code", payload: { code: value } })).statusCode, 400);
    }
    const login = await app.inject({ method: "POST", url: "/api/auth/activation-code", payload: { code: item.code } });
    assert.equal(login.statusCode, 200); assert.equal(login.headers["cache-control"], "no-store");
    const cookie = String(login.headers["set-cookie"]); assert.match(cookie, /HttpOnly/);
    const headers = { cookie: cookie.split(";")[0]! };
    const me = await app.inject({ method: "GET", url: "/api/auth/me", headers });
    assert.equal(me.json().user.id, login.json().user.id);
    assert.equal((await app.inject({ method: "POST", url: "/api/auth/enable-code-login", payload: { code: item.code } })).statusCode, 401);
    const other = createUser(`${randomUUID()}@example.invalid`, "hash", "salt")!, token = randomUUID(); createSession(other.id, token, 1);
    assert.equal((await app.inject({ method: "POST", url: "/api/auth/enable-code-login", headers: { authorization: `Bearer ${token}` }, payload: { code: item.code } })).statusCode, 409);
    assert.equal((await app.inject({ method: "POST", url: "/api/auth/logout", headers })).statusCode, 200);
    assert.equal((await app.inject({ method: "GET", url: "/api/auth/me", headers })).statusCode, 401);
    const again = await app.inject({ method: "POST", url: "/api/auth/activation-code", payload: { code: item.code } });
    assert.equal(again.json().user.id, me.json().user.id); assert.notEqual(again.json().token, login.json().token);
  } finally { await app.close(); }
});
