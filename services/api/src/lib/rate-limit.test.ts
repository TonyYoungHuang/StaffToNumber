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
  assert.deepEqual(resolveApiRateLimitPolicy("POST", "/api/auth/google"), { id: "auth", max: 10, timeWindowMs: 900_000 });
  assert.deepEqual(resolveApiRateLimitPolicy("POST", "/api/auth/forgot-password"), { id: "password", max: 5, timeWindowMs: 900_000 });
  assert.deepEqual(resolveApiRateLimitPolicy("GET", "/api/account/data-export"), { id: "privacy-export", max: 5, timeWindowMs: 3_600_000 });
  assert.deepEqual(resolveApiRateLimitPolicy("POST", "/api/account/deletion"), { id: "account-deletion", max: 5, timeWindowMs: 3_600_000 });
  assert.deepEqual(resolveApiRateLimitPolicy("POST", "/api/files"), { id: "upload", max: 20, timeWindowMs: 3_600_000 });
  assert.equal(resolveApiRateLimitPolicy("POST", "/api/scores/shared/token/assignments/a/submissions").id, "submission");
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
