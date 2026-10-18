// Additive ordering ledger. Production PostgreSQL requires the reviewed SQL
// migration; API startup only validates PostgreSQL and never applies it.
export const BILLING_ORDERING_SQL = `
CREATE TABLE IF NOT EXISTS billing_resource_versions (
  provider TEXT NOT NULL,
  resource_kind TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  event_at TEXT NOT NULL,
  event_id TEXT NOT NULL,
  PRIMARY KEY (provider, resource_kind, resource_id)
);`;
