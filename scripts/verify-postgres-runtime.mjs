import { randomUUID } from "node:crypto";
import pg from "pg";
import { createRuntimeDatabase } from "@score/runtime-database";

const connectionString = process.env.POSTGRES_URL?.trim();
const schema = process.env.POSTGRES_SCHEMA?.trim() || "scoretransposer";
if (!connectionString) throw new Error("POSTGRES_URL is required.");

const requiredTables = [
  "users",
  "sessions",
  "files",
  "score_documents",
  "score_jobs",
  "jobs",
  "billing_subscriptions",
  "job_dispatch_outbox",
  "service_runtime",
  "score_revisions",
  "score_assets",
  "omr_diagnostics",
  "score_collaboration_documents",
  "score_collaboration_updates",
  "score_collaboration_snapshots",
  "score_classrooms",
  "score_classroom_students",
  "score_student_guardians",
  "score_classroom_notifications",
  "score_notification_preferences",
  "score_notification_deliveries",
];

const client = new pg.Client({ connectionString, statement_timeout: 15_000 });
await client.connect();
try {
  const tables = await client.query(`
    SELECT table_name,
      has_table_privilege(current_user, format('%I.%I', table_schema, table_name), 'SELECT') AS can_select,
      has_table_privilege(current_user, format('%I.%I', table_schema, table_name), 'INSERT') AS can_insert,
      has_table_privilege(current_user, format('%I.%I', table_schema, table_name), 'UPDATE') AS can_update,
      has_table_privilege(current_user, format('%I.%I', table_schema, table_name), 'DELETE') AS can_delete
    FROM information_schema.tables
    WHERE table_schema = $1 AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `, [schema]);
  const available = new Set(tables.rows.map((row) => row.table_name));
  const missing = requiredTables.filter((table) => !available.has(table));
  const underprivileged = tables.rows.filter((row) => !row.can_select || !row.can_insert || !row.can_update || !row.can_delete);
  if (missing.length > 0) throw new Error(`Missing required runtime tables: ${missing.join(", ")}.`);
  if (underprivileged.length > 0) throw new Error(`Runtime role lacks CRUD privileges on: ${underprivileged.map((row) => row.table_name).join(", ")}.`);
  const triggers = await client.query(`
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE trigger_schema = $1
      AND trigger_name IN (
        'trg_jobs_dispatch_insert', 'trg_jobs_dispatch_retry', 'trg_jobs_dispatch_ack',
        'trg_score_jobs_dispatch_insert', 'trg_score_jobs_dispatch_retry', 'trg_score_jobs_dispatch_ack'
      )
    ORDER BY trigger_name
  `, [schema]);
  if (triggers.rowCount !== 6) throw new Error(`Expected 6 job dispatch triggers, found ${triggers.rowCount ?? 0}.`);
  console.log(JSON.stringify({ phase: "catalog", schema, tables: tables.rowCount, requiredTables: requiredTables.length, runtimeTriggers: triggers.rowCount, crudReady: true }));
} finally {
  await client.end();
}

const database = createRuntimeDatabase({
  primary: "postgres",
  postgresUrl: connectionString,
  postgresSchema: schema,
  queryTimeoutMs: 15_000,
});
const serviceName = `runtime-verification-${randomUUID()}`;
try {
  database.exec("BEGIN");
  database.prepare(`
    INSERT INTO service_runtime (service_name, status, message, details_json, last_heartbeat_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(serviceName, "verifying", "transaction rollback probe", "{}", new Date().toISOString(), new Date().toISOString());
  database.prepare("UPDATE service_runtime SET status = ? WHERE service_name = ?").run("ready", serviceName);
  const row = database.prepare("SELECT service_name AS serviceName, status FROM service_runtime WHERE service_name = ?").get(serviceName);
  if (!row || row.serviceName !== serviceName || row.status !== "ready") throw new Error("Runtime adapter read/write verification failed.");
  database.exec("ROLLBACK");
  const rolledBack = database.prepare("SELECT service_name FROM service_runtime WHERE service_name = ?").get(serviceName);
  if (rolledBack) throw new Error("Runtime adapter transaction rollback verification failed.");
  console.log(JSON.stringify({ phase: "adapter", schema, writeReadUpdateRollback: true }));
} catch (error) {
  try {
    database.exec("ROLLBACK");
  } catch {
    // The original failure is more useful than a secondary rollback failure.
  }
  throw error;
} finally {
  database.close();
}
