"use client";

import { useAdminMessages } from "../lib/admin-messages/client";


import { useMemo, useState } from "react";
import { apiRequest } from "../lib/api";
import { useAppLocale } from "./AppLocaleProvider";
import { shopDeliveryText, shopError, shopPlanNames } from "../lib/shop-activation";

type ActivationCodeItem = {
  planCode: string | null;
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
  const { adminText, adminStatus, adminPlanName } = useAdminMessages();
  function translateStatus(status: string, locale: string) {
    if (locale === "en" || locale === "es") return adminStatus(locale, status);
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
      case "expired":
        return "已过兑换期限";
      default:
        return status;
    }
  }
  

  const [adminKey, setAdminKey] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [planCode, setPlanCode] = useState("credits-50");
  const [channel, setChannel] = useState("淘宝");
  const [shop, setShop] = useState("");
  const [order, setOrder] = useState("");
  const [search, setSearch] = useState("");
  const [delivery, setDelivery] = useState("");
  const [disabling, setDisabling] = useState(false);
  const [prefix, setPrefix] = useState("CN");
  const [note, setNote] = useState("");
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
          keyLabel: "管理密码",
          keyHint: "输入站主管理密码；仅保留在当前页面，刷新后需重新输入。请勿发给买家。",
          loadCodes: "读取最近激活码",
          quantity: "生成数量",
          days: "有效天数",
          prefix: "前缀",
          note: "批次备注",
          expiresAt: "兑换截止时间（可选，按当前设备时区）",
          generate: "生成激活码",
          generating: "生成中...",
          recent: "最近激活码",
          latestBatch: "本次生成结果",
          copyBatch: "复制本批激活码",
          empty: "暂无数据，请先输入管理员密钥并读取或生成激活码。",
          invalidKey: "请先输入管理密码。",
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
          keyLabel: adminText(locale, "Admin API key"),
          keyHint: adminText(locale, "Use the `ADMIN_API_KEY` configured in services/api. The key stays only in this page's memory."),
          loadCodes: adminText(locale, "Load recent codes"),
          quantity: adminText(locale, "Quantity"),
          days: adminText(locale, "Entitlement days"),
          prefix: adminText(locale, "Prefix"),
          note: adminText(locale, "Batch note"),
          expiresAt: adminText(locale, "Expires at (optional)"),
          generate: adminText(locale, "Generate codes"),
          generating: adminText(locale, "Generating..."),
          recent: adminText(locale, "Recent activation codes"),
          latestBatch: adminText(locale, "Latest generated batch"),
          copyBatch: adminText(locale, "Copy latest batch"),
          empty: adminText(locale, "No data yet. Enter the admin API key, then load or generate activation codes."),
          invalidKey: adminText(locale, "Enter the admin API key first."),
          loaded: adminText(locale, "Recent activation codes loaded."),
          generated: (count: number) => adminText(locale, "Codes generated: {count}.", { count }),
          copied: adminText(locale, "Latest batch copied."),
          status: adminText(locale, "Status"),
          createdAt: adminText(locale, "Created at"),
          expires: adminText(locale, "Expires at"),
          noteColumn: adminText(locale, "Note"),
          batch: adminText(locale, "Batch"),
          daysColumn: adminText(locale, "Days"),
        };

  const latestBatchText = useMemo(() => latestBatch.map((item) => item.code).join("\n"), [latestBatch]);

  async function loadCodes() {
    if (!adminKey.trim()) {
      setStatus(copy.invalidKey);
      setStatusKind("error");
      return;
    }

    setLoading(true);
    setStatus(null);
    const result = await apiRequest<ListPayload>(`/api/admin/activation-codes?${new URLSearchParams({ limit: "200", search })}`, {
      headers: {
        "x-admin-api-key": adminKey.trim(),
      },
    });
    setLoading(false);

    if (!result.ok) {
      setStatus(locale === "zh-CN" ? shopError(result.error, result.status) : result.error);
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
        planCode,
        prefix,
        note: [channel, shop.trim() && `店铺：${shop.trim()}`, order.trim() && `订单：${order.trim()}`, note.trim()].filter(Boolean).join(" | "),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      }),
    });
    setGenerating(false);

    if (!result.ok) {
      setStatus(locale === "zh-CN" ? shopError(result.error, result.status) : result.error);
      setStatusKind("error");
      return;
    }

    setLatestBatch(result.data.codes);
    setCodes((current) => [...result.data.codes, ...current].slice(0, 200));
    setDelivery("");
    setStatus(copy.generated(result.data.codes.length));
    setStatusKind("success");
  }

  async function copyLatestBatch() {
    if (!latestBatchText) {
      return;
    }

    await copyText(latestBatchText);
  }

  async function copyText(value: string) {
    try { await navigator.clipboard.writeText(value); setStatus(copy.copied); setStatusKind("success"); }
    catch { setStatus(locale === "zh-CN" ? "浏览器不允许自动复制，请在下方文本框中选中并复制。" : adminText(locale, "Select and copy the text below.")); setStatusKind("error"); }
  }
  async function copyDelivery(item: ActivationCodeItem) {
    const value = shopDeliveryText(item, window.location.origin);
    setDelivery(value); await copyText(value);
  }
  async function disable(item: ActivationCodeItem) {
    if (!window.confirm(locale === "zh-CN" ? `停用 ${item.code}？停用后买家将无法兑换。` : adminText(locale, "Disable {code}?", { code: item.code }))) return;
    setDisabling(true);
    const result = await apiRequest(`/api/admin/activation-codes/${encodeURIComponent(item.id)}/disable`, { method: "POST", headers: { "x-admin-api-key": adminKey.trim() } });
    setDisabling(false);
    if (!result.ok) { setStatus(locale === "zh-CN" ? shopError(result.error, result.status) : result.error); setStatusKind("error"); return; }
    setLatestBatch(items => items.map(code => code.id === item.id ? { ...code, status: "disabled" } : code));
    await loadCodes();
  }
  function downloadBatch() {
    const csv = (value: unknown) => `"${String(value ?? "").replace(/^[=+@-]/, "'$&").replace(/"/g, '""')}"`;
    const rows = [["激活码", "套餐", "状态", "店铺 / 订单备注", "兑换截止时间"], ...latestBatch.map(item => [item.code, item.planCode ? shopPlanNames[item.planCode] : `${item.entitlementDays} 天`, item.status, item.note, item.expiresAt])];
    const url = URL.createObjectURL(new Blob(["\ufeff" + rows.map(row => row.map(csv).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `activation-${latestBatch[0]?.batchId ?? "batch"}.csv`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="page-stack">
      <section className="surface-panel stack-lg">
        <h2 className="card-title">{locale === "zh-CN" ? "1 输入管理密码" : adminText(locale, "1 Admin access")}</h2>
        <div className="form-grid">
          <label className="field-group">
            <span className="field-label">{copy.keyLabel}</span>
            <input className="field-control" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} type="password" />
            <span className="micro-copy">{copy.keyHint}</span>
          </label>
          <div className="button-row">
            <button type="button" className="button button-primary" disabled={loading} onClick={() => void loadCodes()}>
              {copy.loadCodes}
            </button>
          </div>
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <h2 className="card-title">{locale === "zh-CN" ? "2 按店铺订单生成激活码" : adminText(locale, "2 Generate order codes")}</h2>
        <p className="micro-copy">{locale === "zh-CN" ? "套餐与网站一致，月度按 1 个日历月、年度按 12 个日历月计时。首次兑换开始计时，同档激活码续期顺延，不自动扣款。已兑换码不能在这里停用。" : adminText(locale, "Plans match the website. Access lasts 1 or 12 calendar months from redemption; same-tier codes extend access. No automatic charge.")}</p>
        <form onSubmit={handleGenerate} className="form-grid">
          <label className="field-group">
            <span className="field-label">{copy.quantity}</span>
            <input className="field-control" type="number" min={1} max={200} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
          </label>
          <label className="field-group">
            <span className="field-label">{locale === "zh-CN" ? "店铺 SKU / 网站套餐" : adminText(locale, "Website plan")}</span>
            <select className="field-control" value={planCode} onChange={event => setPlanCode(event.target.value)}>{Object.entries(shopPlanNames).map(([value, label]) => <option key={value} value={value}>{locale === "zh-CN" ? label : value.startsWith("credits-") || value === "single-score" ? label : adminPlanName(locale, value)}</option>)}</select>
            <span className="micro-copy">{locale === "zh-CN" ? "店铺现售三档：单谱10积分、一次性50积分、一次性200积分。旧月卡/年卡保留供历史订单；积分包不要选择月卡。" : "Shop packs: one score / 10 credits, prepaid 50, prepaid 200. Legacy term plans remain available."}</span>
          </label>
          <label className="field-group"><span className="field-label">{locale === "zh-CN" ? "销售平台" : adminText(locale, "Sales channel")}</span><select className="field-control" value={channel} onChange={event => setChannel(event.target.value)}>{["淘宝", "小红书", "其他"].map(value => <option key={value} value={value}>{locale === "zh-CN" ? value : adminText(locale, value === "淘宝" ? "Taobao" : value === "小红书" ? "Xiaohongshu" : "Other")}</option>)}</select></label>
          <label className="field-group"><span className="field-label">{locale === "zh-CN" ? "店铺名称（可选）" : adminText(locale, "Shop (optional)")}</span><input className="field-control" value={shop} maxLength={60} onChange={event => setShop(event.target.value)} /></label>
          <label className="field-group"><span className="field-label">{locale === "zh-CN" ? "订单号（单笔发货时填写）" : adminText(locale, "Order reference")}</span><input className="field-control" value={order} maxLength={100} onChange={event => setOrder(event.target.value)} /></label>
          <label className="field-group">
            <span className="field-label">{copy.prefix}</span>
            <input className="field-control" value={prefix} onChange={(event) => setPrefix(event.target.value)} maxLength={8} />
          </label>
          <label className="field-group">
            <span className="field-label">{copy.note}</span>
            <input className="field-control" value={note} maxLength={250} onChange={(event) => setNote(event.target.value)} />
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
        {status && statusKind ? <p role={statusKind === "error" ? "alert" : "status"} className={`form-status ${statusKind}`}>{status}</p> : null}
      </section>

      <section className="surface-panel stack-lg">
        <div className="button-row" style={{ justifyContent: "space-between" }}>
          <h2 className="card-title">{copy.latestBatch}</h2>
          <button type="button" className="button button-secondary" disabled={!latestBatchText} onClick={() => void copyLatestBatch()}>
            {copy.copyBatch}
          </button>
          <button type="button" className="button button-secondary" disabled={!latestBatch.length} onClick={downloadBatch}>{locale === "zh-CN" ? "下载本批 CSV" : adminText(locale, "Download CSV")}</button>
        </div>
        {latestBatch.length > 0 ? <pre className="preview-block">{latestBatchText}</pre> : <div className="empty-state">{copy.empty}</div>}
        {delivery ? <label className="field-group"><span className="field-label">{locale === "zh-CN" ? "可直接发给买家的文案" : adminText(locale, "Delivery text")}</span><textarea className="field-control" rows={9} readOnly value={delivery} onFocus={event => event.currentTarget.select()} /></label> : null}
      </section>

      <section className="surface-panel stack-lg">
        <h2 className="card-title">{copy.recent}</h2>
        <label className="field-group"><span className="field-label">{locale === "zh-CN" ? "搜索激活码、店铺、订单号或批次（最多显示 200 条）" : adminText(locale, "Search code, shop, order or batch (up to 200)")}</span><input className="field-control" value={search} maxLength={200} onChange={event => setSearch(event.target.value)} /></label>
        <button type="button" className="button button-secondary" disabled={loading} onClick={() => void loadCodes()}>{locale === "zh-CN" ? "查询 / 刷新状态" : adminText(locale, "Search / refresh")}</button>
        {codes.length === 0 ? (
          <div className="empty-state">{copy.empty}</div>
        ) : (
          <div className="list-grid">
            {codes.map((item) => (
              <div key={item.id} className="list-item" style={{ alignItems: "flex-start" }}>
                <div className="list-item-content">
                  <p className="item-title">{item.code}</p>
                  <p className="item-meta">
                    {copy.status}: {translateStatus(item.status === "available" && item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now() ? "expired" : item.status, locale)} | {item.planCode ? (locale === "zh-CN" || item.planCode.startsWith("credits-") || item.planCode === "single-score" ? shopPlanNames[item.planCode] : adminPlanName(locale, item.planCode)) : `${item.entitlementDays} ${copy.daysColumn}`}
                  </p>
                  {item.redeemedAt ? <p className="item-meta">{locale === "zh-CN" ? "兑换时间" : adminText(locale, "Redeemed")}：{formatLocal(item.redeemedAt, locale)}</p> : null}
                  {item.status === "available" ? <div className="button-row">
                    <button className="button button-secondary" disabled={Boolean(item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now())} onClick={() => void copyDelivery(item)}>{locale === "zh-CN" ? "复制发货文案" : adminText(locale, "Copy delivery text")}</button>
                    <button className="button button-tertiary" disabled={disabling} onClick={() => void disable(item)}>{locale === "zh-CN" ? "停用未使用码" : adminText(locale, "Disable unused code")}</button>
                  </div> : null}
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

function formatLocal(value: string, locale: string) {
  return new Date(value).toLocaleString(locale);
}

