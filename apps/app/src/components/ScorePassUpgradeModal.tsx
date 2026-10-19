"use client";

import { PostRecognitionValue, workbenchCopy } from "@score/ui";
import { RecognizedScorePreview } from "./RecognizedScorePreview";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { type SupportedLocale } from "@score/i18n";
import { SINGLE_SCORE_PASS, isPurchasePlanCode, type CheckoutIntendedAction, type PurchasePlanCode } from "@score/shared";
import { getCheckoutReturnCopy } from "../lib/checkout-return-copy";
import { getStoredToken } from "../lib/auth-storage";
import { saveCheckoutReturn } from "../lib/flow-return";
import { scoreCheckoutPath } from "../lib/score-pass-checkout";
import { getScorePassCopy } from "../lib/billing-messages/client";
import styles from "./ScorePassUpgradeModal.module.css";
import { checkoutReturnContext, lookupAndStartCheckout, prepareCheckout } from "../lib/checkout-flow";
import { useAppAuthModal } from "./AppAuthModal";
import { clearAuthIntent, consumeAuthIntent, saveAuthIntent } from "../lib/auth-intent";


export function ScorePassUpgradeModal({ documentId, action, locale, topUp, onClose, returnTo }: {
  documentId: string; action?: CheckoutIntendedAction; locale: SupportedLocale; topUp: boolean; onClose: () => void; returnTo?: string;
}) {
  const wb = workbenchCopy[locale];
  const [scoreTitle, setScoreTitle] = useState("");
  const [freeUsed, setFreeUsed] = useState(false);
  const signIn = useAppAuthModal();
  const copy = getScorePassCopy(locale);
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const [loading, setLoading] = useState<PurchasePlanCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recoveryOrders, setRecoveryOrders] = useState<Array<{ id: string; provider: string; token?: string; checkoutUrl?: string }>>([]);
  const [restoredPlan] = useState(() => { const plan = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("checkoutPlan") : null; return isPurchasePlanCode(plan) ? plan : undefined; });
  const fallbackQuery = new URLSearchParams(scoreCheckoutPath(documentId, action, topUp, returnTo).split("?")[1]);
  if (restoredPlan) { fallbackQuery.set("plan", restoredPlan); fallbackQuery.set("billing", restoredPlan === "single-score" ? "one_time" : "subscription"); }
  const fallback = `/checkout?${fallbackQuery}`;
  useEffect(() => {
    if (!getStoredToken()) return;
    const pending = consumeAuthIntent<{ documentId: string; planCode: PurchasePlanCode }>("score-upgrade");
    if (pending?.documentId === documentId && isPurchasePlanCode(pending.planCode)) void checkout(pending.planCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  useEffect(() => {
    const element = dialog.current;
    const focus = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    return () => { element?.close(); document.body.style.overflow = overflow; if (focus instanceof HTMLElement && focus.isConnected) focus.focus({ preventScroll: true }); };
  }, []);

  async function checkout(planCode: PurchasePlanCode) {
    if (lock.current) return;
    const billingKind = planCode === SINGLE_SCORE_PASS.code ? "one_time" : "subscription";
    const params = new URLSearchParams(fallback.split("?")[1]);
    params.set("plan", planCode); params.set("billing", billingKind); params.set("continue", "1");
    const selectedFallback = `/checkout?${params}`;
    const token = getStoredToken();
    if (!token) {
      saveAuthIntent("score-upgrade", { documentId, planCode });
      signIn("login", () => { clearAuthIntent("score-upgrade"); void checkout(planCode); }, { beforeRedirect: async () => {
        if (!(await prepareCheckout())) throw new Error("Checkout preparation failed");
        const context = checkoutReturnContext(returnTo, action);
        params.set("next", context.returnPath); params.set("returnState", JSON.stringify(context.returnState));
        saveAuthIntent("navigation", `/checkout?${params}`);
        clearAuthIntent("score-upgrade");
      } });
      return;
    }
    lock.current = true; setLoading(planCode); setError(null); setRecoveryOrders([]);
    let navigating = false;
    try {
      if (!(await prepareCheckout())) { setError(copy.continueFailed); return; }
      const context = checkoutReturnContext(returnTo, action);
      const result = await lookupAndStartCheckout({ provider: "stripe", billingKind, locale, planCode, passMode: topUp ? "top_up" : undefined, targetDocumentId: documentId, intendedAction: action, ...context }, token, undefined, undefined, true);
      if (!result.ok) {
        if (result.status === 401) { navigating = true; window.location.assign(selectedFallback); return; }
        if (result.data?.code === "CHECKOUT_RECOVERY_REQUIRED") { setError(getCheckoutReturnCopy(locale).recover); setRecoveryOrders(result.data.recoveryOrders ?? []); return; }
        setError(result.error); return;
      }
      if (!/^(https?:\/\/|\/checkout\/success\?)/u.test(result.data?.url ?? "")) { setError(copy.continueFailed); return; }
      saveCheckoutReturn(result.data.orderId, context.returnPath, selectedFallback);
      navigating = true; window.location.assign(result.data.url);
    } catch { setError(copy.continueFailed); }
    finally { if (!navigating) { lock.current = false; setLoading(null); } }
  }

  return <dialog data-checkout-control ref={dialog} className={styles.dialog} aria-labelledby="score-upgrade-title" aria-describedby="score-upgrade-body" onCancel={event => { event.preventDefault(); if (!loading) onClose(); }} onClick={event => { if (event.target === event.currentTarget && !loading) onClose(); }}>
    <div className="stack-lg">
      <div className={styles.heading}><h2 id="score-upgrade-title" className="card-title">{scoreTitle ? `${wb.done} · ${scoreTitle}` : copy.title}</h2><button type="button" className="button button-tertiary" disabled={Boolean(loading)} onClick={onClose} aria-label={copy.close}>×</button></div>
      <div id="score-upgrade-body"><PostRecognitionValue locale={locale} freeUsed={freeUsed} busy={Boolean(loading)} preview={<RecognizedScorePreview documentId={documentId} onLoaded={(title, used) => { setScoreTitle(title); setFreeUsed(used); }} />} onPurchase={plan => void checkout(plan)} onLater={onClose} /></div>
      {error ? <p className="form-status error" role="alert">{error}</p> : null}
      {recoveryOrders.map(order => <a key={order.id} className="button button-secondary" href={order.checkoutUrl || `/checkout/success?${new URLSearchParams({ order_id: order.id, provider: order.provider, ...(order.token ? { token: order.token } : {}) })}`}>{getCheckoutReturnCopy(locale).recover} · {order.id.slice(-8)}</a>)}
      <Link href={fallback} className="micro-copy">{copy.fallback}</Link>
    </div>
  </dialog>;
}
