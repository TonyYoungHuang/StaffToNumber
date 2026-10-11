export const SCORE_REVIEWS_CHANGED_EVENT = "score-reviews-changed";

export type ReviewableScore = {
  id: string;
  userId: string;
  title: string;
  status: string;
  updatedAt: string;
  pendingRevision: {
    id: string;
    createdFrom: string;
    scoreJson?: {
      recognitionLayer?: { engine: string };
      metadata?: { audioTranscriptionCleanup?: unknown[] };
    };
  } | null;
};

export function pendingOmrReviews(scores: readonly ReviewableScore[]): ReviewableScore[] {
  return scores.filter(score => {
    if (!["candidate", "needs_review"].includes(score.status) || !score.pendingRevision) return false;
    const revision = score.pendingRevision;
    if (revision.createdFrom === "omr_import") return true;
    // An edited scan keeps its recognition layer. Ambiguous imports and audio
    // candidates must never be labelled as scans.
    return revision.createdFrom === "manual_edit"
      && ["audiveris", "homr", "hybrid"].includes(revision.scoreJson?.recognitionLayer?.engine ?? "")
      && !revision.scoreJson?.metadata?.audioTranscriptionCleanup?.length;
  }).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id));
}

export function notifyScoreReviewsChanged() {
  window.dispatchEvent(new Event(SCORE_REVIEWS_CHANGED_EVENT));
}
