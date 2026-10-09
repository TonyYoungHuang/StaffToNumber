"use client";

import { useEffect, useRef, useState } from "react";
import { formatMessage } from "@score/i18n";
import type { ScoreEvent, ScoreJson } from "@score/shared";
import type { OpenSheetMusicDisplay as OpenSheetMusicDisplayInstance } from "opensheetmusicdisplay";
import type { VexFlowGraphicalNote } from "opensheetmusicdisplay";
import { annotateMusicXmlEvents, installOsmdEventBridge, osmdEventIdentity } from "../lib/osmd-event-bridge";
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
  retryLabel,
  technicalDetailsLabel,
  deferredLabel,
  renderLabel,
  eventLabelTemplate,
  noteLabel,
  restLabel,
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
  retryLabel: string;
  technicalDetailsLabel: string;
  deferredLabel: string;
  renderLabel: string;
  eventLabelTemplate: string;
  noteLabel: string;
  restLabel: string;
  largeScoreThreshold?: number;
  zoom?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const osmdRef = useRef<OpenSheetMusicDisplayInstance | null>(null);
  const zoomRef = useRef(zoom);
  const selectedEventIdRef = useRef(selectedEventId);
  const [state, setState] = useState<PreviewState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [renderAttempt, setRenderAttempt] = useState(0);
  const [boundEventCount, setBoundEventCount] = useState(0);
  const [renderRequested, setRenderRequested] = useState(false);
  const scoreEventCount = scoreJson?.metadata.noteCount ?? scoreJson?.measures.reduce((sum, measure) => sum + measure.events.length, 0) ?? 0;
  const deferRendering = scoreEventCount > largeScoreThreshold && !renderRequested;
  zoomRef.current = zoom;
  selectedEventIdRef.current = selectedEventId;

  useEffect(() => {
    setRenderRequested(false);
  }, [fileId, musicXml, scoreJson]);

  useEffect(() => {
    let cancelled = false;
    let activeOsmd: OpenSheetMusicDisplayInstance | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let visibilityObserver: ResizeObserver | null = null;
    let releaseVisibilityWait: (() => void) | null = null;
    let resizeFrame: number | null = null;

    async function renderMusicXml() {
      if (deferRendering) {
        setState("deferred");
        setMessage(null);
        setBoundEventCount(0);
        if (containerRef.current) containerRef.current.innerHTML = "";
        return;
      }
      if ((!musicXml && !fileId) || !containerRef.current) {
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
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            credentials: "include",
          });

          if (!response.ok) {
            const payload = await response.json().catch(() => null) as { error?: string } | null;
            throw new Error(payload?.error ?? errorLabel);
          }

          nextMusicXml = await response.text();
        }

        const { OpenSheetMusicDisplay, VoiceGenerator } = await import("opensheetmusicdisplay");
        installOsmdEventBridge(VoiceGenerator);
        // Workspace panels retain their state while hidden. Rendering into a
        // zero-width panel creates invalid stave coordinates in OSMD.
        if (containerRef.current && containerRef.current.getBoundingClientRect().width < 40) {
          await new Promise<void>(resolve => {
            releaseVisibilityWait = resolve;
            visibilityObserver = new ResizeObserver(() => {
              if (cancelled || (containerRef.current?.getBoundingClientRect().width ?? 0) >= 40) {
                visibilityObserver?.disconnect(); resolve();
              }
            });
            visibilityObserver.observe(containerRef.current!);
          });
        }

        if (cancelled || !containerRef.current) {
          return;
        }

        const osmd = new OpenSheetMusicDisplay(containerRef.current, {
          // OSMD's automatic redraw discards our event targets. Own width
          // changes so selection and keyboard targets are rebound afterward.
          autoResize: false,
          backend: "svg",
          drawTitle: true,
          drawingParameters: "compacttight",
        });
        activeOsmd = osmd;
        osmdRef.current = osmd;

        await osmd.load(annotateMusicXmlEvents(nextMusicXml, scoreJson ?? null));
        if (cancelled) {
          osmd.clear();
          return;
        }

        osmd.Zoom = zoomRef.current;
        osmd.render();
        const nextBoundCount = bindRenderedScoreEvents({
          osmd,
          container: containerRef.current,
          scoreJson: scoreJson ?? null,
          onEventSelect,
          eventLabelTemplate,
          noteLabel,
          restLabel,
        });
        setBoundEventCount(nextBoundCount);
        setState("rendered");

        const previewShell = containerRef.current.parentElement;
        if (previewShell) {
          let previousWidth = previewShell.clientWidth;
          resizeObserver = new ResizeObserver(() => {
            const width = previewShell.clientWidth;
            // Ignore height changes caused by rendering the SVG itself.
            if (width === previousWidth) return;
            previousWidth = width;
            if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
            if (width < 40) { resizeFrame = null; return; }
            resizeFrame = requestAnimationFrame(() => {
              resizeFrame = null;
              if (cancelled || !containerRef.current || containerRef.current.getBoundingClientRect().width < 40) return;
              try {
                osmd.Zoom = zoomRef.current;
                osmd.render();
                setBoundEventCount(bindRenderedScoreEvents({
                  osmd,
                  container: containerRef.current,
                  scoreJson: scoreJson ?? null,
                  onEventSelect,
                  eventLabelTemplate,
                  noteLabel,
                  restLabel,
                }));
                updateRenderedSelection(containerRef.current, selectedEventIdRef.current ?? null);
              } catch (error) {
                setState("error");
                setMessage(error instanceof Error ? error.message : errorLabel);
              }
            });
          });
          resizeObserver.observe(previewShell);
        }
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
      resizeObserver?.disconnect();
      visibilityObserver?.disconnect();
      releaseVisibilityWait?.();
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      if (activeOsmd) activeOsmd.clear();
      if (osmdRef.current === activeOsmd) osmdRef.current = null;
    };
  }, [deferRendering, errorLabel, eventLabelTemplate, fileId, musicXml, noteLabel, onEventSelect, renderAttempt, restLabel, scoreJson, token]);

  useEffect(() => {
    const osmd = osmdRef.current;
    if (!osmd || !containerRef.current || state !== "rendered" || osmd.Zoom === zoom || containerRef.current.getBoundingClientRect().width < 40) return;
    osmd.Zoom = zoom;
    osmd.render();
    const nextBoundCount = bindRenderedScoreEvents({
      osmd,
      container: containerRef.current,
      scoreJson: scoreJson ?? null,
      onEventSelect,
      eventLabelTemplate,
      noteLabel,
      restLabel,
    });
    setBoundEventCount(nextBoundCount);
    updateRenderedSelection(containerRef.current, selectedEventId ?? null);
  }, [eventLabelTemplate, noteLabel, onEventSelect, restLabel, scoreJson, selectedEventId, state, zoom]);

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
      {state === "error" ? (
        <div className="empty-state stack-sm" role="alert">
          <p>{errorLabel}</p>
          <div className="button-row">
            <button type="button" className="button button-secondary" onClick={() => setRenderAttempt((value) => value + 1)}>
              {retryLabel}
            </button>
          </div>
          {message && message !== errorLabel ? (
            <details className="technical-details">
              <summary>{technicalDetailsLabel}</summary>
              <p className="micro-copy">{message}</p>
            </details>
          ) : null}
        </div>
      ) : null}
      <div ref={containerRef} className="score-osmd-canvas" data-bound-events={boundEventCount} data-review-zoom={zoom} aria-hidden={state !== "rendered"} />
    </div>
  );
}

function bindRenderedScoreEvents(input: {
  osmd: OpenSheetMusicDisplayInstance;
  container: HTMLElement;
  scoreJson: ScoreJson | null;
  onEventSelect?: (eventId: string) => void;
  eventLabelTemplate: string;
  noteLabel: string;
  restLabel: string;
}) {
  const events = collectPreviewEvents(input.scoreJson);
  if (events.length === 0) {
    return 0;
  }

  const eventMap = new Map(events.map(event => [event.id, event]));
  let count = 0;
  const bound = new Set<Element>();
  for (const measure of input.osmd.Sheet.SourceMeasures) for (const vertical of measure.VerticalSourceStaffEntryContainers) for (const staff of vertical.StaffEntries) {
    if (!staff) continue;
    for (const voice of staff.VoiceEntries) for (const note of voice.Notes) {
    const event = eventMap.get(osmdEventIdentity(note) ?? '');
    if (!event) continue;
    const graphical = input.osmd.EngravingRules.GNote(note) as VexFlowGraphicalNote | undefined;
    if (!graphical?.getSVGGElement) continue;
    // The chord index belongs to OSMD's own VexFlow instance. Bind each head,
    // not the entire chord group and not the display order of SVG elements.
    const heads = graphical.getNoteheadSVGs();
    const headIndex = graphical.vfnote?.[1] ?? graphical.vfnoteIndex;
    const group = (heads[headIndex] ?? (heads.length <= 1 ? graphical.getSVGGElement() : undefined)) as unknown as SVGGElement | undefined;
    if (!group || !input.container.contains(group) || bound.has(group)) continue;
    bound.add(group);
    group.dataset.scoreEventId = event.id;
    group.dataset.scoreMeasureId = event.measureId;
    group.dataset.scorePartId = event.partId;
    group.dataset.scoreEventType = event.type;
    group.classList.add("score-osmd-event");
    group.setAttribute("aria-label", previewEventLabel(event, input));

    if (input.onEventSelect) {
      group.classList.add("is-interactive");
      group.setAttribute("role", "button");
      group.setAttribute("tabindex", "0");
      appendHitTarget(group);
      group.onclick = (pointerEvent) => { pointerEvent.stopPropagation(); input.onEventSelect?.(event.id); };
      group.onkeydown = (keyboardEvent) => {
        if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
          keyboardEvent.preventDefault();
          keyboardEvent.stopPropagation();
          input.onEventSelect?.(event.id);
        }
      };
    }
    count += 1;
    }
  }

  return count;
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
          .filter((event) => event.printObject !== false),
      ),
  );
}

function previewEventLabel(
  event: PreviewEvent,
  labels: Pick<Parameters<typeof bindRenderedScoreEvents>[0], "eventLabelTemplate" | "noteLabel" | "restLabel">,
) {
  const type = event.type === "note" ? labels.noteLabel : labels.restLabel;
  return formatMessage(labels.eventLabelTemplate, {
    part: event.partId,
    measure: event.measureNumber,
    type,
    number: event.eventIndex + 1,
  });
}

function cssEscape(value: string) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }

  return value.replace(/["\\]/g, "\\$&");
}
