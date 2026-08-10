import type { DatabaseSync } from "node:sqlite";
import type { JobBrokerPayload } from "@score/shared";
import { claimLegacyJobById, type ClaimedLegacyJob } from "./legacy-job-claim.js";
import { claimScoreJobById, type ClaimedScoreJob } from "./score-job-claim.js";

export type BrokerJobLike = {
  id?: string;
  data: JobBrokerPayload;
};

export async function consumeBrokerJob(input: {
  db: DatabaseSync;
  brokerJob: BrokerJobLike;
  now: () => string;
  processScoreJob: (job: ClaimedScoreJob) => Promise<void>;
  processLegacyJob: (job: ClaimedLegacyJob) => Promise<void>;
}) {
  const payload = input.brokerJob.data;
  if (!payload || payload.dispatchId !== input.brokerJob.id || !["legacy", "score"].includes(payload.family) || !payload.jobId) {
    throw new Error("BullMQ score-processing payload is invalid.");
  }
  const timestamp = input.now();
  const acknowledge = () => {
    const acknowledgedAt = input.now();
    input.db.prepare(`
      UPDATE job_dispatch_outbox
      SET status = 'acknowledged', acknowledged_at = ?, locked_at = NULL, last_error = NULL,
          broker_job_id = COALESCE(broker_job_id, ?), updated_at = ?
      WHERE id = ? AND status IN ('processing', 'dispatched', 'acknowledged')
    `).run(acknowledgedAt, payload.dispatchId, acknowledgedAt, payload.dispatchId);
  };

  if (payload.family === "score") {
    const claimed = claimScoreJobById(input.db, { timestamp, jobId: payload.jobId, brokerJobId: payload.dispatchId });
    acknowledge();
    if (!claimed) return { claimed: false, family: payload.family } as const;
    await input.processScoreJob(claimed);
    return { claimed: true, family: payload.family } as const;
  }

  const claimed = claimLegacyJobById(input.db, { timestamp, jobId: payload.jobId, brokerJobId: payload.dispatchId });
  acknowledge();
  if (!claimed) return { claimed: false, family: payload.family } as const;
  await input.processLegacyJob(claimed);
  return { claimed: true, family: payload.family } as const;
}
