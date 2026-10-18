"use client";

import { useEffect, useRef, useState } from "react";
import { ProcessingProgress } from "@score/ui";
import type { SupportedLocale } from "@score/i18n";
import type { OpenSheetMusicDisplay as OpenSheetMusicDisplayInstance } from "opensheetmusicdisplay";
import styles from "../app/home-page.module.css";

export function HomeCandidatePreview({ musicXml, loadingLabel, errorLabel, retryLabel, requestFailed = false, onRetry, locale }: { musicXml: string | null; loadingLabel: string; errorLabel: string; retryLabel: string; requestFailed?: boolean; onRetry: () => void; locale?: SupportedLocale }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!musicXml || !containerRef.current) { setLoading(false); return; }
    let cancelled = false;
    let renderer: OpenSheetMusicDisplayInstance | null = null;
    setError(false);
    setLoading(true);
    containerRef.current.replaceChildren();

    void import("opensheetmusicdisplay").then(async ({ OpenSheetMusicDisplay }) => {
      if (cancelled || !containerRef.current) return;
      renderer = new OpenSheetMusicDisplay(containerRef.current, {
        autoResize: true,
        backend: "svg",
        drawTitle: true,
        drawingParameters: "compacttight",
      });
      await renderer.load(musicXml);
      if (cancelled) return;
      renderer.Zoom = 0.78;
      renderer.render();
      if (!cancelled) setLoading(false);
    }).catch(() => {
      if (!cancelled) { setError(true); setLoading(false); }
    });

    return () => {
      cancelled = true;
      renderer?.clear();
    };
  }, [musicXml, attempt]);

  return <div>
    <ProcessingProgress active={loading} label={loadingLabel} error={error || requestFailed} locale={locale} />
    {requestFailed || error ? <div className={styles.candidatePlaceholder} role="alert"><p>{errorLabel}</p><button type="button" className={styles.preflightRetry} onClick={() => { setAttempt(value => value + 1); onRetry(); }}>{retryLabel}</button></div> : !musicXml ? <div className={styles.candidatePlaceholder}>{loadingLabel}</div> : null}
    <div ref={containerRef} className={styles.candidateCanvas} aria-label={loadingLabel} hidden={!musicXml || error} />
  </div>;
}
