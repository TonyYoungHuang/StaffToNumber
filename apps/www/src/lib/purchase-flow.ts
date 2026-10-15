import { isPurchasePlanCode, type CheckoutBillingKind, type PurchasePlanCode, type PaymentProvider } from "@score/shared";

export type PurchaseSelection = {
  planCode: PurchasePlanCode;
  billingKind: CheckoutBillingKind;
  provider: PaymentProvider;
};

export type PendingPurchase = PurchaseSelection & {
  name: string;
  cycle: string;
  price: string;
  savedAt: number;
};

export const SESSION_CHANGED_EVENT = "scoretransposer:session-changed";

/** A single score is the default purchase; an explicit URL plan keeps its purchase kind. */
export const DEFAULT_PURCHASE_PLAN_CODE: PurchasePlanCode = "single-score";

const PENDING_PURCHASE_KEY = "scoretransposer_pending_purchase";
const PENDING_PURCHASE_TTL_MS = 30 * 60 * 1000;

export function defaultPurchaseSelection(search = ""): PurchaseSelection {
  return {
    planCode: DEFAULT_PURCHASE_PLAN_CODE,
    billingKind: "one_time",
    provider: "stripe",
  };
}

export function readPurchaseSelection(search: string): PurchaseSelection | null {
  const params = new URLSearchParams(search);
  const returned = params.get("checkoutResult") === "cancelled";
  const planCode = returned ? params.get("checkoutPlan") ?? params.get("plan") : params.get("plan");
  if (!isPurchasePlanCode(planCode)) return null;
  const selectedBilling = returned ? params.get("checkoutBilling") ?? params.get("billing") : params.get("billing");
  const selectedProvider = returned ? params.get("checkoutProvider") ?? params.get("provider") : params.get("provider");
  const billingKind = planCode === "single-score" || selectedBilling === "one_time" ? "one_time" : "subscription";
  return {
    planCode,
    billingKind,
    provider: billingKind === "subscription" && selectedProvider === "paddle" ? "paddle" : "stripe",
  };
}

export function purchaseSelectionKey(selection: PurchaseSelection) {
  return `${selection.planCode}:${selection.billingKind}:${selection.provider}`;
}

export function rememberPurchaseSelection(selection: PurchaseSelection) {
  const url = new URL(window.location.href);
  url.searchParams.set("plan", selection.planCode);
  url.searchParams.set("billing", selection.billingKind);
  url.searchParams.set("provider", selection.provider);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function savePendingPurchase(plan: Omit<PendingPurchase, "savedAt">) {
  try {
    const payload: PendingPurchase = { ...plan, savedAt: Date.now() };
    window.sessionStorage.setItem(PENDING_PURCHASE_KEY, JSON.stringify(payload));
  } catch {
    /* Checkout can still continue from in-memory pending state. */
  }
}

export function readPendingPurchase(): Omit<PendingPurchase, "savedAt"> | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_PURCHASE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingPurchase;
    if (!parsed || typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > PENDING_PURCHASE_TTL_MS) {
      clearPendingPurchase();
      return null;
    }
    if (!isPurchasePlanCode(parsed.planCode)) {
      clearPendingPurchase();
      return null;
    }
    if (parsed.billingKind !== "subscription" && parsed.billingKind !== "one_time") {
      clearPendingPurchase();
      return null;
    }
    if (parsed.provider !== "stripe" && parsed.provider !== "paddle") {
      clearPendingPurchase();
      return null;
    }
    if (typeof parsed.name !== "string" || typeof parsed.cycle !== "string" || typeof parsed.price !== "string") {
      clearPendingPurchase();
      return null;
    }
    return {
      planCode: parsed.planCode,
      billingKind: parsed.billingKind,
      provider: parsed.billingKind === "one_time" ? "stripe" : parsed.provider,
      name: parsed.name,
      cycle: parsed.cycle,
      price: parsed.price,
    };
  } catch {
    clearPendingPurchase();
    return null;
  }
}

export function clearPendingPurchase() {
  try {
    window.sessionStorage.removeItem(PENDING_PURCHASE_KEY);
  } catch {
    /* Ignore storage failures when clearing. */
  }
}

function safeScoreReturn(value: unknown) {
  if (typeof value !== "string" || value.length > 2048 || !/^\/scores(?:\/|\?|#|$)/u.test(value)) return "/scores";
  try {
    const url = new URL(value, "https://app.scoretransposer.com");
    return url.origin === "https://app.scoretransposer.com" && /^\/scores(?:\/|$)/u.test(url.pathname) ? `${url.pathname}${url.search}${url.hash}` : "/scores";
  } catch { return "/scores"; }
}

export function savePurchaseReturn(orderId: string, search: string) {
  try {
    window.sessionStorage.setItem(`scoretransposer_purchase_return:${orderId}`, JSON.stringify({ next: safeScoreReturn(new URLSearchParams(search).get("next")), savedAt: Date.now() }));
  } catch { /* Payment success still offers the score library. */ }
}

export function readPurchaseReturn(orderId: string) {
  try {
    const entry = JSON.parse(window.sessionStorage.getItem(`scoretransposer_purchase_return:${orderId}`) ?? "null") as { next?: unknown; savedAt?: unknown } | null;
    if (!entry || typeof entry.savedAt !== "number" || Date.now() - entry.savedAt > 86400000 || entry.savedAt > Date.now()) return "/scores";
    return safeScoreReturn(entry.next);
  } catch { return "/scores"; }
}
