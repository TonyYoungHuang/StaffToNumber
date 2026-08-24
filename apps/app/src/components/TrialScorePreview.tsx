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
import { ScoreCandidateReviewWorkspace } from "./ScoreCandidateReviewWorkspace";

type TrialRevision = {
  id: string;
  revisionNumber: number;
  musicxmlFileId: string | null;
  createdFrom: string;
  createdAt: string;
  scoreJson: ScoreJson;
};

type TrialScore = {
  id: string;
  title: string;
  status: string;
  currentRevisionId: string | null;
  pendingRevisionId?: string | null;
  currentRevision: TrialRevision | null;
  pendingRevision?: TrialRevision | null;
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
type AssetsPayload = {
  assets: Array<{
    assetKind: string;
    file: { id: string; originalName: string; mimeType: string };
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
  const [assets, setAssets] = useState<AssetsPayload["assets"]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!scoreId) return;
    const authOptions = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    const [scoreResult, jobsResult, assetsResult] = await Promise.all([
      apiRequest<ScorePayload>(`/api/scores/${scoreId}`, authOptions),
      apiRequest<JobsPayload>(`/api/scores/${scoreId}/jobs`, authOptions),
      apiRequest<AssetsPayload>(`/api/scores/${scoreId}/assets`, authOptions),
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
    setAssets(assetsResult.ok ? assetsResult.data.assets : []);

    const hasCandidate = Boolean(scoreResult.data.score.pendingRevisionId || scoreResult.data.score.pendingRevision);
    const hasCurrent = Boolean(scoreResult.data.score.currentRevisionId || scoreResult.data.score.currentRevision);
    if (!hasCandidate && !hasCurrent) {
      setMusicXml(null);
      return;
    }
    const previewPath = hasCandidate
      ? `/api/scores/${scoreId}/candidate/musicxml-preview`
      : `/api/scores/${scoreId}/musicxml-preview`;
    const preview = await apiRequest<{ musicXml: string }>(previewPath, authOptions);
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
  const diagnosticSummary = latestDiagnostic ? summarizeTrialDiagnostic(latestDiagnostic, locale) : null;
  const supportHref = buildSupportTemplates(locale).find((item) => item.key === "job")?.href;
  const jobLabel = job
    ? `${translateJobStatus(job.status, locale)}${job.status === "processing" ? ` · ${job.progressPercent}%` : ""}`
    : locale === "zh-CN" ? "正在读取任务" : "Loading job";

  useEffect(() => {
    if (job?.status !== "completed" || !scoreJson) return;
    trackFunnelEventOnce(`free-omr-preview-${scoreId}`, "free_omr_preview_viewed", {
      preview_type: "staff_candidate",
    });
  }, [job?.status, scoreId, scoreJson]);

  const sourcePreviewAsset = assets.find((asset) => asset.assetKind === "source_pdf" || asset.assetKind === "source_image") ?? null;
  const omrPageFiles = assets.filter((asset) => asset.assetKind === "omr_page_image").map((asset) => asset.file);

  if (score?.pendingRevision?.scoreJson) {
    return (
      <ScoreCandidateReviewWorkspace
        title={score.title}
        scoreId={score.id}
        revision={score.pendingRevision}
        sourceFile={sourcePreviewAsset?.file ?? null}
        pageFiles={omrPageFiles}
        token={token}
        locale={locale}
        generatedMusicXml={musicXml}
        selectedEventId={selectedEventId}
        onEventSelect={setSelectedEventId}
        onAccept={() => undefined}
        onReject={() => undefined}
        submittingAction={null}
        actionError={error}
        onCandidateUpdated={refresh}
        onUndo={() => undefined}
        onRedo={() => undefined}
        canUndo={false}
        canRedo={false}
        restoring={false}
        revisionStatus={null}
        revisionStatusKind={null}
        freeEditing
      />
    );
  }

  return (
    <div className="page-stack">
      <section className="page-banner split">
        <div className="stack-sm">
          <p className="eyebrow">{locale === "zh-CN" ? "免费编辑准备中" : "Preparing free editing"}</p>
          <h1 className="page-title">{score?.title ?? (locale === "zh-CN" ? "正在读取乐谱..." : "Loading score...")}</h1>
          <p className="body-copy large">
            {locale === "zh-CN"
              ? "识别完成后会直接进入这一页的免费编辑工作台；下载、移调、简谱、音频和再次识别需要开通完整权限。"
              : "When recognition finishes, this page opens directly in the free editor. Downloads, transposition, Jianpu, audio, and another scan require full access."}
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
            <Link href={`${APP_ROUTES.scores}#free-scan`} className="button button-secondary">
              {locale === "zh-CN" ? "返回工程库" : "Back to library"}
            </Link>
          </div>
        </div>
      </section>

      {error ? <p className="form-status error">{error}</p> : null}
      {job?.status === "failed" ? (
        <section className="surface-panel stack-sm">
          <p className="form-status error">{locale === "zh-CN" ? "识别任务未能完成，请按下方建议检查文件。" : "Recognition did not finish. Check the file using the guidance below."}</p>
          <p className="body-copy">
            {locale === "zh-CN"
              ? "请确认页面方向正确、谱面清晰且没有大面积阴影或裁切。免费任务失败需要人工核查额度，请不要重复付款。"
              : "Check that the page is upright, sharply focused, and not heavily shadowed or cropped. A failed free job needs a manual quota review; do not start another payment."}
          </p>
          {job.errorMessage ? <details className="technical-details"><summary>{locale === "zh-CN" ? "技术详情" : "Technical details"}</summary><p className="micro-copy">{job.errorMessage}</p></details> : null}
          {supportHref ? <a href={supportHref} className="button button-secondary">{locale === "zh-CN" ? "提交识别问题" : "Report recognition issue"}</a> : null}
        </section>
      ) : null}

      {diagnosticSummary ? (
        <section className="surface-panel stack-md">
          <div className="stack-sm">
            <p className="eyebrow">{locale === "zh-CN" ? "识别诊断" : "Recognition diagnostics"}</p>
            <h2 className="card-title">{locale === "zh-CN" ? "先检查置信度和警告，再决定是否开通。" : "Review confidence and warnings before you upgrade."}</h2>
            {diagnosticSummary.message ? <p className="body-copy">{diagnosticSummary.message}</p> : null}
            {diagnosticSummary.technicalMessage ? (
              <details className="technical-details">
                <summary>{locale === "zh-CN" ? "技术详情" : "Technical details"}</summary>
                <p className="micro-copy">{diagnosticSummary.technicalMessage}</p>
              </details>
            ) : null}
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
              <p className="helper-copy">{locale === "zh-CN" ? "免费编辑最多一页。" : "Free editing is limited to one page."}</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">{locale === "zh-CN" ? "警告数量" : "Warnings"}</p>
              <p className="metric-value">{diagnosticSummary.warnings}</p>
              <p className="helper-copy">{locale === "zh-CN" ? "识谱引擎诊断" : diagnosticSummary.engine}</p>
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
          errorLabel={locale === "zh-CN" ? "识别结果不完整，暂时无法显示五线谱。请换一页更清晰、方向正确且边缘完整的乐谱，或联系支持核查。" : "The recognition result is incomplete and cannot be displayed. Try a clearer, upright, uncropped page or contact support."}
          retryLabel={locale === "zh-CN" ? "重新渲染" : "Try rendering again"}
          technicalDetailsLabel={locale === "zh-CN" ? "技术详情" : "Technical details"}
        />
      </section>
    </div>
  );
}

function translateJobStatus(status: JobsPayload["jobs"][number]["status"], locale: string) {
  if (locale !== "zh-CN") return status;
  switch (status) {
    case "queued": return "等待处理";
    case "processing": return "正在识别";
    case "completed": return "识别完成";
    case "failed": return "识别失败";
    default: return "已取消";
  }
}

function summarizeTrialDiagnostic(input: JobsPayload["omrDiagnostics"][number], locale: string) {
  const details = input.diagnostics;
  const warnings = Array.isArray(details.warnings) ? details.warnings.length : 0;
  const engine = typeof details.engine === "string" && details.engine.trim() ? details.engine : "OMR";
  const technicalMessage = typeof details.message === "string" && details.message.trim() ? details.message : null;
  const message = technicalMessage
    ? locale === "zh-CN"
      ? "识别引擎返回了需要人工检查的提示，建议先查看下方候选谱。"
      : "The recognition engine returned a warning that needs a manual review."
    : null;
  return {
    confidence: input.confidence === null ? "—" : `${Math.round(input.confidence * 100)}%`,
    pages: input.sourcePageCount ?? 1,
    warnings,
    engine,
    message,
    technicalMessage,
  };
}
