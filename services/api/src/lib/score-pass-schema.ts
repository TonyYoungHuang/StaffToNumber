// Portable additive schema shared by SQLite initialization and the PostgreSQL
// incremental migration runner. A mapping belongs to the original purchase;
// later purchases fund that group without giving a document another owner.
export const SCORE_PASS_DOCUMENTS_SQL = `
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

export const SCORE_PASS_BACKFILL_SQL = `
  INSERT INTO score_pass_documents (pass_id, document_id, role, created_at)
    SELECT p.purchase_id, p.document_id, 'root', p.created_at FROM score_passes p
    JOIN score_documents d ON d.id = p.document_id
    WHERE p.document_id IS NOT NULL AND p.group_pass_id IS NULL
    ON CONFLICT(document_id) DO NOTHING;
`;
