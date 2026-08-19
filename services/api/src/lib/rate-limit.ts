import rateLimit from "@fastify/rate-limit";
import { createHash } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { config } from "../config.js";
import { observeSecurityMetric } from "./observability.js";
import { recordSecurityAuditEvent } from "../repositories/security-audit-repository.js";
import { connectRateLimitRedis } from "./rate-limit-store.js";

export type ApiRateLimitPolicy = {
  id: string;
  max: number;
  timeWindowMs: number;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function normalizePath(url: string) {
  return url.split("?", 1)[0];
}

export function resolveApiRateLimitPolicy(method: string, url: string): ApiRateLimitPolicy {
  const path = normalizePath(url);
  const normalizedMethod = method.toUpperCase();

  if (normalizedMethod === "POST" && /^\/api\/auth\/(google|login|register)$/u.test(path)) {
    return { id: "auth", max: 10, timeWindowMs: 15 * MINUTE };
  }
  if (normalizedMethod === "POST" && /^\/api\/auth\/(forgot-password|reset-password)$/u.test(path)) {
    return { id: "password", max: 5, timeWindowMs: 15 * MINUTE };
  }
  if (normalizedMethod === "GET" && path === "/api/account/data-export") {
    return { id: "privacy-export", max: 5, timeWindowMs: HOUR };
  }
  if (normalizedMethod === "POST" && /^\/api\/account\/deletion(?:\/cancel)?$/u.test(path)) {
    return { id: "account-deletion", max: 5, timeWindowMs: HOUR };
  }
  if (normalizedMethod === "POST" && path === "/api/copyright/complaints") {
    return { id: "copyright-submit", max: 5, timeWindowMs: 24 * HOUR };
  }
  if (normalizedMethod === "POST" && path === "/api/copyright/complaints/lookup") {
    return { id: "copyright-lookup", max: 20, timeWindowMs: HOUR };
  }
  if (normalizedMethod === "POST" && /^\/api\/files(?:\/|$)/u.test(path)) {
    return { id: "upload", max: 20, timeWindowMs: HOUR };
  }
  if (normalizedMethod === "POST" && /^\/api\/jobs(?:\/|$)/u.test(path)) {
    return { id: "job", max: 60, timeWindowMs: HOUR };
  }
  if (normalizedMethod === "POST" && /\/api\/scores\/shared\/[^/]+\/assignments\/[^/]+\/submissions(?:\/|$)/u.test(path)) {
    return { id: "submission", max: 30, timeWindowMs: HOUR };
  }
  if (normalizedMethod === "POST" && /\/api\/scores\/[^/]+\/(shares|assignments)(?:\/|$)/u.test(path)) {
    return { id: "score-sharing", max: 60, timeWindowMs: HOUR };
  }
  if (normalizedMethod === "POST" && /^\/api\/payments\/(checkout|orders)/u.test(path)) {
    return { id: "payment", max: 20, timeWindowMs: 15 * MINUTE };
  }
  if (/^\/api\/admin\//u.test(path)) {
    return { id: "admin", max: 120, timeWindowMs: MINUTE };
  }

  return {
    id: "default",
    max: config.rateLimitMax,
    timeWindowMs: config.rateLimitTimeWindowMs,
  };
}

function authorizationFingerprint(request: FastifyRequest) {
  const authorization = request.headers.authorization;
  if (!authorization) return "anonymous";
  return createHash("sha256").update(authorization).digest("hex").slice(0, 20);
}

export function createApiRateLimitKey(request: FastifyRequest) {
  const policy = resolveApiRateLimitPolicy(request.method, request.url);
  const identity = policy.id === "auth" || policy.id === "password"
    ? "anonymous"
    : authorizationFingerprint(request);
  return `${policy.id}:${request.ip}:${identity}`;
}

export async function registerApiRateLimiting(app: FastifyInstance) {
  if (!config.rateLimitEnabled) return;

  const redis = await connectRateLimitRedis(app.log);
  if (redis) {
    app.addHook("onClose", async () => {
      if (redis.status === "ready") await redis.quit();
      else redis.disconnect(false);
    });
  }

  await app.register(rateLimit, {
    global: true,
    redis: redis ?? undefined,
    nameSpace: config.redisKeyPrefix,
    hook: "onRequest",
    max: async (request) => resolveApiRateLimitPolicy(request.method, request.url).max,
    timeWindow: async (request) => resolveApiRateLimitPolicy(request.method, request.url).timeWindowMs,
    keyGenerator: createApiRateLimitKey,
    allowList: (request) => request.method === "OPTIONS" || request.url === "/health" || request.url === "/metrics",
    skipOnError: false,
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: "Too Many Requests",
      code: "RATE_LIMITED",
      message: `请求过于频繁，请在 ${context.after} 后重试。`,
      retryAfter: context.after,
    }),
    onExceeded: (request, key) => {
      const route = request.routeOptions?.url || "unmatched";
      request.log.warn({
        event: "security.rate_limit_exceeded",
        method: request.method,
        path: route,
        rateLimitKey: key,
      });
      try {
        recordSecurityAuditEvent({
          eventType: "rate_limit.exceeded",
          severity: "warning",
          outcome: "denied",
          actorType: "anonymous",
          requestId: request.id,
          traceId: request.traceId,
          method: request.method,
          routeTemplate: route,
          networkIdentifier: request.ip,
          metadata: { policyId: resolveApiRateLimitPolicy(request.method, request.url).id },
        });
        observeSecurityMetric("rate_limit.exceeded", "warning", "denied");
      } catch (error) {
        request.log.error({ error, event: "security.audit_persist_failed", auditEventType: "rate_limit.exceeded" });
      }
    },
  });
}
