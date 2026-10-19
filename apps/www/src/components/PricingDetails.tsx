import type { ReactNode } from "react";
import type { SupportedLocale } from "@score/i18n";
import { getPricingCardCopy } from "../lib/pricing-card-copy";
import styles from "./PricingDetails.module.css";

export function PricingDetails({ locale, children }: { locale: SupportedLocale; children: ReactNode }) {
  return <details className={styles.details}>
    <summary>{getPricingCardCopy(locale).details}</summary>
    <div className="page-stack">{children}</div>
  </details>;
}
