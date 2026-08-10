import type { ScoreJson } from "@score/shared";
import {
  applyScoreEventBatchPatch,
  applyScoreEventDeletePatch,
  applyScoreEventReorderPatch,
  applyScoreNoteInsertPatch,
  applyScoreNotePatch,
  validateScoreEventBatchPatch,
  validateScoreEventDeletePatch,
  validateScoreEventReorderPatch,
  validateScoreNoteInsertPatch,
  validateScoreNotePatch,
  type ScoreEventBatchPatch,
  type ScoreEventDeletePatch,
  type ScoreEventReorderPatch,
  type ScoreNoteInsertPatch,
  type ScoreNotePatch,
} from "./score-edit.js";

export type CanonicalScoreCommand =
  | { type: "note.patch"; patch: ScoreNotePatch }
  | { type: "note.insert"; patch: ScoreNoteInsertPatch }
  | { type: "event.delete"; patch: ScoreEventDeletePatch }
  | { type: "events.batch"; patch: ScoreEventBatchPatch }
  | { type: "event.reorder"; patch: ScoreEventReorderPatch };

export type CanonicalScoreCommandRequest = {
  operationId: string;
  baseRevisionId: string;
  command: CanonicalScoreCommand;
};

const OPERATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:._-]{7,127}$/u;

export function validateCanonicalScoreCommandRequest(input: unknown): CanonicalScoreCommandRequest {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Collaboration command payload must be an object.");
  const body = input as Record<string, unknown>;
  if (typeof body.operationId !== "string" || !OPERATION_ID_PATTERN.test(body.operationId)) {
    throw new Error("Operation id must contain 8-128 safe identifier characters.");
  }
  if (typeof body.baseRevisionId !== "string" || body.baseRevisionId.length < 1 || body.baseRevisionId.length > 128) {
    throw new Error("Base revision id is required.");
  }
  if (!body.command || typeof body.command !== "object" || Array.isArray(body.command)) {
    throw new Error("Collaboration command is required.");
  }
  const command = body.command as Record<string, unknown>;
  switch (command.type) {
    case "note.patch":
      return { operationId: body.operationId, baseRevisionId: body.baseRevisionId, command: { type: command.type, patch: validateScoreNotePatch(command.patch) } };
    case "note.insert":
      return { operationId: body.operationId, baseRevisionId: body.baseRevisionId, command: { type: command.type, patch: validateScoreNoteInsertPatch(command.patch) } };
    case "event.delete":
      return { operationId: body.operationId, baseRevisionId: body.baseRevisionId, command: { type: command.type, patch: validateScoreEventDeletePatch(command.patch) } };
    case "events.batch":
      return { operationId: body.operationId, baseRevisionId: body.baseRevisionId, command: { type: command.type, patch: validateScoreEventBatchPatch(command.patch) } };
    case "event.reorder":
      return { operationId: body.operationId, baseRevisionId: body.baseRevisionId, command: { type: command.type, patch: validateScoreEventReorderPatch(command.patch) } };
    default:
      throw new Error("Collaboration command type is not supported.");
  }
}

export function applyCanonicalScoreCommand(score: ScoreJson, command: CanonicalScoreCommand) {
  switch (command.type) {
    case "note.patch":
      return applyScoreNotePatch({ score, patch: command.patch });
    case "note.insert":
      return applyScoreNoteInsertPatch({ score, patch: command.patch });
    case "event.delete":
      return applyScoreEventDeletePatch({ score, patch: command.patch });
    case "events.batch":
      return applyScoreEventBatchPatch({ score, patch: command.patch });
    case "event.reorder":
      return applyScoreEventReorderPatch({ score, patch: command.patch });
  }
}

export function canonicalScoreCommandLabel(command: CanonicalScoreCommand) {
  return command.type === "events.batch" ? `${command.type}.${command.patch.action}` : command.type;
}

export function canonicalScoreCommandScopes(score: ScoreJson, command: CanonicalScoreCommand) {
  const scopes = new Set<string>();
  const eventMeasure = new Map(score.measures.flatMap((measure) => measure.events.map((event) => [event.id, measure.id] as const)));
  const addEvent = (eventId: string | undefined) => {
    if (eventId) scopes.add(`event:${eventId}`);
  };
  const addMeasure = (measureId: string | undefined) => {
    if (measureId) scopes.add(`measure:${measureId}`);
  };

  switch (command.type) {
    case "note.patch":
    case "event.delete":
      addEvent(command.patch.eventId);
      break;
    case "note.insert":
      addMeasure(command.patch.measureId);
      addEvent(command.patch.afterEventId);
      addEvent(command.patch.beforeEventId);
      break;
    case "event.reorder":
      addEvent(command.patch.eventId);
      addMeasure(eventMeasure.get(command.patch.eventId));
      addMeasure(command.patch.targetMeasureId);
      break;
    case "events.batch":
      for (const eventId of command.patch.eventIds) {
        addEvent(eventId);
        if (command.patch.action === "move") addMeasure(eventMeasure.get(eventId));
      }
      if (command.patch.action !== "delete") addMeasure(command.patch.targetMeasureId);
      addEvent(command.patch.afterEventId);
      break;
  }

  return [...scopes].sort();
}

export function scoreCommandScopesOverlap(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return left.some((scope) => rightSet.has(scope));
}
