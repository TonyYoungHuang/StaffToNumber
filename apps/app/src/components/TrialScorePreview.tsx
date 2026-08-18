"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { APP_ROUTES, type ScoreJson } from "@score/shared";
import { apiRequest } from "../lib/api";
import { trackFunnelEvent, trackFunnelEventOnce } from "../lib/analytics";
import { getStoredToken } from "../lib/auth-storage";
import { buildSupportTemplates } from "../lib/support";
import { accountActivationRoute } from "../lib/release";
import { useAppLocale } from "./AppLocaleProvider";
import { ScoreMusicXmlPreview } from "./ScoreMusicXmlPreview";

type TrialScore = {
  id: string;
  title: string;
  status: string;
  currentRevisionId: string | null;
  pendingRevisionId?: string | null;
  currentRevision: { scoreJson?: ScoreJson } | null;
  pendingRevision?: { scoreJson?: ScoreJson } | null;
};

type ScorePayload = { score: TrialScore };
type JobsPayload = {
  jobs: Array<{
    id: string;
    status: "queued" | "processing" | "completed" | "failed" | "cancelled";
    progressPercent: number;
    errorMessage: string | null;
  }>;
  omrDiagnostics: Array<{
    id: string;
    diagnostics: Record<string, unknown>;
    confidence: number | null;
    sourcePageCount: number | null;
    createdAt: string;
  }>;
};

export function TrialScorePreview() {
  const { locale } = useAppLocale();
  const params = useParams<{ id: string }>();
  const scoreId = params?.id;
  const token = useMemo(() => getStoredToken(), []);
  const [score, setScore] = useState<TrialScore | null>(null);
  const [job, setJob] = useState<JobsPayload["jobs"][number] | null>(null);
  const [diagnostics, setDiagnostics] = useState<JobsPayload["omrDiagnostics"]>([]);
  const [musicXml, setMusicXml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token || !scoreId) return;
    const [scoreResult, jobsResult] = await Promise.all([
      apiRequest<ScorePayload>(`/api/scores/${scoreId}`, { headers: { Authorization: `Bearer ${token}` } }),
      apiRequest<JobsPayload>(`/api/scores/${scoreId}/jobs`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (!scoreResult.ok) {
      setError(scoreResult.error);
      return;
    }
    setError(null);
    setScore(scoreResult.data.score);
    const latestJob = jobsResult.ok ? jobsResult.data.jobs[0] ?? null : null;
    setJob(latestJob);
    setDiagnostics(jobsResult.ok ? jobsResult.data.omrDiagnostics : []);

    const hasCandidate = Boolean(scoreResult.data.score.pendingRevisionId || scoreResult.data.score.pendingRevision);
    const hasCurrent = Boolean(scoreResult.data.score.currentRevisionId || scoreResult.data.score.currentRevision);
    if (!hasCandidate && !hasCurrent) {
      setMusicXml(null);
      return;
    }
    const previewPath = hasCandidate
      ? `/api/scores/${scoreId}/candidate/musicxml-preview`
      : `/api/scores/${scoreId}/musicxml-preview`;
    const preview = await apiRequest<{ musicXml: string }>(previewPath, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setMusicXml(preview.ok ? preview.data.musicXml : null);
  }, [scoreId, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!job || !["queued", "processing"].includes(job.status)) return;
    const timer = window.setInterval(() => void refresh(), 4_000);
    return () => window.clearInterval(timer);
  }, [job, refresh]);

  const scoreJson = score?.pendingRevision?.scoreJson ?? score?.currentRevision?.scoreJson ?? null;
  const latestDiagnostic = diagnostics[0] ?? null;
  const diagnosticSummary = latestDiagnostic ? summarizeTrialDiagnostic(latestDiagnostic) : null;
  const supportHref = buildSupportTemplates(locale).find((item) => item.key === "job")?.href;
  const jobLabel = job
    ? `${job.status}${job.status === "processing" ? ` · ${job.progressPercent}%` : ""}`
    : locale === "zh-CN" ? "正在读取任务" : "Loading job";

  useEffect(() => {
    if (job?.status !== "completed" || !scoreJson) return;
    trackFunnelEventOnce(`free-omr-preview-${scoreId}`, "free_omr_preview_viewed", {
      preview_type: "staff_candidate",
    });
  }, [job?.status, scoreId, scoreJson]);

  return (
    <div className="page-stack">
      <section className="page-banner split">
        <div className="stack-sm">
          <p className="eyebrow">{locale === "zh-CN" ? "免费 OMR 候选预览" : "Free OMR candidate preview"}</p>
          <h1 className="page-title">{score?.title ?? (locale === "zh-CN" ? "正在读取乐谱..." : "Loading score...")}</h1>
          <p className="body-copy large">
            {locale === "zh-CN"
              ? "识别结果是需要人工检查的候选稿。免费层可以查看五线谱预览，但下载、校对、移调和再次识别需要开通完整权限。"
              : "Recognition is a candidate that needs a musical review. The free tier can view the staff preview; downloads, correction, transposition, and another scan require full access."}
          </p>
        </div>
        <div className="stack-sm">
          <span className={`status-chip ${job?.status === "failed" ? "tone-red" : job?.status === "completed" ? "tone-green" : "tone-amber"}`}>
            {jobLabel}
          </span>
          <div className="button-row">
            <Link
              href={accountActivationRoute}
              className="button button-primary"
              onClick={() => trackFunnelEvent("upgrade_click", { source: "trial_score_preview" })}
            >
              {locale === "zh-CN" ? "开通完整功能" : "Unlock full access"}
            </Link>
            <Link href={`${APP_ROUTES.scores}#omr-import`} className="button button-secondary">
              {locale === "zh-CN" ? "返回工程库" : "Back to library"}
            </Link>
          </div>
        </div>
      </section>

      {error ? <p className="form-status error">{error}</p> : null}
      {job?.status === "failed" ? (
        <section className="surface-panel stack-sm">
          <p className="form-status error">{job.errorMessage ?? (locale === "zh-CN" ? "识别任务失败。" : "Recognition failed.")}</p>
          <p className="body-copy">
            {locale === "zh-CN"
              ? "请确认页面方向正确、谱面清晰且没有大面积阴影或裁切。免费任务失败需要人工核查额度，请不要重复付款。"
              : "Check that the page is upright, sharply focused, and not heavily shadowed or cropped. A failed free job needs a manual quota review; do not start another payment."}
          </p>
          {supportHref ? <a href={supportHref} className="button button-secondary">{locale === "zh-CN" ? "提交识别问题" : "Report recognition issue"}</a> : null}
        </section>
      ) : null}

      {diagnosticSummary ? (
        <section className="surface-panel stack-md">
          <div className="stack-sm">
            <p className="eyebrow">{locale === "zh-CN" ? "识别诊断" : "Recognition diagnostics"}</p>
            <h2 className="card-title">{locale === "zh-CN" ? "先检查置信度和警告，再决定是否开通。" : "Review confidence and warnings before you upgrade."}</h2>
            {diagnosticSummary.message ? <p className="body-copy">{diagnosticSummary.message}</p> : null}
          </div>
          <div className="metric-grid">
            <div className="metric-card">
              <p className="metric-label">{locale === "zh-CN" ? "整体置信度" : "Overall confidence"}</p>
              <p className="metric-value">{diagnosticSummary.confidence}</p>
              <p className="helper-copy">{locale === "zh-CN" ? "置信度较低时必须逐小节复核。" : "Lower confidence requires a measure-by-measure review."}</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">{locale === "zh-CN" ? "识别页数" : "Pages recognized"}</p>
              <p className="metric-value">{diagnosticSummary.pages}</p>
              <p className="helper-copy">{locale === "zh-CN" ? "免费预览最多一页。" : "The free preview is limited to one page."}</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">{locale === "zh-CN" ? "警告数量" : "Warnings"}</p>
              <p className="metric-value">{diagnosticSummary.warnings}</p>
              <p className="helper-copy">{diagnosticSummary.engine}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="surface-panel stack-md">
        <div className="stack-sm">
          <p className="eyebrow">{locale === "zh-CN" ? "五线谱预览" : "Staff preview"}</p>
          <h2 className="card-title">{locale === "zh-CN" ? "Audiveris 识别候选" : "Audiveris recognition candidate"}</h2>
        </div>
        <ScoreMusicXmlPreview
          fileId={null}
          token={token}
          musicXml={musicXml}
          scoreJson={scoreJson}
          emptyLabel={locale === "zh-CN" ? "任务完成后，候选五线谱会显示在这里。" : "The candidate staff preview will appear here when processing finishes."}
          loadingLabel={locale === "zh-CN" ? "正在渲染五线谱..." : "Rendering staff notation..."}
          errorLabel={locale === "zh-CN" ? "五线谱预览无法渲染。" : "The staff preview could not be rendered."}
        />
      </section>
    </div>
  );
}

function summarizeTrialDiagnostic(input: JobsPayload["omrDiagnostics"][number]) {
  const details = input.diagnostics;
  const warnings = Array.isArray(details.warnings) ? details.warnings.length : 0;
  const engine = typeof details.engine === "string" && details.engine.trim() ? details.engine : "OMR";
  const message = typeof details.message === "string" && details.message.trim() ? details.message : null;
  return {
    confidence: input.confidence === null ? "—" : `${Math.round(input.confidence * 100)}%`,
    pages: input.sourcePageCount ?? 1,
    warnings,
    engine,
    message,
  };
}
