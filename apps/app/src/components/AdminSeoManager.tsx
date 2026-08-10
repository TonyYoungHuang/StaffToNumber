"use client";

import { useMemo, useState } from "react";
import { StatusPill } from "@score/ui";
import { apiRequest } from "../lib/api";
import { useAppLocale } from "./AppLocaleProvider";

type Snapshot = {
  id: string;
  provider: string;
  propertyUri: string;
  startDate: string;
  endDate: string;
  importedBy: string;
  importedAt: string;
  rowCount: number;
  issueCount: number;
};

type Metric = { query: string | null; page: string; clicks: number; impressions: number; ctr: number; position: number };
type IndexIssue = { id: string; page: string; severity: "error" | "warning" | "info"; issueType: string; verdict: string | null; coverageState: string | null };
type Dashboard = {
  snapshot: Snapshot | null;
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  queries: Metric[];
  pages: Metric[];
  indexIssues: IndexIssue[];
};
type SearchPayload = { snapshots: Snapshot[]; dashboard: Dashboard };
type ContentReview = {
  id: string;
  status: "in_review" | "approved" | "changes_requested";
  factsChecked: boolean;
  duplicationChecked: boolean;
  evidenceChecked: boolean;
  reviewedBy: string;
  notes: string | null;
  createdAt: string;
};
type ContentReviewItem = {
  slug: string;
  contentHash: string;
  title: string;
  description: string;
  canonical: string;
  primaryKeyword: string;
  registeredAt: string;
  review: ContentReview | null;
  publishReady: boolean;
};
type SearchPayloadWithReviews = SearchPayload & { contentReviews: ContentReviewItem[] };

const exampleImport = JSON.stringify({
  provider: "google_search_console",
  propertyUri: "sc-domain:scoretransposer.com",
  startDate: "2026-07-01",
  endDate: "2026-07-14",
  metrics: [
    { query: "transpose sheet music", page: "https://scoretransposer.com/transpose-score", clicks: 12, impressions: 180, ctr: 0.0667, position: 6.4 },
  ],
  indexIssues: [
    { page: "https://scoretransposer.com/example", severity: "warning", issueType: "crawled_not_indexed", verdict: "NEUTRAL" },
  ],
  sourceMetadata: { exportType: "search_analytics" },
}, null, 2);

function number(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value || 0);
}

export function AdminSeoManager() {
  const { locale } = useAppLocale();
  const isChinese = locale === "zh-CN";
  const [adminKey, setAdminKey] = useState("");
  const [snapshotId, setSnapshotId] = useState("");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [importText, setImportText] = useState(exampleImport);
  const [manifestText, setManifestText] = useState("");
  const [reviewer, setReviewer] = useState("");
  const [contentReviews, setContentReviews] = useState<ContentReviewItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(false);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({ limit: "50" });
    if (snapshotId) params.set("snapshotId", snapshotId);
    return `/api/admin/seo/search?${params.toString()}`;
  }, [snapshotId]);

  function requireKey() {
    if (adminKey.trim()) return true;
    setMessage(isChinese ? "请先输入管理员密钥。" : "Enter the admin API key first.");
    setMessageKind("error");
    return false;
  }

  async function load(nextSnapshotId = snapshotId) {
    if (!requireKey()) return;
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (nextSnapshotId) params.set("snapshotId", nextSnapshotId);
    const result = await apiRequest<SearchPayloadWithReviews>(`/api/admin/seo/search?${params.toString()}`, {
      headers: { "x-admin-api-key": adminKey.trim() },
    });
    setLoading(false);
    if (!result.ok) {
      setMessage(result.error);
      setMessageKind("error");
      return;
    }
    setSnapshots(result.data.snapshots);
    setDashboard(result.data.dashboard);
    setContentReviews(result.data.contentReviews);
    setSnapshotId(result.data.dashboard.snapshot?.id ?? nextSnapshotId);
    setMessage(isChinese ? "搜索数据已加载。" : "Search data loaded.");
    setMessageKind("success");
  }

  async function importSnapshot() {
    if (!requireKey()) return;
    let payload: unknown;
    try {
      payload = JSON.parse(importText);
    } catch {
      setMessage(isChinese ? "导入内容不是有效 JSON。" : "The import content is not valid JSON.");
      setMessageKind("error");
      return;
    }
    setLoading(true);
    const result = await apiRequest<{ snapshot: Snapshot; dashboard: Dashboard }>("/api/admin/seo/search/import", {
      method: "POST",
      headers: { "x-admin-api-key": adminKey.trim() },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!result.ok) {
      setMessage(result.error);
      setMessageKind("error");
      return;
    }
    setDashboard(result.data.dashboard);
    setSnapshotId(result.data.snapshot.id);
    setSnapshots((current) => [result.data.snapshot, ...current.filter((item) => item.id !== result.data.snapshot.id)]);
    setMessage(isChinese ? "不可变 SEO 快照已导入。" : "Immutable SEO snapshot imported.");
    setMessageKind("success");
  }

  async function registerManifest() {
    if (!requireKey()) return;
    let payload: unknown;
    try {
      payload = JSON.parse(manifestText);
    } catch {
      setMessage(isChinese ? "内容清单不是有效 JSON。" : "The content manifest is not valid JSON.");
      setMessageKind("error");
      return;
    }
    setLoading(true);
    const result = await apiRequest<{ contentReviews: ContentReviewItem[] }>("/api/admin/seo/content/manifest", {
      method: "POST",
      headers: { "x-admin-api-key": adminKey.trim() },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!result.ok) {
      setMessage(result.error);
      setMessageKind("error");
      return;
    }
    setContentReviews(result.data.contentReviews);
    setMessage(isChinese ? "内容版本清单已登记；变更页面的旧审批会自动失效。" : "Content manifest registered; approvals for changed pages are now stale.");
    setMessageKind("success");
  }

  async function submitReview(item: ContentReviewItem, decision: {
    status: "approved" | "changes_requested";
    factsChecked: boolean;
    duplicationChecked: boolean;
    evidenceChecked: boolean;
    notes: string;
  }) {
    if (!requireKey()) return false;
    if (reviewer.trim().length < 2) {
      setMessage(isChinese ? "请填写真实审核人姓名或团队身份。" : "Enter the real reviewer name or team identity.");
      setMessageKind("error");
      return false;
    }
    setLoading(true);
    const result = await apiRequest<{ contentReviews: ContentReviewItem[] }>(`/api/admin/seo/content/${item.slug}/review`, {
      method: "POST",
      headers: { "x-admin-api-key": adminKey.trim() },
      body: JSON.stringify({ ...decision, contentHash: item.contentHash, reviewedBy: reviewer.trim() }),
    });
    setLoading(false);
    if (!result.ok) {
      setMessage(result.error);
      setMessageKind("error");
      return false;
    }
    setContentReviews(result.data.contentReviews);
    setMessage(decision.status === "approved"
      ? (isChinese ? "当前内容版本已批准。" : "The current content version is approved.")
      : (isChinese ? "已退回修改。" : "Changes requested."));
    setMessageKind("success");
    return true;
  }

  async function readFile(file: File | null) {
    if (!file) return;
    setImportText(await file.text());
  }

  async function readManifestFile(file: File | null) {
    if (!file) return;
    setManifestText(await file.text());
  }

  return (
    <div className="page-stack">
      <section className="surface-panel stack-lg">
        <div className="form-grid">
          <label className="field-group">
            <span className="field-label">{isChinese ? "管理员密钥" : "Admin API key"}</span>
            <input className="field-control" type="password" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} />
          </label>
          <label className="field-group">
            <span className="field-label">{isChinese ? "历史快照" : "Historical snapshot"}</span>
            <select className="field-select" value={snapshotId} onChange={(event) => { setSnapshotId(event.target.value); void load(event.target.value); }}>
              <option value="">{isChinese ? "最新快照" : "Latest snapshot"}</option>
              {snapshots.map((snapshot) => (
                <option key={snapshot.id} value={snapshot.id}>{snapshot.provider} · {snapshot.startDate} - {snapshot.endDate}</option>
              ))}
            </select>
          </label>
          <div className="button-row">
            <button type="button" className="button button-primary" disabled={loading} onClick={() => void load()}>{isChinese ? "刷新数据" : "Refresh data"}</button>
          </div>
          <p className="micro-copy">{isChinese ? "管理员密钥仅保留在当前页面内存中。" : "The admin key stays only in this page's memory."}</p>
          <p className="micro-copy">{endpoint}</p>
        </div>
        {message ? <p className={`form-status ${messageKind}`}>{message}</p> : null}
      </section>

      <section className="surface-panel stack-lg">
        <div className="score-review-toolbar">
          <div>
            <p className="eyebrow">AI TDK</p>
            <h2 className="card-title">{isChinese ? "内容版本与人工发布审批" : "Content versions and human publication approval"}</h2>
          </div>
          <StatusPill tone={contentReviews.length > 0 && contentReviews.every((item) => item.publishReady) ? "green" : "amber"}>
            {contentReviews.filter((item) => item.publishReady).length}/{contentReviews.length || 0}
          </StatusPill>
        </div>
        <p className="body-copy">{isChinese
          ? "从官网 /seo-audit/report 下载清单并导入。审批绑定 SHA-256 内容哈希，页面事实或素材变化后必须重新审核。"
          : "Download the manifest from /seo-audit/report and import it here. Approval is bound to a SHA-256 content hash and expires when claims or evidence change."}</p>
        <div className="form-grid">
          <label className="field-group">
            <span className="field-label">{isChinese ? "审核人" : "Reviewer"}</span>
            <input className="field-control" value={reviewer} onChange={(event) => setReviewer(event.target.value)} placeholder={isChinese ? "姓名或团队身份" : "Name or team identity"} />
          </label>
          <label className="field-group">
            <span className="field-label">{isChinese ? "审计清单 JSON" : "Audit manifest JSON"}</span>
            <input type="file" accept="application/json,.json" onChange={(event) => void readManifestFile(event.target.files?.[0] ?? null)} />
          </label>
        </div>
        <textarea className="field-control" rows={6} value={manifestText} onChange={(event) => setManifestText(event.target.value)} spellCheck={false} placeholder="{ &quot;manifest&quot;: { &quot;pages&quot;: [...] } }" />
        <div className="button-row">
          <button type="button" className="button button-primary" disabled={loading || !manifestText.trim()} onClick={() => void registerManifest()}>{isChinese ? "登记内容版本" : "Register content versions"}</button>
        </div>
        <div className="list-grid">
          {contentReviews.length === 0 ? <div className="empty-state">{isChinese ? "尚未登记功能页内容清单。" : "No feature-page content manifest has been registered."}</div> : contentReviews.map((item) => (
            <ContentReviewCard key={`${item.slug}-${item.contentHash}`} item={item} isChinese={isChinese} loading={loading} onSubmit={(decision) => submitReview(item, decision)} />
          ))}
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <div className="score-review-toolbar">
          <div>
            <p className="eyebrow">{isChinese ? "官方数据导入" : "Official data import"}</p>
            <h2 className="card-title">{isChinese ? "导入标准化 JSON 快照" : "Import a normalized JSON snapshot"}</h2>
          </div>
          <input type="file" accept="application/json,.json" onChange={(event) => void readFile(event.target.files?.[0] ?? null)} />
        </div>
        <textarea className="field-control" rows={16} value={importText} onChange={(event) => setImportText(event.target.value)} spellCheck={false} />
        <div className="button-row">
          <button type="button" className="button button-primary" disabled={loading} onClick={() => void importSnapshot()}>{isChinese ? "导入快照" : "Import snapshot"}</button>
          <button type="button" className="button button-tertiary" onClick={() => setImportText(exampleImport)}>{isChinese ? "恢复示例" : "Restore example"}</button>
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <div className="score-review-toolbar">
          <h2 className="card-title">{isChinese ? "搜索表现" : "Search performance"}</h2>
          {dashboard?.snapshot ? <StatusPill tone="cyan">{dashboard.snapshot.provider}</StatusPill> : null}
        </div>
        <div className="metric-grid">
          <div className="metric-card"><p className="metric-label">{isChinese ? "点击" : "Clicks"}</p><p className="metric-value">{number(dashboard?.totals.clicks ?? 0)}</p></div>
          <div className="metric-card"><p className="metric-label">{isChinese ? "展示" : "Impressions"}</p><p className="metric-value">{number(dashboard?.totals.impressions ?? 0)}</p></div>
          <div className="metric-card"><p className="metric-label">CTR</p><p className="metric-value">{number((dashboard?.totals.ctr ?? 0) * 100, 2)}%</p></div>
          <div className="metric-card"><p className="metric-label">{isChinese ? "平均排名" : "Average position"}</p><p className="metric-value">{number(dashboard?.totals.position ?? 0, 2)}</p></div>
        </div>
      </section>

      <section className="split-layout">
        <MetricList title={isChinese ? "搜索词" : "Queries"} items={dashboard?.queries ?? []} dimension="query" empty={isChinese ? "暂无搜索词数据。" : "No query data."} />
        <MetricList title={isChinese ? "页面" : "Pages"} items={dashboard?.pages ?? []} dimension="page" empty={isChinese ? "暂无页面数据。" : "No page data."} />
      </section>

      <section className="surface-panel stack-lg">
        <h2 className="card-title">{isChinese ? "索引问题" : "Indexing issues"}</h2>
        {(dashboard?.indexIssues.length ?? 0) === 0 ? <div className="empty-state">{isChinese ? "当前快照没有索引问题。" : "No indexing issues in this snapshot."}</div> : (
          <div className="list-grid">
            {dashboard?.indexIssues.map((issue) => (
              <div className="list-item" key={issue.id}>
                <StatusPill tone={issue.severity === "error" ? "red" : issue.severity === "warning" ? "amber" : "cyan"}>{issue.severity}</StatusPill>
                <div className="list-item-content">
                  <p className="item-title">{issue.issueType}</p>
                  <p className="item-meta">{issue.page}</p>
                  <p className="item-meta">{issue.verdict || issue.coverageState || "-"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ContentReviewCard({ item, isChinese, loading, onSubmit }: {
  item: ContentReviewItem;
  isChinese: boolean;
  loading: boolean;
  onSubmit: (decision: { status: "approved" | "changes_requested"; factsChecked: boolean; duplicationChecked: boolean; evidenceChecked: boolean; notes: string }) => Promise<boolean>;
}) {
  const [factsChecked, setFactsChecked] = useState(false);
  const [duplicationChecked, setDuplicationChecked] = useState(false);
  const [evidenceChecked, setEvidenceChecked] = useState(false);
  const [notes, setNotes] = useState("");
  const allChecked = factsChecked && duplicationChecked && evidenceChecked;
  const decision = { factsChecked, duplicationChecked, evidenceChecked, notes };
  return (
    <div className="list-item stack-md">
      <div className="score-review-toolbar">
        <div className="list-item-content">
          <p className="item-title">{item.title}</p>
          <p className="item-meta">{item.canonical} · {item.primaryKeyword}</p>
          <p className="micro-copy">SHA-256 {item.contentHash.slice(0, 16)}…</p>
        </div>
        <StatusPill tone={item.publishReady ? "green" : item.review?.status === "changes_requested" ? "red" : "amber"}>{item.review?.status ?? "in_review"}</StatusPill>
      </div>
      <p className="body-copy">{item.description}</p>
      <div className="button-row">
        <label><input type="checkbox" checked={factsChecked} onChange={(event) => setFactsChecked(event.target.checked)} /> {isChinese ? "事实已核对" : "Facts checked"}</label>
        <label><input type="checkbox" checked={duplicationChecked} onChange={(event) => setDuplicationChecked(event.target.checked)} /> {isChinese ? "重复度已核对" : "Duplication checked"}</label>
        <label><input type="checkbox" checked={evidenceChecked} onChange={(event) => setEvidenceChecked(event.target.checked)} /> {isChinese ? "素材证据已核对" : "Evidence checked"}</label>
      </div>
      <textarea className="field-control" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={isChinese ? "审核说明或修改要求" : "Review notes or requested changes"} />
      <div className="button-row">
        <button type="button" className="button button-primary" disabled={loading || !allChecked} onClick={() => void onSubmit({ ...decision, status: "approved" })}>{isChinese ? "批准当前版本" : "Approve current version"}</button>
        <button type="button" className="button button-secondary" disabled={loading || !notes.trim()} onClick={() => void onSubmit({ ...decision, status: "changes_requested" })}>{isChinese ? "退回修改" : "Request changes"}</button>
      </div>
      {item.review ? <p className="item-meta">{item.review.reviewedBy} · {new Date(item.review.createdAt).toLocaleString()} {item.review.notes ? `· ${item.review.notes}` : ""}</p> : null}
    </div>
  );
}

function MetricList({ title, items, dimension, empty }: { title: string; items: Metric[]; dimension: "query" | "page"; empty: string }) {
  return (
    <section className="surface-panel stack-lg">
      <h2 className="card-title">{title}</h2>
      {items.length === 0 ? <div className="empty-state">{empty}</div> : (
        <div className="list-grid">
          {items.map((item, index) => (
            <div className="list-item" key={`${dimension}-${item[dimension] ?? index}`}>
              <div className="list-item-content">
                <p className="item-title">{item[dimension] || "(not set)"}</p>
                <p className="item-meta">{number(item.clicks)} clicks · {number(item.impressions)} impressions · {number(item.ctr * 100, 2)}% CTR · {number(item.position, 2)} position</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
