"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatMessage, type SupportedLocale } from "@score/i18n";
import { APP_ROUTES, getPurchaseOptionsCopy, type CheckoutBillingKind, type CheckoutPlanCode, type PricingPlanCode, type PricingPlanDisplay } from "@score/shared";
import { CreditPlanCard, CreditPlanGrid } from "@score/ui";
import { trackFunnelEvent } from "../lib/analytics";
import type { AuthMessageCatalog } from "../lib/auth-messages";
import type { BillingMessageCatalog } from "../lib/billing-messages/types";
import { AppCheckoutClient } from "./AppCheckoutClient";
import { useFlowMessages } from "../lib/flow-messages/client";
import { workReturnPath } from "../lib/flow-return";
import styles from "./AppCheckout.module.css";

type CheckoutCopy = BillingMessageCatalog["checkout"];

export function CheckoutPlanSelector({
  plans,
  locale,
  copy,
  initialPlanCode,
  initialBillingKind = "subscription",
  authMessages,
  returnTo = "/scores",
}: {
  returnTo?: string;
  plans: readonly PricingPlanDisplay[];
  locale: SupportedLocale;
  copy: CheckoutCopy;
  initialPlanCode?: CheckoutPlanCode;
  initialBillingKind?: CheckoutBillingKind;
  authMessages: AuthMessageCatalog["form"];
}) {
  // Prefer the plan from the URL; otherwise lowest-commitment paid plan (starter-monthly), never featured annual.
  const defaultPlanCode = initialPlanCode
    ?? plans.find((plan) => plan.code === "starter-monthly")?.code
    ?? plans.find((plan) => plan.code !== "free")?.code
    ?? plans[0]?.code;
  const [selectedPlanCode, setSelectedPlanCode] = useState<PricingPlanCode | undefined>(defaultPlanCode);
  const [billingKind, setBillingKind] = useState<CheckoutBillingKind>(initialBillingKind);
  const flow = useFlowMessages();
  const purchaseCopy = getPurchaseOptionsCopy(locale);
  const displayPlans = billingKind === "subscription" ? plans : plans.map(plan => {
    if (plan.code === "free") return plan;
    const duration = plan.code.endsWith("annual") ? purchaseCopy.year : purchaseCopy.month;
    return { ...plan, cycle: duration, badge: purchaseCopy.oneTime,
      cta: formatMessage(purchaseCopy.buyTemplate, { name: plan.name, duration }),
      resources: [...plan.resources.slice(0, 3), purchaseCopy.oneTimeNote] };
  });
  const selectedPlan = displayPlans.find((plan) => plan.code === selectedPlanCode) ?? displayPlans[0];
  const planListTracked = useRef(false);

  useEffect(() => {
    if (planListTracked.current) return;
    planListTracked.current = true;
    trackFunnelEvent("view_item_list", {
      item_list_id: "credit_plans",
      item_list_name: "ScoreTransposer credit plans",
      items: plans.map((plan) => ({
        item_id: plan.code,
        item_name: plan.name,
        item_variant: plan.cycle,
      })),
    });
  }, [plans]);

  function selectPlan(plan: PricingPlanDisplay) {
    setSelectedPlanCode(plan.code);
    trackFunnelEvent("select_item", {
      item_list_id: "credit_plans",
      item_list_name: "ScoreTransposer credit plans",
      items: [{
        item_id: plan.code,
        item_name: plan.name,
        item_variant: plan.cycle,
      }],
    });
  }

  function choosePlan(code: string) {
    const plan = displayPlans.find(item => item.code === code);
    if (!plan) return;
    selectPlan(plan);
    const url = new URL(window.location.href);
    url.searchParams.set("plan", plan.code);
    url.searchParams.set("billing", billingKind);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }

  if (!selectedPlan) return null;

  return (
    <>
      <Link className="button button-secondary flow-return" href={workReturnPath(returnTo)}>{flow.resume}</Link>
      <section className={styles.plansPanel} aria-labelledby="checkout-plans-title">
        <div className={styles.purchaseType}>
          <div className="button-row" role="group" aria-label={purchaseCopy.label}>
            {(["subscription", "one_time"] as const).map(kind => (
              <button type="button" key={kind} aria-pressed={billingKind === kind}
                className={`button ${billingKind === kind ? "button-primary" : "button-secondary"}`}
                onClick={() => {
                  setBillingKind(kind);
                  const url = new URL(window.location.href);
                  url.searchParams.set("billing", kind);
                  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
                }}>{kind === "one_time" ? purchaseCopy.oneTime : purchaseCopy.subscription}</button>
            ))}
          </div>
          <p className="body-copy">{billingKind === "one_time" ? purchaseCopy.oneTimeNote : purchaseCopy.subscriptionNote}</p>
          <Link href={`${APP_ROUTES.billing}#subscriptions`} className="button button-secondary">{purchaseCopy.manageHint}</Link>
        </div>
        <label className="field-group">
          <span className="field-label">{copy.selector.selectedPlan}</span>
          <select aria-label={copy.selector.selectedPlan} className="field-select" value={selectedPlan.code} onChange={event => choosePlan(event.target.value)}>
            {displayPlans.map(plan => <option key={plan.code} value={plan.code}>{plan.name} · {plan.cycle} · {plan.price}</option>)}
          </select>
        </label>
        <details className="flow-details">
          <summary>{flow.planDetails}</summary>
          <CreditPlanGrid label={copy.selector.plansAria}>
            <CreditPlanCard plan={selectedPlan} labels={{ creditUsage: copy.selector.creditUsage, includedCapabilities: copy.selector.includedCapabilities, benefitsAndResources: copy.selector.benefitsAndResources }} />
          </CreditPlanGrid>
        </details>

        <div className={styles.selectedPlanBar} role="status" aria-live="polite">
          <span>{copy.selector.selectedPlan}</span>
          <strong>{selectedPlan.name} · {selectedPlan.cycle}</strong>
          <span>{selectedPlan.price}</span>
          <span>{selectedPlan.credits}</span>
        </div>
        <p className={styles.planNote}>{copy.page.planNote}</p>
      </section>

      <div className={styles.checkoutActionWrap}>
        {selectedPlan.code === "free" ? (
          <section id="checkout-action" className={`${styles.paymentPanel} stack-lg`} aria-labelledby="free-plan-title">
            <div className="stack-sm">
              <p className="eyebrow">{copy.selector.freeEyebrow}</p>
              <h2 id="free-plan-title" className={styles.sectionHeading}>{copy.selector.freeTitle}</h2>
              <p className="body-copy large">{copy.selector.freeBody}</p>
            </div>
            <div className="button-row">
              <Link href={workReturnPath(returnTo)} className="button button-primary">
                {copy.selector.freeCta}
              </Link>
            </div>
          </section>
        ) : (
          <AppCheckoutClient
            key={billingKind}
            returnTo={returnTo}
            billingKind={billingKind}
            locale={locale}
            copy={copy.client}
            authMessages={authMessages}
            selectedPlan={{
              code: selectedPlan.code as CheckoutPlanCode,
              name: selectedPlan.name,
              cycle: selectedPlan.cycle,
              price: selectedPlan.price,
              credits: selectedPlan.credits,
            }}
          />
        )}
      </div>
    </>
  );
}
