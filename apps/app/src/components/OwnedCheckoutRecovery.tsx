"use client";
import { useEffect, useState } from "react";
import type { SupportedLocale } from "@score/i18n";
import { apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { getCheckoutReturnCopy } from "../lib/checkout-return-copy";
import { formatBillingDateTime } from "../lib/billing-messages/client";
type Order = { id: string; provider: "stripe" | "paddle"; token: string; status: string; planCode?: string | null; purchaseStatus?: string | null; createdAt: string };
export function OwnedCheckoutRecovery({ locale }: { locale: SupportedLocale }) {
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    const controller = new AbortController(); const token = getStoredToken();
    void apiRequest<{ orders: Order[] }>("/api/payments/orders", { signal: controller.signal, headers: token ? { Authorization: `Bearer ${token}` } : undefined }).then(result => {
      if (result.ok && !controller.signal.aborted) setOrders(result.data.orders.filter(order => ["paid", "pending"].includes(order.status) && order.purchaseStatus !== "refunded"));
    });
    return () => controller.abort();
  }, []);
  return orders.length ? <section className="surface-panel stack-lg" id="restore-checkout-orders"><h2 className="card-title">{getCheckoutReturnCopy(locale).recover}</h2>{orders.map(order => <div className="list-item" key={order.id}><span>{order.planCode} · {formatBillingDateTime(order.createdAt, locale)}</span><a className="button button-secondary" href={`/checkout/success?${new URLSearchParams({ order_id: order.id, token: order.token, provider: order.provider })}`}>{getCheckoutReturnCopy(locale).recover}</a></div>)}</section> : null;
}
