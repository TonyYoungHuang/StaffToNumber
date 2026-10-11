"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { formatMessage, formatNumber } from "@score/i18n";
import { apiRequest } from "../lib/api";
import { getServerAuthToken, getStoredToken, subscribeAuthChanges } from "../lib/auth-storage";
import { pendingOmrReviews, SCORE_REVIEWS_CHANGED_EVENT, type ReviewableScore } from "../lib/pending-omr-reviews";
import type { ScoreEntryMessages } from "../lib/score-entry-messages/types";
import { useAppLocale } from "./AppLocaleProvider";

type ReviewState = { token: string; status: "loading" | "ready" | "error"; scores: ReviewableScore[] };

export function PendingOmrReviewBanner({ copy, pathname }: { copy: ScoreEntryMessages["reviewEntry"]; pathname: string }) {
  const token = useSyncExternalStore(subscribeAuthChanges, getStoredToken, getServerAuthToken);
  const { locale } = useAppLocale();
  const [state, setState] = useState<ReviewState | null>(null);
  const [retry, setRetry] = useState(0);
  const home = pathname === "/scores" || pathname === "/dashboard";
  const enabled = Boolean(token) && !/^\/(?:login|register|forgot-password|reset-password|activate|scores\/shared)(?:\/|$)/u.test(pathname);

  useEffect(() => {
    if (!enabled || !token) { setState(null); return; }
    let active = true;
    let requestId = 0;
    let controller: AbortController | null = null;
    setState({ token, status: "loading", scores: [] });
    async function refresh() {
      const request = ++requestId;
      controller?.abort();
      controller = new AbortController();
      const result = await apiRequest<{ scores: ReviewableScore[] }>("/api/scores", {
        headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
      });
      if (!active || request !== requestId || getStoredToken() !== token) return;
      setState({ token: token!, status: result.ok ? "ready" : "error", scores: result.ok ? pendingOmrReviews(result.data.scores) : [] });
    }
    const onFocus = () => { void refresh(); };
    const onVisibility = () => { if (document.visibilityState === "visible") void refresh(); };
    void refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(SCORE_REVIEWS_CHANGED_EVENT, onFocus);
    return () => {
      active = false;
      controller?.abort();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(SCORE_REVIEWS_CHANGED_EVENT, onFocus);
    };
  }, [enabled, pathname, retry, token]);

  // Hide data from the previous account synchronously, before effect cleanup.
  if (!enabled || !token || state?.token !== token) return null;
  if (state.status === "loading") return home ? <div className="container review-entry-status" role="status">{copy.loading}</div> : null;
  if (state.status === "error") return (
    <aside className="container review-entry-status" aria-label={copy.label}>
      <p role="status">{copy.failed}</p>
      <button className="button button-secondary" onClick={() => setRetry(value => value + 1)}>{copy.retry}</button>
    </aside>
  );
  const count = state.scores.length;
  if (!count && !home) return null;
  const plural = count === 1 ? "one" : new Intl.PluralRules(locale).select(count);
  const template = copy.titles[plural as keyof typeof copy.titles] ?? copy.titles.other;
  return (
    <aside className={`container review-entry${count ? " has-pending" : ""}`} aria-label={copy.label} data-pending-review-count={count}>
      <div className="review-entry-copy">
        <h2>{count ? formatMessage(template, { count: formatNumber(count, locale) }) : copy.emptyTitle}</h2>
        <p>{count ? copy.body : copy.emptyBody}</p>
        {count > 1 ? <details className="review-entry-list">
          <summary>{copy.all}</summary>
          <ul>{state.scores.map(score => <li key={score.id}><Link prefetch={false} href={`/scores/${encodeURIComponent(score.id)}#scan-review`}>{score.title}</Link></li>)}</ul>
        </details> : null}
      </div>
      <Link prefetch={false} className={`button ${count ? "button-primary" : "button-secondary"}`} href={count ? `/scores/${encodeURIComponent(state.scores[0].id)}#scan-review` : "/scores#free-scan"}>
        {count ? copy.continue : copy.upload}
      </Link>
    </aside>
  );
}
