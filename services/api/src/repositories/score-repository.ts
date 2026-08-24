import type {
  AssignmentPracticeSettings,
  JobStatus,
  ScoreDocumentStatus,
  ScoreJobType,
  ScoreJson,
  ScoreProjectSettings,
  ScoreRevisionSource,
  ScoreRevisionStatus,
  StoredFileKind,
} from "@score/shared";
import { migrateScoreJson } from "@score/shared";
import { db } from "../db.js";
import { createId } from "../lib/auth.js";
import { parseJianpuToScoreJson } from "../lib/jianpu-score-parser.js";
import { parseMidiToScoreJson } from "../lib/midi-score-parser.js";
import { parseMusicXmlToScoreJson } from "../lib/musicxml-score-parser.js";
import {
  applyCanonicalScoreCommand,
  canonicalScoreCommandLabel,
  canonicalScoreCommandScopes,
  scoreCommandScopesOverlap,
  type CanonicalScoreCommand,
} from "../lib/score-collaboration-command.js";
import {
  ScoreHistoryConflictError,
  affectedEventIdsForHistory,
  selectivelyReverseScoreOperation,
  type ScoreCollaborationHistoryAction,
  type ScoreCollaborationHistoryCommand,
} from "../lib/score-collaboration-history.js";
import { nowIso } from "../lib/time.js";
import { currentRequestContext } from "../lib/request-context.js";
import { assertProcessingQuota } from "../lib/plan-quotas.js";
import { assertFreeTrialOmrAvailable } from "../lib/free-trial.js";

type ScoreDocumentRow = {
  id: string;
  user_id: string;
  title: string;
  current_revision_id: string | null;
  pending_revision_id: string | null;
  source_file_id: string | null;
  settings_json: string | null;
  status: ScoreDocumentStatus;
  created_at: string;
  updated_at: string;
};

type ScoreRevisionRow = {
  id: string;
  document_id: string;
  revision_number: number;
  score_json: string;
  musicxml_file_id: string | null;
  created_from: ScoreRevisionSource;
  status: ScoreRevisionStatus;
  created_at: string;
};

type ScoreJobRow = {
  id: string;
  user_id: string;
  document_id: string | null;
  input_file_id: string | null;
  job_type: ScoreJobType;
  status: JobStatus;
  params_json: string | null;
  result_revision_id: string | null;
  output_file_ids_json: string | null;
  error_message: string | null;
  attempt_count: number;
  progress_percent: number;
  cancel_requested_at: string | null;
  request_id: string | null;
  trace_id: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
};

type ScoreAssetRow = {
  id: string;
  document_id: string;
  file_id: string;
  asset_kind: StoredFileKind;
  revision_id: string | null;
  params_json: string | null;
  engine_json: string | null;
  checksum_sha256: string | null;
  stale_at: string | null;
  created_at: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  file_kind: StoredFileKind;
  file_created_at: string;
};

type OmrDiagnosticRow = {
  id: string;
  job_id: string | null;
  document_id: string;
  diagnostics_json: string;
  confidence: number | null;
  source_page_count: number | null;
  created_at: string;
};

type ScoreCommentRow = {
  id: string;
  document_id: string;
  user_id: string;
  share_id: string | null;
  author_name: string | null;
  body: string;
  target_json: string | null;
  resolved_at: string | null;
  resolved_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

type ScoreShareRow = {
  id: string;
  document_id: string;
  created_by_user_id: string;
  share_token: string;
  permission: "view" | "comment" | "edit";
  label: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

type ScoreCollaborationCommandRow = {
  id: string;
  document_id: string;
  actor_id: string;
  actor_role: string;
  base_revision_id: string;
  applied_revision_id: string | null;
  command_type: string;
  target_scopes_json: string;
  command_json: string;
  status: "applied" | "merged" | "conflict";
  conflicting_command_ids_json: string;
  conflict_reason: string | null;
  created_at: string;
};

type ScoreAssignmentStatus = "open" | "archived";

type ScoreRubricCriterion = {
  id: string;
  label: string;
  maxScore: number;
};

type ScoreRubricScore = {
  criterionId: string;
  score: number;
};

type ScoreRubricTemplateRow = {
  id: string;
  user_id: string;
  name: string;
  rubric_json: string;
  created_at: string;
  updated_at: string;
};

type ScoreAssignmentRow = {
  id: string;
  document_id: string;
  created_by_user_id: string;
  revision_id: string | null;
  share_id: string | null;
  classroom_id: string | null;
  title: string;
  instructions: string | null;
  due_at: string | null;
  rubric_json: string | null;
  practice_settings_json: string | null;
  status: ScoreAssignmentStatus;
  created_at: string;
  updated_at: string;
  share_token: string | null;
  share_revoked_at: string | null;
};

type ScoreAssignmentSubmissionStatus = "submitted" | "reviewed";

function parseAssignmentPracticeSettings(value: string | null): AssignmentPracticeSettings | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AssignmentPracticeSettings;
  } catch {
    return null;
  }
}

function parsePerformanceAnalysis(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

type ScoreAssignmentSubmissionRow = {
  id: string;
  assignment_id: string;
  document_id: string;
  student_id: string | null;
  submitter_name: string;
  submitter_contact: string | null;
  note: string | null;
  recording_url: string | null;
  performance_file_id: string | null;
  practice_minutes: number | null;
  practice_settings_json: string | null;
  performance_analysis_json: string | null;
  status: ScoreAssignmentSubmissionStatus;
  teacher_feedback: string | null;
  grade_score: number | null;
  grade_max: number | null;
  rubric_scores_json: string | null;
  review_token: string | null;
  submitted_at: string;
  updated_at: string;
  assignment_title: string | null;
  performance_file_original_name: string | null;
  performance_file_mime_type: string | null;
  performance_file_size_bytes: number | null;
  performance_file_created_at: string | null;
};

type ScoreClassroomRow = {
  id: string;
  owner_user_id: string;
  organization_id: string | null;
  campus_id: string | null;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

type ScoreClassroomStudentStatus = "invited" | "active" | "archived";

type ScoreClassroomStudentRow = {
  id: string;
  classroom_id: string;
  display_name: string;
  contact_email: string | null;
  user_id: string | null;
  external_ref: string | null;
  status: ScoreClassroomStudentStatus;
  created_at: string;
  updated_at: string;
};

type SharedScoreRow = ScoreShareRow & {
  score_title: string;
  score_status: ScoreDocumentStatus;
  current_revision_id: string | null;
  source_file_id: string | null;
  score_created_at: string;
  score_updated_at: string;
  revision_id: string | null;
  revision_number: number | null;
  score_json: string | null;
  musicxml_file_id: string | null;
  created_from: ScoreRevisionSource | null;
  revision_created_at: string | null;
};

function scoreDocumentSelect() {
  return `
    SELECT id, user_id, title, current_revision_id, pending_revision_id, source_file_id, settings_json, status, created_at, updated_at
    FROM score_documents
  `;
}

function parseScoreProjectSettings(value: string | null): ScoreProjectSettings {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as ScoreProjectSettings;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function scoreRevisionSelect() {
  return `
    SELECT id, document_id, revision_number, score_json, musicxml_file_id, created_from, status, created_at
    FROM score_revisions
  `;
}

function scoreJobSelect() {
  return `
    SELECT id, user_id, document_id, input_file_id, job_type, status, params_json,
           result_revision_id, output_file_ids_json, error_message, created_at, updated_at,
           started_at, completed_at, attempt_count, progress_percent, cancel_requested_at, request_id, trace_id
    FROM score_jobs
  `;
}

export function createScoreDocumentFromMusicXml(input: {
  userId: string;
  title: string;
  sourceFileId: string;
  sourceOriginalName: string;
  musicXml: string;
}) {
  const timestamp = nowIso();
  const documentId = createId();
  const revisionId = createId();
  const scoreJson: ScoreJson = parseMusicXmlToScoreJson({
    musicXml: input.musicXml,
    title: input.title,
    sourceFileId: input.sourceFileId,
    sourceOriginalName: input.sourceOriginalName,
    importedAt: timestamp,
  });

  db.exec("BEGIN");

  try {
    db.prepare(
      `
        INSERT INTO score_documents (
          id, user_id, title, current_revision_id, source_file_id, status, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'imported', ?, ?)
      `,
    ).run(documentId, input.userId, input.title, revisionId, input.sourceFileId, timestamp, timestamp);

    db.prepare(
      `
        INSERT INTO score_revisions (
          id, document_id, revision_number, score_json, musicxml_file_id, created_from, created_at
        )
        VALUES (?, ?, 1, ?, ?, 'musicxml_import', ?)
      `,
    ).run(revisionId, documentId, JSON.stringify(scoreJson), input.sourceFileId, timestamp);

    db.prepare(
      `
        INSERT INTO score_assets (id, document_id, file_id, asset_kind, created_at)
        VALUES (?, ?, ?, 'source_musicxml', ?)
      `,
    ).run(createId(), documentId, input.sourceFileId, timestamp);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return findScoreDocumentById(documentId);
}

export function createScoreDocumentFromJianpu(input: {
  userId: string;
  title: string;
  sourceFileId: string;
  sourceOriginalName: string;
  jianpuText: string;
  tonic?: string;
  mode?: "major" | "minor";
  beats?: string;
  beatType?: string;
}) {
  const timestamp = nowIso();
  const documentId = createId();
  const revisionId = createId();
  const scoreJson: ScoreJson = parseJianpuToScoreJson({
    text: input.jianpuText,
    title: input.title,
    sourceFileId: input.sourceFileId,
    sourceOriginalName: input.sourceOriginalName,
    importedAt: timestamp,
    tonic: input.tonic,
    mode: input.mode,
    beats: input.beats,
    beatType: input.beatType,
  });

  db.exec("BEGIN");

  try {
    db.prepare(
      `
        INSERT INTO score_documents (
          id, user_id, title, current_revision_id, source_file_id, status, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'imported', ?, ?)
      `,
    ).run(documentId, input.userId, scoreJson.title, revisionId, input.sourceFileId, timestamp, timestamp);

    db.prepare(
      `
        INSERT INTO score_revisions (
          id, document_id, revision_number, score_json, musicxml_file_id, created_from, created_at
        )
        VALUES (?, ?, 1, ?, NULL, 'jianpu_import', ?)
      `,
    ).run(revisionId, documentId, JSON.stringify(scoreJson), timestamp);

    db.prepare(
      `
        INSERT INTO score_assets (id, document_id, file_id, asset_kind, created_at)
        VALUES (?, ?, ?, 'source_jianpu', ?)
      `,
    ).run(createId(), documentId, input.sourceFileId, timestamp);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return findScoreDocumentById(documentId);
}

export function createScoreDocumentFromScoreJson(input: {
  userId: string;
  title: string;
  sourceFileId: string;
  sourceOriginalName: string;
  scoreJson: ScoreJson;
}) {
  const timestamp = nowIso();
  const documentId = createId();
  const revisionId = createId();
  const scoreJson: ScoreJson = {
    ...input.scoreJson,
    title: input.title || input.scoreJson.title,
    source: {
      kind: "score_json",
      fileId: input.sourceFileId,
      originalName: input.sourceOriginalName,
    },
    metadata: {
      ...input.scoreJson.metadata,
      importedAt: timestamp,
      parser: "score-json-snapshot-v1",
      warnings: [
        ...(Array.isArray(input.scoreJson.metadata?.warnings) ? input.scoreJson.metadata.warnings : []),
        `Imported from Score JSON snapshot ${input.sourceOriginalName}; original parser was ${input.scoreJson.metadata.parser}.`,
      ],
    },
  };

  db.exec("BEGIN");

  try {
    db.prepare(
      `
        INSERT INTO score_documents (
          id, user_id, title, current_revision_id, source_file_id, status, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'imported', ?, ?)
      `,
    ).run(documentId, input.userId, scoreJson.title, revisionId, input.sourceFileId, timestamp, timestamp);

    db.prepare(
      `
        INSERT INTO score_revisions (
          id, document_id, revision_number, score_json, musicxml_file_id, created_from, created_at
        )
        VALUES (?, ?, 1, ?, NULL, 'score_json_import', ?)
      `,
    ).run(revisionId, documentId, JSON.stringify(scoreJson), timestamp);

    db.prepare(
      `
        INSERT INTO score_assets (id, document_id, file_id, asset_kind, created_at)
        VALUES (?, ?, ?, 'score_json_snapshot', ?)
      `,
    ).run(createId(), documentId, input.sourceFileId, timestamp);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return findScoreDocumentById(documentId);
}

export function createScoreDocumentFromDerivedScoreJson(input: {
  userId: string;
  title: string;
  scoreJson: ScoreJson;
  createdFrom: ScoreRevisionSource;
}) {
  const timestamp = nowIso();
  const documentId = createId();
  const revisionId = createId();
  const scoreJson: ScoreJson = {
    ...input.scoreJson,
    title: input.title || input.scoreJson.title,
    metadata: {
      ...input.scoreJson.metadata,
      importedAt: timestamp,
    },
  };

  db.exec("BEGIN");

  try {
    db.prepare(
      `
        INSERT INTO score_documents (
          id, user_id, title, current_revision_id, source_file_id, status, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, NULL, 'ready', ?, ?)
      `,
    ).run(documentId, input.userId, scoreJson.title, revisionId, timestamp, timestamp);

    db.prepare(
      `
        INSERT INTO score_revisions (
          id, document_id, revision_number, score_json, musicxml_file_id, created_from, created_at
        )
        VALUES (?, ?, 1, ?, NULL, ?, ?)
      `,
    ).run(revisionId, documentId, JSON.stringify(scoreJson), input.createdFrom, timestamp);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return findScoreDocumentById(documentId);
}

export function createScoreDocumentFromMidi(input: {
  userId: string;
  title: string;
  sourceFileId: string;
  sourceOriginalName: string;
  midi: Buffer;
}) {
  const timestamp = nowIso();
  const documentId = createId();
  const revisionId = createId();
  const scoreJson: ScoreJson = parseMidiToScoreJson({
    midi: input.midi,
    title: input.title,
    sourceFileId: input.sourceFileId,
    sourceOriginalName: input.sourceOriginalName,
    importedAt: timestamp,
  });

  db.exec("BEGIN");

  try {
    db.prepare(
      `
        INSERT INTO score_documents (
          id, user_id, title, current_revision_id, source_file_id, status, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'imported', ?, ?)
      `,
    ).run(documentId, input.userId, scoreJson.title, revisionId, input.sourceFileId, timestamp, timestamp);

    db.prepare(
      `
        INSERT INTO score_revisions (
          id, document_id, revision_number, score_json, musicxml_file_id, created_from, created_at
        )
        VALUES (?, ?, 1, ?, NULL, 'midi_import', ?)
      `,
    ).run(revisionId, documentId, JSON.stringify(scoreJson), timestamp);

    db.prepare(
      `
        INSERT INTO score_assets (id, document_id, file_id, asset_kind, created_at)
        VALUES (?, ?, ?, 'source_midi', ?)
      `,
    ).run(createId(), documentId, input.sourceFileId, timestamp);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return findScoreDocumentById(documentId);
}

export function createOmrImportScoreDocument(input: {
  userId: string;
  title: string;
  sourceFileId: string;
  sourceFileKind: Extract<StoredFileKind, "source_pdf" | "source_image">;
  sourceOriginalName: string;
  freeTrial?: boolean;
}) {
  assertProcessingQuota(input.userId);
  const timestamp = nowIso();
  const documentId = createId();
  const jobId = createId();
  const diagnosticsId = createId();
  const context = currentRequestContext();

  db.exec("BEGIN");

  try {
    if (input.freeTrial) assertFreeTrialOmrAvailable(input.userId);
    db.prepare(
      `
        INSERT INTO score_documents (
          id, user_id, title, current_revision_id, source_file_id, status, created_at, updated_at
        )
        VALUES (?, ?, ?, NULL, ?, 'candidate', ?, ?)
      `,
    ).run(documentId, input.userId, input.title, input.sourceFileId, timestamp, timestamp);

    db.prepare(
      `
        INSERT INTO score_assets (id, document_id, file_id, asset_kind, created_at)
        VALUES (?, ?, ?, ?, ?)
      `,
    ).run(createId(), documentId, input.sourceFileId, input.sourceFileKind, timestamp);

    db.prepare(
      `
        INSERT INTO score_jobs (
          id, user_id, document_id, input_file_id, job_type, status, params_json,
          result_revision_id, output_file_ids_json, error_message, request_id, trace_id, created_at, updated_at,
          started_at, completed_at
        )
        VALUES (?, ?, ?, ?, 'omr_import', 'queued', ?, NULL, NULL, NULL, ?, ?, ?, ?, NULL, NULL)
      `,
    ).run(
      jobId,
      input.userId,
      documentId,
      input.sourceFileId,
      JSON.stringify({
        engine: "audiveris",
        sourceOriginalName: input.sourceOriginalName,
        sourceFileKind: input.sourceFileKind,
        freeTrial: Boolean(input.freeTrial),
      }),
      context?.requestId ?? null,
      context?.traceId ?? null,
      timestamp,
      timestamp,
    );

    db.prepare(
      `
        INSERT INTO omr_diagnostics (
          id, job_id, document_id, diagnostics_json, confidence, source_page_count, created_at
        )
        VALUES (?, ?, ?, ?, NULL, NULL, ?)
      `,
    ).run(
      diagnosticsId,
      jobId,
      documentId,
      JSON.stringify({
        status: "queued",
        engine: "audiveris",
        message: "OMR import is queued. Audiveris worker integration will convert this source into MusicXML and a candidate Score JSON revision.",
      }),
      timestamp,
    );

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return {
    document: findScoreDocumentById(documentId),
    job: findScoreJobById(jobId),
  };
}

export function createAudioTranscribeScoreDocument(input: {
  userId: string;
  title: string;
  sourceFileId: string;
  sourceOriginalName: string;
}) {
  assertProcessingQuota(input.userId);
  const timestamp = nowIso();
  const documentId = createId();
  const jobId = createId();
  const context = currentRequestContext();

  db.exec("BEGIN");

  try {
    db.prepare(
      `
        INSERT INTO score_documents (
          id, user_id, title, current_revision_id, source_file_id, status, created_at, updated_at
        )
        VALUES (?, ?, ?, NULL, ?, 'candidate', ?, ?)
      `,
    ).run(documentId, input.userId, input.title, input.sourceFileId, timestamp, timestamp);

    db.prepare(
      `
        INSERT INTO score_assets (id, document_id, file_id, asset_kind, created_at)
        VALUES (?, ?, ?, 'source_audio', ?)
      `,
    ).run(createId(), documentId, input.sourceFileId, timestamp);

    db.prepare(
      `
        INSERT INTO score_jobs (
          id, user_id, document_id, input_file_id, job_type, status, params_json,
          result_revision_id, output_file_ids_json, error_message, request_id, trace_id, created_at, updated_at,
          started_at, completed_at
        )
        VALUES (?, ?, ?, ?, 'audio_transcribe', 'queued', ?, NULL, NULL, NULL, ?, ?, ?, ?, NULL, NULL)
      `,
    ).run(
      jobId,
      input.userId,
      documentId,
      input.sourceFileId,
      JSON.stringify({
        engine: "basic-pitch",
        sourceOriginalName: input.sourceOriginalName,
        message: "Audio-to-score is queued as an experimental candidate pipeline. Basic Pitch should create MIDI and the worker will try a first-pass editable Score JSON revision.",
      }),
      context?.requestId ?? null,
      context?.traceId ?? null,
      timestamp,
      timestamp,
    );

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return {
    document: findScoreDocumentById(documentId),
    job: findScoreJobById(jobId),
  };
}

export function createAudioTranscribeScoreDocumentFromUrl(input: {
  userId: string;
  title: string;
  sourceUrl: string;
  rightsBasis: "owned" | "licensed" | "public_domain";
  rightsConfirmedAt: string;
  transcriptionProfile: "monophonic" | "polyphonic-balanced";
}) {
  assertProcessingQuota(input.userId);
  const timestamp = nowIso();
  const documentId = createId();
  const jobId = createId();
  const context = currentRequestContext();

  db.exec("BEGIN");

  try {
    db.prepare(
      `
        INSERT INTO score_documents (
          id, user_id, title, current_revision_id, source_file_id, status, created_at, updated_at
        )
        VALUES (?, ?, ?, NULL, NULL, 'candidate', ?, ?)
      `,
    ).run(documentId, input.userId, input.title, timestamp, timestamp);

    db.prepare(
      `
        INSERT INTO score_jobs (
          id, user_id, document_id, input_file_id, job_type, status, params_json,
          result_revision_id, output_file_ids_json, error_message, request_id, trace_id, created_at, updated_at,
          started_at, completed_at
        )
        VALUES (?, ?, ?, NULL, 'audio_transcribe', 'queued', ?, NULL, NULL, NULL, ?, ?, ?, ?, NULL, NULL)
      `,
    ).run(
      jobId,
      input.userId,
      documentId,
      JSON.stringify({
        engine: "basic-pitch",
        sourceUrl: input.sourceUrl,
        sourceKind: "audio_url",
        rightsBasis: input.rightsBasis,
        rightsConfirmedAt: input.rightsConfirmedAt,
        transcriptionProfile: input.transcriptionProfile,
        message:
          "Audio URL transcription is queued as an experimental candidate pipeline. The worker should download the media with yt-dlp, create a source audio asset, then run Basic Pitch.",
      }),
      context?.requestId ?? null,
      context?.traceId ?? null,
      timestamp,
      timestamp,
    );

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return {
    document: findScoreDocumentById(documentId),
    job: findScoreJobById(jobId),
  };
}

export function listScoreDocumentsByUserId(userId: string) {
  return db
    .prepare(
      `
        ${scoreDocumentSelect()}
        WHERE user_id = ?
        ORDER BY datetime(updated_at) DESC
      `,
    )
    .all(userId) as ScoreDocumentRow[];
}

export function findScoreDocumentById(id: string) {
  return db.prepare(`${scoreDocumentSelect()} WHERE id = ?`).get(id) as ScoreDocumentRow | undefined;
}

export function updateScoreDocumentSettings(input: { documentId: string; settings: ScoreProjectSettings }) {
  const timestamp = nowIso();
  db.prepare(
    `
      UPDATE score_documents
      SET settings_json = ?, updated_at = ?
      WHERE id = ?
    `,
  ).run(JSON.stringify(input.settings), timestamp, input.documentId);

  return findScoreDocumentById(input.documentId);
}

export function findScoreRevisionById(id: string) {
  return db.prepare(`${scoreRevisionSelect()} WHERE id = ?`).get(id) as ScoreRevisionRow | undefined;
}

export function findCurrentRevisionForDocument(document: ScoreDocumentRow) {
  if (!document.current_revision_id) {
    return undefined;
  }

  return findScoreRevisionById(document.current_revision_id);
}

export function findPendingRevisionForDocument(document: ScoreDocumentRow) {
  if (!document.pending_revision_id) {
    return undefined;
  }

  return findScoreRevisionById(document.pending_revision_id);
}

export function findEditableRevisionForDocument(document: ScoreDocumentRow) {
  return findPendingRevisionForDocument(document) ?? findCurrentRevisionForDocument(document);
}

export function listScoreRevisionsByDocumentId(documentId: string) {
  return db
    .prepare(
      `
        ${scoreRevisionSelect()}
        WHERE document_id = ?
        ORDER BY revision_number DESC
      `,
    )
    .all(documentId) as ScoreRevisionRow[];
}

export function findScoreJobById(id: string) {
  return db.prepare(`${scoreJobSelect()} WHERE id = ?`).get(id) as ScoreJobRow | undefined;
}

export function listScoreJobsByDocumentId(documentId: string) {
  return db
    .prepare(
      `
        ${scoreJobSelect()}
        WHERE document_id = ?
        ORDER BY datetime(created_at) DESC
      `,
    )
    .all(documentId) as ScoreJobRow[];
}

export function listScoreAssetsByDocumentId(documentId: string) {
  return db
    .prepare(
      `
        SELECT
          score_assets.id,
          score_assets.document_id,
          score_assets.file_id,
          score_assets.asset_kind,
          score_assets.revision_id,
          score_assets.params_json,
          score_assets.engine_json,
          score_assets.checksum_sha256,
          score_assets.stale_at,
          score_assets.created_at,
          files.original_name,
          files.mime_type,
          files.size_bytes,
          files.file_kind,
          files.created_at AS file_created_at
        FROM score_assets
        INNER JOIN files ON files.id = score_assets.file_id
        WHERE score_assets.document_id = ?
        ORDER BY datetime(score_assets.created_at) DESC
      `,
    )
    .all(documentId) as ScoreAssetRow[];
}

export function listOmrDiagnosticsByDocumentId(documentId: string) {
  return db
    .prepare(
      `
        SELECT id, job_id, document_id, diagnostics_json, confidence, source_page_count, created_at
        FROM omr_diagnostics
        WHERE document_id = ?
        ORDER BY datetime(created_at) DESC
      `,
    )
    .all(documentId) as OmrDiagnosticRow[];
}

export function listScoreCommentsByDocumentId(documentId: string) {
  return db
    .prepare(
      `
        SELECT id, document_id, user_id, share_id, author_name, body, target_json,
               resolved_at, resolved_by_user_id, created_at, updated_at
        FROM score_comments
        WHERE document_id = ?
        ORDER BY datetime(created_at) ASC
      `,
    )
    .all(documentId) as ScoreCommentRow[];
}

export function listPerformanceSubmissionComments(input: { documentId: string; submissionId: string }) {
  return listScoreCommentsByDocumentId(input.documentId).filter((comment) => {
    if (!comment.target_json) {
      return false;
    }

    try {
      const target = JSON.parse(comment.target_json) as Record<string, unknown>;
      return target.type === "performance_submission" && target.submissionId === input.submissionId;
    } catch {
      return false;
    }
  });
}

export function createScoreComment(input: {
  documentId: string;
  userId: string;
  shareId?: string | null;
  authorName?: string | null;
  body: string;
  target?: Record<string, unknown> | null;
}) {
  const timestamp = nowIso();
  const commentId = createId();

  db.prepare(
    `
      INSERT INTO score_comments (
        id, document_id, user_id, share_id, author_name, body, target_json,
        resolved_at, resolved_by_user_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)
    `,
  ).run(
    commentId,
    input.documentId,
    input.userId,
    input.shareId ?? null,
    input.authorName?.trim() || null,
    input.body,
    input.target ? JSON.stringify(input.target) : null,
    timestamp,
    timestamp,
  );

  return db
    .prepare(
      `
        SELECT id, document_id, user_id, share_id, author_name, body, target_json,
               resolved_at, resolved_by_user_id, created_at, updated_at
        FROM score_comments
        WHERE id = ?
      `,
    )
    .get(commentId) as ScoreCommentRow | undefined;
}

export function setScoreCommentResolved(input: { commentId: string; documentId: string; resolved: boolean; userId: string }) {
  const timestamp = nowIso();
  const result = db.prepare(`
    UPDATE score_comments
    SET resolved_at = ?, resolved_by_user_id = ?, updated_at = ?
    WHERE id = ? AND document_id = ?
  `).run(input.resolved ? timestamp : null, input.resolved ? input.userId : null, timestamp, input.commentId, input.documentId);
  if (result.changes !== 1) return undefined;
  return db.prepare(`
    SELECT id, document_id, user_id, share_id, author_name, body, target_json,
           resolved_at, resolved_by_user_id, created_at, updated_at
    FROM score_comments WHERE id = ?
  `).get(input.commentId) as ScoreCommentRow | undefined;
}

function createShareToken() {
  return createId().replace(/-/g, "");
}

export function createScoreShare(input: {
  documentId: string;
  userId: string;
  permission?: "view" | "comment" | "edit";
  label?: string | null;
  expiresAt?: string | null;
}) {
  const timestamp = nowIso();
  const shareId = createId();
  const shareToken = createShareToken();

  db.prepare(
    `
      INSERT INTO score_shares (
        id, document_id, created_by_user_id, share_token, permission, label, expires_at, revoked_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
    `,
  ).run(
    shareId,
    input.documentId,
    input.userId,
    shareToken,
    input.permission ?? "view",
    input.label?.trim() || null,
    input.expiresAt ?? null,
    timestamp,
    timestamp,
  );

  return findScoreShareById(shareId);
}

export function findScoreShareById(id: string) {
  return db
    .prepare(
      `
        SELECT id, document_id, created_by_user_id, share_token, permission, label, expires_at, revoked_at, created_at, updated_at
        FROM score_shares
        WHERE id = ?
      `,
    )
    .get(id) as ScoreShareRow | undefined;
}

export function listScoreSharesByDocumentId(documentId: string) {
  return db
    .prepare(
      `
        SELECT id, document_id, created_by_user_id, share_token, permission, label, expires_at, revoked_at, created_at, updated_at
        FROM score_shares
        WHERE document_id = ?
        ORDER BY datetime(created_at) DESC
      `,
    )
    .all(documentId) as ScoreShareRow[];
}

export function revokeScoreShare(input: { shareId: string; documentId: string }) {
  const timestamp = nowIso();
  db.prepare(
    `
      UPDATE score_shares
      SET revoked_at = ?, updated_at = ?
      WHERE id = ? AND document_id = ? AND revoked_at IS NULL
    `,
  ).run(timestamp, timestamp, input.shareId, input.documentId);

  return findScoreShareById(input.shareId);
}

export function createScoreRubricTemplate(input: {
  userId: string;
  name: string;
  rubric: ScoreRubricCriterion[];
}) {
  const timestamp = nowIso();
  const templateId = createId();

  db.prepare(
    `
      INSERT INTO score_rubric_templates (id, user_id, name, rubric_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
  ).run(templateId, input.userId, input.name, JSON.stringify(input.rubric), timestamp, timestamp);

  return findScoreRubricTemplateById(templateId);
}

export function findScoreRubricTemplateById(id: string) {
  return db
    .prepare(
      `
        SELECT id, user_id, name, rubric_json, created_at, updated_at
        FROM score_rubric_templates
        WHERE id = ?
      `,
    )
    .get(id) as ScoreRubricTemplateRow | undefined;
}

export function listScoreRubricTemplatesByUserId(userId: string) {
  return db
    .prepare(
      `
        SELECT id, user_id, name, rubric_json, created_at, updated_at
        FROM score_rubric_templates
        WHERE user_id = ?
        ORDER BY datetime(updated_at) DESC
      `,
    )
    .all(userId) as ScoreRubricTemplateRow[];
}

export function deleteScoreRubricTemplate(input: { templateId: string; userId: string }) {
  const result = db
    .prepare(
      `
        DELETE FROM score_rubric_templates
        WHERE id = ? AND user_id = ?
      `,
    )
    .run(input.templateId, input.userId);

  return result.changes > 0;
}

export function createScoreClassroom(input: { userId: string; name: string; description?: string | null; organizationId?: string | null; campusId?: string | null }) {
  const timestamp = nowIso();
  const classroomId = createId();
  db.prepare(
    `
      INSERT INTO score_classrooms (id, owner_user_id, organization_id, campus_id, name, description, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `,
  ).run(classroomId, input.userId, input.organizationId ?? null, input.campusId ?? null, input.name, input.description ?? null, timestamp, timestamp);

  return findScoreClassroomById(classroomId);
}

export function findScoreClassroomById(id: string) {
  return db
    .prepare(
      `
        SELECT id, owner_user_id, organization_id, campus_id, name, description, created_at, updated_at, archived_at
        FROM score_classrooms
        WHERE id = ?
      `,
    )
    .get(id) as ScoreClassroomRow | undefined;
}

export function listScoreClassroomsByUserId(userId: string) {
  return db
    .prepare(
      `
        SELECT id, owner_user_id, organization_id, campus_id, name, description, created_at, updated_at, archived_at
        FROM score_classrooms
        WHERE owner_user_id = ? AND archived_at IS NULL
        ORDER BY datetime(updated_at) DESC
      `,
    )
    .all(userId) as ScoreClassroomRow[];
}

export function archiveScoreClassroom(input: { classroomId: string }) {
  const timestamp = nowIso();
  db.prepare(
    `
      UPDATE score_classrooms
      SET archived_at = ?, updated_at = ?
      WHERE id = ? AND archived_at IS NULL
    `,
  ).run(timestamp, timestamp, input.classroomId);

  return findScoreClassroomById(input.classroomId);
}

export function createScoreClassroomStudent(input: {
  classroomId: string;
  displayName: string;
  contactEmail?: string | null;
  externalRef?: string | null;
}) {
  const timestamp = nowIso();
  const studentId = createId();
  const contactEmail = input.contactEmail?.trim().toLocaleLowerCase() || null;
  const existing = contactEmail
    ? db.prepare("SELECT id FROM score_classroom_students WHERE classroom_id = ? AND lower(contact_email) = ? AND status != 'archived'").get(input.classroomId, contactEmail) as { id: string } | undefined
    : undefined;
  if (existing) return findScoreClassroomStudentById(existing.id);
  const user = contactEmail
    ? db.prepare("SELECT id FROM users WHERE lower(email) = ? AND account_status = 'active'").get(contactEmail) as { id: string } | undefined
    : undefined;
  const status = contactEmail && !user ? "invited" : "active";
  db.prepare(
    `
      INSERT INTO score_classroom_students (
        id, classroom_id, display_name, contact_email, user_id, external_ref, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(studentId, input.classroomId, input.displayName, contactEmail, user?.id ?? null, input.externalRef ?? null, status, timestamp, timestamp);

  return findScoreClassroomStudentById(studentId);
}

export function findScoreClassroomStudentById(id: string) {
  return db
    .prepare(
      `
        SELECT id, classroom_id, display_name, contact_email, user_id, external_ref, status, created_at, updated_at
        FROM score_classroom_students
        WHERE id = ?
      `,
    )
    .get(id) as ScoreClassroomStudentRow | undefined;
}

export function listScoreClassroomStudentsByClassroomId(classroomId: string) {
  return db
    .prepare(
      `
        SELECT id, classroom_id, display_name, contact_email, user_id, external_ref, status, created_at, updated_at
        FROM score_classroom_students
        WHERE classroom_id = ? AND status != 'archived'
        ORDER BY display_name COLLATE NOCASE ASC
      `,
    )
    .all(classroomId) as ScoreClassroomStudentRow[];
}

export function archiveScoreClassroomStudent(input: { classroomId: string; studentId: string }) {
  const timestamp = nowIso();
  db.prepare(
    `
      UPDATE score_classroom_students
      SET status = 'archived', updated_at = ?
      WHERE id = ? AND classroom_id = ? AND status != 'archived'
    `,
  ).run(timestamp, input.studentId, input.classroomId);

  return findScoreClassroomStudentById(input.studentId);
}

export function createScoreAssignment(input: {
  documentId: string;
  userId: string;
  revisionId?: string | null;
  shareId?: string | null;
  classroomId?: string | null;
  title: string;
  instructions?: string | null;
  dueAt?: string | null;
  rubric?: ScoreRubricCriterion[] | null;
  practiceSettings?: AssignmentPracticeSettings | null;
}) {
  const timestamp = nowIso();
  const assignmentId = createId();

  db.prepare(
    `
      INSERT INTO score_assignments (
        id, document_id, created_by_user_id, revision_id, share_id, classroom_id, title, instructions, due_at, rubric_json, practice_settings_json, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
    `,
  ).run(
    assignmentId,
    input.documentId,
    input.userId,
    input.revisionId ?? null,
    input.shareId ?? null,
    input.classroomId ?? null,
    input.title,
    input.instructions ?? null,
    input.dueAt ?? null,
    input.rubric && input.rubric.length > 0 ? JSON.stringify(input.rubric) : null,
    input.practiceSettings ? JSON.stringify(input.practiceSettings) : null,
    timestamp,
    timestamp,
  );

  return findScoreAssignmentById(assignmentId);
}

export function findScoreAssignmentById(id: string) {
  return db
    .prepare(
      `
        SELECT
          score_assignments.id,
          score_assignments.document_id,
          score_assignments.created_by_user_id,
          score_assignments.revision_id,
          score_assignments.share_id,
          score_assignments.classroom_id,
          score_assignments.title,
          score_assignments.instructions,
          score_assignments.due_at,
          score_assignments.rubric_json,
          score_assignments.practice_settings_json,
          score_assignments.status,
          score_assignments.created_at,
          score_assignments.updated_at,
          score_shares.share_token,
          score_shares.revoked_at AS share_revoked_at
        FROM score_assignments
        LEFT JOIN score_shares ON score_shares.id = score_assignments.share_id
        WHERE score_assignments.id = ?
      `,
    )
    .get(id) as ScoreAssignmentRow | undefined;
}

export function listScoreAssignmentsByDocumentId(documentId: string) {
  return db
    .prepare(
      `
        SELECT
          score_assignments.id,
          score_assignments.document_id,
          score_assignments.created_by_user_id,
          score_assignments.revision_id,
          score_assignments.share_id,
          score_assignments.classroom_id,
          score_assignments.title,
          score_assignments.instructions,
          score_assignments.due_at,
          score_assignments.rubric_json,
          score_assignments.practice_settings_json,
          score_assignments.status,
          score_assignments.created_at,
          score_assignments.updated_at,
          score_shares.share_token,
          score_shares.revoked_at AS share_revoked_at
        FROM score_assignments
        LEFT JOIN score_shares ON score_shares.id = score_assignments.share_id
        WHERE score_assignments.document_id = ?
        ORDER BY datetime(score_assignments.created_at) DESC
      `,
    )
    .all(documentId) as ScoreAssignmentRow[];
}

export function listScoreAssignmentsByShareToken(shareToken: string) {
  return db
    .prepare(
      `
        SELECT
          score_assignments.id,
          score_assignments.document_id,
          score_assignments.created_by_user_id,
          score_assignments.revision_id,
          score_assignments.share_id,
          score_assignments.classroom_id,
          score_assignments.title,
          score_assignments.instructions,
          score_assignments.due_at,
          score_assignments.rubric_json,
          score_assignments.practice_settings_json,
          score_assignments.status,
          score_assignments.created_at,
          score_assignments.updated_at,
          score_shares.share_token,
          score_shares.revoked_at AS share_revoked_at
        FROM score_assignments
        INNER JOIN score_shares ON score_shares.id = score_assignments.share_id
        WHERE score_shares.share_token = ?
        ORDER BY datetime(score_assignments.created_at) DESC
      `,
    )
    .all(shareToken) as ScoreAssignmentRow[];
}

export function archiveScoreAssignment(input: { assignmentId: string; documentId: string }) {
  const timestamp = nowIso();
  db.prepare(
    `
      UPDATE score_assignments
      SET status = 'archived', updated_at = ?
      WHERE id = ? AND document_id = ? AND status != 'archived'
    `,
  ).run(timestamp, input.assignmentId, input.documentId);

  return findScoreAssignmentById(input.assignmentId);
}

export function createScoreAssignmentSubmission(input: {
  assignmentId: string;
  documentId: string;
  studentId?: string | null;
  submitterName: string;
  submitterContact?: string | null;
  note?: string | null;
  recordingUrl?: string | null;
  performanceFileId?: string | null;
  practiceMinutes?: number | null;
  practiceSettings?: AssignmentPracticeSettings | null;
  performanceAnalysis?: Record<string, unknown> | null;
}) {
  const timestamp = nowIso();
  const submissionId = createId();
  const reviewToken = createId().replace(/-/g, "");

  db.prepare(
    `
      INSERT INTO score_assignment_submissions (
        id, assignment_id, document_id, student_id, submitter_name, submitter_contact, note, recording_url, performance_file_id,
        practice_minutes, practice_settings_json, performance_analysis_json, status, teacher_feedback, grade_score, grade_max, rubric_scores_json, review_token, submitted_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', NULL, NULL, NULL, NULL, ?, ?, ?)
    `,
  ).run(
    submissionId,
    input.assignmentId,
    input.documentId,
    input.studentId ?? null,
    input.submitterName,
    input.submitterContact ?? null,
    input.note ?? null,
    input.recordingUrl ?? null,
    input.performanceFileId ?? null,
    input.practiceMinutes ?? null,
    input.practiceSettings ? JSON.stringify(input.practiceSettings) : null,
    input.performanceAnalysis ? JSON.stringify(input.performanceAnalysis) : null,
    reviewToken,
    timestamp,
    timestamp,
  );

  return findScoreAssignmentSubmissionById(submissionId);
}

export function findScoreAssignmentSubmissionById(id: string) {
  return db
    .prepare(
      `
        SELECT
          score_assignment_submissions.id,
          score_assignment_submissions.assignment_id,
          score_assignment_submissions.document_id,
          score_assignment_submissions.student_id,
          score_assignment_submissions.submitter_name,
          score_assignment_submissions.submitter_contact,
          score_assignment_submissions.note,
          score_assignment_submissions.recording_url,
          score_assignment_submissions.performance_file_id,
          score_assignment_submissions.practice_minutes,
          score_assignment_submissions.practice_settings_json,
          score_assignment_submissions.performance_analysis_json,
          score_assignment_submissions.status,
          score_assignment_submissions.teacher_feedback,
          score_assignment_submissions.grade_score,
          score_assignment_submissions.grade_max,
          score_assignment_submissions.rubric_scores_json,
          score_assignment_submissions.review_token,
          score_assignment_submissions.submitted_at,
          score_assignment_submissions.updated_at,
          score_assignments.title AS assignment_title,
          files.original_name AS performance_file_original_name,
          files.mime_type AS performance_file_mime_type,
          files.size_bytes AS performance_file_size_bytes,
          files.created_at AS performance_file_created_at
        FROM score_assignment_submissions
        LEFT JOIN score_assignments ON score_assignments.id = score_assignment_submissions.assignment_id
        LEFT JOIN files ON files.id = score_assignment_submissions.performance_file_id
        WHERE score_assignment_submissions.id = ?
      `,
    )
    .get(id) as ScoreAssignmentSubmissionRow | undefined;
}

export function findScoreAssignmentSubmissionByReviewToken(reviewToken: string) {
  return db
    .prepare(
      `
        SELECT
          score_assignment_submissions.id,
          score_assignment_submissions.assignment_id,
          score_assignment_submissions.document_id,
          score_assignment_submissions.student_id,
          score_assignment_submissions.submitter_name,
          score_assignment_submissions.submitter_contact,
          score_assignment_submissions.note,
          score_assignment_submissions.recording_url,
          score_assignment_submissions.performance_file_id,
          score_assignment_submissions.practice_minutes,
          score_assignment_submissions.practice_settings_json,
          score_assignment_submissions.performance_analysis_json,
          score_assignment_submissions.status,
          score_assignment_submissions.teacher_feedback,
          score_assignment_submissions.grade_score,
          score_assignment_submissions.grade_max,
          score_assignment_submissions.rubric_scores_json,
          score_assignment_submissions.review_token,
          score_assignment_submissions.submitted_at,
          score_assignment_submissions.updated_at,
          score_assignments.title AS assignment_title,
          files.original_name AS performance_file_original_name,
          files.mime_type AS performance_file_mime_type,
          files.size_bytes AS performance_file_size_bytes,
          files.created_at AS performance_file_created_at
        FROM score_assignment_submissions
        LEFT JOIN score_assignments ON score_assignments.id = score_assignment_submissions.assignment_id
        LEFT JOIN files ON files.id = score_assignment_submissions.performance_file_id
        WHERE score_assignment_submissions.review_token = ?
      `,
    )
    .get(reviewToken) as ScoreAssignmentSubmissionRow | undefined;
}

export function listScoreAssignmentSubmissionsByDocumentId(documentId: string) {
  return db
    .prepare(
      `
        SELECT
          score_assignment_submissions.id,
          score_assignment_submissions.assignment_id,
          score_assignment_submissions.document_id,
          score_assignment_submissions.student_id,
          score_assignment_submissions.submitter_name,
          score_assignment_submissions.submitter_contact,
          score_assignment_submissions.note,
          score_assignment_submissions.recording_url,
          score_assignment_submissions.performance_file_id,
          score_assignment_submissions.practice_minutes,
          score_assignment_submissions.practice_settings_json,
          score_assignment_submissions.performance_analysis_json,
          score_assignment_submissions.status,
          score_assignment_submissions.teacher_feedback,
          score_assignment_submissions.grade_score,
          score_assignment_submissions.grade_max,
          score_assignment_submissions.rubric_scores_json,
          score_assignment_submissions.review_token,
          score_assignment_submissions.submitted_at,
          score_assignment_submissions.updated_at,
          score_assignments.title AS assignment_title,
          files.original_name AS performance_file_original_name,
          files.mime_type AS performance_file_mime_type,
          files.size_bytes AS performance_file_size_bytes,
          files.created_at AS performance_file_created_at
        FROM score_assignment_submissions
        LEFT JOIN score_assignments ON score_assignments.id = score_assignment_submissions.assignment_id
        LEFT JOIN files ON files.id = score_assignment_submissions.performance_file_id
        WHERE score_assignment_submissions.document_id = ?
        ORDER BY datetime(score_assignment_submissions.submitted_at) DESC
      `,
    )
    .all(documentId) as ScoreAssignmentSubmissionRow[];
}

export function getScoreAssignmentAnalytics(documentId: string) {
  const assignments = listScoreAssignmentsByDocumentId(documentId);
  const submissions = listScoreAssignmentSubmissionsByDocumentId(documentId);

  return assignments.map((assignment) => {
    const rubric = assignment.rubric_json ? (JSON.parse(assignment.rubric_json) as ScoreRubricCriterion[]) : [];
    const assignmentSubmissions = submissions.filter((submission) => submission.assignment_id === assignment.id);
    const reviewedSubmissions = assignmentSubmissions.filter((submission) => submission.status === "reviewed");
    const gradeScores = assignmentSubmissions.filter((submission) => submission.grade_score !== null && submission.grade_max !== null && submission.grade_max > 0);
    const averageGradePercent =
      gradeScores.length > 0
        ? Math.round((gradeScores.reduce((total, submission) => total + (submission.grade_score! / submission.grade_max!) * 100, 0) / gradeScores.length) * 10) / 10
        : null;

    const rubricAverages = rubric.map((criterion) => {
      const criterionScores = assignmentSubmissions
        .map((submission) => {
          const rubricScores = submission.rubric_scores_json ? (JSON.parse(submission.rubric_scores_json) as ScoreRubricScore[]) : [];
          return rubricScores.find((score) => score.criterionId === criterion.id)?.score ?? null;
        })
        .filter((score): score is number => score !== null);
      const averageScore =
        criterionScores.length > 0 ? Math.round((criterionScores.reduce((total, score) => total + score, 0) / criterionScores.length) * 10) / 10 : null;
      return {
        criterionId: criterion.id,
        label: criterion.label,
        maxScore: criterion.maxScore,
        averageScore,
        scoredCount: criterionScores.length,
      };
    });

    return {
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      submissionCount: assignmentSubmissions.length,
      reviewedCount: reviewedSubmissions.length,
      gradedCount: gradeScores.length,
      averageGradePercent,
      rubricAverages,
    };
  });
}

export function reviewScoreAssignmentSubmission(input: {
  submissionId: string;
  documentId: string;
  teacherFeedback?: string | null;
  gradeScore?: number | null;
  gradeMax?: number | null;
  rubricScores?: ScoreRubricScore[] | null;
}) {
  const timestamp = nowIso();
  db.prepare(
    `
      UPDATE score_assignment_submissions
      SET status = 'reviewed', teacher_feedback = ?, grade_score = ?, grade_max = ?, rubric_scores_json = ?, updated_at = ?
      WHERE id = ? AND document_id = ?
    `,
  ).run(
    input.teacherFeedback ?? null,
    input.gradeScore ?? null,
    input.gradeMax ?? null,
    input.rubricScores && input.rubricScores.length > 0 ? JSON.stringify(input.rubricScores) : null,
    timestamp,
    input.submissionId,
    input.documentId,
  );

  return findScoreAssignmentSubmissionById(input.submissionId);
}

export function findSharedScoreByToken(shareToken: string) {
  return db
    .prepare(
      `
        SELECT
          score_shares.id,
          score_shares.document_id,
          score_shares.created_by_user_id,
          score_shares.share_token,
          score_shares.permission,
          score_shares.label,
          score_shares.expires_at,
          score_shares.revoked_at,
          score_shares.created_at,
          score_shares.updated_at,
          score_documents.title AS score_title,
          score_documents.status AS score_status,
          score_documents.current_revision_id,
          score_documents.source_file_id,
          score_documents.created_at AS score_created_at,
          score_documents.updated_at AS score_updated_at,
          score_revisions.id AS revision_id,
          score_revisions.revision_number,
          score_revisions.score_json,
          score_revisions.musicxml_file_id,
          score_revisions.created_from,
          score_revisions.created_at AS revision_created_at
        FROM score_shares
        INNER JOIN score_documents ON score_documents.id = score_shares.document_id
        LEFT JOIN score_revisions ON score_revisions.id = score_documents.current_revision_id
        WHERE score_shares.share_token = ?
      `,
    )
    .get(shareToken) as SharedScoreRow | undefined;
}

export function createScoreRevisionFromScoreJson(input: {
  documentId: string;
  scoreJson: ScoreJson;
  createdFrom: ScoreRevisionSource;
  musicxmlFileId?: string | null;
}) {
  const document = findScoreDocumentById(input.documentId);
  if (document?.pending_revision_id) {
    return createCandidateScoreRevisionFromScoreJson({
      documentId: input.documentId,
      scoreJson: input.scoreJson,
      createdFrom: input.createdFrom,
      musicxmlFileId: input.musicxmlFileId,
    });
  }

  const timestamp = nowIso();
  const revisionId = createId();
  const nextRevisionNumber =
    (db
      .prepare(
        `
          SELECT COALESCE(MAX(revision_number), 0) + 1 AS next_revision_number
          FROM score_revisions
          WHERE document_id = ?
        `,
      )
      .get(input.documentId) as { next_revision_number: number }).next_revision_number ?? 1;

  db.exec("BEGIN");

  try {
    db.prepare(
      `
        INSERT INTO score_revisions (
          id, document_id, revision_number, score_json, musicxml_file_id, created_from, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      revisionId,
      input.documentId,
      nextRevisionNumber,
      JSON.stringify(input.scoreJson),
      input.musicxmlFileId ?? null,
      input.createdFrom,
      timestamp,
    );

    db.prepare(
      `
        UPDATE score_documents
        SET current_revision_id = ?, status = 'ready', updated_at = ?
        WHERE id = ?
      `,
    ).run(revisionId, timestamp, input.documentId);

    db.prepare(
      `
        UPDATE score_assets
        SET stale_at = COALESCE(stale_at, ?)
        WHERE document_id = ?
          AND revision_id IS NOT NULL
          AND revision_id <> ?
      `,
    ).run(timestamp, input.documentId, revisionId);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return findScoreRevisionById(revisionId);
}

function collaborationCommandSelect() {
  return `
    SELECT id, document_id, actor_id, actor_role, base_revision_id, applied_revision_id,
           command_type, target_scopes_json, command_json, status,
           conflicting_command_ids_json, conflict_reason, created_at
    FROM score_collaboration_commands
  `;
}

export type CanonicalScoreCommandApplyResult = {
  status: "applied" | "merged" | "duplicate" | "conflict" | "idempotency_mismatch" | "invalid_base" | "unavailable" | "forbidden" | "target_unavailable";
  command: ScoreCollaborationCommandRow | null;
  revision: ScoreRevisionRow | null;
};

export function applyCanonicalScoreCollaborationCommand(input: {
  operationId: string;
  documentId: string;
  actorId: string;
  actorRole: "owner" | "editor";
  baseRevisionId: string;
  command: CanonicalScoreCommand;
}): CanonicalScoreCommandApplyResult {
  const commandJson = JSON.stringify(input.command);
  const timestamp = nowIso();
  db.exec("BEGIN IMMEDIATE");

  try {
    const existing = db.prepare(`${collaborationCommandSelect()} WHERE id = ?`).get(input.operationId) as ScoreCollaborationCommandRow | undefined;
    if (existing) {
      const matches =
        existing.document_id === input.documentId &&
        existing.actor_id === input.actorId &&
        existing.actor_role === input.actorRole &&
        existing.base_revision_id === input.baseRevisionId &&
        existing.command_json === commandJson;
      db.exec("COMMIT");
      return {
        status: matches ? (existing.status === "conflict" ? "conflict" : "duplicate") : "idempotency_mismatch",
        command: existing,
        revision: existing.applied_revision_id ? findScoreRevisionById(existing.applied_revision_id) ?? null : null,
      };
    }

    const document = db.prepare(`${scoreDocumentSelect()} WHERE id = ?`).get(input.documentId) as ScoreDocumentRow | undefined;
    const baseRevision = db
      .prepare(`${scoreRevisionSelect()} WHERE id = ? AND document_id = ?`)
      .get(input.baseRevisionId, input.documentId) as ScoreRevisionRow | undefined;
    if (!document?.current_revision_id || document.pending_revision_id || !baseRevision || baseRevision.status !== "accepted") {
      db.exec("ROLLBACK");
      return { status: baseRevision ? "unavailable" : "invalid_base", command: null, revision: null };
    }
    const currentRevision = db
      .prepare(`${scoreRevisionSelect()} WHERE id = ? AND document_id = ? AND status = 'accepted'`)
      .get(document.current_revision_id, document.id) as ScoreRevisionRow | undefined;
    if (!currentRevision || baseRevision.revision_number > currentRevision.revision_number) {
      db.exec("ROLLBACK");
      return { status: "invalid_base", command: null, revision: null };
    }

    const baseScore = migrateScoreJson(JSON.parse(baseRevision.score_json));
    const targetScopes = canonicalScoreCommandScopes(baseScore, input.command);
    const laterRevisions = db
      .prepare(
        `${scoreRevisionSelect()}
         WHERE document_id = ? AND status = 'accepted' AND revision_number > ? AND revision_number <= ?
         ORDER BY revision_number ASC`,
      )
      .all(document.id, baseRevision.revision_number, currentRevision.revision_number) as ScoreRevisionRow[];
    const appliedCommands = db
      .prepare(`${collaborationCommandSelect()} WHERE document_id = ? AND status IN ('applied', 'merged')`)
      .all(document.id) as ScoreCollaborationCommandRow[];
    const commandByRevision = new Map(appliedCommands.filter((item) => item.applied_revision_id).map((item) => [item.applied_revision_id!, item]));
    const untrackedRevision = laterRevisions.find((revision) => !commandByRevision.has(revision.id));
    const overlappingCommands = laterRevisions
      .map((revision) => commandByRevision.get(revision.id))
      .filter((item): item is ScoreCollaborationCommandRow => Boolean(item))
      .filter((item) => scoreCommandScopesOverlap(targetScopes, JSON.parse(item.target_scopes_json) as string[]));
    const conflictReason = untrackedRevision ? "revision-history-diverged" : overlappingCommands.length > 0 ? "target-overlap" : null;

    const insertCommand = (status: ScoreCollaborationCommandRow["status"], appliedRevisionId: string | null, reason: string | null) => {
      db.prepare(
        `INSERT INTO score_collaboration_commands (
           id, document_id, actor_id, actor_role, base_revision_id, applied_revision_id,
           command_type, target_scopes_json, command_json, status,
           conflicting_command_ids_json, conflict_reason, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        input.operationId,
        document.id,
        input.actorId,
        input.actorRole,
        baseRevision.id,
        appliedRevisionId,
        canonicalScoreCommandLabel(input.command),
        JSON.stringify(targetScopes),
        commandJson,
        status,
        JSON.stringify(overlappingCommands.map((item) => item.id).sort()),
        reason,
        timestamp,
      );
    };

    if (conflictReason) {
      insertCommand("conflict", null, conflictReason);
      const conflict = db.prepare(`${collaborationCommandSelect()} WHERE id = ?`).get(input.operationId) as ScoreCollaborationCommandRow;
      db.exec("COMMIT");
      return { status: "conflict", command: conflict, revision: null };
    }

    let editedScoreJson: ScoreJson;
    try {
      editedScoreJson = applyCanonicalScoreCommand(migrateScoreJson(JSON.parse(currentRevision.score_json)), input.command);
    } catch {
      insertCommand("conflict", null, "command-no-longer-applicable");
      const conflict = db.prepare(`${collaborationCommandSelect()} WHERE id = ?`).get(input.operationId) as ScoreCollaborationCommandRow;
      db.exec("COMMIT");
      return { status: "conflict", command: conflict, revision: null };
    }

    const revisionId = createId();
    const nextRevisionNumber =
      (db.prepare("SELECT COALESCE(MAX(revision_number), 0) + 1 AS next_revision_number FROM score_revisions WHERE document_id = ?")
        .get(document.id) as { next_revision_number: number }).next_revision_number ?? currentRevision.revision_number + 1;
    db.prepare(
      `INSERT INTO score_revisions (
         id, document_id, revision_number, score_json, musicxml_file_id, created_from, status, created_at
       ) VALUES (?, ?, ?, ?, NULL, 'manual_edit', 'accepted', ?)`,
    ).run(revisionId, document.id, nextRevisionNumber, JSON.stringify(editedScoreJson), timestamp);
    const updated = db.prepare(
      "UPDATE score_documents SET current_revision_id = ?, status = 'ready', updated_at = ? WHERE id = ? AND current_revision_id = ? AND pending_revision_id IS NULL",
    ).run(revisionId, timestamp, document.id, currentRevision.id);
    if (updated.changes !== 1) throw new Error("Score revision changed during collaboration command commit.");
    db.prepare(
      "UPDATE score_assets SET stale_at = COALESCE(stale_at, ?) WHERE document_id = ? AND revision_id IS NOT NULL AND revision_id <> ?",
    ).run(timestamp, document.id, revisionId);
    const status = baseRevision.id === currentRevision.id ? "applied" : "merged";
    insertCommand(status, revisionId, null);
    const storedCommand = db.prepare(`${collaborationCommandSelect()} WHERE id = ?`).get(input.operationId) as ScoreCollaborationCommandRow;
    const revision = db.prepare(`${scoreRevisionSelect()} WHERE id = ?`).get(revisionId) as ScoreRevisionRow;
    db.exec("COMMIT");
    return { status, command: storedCommand, revision };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function listScoreCollaborationCommandsByDocumentId(documentId: string, limit = 100) {
  const safeLimit = Math.max(1, Math.min(200, Math.round(limit)));
  return db
    .prepare(`${collaborationCommandSelect()} WHERE document_id = ? ORDER BY datetime(created_at) DESC, rowid DESC LIMIT ?`)
    .all(documentId, safeLimit) as ScoreCollaborationCommandRow[];
}

export function applyScoreCollaborationHistoryCommand(input: {
  operationId: string;
  documentId: string;
  actorId: string;
  actorRole: "owner" | "editor";
  baseRevisionId: string;
  action: ScoreCollaborationHistoryAction;
  targetOperationId: string;
}): CanonicalScoreCommandApplyResult {
  const timestamp = nowIso();
  const historyType = `history.${input.action}` as const;
  db.exec("BEGIN IMMEDIATE");

  try {
    const existing = db.prepare(`${collaborationCommandSelect()} WHERE id = ?`).get(input.operationId) as ScoreCollaborationCommandRow | undefined;
    if (existing) {
      const existingCommand = parseHistoryCommand(existing.command_json);
      const matches =
        existing.document_id === input.documentId &&
        existing.actor_id === input.actorId &&
        existing.actor_role === input.actorRole &&
        existing.base_revision_id === input.baseRevisionId &&
        existingCommand?.type === historyType &&
        existingCommand.targetOperationId === input.targetOperationId;
      db.exec("COMMIT");
      return {
        status: matches ? (existing.status === "conflict" ? "conflict" : "duplicate") : "idempotency_mismatch",
        command: existing,
        revision: existing.applied_revision_id ? findScoreRevisionById(existing.applied_revision_id) ?? null : null,
      };
    }

    const document = db.prepare(`${scoreDocumentSelect()} WHERE id = ?`).get(input.documentId) as ScoreDocumentRow | undefined;
    const baseRevision = db
      .prepare(`${scoreRevisionSelect()} WHERE id = ? AND document_id = ? AND status = 'accepted'`)
      .get(input.baseRevisionId, input.documentId) as ScoreRevisionRow | undefined;
    if (!document?.current_revision_id || document.pending_revision_id || !baseRevision) {
      db.exec("ROLLBACK");
      return { status: baseRevision ? "unavailable" : "invalid_base", command: null, revision: null };
    }
    const currentRevision = db
      .prepare(`${scoreRevisionSelect()} WHERE id = ? AND document_id = ? AND status = 'accepted'`)
      .get(document.current_revision_id, document.id) as ScoreRevisionRow | undefined;
    if (!currentRevision || baseRevision.revision_number > currentRevision.revision_number) {
      db.exec("ROLLBACK");
      return { status: "invalid_base", command: null, revision: null };
    }

    const targetCommand = db
      .prepare(`${collaborationCommandSelect()} WHERE id = ? AND document_id = ? AND status IN ('applied', 'merged')`)
      .get(input.targetOperationId, document.id) as ScoreCollaborationCommandRow | undefined;
    if (!targetCommand?.applied_revision_id) {
      db.exec("ROLLBACK");
      return { status: "target_unavailable", command: null, revision: null };
    }
    if (targetCommand.actor_id !== input.actorId) {
      db.exec("ROLLBACK");
      return { status: "forbidden", command: null, revision: null };
    }
    if ((input.action === "redo" && targetCommand.command_type !== "history.undo") || (input.action === "undo" && targetCommand.command_type === "history.undo")) {
      db.exec("ROLLBACK");
      return { status: "target_unavailable", command: null, revision: null };
    }

    const targetAppliedRevision = db
      .prepare(`${scoreRevisionSelect()} WHERE id = ? AND document_id = ? AND status = 'accepted'`)
      .get(targetCommand.applied_revision_id, document.id) as ScoreRevisionRow | undefined;
    if (!targetAppliedRevision) {
      db.exec("ROLLBACK");
      return { status: "target_unavailable", command: null, revision: null };
    }
    const targetBeforeRevision = db
      .prepare(`${scoreRevisionSelect()} WHERE document_id = ? AND status = 'accepted' AND revision_number < ? ORDER BY revision_number DESC LIMIT 1`)
      .get(document.id, targetAppliedRevision.revision_number) as ScoreRevisionRow | undefined;
    if (!targetBeforeRevision) {
      db.exec("ROLLBACK");
      return { status: "target_unavailable", command: null, revision: null };
    }

    const beforeScore = migrateScoreJson(JSON.parse(targetBeforeRevision.score_json));
    const afterScore = migrateScoreJson(JSON.parse(targetAppliedRevision.score_json));
    const currentScore = migrateScoreJson(JSON.parse(currentRevision.score_json));
    const targetCommandJson = JSON.parse(targetCommand.command_json) as unknown;
    const affectedEventIds = affectedEventIdsForHistory({ before: beforeScore, after: afterScore, commandJson: targetCommandJson });
    if (affectedEventIds.length === 0) {
      db.exec("ROLLBACK");
      return { status: "target_unavailable", command: null, revision: null };
    }
    const affectedEventSet = new Set(affectedEventIds);
    const affectedMeasureIds = new Set(
      [...beforeScore.measures, ...afterScore.measures]
        .filter((measure) => measure.events.some((event) => affectedEventSet.has(event.id)))
        .map((measure) => measure.id),
    );
    const targetScopes = [
      ...affectedEventIds.map((eventId) => `event:${eventId}`),
      ...[...affectedMeasureIds].map((measureId) => `measure:${measureId}`),
    ].sort();
    const historyCommand: ScoreCollaborationHistoryCommand = {
      type: historyType,
      targetOperationId: targetCommand.id,
      affectedEventIds,
    };
    const commandJson = JSON.stringify(historyCommand);
    const laterCommands = db
      .prepare(
        `${collaborationCommandSelect()}
         WHERE document_id = ? AND status IN ('applied', 'merged') AND applied_revision_id IN (
           SELECT id FROM score_revisions WHERE document_id = ? AND revision_number > ? AND revision_number <= ?
         )`,
      )
      .all(document.id, document.id, targetAppliedRevision.revision_number, currentRevision.revision_number) as ScoreCollaborationCommandRow[];
    const conflictingCommandIds = laterCommands
      .filter((command) => scoreCommandScopesOverlap(targetScopes, JSON.parse(command.target_scopes_json) as string[]))
      .map((command) => command.id)
      .sort();
    const insertHistoryCommand = (status: ScoreCollaborationCommandRow["status"], appliedRevisionId: string | null, reason: string | null) => {
      db.prepare(
        `INSERT INTO score_collaboration_commands (
           id, document_id, actor_id, actor_role, base_revision_id, applied_revision_id,
           command_type, target_scopes_json, command_json, status,
           conflicting_command_ids_json, conflict_reason, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        input.operationId,
        document.id,
        input.actorId,
        input.actorRole,
        baseRevision.id,
        appliedRevisionId,
        historyType,
        JSON.stringify(targetScopes),
        commandJson,
        status,
        JSON.stringify(conflictingCommandIds),
        reason,
        timestamp,
      );
    };

    let reversedScore: ScoreJson;
    try {
      reversedScore = selectivelyReverseScoreOperation({
        before: beforeScore,
        after: afterScore,
        current: currentScore,
        affectedEventIds,
        action: input.action,
        targetOperationId: targetCommand.id,
        generatedAt: timestamp,
      });
    } catch (error) {
      if (!(error instanceof ScoreHistoryConflictError)) throw error;
      insertHistoryCommand("conflict", null, "history-target-changed");
      const conflict = db.prepare(`${collaborationCommandSelect()} WHERE id = ?`).get(input.operationId) as ScoreCollaborationCommandRow;
      db.exec("COMMIT");
      return { status: "conflict", command: conflict, revision: null };
    }

    const revisionId = createId();
    const nextRevisionNumber =
      (db.prepare("SELECT COALESCE(MAX(revision_number), 0) + 1 AS next_revision_number FROM score_revisions WHERE document_id = ?")
        .get(document.id) as { next_revision_number: number }).next_revision_number ?? currentRevision.revision_number + 1;
    db.prepare(
      `INSERT INTO score_revisions (
         id, document_id, revision_number, score_json, musicxml_file_id, created_from, status, created_at
       ) VALUES (?, ?, ?, ?, NULL, 'manual_edit', 'accepted', ?)`,
    ).run(revisionId, document.id, nextRevisionNumber, JSON.stringify(reversedScore), timestamp);
    const updated = db.prepare(
      "UPDATE score_documents SET current_revision_id = ?, status = 'ready', updated_at = ? WHERE id = ? AND current_revision_id = ? AND pending_revision_id IS NULL",
    ).run(revisionId, timestamp, document.id, currentRevision.id);
    if (updated.changes !== 1) throw new Error("Score revision changed during collaboration history commit.");
    db.prepare(
      "UPDATE score_assets SET stale_at = COALESCE(stale_at, ?) WHERE document_id = ? AND revision_id IS NOT NULL AND revision_id <> ?",
    ).run(timestamp, document.id, revisionId);
    const status = baseRevision.id === currentRevision.id ? "applied" : "merged";
    insertHistoryCommand(status, revisionId, null);
    const storedCommand = db.prepare(`${collaborationCommandSelect()} WHERE id = ?`).get(input.operationId) as ScoreCollaborationCommandRow;
    const revision = db.prepare(`${scoreRevisionSelect()} WHERE id = ?`).get(revisionId) as ScoreRevisionRow;
    db.exec("COMMIT");
    return { status, command: storedCommand, revision };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function parseHistoryCommand(commandJson: string) {
  try {
    const parsed = JSON.parse(commandJson) as Record<string, unknown>;
    if (
      (parsed.type === "history.undo" || parsed.type === "history.redo") &&
      typeof parsed.targetOperationId === "string" &&
      Array.isArray(parsed.affectedEventIds)
    ) {
      return parsed as ScoreCollaborationHistoryCommand;
    }
  } catch {
    // Legacy and malformed rows are not valid history commands.
  }
  return null;
}

export function createCandidateScoreRevisionFromScoreJson(input: {
  documentId: string;
  scoreJson: ScoreJson;
  createdFrom: ScoreRevisionSource;
  musicxmlFileId?: string | null;
}) {
  const timestamp = nowIso();
  const revisionId = createId();
  const nextRevisionNumber =
    (db
      .prepare(
        `
          SELECT COALESCE(MAX(revision_number), 0) + 1 AS next_revision_number
          FROM score_revisions
          WHERE document_id = ?
        `,
      )
      .get(input.documentId) as { next_revision_number: number }).next_revision_number ?? 1;

  db.exec("BEGIN");
  try {
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
        VALUES (?, ?, ?, ?, ?, ?, 'candidate', ?)
      `,
    ).run(
      revisionId,
      input.documentId,
      nextRevisionNumber,
      JSON.stringify(input.scoreJson),
      input.musicxmlFileId ?? null,
      input.createdFrom,
      timestamp,
    );

    db.prepare(
      `
        UPDATE score_documents
        SET pending_revision_id = ?, status = 'needs_review', updated_at = ?
        WHERE id = ?
      `,
    ).run(revisionId, timestamp, input.documentId);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return findScoreRevisionById(revisionId);
}

export function acceptPendingScoreRevision(input: { documentId: string; pendingRevisionId?: string | null }) {
  const timestamp = nowIso();
  const acceptedRevisionId = createId();

  db.exec("BEGIN");
  try {
    const document = db
      .prepare(`${scoreDocumentSelect()} WHERE id = ?`)
      .get(input.documentId) as ScoreDocumentRow | undefined;
    if (!document?.pending_revision_id || (input.pendingRevisionId && input.pendingRevisionId !== document.pending_revision_id)) {
      db.exec("ROLLBACK");
      return undefined;
    }

    const candidate = db
      .prepare(`${scoreRevisionSelect()} WHERE id = ? AND document_id = ? AND status = 'candidate'`)
      .get(document.pending_revision_id, document.id) as ScoreRevisionRow | undefined;
    if (!candidate) {
      db.exec("ROLLBACK");
      return undefined;
    }

    const nextRevisionNumber =
      (db
        .prepare(
          `
            SELECT COALESCE(MAX(revision_number), 0) + 1 AS next_revision_number
            FROM score_revisions
            WHERE document_id = ?
          `,
        )
        .get(document.id) as { next_revision_number: number }).next_revision_number ?? candidate.revision_number + 1;

    db.prepare(
      `
        INSERT INTO score_revisions (
          id, document_id, revision_number, score_json, musicxml_file_id, created_from, status, created_at
        )
        VALUES (?, ?, ?, ?, ?, 'candidate_accept', 'accepted', ?)
      `,
    ).run(acceptedRevisionId, document.id, nextRevisionNumber, candidate.score_json, candidate.musicxml_file_id, timestamp);

    db.prepare("UPDATE score_revisions SET status = 'superseded' WHERE id = ?").run(candidate.id);
    db.prepare(
      `
        UPDATE score_documents
        SET current_revision_id = ?, pending_revision_id = NULL, status = 'ready', updated_at = ?
        WHERE id = ?
      `,
    ).run(acceptedRevisionId, timestamp, document.id);

    db.prepare(
      `
        UPDATE score_assets
        SET stale_at = COALESCE(stale_at, ?)
        WHERE document_id = ?
          AND revision_id IS NOT NULL
          AND revision_id <> ?
      `,
    ).run(timestamp, document.id, acceptedRevisionId);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return {
    document: findScoreDocumentById(input.documentId),
    revision: findScoreRevisionById(acceptedRevisionId),
  };
}

export function rejectPendingScoreRevision(input: { documentId: string; pendingRevisionId?: string | null }) {
  const timestamp = nowIso();

  db.exec("BEGIN");
  try {
    const document = db
      .prepare(`${scoreDocumentSelect()} WHERE id = ?`)
      .get(input.documentId) as ScoreDocumentRow | undefined;
    if (!document?.pending_revision_id || (input.pendingRevisionId && input.pendingRevisionId !== document.pending_revision_id)) {
      db.exec("ROLLBACK");
      return undefined;
    }

    const result = db
      .prepare("UPDATE score_revisions SET status = 'rejected' WHERE id = ? AND document_id = ? AND status = 'candidate'")
      .run(document.pending_revision_id, document.id);
    if (result.changes !== 1) {
      db.exec("ROLLBACK");
      return undefined;
    }

    db.prepare(
      `
        UPDATE score_documents
        SET pending_revision_id = NULL,
            status = CASE WHEN current_revision_id IS NULL THEN 'candidate' ELSE 'ready' END,
            updated_at = ?
        WHERE id = ?
      `,
    ).run(timestamp, document.id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return findScoreDocumentById(input.documentId);
}

export function createScoreAsset(input: {
  documentId: string;
  fileId: string;
  assetKind: StoredFileKind;
  revisionId?: string | null;
  params?: Record<string, unknown> | null;
  engine?: Record<string, unknown> | null;
  checksumSha256?: string | null;
}) {
  db.prepare(
    `
      INSERT INTO score_assets (
        id, document_id, file_id, asset_kind, revision_id, params_json, engine_json, checksum_sha256, stale_at, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
    `,
  ).run(
    createId(),
    input.documentId,
    input.fileId,
    input.assetKind,
    input.revisionId ?? null,
    input.params ? JSON.stringify(input.params) : null,
    input.engine ? JSON.stringify(input.engine) : null,
    input.checksumSha256 ?? null,
    nowIso(),
  );
}

export function createScoreExportJob(input: {
  userId: string;
  documentId: string;
  params: Record<string, unknown>;
}) {
  assertProcessingQuota(input.userId);
  const timestamp = nowIso();
  const jobId = createId();
  const context = currentRequestContext();
  db.prepare(
    `
      INSERT INTO score_jobs (
        id, user_id, document_id, input_file_id, job_type, status, params_json,
        result_revision_id, output_file_ids_json, error_message, attempt_count,
        progress_percent, cancel_requested_at, request_id, trace_id, created_at, updated_at, started_at, completed_at
      )
      VALUES (?, ?, ?, NULL, 'render_export', 'queued', ?, NULL, NULL, NULL, 0, 0, NULL, ?, ?, ?, ?, NULL, NULL)
    `,
  ).run(jobId, input.userId, input.documentId, JSON.stringify(input.params), context?.requestId ?? null, context?.traceId ?? null, timestamp, timestamp);
  return findScoreJobById(jobId);
}

export function cancelScoreJob(input: { jobId: string; userId: string; documentId: string }) {
  const timestamp = nowIso();
  const result = db.prepare(
    `
      UPDATE score_jobs
      SET status = 'cancelled', cancel_requested_at = ?, updated_at = ?, completed_at = ?, progress_percent = 0
      WHERE id = ? AND user_id = ? AND document_id = ?
        AND job_type IN ('omr_import', 'audio_transcribe', 'render_export')
        AND status IN ('queued', 'processing')
    `,
  ).run(timestamp, timestamp, timestamp, input.jobId, input.userId, input.documentId);
  return result.changes === 1 ? findScoreJobById(input.jobId) : undefined;
}

export function retryScoreJob(input: { jobId: string; userId: string; documentId: string }) {
  const timestamp = nowIso();
  const result = db.prepare(
    `
      UPDATE score_jobs
      SET status = 'queued', error_message = NULL, output_file_ids_json = NULL,
          result_revision_id = NULL, progress_percent = 0, cancel_requested_at = NULL,
          started_at = NULL, completed_at = NULL, updated_at = ?
      WHERE id = ? AND user_id = ? AND document_id = ? AND status IN ('failed', 'cancelled')
    `,
  ).run(timestamp, input.jobId, input.userId, input.documentId);
  return result.changes === 1 ? findScoreJobById(input.jobId) : undefined;
}

export function attachMusicXmlFileToRevision(input: {
  revisionId: string;
  musicxmlFileId: string;
}) {
  db.prepare(
    `
      UPDATE score_revisions
      SET musicxml_file_id = ?
      WHERE id = ?
    `,
  ).run(input.musicxmlFileId, input.revisionId);

  return findScoreRevisionById(input.revisionId);
}

export function mapScoreRevisionForApi(revision: ScoreRevisionRow) {
  return {
    id: revision.id,
    documentId: revision.document_id,
    revisionNumber: revision.revision_number,
    scoreJson: migrateScoreJson(JSON.parse(revision.score_json)),
    musicxmlFileId: revision.musicxml_file_id,
    createdFrom: revision.created_from,
    status: revision.status,
    createdAt: revision.created_at,
  };
}

export function mapScoreJobForApi(job: ScoreJobRow) {
  const queuePosition = job.status === "queued"
    ? (db.prepare(
        `
          SELECT COUNT(*) AS queue_position
          FROM score_jobs
          WHERE status = 'queued'
            AND (datetime(created_at) < datetime(?) OR (created_at = ? AND id <= ?))
        `,
      ).get(job.created_at, job.created_at, job.id) as { queue_position: number }).queue_position
    : null;
  return {
    id: job.id,
    userId: job.user_id,
    documentId: job.document_id,
    inputFileId: job.input_file_id,
    jobType: job.job_type,
    status: job.status,
    params: job.params_json ? JSON.parse(job.params_json) : null,
    resultRevisionId: job.result_revision_id,
    outputFileIds: job.output_file_ids_json ? JSON.parse(job.output_file_ids_json) : null,
    errorMessage: job.error_message,
    attemptCount: job.attempt_count,
    progressPercent: job.progress_percent,
    cancelRequestedAt: job.cancel_requested_at,
    requestId: job.request_id,
    traceId: job.trace_id,
    queuePosition,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
    startedAt: job.started_at,
    completedAt: job.completed_at,
  };
}

export function mapScoreAssetForApi(asset: ScoreAssetRow) {
  return {
    id: asset.id,
    documentId: asset.document_id,
    fileId: asset.file_id,
    assetKind: asset.asset_kind,
    revisionId: asset.revision_id,
    params: asset.params_json ? JSON.parse(asset.params_json) : null,
    engine: asset.engine_json ? JSON.parse(asset.engine_json) : null,
    checksumSha256: asset.checksum_sha256,
    staleAt: asset.stale_at,
    isStale: asset.stale_at !== null,
    createdAt: asset.created_at,
    file: {
      id: asset.file_id,
      originalName: asset.original_name,
      mimeType: asset.mime_type,
      sizeBytes: asset.size_bytes,
      fileKind: asset.file_kind,
      createdAt: asset.file_created_at,
    },
  };
}

export function mapOmrDiagnosticForApi(diagnostic: OmrDiagnosticRow) {
  return {
    id: diagnostic.id,
    jobId: diagnostic.job_id,
    documentId: diagnostic.document_id,
    diagnostics: JSON.parse(diagnostic.diagnostics_json) as Record<string, unknown>,
    confidence: diagnostic.confidence,
    sourcePageCount: diagnostic.source_page_count,
    createdAt: diagnostic.created_at,
  };
}

export function mapScoreCommentForApi(comment: ScoreCommentRow) {
  const authorIdentity = scoreCommentAuthorIdentity(comment);
  return {
    id: comment.id,
    documentId: comment.document_id,
    authorUserId: comment.share_id ? null : comment.user_id,
    authorShareId: comment.share_id,
    author: authorIdentity,
    body: comment.body,
    target: comment.target_json ? (JSON.parse(comment.target_json) as Record<string, unknown>) : null,
    resolvedAt: comment.resolved_at,
    resolvedByUserId: comment.resolved_by_user_id,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
  };
}

export function mapScoreShareForApi(share: ScoreShareRow) {
  return {
    id: share.id,
    documentId: share.document_id,
    token: share.share_token,
    permission: share.permission,
    label: share.label,
    expiresAt: share.expires_at,
    revokedAt: share.revoked_at,
    createdAt: share.created_at,
    updatedAt: share.updated_at,
  };
}

export function mapScoreCollaborationCommandForApi(command: ScoreCollaborationCommandRow) {
  const history = parseHistoryCommand(command.command_json);
  return {
    id: command.id,
    documentId: command.document_id,
    actorId: command.actor_id,
    actorRole: command.actor_role,
    actor: scoreCollaborationActorIdentity(command.actor_id, command.actor_role),
    baseRevisionId: command.base_revision_id,
    appliedRevisionId: command.applied_revision_id,
    commandType: command.command_type,
    targetScopes: JSON.parse(command.target_scopes_json) as string[],
    status: command.status,
    conflictingCommandIds: JSON.parse(command.conflicting_command_ids_json) as string[],
    conflictReason: command.conflict_reason,
    history: history
      ? { action: history.type === "history.undo" ? "undo" : "redo", targetOperationId: history.targetOperationId, affectedEventIds: history.affectedEventIds }
      : null,
    createdAt: command.created_at,
  };
}

function scoreCommentAuthorIdentity(comment: ScoreCommentRow) {
  if (comment.share_id) {
    const share = db.prepare("SELECT label, permission FROM score_shares WHERE id = ?").get(comment.share_id) as { label: string | null; permission: string } | undefined;
    return {
      kind: "share_link" as const,
      displayName: comment.author_name || share?.label || `Shared ${share?.permission ?? "comment"} link`,
      verification: "share_link" as const,
    };
  }
  const user = db.prepare("SELECT email FROM users WHERE id = ?").get(comment.user_id) as { email: string } | undefined;
  return {
    kind: "account" as const,
    displayName: comment.author_name || maskAccountEmail(user?.email) || "Account user",
    verification: "account" as const,
  };
}

function scoreCollaborationActorIdentity(actorId: string, actorRole: string) {
  if (actorId.startsWith("share:")) {
    const shareId = actorId.slice("share:".length);
    const share = db.prepare("SELECT label, permission FROM score_shares WHERE id = ?").get(shareId) as { label: string | null; permission: string } | undefined;
    return {
      kind: "share_link" as const,
      displayName: share?.label || `Shared ${share?.permission ?? actorRole} link`,
      verification: "share_link" as const,
    };
  }
  const user = db.prepare("SELECT email FROM users WHERE id = ?").get(actorId) as { email: string } | undefined;
  return {
    kind: "account" as const,
    displayName: maskAccountEmail(user?.email) || "Account user",
    verification: "account" as const,
  };
}

function maskAccountEmail(email: string | undefined) {
  if (!email) return null;
  const [local, domain] = email.split("@");
  if (!local || !domain) return "Verified account";
  return `${local.slice(0, 2)}***@${domain}`;
}

export function mapScoreRubricTemplateForApi(template: ScoreRubricTemplateRow) {
  return {
    id: template.id,
    userId: template.user_id,
    name: template.name,
    rubric: JSON.parse(template.rubric_json) as ScoreRubricCriterion[],
    createdAt: template.created_at,
    updatedAt: template.updated_at,
  };
}

export function mapScoreClassroomForApi(classroom: ScoreClassroomRow) {
  return {
    id: classroom.id,
    ownerUserId: classroom.owner_user_id,
    organizationId: classroom.organization_id,
    campusId: classroom.campus_id,
    name: classroom.name,
    description: classroom.description,
    createdAt: classroom.created_at,
    updatedAt: classroom.updated_at,
    archivedAt: classroom.archived_at,
  };
}

export function mapScoreClassroomStudentForApi(student: ScoreClassroomStudentRow) {
  return {
    id: student.id,
    classroomId: student.classroom_id,
    displayName: student.display_name,
    contactEmail: student.contact_email,
    userId: student.user_id,
    externalRef: student.external_ref,
    status: student.status,
    createdAt: student.created_at,
    updatedAt: student.updated_at,
  };
}

export function mapScoreAssignmentForApi(assignment: ScoreAssignmentRow) {
  return {
    id: assignment.id,
    documentId: assignment.document_id,
    createdByUserId: assignment.created_by_user_id,
    revisionId: assignment.revision_id,
    shareId: assignment.share_id,
    classroomId: assignment.classroom_id,
    shareToken: assignment.share_revoked_at ? null : assignment.share_token,
    title: assignment.title,
    instructions: assignment.instructions,
    dueAt: assignment.due_at,
    rubric: assignment.rubric_json ? (JSON.parse(assignment.rubric_json) as ScoreRubricCriterion[]) : [],
    practiceSettings: parseAssignmentPracticeSettings(assignment.practice_settings_json),
    status: assignment.status,
    createdAt: assignment.created_at,
    updatedAt: assignment.updated_at,
  };
}

export function mapPublicScoreAssignmentForApi(assignment: ScoreAssignmentRow) {
  return {
    id: assignment.id,
    revisionId: assignment.revision_id,
    title: assignment.title,
    instructions: assignment.instructions,
    dueAt: assignment.due_at,
    rubric: assignment.rubric_json ? (JSON.parse(assignment.rubric_json) as ScoreRubricCriterion[]) : [],
    practiceSettings: parseAssignmentPracticeSettings(assignment.practice_settings_json),
    status: assignment.status,
    createdAt: assignment.created_at,
  };
}

export function mapScoreAssignmentSubmissionForApi(submission: ScoreAssignmentSubmissionRow) {
  return {
    id: submission.id,
    assignmentId: submission.assignment_id,
    assignmentTitle: submission.assignment_title,
    documentId: submission.document_id,
    studentId: submission.student_id,
    submitterName: submission.submitter_name,
    submitterContact: submission.submitter_contact,
    note: submission.note,
    recordingUrl: submission.recording_url,
    performanceFileId: submission.performance_file_id,
    performanceFile: submission.performance_file_id
      ? {
          id: submission.performance_file_id,
          originalName: submission.performance_file_original_name ?? "performance-upload",
          mimeType: submission.performance_file_mime_type ?? "application/octet-stream",
          sizeBytes: submission.performance_file_size_bytes ?? 0,
          createdAt: submission.performance_file_created_at ?? submission.submitted_at,
        }
      : null,
    practiceMinutes: submission.practice_minutes,
    practiceSettings: parseAssignmentPracticeSettings(submission.practice_settings_json),
    performanceAnalysis: parsePerformanceAnalysis(submission.performance_analysis_json),
    status: submission.status,
    teacherFeedback: submission.teacher_feedback,
    gradeScore: submission.grade_score,
    gradeMax: submission.grade_max,
    rubricScores: submission.rubric_scores_json ? (JSON.parse(submission.rubric_scores_json) as ScoreRubricScore[]) : [],
    reviewToken: submission.review_token,
    submittedAt: submission.submitted_at,
    updatedAt: submission.updated_at,
  };
}

export function mapSharedScoreForApi(row: SharedScoreRow) {
  const revision =
    row.revision_id && row.score_json && row.revision_number !== null
      ? {
          id: row.revision_id,
          documentId: row.document_id,
          revisionNumber: row.revision_number,
          scoreJson: migrateScoreJson(JSON.parse(row.score_json)),
          musicxmlFileId: row.musicxml_file_id,
          createdFrom: row.created_from,
          createdAt: row.revision_created_at,
        }
      : null;

  return {
    share: mapScoreShareForApi(row),
    score: {
      id: row.document_id,
      title: row.score_title,
      status: row.score_status,
      sourceFileId: row.source_file_id,
      currentRevisionId: row.current_revision_id,
      createdAt: row.score_created_at,
      updatedAt: row.score_updated_at,
      settings: {},
      currentRevision: revision,
    },
  };
}

export function mapScoreDocumentForApi(document: ScoreDocumentRow) {
  const currentRevision = findCurrentRevisionForDocument(document);
  const pendingRevision = findPendingRevisionForDocument(document);

  return {
    id: document.id,
    userId: document.user_id,
    title: document.title,
    currentRevisionId: document.current_revision_id,
    pendingRevisionId: document.pending_revision_id,
    sourceFileId: document.source_file_id,
    settings: parseScoreProjectSettings(document.settings_json),
    status: document.status,
    createdAt: document.created_at,
    updatedAt: document.updated_at,
    currentRevision: currentRevision ? mapScoreRevisionForApi(currentRevision) : null,
    pendingRevision: pendingRevision ? mapScoreRevisionForApi(pendingRevision) : null,
  };
}
