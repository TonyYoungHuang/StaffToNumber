import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { config } from "./config.js";

const dbDir = path.dirname(config.dbFile);
fs.mkdirSync(dbDir, { recursive: true });
fs.mkdirSync(config.storageDir, { recursive: true });

export const db = new DatabaseSync(config.dbFile);
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA busy_timeout = 5000;");

function ensureColumn(tableName: string, columnName: string, columnDefinition: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition};`);
  }
}

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      revoked_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS activation_codes (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      entitlement_days INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      redeemed_at TEXT,
      redeemed_by_user_id TEXT,
      FOREIGN KEY (redeemed_by_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS user_entitlements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      activation_code_id TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (activation_code_id) REFERENCES activation_codes(id)
    );

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      file_kind TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      input_file_id TEXT NOT NULL,
      direction TEXT NOT NULL,
      status TEXT NOT NULL,
      result_kind TEXT NOT NULL,
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      output_file_id TEXT,
      draft_bundle_file_id TEXT,
      preview_text TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (input_file_id) REFERENCES files(id),
      FOREIGN KEY (output_file_id) REFERENCES files(id),
      FOREIGN KEY (draft_bundle_file_id) REFERENCES files(id)
    );

    CREATE TABLE IF NOT EXISTS payment_orders (
      id TEXT PRIMARY KEY,
      public_token TEXT NOT NULL UNIQUE,
      user_id TEXT,
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      customer_email TEXT,
      locale TEXT,
      entitlement_days INTEGER NOT NULL,
      checkout_session_id TEXT,
      transaction_id TEXT,
      checkout_url TEXT,
      amount_minor INTEGER,
      currency TEXT,
      activation_code_id TEXT,
      paid_at TEXT,
      cancelled_at TEXT,
      failure_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (activation_code_id) REFERENCES activation_codes(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      requested_email TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      consumed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS service_runtime (
      service_name TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      message TEXT,
      details_json TEXT,
      last_heartbeat_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_requests (
      id TEXT PRIMARY KEY,
      reference_code TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      locale TEXT NOT NULL,
      contact_name TEXT,
      contact_email TEXT NOT NULL,
      account_email TEXT,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      order_reference TEXT,
      job_reference TEXT,
      source_page TEXT,
      source_context TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON activation_codes(code);
    CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_id ON user_entitlements(user_id);
    CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);
    CREATE INDEX IF NOT EXISTS idx_payment_orders_provider ON payment_orders(provider);
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_support_requests_status ON support_requests(status);
    CREATE INDEX IF NOT EXISTS idx_support_requests_contact_email ON support_requests(contact_email);
    CREATE INDEX IF NOT EXISTS idx_support_requests_created_at ON support_requests(created_at);
  `);

  ensureColumn("jobs", "output_file_id", "TEXT");
  ensureColumn("jobs", "draft_bundle_file_id", "TEXT");
  ensureColumn("jobs", "preview_text", "TEXT");
  ensureColumn("activation_codes", "batch_id", "TEXT");
  ensureColumn("activation_codes", "note", "TEXT");
  ensureColumn("activation_codes", "expires_at", "TEXT");
  ensureColumn("activation_codes", "created_by", "TEXT");
  ensureColumn("activation_codes", "disabled_at", "TEXT");
  ensureColumn("payment_orders", "customer_email", "TEXT");
  ensureColumn("payment_orders", "user_id", "TEXT");
  ensureColumn("payment_orders", "locale", "TEXT");
  ensureColumn("payment_orders", "entitlement_days", "INTEGER NOT NULL DEFAULT 365");
  ensureColumn("payment_orders", "checkout_session_id", "TEXT");
  ensureColumn("payment_orders", "transaction_id", "TEXT");
  ensureColumn("payment_orders", "checkout_url", "TEXT");
  ensureColumn("payment_orders", "amount_minor", "INTEGER");
  ensureColumn("payment_orders", "currency", "TEXT");
  ensureColumn("payment_orders", "activation_code_id", "TEXT");
  ensureColumn("payment_orders", "paid_at", "TEXT");
  ensureColumn("payment_orders", "cancelled_at", "TEXT");
  ensureColumn("payment_orders", "failure_reason", "TEXT");
  ensureColumn("support_requests", "reference_code", "TEXT");
  ensureColumn("support_requests", "category", "TEXT");
  ensureColumn("support_requests", "locale", "TEXT NOT NULL DEFAULT 'en'");
  ensureColumn("support_requests", "contact_name", "TEXT");
  ensureColumn("support_requests", "contact_email", "TEXT");
  ensureColumn("support_requests", "account_email", "TEXT");
  ensureColumn("support_requests", "subject", "TEXT");
  ensureColumn("support_requests", "message", "TEXT");
  ensureColumn("support_requests", "order_reference", "TEXT");
  ensureColumn("support_requests", "job_reference", "TEXT");
  ensureColumn("support_requests", "source_page", "TEXT");
  ensureColumn("support_requests", "source_context", "TEXT");
  ensureColumn("support_requests", "status", "TEXT NOT NULL DEFAULT 'open'");
  ensureColumn("support_requests", "created_at", "TEXT");
  ensureColumn("support_requests", "updated_at", "TEXT");

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_activation_codes_batch_id ON activation_codes(batch_id);
    CREATE INDEX IF NOT EXISTS idx_activation_codes_status ON activation_codes(status);
    CREATE INDEX IF NOT EXISTS idx_payment_orders_checkout_session_id ON payment_orders(checkout_session_id);
    CREATE INDEX IF NOT EXISTS idx_payment_orders_transaction_id ON payment_orders(transaction_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_support_requests_reference_code ON support_requests(reference_code);
  `);
}
