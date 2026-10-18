-- Prepared only: awaits deploy approval. Never run as part of this repair job.
-- Apply as schema owner before starting this API version after approval.
-- psql -v ON_ERROR_STOP=1 -v runtime_schema=scoretransposer -f billing-webhook-ordering.sql
BEGIN;
SET LOCAL search_path TO :"runtime_schema", pg_catalog;
CREATE TABLE IF NOT EXISTS billing_resource_versions (
  provider TEXT NOT NULL,
  resource_kind TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  event_at TEXT NOT NULL,
  event_id TEXT NOT NULL,
  PRIMARY KEY (provider, resource_kind, resource_id)
);
COMMIT;
