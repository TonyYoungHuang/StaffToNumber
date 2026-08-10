import * as Y from "yjs";

export type ScoreCollaborationRole = "owner" | "editor" | "commenter" | "viewer";

export type ScoreCollaborationOperation = {
  id: string;
  actorId: string;
  actorName: string;
  role: ScoreCollaborationRole;
  commandType: string;
  baseRevisionId: string | null;
  resultRevisionId: string;
  targetEventIds: string[];
  createdAt: string;
};

export type ScoreCollaborationConflict = {
  id: string;
  operationId: string;
  conflictingOperationId: string;
  baseRevisionId: string | null;
  targetEventIds: string[];
  createdAt: string;
};

export function scoreCollaborationTypes(document: Y.Doc) {
  return {
    metadata: document.getMap<unknown>("score-metadata"),
    operations: document.getArray<Y.Map<unknown>>("score-operations"),
    conflicts: document.getArray<Y.Map<unknown>>("score-conflicts"),
  };
}

function stringArray(value: unknown) {
  if (value instanceof Y.Array) return value.toArray().filter((item): item is string => typeof item === "string");
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readOperation(value: Y.Map<unknown>): ScoreCollaborationOperation | null {
  const id = value.get("id");
  const resultRevisionId = value.get("resultRevisionId");
  if (typeof id !== "string" || typeof resultRevisionId !== "string") return null;
  const role = value.get("role");
  return {
    id,
    actorId: typeof value.get("actorId") === "string" ? String(value.get("actorId")) : "unknown",
    actorName: typeof value.get("actorName") === "string" ? String(value.get("actorName")) : "Collaborator",
    role: role === "owner" || role === "editor" || role === "commenter" || role === "viewer" ? role : "viewer",
    commandType: typeof value.get("commandType") === "string" ? String(value.get("commandType")) : "unknown",
    baseRevisionId: typeof value.get("baseRevisionId") === "string" ? String(value.get("baseRevisionId")) : null,
    resultRevisionId,
    targetEventIds: stringArray(value.get("targetEventIds")),
    createdAt: typeof value.get("createdAt") === "string" ? String(value.get("createdAt")) : new Date(0).toISOString(),
  };
}

export function listScoreCollaborationOperations(document: Y.Doc) {
  return scoreCollaborationTypes(document).operations.toArray().map(readOperation).filter((item): item is ScoreCollaborationOperation => Boolean(item));
}

export function currentScoreCollaborationOperation(document: Y.Doc) {
  const currentRevisionId = scoreCollaborationTypes(document).metadata.get("currentRevisionId");
  if (typeof currentRevisionId !== "string") return null;
  return listScoreCollaborationOperations(document).findLast((operation) => operation.resultRevisionId === currentRevisionId) ?? null;
}

export function listScoreCollaborationConflicts(document: Y.Doc): ScoreCollaborationConflict[] {
  return scoreCollaborationTypes(document).conflicts.toArray().flatMap((value) => {
    const id = value.get("id");
    const operationId = value.get("operationId");
    const conflictingOperationId = value.get("conflictingOperationId");
    if (typeof id !== "string" || typeof operationId !== "string" || typeof conflictingOperationId !== "string") return [];
    return [{
      id,
      operationId,
      conflictingOperationId,
      baseRevisionId: typeof value.get("baseRevisionId") === "string" ? String(value.get("baseRevisionId")) : null,
      targetEventIds: stringArray(value.get("targetEventIds")),
      createdAt: typeof value.get("createdAt") === "string" ? String(value.get("createdAt")) : new Date(0).toISOString(),
    }];
  });
}

function operationMap(operation: ScoreCollaborationOperation) {
  const value = new Y.Map<unknown>();
  const targetEventIds = new Y.Array<string>();
  targetEventIds.insert(0, [...new Set(operation.targetEventIds)].sort());
  value.set("id", operation.id);
  value.set("actorId", operation.actorId);
  value.set("actorName", operation.actorName);
  value.set("role", operation.role);
  value.set("commandType", operation.commandType);
  value.set("baseRevisionId", operation.baseRevisionId);
  value.set("resultRevisionId", operation.resultRevisionId);
  value.set("targetEventIds", targetEventIds);
  value.set("createdAt", operation.createdAt);
  return value;
}

function conflictMap(conflict: ScoreCollaborationConflict) {
  const value = new Y.Map<unknown>();
  const targets = new Y.Array<string>();
  targets.insert(0, conflict.targetEventIds);
  value.set("id", conflict.id);
  value.set("operationId", conflict.operationId);
  value.set("conflictingOperationId", conflict.conflictingOperationId);
  value.set("baseRevisionId", conflict.baseRevisionId);
  value.set("targetEventIds", targets);
  value.set("createdAt", conflict.createdAt);
  return value;
}

export function reconcileScoreCollaborationConflicts(document: Y.Doc) {
  const { conflicts } = scoreCollaborationTypes(document);
  const operations = listScoreCollaborationOperations(document);
  const knownIds = new Set(listScoreCollaborationConflicts(document).map((item) => item.id));
  const missing: ScoreCollaborationConflict[] = [];
  for (let leftIndex = 0; leftIndex < operations.length; leftIndex += 1) {
    const left = operations[leftIndex];
    const leftTargets = new Set(left.targetEventIds);
    for (let rightIndex = leftIndex + 1; rightIndex < operations.length; rightIndex += 1) {
      const right = operations[rightIndex];
      if (left.baseRevisionId !== right.baseRevisionId || left.resultRevisionId === right.resultRevisionId) continue;
      const overlap = right.targetEventIds.filter((eventId) => leftTargets.has(eventId)).sort();
      if (overlap.length === 0) continue;
      const operationIds = [left.id, right.id].sort();
      const id = `${operationIds[0]}:${operationIds[1]}`;
      if (knownIds.has(id)) continue;
      knownIds.add(id);
      missing.push({
        id,
        operationId: right.id,
        conflictingOperationId: left.id,
        baseRevisionId: right.baseRevisionId,
        targetEventIds: overlap,
        createdAt: right.createdAt,
      });
    }
  }
  if (missing.length > 0) document.transact(() => conflicts.push(missing.map(conflictMap)), "conflict-reconciliation");
  return missing;
}

export function appendScoreCollaborationOperation(document: Y.Doc, operation: ScoreCollaborationOperation) {
  const types = scoreCollaborationTypes(document);
  const existing = listScoreCollaborationOperations(document);
  if (existing.some((item) => item.id === operation.id)) return { inserted: false, conflicts: [] as ScoreCollaborationConflict[] };
  const targets = new Set(operation.targetEventIds);
  const conflicts = existing.flatMap<ScoreCollaborationConflict>((item) => {
    if (item.baseRevisionId !== operation.baseRevisionId || item.resultRevisionId === operation.resultRevisionId) return [];
    const overlap = item.targetEventIds.filter((eventId) => targets.has(eventId));
    if (overlap.length === 0) return [];
    const operationIds = [item.id, operation.id].sort();
    return [{
      id: `${operationIds[0]}:${operationIds[1]}`,
      operationId: operation.id,
      conflictingOperationId: item.id,
      baseRevisionId: operation.baseRevisionId,
      targetEventIds: overlap.sort(),
      createdAt: operation.createdAt,
    }];
  });
  const knownConflictIds = new Set(listScoreCollaborationConflicts(document).map((item) => item.id));
  document.transact(() => {
    types.operations.push([operationMap(operation)]);
    for (const conflict of conflicts) if (!knownConflictIds.has(conflict.id)) types.conflicts.push([conflictMap(conflict)]);
    types.metadata.set("currentRevisionId", operation.resultRevisionId);
    types.metadata.set("updatedAt", operation.createdAt);
  }, "score-operation");
  reconcileScoreCollaborationConflicts(document);
  return { inserted: true, conflicts };
}
