"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { ScoreJson } from "@score/shared";
import { apiRequest } from "../lib/api";

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
  locale,
}: {
  shareToken: string;
  permission: "comment" | "edit";
  scoreJson: ScoreJson;
  annotations: ScoreAnnotation[];
  selectedEventId: string | null;
  onSelectedEventChange: (eventId: string) => void;
  onAnnotationsChange: (annotations: ScoreAnnotation[]) => void;
  locale: string;
}) {
  const isChinese = locale === "zh-CN";
  const [body, setBody] = useState("");
  const [targetMode, setTargetMode] = useState<"score" | "selection">("score");
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const selectedTarget = useMemo(() => findAnnotationTarget(scoreJson, selectedEventId, isChinese), [isChinese, scoreJson, selectedEventId]);
  const canPostToSelection = Boolean(selectedTarget);

  const copy = isChinese
    ? {
        eyebrow: "谱面批注",
        title: permission === "comment" ? "评论者工作区" : "协作批注",
        body: "点击下方谱面中的音符即可建立精确批注。链接身份由乐谱所有者命名，仅证明当前访问者持有该链接。",
        score: "整份乐谱",
        selection: "当前音符",
        noSelection: "请先在谱面上点选一个音符",
        placeholder: "写下需要修改、练习或讨论的内容",
        post: "发布批注",
        posting: "正在发布...",
        posted: "批注已发布。",
        failed: "批注发布失败。",
        empty: "还没有批注。",
        account: "账号身份",
        share: "链接身份",
        resolved: "已解决",
        locate: "定位到谱面",
      }
    : {
        eyebrow: "Score annotations",
        title: permission === "comment" ? "Commenter workspace" : "Collaboration annotations",
        body: "Select a note in the score below to attach a precise annotation. A link identity is named by the score owner and proves possession of that link, not a verified personal identity.",
        score: "Whole score",
        selection: "Selected note",
        noSelection: "Select a note in the score first",
        placeholder: "Describe a correction, practice point, or question",
        post: "Post annotation",
        posting: "Posting...",
        posted: "Annotation posted.",
        failed: "Could not post the annotation.",
        empty: "No annotations yet.",
        account: "Account identity",
        share: "Link identity",
        resolved: "Resolved",
        locate: "Locate in score",
      };

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
      setMessage({ kind: "error", text: result.error || copy.failed });
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
        <h2 className="card-title">{copy.title}</h2>
        <p className="body-copy">{copy.body}</p>
      </div>
      <form className="stack-md" onSubmit={submit}>
        <div className="segmented-control" role="group" aria-label={copy.eyebrow}>
          <button type="button" className={targetMode === "score" ? "is-active" : ""} onClick={() => setTargetMode("score")}>{copy.score}</button>
          <button type="button" className={targetMode === "selection" ? "is-active" : ""} onClick={() => setTargetMode("selection")} disabled={!canPostToSelection}>{copy.selection}</button>
        </div>
        {targetMode === "selection" ? <p className="item-meta">{selectedTarget?.label ?? copy.noSelection}</p> : null}
        <textarea className="field-control" rows={3} maxLength={2000} value={body} onChange={(event) => setBody(event.target.value)} placeholder={copy.placeholder} />
        <button type="submit" className="button button-primary" disabled={posting || !body.trim() || (targetMode === "selection" && !selectedTarget)}>
          {posting ? copy.posting : copy.post}
        </button>
      </form>
      {message ? <p className={`form-status ${message.kind}`}>{message.text}</p> : null}
      {annotations.length === 0 ? <div className="empty-state">{copy.empty}</div> : (
        <div className="list-grid">
          {annotations.map((annotation) => {
            const eventId = typeof annotation.target?.eventId === "string" ? annotation.target.eventId : null;
            return (
              <div className="list-item" key={annotation.id} data-testid="shared-annotation">
                <div className="list-item-content stack-xs">
                  <div className="button-row">
                    <strong className="item-title">{annotation.author.displayName}</strong>
                    <span className={`status-chip ${annotation.author.verification === "account" ? "tone-green" : "tone-cyan"}`}>
                      {annotation.author.verification === "account" ? copy.account : copy.share}
                    </span>
                    {annotation.resolvedAt ? <span className="status-chip tone-green">{copy.resolved}</span> : null}
                  </div>
                  <p className="item-meta">{annotationTargetLabel(annotation.target, copy.score)} · {new Date(annotation.createdAt).toLocaleString(isChinese ? "zh-CN" : "en-US")}</p>
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

function findAnnotationTarget(scoreJson: ScoreJson, eventId: string | null, isChinese: boolean) {
  if (!eventId) return null;
  const partNames = new Map(scoreJson.parts.map((part) => [part.id, part.name]));
  const measure = scoreJson.measures.find((item) => item.events.some((event) => event.id === eventId));
  const event = measure?.events.find((item) => item.id === eventId);
  if (!measure || !event || event.type !== "note") return null;
  const accidental = event.pitch.alter > 0 ? "#".repeat(event.pitch.alter) : event.pitch.alter < 0 ? "b".repeat(Math.abs(event.pitch.alter)) : "";
  const pitch = `${event.pitch.step}${accidental}${event.pitch.octave}`;
  const label = `${partNames.get(measure.partId) ?? measure.partId} ${isChinese ? "小节" : "Measure"} ${measure.number} ${pitch}`;
  return { type: "note", label, partId: measure.partId, measureId: measure.id, measureNumber: measure.number, eventId: event.id };
}

function annotationTargetLabel(target: Record<string, unknown> | null, fallback: string) {
  return typeof target?.label === "string" && target.label.trim() ? target.label : fallback;
}
