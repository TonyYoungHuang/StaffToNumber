"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatDateTime, formatMessage, formatNumber, type SupportedLocale } from "@score/i18n";
import { APP_ROUTES } from "@score/shared";
import type { AssignmentPracticeSettings, JianpuDocument, ScoreJson } from "@score/shared";
import { API_BASE_URL, apiRequest } from "../lib/api";
import { useScoreSharingMessages } from "../lib/score-sharing-messages/client";
import type { ScoreSharingMessages } from "../lib/score-sharing-messages/types";
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
  const { locale, messages } = useScoreSharingMessages();
  const copy = messages.viewer;
  const assignmentCopy = messages.assignments;
  const practiceCopy = messages.practice;
  const reviewCopy = messages.reviews;
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
      setError(result.error);
      return;
    }
    setAssignmentScore(null);
    setPlaybackAssignmentId(null);
    setPayload(result.data);
  }

  useEffect(() => {
    let active = true;

    async function loadSharedScore() {
      const result = await apiRequest<SharedScorePayload>(`/api/scores/shared/${token}`);

      if (!active) {
        return;
      }

      setLoading(false);
      if (!result.ok) {
        setError(result.error);
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
    return <div className="empty-state" role="status" aria-label={copy.loadingAria}>{copy.loading}</div>;
  }

  if (error || !payload) {
    return (
      <div className="surface-panel stack-lg">
        <p className="form-status error" role="alert">{error ?? copy.missing}</p>
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
      setAssignmentScoreError(result.error);
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
        const failure = await response.json().catch(() => null) as { error?: string } | null;
        setReviewPreviewErrors((current) => ({
          ...current,
          [reviewToken]: failure?.error ?? reviewCopy.performancePreviewFailed,
        }));
        return null;
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
    } catch {
      setReviewPreviewErrors((current) => ({
        ...current,
        [reviewToken]: reviewCopy.performancePreviewFailed,
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
        [assignment.id]: { kind: "error", message: assignmentCopy.nameRequired },
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
        const payload = await response.json().catch(() => null) as (SharedAssignmentSubmissionPayload & { error?: string }) | null;
        result = response.ok
          ? ({ ok: true, data: payload as SharedAssignmentSubmissionPayload } as const)
          : ({ ok: false, error: payload?.error ?? assignmentCopy.submitFailed } as const);
      } catch {
        result = { ok: false, error: assignmentCopy.submitFailed } as const;
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
        [assignment.id]: { kind: "error", message: result.error },
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
            {copy.revision}: {formatNumber(payload.score.currentRevision?.revisionNumber ?? 0, locale)} | {formatDateTime(payload.score.updatedAt, locale)}
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
            <p className="eyebrow">{assignmentCopy.title}</p>
            <h2 className="card-title">{assignmentCopy.title}</h2>
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
                        {assignmentCopy.statuses[assignment.status]}
                      </span>
                    </p>
                    <p className="item-meta">
                      {assignmentCopy.dueAt}: {assignment.dueAt ? formatDateTime(assignment.dueAt, locale) : assignmentCopy.noDue}
                    </p>
                    {assignment.instructions ? <p className="body-copy">{assignment.instructions}</p> : null}
                    {assignment.rubric.length > 0 ? (
                      <p className="item-meta">
                        {assignmentCopy.rubric}: {assignment.rubric.map((criterion) => `${criterion.label} / ${formatNumber(criterion.maxScore, locale)}`).join(" | ")}
                      </p>
                    ) : null}
                    {assignment.practiceSettings ? (
                      <p className="item-meta">{assignmentCopy.practicePreset}: {formatAssignmentPracticeSettings(assignment.practiceSettings, scoreJson, practiceCopy, locale)}</p>
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
                        {assignmentScoreLoadingId === assignment.id ? assignmentCopy.loadingScore : assignmentCopy.loadScore}
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
                          aria-label={assignmentCopy.performanceFileAria}
                          onChange={(event) => updateSubmissionFile(assignment.id, event.target.files?.[0] ?? null)}
                        />
                        <span className="helper-copy">
                          {selectedPerformanceFile
                            ? `${selectedPerformanceFile.name} | ${formatSize(selectedPerformanceFile.size, locale)}`
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
                      {status ? <p className={`form-status ${status.kind}`} role="status" aria-label={assignmentCopy.statusAria}>{status.message}</p> : null}
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
                            {reviewCopy.statuses[submission?.status ?? "submitted"]}
                          </span>
                        </p>
                        <p className="item-meta">{submission ? formatDateTime(submission.submittedAt, locale) : reviewCopy.waiting}</p>
                        {submission?.gradeScore !== null || submission?.gradeMax !== null ? (
                          <p className="item-meta">
                            {reviewCopy.grade}: {formatOptionalNumber(submission?.gradeScore, locale)} / {formatOptionalNumber(submission?.gradeMax, locale)}
                          </p>
                        ) : null}
                        {submission?.practiceSettings ? (
                          <p className="item-meta">{assignmentCopy.submittedPractice}: {formatAssignmentPracticeSettings(submission.practiceSettings, scoreJson, practiceCopy, locale)}</p>
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
                                {reviewCopy.performanceFile}: {submission.performanceFile.originalName} | {formatSize(submission.performanceFile.sizeBytes, locale)}
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
                                  aria-label={reviewCopy.playbackAria}
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
                                    {formatDuration(performanceCommentTime(comment), locale)}: {comment.body}
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
          {formatMessage(copy.assignmentScoreShown, {
            version: formatAssignmentVersion(assignmentScore, locale),
          })}
        </p>
      ) : null}

      <section className="surface-panel stack-lg">
        <div className="stack-sm">
          <p className="eyebrow">{copy.musicXmlEyebrow}</p>
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
          retryLabel={copy.previewRetry}
          technicalDetailsLabel={copy.previewTechnicalDetails}
          deferredLabel={copy.previewDeferred}
          renderLabel={copy.previewRender}
          eventLabelTemplate={copy.previewEventLabel}
          noteLabel={copy.previewNote}
          restLabel={copy.previewRest}
        />
      </section>

      {jianpu ? (
        <section className="surface-panel stack-lg">
          <div className="stack-sm">
            <p className="eyebrow">{copy.jianpuEyebrow}</p>
            <h2 className="card-title">{copy.jianpu}</h2>
          </div>
          <div className="jianpu-preview">
            <div className="jianpu-meta">
              <span>
                1={jianpu.key.tonic} ({formatJianpuMode(jianpu.key.mode, messages.modes)})
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
            <p className="eyebrow">{copy.scoreJsonEyebrow}</p>
            <h2 className="card-title">{copy.summary}</h2>
          </div>
          <div className="score-summary-grid">
            <div className="mini-card stack-xs">
              <p className="metric-label">{copy.parts}</p>
              <p className="metric-value compact">{formatNumber(scoreJson.parts.length, locale)}</p>
            </div>
            <div className="mini-card stack-xs">
              <p className="metric-label">{copy.measures}</p>
              <p className="metric-value compact">{formatNumber(scoreJson.metadata.measureCount, locale)}</p>
            </div>
            <div className="mini-card stack-xs">
              <p className="metric-label">{copy.notes}</p>
              <p className="metric-value compact">{formatNumber(scoreJson.metadata.noteCount, locale)}</p>
            </div>
            <div className="mini-card stack-xs">
              <p className="metric-label">{copy.rests}</p>
              <p className="metric-value compact">{formatNumber(scoreJson.metadata.restCount, locale)}</p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function formatSize(sizeBytes: number, locale: SupportedLocale) {
  if (sizeBytes < 1024) {
    return `${formatNumber(sizeBytes, locale)} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${formatNumber(sizeBytes / 1024, locale, { maximumFractionDigits: 1 })} KB`;
  }

  return `${formatNumber(sizeBytes / (1024 * 1024), locale, { maximumFractionDigits: 1 })} MB`;
}

function performanceCommentTime(comment: SharedPerformanceComment) {
  const timeSeconds = comment.target?.timeSeconds;
  return typeof timeSeconds === "number" && Number.isFinite(timeSeconds) ? timeSeconds : 0;
}

function formatDuration(timeSeconds: number, locale: SupportedLocale) {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(timeSeconds) ? timeSeconds : 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${formatNumber(minutes, locale)}:${formatNumber(seconds, locale, { minimumIntegerDigits: 2, useGrouping: false })}`;
}

function formatAssignmentPracticeSettings(
  settings: AssignmentPracticeSettings,
  scoreJson: ScoreJson | undefined,
  copy: ScoreSharingMessages["practice"],
  locale: SupportedLocale,
) {
  const partList = formatScorePartIds(settings.soloPartIds.length > 0 ? settings.soloPartIds : settings.mutedPartIds, scoreJson);
  const parts =
    settings.soloPartIds.length > 0
      ? formatMessage(copy.solo, { parts: partList })
      : settings.mutedPartIds.length > 0
        ? formatMessage(copy.mute, { parts: partList })
        : copy.allParts;
  const loop = settings.loopEnabled
    ? formatMessage(copy.loop, {
        start: formatNumber(settings.loopStartBeat, locale),
        end: formatNumber(settings.loopEndBeat, locale),
      })
    : copy.fullScore;
  const helpers = [settings.metronomeEnabled ? copy.metronome : null, settings.countInEnabled ? copy.countIn : null].filter(Boolean).join(", ");
  const tempo = formatMessage(copy.tempo, { tempo: formatNumber(settings.tempoBpm, locale) });
  return `${tempo}, ${loop}, ${parts}${helpers ? `, ${helpers}` : ""}`;
}

function formatScorePartIds(partIds: string[], scoreJson: ScoreJson | undefined) {
  const partNames = new Map(scoreJson?.parts.map((part) => [part.id, part.name]) ?? []);
  return partIds.map((partId) => partNames.get(partId) ?? partId).join(", ");
}

function formatOptionalNumber(value: number | null | undefined, locale: SupportedLocale) {
  return typeof value === "number" ? formatNumber(value, locale) : "-";
}

function formatAssignmentVersion(payload: SharedAssignmentScorePayload, locale: SupportedLocale) {
  return typeof payload.revisionNumber === "number"
    ? formatNumber(payload.revisionNumber, locale)
    : (payload.revisionId ?? payload.assignmentId);
}

function formatJianpuMode(mode: string, modes: ScoreSharingMessages["modes"]) {
  return Object.prototype.hasOwnProperty.call(modes, mode)
    ? modes[mode as keyof typeof modes]
    : mode;
}

function reviewStorageKey(token: string) {
  return `score-shared-review-tokens:${token}`;
}
