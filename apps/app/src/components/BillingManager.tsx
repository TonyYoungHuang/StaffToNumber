"use client";

import { formatMessage, formatNumber, type SupportedLocale } from "@score/i18n";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import {
  formatBillingBytes,
  formatBillingDateTime,
  formatBillingMoney,
  mappedBillingStatus,
  rawApiErrorOrFallback,
} from "../lib/billing-messages/client";
import type {
  BillingInvoiceStatus,
  BillingManagerCopy,
  BillingQuotaTier,
  BillingSubscriptionStatus,
} from "../lib/billing-messages/types";
import { accountActivationRoute } from "../lib/release";

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
type AccessPayload = { user: { entitlement: { status: "inactive" | "active" | "expired" } } };
type QuotaTier = BillingQuotaTier | "legacy" | "pro" | "education";
type QuotaUsage = {
  tier: QuotaTier;
  periodStart: string;
  periodEnd: string;
  jobs: { used: number; limit: number; remaining: number };
  storage: { usedBytes: number; limitBytes: number; remainingBytes: number };
};

type BillingManagerProps = {
  locale: SupportedLocale;
  copy: BillingManagerCopy;
  freePlanCredits: string;
};

type ManagerStatus = { message: string; tone: "success" | "error" };

const cancelableStatuses = new Set(["active", "trialing", "past_due", "paused", "unpaid"]);

export function BillingManager({ locale, copy, freePlanCredits }: BillingManagerProps) {
  const [billing, setBilling] = useState<BillingPayload>({ subscriptions: [], invoices: [], seatAssignments: [] });
  const [quota, setQuota] = useState<QuotaUsage | null>(null);
  const [entitlementStatus, setEntitlementStatus] = useState<"checking" | "inactive" | "active" | "expired">("checking");
  const [seatDrafts, setSeatDrafts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<ManagerStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const token = useMemo(() => getStoredToken(), []);

  const refresh = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    if (!token) {
      setStatus({ message: copy.signIn, tone: "error" });
      setLoading(false);
      return false;
    }

    const [result, quotaResult, accessResult] = await Promise.all([
      apiRequest<BillingPayload>("/api/payments/billing", { headers: { Authorization: `Bearer ${token}` } }),
      apiRequest<{ usage: QuotaUsage }>("/api/payments/billing/usage", { headers: { Authorization: `Bearer ${token}` } }),
      apiRequest<AccessPayload>("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    if (!result.ok) {
      setStatus({ message: rawApiErrorOrFallback(result.error, copy.fallbackError), tone: "error" });
      setLoading(false);
      return false;
    }

    setBilling(result.data);
    setEntitlementStatus(accessResult.ok ? accessResult.data.user.entitlement.status : "inactive");
    setQuota(quotaResult.ok ? quotaResult.data.usage : null);
    setStatus(null);
    setLoading(false);
    return true;
  }, [copy.fallbackError, copy.signIn, token]);

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  async function openPortal() {
    if (!token) return;
    setBusy("portal");
    const result = await apiRequest<{ url: string }>("/api/payments/billing/portal", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ provider: "stripe", locale }),
    });
    setBusy(null);
    if (!result.ok) {
      setStatus({ message: rawApiErrorOrFallback(result.error, copy.fallbackError), tone: "error" });
      return;
    }
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
    if (!result.ok) {
      setStatus({ message: rawApiErrorOrFallback(result.error, copy.fallbackError), tone: "error" });
      return;
    }
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
    if (!result.ok) {
      setStatus({ message: rawApiErrorOrFallback(result.error, copy.fallbackError), tone: "error" });
      return;
    }
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
    if (!result.ok) {
      setStatus({ message: rawApiErrorOrFallback(result.error, copy.fallbackError), tone: "error" });
      return;
    }
    const refreshed = await refresh();
    if (refreshed) setStatus({ message: copy.cancelSuccess, tone: "success" });
  }

  if (loading) {
    return <p className="form-status" role="status">{copy.loading}</p>;
  }

  return (
    <div className="page-stack" lang={locale}>
      {quota ? (
        <section className="surface-panel credit-balance-panel stack-lg">
          <div className="stack-xs">
            <p className="eyebrow">{copy.creditEyebrow}</p>
            <h2 className="card-title">{`${copy.quotaTiers[normalizeQuotaTier(quota.tier)]} · ${copy.availableCredits}`}</h2>
          </div>
          <div className="credit-balance-summary">
            <div className="credit-balance-value">
              <strong>{formatNumber(quota.jobs.remaining, locale)}</strong>
              <span>{copy.creditUnit}</span>
            </div>
            <p>{formatMessage(copy.creditSummaryTemplate, {
              limit: formatNumber(quota.jobs.limit, locale),
              used: formatNumber(quota.jobs.used, locale),
            })}</p>
          </div>
          <div className="metric-grid">
            <QuotaMeter
              label={copy.creditUsage}
              used={quota.jobs.used}
              limit={quota.jobs.limit}
              value={`${formatNumber(quota.jobs.used, locale)} / ${formatNumber(quota.jobs.limit, locale)}`}
            />
            <QuotaMeter
              label={copy.storage}
              used={quota.storage.usedBytes}
              limit={quota.storage.limitBytes}
              value={`${formatBillingBytes(quota.storage.usedBytes, locale)} / ${formatBillingBytes(quota.storage.limitBytes, locale)}`}
            />
          </div>
          <p className="helper-copy">{copy.quotaNote}</p>
        </section>
      ) : null}

      {entitlementStatus !== "active" && entitlementStatus !== "checking" ? (
        <section className="surface-panel stack-lg">
          <div className="stack-sm">
            <p className="eyebrow">{copy.freeEyebrow}</p>
            <h2 className="card-title">{copy.noPaidTitle}</h2>
            <p className="body-copy">{formatMessage(copy.freeBody, { credits: freePlanCredits })}</p>
          </div>
          <div className="button-row">
            <Link href={accountActivationRoute} className="button button-primary">{copy.unlock}</Link>
          </div>
        </section>
      ) : null}

      <section className="surface-panel stack-lg">
        <div className="section-heading-row">
          <div className="stack-xs">
            <p className="eyebrow">{copy.subscriptionsEyebrow}</p>
            <h2 className="card-title">{copy.subscriptionsTitle}</h2>
          </div>
          {billing.subscriptions.some((subscription) => subscription.provider === "stripe") ? (
            <button type="button" className="button button-secondary" disabled={busy === "portal"} onClick={() => void openPortal()}>
              {busy === "portal" ? copy.managingStripe : copy.manageStripe}
            </button>
          ) : null}
        </div>
        {billing.subscriptions.length === 0 ? (
          <div className="empty-state" role="status">{copy.noSubscriptions}</div>
        ) : billing.subscriptions.map((subscription) => {
          const seats = billing.seatAssignments.filter((seat) => seat.subscriptionId === subscription.id && seat.status === "active");
          const cancelBusy = busy === `cancel-${subscription.id}`;
          return (
            <div className="list-item" key={subscription.id}>
              <div className="stack-sm" style={{ width: "100%" }}>
                <div className="section-heading-row">
                  <div>
                    <p className="item-title">
                      {copy.providers[subscription.provider]}{" "}
                      <span className={`status-chip ${subscriptionTone(subscription.status)}`}>
                        {mappedBillingStatus<BillingSubscriptionStatus>(subscription.status, copy.subscriptionStatuses)}
                      </span>
                    </p>
                    <p className="item-meta">
                      {subscription.currentPeriodEnd
                        ? formatMessage(copy.currentPeriodEndsTemplate, { date: formatBillingDateTime(subscription.currentPeriodEnd, locale) })
                        : copy.noFixedEnd}
                    </p>
                    {subscription.lastPaymentFailedAt ? <p className="form-status error">{copy.renewalFailed}</p> : null}
                    {subscription.cancelAtPeriodEnd ? <p className="form-status">{copy.cancellationScheduled}</p> : null}
                  </div>
                  <div className="button-row">
                    <span className="status-chip tone-cyan">
                      {formatMessage(copy.seatsTemplate, { count: formatNumber(subscription.seatQuantity, locale) })}
                    </span>
                    {!subscription.cancelAtPeriodEnd && cancelableStatuses.has(subscription.status) ? (
                      <button
                        type="button"
                        className="button button-tertiary"
                        disabled={cancelBusy}
                        onClick={() => void cancelSubscription(subscription.id)}
                      >
                        {cancelBusy ? copy.canceling : copy.cancel}
                      </button>
                    ) : null}
                  </div>
                </div>
                {subscription.organizationId ? (
                  <div className="stack-sm">
                    <form className="button-row" onSubmit={(event) => submitSeat(event, subscription.id)}>
                      <label className="sr-only" htmlFor={`seat-email-${subscription.id}`}>{copy.memberEmail}</label>
                      <input
                        id={`seat-email-${subscription.id}`}
                        className="field-control compact-control"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder={copy.memberEmailPlaceholder}
                        value={seatDrafts[subscription.id] ?? ""}
                        onChange={(event) => setSeatDrafts((current) => ({ ...current, [subscription.id]: event.target.value }))}
                      />
                      <button
                        type="submit"
                        className="button button-secondary"
                        disabled={busy === `seat-${subscription.id}` || !seatDrafts[subscription.id]?.trim()}
                      >
                        {busy === `seat-${subscription.id}` ? copy.assigningSeat : copy.assignSeat}
                      </button>
                    </form>
                    {seats.map((seat) => (
                      <div className="inline-meta" key={seat.id}>
                        <span>{seat.assignedEmail}</span>
                        <button
                          type="button"
                          className="button button-ghost button-tertiary"
                          disabled={busy === `revoke-${seat.assignedEmail}`}
                          onClick={() => void revokeSeat(subscription.id, seat.assignedEmail)}
                        >
                          {busy === `revoke-${seat.assignedEmail}` ? copy.revoking : copy.revoke}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </section>

      <section className="surface-panel stack-lg">
        <div className="stack-xs">
          <p className="eyebrow">{copy.invoicesEyebrow}</p>
          <h2 className="card-title">{copy.invoicesTitle}</h2>
        </div>
        {billing.invoices.length === 0 ? (
          <div className="empty-state" role="status">{copy.noInvoices}</div>
        ) : billing.invoices.map((invoice) => {
          const paidOrDue = formatBillingMoney(invoice.amountPaidMinor ?? invoice.amountDueMinor, invoice.currency, locale, copy.amountPending);
          const refund = invoice.amountRefundedMinor > 0
            ? formatMessage(copy.refundedTemplate, {
                amount: formatBillingMoney(invoice.amountRefundedMinor, invoice.currency, locale, copy.amountPending),
              })
            : null;
          const invoiceDate = getInvoiceDateLabel(invoice, locale, copy);
          return (
            <div className="list-item" key={invoice.id}>
              <div>
                <p className="item-title">
                  {copy.providers[invoice.provider]} · {invoice.providerInvoiceId}{" "}
                  <span className={`status-chip ${invoiceTone(invoice.status)}`}>
                    {mappedBillingStatus<BillingInvoiceStatus>(invoice.status, copy.invoiceStatuses)}
                  </span>
                </p>
                <p className="item-meta">{paidOrDue}{refund ? ` · ${refund}` : ""}</p>
                {invoiceDate ? <p className="item-meta">{invoiceDate}</p> : null}
              </div>
              {invoice.hostedUrl ? (
                <a className="button button-secondary button-ghost" href={invoice.hostedUrl} target="_blank" rel="noreferrer">
                  {copy.viewInvoice}
                </a>
              ) : null}
            </div>
          );
        })}
      </section>
      {status ? (
        <p className={`form-status ${status.tone}`} role={status.tone === "error" ? "alert" : "status"}>
          {status.message}
        </p>
      ) : null}
    </div>
  );

  function submitSeat(event: FormEvent<HTMLFormElement>, subscriptionId: string) {
    event.preventDefault();
    void assignSeat(subscriptionId);
  }
}

function normalizeQuotaTier(tier: QuotaTier): BillingQuotaTier {
  if (tier === "legacy") return "free";
  if (tier === "pro") return "starter";
  if (tier === "education") return "converter-pro";
  return tier;
}

function subscriptionTone(status: string) {
  return status === "active" || status === "trialing" ? "tone-green" : "tone-amber";
}

function invoiceTone(status: string) {
  if (status === "paid") return "tone-green";
  if (status === "refunded") return "tone-cyan";
  return "tone-amber";
}

function getInvoiceDateLabel(invoice: Invoice, locale: SupportedLocale, copy: BillingManagerCopy) {
  if (invoice.paidAt) {
    return formatMessage(copy.invoicePaidTemplate, { date: formatBillingDateTime(invoice.paidAt, locale) });
  }
  if (invoice.failedAt) {
    return formatMessage(copy.invoiceFailedTemplate, { date: formatBillingDateTime(invoice.failedAt, locale) });
  }
  if (invoice.dueAt) {
    return formatMessage(copy.invoiceDueTemplate, { date: formatBillingDateTime(invoice.dueAt, locale) });
  }
  return null;
}

function QuotaMeter({ label, used, limit, value }: { label: string; used: number; limit: number; value: string }) {
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="metric-card stack-sm">
      <div className="section-heading-row"><span className="field-label">{label}</span><strong>{value}</strong></div>
      <div
        className="quota-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(used, limit)}
        aria-valuetext={value}
      >
        <span className="quota-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
