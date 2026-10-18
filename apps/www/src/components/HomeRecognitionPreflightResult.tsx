"use client";

import { formatMessage, formatNumber, type ScorePreflightMessages, type SupportedLocale } from "@score/i18n";
import { recognitionRejectionMessageKey, type ScoreRecognitionMode, type ScoreRecognitionOption, type ScoreStructurePreflight } from "@score/shared";
import { needsBigRecognitionLane, RecognitionPlanSummary, RecognitionRejection } from "@score/ui";
import type { HomeRuntimeCopy } from "../lib/home-runtime-copy";

export function isHomeRecognitionRejected(preflight: ScoreStructurePreflight | null): boolean {
  return preflight?.memoryAssessment?.lane === "unsupported" || preflight?.recognitionSupport?.supported === false;
}

export function homeRecognitionNeedsPurchase(option: ScoreRecognitionOption | undefined): boolean {
  return Boolean(option && !option.canSubmit && (option.creditSource === "free_trial" ||
    /^FREE_TRIAL_|^(?:COMPLEX_RECOGNITION_ENTITLEMENT_REQUIRED|BIG_RECOGNITION_ENTITLEMENT_REQUIRED|SCORE_PASS_REQUIRED)$/u.test(option.reason ?? "")));
}

/** Admission refusal replaces the entire support, recommendation and price view. */
export function HomeRecognitionPreflightResult({ locale, copy, runtimeCopy, preflight, recognitionMode, options, busy, onSelectMode, modeClassName }: {
  locale: SupportedLocale; copy: ScorePreflightMessages; runtimeCopy: HomeRuntimeCopy; preflight: ScoreStructurePreflight;
  recognitionMode: ScoreRecognitionMode | null; options: ScoreRecognitionOption[]; busy: boolean;
  onSelectMode: (mode: ScoreRecognitionMode) => void; modeClassName?: string;
}) {
  const memory = preflight.memoryAssessment;
  const experience = runtimeCopy.recognitionExperience;
  if (isHomeRecognitionRejected(preflight)) return <RecognitionRejection messages={experience} messageKey={recognitionRejectionMessageKey(memory, preflight.recognitionSupport?.code)} supportCode={preflight.recognitionSupport?.code} fallback={runtimeCopy.support[preflight.recognitionSupport?.code ?? ""] ?? runtimeCopy.support.fallback} />;
  const bigLane = needsBigRecognitionLane(memory, recognitionMode);
  return <>
    <strong role="status" data-preflight-recommendation={preflight.recommendation}>{!preflight.complete || preflight.recommendation === "uncertain" ? copy.recommendationUncertain : preflight.recommendation === "simple" ? copy.recommendedSimple : copy.recommendedComplex}</strong>
    <p>{formatMessage(copy.summary, { pages: formatNumber(preflight.sourcePageCount, locale), analyzed: formatNumber(preflight.pagesAnalyzed, locale), staves: formatNumber(Math.max(0, ...preflight.pages.map(page => page.maxStavesPerSystem)), locale), systems: formatNumber(preflight.pages.reduce((sum, page) => sum + page.systemCount, 0), locale) })}</p>
    {!preflight.complete ? <p>{copy.incomplete}</p> : null}
    {memory ? <div data-recognition-lane={bigLane ? "big" : "normal"}><strong>{bigLane ? experience.bigLane : experience.normalLane}</strong>{bigLane ? <><p data-large-file-reason>{formatMessage(experience.bigReason, { pages: formatNumber(preflight.sourcePageCount, locale) })}</p><p>{experience.bigBody}</p></> : <p>{experience.normalBody}</p>}{memory.waitEstimateSeconds[1] > 0 ? <p>{formatMessage(experience.wait, { minutes: formatNumber(Math.ceil(memory.waitEstimateSeconds[1] / 60), locale) })}</p> : null}</div> : null}
    <RecognitionPlanSummary messages={experience} />
    {preflight.recognitionSupport ? <p role="status">{runtimeCopy.support[preflight.recognitionSupport.code] ?? runtimeCopy.support.fallback}</p> : null}
    {preflight.reasonCodes.length ? <ul>{Array.from(new Set(preflight.reasonCodes.map(code => copy.reasonStrings[code] ?? copy.uncertainStructure))).map(reason => <li key={reason}>{reason}</li>)}</ul> : null}
    {!preflight.complete || preflight.recommendation === "uncertain" ? <p>{copy.manualChoice}</p> : null}
    <fieldset className={modeClassName} disabled={busy}><legend>{copy.chooseMode}</legend>{(["simple", "complex"] as const).map(optionMode => {
      const option = options.find(item => item.mode === optionMode);
      return <label key={optionMode}><input type="radio" name="home-recognition-mode" value={optionMode} checked={recognitionMode === optionMode} onChange={() => onSelectMode(optionMode)} /><span><strong>{optionMode === "simple" ? copy.simpleTitle : copy.complexTitle}</strong><small>{option ? option.creditSource === "free_trial" && !bigLane ? copy.freeProjectPrice : formatMessage(copy.price, { credits: formatNumber(option.creditCost, locale) }) : copy.notReady}</small>{option && !option.canSubmit ? <small>{homeRecognitionNeedsPurchase(option) ? `${experience.passPlan} · ${experience.starterPlan}` : copy.noCredit}</small> : null}</span></label>;
    })}</fieldset>
    <p>{copy.selectedFilePreserved}</p>
  </>;
}
