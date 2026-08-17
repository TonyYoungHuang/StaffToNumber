import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");
const work = path.join(root, ".tmp", "backup-restore");
const postgresReportPath = path.join(work, "postgres-report.json");
const r2ReportPath = path.join(work, "r2-report.json");
const dumpPath = path.join(work, "source.dump");
const evidencePath = path.join(root, "docs", "audits", "evidence", "production-backup-restore-drill-2026-08-17.json");

fs.rmSync(work, { recursive: true, force: true });
fs.mkdirSync(work, { recursive: true });

try {
  await run("powershell.exe", [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.join(root, "scripts", "run-production-backup-restore-drill.ps1"),
  ], 600_000);

  await run(process.execPath, [path.join(root, "scripts", "run-r2-wrangler-backup-restore-drill.mjs")], 600_000, {
    R2_BUCKET: "scoretransposer-production",
    R2_PREFIX: "production",
    R2_DRILL_SOURCE_FILE: dumpPath,
    R2_DRILL_REPORT: r2ReportPath,
  });

  const postgres = readJson(postgresReportPath);
  const r2Drill = readJson(r2ReportPath);
  const r2 = {
    passed: Boolean(r2Drill.passed && r2Drill.cleanupPassed && postgres.dumpSha256 === r2Drill.restoredSha256),
    bucket: r2Drill.bucket,
    key: r2Drill.sourceKey,
    sourceSha256: postgres.dumpSha256,
    restoredSha256: r2Drill.restoredSha256,
    bytes: r2Drill.payloadBytes,
    temporaryObjectDeleted: r2Drill.cleanupPassed,
    deletionVerification: "Authenticated Wrangler delete completed and a subsequent remote get returned not found",
    authentication: r2Drill.authentication,
  };
  const report = {
    schemaVersion: 1,
    environment: "production",
    startedAt: postgres.startedAt,
    completedAt: new Date().toISOString(),
    passed: Boolean(postgres.passed && r2.passed),
    postgres: {
      scope: postgres.scope,
      schema: postgres.schema,
      tableCount: postgres.tableCount,
      sourceAndRestoreCountsMatch: postgres.sourceAndRestoreCountsMatch,
      dumpSha256: postgres.dumpSha256,
      dumpBytes: postgres.dumpBytes,
      sourceCounts: postgres.sourceCounts,
      restoredCounts: postgres.restoredCounts,
      productionWritesPerformed: postgres.productionWritesPerformed,
    },
    r2,
    limitations: [
      ...postgres.limitations,
      "The R2 drill proves object-level restore in the production bucket, not an independent cross-account or cross-region backup.",
    ],
  };
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  fs.writeFileSync(evidencePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (!report.passed) throw new Error("Production backup and restore drill did not pass.");
  console.log(`Production backup and restore drill passed: ${path.relative(root, evidencePath)}`);
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}

async function run(file, args, timeout, extraEnvironment = {}) {
  const result = await execFileAsync(file, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...extraEnvironment, CI: "true", NO_COLOR: "1" },
    maxBuffer: 8 * 1024 * 1024,
    timeout,
    windowsHide: true,
  });
  if (result.stdout?.trim()) console.log(result.stdout.trim());
  if (result.stderr?.trim()) console.error(result.stderr.trim());
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
