"use client";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api";
import { PUBLIC_SITE_URL } from "../lib/support";
import { useAppLocale } from "./AppLocaleProvider";

const storageKey = "score_admin_api_key";
const statusOptions = ["all", "open", "in_review", "resolved", "closed"] as const;

type StatusFilter = (typeof statusOptions)[number];

type SupportRequestItem = {
  id: string;
  referenceCode: string;
  category: string;
  locale: string;
  contactName: string | null;
  contactEmail: string;
  accountEmail: string | null;
  subject: string;
  message: string;
  orderReference: string | null;
  jobReference: string | null;
  sourcePage: string | null;
  sourceContext: string | null;
  status: "open" | "in_review" | "resolved" | "closed";
  createdAt: string;
  updatedAt: string;
};

type ListPayload = {
  items: SupportRequestItem[];
  statuses: Array<SupportRequestItem["status"]>;
};

type UpdatePayload = {
  ok: true;
  item: SupportRequestItem;
};

export function AdminSupportRequestsManager() {
  const { locale } = useAppLocale();
  const publicSupportUrl = `${PUBLIC_SITE_URL.replace(/\/$/, "")}/support`;
  const [adminKey, setAdminKey] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [items, setItems] = useState<SupportRequestItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const copy =
    locale === "zh-CN"
      ? {
          keyLabel: "管理员密钥",
          keyHint: "继续使用 services/api 中配置的 `ADMIN_API_KEY`。",
          saveKey: "保存密钥",
          load: "读取工单",
          filterLabel: "状态筛选",
          empty: "暂无工单。你可以先到官网提交一条 Support 请求再回来查看。",
          invalidKey: "请先输入管理员密钥。",
          saved: "管理员密钥已保存到当前浏览器。",
          loaded: (count: number) => `已加载 ${count} 条支持工单。`,
          updated: "工单状态已更新。",
          requestsTitle: "支持工单列表",
          openSupportPage: "打开官网 Support 页",
          contactName: "联系人",
          contactEmail: "联系邮箱",
          accountEmail: "账号邮箱",
          orderReference: "订单参考",
          jobReference: "任务参考",
          source: "来源",
          subject: "主题",
          message: "问题描述",
          createdAt: "提交时间",
          updatedAt: "更新时间",
          locale: "语言",
          category: "分类",
          statusLabel: "状态",
        }
      : {
          keyLabel: "Admin API key",
          keyHint: "Reuse the `ADMIN_API_KEY` configured in services/api.",
          saveKey: "Save key",
          load: "Load requests",
          filterLabel: "Status filter",
          empty: "No support requests yet. Submit one on the public support page first if you want to test the flow.",
          invalidKey: "Enter the admin API key first.",
          saved: "Admin API key saved in this browser.",
          loaded: (count: number) => `Loaded ${count} support request(s).`,
          updated: "Support request status updated.",
          requestsTitle: "Support request list",
          openSupportPage: "Open public support page",
          contactName: "Contact name",
          contactEmail: "Contact email",
          accountEmail: "Account email",
          orderReference: "Order reference",
          jobReference: "Job reference",
          source: "Source",
          subject: "Subject",
          message: "Message",
          createdAt: "Created",
          updatedAt: "Updated",
          locale: "Locale",
          category: "Category",
          statusLabel: "Status",
        };

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      setAdminKey(stored);
    }
  }, []);

  const querySuffix = useMemo(() => {
    const params = new URLSearchParams({ limit: "80" });
    if (filter !== "all") {
      params.set("status", filter);
    }
    return params.toString();
  }, [filter]);

  async function loadRequests(nextFilter = filter) {
    if (!adminKey.trim()) {
      setStatus(copy.invalidKey);
      setStatusKind("error");
      return;
    }

    const params = new URLSearchParams({ limit: "80" });
    if (nextFilter !== "all") {
      params.set("status", nextFilter);
    }

    setLoading(true);
    setStatus(null);

    const result = await apiRequest<ListPayload>(`/api/admin/support-requests?${params.toString()}`, {
      headers: {
        "x-admin-api-key": adminKey.trim(),
      },
    });

    setLoading(false);

    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }

    setItems(result.data.items);
    setStatus(copy.loaded(result.data.items.length));
    setStatusKind("success");
  }

  function saveKey() {
    if (!adminKey.trim()) {
      setStatus(copy.invalidKey);
      setStatusKind("error");
      return;
    }

    window.localStorage.setItem(storageKey, adminKey.trim());
    setStatus(copy.saved);
    setStatusKind("success");
  }

  async function updateRequestStatus(id: string, nextStatus: SupportRequestItem["status"]) {
    if (!adminKey.trim()) {
      setStatus(copy.invalidKey);
      setStatusKind("error");
      return;
    }

    setUpdatingId(id);
    setStatus(null);

    const result = await apiRequest<UpdatePayload>(`/api/admin/support-requests/${id}`, {
      method: "PATCH",
      headers: {
        "x-admin-api-key": adminKey.trim(),
      },
      body: JSON.stringify({
        status: nextStatus,
      }),
    });

    setUpdatingId(null);

    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }

    setItems((current) => current.map((item) => (item.id === id ? result.data.item : item)));
    setStatus(copy.updated);
    setStatusKind("success");
  }

  return (
    <div className="page-stack">
      <section className="surface-panel stack-lg">
        <div className="form-grid">
          <label className="field-group">
            <span className="field-label">{copy.keyLabel}</span>
            <input className="field-control" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} type="password" />
            <span className="micro-copy">{copy.keyHint}</span>
          </label>
          <label className="field-group">
            <span className="field-label">{copy.filterLabel}</span>
            <select
              className="field-select"
              value={filter}
              onChange={(event) => {
                const next = event.target.value as StatusFilter;
                setFilter(next);
              }}
            >
              {statusOptions.map((item) => (
                <option key={item} value={item}>
                  {translateSupportStatus(item, locale)}
                </option>
              ))}
            </select>
          </label>
          <div className="button-row">
            <button type="button" className="button button-secondary" onClick={saveKey}>
              {copy.saveKey}
            </button>
            <button type="button" className="button button-primary" disabled={loading} onClick={() => void loadRequests()}>
              {copy.load}
            </button>
            <a href={publicSupportUrl} className="button button-tertiary">
              {copy.openSupportPage}
            </a>
          </div>
          <p className="micro-copy">/api/admin/support-requests?{querySuffix}</p>
        </div>
        {status && statusKind ? <p className={`form-status ${statusKind}`}>{status}</p> : null}
      </section>

      <section className="surface-panel stack-lg">
        <h2 className="card-title">{copy.requestsTitle}</h2>
        {items.length === 0 ? (
          <div className="empty-state">{copy.empty}</div>
        ) : (
          <div className="list-grid">
            {items.map((item) => (
              <div key={item.id} className="surface-panel stack-md" style={{ padding: 22 }}>
                <div className="split-actions" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div className="stack-xs">
                    <p className="item-title">{item.referenceCode}</p>
                    <p className="item-meta">
                      {copy.category}: {translateSupportCategory(item.category, locale)} | {copy.locale}: {item.locale}
                    </p>
                    <p className="item-meta">
                      {copy.createdAt}: {formatLocal(item.createdAt, locale)} | {copy.updatedAt}: {formatLocal(item.updatedAt, locale)}
                    </p>
                  </div>
                  <label className="field-group" style={{ minWidth: 180 }}>
                    <span className="field-label">{copy.statusLabel}</span>
                    <select
                      className="field-select"
                      value={item.status}
                      disabled={updatingId === item.id}
                      onChange={(event) => void updateRequestStatus(item.id, event.target.value as SupportRequestItem["status"])}
                    >
                      {statusOptions
                        .filter((option) => option !== "all")
                        .map((option) => (
                          <option key={option} value={option}>
                            {translateSupportStatus(option, locale)}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>

                <div className="info-grid">
                  <div className="mini-card stack-sm">
                    <p className="metric-label">{copy.contactName}</p>
                    <p className="item-title">{item.contactName || "-"}</p>
                    <p className="metric-label">{copy.contactEmail}</p>
                    <p className="item-title">{item.contactEmail}</p>
                  </div>
                  <div className="mini-card stack-sm">
                    <p className="metric-label">{copy.accountEmail}</p>
                    <p className="item-title">{item.accountEmail || "-"}</p>
                    <p className="metric-label">{copy.source}</p>
                    <p className="item-title">{item.sourceContext || item.sourcePage || "-"}</p>
                  </div>
                </div>

                <div className="info-grid">
                  <div className="mini-card stack-sm">
                    <p className="metric-label">{copy.orderReference}</p>
                    <p className="item-title">{item.orderReference || "-"}</p>
                  </div>
                  <div className="mini-card stack-sm">
                    <p className="metric-label">{copy.jobReference}</p>
                    <p className="item-title">{item.jobReference || "-"}</p>
                  </div>
                </div>

                <div className="mini-card stack-sm">
                  <p className="metric-label">{copy.subject}</p>
                  <p className="item-title">{item.subject}</p>
                </div>

                <div className="mini-card stack-sm">
                  <p className="metric-label">{copy.message}</p>
                  <pre className="preview-block">{item.message}</pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function translateSupportCategory(category: string, locale: string) {
  if (locale !== "zh-CN") {
    switch (category) {
      case "payment":
        return "Payment / order";
      case "activation":
        return "Activation / access";
      case "job":
        return "Upload / result";
      case "privacy":
        return "Privacy / deletion";
      default:
        return "General";
    }
  }

  switch (category) {
    case "payment":
      return "支付 / 订单";
    case "activation":
      return "激活 / 权限";
    case "job":
      return "上传 / 结果";
    case "privacy":
      return "隐私 / 删除";
    default:
      return "其他";
  }
}

function translateSupportStatus(status: StatusFilter | SupportRequestItem["status"], locale: string) {
  if (locale !== "zh-CN") {
    switch (status) {
      case "all":
        return "All statuses";
      case "in_review":
        return "In review";
      case "resolved":
        return "Resolved";
      case "closed":
        return "Closed";
      default:
        return "Open";
    }
  }

  switch (status) {
    case "all":
      return "全部状态";
    case "open":
      return "待处理";
    case "in_review":
      return "处理中";
    case "resolved":
      return "已解决";
    case "closed":
      return "已关闭";
    default:
      return status;
  }
}

function formatLocal(value: string, locale: string) {
  return new Date(value).toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US");
}

