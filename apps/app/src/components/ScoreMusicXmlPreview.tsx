"use client";

import { useEffect, useRef, useState } from "react";
import type { ScoreEvent, ScoreJson } from "@score/shared";
import type { OpenSheetMusicDisplay as OpenSheetMusicDisplayInstance } from "opensheetmusicdisplay";
import { API_BASE_URL } from "../lib/api";

type PreviewState = "idle" | "deferred" | "loading" | "rendered" | "error";

type PreviewEvent = ScoreEvent & {
  partId: string;
  measureId: string;
  measureNumber: string;
  eventIndex: number;
};

const SVG_NS = "http://www.w3.org/2000/svg";

export function ScoreMusicXmlPreview({
  fileId,
  token,
  musicXml,
  scoreJson,
  selectedEventId,
  onEventSelect,
  emptyLabel,
  loadingLabel,
  errorLabel,
  deferredLabel = "This score is large. Load the complete MusicXML preview when you need the OSMD comparison view.",
  renderLabel = "Load complete preview",
  largeScoreThreshold = 5_000,
  zoom = 1,
}: {
  fileId: string | null;
  token: string | null;
  musicXml?: string | null;
  scoreJson?: ScoreJson | null;
  selectedEventId?: string | null;
  onEventSelect?: (eventId: string) => void;
  emptyLabel: string;
  loadingLabel: string;
  errorLabel: string;
  deferredLabel?: string;
  renderLabel?: string;
  largeScoreThreshold?: number;
  zoom?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const osmdRef = useRef<OpenSheetMusicDisplayInstance | null>(null);
  const zoomRef = useRef(zoom);
  const [state, setState] = useState<PreviewState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [boundEventCount, setBoundEventCount] = useState(0);
  const [renderRequested, setRenderRequested] = useState(false);
  const scoreEventCount = scoreJson?.metadata.noteCount ?? scoreJson?.measures.reduce((sum, measure) => sum + measure.events.length, 0) ?? 0;
  const deferRendering = scoreEventCount > largeScoreThreshold && !renderRequested;
  zoomRef.current = zoom;

  useEffect(() => {
    setRenderRequested(false);
  }, [fileId, musicXml, scoreJson]);

  useEffect(() => {
    let cancelled = false;
    let activeOsmd: OpenSheetMusicDisplayInstance | null = null;

    async function renderMusicXml() {
      if (deferRendering) {
        setState("deferred");
        setMessage(null);
        setBoundEventCount(0);
        if (containerRef.current) containerRef.current.innerHTML = "";
        return;
      }
      if ((!musicXml && (!fileId || !token)) || !containerRef.current) {
        setState("idle");
        setMessage(null);
        setBoundEventCount(0);
        return;
      }

      setState("loading");
      setMessage(null);
      setBoundEventCount(0);
      containerRef.current.innerHTML = "";

      try {
        let nextMusicXml = musicXml ?? "";

        if (!nextMusicXml) {
          const response = await fetch(`${API_BASE_URL}/api/files/${fileId}/download`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            throw new Error(payload?.error ?? errorLabel);
          }

          nextMusicXml = await response.text();
        }

        const { OpenSheetMusicDisplay } = await import("opensheetmusicdisplay");

        if (cancelled || !containerRef.current) {
          return;
        }

        const osmd = new OpenSheetMusicDisplay(containerRef.current, {
          autoResize: true,
          backend: "svg",
          drawTitle: true,
          drawingParameters: "compacttight",
        });
        activeOsmd = osmd;
        osmdRef.current = osmd;

        await osmd.load(nextMusicXml);
        if (cancelled) {
          osmd.clear();
          return;
        }

        osmd.Zoom = zoomRef.current;
        osmd.render();
        const nextBoundCount = bindRenderedScoreEvents({
          container: containerRef.current,
          scoreJson: scoreJson ?? null,
          onEventSelect,
        });
        setBoundEventCount(nextBoundCount);
        setState("rendered");
      } catch (error) {
        if (!cancelled) {
          setState("error");
          setMessage(error instanceof Error ? error.message : errorLabel);
        }
      }
    }

    void renderMusicXml();

    return () => {
      cancelled = true;
      if (activeOsmd) activeOsmd.clear();
      if (osmdRef.current === activeOsmd) osmdRef.current = null;
    };
  }, [deferRendering, errorLabel, fileId, musicXml, onEventSelect, scoreJson, token]);

  useEffect(() => {
    const osmd = osmdRef.current;
    if (!osmd || !containerRef.current || state !== "rendered" || osmd.Zoom === zoom) return;
    osmd.Zoom = zoom;
    osmd.render();
    const nextBoundCount = bindRenderedScoreEvents({
      container: containerRef.current,
      scoreJson: scoreJson ?? null,
      onEventSelect,
    });
    setBoundEventCount(nextBoundCount);
    updateRenderedSelection(containerRef.current, selectedEventId ?? null);
  }, [onEventSelect, scoreJson, selectedEventId, state, zoom]);

  useEffect(() => {
    if (!containerRef.current || state !== "rendered") {
      return;
    }

    updateRenderedSelection(containerRef.current, selectedEventId ?? null);
  }, [selectedEventId, state, boundEventCount]);

  return (
    <div className="score-preview-shell">
      {state === "idle" ? <div className="empty-state">{emptyLabel}</div> : null}
      {state === "deferred" ? (
        <div className="empty-state stack-sm">
          <p>{deferredLabel}</p>
          <button type="button" className="button button-secondary" onClick={() => setRenderRequested(true)}>
            {renderLabel}
          </button>
        </div>
      ) : null}
      {state === "loading" ? <div className="empty-state">{loadingLabel}</div> : null}
      {state === "error" ? <div className="empty-state">{message ?? errorLabel}</div> : null}
      <div ref={containerRef} className="score-osmd-canvas" data-bound-events={boundEventCount} data-review-zoom={zoom} aria-hidden={state !== "rendered"} />
    </div>
  );
}

function bindRenderedScoreEvents(input: {
  container: HTMLElement;
  scoreJson: ScoreJson | null;
  onEventSelect?: (eventId: string) => void;
}) {
  const events = collectPreviewEvents(input.scoreJson);
  if (events.length === 0) {
    return 0;
  }

  const renderedNotes = Array.from(input.container.querySelectorAll<SVGGElement>("g.vf-stavenote"));
  const limit = Math.min(events.length, renderedNotes.length);

  for (let index = 0; index < limit; index += 1) {
    const event = events[index];
    const group = renderedNotes[index];
    group.dataset.scoreEventId = event.id;
    group.dataset.scoreMeasureId = event.measureId;
    group.dataset.scorePartId = event.partId;
    group.dataset.scoreEventType = event.type;
    group.classList.add("score-osmd-event");
    group.setAttribute("aria-label", previewEventLabel(event));

    if (input.onEventSelect) {
      group.classList.add("is-interactive");
      group.setAttribute("role", "button");
      group.setAttribute("tabindex", "0");
      appendHitTarget(group);
      group.addEventListener("click", () => input.onEventSelect?.(event.id));
      group.addEventListener("keydown", (keyboardEvent) => {
        if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
          keyboardEvent.preventDefault();
          input.onEventSelect?.(event.id);
        }
      });
    }
  }

  return limit;
}

function appendHitTarget(group: SVGGElement) {
  group.querySelector(".score-osmd-hit-target")?.remove();

  try {
    const bbox = group.getBBox();
    if (!Number.isFinite(bbox.width) || !Number.isFinite(bbox.height) || bbox.width <= 0 || bbox.height <= 0) {
      return;
    }

    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("class", "score-osmd-hit-target");
    rect.setAttribute("x", String(bbox.x - 6));
    rect.setAttribute("y", String(bbox.y - 8));
    rect.setAttribute("width", String(bbox.width + 12));
    rect.setAttribute("height", String(bbox.height + 16));
    group.insertBefore(rect, group.firstChild);
  } catch {
    // Some browsers can throw while the SVG is still settling after OSMD render.
  }
}

function updateRenderedSelection(container: HTMLElement, selectedEventId: string | null) {
  const selected = container.querySelector<SVGGElement>(".score-osmd-event.is-selected");
  selected?.classList.remove("is-selected");

  if (!selectedEventId) {
    return;
  }

  const nextSelected = container.querySelector<SVGGElement>(`[data-score-event-id="${cssEscape(selectedEventId)}"]`);
  nextSelected?.classList.add("is-selected");
  nextSelected?.scrollIntoView({ block: "nearest", inline: "center" });
}

function collectPreviewEvents(scoreJson: ScoreJson | null): PreviewEvent[] {
  if (!scoreJson) {
    return [];
  }

  return scoreJson.parts.flatMap((part) =>
    scoreJson.measures
      .filter((measure) => measure.partId === part.id)
      .sort((a, b) => a.sequence - b.sequence)
      .flatMap((measure) =>
        measure.events
          .map((event, eventIndex) => ({
            ...event,
            partId: part.id,
            measureId: measure.id,
            measureNumber: measure.number,
            eventIndex,
          }))
          .filter((event) => !(event.type === "note" && event.chord)),
      ),
  );
}

function previewEventLabel(event: PreviewEvent) {
  return `${event.partId} m.${event.measureNumber} ${event.type} ${event.eventIndex + 1}`;
}

function cssEscape(value: string) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }

  return value.replace(/["\\]/g, "\\$&");
}
