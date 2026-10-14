"use client";

import { getSingleScorePassCopy } from "@score/shared";

import { useEffect, useState } from "react";
import { formatDateTime, formatMessage } from "@score/i18n";
import { getPurchaseOptionsCopy, type PaymentProvider, type PaymentOrderStatus } from "@score/shared";
import { MetricCard, Panel, StatusPill } from "@score/ui";
import { apiRequest } from "../lib/api";
import { trackFunnelEventOnce } from "../lib/analytics";
import type { CheckoutStatusCopy } from "../lib/checkout-localization";
import { localizePublicHref } from "../lib/locale-routing";
import {
  getAppActivateUrl,
  getAppRegisterUrl,
  getAppLoginUrl,
  getAppScoreProjectsUrl,
  getCheckoutUrl,
  getSupportUrl,
  siteConfig,
} from "../lib/site";
import { useSiteLocale } from "./SiteLocaleProvider";
import { getPaymentRecoveryCopy, type PaymentVerification } from "@score/shared";

type PublicOrder = {
  id: string;
  provider: PaymentProvider;
  status: PaymentOrderStatus;
  activationCode: string | null;
  billingKind: "one_time" | "subscription";
  userId: string | null;
  customerEmail: string | null;
  amountMinor: number | null;
  currency: string | null;
  seatQuantity: number;
  paidAt: string | null;
  accessStartsAt?: string | null;
  accessEndsAt?: string | null;
  planCode?: string | null;
};

type OrderPayload = { order: PublicOrder | null; verification?: PaymentVerification };

export function CheckoutStatusClient({
  orderId,
  token,
  provider,
  sessionId,
  copy,
  translationNotice,
}: {
  orderId: string;
  token: string;
  provider: PaymentProvider;
  sessionId?: string;
  copy: CheckoutStatusCopy;
  translationNotice: string;
}) {
  const { locale } = useSiteLocale();
  const purchaseCopy = getPurchaseOptionsCopy(locale);
  const activateUrl = getAppActivateUrl(locale);
  const checkoutUrl = getCheckoutUrl(locale);
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [verification, setVerification] = useState<PaymentVerification | null>(null);
  const [pollingStopped, setPollingStopped] = useState(false);
  const recoveryCopy = getPaymentRecoveryCopy(locale);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let attempts = 0;
    const controller = new AbortController();
    setPollingStopped(false);

    const load = async () => {
      const params = new URLSearchParams({ token, provider });
      if (sessionId) params.set("sessionId", sessionId);

      const result = await apiRequest<OrderPayload>(`/api/payments/orders/${orderId}?${params.toString()}`, { signal: controller.signal });
      if (cancelled) return;

      setLoading(false);
      if (!result.ok) {
        setError(`${recoveryCopy.verification_failed} ${result.error}`);
        return;
      }
      if (!result.data?.order) { setError(recoveryCopy.verification_failed); return; }

      setError(null);
      setOrder(result.data.order);
      setVerification(result.data.verification ?? null);
      const pending = result.data.verification
        ? ["waiting_payment", "waiting_fulfillment"].includes(result.data.verification.status)
        : result.data.order?.status === "pending";
      if (pending) {
        if (attempts++ < 10) timer = window.setTimeout(() => void load(), 3000);
        else setPollingStopped(true);
      }
    };

    void load();
    return () => {
      cancelled = true;
      controller.abort();
      if (timer) window.clearTimeout(timer);
    };
  }, [orderId, provider, sessionId, token, retryCount, recoveryCopy.verification_failed]);

  const isPaid = order?.status === "paid";
  useEffect(() => {
    if (!order?.userId) return;
    const query = new URLSearchParams({ order_id: orderId, token, provider });
    if (sessionId) query.set("session_id", sessionId);
    const destination = new URL("/api/locale", `${siteConfig.appUrl}/`);
    destination.searchParams.set("locale", locale);
    destination.searchParams.set("next", `/checkout/success?${query}`);
    window.location.replace(destination.toString());
  }, [order?.userId, orderId, token, provider, sessionId, locale]);


  useEffect(() => {
    if (!isPaid || !order) return;
    const hasValue = typeof order.amountMinor === "number" && Boolean(order.currency);
    trackFunnelEventOnce(`purchase-${order.id}`, "purchase", {
      transaction_id: order.id,
      payment_type: order.provider,
      ...(hasValue ? { value: order.amountMinor! / 100, currency: order.currency!.toUpperCase() } : {}),
      items: [{
        item_id: order.billingKind === "subscription" ? "scoretransposer_subscription" : "scoretransposer_access",
        item_name: order.billingKind === "subscription" ? "ScoreTransposer subscription" : "ScoreTransposer access",
        quantity: order.seatQuantity || 1,
      }],
    });
  }, [isPaid, order]);

  const isSubscriptionPaid = isPaid && order?.billingKind === "subscription";
  const isOneTimePaid = isPaid && Boolean(order?.accessEndsAt);
  const hasVerificationError = verification?.status === "verification_failed" || verification?.status === "fulfillment_failed";
  const isStalled = order?.status === "cancelled" || order?.status === "failed" || hasVerificationError;
  const badge = isStalled ? copy.stalledBadge : isPaid ? copy.paidBadge : copy.pendingBadge;
  const title = hasVerificationError ? copy.errorTitle : isOneTimePaid ? copy.statuses.paid : isSubscriptionPaid ? copy.subscriptionPaidTitle : isPaid ? copy.paidTitle : isStalled ? copy.stalledTitle : copy.pendingTitle;
  const body = verification && verification.status !== "ready" ? recoveryCopy[verification.status] : isOneTimePaid ? purchaseCopy.oneTimeNote : isSubscriptionPaid ? copy.subscriptionPaidBody : isPaid ? copy.paidBody : isStalled ? copy.stalledBody : copy.pendingBody;
  const steps = isPaid && order?.planCode === "single-score" ? [getSingleScorePassCopy(locale).paid, ...getSingleScorePassCopy(locale).benefits] : isOneTimePaid ? [
    formatMessage(purchaseCopy.startsTemplate, { date: safelyFormatDateTime(order!.accessStartsAt!, locale) }),
    formatMessage(purchaseCopy.expiresTemplate, { date: safelyFormatDateTime(order!.accessEndsAt!, locale) }),
  ] : isSubscriptionPaid ? copy.subscriptionPaidSteps : isPaid ? copy.paidSteps : isStalled ? copy.stalledSteps : copy.pendingSteps;
  const paidActionUrl = isOneTimePaid ? getAppLoginUrl("/billing#one-time-purchases", locale) : isSubscriptionPaid
    ? order?.userId ? getAppScoreProjectsUrl(locale) : getAppRegisterUrl(locale)
    : activateUrl;
  const paidActionLabel = isOneTimePaid ? purchaseCopy.purchases : isSubscriptionPaid
    ? order?.userId ? copy.openSubscription : copy.registerSubscription
    : copy.redeem;

  return (
    <div className="surface-panel stack-xl">
      <div className="stack-sm" aria-live="polite">
        <StatusPill tone={isStalled ? "amber" : isPaid ? "green" : "cyan"}>{badge}</StatusPill>
        {loading ? <p className="body-copy">{copy.pendingBody}</p> : null}
        {error ? (
          <>
            <h1 className="page-title">{copy.errorTitle}</h1>
            <p className="body-copy large">{copy.errorBody}</p>
            <p className="form-status error" role="alert">{error}</p>
          </>
        ) : null}
        {!loading && !error && order ? (
          <><h1 className="page-title">{title}</h1><p className="body-copy large">{body}</p></>
        ) : null}
        {!loading && !error && !order ? (
          <><h1 className="page-title">{copy.missingTitle}</h1><p className="body-copy large">{copy.missingBody}</p></>
        ) : null}
        {translationNotice ? <p className="helper-copy" role="note">{translationNotice}</p> : null}
        {pollingStopped ? <p className="form-status error" role="alert">{recoveryCopy.pollingStopped}</p> : null}
        <button type="button" className="public-button secondary" disabled={loading} onClick={() => { setLoading(true); setError(null); setRetryCount(n => n + 1); }}>{recoveryCopy.retry}</button>
      </div>

      {!loading && !error && order ? (
        <div className="metric-grid">
          <MetricCard label={copy.orderStatus} value={copy.statuses[order.status]} body={body} />
          <MetricCard
            label={copy.provider}
            value={copy.providers[order.provider]}
            body={order.paidAt ? safelyFormatDateTime(order.paidAt, locale) : order.id}
          />
          {order.customerEmail ? <MetricCard label={copy.email} value={order.customerEmail} body={siteConfig.supportEmail} /> : null}
          {isPaid && order.activationCode ? <MetricCard label={copy.activationCode} value={order.activationCode} body={copy.paidSteps[0]} /> : null}
        </div>
      ) : null}

      {!loading && !error ? (
        <Panel variant="sunken" className="stack-md">
          <h2 className="card-title">{copy.nextTitle}</h2>
          {steps.map((item) => <p key={item} className="body-copy">{item}</p>)}
          <div className="button-row">
            {isPaid ? (
              <a href={paidActionUrl} className="public-button primary">{paidActionLabel}</a>
            ) : order?.status === "cancelled" || order?.status === "failed" ? (
              <a href={checkoutUrl} className="public-button primary">{copy.retry}</a>
            ) : null}
            <a href={localizePublicHref(getSupportUrl("payment", "checkout-success"), locale)} className="public-button tertiary">{copy.contact}</a>
            <a href={localizePublicHref("/", locale)} className="public-button secondary">{copy.home}</a>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function safelyFormatDateTime(value: string, locale: Parameters<typeof formatDateTime>[1]) {
  try {
    return formatDateTime(value, locale);
  } catch {
    return value;
  }
}
