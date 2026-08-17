import { randomUUID } from "node:crypto";
import type { RuntimeDatabaseLike } from "@score/runtime-database";
import type { ScoreJson, StoredFileKind } from "@score/shared";

type CommitOmrCandidateInput = {
  jobId: string;
  documentId: string;
  scoreJson: ScoreJson;
  musicXmlFileId: string;
  outputFileIds: string[];
  assets: Array<{ fileId: string; assetKind: StoredFileKind }>;
  timestamp?: string;
  revisionId?: string;
  manageTransaction?: boolean;
};

export function commitOmrCandidate(db: RuntimeDatabaseLike, input: CommitOmrCandidateInput): string | null {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const revisionId = input.revisionId ?? randomUUID();
  const manageTransaction = input.manageTransaction ?? true;
  if (manageTransaction) db.exec("BEGIN IMMEDIATE");
  try {
    const job = db.prepare("SELECT status FROM score_jobs WHERE id = ?").get(input.jobId) as { status: string } | undefined;
    if (job?.status !== "processing") {
      if (manageTransaction) db.exec("ROLLBACK");
      return null;
    }
    const nextRevisionNumber =
      (db.prepare(
        `
          SELECT COALESCE(MAX(revision_number), 0) + 1 AS next_revision_number
          FROM score_revisions
          WHERE document_id = ?
        `,
      ).get(input.documentId) as { next_revision_number: number }).next_revision_number ?? 1;

    db.prepare(
      `
        UPDATE score_revisions
        SET status = 'superseded'
        WHERE id = (SELECT pending_revision_id FROM score_documents WHERE id = ?)
          AND status = 'candidate'
      `,
    ).run(input.documentId);
    db.prepare(
      `
        INSERT INTO score_revisions (
          id, document_id, revision_number, score_json, musicxml_file_id, created_from, status, created_at
        )
        VALUES (?, ?, ?, ?, ?, 'omr_import', 'candidate', ?)
      `,
    ).run(revisionId, input.documentId, nextRevisionNumber, JSON.stringify(input.scoreJson), input.musicXmlFileId, timestamp);
    db.prepare(
      `
        UPDATE score_documents
        SET pending_revision_id = ?, status = 'needs_review', updated_at = ?
        WHERE id = ?
      `,
    ).run(revisionId, timestamp, input.documentId);

    const insertAsset = db.prepare(
      `
        INSERT INTO score_assets (id, document_id, file_id, asset_kind, created_at)
        VALUES (?, ?, ?, ?, ?)
      `,
    );
    for (const asset of input.assets) {
      insertAsset.run(randomUUID(), input.documentId, asset.fileId, asset.assetKind, timestamp);
    }

    const completed = db.prepare(
      `
        UPDATE score_jobs
        SET status = 'completed',
            result_revision_id = ?,
            output_file_ids_json = ?,
            error_message = NULL,
            progress_percent = 100,
            updated_at = ?,
            completed_at = ?
        WHERE id = ? AND status = 'processing'
      `,
    ).run(revisionId, JSON.stringify(input.outputFileIds), timestamp, timestamp, input.jobId);
    if (completed.changes !== 1) throw new Error("OMR job changed state before its candidate could be committed.");

    if (manageTransaction) db.exec("COMMIT");
    return revisionId;
  } catch (error) {
    if (manageTransaction) db.exec("ROLLBACK");
    throw error;
  }
}
