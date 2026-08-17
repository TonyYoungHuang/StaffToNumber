import pg from "pg";
import { ensurePostgresRuntimeTriggers } from "../services/api/src/lib/postgres-migration.ts";

const connectionString = process.env.POSTGRES_OWNER_URL?.trim() || process.env.POSTGRES_URL?.trim();
const targetSchema = process.env.POSTGRES_SCHEMA?.trim() || "scoretransposer";
if (!connectionString) throw new Error("POSTGRES_OWNER_URL or POSTGRES_URL is required.");

const client = new pg.Client({ connectionString, statement_timeout: 30_000 });
await client.connect();
try {
  const result = await ensurePostgresRuntimeTriggers({ target: client, targetSchema });
  console.log(JSON.stringify({ ...result, repaired: true }));
} finally {
  await client.end();
}
