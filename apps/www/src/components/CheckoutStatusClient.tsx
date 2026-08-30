"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@score/i18n";
import type { PaymentProvider, PaymentOrderStatus } from "@score/shared";
import { MetricCard, Panel, StatusPill } from "@score/ui";
import { apiRequest } from "../lib/api";
import { trackFunnelEventOnce } from "../lib/analytics";
import type { CheckoutStatusCopy } from "../lib/checkout-localization";
import { localizePublicHref } from "../lib/locale-routing";
import {
  getAppActivateUrl,
  getAppRegisterUrl,
  getAppScoreProjectsUrl,
  getCheckoutUrl,
  getSupportUrl,
  siteConfig,
} from "../lib/site";
import { useSiteLocale } from "./SiteLocaleProvider";

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
};

type OrderPayload = { order: PublicOrder | null };

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
  const activateUrl = getAppActivateUrl(locale);
  const checkoutUrl = getCheckoutUrl(locale);
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let attempts = 0;

    const load = async () => {
      const params = new URLSearchParams({ token, provider });
      if (sessionId) params.set("sessionId", sessionId);

      const result = await apiRequest<OrderPayload>(`/api/payments/orders/${orderId}?${params.toString()}`);
      if (cancelled) return;

      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setOrder(result.data.order);
      if (result.data.order?.status === "pending" && attempts < 10) {
        attempts += 1;
        timer = window.setTimeout(() => void load(), 3000);
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [orderId, provider, sessionId, token]);

  const isPaid = order?.status === "paid";

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
  const isStalled = order?.status === "cancelled" || order?.status === "failed";
  const badge = isPaid ? copy.paidBadge : isStalled ? copy.stalledBadge : copy.pendingBadge;
  const title = isSubscriptionPaid ? copy.subscriptionPaidTitle : isPaid ? copy.paidTitle : isStalled ? copy.stalledTitle : copy.pendingTitle;
  const body = isSubscriptionPaid ? copy.subscriptionPaidBody : isPaid ? copy.paidBody : isStalled ? copy.stalledBody : copy.pendingBody;
  const steps = isSubscriptionPaid ? copy.subscriptionPaidSteps : isPaid ? copy.paidSteps : isStalled ? copy.stalledSteps : copy.pendingSteps;
  const paidActionUrl = isSubscriptionPaid
    ? order?.userId ? getAppScoreProjectsUrl(locale) : getAppRegisterUrl(locale)
    : activateUrl;
  const paidActionLabel = isSubscriptionPaid
    ? order?.userId ? copy.openSubscription : copy.registerSubscription
    : copy.redeem;

  return (
    <div className="surface-panel stack-xl">
      <div className="stack-sm" aria-live="polite">
        <StatusPill tone={isPaid ? "green" : isStalled ? "amber" : "cyan"}>{badge}</StatusPill>
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
      </div>

      {!loading && !error && order ? (
        <div className="metric-grid">
          <MetricCard label={copy.orderStatus} value={copy.statuses[order.status]} body={isPaid ? copy.paidBody : body} />
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
            ) : (
              <a href={checkoutUrl} className="public-button primary">{copy.retry}</a>
            )}
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
