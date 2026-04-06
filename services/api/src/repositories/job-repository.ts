import type { ConversionDirection, JobResultKind, JobStatus } from "@score/shared";
import { db } from "../db.js";
import { createId } from "../lib/auth.js";
import { nowIso } from "../lib/time.js";

type JobRow = {
  id: string;
  user_id: string;
  input_file_id: string;
  direction: ConversionDirection;
  status: JobStatus;
  result_kind: JobResultKind;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  output_file_id: string | null;
  draft_bundle_file_id: string | null;
  preview_text: string | null;
};

export function createJob(input: { userId: string; inputFileId: string; direction: ConversionDirection }) {
  const timestamp = nowIso();
  const id = createId();

  db.prepare(
    `
      INSERT INTO jobs (
        id, user_id, input_file_id, direction, status, result_kind, error_message,
        created_at, updated_at, started_at, completed_at, output_file_id, draft_bundle_file_id, preview_text
      )
      VALUES (?, ?, ?, ?, 'queued', 'none', NULL, ?, ?, NULL, NULL, NULL, NULL, NULL)
    `,
  ).run(id, input.userId, input.inputFileId, input.direction, timestamp, timestamp);

  return findJobById(id);
}

export function findJobById(id: string) {
  return db
    .prepare(
      `
        SELECT id, user_id, input_file_id, direction, status, result_kind, error_message,
               created_at, updated_at, started_at, completed_at, output_file_id, draft_bundle_file_id, preview_text
        FROM jobs
        WHERE id = ?
      `,
    )
    .get(id) as JobRow | undefined;
}

export function listJobsByUserId(userId: string) {
  return db
    .prepare(
      `
        SELECT id, user_id, input_file_id, direction, status, result_kind, error_message,
               created_at, updated_at, started_at, completed_at, output_file_id, draft_bundle_file_id, preview_text
        FROM jobs
        WHERE user_id = ?
        ORDER BY datetime(created_at) DESC
      `,
    )
    .all(userId) as JobRow[];
}

export function mapJobForApi(job: JobRow) {
  return {
    id: job.id,
    userId: job.user_id,
    inputFileId: job.input_file_id,
    direction: job.direction,
    status: job.status,
    resultKind: job.result_kind,
    errorMessage: job.error_message,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
    startedAt: job.started_at,
    completedAt: job.completed_at,
    outputFileId: job.output_file_id,
    draftBundleFileId: job.draft_bundle_file_id,
    previewText: job.preview_text,
  };
}
