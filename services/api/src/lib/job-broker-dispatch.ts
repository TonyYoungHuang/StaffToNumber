import type { RuntimeDatabaseLike } from "@score/runtime-database";
import type { Queue } from "bullmq";
import type { JobBrokerPayload } from "@score/shared";
import {
  acknowledgeJobDispatch,
  claimNextJobDispatch,
  findJobDispatchTrace,
  markJobDispatchFailed,
  markJobDispatchPublished,
} from "../repositories/job-dispatch-outbox.js";

export async function dispatchJobOutboxBatch(input: {
  db: RuntimeDatabaseLike;
  queue: Pick<Queue<JobBrokerPayload>, "add"> | null;
  now: () => Date;
  staleMs: number;
  retryBaseMs: number;
  maxItems?: number;
  onPublished?: () => void;
  onError?: (input: { dispatchId: string; message: string }) => void;
}) {
  let published = 0;
  let acknowledged = 0;
  let failed = 0;
  for (let index = 0; index < (input.maxItems ?? 50); index += 1) {
    const now = input.now();
    const claimed = claimNextJobDispatch(input.db, {
      now: now.toISOString(),
      staleBefore: new Date(now.getTime() - input.staleMs).toISOString(),
    });
    if (!claimed) break;
    if (!input.queue) {
      acknowledgeJobDispatch(input.db, { id: claimed.id, now: now.toISOString() });
      acknowledged += 1;
      continue;
    }
    try {
      const trace = findJobDispatchTrace(input.db, claimed);
      const score = claimed.job_family === "score" ? input.db.prepare("SELECT job_type, params_json FROM score_jobs WHERE id = ?").get(claimed.job_id) as { job_type: string; params_json: string | null } | undefined : undefined;
      const recognition = score?.job_type === "omr_import";
      const params = recognition && score.params_json ? JSON.parse(score.params_json) as { recognitionLane?: string } : {};
      if (recognition && params.recognitionLane === "big" && process.env.RECOGNITION_LANES_ENABLED !== "true") throw new Error("Large-memory recognition dispatch is disabled until its configured lane is enabled.");
      const lane = recognition && process.env.RECOGNITION_LANES_ENABLED === "true" ? (params.recognitionLane === "big" ? "big" : "normal") : undefined;
      await input.queue.add("dispatch", {
        dispatchId: claimed.id,
        family: claimed.job_family,
        jobId: claimed.job_id,
        ...(trace.requestId ? { requestId: trace.requestId } : {}),
        ...(trace.traceId ? { traceId: trace.traceId } : {}),
        ...(lane ? { lane } : {}),
      }, { jobId: claimed.id, ...(recognition ? { attempts: 1 } : {}) });
      markJobDispatchPublished(input.db, {
        id: claimed.id,
        brokerJobId: claimed.id,
        now: input.now().toISOString(),
      });
      published += 1;
      input.onPublished?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "BullMQ publish failed.";
      markJobDispatchFailed(input.db, {
        id: claimed.id,
        error: message,
        now: input.now().toISOString(),
        retryBaseMs: input.retryBaseMs,
        attempts: claimed.attempts,
      });
      failed += 1;
      input.onError?.({ dispatchId: claimed.id, message });
      break;
    }
  }
  return { published, acknowledged, failed };
}
