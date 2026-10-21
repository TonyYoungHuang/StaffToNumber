import type { PaymentVerification } from "./payment-recovery-copy.ts";

export type ConfirmedPurchaseOrder = {
  id: string; status: string; provider: string; billingKind: string; planCode?: string | null;
  amountMinor?: number | null; currency?: string | null; seatQuantity?: number; purchaseStatus?: string | null;
  lifetime?: { status: string; transactionId: string } | null;
};

/** Only a backend-verified order may produce a purchase event. Never accepts click data. */
export function confirmedPurchaseEvent(order: ConfirmedPurchaseOrder | null, verification: PaymentVerification | null | undefined) {
  if (!order || order.status !== "paid" || verification?.status !== "ready" || order.purchaseStatus === "refunded") return null;
  if (order.planCode === "converter-pro-lifetime") {
    if (order.lifetime?.status !== "active" || !order.lifetime.transactionId || order.amountMinor !== 9900 || order.currency?.toUpperCase() !== "USD") return null;
    return { transaction_id: order.lifetime.transactionId, purchase_model: "lifetime", billing_kind: "one_time",
      plan_code: order.planCode, value: 99, currency: "USD", payment_type: "stripe",
      items: [{ item_id: order.planCode, item_name: "Converter Pro Lifetime", quantity: 1 }] };
  }
  return { transaction_id: order.id, billing_kind: order.billingKind, plan_code: order.planCode,
    payment_type: order.provider,
    ...(typeof order.amountMinor === "number" && order.currency ? { value: order.amountMinor / 100, currency: order.currency.toUpperCase() } : {}),
    items: [{ item_id: order.planCode ?? "scoretransposer_access", quantity: order.seatQuantity || 1 }] };
}

export type PurchaseEvent = NonNullable<ReturnType<typeof confirmedPurchaseEvent>>;
export type PurchaseStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const pendingKey = "scoretransposer_confirmed_purchases";

/** Share confirmed, non-PII purchase facts across app/www redirects. Checkout
 * tokens, customer data and page URLs are never stored in these cookies.
 * Cookies are authoritative so an event sent on www cannot replay on app.
 */
export function purchaseAnalyticsStorage(local: PurchaseStorage, jar: { cookie: string }, hostname: string, secure: boolean, configuredDomain?: string): PurchaseStorage {
  const domain = configuredDomain?.trim().replace(/^\./u, "").toLowerCase();
  const shared = domain && (hostname === domain || hostname.endsWith(`.${domain}`));
  const attributes = `; Path=/; SameSite=Lax${secure ? "; Secure" : ""}${shared ? `; Domain=.${domain}` : ""}`;
  const read = (key: string) => {
    const entry = jar.cookie.split(";").map(item => item.trim()).find(item => item.startsWith(`${key}=`));
    return entry ? decodeURIComponent(entry.slice(key.length + 1)) : local.getItem(key);
  };
  return {
    getItem: read,
    setItem(key, value) {
      local.setItem(key, value);
      jar.cookie = `${key}=${encodeURIComponent(value)}; Max-Age=${key === pendingKey ? 86400 : 31536000}${attributes}`;
    },
    removeItem(key) {
      local.removeItem(key);
      jar.cookie = `${key}=; Max-Age=0${attributes}`;
    },
  };
}

export function queueConfirmedPurchase(storage: PurchaseStorage, event: PurchaseEvent) {
  const pending = JSON.parse(storage.getItem(pendingKey) || "{}") as Record<string, PurchaseEvent>;
  pending[event.transaction_id] = event;
  storage.setItem(pendingKey, JSON.stringify(pending));
}

/** Returns only after the analytics client accepted the event. Consent stays with that client. */
export function flushConfirmedPurchases(storage: PurchaseStorage, send: (event: PurchaseEvent) => boolean) {
  const pending = JSON.parse(storage.getItem(pendingKey) || "{}") as Record<string, PurchaseEvent>;
  for (const [id, event] of Object.entries(pending)) {
    const key = `scoretransposer_purchase_sent_${id}`;
    if (storage.getItem(key) === "sent" || send(event)) {
      storage.setItem(key, "sent");
      delete pending[id];
    }
  }
  storage.setItem(pendingKey, JSON.stringify(pending));
}
