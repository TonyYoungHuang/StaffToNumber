import fs from "node:fs";
import path from "node:path";
import { config } from "../src/config.js";
import { db } from "../src/db.js";
import { objectStorage } from "../src/lib/object-storage.js";
import { migrateLocalFilesToObjectStorage } from "../src/lib/storage-migration.js";

function argumentValue(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

if (objectStorage.backend !== "s3") throw new Error("Set STORAGE_BACKEND=s3 before running storage migration.");
const limit = Number(argumentValue("limit") ?? 10_000);
const dryRun = process.argv.includes("--dry-run");
const deleteLocalAfterCommit = process.argv.includes("--delete-local");
const reportPath = path.resolve(argumentValue("report") ?? path.join(
  process.cwd(),
  "artifacts",
  `storage-migration-${new Date().toISOString().replace(/[:.]/gu, "-")}.json`,
));
const report = await migrateLocalFilesToObjectStorage({
  db,
  storage: objectStorage,
  storageRoot: config.storageDir,
  limit,
  dryRun,
  deleteLocalAfterCommit,
});
await fs.promises.mkdir(path.dirname(reportPath), { recursive: true });
await fs.promises.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  reportPath,
  selected: report.selected,
  migrated: report.migrated.length,
  failed: report.failed.length,
  dryRun,
  deleteLocalAfterCommit,
}));
if (report.failed.length > 0) process.exitCode = 1;
