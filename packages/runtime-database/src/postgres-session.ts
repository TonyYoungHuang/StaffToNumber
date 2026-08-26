export type PostgresQuery = (sql: string, params?: unknown[]) => Promise<unknown>;

export type SchemaScopedPostgresExecutor = {
  query(sql: string, params?: unknown[]): Promise<unknown>;
  rollbackOpenTransaction(): Promise<void>;
};

export function createSchemaScopedPostgresExecutor(
  schema: string,
  query: PostgresQuery,
): SchemaScopedPostgresExecutor {
  const searchPath = `"${schema.replace(/"/gu, '""')}", public`;
  let transactionOpen = false;

  async function configureTransaction() {
    await query("SELECT set_config('search_path', $1, true)", [searchPath]);
  }

  async function rollbackOpenTransaction() {
    if (!transactionOpen) return;
    try {
      await query("ROLLBACK");
    } finally {
      transactionOpen = false;
    }
  }

  async function execute(sql: string, params: unknown[] = []) {
    const control = transactionControl(sql);
    if (control === "begin") {
      const result = await query(sql, params);
      transactionOpen = true;
      try {
        await configureTransaction();
        return result;
      } catch (error) {
        await rollbackOpenTransaction().catch(() => undefined);
        throw error;
      }
    }
    if (control === "commit" || control === "rollback") {
      try {
        return await query(sql, params);
      } finally {
        transactionOpen = false;
      }
    }
    if (transactionOpen) return query(sql, params);

    await query("BEGIN");
    transactionOpen = true;
    try {
      await configureTransaction();
      const result = await query(sql, params);
      await query("COMMIT");
      transactionOpen = false;
      return result;
    } catch (error) {
      await rollbackOpenTransaction().catch(() => undefined);
      throw error;
    }
  }

  return { query: execute, rollbackOpenTransaction };
}

export function transactionControl(sql: string): "begin" | "commit" | "rollback" | null {
  const normalized = sql.trimStart();
  if (/^BEGIN(?:\s|;|$)/iu.test(normalized)) return "begin";
  if (/^(?:COMMIT|END)(?:\s|;|$)/iu.test(normalized)) return "commit";
  if (/^ROLLBACK(?:\s|;|$)/iu.test(normalized)) return "rollback";
  return null;
}
