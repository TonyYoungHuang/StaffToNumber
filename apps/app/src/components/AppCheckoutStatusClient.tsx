"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SupportedLocale } from "@score/i18n";
import { APP_ROUTES, type PaymentOrderStatus, type PaymentProvider } from "@score/shared";
import { apiRequest } from "../lib/api";
import { trackFunnelEventOnce } from "../lib/analytics";
import { rawApiErrorOrFallback } from "../lib/billing-messages/client";
import type { BillingMessageCatalog } from "../lib/billing-messages/types";

type PublicOrder = {
  id: string;
  provider: PaymentProvider;
  status: PaymentOrderStatus;
  activationCode: string | null;
  billingKind: "one_time" | "subscription";
  amountMinor: number | null;
  currency: string | null;
  seatQuantity: number;
  paidAt: string | null;
};

type OrderPayload = { order: PublicOrder | null };
type CheckoutStatusCopy = BillingMessageCatalog["checkout"]["status"];

export function AppCheckoutStatusClient({
  orderId,
  token,
  provider,
  sessionId,
  locale,
  copy,
}: {
  orderId: string;
  token: string;
  provider: PaymentProvider;
  sessionId?: string;
  locale: SupportedLocale;
  copy: CheckoutStatusCopy;
}) {
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let timer: number | undefined;
    let attempts = 0;

    const load = async () => {
      const params = new URLSearchParams({ token, provider });
      if (sessionId) params.set("sessionId", sessionId);

      const result = await apiRequest<OrderPayload>(`/api/payments/orders/${orderId}?${params.toString()}`);
      if (disposed) return;

      setLoading(false);
      if (!result.ok) {
        setError(rawApiErrorOrFallback(result.error, copy.fallbackError));
        return;
      }

      setError(null);
      setOrder(result.data.order);
      if (result.data.order?.status === "pending" && attempts < 10) {
        attempts += 1;
        timer = window.setTimeout(() => {
          void load();
        }, 3000);
      }
    };

    void load();

    return () => {
      disposed = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [copy.fallbackError, orderId, provider, sessionId, token]);

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

  const statusCopy = order?.status === "paid"
    ? { title: copy.successTitle, body: copy.successBody }
    : order?.status === "cancelled"
      ? { title: copy.cancelledTitle, body: copy.cancelledBody }
      : order?.status === "failed"
        ? { title: copy.failedTitle, body: copy.failedBody }
        : { title: copy.pendingTitle, body: copy.pendingBody };

  return (
    <div className="surface-panel stack-lg" lang={locale}>
      {loading ? <p className="body-copy large" role="status" aria-live="polite">{copy.loading}</p> : null}
      {error ? <p className="form-status error" role="alert">{error}</p> : null}
      {!loading && !error ? (
        <>
          <div className="stack-sm" role="status" aria-live="polite">
            <h1 className="page-title">{statusCopy.title}</h1>
            <p className="body-copy large">{statusCopy.body}</p>
          </div>
          <div className="button-row">
            <Link href={APP_ROUTES.scores} className="button button-primary">{copy.scores}</Link>
            <Link href={APP_ROUTES.jobs} className="button button-secondary">{copy.jobs}</Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
