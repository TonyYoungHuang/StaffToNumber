"use client";

import { useAdminMessages } from "../lib/admin-messages/client";

import { useMemo, useState } from "react";
import { StatusPill } from "@score/ui";
import { apiRequest } from "../lib/api";
import { useAppLocale } from "./AppLocaleProvider";

type AuditEvent = {
  id: string;
  eventType: string;
  severity: "info" | "warning" | "error";
  outcome: "success" | "rejected" | "denied" | "failed";
  actorType: "anonymous" | "user" | "admin" | "service";
  actorId: string | null;
  requestId: string | null;
  traceId: string | null;
  method: string | null;
  routeTemplate: string | null;
  networkHash: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type AuditPayload = {
  retentionDays: number;
  summary: {
    since: string;
    total: number;
    groups: Array<{ eventType: string; severity: AuditEvent["severity"]; outcome: AuditEvent["outcome"]; count: number }>;
  };
  events: AuditEvent[];
};

function toneFor(event: AuditEvent) {
  if (event.severity === "error" || event.outcome === "failed") return "red" as const;
  if (event.severity === "warning" || event.outcome === "denied" || event.outcome === "rejected") return "amber" as const;
  return "green" as const;
}

export function AdminSecurityAuditManager() {
  const { locale } = useAppLocale();
  const { adminText, adminStatus } = useAdminMessages();
  const isChinese = locale === "zh-CN";
  const [adminKey, setAdminKey] = useState("");
  const [eventType, setEventType] = useState("");
  const [severity, setSeverity] = useState("");
  const [outcome, setOutcome] = useState("");
  const [payload, setPayload] = useState<AuditPayload | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(false);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({ limit: "200" });
    if (eventType.trim()) params.set("eventType", eventType.trim());
    if (severity) params.set("severity", severity);
    if (outcome) params.set("outcome", outcome);
    return `/api/admin/security/audit?${params.toString()}`;
  }, [eventType, severity, outcome]);

  function requireKey() {
    if (adminKey.trim()) return true;
    setMessage(isChinese ? "请先输入管理员密钥。" : adminText(locale, "Enter the admin API key first."));
    setMessageKind("error");
    return false;
  }

  async function load() {
    if (!requireKey()) return;
    setLoading(true);
    const result = await apiRequest<AuditPayload>(endpoint, { headers: { "x-admin-api-key": adminKey.trim() } });
    setLoading(false);
    if (!result.ok) {
      setMessage(result.error);
      setMessageKind("error");
      return;
    }
    setPayload(result.data);
    setMessage(isChinese ? "安全审计记录已刷新。" : adminText(locale, "Security audit events refreshed."));
    setMessageKind("success");
  }

  async function prune() {
    if (!requireKey()) return;
    const confirmed = window.confirm(isChinese
      ? `删除超过 ${payload?.retentionDays ?? 180} 天的安全审计记录？`
      : adminText(locale, "Delete security audit events older than {days} days?", { days: payload?.retentionDays ?? 180 }));
    if (!confirmed) return;
    setLoading(true);
    const result = await apiRequest<{ result: { deleted: number } }>("/api/admin/security/audit/prune", {
      method: "POST",
      headers: { "x-admin-api-key": adminKey.trim() },
      body: JSON.stringify({}),
    });
    setLoading(false);
    if (!result.ok) {
      setMessage(result.error);
      setMessageKind("error");
      return;
    }
    setMessage(isChinese ? `已清理 ${result.data.result.deleted} 条过期记录。` : adminText(locale, "Expired events removed: {count}.", { count: result.data.result.deleted }));
    setMessageKind("success");
    await load();
  }

  const errorCount = payload?.summary.groups.filter((group) => group.severity === "error").reduce((sum, group) => sum + group.count, 0) ?? 0;
  const deniedCount = payload?.summary.groups.filter((group) => group.outcome === "denied").reduce((sum, group) => sum + group.count, 0) ?? 0;
  const uploadCount = payload?.summary.groups.filter((group) => group.eventType === "upload.mutation").reduce((sum, group) => sum + group.count, 0) ?? 0;

  return (
    <div className="page-stack">
      <section className="surface-panel stack-lg">
        <div className="form-grid">
          <label className="field-group">
            <span className="field-label">{isChinese ? "管理员密钥" : adminText(locale, "Admin API key")}</span>
            <input className="field-control" type="password" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} />
          </label>
          <label className="field-group">
            <span className="field-label">{isChinese ? "事件类型" : adminText(locale, "Event type")}</span>
            <input className="field-control" value={eventType} onChange={(event) => setEventType(event.target.value)} placeholder="upload.mutation" />
          </label>
          <label className="field-group">
            <span className="field-label">{isChinese ? "严重程度" : adminText(locale, "Severity")}</span>
            <select className="field-select" value={severity} onChange={(event) => setSeverity(event.target.value)}>
              <option value="">{isChinese ? "全部" : adminText(locale, "All")}</option>
              <option value="info">{adminStatus(locale, "info")}</option><option value="warning">{adminStatus(locale, "warning")}</option><option value="error">{adminStatus(locale, "error")}</option>
            </select>
          </label>
          <label className="field-group">
            <span className="field-label">{isChinese ? "结果" : adminText(locale, "Outcome")}</span>
            <select className="field-select" value={outcome} onChange={(event) => setOutcome(event.target.value)}>
              <option value="">{isChinese ? "全部" : adminText(locale, "All")}</option>
              <option value="success">{adminStatus(locale, "success")}</option><option value="rejected">{adminStatus(locale, "rejected")}</option><option value="denied">{adminStatus(locale, "denied")}</option><option value="failed">{adminStatus(locale, "failed")}</option>
            </select>
          </label>
        </div>
        <div className="button-row">
          <button type="button" className="button button-primary" disabled={loading} onClick={() => void load()}>{isChinese ? "刷新审计" : adminText(locale, "Refresh audit")}</button>
          <button type="button" className="button button-tertiary" disabled={loading || !payload} onClick={() => void prune()}>{isChinese ? "清理过期记录" : adminText(locale, "Prune expired")}</button>
        </div>
        <p className="micro-copy">{isChinese ? "管理员密钥仅保留在当前页面内存中。" : adminText(locale, "The admin key stays only in this page's memory.")}</p>
        {message ? <p className={`form-status ${messageKind}`}>{message}</p> : null}
      </section>

      <section className="metric-grid">
        <div className="metric-card"><p className="metric-label">{isChinese ? "24 小时事件" : adminText(locale, "24h events")}</p><p className="metric-value">{payload?.summary.total ?? 0}</p></div>
        <div className="metric-card"><p className="metric-label">{isChinese ? "错误" : adminText(locale, "Errors")}</p><p className="metric-value">{errorCount}</p></div>
        <div className="metric-card"><p className="metric-label">{isChinese ? "拒绝访问" : adminText(locale, "Denied")}</p><p className="metric-value">{deniedCount}</p></div>
        <div className="metric-card"><p className="metric-label">{isChinese ? "上传事件" : adminText(locale, "Uploads")}</p><p className="metric-value">{uploadCount}</p></div>
      </section>

      <section className="surface-panel stack-lg">
        <div className="score-review-toolbar">
          <h2 className="card-title">{isChinese ? "安全事件" : adminText(locale, "Security events")}</h2>
          {payload ? <StatusPill tone="cyan">{payload.events.length} / {payload.retentionDays}d</StatusPill> : null}
        </div>
        {!payload || payload.events.length === 0 ? <div className="empty-state">{isChinese ? "当前筛选条件下没有记录。" : adminText(locale, "No events match the current filters.")}</div> : (
          <div className="list-grid">
            {payload.events.map((event) => (
              <article className="list-item stack-md" key={event.id}>
                <div className="score-review-toolbar">
                  <div className="list-item-content">
                    <p className="item-title">{event.eventType}</p>
                    <p className="item-meta">{event.method ?? "-"} {event.routeTemplate ?? "-"} · {new Date(event.createdAt).toLocaleString(locale)}</p>
                  </div>
                  <StatusPill tone={toneFor(event)}>{adminStatus(locale, event.outcome)}</StatusPill>
                </div>
                <p className="item-meta">{event.actorType}{event.actorId ? ` · ${event.actorId}` : ""}</p>
                <p className="micro-copy">{adminText(locale, "Request")} {event.requestId ?? "-"} · {adminText(locale, "Trace")} {event.traceId ?? "-"}</p>
                {event.metadata ? <details><summary>{isChinese ? "事件详情" : adminText(locale, "Event details")}</summary><pre className="feature-example-code">{JSON.stringify(event.metadata, null, 2)}</pre></details> : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
