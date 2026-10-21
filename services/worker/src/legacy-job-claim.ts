import type { RuntimeDatabaseLike } from "@score/runtime-database";
import { claimWithLifetimeLimit } from "@score/runtime-database";

export type ClaimedLegacyJob = {
  id: string;
  user_id: string;
  input_file_id: string;
  direction: string;
  request_id: string | null;
  trace_id: string | null;
};

export function claimNextLegacyJob(db: RuntimeDatabaseLike, timestamp: string) {
  return claimWithLifetimeLimit(db, "legacy", undefined, (jobId) => db.prepare(`
    UPDATE jobs
    SET status = 'processing', started_at = ?, updated_at = ?
    WHERE id = ? AND status = 'queued'
    RETURNING id, user_id, input_file_id, direction, request_id, trace_id
  `).get(timestamp, timestamp, jobId) as ClaimedLegacyJob | undefined);
}
export function claimLegacyJobById(db: RuntimeDatabaseLike, input: { timestamp: string; jobId: string; brokerJobId: string }) {
  return claimWithLifetimeLimit(db, "legacy", input.jobId, () => db.prepare(`
    UPDATE jobs
    SET status = 'processing',
        started_at = CASE WHEN status = 'queued' THEN ? ELSE started_at END,
        updated_at = ?,
        broker_job_id = ?
    WHERE id = ?
      AND (status = 'queued' OR (status = 'processing' AND broker_job_id = ?))
    RETURNING id, user_id, input_file_id, direction, request_id, trace_id
  `).get(input.timestamp, input.timestamp, input.brokerJobId, input.jobId, input.brokerJobId) as ClaimedLegacyJob | undefined);
}
