-- Existing email accounts opt in; unused codes can create a code account.
BEGIN;
ALTER TABLE :"runtime_schema".activation_codes ADD COLUMN IF NOT EXISTS login_enabled_at text;
COMMIT;
