"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { APP_ROUTES, SINGLE_SCORE_PASS } from "@score/shared";
import { apiRequest } from "../lib/api";
import { trackFunnelEvent } from "../lib/analytics";
import { getStoredToken, preferredLoginPath } from "../lib/auth-storage";
import { currentWorkPath, saveCheckoutReturn, upgradePath, workReturnPath } from "../lib/flow-return";
import { getOneScoreUpsellCopy, showsSeparateActivationCta } from "../lib/one-score-upsell-copy";
import { checkoutAvailable } from "../lib/release";
import { useAppLocale } from "./AppLocaleProvider";

type CheckoutPayload = { orderId: string; url: string; code?: string };

/**
 * Upsell after a free OMR preview: One Score Pass (one-time, Stripe) is primary,
 * subscription plans are secondary, and zh locales get a separate activation-code CTA.
 * upgrade_click sources: `${source}_one_score` | `${source}_subscription` | `${source}_activation_code`.
 */
export function OneScorePassUpsell({
  source,
  returnTo,
  beforeCheckout,
  onSubscriptionClick,
  showNote = true,
  disabled = false,
}: {
  source: string;
  returnTo?: string;
  /** Runs before checkout or plan navigation (e.g. persist an import draft). Return false to abort. */
  beforeCheckout?: () => Promise<boolean>;
  /** Overrides the default subscription link (caller handles navigation and its own tracking). */
  onSubscriptionClick?: () => void;
  showNote?: boolean;
  disabled?: boolean;
}) {
  const { locale } = useAppLocale();
  const copy = getOneScoreUpsellCopy(locale);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; error: boolean } | null>(null);
  const lock = useRef(false);
  const intent = useRef<string | null>(null);
  const separateActivation = showsSeparateActivationCta(locale);
  const next = () => workReturnPath(returnTo ?? currentWorkPath());
  const activationHref = () => `${APP_ROUTES.activate}?${new URLSearchParams({ next: next() })}`;

  async function buyPass() {
    if (lock.current) return;
    trackFunnelEvent("upgrade_click", { source: `${source}_one_score`, plan_type: "one_score", plan_code: SINGLE_SCORE_PASS.code });
    const token = getStoredToken();
    if (!token) {
      setStatus({ text: copy.signIn, error: true });
      window.location.assign(preferredLoginPath(next()));
      return;
    }
    lock.current = true; setBusy(true); setStatus(null);
    let navigating = false;
    try {
      if (beforeCheckout && !(await beforeCheckout())) return;
      intent.current ??= crypto.randomUUID();
      const result = await apiRequest<CheckoutPayload>("/api/payments/checkout/authenticated", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Idempotency-Key": intent.current },
        body: JSON.stringify({ provider: "stripe", billingKind: "one_time", locale, planCode: SINGLE_SCORE_PASS.code, seatQuantity: 1 }),
      });
      if (!result.ok) {
        const code = (result.data as { code?: string } | undefined)?.code;
        if (result.status === 401) { window.location.assign(preferredLoginPath(next())); return; }
        intent.current = null;
        setStatus({ text: code === "PAYMENT_PROVIDER_BUILDING" ? copy.building : result.error?.trim() || copy.failed, error: code !== "PAYMENT_PROVIDER_BUILDING" });
        return;
      }
      if (!result.data.url) { intent.current = null; setStatus({ text: copy.failed, error: true }); return; }
      trackFunnelEvent("begin_checkout", {
        payment_type: "stripe",
        plan_code: SINGLE_SCORE_PASS.code,
        plan_kind: "individual",
        quantity: 1,
        source: `${source}_one_score`,
        items: [{ item_id: SINGLE_SCORE_PASS.code, item_name: "One Score Pass", item_variant: "one_time", quantity: 1 }],
      });
      saveCheckoutReturn(result.data.orderId, next(), next());
      navigating = true;
      window.location.href = result.data.url;
    } catch {
      intent.current = null;
      setStatus({ text: copy.failed, error: true });
    } finally {
      if (!navigating) { lock.current = false; setBusy(false); }
    }
  }

  const trackSubscription = () => trackFunnelEvent("upgrade_click", { source: `${source}_subscription`, plan_type: "subscription" });
  const trackActivation = () => trackFunnelEvent("upgrade_click", { source: `${source}_activation_code`, plan_type: "activation_code" });

  if (!checkoutAvailable) {
    // Card checkout is off: offer only the honestly labelled activation-code path.
    return <div className="stack-sm" data-one-score-upsell={source}>
      <div className="button-row">
        <Link href={activationHref()} className="button button-primary" onClick={trackActivation}>{copy.activationCta}</Link>
      </div>
      {copy.activationNote ? <p className="micro-copy">{copy.activationNote}</p> : null}
    </div>;
  }

  return <div className="stack-sm" data-one-score-upsell={source}>
    <div className="button-row">
      <button type="button" className="button button-primary" data-plan-type="one_score" disabled={busy || disabled} onClick={() => { void buyPass(); }}>
        {busy ? copy.loading : copy.passCta}
      </button>
      {onSubscriptionClick
        ? <button type="button" className="button button-secondary" data-plan-type="subscription" disabled={busy || disabled} onClick={() => { trackSubscription(); onSubscriptionClick(); }}>{copy.subscriptionCta}</button>
        : <Link href={upgradePath(next())} className="button button-secondary" data-plan-type="subscription" onClick={trackSubscription}>{copy.subscriptionCta}</Link>}
      {separateActivation
        ? <Link href={activationHref()} className="button button-tertiary" data-plan-type="activation_code" onClick={trackActivation}>{copy.activationCta}</Link>
        : null}
    </div>
    {showNote ? <p className="micro-copy">{copy.passNote}</p> : null}
    {separateActivation && copy.activationNote ? <p className="micro-copy">{copy.activationNote}</p> : null}
    {status ? <p className={`form-status ${status.error ? "error" : "success"}`} role={status.error ? "alert" : "status"}>{status.text}</p> : null}
  </div>;
}
