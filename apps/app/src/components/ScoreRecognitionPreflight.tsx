"use client";

import { useFlowMessages } from "../lib/flow-messages/client";

import { formatMessage, formatNumber, getScoreRecognitionSupportMessage } from "@score/i18n";
import { ProcessingProgress } from "@score/ui";
import type { ScoreRecognitionPreflightState } from "../lib/score-recognition-preflight";
import { useAppLocale } from "./AppLocaleProvider";

export function ScoreRecognitionPreflight({ state, onRetry, compact = false }: { state: ScoreRecognitionPreflightState; onRetry: () => void; compact?: boolean }) {
  const { locale } = useAppLocale();
  const flow = useFlowMessages();
  const copy = flow.preflight;
  const result = state.status === "ready" ? state.result : null;
  const reasons = result ? result.reasonCodes.map(code => copy.reasonStrings[code] ?? copy.uncertainStructure) : [];
  const pending = state.status === "checking" || state.status === "waiting";
  const uploadPercent = pending ? state.uploadProgress : null;
  const uploading = pending && typeof uploadPercent === "number" && uploadPercent < 100;
  return <section className="stack-md" aria-label={copy.title} data-score-preflight={state.status} data-preflight-compact={compact ? "true" : undefined} aria-busy={state.status === "checking" || state.status === "waiting"}>
    {!compact ? <h3 className="card-title">{copy.title}</h3> : null}
    <p className="helper-copy">{copy.freeBody}</p>
    <ProcessingProgress active={uploading} label={flow.processing.uploadTitle} progressPercent={uploadPercent} error={state.status === "failed" || state.status === "idle"} operationKey={state.file?.name} locale={locale} />
    <ProcessingProgress active={pending && !uploading} label={state.status === "waiting" ? flow.requestWaiting.preflight : copy.checking} error={state.status === "failed" || state.status === "idle"} operationKey={state.file?.name} locale={locale} />
    {pending && !uploading ? <p className="helper-copy">{flow.processing.preflightBody}</p> : null}
    {state.status === "failed" ? <div role="alert" className="stack-sm">
      <p className="form-status error">{copy.failed}</p><p className="helper-copy">{state.error}</p>
      <button type="button" className="button button-secondary" onClick={onRetry}>{state.stagedUnavailable ? flow.stagedUpload.retry : copy.retry}</button>
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
