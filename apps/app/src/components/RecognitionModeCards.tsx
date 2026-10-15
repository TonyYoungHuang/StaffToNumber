"use client";

import { useFlowMessages } from "../lib/flow-messages/client";

import { formatMessage, formatNumber } from "@score/i18n";
import { ProcessingProgress } from "@score/ui";
import { useAppLocale } from "./AppLocaleProvider";
import type { RecognitionMode, RecognitionOptions } from "../lib/recognition-options";
import { recognitionOption } from "../lib/recognition-options";
import styles from "./ScoreEnsembleWorkspace.module.css";

export function RecognitionModeCards({ options, selected, loading, error, onRetry, onSelect, disabled = false }: {
  options: RecognitionOptions | null;
  selected?: RecognitionMode;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelect: (mode: RecognitionMode) => void;
  disabled?: boolean;
}) {
  const { locale } = useAppLocale();
  const flow = useFlowMessages();
  const copy = flow.preflight;
  return <section className="stack-md" aria-label={copy.chooseMode}>
    <h2 className="card-title">{copy.chooseMode}</h2>
    <div className={styles.modeGrid} role="radiogroup" aria-label={copy.chooseMode}>
      {(["simple", "complex"] as const).map(mode => {
        const quote = recognitionOption(options, mode);
        const title = mode === "simple" ? copy.simpleTitle : copy.complexTitle;
        return <article key={mode} className={`${styles.modeCard} ${selected === mode ? styles.active : ""}`} data-recognition-mode={mode}>
          <h3>{title}</h3>
          <p className="body-copy">{mode === "simple" ? copy.ordinaryStaves : copy.manyStaves}</p>
          <p className={styles.price} data-credit-cost={quote?.creditCost}>{quote ? formatMessage(copy.price, { credits: formatNumber(quote.creditCost, locale) }) : error ? copy.priceFailed : copy.priceLoading}</p>
          <label className={`button button-secondary ${styles.modeSelect}`}>
            <input type="radio" name="score-recognition-mode" value={mode} checked={selected === mode} disabled={disabled} onChange={() => onSelect(mode)} />
            {title}
          </label>
        </article>;
      })}
    </div>
    <ProcessingProgress active={loading} label={copy.priceLoading} error={Boolean(error)} locale={locale} />
    {error ? <div role="alert"><p className="form-status error">{error}</p><button type="button" className="button button-secondary" onClick={onRetry}>{copy.retry}</button></div> : null}
  </section>;
}
