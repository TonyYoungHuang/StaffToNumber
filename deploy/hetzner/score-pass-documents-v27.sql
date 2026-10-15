-- Schema 27: additive only. Back up the database before applying.
-- Use the same runtime_schema/runtime_role variables as the existing migrations.
BEGIN;
SET LOCAL search_path TO :"runtime_schema", public;
ALTER TABLE score_passes ADD COLUMN IF NOT EXISTS group_pass_id TEXT REFERENCES score_passes(purchase_id);
ALTER TABLE billing_one_time_purchases ADD COLUMN IF NOT EXISTS target_document_id TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS target_document_id TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS intended_action_json TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS resume_consumed_at TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS resume_result_json TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS checkout_intent_hash TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS checkout_plan_code TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS pass_mode TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS provider_checkout_started_at TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS return_site TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS return_path TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS return_state_json TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS return_token_hash TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS return_token_expires_at TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS return_token_consumed_at TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_orders_checkout_intent ON payment_orders(user_id, provider, checkout_intent_hash) WHERE checkout_intent_hash IS NOT NULL;
CREATE TABLE IF NOT EXISTS score_document_derivations (
    document_id TEXT PRIMARY KEY REFERENCES score_documents(id) ON DELETE CASCADE,
    source_document_id TEXT NOT NULL REFERENCES score_documents(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    derivation_kind TEXT NOT NULL CHECK (derivation_kind = 'part_extract'),
    created_at TEXT NOT NULL
  );
CREATE TABLE IF NOT EXISTS score_upload_drafts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    document_id TEXT NOT NULL UNIQUE REFERENCES score_documents(id) ON DELETE CASCADE,
    prepare_intent_id TEXT NOT NULL,
    recognition_mode TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'awaiting_payment',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    confirmed_order_id TEXT,
    task_id TEXT,
    UNIQUE(user_id, prepare_intent_id)
  );
  CREATE INDEX IF NOT EXISTS idx_score_upload_drafts_expiry ON score_upload_drafts(status, expires_at);
CREATE TABLE IF NOT EXISTS score_pass_documents (
  pass_id TEXT NOT NULL REFERENCES score_passes(purchase_id) ON DELETE CASCADE,
  document_id TEXT NOT NULL UNIQUE REFERENCES score_documents(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('root', 'part_extract')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (pass_id, document_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_score_pass_documents_root ON score_pass_documents(pass_id) WHERE role = 'root';
CREATE INDEX IF NOT EXISTS idx_score_passes_group ON score_passes(group_pass_id);
-- Existing purchases retain their credit_limit and all existing job charges.
INSERT INTO score_pass_documents (pass_id, document_id, role, created_at)
  SELECT p.purchase_id, p.document_id, 'root', p.created_at FROM score_passes p
  JOIN score_documents d ON d.id = p.document_id
  JOIN billing_one_time_purchases b ON b.id = p.purchase_id
  WHERE b.status = 'active' AND b.paid_at IS NOT NULL AND p.document_id IS NOT NULL AND p.group_pass_id IS NULL
  ON CONFLICT(document_id) DO NOTHING;
ALTER TABLE IF EXISTS public.score_payment_orders ADD COLUMN IF NOT EXISTS target_document_id TEXT;
ALTER TABLE IF EXISTS public.score_payment_orders ADD COLUMN IF NOT EXISTS intended_action_json TEXT;
ALTER TABLE IF EXISTS public.score_payment_orders ADD COLUMN IF NOT EXISTS resume_consumed_at TEXT;
ALTER TABLE IF EXISTS public.score_payment_orders ADD COLUMN IF NOT EXISTS resume_result_json TEXT;
ALTER TABLE IF EXISTS public.score_payment_orders ADD COLUMN IF NOT EXISTS checkout_intent_hash TEXT;
ALTER TABLE IF EXISTS public.score_payment_orders ADD COLUMN IF NOT EXISTS checkout_plan_code TEXT;
ALTER TABLE IF EXISTS public.score_payment_orders ADD COLUMN IF NOT EXISTS pass_mode TEXT;
ALTER TABLE IF EXISTS public.score_payment_orders ADD COLUMN IF NOT EXISTS provider_checkout_started_at TEXT;
ALTER TABLE IF EXISTS public.score_payment_orders ADD COLUMN IF NOT EXISTS return_site TEXT;
ALTER TABLE IF EXISTS public.score_payment_orders ADD COLUMN IF NOT EXISTS return_path TEXT;
ALTER TABLE IF EXISTS public.score_payment_orders ADD COLUMN IF NOT EXISTS return_state_json TEXT;
ALTER TABLE IF EXISTS public.score_payment_orders ADD COLUMN IF NOT EXISTS return_token_hash TEXT;
ALTER TABLE IF EXISTS public.score_payment_orders ADD COLUMN IF NOT EXISTS return_token_expires_at TEXT;
ALTER TABLE IF EXISTS public.score_payment_orders ADD COLUMN IF NOT EXISTS return_token_consumed_at TEXT;
REVOKE ALL ON score_pass_documents, score_document_derivations, score_upload_drafts FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON score_pass_documents, score_document_derivations, score_upload_drafts TO :"runtime_role";
COMMIT;
