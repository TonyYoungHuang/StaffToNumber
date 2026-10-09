"use client";

import { useEffect, useRef, useState } from "react";
import type { ScoreJson } from "@score/shared";
import { apiRequest } from "../lib/api";
import { getEnsembleMessages } from "../lib/ensemble-messages";
import { useAppLocale } from "./AppLocaleProvider";
import { useScoreActivity } from "./ScoreOperationBoundary";
import styles from "./ScoreEnsembleWorkspace.module.css";

export type MissingEnsembleStaff = { id: string; name?: string; kind: string };

export function ScoreEnsemblePartCreator({ scoreId, revisionId, token, missingStaff, scoreJson, onUpdated, onClose }: {
  scoreId: string; revisionId: string; token: string | null; scoreJson: ScoreJson;
  missingStaff: MissingEnsembleStaff | null; onUpdated: () => Promise<void>; onClose: () => void;
}) {
  const { locale } = useAppLocale();
  const copy = getEnsembleMessages(locale);
  const [name, setName] = useState(missingStaff?.name ?? "");
  const [abbreviation, setAbbreviation] = useState("");
  const [kind, setKind] = useState<"pitched" | "percussion" | "tablature">(missingStaff?.kind === "tablature" || missingStaff?.kind === "percussion" ? missingStaff.kind : "pitched");
  const [staffCount, setStaffCount] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  useScoreActivity(saving, false, copy.saving);
  useEffect(() => {
    setName(missingStaff?.name ?? ""); setAbbreviation(""); setStaffCount(1); setError(null);
    setKind(missingStaff?.kind === "tablature" || missingStaff?.kind === "percussion" ? missingStaff.kind : "pitched");
  }, [missingStaff]);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || lock.current) return;
    lock.current = true; setSaving(true); setError(null);
    try {
      const response = await apiRequest(`/api/scores/${encodeURIComponent(scoreId)}/edit/add-part`, {
        method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: JSON.stringify({ name: name.trim(), ...(abbreviation.trim() ? { abbreviation: abbreviation.trim() } : {}), staffCount, kind, baseRevisionId: revisionId, ...(missingStaff ? { coverageStaffIds: [missingStaff.id] } : {}) }),
      });
      if (!response.ok) { setError(response.error); return; }
      await onUpdated(); onClose();
    } catch { setError(copy.partCreateFailed); }
    finally { lock.current = false; setSaving(false); }
  }
  return <form className="surface-panel stack-lg" onSubmit={save} data-ensemble-part-creator>
    <h3 className="card-title">{copy.addInstrument}</h3>
    <p className="helper-copy">{copy.addInstrumentBody}</p>
    <fieldset disabled={saving} className={styles.properties}>
      <label className="field-group"><span>{copy.instrumentName}</span><input required maxLength={100} className="field-control" value={name} onChange={event => setName(event.target.value)} /></label>
      <label className="field-group"><span>{copy.abbreviation}</span><input maxLength={100} className="field-control" value={abbreviation} onChange={event => setAbbreviation(event.target.value)} /></label>
      <label className="field-group"><span>{copy.instrumentKind}</span><select className="field-select" value={kind} onChange={event => setKind(event.target.value as typeof kind)}><option value="pitched">{copy.pitched}</option><option value="percussion">{copy.percussion}</option><option value="tablature">TAB</option></select></label>
      <label className="field-group"><span>{copy.staffCount}</span><input type="number" min={1} max={4} required className="field-control" value={staffCount} onChange={event => setStaffCount(Number(event.target.value))} /></label>
    </fieldset>
    <div className="button-row"><button type="submit" disabled={saving || !name.trim()} className="button button-primary">{saving ? copy.saving : copy.createInstrument}</button><button type="button" className="button button-secondary" disabled={saving} onClick={onClose}>{copy.cancel}</button></div>
    {error ? <p className="form-status error" role="alert">{error}</p> : null}
  </form>;
}
