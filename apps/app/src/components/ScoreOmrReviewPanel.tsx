"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatMessage, formatNumber, type SupportedLocale } from "@score/i18n";
import type { ScoreJson } from "@score/shared";
import { API_BASE_URL } from "../lib/api";
import { hasMatchingOmrImageDimensions, projectOmrBbox } from "../lib/omr-overlay-geometry";
import { useScoreReviewMessages } from "../lib/score-entry-messages/client";

type SourceFile = {
  id: string;
  originalName: string;
  mimeType: string;
};

type DiagnosticItem = {
  id: string;
  eventId?: string;
  measureId?: string;
  label: string;
  confidence: number | null;
  source: "omr-engine" | "structural";
  issues: string[];
  page: number;
  bbox?: { x: number; y: number; width: number; height: number };
  grade: number | null;
  contextualGrade: number | null;
};

export function ScoreOmrReviewPanel({
  scoreId,
  sourceFile,
  pageFiles = [],
  token,
  scoreJson,
  selectedEventId,
  onEventSelect,
  locale,
  zoom = 1,
}: {
  scoreId: string;
  sourceFile: SourceFile | null;
  pageFiles?: SourceFile[];
  token: string | null;
  scoreJson: ScoreJson | null;
  selectedEventId?: string | null;
  onEventSelect: (eventId: string) => void;
  locale: SupportedLocale;
  zoom?: number;
}) {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [issuesOnly, setIssuesOnly] = useState(true);
  const [sourceMode, setSourceMode] = useState<"original" | "overlay">("overlay");
  const [activeDiagnosticId, setActiveDiagnosticId] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const sourcePreviewRef = useRef<HTMLDivElement | null>(null);
  const copy = useScoreReviewMessages().omr;
  const orderedPageFiles = useMemo(
    () => [...pageFiles].sort((left, right) => left.originalName.localeCompare(right.originalName, undefined, { numeric: true })),
    [pageFiles],
  );
  const hasOverlayPages = orderedPageFiles.length > 0;
  const showOverlayPage = sourceMode === "overlay" && hasOverlayPages;
  const displayedFile = showOverlayPage ? orderedPageFiles[activePage - 1] ?? orderedPageFiles[0] : sourceFile ?? orderedPageFiles[activePage - 1];

  useEffect(() => {
    if (!displayedFile) {
      setSourceUrl(null);
      return;
    }

    let active = true;
    let objectUrl: string | null = null;
    setSourceError(null);
    setSourceUrl(null);
    void fetch(`${API_BASE_URL}/api/scores/${scoreId}/assets/${displayedFile.id}/preview`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.clone().json().catch(() => null) as { error?: unknown } | null;
          throw new Error(typeof payload?.error === "string" ? payload.error : copy.sourcePreviewFailed);
        }
        objectUrl = URL.createObjectURL(await response.blob());
        if (active) setSourceUrl(objectUrl);
      })
      .catch((error: unknown) => active && setSourceError(error instanceof Error ? error.message : copy.sourcePreviewFailed));

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [copy.sourcePreviewFailed, displayedFile, scoreId, token]);

  useEffect(() => setImageDimensions(null), [sourceUrl]);

  const diagnostics = useMemo<DiagnosticItem[]>(() => {
    if (!scoreJson) return [];
    if (scoreJson.recognitionLayer?.symbols.length) {
      const measureLabels = new Map(scoreJson.measures.map((measure) => [measure.id, measure.number]));
      return scoreJson.recognitionLayer.symbols
        .map((symbol) => ({
          id: symbol.id,
          eventId: symbol.eventId,
          measureId: symbol.measureId,
          label: `${symbol.shape} · ${formatMessage(copy.pageTemplate, { page: formatNumber(symbol.page, locale) })}${symbol.measureId ? ` · ${formatMessage(copy.measureTemplate, { measure: formatMaybeNumber(measureLabels.get(symbol.measureId) ?? symbol.measureId, locale) })}` : ""}`,
          confidence: symbol.confidence,
          source: "omr-engine" as const,
          issues: symbol.issues,
          page: symbol.page,
          bbox: symbol.bbox,
          grade: symbol.grade,
          contextualGrade: symbol.contextualGrade,
        }))
        .sort((left, right) => (left.confidence ?? 1) - (right.confidence ?? 1));
    }
    const partNames = new Map(scoreJson.parts.map((part) => [part.id, part.name]));
    return scoreJson.measures
      .flatMap((measure) =>
        measure.events
          .filter((event) => event.recognition)
          .map((event) => ({
            id: event.id,
            eventId: event.id,
            measureId: measure.id,
            label: `${partNames.get(measure.partId) ?? measure.partId} · ${formatMessage(copy.measureTemplate, { measure: formatMaybeNumber(measure.number, locale) })}`,
            confidence: event.recognition?.confidence ?? null,
            source: event.recognition?.source ?? "structural",
            issues: event.recognition?.issues ?? [],
            page: event.recognition?.page ?? 1,
            bbox: event.recognition?.bbox,
            grade: null,
            contextualGrade: null,
          })),
      )
      .sort((left, right) => (left.confidence ?? 1) - (right.confidence ?? 1));
  }, [copy.measureTemplate, copy.pageTemplate, locale, scoreJson]);

  const availablePages = useMemo(() => {
    const pages = new Set<number>([
      ...diagnostics.map((item) => item.page),
      ...(scoreJson?.recognitionLayer?.pages?.map((page) => page.page) ?? []),
      ...orderedPageFiles.map((_, index) => index + 1),
    ]);
    if (pages.size === 0 && sourceFile) pages.add(1);
    return [...pages].sort((left, right) => left - right);
  }, [diagnostics, orderedPageFiles, scoreJson?.recognitionLayer?.pages, sourceFile]);
  const pageDimensions = scoreJson?.recognitionLayer?.pages?.find((page) => page.page === activePage) ?? null;
  const pageDiagnostics = diagnostics.filter((item) => item.page === activePage);
  const visibleDiagnostics = pageDiagnostics.filter((item) => !issuesOnly || item.issues.length > 0);
  const issueDiagnostics = diagnostics.filter((item) => item.issues.length > 0);
  const problemMeasures = new Set(issueDiagnostics.map((item) => item.measureId).filter(Boolean));
  const overlayDiagnostics = pageDimensions ? pageDiagnostics.filter((item) => item.bbox && item.issues.length > 0).slice(0, 300) : [];
  const imageGeometryMatches = !pageDimensions || !imageDimensions || hasMatchingOmrImageDimensions(pageDimensions, imageDimensions.width, imageDimensions.height);

  useEffect(() => {
    if (!selectedEventId) return;
    const selected = diagnostics.find((item) => item.eventId === selectedEventId);
    if (!selected) return;
    setActiveDiagnosticId(selected.id);
    setActivePage(selected.page);
  }, [diagnostics, selectedEventId]);

  useEffect(() => {
    if (!activeDiagnosticId || !sourceUrl || !showOverlayPage) return;
    const frame = requestAnimationFrame(() => {
      const selected = sourcePreviewRef.current?.querySelector<HTMLElement>(`[data-omr-symbol-id="${cssEscape(activeDiagnosticId)}"]`);
      selected?.scrollIntoView({ block: "center", inline: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeDiagnosticId, showOverlayPage, sourceUrl, zoom]);

  function selectDiagnostic(item: DiagnosticItem) {
    setActiveDiagnosticId(item.id);
    setActivePage(item.page);
    if (item.eventId) onEventSelect(item.eventId);
  }

  function moveIssue(direction: -1 | 1) {
    if (issueDiagnostics.length === 0) return;
    const currentIndex = issueDiagnostics.findIndex((item) => item.id === activeDiagnosticId);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + direction + issueDiagnostics.length) % issueDiagnostics.length;
    if (hasOverlayPages) setSourceMode("overlay");
    selectDiagnostic(issueDiagnostics[nextIndex]);
  }

  return (
    <section className="surface-panel stack-lg">
      <div className="stack-sm">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 className="card-title">{copy.title}</h2>
        <p className="body-copy">{copy.body}</p>
      </div>

      <div className="score-review-toolbar">
        <div className="button-row" role="group" aria-label={copy.issueNavigation}>
          <button type="button" className="button button-secondary button-ghost" onClick={() => moveIssue(-1)} disabled={issueDiagnostics.length === 0}>
            {copy.previous}
          </button>
          <button type="button" className="button button-secondary button-ghost" onClick={() => moveIssue(1)} disabled={issueDiagnostics.length === 0}>
            {copy.next}
          </button>
        </div>
        <div className="button-row" role="group" aria-label={copy.sourceMode}>
          <button type="button" className={`button button-secondary button-ghost${sourceMode === "original" ? " is-active" : ""}`} onClick={() => setSourceMode("original")} disabled={!sourceFile}>
            {copy.original}
          </button>
          <button type="button" className={`button button-secondary button-ghost${sourceMode === "overlay" ? " is-active" : ""}`} onClick={() => setSourceMode("overlay")} disabled={!hasOverlayPages}>
            {copy.overlay}
          </button>
        </div>
        <label className="check-row">
          <input type="checkbox" checked={issuesOnly} onChange={(event) => setIssuesOnly(event.target.checked)} />
          <span>{copy.issuesOnly}</span>
        </label>
      </div>

      {availablePages.length > 1 ? (
        <div className="score-page-tabs" role="tablist" aria-label={copy.scanPages}>
          {availablePages.map((page) => (
            <button key={page} type="button" className={page === activePage ? "is-active" : ""} onClick={() => setActivePage(page)}>
              {formatMessage(copy.pageTemplate, { page: formatNumber(page, locale) })}
            </button>
          ))}
        </div>
      ) : null}

      <div ref={sourcePreviewRef} className="score-source-preview">
        {!displayedFile ? <div className="empty-state">{copy.noSource}</div> : null}
        {sourceError ? <p className="form-status error" role="alert">{sourceError}</p> : null}
        {displayedFile && !sourceUrl && !sourceError ? <div className="empty-state" role="status" aria-live="polite">{copy.loadingSource}</div> : null}
        {sourceUrl && displayedFile?.mimeType === "application/pdf" ? <iframe src={`${sourceUrl}#page=${activePage}`} title={displayedFile.originalName} /> : null}
        {sourceUrl && displayedFile?.mimeType.startsWith("image/") ? (
          <>
            {!imageGeometryMatches ? (
              <p className="score-geometry-warning" role="alert">
                {copy.geometryWarning}
              </p>
            ) : null}
            <div className="score-source-image-stage" data-omr-page={activePage} data-review-zoom={zoom} style={{ width: `${zoom * 100}%` }}>
              <img
                src={sourceUrl}
                alt={formatMessage(copy.scanAltTemplate, { name: displayedFile.originalName })}
                onLoad={(event) => setImageDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
              />
              {pageDimensions && showOverlayPage ? (
                <div className="score-source-symbol-layer" aria-label={copy.symbolLayer}>
                  {overlayDiagnostics.map((item) => {
                    const projected = projectOmrBbox(pageDimensions, item.bbox!);
                    if (!projected) return null;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        className={item.id === activeDiagnosticId ? "is-active" : ""}
                        data-omr-symbol-id={item.id}
                        data-omr-clipped={projected.clipped || undefined}
                        style={{
                          left: `${projected.leftPercent}%`,
                          top: `${projected.topPercent}%`,
                          width: `${projected.widthPercent}%`,
                          height: `${projected.heightPercent}%`,
                        }}
                        title={`${item.label} · ${formatConfidence(item.confidence, locale)}`}
                        onClick={() => selectDiagnostic(item)}
                      />
                    );
                  })}
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      <div className="score-diagnostic-summary">
        <span>{copy.pageSymbols}: {formatNumber(pageDiagnostics.length, locale)}</span>
        <span>{copy.issueSymbols}: {formatNumber(issueDiagnostics.length, locale)}</span>
        <span>{copy.problemMeasures}: {formatNumber(problemMeasures.size, locale)}</span>
      </div>
      {visibleDiagnostics.length > 0 ? (
        <div className="score-diagnostic-list">
          {visibleDiagnostics.slice(0, 100).map((item) => (
            <button
              type="button"
              className={`score-diagnostic-item${item.issues.length ? " has-issues" : ""}${item.id === activeDiagnosticId ? " is-active" : ""}`}
              key={item.id}
              onClick={() => selectDiagnostic(item)}
            >
              <span>{item.label}</span>
              <strong>{formatConfidence(item.confidence, locale)}</strong>
              <small>{copy.sources[item.source]}{item.issues.length ? ` · ${item.issues[0]}` : ""}</small>
              {item.bbox ? (
                <small>
                  x {formatNumber(item.bbox.x, locale, { maximumFractionDigits: 0 })}, y {formatNumber(item.bbox.y, locale, { maximumFractionDigits: 0 })},{" "}
                  {formatNumber(item.bbox.width, locale, { maximumFractionDigits: 0 })} × {formatNumber(item.bbox.height, locale, { maximumFractionDigits: 0 })}
                  {item.grade !== null ? ` · ${copy.gradeLabel} ${formatNumber(item.grade, locale, { maximumFractionDigits: 3 })}` : ""}
                  {item.contextualGrade !== null ? ` · ${copy.contextGradeLabel} ${formatNumber(item.contextualGrade, locale, { maximumFractionDigits: 3 })}` : ""}
                </small>
              ) : null}
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state">{copy.noDiagnostics}</div>
      )}
    </section>
  );
}

function formatMaybeNumber(value: string, locale: SupportedLocale): string {
  return /^\d+(?:\.\d+)?$/u.test(value) ? formatNumber(Number(value), locale) : value;
}

function formatConfidence(value: number | null, locale: SupportedLocale): string {
  return value === null ? "—" : formatNumber(value, locale, { style: "percent", maximumFractionDigits: 0 });
}

function cssEscape(value: string) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value);
  return value.replace(/["\\]/g, "\\$&");
}
