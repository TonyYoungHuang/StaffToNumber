import type { DatabaseSync } from "node:sqlite";
import type { ScoreJobType } from "@score/shared";

export type ClaimedScoreJob = {
  id: string;
  user_id: string;
  document_id: string | null;
  input_file_id: string | null;
  job_type: ScoreJobType;
  params_json: string | null;
  request_id: string | null;
  trace_id: string | null;
};

export function claimNextScoreJob(db: DatabaseSync, timestamp: string): ClaimedScoreJob | undefined {
  return db.prepare(
    `
      UPDATE score_jobs
      SET status = 'processing',
          started_at = ?,
          updated_at = ?,
          completed_at = NULL,
          progress_percent = 1,
          attempt_count = attempt_count + 1
      WHERE id = (
        SELECT id
        FROM score_jobs
        WHERE status = 'queued'
        ORDER BY datetime(created_at) ASC, id ASC
        LIMIT 1
      )
        AND status = 'queued'
      RETURNING id, user_id, document_id, input_file_id, job_type, params_json, request_id, trace_id
    `,
  ).get(timestamp, timestamp) as ClaimedScoreJob | undefined;
}

export function claimScoreJobById(db: DatabaseSync, input: { timestamp: string; jobId: string; brokerJobId: string }) {
  return db.prepare(`
    UPDATE score_jobs
    SET status = 'processing',
        started_at = CASE WHEN status = 'queued' THEN ? ELSE started_at END,
        updated_at = ?,
        completed_at = NULL,
        progress_percent = CASE WHEN progress_percent < 1 THEN 1 ELSE progress_percent END,
        attempt_count = CASE WHEN status = 'queued' THEN attempt_count + 1 ELSE attempt_count END,
        broker_job_id = ?
    WHERE id = ?
      AND (status = 'queued' OR (status = 'processing' AND broker_job_id = ?))
    RETURNING id, user_id, document_id, input_file_id, job_type, params_json, request_id, trace_id
  `).get(input.timestamp, input.timestamp, input.brokerJobId, input.jobId, input.brokerJobId) as ClaimedScoreJob | undefined;
}
