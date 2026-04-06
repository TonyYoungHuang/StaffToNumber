import path from "node:path";

const cwd = process.cwd();

export const workerConfig = {
  dbFile: process.env.DB_FILE ?? path.join(cwd, "..", "api", "data", "app.sqlite"),
  storageDir: process.env.STORAGE_DIR ?? path.join(cwd, "..", "api", "storage"),
  pollIntervalMs: Number(process.env.WORKER_POLL_INTERVAL_MS ?? 3000),
  processingDelayMs: Number(process.env.WORKER_PROCESSING_DELAY_MS ?? 1500),
};
