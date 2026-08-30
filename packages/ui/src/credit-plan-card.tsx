import type { ReactNode } from "react";

export type CreditPlanCardData = {
  code: string;
  badge: string;
  name: string;
  cycle: string;
  price: string;
  unitPrice: string;
  credits: string;
  audience: string;
  benefits: readonly string[];
  resources: readonly string[];
  cta: string;
  featured: boolean;
};

export type CreditPlanCardLabels = {
  creditUsage: string;
  includedCapabilities: string;
  benefitsAndResources: string;
};

export function CreditPlanGrid({
  children,
  label,
  selectable = false,
}: {
  children: ReactNode;
  label?: string;
  selectable?: boolean;
}) {
  return (
    <div
      className="score-plan-grid"
      role={selectable ? "radiogroup" : undefined}
      aria-label={label}
    >
      {children}
    </div>
  );
}

export function CreditPlanCard({
  plan,
  isChinese,
  labels,
  selected = false,
  control,
  actionHref,
  actionLabel,
  headingLevel = 2,
}: {
  plan: CreditPlanCardData;
  /** @deprecated Pass localized labels instead. Kept while callers migrate. */
  isChinese?: boolean;
  labels?: CreditPlanCardLabels;
  selected?: boolean;
  control?: ReactNode;
  actionHref?: string;
  actionLabel?: string;
  headingLevel?: 2 | 3;
}) {
  const Wrapper = control ? "label" : "article";
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const SectionHeading = headingLevel === 3 ? "h4" : "h3";
  const label = actionLabel ?? plan.cta;
  const localizedLabels = labels ?? (isChinese
    ? {
        creditUsage: "按实际使用积分计费",
        includedCapabilities: "包含能力",
        benefitsAndResources: "福利与资源",
      }
    : {
        creditUsage: "Credits are deducted only when used",
        includedCapabilities: "Included capabilities",
        benefitsAndResources: "Benefits and resources",
      });
  const className = [
    "score-plan-card",
    plan.featured ? "score-plan-card--featured" : "",
    selected ? "score-plan-card--selected" : "",
    control ? "score-plan-card--selectable" : "",
    actionHref ? "score-plan-card--linked" : "",
  ].filter(Boolean).join(" ");

  const content = (
    <>
      {control}
      <div className="score-plan-card__top">
        <span className="score-plan-card__badge">{plan.badge}</span>
        <span className="score-plan-card__cycle">{plan.cycle}</span>
      </div>
      <div className="score-plan-card__identity">
        <Heading>{plan.name}</Heading>
        <p>{plan.audience}</p>
      </div>
      <div className="score-plan-card__price">
        <p>{plan.price}</p>
        <small>{plan.unitPrice}</small>
      </div>
      <div className="score-plan-card__credits">
        <span aria-hidden="true">⚡</span>
        <div>
          <strong>{plan.credits}</strong>
          <small>{localizedLabels.creditUsage}</small>
        </div>
      </div>
      <span className={`score-plan-card__action ${selected ? "score-plan-card__action--selected" : ""}`}>{label}<span aria-hidden="true">↗</span></span>
      <div className="score-plan-card__section">
        <SectionHeading>{localizedLabels.includedCapabilities}</SectionHeading>
        <ul className="score-plan-card__features">
          {plan.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
        </ul>
      </div>
      <div className="score-plan-card__section score-plan-card__resources">
        <SectionHeading>{localizedLabels.benefitsAndResources}</SectionHeading>
        <ul className="score-plan-card__resource-list">
          {plan.resources.map((resource) => <li key={resource}>{resource}</li>)}
        </ul>
      </div>
    </>
  );

  if (actionHref) {
    return <a className={className} href={actionHref}>{content}</a>;
  }

  return <Wrapper className={className}>{content}</Wrapper>;
}
