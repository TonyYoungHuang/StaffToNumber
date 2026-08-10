import type { ScoreEvent, ScoreJson } from "@score/shared";

export type ScoreCollaborationHistoryAction = "undo" | "redo";

export type ScoreCollaborationHistoryRequest = {
  operationId: string;
  baseRevisionId: string;
  action: ScoreCollaborationHistoryAction;
  targetOperationId: string;
};

export type ScoreCollaborationHistoryCommand = {
  type: `history.${ScoreCollaborationHistoryAction}`;
  targetOperationId: string;
  affectedEventIds: string[];
};

const OPERATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:._-]{7,127}$/u;

type EventLocation = {
  event: ScoreEvent;
  measureId: string;
  index: number;
};

export class ScoreHistoryConflictError extends Error {
  constructor(public readonly affectedEventIds: string[]) {
    super("The target score events changed after the operation being reversed.");
  }
}

export function validateScoreCollaborationHistoryRequest(input: unknown): ScoreCollaborationHistoryRequest {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Collaboration history payload must be an object.");
  }
  const body = input as Record<string, unknown>;
  if (typeof body.operationId !== "string" || !OPERATION_ID_PATTERN.test(body.operationId)) {
    throw new Error("Operation id must contain 8-128 safe identifier characters.");
  }
  if (typeof body.baseRevisionId !== "string" || body.baseRevisionId.length < 1 || body.baseRevisionId.length > 128) {
    throw new Error("Base revision id is required.");
  }
  if (body.action !== "undo" && body.action !== "redo") {
    throw new Error("History action must be undo or redo.");
  }
  if (typeof body.targetOperationId !== "string" || !OPERATION_ID_PATTERN.test(body.targetOperationId)) {
    throw new Error("Target operation id must contain 8-128 safe identifier characters.");
  }
  if (body.operationId === body.targetOperationId) {
    throw new Error("A history operation cannot target itself.");
  }
  return {
    operationId: body.operationId,
    baseRevisionId: body.baseRevisionId,
    action: body.action,
    targetOperationId: body.targetOperationId,
  };
}

export function affectedEventIdsForHistory(input: {
  before: ScoreJson;
  after: ScoreJson;
  commandJson: unknown;
}) {
  const beforeEvents = eventLocations(input.before);
  const afterEvents = eventLocations(input.after);
  const affected = new Set<string>();
  for (const eventId of new Set([...beforeEvents.keys(), ...afterEvents.keys()])) {
    const before = beforeEvents.get(eventId);
    const after = afterEvents.get(eventId);
    if (!before || !after || before.measureId !== after.measureId || !deepEqual(before.event, after.event)) affected.add(eventId);
  }
  for (const eventId of commandEventIds(input.commandJson)) affected.add(eventId);
  return [...affected].sort();
}

export function selectivelyReverseScoreOperation(input: {
  before: ScoreJson;
  after: ScoreJson;
  current: ScoreJson;
  affectedEventIds: string[];
  action: ScoreCollaborationHistoryAction;
  targetOperationId: string;
  generatedAt?: string;
}) {
  const affected = new Set(input.affectedEventIds);
  const beforeEvents = eventLocations(input.before);
  const afterEvents = eventLocations(input.after);
  const currentEvents = eventLocations(input.current);
  const conflicts: string[] = [];

  for (const eventId of affected) {
    const expected = afterEvents.get(eventId);
    const current = currentEvents.get(eventId);
    if (!expected) {
      if (current) conflicts.push(eventId);
      continue;
    }
    if (!current || current.measureId !== expected.measureId || !deepEqual(current.event, expected.event)) {
      conflicts.push(eventId);
      continue;
    }
    if (!sameRelativePosition(eventId, expected.measureId, input.after, input.current, affected)) conflicts.push(eventId);
  }
  if (conflicts.length > 0) throw new ScoreHistoryConflictError([...new Set(conflicts)].sort());

  const score = structuredClone(input.current);
  for (const measure of score.measures) {
    measure.events = measure.events.filter((event) => !affected.has(event.id));
  }

  for (const beforeMeasure of input.before.measures) {
    const targetMeasure = score.measures.find((measure) => measure.id === beforeMeasure.id);
    if (!targetMeasure) throw new ScoreHistoryConflictError(input.affectedEventIds);
    for (const beforeEvent of beforeMeasure.events) {
      if (!affected.has(beforeEvent.id)) continue;
      const beforeIndex = beforeMeasure.events.findIndex((event) => event.id === beforeEvent.id);
      const precedingIds = beforeMeasure.events.slice(0, beforeIndex).map((event) => event.id).reverse();
      const followingIds = beforeMeasure.events.slice(beforeIndex + 1).map((event) => event.id);
      const precedingIndex = precedingIds.map((id) => targetMeasure.events.findIndex((event) => event.id === id)).find((index) => index >= 0);
      const followingIndex = followingIds.map((id) => targetMeasure.events.findIndex((event) => event.id === id)).find((index) => index >= 0);
      const insertIndex = precedingIndex !== undefined ? precedingIndex + 1 : followingIndex ?? targetMeasure.events.length;
      targetMeasure.events.splice(insertIndex, 0, structuredClone(beforeEvent));
    }
  }

  score.metadata.noteCount = score.measures.reduce((count, measure) => count + measure.events.filter((event) => event.type === "note").length, 0);
  score.metadata.restCount = score.measures.reduce((count, measure) => count + measure.events.filter((event) => event.type === "rest").length, 0);
  score.metadata.warnings = [
    ...score.metadata.warnings,
    `Collaboration ${input.action} applied to ${input.targetOperationId} at ${input.generatedAt ?? new Date().toISOString()}.`,
  ];
  return score;
}

function eventLocations(score: ScoreJson) {
  const locations = new Map<string, EventLocation>();
  for (const measure of score.measures) {
    for (const [index, event] of measure.events.entries()) locations.set(event.id, { event, measureId: measure.id, index });
  }
  return locations;
}

function commandEventIds(commandJson: unknown) {
  if (!commandJson || typeof commandJson !== "object" || Array.isArray(commandJson)) return [];
  const command = commandJson as Record<string, unknown>;
  if (Array.isArray(command.affectedEventIds)) return command.affectedEventIds.filter((id): id is string => typeof id === "string");
  const patch = command.patch && typeof command.patch === "object" && !Array.isArray(command.patch)
    ? command.patch as Record<string, unknown>
    : {};
  return [
    ...(typeof patch.eventId === "string" ? [patch.eventId] : []),
    ...(Array.isArray(patch.eventIds) ? patch.eventIds.filter((id): id is string => typeof id === "string") : []),
  ];
}

function sameRelativePosition(eventId: string, measureId: string, expectedScore: ScoreJson, currentScore: ScoreJson, affected: Set<string>) {
  const expectedMeasure = expectedScore.measures.find((measure) => measure.id === measureId);
  const currentMeasure = currentScore.measures.find((measure) => measure.id === measureId);
  if (!expectedMeasure || !currentMeasure) return false;
  const expectedIndex = expectedMeasure.events.findIndex((event) => event.id === eventId);
  const currentIndex = currentMeasure.events.findIndex((event) => event.id === eventId);
  if (expectedIndex < 0 || currentIndex < 0) return false;
  const stableIds = new Set(expectedMeasure.events.filter((event) => !affected.has(event.id)).map((event) => event.id));
  const expectedBefore = expectedMeasure.events.slice(0, expectedIndex).filter((event) => stableIds.has(event.id)).at(-1)?.id ?? null;
  const expectedAfter = expectedMeasure.events.slice(expectedIndex + 1).find((event) => stableIds.has(event.id))?.id ?? null;
  const currentBefore = currentMeasure.events.slice(0, currentIndex).filter((event) => stableIds.has(event.id)).at(-1)?.id ?? null;
  const currentAfter = currentMeasure.events.slice(currentIndex + 1).find((event) => stableIds.has(event.id))?.id ?? null;
  return expectedBefore === currentBefore && expectedAfter === currentAfter;
}

function deepEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}
