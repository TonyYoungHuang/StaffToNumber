"use client";

import { useMemo, useState, type FormEvent } from "react";
import { formatDateTime, formatNumber } from "@score/i18n";
import type { ScoreJson } from "@score/shared";
import { apiRequest } from "../lib/api";
import { useScoreSharingMessages } from "../lib/score-sharing-messages/client";

export type ScoreAnnotation = {
  id: string;
  documentId: string;
  authorUserId: string | null;
  authorShareId: string | null;
  author: {
    kind: "account" | "share_link";
    displayName: string;
    verification: "account" | "share_link";
  };
  body: string;
  target: Record<string, unknown> | null;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export function ScoreAnnotationWorkspace({
  shareToken,
  permission,
  scoreJson,
  annotations,
  selectedEventId,
  onSelectedEventChange,
  onAnnotationsChange,
}: {
  shareToken: string;
  permission: "comment" | "edit";
  scoreJson: ScoreJson;
  annotations: ScoreAnnotation[];
  selectedEventId: string | null;
  onSelectedEventChange: (eventId: string) => void;
  onAnnotationsChange: (annotations: ScoreAnnotation[]) => void;
}) {
  const { locale, messages } = useScoreSharingMessages();
  const copy = messages.annotations;
  const [body, setBody] = useState("");
  const [targetMode, setTargetMode] = useState<"score" | "selection">("score");
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const selectedTarget = useMemo(
    () => findAnnotationTarget(scoreJson, selectedEventId, copy.measure, locale),
    [copy.measure, locale, scoreJson, selectedEventId],
  );
  const canPostToSelection = Boolean(selectedTarget);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim();
    if (!text || (targetMode === "selection" && !selectedTarget)) return;
    setPosting(true);
    setMessage(null);
    const result = await apiRequest<{ comments: ScoreAnnotation[] }>(`/api/scores/shared/${encodeURIComponent(shareToken)}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: text,
        target: targetMode === "selection" ? selectedTarget : { type: "score", label: copy.score },
      }),
    });
    setPosting(false);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error });
      return;
    }
    setBody("");
    onAnnotationsChange(result.data.comments);
    setMessage({ kind: "success", text: copy.posted });
  }

  return (
    <section className="surface-panel stack-lg" data-testid="shared-annotation-workspace">
      <div className="stack-sm">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 className="card-title">{copy.titles[permission]}</h2>
        <p className="body-copy">{copy.body}</p>
      </div>
      <form className="stack-md" onSubmit={submit}>
        <div className="segmented-control" role="group" aria-label={copy.targetModeAria}>
          <button type="button" className={targetMode === "score" ? "is-active" : ""} onClick={() => setTargetMode("score")}>{copy.score}</button>
          <button type="button" className={targetMode === "selection" ? "is-active" : ""} onClick={() => setTargetMode("selection")} disabled={!canPostToSelection}>{copy.selection}</button>
        </div>
        {targetMode === "selection" ? <p className="item-meta">{selectedTarget?.label ?? copy.noSelection}</p> : null}
        <textarea className="field-control" rows={3} maxLength={2000} value={body} onChange={(event) => setBody(event.target.value)} placeholder={copy.placeholder} />
        <button type="submit" className="button button-primary" disabled={posting || !body.trim() || (targetMode === "selection" && !selectedTarget)}>
          {posting ? copy.posting : copy.post}
        </button>
      </form>
      {message ? <p className={`form-status ${message.kind}`} role="status" aria-label={copy.statusAria}>{message.text}</p> : null}
      {annotations.length === 0 ? <div className="empty-state">{copy.empty}</div> : (
        <div className="list-grid" aria-label={copy.listAria}>
          {annotations.map((annotation) => {
            const eventId = typeof annotation.target?.eventId === "string" ? annotation.target.eventId : null;
            return (
              <div className="list-item" key={annotation.id} data-testid="shared-annotation">
                <div className="list-item-content stack-xs">
                  <div className="button-row">
                    <strong className="item-title">{annotation.author.displayName}</strong>
                    <span className={`status-chip ${annotation.author.verification === "account" ? "tone-green" : "tone-cyan"}`}>
                      {copy.identities[annotation.author.verification]}
                    </span>
                    {annotation.resolvedAt ? <span className="status-chip tone-green">{copy.resolved}</span> : null}
                  </div>
                  <p className="item-meta">{annotationTargetLabel(annotation.target, copy.score)} · {formatDateTime(annotation.createdAt, locale)}</p>
                  <p className="body-copy">{annotation.body}</p>
                </div>
                {eventId ? <button type="button" className="button button-secondary button-ghost" onClick={() => onSelectedEventChange(eventId)}>{copy.locate}</button> : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function findAnnotationTarget(scoreJson: ScoreJson, eventId: string | null, measureLabel: string, locale: Parameters<typeof formatNumber>[1]) {
  if (!eventId) return null;
  const partNames = new Map(scoreJson.parts.map((part) => [part.id, part.name]));
  const measure = scoreJson.measures.find((item) => item.events.some((event) => event.id === eventId));
  const event = measure?.events.find((item) => item.id === eventId);
  if (!measure || !event || event.type !== "note") return null;
  const accidental = event.pitch.alter > 0 ? "#".repeat(event.pitch.alter) : event.pitch.alter < 0 ? "b".repeat(Math.abs(event.pitch.alter)) : "";
  const pitch = `${event.pitch.step}${accidental}${event.pitch.octave}`;
  const numericMeasure = Number(measure.number);
  const displayMeasure = Number.isFinite(numericMeasure) ? formatNumber(numericMeasure, locale) : measure.number;
  const label = `${partNames.get(measure.partId) ?? measure.partId} ${measureLabel} ${displayMeasure} ${pitch}`;
  return { type: "note", label, partId: measure.partId, measureId: measure.id, measureNumber: measure.number, eventId: event.id };
}

function annotationTargetLabel(target: Record<string, unknown> | null, fallback: string) {
  return typeof target?.label === "string" && target.label.trim() ? target.label : fallback;
}
