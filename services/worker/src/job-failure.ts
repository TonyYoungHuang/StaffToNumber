import type { RuntimeDatabaseLike } from "@score/runtime-database";
import { workerFailureMessage } from "./engine-resource-error.js";

/** This write atomically releases prepaid reservations through status triggers;
 * monthly/pass usage also excludes failed jobs. Diagnostics follow the write. */
export function markJobFailed(input: { db: RuntimeDatabaseLike; family: "score" | "legacy"; jobId: string; message: string; timestamp: string }) {
  const table = input.family === "score" ? "score_jobs" : "jobs";
  input.db.prepare(`UPDATE ${table} SET status = 'failed', error_message = ?, updated_at = ?, completed_at = ?
    ${input.family === "score" ? ", progress_percent = 0" : ""}
    WHERE id = ? AND status = 'processing'`).run(workerFailureMessage(input.message), input.timestamp, input.timestamp, input.jobId);
}

/** Failure state is mandatory; each independent diagnostic is best effort. */
export function finishJobFailure(input: { terminal: () => void; diagnostics: Array<() => void>; onDiagnosticError?: (error: unknown) => void }) {
  input.terminal();
  for (const diagnostic of input.diagnostics) {
    try { diagnostic(); }
    catch (error) { try { input.onDiagnosticError?.(error); } catch { /* Logging cannot change the terminal outcome. */ } }
  }
}

export function bestEffortDiagnostic(diagnostic: () => void) {
  try { diagnostic(); } catch { /* Auxiliary writes must not break the lifecycle. */ }
}
