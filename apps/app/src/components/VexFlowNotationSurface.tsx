"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { formatMessage, formatNumber, type SupportedLocale } from "@score/i18n";
import type { ScoreClef, ScoreEvent, ScoreJson, ScoreMeasure } from "@score/shared";
import { Accidental, Annotation, Articulation, Beam, Dot, Formatter, FretHandFinger, GhostNote, GraceNote, GraceNoteGroup, Modifier, Ornament, Renderer, Stave, StaveConnector, StaveNote, Stem, Tremolo, Tuplet, Voice } from "vexflow/bravura";
import { buildVexFlowScoreLayout, VEXFLOW_LAYOUT } from "../lib/vexflow-layout";
import type { VexFlowPageLayout, VexFlowSystemLayout } from "../lib/vexflow-layout";
import { buildVexFlowStaffTimeline, findVexFlowChordDurationConflicts } from "../lib/vexflow-event-groups";
import { buildVexFlowBeamGroups } from "../lib/vexflow-beam-groups";
import { buildVexFlowVoiceCollisionShifts, buildVexFlowVoiceLayout } from "../lib/vexflow-voice-layout";
import { buildVexFlowModifierPlacements } from "../lib/vexflow-modifier-layout";
import { buildVexFlowMeasureAnnotations } from "../lib/vexflow-measure-annotations";
import { findVexFlowKeySignature } from "../lib/vexflow-key-signature";
import { buildVexFlowPageInvalidations } from "../lib/vexflow-page-invalidation";
import type { VexFlowPageInvalidation, VexFlowSystemInvalidation } from "../lib/vexflow-page-invalidation";
import { useScoreEditorMessages } from "../lib/score-editor-messages/client";
import type { ScoreEditorMessages } from "../lib/score-editor-messages/types";

type HitBox = {
  eventId: string;
  partId: string;
  measureId: string;
  eventIndex: number;
  staff: number;
  voice: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type SelectionBox = { startX: number; startY: number; x: number; y: number };
type MeasureBox = { partId: string; measureId: string; x: number; y: number; width: number; height: number; eventCount: number };
type EventDrag = {
  eventId: string;
  partId: string;
  originMeasureId: string;
  originEventIndex: number;
  startScreenX: number;
  startScreenY: number;
  x: number;
  y: number;
  lastScreenX: number;
  lastScreenY: number;
  hasMoved: boolean;
  pointerId: number;
};
export type VexFlowEventDrag = { eventId: string; targetMeasureId: string; targetIndex: number; semitoneDelta: number };
type RenderedNote = { eventId: string; event: ScoreEvent; note: StaveNote | GraceNote; keyIndex: number };
type RenderedTickable = { eventIds: string[]; event: ScoreEvent; note: StaveNote };
type VexContext = ReturnType<Renderer["getContext"]>;
type PageRenderResult = { hitBoxes: HitBox[]; measureBoxes: MeasureBox[] };
const VIRTUAL_PAGE_ROOT_MARGIN = "1400px 0px";
const VIRTUALIZATION_PAGE_THRESHOLD = 4;

export function VexFlowNotationSurface({
  scoreJson,
  selectedEventIds,
  onSelectionChange,
  onEventDrag,
}: {
  scoreJson: ScoreJson;
  selectedEventIds: string[];
  onSelectionChange: (eventIds: string[]) => void;
  onEventDrag: (drag: VexFlowEventDrag) => void;
  }) {
  const { locale, messages } = useScoreEditorMessages();
  const copy = messages.vexFlow;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const hitBoxesRef = useRef<HitBox[]>([]);
  const measureBoxesRef = useRef<MeasureBox[]>([]);
  const systemResultsRef = useRef(new Map<number, PageRenderResult>());
  const [semanticHitBoxes, setSemanticHitBoxes] = useState<HitBox[]>([]);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [eventDrag, setEventDrag] = useState<EventDrag | null>(null);
  const [viewportWidth, setViewportWidth] = useState(980);
  const chordDurationConflicts = findVexFlowChordDurationConflicts(scoreJson.measures);
  const layout = useMemo(() => buildVexFlowScoreLayout(scoreJson, viewportWidth), [scoreJson, viewportWidth]);
  const pageInvalidations = useMemo(
    () => buildVexFlowPageInvalidations(scoreJson, layout, selectedEventIds),
    [layout, scoreJson, selectedEventIds],
  );
  const systemIndexKey = layout.systems.map((system) => system.index).join("|");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const updateWidth = () => setViewportWidth(Math.max(320, Math.floor(host.clientWidth)));
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const publishSystemResult = useCallback(
    (systemIndex: number, result: PageRenderResult) => {
      systemResultsRef.current.set(systemIndex, result);
      const orderedResults = layout.systems.map((system) => systemResultsRef.current.get(system.index)).filter((item): item is PageRenderResult => Boolean(item));
      const hitBoxes = orderedResults.flatMap((item) => item.hitBoxes);
      const measureBoxes = orderedResults.flatMap((item) => item.measureBoxes);
      hitBoxesRef.current = hitBoxes;
      measureBoxesRef.current = measureBoxes;
      setSemanticHitBoxes(hitBoxes);
    },
    [layout.pages],
  );

  const removeSystemResult = useCallback(
    (systemIndex: number) => {
      if (!systemResultsRef.current.delete(systemIndex)) return;
      const orderedResults = layout.systems.map((system) => systemResultsRef.current.get(system.index)).filter((item): item is PageRenderResult => Boolean(item));
      const hitBoxes = orderedResults.flatMap((item) => item.hitBoxes);
      hitBoxesRef.current = hitBoxes;
      measureBoxesRef.current = orderedResults.flatMap((item) => item.measureBoxes);
      setSemanticHitBoxes(hitBoxes);
    },
    [layout.systems],
  );

  useEffect(() => {
    const activeSystems = new Set(layout.systems.map((system) => system.index));
    for (const systemIndex of systemResultsRef.current.keys()) {
      if (!activeSystems.has(systemIndex)) systemResultsRef.current.delete(systemIndex);
    }
  }, [layout.systems, systemIndexKey]);

  function localPoint(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left + event.currentTarget.scrollLeft,
      y: event.clientY - rect.top + event.currentTarget.scrollTop,
    };
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }
    const point = localPoint(event);
    const hit = findClosestHitBox(hitBoxesRef.current, point.x, point.y);
    if (hit) {
      if (event.shiftKey) {
        onSelectionChange(
          selectedEventIds.includes(hit.eventId)
            ? selectedEventIds.filter((id) => id !== hit.eventId)
            : [...selectedEventIds, hit.eventId],
        );
        return;
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      setEventDrag({
        eventId: hit.eventId,
        partId: hit.partId,
        originMeasureId: hit.measureId,
        originEventIndex: hit.eventIndex,
        startScreenX: event.screenX,
        startScreenY: event.screenY,
        x: point.x,
        y: point.y,
        lastScreenX: event.screenX,
        lastScreenY: event.screenY,
        hasMoved: false,
        pointerId: event.pointerId,
      });
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectionBox({ startX: point.x, startY: point.y, x: point.x, y: point.y });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (eventDrag?.pointerId === event.pointerId) {
      const point = localPoint(event);
      setEventDrag((current) =>
        current
          ? {
              ...current,
              x: point.x,
              y: point.y,
              lastScreenX: event.screenX,
              lastScreenY: event.screenY,
              hasMoved: current.hasMoved || Math.hypot(event.screenX - current.startScreenX, event.screenY - current.startScreenY) >= 8,
            }
          : null,
      );
      return;
    }
    if (!selectionBox) {
      return;
    }
    const point = localPoint(event);
    setSelectionBox((current) => (current ? { ...current, x: point.x, y: point.y } : null));
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (eventDrag?.pointerId === event.pointerId) {
      const drag = eventDrag;
      setEventDrag(null);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (!drag.hasMoved) {
        onSelectionChange([drag.eventId]);
        return;
      }
      if (!selectedEventIds.includes(drag.eventId)) {
        onSelectionChange([drag.eventId]);
      }
      const dx = drag.lastScreenX - drag.startScreenX;
      const dy = drag.lastScreenY - drag.startScreenY;
      const verticalOnly = Math.abs(dx) < 12;
      const targetMeasure = verticalOnly ? undefined : findTargetMeasure(measureBoxesRef.current, drag.partId, drag.x, drag.y);
      if (!verticalOnly && !targetMeasure) return;
      const targetIndex = verticalOnly
        ? drag.originEventIndex
        : Math.min(
            targetMeasure!.eventCount,
            Math.max(0, Math.round(((drag.x - targetMeasure!.x) / targetMeasure!.width) * targetMeasure!.eventCount)),
          );
      onEventDrag({
        eventId: drag.eventId,
        targetMeasureId: verticalOnly ? drag.originMeasureId : targetMeasure!.measureId,
        targetIndex,
        semitoneDelta: Math.min(48, Math.max(-48, Math.round(-dy / 5))),
      });
      return;
    }
    if (!selectionBox) {
      return;
    }
    const left = Math.min(selectionBox.startX, selectionBox.x);
    const right = Math.max(selectionBox.startX, selectionBox.x);
    const top = Math.min(selectionBox.startY, selectionBox.y);
    const bottom = Math.max(selectionBox.startY, selectionBox.y);
    const selected = hitBoxesRef.current
      .filter((box) => box.x + box.width >= left && box.x <= right && box.y + box.height >= top && box.y <= bottom)
      .map((box) => box.eventId);
    onSelectionChange(event.shiftKey ? Array.from(new Set([...selectedEventIds, ...selected])) : selected);
    setSelectionBox(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div
      className="vexflow-score-surface"
      ref={hostRef}
      tabIndex={0}
      aria-label={copy.surfaceAria}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        setSelectionBox(null);
        setEventDrag(null);
      }}
    >
      {chordDurationConflicts.length > 0 ? (
        <button
          type="button"
          className="vexflow-rhythm-warning"
          title={copy.rhythmWarningTitle}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onSelectionChange(Array.from(new Set(chordDurationConflicts.flatMap((conflict) => conflict.eventIds))))}
        >
          {formatMessage(copy.rhythmWarning, { count: formatNumber(chordDurationConflicts.length, locale) })}
        </button>
      ) : null}
      <div
        className="vexflow-canvas"
        data-vexflow-page-count={pageInvalidations.length}
        style={{ width: layout.width, height: layout.height }}
      >
        {pageInvalidations.map((invalidation) => (
          <VexFlowPageSurface
            key={invalidation.page.index}
            scoreJson={scoreJson}
            selectedEventIds={selectedEventIds}
            invalidation={invalidation}
            locale={locale}
            copy={copy}
            virtualizationEnabled={pageInvalidations.length > VIRTUALIZATION_PAGE_THRESHOLD}
            onRendered={publishSystemResult}
            onRemoved={removeSystemResult}
          />
        ))}
      </div>
      <div className="vexflow-event-hit-layer" aria-label={copy.hitLayerAria}>
        {semanticHitBoxes.map((box) => (
          <button
            key={box.eventId}
            type="button"
            className="vexflow-event-hit-target"
            data-vexflow-event-id={box.eventId}
            data-measure-id={box.measureId}
            data-event-index={box.eventIndex}
            data-part-id={box.partId}
            data-staff={box.staff}
            data-voice={box.voice}
            aria-label={formatMessage(copy.eventAria, {
              measure: box.measureId,
              number: formatNumber(box.eventIndex + 1, locale),
            })}
            aria-pressed={selectedEventIds.includes(box.eventId)}
            style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
            onClick={(event) => {
              if (event.detail === 0) {
                onSelectionChange([box.eventId]);
              }
            }}
          />
        ))}
      </div>
      {eventDrag?.hasMoved ? (
        <span className="vexflow-drag-indicator" style={{ left: eventDrag.x - 8, top: eventDrag.y - 8 }} />
      ) : null}
      {selectionBox ? (
        <span
          className="vexflow-selection-box"
          style={{
            left: Math.min(selectionBox.startX, selectionBox.x),
            top: Math.min(selectionBox.startY, selectionBox.y),
            width: Math.abs(selectionBox.x - selectionBox.startX),
            height: Math.abs(selectionBox.y - selectionBox.startY),
          }}
        />
      ) : null}
    </div>
  );
}

const VexFlowPageSurface = memo(
  function VexFlowPageSurface({
    scoreJson,
    selectedEventIds,
    invalidation,
    locale,
    copy,
    virtualizationEnabled,
    onRendered,
    onRemoved,
  }: {
    scoreJson: ScoreJson;
    selectedEventIds: string[];
    invalidation: VexFlowPageInvalidation;
    locale: SupportedLocale;
    copy: ScoreEditorMessages["vexFlow"];
    virtualizationEnabled: boolean;
    onRendered: (systemIndex: number, result: PageRenderResult) => void;
    onRemoved: (systemIndex: number) => void;
  }) {
    const pageRef = useRef<HTMLDivElement | null>(null);
    const [isNearViewport, setIsNearViewport] = useState(invalidation.page.index === 0);
    const containsSelection = invalidation.systemInvalidations.some((system) =>
      system.eventIds.some((eventId) => selectedEventIds.includes(eventId)),
    );
    const shouldRender = !virtualizationEnabled || isNearViewport || containsSelection;

    useEffect(() => {
      if (!virtualizationEnabled) {
        setIsNearViewport(true);
        return;
      }
      const page = pageRef.current;
      if (!page) return;
      if (typeof IntersectionObserver === "undefined") {
        setIsNearViewport(true);
        return;
      }
      const observer = new IntersectionObserver(
        ([entry]) => setIsNearViewport(Boolean(entry?.isIntersecting)),
        { root: null, rootMargin: VIRTUAL_PAGE_ROOT_MARGIN, threshold: 0 },
      );
      observer.observe(page);
      return () => observer.disconnect();
    }, [invalidation.page.index, virtualizationEnabled]);

    return (
      <div
        ref={pageRef}
        className="vexflow-page-canvas"
        data-vexflow-page-index={invalidation.page.index}
        data-vexflow-page-rendered={shouldRender ? "true" : "false"}
        style={{
          left: invalidation.page.x,
          top: invalidation.page.y,
          width: invalidation.page.width,
          height: invalidation.page.height,
        }}
      >
        {shouldRender ? invalidation.systemInvalidations.map((systemInvalidation) => (
          <VexFlowSystemCanvas
            key={systemInvalidation.system.index}
            page={invalidation.page}
            scoreJson={scoreJson}
            selectedEventIds={selectedEventIds}
            invalidation={systemInvalidation}
            locale={locale}
            copy={copy}
            onRendered={onRendered}
            onRemoved={onRemoved}
          />
        )) : null}
        <span className="vexflow-page-number" aria-hidden="true">{formatNumber(invalidation.page.index + 1, locale)}</span>
      </div>
    );
  },
  (previous, next) =>
    previous.invalidation.contentKey === next.invalidation.contentKey &&
    previous.invalidation.selectionKey === next.invalidation.selectionKey &&
    previous.locale === next.locale &&
    previous.copy === next.copy &&
    previous.virtualizationEnabled === next.virtualizationEnabled,
);

const VexFlowSystemCanvas = memo(
  function VexFlowSystemCanvas({
    page,
    scoreJson,
    selectedEventIds,
    invalidation,
    locale,
    copy,
    onRendered,
    onRemoved,
  }: {
    page: VexFlowPageLayout;
    scoreJson: ScoreJson;
    selectedEventIds: string[];
    invalidation: VexFlowSystemInvalidation;
    locale: SupportedLocale;
    copy: ScoreEditorMessages["vexFlow"];
    onRendered: (systemIndex: number, result: PageRenderResult) => void;
    onRemoved: (systemIndex: number) => void;
  }) {
    const systemRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const host = systemRef.current;
      if (!host) return;
      const result = renderVexFlowSystem(host, page, invalidation.system, scoreJson, selectedEventIds, locale, copy);
      host.dataset.renderCount = String((Number.parseInt(host.dataset.renderCount ?? "0", 10) || 0) + 1);
      onRendered(invalidation.system.index, result);
    }, [copy, invalidation.contentKey, invalidation.selectionKey, invalidation.system, locale, onRendered, page, scoreJson, selectedEventIds]);

    useEffect(
      () => () => onRemoved(invalidation.system.index),
      [invalidation.system.index, onRemoved],
    );

    return (
      <div
        ref={systemRef}
        className="vexflow-system-canvas"
        data-vexflow-system-index={invalidation.system.index}
        data-render-count="0"
        style={{
          left: 0,
          top: invalidation.system.y - page.y,
          width: page.width,
          height: invalidation.system.height,
        }}
      />
    );
  },
  (previous, next) =>
    previous.invalidation.contentKey === next.invalidation.contentKey &&
    previous.invalidation.selectionKey === next.invalidation.selectionKey &&
    previous.locale === next.locale &&
    previous.copy === next.copy,
);

function renderVexFlowSystem(
  canvas: HTMLDivElement,
  page: VexFlowPageLayout,
  system: VexFlowSystemLayout,
  scoreJson: ScoreJson,
  selectedEventIds: string[],
  locale: SupportedLocale,
  copy: ScoreEditorMessages["vexFlow"],
): PageRenderResult {
  canvas.replaceChildren();
  const renderer = new Renderer(canvas, Renderer.Backends.SVG);
  renderer.resize(page.width, system.height);
  const context = renderer.getContext();
  const systemSvg = canvas.querySelector("svg");
  systemSvg?.setAttribute("viewBox", `${page.x} ${system.y} ${page.width} ${system.height}`);
  const hitBoxes: HitBox[] = [];
  const measureBoxes: MeasureBox[] = [];

  for (const part of system.parts) {
      context.save();
      context.setFont("Arial", 12);
      context.fillText(
        system.index === 0 ? part.partName : part.abbreviation ?? part.partName,
        page.x + VEXFLOW_LAYOUT.pageMargin,
        part.y + part.height / 2,
      );
      context.restore();

      const firstStaves = new Map<number, Stave>();
      for (const [localMeasureIndex, measureLayout] of part.measures.entries()) {
        const measure = measureLayout.measure;
        measureBoxes.push({
          partId: part.partId,
          measureId: measure.id,
          x: measureLayout.x,
          y: part.y - 16,
          width: measureLayout.width,
          height: part.height,
          eventCount: measure.events.length,
        });

        const renderedVoices: Array<{ rendered: ReturnType<typeof buildVoices>[number]; stave: Stave }> = [];
        const measureStaves = new Map<number, Stave>();
        for (const staff of part.staves) {
          const stave = new Stave(measureLayout.x, staff.y, measureLayout.width);
          measureStaves.set(staff.staffNumber, stave);
          if (localMeasureIndex === 0) firstStaves.set(staff.staffNumber, stave);
          const hasExplicitClef =
            Boolean(measure.attributes?.clefs?.some((clef) => (clef.number ?? 1) === staff.staffNumber)) ||
            (staff.staffNumber === 1 && Boolean(measure.attributes?.clef));
          if (localMeasureIndex === 0 || hasExplicitClef) {
            stave.addClef(clefForStaff(scoreJson, part.partId, measure, staff.staffNumber));
          }
          const keySignature = findVexFlowKeySignature(scoreJson, part.partId, measure);
          if (keySignature && (localMeasureIndex === 0 || Boolean(measure.attributes?.key))) {
            stave.addKeySignature(keySignature);
          }
          const time = measure.attributes?.time;
          if (time?.beats && time.beatType && !time.senzaMisura) {
            stave.addTimeSignature(`${time.beats}/${time.beatType}`);
          }
          stave.setContext(context).draw();

          const voices = buildVoices(measure, selectedEventIds, staff.staffNumber);
          if (voices.length === 0) continue;
          applyPolyphonicVoiceLayout(voices, measure.events, staff.staffNumber);
          new Formatter().joinVoices(voices.map((item) => item.voice)).formatToStave(voices.map((item) => item.voice), stave, {
            alignRests: true,
          });
          renderedVoices.push(...voices.map((rendered) => ({ rendered, stave })));
        }

        drawMeasureAnnotations(measure, measureStaves, context);
        const allTickables = renderedVoices.flatMap(({ rendered }) => rendered.tickables);
        const explicitBeams = createExplicitBeams(measure.events, allTickables);
        for (const { rendered, stave } of renderedVoices) {
          rendered.voice.draw(context, stave);
          drawExplicitTuplets(rendered.tickables, context);
          rendered.renderedNotes.forEach(({ eventId, event, note, keyIndex }) => {
            const box = note.getBoundingBox();
            if (!box) return;
            const noteY = note.getYs()[keyIndex] ?? box.getY() + box.getH() / 2;
            hitBoxes.push({
              eventId,
              partId: part.partId,
              measureId: measure.id,
              eventIndex: measure.events.findIndex((candidate) => candidate.id === eventId),
              staff: event.staff ?? 1,
              voice: event.voice ?? "1",
              x: Math.min(box.getX(), note.getAbsoluteX() - 10),
              y: noteY - 9,
              width: Math.max(20, box.getW()),
              height: 18,
            });
          });
        }
        explicitBeams.forEach((beam) => beam.setContext(context).draw());
      }

      if (part.staves.length > 1) {
        const top = firstStaves.get(1);
        const bottom = firstStaves.get(part.staves.length);
        if (top && bottom) {
          new StaveConnector(top, bottom).setType(StaveConnector.type.BRACE).setContext(context).draw();
          new StaveConnector(top, bottom).setType(StaveConnector.type.SINGLE_LEFT).setContext(context).draw();
        }
      }
  }

  if (systemSvg) {
    systemSvg.setAttribute("role", "img");
    systemSvg.setAttribute("aria-label", formatMessage(copy.systemAria, {
      title: scoreJson.title,
      page: formatNumber(page.index + 1, locale),
      system: formatNumber(system.index + 1, locale),
    }));
  }
  return { hitBoxes, measureBoxes };
}

function findTargetMeasure(measures: MeasureBox[], partId: string, x: number, y: number) {
  const partMeasures = measures.filter((measure) => measure.partId === partId);
  const direct = partMeasures.find(
    (measure) => x >= measure.x && x <= measure.x + measure.width && y >= measure.y && y <= measure.y + measure.height,
  );
  if (direct) {
    return direct;
  }
  return partMeasures
    .map((measure) => ({
      measure,
      distance: Math.abs(x - Math.min(measure.x + measure.width, Math.max(measure.x, x))) + Math.abs(y - (measure.y + measure.height / 2)),
    }))
    .sort((a, b) => a.distance - b.distance)[0]?.measure;
}

function findClosestHitBox(hitBoxes: HitBox[], x: number, y: number) {
  return hitBoxes
    .filter((box) => x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height)
    .map((box) => ({
      box,
      distance: Math.hypot(x - (box.x + box.width / 2), y - (box.y + box.height / 2)),
    }))
    .sort((left, right) => left.distance - right.distance)[0]?.box;
}

function buildVoices(measure: ScoreMeasure, selectedEventIds: string[], staffNumber: number) {
  const voices = new Map<string, ScoreEvent[]>();
  for (const event of measure.events) {
    const voiceId = event.voice ?? "1";
    voices.set(voiceId, [...(voices.get(voiceId) ?? []), event]);
  }

  const time = measure.attributes?.time;
  const numBeats = Number.parseInt(time?.beats ?? "4", 10) || 4;
  const beatValue = Number.parseInt(time?.beatType ?? "4", 10) || 4;
  return Array.from(voices.entries()).map(([voiceId, events]) => {
    const renderedNotes: RenderedNote[] = [];
    const tickables: RenderedTickable[] = [];
    const rhythmTickables: Array<StaveNote | GhostNote> = [];
    let pendingGraceNotes: GraceNote[] = [];

    for (const unit of buildVexFlowStaffTimeline(events, staffNumber)) {
      const group = unit.group;
      const primaryEvent = group.events[0];
      if (!primaryEvent) continue;
      if (unit.kind === "placeholder") {
        const placeholder = new GhostNote({ duration: vexDuration(primaryEvent.durationType, primaryEvent.type === "rest") });
        for (let index = 0; index < primaryEvent.dots; index += 1) Dot.buildAndAttach([placeholder], { all: true });
        rhythmTickables.push(placeholder);
        continue;
      }
      if (primaryEvent.type === "note" && primaryEvent.grace) {
        const note = graceNoteForEvents(group.events);
        group.events.forEach((event, keyIndex) => {
          if (selectedEventIds.includes(event.id)) {
            note.setKeyStyle(keyIndex, { fillStyle: "#0f766e", strokeStyle: "#0f766e" });
          }
          renderedNotes.push({ eventId: event.id, event, note, keyIndex });
        });
        pendingGraceNotes.push(note);
        continue;
      }

      const note = staveNoteForEvents(group.events);
      if (pendingGraceNotes.length > 0) {
        const group = new GraceNoteGroup(pendingGraceNotes, false);
        if (pendingGraceNotes.length > 1) {
          group.beamNotes();
        }
        note.addModifier(group, 0);
        pendingGraceNotes = [];
      }
      group.events.forEach((event, keyIndex) => {
        if (selectedEventIds.includes(event.id)) {
          note.setKeyStyle(keyIndex, { fillStyle: "#0f766e", strokeStyle: "#0f766e" });
        }
        renderedNotes.push({ eventId: event.id, event, note, keyIndex });
      });
      tickables.push({ eventIds: group.events.map((event) => event.id), event: primaryEvent, note });
      rhythmTickables.push(note);
    }

    if (pendingGraceNotes.length > 0 && tickables.length > 0) {
      tickables.at(-1)?.note.addModifier(new GraceNoteGroup(pendingGraceNotes, false), 0);
    }
    if (tickables.length === 0) return null;
    const voice = new Voice({ numBeats, beatValue }).setMode(Voice.Mode.SOFT);
    voice.addTickables(rhythmTickables);
    return { voiceId, voice, renderedNotes, tickables };
  }).filter((item): item is NonNullable<typeof item> => item !== null);
}

function applyPolyphonicVoiceLayout(voices: ReturnType<typeof buildVoices>, events: ScoreEvent[], staffNumber: number) {
  if (voices.length < 2) return;
  const layoutByVoice = new Map(buildVexFlowVoiceLayout(voices.map((item) => item.voiceId)).map((item) => [item.voiceId, item]));
  const collisionShifts = buildVexFlowVoiceCollisionShifts(events, staffNumber);
  for (const voice of voices) {
    const layout = layoutByVoice.get(voice.voiceId);
    if (!layout) continue;
    for (const tickable of voice.tickables) {
      tickable.note.setStemDirection(layout.stemDirection === 1 ? Stem.UP : Stem.DOWN);
      tickable.note.setXShift(tickable.event.type === "note" ? collisionShifts.get(tickable.event.id) ?? 0 : 0);
      if (tickable.event.type === "rest") tickable.note.setKeyLine(0, layout.restLine);
    }
  }
}

function staveNoteForEvents(events: ScoreEvent[]) {
  const event = events[0];
  if (!event) throw new Error("A VexFlow event group cannot be empty.");
  const duration = vexDuration(event.durationType, event.type === "rest");
  const keys = event.type === "note"
    ? events.map((item) => item.type === "note" ? `${item.pitch.step.toLowerCase()}/${item.pitch.octave}` : "b/4")
    : ["b/4"];
  const note = new StaveNote({ keys, duration });
  for (const [keyIndex, item] of events.entries()) {
    if (item.type === "note" && item.pitch.alter !== 0) {
      note.addModifier(new Accidental(accidentalForAlter(item.pitch.alter)), keyIndex);
    }
  }
  for (let index = 0; index < event.dots; index += 1) {
    Dot.buildAndAttach([note], { all: true });
  }
  attachEventModifiers(note, events);
  if (event.type === "note") {
    for (const ornament of event.ornaments ?? []) {
      if (ornament.type === "tremolo") {
        const bars = Number.parseInt(ornament.value ?? "3", 10);
        note.addModifier(new Tremolo(Number.isInteger(bars) && bars >= 1 && bars <= 8 ? bars : 3), 0);
        continue;
      }
      const modifier = new Ornament(vexOrnamentType(ornament.type));
      if (ornament.type === "delayed-turn") {
        modifier.setDelayed(true);
      }
      note.addModifier(modifier, 0);
    }
  }
  return note;
}

function attachEventModifiers(note: StaveNote, events: ScoreEvent[]) {
  const placements = buildVexFlowModifierPlacements(events);
  for (const placement of placements) {
    const keyIndex = events.findIndex((event) => event.id === placement.eventId);
    const event = events[keyIndex];
    if (keyIndex < 0 || event?.type !== "note") continue;
    const position = placement.position === "above" ? Modifier.Position.ABOVE : Modifier.Position.BELOW;

    if (placement.kind === "lyric") {
      const lyric = event.lyrics[placement.itemIndex];
      if (!lyric?.text) continue;
      note.addModifier(
        new Annotation(lyric.text)
          .setJustification(Annotation.HorizontalJustify.CENTER)
          .setVerticalJustification(Annotation.VerticalJustify.BOTTOM)
          .setPosition(position)
          .setTextLine(placement.textLine)
          .setFont("Arial", 11),
        keyIndex,
      );
      continue;
    }
    if (placement.kind === "fingering") {
      const fingering = event.fingerings?.[placement.itemIndex];
      if (!fingering) continue;
      note.addModifier(new FretHandFinger(fingering).setPosition(position).setTextLine(placement.textLine), keyIndex);
      continue;
    }
    if (placement.kind === "fermata") {
      const fermata = event.fermatas?.[placement.itemIndex];
      note.addModifier(new Articulation(fermata?.type === "inverted" ? "a@u" : "a@a").setPosition(position).setTextLine(placement.textLine), keyIndex);
      continue;
    }
    const articulation = event.articulations?.[placement.itemIndex];
    if (!articulation) continue;
    if (articulation.type === "breath-mark" || articulation.type === "caesura") {
      const text = articulation.type === "breath-mark" ? "," : "//";
      note.addModifier(
        new Annotation(text)
          .setJustification(Annotation.HorizontalJustify.CENTER)
          .setVerticalJustification(Annotation.VerticalJustify.TOP)
          .setPosition(position)
          .setTextLine(placement.textLine)
          .setFont("Arial", 12, "bold"),
        keyIndex,
      );
      continue;
    }
    note.addModifier(new Articulation(vexArticulationCode(articulation.type)).setPosition(position).setTextLine(placement.textLine), keyIndex);
  }
}

function drawMeasureAnnotations(measure: ScoreMeasure, staves: Map<number, Stave>, context: VexContext) {
  const annotations = buildVexFlowMeasureAnnotations(measure);
  if (annotations.length === 0) return;
  const staffNumbers = Array.from(staves.keys()).sort((left, right) => left - right);
  const topStaffNumber = staffNumbers[0] ?? 1;
  const bottomStaffNumber = staffNumbers.at(-1) ?? topStaffNumber;
  const eventById = new Map(measure.events.map((event) => [event.id, event]));
  const eventPlacements = buildVexFlowModifierPlacements(measure.events);
  const maximumEventLine = (position: "above" | "below", staffNumber: number) => Math.max(
    -1,
    ...eventPlacements
      .filter((placement) => placement.position === position && (eventById.get(placement.eventId)?.staff ?? 1) === staffNumber)
      .map((placement) => placement.textLine),
  );
  const topOffset = maximumEventLine("above", topStaffNumber) + 1;
  const bottomOffset = maximumEventLine("below", bottomStaffNumber) + 1;

  for (const annotation of annotations) {
    const stave = annotation.position === "above" ? staves.get(topStaffNumber) : staves.get(bottomStaffNumber);
    if (!stave) continue;
    const textLine = (annotation.position === "above" ? topOffset : bottomOffset) + annotation.line;
    const y = annotation.position === "above" ? stave.getYForTopText(textLine) : stave.getYForBottomText(textLine);
    const font = measureAnnotationFont(annotation.kind);
    context.save();
    context.setFillStyle("#111827").setFont("Arial", font.size, font.weight, font.style);
    context.fillText(annotation.text, stave.getNoteStartX() + 6, y);
    context.restore();
  }
}

function measureAnnotationFont(kind: ReturnType<typeof buildVexFlowMeasureAnnotations>[number]["kind"]) {
  if (kind === "rehearsal") return { size: 13, weight: "bold", style: "normal" };
  if (kind === "harmony" || kind === "navigation") return { size: 12, weight: "bold", style: "normal" };
  if (kind === "dynamic") return { size: 12, weight: "bold", style: "italic" };
  if (kind === "wedge") return { size: 11, weight: "normal", style: "italic" };
  return { size: 11, weight: "normal", style: "normal" };
}

function vexArticulationCode(type: "accent" | "staccato" | "tenuto") {
  return type === "accent" ? "a>" : type === "tenuto" ? "a-" : "a.";
}

function graceNoteForEvents(events: ScoreEvent[]) {
  const event = events[0];
  if (!event || event.type !== "note") throw new Error("A grace-note group requires a note event.");
  const note = new GraceNote({
    keys: events.map((item) => item.type === "note" ? `${item.pitch.step.toLowerCase()}/${item.pitch.octave}` : "b/4"),
    duration: vexDuration(event.durationType, false),
    slash: event.grace?.slash ?? false,
  });
  for (const [keyIndex, item] of events.entries()) {
    if (item.type === "note" && item.pitch.alter !== 0) {
      note.addModifier(new Accidental(accidentalForAlter(item.pitch.alter)), keyIndex);
    }
  }
  for (let index = 0; index < event.dots; index += 1) {
    Dot.buildAndAttach([note], { all: true });
  }
  return note;
}

function createExplicitBeams(events: ScoreEvent[], tickables: RenderedTickable[]) {
  const notesByEventId = new Map<string, StaveNote>();
  tickables.forEach(({ eventIds, note }) => eventIds.forEach((eventId) => notesByEventId.set(eventId, note)));

  return buildVexFlowBeamGroups(events).flatMap((group) => {
    const notes = Array.from(new Set(group.eventIds.map((eventId) => notesByEventId.get(eventId)).filter((note): note is StaveNote => Boolean(note))));
    if (notes.length < 2) return [];
    if (group.crossStaff) {
      const topStaff = group.staffNumbers[0];
      for (const eventId of group.eventIds) {
        const event = events.find((item) => item.id === eventId);
        const note = notesByEventId.get(eventId);
        if (event && note) note.setStemDirection((event.staff ?? 1) === topStaff ? Stem.DOWN : Stem.UP);
      }
    }
    return [new Beam(notes, !group.crossStaff)];
  });
}

function drawExplicitTuplets(notes: RenderedTickable[], context: VexContext) {
  const active = new Map<string, { notes: StaveNote[]; actualNotes: number; normalNotes: number; bracketed: boolean; ratioed: boolean }>();
  for (const { event, note } of notes) {
    const markers = event.tuplets ?? [];
    const starting = new Set(markers.filter((marker) => marker.type === "start").map((marker) => marker.number ?? "1"));
    for (const [number, group] of active) {
      if (!starting.has(number)) {
        group.notes.push(note);
      }
    }
    for (const marker of markers.filter((item) => item.type === "start")) {
      const number = marker.number ?? "1";
      active.set(number, {
        notes: [note],
        actualNotes: event.timeModification?.actualNotes ?? 3,
        normalNotes: event.timeModification?.normalNotes ?? 2,
        bracketed: marker.bracket ?? true,
        ratioed: marker.showNumber === "both",
      });
    }
    for (const marker of markers.filter((item) => item.type === "stop")) {
      const number = marker.number ?? "1";
      const group = active.get(number);
      if (group && group.notes.length >= 2) {
        new Tuplet(group.notes, {
          numNotes: group.actualNotes,
          notesOccupied: group.normalNotes,
          bracketed: group.bracketed,
          ratioed: group.ratioed,
        }).setContext(context).draw();
      }
      active.delete(number);
    }
  }
}

function vexOrnamentType(type: Exclude<NonNullable<Extract<ScoreEvent, { type: "note" }>["ornaments"]>[number]["type"], "tremolo">) {
  if (type === "trill-mark") return "tr";
  if (type === "inverted-turn") return "turnInverted";
  if (type === "inverted-mordent") return "mordentInverted";
  if (type === "delayed-turn") return "turn";
  return type;
}

function vexDuration(durationType: string | undefined, rest: boolean) {
  const value = durationType === "whole" ? "w" : durationType === "half" ? "h" : durationType === "eighth" ? "8" : durationType === "16th" ? "16" : durationType === "32nd" ? "32" : durationType === "64th" ? "64" : "q";
  return `${value}${rest ? "r" : ""}`;
}

function accidentalForAlter(alter: number) {
  if (alter >= 2) return "##";
  if (alter === 1) return "#";
  if (alter === -1) return "b";
  return "bb";
}

function clefForStaff(score: ScoreJson, partId: string, measure: ScoreMeasure, staffNumber: number) {
  const measures = score.measures
    .filter((item) => item.partId === partId && item.sequence <= measure.sequence)
    .sort((a, b) => b.sequence - a.sequence);
  for (const candidate of measures) {
    const numbered = candidate.attributes?.clefs?.find((clef) => (clef.number ?? 1) === staffNumber);
    if (numbered) return vexClef(numbered.sign);
    if (staffNumber === 1 && candidate.attributes?.clef) return vexClef(candidate.attributes.clef.sign);
  }
  return staffNumber === 1 ? "treble" : "bass";
}

function vexClef(sign: ScoreClef["sign"]) {
  return sign === "F" ? "bass" : sign === "C" ? "alto" : sign === "percussion" ? "percussion" : sign === "TAB" ? "tab" : "treble";
}
