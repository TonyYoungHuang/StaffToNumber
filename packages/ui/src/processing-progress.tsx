"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { getPercentProgressMessages, SUPPORTED_LOCALES, type SupportedLocale } from "@score/i18n";
import { advanceProgress, idleProgress, type ProgressInput } from "./progress-state";

export type PercentProgressBarProps = {
  label: string;
  progressPercent: number;
  locale?: string;
  className?: string;
  style?: CSSProperties;
  estimatedLabel?: string;
};

export function PercentProgressBar({ label, progressPercent, locale, className, style, estimatedLabel }: PercentProgressBarProps) {
  const value = Math.round(Math.min(100, Math.max(0, Number.isFinite(progressPercent) ? progressPercent : 0)));
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(value / 100);
  return <div className={className} data-percent-progress={value} style={{ width: "100%", minWidth: 0, ...style }}>
    <div style={{ display: "flex", gap: "0.75rem", justifyContent: "space-between", alignItems: "baseline" }}>
      <span>{label}</span><span aria-hidden="true" style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{percent}</span>
    </div>
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}
      aria-valuetext={`${percent}${estimatedLabel ? ` · ${estimatedLabel}` : ""}`}
      style={{ height: "0.5rem", marginTop: "0.4rem", background: "var(--line, #d8dee8)", borderRadius: "999px", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${value}%`, background: "var(--accent, #3157c7)", borderRadius: "inherit" }} />
    </div>
    {estimatedLabel ? <small className="helper-copy">{estimatedLabel}</small> : null}
  </div>;
}

/** Keep mounted across active → success so the 100% completion can disappear itself. */
export function ProcessingProgress({ active, label, progressPercent, error, operationKey, locale, className, style, estimatedLabel }: ProgressInput & {
  locale?: string;
  className?: string;
  style?: CSSProperties;
  estimatedLabel?: string;
}) {
  const [state, setState] = useState(() => advanceProgress(idleProgress(), { active, label, progressPercent, error, operationKey }, Date.now()));
  useEffect(() => {
    const input = { active, label, progressPercent, error, operationKey };
    setState(previous => advanceProgress(previous, input, Date.now()));
    const actual = typeof progressPercent === "number" && Number.isFinite(progressPercent);
    if (error || (!active && state.phase === "idle") || (active && actual)) return;
    const timer = setInterval(() => setState(previous => advanceProgress(previous, input, Date.now())), 100);
    return () => clearInterval(timer);
  }, [active, label, progressPercent, error, operationKey, state.phase]);

  if (error || state.phase === "idle") return null;
  const estimated = state.phase === "active" && !(typeof progressPercent === "number" && Number.isFinite(progressPercent));
  const progressLocale = SUPPORTED_LOCALES.includes(locale as SupportedLocale) ? locale as SupportedLocale : "en";
  return <div className={className} style={style} data-processing-progress={state.phase} data-progress-kind={estimated ? "estimated" : "actual"} aria-busy={state.phase === "active"}>
    <PercentProgressBar label={state.label} progressPercent={state.progressPercent} locale={locale}
      estimatedLabel={estimated ? estimatedLabel ?? getPercentProgressMessages(progressLocale).estimated : undefined} />
  </div>;
}

export function ScoreDownloadProgress(props: Omit<ProgressInput, "label"> & { locale?: string }) {
  const locale = SUPPORTED_LOCALES.includes(props.locale as SupportedLocale) ? props.locale as SupportedLocale : "en";
  return <ProcessingProgress {...props} label={getPercentProgressMessages(locale).downloading} />;
}
