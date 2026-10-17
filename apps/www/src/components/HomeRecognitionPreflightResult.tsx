"use client";

import { formatMessage, formatNumber, type ScorePreflightMessages, type SupportedLocale } from "@score/i18n";
import type { ScoreRecognitionMode, ScoreRecognitionOption, ScoreStructurePreflight } from "@score/shared";
import { needsBigRecognitionLane } from "@score/ui";
import type { HomeRuntimeCopy } from "../lib/home-runtime-copy";

export function isHomeRecognitionRejected(preflight: ScoreStructurePreflight | null): boolean {
  return preflight?.memoryAssessment?.lane === "unsupported" || preflight?.recognitionSupport?.supported === false;
}

/** Admission refusal replaces the entire support, recommendation and price view. */
export function HomeRecognitionPreflightResult({ locale, copy, runtimeCopy, preflight, recognitionMode, options, busy, onSelectMode, modeClassName }: {
  locale: SupportedLocale; copy: ScorePreflightMessages; runtimeCopy: HomeRuntimeCopy; preflight: ScoreStructurePreflight;
  recognitionMode: ScoreRecognitionMode | null; options: ScoreRecognitionOption[]; busy: boolean;
  onSelectMode: (mode: ScoreRecognitionMode) => void; modeClassName?: string;
}) {
  const memory = preflight.memoryAssessment;
  const experience = runtimeCopy.recognitionExperience;
  if (isHomeRecognitionRejected(preflight)) return <div role="alert" data-recognition-lane="unsupported">
    {memory?.lane === "unsupported" ? experience.unsupportedLane : runtimeCopy.support[preflight.recognitionSupport!.code] ?? runtimeCopy.support.fallback}
  </div>;
  const bigLane = needsBigRecognitionLane(memory, recognitionMode);
  return <>
    <strong role="status" data-preflight-recommendation={preflight.recommendation}>{!preflight.complete || preflight.recommendation === "uncertain" ? copy.recommendationUncertain : preflight.recommendation === "simple" ? copy.recommendedSimple : copy.recommendedComplex}</strong>
    <p>{formatMessage(copy.summary, { pages: formatNumber(preflight.sourcePageCount, locale), analyzed: formatNumber(preflight.pagesAnalyzed, locale), staves: formatNumber(Math.max(0, ...preflight.pages.map(page => page.maxStavesPerSystem)), locale), systems: formatNumber(preflight.pages.reduce((sum, page) => sum + page.systemCount, 0), locale) })}</p>
    {!preflight.complete ? <p>{copy.incomplete}</p> : null}
    {memory ? <div data-recognition-lane={bigLane ? "big" : "normal"}><strong>{bigLane ? experience.bigLane : experience.normalLane}</strong>{bigLane ? <p>{experience.bigBody}</p> : null}{memory.waitEstimateSeconds[1] > 0 ? <p>{formatMessage(experience.wait, { minutes: formatNumber(Math.ceil(memory.waitEstimateSeconds[1] / 60), locale) })}</p> : null}</div> : null}
    {preflight.recognitionSupport ? <p role="status">{runtimeCopy.support[preflight.recognitionSupport.code] ?? runtimeCopy.support.fallback}</p> : null}
    {preflight.reasonCodes.length ? <ul>{Array.from(new Set(preflight.reasonCodes.map(code => copy.reasonStrings[code] ?? copy.uncertainStructure))).map(reason => <li key={reason}>{reason}</li>)}</ul> : null}
    {!preflight.complete || preflight.recommendation === "uncertain" ? <p>{copy.manualChoice}</p> : null}
    <fieldset className={modeClassName} disabled={busy}><legend>{copy.chooseMode}</legend>{(["simple", "complex"] as const).map(optionMode => {
      const option = options.find(item => item.mode === optionMode);
      return <label key={optionMode}><input type="radio" name="home-recognition-mode" value={optionMode} checked={recognitionMode === optionMode} onChange={() => onSelectMode(optionMode)} /><span><strong>{optionMode === "simple" ? copy.simpleTitle : copy.complexTitle}</strong><small>{option ? formatMessage(copy.price, { credits: formatNumber(option.creditCost, locale) }) : copy.notReady}</small>{option && !option.canSubmit ? <small>{copy.noCredit}</small> : null}</span></label>;
    })}</fieldset>
    <p>{copy.selectedFilePreserved}</p>
  </>;
}
