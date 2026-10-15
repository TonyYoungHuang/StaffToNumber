import { resolveAuthReturnPath } from "./auth-return";
import { validateCheckoutReturnPath } from "@score/shared";

export function workReturnPath(value: string | null | undefined) {
  return validateCheckoutReturnPath("app", value ?? "") ?? "/scores";
}
export function currentWorkPath() {
  if (typeof window === "undefined") return "/scores";
  return workReturnPath(`${window.location.pathname}${window.location.search}${window.location.hash}`);
}
export function upgradePath(next: string) {
  const safe = workReturnPath(next); const params = new URLSearchParams({ next: safe });
  const documentId = /^\/scores\/(?!new(?:[/?#]|$)|shared(?:[/?#]|$))([^/?#]+)/u.exec(safe)?.[1];
  if (documentId) params.set("targetDocumentId", decodeURIComponent(documentId));
  return `/checkout?${params}`;
}
type CheckoutReturn = { next: string; retry: string; createdAt: number };
const prefix = "score-checkout-return:";
export function saveCheckoutReturn(orderId: string, next: string, retry: string) {
  try { sessionStorage.setItem(prefix + orderId, JSON.stringify({ next: workReturnPath(next), retry: resolveAuthReturnPath(retry) ?? "/checkout", createdAt: Date.now() })); } catch { /* A visible return link remains available. */ }
}
export function readCheckoutReturn(orderId: string, returnTo?: string): CheckoutReturn {
  const fallback = { next: workReturnPath(returnTo), retry: "/checkout", createdAt: 0 };
  try {
    const entry = JSON.parse(sessionStorage.getItem(prefix + orderId) ?? "null") as CheckoutReturn | null;
    if (!entry || typeof entry.createdAt !== "number" || Date.now() - entry.createdAt > 86400000 || entry.createdAt > Date.now()) return fallback;
    return { ...entry, next: workReturnPath(entry.next), retry: resolveAuthReturnPath(entry.retry) ?? "/checkout" };
  } catch { return fallback; }
}
