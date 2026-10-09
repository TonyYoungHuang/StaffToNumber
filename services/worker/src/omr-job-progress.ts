export type OmrProgress = {
  stage: "fetch-source" | "prepare-pages" | "layout" | "recognize" | "restore-image" | "verify" | "save";
  page?: number; totalPages?: number;
  reportedAt: string; heartbeatAt: string;
};
/** Observed milestones and worker liveness, without an invented percentage or ETA. */
export function createOmrProgressReporter(store: (progress: OmrProgress) => void, intervalMs = 15_000) {
  let current: OmrProgress | undefined;
  let stopped = false;
  const persist = () => {
    if (!current || stopped) return;
    current = { ...current, heartbeatAt: new Date().toISOString() };
    try { store(current); } catch { /* Status reporting must not discard recognized music. */ }
  };
  const timer = setInterval(persist, intervalMs); timer.unref();
  return {
    report(update: Pick<OmrProgress, "stage"> & Partial<Pick<OmrProgress, "page" | "totalPages">>) {
      if (stopped) return;
      const stamp = new Date().toISOString();
      current = { ...current, ...update, reportedAt: stamp, heartbeatAt: stamp }; persist();
    },
    stop() { stopped = true; clearInterval(timer); },
  };
}
