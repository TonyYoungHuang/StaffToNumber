"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ScoreJson } from "@score/shared";
import { API_BASE_URL } from "../lib/api";
import { hasMatchingOmrImageDimensions, projectOmrBbox } from "../lib/omr-overlay-geometry";

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
  sourceFile,
  pageFiles = [],
  token,
  scoreJson,
  selectedEventId,
  onEventSelect,
  locale,
  zoom = 1,
}: {
  sourceFile: SourceFile | null;
  pageFiles?: SourceFile[];
  token: string | null;
  scoreJson: ScoreJson | null;
  selectedEventId?: string | null;
  onEventSelect: (eventId: string) => void;
  locale: string;
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
  const isChinese = locale === "zh-CN";
  const orderedPageFiles = useMemo(
    () => [...pageFiles].sort((left, right) => left.originalName.localeCompare(right.originalName, undefined, { numeric: true })),
    [pageFiles],
  );
  const hasOverlayPages = orderedPageFiles.length > 0;
  const showOverlayPage = sourceMode === "overlay" && hasOverlayPages;
  const displayedFile = showOverlayPage ? orderedPageFiles[activePage - 1] ?? orderedPageFiles[0] : sourceFile ?? orderedPageFiles[activePage - 1];

  useEffect(() => {
    if (!displayedFile || !token) {
      setSourceUrl(null);
      return;
    }

    let active = true;
    let objectUrl: string | null = null;
    setSourceError(null);
    setSourceUrl(null);
    void fetch(`${API_BASE_URL}/api/files/${displayedFile.id}/download`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Source preview failed.");
        objectUrl = URL.createObjectURL(await response.blob());
        if (active) setSourceUrl(objectUrl);
      })
      .catch(() => active && setSourceError(isChinese ? "无法加载扫描原件。" : "Could not load the scan source."));

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [displayedFile, isChinese, token]);

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
          label: `${symbol.shape} · ${isChinese ? "第" : "page "}${symbol.page}${isChinese ? "页" : ""}${symbol.measureId ? ` · ${isChinese ? "小节" : "measure"} ${measureLabels.get(symbol.measureId) ?? symbol.measureId}` : ""}`,
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
            label: `${partNames.get(measure.partId) ?? measure.partId} · ${isChinese ? "小节" : "measure"} ${measure.number}`,
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
  }, [isChinese, scoreJson]);

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
        <p className="eyebrow">{isChinese ? "OMR 对照校对" : "OMR comparison"}</p>
        <h2 className="card-title">{isChinese ? "扫描原件与识别诊断" : "Scan source and recognition diagnostics"}</h2>
        <p className="body-copy">
          {isChinese
            ? "红框来自 Audiveris 符号坐标；structural 仅表示节奏完整性诊断，不作为模型概率。"
            : "Red boxes use Audiveris symbol coordinates. Structural scores validate rhythm and are not model probabilities."}
        </p>
      </div>

      <div className="score-review-toolbar">
        <div className="button-row" role="group" aria-label={isChinese ? "错误定位" : "Issue navigation"}>
          <button type="button" className="button button-secondary button-ghost" onClick={() => moveIssue(-1)} disabled={issueDiagnostics.length === 0}>
            {isChinese ? "上一项" : "Previous"}
          </button>
          <button type="button" className="button button-secondary button-ghost" onClick={() => moveIssue(1)} disabled={issueDiagnostics.length === 0}>
            {isChinese ? "下一项" : "Next"}
          </button>
        </div>
        <div className="button-row" role="group" aria-label={isChinese ? "原件显示模式" : "Source display mode"}>
          <button type="button" className={`button button-secondary button-ghost${sourceMode === "original" ? " is-active" : ""}`} onClick={() => setSourceMode("original")} disabled={!sourceFile}>
            {isChinese ? "原始文件" : "Original"}
          </button>
          <button type="button" className={`button button-secondary button-ghost${sourceMode === "overlay" ? " is-active" : ""}`} onClick={() => setSourceMode("overlay")} disabled={!hasOverlayPages}>
            {isChinese ? "坐标校对图" : "Diagnostic overlay"}
          </button>
        </div>
        <label className="check-row">
          <input type="checkbox" checked={issuesOnly} onChange={(event) => setIssuesOnly(event.target.checked)} />
          <span>{isChinese ? "只看问题符号" : "Issues only"}</span>
        </label>
      </div>

      {availablePages.length > 1 ? (
        <div className="score-page-tabs" role="tablist" aria-label={isChinese ? "扫描页" : "Scan pages"}>
          {availablePages.map((page) => (
            <button key={page} type="button" className={page === activePage ? "is-active" : ""} onClick={() => setActivePage(page)}>
              {isChinese ? `第 ${page} 页` : `Page ${page}`}
            </button>
          ))}
        </div>
      ) : null}

      <div ref={sourcePreviewRef} className="score-source-preview">
        {!displayedFile ? <div className="empty-state">{isChinese ? "这个工程没有可预览的 PDF/图片原件。" : "No PDF/image source is attached to this project."}</div> : null}
        {sourceError ? <p className="form-status error">{sourceError}</p> : null}
        {displayedFile && !sourceUrl && !sourceError ? <div className="empty-state">{isChinese ? "正在加载扫描原件..." : "Loading scan source..."}</div> : null}
        {sourceUrl && displayedFile?.mimeType === "application/pdf" ? <iframe src={`${sourceUrl}#page=${activePage}`} title={displayedFile.originalName} /> : null}
        {sourceUrl && displayedFile?.mimeType.startsWith("image/") ? (
          <>
            {!imageGeometryMatches ? (
              <p className="score-geometry-warning" role="alert">
                {isChinese ? "页图像素尺寸与识别记录不一致，坐标框可能偏移，请重新识别该文件。" : "The page image dimensions differ from the recognition record. Re-run recognition before approving it."}
              </p>
            ) : null}
            <div className="score-source-image-stage" data-omr-page={activePage} data-review-zoom={zoom} style={{ width: `${zoom * 100}%` }}>
              <img
                src={sourceUrl}
                alt={isChinese ? `${displayedFile.originalName} 扫描原件` : `${displayedFile.originalName} scan source`}
                onLoad={(event) => setImageDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
              />
              {pageDimensions && showOverlayPage ? (
                <div className="score-source-symbol-layer" aria-label={isChinese ? "低置信度符号位置" : "Low-confidence symbol positions"}>
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
                        title={`${item.label} · ${item.confidence === null ? "-" : `${Math.round(item.confidence * 100)}%`}`}
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
        <span>{isChinese ? "本页符号" : "Page symbols"}: {pageDiagnostics.length}</span>
        <span>{isChinese ? "问题符号" : "Issue symbols"}: {issueDiagnostics.length}</span>
        <span>{isChinese ? "异常小节" : "Problem measures"}: {problemMeasures.size}</span>
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
              <strong>{item.confidence === null ? "-" : `${Math.round(item.confidence * 100)}%`}</strong>
              <small>{item.source}{item.issues.length ? ` · ${item.issues[0]}` : ""}</small>
              {item.bbox ? <small>x {Math.round(item.bbox.x)}, y {Math.round(item.bbox.y)}, {Math.round(item.bbox.width)} × {Math.round(item.bbox.height)}{item.grade !== null ? ` · grade ${item.grade}` : ""}{item.contextualGrade !== null ? ` · ctx ${item.contextualGrade}` : ""}</small> : null}
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state">{isChinese ? "本页没有符合筛选条件的诊断。" : "No diagnostics match this page and filter."}</div>
      )}
    </section>
  );
}

function cssEscape(value: string) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value);
  return value.replace(/["\\]/g, "\\$&");
}
