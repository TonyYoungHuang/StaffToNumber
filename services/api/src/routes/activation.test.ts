import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import { db, initDb } from "../db.js";
import { config } from "../config.js";
import { authPlugin } from "../plugins/auth.js";
import { activationRoutes } from "./activation.js";
import { adminActivationRoutes } from "./admin-activation.js";
import { createUser, createSession, createActivationCode, generateActivationCodes, redeemActivationCode, disableUnusedActivationCode, listActivationCodes } from "../repositories/auth-repository.js";
import { addPurchaseMonths } from "../repositories/one-time-purchase-repository.js";
import { getPlanQuotaUsage } from "../lib/plan-quotas.js";
import { resolveApiRateLimitPolicy } from "../lib/rate-limit.js";

function user() { initDb(); return createUser(`${randomUUID()}@example.invalid`, "hash", "salt")!.id; }
function code(planCode?: "starter-monthly" | "starter-annual" | "converter-pro-monthly" | "converter-pro-annual") {
  return generateActivationCodes({ quantity: 1, entitlementDays: 7, planCode, prefix: "QA" }).codes[0]!;
}

test("all website plans redeem with matching quota and calendar duration", () => {
  for (const plan of ["starter-monthly", "starter-annual", "converter-pro-monthly", "converter-pro-annual"] as const) {
    const id = user(); const item = code(plan); const result = redeemActivationCode(id, item.code);
    assert.ok(result.ok); assert.ok(result.entitlement);
    assert.equal(result.entitlement.ends_at, addPurchaseMonths(result.entitlement.starts_at, plan.endsWith("annual") ? 12 : 1));
    const usage = getPlanQuotaUsage(id);
    assert.equal(usage.tier, plan.startsWith("starter") ? "starter" : "converter-pro");
    assert.equal(usage.jobs.limit, plan.startsWith("starter") ? config.quotaStarterJobsPerMonth : config.quotaConverterProJobsPerMonth);
  }
});
test("pasted codes normalize; same-account retry never grants extra time; other accounts are rejected", () => {
  const id = user(), other = user(), item = code("starter-monthly");
  const first = redeemActivationCode(id, "\u200b " + item.code.toLowerCase().replace(/-/g, "— \n") + " ");
  assert.ok(first.ok);
  const second = redeemActivationCode(id, item.code);
  assert.ok(second.ok); assert.equal(second.alreadyRedeemed, true);
  assert.equal(second.entitlement?.ends_at, first.entitlement?.ends_at);
  assert.deepEqual(redeemActivationCode(other, item.code), { ok: false, reason: "unavailable" });
  assert.equal(disableUnusedActivationCode(item.id), false);
});
test("legacy duration stays intact, same tier extends and higher tier starts immediately", () => {
  const id = user(), legacy = code(), first = redeemActivationCode(id, legacy.code);
  assert.ok(first.ok); assert.ok(first.entitlement);
  assert.equal(Date.parse(first.entitlement.ends_at) - Date.parse(first.entitlement.starts_at), 7 * 86400000);
  const renewal = redeemActivationCode(id, code("starter-annual").code);
  assert.ok(renewal.ok); assert.equal(renewal.entitlement?.starts_at, first.entitlement.ends_at);
  const upgrade = redeemActivationCode(id, code("converter-pro-monthly").code);
  assert.ok(upgrade.ok); assert.ok(Date.parse(upgrade.entitlement!.starts_at) < Date.parse(first.entitlement.ends_at));
  assert.equal(getPlanQuotaUsage(id).tier, "converter-pro");
});
test("missing, expired and disabled codes grant no access; literal order search works", () => {
  const id = user(); const item = code();
  assert.equal(disableUnusedActivationCode(item.id), true);
  assert.deepEqual(redeemActivationCode(id, item.code), { ok: false, reason: "disabled" });
  assert.deepEqual(redeemActivationCode(id, randomUUID()), { ok: false, reason: "not_found" });
  const value = `QA-${randomUUID()}`;
  createActivationCode({ code: value, entitlementDays: 7, expiresAt: "2020-01-01T00:00:00Z", note: "淘宝 | 订单：100%_shop" });
  assert.deepEqual(redeemActivationCode(id, value), { ok: false, reason: "expired" });
  assert.equal(listActivationCodes(100, "100%_shop")[0]?.code, value);
  assert.equal(getPlanQuotaUsage(id).tier, "free");
});
test("admin protection, request validation, generation, redeem and disable routes", async () => {
  const id = user(), token = randomUUID(); createSession(id, token, 1);
  const previousKey = config.adminApiKey; config.adminApiKey = "qa-only-administrator-key";
  const app = Fastify(); await app.register(authPlugin); await app.register(activationRoutes, { prefix: "/api" }); await app.register(adminActivationRoutes, { prefix: "/api" });
  const admin = { "x-admin-api-key": config.adminApiKey }, auth = { authorization: `Bearer ${token}` };
  try {
    assert.equal((await app.inject({ method: "GET", url: "/api/admin/activation-codes" })).statusCode, 401);
    assert.equal((await app.inject({ method: "POST", url: "/api/activation/redeem", payload: { code: "x" } })).statusCode, 401);
    for (const payload of [{ quantity: 201 }, { planCode: "unknown" }, { note: {} }, { prefix: "汉字" }, { expiresAt: "2020-01-01" }]) {
      assert.equal((await app.inject({ method: "POST", url: "/api/admin/activation-codes/generate", headers: admin, payload })).statusCode, 400);
    }
    assert.equal((await app.inject({ method: "POST", url: "/api/activation/redeem", headers: auth, payload: { code: {} } })).statusCode, 400);
    const created = await app.inject({ method: "POST", url: "/api/admin/activation-codes/generate", headers: admin, payload: { quantity: 2, planCode: "converter-pro-annual", note: "小红书 QA订单" } });
    assert.equal(created.statusCode, 201); const items = created.json().codes;
    assert.equal(items[0].planCode, "converter-pro-annual");
    const redeemed = await app.inject({ method: "POST", url: "/api/activation/redeem", headers: auth, payload: { code: items[0].code } });
    assert.equal(redeemed.statusCode, 200); assert.equal(getPlanQuotaUsage(id).tier, "converter-pro");
    assert.equal((await app.inject({ method: "POST", url: `/api/admin/activation-codes/${items[1].id}/disable`, headers: admin })).statusCode, 200);
    const denied = await app.inject({ method: "POST", url: "/api/activation/redeem", headers: auth, payload: { code: items[1].code } });
    assert.equal(denied.json().code, "ACTIVATION_DISABLED");
    const listed = await app.inject({ method: "GET", url: "/api/admin/activation-codes?search=" + encodeURIComponent("QA订单"), headers: admin });
    assert.equal(listed.json().codes.length, 2);
    assert.equal(resolveApiRateLimitPolicy("POST", "/api/activation/redeem").max, 10);
  } finally { await app.close(); config.adminApiKey = previousKey; }
});
