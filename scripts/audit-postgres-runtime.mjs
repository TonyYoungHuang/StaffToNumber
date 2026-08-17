import pg from "pg";

const targets = [
  ["owner", process.env.POSTGRES_OWNER_URL],
  ["runtime", process.env.POSTGRES_URL],
].filter((entry) => entry[1]);

if (targets.length === 0) throw new Error("POSTGRES_OWNER_URL or POSTGRES_URL is required.");

for (const [label, connectionString] of targets) {
  const client = new pg.Client({ connectionString, statement_timeout: 15_000 });
  await client.connect();
  try {
    const identity = await client.query(`
      SELECT current_database() AS database, current_user AS role,
        current_schema() AS current_schema,
        current_setting('search_path') AS search_path
    `);
    const schemas = await client.query(`
      SELECT schema_name,
        (SELECT COUNT(*)::integer FROM information_schema.tables t
          WHERE t.table_schema = s.schema_name AND t.table_type = 'BASE TABLE') AS tables
      FROM information_schema.schemata s
      WHERE schema_name NOT LIKE 'pg_%' AND schema_name <> 'information_schema'
      ORDER BY schema_name
    `);
    console.log(JSON.stringify({ label, ...identity.rows[0], schemas: schemas.rows }, null, 2));
  } finally {
    await client.end();
  }
}
