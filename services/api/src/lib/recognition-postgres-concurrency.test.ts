import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { Pool } from "pg";
import { db, initDb } from "../db.js";
import { createUser } from "../repositories/auth-repository.js";
import { processBillingWebhookEvent } from "../repositories/billing-repository.js";
import { migrateSqliteToPostgres } from "./postgres-migration.js";

const connectionString = process.env.POSTGRES_TEST_URL?.trim();

test("real PostgreSQL user-row locking prevents two processes overspending five complex credits", { skip: !connectionString, timeout: 120_000 }, async () => {
  initDb();
  const user = createUser(`${crypto.randomUUID()}@pg-recognition.test`, "hash", "salt")!;
  const now = new Date().toISOString(), fileId = crypto.randomUUID();
  processBillingWebhookEvent(db, {
    provider: "stripe", eventId: crypto.randomUUID(), eventType: "customer.subscription.created", rawPayload: "local-pg-recognition-test",
    customer: { providerCustomerId: `cus-${user.id}`, userId: user.id },
    subscription: { providerSubscriptionId: `sub-${user.id}`, providerCustomerId: `cus-${user.id}`, userId: user.id,
      status: "active", planRef: "price-local-pg-starter", seatQuantity: 1, currentPeriodEnd: new Date(Date.now() + 30 * 86400_000).toISOString() },
  });
  db.prepare(`INSERT INTO files (id,user_id,original_name,stored_name,storage_path,mime_type,size_bytes,file_kind,created_at)
    VALUES (?,?,'test.pdf','test.pdf','/unused/test.pdf','application/pdf',100,'source_pdf',?)`).run(fileId, user.id, now);
  const input = { userId: user.id, title: "PG concurrency", sourceFileId: fileId, sourceFileKind: "source_pdf", sourceOriginalName: "test.pdf", recognitionMode: "complex", pageCount: 1 };
  const pool = new Pool({ connectionString, max: 1 }), client = await pool.connect();
  const schema = `score_recognition_${crypto.randomUUID().replaceAll("-", "")}`;
  const source = new DatabaseSync(":memory:");
  // The production CHECK constraints have a separately applied PostgreSQL DDL.
  // This concurrency fixture mirrors every column, PK and row in memory, then
  // uses the migration utility without asking it to translate those CHECKs.
  const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as Array<{ name: string }>;
  for (const { name } of tables) {
    const columns = db.prepare(`PRAGMA table_info(${quote(name)})`).all() as Array<{ name: string; type: string; pk: number; dflt_value: string | null }>;
    const definitions = columns.map(column => `${quote(column.name)} ${column.type || "TEXT"}${column.dflt_value === null ? "" : ` DEFAULT ${column.dflt_value}`}`);
    const primary = columns.filter(column => column.pk).sort((a,b) => a.pk-b.pk);
    if (primary.length) definitions.push(`PRIMARY KEY (${primary.map(column => quote(column.name)).join(",")})`);
    source.exec(`CREATE TABLE ${quote(name)} (${definitions.join(",")})`);
    for (const row of db.prepare(`SELECT * FROM ${quote(name)}`).all() as Array<Record<string, unknown>>) {
      source.prepare(`INSERT INTO ${quote(name)} (${columns.map(column => quote(column.name)).join(",")}) VALUES (${columns.map(() => "?").join(",")})`)
        .run(...columns.map(column => row[column.name] as null | string | number | bigint | Uint8Array));
    }
  }
  try {
    const migration = await migrateSqliteToPostgres({ source, target: client, targetSchema: schema });
    assert.equal(migration.verified, true);
    const code = `(async()=>{const {createOmrImportScoreDocument}=await import('./src/repositories/score-repository.ts');
      try {createOmrImportScoreDocument(JSON.parse(process.env.RECOGNITION_TEST_INPUT));process.stdout.write(JSON.stringify({ok:true}));}
      catch(error){process.stdout.write(JSON.stringify({ok:false,code:error.code,message:error.message}));}
      const {db}=await import('./src/db.ts');db.close();})().catch(error=>{process.stderr.write(String(error));process.exitCode=1;});`;
    const run = () => new Promise<{ ok: boolean; code?: string; message?: string }>((resolve, reject) => {
      const child = spawn(process.execPath, ["--import", "tsx", "-e", code], { cwd: process.cwd(),
        env: { ...process.env, RUNTIME_DATABASE_PRIMARY: "postgres", POSTGRES_URL: connectionString, POSTGRES_SCHEMA: schema,
          QUOTA_STARTER_JOBS_PER_MONTH: "5", RECOGNITION_TEST_INPUT: JSON.stringify(input) } });
      let stdout = "", stderr = ""; child.stdout.on("data", chunk => { stdout += chunk; }); child.stderr.on("data", chunk => { stderr += chunk; });
      child.on("error", reject); child.on("close", status => { if (status !== 0) reject(new Error(stderr)); else { try { resolve(JSON.parse(stdout)); } catch (error) { reject(error); } } });
    });
    const results = await Promise.all([run(), run()]);
    assert.equal(results.filter(result => result.ok).length, 1, JSON.stringify(results));
    assert.equal(results.find(result => !result.ok)?.code, "PLAN_JOB_QUOTA_EXCEEDED", JSON.stringify(results));
    const jobs = await client.query(`SELECT params_json FROM "${schema}".score_jobs WHERE user_id=$1`, [user.id]);
    assert.equal(jobs.rowCount, 1); assert.equal(JSON.parse(jobs.rows[0].params_json).creditCost, 5);
  } finally {
    // schema is generated above, never the shared/public schema or user data.
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    client.release(); await pool.end(); source.close();
  }
});
