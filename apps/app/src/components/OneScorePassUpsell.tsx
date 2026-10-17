"use client";

import Link from "next/link";
import { RecognitionPurchaseActions } from "@score/ui";
import { useFlowMessages } from "../lib/flow-messages/client";
import { useEffect, useRef, useState } from "react";
import { SINGLE_SCORE_PASS, type CheckoutIntendedAction, type CheckoutReturnState } from "@score/shared";
import { apiRequest } from "../lib/api";
import { trackFunnelEvent } from "../lib/analytics";
import { getStoredToken } from "../lib/auth-storage";
import { currentWorkPath, saveCheckoutReturn, upgradePath, workReturnPath } from "../lib/flow-return";
import { getOneScoreUpsellCopy } from "../lib/one-score-upsell-copy";
import { checkoutAvailable } from "../lib/release";
import { useAppLocale } from "./AppLocaleProvider";
import { checkoutReturnContext, lookupAndStartCheckout, prepareCheckout } from "../lib/checkout-flow";
import { useAppAuthModal } from "./AppAuthModal";
import { clearAuthIntent, consumeAuthIntent, saveAuthIntent } from "../lib/auth-intent";

type CheckoutPayload = { orderId: string; url: string; code?: string };

/**
 * Upsell after a free OMR preview: One Score Pass (one-time, Stripe) is primary,
 * subscription plans are secondary.
 * upgrade_click sources: `${source}_one_score` | `${source}_subscription`.
 */
export function OneScorePassUpsell({
  source,
  starterPrimary = false,
  returnTo,
  targetDocumentId,
  beforeCheckout,
  onSubscriptionClick,
  showNote = true,
  disabled = false,
}: {
  source: string;
  starterPrimary?: boolean;
  returnTo?: string;
  targetDocumentId?: string;
  /** Runs before checkout or plan navigation (e.g. persist an import draft). Return false to abort. */
  beforeCheckout?: () => Promise<boolean | { targetDocumentId: string; intendedAction?: CheckoutIntendedAction; returnPath?: string; returnState?: CheckoutReturnState }>;
  /** Overrides the default subscription link (caller handles navigation and its own tracking). */
  onSubscriptionClick?: () => void;
  showNote?: boolean;
  disabled?: boolean;
}) {
  const signIn = useAppAuthModal();
  const { locale } = useAppLocale();
  const copy = getOneScoreUpsellCopy(locale);
  const experience = useFlowMessages().recognitionExperience;
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; error: boolean } | null>(null);
  const lock = useRef(false);
  const intent = useRef<string | null>(null);
  useEffect(() => {
    if (!getStoredToken()) return;
    const pending = consumeAuthIntent<{ source: string; targetDocumentId?: string }>("one-score-pass");
    if (pending?.source === source && pending.targetDocumentId === targetDocumentId) void buyPass();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, targetDocumentId]);
  const next = () => workReturnPath(returnTo ?? currentWorkPath());
  const targetQuery = targetDocumentId ? `&targetDocumentId=${encodeURIComponent(targetDocumentId)}` : "";
  const passCheckoutHref = (prepared?: { targetDocumentId: string; intendedAction?: CheckoutIntendedAction; returnPath?: string; returnState?: CheckoutReturnState }) => {
    const query = new URLSearchParams({ next: prepared?.returnPath ?? next(), plan: "single-score", billing: "one_time", continue: "1" });
    if (prepared?.targetDocumentId ?? targetDocumentId) query.set("targetDocumentId", (prepared?.targetDocumentId ?? targetDocumentId)!);
    if (prepared?.intendedAction) query.set("intendedAction", JSON.stringify(prepared.intendedAction));
    if (prepared?.returnState) query.set("returnState", JSON.stringify(prepared.returnState));
    return `/checkout?${query}`;
  };

  async function buyPass() {
    if (lock.current) return;
    if (!getStoredToken()) {
      saveAuthIntent("one-score-pass", { source, targetDocumentId });
      signIn("login", () => { clearAuthIntent("one-score-pass"); void buyPass(); }, { beforeRedirect: async () => {
        const preparation = beforeCheckout ? await beforeCheckout() : true;
        if (!preparation || !(await prepareCheckout())) throw new Error("Checkout preparation failed");
        const prepared = typeof preparation === "object" ? preparation : undefined;
        saveAuthIntent("navigation", passCheckoutHref(prepared));
        clearAuthIntent("one-score-pass");
      } });
      return;
    }
    trackFunnelEvent("upgrade_click", { source: `${source}_one_score`, plan_type: "one_score", plan_code: SINGLE_SCORE_PASS.code });
    lock.current = true; setBusy(true); setStatus(null);
    let navigating = false;
    try {
      const preparation = beforeCheckout ? await beforeCheckout() : true;
      if (!preparation) return;
      const prepared = typeof preparation === "object" ? preparation : undefined;
      if (!(await prepareCheckout())) { setStatus({ text: copy.failed, error: true }); return; }
      const token = getStoredToken();
      if (!token) { navigating = true; window.location.assign(passCheckoutHref(prepared)); return; }
      const context = checkoutReturnContext(prepared?.returnPath ?? next(), prepared?.intendedAction, prepared?.returnState);
      const result = await lookupAndStartCheckout({ provider: "stripe", billingKind: "one_time", locale, planCode: SINGLE_SCORE_PASS.code, seatQuantity: 1, targetDocumentId: prepared?.targetDocumentId ?? targetDocumentId, intendedAction: prepared?.intendedAction, ...context }, token, undefined, undefined, true);
      if (!result.ok) {
        const code = (result.data as { code?: string } | undefined)?.code;
        if (result.status === 401) { navigating = true; window.location.assign(passCheckoutHref(prepared)); return; }
        setStatus({ text: code === "PAYMENT_PROVIDER_BUILDING" ? copy.building : result.error?.trim() || copy.failed, error: code !== "PAYMENT_PROVIDER_BUILDING" });
        return;
      }
      if (!result.data.url) { setStatus({ text: copy.failed, error: true }); return; }
      trackFunnelEvent("begin_checkout", {
        payment_type: "stripe",
        plan_code: SINGLE_SCORE_PASS.code,
        plan_kind: "individual",
        quantity: 1,
        source: `${source}_one_score`,
        items: [{ item_id: SINGLE_SCORE_PASS.code, item_name: "One Score Pass", item_variant: "one_time", quantity: 1 }],
      });
      saveCheckoutReturn(result.data.orderId, context.returnPath, passCheckoutHref(prepared));
      navigating = true;
      window.location.href = result.data.url;
    } catch {
      setStatus({ text: copy.failed, error: true });
    } finally {
      if (!navigating) { lock.current = false; setBusy(false); }
    }
  }

  const trackSubscription = () => trackFunnelEvent("upgrade_click", { source: `${source}_subscription`, plan_type: "subscription" });
  return <div className="stack-sm" data-checkout-control data-one-score-upsell={source}>
    {starterPrimary ? <RecognitionPurchaseActions messages={experience} disabled={busy || disabled || !checkoutAvailable} onStarter={() => { trackSubscription(); if (onSubscriptionClick) onSubscriptionClick(); else window.location.assign(`${upgradePath(next())}&plan=starter-monthly&billing=subscription${targetQuery}`); }} onPass={() => { void buyPass(); }} /> : <div className="button-row" data-upsell-primary="one_score">
      <button type="button" className="button button-primary" data-plan-type="one_score" disabled={busy || disabled || !checkoutAvailable} onClick={() => { void buyPass(); }}>
        {busy ? copy.loading : copy.passCta}
      </button>
      {onSubscriptionClick
        ? <button type="button" className="button button-secondary" data-plan-type="subscription" disabled={busy || disabled} onClick={() => { trackSubscription(); onSubscriptionClick(); }}>{copy.subscriptionCta}</button>
        : <Link href={`${upgradePath(next())}&plan=starter-monthly&billing=subscription${targetQuery}`} className="button button-secondary" data-plan-type="subscription" onClick={trackSubscription}>{copy.subscriptionCta}</Link>}
    </div>}
    {showNote ? <p className="micro-copy">{copy.passNote}</p> : null}
    {!checkoutAvailable ? <p className="micro-copy" role="status">{copy.building}</p> : null}
    {status ? <p className={`form-status ${status.error ? "error" : "success"}`} role={status.error ? "alert" : "status"}>{status.text}</p> : null}
  </div>;
}
