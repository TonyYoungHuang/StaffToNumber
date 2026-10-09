-- Additive only; run with runtime_schema and runtime_role psql variables.
BEGIN;
SET LOCAL search_path TO :"runtime_schema", public;

    CREATE TABLE IF NOT EXISTS score_passes (
      purchase_id TEXT PRIMARY KEY REFERENCES billing_one_time_purchases(id) ON DELETE CASCADE,
      document_id TEXT UNIQUE,
      credit_limit INTEGER NOT NULL DEFAULT 10 CHECK (credit_limit > 0),
      max_pages INTEGER NOT NULL DEFAULT 5 CHECK (max_pages > 0),
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS score_pass_jobs (
      job_id TEXT PRIMARY KEY,
      purchase_id TEXT NOT NULL REFERENCES score_passes(purchase_id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_score_pass_jobs_purchase ON score_pass_jobs(purchase_id);

REVOKE ALL ON score_passes, score_pass_jobs FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON score_passes, score_pass_jobs TO :"runtime_role";
COMMIT;
