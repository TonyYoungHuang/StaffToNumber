BEGIN;

CREATE TABLE IF NOT EXISTS :"runtime_schema".lifetime_upgrade_orders (
  order_id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES :"runtime_schema".users(id) ON DELETE SET NULL,
  customer_id TEXT NOT NULL,
  subscription_id TEXT NOT NULL,
  invoice_id TEXT NOT NULL,
  paid_minor INTEGER NOT NULL CHECK (paid_minor > 0),
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,
  quoted_at INTEGER NOT NULL,
  credit_minor INTEGER NOT NULL CHECK (credit_minor >= 0 AND credit_minor < 9900),
  expires_at INTEGER NOT NULL,
  coupon_id TEXT,
  promotion_code_id TEXT,
  state TEXT NOT NULL CHECK (state IN ('reserved', 'paid', 'expired')),
  renewal_stopped_at TEXT,
  renewal_error TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS lifetime_upgrade_invoice_idx ON :"runtime_schema".lifetime_upgrade_orders(invoice_id) WHERE state != 'expired';
CREATE TABLE IF NOT EXISTS :"runtime_schema".lifetime_payment_amounts (
  order_id TEXT PRIMARY KEY,
  subtotal_minor INTEGER NOT NULL CHECK (subtotal_minor = 9900),
  discount_minor INTEGER NOT NULL CHECK (discount_minor >= 0 AND discount_minor < 9900),
  tax_minor INTEGER NOT NULL CHECK (tax_minor >= 0),
  total_minor INTEGER NOT NULL,
  CHECK (total_minor = subtotal_minor - discount_minor + tax_minor)
);

REVOKE ALL ON :"runtime_schema".lifetime_upgrade_orders FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON :"runtime_schema".lifetime_upgrade_orders TO :"runtime_role";
REVOKE ALL ON :"runtime_schema".lifetime_payment_amounts FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON :"runtime_schema".lifetime_payment_amounts TO :"runtime_role";
COMMIT;
