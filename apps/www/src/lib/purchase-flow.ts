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

/** Lowest-commitment paid default when the URL has no plan (not the featured annual). */
export const DEFAULT_PURCHASE_PLAN_CODE: PurchasePlanCode = "starter-monthly";

const PENDING_PURCHASE_KEY = "scoretransposer_pending_purchase";
const PENDING_PURCHASE_TTL_MS = 30 * 60 * 1000;

export function defaultPurchaseSelection(search = ""): PurchaseSelection {
  const params = new URLSearchParams(search);
  const billingKind = params.get("billing") === "one_time" ? "one_time" : "subscription";
  return {
    planCode: DEFAULT_PURCHASE_PLAN_CODE,
    billingKind,
    provider: billingKind === "subscription" && params.get("provider") === "paddle" ? "paddle" : "stripe",
  };
}

export function readPurchaseSelection(search: string): PurchaseSelection | null {
  const params = new URLSearchParams(search);
  const planCode = params.get("plan");
  if (!isPurchasePlanCode(planCode)) return null;
  const billingKind = planCode === "single-score" || params.get("billing") === "one_time" ? "one_time" : "subscription";
  return {
    planCode,
    billingKind,
    provider: billingKind === "subscription" && params.get("provider") === "paddle" ? "paddle" : "stripe",
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
