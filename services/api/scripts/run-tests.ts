import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const [, , suite, ...files] = process.argv;
if (!suite || files.length === 0) throw new Error("Usage: run-tests.ts <suite> <test-file...>");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `score-api-${suite}-`));
const databaseFile = path.join(tempRoot, "app.sqlite");
const storageDir = path.join(tempRoot, "storage");
fs.mkdirSync(storageDir, { recursive: true });

try {
  const result = spawnSync(process.execPath, [
    "--import",
    "tsx",
    "--test",
    "--test-concurrency=1",
    ...files,
  ], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "test",
      DB_FILE: databaseFile,
      STORAGE_DIR: storageDir,
      STORAGE_BACKEND: "local",
      LIFECYCLE_CLEANUP_ENABLED: "false",
      JOB_BROKER_BACKEND: "database",
    },
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
