import type { SupportedLocale } from "@score/i18n";
import { getCreditGuideCopy } from "../lib/pricing-body-copy";
import styles from "./PricingBody.module.css";

export function PricingCreditGuide({ locale }: { locale: SupportedLocale }) {
  const copy = getCreditGuideCopy(locale);
  return <section className={`surface-panel stack-lg ${styles.guide}`} data-credit-guide aria-labelledby="credit-guide-title">
    <h2 className="section-title" id="credit-guide-title">{copy.title}</h2>
    <p className="body-copy">{copy.description}</p>
    <table className={styles.costs}>
      <caption className={styles.caption}>{copy.title}</caption>
      <colgroup><col className={styles.operationColumn} /><col className={styles.costColumn} /><col /></colgroup>
      <thead><tr>{copy.columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
      <tbody>{copy.rows.map(row => <tr key={row.operation}><th scope="row">{row.operation}</th><td>{row.cost}</td><td>{row.detail}</td></tr>)}</tbody>
    </table>
    <div className="stack-md"><h3 className="item-title">{copy.examplesTitle}</h3><ul className={styles.examples}>{copy.examples.map(example => <li key={example}>{example}</li>)}</ul></div>
    <div className="stack-md"><h3 className="item-title">{copy.rulesTitle}</h3>{copy.rules.map(rule => <div key={rule.title} className="stack-sm"><h4 className="item-title">{rule.title}</h4><p className="body-copy">{rule.body}</p></div>)}</div>
  </section>;
}
