"use client";

import type { SupportedLocale } from "@score/i18n";
import { getSingleScorePassCopy, getPurchaseOptionsCopy } from "@score/shared";
import { CreditPlanCard, type CreditPlanCardLabels } from "@score/ui";
import { usePurchaseFlow } from "./PurchaseFlowProvider";
import { PlanCardFrame } from "./PlanCardFrame";
import { getHomePresentationCopy } from "../lib/home-presentation";
import { localizePublicHref } from "../lib/locale-routing";
import { getPricingCardCopy } from "../lib/pricing-card-copy";

export function SingleScoreOffer({ locale, labels }: { locale: SupportedLocale; labels: CreditPlanCardLabels }) {
  const copy = getSingleScorePassCopy(locale);
  const card = getPricingCardCopy(locale);
  const flow = usePurchaseFlow();
  const selected = flow.selected?.planCode === "single-score";
  const action = copy.name;
  return <PlanCardFrame code="single-score"><CreditPlanCard headingLevel={3} labels={labels}
    plan={{ code: "single-score", name: copy.name, badge: copy.once, cycle: getPurchaseOptionsCopy(locale).oneTime,
      price: "$2.99", unitPrice: copy.once, audience: card.pass, credits: getHomePresentationCopy(locale).credits,
      benefits: card.benefits, resources: [card.passTerms, card.limits], cta: action, featured: true }}
    selected={selected} busy={flow.busy} actionLabel={flow.busy && selected ? flow.copy.loading : action}
    actionHref={localizePublicHref("/pricing?plan=single-score&billing=one_time&provider=stripe", locale)}
    onActionClick={event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      flow.purchase({ planCode: "single-score", billingKind: "one_time", provider: "stripe", name: copy.name, cycle: copy.once, price: "US$2.99" });
    }} /></PlanCardFrame>;
}
