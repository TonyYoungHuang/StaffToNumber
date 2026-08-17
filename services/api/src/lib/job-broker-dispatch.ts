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
      await input.queue.add("dispatch", {
        dispatchId: claimed.id,
        family: claimed.job_family,
        jobId: claimed.job_id,
        ...(trace.requestId ? { requestId: trace.requestId } : {}),
        ...(trace.traceId ? { traceId: trace.traceId } : {}),
      }, { jobId: claimed.id });
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
