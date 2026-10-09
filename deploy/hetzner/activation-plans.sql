-- Additive migration; legacy day-based codes retain their original meaning.
-- Run as database owner with -v runtime_schema=scoretransposer.
BEGIN;
ALTER TABLE :"runtime_schema".activation_codes ADD COLUMN IF NOT EXISTS plan_code text
  CHECK (plan_code IS NULL OR plan_code IN ('starter-monthly', 'starter-annual', 'converter-pro-monthly', 'converter-pro-annual'));
COMMIT;
