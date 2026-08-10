import { createHash, randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { Server } from "@hocuspocus/server";
import { Redis as RedisExtension, type Configuration as RedisConfiguration } from "@hocuspocus/extension-redis";
import * as Y from "yjs";
import { resolveCollaborationAccess } from "./access.js";

export function initCollaborationDb(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS score_collaboration_documents (
      document_id TEXT PRIMARY KEY,
      yjs_state BLOB NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES score_documents(id)
    );
    CREATE TABLE IF NOT EXISTS score_collaboration_updates (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      update_sha256 TEXT NOT NULL,
      update_size_bytes INTEGER NOT NULL,
      request_id TEXT,
      trace_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES score_documents(id)
    );
    CREATE TABLE IF NOT EXISTS score_collaboration_snapshots (
      document_id TEXT PRIMARY KEY,
      snapshot_version INTEGER NOT NULL,
      compaction_count INTEGER NOT NULL,
      source_operation_count INTEGER NOT NULL,
      retained_operation_count INTEGER NOT NULL,
      source_conflict_count INTEGER NOT NULL,
      retained_conflict_count INTEGER NOT NULL,
      current_revision_id TEXT,
      state_sha256 TEXT NOT NULL,
      state_size_bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES score_documents(id)
    );
    CREATE INDEX IF NOT EXISTS idx_score_collaboration_updates_document_created
      ON score_collaboration_updates(document_id, created_at);
  `);
  const columns = db.prepare("PRAGMA table_info(score_collaboration_updates)").all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === "request_id")) db.exec("ALTER TABLE score_collaboration_updates ADD COLUMN request_id TEXT;");
  if (!columns.some((column) => column.name === "trace_id")) db.exec("ALTER TABLE score_collaboration_updates ADD COLUMN trace_id TEXT;");
}

export function createCollaborationServer(db: DatabaseSync, options: { port?: number; address?: string; maxOperations?: number; maxConflicts?: number; redis?: Partial<RedisConfiguration> } = {}) {
  initCollaborationDb(db);
  const maxOperations = boundedRetention(options.maxOperations, 500);
  const maxConflicts = boundedRetention(options.maxConflicts, 500);
  return new Server({
    port: options.port ?? 4001,
    address: options.address ?? "0.0.0.0",
    extensions: options.redis ? [new RedisExtension(options.redis)] : [],
    async onAuthenticate({ documentName, token, connectionConfig }) {
      const access = resolveCollaborationAccess(db, documentName, String(token ?? ""));
      if (!access) throw new Error("Not authorized for this score collaboration document.");
      connectionConfig.readOnly = access.readOnly;
      return {
        scoreDocumentId: documentName,
        requestId: randomUUID(),
        traceId: randomUUID().replace(/-/gu, ""),
        ...access,
      };
    },
    async onLoadDocument({ documentName }) {
      const document = new Y.Doc();
      const row = db.prepare("SELECT yjs_state FROM score_collaboration_documents WHERE document_id = ?").get(documentName) as { yjs_state: Uint8Array } | undefined;
      if (row?.yjs_state) Y.applyUpdate(document, new Uint8Array(row.yjs_state));
      const revision = db.prepare("SELECT current_revision_id FROM score_documents WHERE id = ?").get(documentName) as { current_revision_id: string | null } | undefined;
      const metadata = document.getMap<unknown>("score-metadata");
      if (!metadata.has("currentRevisionId")) metadata.set("currentRevisionId", revision?.current_revision_id ?? null);
      return document;
    },
    async onChange({ documentName, document, update, context }) {
      db.prepare(`
        INSERT INTO score_collaboration_updates (
          id, document_id, actor_id, actor_role, update_sha256, update_size_bytes, request_id, trace_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(), documentName, String(context.actorId ?? "unknown"), String(context.role ?? "unknown"),
        createHash("sha256").update(update).digest("hex"), update.byteLength,
        typeof context.requestId === "string" ? context.requestId : null,
        typeof context.traceId === "string" ? context.traceId : null,
        new Date().toISOString(),
      );
      reconcileCollaborationConflicts(document);
    },
    async onStoreDocument({ documentName, document }) {
      const compacted = compactCollaborationDocument(document, { maxOperations, maxConflicts });
      const timestamp = new Date().toISOString();
      const stateSha256 = createHash("sha256").update(compacted.state).digest("hex");
      db.exec("BEGIN IMMEDIATE");
      try {
        db.prepare(`
          INSERT INTO score_collaboration_documents (document_id, yjs_state, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(document_id) DO UPDATE SET yjs_state = excluded.yjs_state, updated_at = excluded.updated_at
        `).run(documentName, compacted.state, timestamp);
        db.prepare(`
          INSERT INTO score_collaboration_snapshots (
            document_id, snapshot_version, compaction_count,
            source_operation_count, retained_operation_count,
            source_conflict_count, retained_conflict_count,
            current_revision_id, state_sha256, state_size_bytes, created_at, updated_at
          ) VALUES (?, 1, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(document_id) DO UPDATE SET
            snapshot_version = excluded.snapshot_version,
            compaction_count = score_collaboration_snapshots.compaction_count + 1,
            source_operation_count = excluded.source_operation_count,
            retained_operation_count = excluded.retained_operation_count,
            source_conflict_count = excluded.source_conflict_count,
            retained_conflict_count = excluded.retained_conflict_count,
            current_revision_id = excluded.current_revision_id,
            state_sha256 = excluded.state_sha256,
            state_size_bytes = excluded.state_size_bytes,
            updated_at = excluded.updated_at
        `).run(
          documentName,
          compacted.sourceOperationCount,
          compacted.retainedOperationCount,
          compacted.sourceConflictCount,
          compacted.retainedConflictCount,
          compacted.currentRevisionId,
          stateSha256,
          compacted.state.byteLength,
          timestamp,
          timestamp,
        );
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  });
}

export function reconcileCollaborationConflicts(document: Y.Doc) {
  const operations = document.getArray<Y.Map<unknown>>("score-operations").toArray().flatMap((value) => {
    if (!(value instanceof Y.Map)) return [];
    const id = value.get("id");
    const resultRevisionId = value.get("resultRevisionId");
    if (typeof id !== "string" || typeof resultRevisionId !== "string") return [];
    const targets = value.get("targetEventIds");
    return [{
      id,
      resultRevisionId,
      baseRevisionId: typeof value.get("baseRevisionId") === "string" ? String(value.get("baseRevisionId")) : null,
      targetEventIds: (targets instanceof Y.Array ? targets.toArray() : Array.isArray(targets) ? targets : []).filter((item): item is string => typeof item === "string"),
      createdAt: typeof value.get("createdAt") === "string" ? String(value.get("createdAt")) : new Date().toISOString(),
    }];
  });
  const conflicts = document.getArray<Y.Map<unknown>>("score-conflicts");
  const knownIds = new Set<string>();
  const duplicateIndexes: number[] = [];
  conflicts.toArray().forEach((value, index) => {
    if (!(value instanceof Y.Map) || typeof value.get("id") !== "string") return;
    const id = String(value.get("id"));
    if (knownIds.has(id)) duplicateIndexes.push(index);
    else knownIds.add(id);
  });
  const missing: Y.Map<unknown>[] = [];
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
      const conflict = new Y.Map<unknown>();
      conflict.set("id", id);
      conflict.set("operationId", right.id);
      conflict.set("conflictingOperationId", left.id);
      conflict.set("baseRevisionId", right.baseRevisionId);
      conflict.set("targetEventIds", overlap);
      conflict.set("createdAt", right.createdAt);
      missing.push(conflict);
    }
  }
  if (missing.length > 0 || duplicateIndexes.length > 0) {
    document.transact(() => {
      for (const index of duplicateIndexes.reverse()) conflicts.delete(index, 1);
      if (missing.length > 0) conflicts.push(missing);
    }, "server-conflict-reconciliation");
  }
  return missing.length;
}

export function compactCollaborationDocument(source: Y.Doc, options: { maxOperations: number; maxConflicts: number }) {
  const maxOperations = boundedRetention(options.maxOperations, 500);
  const maxConflicts = boundedRetention(options.maxConflicts, 500);
  const sourceOperationValues = source.getArray<unknown>("score-operations").toArray();
  const sourceOperations = sourceOperationValues.filter((operation): operation is Y.Map<unknown> => operation instanceof Y.Map);
  const retainedOperations = sourceOperations.slice(-maxOperations);
  const retainedOperationIds = new Set(
    retainedOperations.map((operation) => operation.get("id")).filter((id): id is string => typeof id === "string"),
  );
  const sourceConflictValues = source.getArray<unknown>("score-conflicts").toArray();
  const sourceConflicts = sourceConflictValues.filter((conflict): conflict is Y.Map<unknown> => conflict instanceof Y.Map);
  const retainedConflicts = sourceConflicts
    .filter((conflict) => {
      const operationId = conflict.get("operationId");
      const conflictingOperationId = conflict.get("conflictingOperationId");
      return typeof operationId === "string" && typeof conflictingOperationId === "string" && retainedOperationIds.has(operationId) && retainedOperationIds.has(conflictingOperationId);
    })
    .slice(-maxConflicts);
  const compacted = new Y.Doc();
  const sourceMetadata = source.getMap<unknown>("score-metadata");
  const metadata = compacted.getMap<unknown>("score-metadata");
  for (const [key, value] of sourceMetadata.entries()) metadata.set(key, cloneSharedValue(value));
  metadata.set("snapshotVersion", 1);
  metadata.set("sourceOperationCount", sourceOperationValues.length);
  metadata.set("retainedOperationCount", retainedOperations.length);
  metadata.set("sourceConflictCount", sourceConflictValues.length);
  metadata.set("retainedConflictCount", retainedConflicts.length);
  const note = source.getText("rehearsal-note").toString();
  if (note) compacted.getText("rehearsal-note").insert(0, note);
  compacted.getArray<Y.Map<unknown>>("score-operations").insert(0, retainedOperations.map((operation) => cloneSharedValue(operation) as Y.Map<unknown>));
  compacted.getArray<Y.Map<unknown>>("score-conflicts").insert(0, retainedConflicts.map((conflict) => cloneSharedValue(conflict) as Y.Map<unknown>));
  const state = Y.encodeStateAsUpdate(compacted);
  const currentRevisionId = metadata.get("currentRevisionId");
  compacted.destroy();
  return {
    state,
    sourceOperationCount: sourceOperationValues.length,
    retainedOperationCount: retainedOperations.length,
    sourceConflictCount: sourceConflictValues.length,
    retainedConflictCount: retainedConflicts.length,
    currentRevisionId: typeof currentRevisionId === "string" ? currentRevisionId : null,
  };
}

function boundedRetention(value: number | undefined, fallback: number) {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(5_000, Math.round(value)));
}

function cloneSharedValue(value: unknown): unknown {
  if (value instanceof Y.Map) {
    const clone = new Y.Map<unknown>();
    for (const [key, child] of value.entries()) clone.set(key, cloneSharedValue(child));
    return clone;
  }
  if (value instanceof Y.Array) {
    const clone = new Y.Array<unknown>();
    clone.insert(0, value.toArray().map(cloneSharedValue));
    return clone;
  }
  if (value instanceof Uint8Array) return new Uint8Array(value);
  if (Array.isArray(value)) return value.map(cloneSharedValue);
  if (value && typeof value === "object") return structuredClone(value);
  return value;
}
