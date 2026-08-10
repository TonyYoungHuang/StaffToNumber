"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusPill } from "@score/ui";
import { apiRequest } from "../lib/api";
import { useAppLocale } from "./AppLocaleProvider";

const storageKey = "score_admin_api_key";

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
  const isChinese = locale === "zh-CN";
  const [adminKey, setAdminKey] = useState("");
  const [eventType, setEventType] = useState("");
  const [severity, setSeverity] = useState("");
  const [outcome, setOutcome] = useState("");
  const [payload, setPayload] = useState<AuditPayload | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(false);

  useEffect(() => setAdminKey(window.localStorage.getItem(storageKey) ?? ""), []);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({ limit: "200" });
    if (eventType.trim()) params.set("eventType", eventType.trim());
    if (severity) params.set("severity", severity);
    if (outcome) params.set("outcome", outcome);
    return `/api/admin/security/audit?${params.toString()}`;
  }, [eventType, severity, outcome]);

  function requireKey() {
    if (adminKey.trim()) return true;
    setMessage(isChinese ? "请先输入管理员密钥。" : "Enter the admin API key first.");
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
    setMessage(isChinese ? "安全审计记录已刷新。" : "Security audit events refreshed.");
    setMessageKind("success");
  }

  function saveKey() {
    if (!requireKey()) return;
    window.localStorage.setItem(storageKey, adminKey.trim());
    setMessage(isChinese ? "管理员密钥已保存在当前浏览器。" : "Admin key saved in this browser.");
    setMessageKind("success");
  }

  async function prune() {
    if (!requireKey()) return;
    const confirmed = window.confirm(isChinese
      ? `删除超过 ${payload?.retentionDays ?? 180} 天的安全审计记录？`
      : `Delete security audit events older than ${payload?.retentionDays ?? 180} days?`);
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
    setMessage(isChinese ? `已清理 ${result.data.result.deleted} 条过期记录。` : `Pruned ${result.data.result.deleted} expired events.`);
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
            <span className="field-label">{isChinese ? "管理员密钥" : "Admin API key"}</span>
            <input className="field-control" type="password" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} />
          </label>
          <label className="field-group">
            <span className="field-label">{isChinese ? "事件类型" : "Event type"}</span>
            <input className="field-control" value={eventType} onChange={(event) => setEventType(event.target.value)} placeholder="upload.mutation" />
          </label>
          <label className="field-group">
            <span className="field-label">{isChinese ? "严重程度" : "Severity"}</span>
            <select className="field-select" value={severity} onChange={(event) => setSeverity(event.target.value)}>
              <option value="">{isChinese ? "全部" : "All"}</option>
              <option value="info">info</option><option value="warning">warning</option><option value="error">error</option>
            </select>
          </label>
          <label className="field-group">
            <span className="field-label">{isChinese ? "结果" : "Outcome"}</span>
            <select className="field-select" value={outcome} onChange={(event) => setOutcome(event.target.value)}>
              <option value="">{isChinese ? "全部" : "All"}</option>
              <option value="success">success</option><option value="rejected">rejected</option><option value="denied">denied</option><option value="failed">failed</option>
            </select>
          </label>
        </div>
        <div className="button-row">
          <button type="button" className="button button-secondary" onClick={saveKey}>{isChinese ? "保存密钥" : "Save key"}</button>
          <button type="button" className="button button-primary" disabled={loading} onClick={() => void load()}>{isChinese ? "刷新审计" : "Refresh audit"}</button>
          <button type="button" className="button button-tertiary" disabled={loading || !payload} onClick={() => void prune()}>{isChinese ? "清理过期记录" : "Prune expired"}</button>
        </div>
        {message ? <p className={`form-status ${messageKind}`}>{message}</p> : null}
      </section>

      <section className="metric-grid">
        <div className="metric-card"><p className="metric-label">{isChinese ? "24 小时事件" : "24h events"}</p><p className="metric-value">{payload?.summary.total ?? 0}</p></div>
        <div className="metric-card"><p className="metric-label">{isChinese ? "错误" : "Errors"}</p><p className="metric-value">{errorCount}</p></div>
        <div className="metric-card"><p className="metric-label">{isChinese ? "拒绝访问" : "Denied"}</p><p className="metric-value">{deniedCount}</p></div>
        <div className="metric-card"><p className="metric-label">{isChinese ? "上传事件" : "Uploads"}</p><p className="metric-value">{uploadCount}</p></div>
      </section>

      <section className="surface-panel stack-lg">
        <div className="score-review-toolbar">
          <h2 className="card-title">{isChinese ? "安全事件" : "Security events"}</h2>
          {payload ? <StatusPill tone="cyan">{payload.events.length} / {payload.retentionDays}d</StatusPill> : null}
        </div>
        {!payload || payload.events.length === 0 ? <div className="empty-state">{isChinese ? "当前筛选条件下没有记录。" : "No events match the current filters."}</div> : (
          <div className="list-grid">
            {payload.events.map((event) => (
              <article className="list-item stack-md" key={event.id}>
                <div className="score-review-toolbar">
                  <div className="list-item-content">
                    <p className="item-title">{event.eventType}</p>
                    <p className="item-meta">{event.method ?? "-"} {event.routeTemplate ?? "-"} · {new Date(event.createdAt).toLocaleString(locale)}</p>
                  </div>
                  <StatusPill tone={toneFor(event)}>{event.outcome}</StatusPill>
                </div>
                <p className="item-meta">{event.actorType}{event.actorId ? ` · ${event.actorId}` : ""}</p>
                <p className="micro-copy">request {event.requestId ?? "-"} · trace {event.traceId ?? "-"}</p>
                {event.metadata ? <details><summary>{isChinese ? "事件详情" : "Event details"}</summary><pre className="feature-example-code">{JSON.stringify(event.metadata, null, 2)}</pre></details> : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
