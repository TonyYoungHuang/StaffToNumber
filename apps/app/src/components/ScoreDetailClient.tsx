"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APP_ROUTES, SCORE_RANGE_PROFILES, TRANSPOSING_INSTRUMENT_PROFILES } from "@score/shared";
import type {
  AssignmentPracticeSettings,
  JianpuAccidentalStrategy,
  JianpuDocument,
  JianpuPitchSystem,
  ScoreJson,
  ScoreExportFormat,
  ScoreExportOptions,
  ScoreProjectSettings,
  TransposePitchMode,
  TransposeSpellingPolicy,
} from "@score/shared";
import { API_BASE_URL, apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { useAppLocale } from "./AppLocaleProvider";
import { ScoreCorrectionPanel } from "./ScoreCorrectionPanel";
import { ScoreMusicXmlPreview } from "./ScoreMusicXmlPreview";
import { ScoreOmrReviewPanel } from "./ScoreOmrReviewPanel";
import { PracticeRecorder } from "./PracticeRecorder";
import { DEFAULT_PLAYBACK_PRACTICE_SETTINGS, ScorePlaybackPanel } from "./ScorePlaybackPanel";
import { ScoreVisualEditorPanel, type ScoreEditorCollaborationMutation } from "./ScoreVisualEditorPanel";
import { ScoreCollaborationPanel } from "./ScoreCollaborationPanel";
import { ScoreCandidateReviewWorkspace } from "./ScoreCandidateReviewWorkspace";
import { AudioWaveformPlayer } from "./AudioWaveformPlayer";
import { JianpuNotationView } from "./JianpuNotationView";
import type { PlaybackPracticeSettings } from "./ScorePlaybackPanel";
import type { PracticePerformanceAnalysis } from "../lib/practice-performance-analysis";
import type { ScoreCollaborationOperation } from "../lib/score-collaboration-document";

type ScoreRevision = {
  id: string;
  revisionNumber: number;
  musicxmlFileId: string | null;
  createdFrom: string;
  status?: "candidate" | "accepted" | "rejected" | "superseded";
  createdAt: string;
  scoreJson: ScoreJson;
};

type ScoreDocument = {
  id: string;
  title: string;
  status: "imported" | "candidate" | "needs_review" | "ready" | "archived";
  sourceFileId: string | null;
  currentRevisionId: string | null;
  pendingRevisionId?: string | null;
  settings?: ScoreProjectSettings;
  createdAt: string;
  updatedAt: string;
  currentRevision: ScoreRevision | null;
  pendingRevision?: ScoreRevision | null;
};

type ScorePayload = {
  score: ScoreDocument;
  revisions: ScoreRevision[];
};

type JianpuPayload = {
  jianpu: JianpuDocument;
};

type MusicXmlPreviewPayload = {
  musicXml: string;
};

type TransposePayload = ScorePayload & {
  revision: ScoreRevision;
  rangeDiagnostic: TransposeRangeDiagnostic | null;
  rangeDiagnostics?: TransposeRangeDiagnostic[];
  transposeEngine: "music21" | "score-json";
  transposeWarnings: string[];
  clefRecommendations?: ScoreClefRecommendation[];
};

type TransposeRangeDiagnostic = {
  profileId: string;
  label: string;
  minMidi: number;
  maxMidi: number;
  checkedPartIds: string[];
  lowestMidi: number | null;
  highestMidi: number | null;
  noteCount: number;
  lowNoteCount: number;
  highNoteCount: number;
  outOfRangeNoteCount: number;
  affectedPartIds: string[];
  warnings: string[];
};

type TransposeRangeSuggestion = {
  semitones: number;
  directionLabel: string;
  sourceKey: {
    tonic: string;
    mode: string;
    fifths: number;
    display: string;
  };
  targetKey: {
    tonic: string;
    mode: string;
    fifths: number;
    display: string;
  };
  rangeDiagnostic: TransposeRangeDiagnostic;
  rangeDiagnostics?: TransposeRangeDiagnostic[];
};

type TransposeSuggestionsPayload = {
  suggestions: TransposeRangeSuggestion[];
};

type ScoreClefRecommendation = {
  partId: string;
  partName: string;
  clef: {
    sign: string;
    line?: number;
    octaveChange?: number;
  };
  lowestMidi: number | null;
  highestMidi: number | null;
  averageMidi: number | null;
  noteCount: number;
  reason: string;
  currentClef?: {
    sign: string;
    line?: number;
    octaveChange?: number;
  };
};

type ClefRecommendationsPayload = {
  recommendations: ScoreClefRecommendation[];
};

type ExportFilePayload = {
  file: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    fileKind: string;
    createdAt: string;
  };
};

type ScoreAsset = {
  id: string;
  documentId: string;
  fileId: string;
  assetKind: string;
  revisionId: string | null;
  params: Record<string, unknown> | null;
  engine: Record<string, unknown> | null;
  checksumSha256: string | null;
  staleAt: string | null;
  isStale: boolean;
  createdAt: string;
  file: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    fileKind: string;
    createdAt: string;
  };
};

type ScoreAssetsPayload = {
  assets: ScoreAsset[];
};

type ScoreJob = {
  id: string;
  jobType: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  params: Record<string, unknown> | null;
  resultRevisionId: string | null;
  outputFileIds: string[] | null;
  errorMessage: string | null;
  attemptCount: number;
  progressPercent: number;
  cancelRequestedAt: string | null;
  queuePosition: number | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

type OmrDiagnostic = {
  id: string;
  jobId: string | null;
  documentId: string;
  diagnostics: Record<string, unknown>;
  confidence: number | null;
  sourcePageCount: number | null;
  createdAt: string;
};

type ScoreJobsPayload = {
  jobs: ScoreJob[];
  omrDiagnostics: OmrDiagnostic[];
};

type ScoreExportQueuePayload = {
  job: ScoreJob;
};

type ScoreComment = {
  id: string;
  documentId: string;
  authorUserId: string | null;
  authorShareId: string | null;
  author: { kind: "account" | "share_link"; displayName: string; verification: "account" | "share_link" };
  body: string;
  target: Record<string, unknown> | null;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

type ScoreCommentsPayload = {
  comments: ScoreComment[];
};

type ScoreShare = {
  id: string;
  documentId: string;
  token: string;
  permission: "view" | "comment" | "edit";
  label: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ScoreRubricCriterion = {
  id: string;
  label: string;
  maxScore: number;
};

type ScoreRubricScore = {
  criterionId: string;
  score: number;
};

type ScoreRubricTemplate = {
  id: string;
  name: string;
  rubric: ScoreRubricCriterion[];
  createdAt: string;
  updatedAt: string;
};

type ScoreRubricTemplatesPayload = {
  templates: ScoreRubricTemplate[];
};

type ScoreSharesPayload = {
  shares: ScoreShare[];
};

type ScoreAssignment = {
  id: string;
  documentId: string;
  createdByUserId: string;
  revisionId: string | null;
  shareId: string | null;
  shareToken: string | null;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  rubric: ScoreRubricCriterion[];
  practiceSettings: AssignmentPracticeSettings | null;
  status: "open" | "archived";
  createdAt: string;
  updatedAt: string;
};

type ScoreAssignmentsPayload = {
  assignments: ScoreAssignment[];
};

type ScoreAssignmentSubmission = {
  id: string;
  assignmentId: string;
  assignmentTitle: string | null;
  documentId: string;
  submitterName: string;
  submitterContact: string | null;
  note: string | null;
  recordingUrl: string | null;
  performanceFileId: string | null;
  performanceFile: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
  } | null;
  practiceMinutes: number | null;
  practiceSettings: AssignmentPracticeSettings | null;
  performanceAnalysis: PracticePerformanceAnalysis | null;
  status: "submitted" | "reviewed";
  teacherFeedback: string | null;
  gradeScore: number | null;
  gradeMax: number | null;
  rubricScores: ScoreRubricScore[];
  submittedAt: string;
  updatedAt: string;
};

type ScoreAssignmentSubmissionsPayload = {
  submissions: ScoreAssignmentSubmission[];
};

type ScoreAssignmentAnalytics = {
  assignmentId: string;
  assignmentTitle: string;
  submissionCount: number;
  reviewedCount: number;
  gradedCount: number;
  averageGradePercent: number | null;
  rubricAverages: Array<{
    criterionId: string;
    label: string;
    maxScore: number;
    averageScore: number | null;
    scoredCount: number;
  }>;
};

type ScoreAssignmentAnalyticsPayload = {
  analytics: ScoreAssignmentAnalytics[];
};

type CommentTargetOption = {
  id: string;
  label: string;
  target: Record<string, unknown>;
};

type ExportWithAssetsPayload = ExportFilePayload & Partial<ScoreAssetsPayload>;

type RubricDraftRow = {
  label: string;
  maxScore: string;
};

const TARGET_KEY_OPTIONS = [
  "Cb",
  "Gb",
  "Db",
  "Ab",
  "Eb",
  "Bb",
  "F",
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F#",
  "C#",
] as const;

const TARGET_MODE_OPTIONS = ["major", "minor", "dorian", "phrygian", "lydian", "mixolydian", "locrian"] as const;

const TRANSPOSE_INTERVAL_OPTIONS = [
  { id: "m2", label: "m2", semitones: 1, diatonicSteps: 1 },
  { id: "M2", label: "M2", semitones: 2, diatonicSteps: 1 },
  { id: "m3", label: "m3", semitones: 3, diatonicSteps: 2 },
  { id: "M3", label: "M3", semitones: 4, diatonicSteps: 2 },
  { id: "P4", label: "P4", semitones: 5, diatonicSteps: 3 },
  { id: "A4", label: "A4 / d5", semitones: 6, diatonicSteps: 3 },
  { id: "P5", label: "P5", semitones: 7, diatonicSteps: 4 },
  { id: "m6", label: "m6", semitones: 8, diatonicSteps: 5 },
  { id: "M6", label: "M6", semitones: 9, diatonicSteps: 5 },
  { id: "m7", label: "m7", semitones: 10, diatonicSteps: 6 },
  { id: "M7", label: "M7", semitones: 11, diatonicSteps: 6 },
  { id: "P8", label: "P8", semitones: 12, diatonicSteps: 7 },
] as const;

export function ScoreDetailClient() {
  const params = useParams();
  const scoreId = typeof params.id === "string" ? params.id : "";
  const token = useMemo(() => getStoredToken(), []);
  const performancePreviewUrlRef = useRef<Record<string, string>>({});
  const { locale } = useAppLocale();
  const [payload, setPayload] = useState<ScorePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [jianpu, setJianpu] = useState<JianpuDocument | null>(null);
  const [jianpuLoading, setJianpuLoading] = useState(false);
  const [jianpuError, setJianpuError] = useState<string | null>(null);
  const [jianpuPitchSystem, setJianpuPitchSystem] = useState<JianpuPitchSystem>("movable-do");
  const [jianpuAccidentalStrategy, setJianpuAccidentalStrategy] = useState<JianpuAccidentalStrategy>("preserve");
  const [generatedPreviewMusicXml, setGeneratedPreviewMusicXml] = useState<string | null>(null);
  const [selectedScoreEventId, setSelectedScoreEventId] = useState<string | null>(null);
  const [pendingCollaborationOperations, setPendingCollaborationOperations] = useState<ScoreCollaborationOperation[]>([]);
  const [transposeSemitones, setTransposeSemitones] = useState(2);
  const [transposeMode, setTransposeMode] = useState<"semitones" | "interval" | "targetKey" | "instrument">("semitones");
  const [targetTonic, setTargetTonic] = useState("G");
  const [targetMode, setTargetMode] = useState<(typeof TARGET_MODE_OPTIONS)[number]>("major");
  const [instrumentProfileId, setInstrumentProfileId] = useState<string>(TRANSPOSING_INSTRUMENT_PROFILES[0].id);
  const [transposeSpellingPolicy, setTransposeSpellingPolicy] = useState<TransposeSpellingPolicy>("auto");
  const [transposePitchMode, setTransposePitchMode] = useState<TransposePitchMode>("concert-to-written");
  const [transposeIntervalId, setTransposeIntervalId] = useState<(typeof TRANSPOSE_INTERVAL_OPTIONS)[number]["id"]>("M2");
  const [transposeIntervalDirection, setTransposeIntervalDirection] = useState<1 | -1>(1);
  const [transposeEngineResult, setTransposeEngineResult] = useState<"music21" | "score-json" | null>(null);
  const [transposeWarnings, setTransposeWarnings] = useState<string[]>([]);
  const [rangeProfileId, setRangeProfileId] = useState("none");
  const [rangePartId, setRangePartId] = useState("all");
  const [partRangeProfileIds, setPartRangeProfileIds] = useState<Record<string, string>>({});
  const [transposeRangeDiagnostic, setTransposeRangeDiagnostic] = useState<TransposeRangeDiagnostic | null>(null);
  const [transposeRangeDiagnostics, setTransposeRangeDiagnostics] = useState<TransposeRangeDiagnostic[]>([]);
  const [transposeSuggestions, setTransposeSuggestions] = useState<TransposeRangeSuggestion[]>([]);
  const [transposeSuggestionsLoading, setTransposeSuggestionsLoading] = useState(false);
  const [transposeSuggestionsError, setTransposeSuggestionsError] = useState<string | null>(null);
  const [transposing, setTransposing] = useState(false);
  const [transposeStatus, setTransposeStatus] = useState<string | null>(null);
  const [transposeStatusKind, setTransposeStatusKind] = useState<"success" | "error" | null>(null);
  const [savingTransposePreset, setSavingTransposePreset] = useState(false);
  const [transposePresetStatus, setTransposePresetStatus] = useState<string | null>(null);
  const [transposePresetStatusKind, setTransposePresetStatusKind] = useState<"success" | "error" | null>(null);
  const [clefRecommendations, setClefRecommendations] = useState<ScoreClefRecommendation[]>([]);
  const [clefRecommendationsLoading, setClefRecommendationsLoading] = useState(false);
  const [applyingClefRecommendations, setApplyingClefRecommendations] = useState(false);
  const [clefRecommendationStatus, setClefRecommendationStatus] = useState<string | null>(null);
  const [clefRecommendationStatusKind, setClefRecommendationStatusKind] = useState<"success" | "error" | null>(null);
  const [exportingMidi, setExportingMidi] = useState(false);
  const [exportingJianpu, setExportingJianpu] = useState(false);
  const [exportingScoreJson, setExportingScoreJson] = useState(false);
  const [exportingMusicXml, setExportingMusicXml] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingSvg, setExportingSvg] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);
  const [exportingWav, setExportingWav] = useState(false);
  const [exportingMp3, setExportingMp3] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exportStatusKind, setExportStatusKind] = useState<"success" | "error" | null>(null);
  const [renderImageDpi, setRenderImageDpi] = useState(300);
  const [trimRenderedImage, setTrimRenderedImage] = useState(false);
  const [renderTrimMargin, setRenderTrimMargin] = useState(20);
  const [renderPageSize, setRenderPageSize] = useState<"default" | "a4" | "letter">("default");
  const [renderMarginPreset, setRenderMarginPreset] = useState<"default" | "narrow" | "normal" | "wide">("default");
  const [audioSampleRate, setAudioSampleRate] = useState<44100 | 48000 | 96000>(48000);
  const [audioChannels, setAudioChannels] = useState<1 | 2>(2);
  const [soundFontGain, setSoundFontGain] = useState(0.7);
  const [audioReverbEnabled, setAudioReverbEnabled] = useState(true);
  const [audioChorusEnabled, setAudioChorusEnabled] = useState(true);
  const [audioNormalizeLoudness, setAudioNormalizeLoudness] = useState(true);
  const [audioLoudnessTarget, setAudioLoudnessTarget] = useState(-16);
  const [audioBitrateKbps, setAudioBitrateKbps] = useState<128 | 192 | 256 | 320>(192);
  const [assets, setAssets] = useState<ScoreAsset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [scoreJobs, setScoreJobs] = useState<ScoreJob[]>([]);
  const [omrDiagnostics, setOmrDiagnostics] = useState<OmrDiagnostic[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [jobActionId, setJobActionId] = useState<string | null>(null);
  const [restoringRevisionId, setRestoringRevisionId] = useState<string | null>(null);
  const [revisionStatus, setRevisionStatus] = useState<string | null>(null);
  const [revisionStatusKind, setRevisionStatusKind] = useState<"success" | "error" | null>(null);
  const [candidateAction, setCandidateAction] = useState<"accept" | "reject" | null>(null);
  const [candidateActionError, setCandidateActionError] = useState<string | null>(null);
  const [historyRevisionId, setHistoryRevisionId] = useState<string | null>(null);
  const [undoRevisionIds, setUndoRevisionIds] = useState<string[]>([]);
  const [redoRevisionIds, setRedoRevisionIds] = useState<string[]>([]);
  const skipNextHistoryResetRef = useRef(false);
  const [comments, setComments] = useState<ScoreComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentTargetId, setCommentTargetId] = useState("score");
  const [postingComment, setPostingComment] = useState(false);
  const [resolvingCommentId, setResolvingCommentId] = useState<string | null>(null);
  const [shares, setShares] = useState<ScoreShare[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [shareStatusKind, setShareStatusKind] = useState<"success" | "error" | null>(null);
  const [creatingShare, setCreatingShare] = useState(false);
  const [sharePermission, setSharePermission] = useState<ScoreShare["permission"]>("view");
  const [shareLabel, setShareLabel] = useState("");
  const [revokingShareId, setRevokingShareId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<ScoreAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentInstructions, setAssignmentInstructions] = useState("");
  const [assignmentDueAt, setAssignmentDueAt] = useState("");
  const [assignmentIncludePracticeSettings, setAssignmentIncludePracticeSettings] = useState(true);
  const [assignmentRubricRows, setAssignmentRubricRows] = useState<RubricDraftRow[]>([
    { label: "", maxScore: "" },
    { label: "", maxScore: "" },
    { label: "", maxScore: "" },
  ]);
  const [rubricTemplates, setRubricTemplates] = useState<ScoreRubricTemplate[]>([]);
  const [rubricTemplatesLoading, setRubricTemplatesLoading] = useState(false);
  const [selectedRubricTemplateId, setSelectedRubricTemplateId] = useState("");
  const [rubricTemplateName, setRubricTemplateName] = useState("");
  const [savingRubricTemplate, setSavingRubricTemplate] = useState(false);
  const [deletingRubricTemplateId, setDeletingRubricTemplateId] = useState<string | null>(null);
  const [rubricTemplateStatus, setRubricTemplateStatus] = useState<string | null>(null);
  const [rubricTemplateStatusKind, setRubricTemplateStatusKind] = useState<"success" | "error" | null>(null);
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  const [archivingAssignmentId, setArchivingAssignmentId] = useState<string | null>(null);
  const [assignmentStatus, setAssignmentStatus] = useState<string | null>(null);
  const [assignmentStatusKind, setAssignmentStatusKind] = useState<"success" | "error" | null>(null);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<ScoreAssignmentSubmission[]>([]);
  const [assignmentSubmissionsLoading, setAssignmentSubmissionsLoading] = useState(false);
  const [assignmentSubmissionsError, setAssignmentSubmissionsError] = useState<string | null>(null);
  const [assignmentAnalytics, setAssignmentAnalytics] = useState<ScoreAssignmentAnalytics[]>([]);
  const [assignmentAnalyticsLoading, setAssignmentAnalyticsLoading] = useState(false);
  const [assignmentAnalyticsError, setAssignmentAnalyticsError] = useState<string | null>(null);
  const [assignmentFeedbackDrafts, setAssignmentFeedbackDrafts] = useState<Record<string, string>>({});
  const [assignmentGradeDrafts, setAssignmentGradeDrafts] = useState<Record<string, { gradeScore: string; gradeMax: string }>>({});
  const [assignmentRubricScoreDrafts, setAssignmentRubricScoreDrafts] = useState<Record<string, Record<string, string>>>({});
  const [reviewingSubmissionId, setReviewingSubmissionId] = useState<string | null>(null);
  const [assignmentReviewStatus, setAssignmentReviewStatus] = useState<string | null>(null);
  const [assignmentReviewStatusKind, setAssignmentReviewStatusKind] = useState<"success" | "error" | null>(null);
  const [performancePreviewUrls, setPerformancePreviewUrls] = useState<Record<string, string>>({});
  const [performancePreviewLoadingId, setPerformancePreviewLoadingId] = useState<string | null>(null);
  const [performancePreviewErrors, setPerformancePreviewErrors] = useState<Record<string, string>>({});
  const [performancePlaybackTimes, setPerformancePlaybackTimes] = useState<Record<string, number>>({});
  const [performanceCommentDrafts, setPerformanceCommentDrafts] = useState<Record<string, string>>({});
  const [postingPerformanceCommentId, setPostingPerformanceCommentId] = useState<string | null>(null);
  const [playbackPracticeSettings, setPlaybackPracticeSettings] = useState<PlaybackPracticeSettings>(DEFAULT_PLAYBACK_PRACTICE_SETTINGS);
  const [practiceRecording, setPracticeRecording] = useState<File | null>(null);
  const [extractPartIds, setExtractPartIds] = useState<string[]>([]);
  const [extractTitle, setExtractTitle] = useState("");
  const [extractApplyClefs, setExtractApplyClefs] = useState(true);
  const [extractingParts, setExtractingParts] = useState(false);
  const [partExtractStatus, setPartExtractStatus] = useState<string | null>(null);
  const [partExtractStatusKind, setPartExtractStatusKind] = useState<"success" | "error" | null>(null);
  const [extractedScore, setExtractedScore] = useState<ScoreDocument | null>(null);

  const copy =
    locale === "zh-CN"
      ? {
          loading: "正在加载乐谱工程...",
          missing: "未找到乐谱工程。",
          back: "返回乐谱库",
          status: "工程状态",
          current: "当前版本",
          source: "源 MusicXML",
          download: "下载 MusicXML",
          downloadFailed: "下载失败。",
          restore: "恢复此版本",
          restoring: "正在恢复...",
          restoreSuccess: "已从历史版本创建新的当前版本。",
          restoreFailed: "版本恢复失败。",
          currentBadge: "当前",
          previewTitle: "OSMD 五线谱预览",
          previewBody: "OpenSheetMusicDisplay 会在浏览器中把导入的 MusicXML 渲染为五线谱。",
          modelTitle: "Score JSON 结构",
          modelBody: "编辑、移调、播放和导出都从这份结构化乐谱模型生成。",
          revisions: "版本历史",
        }
      : {
          loading: "Loading score project...",
          missing: "Score project not found.",
          back: "Back to score library",
          status: "Project status",
          current: "Current revision",
          source: "Source MusicXML",
          download: "Download MusicXML",
          downloadFailed: "Download failed.",
          restore: "Restore version",
          restoring: "Restoring...",
          restoreSuccess: "Created a new current revision from history.",
          restoreFailed: "Revision restore failed.",
          currentBadge: "Current",
          previewTitle: "OSMD staff preview",
          previewBody: "OpenSheetMusicDisplay renders the imported MusicXML as browser-native staff notation here.",
          modelTitle: "Score JSON structure",
          modelBody: "Editing, transposition, playback, and exports are generated from this structured score model.",
          revisions: "Revision history",
        };
  const summaryCopy =
    locale === "zh-CN"
      ? {
          parts: "声部",
          measures: "小节",
          notes: "音符",
          rests: "休止符",
          parser: "解析器",
          warnings: "导入说明",
        }
      : {
          parts: "Parts",
          measures: "Measures",
          notes: "Notes",
          rests: "Rests",
          parser: "Parser",
          warnings: "Import notes",
        };
  const jianpuCopy =
    locale === "zh-CN"
      ? {
          eyebrow: "五线谱转简谱",
          title: "简谱预览",
          body: "由当前 Score JSON 版本生成，因此移调、编辑和播放都能从同一结构重新生成简谱。",
          loading: "正在生成简谱...",
          error: "简谱生成失败。",
          key: "调号",
          source: "来源",
          warnings: "简谱投影提示",
          pitchSystem: "唱名法",
          movableDo: "首调唱名",
          fixedDo: "固定唱名",
          accidentals: "升降号策略",
          preserve: "保留原拼写",
          preferSharps: "优先升号",
          preferFlats: "优先降号",
          apply: "重新生成",
          sourceText: "简谱源文本",
          empty: "当前版本还没有可用于生成简谱的结构化乐谱数据。",
        }
      : {
          eyebrow: "Staff to Jianpu",
          title: "Jianpu preview",
          body: "Generated from the current Score JSON revision, so transposition, editing, and playback can regenerate it from the same structure.",
          loading: "Generating Jianpu...",
          error: "Jianpu generation failed.",
          key: "Key",
          source: "Source",
          warnings: "Jianpu projection notes",
          pitchSystem: "Solfège system",
          movableDo: "Movable do",
          fixedDo: "Fixed do",
          accidentals: "Accidentals",
          preserve: "Preserve spelling",
          preferSharps: "Prefer sharps",
          preferFlats: "Prefer flats",
          apply: "Regenerate",
          sourceText: "Jianpu source text",
          empty: "This revision does not have structured score data for Jianpu yet.",
        };
  const transposeCopy =
    locale === "zh-CN"
      ? {
          eyebrow: "移调",
          title: "创建移调版本",
          body: "从当前 Score JSON 创建新的乐谱版本，简谱、播放和导出都会基于新版本重新生成。",
          semitones: "半音数",
          down: "-1",
          up: "+1",
          submit: "创建移调版本",
          working: "正在移调...",
          success: "已创建新的移调版本。",
          failed: "移调失败。",
        }
      : {
          eyebrow: "Transpose",
          title: "Create transposed revision",
          body: "Generate a new score revision from the current Score JSON. Jianpu, playback, and exports regenerate from the new version.",
          semitones: "Semitones",
          down: "-1",
          up: "+1",
          submit: "Create transposed revision",
          working: "Transposing...",
          success: "Created a new transposed revision.",
          failed: "Transpose failed.",
        };
  const transposeTargetCopy =
    locale === "zh-CN"
      ? {
          mode: "移调方式",
          semitoneMode: "按半音数",
          targetKeyMode: "移到目标调",
          targetKey: "目标调",
          targetMode: "调式",
          major: "大调",
          minor: "小调",
        }
      : {
          mode: "Transpose mode",
          semitoneMode: "By semitones",
          targetKeyMode: "To target key",
          targetKey: "Target key",
          targetMode: "Mode",
          major: "Major",
          minor: "Minor",
        };
  const transposeRangeCopy =
    locale === "zh-CN"
      ? {
          label: "音域检查",
          part: "检查声部",
          allParts: "全部声部",
          perPart: "按声部设置音域",
          noPartProfile: "不检查该声部",
          none: "不检查音域",
          summary: "音域结果",
          noIssues: "所有音符都在所选音域内。",
          affected: "受影响声部",
          notes: "个音符",
          suggestions: "舒适音域建议",
          loadSuggestions: "查找合适移调",
          loadingSuggestions: "正在检查音域...",
          suggestionFailed: "无法加载移调建议。",
          applySuggestion: "采用",
          checked: "已检查",
          savePreset: "保存工程预设",
          savingPreset: "正在保存预设...",
          presetSaved: "工程移调预设已保存。",
          presetFailed: "无法保存工程移调预设。",
        }
      : {
          label: "Range check",
          part: "Checked part",
          allParts: "All parts",
          perPart: "Per-part ranges",
          noPartProfile: "No part range",
          none: "No range check",
          summary: "Range result",
          noIssues: "All notes fit the selected range.",
          affected: "Affected parts",
          notes: "notes",
          suggestions: "Comfort suggestions",
          loadSuggestions: "Find comfortable moves",
          loadingSuggestions: "Checking ranges...",
          suggestionFailed: "Could not load transpose suggestions.",
          applySuggestion: "Use",
          checked: "Checked",
          savePreset: "Save project preset",
          savingPreset: "Saving preset...",
          presetSaved: "Project transpose preset saved.",
          presetFailed: "Could not save project transpose preset.",
        };
  const clefRecommendationCopy =
    locale === "zh-CN"
      ? {
          eyebrow: "谱号助手",
          title: "自动谱号建议",
          body: "分析各声部音域，并创建采用易读首小节谱号的新 Score JSON 版本。",
          load: "分析谱号",
          loading: "正在分析谱号...",
          apply: "应用建议谱号",
          applying: "正在应用谱号...",
          success: "已创建谱号建议版本。",
          failed: "无法更新谱号。",
          current: "当前",
          recommended: "建议",
          range: "音域",
          noNotes: "没有带音高的音符",
        }
      : {
          eyebrow: "Clef assistant",
          title: "Automatic clef recommendations",
          body: "Analyze each part's pitch range and create a new Score JSON revision with readable first-measure clefs.",
          load: "Analyze clefs",
          loading: "Analyzing clefs...",
          apply: "Apply recommended clefs",
          applying: "Applying clefs...",
          success: "Clef recommendation revision created.",
          failed: "Could not update clefs.",
          current: "Current",
          recommended: "Recommended",
          range: "Range",
          noNotes: "No pitched notes",
        };
  const exportCopy =
    locale === "zh-CN"
      ? {
          midi: "导出 MIDI",
          exporting: "正在加入队列...",
          success: "MIDI 已导出。",
          failed: "MIDI 导出失败。",
        }
      : {
          midi: "Export MIDI",
          exporting: "Queueing MIDI...",
          success: "MIDI exported.",
          failed: "MIDI export failed.",
        };
  const jianpuExportCopy =
    locale === "zh-CN"
      ? {
          button: "导出简谱",
          exporting: "正在导出简谱...",
          success: "简谱已导出。",
          failed: "简谱导出失败。",
        }
      : {
          button: "Export Jianpu",
          exporting: "Exporting Jianpu...",
          success: "Jianpu exported.",
          failed: "Jianpu export failed.",
        };
  const scoreJsonExportCopy =
    locale === "zh-CN"
      ? {
          button: "导出 Score JSON",
          exporting: "正在导出 Score JSON...",
          success: "Score JSON 快照已导出。",
          failed: "Score JSON 导出失败。",
        }
      : {
          button: "Export Score JSON",
          exporting: "Exporting Score JSON...",
          success: "Score JSON snapshot exported.",
          failed: "Score JSON export failed.",
        };
  const wavExportCopy =
    locale === "zh-CN"
      ? {
          button: "导出 WAV",
          exporting: "正在加入队列...",
          success: "WAV 已导出。",
          failed: "WAV 导出失败。",
        }
      : {
          button: "Export WAV",
          exporting: "Queueing WAV...",
          success: "WAV exported.",
          failed: "WAV export failed.",
        };
  const mp3ExportCopy =
    locale === "zh-CN"
      ? {
          button: "导出 MP3",
          exporting: "正在加入队列...",
          success: "MP3 已导出。",
          failed: "MP3 导出失败，请检查 FluidSynth、SoundFont 和 ffmpeg 配置。",
        }
      : {
          button: "Export MP3",
          exporting: "Queueing MP3...",
          success: "MP3 exported.",
          failed: "MP3 export failed. Check FluidSynth, SoundFont, and ffmpeg configuration.",
        };
  const musicXmlExportCopy =
    locale === "zh-CN"
      ? {
          button: "导出 MusicXML",
          exporting: "正在加入队列...",
          success: "MusicXML 已生成。",
          failed: "MusicXML 导出失败。",
        }
      : {
          button: "Export MusicXML",
          exporting: "Queueing MusicXML...",
          success: "MusicXML generated.",
          failed: "MusicXML export failed.",
        };
  const pdfExportCopy =
    locale === "zh-CN"
      ? {
          button: "导出 PDF",
          exporting: "正在加入队列...",
          success: "PDF 已导出。",
          failed: "PDF 导出失败。",
        }
      : {
          button: "Export PDF",
          exporting: "Queueing PDF...",
          success: "PDF exported.",
          failed: "PDF export failed.",
        };
  const renderedImageExportCopy =
    locale === "zh-CN"
      ? {
          svg: "导出 SVG",
          png: "导出 PNG",
          exportingSvg: "正在加入队列...",
          exportingPng: "正在加入队列...",
          successSvg: "SVG 已导出。",
          successPng: "PNG 已导出。",
          failedSvg: "SVG 导出失败。",
          failedPng: "PNG 导出失败。",
        }
      : {
          svg: "Export SVG",
          png: "Export PNG",
          exportingSvg: "Queueing SVG...",
          exportingPng: "Queueing PNG...",
          successSvg: "SVG exported.",
          successPng: "PNG exported.",
          failedSvg: "SVG export failed.",
          failedPng: "PNG export failed.",
        };
  const renderedExportOptionsCopy = locale === "zh-CN"
    ? {
        eyebrow: "PDF、SVG、PNG 高质量导出",
        title: "PDF、SVG、PNG 高质量导出设置",
        body: "设置页面尺寸、边距、PNG 分辨率以及 SVG/PNG 留白裁切。",
        dpi: "PNG 分辨率",
        trim: "裁切 SVG/PNG 留白",
        trimMargin: "裁切边距",
        pageSize: "页面尺寸",
        margins: "页面边距",
        defaultOption: "默认",
        a4: "A4",
        letter: "Letter",
        narrow: "窄",
        normal: "标准",
        wide: "宽",
        helper: "页面预设写入任务的 MusicXML 快照，再由 MuseScore 渲染；多页图片会作为多个任务产物保存。",
      }
    : {
        eyebrow: "High-quality PDF, SVG & PNG Export",
        title: "High-quality PDF, SVG & PNG Export Settings",
        body: "Set page size, margins, PNG resolution, and SVG/PNG whitespace trimming.",
        dpi: "PNG DPI",
        trim: "Trim SVG/PNG whitespace",
        trimMargin: "Trim margin",
        pageSize: "Page size",
        margins: "Page margins",
        defaultOption: "Default",
        a4: "A4",
        letter: "Letter",
        narrow: "Narrow",
        normal: "Normal",
        wide: "Wide",
        helper: "Page presets are written into the job's MusicXML snapshot before MuseScore renders it. Multi-page images are stored as separate job outputs.",
      };
  const audioExportOptionsCopy =
    locale === "zh-CN"
      ? {
          eyebrow: "WAV、MP3 音频导出",
          title: "WAV、MP3 音频导出设置",
          body: "WAV 与 MP3 通过 MIDI、FluidSynth 和商业可用 SoundFont 离线生成，再由 ffmpeg 做响度与编码处理。",
          sampleRate: "采样率",
          channels: "声道",
          stereo: "立体声",
          mono: "单声道",
          gain: "SoundFont 增益",
          reverb: "混响",
          chorus: "合唱效果",
          normalize: "响度标准化",
          loudness: "目标响度（LUFS）",
          bitrate: "MP3 码率",
        }
      : {
          eyebrow: "WAV & MP3 Audio Export",
          title: "WAV & MP3 Audio Export Settings",
          body: "WAV and MP3 run through MIDI, FluidSynth, a licensed SoundFont, and ffmpeg loudness/encoding processing.",
          sampleRate: "Sample rate",
          channels: "Channels",
          stereo: "Stereo",
          mono: "Mono",
          gain: "SoundFont gain",
          reverb: "Reverb",
          chorus: "Chorus",
          normalize: "Loudness normalization",
          loudness: "Target loudness (LUFS)",
          bitrate: "MP3 bitrate",
        };
  const partExtractCopy = locale === "zh-CN"
    ? {
        eyebrow: "声部分谱副本 Beta",
        title: "生成独立声部练习副本",
        body: "把所选声部提取为新的 Score JSON 工程，用于个人练习、教学链接、移调、播放和导出；副本暂不会自动跟随总谱后续修改。",
        titleLabel: "新工程名称",
        parts: "选择声部",
        applyClefs: "自动优化谱号",
        submit: "生成声部副本",
        working: "正在生成...",
        success: "声部副本工程已创建。",
        failed: "无法创建声部副本。",
        open: "打开声部副本",
      }
    : {
        eyebrow: "Part Copy Generator Beta",
        title: "Create an independent part practice copy",
        body: "Extract selected parts into a new Score JSON project for practice, teaching links, transposition, playback, and export. Copies do not yet follow later full-score edits.",
        titleLabel: "New project title",
        parts: "Parts",
        applyClefs: "Apply automatic clef cleanup",
        submit: "Create part copy",
        working: "Creating part copy...",
        success: "Part copy project created.",
        failed: "Could not create the part copy.",
        open: "Open part copy",
      };
  const assetCopy =
    locale === "zh-CN"
      ? {
          eyebrow: "导出中心",
          title: "项目文件与导出记录",
          body: "这里汇总当前乐谱工程的源文件和导出文件，生成过的 MusicXML、MIDI 等文件可以重复下载。",
          loading: "正在加载导出记录...",
          empty: "还没有导出文件。先生成 MusicXML 或 MIDI。",
          failed: "导出记录加载失败。",
          download: "下载",
          source: "源文件",
          export: "导出",
        }
      : {
          eyebrow: "Export center",
          title: "Project files and exports",
          body: "Source files and generated exports stay here so MusicXML, Score JSON, Jianpu, MIDI, PDF, image, and audio outputs can be downloaded again.",
          loading: "Loading exports...",
          empty: "No exported files yet. Generate MusicXML, Score JSON, Jianpu, or MIDI first.",
          failed: "Could not load export records.",
          download: "Download",
          source: "Source",
          export: "Export",
        };
  const omrCopy =
    locale === "zh-CN"
      ? {
          eyebrow: "后台任务",
          title: "识别、转谱与导出任务",
          body: "这里统一显示 Audiveris 扫描、Basic Pitch 音频转谱和 MuseScore/FluidSynth 导出任务的进度、失败原因、重试与产物。",
          loading: "正在加载任务...",
          empty: "当前项目还没有后台任务。",
          failed: "任务加载失败。",
          refresh: "刷新状态",
          diagnostics: "识别诊断",
          confidence: "置信度",
          pages: "页数",
          revision: "生成版本",
          outputs: "输出文件",
        }
      : {
          eyebrow: "Score jobs",
          title: "Recognition, transcription, and export jobs",
          body: "Audiveris scans, Basic Pitch transcription, MuseScore rendering, and FluidSynth audio exports share this progress, retry, failure, and output queue.",
          loading: "Loading score jobs...",
          empty: "No background score jobs for this project yet.",
          failed: "Could not load score jobs.",
          refresh: "Refresh status",
          diagnostics: "Recognition diagnostics",
          confidence: "Confidence",
          pages: "Pages",
          revision: "Revision",
          outputs: "Output files",
        };
  const commentCopy =
    locale === "zh-CN"
      ? {
          eyebrow: "协作批注",
          title: "项目评论",
          body: "评论可绑定整份乐谱、小节、音符或学生提交；账号身份与分享链接身份均由服务端标记。",
          target: "批注对象",
          scoreTarget: "整份乐谱",
          placeholder: "写下修谱建议、教学提醒或练习反馈...",
          submit: "发布评论",
          posting: "正在发布...",
          loading: "正在加载评论...",
          empty: "还没有评论。",
          failed: "评论加载失败。",
          postFailed: "评论发布失败。",
          author: "用户",
          accountIdentity: "账号身份",
          shareIdentity: "链接身份",
          resolved: "已解决",
          resolve: "标记解决",
          reopen: "重新打开",
        }
      : {
          eyebrow: "Collaboration",
          title: "Project comments",
          body: "Comments can target a score, measure, note, or student submission. Account and share-link identities are marked by the server.",
          target: "Comment target",
          scoreTarget: "Whole score",
          placeholder: "Add a correction note, teaching reminder, or practice feedback...",
          submit: "Post comment",
          posting: "Posting...",
          loading: "Loading comments...",
          empty: "No comments yet.",
          failed: "Could not load comments.",
          postFailed: "Could not post comment.",
          author: "User",
          accountIdentity: "Account identity",
          shareIdentity: "Link identity",
          resolved: "Resolved",
          resolve: "Resolve",
          reopen: "Reopen",
        };
  const shareCopy =
    locale === "zh-CN"
      ? {
          eyebrow: "分享",
          title: "乐谱协作分享链接",
          body: "为学生、同事或排练成员创建可撤销链接，并明确选择查看、评论或编辑权限。",
          create: "创建分享链接",
          creating: "正在创建...",
          copy: "复制链接",
          revoke: "撤销",
          revoking: "正在撤销...",
          copied: "分享链接已复制。",
          created: "分享链接已创建。",
          failed: "分享链接操作失败。",
          loading: "正在加载分享链接...",
          empty: "还没有分享链接。",
          active: "可用",
          revoked: "已撤销",
          expires: "过期",
          never: "永不过期",
          permission: "权限",
          label: "链接身份名称",
          labelPlaceholder: "例如：李老师、合唱团女高音负责人",
          view: "仅查看",
          comment: "可评论",
          edit: "可编辑",
        }
      : {
          eyebrow: "Share",
          title: "Score collaboration links",
          body: "Create revocable links for students, collaborators, or ensemble members with an explicit view, comment, or edit role.",
          create: "Create share link",
          creating: "Creating...",
          copy: "Copy link",
          revoke: "Revoke",
          revoking: "Revoking...",
          copied: "Share link copied.",
          created: "Share link created.",
          failed: "Share link action failed.",
          loading: "Loading share links...",
          empty: "No share links yet.",
          active: "Active",
          revoked: "Revoked",
          expires: "Expires",
          never: "Never",
          permission: "Permission",
          label: "Link identity name",
          labelPlaceholder: "For example: Violin coach or Soprano lead",
          view: "View only",
          comment: "Comment",
          edit: "Edit",
        };
  const assignmentCopy =
    locale === "zh-CN"
      ? {
          eyebrow: "教学作业",
          title: "布置乐谱练习",
          body: "把当前乐谱版本、练习说明和只读学生链接沉淀为作业。后续可继续扩展学生提交、批改和班级管理。",
          titleLabel: "作业标题",
          titlePlaceholder: "例如：第 12 小节到第 24 小节慢练",
          instructions: "练习说明",
          instructionsPlaceholder: "写下速度、循环范围、分声部或提交要求...",
          dueAt: "截止时间",
          create: "创建作业",
          creating: "正在创建...",
          archive: "归档",
          archiving: "正在归档...",
          copy: "复制学生链接",
          copied: "学生链接已复制。",
          created: "作业已创建。",
          failed: "作业操作失败。",
          loading: "正在加载作业...",
          empty: "还没有作业。",
          open: "进行中",
          archived: "已归档",
          noDue: "无截止时间",
          linkMissing: "分享链接不可用",
          revision: "版本",
          submissions: "学生提交",
          submissionsLoading: "正在加载学生提交...",
          submissionsEmpty: "还没有学生提交。",
          submissionsFailed: "学生提交加载失败。",
          submittedAt: "提交时间",
          practiceMinutes: "练习分钟",
          recording: "录音链接",
          contact: "联系方式",
          noRecording: "无录音链接",
          performanceFile: "演奏文件",
          downloadPerformanceFile: "下载演奏文件",
          loadPerformancePreview: "播放审阅",
          loadingPerformancePreview: "正在加载播放器...",
          performancePreviewFailed: "演奏文件预览加载失败。",
          performanceTime: "当前时间",
          performanceComment: "时间点批注",
          performanceCommentPlaceholder: "写下这个时间点的音准、节奏、呼吸、指法或练习建议...",
          postPerformanceComment: "保存时间点批注",
          postingPerformanceComment: "正在保存...",
          performanceCommentSaved: "时间点批注已保存到项目评论。",
          performanceCommentFailed: "时间点批注保存失败。",
        }
      : {
          eyebrow: "Teaching",
          title: "Score assignments",
          body: "Turn the current score revision, practice instructions, and a read-only student link into an assignment. Shared pages now accept lightweight student submissions; grading and student accounts can build on this later.",
          titleLabel: "Assignment title",
          titlePlaceholder: "Example: slow practice from measure 12 to 24",
          instructions: "Practice instructions",
          instructionsPlaceholder: "Add tempo, loop range, part focus, or submission expectations...",
          dueAt: "Due date",
          create: "Create assignment",
          creating: "Creating...",
          archive: "Archive",
          archiving: "Archiving...",
          copy: "Copy student link",
          copied: "Student link copied.",
          created: "Assignment created.",
          failed: "Assignment action failed.",
          loading: "Loading assignments...",
          empty: "No assignments yet.",
          open: "Open",
          archived: "Archived",
          noDue: "No due date",
          linkMissing: "Share link unavailable",
          revision: "Revision",
          submissions: "Student submissions",
          submissionsLoading: "Loading student submissions...",
          submissionsEmpty: "No student submissions yet.",
          submissionsFailed: "Could not load student submissions.",
          submittedAt: "Submitted",
          practiceMinutes: "Practice minutes",
          recording: "Recording",
          contact: "Contact",
          noRecording: "No recording link",
          performanceFile: "Performance file",
          downloadPerformanceFile: "Download performance file",
          loadPerformancePreview: "Review playback",
          loadingPerformancePreview: "Loading player...",
          performancePreviewFailed: "Could not load the performance preview.",
          performanceTime: "Current time",
          performanceComment: "Timed comment",
          performanceCommentPlaceholder: "Add pitch, rhythm, breathing, fingering, or practice guidance for this moment...",
          postPerformanceComment: "Save timed comment",
          postingPerformanceComment: "Saving...",
          performanceCommentSaved: "Timed comment saved to project comments.",
          performanceCommentFailed: "Could not save the timed comment.",
          feedback: "Teacher feedback",
          feedbackPlaceholder: "Add correction notes, next practice focus, or encouragement...",
          saveFeedback: "Save feedback",
          savingFeedback: "Saving...",
          feedbackSaved: "Feedback saved and submission marked reviewed.",
          feedbackFailed: "Could not save feedback.",
        };

  const reviewCopy =
    locale === "zh-CN"
      ? {
          feedback: "老师反馈",
          feedbackPlaceholder: "写下批改意见、下一次练习重点或鼓励...",
          saveFeedback: "保存反馈",
          savingFeedback: "正在保存...",
          feedbackSaved: "反馈已保存，提交已标记为已批阅。",
          feedbackFailed: "反馈保存失败。",
        }
      : {
          feedback: "Teacher feedback",
          feedbackPlaceholder: "Add correction notes, next practice focus, or encouragement...",
          saveFeedback: "Save feedback",
          savingFeedback: "Saving...",
          feedbackSaved: "Feedback saved and submission marked reviewed.",
          feedbackFailed: "Could not save feedback.",
        };

  const gradeCopy =
    locale === "zh-CN"
      ? {
          grade: "评分",
          score: "得分",
          max: "满分",
          scorePlaceholder: "例如 85",
          maxPlaceholder: "例如 100",
          gradeSaved: "评分与反馈已保存。",
        }
      : {
          grade: "Grade",
          score: "Score",
          max: "Max",
          scorePlaceholder: "e.g. 85",
          maxPlaceholder: "e.g. 100",
          gradeSaved: "Grade and feedback saved.",
        };

  const analyticsCopy =
    locale === "zh-CN"
      ? {
          title: "作业统计",
          loading: "正在加载作业统计...",
          failed: "作业统计加载失败。",
          empty: "还没有可统计的作业。",
          submissions: "提交",
          reviewed: "已批阅",
          graded: "已评分",
          average: "平均分",
          rubricAverage: "维度平均",
        }
      : {
          title: "Assignment analytics",
          loading: "Loading assignment analytics...",
          failed: "Could not load assignment analytics.",
          empty: "No assignment analytics yet.",
          submissions: "Submissions",
          reviewed: "Reviewed",
          graded: "Graded",
          average: "Average",
          rubricAverage: "Rubric averages",
        };

  const rubricCopy =
    locale === "zh-CN"
      ? {
          rubric: "评分细则",
          criterion: "评分维度",
          maxScore: "维度满分",
          criterionPlaceholder: "例如：音准 / 节奏 / 表现力",
          maxPlaceholder: "例如 20",
          empty: "未设置评分细则。",
          templates: "评分模板",
          templateName: "模板名称",
          templatePlaceholder: "例如：声乐课通用评分",
          applyTemplate: "套用模板",
          saveTemplate: "保存为模板",
          savingTemplate: "正在保存...",
          deleteTemplate: "删除模板",
          deletingTemplate: "正在删除...",
          templatesLoading: "正在加载评分模板...",
          templatesEmpty: "还没有评分模板。",
          templateSaved: "评分模板已保存。",
          templateDeleted: "评分模板已删除。",
          templateFailed: "评分模板操作失败。",
        }
      : {
          rubric: "Rubric",
          criterion: "Criterion",
          maxScore: "Criterion max",
          criterionPlaceholder: "e.g. Pitch / Rhythm / Expression",
          maxPlaceholder: "e.g. 20",
          empty: "No rubric criteria set.",
          templates: "Rubric templates",
          templateName: "Template name",
          templatePlaceholder: "e.g. Voice lesson standard rubric",
          applyTemplate: "Apply template",
          saveTemplate: "Save as template",
          savingTemplate: "Saving...",
          deleteTemplate: "Delete template",
          deletingTemplate: "Deleting...",
          templatesLoading: "Loading rubric templates...",
          templatesEmpty: "No rubric templates yet.",
          templateSaved: "Rubric template saved.",
          templateDeleted: "Rubric template deleted.",
          templateFailed: "Rubric template action failed.",
        };

  function applyScoreProjectSettings(settings: ScoreProjectSettings | undefined, scoreJson: ScoreJson | undefined) {
    const knownPartIds = new Set(scoreJson?.parts.map((part) => part.id) ?? []);
    const rangeProfileIds = new Set<string>(SCORE_RANGE_PROFILES.map((profile) => profile.id));
    const instrumentProfileIds = new Set<string>(TRANSPOSING_INSTRUMENT_PROFILES.map((profile) => profile.id));
    const defaultRangeProfileId =
      settings?.defaultRangeProfileId && rangeProfileIds.has(settings.defaultRangeProfileId) ? settings.defaultRangeProfileId : "none";
    const defaultRangePartId = settings?.defaultRangePartId && knownPartIds.has(settings.defaultRangePartId) ? settings.defaultRangePartId : "all";
    const defaultInstrumentProfileId =
      settings?.defaultInstrumentProfileId && instrumentProfileIds.has(settings.defaultInstrumentProfileId)
        ? settings.defaultInstrumentProfileId
        : TRANSPOSING_INSTRUMENT_PROFILES[0].id;
    const nextPartRangeProfileIds = Object.fromEntries(
      Object.entries(settings?.partRangeProfileIds ?? {}).filter(([partId, profileId]) => knownPartIds.has(partId) && rangeProfileIds.has(profileId)),
    );

    setRangeProfileId(defaultRangeProfileId);
    setRangePartId(defaultRangePartId);
    setInstrumentProfileId(defaultInstrumentProfileId);
    setTransposeSpellingPolicy(settings?.defaultTransposeSpellingPolicy ?? "auto");
    setTransposePitchMode(settings?.defaultTransposePitchMode ?? "concert-to-written");
    setPartRangeProfileIds(nextPartRangeProfileIds);
  }

  useEffect(() => {
    if (!token || !scoreId) {
      setLoading(false);
      setError(copy.missing);
      return;
    }

    let active = true;

    async function loadScore() {
      const result = await apiRequest<ScorePayload>(`/api/scores/${scoreId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!active) {
        return;
      }

      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPayload(result.data);
      applyScoreProjectSettings(
        result.data.score.settings,
        result.data.score.pendingRevision?.scoreJson ?? result.data.score.currentRevision?.scoreJson,
      );
      if (!result.data.score.currentRevision) {
        setJianpu(null);
        setJianpuError(null);
      } else {
        await refreshJianpu();
      }
      await refreshAssets();
      await refreshScoreJobs();
      await refreshComments();
      await refreshShares();
      await refreshAssignments();
      await refreshRubricTemplates();
      await refreshAssignmentSubmissions();
      await refreshAssignmentAnalytics();
    }

    void loadScore();

    return () => {
      active = false;
    };
  }, [copy.missing, jianpuCopy.error, scoreId, token]);

  useEffect(() => {
    const workingRevisionId = payload?.score.pendingRevisionId ?? payload?.score.currentRevisionId ?? null;
    if (!workingRevisionId) {
      setHistoryRevisionId(null);
      setUndoRevisionIds([]);
      setRedoRevisionIds([]);
      return;
    }

    if (skipNextHistoryResetRef.current) {
      skipNextHistoryResetRef.current = false;
      return;
    }

    const currentRevision = payload?.revisions.find((revision) => revision.id === workingRevisionId);
    const candidateMode = Boolean(payload?.score.pendingRevisionId);
    setHistoryRevisionId(workingRevisionId);
    setUndoRevisionIds(
      (payload?.revisions ?? [])
        .filter(
          (revision) =>
            (!currentRevision || revision.revisionNumber < currentRevision.revisionNumber) &&
            (!candidateMode || revision.status === "candidate" || revision.status === "superseded"),
        )
        .sort((left, right) => left.revisionNumber - right.revisionNumber)
        .map((revision) => revision.id),
    );
    setRedoRevisionIds([]);
  }, [payload?.revisions, payload?.score.currentRevisionId, payload?.score.pendingRevisionId]);

  useEffect(() => {
    return () => {
      for (const url of Object.values(performancePreviewUrlRef.current)) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  useEffect(() => {
    const scoreJson = payload?.score.currentRevision?.scoreJson;
    if (!scoreJson || scoreJson.parts.length === 0) {
      setExtractPartIds([]);
      setExtractTitle("");
      return;
    }

    const knownPartIds = new Set(scoreJson.parts.map((part) => part.id));
    setExtractPartIds((current) => {
      const next = current.filter((partId) => knownPartIds.has(partId));
      return next.length > 0 ? next : [scoreJson.parts[0].id];
    });
    setExtractTitle((current) => current || `${scoreJson.title} - ${scoreJson.parts[0].name}`);
  }, [payload?.score.currentRevisionId]);

  const hasActiveScoreJob = scoreJobs.some((job) => job.status === "queued" || job.status === "processing");

  useEffect(() => {
    if (!token || !scoreId || !hasActiveScoreJob) {
      return;
    }

    let cancelled = false;
    const intervalId = window.setInterval(() => {
      if (!cancelled) {
        void refreshScoreWorkspace();
      }
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [hasActiveScoreJob, scoreId, token]);

  useEffect(() => {
    const previewRevision = payload?.score.pendingRevision ?? payload?.score.currentRevision;
    if (!token || !scoreId || !previewRevision?.scoreJson || previewRevision.musicxmlFileId) {
      setGeneratedPreviewMusicXml(null);
      return;
    }

    let cancelled = false;

    async function loadGeneratedPreview() {
      const previewPath = payload?.score.pendingRevision
        ? `/api/scores/${scoreId}/candidate/musicxml-preview`
        : `/api/scores/${scoreId}/musicxml-preview`;
      const result = await apiRequest<MusicXmlPreviewPayload>(previewPath, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (cancelled) {
        return;
      }

      setGeneratedPreviewMusicXml(result.ok ? result.data.musicXml : null);
    }

    void loadGeneratedPreview();

    return () => {
      cancelled = true;
    };
  }, [
    payload?.score.currentRevisionId,
    payload?.score.currentRevision?.musicxmlFileId,
    payload?.score.pendingRevisionId,
    payload?.score.pendingRevision?.musicxmlFileId,
    scoreId,
    token,
  ]);

  const score = payload?.score ?? null;
  const reviewRevision = score?.pendingRevision ?? score?.currentRevision;
  const musicxmlFileId = reviewRevision?.musicxmlFileId ?? null;
  const currentScoreJson = reviewRevision?.scoreJson;
  const sourcePreviewAsset = assets.find((asset) => asset.assetKind === "source_pdf" || asset.assetKind === "source_image") ?? null;
  const omrPageFiles = assets.filter((asset) => asset.assetKind === "omr_page_image").map((asset) => asset.file);
  const handleScoreEventSelect = useCallback((eventId: string) => {
    setSelectedScoreEventId(eventId);
  }, []);
  const announceCollaborationMutation = useCallback((nextPayload: ScorePayload, mutation: ScoreEditorCollaborationMutation) => {
    const baseRevisionId = payload?.score.pendingRevisionId ?? payload?.score.currentRevisionId ?? null;
    const resultRevisionId = nextPayload.score.pendingRevisionId ?? nextPayload.score.currentRevisionId;
    if (!resultRevisionId || resultRevisionId === baseRevisionId) return;
    const operation: ScoreCollaborationOperation = {
      id: mutation.operationId ?? crypto.randomUUID(),
      actorId: "current-session",
      actorName: locale === "zh-CN" ? "当前用户" : "Current user",
      role: "owner",
      commandType: mutation.commandType,
      baseRevisionId: mutation.baseRevisionId ?? baseRevisionId,
      resultRevisionId: mutation.resultRevisionId ?? resultRevisionId,
      targetEventIds: mutation.targetEventIds,
      createdAt: new Date().toISOString(),
    };
    setPendingCollaborationOperations((current) => [...current.slice(-99), operation]);
  }, [locale, payload?.score.currentRevisionId, payload?.score.pendingRevisionId]);

  useEffect(() => {
    if (!currentScoreJson) {
      setSelectedScoreEventId(null);
      return;
    }

    if (selectedScoreEventId && !currentScoreJson.measures.some((measure) => measure.events.some((event) => event.id === selectedScoreEventId))) {
      setSelectedScoreEventId(null);
    }
  }, [currentScoreJson, selectedScoreEventId]);

  if (loading) {
    return <div className="empty-state">{copy.loading}</div>;
  }

  if (error || !payload || !score) {
    return (
      <div className="surface-panel stack-lg">
        <p className="form-status error">{error ?? copy.missing}</p>
        <Link href={APP_ROUTES.scores} className="button button-secondary">
          {copy.back}
        </Link>
      </div>
    );
  }

  const revisions = payload.revisions;
  const commentTargetOptions = buildCommentTargetOptions(currentScoreJson, locale, commentCopy.scoreTarget);
  const selectedCommentTarget = commentTargetOptions.find((option) => option.id === commentTargetId) ?? commentTargetOptions[0];
  const scoreSummary = currentScoreJson
    ? {
        parts: currentScoreJson.parts.length,
        measures: currentScoreJson.metadata.measureCount,
        notes: currentScoreJson.metadata.noteCount,
        rests: currentScoreJson.metadata.restCount,
        parser: currentScoreJson.metadata.parser,
        warnings: currentScoreJson.metadata.warnings,
      }
    : null;

  async function refreshJianpu() {
    if (!token || !scoreId) {
      return;
    }

    setJianpuLoading(true);
    setJianpuError(null);
    const projectionQuery = new URLSearchParams({ pitchSystem: jianpuPitchSystem, accidentalStrategy: jianpuAccidentalStrategy });
    const jianpuResult = await apiRequest<JianpuPayload>(`/api/scores/${scoreId}/jianpu?${projectionQuery.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    setJianpuLoading(false);
    if (!jianpuResult.ok) {
      setJianpu(null);
      setJianpuError(jianpuResult.error || jianpuCopy.error);
      return;
    }
    setJianpu(jianpuResult.data.jianpu);
  }

  async function refreshAssets() {
    if (!token || !scoreId) {
      return;
    }

    setAssetsLoading(true);
    setAssetsError(null);
    const result = await apiRequest<ScoreAssetsPayload>(`/api/scores/${scoreId}/assets`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setAssetsLoading(false);

    if (!result.ok) {
      setAssets([]);
      setAssetsError(result.error || assetCopy.failed);
      return;
    }

    setAssets(result.data.assets);
  }

  async function refreshScoreSnapshot() {
    if (!token || !scoreId) {
      return;
    }

    const result = await apiRequest<ScorePayload>(`/api/scores/${scoreId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!result.ok) {
      return;
    }

    setPayload(result.data);
    if (result.data.score.currentRevision) {
      await refreshJianpu();
    } else {
      setJianpu(null);
      setJianpuError(null);
    }
  }

  async function refreshScoreJobs() {
    if (!token || !scoreId) {
      return;
    }

    setJobsLoading(true);
    setJobsError(null);
    const result = await apiRequest<ScoreJobsPayload>(`/api/scores/${scoreId}/jobs`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setJobsLoading(false);

    if (!result.ok) {
      setScoreJobs([]);
      setOmrDiagnostics([]);
      setJobsError(result.error || omrCopy.failed);
      return;
    }

    setScoreJobs(result.data.jobs);
    setOmrDiagnostics(result.data.omrDiagnostics);
    const latestCompletedRevisionId = result.data.jobs.find((job) => job.status === "completed" && job.resultRevisionId)?.resultRevisionId ?? null;
    const knownRevisionIds = new Set(payload?.revisions.map((revision) => revision.id) ?? []);
    const hasMissingOutputAssets = result.data.jobs.some((job) => job.status === "completed" && jobHasMissingOutputAssets(job, assets));
    if (latestCompletedRevisionId && !knownRevisionIds.has(latestCompletedRevisionId)) {
      await refreshScoreSnapshot();
      await refreshAssets();
    } else if (hasMissingOutputAssets) {
      await refreshAssets();
    }
  }

  async function handleScoreJobAction(job: ScoreJob, action: "cancel" | "retry") {
    if (!token || !scoreId) return;
    setJobActionId(job.id);
    setJobsError(null);
    const result = await apiRequest<ScoreExportQueuePayload>(`/api/scores/${scoreId}/jobs/${job.id}/${action}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    setJobActionId(null);
    if (!result.ok) {
      setJobsError(result.error || (locale === "zh-CN" ? "任务操作失败。" : "Could not update the job."));
      return;
    }
    setScoreJobs((current) => current.map((item) => (item.id === result.data.job.id ? result.data.job : item)));
  }

  async function refreshComments() {
    if (!token || !scoreId) {
      return;
    }

    setCommentsLoading(true);
    setCommentsError(null);
    const result = await apiRequest<ScoreCommentsPayload>(`/api/scores/${scoreId}/comments`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setCommentsLoading(false);

    if (!result.ok) {
      setComments([]);
      setCommentsError(result.error || commentCopy.failed);
      return;
    }

    setComments(result.data.comments);
  }

  async function refreshShares() {
    if (!token || !scoreId) {
      return;
    }

    setSharesLoading(true);
    const result = await apiRequest<ScoreSharesPayload>(`/api/scores/${scoreId}/share-links`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setSharesLoading(false);

    if (!result.ok) {
      setShares([]);
      setShareStatus(result.error || shareCopy.failed);
      setShareStatusKind("error");
      return;
    }

    setShares(result.data.shares);
  }

  async function refreshAssignments() {
    if (!token || !scoreId) {
      return;
    }

    setAssignmentsLoading(true);
    const result = await apiRequest<ScoreAssignmentsPayload>(`/api/scores/${scoreId}/assignments`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setAssignmentsLoading(false);

    if (!result.ok) {
      setAssignments([]);
      setAssignmentStatus(result.error || assignmentCopy.failed);
      setAssignmentStatusKind("error");
      return;
    }

    setAssignments(result.data.assignments);
  }

  async function refreshRubricTemplates() {
    if (!token) {
      return;
    }

    setRubricTemplatesLoading(true);
    const result = await apiRequest<ScoreRubricTemplatesPayload>("/api/score-rubric-templates", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setRubricTemplatesLoading(false);

    if (!result.ok) {
      setRubricTemplates([]);
      setRubricTemplateStatus(result.error || rubricCopy.templateFailed);
      setRubricTemplateStatusKind("error");
      return;
    }

    setRubricTemplates(result.data.templates);
  }

  async function refreshAssignmentSubmissions() {
    if (!token || !scoreId) {
      return;
    }

    setAssignmentSubmissionsLoading(true);
    setAssignmentSubmissionsError(null);
    const result = await apiRequest<ScoreAssignmentSubmissionsPayload>(`/api/scores/${scoreId}/assignment-submissions`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setAssignmentSubmissionsLoading(false);

    if (!result.ok) {
      setAssignmentSubmissions([]);
      setAssignmentSubmissionsError(result.error || assignmentCopy.submissionsFailed);
      return;
    }

    setAssignmentSubmissions(result.data.submissions);
    setAssignmentFeedbackDrafts((current) => {
      const next = { ...current };
      for (const submission of result.data.submissions) {
        if (next[submission.id] === undefined) {
          next[submission.id] = submission.teacherFeedback ?? "";
        }
      }
      return next;
    });
    setAssignmentGradeDrafts((current) => {
      const next = { ...current };
      for (const submission of result.data.submissions) {
        if (next[submission.id] === undefined) {
          next[submission.id] = {
            gradeScore: submission.gradeScore === null ? "" : String(submission.gradeScore),
            gradeMax: submission.gradeMax === null ? "" : String(submission.gradeMax),
          };
        }
      }
      return next;
    });
    setAssignmentRubricScoreDrafts((current) => {
      const next = { ...current };
      for (const submission of result.data.submissions) {
        if (next[submission.id] !== undefined) {
          continue;
        }

        next[submission.id] = {};
        const assignment = assignments.find((item) => item.id === submission.assignmentId);
        for (const criterion of assignment?.rubric ?? []) {
          const savedScore = submission.rubricScores.find((score) => score.criterionId === criterion.id);
          next[submission.id][criterion.id] = savedScore ? String(savedScore.score) : "";
        }
      }
      return next;
    });
  }

  async function refreshAssignmentAnalytics() {
    if (!token || !scoreId) {
      return;
    }

    setAssignmentAnalyticsLoading(true);
    setAssignmentAnalyticsError(null);
    const result = await apiRequest<ScoreAssignmentAnalyticsPayload>(`/api/scores/${scoreId}/assignment-analytics`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setAssignmentAnalyticsLoading(false);

    if (!result.ok) {
      setAssignmentAnalytics([]);
      setAssignmentAnalyticsError(result.error || analyticsCopy.failed);
      return;
    }

    setAssignmentAnalytics(result.data.analytics);
  }

  async function refreshScoreWorkspace() {
    await refreshScoreJobs();
    await refreshAssets();
    await refreshScoreSnapshot();
    await refreshComments();
    await refreshShares();
    await refreshAssignments();
    await refreshRubricTemplates();
    await refreshAssignmentSubmissions();
    await refreshAssignmentAnalytics();
  }

  async function handleCreateShare() {
    if (!token || !scoreId) {
      setShareStatus(shareCopy.failed);
      setShareStatusKind("error");
      return;
    }

    setCreatingShare(true);
    setShareStatus(null);
    setShareStatusKind(null);
    const result = await apiRequest<ScoreSharesPayload & { share: ScoreShare }>(`/api/scores/${scoreId}/share-links`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ permission: sharePermission, label: shareLabel }),
    });
    setCreatingShare(false);

    if (!result.ok) {
      setShareStatus(result.error || shareCopy.failed);
      setShareStatusKind("error");
      return;
    }

    setShares(result.data.shares);
    setShareLabel("");
    setShareStatus(shareCopy.created);
    setShareStatusKind("success");
  }

  async function handleRevokeShare(shareId: string) {
    if (!token || !scoreId) {
      setShareStatus(shareCopy.failed);
      setShareStatusKind("error");
      return;
    }

    setRevokingShareId(shareId);
    setShareStatus(null);
    setShareStatusKind(null);
    const result = await apiRequest<ScoreSharesPayload & { share: ScoreShare }>(`/api/scores/${scoreId}/share-links/${shareId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setRevokingShareId(null);

    if (!result.ok) {
      setShareStatus(result.error || shareCopy.failed);
      setShareStatusKind("error");
      return;
    }

    setShares(result.data.shares);
  }

  async function handleCopyShareLink(share: ScoreShare) {
    const link = shareUrl(share.token);
    try {
      await navigator.clipboard.writeText(link);
      setShareStatus(shareCopy.copied);
      setShareStatusKind("success");
    } catch {
      setShareStatus(link);
      setShareStatusKind("success");
    }
  }

  function updateAssignmentRubricRow(index: number, field: keyof RubricDraftRow, value: string) {
    setAssignmentRubricRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  }

  function buildRubricPayload(rows: RubricDraftRow[]) {
    return rows
      .map((row, index) => ({
        id: `criterion-${index + 1}`,
        label: row.label.trim(),
        maxScore: row.maxScore.trim() ? Number(row.maxScore) : null,
      }))
      .filter((row) => row.label.length > 0 || row.maxScore !== null)
      .map((row) => ({
        id: row.id,
        label: row.label,
        maxScore: row.maxScore ?? 0,
      }));
  }

  function rowsFromRubric(rubric: ScoreRubricCriterion[]) {
    const rows = rubric.slice(0, 8).map((criterion) => ({
      label: criterion.label,
      maxScore: String(criterion.maxScore),
    }));

    while (rows.length < 3) {
      rows.push({ label: "", maxScore: "" });
    }

    return rows;
  }

  function handleApplyRubricTemplate() {
    const template = rubricTemplates.find((item) => item.id === selectedRubricTemplateId);
    if (!template) {
      setRubricTemplateStatus(rubricCopy.templateFailed);
      setRubricTemplateStatusKind("error");
      return;
    }

    setAssignmentRubricRows(rowsFromRubric(template.rubric));
    setRubricTemplateStatus(null);
    setRubricTemplateStatusKind(null);
  }

  async function handleSaveRubricTemplate() {
    if (!token || !rubricTemplateName.trim()) {
      setRubricTemplateStatus(rubricCopy.templateFailed);
      setRubricTemplateStatusKind("error");
      return;
    }

    const rubric = buildRubricPayload(assignmentRubricRows);
    if (rubric.length === 0) {
      setRubricTemplateStatus(rubricCopy.templateFailed);
      setRubricTemplateStatusKind("error");
      return;
    }

    setSavingRubricTemplate(true);
    setRubricTemplateStatus(null);
    setRubricTemplateStatusKind(null);
    const result = await apiRequest<ScoreRubricTemplatesPayload & { template: ScoreRubricTemplate }>("/api/score-rubric-templates", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: rubricTemplateName,
        rubric,
      }),
    });
    setSavingRubricTemplate(false);

    if (!result.ok) {
      setRubricTemplateStatus(result.error || rubricCopy.templateFailed);
      setRubricTemplateStatusKind("error");
      return;
    }

    setRubricTemplates(result.data.templates);
    setRubricTemplateName("");
    setRubricTemplateStatus(rubricCopy.templateSaved);
    setRubricTemplateStatusKind("success");
  }

  async function handleDeleteRubricTemplate(templateId: string) {
    if (!token) {
      setRubricTemplateStatus(rubricCopy.templateFailed);
      setRubricTemplateStatusKind("error");
      return;
    }

    setDeletingRubricTemplateId(templateId);
    setRubricTemplateStatus(null);
    setRubricTemplateStatusKind(null);
    const result = await apiRequest<ScoreRubricTemplatesPayload>(`/api/score-rubric-templates/${templateId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setDeletingRubricTemplateId(null);

    if (!result.ok) {
      setRubricTemplateStatus(result.error || rubricCopy.templateFailed);
      setRubricTemplateStatusKind("error");
      return;
    }

    setRubricTemplates(result.data.templates);
    if (selectedRubricTemplateId === templateId) {
      setSelectedRubricTemplateId("");
    }
    setRubricTemplateStatus(rubricCopy.templateDeleted);
    setRubricTemplateStatusKind("success");
  }

  async function handleCreateAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !scoreId || assignmentTitle.trim().length === 0) {
      setAssignmentStatus(assignmentCopy.failed);
      setAssignmentStatusKind("error");
      return;
    }

    setCreatingAssignment(true);
    setAssignmentStatus(null);
    setAssignmentStatusKind(null);
    const dueAt = assignmentDueAt ? new Date(assignmentDueAt).toISOString() : null;
    const rubric = buildRubricPayload(assignmentRubricRows);
    const result = await apiRequest<ScoreAssignmentsPayload & ScoreSharesPayload & { assignment: ScoreAssignment }>(`/api/scores/${scoreId}/assignments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: assignmentTitle,
        instructions: assignmentInstructions,
        dueAt,
        rubric,
        practiceSettings: assignmentIncludePracticeSettings ? playbackPracticeSettings : null,
      }),
    });
    setCreatingAssignment(false);

    if (!result.ok) {
      setAssignmentStatus(result.error || assignmentCopy.failed);
      setAssignmentStatusKind("error");
      return;
    }

    setAssignments(result.data.assignments);
    if (result.data.shares) {
      setShares(result.data.shares);
    }
    setAssignmentTitle("");
    setAssignmentInstructions("");
    setAssignmentDueAt("");
    setAssignmentIncludePracticeSettings(true);
    setAssignmentRubricRows([
      { label: "", maxScore: "" },
      { label: "", maxScore: "" },
      { label: "", maxScore: "" },
    ]);
    setAssignmentStatus(assignmentCopy.created);
    setAssignmentStatusKind("success");
  }

  async function handleArchiveAssignment(assignmentId: string) {
    if (!token || !scoreId) {
      setAssignmentStatus(assignmentCopy.failed);
      setAssignmentStatusKind("error");
      return;
    }

    setArchivingAssignmentId(assignmentId);
    setAssignmentStatus(null);
    setAssignmentStatusKind(null);
    const result = await apiRequest<ScoreAssignmentsPayload & { assignment: ScoreAssignment }>(`/api/scores/${scoreId}/assignments/${assignmentId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setArchivingAssignmentId(null);

    if (!result.ok) {
      setAssignmentStatus(result.error || assignmentCopy.failed);
      setAssignmentStatusKind("error");
      return;
    }

    setAssignments(result.data.assignments);
  }

  async function handleCopyAssignmentLink(assignment: ScoreAssignment) {
    if (!assignment.shareToken) {
      setAssignmentStatus(assignmentCopy.linkMissing);
      setAssignmentStatusKind("error");
      return;
    }

    const link = shareUrl(assignment.shareToken);
    try {
      await navigator.clipboard.writeText(link);
      setAssignmentStatus(assignmentCopy.copied);
      setAssignmentStatusKind("success");
    } catch {
      setAssignmentStatus(link);
      setAssignmentStatusKind("success");
    }
  }

  function updateAssignmentFeedbackDraft(submissionId: string, value: string) {
    setAssignmentFeedbackDrafts((current) => ({
      ...current,
      [submissionId]: value,
    }));
  }

  function updateAssignmentGradeDraft(submissionId: string, field: "gradeScore" | "gradeMax", value: string) {
    setAssignmentGradeDrafts((current) => ({
      ...current,
      [submissionId]: {
        gradeScore: current[submissionId]?.gradeScore ?? "",
        gradeMax: current[submissionId]?.gradeMax ?? "",
        [field]: value,
      },
    }));
  }

  function updateAssignmentRubricScoreDraft(submissionId: string, criterionId: string, value: string) {
    setAssignmentRubricScoreDrafts((current) => ({
      ...current,
      [submissionId]: {
        ...(current[submissionId] ?? {}),
        [criterionId]: value,
      },
    }));
  }

  async function handleReviewAssignmentSubmission(submissionId: string) {
    if (!token || !scoreId) {
      setAssignmentReviewStatus(reviewCopy.feedbackFailed);
      setAssignmentReviewStatusKind("error");
      return;
    }

    const gradeDraft = assignmentGradeDrafts[submissionId] ?? { gradeScore: "", gradeMax: "" };
    const gradeScore = gradeDraft.gradeScore.trim() ? Number(gradeDraft.gradeScore) : null;
    const gradeMax = gradeDraft.gradeMax.trim() ? Number(gradeDraft.gradeMax) : null;
    const rubricScoreDraft = assignmentRubricScoreDrafts[submissionId] ?? {};
    const submission = assignmentSubmissions.find((item) => item.id === submissionId);
    const assignment = submission ? assignments.find((item) => item.id === submission.assignmentId) : null;
    const rubricScores = (assignment?.rubric ?? [])
      .map((criterion) => {
        const savedScore = submission?.rubricScores.find((score) => score.criterionId === criterion.id);
        const draftValue = rubricScoreDraft[criterion.id] ?? (savedScore ? String(savedScore.score) : "");
        return {
          criterionId: criterion.id,
          score: draftValue.trim() ? Number(draftValue) : null,
        };
      })
      .filter((score): score is { criterionId: string; score: number } => score.score !== null && Number.isFinite(score.score));

    setReviewingSubmissionId(submissionId);
    setAssignmentReviewStatus(null);
    setAssignmentReviewStatusKind(null);
    const result = await apiRequest<ScoreAssignmentSubmissionsPayload & { submission: ScoreAssignmentSubmission }>(
      `/api/scores/${scoreId}/assignment-submissions/${submissionId}/review`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          teacherFeedback: assignmentFeedbackDrafts[submissionId] ?? "",
          gradeScore: Number.isFinite(gradeScore) ? gradeScore : null,
          gradeMax: Number.isFinite(gradeMax) ? gradeMax : null,
          rubricScores: rubricScores.filter((score) => Number.isFinite(score.score)),
        }),
      },
    );
    setReviewingSubmissionId(null);

    if (!result.ok) {
      setAssignmentReviewStatus(result.error || reviewCopy.feedbackFailed);
      setAssignmentReviewStatusKind("error");
      return;
    }

    setAssignmentSubmissions(result.data.submissions);
    setAssignmentFeedbackDrafts((current) => {
      const next = { ...current };
      for (const submission of result.data.submissions) {
        next[submission.id] = submission.teacherFeedback ?? "";
      }
      return next;
    });
    setAssignmentGradeDrafts((current) => {
      const next = { ...current };
      for (const submission of result.data.submissions) {
        next[submission.id] = {
          gradeScore: submission.gradeScore === null ? "" : String(submission.gradeScore),
          gradeMax: submission.gradeMax === null ? "" : String(submission.gradeMax),
        };
      }
      return next;
    });
    setAssignmentRubricScoreDrafts((current) => {
      const next = { ...current };
      for (const submission of result.data.submissions) {
        next[submission.id] = {};
        for (const score of submission.rubricScores) {
          next[submission.id][score.criterionId] = String(score.score);
        }
      }
      return next;
    });
    setAssignmentReviewStatus(gradeCopy.gradeSaved);
    setAssignmentReviewStatusKind("success");
    await refreshAssignmentAnalytics();
  }

  async function handleLoadPerformancePreview(submission: ScoreAssignmentSubmission) {
    if (!token || !submission.performanceFile) {
      setPerformancePreviewErrors((current) => ({
        ...current,
        [submission.id]: assignmentCopy.performancePreviewFailed,
      }));
      return;
    }

    setPerformancePreviewLoadingId(submission.id);
    setPerformancePreviewErrors((current) => {
      const next = { ...current };
      delete next[submission.id];
      return next;
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/files/${submission.performanceFile.id}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(assignmentCopy.performancePreviewFailed);
      }

      const blob = await response.blob();
      const previewUrl = URL.createObjectURL(blob);
      const previousUrl = performancePreviewUrlRef.current[submission.id];
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }

      performancePreviewUrlRef.current[submission.id] = previewUrl;
      setPerformancePreviewUrls((current) => ({
        ...current,
        [submission.id]: previewUrl,
      }));
    } catch (error) {
      setPerformancePreviewErrors((current) => ({
        ...current,
        [submission.id]: error instanceof Error ? error.message : assignmentCopy.performancePreviewFailed,
      }));
    } finally {
      setPerformancePreviewLoadingId(null);
    }
  }

  function updatePerformancePlaybackTime(submissionId: string, timeSeconds: number) {
    setPerformancePlaybackTimes((current) => ({
      ...current,
      [submissionId]: Number.isFinite(timeSeconds) ? timeSeconds : 0,
    }));
  }

  async function handlePostPerformanceComment(submission: ScoreAssignmentSubmission) {
    const body = (performanceCommentDrafts[submission.id] ?? "").trim();
    if (!token || !scoreId || !submission.performanceFile || !body) {
      setCommentsError(assignmentCopy.performanceCommentFailed);
      return;
    }

    const timeSeconds = Math.max(0, performancePlaybackTimes[submission.id] ?? 0);
    const roundedTimeSeconds = Math.round(timeSeconds * 10) / 10;
    const timeLabel = formatDuration(roundedTimeSeconds);
    const targetLabel = `${submission.submitterName} ${assignmentCopy.performanceFile} ${timeLabel}`;

    setPostingPerformanceCommentId(submission.id);
    setCommentsError(null);
    const result = await apiRequest<ScoreCommentsPayload & { comment: ScoreComment }>(`/api/scores/${scoreId}/comments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body,
        target: {
          type: "performance_submission",
          label: targetLabel,
          submissionId: submission.id,
          assignmentId: submission.assignmentId,
          assignmentTitle: submission.assignmentTitle,
          fileId: submission.performanceFile.id,
          fileName: submission.performanceFile.originalName,
          timeSeconds: roundedTimeSeconds,
        },
      }),
    });
    setPostingPerformanceCommentId(null);

    if (!result.ok) {
      setCommentsError(result.error || assignmentCopy.performanceCommentFailed);
      return;
    }

    setComments(result.data.comments);
    setPerformanceCommentDrafts((current) => ({
      ...current,
      [submission.id]: "",
    }));
    setAssignmentReviewStatus(assignmentCopy.performanceCommentSaved);
    setAssignmentReviewStatusKind("success");
  }

  async function handlePostComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !scoreId || commentText.trim().length === 0) {
      setCommentsError(commentCopy.postFailed);
      return;
    }

    setPostingComment(true);
    setCommentsError(null);
    const result = await apiRequest<ScoreCommentsPayload & { comment: ScoreComment }>(`/api/scores/${scoreId}/comments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: commentText,
        target: selectedCommentTarget.target,
      }),
    });
    setPostingComment(false);

    if (!result.ok) {
      setCommentsError(result.error || commentCopy.postFailed);
      return;
    }

    setCommentText("");
    setComments(result.data.comments);
  }

  async function handleCommentResolution(comment: ScoreComment) {
    if (!token || !scoreId) return;
    setResolvingCommentId(comment.id);
    setCommentsError(null);
    const result = await apiRequest<ScoreCommentsPayload & { comment: ScoreComment }>(`/api/scores/${scoreId}/comments/${comment.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: !comment.resolvedAt }),
    });
    setResolvingCommentId(null);
    if (!result.ok) {
      setCommentsError(result.error || commentCopy.failed);
      return;
    }
    setComments(
      result.data.comments.map((item) =>
        item.id === result.data.comment.id ? result.data.comment : item,
      ),
    );
  }

  async function restoreRevisionSnapshot(revisionId: string, preserveHistory = false): Promise<boolean> {
    if (!token || !scoreId) {
      setRevisionStatus(copy.restoreFailed);
      setRevisionStatusKind("error");
      return false;
    }

    setRestoringRevisionId(revisionId);
    setRevisionStatus(null);
    setRevisionStatusKind(null);
    const result = await apiRequest<ScorePayload & { revision: ScoreRevision }>(`/api/scores/${scoreId}/revisions/${revisionId}/restore`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    setRestoringRevisionId(null);

    if (!result.ok) {
      setRevisionStatus(result.error || copy.restoreFailed);
      setRevisionStatusKind("error");
      return false;
    }

    if (preserveHistory) {
      skipNextHistoryResetRef.current = true;
    }
    setPayload({
      score: result.data.score,
      revisions: result.data.revisions,
    });
    setRevisionStatus(copy.restoreSuccess);
    setRevisionStatusKind("success");
    if (!result.data.score.pendingRevisionId) {
      await refreshJianpu();
    }
    return true;
  }

  async function handleRestoreRevision(revisionId: string) {
    await restoreRevisionSnapshot(revisionId);
  }

  async function handleUndoRevision() {
    const targetRevisionId = undoRevisionIds.at(-1);
    const currentSnapshotId = historyRevisionId ?? payload?.score.pendingRevisionId ?? payload?.score.currentRevisionId ?? null;
    if (!targetRevisionId || !currentSnapshotId) {
      return;
    }

    const restored = await restoreRevisionSnapshot(targetRevisionId, true);
    if (!restored) {
      return;
    }

    setUndoRevisionIds((current) => current.slice(0, -1));
    setRedoRevisionIds((current) => [...current, currentSnapshotId]);
    setHistoryRevisionId(targetRevisionId);
  }

  async function handleRedoRevision() {
    const targetRevisionId = redoRevisionIds.at(-1);
    const currentSnapshotId = historyRevisionId ?? payload?.score.pendingRevisionId ?? payload?.score.currentRevisionId ?? null;
    if (!targetRevisionId || !currentSnapshotId) {
      return;
    }

    const restored = await restoreRevisionSnapshot(targetRevisionId, true);
    if (!restored) {
      return;
    }

    setRedoRevisionIds((current) => current.slice(0, -1));
    setUndoRevisionIds((current) => [...current, currentSnapshotId]);
    setHistoryRevisionId(targetRevisionId);
  }

  async function handleTranspose(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !scoreId) {
      setTransposeStatus(transposeCopy.failed);
      setTransposeStatusKind("error");
      return;
    }

    setTransposing(true);
    setTransposeStatus(null);
    setTransposeStatusKind(null);
    setTransposeRangeDiagnostic(null);
    setTransposeRangeDiagnostics([]);
    setTransposeEngineResult(null);
    setTransposeWarnings([]);

    const rangePartIds = rangePartId === "all" ? undefined : [rangePartId];
    const rangeAssignments = buildRangeAssignments(partRangeProfileIds);
    const rangeProfilePayload =
      rangeAssignments.length > 0 ? { rangeAssignments } : rangeProfileId === "none" ? {} : { rangeProfile: { id: rangeProfileId }, rangePartIds };
    const commonTransposePayload = {
      spellingPolicy: transposeSpellingPolicy,
      pitchMode: transposePitchMode,
      ...rangeProfilePayload,
    };
    const intervalOption = TRANSPOSE_INTERVAL_OPTIONS.find((option) => option.id === transposeIntervalId) ?? TRANSPOSE_INTERVAL_OPTIONS[1];

    const result = await apiRequest<TransposePayload>(`/api/scores/${scoreId}/transpose`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        transposeMode === "instrument"
          ? {
              instrumentProfile: {
                id: instrumentProfileId,
              },
              ...commonTransposePayload,
            }
          : transposeMode === "targetKey"
          ? {
              targetKey: {
                tonic: targetTonic,
                mode: targetMode,
              },
              ...commonTransposePayload,
            }
          : transposeMode === "interval"
          ? {
              semitones: intervalOption.semitones * transposeIntervalDirection,
              diatonicSteps: intervalOption.diatonicSteps * transposeIntervalDirection,
              ...commonTransposePayload,
            }
          : { semitones: transposeSemitones, ...commonTransposePayload },
      ),
    });

    setTransposing(false);
    if (!result.ok) {
      setTransposeStatus(result.error || transposeCopy.failed);
      setTransposeStatusKind("error");
      return;
    }

    setPayload({
      score: result.data.score,
      revisions: result.data.revisions,
    });
    setTransposeRangeDiagnostic(result.data.rangeDiagnostic);
    setTransposeRangeDiagnostics(result.data.rangeDiagnostics ?? []);
    setTransposeEngineResult(result.data.transposeEngine);
    setTransposeWarnings(result.data.transposeWarnings ?? []);
    setClefRecommendations(result.data.clefRecommendations ?? []);
    setTransposeStatus(`${transposeCopy.success} (${result.data.transposeEngine === "music21" ? "music21" : "Score JSON"})`);
    setTransposeStatusKind("success");
    await refreshJianpu();
  }

  async function handleLoadTransposeSuggestions() {
    const rangeAssignments = buildRangeAssignments(partRangeProfileIds);
    if (!token || !scoreId || (rangeProfileId === "none" && rangeAssignments.length === 0)) {
      setTransposeSuggestionsError(transposeRangeCopy.suggestionFailed);
      return;
    }

    setTransposeSuggestionsLoading(true);
    setTransposeSuggestionsError(null);
    const result = await apiRequest<TransposeSuggestionsPayload>(`/api/scores/${scoreId}/transpose/suggestions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rangeProfile: rangeAssignments.length > 0 ? undefined : { id: rangeProfileId },
        rangePartIds: rangeAssignments.length > 0 || rangePartId === "all" ? undefined : [rangePartId],
        rangeAssignments: rangeAssignments.length > 0 ? rangeAssignments : undefined,
        minSemitones: -12,
        maxSemitones: 12,
        limit: 6,
      }),
    });
    setTransposeSuggestionsLoading(false);

    if (!result.ok) {
      setTransposeSuggestionsError(result.error || transposeRangeCopy.suggestionFailed);
      return;
    }

    setTransposeSuggestions(result.data.suggestions);
  }

  function applyTransposeSuggestion(suggestion: TransposeRangeSuggestion) {
    setTransposeMode("semitones");
    setTransposeSemitones(suggestion.semitones);
    setTransposeRangeDiagnostic(suggestion.rangeDiagnostic);
    setTransposeRangeDiagnostics(suggestion.rangeDiagnostics ?? []);
  }

  async function handleLoadClefRecommendations() {
    if (!token || !scoreId) {
      setClefRecommendationStatus(clefRecommendationCopy.failed);
      setClefRecommendationStatusKind("error");
      return;
    }

    setClefRecommendationsLoading(true);
    setClefRecommendationStatus(null);
    setClefRecommendationStatusKind(null);
    const result = await apiRequest<ClefRecommendationsPayload>(`/api/scores/${scoreId}/clef-recommendations`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setClefRecommendationsLoading(false);

    if (!result.ok) {
      setClefRecommendationStatus(result.error || clefRecommendationCopy.failed);
      setClefRecommendationStatusKind("error");
      return;
    }

    setClefRecommendations(result.data.recommendations);
  }

  async function handleApplyClefRecommendations() {
    if (!token || !scoreId) {
      setClefRecommendationStatus(clefRecommendationCopy.failed);
      setClefRecommendationStatusKind("error");
      return;
    }

    setApplyingClefRecommendations(true);
    setClefRecommendationStatus(null);
    setClefRecommendationStatusKind(null);
    const result = await apiRequest<ScorePayload & { recommendations: ScoreClefRecommendation[] }>(`/api/scores/${scoreId}/clef-recommendations/apply`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setApplyingClefRecommendations(false);

    if (!result.ok) {
      setClefRecommendationStatus(result.error || clefRecommendationCopy.failed);
      setClefRecommendationStatusKind("error");
      return;
    }

    setPayload({
      score: result.data.score,
      revisions: result.data.revisions,
    });
    setClefRecommendations(result.data.recommendations);
    setClefRecommendationStatus(clefRecommendationCopy.success);
    setClefRecommendationStatusKind("success");
    await refreshJianpu();
  }

  function toggleExtractPart(partId: string, checked: boolean) {
    setExtractPartIds((current) => {
      if (checked) {
        return current.includes(partId) ? current : [...current, partId];
      }

      return current.filter((currentPartId) => currentPartId !== partId);
    });
    setPartExtractStatus(null);
    setPartExtractStatusKind(null);
    setExtractedScore(null);
  }

  async function handleExtractParts(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !scoreId || extractPartIds.length === 0) {
      setPartExtractStatus(partExtractCopy.failed);
      setPartExtractStatusKind("error");
      return;
    }

    setExtractingParts(true);
    setPartExtractStatus(null);
    setPartExtractStatusKind(null);
    setExtractedScore(null);
    const result = await apiRequest<{ score: ScoreDocument }>(`/api/scores/${scoreId}/extract-parts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        partIds: extractPartIds,
        title: extractTitle,
        applyRecommendedClefs: extractApplyClefs,
      }),
    });
    setExtractingParts(false);

    if (!result.ok) {
      setPartExtractStatus(result.error || partExtractCopy.failed);
      setPartExtractStatusKind("error");
      return;
    }

    setExtractedScore(result.data.score);
    setPartExtractStatus(partExtractCopy.success);
    setPartExtractStatusKind("success");
  }

  async function handleSaveTransposePreset() {
    if (!token || !scoreId) {
      setTransposePresetStatus(transposeRangeCopy.presetFailed);
      setTransposePresetStatusKind("error");
      return;
    }

    setSavingTransposePreset(true);
    setTransposePresetStatus(null);
    setTransposePresetStatusKind(null);

    const result = await apiRequest<ScorePayload>(`/api/scores/${scoreId}/settings`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        defaultRangeProfileId: rangeProfileId === "none" ? null : rangeProfileId,
        defaultRangePartId: rangePartId === "all" ? null : rangePartId,
        defaultInstrumentProfileId: instrumentProfileId,
        defaultTransposeSpellingPolicy: transposeSpellingPolicy,
        defaultTransposePitchMode: transposePitchMode,
        partRangeProfileIds: Object.fromEntries(buildRangeAssignments(partRangeProfileIds).map((assignment) => [assignment.partId, assignment.profileId])),
      }),
    });

    setSavingTransposePreset(false);
    if (!result.ok) {
      setTransposePresetStatus(result.error || transposeRangeCopy.presetFailed);
      setTransposePresetStatusKind("error");
      return;
    }

    setPayload(result.data);
    setTransposePresetStatus(transposeRangeCopy.presetSaved);
    setTransposePresetStatusKind("success");
  }

  async function queueScoreExport(
    format: ScoreExportFormat,
    options: ScoreExportOptions,
    setLoading: (loading: boolean) => void,
    failedMessage: string,
  ) {
    if (!token || !scoreId) {
      setExportStatus(failedMessage);
      setExportStatusKind("error");
      return;
    }
    setLoading(true);
    setExportStatus(null);
    setExportStatusKind(null);
    const result = await apiRequest<ScoreExportQueuePayload>(`/api/scores/${scoreId}/exports`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ format, options }),
    });
    setLoading(false);
    if (!result.ok) {
      setExportStatus(result.error || failedMessage);
      setExportStatusKind("error");
      return;
    }
    setScoreJobs((current) => [result.data.job, ...current.filter((job) => job.id !== result.data.job.id)]);
    setExportStatus(locale === "zh-CN" ? `${format.toUpperCase()} 已加入渲染队列，完成后可在任务列表下载。` : `${format.toUpperCase()} was queued. Download it from the job list when rendering completes.`);
    setExportStatusKind("success");
  }

  function practiceExportOptions(includeAudioQuality = false): ScoreExportOptions {
    return {
      tempoBpm: playbackPracticeSettings.tempoBpm,
      countIn: playbackPracticeSettings.countInEnabled,
      metronome: playbackPracticeSettings.metronomeEnabled,
      loopEnabled: playbackPracticeSettings.loopEnabled,
      loopStartBeat: playbackPracticeSettings.loopStartBeat,
      loopEndBeat: playbackPracticeSettings.loopEndBeat,
      soloPartIds: playbackPracticeSettings.soloPartIds,
      mutedPartIds: playbackPracticeSettings.mutedPartIds,
      partVolumes: playbackPracticeSettings.partVolumes,
      ...(includeAudioQuality
        ? {
            sampleRate: audioSampleRate,
            audioChannels,
            soundFontGain,
            reverbEnabled: audioReverbEnabled,
            chorusEnabled: audioChorusEnabled,
            normalizeLoudness: audioNormalizeLoudness,
            loudnessTargetLufs: audioLoudnessTarget,
          }
        : {}),
    };
  }

  async function handleExportMidi() {
    await queueScoreExport("midi", practiceExportOptions(), setExportingMidi, exportCopy.failed);
  }

  async function handleExportJianpu() {
    if (!token || !scoreId) {
      setExportStatus(jianpuExportCopy.failed);
      setExportStatusKind("error");
      return;
    }

    setExportingJianpu(true);
    setExportStatus(null);
    setExportStatusKind(null);
    const projectionQuery = new URLSearchParams({ pitchSystem: jianpuPitchSystem, accidentalStrategy: jianpuAccidentalStrategy });
    const result = await apiRequest<ExportWithAssetsPayload>(`/api/scores/${scoreId}/export/jianpu?${projectionQuery.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setExportingJianpu(false);

    if (!result.ok) {
      setExportStatus(result.error || jianpuExportCopy.failed);
      setExportStatusKind("error");
      return;
    }

    setExportStatus(jianpuExportCopy.success);
    setExportStatusKind("success");
    if (result.data.assets) {
      setAssets(result.data.assets);
    } else {
      await refreshAssets();
    }
    await handleDownload(result.data.file.id, result.data.file.originalName);
  }

  async function handleExportScoreJson() {
    if (!token || !scoreId) {
      setExportStatus(scoreJsonExportCopy.failed);
      setExportStatusKind("error");
      return;
    }

    setExportingScoreJson(true);
    setExportStatus(null);
    setExportStatusKind(null);
    const result = await apiRequest<ExportWithAssetsPayload>(`/api/scores/${scoreId}/export/score-json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setExportingScoreJson(false);

    if (!result.ok) {
      setExportStatus(result.error || scoreJsonExportCopy.failed);
      setExportStatusKind("error");
      return;
    }

    setExportStatus(scoreJsonExportCopy.success);
    setExportStatusKind("success");
    if (result.data.assets) {
      setAssets(result.data.assets);
    } else {
      await refreshAssets();
    }
    await handleDownload(result.data.file.id, result.data.file.originalName);
  }

  async function handleExportWav() {
    await queueScoreExport("wav", practiceExportOptions(true), setExportingWav, wavExportCopy.failed);
  }

  async function handleExportMp3() {
    await queueScoreExport("mp3", { ...practiceExportOptions(true), bitrateKbps: audioBitrateKbps }, setExportingMp3, mp3ExportCopy.failed);
  }

  async function handleExportMusicXml() {
    await queueScoreExport("musicxml", {}, setExportingMusicXml, musicXmlExportCopy.failed);
  }

  async function handleExportPdf() {
    await queueScoreExport("pdf", { pageSize: renderPageSize, marginPreset: renderMarginPreset }, setExportingPdf, pdfExportCopy.failed);
  }

  async function handleExportRenderedImage(format: "svg" | "png") {
    await queueScoreExport(
      format,
      {
        imageResolutionDpi: format === "png" ? renderImageDpi : undefined,
        trimImage: trimRenderedImage,
        trimImageMargin: renderTrimMargin,
        pageSize: renderPageSize,
        marginPreset: renderMarginPreset,
      },
      format === "svg" ? setExportingSvg : setExportingPng,
      format === "svg" ? renderedImageExportCopy.failedSvg : renderedImageExportCopy.failedPng,
    );
  }

  async function handleDownload(fileId: string, fileName: string) {
    if (!token) {
      setDownloadError(copy.downloadFailed);
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/files/${fileId}/download`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      setDownloadError(payload?.error ?? copy.downloadFailed);
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  async function handleCandidateDecision(action: "accept" | "reject") {
    const pendingRevisionId = score?.pendingRevisionId;
    if (!token || !scoreId || !pendingRevisionId) {
      setCandidateActionError(
        locale === "zh-CN" ? "没有可处理的候选修订。" : "There is no candidate revision to process.",
      );
      return;
    }

    setCandidateAction(action);
    setCandidateActionError(null);
    const result = await apiRequest<ScorePayload>(`/api/scores/${scoreId}/candidate/${action}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pendingRevisionId }),
    });
    setCandidateAction(null);

    if (!result.ok) {
      setCandidateActionError(result.error || (locale === "zh-CN" ? "候选处理失败。" : "Candidate review failed."));
      return;
    }

    setPayload(result.data);
    setGeneratedPreviewMusicXml(null);
    setSelectedScoreEventId(null);
    applyScoreProjectSettings(result.data.score.settings, result.data.score.currentRevision?.scoreJson);
    if (action === "accept" && result.data.score.currentRevision) {
      await refreshJianpu();
    } else if (!result.data.score.currentRevision) {
      setJianpu(null);
      setJianpuError(null);
    }
  }

  if (score.pendingRevision) {
    return (
      <ScoreCandidateReviewWorkspace
        title={score.title}
        scoreId={score.id}
        revision={score.pendingRevision}
        sourceFile={sourcePreviewAsset?.file ?? null}
        pageFiles={omrPageFiles}
        token={token}
        locale={locale}
        generatedMusicXml={generatedPreviewMusicXml}
        selectedEventId={selectedScoreEventId}
        onEventSelect={handleScoreEventSelect}
        onAccept={() => void handleCandidateDecision("accept")}
        onReject={() => void handleCandidateDecision("reject")}
        submittingAction={candidateAction}
        actionError={candidateActionError}
        onCandidateUpdated={refreshScoreSnapshot}
        onUndo={() => void handleUndoRevision()}
        onRedo={() => void handleRedoRevision()}
        canUndo={undoRevisionIds.length > 0}
        canRedo={redoRevisionIds.length > 0}
        restoring={Boolean(restoringRevisionId)}
        revisionStatus={revisionStatus}
        revisionStatusKind={revisionStatusKind}
      />
    );
  }

  return (
    <div className="page-stack">
      <div className="page-banner split">
        <div className="stack-md">
          <p className="eyebrow">{copy.status}: {score.status}</p>
          <h1 className="page-title">{score.title}</h1>
          <p className="body-copy large">
            {copy.current}: {score.currentRevision?.revisionNumber ?? 0} | {formatLocal(score.updatedAt, locale)}
          </p>
        </div>
        <div className="page-banner-actions">
          <Link href={APP_ROUTES.scores} className="button button-secondary">
            {copy.back}
          </Link>
          <button type="button" className="button button-primary" onClick={() => void handleExportMusicXml()} disabled={exportingMusicXml || !currentScoreJson}>
            {exportingMusicXml ? musicXmlExportCopy.exporting : musicXmlExportCopy.button}
          </button>
          <button type="button" className="button button-secondary" onClick={() => void handleExportScoreJson()} disabled={exportingScoreJson || !currentScoreJson}>
            {exportingScoreJson ? scoreJsonExportCopy.exporting : scoreJsonExportCopy.button}
          </button>
          <button type="button" className="button button-primary" onClick={() => void handleExportJianpu()} disabled={exportingJianpu || !currentScoreJson}>
            {exportingJianpu ? jianpuExportCopy.exporting : jianpuExportCopy.button}
          </button>
          <button type="button" className="button button-primary" onClick={() => void handleExportPdf()} disabled={exportingPdf || !currentScoreJson}>
            {exportingPdf ? pdfExportCopy.exporting : pdfExportCopy.button}
          </button>
          <button type="button" className="button button-secondary" onClick={() => void handleExportRenderedImage("svg")} disabled={exportingSvg || !currentScoreJson}>
            {exportingSvg ? renderedImageExportCopy.exportingSvg : renderedImageExportCopy.svg}
          </button>
          <button type="button" className="button button-secondary" onClick={() => void handleExportRenderedImage("png")} disabled={exportingPng || !currentScoreJson}>
            {exportingPng ? renderedImageExportCopy.exportingPng : renderedImageExportCopy.png}
          </button>
          <button type="button" className="button button-primary" onClick={() => void handleExportMidi()} disabled={exportingMidi}>
            {exportingMidi ? exportCopy.exporting : exportCopy.midi}
          </button>
          <button type="button" className="button button-primary" onClick={() => void handleExportWav()} disabled={exportingWav || !currentScoreJson}>
            {exportingWav ? wavExportCopy.exporting : wavExportCopy.button}
          </button>
          <button type="button" className="button button-primary" onClick={() => void handleExportMp3()} disabled={exportingMp3 || !currentScoreJson}>
            {exportingMp3 ? mp3ExportCopy.exporting : mp3ExportCopy.button}
          </button>
        </div>
      </div>

      {downloadError ? <p className="form-status error">{downloadError}</p> : null}
      {exportStatus && exportStatusKind ? <p className={`form-status ${exportStatusKind}`}>{exportStatus}</p> : null}

      {currentScoreJson && currentScoreJson.parts.length > 0 ? (
        <section className="surface-panel stack-lg">
          <div className="stack-sm">
            <p className="eyebrow">{partExtractCopy.eyebrow}</p>
            <h2 className="card-title">{partExtractCopy.title}</h2>
            <p className="body-copy">{partExtractCopy.body}</p>
          </div>
          <form className="form-grid" onSubmit={handleExtractParts}>
            <label className="field-group wide">
              <span>{partExtractCopy.titleLabel}</span>
              <input className="field-control" type="text" maxLength={160} value={extractTitle} onChange={(event) => setExtractTitle(event.target.value)} />
            </label>
            <div className="field-group wide">
              <span>{partExtractCopy.parts}</span>
              <div className="button-row">
                {currentScoreJson.parts.map((part) => (
                  <label key={part.id} className="field-group">
                    <span>{part.name}</span>
                    <input type="checkbox" checked={extractPartIds.includes(part.id)} onChange={(event) => toggleExtractPart(part.id, event.target.checked)} />
                  </label>
                ))}
              </div>
            </div>
            <label className="field-group wide">
              <span>{partExtractCopy.applyClefs}</span>
              <input type="checkbox" checked={extractApplyClefs} onChange={(event) => setExtractApplyClefs(event.target.checked)} />
            </label>
            <div className="button-row wide">
              <button type="submit" className="button button-primary" disabled={extractingParts || extractPartIds.length === 0}>
                {extractingParts ? partExtractCopy.working : partExtractCopy.submit}
              </button>
              {extractedScore ? (
                <Link href={`${APP_ROUTES.scores}/${extractedScore.id}`} className="button button-secondary">
                  {partExtractCopy.open}
                </Link>
              ) : null}
            </div>
          </form>
          {partExtractStatus && partExtractStatusKind ? <p className={`form-status ${partExtractStatusKind}`}>{partExtractStatus}</p> : null}
        </section>
      ) : null}

      <section id="print-export-settings" className="surface-panel stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">{renderedExportOptionsCopy.eyebrow}</p>
          <h2 className="card-title">{renderedExportOptionsCopy.title}</h2>
          <p className="body-copy">{renderedExportOptionsCopy.body}</p>
        </div>
        <div className="form-grid">
          <label className="field-group">
            <span className="field-label">{renderedExportOptionsCopy.pageSize}</span>
            <select className="field-select" value={renderPageSize} onChange={(event) => setRenderPageSize(event.target.value as "default" | "a4" | "letter")}>
              <option value="default">{renderedExportOptionsCopy.defaultOption}</option>
              <option value="a4">{renderedExportOptionsCopy.a4}</option>
              <option value="letter">{renderedExportOptionsCopy.letter}</option>
            </select>
          </label>
          <label className="field-group">
            <span className="field-label">{renderedExportOptionsCopy.margins}</span>
            <select
              className="field-select"
              value={renderMarginPreset}
              onChange={(event) => setRenderMarginPreset(event.target.value as "default" | "narrow" | "normal" | "wide")}
            >
              <option value="default">{renderedExportOptionsCopy.defaultOption}</option>
              <option value="narrow">{renderedExportOptionsCopy.narrow}</option>
              <option value="normal">{renderedExportOptionsCopy.normal}</option>
              <option value="wide">{renderedExportOptionsCopy.wide}</option>
            </select>
          </label>
          <label className="field-group">
            <span className="field-label">{renderedExportOptionsCopy.dpi}</span>
            <input
              className="field-control"
              type="number"
              min={72}
              max={1200}
              step={1}
              value={renderImageDpi}
              onChange={(event) => setRenderImageDpi(Math.min(1200, Math.max(72, Number(event.target.value) || 300)))}
            />
          </label>
          <label className="field-group">
            <span className="field-label">{renderedExportOptionsCopy.trim}</span>
            <input type="checkbox" checked={trimRenderedImage} onChange={(event) => setTrimRenderedImage(event.target.checked)} />
          </label>
          <label className="field-group">
            <span className="field-label">{renderedExportOptionsCopy.trimMargin}</span>
            <input
              className="field-control"
              type="number"
              min={0}
              max={2000}
              step={1}
              value={renderTrimMargin}
              disabled={!trimRenderedImage}
              onChange={(event) => setRenderTrimMargin(Math.min(2000, Math.max(0, Number(event.target.value) || 0)))}
            />
          </label>
        </div>
        <p className="helper-copy">{renderedExportOptionsCopy.helper}</p>
      </section>

      <section id="audio-export-settings" className="surface-panel stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">{audioExportOptionsCopy.eyebrow}</p>
          <h2 className="card-title">{audioExportOptionsCopy.title}</h2>
          <p className="body-copy">{audioExportOptionsCopy.body}</p>
        </div>
        <div className="form-grid">
          <label className="field-group">
            <span className="field-label">{audioExportOptionsCopy.sampleRate}</span>
            <select className="field-select" value={audioSampleRate} onChange={(event) => setAudioSampleRate(Number(event.target.value) as 44100 | 48000 | 96000)}>
              <option value={44100}>44.1 kHz</option>
              <option value={48000}>48 kHz</option>
              <option value={96000}>96 kHz</option>
            </select>
          </label>
          <label className="field-group">
            <span className="field-label">{audioExportOptionsCopy.channels}</span>
            <select className="field-select" value={audioChannels} onChange={(event) => setAudioChannels(Number(event.target.value) as 1 | 2)}>
              <option value={2}>{audioExportOptionsCopy.stereo}</option>
              <option value={1}>{audioExportOptionsCopy.mono}</option>
            </select>
          </label>
          <label className="field-group">
            <span className="field-label">{audioExportOptionsCopy.gain}: {soundFontGain.toFixed(2)}</span>
            <input className="field-control" type="range" min={0.05} max={2} step={0.05} value={soundFontGain} onChange={(event) => setSoundFontGain(Number(event.target.value))} />
          </label>
          <label className="field-group">
            <span className="field-label">{audioExportOptionsCopy.bitrate}</span>
            <select className="field-select" value={audioBitrateKbps} onChange={(event) => setAudioBitrateKbps(Number(event.target.value) as 128 | 192 | 256 | 320)}>
              {[128, 192, 256, 320].map((bitrate) => <option key={bitrate} value={bitrate}>{bitrate} kbps</option>)}
            </select>
          </label>
          <label className="field-group">
            <span className="field-label">{audioExportOptionsCopy.reverb}</span>
            <input type="checkbox" checked={audioReverbEnabled} onChange={(event) => setAudioReverbEnabled(event.target.checked)} />
          </label>
          <label className="field-group">
            <span className="field-label">{audioExportOptionsCopy.chorus}</span>
            <input type="checkbox" checked={audioChorusEnabled} onChange={(event) => setAudioChorusEnabled(event.target.checked)} />
          </label>
          <label className="field-group">
            <span className="field-label">{audioExportOptionsCopy.normalize}</span>
            <input type="checkbox" checked={audioNormalizeLoudness} onChange={(event) => setAudioNormalizeLoudness(event.target.checked)} />
          </label>
          <label className="field-group">
            <span className="field-label">{audioExportOptionsCopy.loudness}</span>
            <input className="field-control" type="number" min={-24} max={-9} step={1} value={audioLoudnessTarget} disabled={!audioNormalizeLoudness} onChange={(event) => setAudioLoudnessTarget(Math.min(-9, Math.max(-24, Number(event.target.value) || -16)))} />
          </label>
        </div>
      </section>

      <section id="score-sharing" className="surface-panel stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">{shareCopy.eyebrow}</p>
          <h2 className="card-title">{shareCopy.title}</h2>
          <p className="body-copy">{shareCopy.body}</p>
        </div>
        <div className="button-row">
          <label className="field-group compact">
            <span>{shareCopy.label}</span>
            <input className="field-control" type="text" maxLength={80} value={shareLabel} onChange={(event) => setShareLabel(event.target.value)} placeholder={shareCopy.labelPlaceholder} />
          </label>
          <label className="field-group compact">
            <span>{shareCopy.permission}</span>
            <select className="field-select" value={sharePermission} onChange={(event) => setSharePermission(event.target.value as ScoreShare["permission"])}>
              <option value="view">{shareCopy.view}</option>
              <option value="comment">{shareCopy.comment}</option>
              <option value="edit">{shareCopy.edit}</option>
            </select>
          </label>
          <button type="button" className="button button-primary" onClick={() => void handleCreateShare()} disabled={creatingShare}>
            {creatingShare ? shareCopy.creating : shareCopy.create}
          </button>
        </div>
        {shareStatus && shareStatusKind ? <p className={`form-status ${shareStatusKind}`}>{shareStatus}</p> : null}
        {sharesLoading ? <div className="empty-state">{shareCopy.loading}</div> : null}
        {!sharesLoading && shares.length === 0 ? <div className="empty-state">{shareCopy.empty}</div> : null}
        {shares.length > 0 ? (
          <div className="list-grid">
            {shares.map((share) => {
              const isRevoked = Boolean(share.revokedAt);
              return (
                <div key={share.id} className="list-item">
                  <div className="list-item-content">
                    <p className="item-title">
                      {shareUrl(share.token)}{" "}
                      <span className={`status-chip ${isRevoked ? "tone-amber" : "tone-cyan"}`}>
                        {isRevoked ? shareCopy.revoked : shareCopy.active}
                      </span>
                    </p>
                    <p className="item-meta">
                      {share.label ? `${share.label} | ` : ""}{shareCopy.permission}: {shareCopy[share.permission]} | {shareCopy.expires}: {share.expiresAt ? formatLocal(share.expiresAt, locale) : shareCopy.never} | {formatLocal(share.createdAt, locale)}
                    </p>
                  </div>
                  <div className="button-row">
                    <button type="button" className="button button-secondary button-ghost" onClick={() => void handleCopyShareLink(share)} disabled={isRevoked}>
                      {shareCopy.copy}
                    </button>
                    <button
                      type="button"
                      className="button button-secondary button-ghost"
                      onClick={() => void handleRevokeShare(share.id)}
                      disabled={isRevoked || revokingShareId === share.id}
                    >
                      {revokingShareId === share.id ? shareCopy.revoking : shareCopy.revoke}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      <section id="teaching-workflow" className="surface-panel stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">{assignmentCopy.eyebrow}</p>
          <h2 className="card-title">{assignmentCopy.title}</h2>
          <p className="body-copy">{assignmentCopy.body}</p>
        </div>
        <form className="stack-sm" onSubmit={handleCreateAssignment}>
          <div className="form-grid">
            <label className="field-group wide">
              <span>{assignmentCopy.titleLabel}</span>
              <input
                className="field-control"
                type="text"
                maxLength={120}
                placeholder={assignmentCopy.titlePlaceholder}
                value={assignmentTitle}
                onChange={(event) => setAssignmentTitle(event.target.value)}
              />
            </label>
            <label className="field-group">
              <span>{assignmentCopy.dueAt}</span>
              <input
                className="field-control"
                type="datetime-local"
                value={assignmentDueAt}
                onChange={(event) => setAssignmentDueAt(event.target.value)}
              />
            </label>
          </div>
          <label className="field-group wide">
            <span>{assignmentCopy.instructions}</span>
            <textarea
              className="field-control"
              rows={4}
              maxLength={2000}
              placeholder={assignmentCopy.instructionsPlaceholder}
              value={assignmentInstructions}
              onChange={(event) => setAssignmentInstructions(event.target.value)}
            />
          </label>
          <label className="practice-toggle">
            <input
              type="checkbox"
              checked={assignmentIncludePracticeSettings}
              onChange={(event) => setAssignmentIncludePracticeSettings(event.target.checked)}
            />
            <span>Attach current playback practice settings</span>
          </label>
          <div className="stack-sm">
            <p className="item-title">{rubricCopy.rubric}</p>
            <div className="form-grid">
              <label className="field-group">
                <span>{rubricCopy.templates}</span>
                <select className="field-select" value={selectedRubricTemplateId} onChange={(event) => setSelectedRubricTemplateId(event.target.value)}>
                  <option value="">{rubricTemplatesLoading ? rubricCopy.templatesLoading : rubricCopy.templatesEmpty}</option>
                  {rubricTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="field-group">
                <span>{rubricCopy.templates}</span>
                <div className="button-row">
                  <button type="button" className="button button-secondary button-ghost" onClick={handleApplyRubricTemplate} disabled={!selectedRubricTemplateId}>
                    {rubricCopy.applyTemplate}
                  </button>
                  {selectedRubricTemplateId ? (
                    <button
                      type="button"
                      className="button button-secondary button-ghost"
                      onClick={() => void handleDeleteRubricTemplate(selectedRubricTemplateId)}
                      disabled={deletingRubricTemplateId === selectedRubricTemplateId}
                    >
                      {deletingRubricTemplateId === selectedRubricTemplateId ? rubricCopy.deletingTemplate : rubricCopy.deleteTemplate}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="form-grid">
              <label className="field-group">
                <span>{rubricCopy.templateName}</span>
                <input
                  className="field-control"
                  type="text"
                  maxLength={120}
                  placeholder={rubricCopy.templatePlaceholder}
                  value={rubricTemplateName}
                  onChange={(event) => setRubricTemplateName(event.target.value)}
                />
              </label>
              <div className="field-group">
                <span>{rubricCopy.saveTemplate}</span>
                <button type="button" className="button button-secondary button-ghost" onClick={() => void handleSaveRubricTemplate()} disabled={savingRubricTemplate}>
                  {savingRubricTemplate ? rubricCopy.savingTemplate : rubricCopy.saveTemplate}
                </button>
              </div>
            </div>
            {rubricTemplateStatus && rubricTemplateStatusKind ? <p className={`form-status ${rubricTemplateStatusKind}`}>{rubricTemplateStatus}</p> : null}
            {assignmentRubricRows.map((row, index) => (
              <div className="form-grid" key={`rubric-row-${index + 1}`}>
                <label className="field-group">
                  <span>{rubricCopy.criterion}</span>
                  <input
                    className="field-control"
                    type="text"
                    maxLength={120}
                    placeholder={rubricCopy.criterionPlaceholder}
                    value={row.label}
                    onChange={(event) => updateAssignmentRubricRow(index, "label", event.target.value)}
                  />
                </label>
                <label className="field-group">
                  <span>{rubricCopy.maxScore}</span>
                  <input
                    className="field-control"
                    type="number"
                    min={1}
                    max={1000}
                    placeholder={rubricCopy.maxPlaceholder}
                    value={row.maxScore}
                    onChange={(event) => updateAssignmentRubricRow(index, "maxScore", event.target.value)}
                  />
                </label>
              </div>
            ))}
          </div>
          <div className="button-row">
            <button type="submit" className="button button-primary" disabled={creatingAssignment || assignmentTitle.trim().length === 0}>
              {creatingAssignment ? assignmentCopy.creating : assignmentCopy.create}
            </button>
          </div>
        </form>
        {assignmentStatus && assignmentStatusKind ? <p className={`form-status ${assignmentStatusKind}`}>{assignmentStatus}</p> : null}
        {assignmentsLoading ? <div className="empty-state">{assignmentCopy.loading}</div> : null}
        {!assignmentsLoading && assignments.length === 0 ? <div className="empty-state">{assignmentCopy.empty}</div> : null}
        {assignments.length > 0 ? (
          <div className="list-grid">
            {assignments.map((assignment) => {
              const isArchived = assignment.status === "archived";
              return (
                <div key={assignment.id} className="list-item">
                  <div className="list-item-content">
                    <p className="item-title">
                      {assignment.title}{" "}
                      <span className={`status-chip ${isArchived ? "tone-amber" : "tone-cyan"}`}>
                        {isArchived ? assignmentCopy.archived : assignmentCopy.open}
                      </span>
                    </p>
                    <p className="item-meta">
                      {assignmentCopy.dueAt}: {assignment.dueAt ? formatLocal(assignment.dueAt, locale) : assignmentCopy.noDue} | {assignmentCopy.revision}:{" "}
                      {assignment.revisionId ? assignment.revisionId.slice(0, 8) : "-"} | {formatLocal(assignment.createdAt, locale)}
                    </p>
                    {assignment.instructions ? <p className="body-copy">{assignment.instructions}</p> : null}
                    {assignment.rubric.length > 0 ? (
                      <p className="item-meta">
                        {rubricCopy.rubric}: {assignment.rubric.map((criterion) => `${criterion.label} / ${criterion.maxScore}`).join(" | ")}
                      </p>
                    ) : null}
                    {assignment.practiceSettings ? (
                      <p className="item-meta">
                        Practice preset: {formatAssignmentPracticeSettings(assignment.practiceSettings, currentScoreJson)}
                      </p>
                    ) : null}
                  </div>
                  <div className="button-row">
                    {assignment.practiceSettings ? (
                      <button
                        type="button"
                        className="button button-secondary button-ghost"
                        onClick={() => setPlaybackPracticeSettings(assignment.practiceSettings!)}
                      >
                        Apply practice preset
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="button button-secondary button-ghost"
                      onClick={() => void handleCopyAssignmentLink(assignment)}
                      disabled={!assignment.shareToken}
                    >
                      {assignmentCopy.copy}
                    </button>
                    <button
                      type="button"
                      className="button button-secondary button-ghost"
                      onClick={() => void handleArchiveAssignment(assignment.id)}
                      disabled={isArchived || archivingAssignmentId === assignment.id}
                    >
                      {archivingAssignmentId === assignment.id ? assignmentCopy.archiving : assignmentCopy.archive}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        <div className="stack-sm">
          <h3 className="card-title">{analyticsCopy.title}</h3>
          {assignmentAnalyticsLoading ? <div className="empty-state">{analyticsCopy.loading}</div> : null}
          {assignmentAnalyticsError ? <p className="form-status error">{assignmentAnalyticsError}</p> : null}
          {!assignmentAnalyticsLoading && !assignmentAnalyticsError && assignmentAnalytics.length === 0 ? (
            <div className="empty-state">{analyticsCopy.empty}</div>
          ) : null}
          {assignmentAnalytics.length > 0 ? (
            <div className="list-grid">
              {assignmentAnalytics.map((item) => (
                <div key={item.assignmentId} className="list-item">
                  <div className="list-item-content">
                    <p className="item-title">{item.assignmentTitle}</p>
                    <p className="item-meta">
                      {analyticsCopy.submissions}: {item.submissionCount} | {analyticsCopy.reviewed}: {item.reviewedCount} | {analyticsCopy.graded}:{" "}
                      {item.gradedCount} | {analyticsCopy.average}: {item.averageGradePercent === null ? "-" : `${item.averageGradePercent}%`}
                    </p>
                    {item.rubricAverages.length > 0 ? (
                      <p className="item-meta">
                        {analyticsCopy.rubricAverage}:{" "}
                        {item.rubricAverages
                          .map((criterion) => `${criterion.label} ${criterion.averageScore === null ? "-" : `${criterion.averageScore}/${criterion.maxScore}`}`)
                          .join(" | ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <h3 className="card-title">{assignmentCopy.submissions}</h3>
          {assignmentSubmissionsLoading ? <div className="empty-state">{assignmentCopy.submissionsLoading}</div> : null}
          {assignmentSubmissionsError ? <p className="form-status error">{assignmentSubmissionsError}</p> : null}
          {assignmentReviewStatus && assignmentReviewStatusKind ? <p className={`form-status ${assignmentReviewStatusKind}`}>{assignmentReviewStatus}</p> : null}
          {!assignmentSubmissionsLoading && !assignmentSubmissionsError && assignmentSubmissions.length === 0 ? (
            <div className="empty-state">{assignmentCopy.submissionsEmpty}</div>
          ) : null}
          {assignmentSubmissions.length > 0 ? (
            <div className="list-grid">
              {assignmentSubmissions.map((submission) => (
                <div key={submission.id} className="list-item">
                  <div className="list-item-content">
                    {(() => {
                      const assignmentForSubmission = assignments.find((assignment) => assignment.id === submission.assignmentId);
                      return assignmentForSubmission?.rubric.length ? (
                        <div className="stack-sm">
                          <p className="item-title">{rubricCopy.rubric}</p>
                          {assignmentForSubmission.rubric.map((criterion) => {
                            const savedScore = submission.rubricScores.find((score) => score.criterionId === criterion.id);
                            const draftValue = assignmentRubricScoreDrafts[submission.id]?.[criterion.id] ?? (savedScore ? String(savedScore.score) : "");
                            return (
                              <label className="field-group" key={`${submission.id}-${criterion.id}`}>
                                <span>
                                  {criterion.label} / {criterion.maxScore}
                                </span>
                                <input
                                  className="field-control"
                                  type="number"
                                  min={0}
                                  max={criterion.maxScore}
                                  value={draftValue}
                                  onChange={(event) => updateAssignmentRubricScoreDraft(submission.id, criterion.id, event.target.value)}
                                />
                              </label>
                            );
                          })}
                        </div>
                      ) : null;
                    })()}
                    <p className="item-title">
                      {submission.submitterName} <span className="status-chip tone-cyan">{submission.status}</span>
                    </p>
                    <p className="item-meta">
                      {submission.assignmentTitle ?? submission.assignmentId.slice(0, 8)} | {assignmentCopy.submittedAt}:{" "}
                      {formatLocal(submission.submittedAt, locale)}
                    </p>
                    <p className="item-meta">
                      {assignmentCopy.practiceMinutes}: {submission.practiceMinutes ?? "-"} | {assignmentCopy.contact}:{" "}
                      {submission.submitterContact ?? "-"}
                    </p>
                    {submission.practiceSettings ? (
                      <p className="item-meta">
                        Submitted practice: {formatAssignmentPracticeSettings(submission.practiceSettings, currentScoreJson)}
                      </p>
                    ) : null}
                    {submission.performanceAnalysis ? (
                      <details className="list-item">
                        <summary className="item-title">
                          {locale === "zh-CN" ? "浏览器逐音分析" : "Browser per-note analysis"} · {submission.performanceAnalysis.completeness.detected}/{submission.performanceAnalysis.completeness.expected}
                        </summary>
                        <p className="item-meta">
                          {submission.performanceAnalysis.algorithmVersion} · {locale === "zh-CN" ? "对齐" : "alignment"}: {submission.performanceAnalysis.alignment.source} · {submission.performanceAnalysis.alignment.timeScale.toFixed(3)}x
                        </p>
                        <p className="item-meta">
                          {locale === "zh-CN" ? "乐谱修订" : "Score revision"}: {submission.performanceAnalysis.scoreRevisionId?.slice(0, 12) ?? (locale === "zh-CN" ? "未记录" : "not recorded")}
                        </p>
                        <div className="metric-grid">
                          {submission.performanceAnalysis.measures.map((measure) => (
                            <div className="metric-card" key={measure.measureId}>
                              <p className="metric-label">{locale === "zh-CN" ? "小节" : "Measure"} {measure.measureNumber}</p>
                              <p className="item-meta">{locale === "zh-CN" ? "检测" : "Detected"}: {measure.detectedCount}/{measure.eventCount}</p>
                              <p className="item-meta">Pitch: {measure.pitchAttentionCount} · Rhythm: {measure.rhythmAttentionCount} · Polyphonic: {measure.polyphonicUnscoredCount}</p>
                            </div>
                          ))}
                        </div>
                        <p className="helper-copy">{locale === "zh-CN" ? "这是浏览器算法的辅助结果，教师应结合原始录音复核。" : "This browser analysis is assistive; review it against the original recording."}</p>
                      </details>
                    ) : null}
                    {submission.note ? <p className="body-copy">{submission.note}</p> : null}
                    <p className="item-meta">
                      {assignmentCopy.recording}:{" "}
                      {submission.recordingUrl ? (
                        <a href={submission.recordingUrl} target="_blank" rel="noreferrer">
                          {submission.recordingUrl}
                        </a>
                      ) : (
                        assignmentCopy.noRecording
                      )}
                    </p>
                    {submission.performanceFile ? (
                      <div className="stack-sm">
                        <div className="button-row">
                          <span className="item-meta">
                            {assignmentCopy.performanceFile}: {submission.performanceFile.originalName} | {formatSize(submission.performanceFile.sizeBytes)}
                          </span>
                          <button
                            type="button"
                            className="button button-secondary button-ghost"
                            onClick={() => void handleLoadPerformancePreview(submission)}
                            disabled={performancePreviewLoadingId === submission.id}
                          >
                            {performancePreviewLoadingId === submission.id ? assignmentCopy.loadingPerformancePreview : assignmentCopy.loadPerformancePreview}
                          </button>
                          <button
                            type="button"
                            className="button button-secondary button-ghost"
                            onClick={() => void handleDownload(submission.performanceFile!.id, submission.performanceFile!.originalName)}
                          >
                            {assignmentCopy.downloadPerformanceFile}
                          </button>
                        </div>
                        {performancePreviewErrors[submission.id] ? (
                          <p className="form-status error">{performancePreviewErrors[submission.id]}</p>
                        ) : null}
                        {performancePreviewUrls[submission.id] ? (
                          <div className="stack-sm">
                            {submission.performanceFile.mimeType.startsWith("video/") ? (
                              <video
                                className="field-control"
                                controls
                                src={performancePreviewUrls[submission.id]}
                                onTimeUpdate={(event) => updatePerformancePlaybackTime(submission.id, event.currentTarget.currentTime)}
                              />
                            ) : (
                              <AudioWaveformPlayer
                                src={performancePreviewUrls[submission.id]}
                                locale={locale}
                                onTimeUpdate={(seconds) => updatePerformancePlaybackTime(submission.id, seconds)}
                              />
                            )}
                            <p className="item-meta">
                              {assignmentCopy.performanceTime}: {formatDuration(performancePlaybackTimes[submission.id] ?? 0)}
                            </p>
                            <label className="field-group wide">
                              <span>{assignmentCopy.performanceComment}</span>
                              <textarea
                                className="field-control"
                                rows={3}
                                maxLength={2000}
                                placeholder={assignmentCopy.performanceCommentPlaceholder}
                                value={performanceCommentDrafts[submission.id] ?? ""}
                                onChange={(event) =>
                                  setPerformanceCommentDrafts((current) => ({
                                    ...current,
                                    [submission.id]: event.target.value,
                                  }))
                                }
                              />
                            </label>
                            <div className="button-row">
                              <button
                                type="button"
                                className="button button-secondary button-ghost"
                                onClick={() => void handlePostPerformanceComment(submission)}
                                disabled={postingPerformanceCommentId === submission.id || !(performanceCommentDrafts[submission.id] ?? "").trim()}
                              >
                                {postingPerformanceCommentId === submission.id
                                  ? assignmentCopy.postingPerformanceComment
                                  : assignmentCopy.postPerformanceComment}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {submission.teacherFeedback ? (
                      <p className="body-copy">
                        {reviewCopy.feedback}: {submission.teacherFeedback}
                      </p>
                    ) : null}
                    {submission.gradeScore !== null || submission.gradeMax !== null ? (
                      <p className="item-meta">
                        {gradeCopy.grade}: {submission.gradeScore ?? "-"} / {submission.gradeMax ?? "-"}
                      </p>
                    ) : null}
                    <div className="form-grid">
                      <label className="field-group">
                        <span>{gradeCopy.score}</span>
                        <input
                          className="field-control"
                          type="number"
                          min={0}
                          max={1000}
                          placeholder={gradeCopy.scorePlaceholder}
                          value={assignmentGradeDrafts[submission.id]?.gradeScore ?? (submission.gradeScore === null ? "" : String(submission.gradeScore))}
                          onChange={(event) => updateAssignmentGradeDraft(submission.id, "gradeScore", event.target.value)}
                        />
                      </label>
                      <label className="field-group">
                        <span>{gradeCopy.max}</span>
                        <input
                          className="field-control"
                          type="number"
                          min={1}
                          max={1000}
                          placeholder={gradeCopy.maxPlaceholder}
                          value={assignmentGradeDrafts[submission.id]?.gradeMax ?? (submission.gradeMax === null ? "" : String(submission.gradeMax))}
                          onChange={(event) => updateAssignmentGradeDraft(submission.id, "gradeMax", event.target.value)}
                        />
                      </label>
                    </div>
                    <label className="field-group wide">
                      <span>{reviewCopy.feedback}</span>
                      <textarea
                        className="field-control"
                        rows={3}
                        maxLength={2000}
                        placeholder={reviewCopy.feedbackPlaceholder}
                        value={assignmentFeedbackDrafts[submission.id] ?? submission.teacherFeedback ?? ""}
                        onChange={(event) => updateAssignmentFeedbackDraft(submission.id, event.target.value)}
                      />
                    </label>
                    <div className="button-row">
                      <button
                        type="button"
                        className="button button-secondary button-ghost"
                        onClick={() => void handleReviewAssignmentSubmission(submission.id)}
                        disabled={reviewingSubmissionId === submission.id}
                      >
                        {reviewingSubmissionId === submission.id ? reviewCopy.savingFeedback : reviewCopy.saveFeedback}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section id="score-jobs" className="surface-panel stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">{omrCopy.eyebrow}</p>
          <h2 className="card-title">{omrCopy.title}</h2>
          <p className="body-copy">{omrCopy.body}</p>
        </div>
        <div className="button-row">
          <button type="button" className="button button-secondary" onClick={() => void refreshScoreJobs()} disabled={jobsLoading}>
            {jobsLoading ? omrCopy.loading : omrCopy.refresh}
          </button>
        </div>
        {hasActiveScoreJob ? (
          <p className="helper-copy">
            {locale === "zh-CN" ? "后台任务正在运行，页面会自动刷新。" : "A score job is running; this page will refresh automatically."}
          </p>
        ) : null}
        {jobsError ? <p className="form-status error">{jobsError}</p> : null}
        {!jobsLoading && !jobsError && scoreJobs.length === 0 && omrDiagnostics.length === 0 ? <div className="empty-state">{omrCopy.empty}</div> : null}
        {scoreJobs.length > 0 ? (
          <div className="list-grid">
            {scoreJobs.map((job) => {
              const outputAssets = assetsForJobOutput(job, assets);
              return (
                <div key={job.id} className="list-item">
                  <div className="list-item-content">
                    <p className="item-title">
                      {formatScoreJobLabel(job)} <span className={`status-chip ${toneForJobStatus(job.status)}`}>{job.status}</span>
                    </p>
                    <p className="item-meta">
                      {formatLocal(job.createdAt, locale)} | {omrCopy.revision}: {job.resultRevisionId ? job.resultRevisionId.slice(0, 8) : "-"} |{" "}
                      {omrCopy.outputs}: {job.outputFileIds?.length ?? 0} | {locale === "zh-CN" ? "尝试" : "Attempt"}: {job.attemptCount}
                      {job.queuePosition ? ` | ${locale === "zh-CN" ? "队列位置" : "Queue"}: ${job.queuePosition}` : ""}
                    </p>
                    {(job.status === "queued" || job.status === "processing") ? (
                      <div className="stack-sm">
                        <progress max={100} value={job.progressPercent} aria-label={locale === "zh-CN" ? "任务进度" : "Job progress"} />
                        <p className="helper-copy">{job.progressPercent}%</p>
                      </div>
                    ) : null}
                    {job.errorMessage ? <p className="form-status error">{job.errorMessage}</p> : null}
                  </div>
                  {(outputAssets.length > 0 || job.status === "queued" || job.status === "processing" || job.status === "failed" || job.status === "cancelled") ? (
                    <div className="button-row">
                      {outputAssets.map((asset) => (
                        <button
                          type="button"
                          className="button button-secondary button-ghost"
                          key={`${job.id}-${asset.file.id}`}
                          onClick={() => void handleDownload(asset.file.id, asset.file.originalName)}
                        >
                          {assetCopy.download} {formatAssetKind(asset.assetKind)}
                        </button>
                      ))}
                      {(job.status === "queued" || job.status === "processing") ? (
                        <button type="button" className="button button-secondary button-ghost" disabled={jobActionId === job.id} onClick={() => void handleScoreJobAction(job, "cancel")}>
                          {jobActionId === job.id ? (locale === "zh-CN" ? "处理中..." : "Working...") : (locale === "zh-CN" ? "取消" : "Cancel")}
                        </button>
                      ) : null}
                      {(job.status === "failed" || job.status === "cancelled") ? (
                        <button type="button" className="button button-primary" disabled={jobActionId === job.id} onClick={() => void handleScoreJobAction(job, "retry")}>
                          {jobActionId === job.id ? (locale === "zh-CN" ? "处理中..." : "Working...") : (locale === "zh-CN" ? "重试" : "Retry")}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
        {omrDiagnostics.length > 0 ? (
          <div className="stack-md">
            <h3 className="card-title">{omrCopy.diagnostics}</h3>
            <div className="list-grid">
              {omrDiagnostics.map((diagnostic) => {
                const summary = summarizeOmrDiagnostic(diagnostic.diagnostics);
                return (
                  <div key={diagnostic.id} className="list-item">
                    <div className="list-item-content">
                      <p className="item-title">
                        {summary.status} <span className={`status-chip ${toneForDiagnosticStatus(summary.status)}`}>{summary.engine}</span>
                      </p>
                      <p className="item-meta">
                        {formatLocal(diagnostic.createdAt, locale)} | {omrCopy.confidence}: {formatPercent(diagnostic.confidence)} | {omrCopy.pages}:{" "}
                        {diagnostic.sourcePageCount ?? "-"}
                      </p>
                      {summary.message ? <p className="helper-copy">{summary.message}</p> : null}
                      {summary.counts.length > 0 ? <p className="helper-copy">{summary.counts.join(" | ")}</p> : null}
                      <pre className="preview-block">{JSON.stringify(diagnostic.diagnostics, null, 2)}</pre>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      <section id="export-center" className="surface-panel stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">{assetCopy.eyebrow}</p>
          <h2 className="card-title">{assetCopy.title}</h2>
          <p className="body-copy">{assetCopy.body}</p>
        </div>
        {assetsLoading ? <div className="empty-state">{assetCopy.loading}</div> : null}
        {assetsError ? <p className="form-status error">{assetsError}</p> : null}
        {!assetsLoading && !assetsError && assets.length === 0 ? <div className="empty-state">{assetCopy.empty}</div> : null}
        {assets.length > 0 ? (
          <div className="list-grid">
            {assets.map((asset) => (
              <div key={asset.id} className="list-item">
                <div className="list-item-content">
                  <p className="item-title">
                    {asset.file.originalName} {asset.isStale ? <span className="status-chip tone-amber">{locale === "zh-CN" ? "旧版本" : "Stale"}</span> : null}
                  </p>
                  <p className="item-meta">
                    {isSourceAsset(asset.assetKind) ? assetCopy.source : assetCopy.export} | {formatAssetKind(asset.assetKind)} | {formatSize(asset.file.sizeBytes)} |{" "}
                    {formatLocal(asset.createdAt, locale)}
                  </p>
                  {asset.revisionId ? <p className="helper-copy">{locale === "zh-CN" ? "来源版本" : "Source revision"}: {asset.revisionId.slice(0, 8)}</p> : null}
                  {asset.checksumSha256 ? <p className="helper-copy">SHA-256: {asset.checksumSha256.slice(0, 16)}...</p> : null}
                </div>
                <button
                  type="button"
                  className="button button-secondary button-ghost"
                  onClick={() => void handleDownload(asset.file.id, asset.file.originalName)}
                >
                  {assetCopy.download}
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {currentScoreJson ? (
        <>
          <div id="visual-editor">
            <ScoreVisualEditorPanel
              scoreId={score.id}
              token={token}
              scoreJson={currentScoreJson}
              baseRevisionId={score.pendingRevisionId ? null : score.currentRevisionId}
              selectedEventId={selectedScoreEventId}
              onSelectedEventChange={handleScoreEventSelect}
              onUpdated={async (nextPayload, mutation) => {
                announceCollaborationMutation(nextPayload, mutation);
                setPayload(nextPayload);
                await refreshJianpu();
              }}
              onReload={async (latestPayload) => {
                setPayload(latestPayload);
                await refreshJianpu();
              }}
            />
          </div>
          <div id="live-collaboration">
            <ScoreCollaborationPanel
              scoreId={scoreId}
              token={token}
              currentRevisionId={score.pendingRevisionId ?? score.currentRevisionId}
              pendingOperations={pendingCollaborationOperations}
              selectedEventId={selectedScoreEventId}
              onRemoteEventSelect={handleScoreEventSelect}
              onRemoteRevision={async () => {
                await refreshScoreSnapshot();
              }}
              locale={locale}
            />
          </div>
          <div id="correction-editor">
            <ScoreCorrectionPanel
              scoreId={score.id}
              token={token}
              scoreJson={currentScoreJson}
              onUpdated={async (nextPayload) => {
                setPayload(nextPayload);
                await refreshJianpu();
              }}
            />
          </div>
        </>
      ) : (
        <section className="surface-panel stack-lg">
          <div className="stack-sm">
            <p className="eyebrow">Correction</p>
            <h2 className="card-title">Waiting for editable notation</h2>
            <p className="body-copy">The correction panel will appear after MusicXML import or OMR creates a Score JSON revision.</p>
          </div>
        </section>
      )}

      <section id="transpose-score" className="surface-panel stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">{transposeCopy.eyebrow}</p>
          <h2 className="card-title">{transposeCopy.title}</h2>
          <p className="body-copy">{transposeCopy.body}</p>
        </div>
        <form className="transpose-panel" onSubmit={handleTranspose}>
          <label className="field-group">
            <span>{transposeTargetCopy.mode}</span>
            <select className="field-select" value={transposeMode} onChange={(event) => setTransposeMode(event.target.value as "semitones" | "interval" | "targetKey" | "instrument")}>
              <option value="semitones">{transposeTargetCopy.semitoneMode}</option>
              <option value="interval">{locale === "zh-CN" ? "按音程/八度" : "By interval/octave"}</option>
              <option value="targetKey">{transposeTargetCopy.targetKeyMode}</option>
              <option value="instrument">{locale === "zh-CN" ? "按移调乐器" : "For transposing instrument"}</option>
            </select>
          </label>
          <label className="field-group">
            <span>
              {transposeMode === "targetKey"
                ? transposeTargetCopy.targetKey
                : transposeMode === "instrument"
                  ? locale === "zh-CN"
                    ? "移调乐器"
                    : "Instrument"
                  : transposeMode === "interval"
                    ? locale === "zh-CN"
                      ? "音程"
                      : "Interval"
                  : transposeCopy.semitones}
            </span>
            {transposeMode === "targetKey" ? (
              <select className="field-select" value={targetTonic} onChange={(event) => setTargetTonic(event.target.value)}>
                {TARGET_KEY_OPTIONS.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            ) : transposeMode === "instrument" ? (
              <select className="field-select" value={instrumentProfileId} onChange={(event) => setInstrumentProfileId(event.target.value as typeof instrumentProfileId)}>
                {TRANSPOSING_INSTRUMENT_PROFILES.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.label} ({profile.semitonesFromConcertPitch >= 0 ? "+" : ""}{profile.semitonesFromConcertPitch})
                  </option>
                ))}
              </select>
            ) : transposeMode === "interval" ? (
              <select
                className="field-select"
                value={transposeIntervalId}
                onChange={(event) => setTransposeIntervalId(event.target.value as (typeof TRANSPOSE_INTERVAL_OPTIONS)[number]["id"])}
              >
                {TRANSPOSE_INTERVAL_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} ({option.semitones} {locale === "zh-CN" ? "半音" : "semitones"})
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="field-control"
                type="number"
                min={-24}
                max={24}
                step={1}
                value={transposeSemitones}
                onChange={(event) => setTransposeSemitones(Number(event.target.value))}
              />
            )}
          </label>
          {transposeMode === "targetKey" ? (
            <label className="field-group">
              <span>{transposeTargetCopy.targetMode}</span>
              <select
                className="field-select"
                value={targetMode}
                onChange={(event) => setTargetMode(event.target.value as (typeof TARGET_MODE_OPTIONS)[number])}
              >
                {TARGET_MODE_OPTIONS.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode === "major" ? transposeTargetCopy.major : mode === "minor" ? transposeTargetCopy.minor : mode[0].toUpperCase() + mode.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {transposeMode === "interval" ? (
            <label className="field-group">
              <span>{locale === "zh-CN" ? "方向" : "Direction"}</span>
              <select
                className="field-select"
                value={transposeIntervalDirection}
                onChange={(event) => setTransposeIntervalDirection(Number(event.target.value) === -1 ? -1 : 1)}
              >
                <option value={1}>{locale === "zh-CN" ? "向上" : "Up"}</option>
                <option value={-1}>{locale === "zh-CN" ? "向下" : "Down"}</option>
              </select>
            </label>
          ) : null}
          <label className="field-group">
            <span>{locale === "zh-CN" ? "异名同音策略" : "Accidental spelling"}</span>
            <select
              className="field-select"
              value={transposeSpellingPolicy}
              onChange={(event) => setTransposeSpellingPolicy(event.target.value as TransposeSpellingPolicy)}
            >
              <option value="auto">{locale === "zh-CN" ? "跟随目标调号" : "Follow target key"}</option>
              <option value="preserve">{locale === "zh-CN" ? "保持原拼写倾向" : "Preserve source tendency"}</option>
              <option value="prefer-sharps">{locale === "zh-CN" ? "优先升号" : "Prefer sharps"}</option>
              <option value="prefer-flats">{locale === "zh-CN" ? "优先降号" : "Prefer flats"}</option>
            </select>
          </label>
          {transposeMode === "instrument" ? (
            <label className="field-group">
              <span>{locale === "zh-CN" ? "音高方向" : "Pitch direction"}</span>
              <select
                className="field-select"
                value={transposePitchMode}
                onChange={(event) => setTransposePitchMode(event.target.value as TransposePitchMode)}
              >
                <option value="concert-to-written">{locale === "zh-CN" ? "实际音转记谱音" : "Concert to written"}</option>
                <option value="written-to-concert">{locale === "zh-CN" ? "记谱音转实际音" : "Written to concert"}</option>
              </select>
            </label>
          ) : null}
          <label className="field-group">
            <span>{transposeRangeCopy.label}</span>
            <select
              className="field-select"
              value={rangeProfileId}
              onChange={(event) => {
                setRangeProfileId(event.target.value);
                setTransposeSuggestions([]);
                setTransposeSuggestionsError(null);
              }}
            >
              <option value="none">{transposeRangeCopy.none}</option>
              {SCORE_RANGE_PROFILES.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field-group">
            <span>{transposeRangeCopy.part}</span>
            <select
              className="field-select"
              value={rangePartId}
              onChange={(event) => {
                setRangePartId(event.target.value);
                setTransposeSuggestions([]);
                setTransposeSuggestionsError(null);
              }}
              disabled={rangeProfileId === "none"}
            >
              <option value="all">{transposeRangeCopy.allParts}</option>
              {currentScoreJson?.parts.map((part) => (
                <option key={part.id} value={part.id}>
                  {part.name}
                </option>
              ))}
            </select>
          </label>
          {currentScoreJson && currentScoreJson.parts.length > 0 ? (
            <div className="field-group wide">
              <span>{transposeRangeCopy.perPart}</span>
              <div className="form-grid">
                {currentScoreJson.parts.map((part) => (
                  <label key={part.id} className="field-group">
                    <span>{part.name}</span>
                    <select
                      className="field-select"
                      value={partRangeProfileIds[part.id] ?? "none"}
                      onChange={(event) => {
                        const nextProfileId = event.target.value;
                        setPartRangeProfileIds((current) => ({
                          ...current,
                          [part.id]: nextProfileId,
                        }));
                        setTransposeSuggestions([]);
                        setTransposeSuggestionsError(null);
                      }}
                    >
                      <option value="none">{transposeRangeCopy.noPartProfile}</option>
                      {SCORE_RANGE_PROFILES.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          {transposeMode === "instrument" ? (
            <p className="helper-copy">
              {TRANSPOSING_INSTRUMENT_PROFILES.find((profile) => profile.id === instrumentProfileId)?.examples}
            </p>
          ) : null}
          <div className="button-row">
            {transposeMode === "semitones" ? (
              <>
                <button type="button" className="button button-secondary" onClick={() => setTransposeSemitones((value) => Math.max(-24, value - 1))}>
                  {transposeCopy.down}
                </button>
                <button type="button" className="button button-secondary" onClick={() => setTransposeSemitones((value) => Math.min(24, value + 1))}>
                  {transposeCopy.up}
                </button>
              </>
            ) : null}
            <button type="submit" className="button button-primary" disabled={transposing || (transposeMode === "semitones" && transposeSemitones === 0)}>
              {transposing ? transposeCopy.working : transposeCopy.submit}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => void handleLoadTransposeSuggestions()}
              disabled={(rangeProfileId === "none" && buildRangeAssignments(partRangeProfileIds).length === 0) || transposeSuggestionsLoading}
            >
              {transposeSuggestionsLoading ? transposeRangeCopy.loadingSuggestions : transposeRangeCopy.loadSuggestions}
            </button>
            <button type="button" className="button button-secondary" onClick={() => void handleSaveTransposePreset()} disabled={savingTransposePreset}>
              {savingTransposePreset ? transposeRangeCopy.savingPreset : transposeRangeCopy.savePreset}
            </button>
          </div>
        </form>
        {transposeStatus && transposeStatusKind ? <p className={`form-status ${transposeStatusKind}`}>{transposeStatus}</p> : null}
        {transposeEngineResult ? (
          <p className="helper-copy">
            {locale === "zh-CN" ? "移调引擎" : "Transpose engine"}: {transposeEngineResult === "music21" ? "music21" : "Score JSON fallback"}
          </p>
        ) : null}
        {transposeWarnings.map((warning) => (
          <p key={warning} className="form-status error">
            {warning}
          </p>
        ))}
        {transposePresetStatus && transposePresetStatusKind ? <p className={`form-status ${transposePresetStatusKind}`}>{transposePresetStatus}</p> : null}
        {transposeSuggestionsError ? <p className="form-status error">{transposeSuggestionsError}</p> : null}
        {transposeSuggestions.length > 0 ? (
          <div className="list-grid">
            <p className="item-title">{transposeRangeCopy.suggestions}</p>
            {transposeSuggestions.map((suggestion) => (
              <div key={suggestion.semitones} className="list-item">
                <div className="list-item-content">
                  <p className="item-title">
                    {suggestion.directionLabel} semitones to {suggestion.targetKey.display}{" "}
                    <span className={`status-chip ${suggestion.rangeDiagnostic.outOfRangeNoteCount > 0 ? "tone-amber" : "tone-cyan"}`}>
                      {suggestion.rangeDiagnostic.outOfRangeNoteCount > 0
                        ? `${suggestion.rangeDiagnostic.outOfRangeNoteCount} / ${suggestion.rangeDiagnostic.noteCount} ${transposeRangeCopy.notes}`
                        : transposeRangeCopy.noIssues}
                    </span>
                  </p>
                  <p className="item-meta">
                    From {suggestion.sourceKey.display} | Score {suggestion.rangeDiagnostic.lowestMidi === null ? "-" : formatMidiNote(suggestion.rangeDiagnostic.lowestMidi)}-
                    {suggestion.rangeDiagnostic.highestMidi === null ? "-" : formatMidiNote(suggestion.rangeDiagnostic.highestMidi)}
                    {suggestion.rangeDiagnostic.checkedPartIds.length > 0 ? ` | ${transposeRangeCopy.checked}: ${formatScorePartIds(suggestion.rangeDiagnostic.checkedPartIds, currentScoreJson)}` : ""}
                  </p>
                </div>
                <button type="button" className="button button-secondary button-ghost" onClick={() => applyTransposeSuggestion(suggestion)}>
                  {transposeRangeCopy.applySuggestion}
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {transposeRangeDiagnostic ? (
          <div className="list-item">
            <div className="list-item-content">
              <p className="item-title">
                {transposeRangeCopy.summary}: {transposeRangeDiagnostic.label}{" "}
                <span className={`status-chip ${transposeRangeDiagnostic.outOfRangeNoteCount > 0 ? "tone-amber" : "tone-cyan"}`}>
                  {transposeRangeDiagnostic.outOfRangeNoteCount > 0
                    ? `${transposeRangeDiagnostic.outOfRangeNoteCount} / ${transposeRangeDiagnostic.noteCount} ${transposeRangeCopy.notes}`
                    : transposeRangeCopy.noIssues}
                </span>
              </p>
              <p className="item-meta">
                Range {formatMidiNote(transposeRangeDiagnostic.minMidi)}-{formatMidiNote(transposeRangeDiagnostic.maxMidi)} | Score{" "}
                {transposeRangeDiagnostic.lowestMidi === null ? "-" : formatMidiNote(transposeRangeDiagnostic.lowestMidi)}-
                {transposeRangeDiagnostic.highestMidi === null ? "-" : formatMidiNote(transposeRangeDiagnostic.highestMidi)}
                {transposeRangeDiagnostic.checkedPartIds.length > 0 ? ` | ${transposeRangeCopy.checked}: ${formatScorePartIds(transposeRangeDiagnostic.checkedPartIds, currentScoreJson)}` : ""}
              </p>
              {transposeRangeDiagnostic.affectedPartIds.length > 0 ? (
                <p className="helper-copy">
                  {transposeRangeCopy.affected}: {transposeRangeDiagnostic.affectedPartIds.join(", ")}
                </p>
              ) : null}
              {transposeRangeDiagnostics.length > 1
                ? transposeRangeDiagnostics.map((diagnostic) => (
                    <p key={`${diagnostic.profileId}-${diagnostic.checkedPartIds.join("-")}`} className="helper-copy">
                      {diagnostic.label} / {formatScorePartIds(diagnostic.checkedPartIds, currentScoreJson)}: {diagnostic.outOfRangeNoteCount} / {diagnostic.noteCount}{" "}
                      {transposeRangeCopy.notes}
                    </p>
                  ))
                : null}
              {transposeRangeDiagnostic.warnings.map((warning) => (
                <p key={warning} className="helper-copy">
                  {warning}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {currentScoreJson ? (
        <section className="surface-panel stack-lg">
          <div className="stack-sm">
            <p className="eyebrow">{clefRecommendationCopy.eyebrow}</p>
            <h2 className="card-title">{clefRecommendationCopy.title}</h2>
            <p className="body-copy">{clefRecommendationCopy.body}</p>
          </div>
          <div className="button-row">
            <button type="button" className="button button-secondary" onClick={() => void handleLoadClefRecommendations()} disabled={clefRecommendationsLoading}>
              {clefRecommendationsLoading ? clefRecommendationCopy.loading : clefRecommendationCopy.load}
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={() => void handleApplyClefRecommendations()}
              disabled={applyingClefRecommendations || clefRecommendations.every((recommendation) => recommendation.noteCount === 0)}
            >
              {applyingClefRecommendations ? clefRecommendationCopy.applying : clefRecommendationCopy.apply}
            </button>
          </div>
          {clefRecommendationStatus && clefRecommendationStatusKind ? <p className={`form-status ${clefRecommendationStatusKind}`}>{clefRecommendationStatus}</p> : null}
          {clefRecommendations.length > 0 ? (
            <div className="list-grid">
              {clefRecommendations.map((recommendation) => (
                <div key={recommendation.partId} className="list-item">
                  <div className="list-item-content">
                    <p className="item-title">
                      {recommendation.partName}{" "}
                      <span className={`status-chip ${recommendation.noteCount > 0 ? "tone-cyan" : "tone-neutral"}`}>
                        {recommendation.noteCount > 0 ? formatClefForDisplay(recommendation.clef) : clefRecommendationCopy.noNotes}
                      </span>
                    </p>
                    <p className="item-meta">
                      {clefRecommendationCopy.current}: {recommendation.currentClef ? formatClefForDisplay(recommendation.currentClef) : "-"} |{" "}
                      {clefRecommendationCopy.recommended}: {formatClefForDisplay(recommendation.clef)} | {clefRecommendationCopy.range}:{" "}
                      {recommendation.lowestMidi === null ? "-" : formatMidiNote(recommendation.lowestMidi)}-
                      {recommendation.highestMidi === null ? "-" : formatMidiNote(recommendation.highestMidi)}
                    </p>
                    <p className="helper-copy">{recommendation.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {score.currentRevision ? (
        <div id="playback-practice" className="stack-lg">
          <ScorePlaybackPanel
              key={score.currentRevisionId ?? score.id}
              scoreId={score.id}
              token={token}
              revisionId={score.currentRevisionId}
              practiceSettings={playbackPracticeSettings}
              onPracticeSettingsChange={setPlaybackPracticeSettings}
              selectedEventId={selectedScoreEventId}
              onPlaybackEventChange={setSelectedScoreEventId}
              exportActions={{
                midi: {
                  label: exportCopy.midi,
                  loadingLabel: exportCopy.exporting,
                  loading: exportingMidi,
                  disabled: !currentScoreJson,
                  onClick: () => void handleExportMidi(),
                },
                wav: {
                  label: wavExportCopy.button,
                  loadingLabel: wavExportCopy.exporting,
                  loading: exportingWav,
                  disabled: !currentScoreJson,
                  onClick: () => void handleExportWav(),
                },
                mp3: {
                  label: mp3ExportCopy.button,
                  loadingLabel: mp3ExportCopy.exporting,
                  loading: exportingMp3,
                  disabled: !currentScoreJson,
                  onClick: () => void handleExportMp3(),
                },
              }}
            />
          <section className="surface-panel stack-lg">
            <PracticeRecorder
              locale={locale}
              value={practiceRecording}
              playbackEndpoint={`/api/scores/${score.id}/playback`}
              practiceSettings={playbackPracticeSettings}
              selectedEventId={selectedScoreEventId}
              onEventSelect={setSelectedScoreEventId}
              onRecording={setPracticeRecording}
            />
          </section>
        </div>
      ) : (
        <section className="surface-panel stack-lg">
          <div className="stack-sm">
            <p className="eyebrow">Playback practice</p>
            <h2 className="card-title">Waiting for a score revision</h2>
            <p className="body-copy">Playback will be available after OMR produces a MusicXML/Score JSON candidate revision.</p>
          </div>
        </section>
      )}

      <div id="omr-comparison" className="score-comparison-grid">
          <ScoreOmrReviewPanel
            scoreId={score.id}
            sourceFile={sourcePreviewAsset?.file ?? null}
          pageFiles={omrPageFiles}
          token={token}
          scoreJson={currentScoreJson ?? null}
          selectedEventId={selectedScoreEventId}
          onEventSelect={handleScoreEventSelect}
          locale={locale}
        />
        <section className="surface-panel stack-lg">
          <div className="stack-sm">
            <p className="eyebrow">{copy.source}</p>
            <h2 className="card-title">{copy.previewTitle}</h2>
            <p className="body-copy">{copy.previewBody}</p>
          </div>
          <ScoreMusicXmlPreview
            fileId={musicxmlFileId ?? null}
            token={token}
            musicXml={generatedPreviewMusicXml}
            scoreJson={currentScoreJson}
            selectedEventId={selectedScoreEventId}
            onEventSelect={handleScoreEventSelect}
            emptyLabel={locale === "zh-CN" ? "暂无可渲染的 MusicXML。" : "No renderable MusicXML yet."}
            loadingLabel={locale === "zh-CN" ? "正在渲染五线谱预览..." : "Rendering staff notation preview..."}
            errorLabel={locale === "zh-CN" ? "MusicXML 预览渲染失败。" : "MusicXML preview could not be rendered."}
          />
        </section>
      </div>

      <section id="score-json-model" className="surface-panel stack-lg">
          <div className="stack-sm">
            <p className="eyebrow">Score JSON</p>
            <h2 className="card-title">{copy.modelTitle}</h2>
            <p className="body-copy">{copy.modelBody}</p>
          </div>
          {scoreSummary ? (
            <div className="score-summary-grid">
              <div className="mini-card stack-xs">
                <p className="metric-label">{summaryCopy.parts}</p>
                <p className="metric-value compact">{scoreSummary.parts}</p>
              </div>
              <div className="mini-card stack-xs">
                <p className="metric-label">{summaryCopy.measures}</p>
                <p className="metric-value compact">{scoreSummary.measures}</p>
              </div>
              <div className="mini-card stack-xs">
                <p className="metric-label">{summaryCopy.notes}</p>
                <p className="metric-value compact">{scoreSummary.notes}</p>
              </div>
              <div className="mini-card stack-xs">
                <p className="metric-label">{summaryCopy.rests}</p>
                <p className="metric-value compact">{scoreSummary.rests}</p>
              </div>
              <div className="mini-card stack-xs wide">
                <p className="metric-label">{summaryCopy.parser}</p>
                <p className="item-title">{scoreSummary.parser}</p>
              </div>
            </div>
          ) : null}
          {scoreSummary && scoreSummary.warnings.length > 0 ? (
            <div className="mini-card stack-xs">
              <p className="metric-label">{summaryCopy.warnings}</p>
              {scoreSummary.warnings.map((warning) => (
                <p key={warning} className="helper-copy">
                  {warning}
                </p>
              ))}
            </div>
          ) : null}
          <pre className="preview-block">
            {JSON.stringify(score.currentRevision?.scoreJson ?? {}, null, 2)}
          </pre>
      </section>

      <section id="jianpu-preview" className="surface-panel stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">{jianpuCopy.eyebrow}</p>
          <h2 className="card-title">{jianpuCopy.title}</h2>
          <p className="body-copy">{jianpuCopy.body}</p>
        </div>
        <div className="form-grid">
          <label className="field-group">
            <span>{jianpuCopy.pitchSystem}</span>
            <select className="field-select" value={jianpuPitchSystem} onChange={(event) => setJianpuPitchSystem(event.target.value as JianpuPitchSystem)}>
              <option value="movable-do">{jianpuCopy.movableDo}</option>
              <option value="fixed-do">{jianpuCopy.fixedDo}</option>
            </select>
          </label>
          <label className="field-group">
            <span>{jianpuCopy.accidentals}</span>
            <select className="field-select" value={jianpuAccidentalStrategy} onChange={(event) => setJianpuAccidentalStrategy(event.target.value as JianpuAccidentalStrategy)}>
              <option value="preserve">{jianpuCopy.preserve}</option>
              <option value="prefer-sharps">{jianpuCopy.preferSharps}</option>
              <option value="prefer-flats">{jianpuCopy.preferFlats}</option>
            </select>
          </label>
          <div className="button-row field-group">
            <button type="button" className="button button-secondary" onClick={() => void refreshJianpu()} disabled={jianpuLoading}>
              {jianpuCopy.apply}
            </button>
          </div>
        </div>
        {jianpuLoading ? <div className="empty-state">{jianpuCopy.loading}</div> : null}
        {jianpuError ? <p className="form-status error">{jianpuError}</p> : null}
        {!jianpuLoading && !jianpuError && !jianpu ? <div className="empty-state">{jianpuCopy.empty}</div> : null}
        {jianpu ? (
          <div className="jianpu-preview">
            <div className="jianpu-meta">
              <span>{jianpuCopy.key}: 1={jianpu.key.tonic} ({jianpu.key.mode})</span>
              <span>{jianpuCopy.source}: {jianpu.metadata.sourceRevisionParser}</span>
            </div>
            {jianpu.metadata.warnings.length > 0 ? (
              <div className="stack-xs" role="status">
                <p className="metric-label">{jianpuCopy.warnings}</p>
                {jianpu.metadata.warnings.map((warning) => (
                  <p key={warning} className="helper-copy">{warning}</p>
                ))}
              </div>
            ) : null}
            <JianpuNotationView
              document={jianpu}
              selectedEventId={selectedScoreEventId}
              onEventSelect={handleScoreEventSelect}
              locale={locale}
            />
            <details className="jianpu-source-details">
              <summary>{jianpuCopy.sourceText}</summary>
              <pre className="jianpu-block">{jianpu.text}</pre>
            </details>
          </div>
        ) : null}
      </section>

      <section id="project-comments" className="surface-panel stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">{commentCopy.eyebrow}</p>
          <h2 className="card-title">{commentCopy.title}</h2>
          <p className="body-copy">{commentCopy.body}</p>
        </div>
        <form className="stack-sm" onSubmit={handlePostComment}>
          <label className="field-group wide">
            <span>{commentCopy.target}</span>
            <select className="field-select" value={selectedCommentTarget.id} onChange={(event) => setCommentTargetId(event.target.value)}>
              {commentTargetOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field-group wide">
            <span>{commentCopy.submit}</span>
            <textarea
              className="field-control"
              rows={4}
              maxLength={2000}
              placeholder={commentCopy.placeholder}
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
            />
          </label>
          <div className="button-row">
            <button type="submit" className="button button-primary" disabled={postingComment || commentText.trim().length === 0}>
              {postingComment ? commentCopy.posting : commentCopy.submit}
            </button>
          </div>
        </form>
        {commentsLoading ? <div className="empty-state">{commentCopy.loading}</div> : null}
        {commentsError ? <p className="form-status error">{commentsError}</p> : null}
        {!commentsLoading && !commentsError && comments.length === 0 ? <div className="empty-state">{commentCopy.empty}</div> : null}
        {comments.length > 0 ? (
          <div className="list-grid">
            {comments.map((comment) => (
              <div key={comment.id} className="list-item">
                <div className="list-item-content">
                  <div className="button-row">
                    <p className="item-title">{comment.author.displayName}</p>
                    <span className={`status-chip ${comment.author.verification === "account" ? "tone-green" : "tone-cyan"}`}>
                      {comment.author.verification === "account" ? commentCopy.accountIdentity : commentCopy.shareIdentity}
                    </span>
                    {comment.resolvedAt ? <span className="status-chip tone-green">{commentCopy.resolved}</span> : null}
                  </div>
                  <p className="item-meta">
                    {formatCommentTarget(comment.target, commentCopy.scoreTarget)} | {formatLocal(comment.createdAt, locale)}
                  </p>
                  <p className="body-copy">{comment.body}</p>
                </div>
                <button type="button" className="button button-secondary button-ghost" disabled={resolvingCommentId === comment.id} onClick={() => void handleCommentResolution(comment)}>
                  {comment.resolvedAt ? commentCopy.reopen : commentCopy.resolve}
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section id="revision-history" className="surface-panel stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">{copy.revisions}</p>
          <h2 className="card-title">{copy.revisions}</h2>
        </div>
        <div className="button-row" role="group" aria-label={locale === "zh-CN" ? "版本撤销与重做" : "Revision undo and redo"}>
          <button
            type="button"
            className="button button-secondary button-ghost"
            onClick={() => void handleUndoRevision()}
            disabled={undoRevisionIds.length === 0 || Boolean(restoringRevisionId)}
          >
            {locale === "zh-CN" ? "撤销" : "Undo"}
          </button>
          <button
            type="button"
            className="button button-secondary button-ghost"
            onClick={() => void handleRedoRevision()}
            disabled={redoRevisionIds.length === 0 || Boolean(restoringRevisionId)}
          >
            {locale === "zh-CN" ? "重做" : "Redo"}
          </button>
        </div>
        {revisionStatus && revisionStatusKind ? <p className={`form-status ${revisionStatusKind}`}>{revisionStatus}</p> : null}
        <div className="list-grid">
          {revisions.map((revision) => {
            const isCurrentRevision = revision.id === score.currentRevisionId;
            return (
              <div key={revision.id} className="list-item">
                <div className="list-item-content">
                  <p className="item-title">
                    v{revision.revisionNumber} {isCurrentRevision ? <span className="status-chip tone-primary">{copy.currentBadge}</span> : null}
                  </p>
                  <p className="item-meta">
                    {revision.createdFrom} | {formatLocal(revision.createdAt, locale)}
                  </p>
                </div>
                <div className="button-row">
                  {revision.musicxmlFileId ? (
                    <button
                      type="button"
                      className="button button-secondary button-ghost"
                      onClick={() => void handleDownload(revision.musicxmlFileId!, `${score.title}-v${revision.revisionNumber}.musicxml`)}
                    >
                      {copy.download}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="button button-secondary button-ghost"
                    onClick={() => void handleRestoreRevision(revision.id)}
                    disabled={isCurrentRevision || Boolean(restoringRevisionId)}
                  >
                    {restoringRevisionId === revision.id ? copy.restoring : copy.restore}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function buildCommentTargetOptions(scoreJson: ScoreJson | undefined, locale: string, scoreTargetLabel: string): CommentTargetOption[] {
  const options: CommentTargetOption[] = [
    {
      id: "score",
      label: scoreTargetLabel,
      target: {
        type: "score",
        label: scoreTargetLabel,
      },
    },
  ];

  if (!scoreJson) {
    return options;
  }

  const partNames = new Map(scoreJson.parts.map((part) => [part.id, part.name]));
  const measureLabel = locale === "zh-CN" ? "小节" : "Measure";
  const noteLabel = locale === "zh-CN" ? "音符" : "Note";

  for (const measure of scoreJson.measures) {
    const partName = partNames.get(measure.partId) ?? measure.partId;
    const label = `${partName} ${measureLabel} ${measure.number}`;
    options.push({
      id: `measure:${measure.id}`,
      label,
      target: {
        type: "measure",
        label,
        partId: measure.partId,
        measureId: measure.id,
        measureNumber: measure.number,
      },
    });

    for (const event of measure.events) {
      if (event.type !== "note") {
        continue;
      }

      const noteText = `${formatScorePitch(event.pitch)} ${event.durationType ?? ""}`.trim();
      const noteOptionLabel = `${partName} ${measureLabel} ${measure.number} ${noteLabel} ${noteText}`;
      options.push({
        id: `note:${event.id}`,
        label: noteOptionLabel,
        target: {
          type: "note",
          label: noteOptionLabel,
          partId: measure.partId,
          measureId: measure.id,
          measureNumber: measure.number,
          eventId: event.id,
          pitch: noteText,
        },
      });
    }
  }

  return options;
}

function shareUrl(token: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/scores/shared/${token}`;
}

function formatScorePitch(pitch: { step: string; alter: number; octave: number }) {
  const accidental = pitch.alter > 0 ? "#".repeat(pitch.alter) : pitch.alter < 0 ? "b".repeat(Math.abs(pitch.alter)) : "";
  return `${pitch.step}${accidental}${pitch.octave}`;
}

function formatScorePartIds(partIds: string[], scoreJson: ScoreJson | undefined) {
  const partNames = new Map(scoreJson?.parts.map((part) => [part.id, part.name]) ?? []);
  return partIds.map((partId) => partNames.get(partId) ?? partId).join(", ");
}

function assetsForJobOutput(job: ScoreJob, assets: ScoreAsset[]) {
  const outputFileIds = new Set(job.outputFileIds ?? []);
  if (outputFileIds.size === 0) {
    return [];
  }

  return assets.filter((asset) => outputFileIds.has(asset.fileId) || outputFileIds.has(asset.file.id));
}

function jobHasMissingOutputAssets(job: ScoreJob, assets: ScoreAsset[]) {
  const outputFileIds = job.outputFileIds ?? [];
  if (outputFileIds.length === 0) {
    return false;
  }

  const assetFileIds = new Set(assets.flatMap((asset) => [asset.fileId, asset.file.id]));
  return outputFileIds.some((fileId) => !assetFileIds.has(fileId));
}

function formatAssignmentPracticeSettings(settings: AssignmentPracticeSettings, scoreJson: ScoreJson | undefined) {
  const parts =
    settings.soloPartIds.length > 0
      ? `solo ${formatScorePartIds(settings.soloPartIds, scoreJson)}`
      : settings.mutedPartIds.length > 0
        ? `mute ${formatScorePartIds(settings.mutedPartIds, scoreJson)}`
        : "all parts";
  const loop = settings.loopEnabled ? `loop ${settings.loopStartBeat}-${settings.loopEndBeat}` : "full score";
  const helpers = [settings.metronomeEnabled ? "metronome" : null, settings.countInEnabled ? "count-in" : null].filter(Boolean).join(", ");
  return `${settings.tempoBpm} BPM, ${loop}, ${parts}${helpers ? `, ${helpers}` : ""}`;
}

function buildRangeAssignments(partRangeProfileIds: Record<string, string>) {
  return Object.entries(partRangeProfileIds)
    .filter(([, profileId]) => profileId && profileId !== "none")
    .map(([partId, profileId]) => ({
      partId,
      profileId,
    }));
}

function formatMidiNote(midi: number) {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${names[pitchClass]}${octave}`;
}

function formatClefForDisplay(clef: { sign: string; line?: number; octaveChange?: number }) {
  const octave = clef.octaveChange ? ` ${clef.octaveChange > 0 ? "+" : ""}${clef.octaveChange}oct` : "";
  return `${clef.sign}${clef.line ? ` line ${clef.line}` : ""}${octave}`;
}

function formatCommentTarget(target: Record<string, unknown> | null, fallback: string) {
  if (!target) {
    return fallback;
  }

  return typeof target.label === "string" && target.label.trim().length > 0 ? target.label : fallback;
}

function formatLocal(value: string, locale: string) {
  return new Date(value).toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US");
}

function formatSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(timeSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(timeSeconds) ? timeSeconds : 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function isSourceAsset(assetKind: string) {
  return assetKind.startsWith("source_");
}

function formatAssetKind(assetKind: string) {
  switch (assetKind) {
    case "source_musicxml":
      return "MusicXML source";
    case "source_jianpu":
      return "Jianpu source";
    case "source_pdf":
      return "PDF source";
    case "source_image":
      return "Image source";
    case "source_audio":
      return "Audio source";
    case "score_musicxml":
      return "MusicXML";
    case "score_json_snapshot":
      return "Score JSON";
    case "output_jianpu":
      return "Jianpu";
    case "output_midi":
      return "MIDI";
    case "rendered_pdf":
      return "PDF";
    case "rendered_png":
      return "PNG";
    case "rendered_svg":
      return "SVG";
    case "output_audio":
      return "Audio/WAV";
    default:
      return assetKind.replace(/_/g, " ");
  }
}

function formatScoreJobType(jobType: string) {
  switch (jobType) {
    case "omr_import":
      return "OMR import";
    case "transpose":
      return "Transpose";
    case "export":
      return "Export";
    case "render_audio":
      return "Render audio";
    case "render_export":
      return "Score export";
    case "audio_transcribe":
      return "Audio transcription";
    default:
      return jobType.replace(/_/g, " ");
  }
}

function formatScoreJobLabel(job: ScoreJob) {
  const format = typeof job.params?.format === "string" ? job.params.format.toUpperCase() : null;
  return format ? `${format} ${formatScoreJobType(job.jobType)}` : formatScoreJobType(job.jobType);
}

function toneForJobStatus(status: string) {
  switch (status) {
    case "completed":
      return "tone-cyan";
    case "failed":
      return "tone-amber";
    case "cancelled":
      return "tone-neutral";
    case "processing":
      return "tone-primary";
    default:
      return "tone-neutral";
  }
}

function toneForDiagnosticStatus(status: string) {
  switch (status) {
    case "completed":
      return "tone-cyan";
    case "failed":
      return "tone-amber";
    case "processing":
      return "tone-primary";
    default:
      return "tone-neutral";
  }
}

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "-";
  }

  return `${Math.round(value * 100)}%`;
}

function summarizeOmrDiagnostic(diagnostics: Record<string, unknown>) {
  const status = stringValue(diagnostics.status) ?? "diagnostic";
  const engine = stringValue(diagnostics.engine) ?? "OMR";
  const message = stringValue(diagnostics.message);
  const counts = [
    numberLabel("Measures", diagnostics.measureCount),
    numberLabel("Notes", diagnostics.noteCount),
    shortIdLabel("Revision", diagnostics.revisionId),
    shortIdLabel("MIDI", diagnostics.midiFileId),
    warningCountLabel(diagnostics.warnings),
  ].filter((value): value is string => Boolean(value));

  return {
    status,
    engine,
    message,
    counts,
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberLabel(label: string, value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? `${label}: ${value}` : null;
}

function shortIdLabel(label: string, value: unknown) {
  return typeof value === "string" && value.trim() ? `${label}: ${value.slice(0, 8)}` : null;
}

function warningCountLabel(value: unknown) {
  return Array.isArray(value) && value.length > 0 ? `Warnings: ${value.length}` : null;
}
