"use client";

import { CreditPlanCard, type CreditPlanCardLabels } from "@score/ui";
import { isCheckoutPlanCode, type CheckoutBillingKind, type PaymentProvider, type PricingPlanDisplay } from "@score/shared";
import { getCheckoutUrl, getSupportUrl, siteConfig } from "../lib/site";
import { purchaseSelectionKey } from "../lib/purchase-flow";
import { useSiteLocale } from "./SiteLocaleProvider";
import { usePurchaseFlow } from "./PurchaseFlowProvider";
import { PlanCardFrame } from "./PlanCardFrame";

export function PurchasePlanCard({ plan, labels, billingKind = "subscription", provider = "stripe" }: {
  plan: PricingPlanDisplay; labels: CreditPlanCardLabels; billingKind?: CheckoutBillingKind; provider?: PaymentProvider;
}) {
  const { locale } = useSiteLocale();
  const flow = usePurchaseFlow();
  if (!isCheckoutPlanCode(plan.code)) return null;
  if (!siteConfig.release.checkoutAvailable) return <CreditPlanCard plan={plan} labels={labels} headingLevel={3} actionHref={getSupportUrl("payment", "pricing", locale)} />;
  const selection = { planCode: plan.code, billingKind, provider };
  const selected = Boolean(flow.selected && purchaseSelectionKey(flow.selected) === purchaseSelectionKey(selection));
  return <PlanCardFrame code={plan.code}><CreditPlanCard plan={plan} labels={labels} headingLevel={3}
    actionHref={`${getCheckoutUrl(locale, plan.code, billingKind)}&provider=${provider}`}
    selected={selected} busy={flow.busy}
    actionLabel={flow.busy && selected ? flow.copy.loading : plan.cta}
    onActionClick={event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      flow.purchase({ ...selection, name: plan.name, cycle: plan.cycle, price: plan.price });
    }} /></PlanCardFrame>;
}
