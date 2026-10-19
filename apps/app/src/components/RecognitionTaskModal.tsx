"use client";
import { useEffect, useRef, useState } from "react";
import { WorkbenchModal, workbenchCopy, type ScoreProgressJob } from "@score/ui";
import { useFlowMessages } from "../lib/flow-messages/client";
import { apiRequest } from "../lib/api";
import { getStoredToken } from "../lib/auth-storage";
import { useAppLocale } from "./AppLocaleProvider";
import { ScoreImportStatus } from "./ScoreImportStatus";
import { ScorePassUpgradeModal } from "./ScorePassUpgradeModal";
import { isCreditUpgradeError } from "../lib/score-pass-checkout";

type Job = ScoreProgressJob & { id: string; jobType?: string; params?: Record<string, unknown> | null; errorMessage?: string | null };
export function RecognitionTaskModal({ documentId, title, editorHref, onChangeFile }: {
  documentId: string; title: string; editorHref: string; onChangeFile: () => void;
}) {
  const { locale } = useAppLocale();
  const copy = workbenchCopy[locale];
  const flow = useFlowMessages();
  const [open, setOpen] = useState(true);
  const [job, setJob] = useState<Job>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [complete, setComplete] = useState(false);
  const [upgradeRetry, setUpgradeRetry] = useState(false);
  const lock = useRef(false);
  const headers = () => ({ Authorization: `Bearer ${getStoredToken() ?? ""}` });
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      const [scores, jobs] = await Promise.all([
        apiRequest<{ score: { currentRevisionId?: string | null; pendingRevisionId?: string | null } }>(`/api/scores/${documentId}`, { headers: headers(), signal: controller.signal }),
        apiRequest<{ jobs: Job[] }>(`/api/scores/${documentId}/jobs`, { headers: headers(), signal: controller.signal }),
      ]);
      if (controller.signal.aborted) return;
      if (!scores.ok || !jobs.ok) setError(!scores.ok ? scores.error : !jobs.ok ? jobs.error : null);
      else {
        setError(null);
        const latest = jobs.data.jobs.find(item => item.jobType === "omr_import" || item.jobType === "audio_transcribe") ?? jobs.data.jobs[0];
        setJob(latest);
        if ((scores.data.score.currentRevisionId || scores.data.score.pendingRevisionId) && (!latest || latest.status === "completed")) {
          setComplete(true); return;
        }
        if (latest && ["failed", "cancelled", "completed"].includes(latest.status)) return;
      }
      timer = setTimeout(() => void poll(), 3000);
    };
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [documentId, attempt]);
  async function retry() {
    if (!job || lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      const result = await apiRequest<{ job: Job }>(`/api/scores/${documentId}/jobs/${job.id}/retry`, { method: "POST", headers: headers() });
      if (!result.ok) { if (isCreditUpgradeError(result)) setUpgradeRetry(true); setError(result.error); return; }
      setJob(result.data.job); setAttempt(value => value + 1);
    } finally { lock.current = false; setBusy(false); }
  }
  if (!open) return <button type="button" className="button button-secondary" onClick={() => setOpen(true)}>{complete ? copy.done : copy.refresh} · {title}</button>;
  if (upgradeRetry || (complete && (job?.params?.freeTrial === true || job?.params?.creditSource === "free_trial"))) return <ScorePassUpgradeModal postRecognition={complete && !upgradeRetry} returnTo={editorHref} documentId={documentId} locale={locale} topUp={false} action={upgradeRetry && job ? { kind: "retry", jobId: job.id } : undefined} onClose={() => { if (complete) window.location.assign(editorHref); else { setUpgradeRetry(false); setOpen(false); } }} />;
  return <WorkbenchModal title={complete ? copy.done : job && ["failed", "cancelled", "completed"].includes(job.status) ? flow.scoreReadiness.failed : flow.scoreReadiness.processing} closeLabel={copy.close} onClose={() => setOpen(false)}>
    {complete ? <a className="button button-primary" href={editorHref}>{copy.chips[0]}</a> : <ScoreImportStatus embedded title={title} locale={locale} job={job} busy={busy} error={error} onRetry={() => void retry()} onRefresh={() => setAttempt(value => value + 1)} onChangeFile={() => { setOpen(false); onChangeFile(); }} />}
  </WorkbenchModal>;
}
