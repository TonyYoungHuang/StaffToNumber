import fs from "node:fs";
import path from "node:path";
import { isIP } from "node:net";
import { spawn } from "node:child_process";
import {
  migrateScoreJson,
  SCORE_RANGE_PROFILES,
  TRANSPOSING_INSTRUMENT_PROFILES,
  type AssignmentPracticeSettings,
  type JianpuAccidentalStrategy,
  type JianpuMode,
  type JianpuPitchSystem,
  type ScoreJson,
  type ScoreExportFormat,
  type ScoreExportOptions,
  type ScoreExportSnapshot,
  type ScoreProjectSettings,
  type StoredFileKind,
  type TransposePitchMode,
  type TransposeSpellingPolicy,
} from "@score/shared";
import AdmZip from "adm-zip";
import { XMLParser } from "fast-xml-parser";
import type { FastifyInstance, FastifyReply } from "fastify";
import { config } from "../config.js";
import { db } from "../db.js";
import {
  assertFreeTrialOmrAvailable,
  FreeTrialLimitError,
  isFreeTrialScoreDocumentForUser,
} from "../lib/free-trial.js";
import { linkEducationInvitationsByEmail, listAccessibleClassroomIds, resolveClassroomAccess, resolveOrganizationRole } from "../lib/education-access.js";
import { createId } from "../lib/auth.js";
import { openStoredFile, storedFileExists } from "../lib/object-storage.js";
import { omrPdfRasterSafetyPolicy, storeVerifiedUpload, uploadErrorResponse, uploadKinds } from "../lib/upload-security.js";
import { scoreJsonToJianpu } from "../lib/jianpu-converter.js";
import { storeJianpuSourceText } from "../lib/jianpu-source-storage.js";
import { applyScoreClefRecommendations, recommendScoreClefs } from "../lib/score-clef-recommendation.js";
import {
  applyScoreBarlinePatch,
  applyScoreDynamicPatch,
  applyScoreEventBatchPatch,
  applyScoreEventDeletePatch,
  applyScoreEventReorderPatch,
  applyScoreHarmonyPatch,
  applyScoreMeasureAttributesPatch,
  applyScoreNoteInsertPatch,
  applyScoreNotePatch,
  applyScorePartPatch,
  applyScoreTempoPatch,
  applyScoreWedgePatch,
  validateScoreBarlinePatch,
  validateScoreDynamicPatch,
  validateScoreEventBatchPatch,
  validateScoreEventDeletePatch,
  validateScoreEventReorderPatch,
  validateScoreHarmonyPatch,
  validateScoreMeasureAttributesPatch,
  validateScoreNoteInsertPatch,
  validateScoreNotePatch,
  validateScorePartPatch,
  validateScoreTempoPatch,
  validateScoreWedgePatch,
} from "../lib/score-edit.js";
import { convertWavToMp3File, playbackToWavFile, renderMidiToWavWithFluidSynth } from "../lib/score-audio-export.js";
import { validatePracticePerformanceAnalysis } from "../lib/practice-performance-analysis-validation.js";
import { extractScoreParts } from "../lib/score-part-extract.js";
import { countPlaybackMidiEvents, playbackToMidiFile } from "../lib/score-midi-export.js";
import { transposeScoreJsonWithMusic21 } from "../lib/score-music21-transpose.js";
import { scoreJsonToMusicXml } from "../lib/score-musicxml-export.js";
import { renderMusicXmlWithMuseScore } from "../lib/score-pdf-export.js";
import { scoreJsonToPlayback } from "../lib/score-playback.js";
import { validateCanonicalScoreCommandRequest } from "../lib/score-collaboration-command.js";
import { validateScoreCollaborationHistoryRequest } from "../lib/score-collaboration-history.js";
import {
  analyzeAssignedPartRanges,
  analyzeTransposedScoreRange,
  semitonesForInstrumentPitchMode,
  semitonesForTargetKey,
  suggestTranspositionsForAssignedRanges,
  suggestTranspositionsForRange,
  summarizeRangeDiagnostics,
  transposeScoreJson,
} from "../lib/score-transpose.js";
import { createStoredFile, findStoredFileById } from "../repositories/file-repository.js";
import { getUserProfile } from "../repositories/auth-repository.js";
import { listClassroomStaff } from "../repositories/education-organization-repository.js";
import { listStudentGuardians } from "../repositories/education-repository.js";
import {
  acceptPendingScoreRevision,
  applyCanonicalScoreCollaborationCommand,
  applyScoreCollaborationHistoryCommand,
  attachMusicXmlFileToRevision,
  archiveScoreAssignment,
  createScoreAsset,
  createScoreExportJob,
  createScoreAssignment,
  createScoreAssignmentSubmission,
  createScoreClassroom,
  createScoreClassroomStudent,
  createScoreComment,
  createScoreDocumentFromScoreJson,
  createScoreDocumentFromDerivedScoreJson,
  createScoreRubricTemplate,
  createScoreShare,
  createAudioTranscribeScoreDocument,
  createAudioTranscribeScoreDocumentFromUrl,
  createScoreDocumentFromJianpu,
  createScoreDocumentFromMidi,
  createScoreDocumentFromMusicXml,
  createOmrImportScoreDocument,
  createScoreRevisionFromScoreJson,
  findCurrentRevisionForDocument,
  findEditableRevisionForDocument,
  findPendingRevisionForDocument,
  findScoreDocumentById,
  findScoreAssignmentById,
  findScoreAssignmentSubmissionById,
  findScoreAssignmentSubmissionByReviewToken,
  findScoreRevisionById,
  findSharedScoreByToken,
  findScoreClassroomById,
  getScoreAssignmentAnalytics,
  archiveScoreClassroom,
  archiveScoreClassroomStudent,
  deleteScoreRubricTemplate,
  listOmrDiagnosticsByDocumentId,
  listScoreAssetsByDocumentId,
  listScoreAssignmentsByDocumentId,
  listScoreAssignmentsByShareToken,
  listScoreAssignmentSubmissionsByDocumentId,
  listScoreClassroomStudentsByClassroomId,
  listScoreCommentsByDocumentId,
  listScoreCollaborationCommandsByDocumentId,
  listPerformanceSubmissionComments,
  listScoreDocumentsByUserId,
  listScoreJobsByDocumentId,
  listScoreRevisionsByDocumentId,
  listScoreRubricTemplatesByUserId,
  listScoreSharesByDocumentId,
  mapOmrDiagnosticForApi,
  mapPublicScoreAssignmentForApi,
  mapScoreAssetForApi,
  mapScoreAssignmentForApi,
  mapScoreAssignmentSubmissionForApi,
  mapScoreClassroomForApi,
  mapScoreClassroomStudentForApi,
  mapScoreCommentForApi,
  mapScoreCollaborationCommandForApi,
  mapScoreDocumentForApi,
  mapScoreJobForApi,
  mapScoreRevisionForApi,
  mapScoreRubricTemplateForApi,
  mapScoreShareForApi,
  mapSharedScoreForApi,
  rejectPendingScoreRevision,
  cancelScoreJob,
  retryScoreJob,
  reviewScoreAssignmentSubmission,
  revokeScoreShare,
  setScoreCommentResolved,
  updateScoreDocumentSettings,
} from "../repositories/score-repository.js";

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function deriveTitle(filename: string) {
  return filename.replace(/\.(musicxml|xml|pdf|png|jpe?g|webp|tiff?|wav|mp3|m4a|aac|flac|ogg|aiff?)$/i, "").replace(/[-_]+/g, " ").trim() || "Untitled score";
}

function deriveExportBaseName(title: string) {
  return sanitizeFilename(title.trim().replace(/\s+/g, "-") || "score");
}

const SCORE_EXPORT_FORMATS = new Set<ScoreExportFormat>(["musicxml", "midi", "pdf", "svg", "png", "wav", "mp3"]);

function normalizeScoreExportRequest(input: unknown): { format: ScoreExportFormat; options: ScoreExportOptions } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Export request must be a JSON object.");
  }

  const body = input as Record<string, unknown>;
  const format = typeof body.format === "string" ? body.format.toLowerCase() : "";
  if (!SCORE_EXPORT_FORMATS.has(format as ScoreExportFormat)) {
    throw new Error("Export format must be musicxml, midi, pdf, svg, png, wav, or mp3.");
  }

  const rawOptions = body.options && typeof body.options === "object" && !Array.isArray(body.options)
    ? (body.options as Record<string, unknown>)
    : {};
  const options: ScoreExportOptions = {};
  const assignNumber = (key: keyof ScoreExportOptions, min: number, max: number, integer = false) => {
    const value = rawOptions[key];
    if (value === undefined) return;
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
      throw new Error(`${String(key)} must be a number from ${min} to ${max}.`);
    }
    (options as Record<string, unknown>)[key] = integer ? Math.round(value) : value;
  };
  const assignBoolean = (key: keyof ScoreExportOptions) => {
    if (rawOptions[key] !== undefined) (options as Record<string, unknown>)[key] = Boolean(rawOptions[key]);
  };
  const assignStringArray = (key: "soloPartIds" | "mutedPartIds") => {
    const value = rawOptions[key];
    if (value === undefined) return;
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
      throw new Error(`${key} must be an array of part IDs.`);
    }
    options[key] = [...new Set(value.map((item) => item.trim()).filter(Boolean))];
  };
  const assignNumberMap = (key: "partVolumes" | "partPans", min: number, max: number) => {
    const value = rawOptions[key];
    if (value === undefined) return;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${key} must be an object.`);
    const entries = Object.entries(value).map(([partId, amount]) => {
      if (typeof amount !== "number" || !Number.isFinite(amount) || amount < min || amount > max) {
        throw new Error(`${key}.${partId} must be from ${min} to ${max}.`);
      }
      return [partId, amount] as const;
    });
    options[key] = Object.fromEntries(entries);
  };

  assignNumber("tempoBpm", 40, 240, true);
  assignNumber("loopStartBeat", 0, 100000);
  assignNumber("loopEndBeat", 0.25, 100000);
  assignNumber("soundFontGain", 0.05, 5);
  assignNumber("loudnessTargetLufs", -24, -9);
  assignNumber("imageResolutionDpi", 72, 1200, true);
  assignNumber("trimImageMargin", 0, 2000, true);
  assignNumber("scoreScalePercent", 50, 200, true);
  assignNumber("staffSpacingMm", 4, 20);
  assignStringArray("soloPartIds");
  assignStringArray("mutedPartIds");
  assignNumberMap("partVolumes", 0, 1.5);
  assignNumberMap("partPans", -1, 1);
  for (const key of ["countIn", "metronome", "loopEnabled", "reverbEnabled", "chorusEnabled", "normalizeLoudness", "trimImage"] as const) {
    assignBoolean(key);
  }

  if (rawOptions.sampleRate !== undefined) {
    if (![44100, 48000, 96000].includes(rawOptions.sampleRate as number)) throw new Error("sampleRate must be 44100, 48000, or 96000.");
    options.sampleRate = rawOptions.sampleRate as 44100 | 48000 | 96000;
  }
  if (rawOptions.audioChannels !== undefined) {
    if (rawOptions.audioChannels !== 1 && rawOptions.audioChannels !== 2) throw new Error("audioChannels must be 1 or 2.");
    options.audioChannels = rawOptions.audioChannels;
  }
  if (rawOptions.bitrateKbps !== undefined) {
    if (![128, 192, 256, 320].includes(rawOptions.bitrateKbps as number)) throw new Error("bitrateKbps must be 128, 192, 256, or 320.");
    options.bitrateKbps = rawOptions.bitrateKbps as 128 | 192 | 256 | 320;
  }
  if (rawOptions.pageSize !== undefined) {
    if (!["default", "a4", "letter"].includes(rawOptions.pageSize as string)) throw new Error("pageSize must be default, a4, or letter.");
    options.pageSize = rawOptions.pageSize as ScoreExportOptions["pageSize"];
  }
  if (rawOptions.marginPreset !== undefined) {
    if (!["default", "narrow", "normal", "wide"].includes(rawOptions.marginPreset as string)) throw new Error("marginPreset must be default, narrow, normal, or wide.");
    options.marginPreset = rawOptions.marginPreset as ScoreExportOptions["marginPreset"];
  }
  if (options.loopEnabled && options.loopEndBeat !== undefined && options.loopEndBeat <= (options.loopStartBeat ?? 0)) {
    throw new Error("loopEndBeat must be greater than loopStartBeat.");
  }

  return { format: format as ScoreExportFormat, options };
}

function checkExternalTool(input: { id: string; label: string; command: string; versionArgs?: string[]; timeoutMs?: number }) {
  return new Promise<{ id: string; label: string; configured: boolean; available: boolean; message: string }>((resolve) => {
    if (!input.command) {
      resolve({
        id: input.id,
        label: input.label,
        configured: false,
        available: false,
        message: `${input.label} is not configured.`,
      });
      return;
    }

    const child = spawn(input.command, input.versionArgs ?? ["--version"], {
      shell: true,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      resolve({
        id: input.id,
        label: input.label,
        configured: true,
        available: false,
        message: `${input.label} did not answer before timeout.`,
      });
    }, input.timeoutMs ?? 8000);

    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      resolve({
        id: input.id,
        label: input.label,
        configured: true,
        available: false,
        message: error.message,
      });
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      const output = (stdout || stderr).trim().split(/\r?\n/)[0];
      resolve({
        id: input.id,
        label: input.label,
        configured: true,
        available: code === 0,
        message: code === 0 ? output || `${input.label} is available.` : `${input.label} exited with code ${code}. ${(stderr || stdout).trim()}`.trim(),
      });
    });
  });
}

const RENDERED_SCORE_EXPORTS = {
  pdf: {
    extension: "pdf",
    mimeType: "application/pdf",
    fileKind: "rendered_pdf",
    label: "PDF",
  },
  svg: {
    extension: "svg",
    mimeType: "image/svg+xml",
    fileKind: "rendered_svg",
    label: "SVG",
  },
  png: {
    extension: "png",
    mimeType: "image/png",
    fileKind: "rendered_png",
    label: "PNG",
  },
} satisfies Record<string, { extension: string; mimeType: string; fileKind: StoredFileKind; label: string }>;

type RenderedScoreExportKind = keyof typeof RENDERED_SCORE_EXPORTS;
type RenderedScoreExportOptions = {
  imageResolutionDpi?: number;
  trimImage?: boolean;
  trimImageMargin?: number;
  pageSize?: "a4" | "letter";
  marginPreset?: "narrow" | "normal" | "wide";
};

const RENDER_PAGE_SIZES = {
  a4: {
    label: "a4",
    widthMm: 210,
    heightMm: 297,
  },
  letter: {
    label: "letter",
    widthMm: 215.9,
    heightMm: 279.4,
  },
} as const;

const RENDER_MARGIN_PRESETS = {
  narrow: 8,
  normal: 12,
  wide: 18,
} as const;

function millimetersToTenths(value: number) {
  return Math.round((value * 40) / 7);
}

function validateRenderedScoreExportOptions(input: unknown, kind: RenderedScoreExportKind): RenderedScoreExportOptions {
  const body = input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  const options: RenderedScoreExportOptions = {};

  if (kind === "png" && body.imageResolutionDpi !== undefined) {
    const dpi = typeof body.imageResolutionDpi === "number" && Number.isFinite(body.imageResolutionDpi) ? Math.round(body.imageResolutionDpi) : NaN;
    if (!Number.isFinite(dpi) || dpi < 72 || dpi > 1200) {
      throw new Error("PNG image resolution must be from 72 to 1200 DPI.");
    }
    options.imageResolutionDpi = dpi;
  }

  if ((kind === "png" || kind === "svg") && body.trimImage !== undefined) {
    options.trimImage = Boolean(body.trimImage);
  }

  if ((kind === "png" || kind === "svg") && options.trimImage) {
    const marginValue = body.trimImageMargin ?? 20;
    const margin = typeof marginValue === "number" && Number.isFinite(marginValue) ? Math.round(marginValue) : NaN;
    if (!Number.isFinite(margin) || margin < 0 || margin > 2000) {
      throw new Error("Trim margin must be from 0 to 2000 pixels.");
    }
    options.trimImageMargin = margin;
  }

  if (body.pageSize !== undefined && body.pageSize !== "default") {
    if (body.pageSize !== "a4" && body.pageSize !== "letter") {
      throw new Error("Page size must be A4, Letter, or default.");
    }
    options.pageSize = body.pageSize;
  }

  if (body.marginPreset !== undefined && body.marginPreset !== "default") {
    if (body.marginPreset !== "narrow" && body.marginPreset !== "normal" && body.marginPreset !== "wide") {
      throw new Error("Margin preset must be narrow, normal, wide, or default.");
    }
    options.marginPreset = body.marginPreset;
  }

  return options;
}

function renderedExportOptionSuffix(options: RenderedScoreExportOptions) {
  const parts: string[] = [];
  if (options.imageResolutionDpi) {
    parts.push(`${options.imageResolutionDpi}dpi`);
  }
  if (options.trimImage) {
    parts.push(`trim${options.trimImageMargin ?? 20}px`);
  }
  if (options.pageSize) {
    parts.push(options.pageSize);
  }
  if (options.marginPreset) {
    parts.push(`${options.marginPreset}-margins`);
  }
  return parts.length > 0 ? `-${parts.join("-")}` : "";
}

function renderedExportPageLayout(options: RenderedScoreExportOptions) {
  if (!options.pageSize && !options.marginPreset) {
    return undefined;
  }

  const pageSize = options.pageSize ? RENDER_PAGE_SIZES[options.pageSize] : RENDER_PAGE_SIZES.a4;
  const marginMm = options.marginPreset ? RENDER_MARGIN_PRESETS[options.marginPreset] : RENDER_MARGIN_PRESETS.normal;
  const margin = millimetersToTenths(marginMm);

  return {
    pageWidth: millimetersToTenths(pageSize.widthMm),
    pageHeight: millimetersToTenths(pageSize.heightMm),
    marginLeft: margin,
    marginRight: margin,
    marginTop: margin,
    marginBottom: margin,
  };
}

function addFilesToZip(zip: AdmZip, filePaths: string[], extension: string) {
  filePaths.forEach((filePath, index) => {
    const pageNumber = String(index + 1).padStart(2, "0");
    zip.addLocalFile(filePath, "", `page-${pageNumber}.${extension}`);
  });
}

function validateScoreCommentInput(input: unknown) {
  const body = input as { body?: unknown; target?: unknown } | null;
  const text = typeof body?.body === "string" ? body.body.trim() : "";

  if (!text) {
    throw new Error("Comment body is required.");
  }

  if (text.length > 2000) {
    throw new Error("Comment body is too long.");
  }

  const target = body?.target && typeof body.target === "object" && !Array.isArray(body.target) ? (body.target as Record<string, unknown>) : null;

  return {
    body: text,
    target,
  };
}

function validateShareInput(input: unknown) {
  const body = input as { expiresInDays?: unknown; permission?: unknown; label?: unknown } | null;
  const expiresInDays = typeof body?.expiresInDays === "number" && Number.isFinite(body.expiresInDays) ? Math.round(body.expiresInDays) : null;
  const permission: "view" | "comment" | "edit" = body?.permission === "edit" || body?.permission === "comment" || body?.permission === "view" ? body.permission : "view";
  const label = typeof body?.label === "string" ? body.label.trim() : "";

  if (expiresInDays !== null && (expiresInDays < 1 || expiresInDays > 365)) {
    throw new Error("Share expiration must be from 1 to 365 days.");
  }
  if (label.length > 80) throw new Error("Share label is too long.");

  return {
    permission,
    label: label || null,
    expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString() : null,
  };
}

function validateSharedAnnotationTarget(target: Record<string, unknown> | null, scoreJson: ScoreJson | null | undefined) {
  if (!target || target.type === "score") return { type: "score", label: typeof target?.label === "string" ? target.label.slice(0, 160) : "Score" };
  if (!scoreJson) throw new Error("The shared score has no current notation revision.");
  if (target.type === "measure" && typeof target.measureId === "string") {
    const measure = scoreJson.measures.find((item) => item.id === target.measureId);
    if (!measure) throw new Error("The annotation measure target does not exist in the current score.");
    return { type: "measure", label: typeof target.label === "string" ? target.label.slice(0, 160) : `Measure ${measure.number}`, partId: measure.partId, measureId: measure.id, measureNumber: measure.number };
  }
  if (target.type === "note" && typeof target.eventId === "string") {
    const measure = scoreJson.measures.find((item) => item.events.some((event) => event.id === target.eventId));
    const event = measure?.events.find((item) => item.id === target.eventId);
    if (!measure || !event || event.type !== "note") throw new Error("The annotation note target does not exist in the current score.");
    return { type: "note", label: typeof target.label === "string" ? target.label.slice(0, 160) : `Measure ${measure.number} note`, partId: measure.partId, measureId: measure.id, measureNumber: measure.number, eventId: event.id };
  }
  throw new Error("Shared annotations can target the score, a measure, or a note.");
}

function validateRubricCriteria(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  if (input.length > 8) {
    throw new Error("Rubric can include at most 8 criteria.");
  }

  return input
    .map((item, index) => {
      const criterion = item as { id?: unknown; label?: unknown; maxScore?: unknown } | null;
      const label = typeof criterion?.label === "string" ? criterion.label.trim() : "";
      const maxScore = typeof criterion?.maxScore === "number" && Number.isFinite(criterion.maxScore) ? Math.round(criterion.maxScore) : null;

      if (!label && maxScore === null) {
        return null;
      }

      if (!label) {
        throw new Error("Rubric criterion label is required.");
      }

      if (label.length > 120) {
        throw new Error("Rubric criterion label is too long.");
      }

      if (maxScore === null || maxScore < 1 || maxScore > 1000) {
        throw new Error("Rubric criterion max score must be from 1 to 1000.");
      }

      return {
        id: typeof criterion?.id === "string" && criterion.id.trim().length > 0 ? criterion.id.trim().slice(0, 80) : `criterion-${index + 1}`,
        label,
        maxScore,
      };
    })
    .filter((item): item is { id: string; label: string; maxScore: number } => Boolean(item));
}

function validateRubricScores(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  if (input.length > 8) {
    throw new Error("Rubric scores can include at most 8 criteria.");
  }

  return input
    .map((item) => {
      const score = item as { criterionId?: unknown; score?: unknown } | null;
      const criterionId = typeof score?.criterionId === "string" ? score.criterionId.trim() : "";
      const value = typeof score?.score === "number" && Number.isFinite(score.score) ? Math.round(score.score) : null;

      if (!criterionId && value === null) {
        return null;
      }

      if (!criterionId) {
        throw new Error("Rubric score criterion is required.");
      }

      if (value === null || value < 0 || value > 1000) {
        throw new Error("Rubric score must be from 0 to 1000.");
      }

      return {
        criterionId,
        score: value,
      };
    })
    .filter((item): item is { criterionId: string; score: number } => Boolean(item));
}

function validateAssignmentPracticeSettings(input: unknown): AssignmentPracticeSettings | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const body = input as {
    tempoBpm?: unknown;
    metronomeEnabled?: unknown;
    countInEnabled?: unknown;
    soloPartIds?: unknown;
    mutedPartIds?: unknown;
    partVolumes?: unknown;
    loopEnabled?: unknown;
    loopStartBeat?: unknown;
    loopEndBeat?: unknown;
  };
  const tempoBpm = typeof body.tempoBpm === "number" && Number.isFinite(body.tempoBpm) ? Math.round(body.tempoBpm) : 96;
  const loopStartBeat = typeof body.loopStartBeat === "number" && Number.isFinite(body.loopStartBeat) ? Math.max(0, body.loopStartBeat) : 0;
  const loopEndBeat =
    typeof body.loopEndBeat === "number" && Number.isFinite(body.loopEndBeat) ? Math.max(loopStartBeat + 0.25, body.loopEndBeat) : loopStartBeat + 4;
  const stringArray = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 32) : [];
  const partVolumes =
    body.partVolumes && typeof body.partVolumes === "object" && !Array.isArray(body.partVolumes)
      ? Object.fromEntries(
          Object.entries(body.partVolumes as Record<string, unknown>)
            .filter(([partId, volume]) => partId.trim().length > 0 && typeof volume === "number" && Number.isFinite(volume))
            .slice(0, 64)
            .map(([partId, volume]) => [partId, Math.min(1.5, Math.max(0, volume as number))]),
        )
      : {};

  return {
    tempoBpm: Math.min(240, Math.max(40, tempoBpm)),
    metronomeEnabled: body.metronomeEnabled === true,
    countInEnabled: body.countInEnabled === true,
    soloPartIds: stringArray(body.soloPartIds),
    mutedPartIds: stringArray(body.mutedPartIds),
    partVolumes,
    loopEnabled: body.loopEnabled === true,
    loopStartBeat,
    loopEndBeat,
  };
}

function validateAssignmentInput(input: unknown) {
  const body = input as {
    title?: unknown;
    instructions?: unknown;
    dueAt?: unknown;
    shareId?: unknown;
    classroomId?: unknown;
    rubric?: unknown;
    practiceSettings?: unknown;
  } | null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const instructions = typeof body?.instructions === "string" ? body.instructions.trim() : "";
  const dueAt = typeof body?.dueAt === "string" && body.dueAt.trim().length > 0 ? body.dueAt.trim() : null;
  const shareId = typeof body?.shareId === "string" && body.shareId.trim().length > 0 ? body.shareId.trim() : null;
  const classroomId = typeof body?.classroomId === "string" && body.classroomId.trim().length > 0 ? body.classroomId.trim() : null;

  if (!title) {
    throw new Error("Assignment title is required.");
  }

  if (title.length > 120) {
    throw new Error("Assignment title is too long.");
  }

  if (instructions.length > 2000) {
    throw new Error("Assignment instructions are too long.");
  }

  if (dueAt && Number.isNaN(Date.parse(dueAt))) {
    throw new Error("Assignment due date is invalid.");
  }

  return {
    title,
    instructions: instructions || null,
    dueAt: dueAt ? new Date(dueAt).toISOString() : null,
    shareId,
    classroomId,
    rubric: validateRubricCriteria(body?.rubric),
    practiceSettings: validateAssignmentPracticeSettings(body?.practiceSettings),
  };
}

function validateRubricTemplateInput(input: unknown) {
  const body = input as { name?: unknown; rubric?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const rubric = validateRubricCriteria(body?.rubric);

  if (!name) {
    throw new Error("Rubric template name is required.");
  }

  if (name.length > 120) {
    throw new Error("Rubric template name is too long.");
  }

  if (rubric.length === 0) {
    throw new Error("Rubric template must include at least one criterion.");
  }

  return {
    name,
    rubric,
  };
}

function validateClassroomInput(input: unknown) {
  const body = input as { name?: unknown; description?: unknown; organizationId?: unknown; campusId?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";

  if (!name) {
    throw new Error("Classroom name is required.");
  }

  if (name.length > 120) {
    throw new Error("Classroom name is too long.");
  }

  if (description.length > 1000) {
    throw new Error("Classroom description is too long.");
  }

  return {
    name,
    description: description || null,
    organizationId: typeof body?.organizationId === "string" ? body.organizationId.trim() || null : null,
    campusId: typeof body?.campusId === "string" ? body.campusId.trim() || null : null,
  };
}

function validateClassroomStudentInput(input: unknown) {
  const body = input as { displayName?: unknown; contactEmail?: unknown; externalRef?: unknown } | null;
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
  const contactEmail = typeof body?.contactEmail === "string" ? body.contactEmail.trim() : "";
  const externalRef = typeof body?.externalRef === "string" ? body.externalRef.trim() : "";

  if (!displayName) {
    throw new Error("Student display name is required.");
  }

  if (displayName.length > 120) {
    throw new Error("Student display name is too long.");
  }

  if (contactEmail.length > 200) {
    throw new Error("Student contact email is too long.");
  }

  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(contactEmail)) {
    throw new Error("Student contact email must be valid.");
  }

  if (externalRef.length > 120) {
    throw new Error("Student external reference is too long.");
  }

  return {
    displayName,
    contactEmail: contactEmail || null,
    externalRef: externalRef || null,
  };
}

function validateAssignmentSubmissionInput(input: unknown) {
  const body = input as {
    submitterName?: unknown;
    submitterContact?: unknown;
    note?: unknown;
    recordingUrl?: unknown;
    practiceMinutes?: unknown;
    practiceSettings?: unknown;
    performanceAnalysis?: unknown;
  } | null;
  const submitterName = typeof body?.submitterName === "string" ? body.submitterName.trim() : "";
  const submitterContact = typeof body?.submitterContact === "string" ? body.submitterContact.trim() : "";
  const note = typeof body?.note === "string" ? body.note.trim() : "";
  const recordingUrl = typeof body?.recordingUrl === "string" ? body.recordingUrl.trim() : "";
  const practiceMinutes =
    typeof body?.practiceMinutes === "number" && Number.isFinite(body.practiceMinutes) ? Math.round(body.practiceMinutes) : null;
  const performanceAnalysis = validatePracticePerformanceAnalysis(body?.performanceAnalysis);

  if (!submitterName) {
    throw new Error("Submitter name is required.");
  }

  if (submitterName.length > 120) {
    throw new Error("Submitter name is too long.");
  }

  if (submitterContact.length > 200) {
    throw new Error("Submitter contact is too long.");
  }

  if (note.length > 2000) {
    throw new Error("Submission note is too long.");
  }

  if (recordingUrl.length > 500) {
    throw new Error("Recording link is too long.");
  }

  if (recordingUrl) {
    const url = new URL(recordingUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Recording link must be an HTTP or HTTPS URL.");
    }
  }

  if (practiceMinutes !== null && (practiceMinutes < 0 || practiceMinutes > 10000)) {
    throw new Error("Practice minutes must be from 0 to 10000.");
  }

  return {
    submitterName,
    submitterContact: submitterContact || null,
    note: note || null,
    recordingUrl: recordingUrl || null,
    practiceMinutes,
    practiceSettings: validateAssignmentPracticeSettings(body?.practiceSettings),
    performanceAnalysis,
  };
}

function validateAssignmentReviewInput(input: unknown) {
  const body = input as { teacherFeedback?: unknown; gradeScore?: unknown; gradeMax?: unknown; rubricScores?: unknown } | null;
  const teacherFeedback = typeof body?.teacherFeedback === "string" ? body.teacherFeedback.trim() : "";
  const gradeScore = typeof body?.gradeScore === "number" && Number.isFinite(body.gradeScore) ? Math.round(body.gradeScore) : null;
  const gradeMax = typeof body?.gradeMax === "number" && Number.isFinite(body.gradeMax) ? Math.round(body.gradeMax) : null;

  if (teacherFeedback.length > 2000) {
    throw new Error("Teacher feedback is too long.");
  }

  if (gradeScore !== null && (gradeScore < 0 || gradeScore > 1000)) {
    throw new Error("Grade score must be from 0 to 1000.");
  }

  if (gradeMax !== null && (gradeMax < 1 || gradeMax > 1000)) {
    throw new Error("Grade max must be from 1 to 1000.");
  }

  if (gradeScore !== null && gradeMax !== null && gradeScore > gradeMax) {
    throw new Error("Grade score cannot be greater than grade max.");
  }

  return {
    teacherFeedback: teacherFeedback || null,
    gradeScore,
    gradeMax,
    rubricScores: validateRubricScores(body?.rubricScores),
  };
}

function isShareUsable(share: { expiresAt: string | null; revokedAt: string | null }) {
  if (share.revokedAt) {
    return false;
  }

  return !share.expiresAt || new Date(share.expiresAt).getTime() > Date.now();
}

function normalizeRangePartIds(input: unknown, scoreJson: ScoreJson) {
  if (!Array.isArray(input)) {
    return undefined;
  }

  const knownPartIds = new Set(scoreJson.parts.map((part) => part.id));
  const partIds = Array.from(new Set(input.filter((item): item is string => typeof item === "string" && knownPartIds.has(item))));
  return partIds.length > 0 ? partIds : undefined;
}

function normalizeRangeAssignments(input: unknown, scoreJson: ScoreJson) {
  if (!Array.isArray(input)) {
    return [];
  }

  const knownPartIds = new Set(scoreJson.parts.map((part) => part.id));
  const seenPartIds = new Set<string>();
  return input
    .map((item) => {
      const assignment = item as { partId?: unknown; profileId?: unknown } | null;
      const partId = typeof assignment?.partId === "string" ? assignment.partId : "";
      const profileId = typeof assignment?.profileId === "string" ? assignment.profileId : "";
      const profile = SCORE_RANGE_PROFILES.find((rangeProfile) => rangeProfile.id === profileId);

      if (!knownPartIds.has(partId) || !profile || seenPartIds.has(partId)) {
        return null;
      }

      seenPartIds.add(partId);
      return {
        partId,
        profile,
      };
    })
    .filter((item): item is { partId: string; profile: (typeof SCORE_RANGE_PROFILES)[number] } => Boolean(item));
}

function normalizeScoreProjectSettings(input: unknown, scoreJson: ScoreJson): ScoreProjectSettings {
  const body = input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  const knownPartIds = new Set(scoreJson.parts.map((part) => part.id));
  const rangeProfileIds = new Set<string>(SCORE_RANGE_PROFILES.map((profile) => profile.id));
  const instrumentProfileIds = new Set<string>(TRANSPOSING_INSTRUMENT_PROFILES.map((profile) => profile.id));
  const settings: ScoreProjectSettings = {};

  if (body.defaultRangeProfileId === null || body.defaultRangeProfileId === "none") {
    settings.defaultRangeProfileId = null;
  } else if (typeof body.defaultRangeProfileId === "string" && rangeProfileIds.has(body.defaultRangeProfileId)) {
    settings.defaultRangeProfileId = body.defaultRangeProfileId as ScoreProjectSettings["defaultRangeProfileId"];
  }

  if (body.defaultRangePartId === null || body.defaultRangePartId === "all") {
    settings.defaultRangePartId = null;
  } else if (typeof body.defaultRangePartId === "string" && knownPartIds.has(body.defaultRangePartId)) {
    settings.defaultRangePartId = body.defaultRangePartId;
  }

  if (body.defaultInstrumentProfileId === null || body.defaultInstrumentProfileId === "none") {
    settings.defaultInstrumentProfileId = null;
  } else if (typeof body.defaultInstrumentProfileId === "string" && instrumentProfileIds.has(body.defaultInstrumentProfileId)) {
    settings.defaultInstrumentProfileId = body.defaultInstrumentProfileId as ScoreProjectSettings["defaultInstrumentProfileId"];
  }

  if (body.defaultTransposeSpellingPolicy === "auto" || body.defaultTransposeSpellingPolicy === "preserve" || body.defaultTransposeSpellingPolicy === "prefer-sharps" || body.defaultTransposeSpellingPolicy === "prefer-flats") {
    settings.defaultTransposeSpellingPolicy = body.defaultTransposeSpellingPolicy;
  }
  if (body.defaultTransposePitchMode === "concert-to-written" || body.defaultTransposePitchMode === "written-to-concert") {
    settings.defaultTransposePitchMode = body.defaultTransposePitchMode;
  }

  const partRangeProfileIds: Record<string, (typeof SCORE_RANGE_PROFILES)[number]["id"]> = {};
  if (body.partRangeProfileIds && typeof body.partRangeProfileIds === "object" && !Array.isArray(body.partRangeProfileIds)) {
    for (const [partId, profileId] of Object.entries(body.partRangeProfileIds as Record<string, unknown>)) {
      if (knownPartIds.has(partId) && typeof profileId === "string" && rangeProfileIds.has(profileId)) {
        partRangeProfileIds[partId] = profileId as (typeof SCORE_RANGE_PROFILES)[number]["id"];
      }
    }
  }

  settings.partRangeProfileIds = partRangeProfileIds;
  return settings;
}

function validatePartExtractionInput(input: unknown, scoreJson: ScoreJson) {
  const body = input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  const knownPartIds = new Set(scoreJson.parts.map((part) => part.id));
  const partIds = Array.from(
    new Set((Array.isArray(body.partIds) ? body.partIds : []).filter((partId): partId is string => typeof partId === "string" && knownPartIds.has(partId))),
  );
  const title = typeof body.title === "string" ? body.title.trim() : "";

  if (partIds.length === 0) {
    throw new Error("Choose at least one score part to extract.");
  }

  if (title.length > 160) {
    throw new Error("Extracted score title is too long.");
  }

  return {
    partIds,
    title: title || undefined,
    applyRecommendedClefs: body.applyRecommendedClefs !== false,
  };
}

async function createRenderedScoreExport(input: {
  userId: string;
  documentId: string;
  revision: {
    score_json: string;
    revision_number: number;
  };
  kind: RenderedScoreExportKind;
  options?: RenderedScoreExportOptions;
}) {
  const scoreJson = migrateScoreJson(JSON.parse(input.revision.score_json));
  const exportConfig = RENDERED_SCORE_EXPORTS[input.kind];
  const renderOptions = input.options ?? {};
  const musicXml = scoreJsonToMusicXml(scoreJson, {
    pageLayout: renderedExportPageLayout(renderOptions),
  });
  const exportDir = path.join(config.storageDir, input.userId, "scores", "exports");
  fs.mkdirSync(exportDir, { recursive: true });

  const baseName = `${deriveExportBaseName(scoreJson.title)}-v${input.revision.revision_number}${renderedExportOptionSuffix(renderOptions)}`;
  const exportId = createId();
  const musicXmlPath = path.join(exportDir, `${exportId}-${baseName}.musicxml`);
  const originalName = `${baseName}.${exportConfig.extension}`;
  const storedName = `${exportId}-${originalName}`;
  const targetPath = path.join(exportDir, storedName);
  fs.writeFileSync(musicXmlPath, musicXml, "utf8");

  try {
    await renderMusicXmlWithMuseScore({
      musicXmlPath,
      outputPath: targetPath,
      outputLabel: exportConfig.label,
      museScoreCommand: config.museScoreCommand,
      timeoutMs: config.museScoreTimeoutMs,
      imageResolutionDpi: input.kind === "png" ? renderOptions.imageResolutionDpi : undefined,
      trimImageMargin: input.kind === "png" || input.kind === "svg" ? renderOptions.trimImageMargin : undefined,
    });
  } catch (error) {
    fs.rmSync(musicXmlPath, { force: true });
    fs.rmSync(targetPath, { force: true });
    throw error;
  }

  fs.rmSync(musicXmlPath, { force: true });
  let storedOriginalName = originalName;
  let storedFileName = storedName;
  let storedPath = targetPath;
  let storedMimeType = exportConfig.mimeType;

  const generatedImagePaths =
    input.kind === "png" || input.kind === "svg"
      ? fs
          .readdirSync(exportDir)
          .filter((entry) => entry.startsWith(`${path.basename(targetPath, path.extname(targetPath))}-`) && entry.endsWith(`.${exportConfig.extension}`))
          .sort()
          .map((entry) => path.join(exportDir, entry))
      : [];

  if ((input.kind === "png" || input.kind === "svg") && generatedImagePaths.length > 1 && !fs.existsSync(targetPath)) {
    storedOriginalName = `${originalName}.zip`;
    storedFileName = `${storedName}.zip`;
    storedPath = path.join(exportDir, storedFileName);
    storedMimeType = "application/zip";
    const zip = new AdmZip();
    addFilesToZip(zip, generatedImagePaths, exportConfig.extension);
    zip.writeZip(storedPath);
    for (const imagePath of generatedImagePaths) {
      fs.rmSync(imagePath, { force: true });
    }
  }

  const stats = fs.statSync(storedPath);
  const storedFile = await createStoredFile({
    userId: input.userId,
    originalName: storedOriginalName,
    storedName: storedFileName,
    storagePath: storedPath,
    mimeType: storedMimeType,
    sizeBytes: stats.size,
    fileKind: exportConfig.fileKind,
  });

  if (!storedFile) {
    throw new Error(`Could not store the exported ${exportConfig.label} file.`);
  }

  createScoreAsset({
    documentId: input.documentId,
    fileId: storedFile.id,
    assetKind: exportConfig.fileKind,
  });

  return {
    file: {
      id: storedFile.id,
      originalName: storedFile.original_name,
      mimeType: storedFile.mime_type,
      sizeBytes: storedFile.size_bytes,
      fileKind: storedFile.file_kind,
      createdAt: storedFile.created_at,
    },
    assets: listScoreAssetsByDocumentId(input.documentId).map(mapScoreAssetForApi),
    renderOptions,
  };
}

function normalizeJianpuImportBody(body: unknown): {
  text: string;
  title: string;
  tonic?: string;
  mode?: JianpuMode;
  beats?: string;
  beatType?: string;
} {
  if (!body || typeof body !== "object") {
    throw new Error("Please provide Jianpu text.");
  }

  const payload = body as {
    text?: unknown;
    title?: unknown;
    tonic?: unknown;
    mode?: unknown;
    beats?: unknown;
    beatType?: unknown;
  };
  const text = typeof payload.text === "string" ? payload.text.trim() : "";

  if (text.length === 0) {
    throw new Error("Please provide Jianpu text.");
  }

  if (text.length > 200_000) {
    throw new Error("Jianpu text is too large for direct import.");
  }

  const title = typeof payload.title === "string" && payload.title.trim() ? payload.title.trim() : "Jianpu score";
  const tonic = typeof payload.tonic === "string" && payload.tonic.trim() ? payload.tonic.trim() : undefined;
  const mode: JianpuMode | undefined = payload.mode === "minor" ? "minor" : payload.mode === "major" ? "major" : undefined;
  const beats = typeof payload.beats === "string" && /^\d{1,2}$/.test(payload.beats.trim()) ? payload.beats.trim() : undefined;
  const beatType = typeof payload.beatType === "string" && /^\d{1,2}$/.test(payload.beatType.trim()) ? payload.beatType.trim() : undefined;

  return {
    text,
    title,
    tonic,
    mode,
    beats,
    beatType,
  };
}

function normalizeJianpuProjectionQuery(input: unknown): { pitchSystem: JianpuPitchSystem; accidentalStrategy: JianpuAccidentalStrategy } {
  const query = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const pitchSystem = query.pitchSystem ?? "movable-do";
  const accidentalStrategy = query.accidentalStrategy ?? "preserve";
  if (pitchSystem !== "movable-do" && pitchSystem !== "fixed-do") {
    throw new Error("pitchSystem must be movable-do or fixed-do.");
  }
  if (accidentalStrategy !== "preserve" && accidentalStrategy !== "prefer-sharps" && accidentalStrategy !== "prefer-flats") {
    throw new Error("accidentalStrategy must be preserve, prefer-sharps, or prefer-flats.");
  }
  return { pitchSystem, accidentalStrategy };
}

function normalizePracticeExportBody(body: unknown): {
  tempoBpm?: number;
  soloPartIds?: string[];
  mutedPartIds?: string[];
  partVolumes?: Record<string, number>;
  countIn?: boolean;
  metronome?: boolean;
  loopEnabled?: boolean;
  loopStartBeat?: number;
  loopEndBeat?: number;
} {
  if (!body || typeof body !== "object") {
    return {};
  }

  const payload = body as {
    tempoBpm?: unknown;
    soloPartIds?: unknown;
    mutedPartIds?: unknown;
    partVolumes?: unknown;
    countIn?: unknown;
    metronome?: unknown;
    loopEnabled?: unknown;
    loopStartBeat?: unknown;
    loopEndBeat?: unknown;
  };
  const tempoBpm = typeof payload.tempoBpm === "number" && Number.isFinite(payload.tempoBpm) ? Math.round(payload.tempoBpm) : undefined;
  const loopStartBeat = typeof payload.loopStartBeat === "number" && Number.isFinite(payload.loopStartBeat) ? Math.max(0, payload.loopStartBeat) : undefined;
  const loopEndBeat =
    typeof payload.loopEndBeat === "number" && Number.isFinite(payload.loopEndBeat)
      ? Math.max((loopStartBeat ?? 0) + 0.25, payload.loopEndBeat)
      : undefined;
  const stringArray = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 32) : undefined);
  const partVolumes =
    payload.partVolumes && typeof payload.partVolumes === "object" && !Array.isArray(payload.partVolumes)
      ? Object.fromEntries(
          Object.entries(payload.partVolumes as Record<string, unknown>)
            .filter(([partId, volume]) => partId.length > 0 && typeof volume === "number" && Number.isFinite(volume))
            .slice(0, 64)
            .map(([partId, volume]) => [partId, Math.min(1.5, Math.max(0, volume as number))]),
        )
      : undefined;

  return {
    tempoBpm: tempoBpm ? Math.min(240, Math.max(40, tempoBpm)) : undefined,
    soloPartIds: stringArray(payload.soloPartIds),
    mutedPartIds: stringArray(payload.mutedPartIds),
    partVolumes,
    countIn: payload.countIn === true,
    metronome: payload.metronome === true,
    loopEnabled: payload.loopEnabled === true && loopStartBeat !== undefined && loopEndBeat !== undefined,
    loopStartBeat,
    loopEndBeat,
  };
}

function normalizeMp3ExportBody(body: unknown) {
  const options = normalizePracticeExportBody(body);
  const payload = body && typeof body === "object" ? (body as { bitrateKbps?: unknown }) : {};
  const bitrateKbps = typeof payload.bitrateKbps === "number" && Number.isFinite(payload.bitrateKbps) ? Math.round(payload.bitrateKbps) : undefined;

  return {
    ...options,
    bitrateKbps: bitrateKbps ? Math.min(320, Math.max(96, bitrateKbps)) : undefined,
  };
}

async function createPracticeWavExport(input: {
  playback: ReturnType<typeof scoreJsonToPlayback>;
  options: ReturnType<typeof normalizePracticeExportBody>;
  exportDir: string;
  tempBaseName: string;
}) {
  const canUseSoundFont =
    Boolean(config.fluidSynthCommand) &&
    Boolean(config.defaultSoundFontPath) &&
    fs.existsSync(config.defaultSoundFontPath) &&
    input.options.countIn !== true &&
    input.options.metronome !== true;

  if (canUseSoundFont) {
    const midiPath = path.join(input.exportDir, `${input.tempBaseName}.mid`);
    const wavPath = path.join(input.exportDir, `${input.tempBaseName}.soundfont.wav`);
    try {
      fs.writeFileSync(midiPath, Buffer.from(playbackToMidiFile(input.playback, input.options)));
      await renderMidiToWavWithFluidSynth({
        fluidSynthCommand: config.fluidSynthCommand,
        soundFontPath: config.defaultSoundFontPath,
        sourceMidiPath: midiPath,
        targetWavPath: wavPath,
        timeoutMs: config.fluidSynthTimeoutMs,
      });
      const wav = fs.readFileSync(wavPath);
      fs.rmSync(midiPath, { force: true });
      fs.rmSync(wavPath, { force: true });
      return {
        wav,
        metadata: {
          renderer: "fluidsynth-soundfont",
          soundFontPath: config.defaultSoundFontPath,
          eventCount: countPlaybackMidiEvents(input.playback, input.options),
        },
      };
    } catch (error) {
      fs.rmSync(midiPath, { force: true });
      fs.rmSync(wavPath, { force: true });
      const fallback = playbackToWavFile(input.playback, input.options);
      return {
        wav: fallback.wav,
        metadata: {
          ...fallback.metadata,
          renderer: "built-in-synth",
          rendererWarning: error instanceof Error ? error.message : "FluidSynth rendering failed; built-in synthesis was used.",
        },
      };
    }
  }

  const fallback = playbackToWavFile(input.playback, input.options);
  return {
    wav: fallback.wav,
    metadata: {
      ...fallback.metadata,
      renderer: "built-in-synth",
      rendererWarning:
        config.fluidSynthCommand && config.defaultSoundFontPath
          ? input.options.countIn || input.options.metronome
            ? "Built-in synthesis was used because count-in or metronome clicks are enabled."
            : undefined
          : "Configure FLUIDSYNTH_COMMAND and SOUNDFONT_PATH to enable SoundFont rendering.",
    },
  };
}

export function normalizeAudioUrlImportBody(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Please provide an audio or video URL.");
  }

  const payload = body as { url?: unknown; title?: unknown; rightsBasis?: unknown; rightsConfirmed?: unknown; transcriptionProfile?: unknown };
  const sourceUrl = typeof payload.url === "string" ? payload.url.trim() : "";
  if (!sourceUrl) {
    throw new Error("Please provide an audio or video URL.");
  }

  if (sourceUrl.length > 1000) {
    throw new Error("The URL is too long.");
  }

  const parsed = new URL(sourceUrl);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Audio URL imports must use HTTP or HTTPS.");
  }

  if (isPrivateImportHostname(parsed.hostname)) {
    throw new Error("Audio URL imports cannot target localhost or private network addresses.");
  }

  const rightsBasis = typeof payload.rightsBasis === "string" ? payload.rightsBasis : "";
  if (!new Set(["owned", "licensed", "public_domain"]).has(rightsBasis)) {
    throw new Error("Select whether you own, licensed, or are using public-domain media.");
  }
  if (payload.rightsConfirmed !== true) {
    throw new Error("Confirm that you have the right to download and transcribe this media.");
  }

  const transcriptionProfile: "monophonic" | "polyphonic-balanced" =
    payload.transcriptionProfile === "monophonic" ? "monophonic" : "polyphonic-balanced";

  const title = typeof payload.title === "string" && payload.title.trim() ? payload.title.trim().slice(0, 160) : deriveTitle(parsed.hostname);
  return {
    sourceUrl,
    title,
    rightsBasis: rightsBasis as "owned" | "licensed" | "public_domain",
    rightsConfirmedAt: new Date().toISOString(),
    transcriptionProfile,
  };
}

function isPrivateImportHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/gu, "");
  if (normalized === "localhost" || normalized.endsWith(".localhost") || normalized.endsWith(".local")) return true;
  const family = isIP(normalized);
  if (family === 4) {
    const [a, b] = normalized.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  if (family === 6) {
    return normalized === "::1" || normalized === "::" || normalized.startsWith("fc") || normalized.startsWith("fd") || /^fe[89ab]/u.test(normalized);
  }
  return false;
}

function isPlainMusicXml(filename: string, mimetype: string) {
  const normalized = filename.toLowerCase();
  return (
    normalized.endsWith(".musicxml") ||
    normalized.endsWith(".xml") ||
    mimetype === "application/vnd.recordare.musicxml+xml" ||
    mimetype === "application/xml" ||
    mimetype === "text/xml"
  );
}

function isScoreJsonSnapshot(filename: string, mimetype: string) {
  const normalized = filename.toLowerCase();
  return normalized.endsWith(".score.json") || normalized.endsWith(".json") || mimetype === "application/json";
}

function isMidiSource(filename: string, mimetype: string) {
  const normalized = filename.toLowerCase();
  return normalized.endsWith(".mid") || normalized.endsWith(".midi") || mimetype === "audio/midi" || mimetype === "audio/x-midi";
}

export function parseScoreJsonSnapshot(value: string): ScoreJson {
  const raw = JSON.parse(value) as Record<string, unknown> | null;

  if (
    !raw ||
    typeof raw !== "object" ||
    (raw.schemaVersion !== 1 && raw.schemaVersion !== 2) ||
    typeof raw.title !== "string" ||
    !raw.title.trim() ||
    !Array.isArray(raw.parts) ||
    !Array.isArray(raw.measures) ||
    !raw.source ||
    typeof raw.source !== "object" ||
    !raw.metadata ||
    typeof raw.metadata !== "object"
  ) {
    throw new Error("The uploaded file is not a supported Score JSON snapshot.");
  }

  if (!raw.parts.every((part) => typeof part.id === "string" && typeof part.name === "string")) {
    throw new Error("The Score JSON snapshot has invalid parts.");
  }

  if (!raw.measures.every((measure) => typeof measure.id === "string" && typeof measure.partId === "string" && Array.isArray(measure.events))) {
    throw new Error("The Score JSON snapshot has invalid measures.");
  }

  return migrateScoreJson(raw);
}

function isCompressedMusicXml(filename: string, mimetype: string) {
  const normalized = filename.toLowerCase();
  return normalized.endsWith(".mxl") || mimetype === "application/vnd.recordare.musicxml";
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

export function extractMusicXmlFromCompressedMxl(buffer: Buffer) {
  const archive = new AdmZip(buffer);
  const entries = archive.getEntries();
  if (entries.length > 1000) {
    throw new Error("The compressed MusicXML package contains too many files.");
  }

  const totalUncompressedBytes = entries.reduce((total, entry) => total + Number(entry.header.size || 0), 0);
  if (totalUncompressedBytes > 50 * 1024 * 1024) {
    throw new Error("The compressed MusicXML package expands beyond the 50 MB safety limit.");
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });
  const containerEntry = archive.getEntry("META-INF/container.xml");
  const candidatePaths: string[] = [];

  if (containerEntry && !containerEntry.isDirectory) {
    const containerXml = containerEntry.getData().toString("utf8");
    const container = parser.parse(containerXml) as {
      container?: {
        rootfiles?: {
          rootfile?: { "full-path"?: string; mediaType?: string } | Array<{ "full-path"?: string; mediaType?: string }>;
        };
      };
    };

    for (const rootfile of asArray(container.container?.rootfiles?.rootfile)) {
      if (rootfile["full-path"]) {
        candidatePaths.push(rootfile["full-path"]);
      }
    }
  }

  candidatePaths.push(
    ...archive
      .getEntries()
      .filter((entry) => !entry.isDirectory)
      .map((entry) => entry.entryName)
      .filter((entryName) => /\.(musicxml|xml)$/i.test(entryName) && !entryName.toLowerCase().startsWith("meta-inf/")),
  );

  const entryName = candidatePaths.find((candidatePath) => archive.getEntry(candidatePath));
  const scoreEntry = entryName ? archive.getEntry(entryName) : null;

  if (!scoreEntry || scoreEntry.isDirectory) {
    throw new Error("The compressed MusicXML package does not contain a score XML file.");
  }

  if (Number(scoreEntry.header.size || 0) > 20 * 1024 * 1024) {
    throw new Error("The score XML inside the package exceeds the 20 MB safety limit.");
  }

  const musicXml = scoreEntry.getData().toString("utf8").replace(/^\uFEFF/, "");
  if (!/<score-(?:partwise|timewise)\b/i.test(musicXml)) {
    throw new Error("The compressed MusicXML package did not contain a supported score document.");
  }

  return musicXml;
}

function sourceKindForOmrImport(filename: string, mimetype: string) {
  const normalized = filename.toLowerCase();
  const isPdf = normalized.endsWith(".pdf") || mimetype === "application/pdf";
  if (isPdf) {
    return "source_pdf" as const;
  }

  const isImage =
    normalized.endsWith(".png") ||
    normalized.endsWith(".jpg") ||
    normalized.endsWith(".jpeg") ||
    normalized.endsWith(".webp") ||
    normalized.endsWith(".tif") ||
    normalized.endsWith(".tiff") ||
    mimetype.startsWith("image/");

  return isImage ? ("source_image" as const) : null;
}

function isAudioSource(filename: string, mimetype: string) {
  const normalized = filename.toLowerCase();
  return (
    normalized.endsWith(".wav") ||
    normalized.endsWith(".mp3") ||
    normalized.endsWith(".m4a") ||
    normalized.endsWith(".aac") ||
    normalized.endsWith(".flac") ||
    normalized.endsWith(".ogg") ||
    normalized.endsWith(".aif") ||
    normalized.endsWith(".aiff") ||
    mimetype.startsWith("audio/")
  );
}

function isPerformanceSubmissionMedia(filename: string, mimetype: string) {
  const normalized = filename.toLowerCase();
  return (
    isAudioSource(filename, mimetype) ||
    normalized.endsWith(".mp4") ||
    normalized.endsWith(".m4v") ||
    normalized.endsWith(".mov") ||
    normalized.endsWith(".webm") ||
    mimetype === "video/mp4" ||
    mimetype === "video/quicktime" ||
    mimetype === "video/webm"
  );
}

function sendCanonicalScoreCommandResult(reply: FastifyReply, documentId: string, result: ReturnType<typeof applyCanonicalScoreCollaborationCommand>) {
  const document = findScoreDocumentById(documentId);
  const command = result.command ? mapScoreCollaborationCommandForApi(result.command) : null;
  const payload = {
    status: result.status,
    command,
    revision: result.revision ? mapScoreRevisionForApi(result.revision) : null,
    score: document ? mapScoreDocumentForApi(document) : null,
    revisions: document ? listScoreRevisionsByDocumentId(document.id).map(mapScoreRevisionForApi) : [],
  };
  if (result.status === "invalid_base") return reply.code(409).send({ ...payload, error: "The collaboration base revision is not part of the current score history." });
  if (result.status === "unavailable") return reply.code(409).send({ ...payload, error: "Collaboration commands are unavailable while a candidate revision is awaiting review." });
  if (result.status === "forbidden") return reply.code(403).send({ ...payload, error: "You can only reverse your own collaboration operations." });
  if (result.status === "target_unavailable") return reply.code(409).send({ ...payload, error: "The target collaboration operation cannot be reversed." });
  if (result.status === "idempotency_mismatch") return reply.code(409).send({ ...payload, error: "This operation id was already used for a different collaboration command." });
  if (result.status === "conflict" || (result.status === "duplicate" && command?.status === "conflict")) {
    return reply.code(409).send({
      ...payload,
      error: command?.conflictReason === "history-target-changed"
        ? "The operation cannot be reversed because its score events changed afterward."
        : "The collaboration command conflicts with changes made after its base revision.",
    });
  }
  return reply.code(result.status === "duplicate" ? 200 : 201).send(payload);
}

function mapOwnedScoreForAccess(document: Parameters<typeof mapScoreDocumentForApi>[0], paidAccess: boolean) {
  const mapped = mapScoreDocumentForApi(document);
  if (paidAccess) return mapped;
  const redactRevision = (revision: typeof mapped.currentRevision) => revision
    ? { ...revision, scoreJson: undefined, musicxmlFileId: null }
    : null;
  return {
    ...mapped,
    sourceFileId: null,
    currentRevision: redactRevision(mapped.currentRevision),
    pendingRevision: redactRevision(mapped.pendingRevision),
  };
}

export async function scoreRoutes(app: FastifyInstance) {
  app.get(
    "/scores/tooling/status",
    {
      preHandler: app.requireActiveEntitlement,
    },
    async () => {
      const tools = await Promise.all([
        checkExternalTool({ id: "audiveris", label: "Audiveris OMR", command: config.audiverisCommand }),
        checkExternalTool({ id: "basic-pitch", label: "Basic Pitch", command: config.basicPitchCommand }),
        checkExternalTool({ id: "music21", label: "music21 Python", command: config.music21Command }),
        checkExternalTool({ id: "musescore", label: "MuseScore CLI", command: config.museScoreCommand }),
        checkExternalTool({ id: "ffmpeg", label: "ffmpeg", command: config.ffmpegCommand }),
        checkExternalTool({ id: "fluidsynth", label: "FluidSynth", command: config.fluidSynthCommand }),
        checkExternalTool({ id: "yt-dlp", label: "yt-dlp", command: config.ytDlpCommand }),
        config.clamAvHost
          ? Promise.resolve({ id: "clamav", label: "ClamAV daemon", configured: true, available: true, message: `${config.clamAvHost}:${config.clamAvPort}` })
          : checkExternalTool({ id: "clamav", label: "ClamAV", command: config.clamAvCommand }),
      ]);

      return {
        tools,
        soundFont: {
          configured: Boolean(config.defaultSoundFontPath),
          path: config.defaultSoundFontPath || null,
          available: Boolean(config.defaultSoundFontPath && fs.existsSync(config.defaultSoundFontPath)),
        },
        uploadSecurity: {
          maxBytes: config.uploadMaxBytes,
          malwareScanRequired: config.clamAvRequired,
        },
      };
    },
  );

  app.get(
    "/scores",
    {
      preHandler: app.requireScorePreviewAccess,
    },
    async (request) => {
      const paidAccess = getUserProfile(request.authUserId!)?.entitlement.status === "active";
      return {
        scores: listScoreDocumentsByUserId(request.authUserId!).map((document) => mapOwnedScoreForAccess(
          document,
          paidAccess || isFreeTrialScoreDocumentForUser(document.id, request.authUserId!),
        )),
      };
    },
  );

  app.get(
    "/scores/:id",
    {
      preHandler: app.requireScorePreviewAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const paidAccess = getUserProfile(request.authUserId!)?.entitlement.status === "active";
      const editingAccess = paidAccess || isFreeTrialScoreDocumentForUser(document.id, request.authUserId!);

      return reply.send({
        score: mapOwnedScoreForAccess(document, editingAccess),
        revisions: editingAccess ? listScoreRevisionsByDocumentId(document.id).map(mapScoreRevisionForApi) : [],
      });
    },
  );

  app.post(
    "/scores/:id/collaboration/commands",
    { preHandler: app.requireScoreEditingAccess },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);
      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }
      let input;
      try {
        input = validateCanonicalScoreCommandRequest(request.body);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid collaboration command." });
      }
      const result = applyCanonicalScoreCollaborationCommand({
        operationId: input.operationId,
        documentId: document.id,
        actorId: request.authUserId!,
        actorRole: "owner",
        baseRevisionId: input.baseRevisionId,
        command: input.command,
      });
      return sendCanonicalScoreCommandResult(reply, document.id, result);
    },
  );

  app.get(
    "/scores/:id/collaboration/commands",
    { preHandler: app.requireScoreEditingAccess },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);
      if (!document || document.user_id !== request.authUserId) return reply.code(404).send({ error: "Score document not found." });
      const actorId = request.authUserId!;
      return reply.send({
        commands: listScoreCollaborationCommandsByDocumentId(document.id).map((command) => {
          const mapped = mapScoreCollaborationCommandForApi(command);
          return { ...mapped, isCurrentActor: mapped.actorId === actorId };
        }),
      });
    },
  );

  app.post(
    "/scores/:id/collaboration/history",
    { preHandler: app.requireScoreEditingAccess },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);
      if (!document || document.user_id !== request.authUserId) return reply.code(404).send({ error: "Score document not found." });
      let input;
      try {
        input = validateScoreCollaborationHistoryRequest(request.body);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid collaboration history command." });
      }
      const result = applyScoreCollaborationHistoryCommand({
        ...input,
        documentId: document.id,
        actorId: request.authUserId!,
        actorRole: "owner",
      });
      return sendCanonicalScoreCommandResult(reply, document.id, result);
    },
  );

  app.post(
    "/scores/:id/candidate/accept",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const body = request.body as { pendingRevisionId?: string } | null;
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const result = acceptPendingScoreRevision({
        documentId: document.id,
        pendingRevisionId: body?.pendingRevisionId,
      });
      if (!result?.document || !result.revision) {
        return reply.code(409).send({ error: "This score does not have a matching candidate revision awaiting review." });
      }

      return reply.send({
        score: mapScoreDocumentForApi(result.document),
        revision: mapScoreRevisionForApi(result.revision),
        revisions: listScoreRevisionsByDocumentId(document.id).map(mapScoreRevisionForApi),
      });
    },
  );

  app.post(
    "/scores/:id/candidate/reject",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const body = request.body as { pendingRevisionId?: string } | null;
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const updatedDocument = rejectPendingScoreRevision({
        documentId: document.id,
        pendingRevisionId: body?.pendingRevisionId,
      });
      if (!updatedDocument) {
        return reply.code(409).send({ error: "This score does not have a matching candidate revision awaiting review." });
      }

      return reply.send({
        score: mapScoreDocumentForApi(updatedDocument),
        revisions: listScoreRevisionsByDocumentId(document.id).map(mapScoreRevisionForApi),
      });
    },
  );

  app.get(
    "/scores/:id/candidate/musicxml-preview",
    {
      preHandler: app.requireScorePreviewAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const candidate = findPendingRevisionForDocument(document);
      if (!candidate || candidate.status !== "candidate") {
        return reply.code(404).send({ error: "Candidate score revision not found." });
      }

      return reply.send({
        revisionId: candidate.id,
        musicXml: scoreJsonToMusicXml(migrateScoreJson(JSON.parse(candidate.score_json))),
      });
    },
  );

  app.patch(
    "/scores/:id/settings",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findCurrentRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      const scoreJson = migrateScoreJson(JSON.parse(revision.score_json));
      const settings = normalizeScoreProjectSettings(request.body, scoreJson);
      const updatedDocument = updateScoreDocumentSettings({
        documentId: document.id,
        settings,
      });

      if (!updatedDocument) {
        return reply.code(500).send({ error: "Could not save score settings." });
      }

      return reply.send({
        score: mapScoreDocumentForApi(updatedDocument),
        revisions: listScoreRevisionsByDocumentId(document.id).map(mapScoreRevisionForApi),
      });
    },
  );

  app.post(
    "/scores/:id/extract-parts",
    {
      preHandler: app.requireActiveEntitlement,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findCurrentRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      const scoreJson = migrateScoreJson(JSON.parse(revision.score_json));
      let extractionInput;
      try {
        extractionInput = validatePartExtractionInput(request.body, scoreJson);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid part extraction payload." });
      }

      let extractedScoreJson;
      try {
        const baseExtractedScoreJson = extractScoreParts({
          score: scoreJson,
          partIds: extractionInput.partIds,
          title: extractionInput.title,
        });
        const clefRecommendations = recommendScoreClefs(baseExtractedScoreJson);
        extractedScoreJson =
          extractionInput.applyRecommendedClefs && clefRecommendations.some((recommendation) => recommendation.noteCount > 0)
            ? applyScoreClefRecommendations({
                score: baseExtractedScoreJson,
                recommendations: clefRecommendations,
              })
            : baseExtractedScoreJson;
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Could not extract score parts." });
      }

      const extractedDocument = createScoreDocumentFromDerivedScoreJson({
        userId: request.authUserId!,
        title: extractedScoreJson.title,
        scoreJson: extractedScoreJson,
        createdFrom: "part_extract",
      });

      if (!extractedDocument) {
        return reply.code(500).send({ error: "Could not create the extracted part score project." });
      }

      return reply.code(201).send({
        score: mapScoreDocumentForApi(extractedDocument),
      });
    },
  );

  app.post(
    "/scores/:id/revisions/:revisionId/restore",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string; revisionId: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findScoreRevisionById(params.revisionId);
      if (!revision || revision.document_id !== document.id) {
        return reply.code(404).send({ error: "Score revision not found." });
      }

      const scoreJson = migrateScoreJson(JSON.parse(revision.score_json));
      const restoredScoreJson = {
        ...scoreJson,
        metadata: {
          ...scoreJson.metadata,
          warnings: [
            ...(Array.isArray(scoreJson.metadata?.warnings) ? scoreJson.metadata.warnings : []),
            `Restored from revision v${revision.revision_number} at ${new Date().toISOString()}.`,
          ],
        },
      };

      const nextRevision = createScoreRevisionFromScoreJson({
        documentId: document.id,
        scoreJson: restoredScoreJson,
        createdFrom: "restore",
        musicxmlFileId: revision.musicxml_file_id,
      });
      const updatedDocument = findScoreDocumentById(document.id);

      if (!nextRevision || !updatedDocument) {
        return reply.code(500).send({ error: "Could not restore the score revision." });
      }

      return reply.code(201).send({
        score: mapScoreDocumentForApi(updatedDocument),
        revision: mapScoreRevisionForApi(nextRevision),
        revisions: listScoreRevisionsByDocumentId(document.id).map(mapScoreRevisionForApi),
      });
    },
  );

  app.get(
    "/scores/:id/assets",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      return reply.send({
        assets: listScoreAssetsByDocumentId(document.id).map(mapScoreAssetForApi),
      });
    },
  );

  app.get(
    "/scores/:id/assets/:fileId/preview",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string; fileId: string };
      const document = findScoreDocumentById(params.id);
      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const asset = listScoreAssetsByDocumentId(document.id).find((item) =>
        item.file_id === params.fileId && ["source_pdf", "source_image", "omr_page_image"].includes(item.asset_kind),
      );
      const file = asset ? findStoredFileById(asset.file_id) : null;
      if (!file || file.user_id !== request.authUserId || !(await storedFileExists(file))) {
        return reply.code(404).send({ error: "Score preview asset not found." });
      }

      reply.header("Content-Type", file.mime_type);
      reply.header("Content-Disposition", `inline; filename="${encodeURIComponent(file.original_name)}"`);
      return reply.send(await openStoredFile(file));
    },
  );

  app.get(
    "/scores/:id/comments",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      return reply.send({
        comments: listScoreCommentsByDocumentId(document.id).map(mapScoreCommentForApi),
      });
    },
  );

  app.patch(
    "/scores/:id/comments/:commentId",
    { preHandler: app.requireScoreEditingAccess },
    async (request, reply) => {
      const params = request.params as { id: string; commentId: string };
      const body = request.body as { resolved?: unknown } | null;
      if (typeof body?.resolved !== "boolean") return reply.code(400).send({ error: "Resolved must be a boolean." });
      const document = findScoreDocumentById(params.id);
      if (!document || document.user_id !== request.authUserId) return reply.code(404).send({ error: "Score document not found." });
      const comment = setScoreCommentResolved({
        commentId: params.commentId,
        documentId: document.id,
        resolved: body.resolved,
        userId: request.authUserId!,
      });
      if (!comment) return reply.code(404).send({ error: "Score comment not found." });
      return reply.send({
        comment: mapScoreCommentForApi(comment),
        comments: listScoreCommentsByDocumentId(document.id).map(mapScoreCommentForApi),
      });
    },
  );

  app.get(
    "/scores/:id/share-links",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      return reply.send({
        shares: listScoreSharesByDocumentId(document.id).map(mapScoreShareForApi),
      });
    },
  );

  app.post(
    "/scores/:id/share-links",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      let shareInput;

      try {
        shareInput = validateShareInput(request.body);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid share payload." });
      }

      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const share = createScoreShare({
        documentId: document.id,
        userId: request.authUserId!,
        permission: shareInput.permission,
        label: shareInput.label,
        expiresAt: shareInput.expiresAt,
      });

      if (!share) {
        return reply.code(500).send({ error: "Could not create the score share link." });
      }

      return reply.code(201).send({
        share: mapScoreShareForApi(share),
        shares: listScoreSharesByDocumentId(document.id).map(mapScoreShareForApi),
      });
    },
  );

  app.delete(
    "/scores/:id/share-links/:shareId",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string; shareId: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const share = revokeScoreShare({
        shareId: params.shareId,
        documentId: document.id,
      });

      if (!share) {
        return reply.code(404).send({ error: "Share link not found." });
      }

      return reply.send({
        share: mapScoreShareForApi(share),
        shares: listScoreSharesByDocumentId(document.id).map(mapScoreShareForApi),
      });
    },
  );

  app.get(
    "/score-rubric-templates",
    {
      preHandler: app.requireActiveEntitlement,
    },
    async (request, reply) => {
      return reply.send({
        templates: listScoreRubricTemplatesByUserId(request.authUserId!).map(mapScoreRubricTemplateForApi),
      });
    },
  );

  app.post(
    "/score-rubric-templates",
    {
      preHandler: app.requireActiveEntitlement,
    },
    async (request, reply) => {
      let templateInput;

      try {
        templateInput = validateRubricTemplateInput(request.body);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid rubric template payload." });
      }

      const template = createScoreRubricTemplate({
        userId: request.authUserId!,
        name: templateInput.name,
        rubric: templateInput.rubric,
      });

      if (!template) {
        return reply.code(500).send({ error: "Could not create rubric template." });
      }

      return reply.code(201).send({
        template: mapScoreRubricTemplateForApi(template),
        templates: listScoreRubricTemplatesByUserId(request.authUserId!).map(mapScoreRubricTemplateForApi),
      });
    },
  );

  app.delete(
    "/score-rubric-templates/:templateId",
    {
      preHandler: app.requireActiveEntitlement,
    },
    async (request, reply) => {
      const params = request.params as { templateId: string };
      const deleted = deleteScoreRubricTemplate({
        templateId: params.templateId,
        userId: request.authUserId!,
      });

      if (!deleted) {
        return reply.code(404).send({ error: "Rubric template not found." });
      }

      return reply.send({
        templates: listScoreRubricTemplatesByUserId(request.authUserId!).map(mapScoreRubricTemplateForApi),
      });
    },
  );

  app.get(
    "/score-classrooms",
    {
      preHandler: app.requireActiveEntitlement,
    },
    async (request) => {
      const user = db.prepare("SELECT email FROM users WHERE id = ?").get(request.authUserId!) as { email: string } | undefined;
      if (user) linkEducationInvitationsByEmail(db, request.authUserId!, user.email);
      return {
        classrooms: listAccessibleClassroomIds(db, request.authUserId!).map((classroomId) => findScoreClassroomById(classroomId)!).map((classroom) => ({
          ...mapScoreClassroomForApi(classroom),
          access: resolveClassroomAccess(db, classroom.id, request.authUserId!),
          staff: listClassroomStaff(db, classroom.id),
          students: listScoreClassroomStudentsByClassroomId(classroom.id).map((student) => ({
            ...mapScoreClassroomStudentForApi(student),
            guardians: listStudentGuardians(db, student.id),
          })),
        })),
      };
    },
  );

  app.post(
    "/score-classrooms",
    {
      preHandler: app.requireActiveEntitlement,
    },
    async (request, reply) => {
      let input;
      try {
        input = validateClassroomInput(request.body);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid classroom payload." });
      }

      if (input.organizationId) {
        const role = resolveOrganizationRole(db, input.organizationId, request.authUserId!);
        if (!role || !new Set(["owner", "admin", "teacher"]).has(role)) return reply.code(400).send({ error: "Organization is not available for classroom creation." });
        if (input.campusId) {
          const campus = db.prepare("SELECT id FROM score_organization_campuses WHERE id = ? AND organization_id = ? AND archived_at IS NULL").get(input.campusId, input.organizationId) as { id: string } | undefined;
          if (!campus) return reply.code(400).send({ error: "Campus is not available for this organization." });
        }
      } else if (input.campusId) {
        return reply.code(400).send({ error: "A campus requires an organization." });
      }

      const classroom = createScoreClassroom({
        userId: request.authUserId!,
        name: input.name,
        description: input.description,
        organizationId: input.organizationId,
        campusId: input.campusId,
      });

      if (!classroom) {
        return reply.code(500).send({ error: "Could not create classroom." });
      }

      return reply.code(201).send({
        classroom: {
          ...mapScoreClassroomForApi(classroom),
          students: [],
        },
      });
    },
  );

  app.delete(
    "/score-classrooms/:classroomId",
    {
      preHandler: app.requireActiveEntitlement,
    },
    async (request, reply) => {
      const params = request.params as { classroomId: string };
      const access = resolveClassroomAccess(db, params.classroomId, request.authUserId!);
      if (!access?.canAdmin) {
        return reply.code(404).send({ error: "Classroom not found." });
      }
      const classroom = archiveScoreClassroom({ classroomId: params.classroomId });
      if (!classroom) return reply.code(404).send({ error: "Classroom not found." });

      return {
        classroom: mapScoreClassroomForApi(classroom),
      };
    },
  );

  app.post(
    "/score-classrooms/:classroomId/students",
    {
      preHandler: app.requireActiveEntitlement,
    },
    async (request, reply) => {
      const params = request.params as { classroomId: string };
      const classroom = findScoreClassroomById(params.classroomId);
      const access = resolveClassroomAccess(db, params.classroomId, request.authUserId!);
      if (!classroom || !access?.canOperate || classroom.archived_at) {
        return reply.code(404).send({ error: "Classroom not found." });
      }

      let input;
      try {
        input = validateClassroomStudentInput(request.body);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid student payload." });
      }

      const student = createScoreClassroomStudent({
        classroomId: classroom.id,
        displayName: input.displayName,
        contactEmail: input.contactEmail,
        externalRef: input.externalRef,
      });

      if (!student) {
        return reply.code(500).send({ error: "Could not create classroom student." });
      }

      return reply.code(201).send({
        student: mapScoreClassroomStudentForApi(student),
        students: listScoreClassroomStudentsByClassroomId(classroom.id).map((item) => ({
          ...mapScoreClassroomStudentForApi(item),
          guardians: listStudentGuardians(db, item.id),
        })),
      });
    },
  );

  app.post(
    "/score-classrooms/:classroomId/students/bulk",
    {
      preHandler: app.requireActiveEntitlement,
    },
    async (request, reply) => {
      const params = request.params as { classroomId: string };
      const classroom = findScoreClassroomById(params.classroomId);
      const access = resolveClassroomAccess(db, params.classroomId, request.authUserId!);
      if (!classroom || !access?.canOperate || classroom.archived_at) return reply.code(404).send({ error: "Classroom not found." });
      const body = request.body as { students?: unknown } | null;
      if (!Array.isArray(body?.students) || body.students.length === 0 || body.students.length > 500) {
        return reply.code(400).send({ error: "Bulk roster must contain between 1 and 500 students." });
      }
      let students;
      try {
        students = body.students.map(validateClassroomStudentInput);
        const emails = students.map((item) => item.contactEmail?.toLocaleLowerCase()).filter(Boolean) as string[];
        if (new Set(emails).size !== emails.length) throw new Error("Bulk roster contains duplicate student emails.");
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid bulk roster." });
      }
      db.exec("BEGIN IMMEDIATE");
      try {
        for (const student of students) createScoreClassroomStudent({ classroomId: classroom.id, ...student });
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        request.log.error({ error }, "Bulk roster import failed.");
        return reply.code(500).send({ error: "Could not import the bulk roster." });
      }
      return reply.code(201).send({
        importedCount: students.length,
        students: listScoreClassroomStudentsByClassroomId(classroom.id).map((item) => ({
          ...mapScoreClassroomStudentForApi(item),
          guardians: listStudentGuardians(db, item.id),
        })),
      });
    },
  );

  app.delete(
    "/score-classrooms/:classroomId/students/:studentId",
    {
      preHandler: app.requireActiveEntitlement,
    },
    async (request, reply) => {
      const params = request.params as { classroomId: string; studentId: string };
      const classroom = findScoreClassroomById(params.classroomId);
      const access = resolveClassroomAccess(db, params.classroomId, request.authUserId!);
      if (!classroom || !access?.canOperate || classroom.archived_at) {
        return reply.code(404).send({ error: "Classroom not found." });
      }

      const student = archiveScoreClassroomStudent({
        classroomId: classroom.id,
        studentId: params.studentId,
      });

      if (!student) {
        return reply.code(404).send({ error: "Student not found." });
      }

      return {
        student: mapScoreClassroomStudentForApi(student),
        students: listScoreClassroomStudentsByClassroomId(classroom.id).map(mapScoreClassroomStudentForApi),
      };
    },
  );

  app.get(
    "/scores/:id/assignments",
    {
      preHandler: app.requireActiveEntitlement,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      return reply.send({
        assignments: listScoreAssignmentsByDocumentId(document.id).map(mapScoreAssignmentForApi),
      });
    },
  );

  app.post(
    "/scores/:id/assignments",
    {
      preHandler: app.requireActiveEntitlement,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      let assignmentInput;

      try {
        assignmentInput = validateAssignmentInput(request.body);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid assignment payload." });
      }

      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      let shareId = assignmentInput.shareId;
      if (shareId) {
        const selectedShare = listScoreSharesByDocumentId(document.id).find((share) => share.id === shareId);
        if (!selectedShare || !isShareUsable(mapScoreShareForApi(selectedShare))) {
          return reply.code(400).send({ error: "Selected share link is not available for this assignment." });
        }
      } else {
        const share = createScoreShare({
          documentId: document.id,
          userId: request.authUserId!,
          expiresAt: null,
        });

        if (!share) {
          return reply.code(500).send({ error: "Could not create an assignment share link." });
        }

        shareId = share.id;
      }

      if (assignmentInput.classroomId) {
        const classroom = findScoreClassroomById(assignmentInput.classroomId);
        const access = resolveClassroomAccess(db, assignmentInput.classroomId, request.authUserId!);
        if (!classroom || !access?.canOperate || classroom.archived_at) {
          return reply.code(400).send({ error: "Selected classroom is not available for this assignment." });
        }
      }

      const assignment = createScoreAssignment({
        documentId: document.id,
        userId: request.authUserId!,
        revisionId: document.current_revision_id,
        shareId,
        classroomId: assignmentInput.classroomId,
        title: assignmentInput.title,
        instructions: assignmentInput.instructions,
        dueAt: assignmentInput.dueAt,
        rubric: assignmentInput.rubric,
        practiceSettings: assignmentInput.practiceSettings,
      });

      if (!assignment) {
        return reply.code(500).send({ error: "Could not create score assignment." });
      }

      return reply.code(201).send({
        assignment: mapScoreAssignmentForApi(assignment),
        assignments: listScoreAssignmentsByDocumentId(document.id).map(mapScoreAssignmentForApi),
        shares: listScoreSharesByDocumentId(document.id).map(mapScoreShareForApi),
      });
    },
  );

  app.delete(
    "/scores/:id/assignments/:assignmentId",
    {
      preHandler: app.requireActiveEntitlement,
    },
    async (request, reply) => {
      const params = request.params as { id: string; assignmentId: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const assignment = archiveScoreAssignment({
        assignmentId: params.assignmentId,
        documentId: document.id,
      });

      if (!assignment) {
        return reply.code(404).send({ error: "Assignment not found." });
      }

      return reply.send({
        assignment: mapScoreAssignmentForApi(assignment),
        assignments: listScoreAssignmentsByDocumentId(document.id).map(mapScoreAssignmentForApi),
      });
    },
  );

  app.get(
    "/scores/:id/assignment-submissions",
    {
      preHandler: app.requireActiveEntitlement,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      return reply.send({
        submissions: listScoreAssignmentSubmissionsByDocumentId(document.id).map(mapScoreAssignmentSubmissionForApi),
      });
    },
  );

  app.get(
    "/scores/:id/assignment-analytics",
    {
      preHandler: app.requireActiveEntitlement,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      return reply.send({
        analytics: getScoreAssignmentAnalytics(document.id),
      });
    },
  );

  app.patch(
    "/scores/:id/assignment-submissions/:submissionId/review",
    {
      preHandler: app.requireActiveEntitlement,
    },
    async (request, reply) => {
      const params = request.params as { id: string; submissionId: string };
      let reviewInput;

      try {
        reviewInput = validateAssignmentReviewInput(request.body);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid assignment review payload." });
      }

      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const existingSubmission = findScoreAssignmentSubmissionById(params.submissionId);
      if (!existingSubmission || existingSubmission.document_id !== document.id) {
        return reply.code(404).send({ error: "Assignment submission not found." });
      }

      const assignment = findScoreAssignmentById(existingSubmission.assignment_id);
      const rubric = assignment ? mapScoreAssignmentForApi(assignment).rubric : [];
      const rubricById = new Map(rubric.map((criterion) => [criterion.id, criterion]));
      for (const score of reviewInput.rubricScores) {
        const criterion = rubricById.get(score.criterionId);
        if (!criterion) {
          return reply.code(400).send({ error: "Rubric score does not match this assignment." });
        }

        if (score.score > criterion.maxScore) {
          return reply.code(400).send({ error: "Rubric score cannot be greater than the criterion max score." });
        }
      }

      const submission = reviewScoreAssignmentSubmission({
        submissionId: params.submissionId,
        documentId: document.id,
        teacherFeedback: reviewInput.teacherFeedback,
        gradeScore: reviewInput.gradeScore,
        gradeMax: reviewInput.gradeMax,
        rubricScores: reviewInput.rubricScores,
      });

      if (!submission || submission.document_id !== document.id) {
        return reply.code(404).send({ error: "Assignment submission not found." });
      }

      return reply.send({
        submission: mapScoreAssignmentSubmissionForApi(submission),
        submissions: listScoreAssignmentSubmissionsByDocumentId(document.id).map(mapScoreAssignmentSubmissionForApi),
      });
    },
  );

  app.get("/scores/shared/:token", async (request, reply) => {
    const params = request.params as { token: string };
    const sharedScore = findSharedScoreByToken(params.token);

    if (!sharedScore) {
      return reply.code(404).send({ error: "Shared score not found." });
    }

    const payload = mapSharedScoreForApi(sharedScore);
    if (!isShareUsable(payload.share)) {
      return reply.code(404).send({ error: "This shared score link is no longer available." });
    }

    const scoreJson = payload.score.currentRevision?.scoreJson;

    return reply.send({
      ...payload,
      assignments: listScoreAssignmentsByShareToken(params.token).map(mapPublicScoreAssignmentForApi),
      comments: payload.share.permission === "view" ? [] : listScoreCommentsByDocumentId(payload.score.id).map(mapScoreCommentForApi),
      musicXml: scoreJson ? scoreJsonToMusicXml(scoreJson) : null,
      jianpu: scoreJson ? scoreJsonToJianpu(scoreJson) : null,
    });
  });

  app.post("/scores/shared/:token/comments", async (request, reply) => {
    const params = request.params as { token: string };
    const sharedScore = findSharedScoreByToken(params.token);
    if (!sharedScore) return reply.code(404).send({ error: "Shared score not found." });
    const payload = mapSharedScoreForApi(sharedScore);
    if (!isShareUsable(payload.share) || (payload.share.permission !== "comment" && payload.share.permission !== "edit")) {
      return reply.code(403).send({ error: "This share link does not allow score comments." });
    }
    let commentInput;
    try {
      const validated = validateScoreCommentInput(request.body);
      commentInput = {
        ...validated,
        target: validateSharedAnnotationTarget(validated.target, payload.score.currentRevision?.scoreJson),
      };
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid comment payload." });
    }
    const comment = createScoreComment({
      documentId: payload.score.id,
      userId: sharedScore.created_by_user_id,
      shareId: payload.share.id,
      authorName: payload.share.label,
      body: commentInput.body,
      target: commentInput.target,
    });
    if (!comment) return reply.code(500).send({ error: "Could not create score comment." });
    return reply.code(201).send({
      comment: mapScoreCommentForApi(comment),
      comments: listScoreCommentsByDocumentId(payload.score.id).map(mapScoreCommentForApi),
    });
  });

  app.post("/scores/shared/:token/collaboration/commands", async (request, reply) => {
    const params = request.params as { token: string };
    const sharedScore = findSharedScoreByToken(params.token);
    if (!sharedScore) return reply.code(404).send({ error: "Shared score not found." });
    const sharedPayload = mapSharedScoreForApi(sharedScore);
    if (!isShareUsable(sharedPayload.share) || sharedPayload.share.permission !== "edit") {
      return reply.code(403).send({ error: "This share link does not allow score editing." });
    }
    let input;
    try {
      input = validateCanonicalScoreCommandRequest(request.body);
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid collaboration command." });
    }
    const result = applyCanonicalScoreCollaborationCommand({
      operationId: input.operationId,
      documentId: sharedPayload.score.id,
      actorId: `share:${sharedPayload.share.id}`,
      actorRole: "editor",
      baseRevisionId: input.baseRevisionId,
      command: input.command,
    });
    return sendCanonicalScoreCommandResult(reply, sharedPayload.score.id, result);
  });

  app.get("/scores/shared/:token/collaboration/commands", async (request, reply) => {
    const params = request.params as { token: string };
    const sharedScore = findSharedScoreByToken(params.token);
    if (!sharedScore) return reply.code(404).send({ error: "Shared score not found." });
    const sharedPayload = mapSharedScoreForApi(sharedScore);
    if (!isShareUsable(sharedPayload.share) || sharedPayload.share.permission !== "edit") {
      return reply.code(403).send({ error: "This share link does not allow score editing." });
    }
    const actorId = `share:${sharedPayload.share.id}`;
    return reply.send({
      commands: listScoreCollaborationCommandsByDocumentId(sharedPayload.score.id).map((command) => {
        const mapped = mapScoreCollaborationCommandForApi(command);
        return { ...mapped, isCurrentActor: mapped.actorId === actorId };
      }),
    });
  });

  app.post("/scores/shared/:token/collaboration/history", async (request, reply) => {
    const params = request.params as { token: string };
    const sharedScore = findSharedScoreByToken(params.token);
    if (!sharedScore) return reply.code(404).send({ error: "Shared score not found." });
    const sharedPayload = mapSharedScoreForApi(sharedScore);
    if (!isShareUsable(sharedPayload.share) || sharedPayload.share.permission !== "edit") {
      return reply.code(403).send({ error: "This share link does not allow score editing." });
    }
    let input;
    try {
      input = validateScoreCollaborationHistoryRequest(request.body);
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid collaboration history command." });
    }
    const result = applyScoreCollaborationHistoryCommand({
      ...input,
      documentId: sharedPayload.score.id,
      actorId: `share:${sharedPayload.share.id}`,
      actorRole: "editor",
    });
    return sendCanonicalScoreCommandResult(reply, sharedPayload.score.id, result);
  });

  app.get("/scores/shared/:token/playback", async (request, reply) => {
    const params = request.params as { token: string };
    const sharedScore = findSharedScoreByToken(params.token);

    if (!sharedScore) {
      return reply.code(404).send({ error: "Shared score not found." });
    }

    const payload = mapSharedScoreForApi(sharedScore);
    if (!isShareUsable(payload.share)) {
      return reply.code(404).send({ error: "This shared score link is no longer available." });
    }

    const scoreJson = payload.score.currentRevision?.scoreJson;
    if (!scoreJson) {
      return reply.code(404).send({ error: "Current shared score revision not found." });
    }

    return reply.send({
      playback: scoreJsonToPlayback(scoreJson),
    });
  });

  app.get("/scores/shared/:token/assignments/:assignmentId/score", async (request, reply) => {
    const params = request.params as { token: string; assignmentId: string };
    const sharedScore = findSharedScoreByToken(params.token);

    if (!sharedScore) {
      return reply.code(404).send({ error: "Shared score not found." });
    }

    const payload = mapSharedScoreForApi(sharedScore);
    if (!isShareUsable(payload.share)) {
      return reply.code(404).send({ error: "This shared score link is no longer available." });
    }

    const assignment = listScoreAssignmentsByShareToken(params.token).find((item) => item.id === params.assignmentId);
    if (!assignment || assignment.document_id !== payload.score.id) {
      return reply.code(404).send({ error: "Assignment is not available for this shared score." });
    }

    const assignmentRevision = assignment.revision_id ? findScoreRevisionById(assignment.revision_id) : null;
    const revision =
      assignmentRevision && assignmentRevision.document_id === payload.score.id
        ? assignmentRevision
        : null;
    const scoreJson = revision ? migrateScoreJson(JSON.parse(revision.score_json)) : payload.score.currentRevision?.scoreJson;

    if (!scoreJson) {
      return reply.code(404).send({ error: "Assignment score revision not found." });
    }

    return reply.send({
      assignmentId: assignment.id,
      revisionId: revision?.id ?? payload.score.currentRevisionId,
      revisionNumber: revision?.revision_number ?? payload.score.currentRevision?.revisionNumber ?? null,
      scoreJson,
      musicXml: scoreJsonToMusicXml(scoreJson),
      jianpu: scoreJsonToJianpu(scoreJson),
    });
  });

  app.get("/scores/shared/:token/assignments/:assignmentId/playback", async (request, reply) => {
    const params = request.params as { token: string; assignmentId: string };
    const sharedScore = findSharedScoreByToken(params.token);

    if (!sharedScore) {
      return reply.code(404).send({ error: "Shared score not found." });
    }

    const payload = mapSharedScoreForApi(sharedScore);
    if (!isShareUsable(payload.share)) {
      return reply.code(404).send({ error: "This shared score link is no longer available." });
    }

    const assignment = listScoreAssignmentsByShareToken(params.token).find((item) => item.id === params.assignmentId);
    if (!assignment || assignment.document_id !== payload.score.id) {
      return reply.code(404).send({ error: "Assignment is not available for this shared score." });
    }

    const assignmentRevision = assignment.revision_id ? findScoreRevisionById(assignment.revision_id) : null;
    const scoreJson =
      assignmentRevision && assignmentRevision.document_id === payload.score.id
        ? migrateScoreJson(JSON.parse(assignmentRevision.score_json))
        : payload.score.currentRevision?.scoreJson;

    if (!scoreJson) {
      return reply.code(404).send({ error: "Assignment score revision not found." });
    }

    return reply.send({
      playback: scoreJsonToPlayback(scoreJson),
      revisionId: assignmentRevision?.id ?? payload.score.currentRevisionId,
    });
  });

  app.post("/scores/shared/:token/assignments/:assignmentId/submissions", async (request, reply) => {
    const params = request.params as { token: string; assignmentId: string };
    let submissionInput;

    try {
      submissionInput = validateAssignmentSubmissionInput(request.body);
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid assignment submission payload." });
    }

    const sharedScore = findSharedScoreByToken(params.token);

    if (!sharedScore) {
      return reply.code(404).send({ error: "Shared score not found." });
    }

    const payload = mapSharedScoreForApi(sharedScore);
    if (!isShareUsable(payload.share)) {
      return reply.code(404).send({ error: "This shared score link is no longer available." });
    }

    const assignment = listScoreAssignmentsByShareToken(params.token).find((item) => item.id === params.assignmentId);
    if (!assignment || assignment.status !== "open") {
      return reply.code(404).send({ error: "Assignment is not available for submissions." });
    }

    const submission = createScoreAssignmentSubmission({
      assignmentId: assignment.id,
      documentId: assignment.document_id,
      submitterName: submissionInput.submitterName,
      submitterContact: submissionInput.submitterContact,
      note: submissionInput.note,
      recordingUrl: submissionInput.recordingUrl,
      practiceMinutes: submissionInput.practiceMinutes,
      practiceSettings: submissionInput.practiceSettings,
      performanceAnalysis: submissionInput.performanceAnalysis,
    });

    if (!submission) {
      return reply.code(500).send({ error: "Could not submit the assignment response." });
    }

    return reply.code(201).send({
      submission: mapScoreAssignmentSubmissionForApi(submission),
    });
  });

  app.post("/scores/shared/:token/assignments/:assignmentId/submissions/performance", async (request, reply) => {
    const params = request.params as { token: string; assignmentId: string };
    const sharedScore = findSharedScoreByToken(params.token);

    if (!sharedScore) {
      return reply.code(404).send({ error: "Shared score not found." });
    }

    const payload = mapSharedScoreForApi(sharedScore);
    if (!isShareUsable(payload.share)) {
      return reply.code(404).send({ error: "This shared score link is no longer available." });
    }

    const assignment = listScoreAssignmentsByShareToken(params.token).find((item) => item.id === params.assignmentId);
    if (!assignment || assignment.status !== "open") {
      return reply.code(404).send({ error: "Assignment is not available for submissions." });
    }

    const fields: Record<string, string> = {};
    let uploadedFile:
      | {
          originalName: string;
          storedName: string;
          storagePath: string;
          mimeType: string;
          sizeBytes: number;
        }
      | null = null;

    const submissionDir = path.join(config.storageDir, sharedScore.created_by_user_id, "scores", "submissions");
    fs.mkdirSync(submissionDir, { recursive: true });

    try {
      for await (const part of request.parts()) {
        if (part.type === "file") {
          const filename = part.filename || "performance-upload";
          if (uploadedFile) {
            part.file.resume();
            return reply.code(400).send({ error: "Only one performance file can be uploaded per submission." });
          }

          const storedName = `${createId()}-${sanitizeFilename(filename)}`;
          const targetPath = path.join(submissionDir, storedName);
          let verified;
          try {
            verified = await storeVerifiedUpload({
              stream: part.file,
              targetPath,
              allowedKinds: uploadKinds.performance,
              mediaSafety: {
                mode: "performance",
                maxDurationSeconds: config.performanceUploadMaxDurationSeconds,
                maxVideoWidth: config.mediaUploadMaxVideoWidth,
                maxVideoHeight: config.mediaUploadMaxVideoHeight,
              },
            });
          } catch (error) {
            const response = uploadErrorResponse(error);
            request.log.warn({ error, uploadCode: response.body.code }, "Performance upload rejected.");
            return reply.code(response.statusCode).send(response.body);
          }

          uploadedFile = {
            originalName: filename,
            storedName,
            storagePath: targetPath,
            mimeType: verified.mimeType,
            sizeBytes: verified.sizeBytes,
          };
        } else if (typeof part.value === "string") {
          fields[part.fieldname] = part.value;
        }
      }
    } catch (error) {
      if (uploadedFile) {
        fs.rmSync(uploadedFile.storagePath, { force: true });
      }

      request.log.warn({ error }, "Performance submission upload failed.");
      return reply.code(400).send({ error: "Performance upload failed. Check the file size and try again." });
    }

    if (!uploadedFile) {
      return reply.code(400).send({ error: "No performance file uploaded." });
    }

    let submissionInput;
    try {
      submissionInput = validateAssignmentSubmissionInput({
        submitterName: fields.submitterName,
        submitterContact: fields.submitterContact,
        note: fields.note,
        recordingUrl: fields.recordingUrl,
        practiceMinutes: fields.practiceMinutes?.trim() ? Number(fields.practiceMinutes) : null,
        practiceSettings: fields.practiceSettings?.trim() ? JSON.parse(fields.practiceSettings) : null,
        performanceAnalysis: fields.performanceAnalysis?.trim() ? JSON.parse(fields.performanceAnalysis) : null,
      });
    } catch (error) {
      fs.rmSync(uploadedFile.storagePath, { force: true });
      return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid assignment submission payload." });
    }

    const storedFile = await createStoredFile({
      userId: sharedScore.created_by_user_id,
      originalName: uploadedFile.originalName,
      storedName: uploadedFile.storedName,
      storagePath: uploadedFile.storagePath,
      mimeType: uploadedFile.mimeType,
      sizeBytes: uploadedFile.sizeBytes,
      fileKind: "source_audio",
    });

    if (!storedFile) {
      fs.rmSync(uploadedFile.storagePath, { force: true });
      return reply.code(500).send({ error: "Could not store the performance file." });
    }

    const submission = createScoreAssignmentSubmission({
      assignmentId: assignment.id,
      documentId: assignment.document_id,
      submitterName: submissionInput.submitterName,
      submitterContact: submissionInput.submitterContact,
      note: submissionInput.note,
      recordingUrl: submissionInput.recordingUrl,
      performanceFileId: storedFile.id,
      practiceMinutes: submissionInput.practiceMinutes,
      practiceSettings: submissionInput.practiceSettings,
      performanceAnalysis: submissionInput.performanceAnalysis,
    });

    if (!submission) {
      return reply.code(500).send({ error: "Could not submit the assignment response." });
    }

    return reply.code(201).send({
      submission: mapScoreAssignmentSubmissionForApi(submission),
    });
  });

  app.get("/scores/shared/:token/submission-reviews/:reviewToken", async (request, reply) => {
    const params = request.params as { token: string; reviewToken: string };
    const sharedScore = findSharedScoreByToken(params.token);

    if (!sharedScore) {
      return reply.code(404).send({ error: "Shared score not found." });
    }

    const payload = mapSharedScoreForApi(sharedScore);
    if (!isShareUsable(payload.share)) {
      return reply.code(404).send({ error: "This shared score link is no longer available." });
    }

    const submission = findScoreAssignmentSubmissionByReviewToken(params.reviewToken);
    if (!submission || submission.document_id !== payload.score.id) {
      return reply.code(404).send({ error: "Submission review was not found." });
    }

    return reply.send({
      submission: mapScoreAssignmentSubmissionForApi(submission),
      performanceComments: listPerformanceSubmissionComments({
        documentId: submission.document_id,
        submissionId: submission.id,
      }).map((comment) => {
        const payload = mapScoreCommentForApi(comment);
        return {
          id: payload.id,
          body: payload.body,
          target: payload.target,
          createdAt: payload.createdAt,
        };
      }),
    });
  });

  app.get("/scores/shared/:token/submission-reviews/:reviewToken/performance-file", async (request, reply) => {
    const params = request.params as { token: string; reviewToken: string };
    const sharedScore = findSharedScoreByToken(params.token);

    if (!sharedScore) {
      return reply.code(404).send({ error: "Shared score not found." });
    }

    const payload = mapSharedScoreForApi(sharedScore);
    if (!isShareUsable(payload.share)) {
      return reply.code(404).send({ error: "This shared score link is no longer available." });
    }

    const submission = findScoreAssignmentSubmissionByReviewToken(params.reviewToken);
    if (!submission || submission.document_id !== payload.score.id || !submission.performance_file_id) {
      return reply.code(404).send({ error: "Performance file was not found." });
    }

    const file = findStoredFileById(submission.performance_file_id);
    if (!file || file.user_id !== sharedScore.created_by_user_id || !(await storedFileExists(file))) {
      return reply.code(404).send({ error: "Performance file was not found." });
    }

    reply.header("Content-Type", file.mime_type);
    reply.header("Content-Disposition", `inline; filename="${encodeURIComponent(file.original_name)}"`);
    return reply.send(await openStoredFile(file));
  });

  app.post(
    "/scores/:id/comments",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      let commentInput;

      try {
        commentInput = validateScoreCommentInput(request.body);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid comment payload." });
      }

      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const comment = createScoreComment({
        documentId: document.id,
        userId: request.authUserId!,
        body: commentInput.body,
        target: commentInput.target,
      });

      if (!comment) {
        return reply.code(500).send({ error: "Could not create score comment." });
      }

      return reply.code(201).send({
        comment: mapScoreCommentForApi(comment),
        comments: listScoreCommentsByDocumentId(document.id).map(mapScoreCommentForApi),
      });
    },
  );

  app.get(
    "/scores/:id/jobs",
    {
      preHandler: app.requireScorePreviewAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      return reply.send({
        jobs: listScoreJobsByDocumentId(document.id).map(mapScoreJobForApi),
        omrDiagnostics: listOmrDiagnosticsByDocumentId(document.id).map(mapOmrDiagnosticForApi),
      });
    },
  );

  app.post(
    "/scores/:id/exports",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);
      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      let exportRequest;
      try {
        exportRequest = normalizeScoreExportRequest(request.body);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid export request." });
      }

      const revision = findCurrentRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      const scoreJson = migrateScoreJson(JSON.parse(revision.score_json));
      const needsPlayback = ["midi", "wav", "mp3"].includes(exportRequest.format);
      const needsMusicXml = ["musicxml", "pdf", "svg", "png"].includes(exportRequest.format);
      const playback = needsPlayback ? scoreJsonToPlayback(scoreJson) : undefined;
      if (needsPlayback && (!playback || playback.events.length === 0)) {
        return reply.code(400).send({ error: "The current score revision does not contain playable note events." });
      }

      const renderedOptions: RenderedScoreExportOptions = {
        imageResolutionDpi: exportRequest.options.imageResolutionDpi,
        trimImage: exportRequest.options.trimImage,
        trimImageMargin: exportRequest.options.trimImageMargin,
        pageSize: exportRequest.options.pageSize === "default" ? undefined : exportRequest.options.pageSize,
        marginPreset: exportRequest.options.marginPreset === "default" ? undefined : exportRequest.options.marginPreset,
      };
      const snapshot: ScoreExportSnapshot = {
        schemaVersion: 1,
        format: exportRequest.format,
        revisionId: revision.id,
        revisionNumber: revision.revision_number,
        title: scoreJson.title,
        musicXml: needsMusicXml ? scoreJsonToMusicXml(scoreJson, { pageLayout: renderedExportPageLayout(renderedOptions) }) : undefined,
        playback,
        options: exportRequest.options,
      };
      const job = createScoreExportJob({
        userId: request.authUserId!,
        documentId: document.id,
        params: snapshot as unknown as Record<string, unknown>,
      });
      if (!job) {
        return reply.code(500).send({ error: "Could not queue the score export." });
      }

      return reply.code(202).send({ job: mapScoreJobForApi(job) });
    },
  );

  app.post(
    "/scores/:id/jobs/:jobId/cancel",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string; jobId: string };
      const document = findScoreDocumentById(params.id);
      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }
      const job = cancelScoreJob({ jobId: params.jobId, userId: request.authUserId!, documentId: document.id });
      if (!job) {
        return reply.code(409).send({ error: "Only queued or in-progress score operations can be cancelled." });
      }
      return reply.send({ job: mapScoreJobForApi(job) });
    },
  );

  app.post(
    "/scores/:id/jobs/:jobId/retry",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string; jobId: string };
      const document = findScoreDocumentById(params.id);
      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }
      const job = retryScoreJob({ jobId: params.jobId, userId: request.authUserId!, documentId: document.id });
      if (!job) {
        return reply.code(409).send({ error: "Only failed or cancelled jobs can be retried." });
      }
      return reply.code(202).send({ job: mapScoreJobForApi(job) });
    },
  );

  app.post(
    "/scores/:id/transpose/suggestions",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const body = request.body as {
        rangeProfile?: { id?: string };
        rangePartIds?: string[];
        rangeAssignments?: Array<{ partId?: string; profileId?: string }>;
        minSemitones?: number;
        maxSemitones?: number;
        limit?: number;
      } | null;
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findCurrentRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      const scoreJson = migrateScoreJson(JSON.parse(revision.score_json));
      const rangeAssignments = normalizeRangeAssignments(body?.rangeAssignments, scoreJson);
      const rangePartIds = normalizeRangePartIds(body?.rangePartIds, scoreJson);
      if (rangeAssignments.length > 0) {
        return reply.send({
          rangeAssignments,
          suggestions: suggestTranspositionsForAssignedRanges({
            score: scoreJson,
            assignments: rangeAssignments,
            minSemitones: body?.minSemitones,
            maxSemitones: body?.maxSemitones,
            limit: body?.limit,
          }),
        });
      }

      const rangeProfile = SCORE_RANGE_PROFILES.find((item) => item.id === body?.rangeProfile?.id);
      if (!rangeProfile) {
        return reply.code(400).send({ error: "Please choose a supported range profile before requesting transpose suggestions." });
      }

      return reply.send({
        rangeProfile,
        suggestions: suggestTranspositionsForRange({
          score: scoreJson,
          profile: rangeProfile,
          partIds: rangePartIds,
          minSemitones: body?.minSemitones,
          maxSemitones: body?.maxSemitones,
          limit: body?.limit,
        }),
      });
    },
  );

  app.post(
    "/scores/:id/transpose",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const body = request.body as {
        semitones?: number;
        targetKey?: { tonic?: string; mode?: string };
        instrumentProfile?: { id?: string };
        rangeProfile?: { id?: string };
        rangePartIds?: string[];
        rangeAssignments?: Array<{ partId?: string; profileId?: string }>;
        useMusic21?: boolean;
        spellingPolicy?: TransposeSpellingPolicy;
        pitchMode?: TransposePitchMode;
        diatonicSteps?: number;
      } | null;
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findCurrentRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      const scoreJson = migrateScoreJson(JSON.parse(revision.score_json));
      const rangeAssignments = normalizeRangeAssignments(body?.rangeAssignments, scoreJson);
      const rangePartIds = normalizeRangePartIds(body?.rangePartIds, scoreJson);
      let semitones = body?.semitones;
      let targetKey;
      let operationLabel: string | undefined;
      let rangeProfile: (typeof SCORE_RANGE_PROFILES)[number] | undefined;
      const supportedSpellingPolicies = new Set<TransposeSpellingPolicy>(["auto", "preserve", "prefer-sharps", "prefer-flats"]);
      const spellingPolicy = body?.spellingPolicy ?? "auto";
      const pitchMode = body?.pitchMode ?? "concert-to-written";

      if (!supportedSpellingPolicies.has(spellingPolicy)) {
        return reply.code(400).send({ error: "Unsupported accidental spelling policy." });
      }
      if (pitchMode !== "concert-to-written" && pitchMode !== "written-to-concert") {
        return reply.code(400).send({ error: "Unsupported concert/written pitch direction." });
      }
      if (body?.diatonicSteps !== undefined && (!Number.isInteger(body.diatonicSteps) || body.diatonicSteps < -14 || body.diatonicSteps > 14)) {
        return reply.code(400).send({ error: "Diatonic interval steps must be an integer from -14 to 14." });
      }

      if (body?.targetKey?.tonic) {
        try {
          const target = semitonesForTargetKey({
            score: scoreJson,
            targetTonic: body.targetKey.tonic,
            targetMode: body.targetKey.mode,
          });
          semitones = target.semitones;
          targetKey = target.target;
        } catch (error) {
          return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid target key." });
        }
      }

      if (body?.instrumentProfile?.id) {
        const profile = TRANSPOSING_INSTRUMENT_PROFILES.find((item) => item.id === body.instrumentProfile?.id);
        if (!profile) {
          return reply.code(400).send({ error: "Unsupported transposing instrument profile." });
        }

        semitones = semitonesForInstrumentPitchMode(profile.semitonesFromConcertPitch, pitchMode);
        targetKey = undefined;
        operationLabel = `${profile.label} (${pitchMode})`;
      }

      if (body?.rangeProfile?.id) {
        rangeProfile = SCORE_RANGE_PROFILES.find((item) => item.id === body.rangeProfile?.id);
        if (!rangeProfile) {
          return reply.code(400).send({ error: "Unsupported range profile." });
        }
      }

      if (typeof semitones !== "number" || !Number.isInteger(semitones) || semitones < -24 || semitones > 24 || (semitones === 0 && !targetKey)) {
        return reply
          .code(400)
          .send({ error: "Please provide a non-zero integer semitone value from -24 to 24, a different target key, or a transposing instrument profile." });
      }

      let transposedScoreJson: ScoreJson;
      const transposeWarnings: string[] = [];
      let transposeEngine: "music21" | "score-json" = "score-json";
      const requiresDiatonicSpelling = body?.diatonicSteps !== undefined && spellingPolicy === "preserve";
      const shouldUseMusic21 = body?.useMusic21 !== false && Boolean(config.music21Command) && !requiresDiatonicSpelling;

      if (requiresDiatonicSpelling && body?.useMusic21 !== false && config.music21Command) {
        transposeWarnings.push("The Score JSON transposer was selected for this named interval so its requested diatonic spelling is preserved exactly.");
      }

      if (shouldUseMusic21) {
        try {
          const result = await transposeScoreJsonWithMusic21({
            score: scoreJson,
            semitones,
            music21Command: config.music21Command,
            timeoutMs: config.music21TimeoutMs,
            targetKey,
            spellingPolicy,
          });
          transposeEngine = "music21";
          transposedScoreJson = {
            ...result.scoreJson,
            title: `${scoreJson.title} (${semitones > 0 ? `+${semitones}` : semitones} semitones${targetKey ? ` to ${targetKey.tonic} ${targetKey.mode}` : ""}${
              operationLabel ? ` for ${operationLabel}` : ""
            })`,
            metadata: {
              ...result.scoreJson.metadata,
              warnings: [
                ...result.scoreJson.metadata.warnings,
                ...result.warnings,
                "music21 was used for this transposition, then the result was re-imported into Score JSON for editing/playback/export.",
              ],
            },
          };
        } catch (error) {
          transposeWarnings.push(
            `music21 transposition was requested but failed, so the built-in Score JSON transposer was used instead: ${
              error instanceof Error ? error.message : "unknown music21 error"
            }`,
          );
          transposedScoreJson = transposeScoreJson({
            score: scoreJson,
            semitones,
            targetKey,
            operationLabel,
            spellingPolicy,
            diatonicSteps: body?.diatonicSteps,
          });
        }
      } else {
        if (body?.useMusic21 === true && !config.music21Command) {
          transposeWarnings.push("music21 transposition was requested, but MUSIC21_COMMAND is not configured. Used the built-in Score JSON transposer.");
        }
        transposedScoreJson = transposeScoreJson({
          score: scoreJson,
          semitones,
          targetKey,
          operationLabel,
          spellingPolicy,
          diatonicSteps: body?.diatonicSteps,
        });
      }
      const rangeDiagnostics =
        rangeAssignments.length > 0
          ? analyzeAssignedPartRanges(transposedScoreJson, rangeAssignments)
          : rangeProfile
            ? [
                analyzeTransposedScoreRange(transposedScoreJson, rangeProfile, {
                  partIds: rangePartIds,
                }),
              ]
            : [];
      const rangeDiagnostic = rangeDiagnostics.length > 0 ? summarizeRangeDiagnostics(rangeDiagnostics) : null;
      const revisionScoreJson =
        rangeDiagnostic && rangeDiagnostic.warnings.length > 0
          ? {
              ...transposedScoreJson,
              metadata: {
                ...transposedScoreJson.metadata,
                warnings: [...transposedScoreJson.metadata.warnings, ...transposeWarnings, ...rangeDiagnostic.warnings],
              },
            }
          : transposeWarnings.length > 0
            ? {
                ...transposedScoreJson,
                metadata: {
                  ...transposedScoreJson.metadata,
                  warnings: [...transposedScoreJson.metadata.warnings, ...transposeWarnings],
                },
              }
            : transposedScoreJson;
      const nextRevision = createScoreRevisionFromScoreJson({
        documentId: document.id,
        scoreJson: revisionScoreJson,
        createdFrom: "transpose",
      });
      const updatedDocument = findScoreDocumentById(document.id);

      if (!nextRevision || !updatedDocument) {
        return reply.code(500).send({ error: "Could not create the transposed score revision." });
      }

      return reply.code(201).send({
        score: mapScoreDocumentForApi(updatedDocument),
        revision: mapScoreRevisionForApi(nextRevision),
        revisions: listScoreRevisionsByDocumentId(document.id).map(mapScoreRevisionForApi),
        rangeDiagnostic,
        rangeDiagnostics,
        transposeEngine,
        transposeWarnings,
        transposeOptions: {
          semitones,
          targetKey: targetKey ?? null,
          spellingPolicy,
          pitchMode,
          diatonicSteps: body?.diatonicSteps ?? null,
        },
        clefRecommendations: recommendScoreClefs(revisionScoreJson),
      });
    },
  );

  app.get(
    "/scores/:id/clef-recommendations",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findEditableRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      return reply.send({
        recommendations: recommendScoreClefs(migrateScoreJson(JSON.parse(revision.score_json))),
      });
    },
  );

  app.post(
    "/scores/:id/clef-recommendations/apply",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findEditableRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      let editedScoreJson;
      try {
        const scoreJson = migrateScoreJson(JSON.parse(revision.score_json));
        editedScoreJson = applyScoreClefRecommendations({
          score: scoreJson,
        });
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Could not apply clef recommendations." });
      }

      const nextRevision = createScoreRevisionFromScoreJson({
        documentId: document.id,
        scoreJson: editedScoreJson,
        createdFrom: "manual_edit",
      });
      const updatedDocument = findScoreDocumentById(document.id);

      if (!nextRevision || !updatedDocument) {
        return reply.code(500).send({ error: "Could not create the clef recommendation revision." });
      }

      return reply.code(201).send({
        score: mapScoreDocumentForApi(updatedDocument),
        revision: mapScoreRevisionForApi(nextRevision),
        revisions: listScoreRevisionsByDocumentId(document.id).map(mapScoreRevisionForApi),
        recommendations: recommendScoreClefs(editedScoreJson),
      });
    },
  );

  app.post(
    "/scores/:id/edit/part",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      let patch;

      try {
        patch = validateScorePartPatch(request.body);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid part settings payload." });
      }

      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findEditableRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      let editedScoreJson;
      try {
        editedScoreJson = applyScorePartPatch({
          score: migrateScoreJson(JSON.parse(revision.score_json)),
          patch,
        });
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Could not apply part settings." });
      }

      const nextRevision = createScoreRevisionFromScoreJson({
        documentId: document.id,
        scoreJson: editedScoreJson,
        createdFrom: "manual_edit",
      });
      const updatedDocument = findScoreDocumentById(document.id);

      if (!nextRevision || !updatedDocument) {
        return reply.code(500).send({ error: "Could not create the part settings revision." });
      }

      return reply.code(201).send({
        score: mapScoreDocumentForApi(updatedDocument),
        revision: mapScoreRevisionForApi(nextRevision),
        revisions: listScoreRevisionsByDocumentId(document.id).map(mapScoreRevisionForApi),
      });
    },
  );

  app.post(
    "/scores/:id/edit/note",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      let patch;

      try {
        patch = validateScoreNotePatch(request.body);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid note correction payload." });
      }

      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findEditableRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      let editedScoreJson;
      try {
        editedScoreJson = applyScoreNotePatch({
          score: migrateScoreJson(JSON.parse(revision.score_json)),
          patch,
        });
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Could not apply note correction." });
      }

      const nextRevision = createScoreRevisionFromScoreJson({
        documentId: document.id,
        scoreJson: editedScoreJson,
        createdFrom: "manual_edit",
      });
      const updatedDocument = findScoreDocumentById(document.id);

      if (!nextRevision || !updatedDocument) {
        return reply.code(500).send({ error: "Could not create the corrected score revision." });
      }

      return reply.code(201).send({
        score: mapScoreDocumentForApi(updatedDocument),
        revision: mapScoreRevisionForApi(nextRevision),
        revisions: listScoreRevisionsByDocumentId(document.id).map(mapScoreRevisionForApi),
      });
    },
  );

  app.post(
    "/scores/:id/edit/note/insert",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      let patch;

      try {
        patch = validateScoreNoteInsertPatch(request.body);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid note insertion payload." });
      }

      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findEditableRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      let editedScoreJson;
      try {
        editedScoreJson = applyScoreNoteInsertPatch({
          score: migrateScoreJson(JSON.parse(revision.score_json)),
          patch,
        });
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Could not insert note." });
      }

      const nextRevision = createScoreRevisionFromScoreJson({
        documentId: document.id,
        scoreJson: editedScoreJson,
        createdFrom: "manual_edit",
      });
      const updatedDocument = findScoreDocumentById(document.id);

      if (!nextRevision || !updatedDocument) {
        return reply.code(500).send({ error: "Could not create the corrected score revision." });
      }

      return reply.code(201).send({
        score: mapScoreDocumentForApi(updatedDocument),
        revision: mapScoreRevisionForApi(nextRevision),
        revisions: listScoreRevisionsByDocumentId(document.id).map(mapScoreRevisionForApi),
      });
    },
  );

  app.post(
    "/scores/:id/edit/event/delete",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      let patch;

      try {
        patch = validateScoreEventDeletePatch(request.body);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid event deletion payload." });
      }

      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findEditableRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      let editedScoreJson;
      try {
        editedScoreJson = applyScoreEventDeletePatch({
          score: migrateScoreJson(JSON.parse(revision.score_json)),
          patch,
        });
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Could not delete score event." });
      }

      const nextRevision = createScoreRevisionFromScoreJson({
        documentId: document.id,
        scoreJson: editedScoreJson,
        createdFrom: "manual_edit",
      });
      const updatedDocument = findScoreDocumentById(document.id);

      if (!nextRevision || !updatedDocument) {
        return reply.code(500).send({ error: "Could not create the corrected score revision." });
      }

      return reply.code(201).send({
        score: mapScoreDocumentForApi(updatedDocument),
        revision: mapScoreRevisionForApi(nextRevision),
        revisions: listScoreRevisionsByDocumentId(document.id).map(mapScoreRevisionForApi),
      });
    },
  );

  app.post(
    "/scores/:id/edit/events/batch",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      let patch;
      try {
        patch = validateScoreEventBatchPatch(request.body);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid batch edit payload." });
      }
      const document = findScoreDocumentById(params.id);
      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }
      const revision = findEditableRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }
      let editedScoreJson;
      try {
        editedScoreJson = applyScoreEventBatchPatch({ score: migrateScoreJson(JSON.parse(revision.score_json)), patch });
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Could not apply batch edit." });
      }
      const nextRevision = createScoreRevisionFromScoreJson({
        documentId: document.id,
        scoreJson: editedScoreJson,
        createdFrom: "manual_edit",
      });
      const updatedDocument = findScoreDocumentById(document.id);
      if (!nextRevision || !updatedDocument) {
        return reply.code(500).send({ error: "Could not create the batch-edited score revision." });
      }
      return reply.code(201).send({
        score: mapScoreDocumentForApi(updatedDocument),
        revision: mapScoreRevisionForApi(nextRevision),
        revisions: listScoreRevisionsByDocumentId(document.id).map(mapScoreRevisionForApi),
      });
    },
  );

  app.post(
    "/scores/:id/edit/event/reorder",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      let patch;

      try {
        patch = validateScoreEventReorderPatch(request.body);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid event reorder payload." });
      }

      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findEditableRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      let editedScoreJson;
      try {
        editedScoreJson = applyScoreEventReorderPatch({
          score: migrateScoreJson(JSON.parse(revision.score_json)),
          patch,
        });
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Could not reorder score event." });
      }

      const nextRevision = createScoreRevisionFromScoreJson({
        documentId: document.id,
        scoreJson: editedScoreJson,
        createdFrom: "manual_edit",
      });
      const updatedDocument = findScoreDocumentById(document.id);

      if (!nextRevision || !updatedDocument) {
        return reply.code(500).send({ error: "Could not create the corrected score revision." });
      }

      return reply.code(201).send({
        score: mapScoreDocumentForApi(updatedDocument),
        revision: mapScoreRevisionForApi(nextRevision),
        revisions: listScoreRevisionsByDocumentId(document.id).map(mapScoreRevisionForApi),
      });
    },
  );

  app.post(
    "/scores/:id/edit/measure-attributes",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      let patch;

      try {
        patch = validateScoreMeasureAttributesPatch(request.body);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid measure attributes correction payload." });
      }

      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findEditableRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      let editedScoreJson;
      try {
        editedScoreJson = applyScoreMeasureAttributesPatch({
          score: migrateScoreJson(JSON.parse(revision.score_json)),
          patch,
        });
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Could not apply measure attributes correction." });
      }

      const nextRevision = createScoreRevisionFromScoreJson({
        documentId: document.id,
        scoreJson: editedScoreJson,
        createdFrom: "manual_edit",
      });
      const updatedDocument = findScoreDocumentById(document.id);

      if (!nextRevision || !updatedDocument) {
        return reply.code(500).send({ error: "Could not create the corrected score revision." });
      }

      return reply.code(201).send({
        score: mapScoreDocumentForApi(updatedDocument),
        revision: mapScoreRevisionForApi(nextRevision),
        revisions: listScoreRevisionsByDocumentId(document.id).map(mapScoreRevisionForApi),
      });
    },
  );

  app.post(
    "/scores/:id/edit/harmony",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      let patch;

      try {
        patch = validateScoreHarmonyPatch(request.body);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid harmony correction payload." });
      }

      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findEditableRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      let editedScoreJson;
      try {
        editedScoreJson = applyScoreHarmonyPatch({
          score: migrateScoreJson(JSON.parse(revision.score_json)),
          patch,
        });
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Could not apply harmony correction." });
      }

      const nextRevision = createScoreRevisionFromScoreJson({
        documentId: document.id,
        scoreJson: editedScoreJson,
        createdFrom: "manual_edit",
      });
      const updatedDocument = findScoreDocumentById(document.id);

      if (!nextRevision || !updatedDocument) {
        return reply.code(500).send({ error: "Could not create the corrected score revision." });
      }

      return reply.code(201).send({
        score: mapScoreDocumentForApi(updatedDocument),
        revision: mapScoreRevisionForApi(nextRevision),
        revisions: listScoreRevisionsByDocumentId(document.id).map(mapScoreRevisionForApi),
      });
    },
  );

  app.post(
    "/scores/:id/edit/barline",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      let patch;

      try {
        patch = validateScoreBarlinePatch(request.body);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid barline correction payload." });
      }

      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findEditableRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      let editedScoreJson;
      try {
        editedScoreJson = applyScoreBarlinePatch({
          score: migrateScoreJson(JSON.parse(revision.score_json)),
          patch,
        });
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Could not apply barline correction." });
      }

      const nextRevision = createScoreRevisionFromScoreJson({
        documentId: document.id,
        scoreJson: editedScoreJson,
        createdFrom: "manual_edit",
      });
      const updatedDocument = findScoreDocumentById(document.id);

      if (!nextRevision || !updatedDocument) {
        return reply.code(500).send({ error: "Could not create the corrected score revision." });
      }

      return reply.code(201).send({
        score: mapScoreDocumentForApi(updatedDocument),
        revision: mapScoreRevisionForApi(nextRevision),
        revisions: listScoreRevisionsByDocumentId(document.id).map(mapScoreRevisionForApi),
      });
    },
  );

  app.post(
    "/scores/:id/edit/dynamics",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      let patch;

      try {
        patch = validateScoreDynamicPatch(request.body);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid dynamics correction payload." });
      }

      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findEditableRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      let editedScoreJson;
      try {
        editedScoreJson = applyScoreDynamicPatch({
          score: migrateScoreJson(JSON.parse(revision.score_json)),
          patch,
        });
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Could not apply dynamics correction." });
      }

      const nextRevision = createScoreRevisionFromScoreJson({
        documentId: document.id,
        scoreJson: editedScoreJson,
        createdFrom: "manual_edit",
      });
      const updatedDocument = findScoreDocumentById(document.id);

      if (!nextRevision || !updatedDocument) {
        return reply.code(500).send({ error: "Could not create the corrected score revision." });
      }

      return reply.code(201).send({
        score: mapScoreDocumentForApi(updatedDocument),
        revision: mapScoreRevisionForApi(nextRevision),
        revisions: listScoreRevisionsByDocumentId(document.id).map(mapScoreRevisionForApi),
      });
    },
  );

  app.post(
    "/scores/:id/edit/wedge",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      let patch;

      try {
        patch = validateScoreWedgePatch(request.body);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid wedge correction payload." });
      }

      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findEditableRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      let editedScoreJson;
      try {
        editedScoreJson = applyScoreWedgePatch({
          score: migrateScoreJson(JSON.parse(revision.score_json)),
          patch,
        });
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Could not apply wedge correction." });
      }

      const nextRevision = createScoreRevisionFromScoreJson({
        documentId: document.id,
        scoreJson: editedScoreJson,
        createdFrom: "manual_edit",
      });
      const updatedDocument = findScoreDocumentById(document.id);

      if (!nextRevision || !updatedDocument) {
        return reply.code(500).send({ error: "Could not create the corrected score revision." });
      }

      return reply.code(201).send({
        score: mapScoreDocumentForApi(updatedDocument),
        revision: mapScoreRevisionForApi(nextRevision),
        revisions: listScoreRevisionsByDocumentId(document.id).map(mapScoreRevisionForApi),
      });
    },
  );

  app.post(
    "/scores/:id/edit/tempo",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      let patch;

      try {
        patch = validateScoreTempoPatch(request.body);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid tempo correction payload." });
      }

      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findEditableRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      let editedScoreJson;
      try {
        editedScoreJson = applyScoreTempoPatch({
          score: migrateScoreJson(JSON.parse(revision.score_json)),
          patch,
        });
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Could not apply tempo correction." });
      }

      const nextRevision = createScoreRevisionFromScoreJson({
        documentId: document.id,
        scoreJson: editedScoreJson,
        createdFrom: "manual_edit",
      });
      const updatedDocument = findScoreDocumentById(document.id);

      if (!nextRevision || !updatedDocument) {
        return reply.code(500).send({ error: "Could not create the corrected score revision." });
      }

      return reply.code(201).send({
        score: mapScoreDocumentForApi(updatedDocument),
        revision: mapScoreRevisionForApi(nextRevision),
        revisions: listScoreRevisionsByDocumentId(document.id).map(mapScoreRevisionForApi),
      });
    },
  );

  app.get(
    "/scores/:id/jianpu",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      let jianpuOptions;
      try {
        jianpuOptions = normalizeJianpuProjectionQuery(request.query);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid Jianpu projection options." });
      }
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findCurrentRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      return reply.send({
        jianpu: scoreJsonToJianpu(migrateScoreJson(JSON.parse(revision.score_json)), undefined, jianpuOptions),
      });
    },
  );

  app.get(
    "/scores/:id/playback",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findCurrentRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      return reply.send({
        playback: scoreJsonToPlayback(migrateScoreJson(JSON.parse(revision.score_json))),
      });
    },
  );

  app.get(
    "/scores/:id/musicxml-preview",
    {
      preHandler: app.requireScorePreviewAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findCurrentRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      const scoreJson = migrateScoreJson(JSON.parse(revision.score_json));
      return {
        musicXml: scoreJsonToMusicXml(scoreJson),
      };
    },
  );

  app.post(
    "/scores/:id/export/midi",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findCurrentRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      const scoreJson = migrateScoreJson(JSON.parse(revision.score_json));
      const playback = scoreJsonToPlayback(scoreJson);
      if (playback.events.length === 0) {
        return reply.code(400).send({ error: "The current score revision does not have note events to export as MIDI." });
      }

      const options = normalizePracticeExportBody(request.body);
      if (countPlaybackMidiEvents(playback, options) === 0) {
        return reply.code(400).send({ error: "The selected practice range or part filter does not contain playable notes." });
      }

      const midiFile = playbackToMidiFile(playback, options);
      const exportDir = path.join(config.storageDir, request.authUserId!, "scores", "exports");
      fs.mkdirSync(exportDir, { recursive: true });

      const originalName = `${deriveExportBaseName(scoreJson.title)}-v${revision.revision_number}.mid`;
      const storedName = `${createId()}.jianpu.txt`;
      const targetPath = path.join(exportDir, storedName);
      fs.writeFileSync(targetPath, Buffer.from(midiFile));
      const stats = fs.statSync(targetPath);

      const storedFile = await createStoredFile({
        userId: request.authUserId!,
        originalName,
        storedName,
        storagePath: targetPath,
        mimeType: "audio/midi",
        sizeBytes: stats.size,
        fileKind: "output_midi",
      });

      if (!storedFile) {
        return reply.code(500).send({ error: "Could not store the exported MIDI file." });
      }

      createScoreAsset({
        documentId: document.id,
        fileId: storedFile.id,
        assetKind: "output_midi",
      });

      return reply.code(201).send({
        file: {
          id: storedFile.id,
          originalName: storedFile.original_name,
          mimeType: storedFile.mime_type,
          sizeBytes: storedFile.size_bytes,
          fileKind: storedFile.file_kind,
          createdAt: storedFile.created_at,
        },
        assets: listScoreAssetsByDocumentId(document.id).map(mapScoreAssetForApi),
      });
    },
  );

  app.post(
    "/scores/:id/export/audio/wav",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findCurrentRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      const scoreJson = migrateScoreJson(JSON.parse(revision.score_json));
      const playback = scoreJsonToPlayback(scoreJson);
      if (playback.events.length === 0) {
        return reply.code(400).send({ error: "The current score revision does not have note events to export as audio." });
      }

      const options = normalizePracticeExportBody(request.body);
      const exportDir = path.join(config.storageDir, request.authUserId!, "scores", "exports");
      fs.mkdirSync(exportDir, { recursive: true });
      const originalName = `${deriveExportBaseName(scoreJson.title)}-v${revision.revision_number}.wav`;
      const storedName = `${createId()}-${originalName}`;
      const { wav, metadata } = await createPracticeWavExport({
        playback,
        options,
        exportDir,
        tempBaseName: storedName,
      });
      if (metadata.eventCount === 0) {
        return reply.code(400).send({ error: "The selected practice range or part filter does not contain playable notes." });
      }
      const targetPath = path.join(exportDir, storedName);
      fs.writeFileSync(targetPath, wav);
      const stats = fs.statSync(targetPath);

      const storedFile = await createStoredFile({
        userId: request.authUserId!,
        originalName,
        storedName,
        storagePath: targetPath,
        mimeType: "audio/wav",
        sizeBytes: stats.size,
        fileKind: "output_audio",
      });

      if (!storedFile) {
        return reply.code(500).send({ error: "Could not store the exported WAV file." });
      }

      createScoreAsset({
        documentId: document.id,
        fileId: storedFile.id,
        assetKind: "output_audio",
      });

      return reply.code(201).send({
        file: {
          id: storedFile.id,
          originalName: storedFile.original_name,
          mimeType: storedFile.mime_type,
          sizeBytes: storedFile.size_bytes,
          fileKind: storedFile.file_kind,
          createdAt: storedFile.created_at,
        },
        assets: listScoreAssetsByDocumentId(document.id).map(mapScoreAssetForApi),
      });
    },
  );

  app.post(
    "/scores/:id/export/audio/mp3",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      if (!config.ffmpegCommand) {
        return reply.code(503).send({
          error: "MP3 export requires ffmpeg. Set FFMPEG_COMMAND on the API service to enable this export.",
        });
      }

      const revision = findCurrentRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      const scoreJson = migrateScoreJson(JSON.parse(revision.score_json));
      const playback = scoreJsonToPlayback(scoreJson);
      if (playback.events.length === 0) {
        return reply.code(400).send({ error: "The current score revision does not have note events to export as audio." });
      }

      const options = normalizeMp3ExportBody(request.body);
      const exportDir = path.join(config.storageDir, request.authUserId!, "scores", "exports");
      fs.mkdirSync(exportDir, { recursive: true });
      const originalName = `${deriveExportBaseName(scoreJson.title)}-v${revision.revision_number}.mp3`;
      const storedName = `${createId()}-${originalName}`;
      const { wav, metadata } = await createPracticeWavExport({
        playback,
        options,
        exportDir,
        tempBaseName: storedName,
      });
      if (metadata.eventCount === 0) {
        return reply.code(400).send({ error: "The selected practice range or part filter does not contain playable notes." });
      }
      const tempWavPath = path.join(exportDir, `${storedName}.wav`);
      const targetPath = path.join(exportDir, storedName);
      fs.writeFileSync(tempWavPath, wav);

      try {
        await convertWavToMp3File({
          ffmpegCommand: config.ffmpegCommand,
          sourceWavPath: tempWavPath,
          targetMp3Path: targetPath,
          timeoutMs: config.ffmpegTimeoutMs,
          bitrateKbps: options.bitrateKbps,
        });
      } catch (error) {
        fs.rmSync(tempWavPath, { force: true });
        return reply.code(503).send({ error: error instanceof Error ? error.message : "Could not encode the MP3 export." });
      }

      fs.rmSync(tempWavPath, { force: true });
      const stats = fs.statSync(targetPath);
      const storedFile = await createStoredFile({
        userId: request.authUserId!,
        originalName,
        storedName,
        storagePath: targetPath,
        mimeType: "audio/mpeg",
        sizeBytes: stats.size,
        fileKind: "output_audio",
      });

      if (!storedFile) {
        return reply.code(500).send({ error: "Could not store the exported MP3 file." });
      }

      createScoreAsset({
        documentId: document.id,
        fileId: storedFile.id,
        assetKind: "output_audio",
      });

      return reply.code(201).send({
        file: {
          id: storedFile.id,
          originalName: storedFile.original_name,
          mimeType: storedFile.mime_type,
          sizeBytes: storedFile.size_bytes,
          fileKind: storedFile.file_kind,
          createdAt: storedFile.created_at,
        },
        assets: listScoreAssetsByDocumentId(document.id).map(mapScoreAssetForApi),
        metadata: {
          ...metadata,
          format: "mp3",
          bitrateKbps: options.bitrateKbps ?? 192,
        },
      });
    },
  );

  app.post(
    "/scores/:id/export/musicxml",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findCurrentRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      const scoreJson = migrateScoreJson(JSON.parse(revision.score_json));
      const musicXml = scoreJsonToMusicXml(scoreJson);
      const exportDir = path.join(config.storageDir, request.authUserId!, "scores", "exports");
      fs.mkdirSync(exportDir, { recursive: true });

      const originalName = `${deriveExportBaseName(scoreJson.title)}-v${revision.revision_number}.musicxml`;
      const storedName = `${createId()}-${originalName}`;
      const targetPath = path.join(exportDir, storedName);
      fs.writeFileSync(targetPath, musicXml, "utf8");
      const stats = fs.statSync(targetPath);

      const storedFile = await createStoredFile({
        userId: request.authUserId!,
        originalName,
        storedName,
        storagePath: targetPath,
        mimeType: "application/vnd.recordare.musicxml+xml",
        sizeBytes: stats.size,
        fileKind: "score_musicxml",
      });

      if (!storedFile) {
        return reply.code(500).send({ error: "Could not store the exported MusicXML file." });
      }

      createScoreAsset({
        documentId: document.id,
        fileId: storedFile.id,
        assetKind: "score_musicxml",
      });
      const updatedRevision = attachMusicXmlFileToRevision({
        revisionId: revision.id,
        musicxmlFileId: storedFile.id,
      });
      const updatedDocument = findScoreDocumentById(document.id);

      if (!updatedRevision || !updatedDocument) {
        return reply.code(500).send({ error: "Could not attach the MusicXML snapshot to the current revision." });
      }

      return reply.code(201).send({
        file: {
          id: storedFile.id,
          originalName: storedFile.original_name,
          mimeType: storedFile.mime_type,
          sizeBytes: storedFile.size_bytes,
          fileKind: storedFile.file_kind,
          createdAt: storedFile.created_at,
        },
        score: mapScoreDocumentForApi(updatedDocument),
        revision: mapScoreRevisionForApi(updatedRevision),
        revisions: listScoreRevisionsByDocumentId(document.id).map(mapScoreRevisionForApi),
        assets: listScoreAssetsByDocumentId(document.id).map(mapScoreAssetForApi),
      });
    },
  );

  app.post(
    "/scores/:id/export/score-json",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findCurrentRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      const scoreJson = migrateScoreJson(JSON.parse(revision.score_json));
      const exportDir = path.join(config.storageDir, request.authUserId!, "scores", "exports");
      fs.mkdirSync(exportDir, { recursive: true });

      const originalName = `${deriveExportBaseName(scoreJson.title)}-v${revision.revision_number}.score.json`;
      const storedName = `${createId()}-${originalName}`;
      const targetPath = path.join(exportDir, storedName);
      fs.writeFileSync(targetPath, `${JSON.stringify(scoreJson, null, 2)}\n`, "utf8");
      const stats = fs.statSync(targetPath);

      const storedFile = await createStoredFile({
        userId: request.authUserId!,
        originalName,
        storedName,
        storagePath: targetPath,
        mimeType: "application/json",
        sizeBytes: stats.size,
        fileKind: "score_json_snapshot",
      });

      if (!storedFile) {
        return reply.code(500).send({ error: "Could not store the exported Score JSON snapshot." });
      }

      createScoreAsset({
        documentId: document.id,
        fileId: storedFile.id,
        assetKind: "score_json_snapshot",
      });

      return reply.code(201).send({
        file: {
          id: storedFile.id,
          originalName: storedFile.original_name,
          mimeType: storedFile.mime_type,
          sizeBytes: storedFile.size_bytes,
          fileKind: storedFile.file_kind,
          createdAt: storedFile.created_at,
        },
        assets: listScoreAssetsByDocumentId(document.id).map(mapScoreAssetForApi),
      });
    },
  );

  app.post(
    "/scores/:id/export/jianpu",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      let jianpuOptions;
      try {
        jianpuOptions = normalizeJianpuProjectionQuery(request.query);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid Jianpu projection options." });
      }
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findCurrentRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      const scoreJson = migrateScoreJson(JSON.parse(revision.score_json));
      const jianpu = scoreJsonToJianpu(scoreJson, undefined, jianpuOptions);
      const exportDir = path.join(config.storageDir, request.authUserId!, "scores", "exports");
      fs.mkdirSync(exportDir, { recursive: true });

      const originalName = `${deriveExportBaseName(scoreJson.title)}-v${revision.revision_number}.jianpu.txt`;
      const storedName = `${createId()}-${originalName}`;
      const targetPath = path.join(exportDir, storedName);
      fs.writeFileSync(targetPath, jianpu.text, "utf8");
      const stats = fs.statSync(targetPath);

      const storedFile = await createStoredFile({
        userId: request.authUserId!,
        originalName,
        storedName,
        storagePath: targetPath,
        mimeType: "text/plain; charset=utf-8",
        sizeBytes: stats.size,
        fileKind: "output_jianpu",
      });

      if (!storedFile) {
        return reply.code(500).send({ error: "Could not store the exported Jianpu file." });
      }

      createScoreAsset({
        documentId: document.id,
        fileId: storedFile.id,
        assetKind: "output_jianpu",
      });

      return reply.code(201).send({
        file: {
          id: storedFile.id,
          originalName: storedFile.original_name,
          mimeType: storedFile.mime_type,
          sizeBytes: storedFile.size_bytes,
          fileKind: storedFile.file_kind,
          createdAt: storedFile.created_at,
        },
        assets: listScoreAssetsByDocumentId(document.id).map(mapScoreAssetForApi),
      });
    },
  );

  app.post(
    "/scores/:id/export/pdf",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findCurrentRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      let options: RenderedScoreExportOptions;
      try {
        options = validateRenderedScoreExportOptions(request.body, "pdf");
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid PDF export options." });
      }

      try {
        const exportPayload = await createRenderedScoreExport({
          userId: request.authUserId!,
          documentId: document.id,
          revision,
          kind: "pdf",
          options,
        });
        return reply.code(201).send(exportPayload);
      } catch (error) {
        return reply.code(503).send({ error: error instanceof Error ? error.message : "Could not render the score PDF." });
      }
    },
  );

  app.post(
    "/scores/:id/export/svg",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findCurrentRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      let options: RenderedScoreExportOptions;
      try {
        options = validateRenderedScoreExportOptions(request.body, "svg");
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid SVG export options." });
      }

      try {
        const exportPayload = await createRenderedScoreExport({
          userId: request.authUserId!,
          documentId: document.id,
          revision,
          kind: "svg",
          options,
        });
        return reply.code(201).send(exportPayload);
      } catch (error) {
        return reply.code(503).send({ error: error instanceof Error ? error.message : "Could not render the score SVG." });
      }
    },
  );

  app.post(
    "/scores/:id/export/png",
    {
      preHandler: app.requireScoreEditingAccess,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const document = findScoreDocumentById(params.id);

      if (!document || document.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Score document not found." });
      }

      const revision = findCurrentRevisionForDocument(document);
      if (!revision) {
        return reply.code(404).send({ error: "Current score revision not found." });
      }

      let options: RenderedScoreExportOptions;
      try {
        options = validateRenderedScoreExportOptions(request.body, "png");
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid PNG export options." });
      }

      try {
        const exportPayload = await createRenderedScoreExport({
          userId: request.authUserId!,
          documentId: document.id,
          revision,
          kind: "png",
          options,
        });
        return reply.code(201).send(exportPayload);
      } catch (error) {
        return reply.code(503).send({ error: error instanceof Error ? error.message : "Could not render the score PNG." });
      }
    },
  );

  app.post(
    "/scores/import/jianpu",
    {
      preHandler: app.requireActiveEntitlement,
    },
    async (request, reply) => {
      let body;

      try {
        body = normalizeJianpuImportBody(request.body);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid Jianpu import payload." });
      }

      const originalName = `${deriveExportBaseName(body.title)}.jianpu.txt`;
      const source = await storeJianpuSourceText(body.text);

      const storedFile = await createStoredFile({
        userId: request.authUserId!,
        originalName,
        storedName: source.storedName,
        storagePath: source.storagePath,
        mimeType: "text/plain; charset=utf-8",
        sizeBytes: source.sizeBytes,
        fileKind: "source_jianpu",
      });

      if (!storedFile) {
        return reply.code(500).send({ error: "Could not store the Jianpu source text." });
      }

      let document;

      try {
        document = createScoreDocumentFromJianpu({
          userId: request.authUserId!,
          title: body.title,
          sourceFileId: storedFile.id,
          sourceOriginalName: storedFile.original_name,
          jianpuText: body.text,
          tonic: body.tonic,
          mode: body.mode,
          beats: body.beats,
          beatType: body.beatType,
        });
      } catch (error) {
        request.log.warn({ error }, "Jianpu import parsing failed.");
        return reply.code(400).send({ error: error instanceof Error ? error.message : "The Jianpu text could not be parsed into a score document." });
      }

      if (!document) {
        return reply.code(500).send({ error: "Could not create a score document from Jianpu." });
      }

      return reply.code(201).send({
        score: mapScoreDocumentForApi(document),
      });
    },
  );

  app.post(
    "/scores/import/musicxml",
    {
      preHandler: app.requireActiveEntitlement,
    },
    async (request, reply) => {
      const file = await request.file();

      if (!file) {
        return reply.code(400).send({ error: "No MusicXML file uploaded." });
      }

      const filename = file.filename || "score.musicxml";
      const userDir = path.join(config.storageDir, request.authUserId!, "scores", "imports");
      fs.mkdirSync(userDir, { recursive: true });

      const storedName = `${createId()}-${sanitizeFilename(filename)}`;
      const targetPath = path.join(userDir, storedName);
      let verified;
      try {
        verified = await storeVerifiedUpload({ stream: file.file, targetPath, allowedKinds: uploadKinds.musicXml });
      } catch (error) {
        const response = uploadErrorResponse(error);
        request.log.warn({ error, uploadCode: response.body.code }, "MusicXML upload rejected.");
        return reply.code(response.statusCode).send(response.body);
      }
      const isCompressed = verified.detectedKind === "zip";
      let musicXml: string;

      try {
        musicXml = isCompressed ? extractMusicXmlFromCompressedMxl(fs.readFileSync(targetPath)) : fs.readFileSync(targetPath, "utf8");
      } catch (error) {
        fs.rmSync(targetPath, { force: true });
        request.log.warn({ error }, "Compressed MusicXML import failed.");
        return reply.code(400).send({ error: error instanceof Error ? error.message : "The compressed MusicXML package could not be opened." });
      }

      const storedFile = await createStoredFile({
        userId: request.authUserId!,
        originalName: filename,
        storedName,
        storagePath: targetPath,
        mimeType: verified.mimeType,
        sizeBytes: verified.sizeBytes,
        fileKind: "source_musicxml",
      });

      if (!storedFile) {
        return reply.code(500).send({ error: "Could not store the MusicXML source file." });
      }

      let document;

      try {
        document = createScoreDocumentFromMusicXml({
          userId: request.authUserId!,
          title: deriveTitle(filename),
          sourceFileId: storedFile.id,
          sourceOriginalName: storedFile.original_name,
          musicXml,
        });
      } catch (error) {
        request.log.warn({ error }, "MusicXML import parsing failed.");
        return reply.code(400).send({ error: "The uploaded MusicXML could not be parsed into a score document." });
      }

      if (!document) {
        return reply.code(500).send({ error: "Could not create a score document." });
      }

      return reply.code(201).send({
        score: mapScoreDocumentForApi(document),
      });
    },
  );

  app.post(
    "/scores/import/score-json",
    {
      preHandler: app.requireActiveEntitlement,
    },
    async (request, reply) => {
      const file = await request.file();

      if (!file) {
        return reply.code(400).send({ error: "No Score JSON file uploaded." });
      }

      const filename = file.filename || "score.score.json";
      const userDir = path.join(config.storageDir, request.authUserId!, "scores", "score-json-imports");
      fs.mkdirSync(userDir, { recursive: true });

      const storedName = `${createId()}-${sanitizeFilename(filename)}`;
      const targetPath = path.join(userDir, storedName);
      let verified;
      try {
        verified = await storeVerifiedUpload({ stream: file.file, targetPath, allowedKinds: uploadKinds.scoreJson });
      } catch (error) {
        const response = uploadErrorResponse(error);
        request.log.warn({ error, uploadCode: response.body.code }, "Score JSON upload rejected.");
        return reply.code(response.statusCode).send(response.body);
      }

      let scoreJson: ScoreJson;
      try {
        scoreJson = parseScoreJsonSnapshot(fs.readFileSync(targetPath, "utf8"));
      } catch (error) {
        fs.rmSync(targetPath, { force: true });
        request.log.warn({ error }, "Score JSON import parsing failed.");
        return reply.code(400).send({ error: error instanceof Error ? error.message : "The uploaded Score JSON could not be parsed." });
      }

      const storedFile = await createStoredFile({
        userId: request.authUserId!,
        originalName: filename,
        storedName,
        storagePath: targetPath,
        mimeType: verified.mimeType,
        sizeBytes: verified.sizeBytes,
        fileKind: "score_json_snapshot",
      });

      if (!storedFile) {
        return reply.code(500).send({ error: "Could not store the Score JSON source file." });
      }

      const document = createScoreDocumentFromScoreJson({
        userId: request.authUserId!,
        title: scoreJson.title || deriveTitle(filename),
        sourceFileId: storedFile.id,
        sourceOriginalName: storedFile.original_name,
        scoreJson,
      });

      if (!document) {
        return reply.code(500).send({ error: "Could not create a score document from Score JSON." });
      }

      return reply.code(201).send({
        score: mapScoreDocumentForApi(document),
      });
    },
  );

  app.post(
    "/scores/import/midi",
    {
      preHandler: app.requireActiveEntitlement,
    },
    async (request, reply) => {
      const file = await request.file();

      if (!file) {
        return reply.code(400).send({ error: "No MIDI file uploaded." });
      }

      const filename = file.filename || "score.mid";
      const userDir = path.join(config.storageDir, request.authUserId!, "scores", "midi-imports");
      fs.mkdirSync(userDir, { recursive: true });

      const storedName = `${createId()}-${sanitizeFilename(filename)}`;
      const targetPath = path.join(userDir, storedName);
      let verified;
      try {
        verified = await storeVerifiedUpload({ stream: file.file, targetPath, allowedKinds: uploadKinds.midi });
      } catch (error) {
        const response = uploadErrorResponse(error);
        request.log.warn({ error, uploadCode: response.body.code }, "MIDI upload rejected.");
        return reply.code(response.statusCode).send(response.body);
      }

      const storedFile = await createStoredFile({
        userId: request.authUserId!,
        originalName: filename,
        storedName,
        storagePath: targetPath,
        mimeType: verified.mimeType,
        sizeBytes: verified.sizeBytes,
        fileKind: "source_midi",
      });

      if (!storedFile) {
        return reply.code(500).send({ error: "Could not store the MIDI source file." });
      }

      let document;
      try {
        document = createScoreDocumentFromMidi({
          userId: request.authUserId!,
          title: deriveTitle(filename),
          sourceFileId: storedFile.id,
          sourceOriginalName: storedFile.original_name,
          midi: fs.readFileSync(targetPath),
        });
      } catch (error) {
        request.log.warn({ error }, "MIDI import parsing failed.");
        return reply.code(400).send({ error: error instanceof Error ? error.message : "The MIDI file could not be parsed into a score document." });
      }

      if (!document) {
        return reply.code(500).send({ error: "Could not create a score document from MIDI." });
      }

      return reply.code(201).send({
        score: mapScoreDocumentForApi(document),
      });
    },
  );

  app.post(
    "/scores/import/omr",
    {
      preHandler: app.requireScorePreviewAccess,
    },
    async (request, reply) => {
      const profile = getUserProfile(request.authUserId!);
      const isPaid = profile?.entitlement.status === "active";
      let freeTrial = null;
      if (!isPaid) {
        try {
          freeTrial = assertFreeTrialOmrAvailable(request.authUserId!);
        } catch (error) {
          if (error instanceof FreeTrialLimitError) {
            return reply.code(error.statusCode).send({ error: error.message, code: error.code, freeTrial: error.trial });
          }
          throw error;
        }
      }

      const file = await request.file();

      if (!file) {
        return reply.code(400).send({ error: "No PDF or image file uploaded." });
      }

      const filename = file.filename || "score-source.pdf";
      const userDir = path.join(config.storageDir, request.authUserId!, "scores", "omr-sources");
      fs.mkdirSync(userDir, { recursive: true });

      const storedName = `${createId()}-${sanitizeFilename(filename)}`;
      const targetPath = path.join(userDir, storedName);
      let verified;
      try {
        verified = await storeVerifiedUpload({
          stream: file.file,
          targetPath,
          allowedKinds: uploadKinds.omr,
          pdfRasterSafety: omrPdfRasterSafetyPolicy(),
        });
      } catch (error) {
        const response = uploadErrorResponse(error);
        request.log.warn({ error, uploadCode: response.body.code }, "OMR source upload rejected.");
        return reply.code(response.statusCode).send(response.body);
      }
      const fileKind = verified.detectedKind === "pdf" ? "source_pdf" : "source_image";

      let storedFile: Awaited<ReturnType<typeof createStoredFile>>;
      try {
        storedFile = await createStoredFile({
          userId: request.authUserId!,
          originalName: filename,
          storedName,
          storagePath: targetPath,
          mimeType: verified.mimeType,
          sizeBytes: verified.sizeBytes,
          fileKind,
        });
      } catch (error) {
        const response = uploadErrorResponse(error);
        request.log.error({ uploadCode: response.body.code }, "OMR source persistence failed.");
        return reply.code(response.statusCode).send(response.body);
      }

      if (!storedFile) {
        return reply.code(500).send({ error: "Could not store the OMR source file." });
      }

      const result = createOmrImportScoreDocument({
        userId: request.authUserId!,
        title: deriveTitle(filename),
        sourceFileId: storedFile.id,
        sourceFileKind: fileKind,
        sourceOriginalName: storedFile.original_name,
        freeTrial: Boolean(freeTrial),
      });

      if (!result.document || !result.job) {
        return reply.code(500).send({ error: "Could not create the OMR import score project." });
      }

      return reply.code(201).send({
        score: mapScoreDocumentForApi(result.document),
        job: mapScoreJobForApi(result.job),
      });
    },
  );

  app.post(
    "/scores/import/audio",
    {
      preHandler: app.requireActiveEntitlement,
    },
    async (request, reply) => {
      const file = await request.file();

      if (!file) {
        return reply.code(400).send({ error: "No audio file uploaded." });
      }

      const filename = file.filename || "audio-source.wav";
      const userDir = path.join(config.storageDir, request.authUserId!, "scores", "audio-sources");
      fs.mkdirSync(userDir, { recursive: true });

      const storedName = `${createId()}-${sanitizeFilename(filename)}`;
      const targetPath = path.join(userDir, storedName);
      let verified;
      try {
        verified = await storeVerifiedUpload({
          stream: file.file,
          targetPath,
          allowedKinds: uploadKinds.audio,
          mediaSafety: {
            mode: "audio",
            maxDurationSeconds: config.audioUploadMaxDurationSeconds,
          },
        });
      } catch (error) {
        const response = uploadErrorResponse(error);
        request.log.warn({ error, uploadCode: response.body.code }, "Audio source upload rejected.");
        return reply.code(response.statusCode).send(response.body);
      }

      const storedFile = await createStoredFile({
        userId: request.authUserId!,
        originalName: filename,
        storedName,
        storagePath: targetPath,
        mimeType: verified.mimeType,
        sizeBytes: verified.sizeBytes,
        fileKind: "source_audio",
      });

      if (!storedFile) {
        return reply.code(500).send({ error: "Could not store the audio source file." });
      }

      const result = createAudioTranscribeScoreDocument({
        userId: request.authUserId!,
        title: deriveTitle(filename),
        sourceFileId: storedFile.id,
        sourceOriginalName: storedFile.original_name,
      });

      if (!result.document || !result.job) {
        return reply.code(500).send({ error: "Could not create the audio transcription score project." });
      }

      return reply.code(201).send({
        score: mapScoreDocumentForApi(result.document),
        job: mapScoreJobForApi(result.job),
      });
    },
  );

  app.post(
    "/scores/import/audio-url",
    {
      preHandler: app.requireActiveEntitlement,
    },
    async (request, reply) => {
      let body;
      try {
        body = normalizeAudioUrlImportBody(request.body);
      } catch (error) {
        return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid audio URL import payload." });
      }

      if (!config.ytDlpCommand) {
        return reply.code(503).send({ error: "Audio URL import requires yt-dlp. Set YT_DLP_COMMAND on the worker/API environment before enabling this feature." });
      }

      const result = createAudioTranscribeScoreDocumentFromUrl({
        userId: request.authUserId!,
        title: body.title,
        sourceUrl: body.sourceUrl,
        rightsBasis: body.rightsBasis,
        rightsConfirmedAt: body.rightsConfirmedAt,
        transcriptionProfile: body.transcriptionProfile,
      });

      if (!result.document || !result.job) {
        return reply.code(500).send({ error: "Could not create the audio URL transcription score project." });
      }

      return reply.code(201).send({
        score: mapScoreDocumentForApi(result.document),
        job: mapScoreJobForApi(result.job),
        notice:
          "Audio-to-score from URLs is experimental. Only import media you have the right to process, and review the generated MIDI/Score JSON before using it for teaching or performance.",
      });
    },
  );
}
