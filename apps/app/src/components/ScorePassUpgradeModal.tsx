"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatMessage, type SupportedLocale } from "@score/i18n";
import { getSingleScorePassCopy, SINGLE_SCORE_PASS, type CheckoutIntendedAction, type PurchasePlanCode } from "@score/shared";
import { apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { saveCheckoutReturn } from "../lib/flow-return";
import { getScoreUpgradePlans, scoreCheckoutPath } from "../lib/score-pass-checkout";
import { getScorePassCopy } from "../lib/billing-messages/client";
import styles from "./ScorePassUpgradeModal.module.css";

type CheckoutResult = { orderId: string; url: string };

export function ScorePassUpgradeModal({ documentId, action, locale, topUp, onClose }: {
  documentId: string; action?: CheckoutIntendedAction; locale: SupportedLocale; topUp: boolean; onClose: () => void;
}) {
  const copy = getScorePassCopy(locale);
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const intent = useRef<{ signature: string; key: string } | null>(null);
  const [loading, setLoading] = useState<PurchasePlanCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fallback = scoreCheckoutPath(documentId, action, topUp);
  const plans = getScoreUpgradePlans(locale);
  const passPrice = `US$${(SINGLE_SCORE_PASS.amountMinor / 100).toFixed(2)}`;

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
    if (!token) { window.location.assign(selectedFallback); return; }
    lock.current = true; setLoading(planCode); setError(null);
    let navigating = false;
    try {
      const signature = JSON.stringify({ documentId, action, planCode });
      if (intent.current?.signature !== signature) intent.current = { signature, key: crypto.randomUUID() };
      const result = await apiRequest<CheckoutResult>("/api/payments/checkout/authenticated", {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Idempotency-Key": intent.current.key },
        body: JSON.stringify({ provider: "stripe", billingKind, locale, planCode, targetDocumentId: documentId, intendedAction: action }),
      });
      if (!result.ok) {
        if (result.status === 401) { navigating = true; window.location.assign(selectedFallback); return; }
        setError(result.error); return;
      }
      if (!/^https?:\/\//u.test(result.data?.url ?? "")) { setError(copy.continueFailed); return; }
      saveCheckoutReturn(result.data.orderId, `/scores/${encodeURIComponent(documentId)}`, selectedFallback);
      navigating = true; window.location.assign(result.data.url);
    } catch { setError(copy.continueFailed); }
    finally { if (!navigating) { lock.current = false; setLoading(null); } }
  }

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="score-upgrade-title" aria-describedby="score-upgrade-body" onCancel={event => { event.preventDefault(); if (!loading) onClose(); }} onClick={event => { if (event.target === event.currentTarget && !loading) onClose(); }}>
    <div className="stack-lg">
      <div className={styles.heading}><h2 id="score-upgrade-title" className="card-title">{copy.title}</h2><button type="button" className="button button-tertiary" disabled={Boolean(loading)} onClick={onClose}>{copy.close}</button></div>
      <p id="score-upgrade-body">{copy.body}</p><p className="helper-copy">{copy.sharedCredits}</p>
      {(["starter-monthly", "converter-pro-monthly"] as const).map(code => {
        const plan = plans.find(item => item.code === code)!;
        return <div key={code} className={`${styles.option} ${code === "starter-monthly" ? styles.recommended : ""}`}>
          {code === "starter-monthly" ? <strong className={styles.badge}>{copy.recommended}</strong> : null}
          <strong>{plan.name} · US{plan.price}/{copy.monthly}</strong>
          <p>{code === "starter-monthly" ? copy.starterBody : copy.converterBody}</p>
          <button type="button" className={`button ${code === "starter-monthly" ? "button-primary" : "button-secondary"}`} disabled={Boolean(loading)} onClick={() => void checkout(code)}>{loading === code ? copy.preparing : copy.continuePayment}</button>
        </div>;
      })}
      <div className={styles.option}><strong>{formatMessage(topUp ? copy.topUp : copy.newPass, { price: passPrice })}</strong><p>{copy.passTarget}</p><p>{topUp ? formatMessage(copy.topUpBody, { credits: SINGLE_SCORE_PASS.credits }) : getSingleScorePassCopy(locale).benefits[1]}</p><button type="button" className="button button-secondary" disabled={Boolean(loading)} onClick={() => void checkout(SINGLE_SCORE_PASS.code)}>{loading === SINGLE_SCORE_PASS.code ? copy.preparing : copy.continuePayment}</button></div>
      {error ? <p className="form-status error" role="alert">{error}</p> : null}
      <Link href={fallback} className="micro-copy">{copy.fallback}</Link>
    </div>
  </dialog>;
}
