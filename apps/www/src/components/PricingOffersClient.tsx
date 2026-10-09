"use client";

import { useEffect, useState } from "react";
import type { SupportedLocale } from "@score/i18n";
import { CreditPlanGrid, type CreditPlanCardLabels } from "@score/ui";
import type { CheckoutBillingKind, PaymentProvider, PricingPlanDisplay } from "@score/shared";
import { readPurchaseSelection } from "../lib/purchase-flow";
import { PurchasePlanCard } from "./PurchasePlanCard";
import { usePurchaseFlow } from "./PurchaseFlowProvider";
import { SingleScoreOffer } from "./SingleScoreOffer";
import styles from "./PurchaseFlow.module.css";

export function PricingOffersClient({ locale, plans, labels, purchase }: {
  locale: SupportedLocale;
  plans: Record<CheckoutBillingKind, readonly PricingPlanDisplay[]>;
  labels: CreditPlanCardLabels;
  purchase: { label: string; subscription: string; oneTime: string; subscriptionNote: string; oneTimeNote: string };
}) {
  const [kind, setKind] = useState<CheckoutBillingKind>("subscription");
  const [provider, setProvider] = useState<PaymentProvider>("stripe");
  const flow = usePurchaseFlow();
  const paddleAvailable = (process.env.NEXT_PUBLIC_PAYMENT_PROVIDERS ?? "stripe,paddle").split(",").some(value => value.trim() === "paddle");
  useEffect(() => {
    const selection = readPurchaseSelection(window.location.search);
    if (selection) { setKind(selection.billingKind); setProvider(paddleAvailable ? selection.provider : "stripe"); }
    else if (new URLSearchParams(window.location.search).get("billing") === "one_time") setKind("one_time");
  }, [paddleAvailable]);

  function changeOptions(billingKind: CheckoutBillingKind, paymentProvider: PaymentProvider) {
    setKind(billingKind); setProvider(paymentProvider);
    const planCode = flow.selected?.planCode && flow.selected.planCode !== "single-score" ? flow.selected.planCode : "starter-monthly";
    flow.select({ planCode, billingKind, provider: paymentProvider });
  }

  return <>
    <div className={styles.controls}>
      <div className={styles.tabs} role="group" aria-label={purchase.label}>
        {(["subscription", "one_time"] as const).map(value => <button key={value} type="button" aria-pressed={kind === value} disabled={flow.busy}
          onClick={() => changeOptions(value, "stripe")}>{value === "subscription" ? purchase.subscription : purchase.oneTime}</button>)}
      </div>
      <p>{kind === "subscription" ? purchase.subscriptionNote : purchase.oneTimeNote}</p>
      {kind === "subscription" && paddleAvailable ? <details className={styles.paymentOptions}>
        <summary>{flow.copy.paymentOptions} · {provider === "stripe" ? "Stripe" : "Paddle"}</summary>
        <label>{flow.copy.paymentOptions}<select aria-label={flow.copy.paymentOptions} value={provider} disabled={flow.busy} onChange={event => changeOptions(kind, event.target.value as PaymentProvider)}><option value="stripe">Stripe</option><option value="paddle">Paddle</option></select></label>
      </details> : null}
    </div>
    <CreditPlanGrid label={purchase.label}>
      <SingleScoreOffer locale={locale} labels={labels} />
      {plans[kind].map(plan => <PurchasePlanCard key={`${kind}:${plan.code}`} plan={plan} labels={labels} billingKind={kind} provider={provider} />)}
    </CreditPlanGrid>
  </>;
}
