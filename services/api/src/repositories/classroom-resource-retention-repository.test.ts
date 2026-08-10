import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import {
  getClassroomResourceRetentionPolicy,
  listClassroomResourceRetentionCandidates,
  purgeClassroomResourceRetentionCandidates,
  setClassroomResourceRetentionHold,
  updateClassroomResourceRetentionPolicy,
} from "./classroom-resource-retention-repository.js";

function createDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE files (id TEXT PRIMARY KEY, size_bytes INTEGER NOT NULL);
    CREATE TABLE score_classroom_resource_retention_policies (classroom_id TEXT PRIMARY KEY, enabled INTEGER NOT NULL, historical_version_days INTEGER NOT NULL, minimum_versions_per_group INTEGER NOT NULL, updated_by_user_id TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE score_classroom_resources (id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL, file_id TEXT, source_type TEXT NOT NULL, version_group_id TEXT NOT NULL, version_number INTEGER NOT NULL, archived_at TEXT, retention_hold INTEGER NOT NULL DEFAULT 0, content_purged_at TEXT, updated_at TEXT NOT NULL);
  `);
  for (let version = 1; version <= 5; version += 1) {
    db.prepare("INSERT INTO files VALUES (?, ?)").run(`file-${version}`, version * 100);
    db.prepare("INSERT INTO score_classroom_resources VALUES (?, 'class-1', ?, 'file', 'group-1', ?, ?, 0, NULL, ?)")
      .run(`version-${version}`, `file-${version}`, version, version === 5 ? null : "2025-01-01T00:00:00.000Z", "2025-01-01T00:00:00.000Z");
  }
  return db;
}

test("retention preserves current and newest historical versions while honoring holds", () => {
  const db = createDb();
  assert.deepEqual(getClassroomResourceRetentionPolicy(db, "class-1"), {
    classroomId: "class-1", enabled: false, historicalVersionDays: 365, minimumVersionsPerGroup: 3, updatedAt: null,
  });
  const policy = updateClassroomResourceRetentionPolicy(db, {
    classroomId: "class-1", userId: "teacher", enabled: true, historicalVersionDays: 365, minimumVersionsPerGroup: 2,
  });
  assert.equal(policy.enabled, true);
  assert.equal(setClassroomResourceRetentionHold(db, { classroomId: "class-1", resourceId: "version-1", retentionHold: true }), true);
  const preview = listClassroomResourceRetentionCandidates(db, {
    classroomId: "class-1", historicalVersionDays: 365, minimumVersionsPerGroup: 2, now: new Date("2026-07-16T00:00:00.000Z"),
  });
  assert.deepEqual(preview.versions.map((item) => item.versionNumber), [2]);
  const result = purgeClassroomResourceRetentionCandidates(db, {
    classroomId: "class-1", historicalVersionDays: 365, minimumVersionsPerGroup: 2, now: new Date("2026-07-16T00:00:00.000Z"),
  });
  assert.equal(result.purged, 1);
  const rows = db.prepare("SELECT id, file_id, content_purged_at FROM score_classroom_resources ORDER BY version_number").all() as Array<{ id: string; file_id: string | null; content_purged_at: string | null }>;
  assert.equal(rows[0].file_id, "file-1");
  assert.equal(rows[1].file_id, null);
  assert.ok(rows[1].content_purged_at);
  assert.equal(rows[4].file_id, "file-5");
  assert.equal((db.prepare("SELECT count(*) AS count FROM files").get() as { count: number }).count, 5);
});

test("retention policy rejects unsafe ranges", () => {
  const db = createDb();
  assert.throws(() => updateClassroomResourceRetentionPolicy(db, { classroomId: "class-1", userId: "teacher", enabled: true, historicalVersionDays: 1, minimumVersionsPerGroup: 2 }), /between 30 and 3650/u);
  assert.throws(() => updateClassroomResourceRetentionPolicy(db, { classroomId: "class-1", userId: "teacher", enabled: true, historicalVersionDays: 365, minimumVersionsPerGroup: 0 }), /between 1 and 20/u);
});
