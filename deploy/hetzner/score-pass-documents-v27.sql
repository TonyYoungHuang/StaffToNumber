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
  WHERE p.document_id IS NOT NULL AND p.group_pass_id IS NULL
  ON CONFLICT(document_id) DO NOTHING;
ALTER TABLE IF EXISTS public.score_payment_orders ADD COLUMN IF NOT EXISTS target_document_id TEXT;
ALTER TABLE IF EXISTS public.score_payment_orders ADD COLUMN IF NOT EXISTS intended_action_json TEXT;
ALTER TABLE IF EXISTS public.score_payment_orders ADD COLUMN IF NOT EXISTS resume_consumed_at TEXT;
ALTER TABLE IF EXISTS public.score_payment_orders ADD COLUMN IF NOT EXISTS resume_result_json TEXT;
REVOKE ALL ON score_pass_documents FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON score_pass_documents TO :"runtime_role";
COMMIT;
