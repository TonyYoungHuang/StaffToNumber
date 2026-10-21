-- Additive migration. Apply as owner before API and worker rollout.
-- psql -v ON_ERROR_STOP=1 -v runtime_schema=scoretransposer -v runtime_role=scoretransposer_app
BEGIN;

CREATE TABLE IF NOT EXISTS :"runtime_schema".lifetime_entitlements (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES :"runtime_schema".users(id) ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS lifetime_entitlements_user_idx ON :"runtime_schema".lifetime_entitlements(user_id, status);
CREATE TABLE IF NOT EXISTS :"runtime_schema".lifetime_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payment_intent_id TEXT,
  checkout_session_id TEXT,
  outcome TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  processed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS lifetime_events_intent_idx ON :"runtime_schema".lifetime_webhook_events(payment_intent_id, outcome);
CREATE TABLE IF NOT EXISTS :"runtime_schema".lifetime_unmetered_jobs (
  job_family TEXT NOT NULL CHECK (job_family IN ('score', 'legacy')),
  job_id TEXT NOT NULL,
  user_id TEXT REFERENCES :"runtime_schema".users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  running_until TEXT,
  PRIMARY KEY (job_family, job_id)
);
CREATE INDEX IF NOT EXISTS lifetime_running_jobs_user_idx ON :"runtime_schema".lifetime_unmetered_jobs(user_id, running_until) WHERE running_until IS NOT NULL;
REVOKE ALL ON :"runtime_schema".lifetime_entitlements FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON :"runtime_schema".lifetime_entitlements TO :"runtime_role";
REVOKE ALL ON :"runtime_schema".lifetime_webhook_events FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON :"runtime_schema".lifetime_webhook_events TO :"runtime_role";
REVOKE ALL ON :"runtime_schema".lifetime_unmetered_jobs FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON :"runtime_schema".lifetime_unmetered_jobs TO :"runtime_role";
COMMIT;
