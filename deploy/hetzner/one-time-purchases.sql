-- Additive migration. Execute as owner before deploying API and worker.
-- psql -v ON_ERROR_STOP=1 -v runtime_schema=scoretransposer -v runtime_role=scoretransposer_app
BEGIN;
CREATE TABLE IF NOT EXISTS :"runtime_schema".billing_one_time_purchases (
  id text PRIMARY KEY,
  user_id text REFERENCES :"runtime_schema".users(id) ON DELETE SET NULL,
  plan_code text NOT NULL,
  plan_ref text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'active', 'refunded')),
  checkout_session_id text UNIQUE,
  payment_intent_id text UNIQUE,
  starts_at text,
  ends_at text,
  paid_at text,
  amount_minor integer,
  currency text,
  amount_refunded_minor integer NOT NULL DEFAULT 0,
  created_at text NOT NULL,
  updated_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS billing_one_time_purchases_user_idx
  ON :"runtime_schema".billing_one_time_purchases (user_id, status, ends_at);
REVOKE ALL ON :"runtime_schema".billing_one_time_purchases FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON :"runtime_schema".billing_one_time_purchases TO :"runtime_role";
COMMIT;
