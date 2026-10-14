export const PROGRESS_COMPLETION_MS = 650;
export const ESTIMATED_PROGRESS_LIMIT = 94;

export type ProgressInput = {
  active: boolean;
  label: string;
  progressPercent?: number | null;
  error?: boolean;
  operationKey?: string | number;
};
export type ProgressState = {
  phase: "idle" | "active" | "complete";
  progressPercent: number;
  startedAt: number;
  completedAt: number;
  operationKey?: string | number;
  label: string;
};

export function idleProgress(): ProgressState {
  return { phase: "idle", progressPercent: 0, startedAt: 0, completedAt: 0, label: "" };
}

/** An estimate is a waiting indicator; only an explicit success completes it. */
export function estimatedProgress(elapsedMs: number): number {
  return Math.min(ESTIMATED_PROGRESS_LIMIT, 1 + 93 * (1 - Math.exp(-Math.max(0, elapsedMs) / 18_000)));
}

export function advanceProgress(previous: ProgressState, input: ProgressInput, now: number): ProgressState {
  if (input.error) return idleProgress();
  if (input.active) {
    const fresh = previous.phase !== "active" || previous.operationKey !== input.operationKey;
    const startedAt = fresh ? now : previous.startedAt;
    const actual = typeof input.progressPercent === "number" && Number.isFinite(input.progressPercent);
    const progressPercent = actual
      ? Math.min(100, Math.max(0, input.progressPercent!))
      : estimatedProgress(now - startedAt);
    return { phase: "active", progressPercent, startedAt, completedAt: 0, operationKey: input.operationKey, label: input.label };
  }
  if (previous.phase === "active") return { ...previous, phase: "complete", progressPercent: 100, completedAt: now };
  if (previous.phase === "complete" && now - previous.completedAt < PROGRESS_COMPLETION_MS) return previous;
  return idleProgress();
}
