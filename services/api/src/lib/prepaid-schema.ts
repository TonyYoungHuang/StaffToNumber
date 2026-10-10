export const PREPAID_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS prepaid_credit_grants (
    activation_code_id TEXT PRIMARY KEY REFERENCES activation_codes(id),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_code TEXT NOT NULL CHECK (plan_code IN ('credits-50', 'credits-200')),
    credits INTEGER NOT NULL CHECK (credits IN (50, 200)),
    storage_tier TEXT NOT NULL CHECK (storage_tier IN ('starter', 'converter-pro')),
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_prepaid_credit_grants_user ON prepaid_credit_grants(user_id);
  CREATE TABLE IF NOT EXISTS prepaid_credit_charges (
    job_family TEXT NOT NULL CHECK (job_family IN ('score', 'legacy')),
    job_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credit_cost INTEGER NOT NULL CHECK (credit_cost > 0),
    status TEXT NOT NULL CHECK (status IN ('reserved', 'spent', 'released')),
    created_at TEXT NOT NULL,
    PRIMARY KEY (job_family, job_id)
  );
  CREATE INDEX IF NOT EXISTS idx_prepaid_credit_charges_user ON prepaid_credit_charges(user_id, status);
`;
export const PREPAID_SQLITE_TRIGGERS = ["score_jobs", "jobs"].map((table, index) => `
  CREATE TRIGGER IF NOT EXISTS trg_${table}_prepaid_status AFTER UPDATE OF status ON ${table}
  BEGIN
    UPDATE prepaid_credit_charges SET status = CASE
      WHEN NEW.status IN ('failed', 'cancelled') THEN 'released'
      WHEN NEW.status = 'completed' THEN 'spent' ELSE 'reserved' END
    WHERE job_family = '${index === 0 ? "score" : "legacy"}' AND job_id = NEW.id AND status = 'reserved';
  END;
`).join("\n");

export function prepaidPostgresTriggers(schemaName: string) {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(schemaName)) throw new Error("Invalid prepaid schema.");
  const schema = `"${schemaName}"`;
  return `CREATE OR REPLACE FUNCTION ${schema}.scoretransposer_prepaid_status() RETURNS trigger
    LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    BEGIN
      UPDATE ${schema}.prepaid_credit_charges SET status = CASE
        WHEN NEW.status IN ('failed', 'cancelled') THEN 'released'
        WHEN NEW.status = 'completed' THEN 'spent' ELSE 'reserved' END
      WHERE job_family = TG_ARGV[0] AND job_id = NEW.id AND status = 'reserved';
      RETURN NEW;
    END; $function$;
    ${["score_jobs", "jobs"].map((table, i) => `
      DROP TRIGGER IF EXISTS trg_${table}_prepaid_status ON ${schema}.${table};
      CREATE TRIGGER trg_${table}_prepaid_status AFTER UPDATE OF status ON ${schema}.${table}
      FOR EACH ROW EXECUTE FUNCTION ${schema}.scoretransposer_prepaid_status('${i === 0 ? "score" : "legacy"}');`).join("\n")}`;
}
