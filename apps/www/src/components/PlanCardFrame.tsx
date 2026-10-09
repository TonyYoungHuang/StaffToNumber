import type { ReactNode } from "react";
import type { PurchasePlanCode } from "@score/shared";
import styles from "./PlanCardFrame.module.css";

const labels: Record<PurchasePlanCode, string> = {
  "single-score": "ONE SCORE",
  "starter-monthly": "FLEXIBLE",
  "starter-annual": "MOST POPULAR",
  "converter-pro-monthly": "FOR PROFESSIONALS",
  "converter-pro-annual": "HIGH VOLUME",
};

export function PlanCardFrame({ code, children }: { code: PurchasePlanCode; children: ReactNode }) {
  return <div className={styles.frame} data-plan={code} id={code === "single-score" ? "single-score-pass" : undefined}>
    <span className={styles.ribbon} lang="en">{labels[code]}</span>
    {children}
  </div>;
}
