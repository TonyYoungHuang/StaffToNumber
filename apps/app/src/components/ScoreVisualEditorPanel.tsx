"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { formatMessage, formatNumber } from "@score/i18n";
import type { ScoreJson, ScoreNoteEvent, ScorePitchStep } from "@score/shared";
import { apiRequest } from "../lib/api";
import { parseScoreEditorClipboard, scoreEditorClipboardKey, serializeScoreEditorClipboard, type ScoreEditorClipboard } from "../lib/score-editor-clipboard";
import {
  enqueueOfflineScoreCollaborationCommand,
  listOfflineScoreCollaborationCommands,
  queuedScoreCollaborationRequest,
  removeOfflineScoreCollaborationCommand,
  scoreCollaborationQueueScope,
  type OfflineScoreCollaborationCommand,
} from "../lib/score-collaboration-queue";
import { useScoreEditorMessages } from "../lib/score-editor-messages/client";
import type { ScoreEditorMessages } from "../lib/score-editor-messages/types";
import { VexFlowNotationSurface, type VexFlowEventDrag } from "./VexFlowNotationSurface";

type ScoreRevision = {
  id: string;
  revisionNumber: number;
  musicxmlFileId: string | null;
  createdFrom: string;
  createdAt: string;
  scoreJson: ScoreJson;
};

type ScoreDocument = {
  id: string;
  title: string;
  status: "imported" | "candidate" | "ready" | "archived";
  sourceFileId: string | null;
  currentRevisionId: string | null;
  createdAt: string;
  updatedAt: string;
  currentRevision: ScoreRevision | null;
};

type ScorePayload = {
  score: ScoreDocument;
  revision?: ScoreRevision;
  revisions: ScoreRevision[];
};

type ScoreCommandPayload = ScorePayload & {
  status?: "applied" | "merged" | "duplicate" | "conflict";
  command?: {
    id: string;
    status: string;
    conflictReason: string | null;
    conflictingCommandIds: string[];
    history?: { action: "undo" | "redo"; targetOperationId: string; affectedEventIds: string[] } | null;
  } | null;
};

type ScoreCollaborationCommandSummary = {
  id: string;
  commandType: string;
  status: "applied" | "merged" | "conflict";
  isCurrentActor: boolean;
  history: { action: "undo" | "redo"; targetOperationId: string; affectedEventIds: string[] } | null;
};

export type ScoreEditorCollaborationMutation = {
  commandType: string;
  targetEventIds: string[];
  operationId?: string;
  baseRevisionId?: string;
  resultRevisionId?: string;
  mergeStatus?: "applied" | "merged" | "duplicate";
};

type VisualNote = ScoreNoteEvent & {
  partId: string;
  partName: string;
  measureId: string;
  measureNumber: string;
  measureSequence: number;
  eventIndex: number;
};

type DraftPitch = {
  step: ScorePitchStep;
  alter: number;
  octave: number;
};

type PendingCollaborationConflict = {
  payload: ScoreCommandPayload;
  command: NonNullable<ReturnType<typeof canonicalCommandForPath>>;
  targetEventIds: string[];
};

const PITCH_STEPS: ScorePitchStep[] = ["C", "D", "E", "F", "G", "A", "B"];
const PITCH_CLASS_BY_STEP: Record<ScorePitchStep, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};
const SPELLINGS: DraftPitch[] = [
  { step: "C", alter: 0, octave: 4 },
  { step: "C", alter: 1, octave: 4 },
  { step: "D", alter: 0, octave: 4 },
  { step: "D", alter: 1, octave: 4 },
  { step: "E", alter: 0, octave: 4 },
  { step: "F", alter: 0, octave: 4 },
  { step: "F", alter: 1, octave: 4 },
  { step: "G", alter: 0, octave: 4 },
  { step: "G", alter: 1, octave: 4 },
  { step: "A", alter: 0, octave: 4 },
  { step: "A", alter: 1, octave: 4 },
  { step: "B", alter: 0, octave: 4 },
];
const DURATION_TO_VALUE = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  "16th": 0.25,
  "32nd": 0.125,
  "64th": 0.0625,
} as const;
const DURATION_TYPES = Object.keys(DURATION_TO_VALUE) as Array<keyof typeof DURATION_TO_VALUE>;

export function ScoreVisualEditorPanel({
  scoreId,
  token,
  shareToken,
  scoreJson,
  baseRevisionId,
  selectedEventId,
  onSelectedEventChange,
  onUpdated,
  onReload,
  allowCookieAuth = false,
}: {
  scoreId: string;
  token: string | null;
  shareToken?: string | null;
  scoreJson: ScoreJson;
  baseRevisionId?: string | null;
  selectedEventId?: string | null;
  onSelectedEventChange?: (eventId: string) => void;
  onUpdated: (payload: ScorePayload, mutation: ScoreEditorCollaborationMutation) => void | Promise<void>;
  onReload?: (payload: ScorePayload) => void | Promise<void>;
  allowCookieAuth?: boolean;
}) {
  const { locale, messages } = useScoreEditorMessages();
  const copy = messages.editor;
  const notes = useMemo(() => collectVisualNotes(scoreJson), [scoreJson]);
  const [selectedNoteId, setSelectedNoteId] = useState(notes[0]?.id ?? "");
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>(notes[0]?.id ? [notes[0].id] : []);
  const selectedNote = notes.find((note) => note.id === selectedNoteId) ?? notes[0] ?? null;
  const [step, setStep] = useState<ScorePitchStep>(selectedNote?.pitch.step ?? "C");
  const [alter, setAlter] = useState(selectedNote?.pitch.alter ?? 0);
  const [octave, setOctave] = useState(selectedNote?.pitch.octave ?? 4);
  const [duration, setDuration] = useState(selectedNote?.duration ?? 1);
  const [durationType, setDurationType] = useState<keyof typeof DURATION_TO_VALUE>((selectedNote?.durationType as keyof typeof DURATION_TO_VALUE) ?? "quarter");
  const [dots, setDots] = useState(selectedNote?.dots ?? 0);
  const [voice, setVoice] = useState(selectedNote?.voice ?? "1");
  const [staff, setStaff] = useState(selectedNote?.staff ?? 1);
  const [chord, setChord] = useState(selectedNote?.chord ?? false);
  const [saving, setSaving] = useState(false);
  const [mutating, setMutating] = useState<"insert" | "delete" | "reorder" | "batch" | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);
  const [clipboard, setClipboard] = useState<ScoreEditorClipboard>({ eventIds: [], mode: "copy" });
  const [pendingConflict, setPendingConflict] = useState<PendingCollaborationConflict | null>(null);
  const [resolvingConflict, setResolvingConflict] = useState(false);
  const [offlineQueueScope, setOfflineQueueScope] = useState<string | null>(null);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [syncingOfflineQueue, setSyncingOfflineQueue] = useState(false);
  const [historyCommands, setHistoryCommands] = useState<ScoreCollaborationCommandSummary[]>([]);
  const [historyMutating, setHistoryMutating] = useState<"undo" | "redo" | null>(null);
  const offlineQueueSyncRef = useRef(false);
  const hasOwnerAuth = Boolean(token || allowCookieAuth);

  useEffect(() => {
    const key = scoreEditorClipboardKey(scoreId);
    const restored = parseScoreEditorClipboard(window.localStorage.getItem(key), {
      scoreId,
      availableEventIds: scoreJson.measures.flatMap((measure) => measure.events.map((event) => event.id)),
    });
    setClipboard(restored ?? { eventIds: [], mode: "copy" });
    if (!restored) window.localStorage.removeItem(key);
  }, [scoreId, scoreJson]);

  function updateClipboard(next: ScoreEditorClipboard) {
    setClipboard(next);
    const key = scoreEditorClipboardKey(scoreId);
    if (next.eventIds.length === 0) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, serializeScoreEditorClipboard(scoreId, next));
  }

  useEffect(() => {
    let cancelled = false;
    let scope: string | null = null;
    const handleOnline = () => {
      if (scope) void flushOfflineQueue(scope);
    };
    async function initializeQueue() {
      try {
        scope = await scoreCollaborationQueueScope({ scoreId, shareToken });
        if (cancelled) return;
        setOfflineQueueScope(scope);
        const queued = await listOfflineScoreCollaborationCommands(scope);
        if (cancelled) return;
        setOfflineQueueCount(queued.length);
        if (queued.length > 0 && navigator.onLine) void flushOfflineQueue(scope);
      } catch {
        if (!cancelled) {
          setOfflineQueueScope(null);
          setOfflineQueueCount(0);
        }
      }
    }
    void initializeQueue();
    window.addEventListener("online", handleOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
    };
  }, [baseRevisionId, scoreId, shareToken, token]);

  useEffect(() => {
    if (!baseRevisionId || (!hasOwnerAuth && !shareToken)) {
      setHistoryCommands([]);
      return;
    }
    void refreshCollaborationHistory();
  }, [baseRevisionId, hasOwnerAuth, scoreId, shareToken]);

  const draftMidi = midiFromPitch({ step, alter, octave });
  const selectedMidi = selectedNote ? midiFromPitch(selectedNote.pitch) : draftMidi;
  const hasUnsavedChanges =
    Boolean(selectedNote) &&
    (draftMidi !== selectedMidi ||
      duration !== selectedNote.duration ||
      durationType !== (selectedNote.durationType ?? "quarter") ||
      dots !== selectedNote.dots ||
      voice !== (selectedNote.voice ?? "1") ||
      staff !== (selectedNote.staff ?? 1) ||
      chord !== (selectedNote.chord ?? false));
  const latestOwnHistoryCommand = historyCommands.find((command) => command.isCurrentActor && command.status !== "conflict") ?? null;
  const undoTarget = latestOwnHistoryCommand && latestOwnHistoryCommand.commandType !== "history.undo" ? latestOwnHistoryCommand : null;
  const redoTarget = latestOwnHistoryCommand?.commandType === "history.undo" ? latestOwnHistoryCommand : null;
  const busy = saving || mutating !== null || historyMutating !== null;

  useEffect(() => {
    if (!selectedEventId || selectedEventId === selectedNoteId) {
      return;
    }

    if (notes.some((note) => note.id === selectedEventId)) {
      setSelectedNoteId(selectedEventId);
    }
  }, [notes, selectedEventId, selectedNoteId]);

  useEffect(() => {
    if (!selectedNote) {
      return;
    }

    setSelectedNoteId(selectedNote.id);
    setStep(selectedNote.pitch.step);
    setAlter(selectedNote.pitch.alter);
    setOctave(selectedNote.pitch.octave);
    setDuration(selectedNote.duration);
    setDurationType((selectedNote.durationType as keyof typeof DURATION_TO_VALUE) ?? "quarter");
    setDots(selectedNote.dots);
    setVoice(selectedNote.voice ?? "1");
    setStaff(selectedNote.staff ?? 1);
    setChord(selectedNote.chord ?? false);
    setStatus(null);
    setStatusKind(null);
  }, [selectedNote?.id]);

  function selectNote(eventId: string) {
    setSelectedNoteId(eventId);
    setSelectedNoteIds([eventId]);
    onSelectedEventChange?.(eventId);
  }

  function selectNotes(eventIds: string[]) {
    setSelectedNoteIds(eventIds);
    const primaryId = eventIds.at(-1);
    if (primaryId) {
      setSelectedNoteId(primaryId);
      onSelectedEventChange?.(primaryId);
    }
  }

  function selectByOffset(offset: number) {
    if (notes.length === 0) {
      return;
    }
    const currentIndex = Math.max(0, notes.findIndex((note) => note.id === selectedNote?.id));
    const nextIndex = Math.min(notes.length - 1, Math.max(0, currentIndex + offset));
    selectNote(notes[nextIndex].id);
  }

  function setDraftPitchFromMidi(midi: number) {
    const next = pitchFromMidi(Math.min(127, Math.max(0, midi)));
    setStep(next.step);
    setAlter(next.alter);
    setOctave(next.octave);
  }

  function nudgePitch(semitones: number) {
    setDraftPitchFromMidi(draftMidi + semitones);
  }

  function setDurationPreset(nextDurationType: keyof typeof DURATION_TO_VALUE) {
    setDurationType(nextDurationType);
    setDuration(DURATION_TO_VALUE[nextDurationType]);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (target.matches("input, select, textarea")) {
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      void applyCollaborationHistory(event.shiftKey ? "redo" : "undo");
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
      event.preventDefault();
      void applyCollaborationHistory("redo");
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
      event.preventDefault();
      updateClipboard({ eventIds: selectedNoteIds, mode: "copy" });
      setStatus(copy.copied);
      setStatusKind("success");
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "x") {
      event.preventDefault();
      updateClipboard({ eventIds: selectedNoteIds, mode: "cut" });
      setStatus(copy.cutDone);
      setStatusKind("success");
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
      event.preventDefault();
      void pasteClipboard();
      return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      void deleteSelection();
      return;
    }

    if (["1", "2", "4", "8"].includes(event.key)) {
      event.preventDefault();
      setDurationPreset(event.key === "1" ? "whole" : event.key === "2" ? "half" : event.key === "8" ? "eighth" : "quarter");
      return;
    }

    if (/^[a-g]$/i.test(event.key)) {
      event.preventDefault();
      setStep(event.key.toUpperCase() as ScorePitchStep);
      setAlter(0);
      return;
    }

    if (event.key === "+" || event.key === "#") {
      event.preventDefault();
      setAlter((current) => Math.min(2, current + 1));
      return;
    }

    if (event.key === "-") {
      event.preventDefault();
      setAlter((current) => Math.max(-2, current - 1));
      return;
    }

    if (event.key === "=") {
      event.preventDefault();
      setAlter(0);
      return;
    }

    if (event.key === ".") {
      event.preventDefault();
      setDots((current) => (current === 0 ? 1 : 0));
      return;
    }

    if (event.key.toLowerCase() === "v") {
      event.preventDefault();
      setVoice((current) => String((Number.parseInt(current, 10) || 1) % 4 + 1));
      return;
    }

    if (event.key.toLowerCase() === "n") {
      event.preventDefault();
      insertAfterSelected();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      nudgePitch(1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      nudgePitch(-1);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectByOffset(-1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectByOffset(1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      void saveVisualEdit();
    }
  }

  async function postScoreMutation(path: string, body: Record<string, unknown>, successMessage: string, busyKind: "insert" | "delete" | "reorder" | "batch") {
    if (!hasOwnerAuth && !shareToken) {
      setStatus(copy.failed);
      setStatusKind("error");
      return false;
    }

    setMutating(busyKind);
    setStatus(null);
    setStatusKind(null);
    const canonicalCommand = canonicalCommandForPath(path, body);
    const operationId = baseRevisionId && canonicalCommand ? crypto.randomUUID() : null;
    const collaborationPath = shareToken
      ? `/api/scores/shared/${encodeURIComponent(shareToken)}/collaboration/commands`
      : `/api/scores/${scoreId}/collaboration/commands`;
    const result = await apiRequest<ScoreCommandPayload>(
      operationId ? collaborationPath : `/api/scores/${scoreId}${path}`,
      {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(operationId ? { operationId, baseRevisionId, command: canonicalCommand } : body),
    });
    setMutating(null);

    if (!result.ok) {
      if (operationId && canonicalCommand && baseRevisionId && result.status === 0) {
        const count = await queueOfflineCommand({ operationId, baseRevisionId, command: canonicalCommand, targetEventIds: targetEventIdsForPatch(body) });
        if (count !== null) {
          setStatus(formatMessage(copy.queuedOffline, { count: formatNumber(count, locale) }));
          setStatusKind("success");
          return true;
        }
        setStatus(copy.queueFailed);
        setStatusKind("error");
        return false;
      }
      if (operationId && canonicalCommand && result.status === 409 && result.data?.status === "conflict" && result.data.score.currentRevisionId) {
        setPendingConflict({
          payload: result.data,
          command: canonicalCommand,
          targetEventIds: targetEventIdsForPatch(body),
        });
      }
      setStatus(result.error || copy.failed);
      setStatusKind("error");
      return false;
    }

    setStatus(successMessage);
    setStatusKind("success");
    setPendingConflict(null);
    const targetEventIds = targetEventIdsForPatch(body);
    await onUpdated(result.data, {
      commandType: `${path.replace(/^\/edit\//, "").replaceAll("/", ".")}${typeof body.action === "string" ? `.${body.action}` : ""}`,
      targetEventIds: [...new Set(targetEventIds)],
      ...(operationId && baseRevisionId
        ? {
            operationId,
            baseRevisionId,
            resultRevisionId: result.data.revision?.id,
            mergeStatus: successfulMergeStatus(result.data.status),
          }
        : {}),
    });
    return true;
  }

  async function saveVisualEdit() {
    if ((!hasOwnerAuth && !shareToken) || !selectedNote) {
      setStatus(copy.failed);
      setStatusKind("error");
      return;
    }

    setSaving(true);
    setStatus(null);
    setStatusKind(null);
    const body = {
      eventId: selectedNote.id,
      eventType: "note",
      step,
      alter,
      octave,
      duration,
      durationType,
      dots,
      voice,
      staff,
      chord,
    };
    const canonicalCommand = canonicalCommandForPath("/edit/note", body);
    const operationId = baseRevisionId && canonicalCommand ? crypto.randomUUID() : null;
    const collaborationPath = shareToken
      ? `/api/scores/shared/${encodeURIComponent(shareToken)}/collaboration/commands`
      : `/api/scores/${scoreId}/collaboration/commands`;
    const result = await apiRequest<ScoreCommandPayload>(operationId ? collaborationPath : `/api/scores/${scoreId}/edit/note`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(operationId ? { operationId, baseRevisionId, command: canonicalCommand } : body),
    });
    setSaving(false);

    if (!result.ok) {
      if (operationId && canonicalCommand && baseRevisionId && result.status === 0) {
        const count = await queueOfflineCommand({ operationId, baseRevisionId, command: canonicalCommand, targetEventIds: [selectedNote.id] });
        if (count !== null) {
          setStatus(formatMessage(copy.queuedOffline, { count: formatNumber(count, locale) }));
          setStatusKind("success");
          return;
        }
        setStatus(copy.queueFailed);
        setStatusKind("error");
        return;
      }
      if (operationId && canonicalCommand && result.status === 409 && result.data?.status === "conflict" && result.data.score.currentRevisionId) {
        setPendingConflict({ payload: result.data, command: canonicalCommand, targetEventIds: [selectedNote.id] });
      }
      setStatus(result.error || copy.failed);
      setStatusKind("error");
      return;
    }

    setPendingConflict(null);
    setStatus(copy.success);
    setStatusKind("success");
    await onUpdated(result.data, {
      commandType: "note.patch",
      targetEventIds: [selectedNote.id],
      ...(operationId && baseRevisionId
        ? { operationId, baseRevisionId, resultRevisionId: result.data.revision?.id, mergeStatus: successfulMergeStatus(result.data.status) }
        : {}),
    });
  }

  async function loadLatestAfterConflict() {
    if (!pendingConflict) return;
    setResolvingConflict(true);
    applyDraftFromPayload(pendingConflict.payload, selectedNoteId, {
      setStep,
      setAlter,
      setOctave,
      setDuration,
      setDurationType,
      setDots,
      setVoice,
      setStaff,
      setChord,
    });
    await onReload?.(pendingConflict.payload);
    setPendingConflict(null);
    setStatus(copy.latestLoaded);
    setStatusKind("success");
    setResolvingConflict(false);
  }

  async function refreshCollaborationHistory() {
    if ((!hasOwnerAuth && !shareToken) || !baseRevisionId) return;
    const historyPath = shareToken
      ? `/api/scores/shared/${encodeURIComponent(shareToken)}/collaboration/commands`
      : `/api/scores/${scoreId}/collaboration/commands`;
    const result = await apiRequest<{ commands: ScoreCollaborationCommandSummary[] }>(historyPath, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (result.ok) setHistoryCommands(result.data.commands);
  }

  async function applyCollaborationHistory(action: "undo" | "redo") {
    const target = action === "undo" ? undoTarget : redoTarget;
    if ((!hasOwnerAuth && !shareToken) || !baseRevisionId || !target) return;
    const operationId = crypto.randomUUID();
    const historyPath = shareToken
      ? `/api/scores/shared/${encodeURIComponent(shareToken)}/collaboration/history`
      : `/api/scores/${scoreId}/collaboration/history`;
    setHistoryMutating(action);
    setStatus(null);
    setStatusKind(null);
    const result = await apiRequest<ScoreCommandPayload>(historyPath, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ operationId, baseRevisionId, action, targetOperationId: target.id }),
    });
    setHistoryMutating(null);
    if (!result.ok) {
      setStatus(result.error || copy.historyFailed);
      setStatusKind("error");
      return;
    }
    setPendingConflict(null);
    setStatus(action === "undo" ? copy.undoSuccess : copy.redoSuccess);
    setStatusKind("success");
    const targetEventIds = result.data.command?.history?.affectedEventIds ?? [];
    await onUpdated(result.data, {
      commandType: `history.${action}`,
      targetEventIds,
      operationId,
      baseRevisionId,
      resultRevisionId: result.data.revision?.id,
      mergeStatus: successfulMergeStatus(result.data.status),
    });
    await refreshCollaborationHistory();
  }

  async function queueOfflineCommand(input: {
    operationId: string;
    baseRevisionId: string;
    command: PendingCollaborationConflict["command"];
    targetEventIds: string[];
  }) {
    try {
      const scope = offlineQueueScope ?? await scoreCollaborationQueueScope({ scoreId, shareToken });
      setOfflineQueueScope(scope);
      await enqueueOfflineScoreCollaborationCommand({
        version: 1,
        scope,
        scoreId,
        createdAt: new Date().toISOString(),
        ...input,
      });
      const queued = await listOfflineScoreCollaborationCommands(scope);
      setOfflineQueueCount(queued.length);
      return queued.length;
    } catch {
      return null;
    }
  }

  async function flushOfflineQueue(scopeOverride?: string) {
    if (offlineQueueSyncRef.current || (!hasOwnerAuth && !shareToken)) return;
    const initialBaseRevisionId = baseRevisionId;
    if (!initialBaseRevisionId) return;
    offlineQueueSyncRef.current = true;
    setSyncingOfflineQueue(true);
    try {
      const scope = scopeOverride ?? offlineQueueScope ?? await scoreCollaborationQueueScope({ scoreId, shareToken });
      const queued = await listOfflineScoreCollaborationCommands(scope);
      let latestBaseRevisionId = initialBaseRevisionId;
      let synced = 0;
      for (const item of queued) {
        const requestBaseRevisionId = latestBaseRevisionId;
        const collaborationPath = shareToken
          ? `/api/scores/shared/${encodeURIComponent(shareToken)}/collaboration/commands`
          : `/api/scores/${scoreId}/collaboration/commands`;
        const result = await apiRequest<ScoreCommandPayload>(collaborationPath, {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(queuedScoreCollaborationRequest(item, requestBaseRevisionId)),
        });
        if (!result.ok) {
          if (result.status === 409 && result.data?.status === "conflict" && result.data.score.currentRevisionId) {
            await removeOfflineScoreCollaborationCommand(item.operationId);
            setPendingConflict({
              payload: result.data,
              command: item.command as PendingCollaborationConflict["command"],
              targetEventIds: item.targetEventIds,
            });
            setStatus(result.error);
            setStatusKind("error");
          }
          break;
        }
        await removeOfflineScoreCollaborationCommand(item.operationId);
        synced += 1;
        latestBaseRevisionId = result.data.score.currentRevisionId ?? result.data.revision?.id ?? latestBaseRevisionId;
        await onUpdated(result.data, {
          commandType: canonicalCommandLabelClient(item.command as PendingCollaborationConflict["command"]),
          targetEventIds: item.targetEventIds,
          operationId: item.operationId,
          baseRevisionId: requestBaseRevisionId,
          resultRevisionId: result.data.revision?.id,
          mergeStatus: successfulMergeStatus(result.data.status),
        });
      }
      const remaining = await listOfflineScoreCollaborationCommands(scope);
      setOfflineQueueCount(remaining.length);
      if (synced > 0 && remaining.length === 0) {
        setStatus(copy.queueSynced);
        setStatusKind("success");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : copy.queueFailed);
      setStatusKind("error");
    } finally {
      offlineQueueSyncRef.current = false;
      setSyncingOfflineQueue(false);
    }
  }

  async function reapplyConflictToLatest() {
    if (!pendingConflict || (!hasOwnerAuth && !shareToken)) return;
    const latestRevisionId = pendingConflict.payload.score.currentRevisionId;
    if (!latestRevisionId) return;
    setResolvingConflict(true);
    const operationId = crypto.randomUUID();
    const collaborationPath = shareToken
      ? `/api/scores/shared/${encodeURIComponent(shareToken)}/collaboration/commands`
      : `/api/scores/${scoreId}/collaboration/commands`;
    const result = await apiRequest<ScoreCommandPayload>(collaborationPath, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ operationId, baseRevisionId: latestRevisionId, command: pendingConflict.command }),
    });
    setResolvingConflict(false);
    if (!result.ok) {
      if (result.status === 409 && result.data?.status === "conflict" && result.data.score.currentRevisionId) {
        setPendingConflict((current) => current ? { ...current, payload: result.data! } : current);
      }
      setStatus(result.error || copy.failed);
      setStatusKind("error");
      return;
    }
    const resolved = pendingConflict;
    setPendingConflict(null);
    setStatus(copy.conflictResolved);
    setStatusKind("success");
    await onUpdated(result.data, {
      commandType: canonicalCommandLabelClient(resolved.command),
      targetEventIds: resolved.targetEventIds,
      operationId,
      baseRevisionId: latestRevisionId,
      resultRevisionId: result.data.revision?.id,
      mergeStatus: successfulMergeStatus(result.data.status),
    });
  }

  function insertAfterSelected() {
    if (!selectedNote) {
      return;
    }

    void postScoreMutation(
      "/edit/note/insert",
      {
        measureId: selectedNote.measureId,
        afterEventId: selectedNote.id,
        step,
        alter,
        octave,
        duration,
        durationType,
        voice: selectedNote.voice,
        staff: selectedNote.staff,
      },
      copy.inserted,
      "insert",
    );
  }

  function deleteSelected() {
    if (!selectedNote) {
      return;
    }

    void postScoreMutation("/edit/event/delete", { eventId: selectedNote.id }, copy.deleted, "delete");
  }

  async function deleteSelection() {
    if (selectedNoteIds.length <= 1) {
      deleteSelected();
      return;
    }
    await postScoreMutation("/edit/events/batch", { action: "delete", eventIds: selectedNoteIds }, copy.batchDeleted, "batch");
    setSelectedNoteIds([]);
  }

  async function pasteClipboard() {
    if (!selectedNote || clipboard.eventIds.length === 0) {
      return;
    }
    const pasted = await postScoreMutation(
      "/edit/events/batch",
      {
        action: clipboard.mode === "cut" ? "move" : "duplicate",
        eventIds: clipboard.eventIds,
        targetMeasureId: selectedNote.measureId,
        afterEventId: clipboard.mode === "cut" && clipboard.eventIds.includes(selectedNote.id) ? undefined : selectedNote.id,
        balanceMeasures: clipboard.mode === "cut",
      },
      copy.pasted,
      "batch",
    );
    if (pasted && clipboard.mode === "cut") {
      updateClipboard({ eventIds: [], mode: "copy" });
    }
  }

  function moveEventFromSurface(drag: VexFlowEventDrag) {
    void postScoreMutation("/edit/event/reorder", { ...drag, balanceMeasures: true }, copy.reordered, "reorder");
  }

  function reorderSelectedByOffset(offset: number) {
    if (!selectedNote) {
      return;
    }
    void reorderToEventIndex(selectedNote, selectedNote.eventIndex + offset);
  }

  async function reorderToEventIndex(note: VisualNote, targetIndex: number) {
    const nextIndex = Math.min(Math.max(0, countEventsForMeasure(scoreJson, note.measureId) - 1), Math.max(0, targetIndex));
    if (nextIndex === note.eventIndex) {
      return;
    }

    await postScoreMutation(
      "/edit/event/reorder",
      {
        eventId: note.id,
        targetMeasureId: note.measureId,
        targetIndex: nextIndex,
      },
      copy.reordered,
      "reorder",
    );
  }

  if (notes.length === 0) {
    return (
      <section className="surface-panel stack-lg" aria-label={copy.panelAria}>
        <div className="stack-sm">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2 className="card-title">{copy.title}</h2>
          <p className="body-copy">{copy.body}</p>
        </div>
        <div className="empty-state">{copy.empty}</div>
      </section>
    );
  }

  return (
    <section className="surface-panel stack-lg" aria-label={copy.panelAria} onKeyDown={handleKeyDown}>
      <div className="stack-sm">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 className="card-title">{copy.title}</h2>
        <p className="body-copy">{copy.body}</p>
      </div>

      <div className="visual-editor-toolbar" aria-label={copy.durationToolbarAria}>
        {DURATION_TYPES.map((item) => (
          <button key={item} type="button" className={`tool-chip${durationType === item ? " is-active" : ""}`} onClick={() => setDurationPreset(item)} disabled={busy}>
            <span aria-hidden="true">{durationGlyph(item)}</span>
            <span>{messages.durations[item]}</span>
          </button>
        ))}
        <span className={`status-chip ${hasUnsavedChanges ? "tone-amber" : "tone-cyan"}`} role="status" aria-label={copy.statusAria}>
          {hasUnsavedChanges ? copy.unsaved : copy.clean}
        </span>
      </div>

      <div className="visual-score-editor">
        <div className="visual-score-scroll" aria-label={copy.scoreViewportAria}>
          <p className="item-meta">{copy.dragHint}</p>
          <p className="item-meta">{copy.shortcutHint}</p>
          <VexFlowNotationSurface
            scoreJson={scoreJson}
            selectedEventIds={selectedNoteIds}
            onSelectionChange={selectNotes}
            onEventDrag={moveEventFromSurface}
          />
        </div>

        <div className="mini-card stack-sm">
          <p className="metric-label">{copy.selected}</p>
          <p className="item-title">
            {selectedNote ? formatDraftLabel(selectedNote, { step, alter, octave, durationType }, messages) : "-"}
            {selectedNoteIds.length > 1 ? ` · ${formatMessage(copy.selectedCount, { count: formatNumber(selectedNoteIds.length, locale) })}` : ""}
          </p>
          <div className="button-row">
            <button type="button" className="button button-secondary button-ghost" onClick={() => updateClipboard({ eventIds: selectedNoteIds, mode: "copy" })} disabled={busy || selectedNoteIds.length === 0}>
              {copy.copy}
            </button>
            <button type="button" className="button button-secondary button-ghost" onClick={() => updateClipboard({ eventIds: selectedNoteIds, mode: "cut" })} disabled={busy || selectedNoteIds.length === 0}>
              {copy.cut}
            </button>
            <button type="button" className="button button-secondary button-ghost" onClick={() => void pasteClipboard()} disabled={busy || clipboard.eventIds.length === 0 || !selectedNote}>
              {copy.paste}
            </button>
          </div>
          <div className="button-row">
            <button type="button" className="button button-secondary button-ghost" onClick={() => selectByOffset(-1)} disabled={busy}>
              {copy.previous}
            </button>
            <button type="button" className="button button-secondary button-ghost" onClick={() => selectByOffset(1)} disabled={busy}>
              {copy.next}
            </button>
          </div>
          <div className="button-row">
            <button type="button" className="button button-secondary button-ghost" onClick={() => nudgePitch(-1)} disabled={busy}>
              {copy.lower}
            </button>
            <button type="button" className="button button-secondary button-ghost" onClick={() => nudgePitch(1)} disabled={busy}>
              {copy.raise}
            </button>
          </div>
          <div className="button-row">
            <button type="button" className="button button-secondary button-ghost" onClick={() => reorderSelectedByOffset(-1)} disabled={busy || !selectedNote || selectedNote.eventIndex <= 0}>
              {mutating === "reorder" ? copy.moving : copy.moveLeft}
            </button>
            <button
              type="button"
              className="button button-secondary button-ghost"
              onClick={() => reorderSelectedByOffset(1)}
              disabled={busy || !selectedNote || selectedNote.eventIndex >= countEventsForMeasure(scoreJson, selectedNote.measureId) - 1}
            >
              {mutating === "reorder" ? copy.moving : copy.moveRight}
            </button>
          </div>
          <div className="correction-panel">
            <label className="field-group">
              <span>{copy.pitch}</span>
              <select className="field-select" value={step} onChange={(event) => setStep(event.target.value as ScorePitchStep)} disabled={busy}>
                {PITCH_STEPS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-group">
              <span>{copy.alter}</span>
              <input className="field-control" type="number" min={-2} max={2} step={1} value={alter} onChange={(event) => setAlter(Number(event.target.value))} disabled={busy} />
            </label>
            <label className="field-group">
              <span>{copy.octave}</span>
              <input className="field-control" type="number" min={0} max={9} step={1} value={octave} onChange={(event) => setOctave(Number(event.target.value))} disabled={busy} />
            </label>
            <label className="field-group">
              <span>{copy.duration}</span>
              <select className="field-select" value={durationType} onChange={(event) => setDurationPreset(event.target.value as keyof typeof DURATION_TO_VALUE)} disabled={busy}>
                {DURATION_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {messages.durations[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-group">
              <span>{copy.rawDuration}</span>
              <input className="field-control" type="number" min={0.0625} step={0.0625} value={duration} onChange={(event) => setDuration(Number(event.target.value))} disabled={busy} />
            </label>
            <label className="field-group">
              <span>{copy.dots}</span>
              <input className="field-control" type="number" min={0} max={4} step={1} value={dots} onChange={(event) => setDots(Number(event.target.value))} disabled={busy} />
            </label>
            <label className="field-group">
              <span>{copy.voice}</span>
              <input className="field-control" type="text" maxLength={20} value={voice} onChange={(event) => setVoice(event.target.value)} disabled={busy} />
            </label>
            <label className="field-group">
              <span>{copy.staff}</span>
              <input className="field-control" type="number" min={1} max={8} step={1} value={staff} onChange={(event) => setStaff(Number(event.target.value))} disabled={busy} />
            </label>
            <label className="field-group">
              <span>{copy.chordTone}</span>
              <input type="checkbox" checked={chord} onChange={(event) => setChord(event.target.checked)} disabled={busy} />
            </label>
          </div>
          <div className="button-row">
            <button type="button" className="button button-secondary button-ghost" onClick={insertAfterSelected} disabled={busy || !selectedNote}>
              {mutating === "insert" ? copy.inserting : copy.insert}
            </button>
            <button type="button" className="button button-secondary button-ghost" onClick={() => void deleteSelection()} disabled={busy || !selectedNote}>
              {mutating === "delete" ? copy.deleting : copy.delete}
            </button>
          </div>
          <button type="button" className="button button-primary" onClick={() => void saveVisualEdit()} disabled={busy || !selectedNote}>
            {saving ? copy.saving : copy.save}
          </button>
          {baseRevisionId ? (
            <div className="collaboration-history-toolbar">
              <span className="item-meta">{copy.historyTitle}</span>
              <div className="button-row" role="group" aria-label={copy.historyTitle}>
                <button type="button" className="button button-secondary button-ghost" onClick={() => void applyCollaborationHistory("undo")} disabled={busy || !undoTarget}>
                  {historyMutating === "undo" ? copy.undoing : copy.undo}
                </button>
                <button type="button" className="button button-secondary button-ghost" onClick={() => void applyCollaborationHistory("redo")} disabled={busy || !redoTarget}>
                  {historyMutating === "redo" ? copy.redoing : copy.redo}
                </button>
              </div>
            </div>
          ) : null}
          {offlineQueueCount > 0 ? (
            <div className="collaboration-offline-panel" role="status">
              <p className="item-title">{formatMessage(copy.offlineTitleWithCount, { count: formatNumber(offlineQueueCount, locale) })}</p>
              <p className="body-copy">{copy.offlineBody}</p>
              <button type="button" className="button button-secondary" onClick={() => void flushOfflineQueue()} disabled={syncingOfflineQueue}>
                {syncingOfflineQueue ? copy.syncingQueue : copy.syncNow}
              </button>
            </div>
          ) : null}
          {pendingConflict ? (
            <div className="collaboration-conflict-panel" role="alert">
              <p className="item-title">{copy.conflictTitle}</p>
              <p className="body-copy">{copy.conflictBody}</p>
              <p className="item-meta">
                {copy.conflictReason}: {formatConflictReason(pendingConflict.payload.command?.conflictReason, messages.conflictReasons)}
              </p>
              {pendingConflict.payload.command?.conflictingCommandIds.length ? (
                <p className="item-meta">
                  {copy.conflictOperations}: {pendingConflict.payload.command.conflictingCommandIds.map((id) => id.slice(0, 8)).join(", ")}
                </p>
              ) : null}
              <div className="button-row">
                <button type="button" className="button button-secondary" onClick={() => void loadLatestAfterConflict()} disabled={resolvingConflict}>
                  {resolvingConflict ? copy.resolving : copy.loadLatest}
                </button>
                <button type="button" className="button button-primary" onClick={() => void reapplyConflictToLatest()} disabled={resolvingConflict}>
                  {resolvingConflict ? copy.resolving : copy.reapplyLatest}
                </button>
              </div>
            </div>
          ) : null}
          {status && statusKind ? <p className={`form-status ${statusKind}`} role={statusKind === "error" ? "alert" : "status"} aria-label={copy.statusAria}>{status}</p> : null}
        </div>
      </div>
    </section>
  );
}

function collectVisualNotes(scoreJson: ScoreJson): VisualNote[] {
  const partNames = new Map(scoreJson.parts.map((part) => [part.id, part.name]));
  return scoreJson.measures.flatMap((measure) =>
    measure.events
      .map((event, eventIndex) =>
        event.type === "note"
          ? {
              ...event,
              partId: measure.partId,
              partName: partNames.get(measure.partId) ?? measure.partId,
              measureId: measure.id,
              measureNumber: measure.number,
              measureSequence: measure.sequence,
              eventIndex,
            }
          : null,
      )
      .filter((event): event is VisualNote => Boolean(event)),
  );
}

function canonicalCommandForPath(path: string, patch: Record<string, unknown>) {
  switch (path) {
    case "/edit/note":
      return { type: "note.patch", patch } as const;
    case "/edit/note/insert":
      return { type: "note.insert", patch } as const;
    case "/edit/event/delete":
      return { type: "event.delete", patch } as const;
    case "/edit/events/batch":
      return { type: "events.batch", patch } as const;
    case "/edit/event/reorder":
      return { type: "event.reorder", patch } as const;
    default:
      return null;
  }
}

function canonicalCommandLabelClient(command: NonNullable<ReturnType<typeof canonicalCommandForPath>>) {
  return command.type === "events.batch" && typeof command.patch.action === "string"
    ? `${command.type}.${command.patch.action}`
    : command.type;
}

function successfulMergeStatus(status: ScoreCommandPayload["status"]): ScoreEditorCollaborationMutation["mergeStatus"] {
  return status === "applied" || status === "merged" || status === "duplicate" ? status : undefined;
}

function targetEventIdsForPatch(patch: Record<string, unknown>) {
  return [...new Set([
    ...(typeof patch.eventId === "string" ? [patch.eventId] : []),
    ...(typeof patch.afterEventId === "string" ? [patch.afterEventId] : []),
    ...(Array.isArray(patch.eventIds) ? patch.eventIds.filter((item): item is string => typeof item === "string") : []),
  ])];
}

function applyDraftFromPayload(
  payload: ScorePayload,
  eventId: string,
  setters: {
    setStep: (value: ScorePitchStep) => void;
    setAlter: (value: number) => void;
    setOctave: (value: number) => void;
    setDuration: (value: number) => void;
    setDurationType: (value: keyof typeof DURATION_TO_VALUE) => void;
    setDots: (value: number) => void;
    setVoice: (value: string) => void;
    setStaff: (value: number) => void;
    setChord: (value: boolean) => void;
  },
) {
  const event = payload.score.currentRevision?.scoreJson.measures
    .flatMap((measure) => measure.events)
    .find((candidate) => candidate.id === eventId);
  if (!event || event.type !== "note") return;
  setters.setStep(event.pitch.step);
  setters.setAlter(event.pitch.alter);
  setters.setOctave(event.pitch.octave);
  setters.setDuration(event.duration);
  setters.setDurationType((event.durationType as keyof typeof DURATION_TO_VALUE) ?? "quarter");
  setters.setDots(event.dots);
  setters.setVoice(event.voice ?? "1");
  setters.setStaff(event.staff ?? 1);
  setters.setChord(event.chord ?? false);
}

function formatConflictReason(reason: string | null | undefined, copy: ScoreEditorMessages["conflictReasons"]) {
  if (!reason) return copy.unknown;
  if (reason in copy) return copy[reason as keyof typeof copy];
  return reason;
}

function countEventsForMeasure(scoreJson: ScoreJson, measureId: string) {
  return Math.max(1, scoreJson.measures.find((measure) => measure.id === measureId)?.events.length ?? 1);
}

function midiFromPitch(pitch: { step: ScorePitchStep; alter: number; octave: number }) {
  return (pitch.octave + 1) * 12 + PITCH_CLASS_BY_STEP[pitch.step] + pitch.alter;
}

function pitchFromMidi(midi: number): DraftPitch {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const spelling = SPELLINGS[pitchClass];
  return {
    step: spelling.step,
    alter: spelling.alter,
    octave,
  };
}

function durationGlyph(durationType: keyof typeof DURATION_TO_VALUE) {
  switch (durationType) {
    case "whole":
      return "w";
    case "half":
      return "h";
    case "quarter":
      return "q";
    case "eighth":
      return "e";
    default:
      return durationType;
  }
}

function pitchText(pitch: DraftPitch) {
  const accidental = pitch.alter > 0 ? "#".repeat(pitch.alter) : pitch.alter < 0 ? "b".repeat(Math.abs(pitch.alter)) : "";
  return `${pitch.step}${accidental}${pitch.octave}`;
}

function formatDraftLabel(
  note: VisualNote,
  draft: DraftPitch & { durationType: keyof ScoreEditorMessages["durations"] },
  messages: ScoreEditorMessages,
) {
  return formatMessage(messages.editor.draftLabel, {
    part: note.partName,
    measure: note.measureNumber,
    pitch: pitchText(draft),
    duration: messages.durations[draft.durationType],
  }).trim();
}
