"use client";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api";
import { useAppLocale } from "./AppLocaleProvider";

const storageKey = "score_admin_api_key";

type ActivationCodeItem = {
  id: string;
  code: string;
  status: string;
  entitlementDays: number;
  createdAt: string;
  batchId: string | null;
  note: string | null;
  expiresAt: string | null;
  redeemedAt: string | null;
  redeemedByUserId: string | null;
};

type ListPayload = { adminEnabled: boolean; codes: ActivationCodeItem[] };
type GeneratePayload = { batchId: string; codes: ActivationCodeItem[] };

export function AdminActivationCodesManager() {
  const { locale } = useAppLocale();
  const [adminKey, setAdminKey] = useState("");
  const [quantity, setQuantity] = useState(10);
  const [entitlementDays, setEntitlementDays] = useState(365);
  const [prefix, setPrefix] = useState("CN");
  const [note, setNote] = useState("Mainland China batch");
  const [expiresAt, setExpiresAt] = useState("");
  const [codes, setCodes] = useState<ActivationCodeItem[]>([]);
  const [latestBatch, setLatestBatch] = useState<ActivationCodeItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const copy =
    locale === "zh-CN"
      ? {
          keyLabel: "管理员密钥",
          keyHint: "使用 services/api 中配置的 `ADMIN_API_KEY`。",
          saveKey: "保存密钥",
          loadCodes: "读取最近激活码",
          quantity: "生成数量",
          days: "有效天数",
          prefix: "前缀",
          note: "批次备注",
          expiresAt: "过期时间（可选）",
          generate: "生成激活码",
          generating: "生成中...",
          recent: "最近激活码",
          latestBatch: "本次生成结果",
          copyBatch: "复制本批激活码",
          empty: "暂无数据，请先输入管理员密钥并读取或生成激活码。",
          invalidKey: "请先输入管理员密钥。",
          saved: "管理员密钥已保存到当前浏览器。",
          loaded: "已加载最近激活码。",
          generated: (count: number) => `已生成 ${count} 个激活码。`,
          copied: "本批激活码已复制。",
          status: "状态",
          createdAt: "创建时间",
          expires: "过期时间",
          noteColumn: "备注",
          batch: "批次",
          daysColumn: "天数",
        }
      : {
          keyLabel: "Admin API key",
          keyHint: "Use the `ADMIN_API_KEY` configured in services/api.",
          saveKey: "Save key",
          loadCodes: "Load recent codes",
          quantity: "Quantity",
          days: "Entitlement days",
          prefix: "Prefix",
          note: "Batch note",
          expiresAt: "Expires at (optional)",
          generate: "Generate codes",
          generating: "Generating...",
          recent: "Recent activation codes",
          latestBatch: "Latest generated batch",
          copyBatch: "Copy latest batch",
          empty: "No data yet. Enter the admin API key, then load or generate activation codes.",
          invalidKey: "Enter the admin API key first.",
          saved: "Admin API key saved in this browser.",
          loaded: "Recent activation codes loaded.",
          generated: (count: number) => `Generated ${count} activation codes.`,
          copied: "Latest batch copied.",
          status: "Status",
          createdAt: "Created at",
          expires: "Expires at",
          noteColumn: "Note",
          batch: "Batch",
          daysColumn: "Days",
        };

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      setAdminKey(stored);
    }
  }, []);

  const latestBatchText = useMemo(() => latestBatch.map((item) => item.code).join("\n"), [latestBatch]);

  async function loadCodes() {
    if (!adminKey.trim()) {
      setStatus(copy.invalidKey);
      setStatusKind("error");
      return;
    }

    setLoading(true);
    setStatus(null);
    const result = await apiRequest<ListPayload>("/api/admin/activation-codes?limit=60", {
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

    setCodes(result.data.codes);
    setStatus(copy.loaded);
    setStatusKind("success");
  }

  async function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adminKey.trim()) {
      setStatus(copy.invalidKey);
      setStatusKind("error");
      return;
    }

    setGenerating(true);
    setStatus(null);
    const result = await apiRequest<GeneratePayload>("/api/admin/activation-codes/generate", {
      method: "POST",
      headers: {
        "x-admin-api-key": adminKey.trim(),
      },
      body: JSON.stringify({
        quantity,
        entitlementDays,
        prefix,
        note,
        expiresAt: expiresAt || null,
      }),
    });
    setGenerating(false);

    if (!result.ok) {
      setStatus(result.error);
      setStatusKind("error");
      return;
    }

    setLatestBatch(result.data.codes);
    setCodes((current) => [...result.data.codes, ...current].slice(0, 60));
    setStatus(copy.generated(result.data.codes.length));
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

  async function copyLatestBatch() {
    if (!latestBatchText) {
      return;
    }

    await navigator.clipboard.writeText(latestBatchText);
    setStatus(copy.copied);
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
          <div className="button-row">
            <button type="button" className="button button-secondary" onClick={saveKey}>
              {copy.saveKey}
            </button>
            <button type="button" className="button button-primary" disabled={loading} onClick={() => void loadCodes()}>
              {copy.loadCodes}
            </button>
          </div>
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <form onSubmit={handleGenerate} className="form-grid">
          <label className="field-group">
            <span className="field-label">{copy.quantity}</span>
            <input className="field-control" type="number" min={1} max={200} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
          </label>
          <label className="field-group">
            <span className="field-label">{copy.days}</span>
            <input className="field-control" type="number" min={1} max={3650} value={entitlementDays} onChange={(event) => setEntitlementDays(Number(event.target.value))} />
          </label>
          <label className="field-group">
            <span className="field-label">{copy.prefix}</span>
            <input className="field-control" value={prefix} onChange={(event) => setPrefix(event.target.value)} maxLength={8} />
          </label>
          <label className="field-group">
            <span className="field-label">{copy.note}</span>
            <input className="field-control" value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <label className="field-group">
            <span className="field-label">{copy.expiresAt}</span>
            <input className="field-control" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
          </label>
          <div className="button-row">
            <button type="submit" className="button button-primary" disabled={generating}>
              {generating ? copy.generating : copy.generate}
            </button>
          </div>
        </form>
        {status && statusKind ? <p className={`form-status ${statusKind}`}>{status}</p> : null}
      </section>

      <section className="surface-panel stack-lg">
        <div className="button-row" style={{ justifyContent: "space-between" }}>
          <h2 className="card-title">{copy.latestBatch}</h2>
          <button type="button" className="button button-secondary" disabled={!latestBatchText} onClick={() => void copyLatestBatch()}>
            {copy.copyBatch}
          </button>
        </div>
        {latestBatch.length > 0 ? <pre className="preview-block">{latestBatchText}</pre> : <div className="empty-state">{copy.empty}</div>}
      </section>

      <section className="surface-panel stack-lg">
        <h2 className="card-title">{copy.recent}</h2>
        {codes.length === 0 ? (
          <div className="empty-state">{copy.empty}</div>
        ) : (
          <div className="list-grid">
            {codes.map((item) => (
              <div key={item.id} className="list-item" style={{ alignItems: "flex-start" }}>
                <div className="list-item-content">
                  <p className="item-title">{item.code}</p>
                  <p className="item-meta">
                    {copy.status}: {translateStatus(item.status, locale)} | {copy.daysColumn}: {item.entitlementDays}
                  </p>
                  <p className="item-meta">
                    {copy.createdAt}: {formatLocal(item.createdAt, locale)} | {copy.batch}: {item.batchId ?? "-"}
                  </p>
                  <p className="item-meta">
                    {copy.expires}: {item.expiresAt ? formatLocal(item.expiresAt, locale) : "-"} | {copy.noteColumn}: {item.note ?? "-"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function translateStatus(status: string, locale: string) {
  if (locale !== "zh-CN") {
    return status;
  }

  switch (status) {
    case "available":
      return "可用";
    case "redeemed":
      return "已兑换";
    case "disabled":
      return "已停用";
    default:
      return status;
  }
}

function formatLocal(value: string, locale: string) {
  return new Date(value).toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US");
}

