"use client";

import { useMemo, useState } from "react";
import { StatusPill } from "@score/ui";
import { apiRequest } from "../lib/api";
import { useAppLocale } from "./AppLocaleProvider";

const statuses = ["received", "validating", "info_required", "reviewing", "actioned", "rejected", "closed"] as const;
type ComplaintStatus = (typeof statuses)[number];

type Complaint = {
  id: string;
  referenceCode: string;
  claimantName: string;
  claimantEmail: string;
  organization: string | null;
  rightsBasis: string;
  originalWorkDescription: string;
  allegedlyInfringingUrls: string[];
  evidenceUrls: string[];
  requestedAction: string;
  signature: string;
  status: ComplaintStatus;
  priority: string;
  responseDueAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  actionTaken: string | null;
  createdAt: string;
  updatedAt: string;
};

type ComplaintEvent = {
  id: string;
  fromStatus: ComplaintStatus | null;
  toStatus: ComplaintStatus;
  actorType: string;
  actorId: string | null;
  publicMessage: string | null;
  internalNote: string | null;
  actionTaken: string | null;
  createdAt: string;
};

function tone(status: ComplaintStatus) {
  if (status === "actioned" || status === "closed") return "green" as const;
  if (status === "rejected") return "red" as const;
  if (status === "received" || status === "info_required") return "amber" as const;
  return "cyan" as const;
}

export function AdminCopyrightManager() {
  const { locale } = useAppLocale();
  const isChinese = locale === "zh-CN";
  const [adminKey, setAdminKey] = useState("");
  const [filter, setFilter] = useState("");
  const [items, setItems] = useState<Complaint[]>([]);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [events, setEvents] = useState<ComplaintEvent[]>([]);
  const [nextStatus, setNextStatus] = useState<ComplaintStatus>("validating");
  const [publicMessage, setPublicMessage] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"success" | "error">("success");

  const overdue = useMemo(() => items.filter((item) => !["actioned", "rejected", "closed"].includes(item.status) && Date.parse(item.responseDueAt) < Date.now()).length, [items]);

  function requireKey() {
    if (adminKey.trim()) return true;
    setMessage(isChinese ? "请先输入管理员密钥。" : "Enter the admin API key first.");
    setMessageKind("error");
    return false;
  }

  async function loadList() {
    if (!requireKey()) return;
    setLoading(true);
    const query = new URLSearchParams({ limit: "200" });
    if (filter) query.set("status", filter);
    const result = await apiRequest<{ items: Complaint[] }>(`/api/admin/copyright/complaints?${query}`, { headers: { "x-admin-api-key": adminKey.trim() } });
    setLoading(false);
    if (!result.ok) {
      setMessage(result.error); setMessageKind("error"); return;
    }
    setItems(result.data.items);
    setMessage(isChinese ? "投诉队列已刷新。" : "Complaint queue refreshed.");
    setMessageKind("success");
  }

  async function open(item: Complaint) {
    if (!requireKey()) return;
    setLoading(true);
    const result = await apiRequest<{ item: Complaint; events: ComplaintEvent[] }>(`/api/admin/copyright/complaints/${item.id}`, { headers: { "x-admin-api-key": adminKey.trim() } });
    setLoading(false);
    if (!result.ok) { setMessage(result.error); setMessageKind("error"); return; }
    setSelected(result.data.item);
    setEvents(result.data.events);
    setNextStatus(result.data.item.status === "received" ? "validating" : result.data.item.status);
    setPublicMessage(""); setInternalNote(""); setActionTaken(result.data.item.actionTaken ?? "");
  }

  async function save() {
    if (!selected || !requireKey()) return;
    setLoading(true);
    const result = await apiRequest<{ item: Complaint }>(`/api/admin/copyright/complaints/${selected.id}`, {
      method: "PATCH",
      headers: { "x-admin-api-key": adminKey.trim() },
      body: JSON.stringify({ status: nextStatus, publicMessage, internalNote, actionTaken }),
    });
    setLoading(false);
    if (!result.ok) { setMessage(result.error); setMessageKind("error"); return; }
    setMessage(isChinese ? "处理记录已保存并进入不可变事件历史。" : "Case update saved to the immutable event history.");
    setMessageKind("success");
    await open(result.data.item);
    await loadList();
  }

  return (
    <div className="stack-xl">
      <section className="surface-panel stack-lg">
        <div className="field-row">
          <label className="field-group" style={{ flex: 2 }}><span className="field-label">{isChinese ? "管理员密钥" : "Admin API key"}</span><input className="field-control" type="password" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} /></label>
          <label className="field-group" style={{ flex: 1 }}><span className="field-label">{isChinese ? "状态" : "Status"}</span><select className="field-select" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">{isChinese ? "全部" : "All"}</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
        </div>
        <p className="micro-copy">{isChinese ? "管理员密钥仅保留在当前页面内存中，刷新或关闭页面后清除。" : "The admin key stays only in this page's memory and is cleared on refresh or close."}</p>
        <div className="button-row"><button className="button button-primary" type="button" disabled={loading} onClick={() => void loadList()}>{isChinese ? "刷新队列" : "Refresh queue"}</button></div>
        {message ? <p className={`form-status ${messageKind}`}>{message}</p> : null}
      </section>

      <section className="metric-grid"><div className="metric-card"><p className="metric-label">{isChinese ? "当前列表" : "Current list"}</p><p className="metric-value">{items.length}</p></div><div className="metric-card"><p className="metric-label">{isChinese ? "逾期首次响应" : "Initial response overdue"}</p><p className="metric-value">{overdue}</p></div></section>

      <div className="score-workspace-grid">
        <section className="surface-panel stack-lg">
          <h2 className="card-title">{isChinese ? "投诉队列" : "Complaint queue"}</h2>
          {items.length === 0 ? <div className="empty-state">{isChinese ? "请刷新队列。" : "Refresh the queue to begin."}</div> : <div className="list-grid">{items.map((item) => <button type="button" className="list-item stack-sm" key={item.id} onClick={() => void open(item)}><div className="score-review-toolbar"><span className="item-title">{item.referenceCode}</span><StatusPill tone={tone(item.status)}>{item.status}</StatusPill></div><span className="item-meta">{item.claimantName} · {new Date(item.createdAt).toLocaleString(locale)}</span><span className="micro-copy">due {new Date(item.responseDueAt).toLocaleString(locale)}</span></button>)}</div>}
        </section>

        <section className="surface-panel stack-lg">
          {!selected ? <div className="empty-state">{isChinese ? "选择一条投诉查看材料和处理历史。" : "Select a complaint to inspect materials and history."}</div> : <>
            <div className="score-review-toolbar"><div><h2 className="card-title">{selected.referenceCode}</h2><p className="item-meta">{selected.claimantName} · {selected.claimantEmail}</p></div><StatusPill tone={tone(selected.status)}>{selected.status}</StatusPill></div>
            <dl className="detail-list"><div><dt>{isChinese ? "权利基础" : "Rights basis"}</dt><dd>{selected.rightsBasis}</dd></div><div><dt>{isChinese ? "签名" : "Signature"}</dt><dd>{selected.signature}</dd></div><div><dt>{isChinese ? "响应目标" : "Response due"}</dt><dd>{new Date(selected.responseDueAt).toLocaleString(locale)}</dd></div></dl>
            <details open><summary>{isChinese ? "原创作品说明" : "Original work"}</summary><p className="body-copy">{selected.originalWorkDescription}</p></details>
            <details open><summary>{isChinese ? "目标链接" : "Target URLs"}</summary>{selected.allegedlyInfringingUrls.map((url) => <p key={url} className="micro-copy"><a href={url} target="_blank" rel="noreferrer">{url}</a></p>)}</details>
            <details><summary>{isChinese ? "证据与请求" : "Evidence and request"}</summary>{selected.evidenceUrls.map((url) => <p key={url} className="micro-copy"><a href={url} target="_blank" rel="noreferrer">{url}</a></p>)}<p className="body-copy">{selected.requestedAction}</p></details>
            <div className="form-grid">
              <label className="field-group"><span className="field-label">{isChinese ? "下一状态" : "Next status"}</span><select className="field-select" value={nextStatus} onChange={(event) => setNextStatus(event.target.value as ComplaintStatus)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label className="field-group"><span className="field-label">{isChinese ? "对投诉人公开的回复" : "Public claimant message"}</span><textarea className="field-control" rows={4} maxLength={4000} value={publicMessage} onChange={(event) => setPublicMessage(event.target.value)} /></label>
              <label className="field-group"><span className="field-label">{isChinese ? "内部备注（不会公开）" : "Internal note (never public)"}</span><textarea className="field-control" rows={4} maxLength={4000} value={internalNote} onChange={(event) => setInternalNote(event.target.value)} /></label>
              <label className="field-group"><span className="field-label">{isChinese ? "已采取措施" : "Action taken"}</span><textarea className="field-control" rows={3} maxLength={2000} value={actionTaken} onChange={(event) => setActionTaken(event.target.value)} /></label>
              <button className="button button-primary" type="button" disabled={loading} onClick={() => void save()}>{isChinese ? "保存处理记录" : "Save case update"}</button>
            </div>
            <div className="stack-md"><h3 className="card-title">{isChinese ? "完整事件历史" : "Complete event history"}</h3>{events.map((event) => <details key={event.id}><summary>{event.fromStatus ?? "new"} → {event.toStatus} · {new Date(event.createdAt).toLocaleString(locale)}</summary>{event.publicMessage ? <p className="body-copy"><strong>public:</strong> {event.publicMessage}</p> : null}{event.internalNote ? <p className="body-copy"><strong>internal:</strong> {event.internalNote}</p> : null}{event.actionTaken ? <p className="body-copy"><strong>action:</strong> {event.actionTaken}</p> : null}</details>)}</div>
          </>}
        </section>
      </div>
    </div>
  );
}
