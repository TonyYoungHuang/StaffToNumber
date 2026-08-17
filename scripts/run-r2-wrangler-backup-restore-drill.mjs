import { createHash, randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");
const wrangler = path.join(root, "node_modules", "wrangler", "bin", "wrangler.js");
const bucket = process.env.R2_BUCKET?.trim();
const sourceFile = process.env.R2_DRILL_SOURCE_FILE?.trim();
const outputPath = path.resolve(
  process.env.R2_DRILL_REPORT || ".tmp/backup-restore/r2-wrangler-report.json",
);
const prefix = normalizePrefix(process.env.R2_PREFIX || "production");

if (!bucket) throw new Error("R2_BUCKET is required.");
if (!sourceFile || !fs.existsSync(sourceFile)) {
  throw new Error("R2_DRILL_SOURCE_FILE must point to the PostgreSQL backup file.");
}
if (!fs.existsSync(wrangler)) throw new Error(`Wrangler is not installed at ${wrangler}.`);

const startedAt = new Date().toISOString();
const drillId = `restore-drill-${startedAt.replace(/[:.]/gu, "-")}-${randomBytes(4).toString("hex")}`;
const objectKey = `${prefix}ops/restore-drills/${drillId}/postgres.dump`;
const objectPath = `${bucket}/${objectKey}`;
const restoredFile = path.join(path.dirname(outputPath), `${drillId}-restored.dump`);
const sourceSha256 = sha256File(sourceFile);
let restoredSha256 = null;
let cleanupPassed = false;
let uploaded = false;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });

try {
  await wranglerCommand(["r2", "object", "put", objectPath, "--file", path.resolve(sourceFile), "--remote", "--force"]);
  uploaded = true;
  await wranglerCommand(["r2", "object", "get", objectPath, "--file", restoredFile, "--remote"]);
  restoredSha256 = sha256File(restoredFile);
  if (sourceSha256 !== restoredSha256) throw new Error("R2 restored object checksum mismatch.");
} finally {
  if (uploaded) {
    await wranglerCommand(["r2", "object", "delete", objectPath, "--remote", "--force"]);
    cleanupPassed = await objectIsAbsent(objectPath, restoredFile);
  }
  fs.rmSync(restoredFile, { force: true });
}

const report = {
  schemaVersion: 1,
  drillId,
  startedAt,
  completedAt: new Date().toISOString(),
  scope: "R2 production object upload, download restore, checksum verification, and cleanup",
  authentication: "Cloudflare Wrangler OAuth session",
  bucket,
  sourceKey: objectKey,
  restoredKey: objectKey,
  sourceFile: path.basename(sourceFile),
  payloadBytes: fs.statSync(sourceFile).size,
  sourceSha256,
  restoredSha256,
  backupReadPassed: restoredSha256 === sourceSha256,
  restorePassed: restoredSha256 === sourceSha256,
  cleanupPassed,
  passed: restoredSha256 === sourceSha256 && cleanupPassed,
  limitations: [
    "This proves object-level recovery in the configured production R2 bucket.",
    "It does not prove an independent account or cross-region disaster-recovery copy.",
    "The drill uses the authenticated Wrangler operator session; production runtime credentials are validated separately.",
  ],
};

fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`R2 Wrangler restore drill ${report.passed ? "passed" : "failed"}: ${outputPath}`);
if (!report.passed) process.exitCode = 1;

async function objectIsAbsent(target, destination) {
  fs.rmSync(destination, { force: true });
  try {
    await wranglerCommand(["r2", "object", "get", target, "--file", destination, "--remote"]);
    return false;
  } catch (error) {
    const output = `${error.stdout || ""}\n${error.stderr || ""}`;
    return /not found|does not exist|404/iu.test(output);
  } finally {
    fs.rmSync(destination, { force: true });
  }
}

async function wranglerCommand(args) {
  try {
    return await execFileAsync(process.execPath, [wrangler, ...args], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, CI: "true", NO_COLOR: "1" },
      maxBuffer: 4 * 1024 * 1024,
      timeout: 180_000,
      windowsHide: true,
    });
  } catch (error) {
    const detail = [error.stdout, error.stderr].filter(Boolean).join("\n").trim();
    const wrapped = new Error(`Wrangler command failed: ${args.slice(0, 4).join(" ")}${detail ? `\n${detail}` : ""}`);
    wrapped.stdout = error.stdout;
    wrapped.stderr = error.stderr;
    throw wrapped;
  }
}

function normalizePrefix(value) {
  const cleaned = value.trim().replace(/^\/+|\/+$/gu, "");
  return cleaned ? `${cleaned}/` : "";
}

function sha256File(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}
