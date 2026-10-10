-- Additive, idempotent. Run as owner before API/worker changes.
-- psql -v ON_ERROR_STOP=1 -v runtime_schema=scoretransposer -v runtime_role=scoretransposer_app
BEGIN;
SET LOCAL search_path TO :"runtime_schema", pg_catalog;
ALTER TABLE activation_codes DROP CONSTRAINT IF EXISTS activation_codes_plan_code_check;
ALTER TABLE activation_codes ADD CONSTRAINT activation_codes_plan_code_check
  CHECK (plan_code IS NULL OR plan_code IN ('starter-monthly', 'starter-annual', 'converter-pro-monthly', 'converter-pro-annual', 'single-score', 'credits-50', 'credits-200'));
CREATE TABLE IF NOT EXISTS prepaid_credit_grants (
  activation_code_id text PRIMARY KEY REFERENCES activation_codes(id),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_code text NOT NULL CHECK (plan_code IN ('credits-50','credits-200')),
  credits integer NOT NULL CHECK (credits IN (50,200)),
  storage_tier text NOT NULL CHECK (storage_tier IN ('starter','converter-pro')),
  created_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_prepaid_credit_grants_user ON prepaid_credit_grants(user_id);
CREATE TABLE IF NOT EXISTS prepaid_credit_charges (
  job_family text NOT NULL CHECK (job_family IN ('score','legacy')),
  job_id text NOT NULL,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credit_cost integer NOT NULL CHECK (credit_cost > 0),
  status text NOT NULL CHECK (status IN ('reserved','spent','released')),
  created_at text NOT NULL,
  PRIMARY KEY(job_family,job_id)
);
CREATE INDEX IF NOT EXISTS idx_prepaid_credit_charges_user ON prepaid_credit_charges(user_id,status);
CREATE OR REPLACE FUNCTION scoretransposer_prepaid_status() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $function$
BEGIN
  UPDATE prepaid_credit_charges SET status = CASE
    WHEN NEW.status IN ('failed','cancelled') THEN 'released'
    WHEN NEW.status = 'completed' THEN 'spent' ELSE 'reserved' END
  WHERE job_family = TG_ARGV[0] AND job_id = NEW.id AND status = 'reserved';
  RETURN NEW;
END; $function$;
DROP TRIGGER IF EXISTS trg_score_jobs_prepaid_status ON score_jobs;
CREATE TRIGGER trg_score_jobs_prepaid_status AFTER UPDATE OF status ON score_jobs
FOR EACH ROW EXECUTE FUNCTION scoretransposer_prepaid_status('score');
DROP TRIGGER IF EXISTS trg_jobs_prepaid_status ON jobs;
CREATE TRIGGER trg_jobs_prepaid_status AFTER UPDATE OF status ON jobs
FOR EACH ROW EXECUTE FUNCTION scoretransposer_prepaid_status('legacy');
REVOKE ALL ON prepaid_credit_grants, prepaid_credit_charges FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON prepaid_credit_grants, prepaid_credit_charges TO :"runtime_role";
REVOKE ALL ON FUNCTION scoretransposer_prepaid_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION scoretransposer_prepaid_status() TO :"runtime_role";
COMMIT;
