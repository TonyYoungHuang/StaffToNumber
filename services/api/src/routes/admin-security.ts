import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import {
  getSecurityAuditSummary,
  listSecurityAuditEvents,
  pruneSecurityAuditEvents,
  type SecurityAuditActorType,
  type SecurityAuditOutcome,
  type SecurityAuditSeverity,
} from "../repositories/security-audit-repository.js";

const severities = new Set<SecurityAuditSeverity>(["info", "warning", "error"]);
const outcomes = new Set<SecurityAuditOutcome>(["success", "rejected", "denied", "failed"]);
const actorTypes = new Set<SecurityAuditActorType>(["anonymous", "user", "admin", "service"]);

function safeIso(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export async function adminSecurityRoutes(app: FastifyInstance) {
  app.get("/admin/security/audit", { preHandler: app.requireAdmin }, async (request, reply) => {
    const query = (request.query ?? {}) as Record<string, string | undefined>;
    const limit = Number(query.limit ?? 100);
    const before = safeIso(query.before);
    const severity = query.severity && severities.has(query.severity as SecurityAuditSeverity) ? query.severity as SecurityAuditSeverity : null;
    const outcome = query.outcome && outcomes.has(query.outcome as SecurityAuditOutcome) ? query.outcome as SecurityAuditOutcome : null;
    const actorType = query.actorType && actorTypes.has(query.actorType as SecurityAuditActorType) ? query.actorType as SecurityAuditActorType : null;
    const eventType = query.eventType?.trim() || null;

    if (!Number.isFinite(limit) || limit < 1 || limit > 500 || before === undefined || (query.severity && !severity) || (query.outcome && !outcome) || (query.actorType && !actorType) || (eventType && eventType.length > 120)) {
      return reply.code(400).send({ error: "Invalid security audit query." });
    }

    return {
      retentionDays: config.securityAuditRetentionDays,
      summary: getSecurityAuditSummary(),
      events: listSecurityAuditEvents({ limit, before, severity, outcome, actorType, eventType }),
    };
  });

  app.post("/admin/security/audit/prune", { preHandler: app.requireAdmin }, async () => ({
    retentionDays: config.securityAuditRetentionDays,
    result: pruneSecurityAuditEvents(),
  }));
}
