"use client";

import { useEffect, useRef, useState } from "react";
import { ProcessingProgress } from "@score/ui";
import type { SupportedLocale } from "@score/i18n";
import type { OpenSheetMusicDisplay as OpenSheetMusicDisplayInstance } from "opensheetmusicdisplay";
import styles from "../app/home-page.module.css";

export function HomeCandidatePreview({ musicXml, loadingLabel, locale }: { musicXml: string | null; loadingLabel: string; locale?: SupportedLocale }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

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
  }, [musicXml]);

  return <div>
    <ProcessingProgress active={loading} label={loadingLabel} error={error} locale={locale} />
    {!musicXml || error ? <div className={styles.candidatePlaceholder}>{loadingLabel}</div> : null}
    <div ref={containerRef} className={styles.candidateCanvas} aria-label={loadingLabel} hidden={!musicXml || error} />
  </div>;
}
