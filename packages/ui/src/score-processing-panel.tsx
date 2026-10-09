"use client";

import { useEffect, useState } from "react";

export type ScoreProcessingCopy = {
  phases: Record<string, string>; elapsed: string; page: string; queuedPosition: string;
  working: string; slow: string; stale: string; offline: string; saved: string;
};
export type ScoreProgressJob = {
  status: string; params?: Record<string, unknown> | null;
  startedAt?: string | null; createdAt?: string; updatedAt?: string; queuePosition?: number | null;
};

export function ScoreProcessingPanel({ job, copy, locale, connectionError = false }: {
  job?: ScoreProgressJob | null; copy: ScoreProcessingCopy; locale: string; connectionError?: boolean;
}) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const raw = job?.params?.processingProgress;
  const progress = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const queued = job?.status === "queued";
  const phase = !job ? "loading" : queued ? "queued" : typeof progress.stage === "string" && Object.hasOwn(copy.phases, progress.stage) ? progress.stage : "recognize";
  const started = Date.parse(job?.startedAt ?? job?.createdAt ?? "");
  const elapsed = Number.isFinite(started) ? Math.max(0, Math.floor((now - started) / 1000)) : 0;
  const heartbeat = Date.parse(typeof progress.heartbeatAt === "string" ? progress.heartbeatAt : job?.updatedAt ?? "");
  const stale = !queued && Number.isFinite(heartbeat) && now - heartbeat > 60_000;
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const page = typeof progress.page === "number" && Number.isSafeInteger(progress.page) ? progress.page : 0;
  const total = typeof progress.totalPages === "number" && Number.isSafeInteger(progress.totalPages) ? progress.totalPages : 0;
  return <div className="stack-md" data-score-processing-phase={phase} aria-busy="true">
    <strong role="status" aria-live="polite">{copy.phases[phase]}</strong>
    <progress aria-label={copy.phases[phase]} style={{ width: "100%" }} />
    {queued && job?.queuePosition && job.queuePosition > 0 ? <p>{copy.queuedPosition.replace("{position}", number(job.queuePosition))}</p> : null}
    {page > 0 && total >= page && total <= 1000 ? <p>{copy.page.replace("{page}", number(page)).replace("{total}", number(total))}</p> : null}
    <p className="helper-copy" aria-live="off">{copy.elapsed.replace("{seconds}", number(elapsed))}</p>
    <p className={connectionError || stale ? "form-status error" : "body-copy"} style={connectionError || stale ? { color: "#8f1d14", background: "#fff0ee", border: "1px solid #b42318" } : undefined} role={connectionError || stale ? "alert" : undefined}>
      {connectionError ? copy.offline : stale ? copy.stale : elapsed >= 45 ? copy.slow : copy.working}
    </p>
    <p className="helper-copy">{copy.saved}</p>
  </div>;
}
