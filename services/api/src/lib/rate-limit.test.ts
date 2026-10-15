import assert from "node:assert/strict";
import net from "node:net";
import test from "node:test";
import Fastify from "fastify";
import type { FastifyRequest } from "fastify";
import { config } from "../config.js";
import { getRateLimitStoreStatus, validateRedisUrl } from "./rate-limit-store.js";
import {
  createApiRateLimitKey,
  registerApiRateLimiting,
  resolveApiRateLimitPolicy,
} from "./rate-limit.js";

test("sensitive API workflows receive separate production rate-limit policies", () => {
  assert.deepEqual(resolveApiRateLimitPolicy("POST", "/api/auth/login"), { id: "auth", max: 10, timeWindowMs: 900_000 });
  assert.deepEqual(resolveApiRateLimitPolicy("POST", "/api/auth/activation-code"), { id: "auth", max: 10, timeWindowMs: 900_000 });
  assert.deepEqual(resolveApiRateLimitPolicy("POST", "/api/auth/enable-code-login"), { id: "auth", max: 10, timeWindowMs: 900_000 });
  assert.deepEqual(resolveApiRateLimitPolicy("POST", "/api/auth/google"), { id: "auth", max: 10, timeWindowMs: 900_000 });
  assert.deepEqual(resolveApiRateLimitPolicy("GET", "/api/auth/google/start?origin=https%3A%2F%2Fapp.scoretransposer.com"), { id: "auth", max: 10, timeWindowMs: 900_000 });
  assert.deepEqual(resolveApiRateLimitPolicy("POST", "/api/auth/google/start"), { id: "auth", max: 10, timeWindowMs: 900_000 });
  assert.deepEqual(resolveApiRateLimitPolicy("GET", "/api/auth/google/callback?code=private&state=private"), { id: "auth", max: 10, timeWindowMs: 900_000 });
  assert.deepEqual(resolveApiRateLimitPolicy("POST", "/api/auth/forgot-password"), { id: "password", max: 5, timeWindowMs: 900_000 });
  assert.deepEqual(resolveApiRateLimitPolicy("GET", "/api/account/data-export"), { id: "privacy-export", max: 5, timeWindowMs: 3_600_000 });
  assert.deepEqual(resolveApiRateLimitPolicy("POST", "/api/account/deletion"), { id: "account-deletion", max: 5, timeWindowMs: 3_600_000 });
  assert.deepEqual(resolveApiRateLimitPolicy("POST", "/api/payments/orders"), { id: "payment", max: 20, timeWindowMs: 900_000 });
  assert.equal(resolveApiRateLimitPolicy("POST", "/api/files").id, "default");
  assert.equal(resolveApiRateLimitPolicy("POST", "/api/scores/shared/token/assignments/a/submissions").id, "default");
  assert.equal(resolveApiRateLimitPolicy("GET", "/api/scores").id, "default");
});

test("rate-limit keys isolate bearer identities without exposing their token", () => {
  const requestA = {
    method: "GET",
    url: "/api/scores",
    ip: "127.0.0.1",
    headers: { authorization: "Bearer secret-a" },
  } as FastifyRequest;
  const requestB = {
    ...requestA,
    headers: { authorization: "Bearer secret-b" },
  } as FastifyRequest;
  const keyA = createApiRateLimitKey(requestA);
  const keyB = createApiRateLimitKey(requestB);

  assert.notEqual(keyA, keyB);
  assert.equal(keyA.includes("secret-a"), false);
  assert.match(keyA, /^default:127\.0\.0\.1:[a-f0-9]{20}$/u);

  const authKeyA = createApiRateLimitKey({ ...requestA, method: "POST", url: "/api/auth/login" } as FastifyRequest);
  const authKeyB = createApiRateLimitKey({ ...requestB, method: "POST", url: "/api/auth/login" } as FastifyRequest);
  assert.equal(authKeyA, authKeyB);
  assert.equal(authKeyA, "auth:127.0.0.1:anonymous");
  assert.equal(createApiRateLimitKey({ ...requestA, method: "POST", url: "/api/auth/activation-code" } as FastifyRequest), createApiRateLimitKey({ ...requestB, method: "POST", url: "/api/auth/activation-code" } as FastifyRequest));
});

test("the API limiter returns standard 429 metadata after the authentication budget is exhausted", async () => {
  const app = Fastify({ logger: false });
  await registerApiRateLimiting(app);
  app.post("/api/auth/login", async () => ({ ok: true }));
  await app.ready();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await app.inject({ method: "POST", url: "/api/auth/login", payload: {} });
    assert.equal(response.statusCode, 200);
  }
  const blocked = await app.inject({ method: "POST", url: "/api/auth/login", payload: {} });
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.json().code, "RATE_LIMITED");
  assert.ok(blocked.headers["retry-after"]);

  await app.close();
});

test("uploads, legacy jobs, score sharing and polling pass their former throughput budgets", async () => {
  const previous = config.rateLimitMax;
  config.rateLimitMax = 0;
  const app = Fastify({ logger: false });
  try {
    await registerApiRateLimiting(app);
    const workflows = [
      { method: "POST" as const, url: "/api/files", previousBudget: 20 },
      { method: "POST" as const, url: "/api/jobs", previousBudget: 60 },
      { method: "POST" as const, url: "/api/scores/shared/token/assignments/a/submissions", previousBudget: 30 },
      { method: "POST" as const, url: "/api/scores/document/shares", previousBudget: 60 },
      { method: "GET" as const, url: "/api/scores/jobs/poll", previousBudget: 300 },
    ];
    for (const workflow of workflows) app.route({ method: workflow.method, url: workflow.url, handler: async () => ({ ok: true }) });
    await app.ready();
    for (const workflow of workflows) {
      for (let attempt = 0; attempt <= workflow.previousBudget; attempt += 1) {
        const response = await app.inject({ method: workflow.method, url: workflow.url });
        assert.equal(response.statusCode, 200, `${workflow.url}: ${response.body}`);
      }
    }
  } finally {
    config.rateLimitMax = previous;
    await app.close();
  }
});

test("an explicit general throughput budget remains configurable without changing security policies", async () => {
  const previous = config.rateLimitMax;
  config.rateLimitMax = 2;
  const app = Fastify({ logger: false });
  try {
    await registerApiRateLimiting(app);
    app.get("/api/scores", async () => ({ ok: true }));
    await app.ready();
    assert.equal((await app.inject("/api/scores")).statusCode, 200);
    assert.equal((await app.inject("/api/scores")).statusCode, 200);
    assert.equal((await app.inject("/api/scores")).statusCode, 429);
    assert.equal(resolveApiRateLimitPolicy("POST", "/api/auth/login").max, 10);
    assert.equal(resolveApiRateLimitPolicy("POST", "/api/payments/orders").max, 20);
  } finally {
    config.rateLimitMax = previous;
    await app.close();
  }
});

test("Redis rate limiting validates its protocol and fails closed when the configured store is unavailable", async () => {
  assert.equal(validateRedisUrl("redis://127.0.0.1:6379/0").protocol, "redis:");
  assert.equal(validateRedisUrl("rediss://cache.example.test:6380/0").protocol, "rediss:");
  assert.throws(() => validateRedisUrl("http://127.0.0.1:6379"), /redis:\/\/ or rediss:\/\//u);

  const probe = net.createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const address = probe.address();
  assert.ok(address && typeof address === "object");
  const unavailablePort = address.port;
  await new Promise<void>((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));

  const previous = { redisUrl: config.redisUrl, redisConnectTimeoutMs: config.redisConnectTimeoutMs };
  config.redisUrl = `redis://127.0.0.1:${unavailablePort}/0`;
  config.redisConnectTimeoutMs = 200;
  const app = Fastify({ logger: false });
  try {
    await assert.rejects(registerApiRateLimiting(app), /configured but unavailable/u);
    assert.equal(getRateLimitStoreStatus().kind, "redis");
    assert.equal(getRateLimitStoreStatus().state, "error");
  } finally {
    Object.assign(config, previous);
    await app.close();
  }
});
