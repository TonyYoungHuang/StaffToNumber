import type { DatabaseSync } from "node:sqlite";

export type ClaimedLegacyJob = {
  id: string;
  user_id: string;
  input_file_id: string;
  direction: string;
  request_id: string | null;
  trace_id: string | null;
};

export function claimNextLegacyJob(db: DatabaseSync, timestamp: string) {
  return db.prepare(`
    UPDATE jobs
    SET status = 'processing', started_at = ?, updated_at = ?
    WHERE id = (
      SELECT id FROM jobs
      WHERE status = 'queued'
      ORDER BY datetime(created_at) ASC, id ASC
      LIMIT 1
    ) AND status = 'queued'
    RETURNING id, user_id, input_file_id, direction, request_id, trace_id
  `).get(timestamp, timestamp) as ClaimedLegacyJob | undefined;
}

export function claimLegacyJobById(db: DatabaseSync, input: { timestamp: string; jobId: string; brokerJobId: string }) {
  return db.prepare(`
    UPDATE jobs
    SET status = 'processing',
        started_at = CASE WHEN status = 'queued' THEN ? ELSE started_at END,
        updated_at = ?,
        broker_job_id = ?
    WHERE id = ?
      AND (status = 'queued' OR (status = 'processing' AND broker_job_id = ?))
    RETURNING id, user_id, input_file_id, direction, request_id, trace_id
  `).get(input.timestamp, input.timestamp, input.brokerJobId, input.jobId, input.brokerJobId) as ClaimedLegacyJob | undefined;
}
