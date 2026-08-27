import type { RuntimeDatabaseLike } from "@score/runtime-database";
import type { JobBrokerPayload } from "@score/shared";

export type RecoveredBrokerJob = {
  family: "legacy" | "score";
  jobId: string;
  brokerJobId: string;
  jobType: string | null;
  documentId: string | null;
};

type ProcessingBrokerJob = {
  family: "legacy" | "score";
  jobId: string;
  brokerJobId: string;
};

const TERMINAL_BROKER_STATES = new Set(["completed", "failed", "unknown"]);

export function markInterruptedBrokerJobFailed(input: {
  db: RuntimeDatabaseLike;
  payload: JobBrokerPayload;
  brokerJobId: string;
  timestamp: string;
  message: string;
}): RecoveredBrokerJob | null {
  if (
    input.payload.dispatchId !== input.brokerJobId
    || input.payload.jobId === ""
    || !["legacy", "score"].includes(input.payload.family)
  ) return null;
  if (input.payload.family === "score") {
    const recovered = input.db.prepare(`
      UPDATE score_jobs
      SET status = 'failed', error_message = ?, progress_percent = 0,
          updated_at = ?, completed_at = ?
      WHERE id = ? AND status = 'processing' AND broker_job_id = ?
      RETURNING job_type, document_id
    `).get(
      input.message,
      input.timestamp,
      input.timestamp,
      input.payload.jobId,
      input.brokerJobId,
    ) as { job_type: string; document_id: string | null } | undefined;
    return recovered ? {
      family: "score",
      jobId: input.payload.jobId,
      brokerJobId: input.brokerJobId,
      jobType: recovered.job_type,
      documentId: recovered.document_id,
    } : null;
  }

  const recovered = input.db.prepare(`
    UPDATE jobs
    SET status = 'failed', error_message = ?, updated_at = ?, completed_at = ?
    WHERE id = ? AND status = 'processing' AND broker_job_id = ?
    RETURNING id
  `).get(
    input.message,
    input.timestamp,
    input.timestamp,
    input.payload.jobId,
    input.brokerJobId,
  ) as { id: string } | undefined;
  return recovered ? {
    family: "legacy",
    jobId: input.payload.jobId,
    brokerJobId: input.brokerJobId,
    jobType: null,
    documentId: null,
  } : null;
}

export async function recoverTerminalBrokerJobs(input: {
  db: RuntimeDatabaseLike;
  getBrokerState: (brokerJobId: string) => Promise<string | null>;
  timestamp: string;
  message: string;
}) {
  const scoreJobs = input.db.prepare(`
    SELECT id, broker_job_id
    FROM score_jobs
    WHERE status = 'processing' AND broker_job_id IS NOT NULL
  `).all() as Array<{ id: string; broker_job_id: string }>;
  const legacyJobs = input.db.prepare(`
    SELECT id, broker_job_id
    FROM jobs
    WHERE status = 'processing' AND broker_job_id IS NOT NULL
  `).all() as Array<{ id: string; broker_job_id: string }>;
  const processing: ProcessingBrokerJob[] = [
    ...scoreJobs.map((job) => ({ family: "score" as const, jobId: job.id, brokerJobId: job.broker_job_id })),
    ...legacyJobs.map((job) => ({ family: "legacy" as const, jobId: job.id, brokerJobId: job.broker_job_id })),
  ];

  const recovered: RecoveredBrokerJob[] = [];
  for (const job of processing) {
    const state = await input.getBrokerState(job.brokerJobId);
    if (state !== null && !TERMINAL_BROKER_STATES.has(state)) continue;
    const result = markInterruptedBrokerJobFailed({
      db: input.db,
      payload: { dispatchId: job.brokerJobId, family: job.family, jobId: job.jobId },
      brokerJobId: job.brokerJobId,
      timestamp: input.timestamp,
      message: input.message,
    });
    if (result) recovered.push(result);
  }
  return recovered;
}
