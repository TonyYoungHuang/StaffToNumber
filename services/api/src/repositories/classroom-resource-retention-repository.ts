import type { RuntimeDatabaseLike } from "@score/runtime-database";

type PolicyRow = {
  classroom_id: string;
  enabled: number;
  historical_version_days: number;
  minimum_versions_per_group: number;
  updated_at: string;
};

type CandidateRow = {
  id: string;
  file_id: string;
  version_group_id: string;
  version_number: number;
  archived_at: string;
  size_bytes: number;
  retained_rank: number;
};

export function getClassroomResourceRetentionPolicy(db: RuntimeDatabaseLike, classroomId: string) {
  const row = db.prepare(`
    SELECT classroom_id, enabled, historical_version_days, minimum_versions_per_group, updated_at
    FROM score_classroom_resource_retention_policies WHERE classroom_id = ?
  `).get(classroomId) as PolicyRow | undefined;
  return {
    classroomId,
    enabled: row?.enabled === 1,
    historicalVersionDays: row?.historical_version_days ?? 365,
    minimumVersionsPerGroup: row?.minimum_versions_per_group ?? 3,
    updatedAt: row?.updated_at ?? null,
  };
}
export function updateClassroomResourceRetentionPolicy(db: RuntimeDatabaseLike, input: {
  classroomId: string;
  userId: string;
  enabled: boolean;
  historicalVersionDays: number;
  minimumVersionsPerGroup: number;
}) {
  if (!Number.isSafeInteger(input.historicalVersionDays) || input.historicalVersionDays < 30 || input.historicalVersionDays > 3650) {
    throw new Error("Historical version retention must be between 30 and 3650 days.");
  }
  if (!Number.isSafeInteger(input.minimumVersionsPerGroup) || input.minimumVersionsPerGroup < 1 || input.minimumVersionsPerGroup > 20) {
    throw new Error("Minimum versions per group must be between 1 and 20.");
  }
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO score_classroom_resource_retention_policies (
      classroom_id, enabled, historical_version_days, minimum_versions_per_group,
      updated_by_user_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(classroom_id) DO UPDATE SET
      enabled = excluded.enabled,
      historical_version_days = excluded.historical_version_days,
      minimum_versions_per_group = excluded.minimum_versions_per_group,
      updated_by_user_id = excluded.updated_by_user_id,
      updated_at = excluded.updated_at
  `).run(
    input.classroomId, input.enabled ? 1 : 0, input.historicalVersionDays,
    input.minimumVersionsPerGroup, input.userId, now, now,
  );
  return getClassroomResourceRetentionPolicy(db, input.classroomId);
}

export function listClassroomResourceRetentionCandidates(db: RuntimeDatabaseLike, input: {
  classroomId: string;
  historicalVersionDays: number;
  minimumVersionsPerGroup: number;
  now?: Date;
}) {
  const cutoff = new Date((input.now ?? new Date()).getTime() - input.historicalVersionDays * 24 * 60 * 60 * 1000).toISOString();
  const rows = db.prepare(`
    WITH historical AS (
      SELECT resources.id, resources.file_id, resources.version_group_id, resources.version_number,
             resources.archived_at, files.size_bytes,
             row_number() OVER (PARTITION BY resources.version_group_id ORDER BY resources.version_number DESC) AS retained_rank
      FROM score_classroom_resources resources
      JOIN files ON files.id = resources.file_id
      WHERE resources.classroom_id = ? AND resources.source_type = 'file'
        AND resources.archived_at IS NOT NULL AND resources.content_purged_at IS NULL
        AND resources.retention_hold = 0
    )
    SELECT id, file_id, version_group_id, version_number, archived_at, size_bytes, retained_rank
    FROM historical
    WHERE retained_rank > ? AND datetime(archived_at) < datetime(?)
    ORDER BY datetime(archived_at), version_group_id, version_number
  `).all(input.classroomId, input.minimumVersionsPerGroup, cutoff) as CandidateRow[];
  return {
    cutoff,
    versions: rows.map((row) => ({
      id: row.id,
      fileId: row.file_id,
      versionGroupId: row.version_group_id,
      versionNumber: row.version_number,
      archivedAt: row.archived_at,
      sizeBytes: row.size_bytes,
    })),
    totalBytes: rows.reduce((total, row) => total + row.size_bytes, 0),
  };
}

export function purgeClassroomResourceRetentionCandidates(db: RuntimeDatabaseLike, input: {
  classroomId: string;
  historicalVersionDays: number;
  minimumVersionsPerGroup: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const preview = listClassroomResourceRetentionCandidates(db, { ...input, now });
  if (preview.versions.length === 0) return { ...preview, purged: 0 };
  db.exec("BEGIN IMMEDIATE");
  try {
    const update = db.prepare(`
      UPDATE score_classroom_resources
      SET file_id = NULL, content_purged_at = ?, updated_at = ?
      WHERE id = ? AND classroom_id = ? AND archived_at IS NOT NULL
        AND content_purged_at IS NULL AND retention_hold = 0
    `);
    let purged = 0;
    for (const version of preview.versions) {
      purged += Number(update.run(now.toISOString(), now.toISOString(), version.id, input.classroomId).changes);
    }
    db.exec("COMMIT");
    return { ...preview, purged };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function pruneEnabledClassroomResourceRetentionPolicies(db: RuntimeDatabaseLike, now = new Date()) {
  const policies = db.prepare(`
    SELECT classroom_id, historical_version_days, minimum_versions_per_group
    FROM score_classroom_resource_retention_policies WHERE enabled = 1
  `).all() as Array<{ classroom_id: string; historical_version_days: number; minimum_versions_per_group: number }>;
  let purged = 0;
  let totalBytes = 0;
  for (const policy of policies) {
    const result = purgeClassroomResourceRetentionCandidates(db, {
      classroomId: policy.classroom_id,
      historicalVersionDays: policy.historical_version_days,
      minimumVersionsPerGroup: policy.minimum_versions_per_group,
      now,
    });
    purged += result.purged;
    totalBytes += result.totalBytes;
  }
  return { classroomsProcessed: policies.length, purged, totalBytes };
}

export function setClassroomResourceRetentionHold(db: RuntimeDatabaseLike, input: {
  classroomId: string;
  resourceId: string;
  retentionHold: boolean;
}) {
  const now = new Date().toISOString();
  const result = db.prepare(`
    UPDATE score_classroom_resources SET retention_hold = ?, updated_at = ?
    WHERE id = ? AND classroom_id = ? AND archived_at IS NOT NULL AND content_purged_at IS NULL
  `).run(input.retentionHold ? 1 : 0, now, input.resourceId, input.classroomId);
  return Number(result.changes) === 1;
}
