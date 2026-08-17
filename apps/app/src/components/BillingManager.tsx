"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { useAppLocale } from "./AppLocaleProvider";

type Subscription = {
  id: string;
  provider: "stripe" | "paddle";
  status: string;
  planRef: string | null;
  seatQuantity: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: number;
  organizationId: string | null;
  lastPaymentFailedAt: string | null;
};

type Invoice = {
  id: string;
  provider: "stripe" | "paddle";
  providerInvoiceId: string;
  status: string;
  amountDueMinor: number | null;
  amountPaidMinor: number | null;
  amountRefundedMinor: number;
  currency: string | null;
  hostedUrl: string | null;
  dueAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
};

type Seat = {
  id: string;
  subscriptionId: string;
  assignedEmail: string;
  status: string;
  assignedAt: string;
};

type BillingPayload = { subscriptions: Subscription[]; invoices: Invoice[]; seatAssignments: Seat[] };
type QuotaUsage = {
  tier: "legacy" | "pro" | "education";
  periodStart: string;
  periodEnd: string;
  jobs: { used: number; limit: number; remaining: number };
  storage: { usedBytes: number; limitBytes: number; remainingBytes: number };
};

export function BillingManager() {
  const { locale } = useAppLocale();
  const isChinese = locale === "zh-CN";
  const [billing, setBilling] = useState<BillingPayload>({ subscriptions: [], invoices: [], seatAssignments: [] });
  const [quota, setQuota] = useState<QuotaUsage | null>(null);
  const [seatDrafts, setSeatDrafts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const token = useMemo(() => getStoredToken(), []);

  const refresh = useCallback(async () => {
    if (!token) {
      setStatus(isChinese ? "请先登录后查看账单。" : "Sign in to view billing.");
      return;
    }
    const [result, quotaResult] = await Promise.all([
      apiRequest<BillingPayload>("/api/payments/billing", { headers: { Authorization: `Bearer ${token}` } }),
      apiRequest<{ usage: QuotaUsage }>("/api/payments/billing/usage", { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setBilling(result.data);
    if (quotaResult.ok) setQuota(quotaResult.data.usage);
    setStatus(null);
  }, [isChinese, token]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function openPortal() {
    if (!token) return;
    setBusy("portal");
    const result = await apiRequest<{ url: string }>("/api/payments/billing/portal", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ provider: "stripe" }),
    });
    setBusy(null);
    if (!result.ok) return setStatus(result.error);
    window.location.href = result.data.url;
  }

  async function assignSeat(subscriptionId: string) {
    const email = seatDrafts[subscriptionId]?.trim();
    if (!token || !email) return;
    setBusy(`seat-${subscriptionId}`);
    const result = await apiRequest<{ assigned: boolean }>(`/api/payments/billing/subscriptions/${subscriptionId}/seats`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email }),
    });
    setBusy(null);
    if (!result.ok) return setStatus(result.error);
    setSeatDrafts((current) => ({ ...current, [subscriptionId]: "" }));
    await refresh();
  }

  async function revokeSeat(subscriptionId: string, email: string) {
    if (!token) return;
    setBusy(`revoke-${email}`);
    const result = await apiRequest<unknown>(`/api/payments/billing/subscriptions/${subscriptionId}/seats/${encodeURIComponent(email)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setBusy(null);
    if (!result.ok) return setStatus(result.error);
    await refresh();
  }

  async function cancelSubscription(subscriptionId: string) {
    if (!token) return;
    setBusy(`cancel-${subscriptionId}`);
    const result = await apiRequest<{ subscriptionId: string; cancelAtPeriodEnd: boolean }>(`/api/payments/billing/subscriptions/${subscriptionId}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ atPeriodEnd: true }),
    });
    setBusy(null);
    if (!result.ok) return setStatus(result.error);
    setStatus(isChinese ? "订阅将在当前计费周期结束时取消。" : "The subscription will cancel at the end of the current billing period.");
    await refresh();
  }

  return (
    <div className="page-stack">
      <section className="surface-panel stack-lg">
        <div className="stack-xs">
          <p className="eyebrow">{isChinese ? "本月用量" : "Current usage"}</p>
          <h2 className="card-title">{quota ? `${quota.tier.toUpperCase()} ${isChinese ? "套餐配额" : "plan quotas"}` : isChinese ? "正在读取套餐配额" : "Loading plan quotas"}</h2>
        </div>
        {quota ? (
          <div className="metric-grid">
            <QuotaMeter label={isChinese ? "处理任务" : "Processing jobs"} used={quota.jobs.used} limit={quota.jobs.limit} value={`${quota.jobs.used} / ${quota.jobs.limit}`} />
            <QuotaMeter label={isChinese ? "文件存储" : "File storage"} used={quota.storage.usedBytes} limit={quota.storage.limitBytes} value={`${formatBytes(quota.storage.usedBytes)} / ${formatBytes(quota.storage.limitBytes)}`} />
          </div>
        ) : null}
      </section>

      <section className="surface-panel stack-lg">
        <div className="section-heading-row">
          <div className="stack-xs">
            <p className="eyebrow">{isChinese ? "订阅" : "Subscriptions"}</p>
            <h2 className="card-title">{isChinese ? "访问权限与续费状态" : "Access and renewal status"}</h2>
          </div>
          <button type="button" className="button button-secondary" disabled={busy === "portal"} onClick={() => void openPortal()}>
            {isChinese ? "管理 Stripe 付款方式" : "Manage Stripe payment method"}
          </button>
        </div>
        {billing.subscriptions.length === 0 ? <div className="empty-state">{isChinese ? "当前账户还没有订阅。" : "No subscriptions are linked to this account."}</div> : billing.subscriptions.map((subscription) => {
          const seats = billing.seatAssignments.filter((seat) => seat.subscriptionId === subscription.id && seat.status === "active");
          return (
            <div className="list-item" key={subscription.id}>
              <div className="stack-sm" style={{ width: "100%" }}>
                <div className="section-heading-row">
                  <div>
                    <p className="item-title">{subscription.provider.toUpperCase()} <span className={`status-chip ${subscription.status === "active" || subscription.status === "trialing" ? "tone-green" : "tone-amber"}`}>{subscription.status}</span></p>
                    <p className="item-meta">{subscription.currentPeriodEnd ? `${isChinese ? "当前周期至" : "Current period ends"} ${formatDate(subscription.currentPeriodEnd, locale)}` : isChinese ? "无固定周期结束时间" : "No fixed period end"}</p>
                    {subscription.lastPaymentFailedAt ? <p className="form-status error">{isChinese ? "最近一次续费失败，请更新付款方式。" : "The latest renewal failed. Update the payment method."}</p> : null}
                    {subscription.cancelAtPeriodEnd ? <p className="form-status">{isChinese ? "已安排在当前周期结束时取消。" : "Cancellation is scheduled for the end of this period."}</p> : null}
                  </div>
                  <div className="button-row">
                    <span className="status-chip tone-cyan">{subscription.seatQuantity} {isChinese ? "席位" : "seats"}</span>
                    {!subscription.cancelAtPeriodEnd && ["active", "trialing", "past_due", "paused", "unpaid"].includes(subscription.status) ? (
                      <button type="button" className="button button-tertiary" disabled={busy === `cancel-${subscription.id}`} onClick={() => void cancelSubscription(subscription.id)}>
                        {busy === `cancel-${subscription.id}` ? (isChinese ? "正在取消..." : "Canceling...") : (isChinese ? "周期结束时取消" : "Cancel at period end")}
                      </button>
                    ) : null}
                  </div>
                </div>
                {subscription.organizationId ? (
                  <div className="stack-sm">
                    <div className="button-row">
                      <input className="field-control compact-control" type="email" placeholder={isChinese ? "成员邮箱" : "Member email"} value={seatDrafts[subscription.id] ?? ""} onChange={(event) => setSeatDrafts((current) => ({ ...current, [subscription.id]: event.target.value }))} />
                      <button type="button" className="button button-secondary" disabled={busy === `seat-${subscription.id}` || !seatDrafts[subscription.id]?.trim()} onClick={() => void assignSeat(subscription.id)}>{isChinese ? "分配席位" : "Assign seat"}</button>
                    </div>
                    {seats.map((seat) => <div className="inline-meta" key={seat.id}><span>{seat.assignedEmail}</span><button type="button" className="button button-ghost button-tertiary" disabled={busy === `revoke-${seat.assignedEmail}`} onClick={() => void revokeSeat(subscription.id, seat.assignedEmail)}>{isChinese ? "撤销" : "Revoke"}</button></div>)}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </section>

      <section className="surface-panel stack-lg">
        <div className="stack-xs"><p className="eyebrow">{isChinese ? "账单" : "Invoices"}</p><h2 className="card-title">{isChinese ? "付款、退款与失败记录" : "Payments, refunds, and failures"}</h2></div>
        {billing.invoices.length === 0 ? <div className="empty-state">{isChinese ? "暂无账单记录。" : "No invoices yet."}</div> : billing.invoices.map((invoice) => (
          <div className="list-item" key={invoice.id}>
            <div><p className="item-title">{invoice.providerInvoiceId} <span className={`status-chip ${invoice.status === "paid" ? "tone-green" : invoice.status === "refunded" ? "tone-cyan" : "tone-amber"}`}>{invoice.status}</span></p><p className="item-meta">{formatMoney(invoice.amountPaidMinor ?? invoice.amountDueMinor, invoice.currency, locale)}{invoice.amountRefundedMinor > 0 ? ` · ${isChinese ? "已退款" : "refunded"} ${formatMoney(invoice.amountRefundedMinor, invoice.currency, locale)}` : ""}</p></div>
            {invoice.hostedUrl ? <a className="button button-secondary button-ghost" href={invoice.hostedUrl} target="_blank" rel="noreferrer">{isChinese ? "查看账单" : "View invoice"}</a> : null}
          </div>
        ))}
      </section>
      {status ? <p className="form-status error">{status}</p> : null}
    </div>
  );
}

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US");
}

function formatMoney(value: number | null, currency: string | null, locale: string) {
  if (value === null || !currency) return locale === "zh-CN" ? "金额待确认" : "Amount pending";
  try {
    return new Intl.NumberFormat(locale === "zh-CN" ? "zh-CN" : "en-US", { style: "currency", currency: currency.toUpperCase() }).format(value / 100);
  } catch {
    return `${currency.toUpperCase()} ${(value / 100).toFixed(2)}`;
  }
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(1)} GB`;
}

function QuotaMeter({ label, used, limit, value }: { label: string; used: number; limit: number; value: string }) {
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="metric-card stack-sm">
      <div className="section-heading-row"><span className="field-label">{label}</span><strong>{value}</strong></div>
      <div className="quota-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={limit} aria-valuenow={Math.min(used, limit)}>
        <span className="quota-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
