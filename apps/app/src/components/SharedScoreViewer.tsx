"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { APP_ROUTES } from "@score/shared";
import type { AssignmentPracticeSettings, JianpuDocument, ScoreJson } from "@score/shared";
import { API_BASE_URL, apiRequest } from "../lib/api";
import { useAppLocale } from "./AppLocaleProvider";
import { ScoreMusicXmlPreview } from "./ScoreMusicXmlPreview";
import { DEFAULT_PLAYBACK_PRACTICE_SETTINGS, ScorePlaybackPanel } from "./ScorePlaybackPanel";
import { AudioWaveformPlayer } from "./AudioWaveformPlayer";
import { PracticeRecorder } from "./PracticeRecorder";
import { ScoreVisualEditorPanel } from "./ScoreVisualEditorPanel";
import { ScoreAnnotationWorkspace, type ScoreAnnotation } from "./ScoreAnnotationWorkspace";
import type { PracticePerformanceAnalysis } from "../lib/practice-performance-analysis";

type SharedAssignment = {
  id: string;
  revisionId: string | null;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  practiceSettings: AssignmentPracticeSettings | null;
  rubric: Array<{
    id: string;
    label: string;
    maxScore: number;
  }>;
  status: "open" | "archived";
  createdAt: string;
};

type SharedScorePayload = {
  share: {
    id: string;
    permission: "view" | "comment" | "edit";
    label: string | null;
    expiresAt: string | null;
    revokedAt: string | null;
  };
  score: {
    id: string;
    title: string;
    status: string;
    currentRevisionId: string | null;
    updatedAt: string;
    currentRevision: {
      id: string;
      revisionNumber: number;
      scoreJson: ScoreJson;
      createdFrom: string;
      createdAt: string;
    } | null;
  };
  assignments: SharedAssignment[];
  comments: ScoreAnnotation[];
  musicXml: string | null;
  jianpu: JianpuDocument | null;
};

type SharedAssignmentScorePayload = {
  assignmentId: string;
  revisionId: string | null;
  revisionNumber: number | null;
  scoreJson: ScoreJson;
  musicXml: string;
  jianpu: JianpuDocument;
};

type SharedAssignmentSubmissionPayload = {
  submission: {
    id: string;
    assignmentId: string;
    assignmentTitle: string | null;
    status: "submitted" | "reviewed";
    teacherFeedback: string | null;
    gradeScore: number | null;
    gradeMax: number | null;
    rubricScores: Array<{
      criterionId: string;
      score: number;
    }>;
    reviewToken: string | null;
    performanceFileId: string | null;
    performanceFile: {
      id: string;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
      createdAt: string;
    } | null;
    practiceSettings: AssignmentPracticeSettings | null;
    performanceAnalysis: PracticePerformanceAnalysis | null;
    submittedAt: string;
  };
  performanceComments?: SharedPerformanceComment[];
};

type SharedPerformanceComment = {
  id: string;
  body: string;
  target: Record<string, unknown> | null;
  createdAt: string;
};

type ReviewSubmission = SharedAssignmentSubmissionPayload["submission"] & {
  performanceComments: SharedPerformanceComment[];
};

type SubmissionForm = {
  submitterName: string;
  submitterContact: string;
  note: string;
  recordingUrl: string;
  practiceMinutes: string;
};

const EMPTY_SUBMISSION_FORM: SubmissionForm = {
  submitterName: "",
  submitterContact: "",
  note: "",
  recordingUrl: "",
  practiceMinutes: "",
};

export function SharedScoreViewer() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const reviewPreviewUrlRef = useRef<Record<string, string>>({});
  const reviewMediaRef = useRef<Record<string, HTMLAudioElement | HTMLVideoElement | null>>({});
  const { locale } = useAppLocale();
  const [payload, setPayload] = useState<SharedScorePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submissionForms, setSubmissionForms] = useState<Record<string, SubmissionForm>>({});
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState<string | null>(null);
  const [submissionFiles, setSubmissionFiles] = useState<Record<string, File | null>>({});
  const [submissionAnalyses, setSubmissionAnalyses] = useState<Record<string, PracticePerformanceAnalysis | null>>({});
  const [submissionStatus, setSubmissionStatus] = useState<Record<string, { kind: "success" | "error"; message: string }>>({});
  const [reviewTokens, setReviewTokens] = useState<string[]>([]);
  const [reviewSubmissions, setReviewSubmissions] = useState<Record<string, ReviewSubmission>>({});
  const [reviewPreviewUrls, setReviewPreviewUrls] = useState<Record<string, string>>({});
  const [reviewPreviewLoadingToken, setReviewPreviewLoadingToken] = useState<string | null>(null);
  const [reviewPreviewErrors, setReviewPreviewErrors] = useState<Record<string, string>>({});
  const [playbackPracticeSettings, setPlaybackPracticeSettings] = useState(DEFAULT_PLAYBACK_PRACTICE_SETTINGS);
  const [playbackAssignmentId, setPlaybackAssignmentId] = useState<string | null>(null);
  const [assignmentScore, setAssignmentScore] = useState<SharedAssignmentScorePayload | null>(null);
  const [assignmentScoreLoadingId, setAssignmentScoreLoadingId] = useState<string | null>(null);
  const [assignmentScoreError, setAssignmentScoreError] = useState<string | null>(null);
  const [selectedPracticeEventId, setSelectedPracticeEventId] = useState<string | null>(null);

  async function refreshSharedScore() {
    const result = await apiRequest<SharedScorePayload>(`/api/scores/shared/${token}`);
    if (!result.ok) {
      setError(result.error || copy.missing);
      return;
    }
    setAssignmentScore(null);
    setPlaybackAssignmentId(null);
    setPayload(result.data);
  }

  const copy =
    locale === "zh-CN"
      ? {
          loading: "正在加载分享乐谱...",
          missing: "分享链接不可用或已撤销。",
          back: "打开工作台",
          shared: "分享乐谱",
          revision: "当前版本",
          preview: "五线谱预览",
          previewEmpty: "当前分享还没有可渲染的 MusicXML。",
          previewLoading: "正在渲染五线谱...",
          previewError: "五线谱预览渲染失败。",
          jianpu: "简谱预览",
          summary: "结构化摘要",
          parts: "声部",
          measures: "小节",
          notes: "音符",
          rests: "休止符",
        }
      : {
          loading: "Loading shared score...",
          missing: "This share link is unavailable or has been revoked.",
          back: "Open studio",
          shared: "Shared score",
          revision: "Current revision",
          preview: "Staff preview",
          previewEmpty: "This share does not have renderable MusicXML yet.",
          previewLoading: "Rendering staff notation...",
          previewError: "Staff preview could not be rendered.",
          jianpu: "Jianpu preview",
          summary: "Structured summary",
          parts: "Parts",
          measures: "Measures",
          notes: "Notes",
          rests: "Rests",
        };

  const assignmentCopy =
    locale === "zh-CN"
      ? {
          assignments: "练习作业",
          assignmentOpen: "进行中",
          assignmentArchived: "已归档",
          dueAt: "截止时间",
          noDue: "无截止时间",
          submitterName: "姓名",
          submitterContact: "联系方式",
          practiceMinutes: "练习分钟",
          recordingUrl: "录音/视频链接",
          performanceFile: "上传演奏文件",
          performanceFileHint: "支持音频或常见视频文件，最大 100MB",
          note: "练习反馈",
          namePlaceholder: "填写你的姓名",
          contactPlaceholder: "邮箱、微信或老师要求的联系方式",
          recordingPlaceholder: "https://...",
          rubric: "评分细则",
          rubricEmpty: "未设置评分细则。",
          notePlaceholder: "写下练习速度、难点、已完成范围或给老师的问题...",
          submit: "提交作业",
          submitting: "正在提交...",
          submitSuccess: "作业已提交，老师可以在工程页查看。",
          submitFailed: "作业提交失败。",
        }
      : {
          assignments: "Practice assignments",
          assignmentOpen: "Open",
          assignmentArchived: "Archived",
          dueAt: "Due",
          noDue: "No due date",
          submitterName: "Name",
          submitterContact: "Contact",
          practiceMinutes: "Practice minutes",
          recordingUrl: "Recording/video link",
          performanceFile: "Upload performance file",
          performanceFileHint: "Audio or common video files, up to 100MB",
          note: "Practice note",
          namePlaceholder: "Enter your name",
          contactPlaceholder: "Email, phone, or teacher-requested contact",
          recordingPlaceholder: "https://...",
          rubric: "Rubric",
          rubricEmpty: "No rubric criteria set.",
          notePlaceholder: "Share tempo, hard spots, completed range, or a question for your teacher...",
          submit: "Submit assignment",
          submitting: "Submitting...",
          submitSuccess: "Assignment submitted. Your teacher can review it in the score project.",
          submitFailed: "Assignment submission failed.",
        };

  const reviewCopy =
    locale === "zh-CN"
      ? {
          title: "我的提交反馈",
          submitted: "已提交",
          reviewed: "已批阅",
          feedback: "老师反馈",
          timedFeedback: "演奏时间点反馈",
          performanceFile: "我的演奏文件",
          loadPerformancePreview: "加载演奏回放",
          loadingPerformancePreview: "正在加载回放...",
          performancePreviewFailed: "演奏文件回放加载失败。",
          seekTimedFeedback: "跳到此处",
          grade: "评分",
          waiting: "等待老师批阅。",
          empty: "提交作业后，这里会显示老师反馈。",
        }
      : {
          title: "My submission feedback",
          submitted: "Submitted",
          reviewed: "Reviewed",
          feedback: "Teacher feedback",
          timedFeedback: "Timed performance feedback",
          performanceFile: "My performance file",
          loadPerformancePreview: "Load performance playback",
          loadingPerformancePreview: "Loading playback...",
          performancePreviewFailed: "Could not load performance playback.",
          seekTimedFeedback: "Jump to this time",
          grade: "Grade",
          waiting: "Waiting for teacher review.",
          empty: "After you submit an assignment, teacher feedback will appear here.",
        };

  useEffect(() => {
    let active = true;

    async function loadSharedScore() {
      const result = await apiRequest<SharedScorePayload>(`/api/scores/shared/${token}`);

      if (!active) {
        return;
      }

      setLoading(false);
      if (!result.ok) {
        setError(result.error || copy.missing);
        return;
      }

      setPayload(result.data);
    }

    void loadSharedScore();

    return () => {
      active = false;
    };
  }, [copy.missing, token]);

  useEffect(() => {
    if (!token || typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(reviewStorageKey(token));
    if (!stored) {
      setReviewTokens([]);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as unknown;
      setReviewTokens(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []);
    } catch {
      setReviewTokens([]);
    }
  }, [token]);

  useEffect(() => {
    if (!token || reviewTokens.length === 0) {
      return;
    }

    let cancelled = false;

    async function loadReviews() {
      const loaded: Record<string, ReviewSubmission> = {};
      for (const reviewToken of reviewTokens) {
        const result = await apiRequest<SharedAssignmentSubmissionPayload>(`/api/scores/shared/${token}/submission-reviews/${reviewToken}`);
        if (result.ok && result.data.submission.reviewToken) {
          loaded[result.data.submission.reviewToken] = {
            ...result.data.submission,
            performanceComments: result.data.performanceComments ?? [],
          };
        }
      }

      if (!cancelled) {
        setReviewSubmissions(loaded);
      }
    }

    void loadReviews();

    return () => {
      cancelled = true;
    };
  }, [reviewTokens, token]);

  useEffect(() => {
    return () => {
      for (const url of Object.values(reviewPreviewUrlRef.current)) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  if (loading) {
    return <div className="empty-state">{copy.loading}</div>;
  }

  if (error || !payload) {
    return (
      <div className="surface-panel stack-lg">
        <p className="form-status error">{error ?? copy.missing}</p>
        <Link href={APP_ROUTES.dashboard} className="button button-secondary">
          {copy.back}
        </Link>
      </div>
    );
  }

  const scoreJson = assignmentScore?.scoreJson ?? payload.score.currentRevision?.scoreJson;
  const musicXml = assignmentScore?.musicXml ?? payload.musicXml;
  const jianpu = assignmentScore?.jianpu ?? payload.jianpu;

  function submissionFormFor(assignmentId: string) {
    return submissionForms[assignmentId] ?? EMPTY_SUBMISSION_FORM;
  }

  function updateSubmissionForm(assignmentId: string, field: keyof SubmissionForm, value: string) {
    setSubmissionForms((current) => ({
      ...current,
      [assignmentId]: {
        ...EMPTY_SUBMISSION_FORM,
        ...(current[assignmentId] ?? {}),
        [field]: value,
      },
    }));
  }

  function updateSubmissionFile(assignmentId: string, file: File | null) {
    setSubmissionFiles((current) => ({
      ...current,
      [assignmentId]: file,
    }));
  }

  async function applyAssignmentPracticePreset(assignment: SharedAssignment) {
    if (assignment.practiceSettings) {
      setPlaybackPracticeSettings(assignment.practiceSettings);
    }
    setPlaybackAssignmentId(assignment.id);

    setAssignmentScoreLoadingId(assignment.id);
    setAssignmentScoreError(null);
    const result = await apiRequest<SharedAssignmentScorePayload>(`/api/scores/shared/${token}/assignments/${assignment.id}/score`);
    setAssignmentScoreLoadingId(null);

    if (!result.ok) {
      setAssignmentScoreError(result.error || "Could not load the assignment score version.");
      return;
    }

    setAssignmentScore(result.data);
  }

  async function loadReviewPerformancePreview(reviewToken: string, submission: ReviewSubmission) {
    if (!submission.performanceFile) {
      return null;
    }

    const existingUrl = reviewPreviewUrls[reviewToken];
    if (existingUrl) {
      return existingUrl;
    }

    setReviewPreviewLoadingToken(reviewToken);
    setReviewPreviewErrors((current) => {
      const next = { ...current };
      delete next[reviewToken];
      return next;
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/scores/shared/${token}/submission-reviews/${reviewToken}/performance-file`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(reviewCopy.performancePreviewFailed);
      }

      const blob = await response.blob();
      const previewUrl = URL.createObjectURL(blob);
      const previousUrl = reviewPreviewUrlRef.current[reviewToken];
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }

      reviewPreviewUrlRef.current[reviewToken] = previewUrl;
      setReviewPreviewUrls((current) => ({
        ...current,
        [reviewToken]: previewUrl,
      }));
      return previewUrl;
    } catch (error) {
      setReviewPreviewErrors((current) => ({
        ...current,
        [reviewToken]: error instanceof Error ? error.message : reviewCopy.performancePreviewFailed,
      }));
      return null;
    } finally {
      setReviewPreviewLoadingToken(null);
    }
  }

  async function seekReviewPerformance(reviewToken: string, submission: ReviewSubmission, timeSeconds: number) {
    let media = reviewMediaRef.current[submission.id];
    if (!media) {
      const previewUrl = await loadReviewPerformancePreview(reviewToken, submission);
      if (!previewUrl) {
        return;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 0));
      media = reviewMediaRef.current[submission.id];
    }

    if (!media) {
      return;
    }

    media.currentTime = Math.max(0, timeSeconds);
    await media.play().catch(() => undefined);
  }

  async function handleSubmitAssignment(event: FormEvent<HTMLFormElement>, assignment: SharedAssignment) {
    event.preventDefault();

    const form = submissionFormFor(assignment.id);
    if (!form.submitterName.trim()) {
      setSubmissionStatus((current) => ({
        ...current,
        [assignment.id]: { kind: "error", message: assignmentCopy.submitFailed },
      }));
      return;
    }

    const practiceMinutes = form.practiceMinutes.trim() ? Number(form.practiceMinutes) : null;
    const performanceFile = submissionFiles[assignment.id] ?? null;
    setSubmittingAssignmentId(assignment.id);
    setSubmissionStatus((current) => {
      const next = { ...current };
      delete next[assignment.id];
      return next;
    });

    let result;
    if (performanceFile) {
      const body = new FormData();
      body.append("submitterName", form.submitterName);
      body.append("submitterContact", form.submitterContact);
      body.append("note", form.note);
      body.append("recordingUrl", form.recordingUrl);
      body.append("practiceMinutes", Number.isFinite(practiceMinutes) && practiceMinutes !== null ? String(practiceMinutes) : "");
      body.append("practiceSettings", JSON.stringify(playbackPracticeSettings));
      if (submissionAnalyses[assignment.id]) body.append("performanceAnalysis", JSON.stringify(submissionAnalyses[assignment.id]));
      body.append("performanceFile", performanceFile);

      try {
        const response = await fetch(`${API_BASE_URL}/api/scores/shared/${token}/assignments/${assignment.id}/submissions/performance`, {
          method: "POST",
          body,
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);
        result = response.ok
          ? ({ ok: true, data: payload as SharedAssignmentSubmissionPayload } as const)
          : ({ ok: false, error: payload?.error ?? assignmentCopy.submitFailed } as const);
      } catch (error) {
        result = { ok: false, error: error instanceof Error ? error.message : assignmentCopy.submitFailed } as const;
      }
    } else {
      result = await apiRequest<SharedAssignmentSubmissionPayload>(`/api/scores/shared/${token}/assignments/${assignment.id}/submissions`, {
        method: "POST",
        body: JSON.stringify({
          submitterName: form.submitterName,
          submitterContact: form.submitterContact,
          note: form.note,
          recordingUrl: form.recordingUrl,
          practiceMinutes: Number.isFinite(practiceMinutes) ? practiceMinutes : null,
          practiceSettings: playbackPracticeSettings,
          performanceAnalysis: submissionAnalyses[assignment.id] ?? null,
        }),
      });
    }
    setSubmittingAssignmentId(null);

    if (!result.ok) {
      setSubmissionStatus((current) => ({
        ...current,
        [assignment.id]: { kind: "error", message: result.error || assignmentCopy.submitFailed },
      }));
      return;
    }

    setSubmissionForms((current) => ({
      ...current,
      [assignment.id]: EMPTY_SUBMISSION_FORM,
    }));
    setSubmissionFiles((current) => ({
      ...current,
      [assignment.id]: null,
    }));
    setSubmissionAnalyses((current) => ({ ...current, [assignment.id]: null }));
    if (result.data.submission.reviewToken) {
      const nextTokens = Array.from(new Set([...reviewTokens, result.data.submission.reviewToken]));
      setReviewTokens(nextTokens);
      setReviewSubmissions((current) => ({
        ...current,
        [result.data.submission.reviewToken!]: {
          ...result.data.submission,
          performanceComments: result.data.performanceComments ?? [],
        },
      }));
      if (typeof window !== "undefined") {
        window.localStorage.setItem(reviewStorageKey(token), JSON.stringify(nextTokens));
      }
    }
    setSubmissionStatus((current) => ({
      ...current,
      [assignment.id]: { kind: "success", message: assignmentCopy.submitSuccess },
    }));
  }

  return (
    <div className="page-stack">
      <div className="page-banner split">
        <div className="stack-md">
          <p className="eyebrow">{copy.shared}</p>
          <h1 className="page-title">{payload.score.title}</h1>
          <p className="body-copy large">
            {copy.revision}: {payload.score.currentRevision?.revisionNumber ?? 0} | {formatLocal(payload.score.updatedAt, locale)}
          </p>
        </div>
        <div className="page-banner-actions">
          <Link href={APP_ROUTES.dashboard} className="button button-secondary">
            {copy.back}
          </Link>
        </div>
      </div>

      {payload.assignments.length > 0 ? (
        <section className="surface-panel stack-lg">
          <div className="stack-sm">
            <p className="eyebrow">{assignmentCopy.assignments}</p>
            <h2 className="card-title">{assignmentCopy.assignments}</h2>
          </div>
          <div className="list-grid">
            {payload.assignments.map((assignment) => {
              const form = submissionFormFor(assignment.id);
              const selectedPerformanceFile = submissionFiles[assignment.id] ?? null;
              const isOpen = assignment.status === "open";
              const status = submissionStatus[assignment.id];

              return (
                <div key={assignment.id} className="list-item">
                  <div className="list-item-content">
                    <p className="item-title">
                      {assignment.title}{" "}
                      <span className={`status-chip ${isOpen ? "tone-cyan" : "tone-amber"}`}>
                        {isOpen ? assignmentCopy.assignmentOpen : assignmentCopy.assignmentArchived}
                      </span>
                    </p>
                    <p className="item-meta">
                      {assignmentCopy.dueAt}: {assignment.dueAt ? formatLocal(assignment.dueAt, locale) : assignmentCopy.noDue}
                    </p>
                    {assignment.instructions ? <p className="body-copy">{assignment.instructions}</p> : null}
                    {assignment.rubric.length > 0 ? (
                      <p className="item-meta">
                        {assignmentCopy.rubric}: {assignment.rubric.map((criterion) => `${criterion.label} / ${criterion.maxScore}`).join(" | ")}
                      </p>
                    ) : null}
                    {assignment.practiceSettings ? (
                      <p className="item-meta">Practice preset: {formatAssignmentPracticeSettings(assignment.practiceSettings, scoreJson)}</p>
                    ) : null}
                  </div>
                  {assignment.practiceSettings ? (
                    <div className="button-row">
                      <button
                        type="button"
                        className="button button-secondary button-ghost"
                        onClick={() => void applyAssignmentPracticePreset(assignment)}
                        disabled={assignmentScoreLoadingId === assignment.id}
                      >
                        {assignmentScoreLoadingId === assignment.id ? "Loading score version..." : "Apply practice preset"}
                      </button>
                    </div>
                  ) : null}
                  {isOpen ? (
                    <form className="stack-sm" onSubmit={(event) => void handleSubmitAssignment(event, assignment)}>
                      <div className="form-grid">
                        <label className="field-group">
                          <span>{assignmentCopy.submitterName}</span>
                          <input
                            className="field-control"
                            type="text"
                            maxLength={120}
                            placeholder={assignmentCopy.namePlaceholder}
                            value={form.submitterName}
                            onChange={(event) => updateSubmissionForm(assignment.id, "submitterName", event.target.value)}
                          />
                        </label>
                        <label className="field-group">
                          <span>{assignmentCopy.practiceMinutes}</span>
                          <input
                            className="field-control"
                            type="number"
                            min={0}
                            max={10000}
                            value={form.practiceMinutes}
                            onChange={(event) => updateSubmissionForm(assignment.id, "practiceMinutes", event.target.value)}
                          />
                        </label>
                      </div>
                      <label className="field-group wide">
                        <span>{assignmentCopy.submitterContact}</span>
                        <input
                          className="field-control"
                          type="text"
                          maxLength={200}
                          placeholder={assignmentCopy.contactPlaceholder}
                          value={form.submitterContact}
                          onChange={(event) => updateSubmissionForm(assignment.id, "submitterContact", event.target.value)}
                        />
                      </label>
                      <PracticeRecorder
                        locale={locale}
                        value={selectedPerformanceFile}
                        playbackEndpoint={`/api/scores/shared/${token}/assignments/${assignment.id}/playback`}
                        practiceSettings={playbackPracticeSettings}
                        selectedEventId={selectedPracticeEventId}
                        onEventSelect={setSelectedPracticeEventId}
                        onAnalysis={(analysis) => setSubmissionAnalyses((current) => ({ ...current, [assignment.id]: analysis }))}
                        onRecording={(file) => updateSubmissionFile(assignment.id, file)}
                      />
                      <label className="field-group wide">
                        <span>{assignmentCopy.recordingUrl}</span>
                        <input
                          className="field-control"
                          type="url"
                          maxLength={500}
                          placeholder={assignmentCopy.recordingPlaceholder}
                          value={form.recordingUrl}
                          onChange={(event) => updateSubmissionForm(assignment.id, "recordingUrl", event.target.value)}
                        />
                      </label>
                      <label className="field-group wide">
                        <span>{assignmentCopy.performanceFile}</span>
                        <input
                          className="field-control"
                          type="file"
                          accept="audio/*,video/mp4,video/quicktime,video/webm"
                          onChange={(event) => updateSubmissionFile(assignment.id, event.target.files?.[0] ?? null)}
                        />
                        <span className="helper-copy">
                          {selectedPerformanceFile
                            ? `${selectedPerformanceFile.name} | ${formatSize(selectedPerformanceFile.size)}`
                            : assignmentCopy.performanceFileHint}
                        </span>
                      </label>
                      <label className="field-group wide">
                        <span>{assignmentCopy.note}</span>
                        <textarea
                          className="field-control"
                          rows={4}
                          maxLength={2000}
                          placeholder={assignmentCopy.notePlaceholder}
                          value={form.note}
                          onChange={(event) => updateSubmissionForm(assignment.id, "note", event.target.value)}
                        />
                      </label>
                      {status ? <p className={`form-status ${status.kind}`}>{status.message}</p> : null}
                      <div className="button-row">
                        <button type="submit" className="button button-primary" disabled={submittingAssignmentId === assignment.id}>
                          {submittingAssignmentId === assignment.id ? assignmentCopy.submitting : assignmentCopy.submit}
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="stack-sm">
            <h3 className="card-title">{reviewCopy.title}</h3>
            {reviewTokens.length === 0 ? <div className="empty-state">{reviewCopy.empty}</div> : null}
            {reviewTokens.length > 0 ? (
              <div className="list-grid">
                {reviewTokens.map((reviewToken) => {
                  const submission = reviewSubmissions[reviewToken];
                  return (
                    <div key={reviewToken} className="list-item">
                      <div className="list-item-content">
                        <p className="item-title">
                          {submission?.assignmentTitle ?? reviewCopy.title}{" "}
                          <span className={`status-chip ${submission?.status === "reviewed" ? "tone-cyan" : "tone-amber"}`}>
                            {submission?.status === "reviewed" ? reviewCopy.reviewed : reviewCopy.submitted}
                          </span>
                        </p>
                        <p className="item-meta">{submission ? formatLocal(submission.submittedAt, locale) : reviewCopy.waiting}</p>
                        {submission?.gradeScore !== null || submission?.gradeMax !== null ? (
                          <p className="item-meta">
                            {reviewCopy.grade}: {submission?.gradeScore ?? "-"} / {submission?.gradeMax ?? "-"}
                          </p>
                        ) : null}
                        {submission?.practiceSettings ? (
                          <p className="item-meta">Submitted practice: {formatAssignmentPracticeSettings(submission.practiceSettings, scoreJson)}</p>
                        ) : null}
                        {submission?.teacherFeedback ? (
                          <p className="body-copy">
                            {reviewCopy.feedback}: {submission.teacherFeedback}
                          </p>
                        ) : (
                          <p className="body-copy">{reviewCopy.waiting}</p>
                        )}
                        {submission?.performanceFile ? (
                          <div className="stack-sm">
                            <div className="button-row">
                              <span className="item-meta">
                                {reviewCopy.performanceFile}: {submission.performanceFile.originalName} | {formatSize(submission.performanceFile.sizeBytes)}
                              </span>
                              <button
                                type="button"
                                className="button button-secondary button-ghost"
                                onClick={() => void loadReviewPerformancePreview(reviewToken, submission)}
                                disabled={reviewPreviewLoadingToken === reviewToken}
                              >
                                {reviewPreviewLoadingToken === reviewToken ? reviewCopy.loadingPerformancePreview : reviewCopy.loadPerformancePreview}
                              </button>
                            </div>
                            {reviewPreviewErrors[reviewToken] ? <p className="form-status error">{reviewPreviewErrors[reviewToken]}</p> : null}
                            {reviewPreviewUrls[reviewToken] ? (
                              submission.performanceFile.mimeType.startsWith("video/") ? (
                                <video
                                  className="field-control"
                                  controls
                                  src={reviewPreviewUrls[reviewToken]}
                                  ref={(element) => {
                                    reviewMediaRef.current[submission.id] = element;
                                  }}
                                />
                              ) : (
                                <AudioWaveformPlayer
                                  src={reviewPreviewUrls[reviewToken]}
                                  locale={locale}
                                  markers={submission.performanceComments.map(performanceCommentTime)}
                                  ref={(element) => {
                                    reviewMediaRef.current[submission.id] = element;
                                  }}
                                />
                              )
                            ) : null}
                          </div>
                        ) : null}
                        {submission?.performanceComments.length ? (
                          <div className="stack-xs">
                            <p className="item-title">{reviewCopy.timedFeedback}</p>
                            {submission.performanceComments
                              .slice()
                              .sort((left, right) => performanceCommentTime(left) - performanceCommentTime(right))
                              .map((comment) => (
                                <div className="button-row" key={comment.id}>
                                  <span className="body-copy">
                                    {formatDuration(performanceCommentTime(comment))}: {comment.body}
                                  </span>
                                  {submission.performanceFile ? (
                                    <button
                                      type="button"
                                      className="button button-secondary button-ghost"
                                      onClick={() => void seekReviewPerformance(reviewToken, submission, performanceCommentTime(comment))}
                                    >
                                      {reviewCopy.seekTimedFeedback}
                                    </button>
                                  ) : null}
                                </div>
                              ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {payload.share.permission === "edit" && payload.score.currentRevision?.scoreJson && payload.score.currentRevisionId ? (
        <ScoreVisualEditorPanel
          scoreId={payload.score.id}
          token={null}
          shareToken={token}
          scoreJson={payload.score.currentRevision.scoreJson}
          baseRevisionId={payload.score.currentRevisionId}
          selectedEventId={selectedPracticeEventId}
          onSelectedEventChange={setSelectedPracticeEventId}
          onUpdated={() => refreshSharedScore()}
          onReload={() => refreshSharedScore()}
        />
      ) : null}

      {(payload.share.permission === "comment" || payload.share.permission === "edit") && scoreJson ? (
        <ScoreAnnotationWorkspace
          shareToken={token}
          permission={payload.share.permission}
          scoreJson={scoreJson}
          annotations={payload.comments}
          selectedEventId={selectedPracticeEventId}
          onSelectedEventChange={setSelectedPracticeEventId}
          onAnnotationsChange={(comments) => setPayload((current) => current ? { ...current, comments } : current)}
          locale={locale}
        />
      ) : null}

      {scoreJson ? (
        <ScorePlaybackPanel
          key={playbackAssignmentId ? `assignment:${playbackAssignmentId}` : (payload.score.currentRevisionId ?? payload.score.id)}
          scoreId={payload.score.id}
          token={null}
          playbackEndpoint={
            playbackAssignmentId ? `/api/scores/shared/${token}/assignments/${playbackAssignmentId}/playback` : `/api/scores/shared/${token}/playback`
          }
          revisionId={playbackAssignmentId ? (payload.assignments.find((assignment) => assignment.id === playbackAssignmentId)?.revisionId ?? null) : payload.score.currentRevisionId}
          practiceSettings={playbackPracticeSettings}
          onPracticeSettingsChange={setPlaybackPracticeSettings}
        />
      ) : null}

      {assignmentScoreError ? <p className="form-status error">{assignmentScoreError}</p> : null}
      {assignmentScore ? (
        <p className="form-status success">
          Showing assignment score version {assignmentScore.revisionNumber ?? assignmentScore.revisionId ?? assignmentScore.assignmentId}.
        </p>
      ) : null}

      <section className="surface-panel stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">MusicXML</p>
          <h2 className="card-title">{copy.preview}</h2>
        </div>
        <ScoreMusicXmlPreview
          fileId={null}
          token={null}
          musicXml={musicXml}
          scoreJson={scoreJson}
          selectedEventId={selectedPracticeEventId}
          onEventSelect={setSelectedPracticeEventId}
          emptyLabel={copy.previewEmpty}
          loadingLabel={copy.previewLoading}
          errorLabel={copy.previewError}
        />
      </section>

      {jianpu ? (
        <section className="surface-panel stack-lg">
          <div className="stack-sm">
            <p className="eyebrow">Jianpu</p>
            <h2 className="card-title">{copy.jianpu}</h2>
          </div>
          <div className="jianpu-preview">
            <div className="jianpu-meta">
              <span>
                1={jianpu.key.tonic} ({jianpu.key.mode})
              </span>
              <span>{jianpu.metadata.sourceRevisionParser}</span>
            </div>
            <pre className="jianpu-block">{jianpu.text}</pre>
          </div>
        </section>
      ) : null}

      {scoreJson ? (
        <section className="surface-panel stack-lg">
          <div className="stack-sm">
            <p className="eyebrow">Score JSON</p>
            <h2 className="card-title">{copy.summary}</h2>
          </div>
          <div className="score-summary-grid">
            <div className="mini-card stack-xs">
              <p className="metric-label">{copy.parts}</p>
              <p className="metric-value compact">{scoreJson.parts.length}</p>
            </div>
            <div className="mini-card stack-xs">
              <p className="metric-label">{copy.measures}</p>
              <p className="metric-value compact">{scoreJson.metadata.measureCount}</p>
            </div>
            <div className="mini-card stack-xs">
              <p className="metric-label">{copy.notes}</p>
              <p className="metric-value compact">{scoreJson.metadata.noteCount}</p>
            </div>
            <div className="mini-card stack-xs">
              <p className="metric-label">{copy.rests}</p>
              <p className="metric-value compact">{scoreJson.metadata.restCount}</p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function formatLocal(value: string, locale: string) {
  return new Date(value).toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US");
}

function formatSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function performanceCommentTime(comment: SharedPerformanceComment) {
  const timeSeconds = comment.target?.timeSeconds;
  return typeof timeSeconds === "number" && Number.isFinite(timeSeconds) ? timeSeconds : 0;
}

function formatDuration(timeSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(timeSeconds) ? timeSeconds : 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
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

function formatScorePartIds(partIds: string[], scoreJson: ScoreJson | undefined) {
  const partNames = new Map(scoreJson?.parts.map((part) => [part.id, part.name]) ?? []);
  return partIds.map((partId) => partNames.get(partId) ?? partId).join(", ");
}

function reviewStorageKey(token: string) {
  return `score-shared-review-tokens:${token}`;
}
