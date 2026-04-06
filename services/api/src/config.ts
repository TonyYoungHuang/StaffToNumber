import path from "node:path";

const rootDir = process.cwd();

export const config = {
  host: process.env.HOST ?? "0.0.0.0",
  port: Number(process.env.PORT ?? 4000),
  dbFile: process.env.DB_FILE ?? path.join(rootDir, "data", "app.sqlite"),
  storageDir: process.env.STORAGE_DIR ?? path.join(rootDir, "storage"),
  sessionDays: Number(process.env.SESSION_DAYS ?? 30),
  entitlementDays: Number(process.env.DEFAULT_ENTITLEMENT_DAYS ?? 365),
  seedActivationCodes: (process.env.SEED_ACTIVATION_CODES ?? "DEMO-1YEAR-ACCESS")
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean),
};
