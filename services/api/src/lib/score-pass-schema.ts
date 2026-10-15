// Portable additive schema shared by SQLite initialization and the PostgreSQL
// incremental migration runner. A mapping belongs to the original purchase;
// later purchases fund that group without giving a document another owner.
export const SCORE_PASS_DOCUMENTS_SQL = `
  CREATE TABLE IF NOT EXISTS score_document_derivations (
    document_id TEXT PRIMARY KEY REFERENCES score_documents(id) ON DELETE CASCADE,
    source_document_id TEXT NOT NULL REFERENCES score_documents(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    derivation_kind TEXT NOT NULL CHECK (derivation_kind = 'part_extract'),
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS score_pass_documents (
    pass_id TEXT NOT NULL REFERENCES score_passes(purchase_id) ON DELETE CASCADE,
    document_id TEXT NOT NULL UNIQUE REFERENCES score_documents(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('root', 'part_extract')),
    created_at TEXT NOT NULL,
    PRIMARY KEY (pass_id, document_id)
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_score_pass_documents_root
    ON score_pass_documents(pass_id) WHERE role = 'root';
`;

export const SCORE_UPLOAD_DRAFTS_SQL = `
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
`;

export const PAYMENT_RETURN_COLUMNS = [
  'checkout_intent_hash', 'checkout_plan_code', 'pass_mode', 'provider_checkout_started_at', 'provider_checkout_params_hash', 'return_site', 'return_path', 'return_state_json',
  'return_token_hash', 'return_token_expires_at', 'return_token_consumed_at',
] as const;

export const SCORE_PASS_BACKFILL_SQL = `
  INSERT INTO score_pass_documents (pass_id, document_id, role, created_at)
    SELECT p.purchase_id, p.document_id, 'root', p.created_at FROM score_passes p
    JOIN score_documents d ON d.id = p.document_id
    JOIN billing_one_time_purchases b ON b.id = p.purchase_id
    WHERE p.document_id IS NOT NULL AND p.group_pass_id IS NULL
      AND b.status = 'active' AND b.paid_at IS NOT NULL
    ON CONFLICT(document_id) DO NOTHING;
`;
