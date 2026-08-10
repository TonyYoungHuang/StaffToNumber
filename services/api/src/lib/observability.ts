import { randomBytes, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { config } from "../config.js";
import { runWithRequestContext } from "./request-context.js";
import {
  recordSecurityAuditEvent,
  type SecurityAuditActorType,
  type SecurityAuditOutcome,
  type SecurityAuditSeverity,
} from "../repositories/security-audit-repository.js";

declare module "fastify" {
  interface FastifyRequest {
    traceId?: string;
    traceparent?: string;
    observabilityStartedAtNs?: bigint;
  }
}

const DURATION_BUCKETS = [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

type HttpMetric = {
  method: string;
  route: string;
  statusClass: string;
  count: number;
  durationSum: number;
  buckets: number[];
};

type SecurityMetric = {
  eventType: string;
  severity: SecurityAuditSeverity;
  outcome: SecurityAuditOutcome;
  count: number;
};

const httpMetrics = new Map<string, HttpMetric>();
const securityMetrics = new Map<string, SecurityMetric>();

function label(value: string) {
  return value.replace(/\\/gu, "\\\\").replace(/\n/gu, "\\n").replace(/"/gu, '\\"');
}

function routeTemplate(request: FastifyRequest) {
  return request.routeOptions?.url || "unmatched";
}

function statusOutcome(statusCode: number): SecurityAuditOutcome {
  if (statusCode >= 500) return "failed";
  if (statusCode === 401 || statusCode === 403 || statusCode === 404 || statusCode === 429) return "denied";
  if (statusCode >= 400) return "rejected";
  return "success";
}

function statusSeverity(statusCode: number): SecurityAuditSeverity {
  if (statusCode >= 500) return "error";
  if (statusCode >= 400) return "warning";
  return "info";
}

function actorForRequest(request: FastifyRequest): { actorType: SecurityAuditActorType; actorId: string | null } {
  if (request.adminId) return { actorType: "admin", actorId: request.adminId };
  if (request.authUserId) return { actorType: "user", actorId: request.authUserId };
  return { actorType: "anonymous", actorId: null };
}

export function classifyAuditedMutation(method: string, route: string) {
  const normalizedMethod = method.toUpperCase();
  if (normalizedMethod === "GET" && route === "/api/account/data-export") return "privacy.export";
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(normalizedMethod)) return null;
  if (/\/api\/auth\/(?:login|register|logout|forgot-password|reset-password)$/u.test(route)) return "auth.mutation";
  if (/\/api\/account\/(?:deletion|deletion\/cancel)$/u.test(route)) return "account.lifecycle";
  if (route === "/api/copyright/complaints") return "copyright.submission";
  if (route === "/api/copyright/complaints/lookup") return "copyright.lookup";
  if (/\/api\/(?:files\/upload|scores\/import\/|scores\/shared\/[^/]+\/assignments\/[^/]+\/submissions\/performance)/u.test(route)) return "upload.mutation";
  if (/\/api\/(?:jobs|scores\/[^/]+\/(?:jobs|exports))(?:\/|$)/u.test(route)) return "job.mutation";
  if (/\/api\/scores\/(?:shared\/[^/]+\/assignments|[^/]+\/(?:shares|assignments|comments))(?:\/|$)/u.test(route)) return "sharing.mutation";
  if (/\/api\/(?:payments|webhooks)(?:\/|$)/u.test(route)) return "payment.mutation";
  if (/\/api\/admin\//u.test(route)) return "admin.mutation";
  return null;
}

export function observeSecurityMetric(eventType: string, severity: SecurityAuditSeverity, outcome: SecurityAuditOutcome) {
  const key = `${eventType}\u0000${severity}\u0000${outcome}`;
  const existing = securityMetrics.get(key);
  if (existing) existing.count += 1;
  else securityMetrics.set(key, { eventType, severity, outcome, count: 1 });
}

function observeHttpRequest(method: string, route: string, statusCode: number, durationSeconds: number) {
  const normalizedMethod = method.toUpperCase().slice(0, 12);
  const statusClass = `${Math.floor(statusCode / 100)}xx`;
  const key = `${normalizedMethod}\u0000${route}\u0000${statusClass}`;
  let metric = httpMetrics.get(key);
  if (!metric) {
    metric = { method: normalizedMethod, route, statusClass, count: 0, durationSum: 0, buckets: DURATION_BUCKETS.map(() => 0) };
    httpMetrics.set(key, metric);
  }
  metric.count += 1;
  metric.durationSum += durationSeconds;
  DURATION_BUCKETS.forEach((bucket, index) => {
    if (durationSeconds <= bucket) metric!.buckets[index] += 1;
  });
}

export function renderPrometheusMetrics() {
  const lines = [
    "# HELP score_api_http_requests_total Total HTTP responses by method, route template, and status class.",
    "# TYPE score_api_http_requests_total counter",
  ];
  for (const metric of httpMetrics.values()) {
    const labels = `method="${label(metric.method)}",route="${label(metric.route)}",status_class="${metric.statusClass}"`;
    lines.push(`score_api_http_requests_total{${labels}} ${metric.count}`);
  }
  lines.push(
    "# HELP score_api_http_request_duration_seconds HTTP response duration by route template.",
    "# TYPE score_api_http_request_duration_seconds histogram",
  );
  for (const metric of httpMetrics.values()) {
    const labels = `method="${label(metric.method)}",route="${label(metric.route)}",status_class="${metric.statusClass}"`;
    metric.buckets.forEach((count, index) => lines.push(`score_api_http_request_duration_seconds_bucket{${labels},le="${DURATION_BUCKETS[index]}"} ${count}`));
    lines.push(`score_api_http_request_duration_seconds_bucket{${labels},le="+Inf"} ${metric.count}`);
    lines.push(`score_api_http_request_duration_seconds_sum{${labels}} ${metric.durationSum}`);
    lines.push(`score_api_http_request_duration_seconds_count{${labels}} ${metric.count}`);
  }
  lines.push(
    "# HELP score_api_security_events_total Persisted security audit events.",
    "# TYPE score_api_security_events_total counter",
  );
  for (const metric of securityMetrics.values()) {
    lines.push(`score_api_security_events_total{event_type="${label(metric.eventType)}",severity="${metric.severity}",outcome="${metric.outcome}"} ${metric.count}`);
  }
  const memory = process.memoryUsage();
  lines.push(
    "# HELP score_api_process_uptime_seconds API process uptime.",
    "# TYPE score_api_process_uptime_seconds gauge",
    `score_api_process_uptime_seconds ${process.uptime()}`,
    "# HELP score_api_process_resident_memory_bytes API resident memory.",
    "# TYPE score_api_process_resident_memory_bytes gauge",
    `score_api_process_resident_memory_bytes ${memory.rss}`,
  );
  return `${lines.join("\n")}\n`;
}

function traceIdFromRequest(request: FastifyRequest) {
  const traceparent = request.headers.traceparent;
  const value = Array.isArray(traceparent) ? traceparent[0] : traceparent;
  const match = value?.match(/^00-([a-f0-9]{32})-[a-f0-9]{16}-[a-f0-9]{2}$/u);
  return match && match[1] !== "00000000000000000000000000000000" ? match[1] : randomBytes(16).toString("hex");
}

function traceparentForTraceId(traceId: string) {
  return `00-${traceId}-${randomBytes(8).toString("hex")}-01`;
}

function metricsTokenMatches(header: string | undefined) {
  if (!config.metricsBearerToken || !header?.startsWith("Bearer ")) return false;
  const provided = Buffer.from(header.slice(7));
  const expected = Buffer.from(config.metricsBearerToken);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

function persistRequestAudit(request: FastifyRequest, statusCode: number, eventType: string) {
  const actor = actorForRequest(request);
  const severity = statusSeverity(statusCode);
  const outcome = statusOutcome(statusCode);
  try {
    recordSecurityAuditEvent({
      eventType,
      severity,
      outcome,
      ...actor,
      requestId: request.id,
      traceId: request.traceId,
      method: request.method,
      routeTemplate: routeTemplate(request),
      networkIdentifier: request.ip,
      metadata: { statusCode },
    });
    observeSecurityMetric(eventType, severity, outcome);
  } catch (error) {
    request.log.error({ error, event: "security.audit_persist_failed", eventType });
  }
}

export async function registerApiObservability(app: FastifyInstance) {
  app.addHook("onRequest", (request, reply, done) => {
    request.observabilityStartedAtNs = process.hrtime.bigint();
    request.traceId = traceIdFromRequest(request);
    request.traceparent = traceparentForTraceId(request.traceId);
    reply.header("x-request-id", request.id);
    reply.header("x-trace-id", request.traceId);
    reply.header("traceparent", request.traceparent);
    runWithRequestContext({ requestId: request.id, traceId: request.traceId, traceparent: request.traceparent }, done);
  });

  app.addHook("onResponse", async (request, reply) => {
    const started = request.observabilityStartedAtNs ?? process.hrtime.bigint();
    const durationSeconds = Number(process.hrtime.bigint() - started) / 1_000_000_000;
    const route = routeTemplate(request);
    observeHttpRequest(request.method, route, reply.statusCode, durationSeconds);
    const eventType = classifyAuditedMutation(request.method, route);
    if (eventType) persistRequestAudit(request, reply.statusCode, eventType);
  });

  app.addHook("onError", async (request, _reply, error) => {
    request.log.error({
      event: "api.request_error",
      requestId: request.id,
      traceId: request.traceId,
      route: routeTemplate(request),
      errorName: error.name,
    });
  });

  app.get("/metrics", async (request, reply) => {
    const authorization = Array.isArray(request.headers.authorization)
      ? request.headers.authorization[0]
      : request.headers.authorization;
    if (!config.metricsBearerToken) {
      return reply.code(503).send({ error: "Metrics endpoint is not configured." });
    }
    if (!metricsTokenMatches(authorization)) {
      return reply.code(401).send({ error: "Invalid metrics token." });
    }
    reply.header("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    return reply.send(renderPrometheusMetrics());
  });
}
