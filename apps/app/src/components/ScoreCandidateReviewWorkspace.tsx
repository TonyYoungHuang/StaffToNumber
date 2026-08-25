"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { APP_ROUTES } from "@score/shared";
import type { ScoreJson } from "@score/shared";
import { ScoreMusicXmlPreview } from "./ScoreMusicXmlPreview";
import { ScoreOmrReviewPanel } from "./ScoreOmrReviewPanel";
import { ScoreCorrectionPanel } from "./ScoreCorrectionPanel";
import { ScoreVisualEditorPanel } from "./ScoreVisualEditorPanel";
import { projectSynchronizedScroll } from "../lib/score-review-viewport";
import { accountActivationRoute } from "../lib/release";

type CandidateRevision = {
  id: string;
  revisionNumber: number;
  musicxmlFileId: string | null;
  createdFrom: string;
  scoreJson: ScoreJson;
};

type SourceFile = {
  id: string;
  originalName: string;
  mimeType: string;
};

export function ScoreCandidateReviewWorkspace({
  title,
  scoreId,
  revision,
  sourceFile,
  pageFiles,
  token,
  locale,
  generatedMusicXml,
  selectedEventId,
  onEventSelect,
  onAccept,
  onReject,
  submittingAction,
  actionError,
  onCandidateUpdated,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  restoring,
  revisionStatus,
  revisionStatusKind,
  freeEditing = false,
}: {
  title: string;
  scoreId: string;
  revision: CandidateRevision;
  sourceFile: SourceFile | null;
  pageFiles: SourceFile[];
  token: string | null;
  locale: string;
  generatedMusicXml: string | null;
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
  onAccept: () => void;
  onReject: () => void;
  submittingAction: "accept" | "reject" | null;
  actionError: string | null;
  onCandidateUpdated: () => void | Promise<void>;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  restoring: boolean;
  revisionStatus: string | null;
  revisionStatusKind: "success" | "error" | null;
  freeEditing?: boolean;
}) {
  const isChinese = locale === "zh-CN";
  const comparisonRef = useRef<HTMLDivElement | null>(null);
  const syncingScrollRef = useRef(false);
  const releaseSyncFrameRef = useRef<number | null>(null);
  const [reviewZoom, setReviewZoom] = useState(1);
  const [syncScroll, setSyncScroll] = useState(true);

  useEffect(() => {
    const comparison = comparisonRef.current;
    const source = comparison?.querySelector<HTMLElement>(".score-source-preview");
    const score = comparison?.querySelector<HTMLElement>(".score-preview-shell");
    if (!source || !score || !syncScroll) return;

    const synchronize = (from: HTMLElement, to: HTMLElement) => {
      if (syncingScrollRef.current) return;
      syncingScrollRef.current = true;
      const next = projectSynchronizedScroll(from, to);
      to.scrollTo({ left: next.left, top: next.top });
      if (releaseSyncFrameRef.current !== null) cancelAnimationFrame(releaseSyncFrameRef.current);
      releaseSyncFrameRef.current = requestAnimationFrame(() => {
        syncingScrollRef.current = false;
        releaseSyncFrameRef.current = null;
      });
    };
    const sourceListener = () => synchronize(source, score);
    const scoreListener = () => synchronize(score, source);
    source.addEventListener("scroll", sourceListener, { passive: true });
    score.addEventListener("scroll", scoreListener, { passive: true });

    return () => {
      source.removeEventListener("scroll", sourceListener);
      score.removeEventListener("scroll", scoreListener);
      if (releaseSyncFrameRef.current !== null) cancelAnimationFrame(releaseSyncFrameRef.current);
      releaseSyncFrameRef.current = null;
      syncingScrollRef.current = false;
    };
  }, [reviewZoom, syncScroll]);

  return (
    <div className="page-stack">
      <div className="page-banner split">
        <div className="stack-md">
          <p className="eyebrow">
            {freeEditing ? (isChinese ? "免费编辑" : "Free editing") : (isChinese ? "候选乐谱待审核" : "Candidate score review")}
          </p>
          <h1 className="page-title">{title}</h1>
          <p className="body-copy large">
            {freeEditing
              ? isChinese
                ? `已进入永久免费乐谱工程。识别结果 v${revision.revisionNumber} 可直接校对，修改会自动保存为候选版本。`
                : `You are in the lifetime free score project. Recognition result v${revision.revisionNumber} can be corrected now, and changes are saved as candidate revisions.`
              : isChinese
                ? `识别结果 v${revision.revisionNumber} 尚未成为正式版本。请核对原件和诊断后再接受。`
                : `Recognition result v${revision.revisionNumber} is not an official revision yet. Compare it with the source before accepting.`}
          </p>
        </div>
        <div className="page-banner-actions">
          <Link href={APP_ROUTES.scores} className="button button-secondary">
            {isChinese ? "返回乐谱库" : "Back to scores"}
          </Link>
          {freeEditing ? (
            <Link href={accountActivationRoute} className="button button-primary">
              {isChinese ? "处理更多乐谱" : "Process more scores"}
            </Link>
          ) : (
            <>
              <button type="button" className="button button-secondary" onClick={onReject} disabled={submittingAction !== null}>
                {submittingAction === "reject" ? (isChinese ? "正在拒绝..." : "Rejecting...") : isChinese ? "拒绝候选" : "Reject candidate"}
              </button>
              <button type="button" className="button button-primary" onClick={onAccept} disabled={submittingAction !== null}>
                {submittingAction === "accept" ? (isChinese ? "正在接受..." : "Accepting...") : isChinese ? "接受为正式版本" : "Accept as official revision"}
              </button>
            </>
          )}
        </div>
      </div>

      {actionError ? <p className="form-status error">{actionError}</p> : null}
      {revisionStatus && revisionStatusKind ? <p className={`form-status ${revisionStatusKind}`}>{revisionStatus}</p> : null}

      <section className="surface-panel stack-md">
        <p className="eyebrow">{isChinese ? "安全状态" : "Safety state"}</p>
        <h2 className="card-title">{isChinese ? "候选版本不会覆盖已有正式版本" : "The candidate cannot overwrite an existing official revision"}</h2>
        <p className="body-copy">
          {freeEditing
            ? isChinese
              ? "免费账户可校对整份乐谱的音符、节奏、小节属性和标记，并继续使用播放、移调、简谱、版本、分享和已开放导出；升级用于创建更多乐谱。"
              : "A free account can correct the complete score and continue with playback, transposition, Jianpu, versions, sharing, and available exports. Upgrade to create more score projects."
            : isChinese
              ? "修谱操作会继续生成候选修订，不会修改正式版本。接受操作会复制最新候选并创建正式修订；移调、播放和导出将在接受后开放。"
              : "Corrections create new candidate revisions without changing the official score. Accepting copies the latest candidate into an official revision; transposition, playback, and export unlock afterward."}
        </p>
        {!freeEditing ? <div className="button-row" role="group" aria-label={isChinese ? "候选修谱撤销与重做" : "Candidate correction undo and redo"}>
          <button type="button" className="button button-secondary button-ghost" onClick={onUndo} disabled={!canUndo || restoring}>
            {isChinese ? "撤销修正" : "Undo correction"}
          </button>
          <button type="button" className="button button-secondary button-ghost" onClick={onRedo} disabled={!canRedo || restoring}>
            {isChinese ? "重做修正" : "Redo correction"}
          </button>
        </div> : null}
      </section>

      <div className="score-review-view-controls" role="group" aria-label={isChinese ? "校对视图" : "Review viewport"}>
        <label className="check-row">
          <input type="checkbox" checked={syncScroll} onChange={(event) => setSyncScroll(event.target.checked)} />
          <span>{isChinese ? "同步滚动" : "Sync scrolling"}</span>
        </label>
        <div className="score-review-zoom-controls" role="group" aria-label={isChinese ? "校对缩放" : "Review zoom"}>
          <button type="button" aria-label={isChinese ? "缩小" : "Zoom out"} onClick={() => setReviewZoom((value) => Math.max(0.5, value - 0.25))} disabled={reviewZoom <= 0.5}>-</button>
          <output aria-live="polite">{Math.round(reviewZoom * 100)}%</output>
          <button type="button" aria-label={isChinese ? "放大" : "Zoom in"} onClick={() => setReviewZoom((value) => Math.min(2, value + 0.25))} disabled={reviewZoom >= 2}>+</button>
          <button type="button" className="score-review-reset-zoom" onClick={() => setReviewZoom(1)} disabled={reviewZoom === 1}>
            {isChinese ? "适合宽度" : "Fit width"}
          </button>
        </div>
      </div>

      <div ref={comparisonRef} className="score-comparison-grid" data-review-zoom={reviewZoom}>
        <ScoreOmrReviewPanel
          scoreId={scoreId}
          sourceFile={sourceFile}
          pageFiles={pageFiles}
          token={token}
          scoreJson={revision.scoreJson}
          selectedEventId={selectedEventId}
          onEventSelect={onEventSelect}
          locale={locale}
          zoom={reviewZoom}
        />
        <section className="surface-panel stack-lg">
          <div className="stack-sm">
            <p className="eyebrow">{isChinese ? "候选谱面" : "Candidate notation"}</p>
            <h2 className="card-title">{isChinese ? "MusicXML 五线谱预览" : "MusicXML staff preview"}</h2>
            <p className="body-copy">
              {isChinese ? "点击谱面音符或左侧诊断，可在候选事件之间同步选择。" : "Select notes in the score or diagnostics to inspect candidate events."}
            </p>
          </div>
          <ScoreMusicXmlPreview
            fileId={revision.musicxmlFileId}
            token={token}
            musicXml={generatedMusicXml}
            scoreJson={revision.scoreJson}
            selectedEventId={selectedEventId}
            onEventSelect={onEventSelect}
            emptyLabel={isChinese ? "暂无可渲染的候选 MusicXML。" : "No renderable candidate MusicXML yet."}
            loadingLabel={isChinese ? "正在渲染候选五线谱..." : "Rendering candidate notation..."}
            errorLabel={isChinese ? "候选 MusicXML 渲染失败。" : "Candidate MusicXML could not be rendered."}
            deferredLabel={isChinese ? "这是一份大型乐谱。需要逐页核对时再加载完整 OSMD 预览，图形编辑器可直接使用。" : "This is a large score. Load the complete OSMD preview when you need the comparison view; the graphical editor remains available."}
            renderLabel={isChinese ? "加载完整 OSMD 预览" : "Load complete OSMD preview"}
            zoom={reviewZoom}
          />
        </section>
      </div>

      <ScoreVisualEditorPanel
        scoreId={scoreId}
        token={token}
        scoreJson={revision.scoreJson}
        selectedEventId={selectedEventId}
        onSelectedEventChange={onEventSelect}
        onUpdated={() => {
          void onCandidateUpdated();
        }}
        allowCookieAuth={freeEditing}
      />

      <ScoreCorrectionPanel
        scoreId={scoreId}
        token={token}
        scoreJson={revision.scoreJson}
        onUpdated={() => {
          void onCandidateUpdated();
        }}
      />
    </div>
  );
}
