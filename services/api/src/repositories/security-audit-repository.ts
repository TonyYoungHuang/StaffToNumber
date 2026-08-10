import { createHmac } from "node:crypto";
import { config } from "../config.js";
import { db } from "../db.js";
import { createId } from "../lib/auth.js";
import { nowIso } from "../lib/time.js";

export type SecurityAuditSeverity = "info" | "warning" | "error";
export type SecurityAuditOutcome = "success" | "rejected" | "denied" | "failed";
export type SecurityAuditActorType = "anonymous" | "user" | "admin" | "service";

type SecurityAuditRow = {
  id: string;
  event_type: string;
  severity: SecurityAuditSeverity;
  outcome: SecurityAuditOutcome;
  actor_type: SecurityAuditActorType;
  actor_id: string | null;
  request_id: string | null;
  trace_id: string | null;
  method: string | null;
  route_template: string | null;
  network_hash: string | null;
  resource_type: string | null;
  resource_id: string | null;
  metadata_json: string | null;
  created_at: string;
};

const SENSITIVE_KEY = /(authorization|cookie|password|token|secret|signature|api[-_]?key|credential)/iu;

function sanitizeMetadataValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[depth-limit]";
  if (value == null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value.slice(0, 1000);
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeMetadataValue(item, depth + 1));
  if (typeof value !== "object") return String(value).slice(0, 1000);

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 50)
      .map(([key, nested]) => [key, SENSITIVE_KEY.test(key) ? "[redacted]" : sanitizeMetadataValue(nested, depth + 1)]),
  );
}

export function serializeSecurityAuditMetadata(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) return null;
  const serialized = JSON.stringify(sanitizeMetadataValue(metadata));
  return serialized.length <= 8192 ? serialized : JSON.stringify({ truncated: true });
}

export function hashSecurityAuditNetworkIdentifier(value: string | null | undefined) {
  if (!value) return null;
  const key = config.securityAuditHashSalt || "score-development-audit-salt";
  return createHmac("sha256", key).update(value).digest("hex");
}

export function recordSecurityAuditEvent(input: {
  eventType: string;
  severity: SecurityAuditSeverity;
  outcome: SecurityAuditOutcome;
  actorType: SecurityAuditActorType;
  actorId?: string | null;
  requestId?: string | null;
  traceId?: string | null;
  method?: string | null;
  routeTemplate?: string | null;
  networkIdentifier?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const id = createId();
  const createdAt = nowIso();
  db.prepare(`
    INSERT INTO security_audit_events (
      id, event_type, severity, outcome, actor_type, actor_id, request_id, trace_id,
      method, route_template, network_hash, resource_type, resource_id, metadata_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.eventType.slice(0, 120),
    input.severity,
    input.outcome,
    input.actorType,
    input.actorId?.slice(0, 160) ?? null,
    input.requestId?.slice(0, 160) ?? null,
    input.traceId?.slice(0, 64) ?? null,
    input.method?.slice(0, 16) ?? null,
    input.routeTemplate?.slice(0, 500) ?? null,
    hashSecurityAuditNetworkIdentifier(input.networkIdentifier),
    input.resourceType?.slice(0, 120) ?? null,
    input.resourceId?.slice(0, 200) ?? null,
    serializeSecurityAuditMetadata(input.metadata),
    createdAt,
  );
  return id;
}

function mapSecurityAuditRow(row: SecurityAuditRow) {
  return {
    id: row.id,
    eventType: row.event_type,
    severity: row.severity,
    outcome: row.outcome,
    actorType: row.actor_type,
    actorId: row.actor_id,
    requestId: row.request_id,
    traceId: row.trace_id,
    method: row.method,
    routeTemplate: row.route_template,
    networkHash: row.network_hash,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) as Record<string, unknown> : null,
    createdAt: row.created_at,
  };
}

export function listSecurityAuditEvents(input: {
  limit?: number;
  before?: string | null;
  eventType?: string | null;
  severity?: SecurityAuditSeverity | null;
  outcome?: SecurityAuditOutcome | null;
  actorType?: SecurityAuditActorType | null;
} = {}) {
  const clauses: string[] = [];
  const values: Array<string | number> = [];
  if (input.before) {
    clauses.push("created_at < ?");
    values.push(input.before);
  }
  if (input.eventType) {
    clauses.push("event_type = ?");
    values.push(input.eventType);
  }
  if (input.severity) {
    clauses.push("severity = ?");
    values.push(input.severity);
  }
  if (input.outcome) {
    clauses.push("outcome = ?");
    values.push(input.outcome);
  }
  if (input.actorType) {
    clauses.push("actor_type = ?");
    values.push(input.actorType);
  }
  const limit = Math.min(Math.max(Math.trunc(input.limit ?? 100), 1), 500);
  values.push(limit);
  const rows = db.prepare(`
    SELECT id, event_type, severity, outcome, actor_type, actor_id, request_id, trace_id,
           method, route_template, network_hash, resource_type, resource_id, metadata_json, created_at
    FROM security_audit_events
    ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(...values) as SecurityAuditRow[];
  return rows.map(mapSecurityAuditRow);
}

export function getSecurityAuditSummary(sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) {
  const rows = db.prepare(`
    SELECT event_type, severity, outcome, COUNT(*) AS event_count
    FROM security_audit_events
    WHERE created_at >= ?
    GROUP BY event_type, severity, outcome
    ORDER BY event_count DESC, event_type ASC
  `).all(sinceIso) as Array<{ event_type: string; severity: SecurityAuditSeverity; outcome: SecurityAuditOutcome; event_count: number }>;
  return {
    since: sinceIso,
    total: rows.reduce((sum, row) => sum + Number(row.event_count), 0),
    groups: rows.map((row) => ({
      eventType: row.event_type,
      severity: row.severity,
      outcome: row.outcome,
      count: Number(row.event_count),
    })),
  };
}

export function pruneSecurityAuditEvents(retentionDays = config.securityAuditRetentionDays) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const result = db.prepare("DELETE FROM security_audit_events WHERE created_at < ?").run(cutoff);
  return { cutoff, deleted: Number(result.changes) };
}
