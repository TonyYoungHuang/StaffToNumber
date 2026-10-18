"use client";

import { useEffect, useRef, useState } from 'react';
import { formatMessage, formatNumber, resolveRecognitionRequestFailure, type SupportedLocale } from '@score/i18n';
import type { ScoreJson } from '@score/shared';
import { selectRecognitionCandidate, recognitionSettlementNumbers, type RecognitionCreditSettlement } from '../lib/recognition-candidates';
import { useFlowMessages } from "../lib/flow-messages/client";
import { apiRequest } from '../lib/api';
import { useScoreReviewMessages } from '../lib/score-entry-messages/client';
import { useScoreNavigationLocked } from "./ScoreOperationBoundary";
import { ScoreMusicXmlPreview } from './ScoreMusicXmlPreview';

type RecognitionCandidate = { id: string; title: string; musicxmlFileId: string | null; scoreJson?: ScoreJson; sourcePages: number[]; recommended?: boolean; relationship?: string; warnings?: string[] };
type CandidateList = { candidates: RecognitionCandidate[]; selectedCandidateId?: string | null; sourcePageCount?: number; deliveredPages?: number | number[]; creditSettlement?: RecognitionCreditSettlement };
export function ScoreRecognitionCandidates({ scoreId, token, locale, expectedEditableRevisionId, onUpdated }: { scoreId: string; token: string | null; locale: SupportedLocale; expectedEditableRevisionId: string | null; onUpdated: () => void | Promise<void> }) {
  const flow = useFlowMessages();
  const copy = flow.recognitionExperience;
  const previewCopy = useScoreReviewMessages().candidate;
  const [result, setResult] = useState<CandidateList | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [previewXml, setPreviewXml] = useState<Record<string, string | null>>({});
  const [combineMode, setCombineMode] = useState<"append" | "parallel">("append");
  const [names, setNames] = useState<Record<string, string>>({});
  const [saving, setBusy] = useState(false);
  const navigationLocked = useScoreNavigationLocked();
  const busy = saving || navigationLocked;
  const mutationLock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; const controller = new AbortController();
    void apiRequest<CandidateList>(`/api/scores/${encodeURIComponent(scoreId)}/candidates`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined, signal: controller.signal }).then(response => {
      if (!active) return;
      if (response.ok) { setResult(response.data); setNames(Object.fromEntries(response.data.candidates.map(item => [item.id, item.title]))); setSelected(values => values.filter(id => response.data.candidates.some(item => item.id === id))); }
      else if (response.status !== 404) setError(resolveRecognitionRequestFailure(copy, response.code) ?? response.error ?? copy.failed);
    });
    return () => { active = false; controller.abort(); };
  }, [scoreId, token, expectedEditableRevisionId, attempt, copy.failed]);
  useEffect(() => {
    if (!compareId || !result?.candidates.length) return;
    const primary = result.candidates.find(item => item.id === result.selectedCandidateId) ?? result.candidates.find(item => item.recommended) ?? result.candidates[0]!;
    const ids = [...new Set([primary.id, compareId])];
    let active = true; const controller = new AbortController(); setPreviewXml({});
    void Promise.all(ids.map(async id => {
      const response = await apiRequest<{ musicXml: string }>(`/api/scores/${encodeURIComponent(scoreId)}/candidates/${encodeURIComponent(id)}/musicxml-preview`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined, signal: controller.signal });
      return [id, response.ok ? response.data.musicXml : null] as const;
    })).then(values => { if (active) setPreviewXml(Object.fromEntries(values)); });
    return () => { active = false; controller.abort(); };
  }, [compareId, result, scoreId, token, expectedEditableRevisionId]);
  if (!result?.candidates.length) return error ? <p className="form-status error" role="alert">{error}</p> : null;
  const candidates = result.candidates;
  const current = candidates.find(item => item.id === result.selectedCandidateId) ?? candidates.find(item => item.recommended) ?? candidates[0]!;
  const compared = candidates.find(item => item.id === compareId);
  const delivered = Array.isArray(result.deliveredPages) ? result.deliveredPages.length : result.deliveredPages;
  const chosen = selected.map(id => candidates.find(item => item.id === id)!).filter(Boolean);
  const atomicPages = chosen.length > 0 && chosen.every(item => item.sourcePages.length === 1);
  function dropPage(candidate: RecognitionCandidate, page: number) {
    if (!window.confirm(formatMessage(flow.dropPageConfirm, { title: candidate.title, page: formatNumber(page, locale) }))) return;
    void mutate(`/${encodeURIComponent(candidate.id)}/pages/${page}`, {}, 'DELETE');
  }
  async function mutate(path: string, body: Record<string, unknown>, method = 'POST') {
    if (mutationLock.current || navigationLocked) return;
    mutationLock.current = true; setBusy(true); setError(null);
    try {
      const response = await apiRequest<unknown>(`/api/scores/${encodeURIComponent(scoreId)}/candidates${path}`, { method, headers: token ? { Authorization: `Bearer ${token}` } : undefined, body: JSON.stringify({ ...body, expectedEditableRevisionId }) });
      if (!response.ok) { setError(resolveRecognitionRequestFailure(copy, response.code) ?? response.error ?? copy.failed); return; }
      await onUpdated(); setAttempt(value => value + 1); setCompareId(null);
    } catch { setError(copy.failed); }
    finally { mutationLock.current = false; setBusy(false); }
  }
  function move(index: number, direction: number) {
    setSelected(values => { const next = [...values]; [next[index], next[index + direction]] = [next[index + direction]!, next[index]!]; return next; });
  }
  function preview(candidate: RecognitionCandidate) {
    return <section key={candidate.id} className="surface-panel stack-sm"><h4>{candidate.title}</h4>{previewXml[candidate.id] === undefined ? <p role="status">{previewCopy.notationLoading}</p> : previewXml[candidate.id] === null ? <p role="alert">{previewCopy.notationError}</p> : <ScoreMusicXmlPreview fileId={null} musicXml={previewXml[candidate.id]} token={token} scoreJson={candidate.scoreJson} emptyLabel={previewCopy.notationEmpty} loadingLabel={previewCopy.notationLoading} errorLabel={previewCopy.notationError} retryLabel={previewCopy.notationRetry} technicalDetailsLabel={previewCopy.notationTechnicalDetails} deferredLabel={previewCopy.notationDeferred} renderLabel={previewCopy.notationRender} eventLabelTemplate={previewCopy.notationEventLabel} noteLabel={previewCopy.notationNote} restLabel={previewCopy.notationRest} />}</section>;
  }
  return <section className="surface-panel stack-lg" data-recognition-candidates>
    <h2 className="card-title">{copy.alternatives}</h2><p>{copy.alternativesBody}</p>
    {typeof delivered === 'number' && result.sourcePageCount ? <p role="status">{formatMessage(copy.coverage, { delivered: formatNumber(delivered, locale), total: formatNumber(result.sourcePageCount, locale) })}</p> : null}
    {typeof delivered === 'number' && result.sourcePageCount && delivered < result.sourcePageCount ? <p>{copy.partial}</p> : null}
    {result.creditSettlement ? <p role="status" data-recognition-credit-settlement>{formatMessage(copy.creditSettlement, recognitionSettlementNumbers(result.creditSettlement, locale))}</p> : null}
    {error ? <p className="form-status error" role="alert">{error}</p> : null}
    <div className="list-grid">{candidates.map(candidate => <article key={candidate.id} className="list-item" data-candidate-id={candidate.id}>
      <div className="stack-sm"><label className="check-row"><input type="checkbox" checked={selected.includes(candidate.id)} disabled={busy} onChange={() => setSelected(current => selectRecognitionCandidate(current, candidate, candidates, combineMode))} /><strong>{candidate.title}</strong>{candidate.recommended ? <span className="status-chip">{copy.recommended}</span> : null}</label>
        {candidate.scoreJson ? <p className="helper-copy">{formatMessage(copy.musicCounts, { parts: formatNumber(candidate.scoreJson.parts.length, locale), measures: formatNumber(candidate.scoreJson.measures.length, locale), notes: formatNumber(candidate.scoreJson.metadata.noteCount ?? 0, locale) })}</p> : null}
        <p className="helper-copy">{copy.pages}: {candidate.sourcePages.map(page => formatNumber(page, locale)).join(', ') || '—'}</p>
        <div className="button-row"><button type="button" className="button button-secondary" disabled={busy || candidate.id === result.selectedCandidateId} onClick={() => void mutate('/select', { candidateId: candidate.id })}>{copy.select}</button><button type="button" className="button button-secondary" onClick={() => setCompareId(candidate.id)}>{copy.compare}</button></div>
        <label className="field-group"><span>{copy.rename}</span><input className="field-control" maxLength={200} value={names[candidate.id] ?? candidate.title} disabled={busy} onChange={event => setNames(current => ({ ...current, [candidate.id]: event.target.value }))} /></label>
        <button type="button" className="button button-tertiary" disabled={busy || !(names[candidate.id] ?? '').trim() || names[candidate.id]?.trim() === candidate.title} onClick={() => void mutate(`/${encodeURIComponent(candidate.id)}`, { title: names[candidate.id]?.trim() }, 'PATCH')}>{copy.save}</button>
      </div>
    </article>)}</div>
    {chosen.length ? <div className="stack-md"><h3>{copy.pages}</h3><fieldset disabled={busy}><legend>{copy.combine}</legend><label className="check-row"><input type="radio" name={`combine-mode-${scoreId}`} checked={combineMode === "append"} onChange={() => setCombineMode("append")} />{copy.appendPages}</label><label className="check-row"><input type="radio" name={`combine-mode-${scoreId}`} checked={combineMode === "parallel"} onChange={() => setCombineMode("parallel")} />{copy.parallelParts}</label></fieldset><ol>{chosen.map((candidate, index) => <li key={candidate.id}><span>{candidate.title} · {candidate.sourcePages.map(page => formatNumber(page, locale)).join(', ')}</span> <button type="button" aria-label={`${copy.moveUp}: ${candidate.title}`} disabled={busy || index === 0} onClick={() => move(index, -1)}>{copy.moveUp}</button> <button type="button" aria-label={`${copy.moveDown}: ${candidate.title}`} disabled={busy || index === chosen.length - 1} onClick={() => move(index, 1)}>{copy.moveDown}</button> <span className="button-row">{candidate.sourcePages.map(page => <button key={page} type="button" aria-label={`${copy.drop}: ${candidate.title} \u00b7 ${formatNumber(page, locale)}`} disabled={busy || (candidates.length === 1 && candidate.sourcePages.length === 1)} onClick={() => dropPage(candidate, page)}>{copy.drop} &middot; {formatNumber(page, locale)}</button>)}</span></li>)}</ol><button type="button" className="button button-primary" disabled={busy || selected.length < 1} onClick={() => void mutate('/combine', { candidateIds: selected, candidatePages: Object.fromEntries(chosen.map(item => [item.id, item.sourcePages])), mode: combineMode, ...(atomicPages ? { pageOrder: chosen.flatMap(item => item.sourcePages) } : {}) })}>{busy ? copy.working : copy.combine}</button></div> : null}
    {compared ? <div className="stack-md"><button type="button" className="button button-secondary" onClick={() => setCompareId(null)}>{copy.close}</button><div className="score-comparison-grid">{preview(current)}{current.id !== compared.id ? preview(compared) : null}</div></div> : null}
  </section>;
}
