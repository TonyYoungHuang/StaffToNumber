-- Schema 28: fractional credit settlement for partial recognition delivery.
-- Prepared only. Do NOT apply without the later deployment authorization.
-- Run as schema owner after a verified backup, before the new API/worker.
-- psql -v ON_ERROR_STOP=1 -v runtime_schema=scoretransposer -f recognition-partial-credits-schema28.sql
BEGIN;
SET LOCAL search_path TO :"runtime_schema", pg_catalog;
ALTER TABLE prepaid_credit_charges
  ALTER COLUMN credit_cost TYPE NUMERIC(18,4) USING credit_cost::NUMERIC(18,4);
-- Existing positive-cost constraint and reserved/spent/released triggers stay.
-- Zero delivered work releases the reservation; it never inserts a zero cost.
COMMIT;
