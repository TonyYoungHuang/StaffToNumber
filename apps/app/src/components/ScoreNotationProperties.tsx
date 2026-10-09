"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ScoreJson, ScoreLyric, ScoreNoteEvent } from "@score/shared";
import { apiRequest } from "../lib/api";
import { getEnsembleMessages } from "../lib/ensemble-messages";
import { useAppLocale } from "./AppLocaleProvider";
import { useScoreActivity } from "./ScoreOperationBoundary";
import styles from "./ScoreEnsembleWorkspace.module.css";

type TechnicalDraft = { string: string; fret: string; bend: string; hammerOn: string; pullOff: string; slide: string };
function draftTechnical(note: ScoreNoteEvent | null): TechnicalDraft {
  const t = note?.technical;
  return { string: t?.string == null ? "" : String(t.string), fret: t?.fret == null ? "" : String(t.fret), bend: t?.bend == null ? "" : String(t.bend), hammerOn: t?.hammerOn ?? "", pullOff: t?.pullOff ?? "", slide: t?.slide ?? "" };
}

export function ScoreNotationProperties({ scoreId, scoreJson, revisionId, selectedEventId, token, onUpdated }: {
  scoreId: string;
  scoreJson: ScoreJson;
  revisionId: string;
  selectedEventId: string | null;
  token: string | null;
  onUpdated: () => Promise<void>;
}) {
  const { locale } = useAppLocale();
  const copy = getEnsembleMessages(locale);
  const note = useMemo(() => scoreJson.measures.flatMap(measure => measure.events).find((event): event is ScoreNoteEvent => event.id === selectedEventId && event.type === "note") ?? null, [scoreJson, selectedEventId]);
  const [technical, setTechnical] = useState<TechnicalDraft>(() => draftTechnical(note));
  const [lyrics, setLyrics] = useState<ScoreLyric[]>(note?.lyrics ?? []);
  const [unpitched, setUnpitched] = useState<ScoreNoteEvent["unpitched"]>(note?.unpitched);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const lock = useRef(false);
  const [baseline, setBaseline] = useState("");
  const draft = JSON.stringify({ technical, lyrics, unpitched });
  const dirty = Boolean(note && baseline && draft !== baseline);
  useScoreActivity(saving, dirty, copy.saving);
  function reset() {
    const t = draftTechnical(note);
    const l = structuredClone(note?.lyrics ?? []);
    const u = note?.unpitched ? { ...note.unpitched } : undefined;
    setTechnical(t); setLyrics(l); setUnpitched(u);
    setBaseline(JSON.stringify({ technical: t, lyrics: l, unpitched: u }));
  }
  useEffect(() => { reset(); setStatus(null); setFailed(false); }, [note, revisionId]);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!note || !dirty || lock.current) return;
    lock.current = true; setSaving(true); setStatus(null); setFailed(false);
    const t: NonNullable<ScoreNoteEvent["technical"]> = {};
    for (const field of ["string", "fret", "bend"] as const) if (technical[field] !== "") t[field] = Number(technical[field]);
    for (const field of ["hammerOn", "pullOff", "slide"] as const) if (technical[field]) t[field] = technical[field];
    try {
      const result = await apiRequest(`/api/scores/${encodeURIComponent(scoreId)}/edit/note`, {
        method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: JSON.stringify({
          eventId: note.id, eventType: "note",
          ...(JSON.stringify(technical) !== JSON.stringify(draftTechnical(note)) ? {
            technical: Object.keys(t).length ? t : null,
            clearTechnicalFields: (Object.keys(technical) as Array<keyof TechnicalDraft>).filter(field => note.technical?.[field] != null && technical[field] === ""),
          } : {}),
          ...(JSON.stringify(lyrics) !== JSON.stringify(note.lyrics) ? { lyrics } : {}),
          ...(unpitched && JSON.stringify(unpitched) !== JSON.stringify(note.unpitched) ? { unpitched } : {}),
        }),
      });
      if (!result.ok) { setStatus(result.error); setFailed(true); return; }
      setBaseline(draft);
      await onUpdated();
      setStatus(copy.saved);
    } catch { setStatus(copy.saveFailed); setFailed(true); }
    finally { lock.current = false; setSaving(false); }
  }
  function changeLyric(index: number, value: Partial<ScoreLyric>) { setLyrics(current => current.map((lyric, i) => i === index ? { ...lyric, ...value } : lyric)); }
  if (!note) return null;
  return <section className="surface-panel stack-lg" data-notation-properties={note.id}>
    <h2 className="card-title">{copy.notationTitle}</h2>
    <p className="helper-copy">{copy.notationProtected}</p>
    <form onSubmit={save} className="stack-lg">
      <fieldset disabled={saving} className={styles.properties}>
        {(["string", "fret", "bend"] as const).map(field => <label key={field} className="field-group"><span>{copy[field]}</span><input className="field-control" type="number" min={field === "string" ? 1 : 0} max={field === "string" ? 12 : field === "fret" ? 36 : 12} step={field === "bend" ? .5 : 1} value={technical[field]} onChange={event => setTechnical(current => ({ ...current, [field]: event.target.value }))} /></label>)}
        {(["hammerOn", "pullOff", "slide"] as const).map(field => <label key={field} className="field-group"><span>{copy[field]}</span><select className="field-select" value={technical[field]} onChange={event => setTechnical(current => ({ ...current, [field]: event.target.value }))}><option value="">{copy.none}</option><option value="start">{copy.start}</option><option value="stop">{copy.end}</option></select></label>)}
      </fieldset>
      {unpitched ? <fieldset disabled={saving} className={styles.properties}>
        <label className="field-group"><span>{copy.drum}</span><input className="field-control" type="number" min="0" max="127" value={unpitched.midiPitch ?? ""} onChange={event => setUnpitched(current => current ? { ...current, midiPitch: event.target.value === "" ? undefined : Number(event.target.value) } : current)} /></label>
        <label className="field-group"><span>{copy.instrumentId}</span><input className="field-control" value={unpitched.instrumentId ?? ""} onChange={event => setUnpitched(current => current ? { ...current, instrumentId: event.target.value || undefined } : current)} /></label>
        <label className="field-group"><span>{copy.displayStep}</span><select className="field-select" value={unpitched.displayStep} onChange={event => setUnpitched(current => current ? { ...current, displayStep: event.target.value as NonNullable<ScoreNoteEvent["unpitched"]>["displayStep"] } : current)}>{["A", "B", "C", "D", "E", "F", "G"].map(step => <option key={step}>{step}</option>)}</select></label>
        <label className="field-group"><span>{copy.displayOctave}</span><input className="field-control" type="number" min="0" max="9" value={unpitched.displayOctave} onChange={event => setUnpitched(current => current ? { ...current, displayOctave: Number(event.target.value) } : current)} /></label>
      </fieldset> : null}
      {lyrics.map((lyric, index) => <fieldset key={index} disabled={saving} className={styles.properties}>
        <label className="field-group"><span>{copy.verse}</span><input className="field-control" value={lyric.number ?? String(index + 1)} onChange={event => changeLyric(index, { number: event.target.value })} /></label>
        <label className="field-group"><span>{copy.lyrics}</span><input className="field-control" value={lyric.text} onChange={event => changeLyric(index, { text: event.target.value })} /></label>
        <label className="field-group"><span>{copy.extend}</span><select className="field-select" value={lyric.extend?.type ?? (lyric.extend ? "plain" : "")} onChange={event => changeLyric(index, { extend: event.target.value === "" ? undefined : event.target.value === "plain" ? {} : { type: event.target.value as "start" | "continue" | "stop" } })}><option value="">{copy.none}</option><option value="plain">—</option><option value="start">{copy.start}</option><option value="continue">{copy.continue}</option><option value="stop">{copy.end}</option></select></label>
        <button type="button" className="button button-secondary" onClick={() => setLyrics(current => current.filter((_, i) => i !== index))}>{copy.removeLyric}</button>
      </fieldset>)}
      <div className="button-row"><button type="button" className="button button-secondary" disabled={saving} onClick={() => setLyrics(current => [...current, { number: String(current.length + 1), text: "" }])}>{copy.addLyric}</button><button type="submit" className="button button-primary" disabled={saving || !dirty}>{saving ? copy.saving : copy.save}</button><button type="button" className="button button-secondary" disabled={saving || !dirty} onClick={reset}>{copy.discard}</button></div>
    </form>
    {status ? <p className={`form-status ${failed ? "error" : "success"}`} role={failed ? "alert" : "status"}>{status}</p> : null}
  </section>;
}
