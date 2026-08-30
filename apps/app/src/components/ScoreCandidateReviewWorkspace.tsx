"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatMessage, formatNumber, type SupportedLocale } from "@score/i18n";
import { APP_ROUTES } from "@score/shared";
import type { ScoreJson } from "@score/shared";
import { ScoreMusicXmlPreview } from "./ScoreMusicXmlPreview";
import { ScoreOmrReviewPanel } from "./ScoreOmrReviewPanel";
import { ScoreCorrectionPanel } from "./ScoreCorrectionPanel";
import { ScoreVisualEditorPanel } from "./ScoreVisualEditorPanel";
import { projectSynchronizedScroll } from "../lib/score-review-viewport";
import { accountActivationRoute } from "../lib/release";
import { useScoreReviewMessages } from "../lib/score-entry-messages/client";

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
  locale: SupportedLocale;
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
  const copy = useScoreReviewMessages().candidate;
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
            {freeEditing ? copy.freeEyebrow : copy.reviewEyebrow}
          </p>
          <h1 className="page-title">{title}</h1>
          <p className="body-copy large">
            {formatMessage(freeEditing ? copy.freeDescription : copy.reviewDescription, {
              revision: formatNumber(revision.revisionNumber, locale),
            })}
          </p>
        </div>
        <div className="page-banner-actions">
          <Link href={APP_ROUTES.scores} className="button button-secondary">
            {copy.back}
          </Link>
          {freeEditing ? (
            <Link href={accountActivationRoute} className="button button-primary">
              {copy.processMore}
            </Link>
          ) : (
            <>
              <button type="button" className="button button-secondary" onClick={onReject} disabled={submittingAction !== null}>
                {submittingAction === "reject" ? copy.rejecting : copy.reject}
              </button>
              <button type="button" className="button button-primary" onClick={onAccept} disabled={submittingAction !== null}>
                {submittingAction === "accept" ? copy.accepting : copy.accept}
              </button>
            </>
          )}
        </div>
      </div>

      {actionError ? <p className="form-status error" role="alert">{actionError}</p> : null}
      {revisionStatus && revisionStatusKind ? <p className={`form-status ${revisionStatusKind}`} role={revisionStatusKind === "error" ? "alert" : "status"}>{revisionStatus}</p> : null}

      <section className="surface-panel stack-md">
        <p className="eyebrow">{copy.safetyEyebrow}</p>
        <h2 className="card-title">{copy.safetyTitle}</h2>
        <p className="body-copy">
          {freeEditing ? copy.freeSafetyBody : copy.reviewSafetyBody}
        </p>
        {!freeEditing ? <div className="button-row" role="group" aria-label={copy.historyGroupLabel}>
          <button type="button" className="button button-secondary button-ghost" onClick={onUndo} disabled={!canUndo || restoring}>
            {copy.undo}
          </button>
          <button type="button" className="button button-secondary button-ghost" onClick={onRedo} disabled={!canRedo || restoring}>
            {copy.redo}
          </button>
        </div> : null}
      </section>

      <div className="score-review-view-controls" role="group" aria-label={copy.viewportLabel}>
        <label className="check-row">
          <input type="checkbox" checked={syncScroll} onChange={(event) => setSyncScroll(event.target.checked)} />
          <span>{copy.syncScroll}</span>
        </label>
        <div className="score-review-zoom-controls" role="group" aria-label={copy.zoomGroupLabel}>
          <button type="button" aria-label={copy.zoomOut} onClick={() => setReviewZoom((value) => Math.max(0.5, value - 0.25))} disabled={reviewZoom <= 0.5}>-</button>
          <output aria-live="polite">{formatNumber(reviewZoom, locale, { style: "percent", maximumFractionDigits: 0 })}</output>
          <button type="button" aria-label={copy.zoomIn} onClick={() => setReviewZoom((value) => Math.min(2, value + 0.25))} disabled={reviewZoom >= 2}>+</button>
          <button type="button" className="score-review-reset-zoom" onClick={() => setReviewZoom(1)} disabled={reviewZoom === 1}>
            {copy.fitWidth}
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
            <p className="eyebrow">{copy.notationEyebrow}</p>
            <h2 className="card-title">{copy.notationTitle}</h2>
            <p className="body-copy">{copy.notationBody}</p>
          </div>
          <ScoreMusicXmlPreview
            fileId={revision.musicxmlFileId}
            token={token}
            musicXml={generatedMusicXml}
            scoreJson={revision.scoreJson}
            selectedEventId={selectedEventId}
            onEventSelect={onEventSelect}
            emptyLabel={copy.notationEmpty}
            loadingLabel={copy.notationLoading}
            errorLabel={copy.notationError}
            retryLabel={copy.notationRetry}
            technicalDetailsLabel={copy.notationTechnicalDetails}
            deferredLabel={copy.notationDeferred}
            renderLabel={copy.notationRender}
            eventLabelTemplate={copy.notationEventLabel}
            noteLabel={copy.notationNote}
            restLabel={copy.notationRest}
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
