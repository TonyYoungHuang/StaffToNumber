import { getPricingPlanCatalog, type CheckoutIntendedAction, type PurchasePlanCode } from "@score/shared";
import type { SupportedLocale } from "@score/i18n";

export function getScoreUpgradePlans(locale: SupportedLocale) { return getPricingPlanCatalog(locale); }

export function defaultCheckoutPlan(initial: PurchasePlanCode | undefined): PurchasePlanCode {
  return initial ?? "starter-monthly";
}

export function scoreCheckoutPath(documentId: string, action?: CheckoutIntendedAction, topUp = false) {
  const params = new URLSearchParams({ targetDocumentId: documentId, next: `/scores/${encodeURIComponent(documentId)}`, plan: "starter-monthly", billing: "subscription" });
  if (action) params.set("intendedAction", JSON.stringify(action));
  if (topUp) params.set("passMode", "top_up");
  return `/checkout?${params}`;
}

// This is transport data only. The checkout API validates its shape and score ownership.
export function readCheckoutAction(raw?: string): CheckoutIntendedAction | undefined {
  if (!raw || raw.length > 16_384) return undefined;
  try { const action = JSON.parse(raw); return action && typeof action === "object" ? action : undefined; } catch { return undefined; }
}

export function isCreditUpgradeError(result: { status: number; code?: string; data?: unknown }) {
  const code = result.code ?? (result.data as { code?: string } | undefined)?.code;
  return (result.status === 403 && code === "SCORE_PASS_CREDITS_EXHAUSTED") || (result.status === 429 && code === "PLAN_JOB_QUOTA_EXCEEDED");
}

export type CheckoutContinuationResult = { documentId: string; job?: { id: string }; error?: string; code?: string; statusCode?: number };
const CONTINUATION_NOTICE_KEY = "score_checkout_continuation:";
export function saveContinuationNotice(result: CheckoutContinuationResult) {
  if (!result.error && !result.code) return;
  try { window.sessionStorage.setItem(`${CONTINUATION_NOTICE_KEY}${result.documentId}`, JSON.stringify(result)); } catch { /* The return page still displays failures when storage is unavailable. */ }
}
export function takeContinuationNotice(documentId: string): CheckoutContinuationResult | null {
  try {
    const key = `${CONTINUATION_NOTICE_KEY}${documentId}`;
    const raw = window.sessionStorage.getItem(key);
    window.sessionStorage.removeItem(key);
    const result = raw ? JSON.parse(raw) as CheckoutContinuationResult : null;
    return result?.documentId === documentId ? result : null;
  } catch { return null; }
}
