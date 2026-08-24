"use client";

import { useEffect, useRef, useState } from "react";
import type { OpenSheetMusicDisplay as OpenSheetMusicDisplayInstance } from "opensheetmusicdisplay";
import styles from "../app/home-page.module.css";

export function HomeCandidatePreview({ musicXml, loadingLabel }: { musicXml: string | null; loadingLabel: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!musicXml || !containerRef.current) return;
    let cancelled = false;
    let renderer: OpenSheetMusicDisplayInstance | null = null;
    setError(false);
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
    }).catch(() => {
      if (!cancelled) setError(true);
    });

    return () => {
      cancelled = true;
      renderer?.clear();
    };
  }, [musicXml]);

  if (!musicXml || error) return <div className={styles.candidatePlaceholder}>{loadingLabel}</div>;
  return <div ref={containerRef} className={styles.candidateCanvas} aria-label={loadingLabel} />;
}
