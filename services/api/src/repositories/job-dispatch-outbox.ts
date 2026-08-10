import type { DatabaseSync } from "node:sqlite";

export type JobDispatchFamily = "legacy" | "score";

export type JobDispatch = {
  id: string;
  queue_name: string;
  job_family: JobDispatchFamily;
  job_id: string;
  attempts: number;
};

export type JobDispatchTrace = {
  requestId: string | null;
  traceId: string | null;
};

export function findJobDispatchTrace(db: DatabaseSync, dispatch: Pick<JobDispatch, "job_family" | "job_id">): JobDispatchTrace {
  const table = dispatch.job_family === "score" ? "score_jobs" : "jobs";
  try {
    const row = db.prepare(`SELECT request_id, trace_id FROM ${table} WHERE id = ?`).get(dispatch.job_id) as {
      request_id: string | null;
      trace_id: string | null;
    } | undefined;
    return { requestId: row?.request_id ?? null, traceId: row?.trace_id ?? null };
  } catch {
    // Keeps dispatch compatible with pre-v21 databases until the API process runs its migration.
    return { requestId: null, traceId: null };
  }
}

export function claimNextJobDispatch(db: DatabaseSync, input: { now: string; staleBefore: string }) {
  return db.prepare(`
    UPDATE job_dispatch_outbox
    SET status = 'processing', attempts = attempts + 1, locked_at = ?, updated_at = ?
    WHERE id = (
      SELECT outbox.id
      FROM job_dispatch_outbox outbox
      WHERE (outbox.status = 'queued' AND datetime(outbox.next_attempt_at) <= datetime(?))
         OR (outbox.status = 'processing' AND datetime(outbox.locked_at) <= datetime(?))
         OR (
           outbox.status = 'dispatched'
           AND datetime(outbox.dispatched_at) <= datetime(?)
           AND (
             (outbox.job_family = 'legacy' AND EXISTS (
               SELECT 1 FROM jobs WHERE jobs.id = outbox.job_id AND jobs.status = 'queued'
             ))
             OR (outbox.job_family = 'score' AND EXISTS (
               SELECT 1 FROM score_jobs WHERE score_jobs.id = outbox.job_id AND score_jobs.status = 'queued'
             ))
           )
         )
      ORDER BY datetime(outbox.created_at) ASC, outbox.id ASC
      LIMIT 1
    )
    RETURNING id, queue_name, job_family, job_id, attempts
  `).get(input.now, input.now, input.now, input.staleBefore, input.staleBefore) as JobDispatch | undefined;
}

export function markJobDispatchPublished(db: DatabaseSync, input: { id: string; brokerJobId: string; now: string }) {
  const result = db.prepare(`
    UPDATE job_dispatch_outbox
    SET status = 'dispatched', broker_job_id = ?, dispatched_at = ?, locked_at = NULL,
        last_error = NULL, updated_at = ?
    WHERE id = ? AND status = 'processing'
  `).run(input.brokerJobId, input.now, input.now, input.id);
  return result.changes === 1;
}

export function markJobDispatchFailed(db: DatabaseSync, input: {
  id: string;
  error: string;
  now: string;
  retryBaseMs: number;
  attempts: number;
}) {
  const exponent = Math.max(0, Math.min(10, input.attempts - 1));
  const nextAttemptAt = new Date(new Date(input.now).getTime() + input.retryBaseMs * (2 ** exponent)).toISOString();
  const result = db.prepare(`
    UPDATE job_dispatch_outbox
    SET status = 'queued', next_attempt_at = ?, locked_at = NULL, last_error = ?, updated_at = ?
    WHERE id = ? AND status = 'processing'
  `).run(nextAttemptAt, input.error.slice(0, 2_000), input.now, input.id);
  return { updated: result.changes === 1, nextAttemptAt };
}

export function acknowledgeJobDispatch(db: DatabaseSync, input: { id: string; now: string }) {
  const result = db.prepare(`
    UPDATE job_dispatch_outbox
    SET status = 'acknowledged', acknowledged_at = ?, locked_at = NULL, last_error = NULL, updated_at = ?
    WHERE id = ? AND status IN ('processing', 'dispatched')
  `).run(input.now, input.now, input.id);
  return result.changes === 1;
}

export function jobDispatchOutboxStatus(db: DatabaseSync) {
  return db.prepare(`
    SELECT
      SUM(CASE WHEN status IN ('queued', 'processing', 'dispatched') THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN last_error IS NOT NULL THEN 1 ELSE 0 END) AS retrying,
      MIN(CASE WHEN status IN ('queued', 'processing', 'dispatched') THEN created_at END) AS oldest_created_at
    FROM job_dispatch_outbox
  `).get() as { pending: number | null; retrying: number | null; oldest_created_at: string | null };
}
