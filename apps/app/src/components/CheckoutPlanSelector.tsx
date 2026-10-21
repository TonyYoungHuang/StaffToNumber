"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatMessage, type SupportedLocale } from "@score/i18n";
import { APP_ROUTES, getPurchaseOptionsCopy, getSingleScorePassCopy, SINGLE_SCORE_PASS, type CheckoutIntendedAction, type CheckoutBillingKind, type PurchasePlanCode, type PricingPlanCode, type PricingPlanDisplay } from "@score/shared";
import { CreditPlanCard, CreditPlanGrid } from "@score/ui";
import { trackFunnelEvent } from "../lib/analytics";
import type { AuthMessageCatalog } from "../lib/auth-messages";
import type { BillingMessageCatalog } from "../lib/billing-messages/types";
import { AppCheckoutClient } from "./AppCheckoutClient";
import { useFlowMessages } from "../lib/flow-messages/client";
import { workReturnPath } from "../lib/flow-return";
import styles from "./AppCheckout.module.css";
import { defaultCheckoutPlan } from "../lib/score-pass-checkout";
import { getScorePassCopy } from "../lib/billing-messages/client";
import type { CheckoutReturnState } from "@score/shared";

type CheckoutCopy = BillingMessageCatalog["checkout"];

export function CheckoutPlanSelector({
  plans,
  locale,
  copy,
  initialPlanCode,
  initialBillingKind = "subscription",
  targetDocumentId,
  intendedAction,
  isTopUp = false,
  returnState,
  continueAfterLogin,
  originalOrderId,
  originalOrderToken,
  authMessages,
  returnTo = "/scores",
}: {
  returnTo?: string;
  targetDocumentId?: string;
  intendedAction?: CheckoutIntendedAction;
  isTopUp?: boolean;
  returnState?: CheckoutReturnState;
  continueAfterLogin?: boolean;
  originalOrderId?: string;
  originalOrderToken?: string;
  plans: readonly PricingPlanDisplay[];
  locale: SupportedLocale;
  copy: CheckoutCopy;
  initialPlanCode?: PurchasePlanCode;
  initialBillingKind?: CheckoutBillingKind;
  authMessages: AuthMessageCatalog["form"];
}) {
  const [selectedPlanCode, setSelectedPlanCode] = useState<PricingPlanCode | PurchasePlanCode>(defaultCheckoutPlan(initialPlanCode));
  const [billingKind, setBillingKind] = useState<CheckoutBillingKind>(initialPlanCode === "converter-pro-lifetime" ? "one_time" : initialBillingKind);
  const [plansOpen, setPlansOpen] = useState(defaultCheckoutPlan(initialPlanCode) !== SINGLE_SCORE_PASS.code);
  const flow = useFlowMessages();
  const purchaseCopy = getPurchaseOptionsCopy(locale);
  const passCopy = getSingleScorePassCopy(locale);
  const scorePassCopy = getScorePassCopy(locale);
  const passPrice = `US$${(SINGLE_SCORE_PASS.amountMinor / 100).toFixed(2)}`;
  const passTitle = targetDocumentId ? formatMessage(isTopUp ? scorePassCopy.topUp : scorePassCopy.newPass, { price: passPrice }) : `${passCopy.name} · ${passPrice}`;
  const displayPlans = billingKind === "subscription" ? plans : plans.map(plan => {
    if (plan.code === "free" || plan.code === "converter-pro-lifetime") return plan;
    const duration = plan.code.endsWith("annual") ? purchaseCopy.year : purchaseCopy.month;
    return { ...plan, cycle: duration, badge: purchaseCopy.oneTime,
      cta: formatMessage(purchaseCopy.buyTemplate, { name: plan.name, duration }),
      resources: [...plan.resources.slice(0, 3), purchaseCopy.oneTimeNote] };
  });
  const selectedPlan = selectedPlanCode === SINGLE_SCORE_PASS.code ? {
    code: SINGLE_SCORE_PASS.code, name: passCopy.name, cycle: passCopy.once, price: passPrice, credits: scorePassCopy.passTarget,
  } : displayPlans.find((plan) => plan.code === selectedPlanCode);
  const selectedBillingKind = (selectedPlanCode === SINGLE_SCORE_PASS.code || selectedPlanCode === "converter-pro-lifetime") ? "one_time" : billingKind;
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
    if (plan.code === "converter-pro-lifetime") setBillingKind("one_time");
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

  function choosePlan(code: PricingPlanCode | PurchasePlanCode) {
    const plan = displayPlans.find(item => item.code === code);
    if (code === SINGLE_SCORE_PASS.code) { setSelectedPlanCode(code); setBillingKind("one_time"); }
    else if (plan) selectPlan(plan);
    else return;
    const url = new URL(window.location.href);
    url.searchParams.set("plan", code);
    url.searchParams.set("billing", (code === SINGLE_SCORE_PASS.code || code === "converter-pro-lifetime") ? "one_time" : billingKind);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }

  if (!selectedPlan) return null;

  return (
    <>
      <Link className="button button-secondary flow-return" href={workReturnPath(returnTo)}>{flow.resume}</Link>
      <section className={styles.plansPanel} aria-labelledby="checkout-plans-title">
        <div className="stack-sm" data-primary-plan={selectedPlanCode}>
          <h2 className={styles.sectionHeading}>{passTitle}</h2>
          <p className="body-copy">{scorePassCopy.passTarget}</p>
          {targetDocumentId ? <p className="helper-copy">{scorePassCopy.sharedCredits}</p> : null}
          <p className="micro-copy">{passCopy.once}</p>
          {selectedPlanCode !== SINGLE_SCORE_PASS.code ? <button type="button" className="button button-secondary" onClick={() => choosePlan(SINGLE_SCORE_PASS.code)}>{passTitle}</button> : null}
        </div>
        <details className="flow-details" open={plansOpen} onToggle={event => setPlansOpen(event.currentTarget.open)}>
          <summary>{purchaseCopy.subscription} · {purchaseCopy.oneTime}</summary>
        <div className={styles.purchaseType}>
          <div className="button-row" role="group" aria-label={purchaseCopy.label}>
            {(["subscription", "one_time"] as const).map(kind => (
              <button type="button" key={kind} aria-pressed={billingKind === kind}
                className={`button ${billingKind === kind ? "button-primary" : "button-secondary"}`}
                onClick={() => {
                  setBillingKind(selectedPlanCode === "converter-pro-lifetime" ? "one_time" : kind);
                  if (selectedPlanCode === SINGLE_SCORE_PASS.code) setSelectedPlanCode("starter-monthly");
                  const url = new URL(window.location.href);
                  if (selectedPlanCode === SINGLE_SCORE_PASS.code) url.searchParams.set("plan", "starter-monthly");
                  url.searchParams.set("billing", selectedPlanCode === "converter-pro-lifetime" ? "one_time" : kind);
                  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
                }}>{kind === "one_time" ? purchaseCopy.oneTime : purchaseCopy.subscription}</button>
            ))}
          </div>
          <p className="body-copy">{selectedPlanCode === "converter-pro-lifetime" ? selectedPlan.credits : billingKind === "one_time" ? purchaseCopy.oneTimeNote : purchaseCopy.subscriptionNote}</p>
          <Link href={`${APP_ROUTES.billing}#subscriptions`} className="button button-secondary">{purchaseCopy.manageHint}</Link>
        </div>
        <label className="field-group">
          <span className="field-label">{copy.selector.selectedPlan}</span>
          <select aria-label={copy.selector.selectedPlan} className="field-select" value={selectedPlanCode === SINGLE_SCORE_PASS.code ? "" : selectedPlan.code} onChange={event => choosePlan(event.target.value as PricingPlanCode)}>
            <option value="" disabled>{copy.selector.selectedPlan}</option>
            {displayPlans.map(plan => <option key={plan.code} value={plan.code}>{plan.name} · {plan.cycle} · {plan.price}</option>)}
          </select>
        </label>
        {selectedPlanCode !== SINGLE_SCORE_PASS.code ? <details className="flow-details">
          <summary>{flow.planDetails}</summary>
          <CreditPlanGrid label={copy.selector.plansAria}>
            <CreditPlanCard plan={selectedPlan as PricingPlanDisplay} labels={{ creditUsage: selectedPlan.code === "converter-pro-lifetime" ? (selectedPlan as PricingPlanDisplay).resources[0] : copy.selector.creditUsage, includedCapabilities: copy.selector.includedCapabilities, benefitsAndResources: copy.selector.benefitsAndResources }} />
          </CreditPlanGrid>
        </details> : null}
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
            key={`${selectedBillingKind}:${selectedPlan.code}`}
            returnTo={returnTo}
            targetDocumentId={targetDocumentId}
            intendedAction={intendedAction}
            returnState={returnState}
            isTopUp={isTopUp}
            continueAfterLogin={continueAfterLogin}
            originalOrderId={originalOrderId}
            originalOrderToken={originalOrderToken}
            billingKind={selectedBillingKind}
            locale={locale}
            copy={copy.client}
            authMessages={authMessages}
            selectedPlan={{
              code: selectedPlan.code as PurchasePlanCode,
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
