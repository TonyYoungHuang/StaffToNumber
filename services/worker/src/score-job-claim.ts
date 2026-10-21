import type { RuntimeDatabaseLike } from "@score/runtime-database";
import { claimWithLifetimeLimit } from "@score/runtime-database";
import type { ScoreJobType } from "@score/shared";
import { recognitionLaneFromParams, type RecognitionLane } from "./recognition-lane.js";

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

export function claimNextScoreJob(db: RuntimeDatabaseLike, timestamp: string): ClaimedScoreJob | undefined {
  return claimWithLifetimeLimit(db, "score", undefined, (jobId) => db.prepare(
    `
      UPDATE score_jobs
      SET status = 'processing',
          started_at = ?,
          updated_at = ?,
          completed_at = NULL,
          progress_percent = 1,
          attempt_count = attempt_count + 1
      WHERE id = ?
        AND status = 'queued'
      RETURNING id, user_id, document_id, input_file_id, job_type, params_json, request_id, trace_id
    `,
  ).get(timestamp, timestamp, jobId) as ClaimedScoreJob | undefined);
}
export function claimScoreJobById(db: RuntimeDatabaseLike, input: { timestamp: string; jobId: string; brokerJobId: string; lane?: RecognitionLane; lanesEnabled?: boolean }) {
  if (input.lane) {
    const source = db.prepare("SELECT job_type, params_json FROM score_jobs WHERE id = ?").get(input.jobId) as { job_type: string; params_json: string | null } | undefined;
    const lane = source?.job_type === "omr_import" ? recognitionLaneFromParams(source.params_json, input.lanesEnabled) : "normal";
    if (input.lane !== lane) throw new Error("Broker recognition lane does not match the stored admission snapshot.");
  }
  return claimWithLifetimeLimit(db, "score", input.jobId, () => db.prepare(`
    UPDATE score_jobs
    SET status = 'processing',
        started_at = CASE WHEN status = 'queued' THEN ? ELSE started_at END,
        updated_at = ?,
        completed_at = NULL,
        progress_percent = CASE WHEN progress_percent < 1 THEN 1 ELSE progress_percent END,
        attempt_count = CASE WHEN status = 'queued' THEN attempt_count + 1 ELSE attempt_count END,
        broker_job_id = ?
    WHERE id = ?
      AND status = 'queued'
    RETURNING id, user_id, document_id, input_file_id, job_type, params_json, request_id, trace_id
  `).get(input.timestamp, input.timestamp, input.brokerJobId, input.jobId) as ClaimedScoreJob | undefined);
}
