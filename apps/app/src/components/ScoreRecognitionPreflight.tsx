"use client";

import { formatMessage, formatNumber, getScorePreflightMessages, getScoreRecognitionSupportMessage, getScoreProcessingMessages } from "@score/i18n";
import type { ScoreRecognitionPreflightState } from "../lib/score-recognition-preflight";
import { useAppLocale } from "./AppLocaleProvider";

export function ScoreRecognitionPreflight({ state, onRetry, compact = false }: { state: ScoreRecognitionPreflightState; onRetry: () => void; compact?: boolean }) {
  const { locale } = useAppLocale();
  const copy = getScorePreflightMessages(locale);
  const result = state.status === "ready" ? state.result : null;
  const reasons = result ? result.reasonCodes.map(code => copy.reasonStrings[code] ?? copy.uncertainStructure) : [];
  return <section className="stack-md" aria-label={copy.title} data-score-preflight={state.status} data-preflight-compact={compact ? "true" : undefined} aria-busy={state.status === "checking"}>
    {!compact ? <h3 className="card-title">{copy.title}</h3> : null}
    <p className="helper-copy">{copy.freeBody}</p>
    {state.status === "checking" ? <div role="status"><p>{copy.checking}</p><progress aria-label={copy.checking} style={{ width: "100%" }} /><p className="helper-copy">{getScoreProcessingMessages(locale).preflightBody}</p></div> : null}
    {state.status === "failed" ? <div role="alert" className="stack-sm">
      <p className="form-status error">{copy.failed}</p><p className="helper-copy">{state.error}</p>
      <button type="button" className="button button-secondary" onClick={onRetry}>{copy.retry}</button>
    </div> : null}
    {result ? <div className="stack-sm" role="status" data-preflight-recommendation={result.recommendation}>
      {result.recognitionSupport ? <p className={result.recognitionSupport.supported ? "helper-copy" : "form-status error"} role={result.recognitionSupport.supported ? undefined : "alert"}>{getScoreRecognitionSupportMessage(locale, result.recognitionSupport.code)}</p> : null}
      {!compact ? <strong>{result.recommendation === "simple" ? copy.recommendedSimple : result.recommendation === "complex" ? copy.recommendedComplex : copy.recommendationUncertain}</strong> : null}
      <p className="body-copy">{formatMessage(copy.summary, {
        pages: formatNumber(result.sourcePageCount, locale), analyzed: formatNumber(result.pagesAnalyzed, locale),
        staves: formatNumber(Math.max(0, ...result.pages.map(page => page.maxStavesPerSystem)), locale),
        systems: formatNumber(result.pages.reduce((count, page) => count + page.systemCount, 0), locale),
      })}</p>
      {!compact && !result.complete ? <p className="helper-copy">{copy.incomplete}</p> : null}
      {!compact && reasons.length ? <ul>{Array.from(new Set(reasons)).map(reason => <li key={reason}>{reason}</li>)}</ul> : null}
      {!compact && result.recommendation === "uncertain" ? <p className="helper-copy">{copy.manualChoice}</p> : null}
    </div> : null}
  </section>;
}
