import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { config, validateRuntimeConfig } from "../config.js";
import { db, initDb } from "../db.js";
import {
  hashSecurityAuditNetworkIdentifier,
  listSecurityAuditEvents,
  recordSecurityAuditEvent,
  serializeSecurityAuditMetadata,
} from "../repositories/security-audit-repository.js";
import { authPlugin } from "../plugins/auth.js";
import { adminSecurityRoutes } from "../routes/admin-security.js";
import { registerApiObservability } from "./observability.js";

test("security audit metadata redacts credentials and hashes network identifiers", () => {
  const metadata = serializeSecurityAuditMetadata({
    statusCode: 401,
    password: "never-store-this",
    nested: { authorization: "Bearer secret", safe: "kept" },
  });
  assert.ok(metadata);
  assert.equal(metadata!.includes("never-store-this"), false);
  assert.equal(metadata!.includes("Bearer secret"), false);
  assert.equal(metadata!.includes("[redacted]"), true);

  const hashed = hashSecurityAuditNetworkIdentifier("203.0.113.10");
  assert.match(hashed ?? "", /^[a-f0-9]{64}$/u);
  assert.equal(hashed, hashSecurityAuditNetworkIdentifier("203.0.113.10"));
  assert.notEqual(hashed, hashSecurityAuditNetworkIdentifier("203.0.113.11"));
});

test("observability propagates trace context, persists audited mutations, and protects Prometheus metrics", async () => {
  initDb();
  const previousToken = config.metricsBearerToken;
  config.metricsBearerToken = "test-metrics-token-with-at-least-32-characters";
  const app = Fastify({ logger: false });
  await registerApiObservability(app);
  app.post("/api/auth/login", async (_request, reply) => reply.code(401).send({ error: "no" }));
  await app.ready();

  try {
    const traceId = "0123456789abcdef0123456789abcdef";
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers: { traceparent: `00-${traceId}-0123456789abcdef-01` },
      payload: {},
    });
    assert.equal(response.statusCode, 401);
    assert.equal(response.headers["x-trace-id"], traceId);
    assert.ok(response.headers["x-request-id"]);

    const event = listSecurityAuditEvents({ eventType: "auth.mutation", limit: 20 })
      .find((candidate) => candidate.requestId === response.headers["x-request-id"]);
    assert.ok(event);
    assert.equal(event!.outcome, "denied");
    assert.equal(event!.routeTemplate, "/api/auth/login");
    assert.match(event!.networkHash ?? "", /^[a-f0-9]{64}$/u);

    const unauthorized = await app.inject({ method: "GET", url: "/metrics" });
    assert.equal(unauthorized.statusCode, 401);
    const metrics = await app.inject({
      method: "GET",
      url: "/metrics",
      headers: { authorization: `Bearer ${config.metricsBearerToken}` },
    });
    assert.equal(metrics.statusCode, 200);
    assert.match(metrics.body, /score_api_http_requests_total\{method="POST",route="\/api\/auth\/login",status_class="4xx"\} 1/u);
    assert.match(metrics.body, /score_api_security_events_total\{event_type="auth\.mutation",severity="warning",outcome="denied"\} 1/u);

    db.prepare("DELETE FROM security_audit_events WHERE id = ?").run(event!.id);
  } finally {
    config.metricsBearerToken = previousToken;
    await app.close();
  }
});

test("production configuration rejects missing security secrets and malware scanner", () => {
  const previous = {
    nodeEnv: config.nodeEnv,
    securityAuditHashSalt: config.securityAuditHashSalt,
    metricsBearerToken: config.metricsBearerToken,
    clamAvCommand: config.clamAvCommand,
    clamAvHost: config.clamAvHost,
    apiReplicaCount: config.apiReplicaCount,
    redisUrl: config.redisUrl,
  };
  Object.assign(config, { nodeEnv: "production", securityAuditHashSalt: "", metricsBearerToken: "", clamAvCommand: "" });
  try {
    assert.throws(() => validateRuntimeConfig(), /SECURITY_AUDIT_HASH_SALT/u);
  } finally {
    Object.assign(config, previous);
  }
});

test("production configuration requires safe media inspection and transcode commands", () => {
  const previous = {
    nodeEnv: config.nodeEnv,
    securityAuditHashSalt: config.securityAuditHashSalt,
    metricsBearerToken: config.metricsBearerToken,
    clamAvCommand: config.clamAvCommand,
    clamAvHost: config.clamAvHost,
    ffmpegCommand: config.ffmpegCommand,
    ffprobeCommand: config.ffprobeCommand,
  };
  Object.assign(config, {
    nodeEnv: "production",
    securityAuditHashSalt: "a".repeat(32),
    metricsBearerToken: "b".repeat(32),
    clamAvCommand: "clamscan",
    clamAvHost: "",
    ffmpegCommand: "",
    ffprobeCommand: "",
  });
  try {
    assert.throws(() => validateRuntimeConfig(), /FFMPEG_COMMAND is required.*FFPROBE_COMMAND is required/u);
  } finally {
    Object.assign(config, previous);
  }
});

test("production configuration requires Redis for multiple API replicas", () => {
  const previous = {
    nodeEnv: config.nodeEnv,
    securityAuditHashSalt: config.securityAuditHashSalt,
    metricsBearerToken: config.metricsBearerToken,
    clamAvCommand: config.clamAvCommand,
    clamAvHost: config.clamAvHost,
    apiReplicaCount: config.apiReplicaCount,
    redisUrl: config.redisUrl,
  };
  Object.assign(config, {
    nodeEnv: "production",
    securityAuditHashSalt: "a".repeat(32),
    metricsBearerToken: "b".repeat(32),
    clamAvCommand: "clamscan",
    clamAvHost: "",
    apiReplicaCount: 2,
    redisUrl: "",
  });
  try {
    assert.throws(() => validateRuntimeConfig(), /REDIS_URL is required/u);
  } finally {
    Object.assign(config, previous);
  }
});

test("production configuration requires private S3 object storage", () => {
  const previous = {
    nodeEnv: config.nodeEnv,
    securityAuditHashSalt: config.securityAuditHashSalt,
    metricsBearerToken: config.metricsBearerToken,
    clamAvCommand: config.clamAvCommand,
    clamAvHost: config.clamAvHost,
    ffmpegCommand: config.ffmpegCommand,
    ffprobeCommand: config.ffprobeCommand,
    apiReplicaCount: config.apiReplicaCount,
    storageBackend: config.storageBackend,
    s3Bucket: config.s3Bucket,
    s3Region: config.s3Region,
  };
  Object.assign(config, {
    nodeEnv: "production",
    securityAuditHashSalt: "a".repeat(32),
    metricsBearerToken: "b".repeat(32),
    clamAvCommand: "clamscan",
    clamAvHost: "",
    ffmpegCommand: "ffmpeg",
    ffprobeCommand: "ffprobe",
    apiReplicaCount: 1,
    storageBackend: "local",
    s3Bucket: "",
    s3Region: "",
  });
  try {
    assert.throws(() => validateRuntimeConfig(), /STORAGE_BACKEND=s3.*S3_BUCKET.*S3_REGION/u);
  } finally {
    Object.assign(config, previous);
  }
});

test("admin security audit API enforces its key and returns filtered persisted events", async () => {
  initDb();
  const previousAdminKey = config.adminApiKey;
  config.adminApiKey = "test-admin-key-with-at-least-32-characters";
  const eventId = recordSecurityAuditEvent({
    eventType: "test.security.query",
    severity: "warning",
    outcome: "rejected",
    actorType: "service",
    requestId: "audit-query-test",
    metadata: { reason: "test" },
  });
  const app = Fastify({ logger: false });
  await app.register(authPlugin);
  await app.register(adminSecurityRoutes, { prefix: "/api" });
  await app.ready();

  try {
    const denied = await app.inject({ method: "GET", url: "/api/admin/security/audit" });
    assert.equal(denied.statusCode, 401);
    const response = await app.inject({
      method: "GET",
      url: "/api/admin/security/audit?eventType=test.security.query&severity=warning&outcome=rejected",
      headers: { "x-admin-api-key": config.adminApiKey },
    });
    assert.equal(response.statusCode, 200);
    const payload = response.json();
    assert.equal(payload.retentionDays, config.securityAuditRetentionDays);
    assert.equal(payload.events.some((event: { id: string }) => event.id === eventId), true);

    const invalid = await app.inject({
      method: "GET",
      url: "/api/admin/security/audit?severity=critical",
      headers: { "x-admin-api-key": config.adminApiKey },
    });
    assert.equal(invalid.statusCode, 400);
  } finally {
    db.prepare("DELETE FROM security_audit_events WHERE id = ?").run(eventId);
    config.adminApiKey = previousAdminKey;
    await app.close();
  }
});
