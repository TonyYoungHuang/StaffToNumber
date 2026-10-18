import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setImmediate } from "node:timers/promises";
import test from "node:test";
import Fastify, { type InjectOptions } from "fastify";
import { config } from "../config.js";
import { db, initDb } from "../db.js";
import { bindScorePass } from "../lib/score-passes.js";
import {
  createSession,
  createUser,
  generateActivationCodes,
  redeemActivationCode,
} from "../repositories/auth-repository.js";
import { scoreRoutes } from "../routes/scores.js";
import { paymentRoutes } from "../routes/payments.js";
import { authPlugin } from "./auth.js";

async function fixture(withPayments = false) {
  initDb();
  const user = createUser(`${randomUUID()}@auth-regression.test`, "hash", "salt")!;
  const token = randomUUID();
  createSession(user.id, token, 1);
  const headers = { authorization: `Bearer ${token}` };
  const documentId = randomUUID();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO score_documents (id, user_id, title, status, created_at, updated_at)
    VALUES (?, ?, 'Auth regression', 'ready', ?, ?)`).run(documentId, user.id, now, now);

  const logs: string[] = [];
  const lifecycle = { handlers: 0, sends: 0, responses: 0, pendingSends: 0 };
  const app = Fastify({
    disableRequestLogging: true,
    logger: { level: "warn", stream: { write: (line: string) => { logs.push(line); } } },
  });
  app.addHook("onRoute", (route) => {
    if (route.url === "/health") return;
    const handler = route.handler;
    route.handler = function (request, reply) {
      lifecycle.handlers++;
      return handler.call(this, request, reply);
    };
  });
  // Reproduce the production race: send() has started, but reply.sent stays
  // false while this hook is awaiting. A bare return from a guard lets Fastify
  // enter the protected handler and attempt a second response.
  app.addHook("onSend", async (_request, reply, payload) => {
    lifecycle.sends++;
    if (!reply.sent) lifecycle.pendingSends++;
    await setImmediate();
    return payload;
  });
  app.addHook("onResponse", async () => { lifecycle.responses++; });
  await app.register(authPlugin);
  app.get("/health", async () => ({ ok: true }));
  app.get("/auth-required", { preHandler: app.requireAuth }, async () => ({ ok: true }));
  app.get("/preview-required", { preHandler: app.requireScorePreviewAccess }, async () => ({ ok: true }));
  app.get("/entitlement-required", { preHandler: app.requireActiveEntitlement }, async () => ({ ok: true }));
  app.get("/admin-required", { preHandler: app.requireAdmin }, async () => ({ ok: true }));
  await app.register(scoreRoutes, { prefix: "/api" });
  const paymentCalls = { lookup: 0, provider: 0 };
  if (withPayments) {
    await app.register(paymentRoutes, {
      prefix: "/api",
      durableServices: { findForPublic: async () => { paymentCalls.lookup++; return null; } },
      paymentServices: {
        retrieveStripeCheckoutSession: async () => {
          paymentCalls.provider++;
          throw new Error("Provider calls are forbidden in the auth regression test.");
        },
      },
    });
  }
  await app.ready();

  async function check(options: InjectOptions, status: number, handlers = 0) {
    const before = { ...lifecycle };
    const response = await app.inject(options);
    await setImmediate();
    assert.equal(response.statusCode, status, response.body);
    assert.equal(lifecycle.handlers - before.handlers, handlers, "protected handler execution count");
    assert.equal(lifecycle.sends - before.sends, 1, "exactly one send through async onSend");
    assert.equal(lifecycle.responses - before.responses, 1, "exactly one completed response");
    assert.equal(lifecycle.pendingSends - before.pendingSends, 1, "reply.sent is false inside async onSend");
    assert.deepEqual(logs, [], "no duplicate-send, headers-sent or other Fastify warning/error");
    // This file runs in node:test's child process. An uncaught exception fails
    // that process; completing a subsequent request also proves it stayed live.
    const health = await app.inject({ method: "GET", url: "/health" });
    assert.equal(health.statusCode, 200);
    assert.deepEqual(health.json(), { ok: true });
    return response;
  }

  function grant(planCode: "starter-monthly" | "credits-50" | "single-score") {
    const code = generateActivationCodes({ planCode, quantity: 1, entitlementDays: 30 }).codes[0]!;
    assert.ok(redeemActivationCode(user.id, code.code).ok);
  }

  function markFreeProject() {
    db.prepare(`INSERT INTO score_jobs (id, user_id, document_id, job_type, status, params_json, created_at, updated_at)
      VALUES (?, ?, ?, 'omr_import', 'completed', ?, ?, ?)`)
      .run(randomUUID(), user.id, documentId, JSON.stringify({ freeTrial: true }), now, now);
  }

  return { app, user, token, headers, documentId, check, grant, markFreeProject, paymentCalls };
}

test("async onSend: absent, unknown and expired sessions stop the auth-required handler", async (t) => {
  const f = await fixture();
  t.after(() => f.app.close());
  const missing = await f.check({ method: "GET", url: "/auth-required" }, 401);
  assert.equal(missing.json().error, "Unauthorized");
  const unknown = await f.check({ method: "GET", url: "/auth-required", headers: { authorization: "Bearer unknown-local-token" } }, 401);
  assert.equal(unknown.json().error, "Session not found");
  db.prepare("UPDATE sessions SET expires_at = '2000-01-01T00:00:00.000Z' WHERE token = ?").run(f.token);
  const expired = await f.check({ method: "GET", url: "/auth-required", headers: f.headers }, 401);
  assert.equal(expired.json().error, "Session expired");
});

test("async onSend: unauthenticated requests stop every composed auth guard", async (t) => {
  const f = await fixture();
  t.after(() => f.app.close());
  for (const url of ["/preview-required", "/entitlement-required", `/api/scores/${f.documentId}/assets`, `/api/scores/${f.documentId}/assignment-analytics`]) {
    await f.check({ method: "GET", url }, 401);
  }
  await f.check({ method: "POST", url: `/api/scores/${f.documentId}/exports`, payload: { format: "pdf" } }, 401);
});

test("async onSend: free accounts cannot enter gated assets, comments, assignments or rubric templates", async (t) => {
  const f = await fixture();
  t.after(() => f.app.close());
  for (const route of ["assets", "comments", "assignments", "assignment-submissions", "assignment-analytics"]) {
    await f.check({ method: "GET", url: `/api/scores/${f.documentId}/${route}`, headers: f.headers }, 403);
  }
  await f.check({ method: "GET", url: "/api/score-rubric-templates", headers: f.headers }, 403);
});

test("async onSend: composed upload guards stop denial with and without an idempotency key", async (t) => {
  const f = await fixture();
  t.after(() => f.app.close());
  for (const withKey of [false, true]) {
    const key = withKey ? { "idempotency-key": randomUUID() } : {};
    for (const route of ["jianpu", "omr"]) {
      await f.check({ method: "POST", url: `/api/scores/import/${route}`, headers: key, payload: {} }, 401);
    }
    await f.check({ method: "POST", url: "/api/scores/import/jianpu", headers: { ...f.headers, ...key }, payload: {} }, 403);
  }
  f.grant("starter-monthly");
  db.prepare("UPDATE users SET account_status = 'deletion_pending' WHERE id = ?").run(f.user.id);
  for (const withKey of [false, true]) {
    for (const route of ["jianpu", "omr"]) {
      await f.check({ method: "POST", url: `/api/scores/import/${route}`, headers: { ...f.headers, ...(withKey ? { "idempotency-key": randomUUID() } : {}) }, payload: {} }, 403);
    }
  }
  assert.equal((db.prepare("SELECT COUNT(*) AS count FROM score_documents WHERE user_id = ?").get(f.user.id) as { count: number }).count, 1);
});

test("async onSend: manual payment auth stops invalid sessions before order lookup or provider verification", async (t) => {
  const f = await fixture(true);
  t.after(() => f.app.close());
  for (const query of ["", "?token=local-order-token&provider=stripe&sessionId=local-session"]) {
    const response = await f.check({ method: "GET", url: `/api/payments/orders/local-missing-order${query}`, headers: { authorization: "Bearer unknown-local-token" } }, 401, 1);
    assert.equal(response.json().error, "Session not found");
  }
  assert.deepEqual(f.paymentCalls, { lookup: 0, provider: 0 });
});

test("async onSend: free project exports preserve SCORE_PASS_REQUIRED without queueing work", async (t) => {
  const f = await fixture();
  t.after(() => f.app.close());
  f.markFreeProject();
  const countJobs = () => (db.prepare("SELECT COUNT(*) AS count FROM score_jobs WHERE document_id = ?").get(f.documentId) as { count: number }).count;
  const before = countJobs();
  for (const route of ["exports", "export/pdf"]) {
    const response = await f.check({ method: "POST", url: `/api/scores/${f.documentId}/${route}`, headers: f.headers, payload: { format: "pdf" } }, 403);
    assert.equal(response.json().code, "SCORE_PASS_REQUIRED");
    assert.equal(countJobs(), before, "denied paid export creates no job");
  }
});

test("async onSend: inactive accounts stop nested editing even with an active membership", async (t) => {
  const f = await fixture();
  t.after(() => f.app.close());
  f.grant("starter-monthly");
  db.prepare("UPDATE users SET account_status = 'deletion_pending' WHERE id = ?").run(f.user.id);
  for (const url of ["/preview-required", `/api/scores/${f.documentId}/assets`]) {
    const response = await f.check({ method: "GET", url, headers: f.headers }, 403);
    assert.equal(response.json().error, "An active account is required.");
  }
  await f.check({ method: "GET", url: `/api/scores/${f.documentId}/assignment-analytics`, headers: f.headers }, 403);
  const exported = await f.check({ method: "POST", url: `/api/scores/${f.documentId}/exports`, headers: f.headers, payload: { format: "pdf" } }, 403);
  assert.equal(exported.json().error, "An active account is required.");
});

test("async onSend: disabled or invalid admin credentials cannot enter the handler", async (t) => {
  const f = await fixture();
  const previousKey = config.adminApiKey;
  t.after(async () => { config.adminApiKey = previousKey; await f.app.close(); });
  config.adminApiKey = "";
  await f.check({ method: "GET", url: "/admin-required" }, 503);
  config.adminApiKey = "local-auth-regression-key";
  for (const headers of [{}, { "x-admin-api-key": "wrong-local-key" }]) {
    await f.check({ method: "GET", url: "/admin-required", headers }, 401);
  }
  await f.check({ method: "GET", url: "/admin-required", headers: { "x-admin-api-key": config.adminApiKey } }, 200, 1);
});

for (const planCode of ["credits-50", "single-score"] as const) {
  test(`async onSend: ${planCode} legacy export returns its single queued-export 409`, async (t) => {
    const f = await fixture();
    t.after(() => f.app.close());
    f.grant(planCode);
    if (planCode === "single-score") {
      bindScorePass(db, f.user.id, f.documentId, 1);
      await f.check({ method: "GET", url: `/api/scores/${f.documentId}/assets`, headers: f.headers }, 200, 1);
    }
    const response = await f.check({ method: "POST", url: `/api/scores/${f.documentId}/export/pdf`, headers: f.headers, payload: {} }, 409);
    assert.equal(response.json().code, planCode === "credits-50" ? "PREPAID_QUEUED_EXPORT_REQUIRED" : "SCORE_PASS_QUEUED_EXPORT_REQUIRED");
  });
}

test("async onSend: valid auth, an owned free editing project and active membership still reach handlers", async (t) => {
  const f = await fixture();
  t.after(() => f.app.close());
  await f.check({ method: "GET", url: "/auth-required", headers: f.headers }, 200, 1);
  await f.check({ method: "GET", url: "/preview-required", headers: f.headers }, 200, 1);
  f.markFreeProject();
  const assets = await f.check({ method: "GET", url: `/api/scores/${f.documentId}/assets`, headers: f.headers }, 200, 1);
  assert.deepEqual(assets.json().assets, []);
  f.grant("starter-monthly");
  await f.check({ method: "GET", url: "/entitlement-required", headers: f.headers }, 200, 1);
  await f.check({ method: "GET", url: `/api/scores/${f.documentId}/assignment-analytics`, headers: f.headers }, 200, 1);
});
