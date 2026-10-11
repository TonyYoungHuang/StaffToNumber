"use client";

import type { SupportedLocale } from "@score/i18n";
import { getSingleScorePassCopy } from "@score/shared";
import { getPricingIntroCopy } from "../lib/pricing-body-copy";
import { pricingFacts } from "../lib/pricing-facts";
import { getAppStartConversionUrl } from "../lib/site";
import { localizePublicHref } from "../lib/locale-routing";
import { usePurchaseFlow } from "./PurchaseFlowProvider";
import styles from "./PricingBody.module.css";

export function PricingIntro({ locale }: { locale: SupportedLocale }) {
  const copy = getPricingIntroCopy(locale);
  const pass = getSingleScorePassCopy(locale);
  const flow = usePurchaseFlow();
  return <div className={styles.intro} data-pricing-intro>
    <div className={styles.choices}>
      <div className={styles.choice}>
        <h2>{copy.freeTitle}</h2>
        <a className="public-button primary" data-pricing-free href={getAppStartConversionUrl(locale)}>{copy.freeCta}</a>
      </div>
      <div className={styles.choice}>
        <h2>{copy.passTitle}</h2>
        <a className="public-button secondary" data-pricing-pass aria-disabled={flow.busy}
          href={localizePublicHref("/pricing?plan=single-score&billing=one_time&provider=stripe", locale)}
          onClick={event => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            if (flow.busy) return;
            flow.purchase({ planCode: "single-score", billingKind: "one_time", provider: "stripe", name: pass.name, cycle: pass.once, price: `US$${pricingFacts.oneScorePassPriceUsd.toFixed(2)}` });
          }}>{flow.busy && flow.selected?.planCode === "single-score" ? flow.copy.loading : copy.passCta}</a>
      </div>
    </div>
    <div className={styles.details}>
      <ul className={styles.notes}>{copy.notes.map(note => <li key={note}>{note}</li>)}</ul>
      <p>{copy.freeDescription}</p>
      <p>{copy.passDescription}</p>
    </div>
    <p className={styles.comparison}>{copy.comparisonNote}</p>
  </div>;
}
