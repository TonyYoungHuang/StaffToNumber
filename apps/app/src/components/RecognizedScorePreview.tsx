"use client";
import { useEffect, useRef, useState } from "react";
import { workbenchCopy } from "@score/ui";
import { useAppLocale } from "./AppLocaleProvider";
import { apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { useFlowMessages } from "../lib/flow-messages/client";

/** Renders the actual saved recognition result; never a decorative sample. */
export function RecognizedScorePreview({ documentId, onLoaded }: { documentId: string; onLoaded?: (title: string, freeUsed: boolean) => void }) {
  const { locale } = useAppLocale();
  const flow = useFlowMessages();
  const container = useRef<HTMLDivElement>(null);
  const loaded = useRef(onLoaded); loaded.current = onLoaded;
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let renderer: { clear: () => void } | undefined;
    setError(null);
    const headers = { Authorization: `Bearer ${getStoredToken() ?? ""}` };
    void (async () => {
      const [score, jobs] = await Promise.all([
        apiRequest<{ score: { title: string; pendingRevisionId?: string | null } }>(`/api/scores/${documentId}`, { headers, signal: controller.signal }),
        apiRequest<{ jobs: Array<{ params?: Record<string, unknown> | null }> }>(`/api/scores/${documentId}/jobs`, { headers, signal: controller.signal }),
      ]);
      if (controller.signal.aborted) return;
      if (!score.ok) throw new Error(score.error);
      loaded.current?.(score.data.score.title, jobs.ok && jobs.data.jobs.some(job => job.params?.freeTrial === true || job.params?.creditSource === "free_trial"));
      const preview = await apiRequest<{ musicXml: string }>(`/api/scores/${documentId}/${score.data.score.pendingRevisionId ? "candidate/" : ""}musicxml-preview`, { headers, signal: controller.signal });
      if (!preview.ok) throw new Error(preview.error);
      const { OpenSheetMusicDisplay } = await import("opensheetmusicdisplay");
      if (controller.signal.aborted || !container.current) return;
      container.current.replaceChildren();
      const osmd = new OpenSheetMusicDisplay(container.current, { autoResize: true, backend: "svg", drawingParameters: "compacttight" });
      renderer = osmd;
      await osmd.load(preview.data.musicXml);
      if (controller.signal.aborted) return;
      osmd.Zoom = 0.65; osmd.render();
    })().catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : flow.scoreReadiness.failed); });
    return () => { controller.abort(); renderer?.clear(); };
  }, [documentId, attempt]);
  return <div><div ref={container} aria-label={workbenchCopy[locale].done} />{error ? <div role="alert"><p>{error}</p><button type="button" className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>{flow.retry}</button></div> : null}</div>;
}
