"use client";

import { getSingleScorePassCopy } from "@score/shared";

import Link from "next/link";
import { useAppAuthModal } from "./AppAuthModal";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatMessage, type SupportedLocale } from "@score/i18n";
import { APP_ROUTES, getPurchaseOptionsCopy, type PaymentOrderStatus, type PaymentProvider } from "@score/shared";
import { getStoredToken, clearStoredToken } from "../lib/auth-storage";
import { readCheckoutReturn } from "../lib/flow-return";
import { useFlowMessages } from "../lib/flow-messages/client";
import { apiRequest } from "../lib/api";
import { trackFunnelEventOnce } from "../lib/analytics";
import { rawApiErrorOrFallback, formatBillingDateTime } from "../lib/billing-messages/client";
import type { BillingMessageCatalog } from "../lib/billing-messages/types";

type PublicOrder = {
  id: string;
  userId: string | null;
  provider: PaymentProvider;
  status: PaymentOrderStatus;
  activationCode: string | null;
  billingKind: "one_time" | "subscription";
  amountMinor: number | null;
  currency: string | null;
  seatQuantity: number;
  paidAt: string | null;
  accessStartsAt?: string | null;
  accessEndsAt?: string | null;
  planCode?: string | null;
  purchaseStatus?: string | null;
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
  const router = useRouter();
  const signIn = useAppAuthModal();
  const flow = useFlowMessages();
  const [retryCount, setRetryCount] = useState(0);
  const [destination, setDestination] = useState({ next: "/scores", retry: "/checkout", createdAt: 0 });
  const [accessState, setAccessState] = useState<"waiting" | "ready" | "mismatch" | "error">("waiting");
  useEffect(() => { setDestination(readCheckoutReturn(orderId)); }, [orderId]);
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const purchaseCopy = getPurchaseOptionsCopy(locale);
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
  }, [copy.fallbackError, orderId, provider, sessionId, token, retryCount]);

  const isPaid = order?.status === "paid";
  useEffect(() => {
    if (!isPaid || !order?.userId || order.purchaseStatus === "refunded") return;
    let disposed = false;
    let timer: number | undefined;
    let attempt = 0;
    const verifyAccess = async () => {
      const authToken = getStoredToken();
      const result = await apiRequest<{ user: { id: string; scorePasses?: Array<{ id: string }>; entitlement: { status: string } } }>("/api/auth/me", {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      });
      if (disposed) return;
      if (!result.ok && result.status === 401) {
        clearStoredToken();
        signIn("login", () => setRetryCount(n => n + 1));
        return;
      }
      if (result.ok && result.data.user.id !== order.userId) { setAccessState("mismatch"); return; }
      if (result.ok && (result.data.user.entitlement.status === "active" || (order.planCode === "single-score" && result.data.user.scorePasses?.some(pass => pass.id === orderId)))) {
        setAccessState("ready");
        router.replace(readCheckoutReturn(orderId).next);
        router.refresh();
        return;
      }
      if (++attempt < 20) timer = window.setTimeout(() => void verifyAccess(), 3000);
      else setAccessState("error");
    };
    setAccessState("waiting");
    void verifyAccess();
    return () => { disposed = true; if (timer) window.clearTimeout(timer); };
  }, [isPaid, order?.userId, order?.purchaseStatus, orderId, retryCount, router, order?.planCode, signIn]);


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
    ? order?.purchaseStatus === "refunded" ? { title: purchaseCopy.refunded, body: purchaseCopy.refunded } : order?.userId && accessState !== "ready" ? { title: flow.waitingAccess, body: copy.pendingBody } : { title: copy.successTitle, body: copy.successBody }
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
            <Link href={`${APP_ROUTES.billing}#${order?.billingKind === "one_time" ? "one-time-purchases" : "subscriptions"}`} className="button button-secondary">{order?.billingKind === "one_time" ? purchaseCopy.purchases : purchaseCopy.manage}</Link>
            <Link href={destination.next} className="button button-primary">{flow.resume}</Link>
            {!isPaid ? <Link href={destination.retry} className="button button-secondary">{flow.retry}</Link> : null}
          </div>
          {isPaid && order?.userId && order.purchaseStatus !== "refunded" && accessState !== "ready" ? <div className="stack-sm" role="status">
            <p>{accessState === "mismatch" ? flow.accountMismatch : flow.waitingAccess}</p>
            {accessState === "mismatch" ? <button className="button button-secondary" onClick={() => { clearStoredToken(); signIn("login", () => setRetryCount(n => n + 1)); }}>{flow.accountMismatch}</button> : null}
          </div> : null}
          <button type="button" className="button button-secondary" onClick={() => { setLoading(true); setRetryCount(n => n + 1); }}>{flow.retry}</button>
          {isPaid && order?.billingKind === "one_time" ? <div className="stack-sm">
            <p>{order.purchaseStatus === "refunded" ? purchaseCopy.refunded : order.planCode === "single-score" ? getSingleScorePassCopy(locale).paid : purchaseCopy.oneTimeNote}</p>
            {order.accessStartsAt ? <p>{formatMessage(purchaseCopy.startsTemplate, { date: formatBillingDateTime(order.accessStartsAt, locale) })}</p> : null}
            {order.accessEndsAt ? <p>{formatMessage(purchaseCopy.expiresTemplate, { date: formatBillingDateTime(order.accessEndsAt, locale) })}</p> : null}
          </div> : null}
        </>
      ) : null}
    </div>
  );
}
