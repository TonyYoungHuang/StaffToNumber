"use client";

import { useEffect, useRef, useState } from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import { apiRequest } from "../lib/api";
import {
  appendScoreCollaborationOperation,
  currentScoreCollaborationOperation,
  listScoreCollaborationConflicts,
  listScoreCollaborationOperations,
  reconcileScoreCollaborationConflicts,
  scoreCollaborationTypes,
  type ScoreCollaborationOperation,
} from "../lib/score-collaboration-document";

type Collaborator = { clientId: number; name: string; role: string; selectedEventId: string | null };
type TrustedActor = { kind: "account" | "share_link"; displayName: string; verification: "account" | "share_link" };

export function ScoreCollaborationPanel({ scoreId, token, currentRevisionId, pendingOperations, selectedEventId, onRemoteEventSelect, onRemoteRevision, locale }: {
  scoreId: string;
  token: string | null;
  currentRevisionId: string | null;
  pendingOperations: ScoreCollaborationOperation[];
  selectedEventId: string | null;
  onRemoteEventSelect: (eventId: string) => void;
  onRemoteRevision: (revisionId: string) => void | Promise<void>;
  locale: string;
}) {
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [sharedNote, setSharedNote] = useState("");
  const [operations, setOperations] = useState<ScoreCollaborationOperation[]>([]);
  const [conflictCount, setConflictCount] = useState(0);
  const [trustedActors, setTrustedActors] = useState<Record<string, TrustedActor>>({});
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const documentRef = useRef<Y.Doc | null>(null);
  const noteRef = useRef<Y.Text | null>(null);
  const currentRevisionRef = useRef(currentRevisionId);
  const localOperationIdsRef = useRef(new Set<string>());
  const notifiedRevisionIdsRef = useRef(new Set<string>());
  const isChinese = locale === "zh-CN";

  useEffect(() => {
    currentRevisionRef.current = currentRevisionId;
  }, [currentRevisionId]);

  useEffect(() => {
    if (!token) return;
    const document = new Y.Doc();
    documentRef.current = document;
    const provider = new HocuspocusProvider({
      url: process.env.NEXT_PUBLIC_COLLABORATION_URL ?? "ws://localhost:4001",
      name: scoreId,
      document,
      token,
    });
    providerRef.current = provider;
    const note = document.getText("rehearsal-note");
    const { metadata, operations: sharedOperations, conflicts } = scoreCollaborationTypes(document);
    noteRef.current = note;
    const updateNote = () => setSharedNote(note.toString());
    const updateOperations = () => {
      reconcileScoreCollaborationConflicts(document);
      const nextOperations = listScoreCollaborationOperations(document);
      setOperations(nextOperations.slice(-8).reverse());
      setConflictCount(listScoreCollaborationConflicts(document).length);
      const operation = currentScoreCollaborationOperation(document);
      if (
        operation &&
        !localOperationIdsRef.current.has(operation.id) &&
        operation.resultRevisionId !== currentRevisionRef.current &&
        !notifiedRevisionIdsRef.current.has(operation.resultRevisionId)
      ) {
        notifiedRevisionIdsRef.current.add(operation.resultRevisionId);
        void onRemoteRevision(operation.resultRevisionId);
      }
    };
    const updateAwareness = () => {
      const awareness = provider.awareness;
      if (!awareness) return;
      const states = Array.from(awareness.getStates().entries())
        .filter(([clientId]) => clientId !== awareness.clientID)
        .map(([clientId, state]) => ({
          clientId,
          name: typeof state.user?.name === "string" ? state.user.name : isChinese ? "协作者" : "Collaborator",
          role: typeof state.user?.role === "string" ? state.user.role : "viewer",
          selectedEventId: typeof state.selection?.eventId === "string" ? state.selection.eventId : null,
        }));
      setCollaborators(states);
    };
    const updateStatus = ({ status: nextStatus }: { status: string }) => setStatus(nextStatus === "connected" ? "connected" : nextStatus === "disconnected" ? "disconnected" : "connecting");
    provider.on("status", updateStatus);
    provider.awareness?.setLocalStateField("user", { name: isChinese ? "当前用户" : "Current user", role: "owner" });
    provider.awareness?.on("change", updateAwareness);
    note.observe(updateNote);
    sharedOperations.observeDeep(updateOperations);
    conflicts.observeDeep(updateOperations);
    metadata.observe(updateOperations);
    updateNote();
    updateOperations();
    return () => {
      note.unobserve(updateNote);
      sharedOperations.unobserveDeep(updateOperations);
      conflicts.unobserveDeep(updateOperations);
      metadata.unobserve(updateOperations);
      provider.awareness?.off("change", updateAwareness);
      provider.off("status", updateStatus);
      provider.destroy();
      document.destroy();
      providerRef.current = null;
      documentRef.current = null;
      noteRef.current = null;
      setStatus("disconnected");
    };
  }, [isChinese, scoreId, token]);

  useEffect(() => {
    providerRef.current?.awareness?.setLocalStateField("selection", { eventId: selectedEventId });
  }, [selectedEventId]);

  useEffect(() => {
    if (!token || operations.length === 0) return;
    let cancelled = false;
    void apiRequest<{ commands: Array<{ id: string; actor: TrustedActor }> }>(`/api/scores/${scoreId}/collaboration/commands`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((result) => {
      if (!cancelled && result.ok) setTrustedActors(Object.fromEntries(result.data.commands.map((command) => [command.id, command.actor])));
    });
    return () => { cancelled = true; };
  }, [operations, scoreId, token]);

  useEffect(() => {
    const document = documentRef.current;
    if (!document) return;
    for (const operation of pendingOperations) {
      if (localOperationIdsRef.current.has(operation.id)) continue;
      localOperationIdsRef.current.add(operation.id);
      appendScoreCollaborationOperation(document, operation);
    }
  }, [pendingOperations]);

  function updateSharedNote(value: string) {
    const note = noteRef.current;
    if (!note) return;
    note.doc?.transact(() => {
      note.delete(0, note.length);
      note.insert(0, value.slice(0, 2000));
    }, "rehearsal-note");
  }

  const copy = isChinese
    ? { title: "多人实时协作 Beta", note: "共享排练备注", online: "在线状态（显示名未验证）", operations: "最近乐谱操作", conflicts: "并发冲突", noOperations: "等待第一条乐谱编辑操作。", revision: "修订", account: "账号身份", share: "链接身份", unverified: "未验证广播" }
    : { title: "Real-time Collaboration Beta", note: "Shared rehearsal note", online: "Online presence (display names unverified)", operations: "Recent score operations", conflicts: "Concurrent conflicts", noOperations: "Waiting for the first score edit operation.", revision: "Revision", account: "Account identity", share: "Link identity", unverified: "Unverified broadcast" };

  return (
    <section className="surface-panel stack-lg">
      <div className="score-review-toolbar">
        <div><p className="eyebrow">Yjs</p><h2 className="card-title">{copy.title}</h2></div>
        <span className={`status-chip ${status === "connected" ? "tone-cyan" : "tone-amber"}`}>{status}</span>
      </div>
      <label className="field-group wide">
        <span>{copy.note}</span>
        <textarea className="field-control" rows={3} maxLength={2000} value={sharedNote} onChange={(event) => updateSharedNote(event.target.value)} />
      </label>
      <div className="button-row">
        <span className="item-meta">{copy.online}: {collaborators.length}</span>
        <span className={`status-chip ${conflictCount ? "tone-red" : "tone-green"}`}>{copy.conflicts}: {conflictCount}</span>
        {collaborators.filter((item) => item.selectedEventId).map((item) => (
          <button key={item.clientId} type="button" className="button button-secondary button-ghost" onClick={() => onRemoteEventSelect(item.selectedEventId!)}>
            {item.name} ({item.role}): {item.selectedEventId}
          </button>
        ))}
      </div>
      <details>
        <summary className="item-title">{copy.operations} ({operations.length})</summary>
        {operations.length === 0 ? <p className="helper-copy">{copy.noOperations}</p> : (
          <div className="list-grid">
            {operations.map((operation) => (
              <div className="list-item" key={operation.id}>
                <div className="list-item-content">
                  <p className="item-title">{operation.commandType}</p>
                  <p className="item-meta">
                    {trustedActors[operation.id]?.displayName ?? operation.actorName} · {copy.revision} {operation.resultRevisionId.slice(0, 8)} · {operation.targetEventIds.length} targets
                  </p>
                  <span className={`status-chip ${trustedActors[operation.id] ? "tone-green" : "tone-amber"}`}>
                    {trustedActors[operation.id]?.verification === "account" ? copy.account : trustedActors[operation.id]?.verification === "share_link" ? copy.share : copy.unverified}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </details>
    </section>
  );
}
