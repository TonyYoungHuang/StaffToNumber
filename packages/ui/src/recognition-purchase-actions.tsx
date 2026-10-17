"use client";

import type { RecognitionExperienceMessages } from '@score/i18n';

/** The large-score purchase offer always puts Starter before the one-time pass. */
export function RecognitionPurchaseActions({ messages: copy, disabled, onStarter, onPass, primaryClassName = 'button button-primary', secondaryClassName = 'button button-secondary' }: { messages: RecognitionExperienceMessages; disabled?: boolean; onStarter: () => void; onPass: () => void; primaryClassName?: string; secondaryClassName?: string }) {
  return <div className="button-row" data-upsell-primary="starter"><button type="button" className={primaryClassName} data-plan-type="subscription" disabled={disabled} onClick={onStarter}>{copy.starterCta}</button><button type="button" className={secondaryClassName} data-plan-type="one_score" disabled={disabled} onClick={onPass}>{copy.passCta}</button></div>;
}

/** Complex recognition uses the big lane only while the lane feature is enabled. */
export function needsBigRecognitionLane(assessment: { lane: 'normal' | 'big' | 'unsupported'; enabled: boolean } | null | undefined, mode: 'simple' | 'complex' | null | undefined): boolean {
  return assessment?.lane === 'big' || Boolean(assessment?.enabled && assessment.lane !== 'unsupported' && mode === 'complex');
}
