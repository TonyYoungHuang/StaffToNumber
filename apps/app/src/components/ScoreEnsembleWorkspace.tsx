"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatDateTime, formatNumber } from "@score/i18n";
import type { ScoreJson } from "@score/shared";
import { API_BASE_URL } from "../lib/api";
import { collectEnsembleEvents, ensembleCoverage, neighboringEnsembleEvent, type EnsembleEvent } from "../lib/ensemble-score-selection";
import { getEnsembleMessages } from "../lib/ensemble-messages";
import { useScoreReviewMessages } from "../lib/score-entry-messages/client";
import { useAppLocale } from "./AppLocaleProvider";
import { useScoreNavigationLocked } from "./ScoreOperationBoundary";
import { ScoreMusicXmlPreview } from "./ScoreMusicXmlPreview";
import { ScoreAlphaTabPanel } from "./ScoreAlphaTabPanel";
import { ScoreNotationProperties } from "./ScoreNotationProperties";
import { ScoreEnsemblePartCreator, type MissingEnsembleStaff } from "./ScoreEnsemblePartCreator";
import type { ScoreSourceRegion } from "./ScoreOmrReviewPanel";
import styles from "./ScoreEnsembleWorkspace.module.css";

export function ScoreEnsembleWorkspace({ scoreId, scoreJson, fileId, token, generatedMusicXml, revisionId, selectedEventId, onEventSelect, onUpdated, showFullPreview, onSourceRegionFocus }: {
  scoreId: string;
  scoreJson: ScoreJson;
  fileId: string | null;
  token: string | null;
  generatedMusicXml: string | null;
  revisionId: string;
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
  onUpdated: () => Promise<void>;
  showFullPreview: boolean;
  onSourceRegionFocus: (region: ScoreSourceRegion) => void;
}) {
  const { locale } = useAppLocale();
  const copy = getEnsembleMessages(locale);
  const previewCopy = useScoreReviewMessages().detail.preview;
  const locked = useScoreNavigationLocked();
  const rows = useMemo(() => collectEnsembleEvents(scoreJson), [scoreJson]);
  const coverage = ensembleCoverage(scoreJson);
  const [partId, setPartId] = useState("all");
  const [sourcePage, setSourcePage] = useState("all");
  const [measureId, setMeasureId] = useState("all");
  const [zoom, setZoom] = useState(1);
  const [musicXml, setMusicXml] = useState<string | null>(generatedMusicXml);
  const [xmlError, setXmlError] = useState(false);
  const [xmlAttempt, setXmlAttempt] = useState(0);
  const [creatingPart, setCreatingPart] = useState(false);
  const [missingStaff, setMissingStaff] = useState<MissingEnsembleStaff | null>(null);
  const selected = rows.find(row => row.event.id === selectedEventId) ?? null;
  const measures = scoreJson.measures.filter(measure => partId === "all" || measure.partId === partId);
  const pages = [...new Set([...(coverage?.pages.map(page => page.page) ?? scoreJson.recognitionLayer?.pages?.map(page => page.page) ?? []), ...rows.flatMap(row => row.sourcePages)])].sort((a, b) => a - b);
  const visible = rows.filter(row => (partId === "all" || row.partId === partId) && (sourcePage === "all" || row.sourcePages.includes(Number(sourcePage))) && (measureId === "all" || row.measure.id === measureId));
  const selectedIndex = visible.findIndex(row => row.event.id === selectedEventId);
  const windowStart = Math.max(0, selectedIndex - 75);
  const windowRows = visible.slice(windowStart, windowStart + 150);
  useEffect(() => {
    if (!selected) return;
    // A click in either renderer may select a different instrument or page.
    // Keep explicit filters when they still contain the selection; do not
    // narrow "all measures" after every click and trap keyboard navigation.
    if (partId !== "all" && partId !== selected.partId) setPartId(selected.partId);
    if (measureId !== "all" && measureId !== selected.measure.id) setMeasureId("all");
    if (sourcePage !== "all" && !selected.sourcePages.includes(Number(sourcePage))) setSourcePage("all");
  }, [selectedEventId]);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setXmlError(false);
    if (generatedMusicXml) { setMusicXml(generatedMusicXml); return; }
    setMusicXml(null);
    if (!fileId) return;
    void fetch(`${API_BASE_URL}/api/files/${encodeURIComponent(fileId)}/download`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined, credentials: "include", cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("MusicXML download failed");
      const xml = await response.text();
      if (active) setMusicXml(xml);
    }).catch(() => { if (active && !controller.signal.aborted) setXmlError(true); });
    return () => { active = false; controller.abort(); };
  }, [fileId, generatedMusicXml, revisionId, token, xmlAttempt]);
  function choose(id: string) { if (!locked) onEventSelect(id); }
  function selectPart(id: string) {
    setPartId(id); setMeasureId("all"); setSourcePage("all");
    if (id === "all") return;
    // Manual completion parts start with protected, invisible placeholders.
    // Their stable event still locates the correct measure in the existing
    // visual editor, where inserting music consumes the placeholder.
    const first = rows.find(row => row.partId === id)?.event ?? scoreJson.measures.find(measure => measure.partId === id)?.events[0];
    if (first) choose(first.id);
  }
  function selectMeasure(id: string) {
    setMeasureId(id);
    if (id === "all") return;
    const measure = scoreJson.measures.find(measure => measure.id === id);
    const first = rows.find(row => row.measure.id === id)?.event ?? measure?.events[0];
    if (first) choose(first.id);
  }
  function createPart(staff?: NonNullable<typeof coverage>["staffs"][number]) {
    if (locked) return;
    const page = coverage?.pages.find(page => page.page === staff?.page);
    const group = page?.systems?.flatMap(system => system.groups ?? []).find(group => group.id === staff?.instrumentGroupId);
    setMissingStaff(staff ? { id: staff.id, name: group?.name, kind: staff.kind } : null);
    if (staff) focusRegion(staff);
    setCreatingPart(true);
  }
  function focusRegion(item: { id: string; page?: number; systemId?: string; staffId?: string; partId?: string; message?: string; kind?: string }) {
    if (locked || !coverage) return;
    const staff = coverage.staffs.find(staff => staff.id === (item.staffId ?? item.id));
    const pageNumber = item.page ?? staff?.page ?? 1;
    const page = coverage.pages.find(page => page.page === pageNumber);
    const system = page?.systems?.find(system => system.id === (item.systemId ?? staff?.systemId));
    setSourcePage(String(pageNumber));
    const part = item.partId ?? staff?.partId;
    if (part) setPartId(part);
    setMeasureId("all");
    onSourceRegionFocus({ id: item.id, label: item.message ?? `${copy.staff} ${item.kind ?? staff?.kind ?? ""}`, page: pageNumber, bbox: staff?.bbox ?? system?.bbox, pageWidth: page?.width, pageHeight: page?.height });
  }
  function label(row: EnsembleEvent) {
    const event = row.event;
    const pitch = event.type === "rest" ? copy.rest : event.unpitched ? `${copy.drum} ${event.unpitched.midiPitch ?? "?"}` : `${event.pitch.step}${event.pitch.alter > 0 ? "♯".repeat(event.pitch.alter) : event.pitch.alter < 0 ? "♭".repeat(-event.pitch.alter) : ""}${event.pitch.octave}`;
    return `${row.partName} · ${copy.measure} ${row.measure.number} · ${copy.staff} ${event.staff ?? 1} · ${copy.voice} ${event.voice ?? "1"} · ${pitch}`;
  }
  return <section className={styles.workspace} data-ensemble-workspace>
    <header className="workspace-heading"><h2 className="card-title">{copy.ensembleTitle}</h2><Link href={`/scores/${encodeURIComponent(scoreId)}`} className="button button-secondary" aria-disabled={locked} onClick={event => { if (locked) event.preventDefault(); }}>{copy.standardWorkbench}</Link></header>
    <section className="surface-panel stack-lg" data-ensemble-coverage={coverage?.status ?? "unverified"}>
      <h3 className="card-title">{copy.coverageTitle}</h3>
      <p className={styles.status}>{coverage ? coverage.status === "incomplete" ? copy.coverageIncomplete : copy.coveragePending : copy.coverageUnknown}</p>
      {coverage?.manualReview ? <p className="helper-copy">{copy.manualReviewed} · {formatDateTime(coverage.manualReview.reviewedAt, locale)}</p> : null}
      {(coverage?.gaps.length ?? 0) > 0 ? <ul>{coverage!.gaps.map(gap => <li key={gap.id}><button type="button" className="button button-secondary button-ghost" data-coverage-gap-id={gap.id} disabled={locked} onClick={() => focusRegion(gap)}>{gap.page ? `${copy.sourcePage} ${formatNumber(gap.page, locale)} · ` : ""}{gap.message}</button></li>)}</ul> : null}
      {(coverage?.staffs.length ?? 0) > 0 ? <details className="flow-details"><summary>{copy.sourceLayers} · {formatNumber(coverage!.staffs.length, locale)}</summary><ul>{coverage!.staffs.map(staff => <li key={staff.id}><button type="button" className="button button-secondary button-ghost" data-coverage-staff-id={staff.id} disabled={locked} onClick={() => focusRegion(staff)}>{copy.sourcePage} {formatNumber(staff.page, locale)} · {staff.kind === "tablature" ? "TAB" : staff.kind === "percussion" ? copy.drum : copy.staff} · {scoreJson.parts.find(part => part.id === staff.partId)?.name ?? copy.unmatchedLayer} · {formatNumber(staff.eventIds?.length ?? 0, locale)} {copy.note}</button>{!staff.partId ? <button type="button" className="button button-secondary" data-create-coverage-staff-id={staff.id} disabled={locked} onClick={() => createPart(staff)}>{copy.createMissingInstrument}</button> : null}</li>)}</ul></details> : null}
      <button type="button" className="button button-secondary" disabled={locked} onClick={() => createPart()}>{copy.addInstrument}</button>
      {creatingPart ? <ScoreEnsemblePartCreator scoreId={scoreId} revisionId={revisionId} scoreJson={scoreJson} token={token} missingStaff={missingStaff} onUpdated={onUpdated} onClose={() => setCreatingPart(false)} /> : null}
      <div className={styles.navigation}>
        <nav className={styles.instruments} aria-label={copy.instruments}>
          <button type="button" className="button button-secondary" disabled={locked} aria-pressed={partId === "all"} onClick={() => selectPart("all")}>{copy.allInstruments}</button>
          {scoreJson.parts.map(part => <button key={part.id} type="button" className={`button button-secondary ${styles.instrument}`} disabled={locked} aria-pressed={partId === part.id} data-part-id={part.id} onClick={() => selectPart(part.id)}><span>{part.name}</span><span className="status-chip">{formatNumber(rows.filter(row => row.partId === part.id).length, locale)}</span></button>)}
        </nav>
        <div className="stack-md">
          <div className="form-grid">
            <label className="field-group"><span>{copy.sourcePage}</span><select className="field-select" disabled={locked} value={sourcePage} onChange={event => { setSourcePage(event.target.value); setMeasureId("all"); }}><option value="all">{copy.allPages}</option>{pages.map(page => <option value={page} key={page}>{formatNumber(page, locale)}</option>)}</select></label>
            <label className="field-group"><span>{copy.measure}</span><select className="field-select" disabled={locked} value={measureId} onChange={event => selectMeasure(event.target.value)}><option value="all">{copy.viewFull}</option>{measures.map(measure => <option key={measure.id} value={measure.id}>{scoreJson.parts.find(part => part.id === measure.partId)?.name} · {measure.number}</option>)}</select></label>
          </div>
          <div className={styles.toolbar}>
            <button type="button" className="button button-secondary" disabled={locked || !visible.length || selectedIndex === 0} onClick={() => { const row = neighboringEnsembleEvent(visible, selectedEventId, -1); if (row) choose(row.event.id); }}>{copy.previous}</button>
            <button type="button" className="button button-secondary" disabled={locked || !visible.length || selectedIndex === visible.length - 1} onClick={() => { const row = neighboringEnsembleEvent(visible, selectedEventId, 1); if (row) choose(row.event.id); }}>{copy.next}</button>
            <span className="helper-copy">{formatNumber(visible.length, locale)} {copy.note}</span>
          </div>
          <div className={styles.events} aria-label={copy.selected} data-ensemble-event-list>
            {windowRows.map(row => <button key={row.event.id} type="button" className={styles.event} disabled={locked} title={label(row)} aria-label={label(row)} aria-pressed={row.event.id === selectedEventId} data-ensemble-event-id={row.event.id} onClick={() => choose(row.event.id)}>{copy.measure} {row.measure.number} · {row.event.type === "rest" ? copy.rest : row.event.unpitched ? "◈" : `${row.event.pitch.step}${row.event.pitch.octave}`} · {row.selector.pitches[0] != null ? row.selector.pitches[0] + 1 : "—"}</button>)}
            {!visible.length ? <p>{copy.noNotes}</p> : null}
          </div>
          {selected ? <p className={styles.selection} role="status" data-ensemble-selected-id={selected.event.id}>{label(selected)}</p> : null}
          <a href="#visual-editor" className="button button-secondary" aria-disabled={locked} onClick={event => { if (locked) event.preventDefault(); }}>{copy.jumpEditor}</a>
        </div>
      </div>
    </section>
    {showFullPreview ? <section className="surface-panel stack-lg">
      <div className={styles.toolbar}><h2 className="card-title">{copy.fullPreview}</h2><label>{copy.zoom} <select aria-label={copy.zoom} value={zoom} onChange={event => setZoom(Number(event.target.value))}><option value="0.75">75%</option><option value="1">100%</option><option value="1.25">125%</option><option value="1.5">150%</option></select></label></div>
      <ScoreMusicXmlPreview fileId={fileId} token={token} musicXml={musicXml} scoreJson={scoreJson} selectedEventId={selectedEventId} onEventSelect={choose} emptyLabel={previewCopy.empty} loadingLabel={previewCopy.loading} errorLabel={previewCopy.error} retryLabel={previewCopy.retry} technicalDetailsLabel={previewCopy.technicalDetails} deferredLabel={previewCopy.deferred} renderLabel={previewCopy.render} eventLabelTemplate={previewCopy.eventLabel} noteLabel={previewCopy.note} restLabel={previewCopy.rest} zoom={zoom} />
    </section> : null}
    {xmlError ? <p role="alert" className="form-status error">{previewCopy.error} <button type="button" className="button button-secondary" onClick={() => setXmlAttempt(value => value + 1)}>{copy.retry}</button></p> : null}
    <ScoreNotationProperties scoreId={scoreId} scoreJson={scoreJson} revisionId={revisionId} selectedEventId={selectedEventId} token={token} onUpdated={onUpdated} />
    <ScoreAlphaTabPanel scoreId={scoreId} revisionId={revisionId} isCandidate={!showFullPreview} token={token} musicXml={musicXml} scoreJson={scoreJson} selectedPartId={partId} onEventSelect={choose} />
  </section>;
}
