import type { RuntimeDatabaseLike } from "./index.js";

export const LIFETIME_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS lifetime_entitlements (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  product_code TEXT NOT NULL CHECK (product_code = 'converter-pro-lifetime'),
  source_order_id TEXT NOT NULL UNIQUE,
  checkout_session_id TEXT NOT NULL UNIQUE,
  payment_intent_id TEXT NOT NULL UNIQUE,
  lifetime INTEGER NOT NULL DEFAULT 1 CHECK (lifetime = 1),
  expires_at TEXT CHECK (expires_at IS NULL),
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
  granted_at TEXT NOT NULL,
  revoked_at TEXT,
  reason TEXT NOT NULL,
  CHECK ((status = 'active' AND revoked_at IS NULL) OR (status = 'revoked' AND revoked_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS lifetime_entitlements_user_idx ON lifetime_entitlements(user_id, status);
CREATE TABLE IF NOT EXISTS lifetime_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payment_intent_id TEXT,
  checkout_session_id TEXT,
  outcome TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  processed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS lifetime_events_intent_idx ON lifetime_webhook_events(payment_intent_id, outcome);
CREATE TABLE IF NOT EXISTS lifetime_unmetered_jobs (
  job_family TEXT NOT NULL CHECK (job_family IN ('score', 'legacy')),
  job_id TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  running_until TEXT,
  PRIMARY KEY (job_family, job_id)
);
CREATE INDEX IF NOT EXISTS lifetime_running_jobs_user_idx ON lifetime_unmetered_jobs(user_id, running_until) WHERE running_until IS NOT NULL;`;

export type LifetimeEntitlement = {
  id: string; user_id: string | null; product_code: "converter-pro-lifetime";
  source_order_id: string; checkout_session_id: string; payment_intent_id: string;
  lifetime: number; expires_at: null; status: "active" | "revoked";
  granted_at: string; revoked_at: string | null; reason: string;
};

export function hasLifetimeSchema(db: RuntimeDatabaseLike) {
  return db.prepare("PRAGMA table_info(lifetime_entitlements)").all().length > 0;
}

export function activeLifetimeEntitlement(db: RuntimeDatabaseLike, userId: string): LifetimeEntitlement | undefined {
  // Older isolated fixtures and pre-migration databases have no lifetime products.
  if (!hasLifetimeSchema(db)) return undefined;
  return db.prepare("SELECT * FROM lifetime_entitlements WHERE user_id = ? AND status = 'active' LIMIT 1").get(userId);
}

export class LifetimeRecognitionBusyError extends Error {
  readonly code = "LIFETIME_RECOGNITION_QUEUE_FULL";
  readonly statusCode = 429;
  constructor() { super("Lifetime access allows 1 recognition job at a time and up to 3 waiting jobs. Please wait for a job to finish."); }
}

export function lifetimeRecognitionCount(db: RuntimeDatabaseLike, userId: string, status: "queued" | "processing") {
  const row = db.prepare(`SELECT
    (SELECT COUNT(*) FROM score_jobs WHERE user_id = ? AND job_type IN ('omr_import', 'audio_transcribe') AND status = ?) +
    (SELECT COUNT(*) FROM jobs WHERE user_id = ? AND status = ?) AS count`).get(userId, status, userId, status) as { count: number };
  return Number(row.count);
}

/** Caller holds the account lock until its insert/retry commits. */
export function assertLifetimeRecognitionQueue(db: RuntimeDatabaseLike, userId: string) {
  if (activeLifetimeEntitlement(db, userId) && lifetimeRecognitionCount(db, userId, "queued") >= 3) throw new LifetimeRecognitionBusyError();
}

export class LifetimeRecognitionDeferredError extends Error {
  constructor() { super("Another recognition job is running for this lifetime account."); }
}

function hasRunningSlot(db: RuntimeDatabaseLike, userId: string) {
  return Boolean(db.prepare("SELECT job_id FROM lifetime_unmetered_jobs WHERE user_id = ? AND running_until > ? LIMIT 1")
    .get(userId, new Date().toISOString()));
}

export function renewLifetimeRecognitionSlot(db: RuntimeDatabaseLike, family: "score" | "legacy", jobId: string) {
  if (!hasLifetimeSchema(db)) return;
  db.prepare("UPDATE lifetime_unmetered_jobs SET running_until = ? WHERE job_family = ? AND job_id = ? AND running_until IS NOT NULL")
    .run(new Date(Date.now() + 60_000).toISOString(), family, jobId);
}

export function releaseLifetimeRecognitionSlot(db: RuntimeDatabaseLike, family: "score" | "legacy", jobId: string) {
  if (hasLifetimeSchema(db)) db.prepare("UPDATE lifetime_unmetered_jobs SET running_until = NULL WHERE job_family = ? AND job_id = ?").run(family, jobId);
}

/** Admission and claims serialize on the same account, including across workers. */
export function claimWithLifetimeLimit<T>(db: RuntimeDatabaseLike, family: "score" | "legacy", jobId: string | undefined, claim: (id: string) => T): T | undefined {
  const table = family === "score" ? "score_jobs" : "jobs";
  db.exec("BEGIN IMMEDIATE");
  try {
    const lifetimeFilter = hasLifetimeSchema(db) ? `AND NOT (
      ${family === "score" ? "candidate.job_type IN ('omr_import', 'audio_transcribe') AND" : ""}
      EXISTS (SELECT 1 FROM lifetime_entitlements e WHERE e.user_id = candidate.user_id AND e.status = 'active')
      AND (EXISTS (SELECT 1 FROM score_jobs s WHERE s.user_id = candidate.user_id AND s.job_type IN ('omr_import', 'audio_transcribe') AND s.status = 'processing')
        OR EXISTS (SELECT 1 FROM jobs j WHERE j.user_id = candidate.user_id AND j.status = 'processing')
        OR EXISTS (SELECT 1 FROM lifetime_unmetered_jobs u WHERE u.user_id = candidate.user_id AND u.running_until > ?))
    )` : "";
    const candidate = db.prepare(`SELECT id, user_id, status ${family === "score" ? ", job_type" : ""} FROM ${table} candidate
      WHERE status ${family === "legacy" && jobId ? "IN ('queued', 'processing')" : "= 'queued'"} ${jobId ? "AND id = ?" : lifetimeFilter}
      ORDER BY created_at, id LIMIT 1`).get(...(jobId ? [jobId] : lifetimeFilter ? [new Date().toISOString()] : [])) as { id: string; user_id: string; status: string; job_type?: string } | undefined;
    if (!candidate) { db.exec("COMMIT"); return undefined; }
    if (hasLifetimeSchema(db)) db.prepare("UPDATE users SET updated_at = updated_at WHERE id = ?").run(candidate.user_id);
    if (candidate.status === "processing" && activeLifetimeEntitlement(db, candidate.user_id)) { db.exec("COMMIT"); return undefined; }
    if ((family === "legacy" || (candidate.job_type === "omr_import" || candidate.job_type === "audio_transcribe")) && activeLifetimeEntitlement(db, candidate.user_id)
      && (lifetimeRecognitionCount(db, candidate.user_id, "processing") > 0 || hasRunningSlot(db, candidate.user_id))) {
      db.exec("COMMIT");
      if (jobId) throw new LifetimeRecognitionDeferredError();
      return undefined;
    }
    const result = claim(candidate.id);
    if (result && (family === "legacy" || (candidate.job_type === "omr_import" || candidate.job_type === "audio_transcribe")) && activeLifetimeEntitlement(db, candidate.user_id)) {
      // This survives cancellation/deletion of the job row until its worker has
      // stopped. The heartbeat expires only if the worker itself disappears.
      db.prepare(`INSERT INTO lifetime_unmetered_jobs (job_family,job_id,user_id,created_at,running_until) VALUES (?,?,?,?,?)
        ON CONFLICT(job_family,job_id) DO UPDATE SET running_until = excluded.running_until`)
        .run(family, candidate.id, candidate.user_id, new Date().toISOString(), new Date(Date.now() + 60_000).toISOString());
    }
    db.exec("COMMIT");
    return result;
  } catch (error) {
    if (!(error instanceof LifetimeRecognitionDeferredError)) db.exec("ROLLBACK");
    throw error;
  }
}
