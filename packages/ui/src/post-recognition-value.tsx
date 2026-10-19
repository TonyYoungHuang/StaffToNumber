"use client";
import { useId, useState, type ReactNode } from "react";
import type { SupportedLocale } from "@score/i18n";
import { workbenchCopy } from "./workbench-copy";

export type WorkbenchPlan = "single-score" | "starter-monthly" | "converter-pro-monthly";
export function PostRecognitionValue({ locale, preview, freeUsed, onPurchase, onLater, busy = false, lead }: {
  locale: SupportedLocale; preview: ReactNode; freeUsed: boolean; onPurchase: (plan: WorkbenchPlan) => void;
  onLater: () => void; busy?: boolean; lead?: string;
}) {
  const copy = workbenchCopy[locale];
  const name = useId();
  const [plan, setPlan] = useState<WorkbenchPlan>("single-score");
  const plans = [
    { code: "single-score" as const, title: copy.pass, price: "$2.99", line: copy.passLine, body: copy.passBody },
    { code: "starter-monthly" as const, title: "Starter", price: "$7.99", line: copy.credits.replace("{n}", "50"), body: copy.starter },
    { code: "converter-pro-monthly" as const, title: "Pro", price: "$14.99", line: copy.credits.replace("{n}", "200"), body: copy.pro },
  ];
  return <div data-post-recognition-value>
    <p className="body-copy">{lead ?? (freeUsed ? copy.lead : copy.paidLead)}</p>
    <div className="wb-value-top">
      <div className="wb-value-preview">{preview}</div>
      <div className="wb-value-panels">
        <section className="wb-free"><div className="wb-free-heading"><strong>{copy.available}</strong>{freeUsed ? <small>{copy.used}</small> : null}</div><div className="wb-free-chips">{copy.chips.map(chip => <span key={chip}>{chip}</span>)}</div></section>
        <section className="wb-unlock"><h3>{copy.unlock}</h3><ul>{copy.benefits.map(benefit => <li key={benefit}>{benefit}</li>)}</ul></section>
      </div>
    </div>
    <fieldset className="wb-plans" disabled={busy}><legend>{copy.plans}</legend>{plans.map(option => <label className="wb-plan" key={option.code}>
      <input type="radio" name={name} value={option.code} checked={plan === option.code} onChange={() => setPlan(option.code)} />
      <span className="wb-plan-content"><span className="wb-plan-title"><strong>{option.title}</strong><span className="wb-plan-price">{option.price}{option.code !== "single-score" ? <small>{copy.month}</small> : null}</span></span><p>{option.line}</p><small>{option.body}</small></span>
    </label>)}</fieldset>
    <p className="wb-value-note">{copy.note}</p>
    <div className="wb-value-actions"><button type="button" className="button button-primary" disabled={busy} onClick={() => onPurchase(plan)}>{copy.buy} · {plans.find(option => option.code === plan)!.price}</button><button type="button" className="wb-value-later" disabled={busy} onClick={onLater}>{copy.later}</button></div>
  </div>;
}
