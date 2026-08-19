import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const environmentArgument = process.argv.find((argument) => argument.startsWith("--environment="));
const environment = environmentArgument?.split("=")[1] ?? "staging";
const online = process.argv.includes("--online");
if (!new Set(["staging", "production"]).has(environment)) throw new Error("--environment must be staging or production.");

const failures = [];
const warnings = [];
const checks = [];

function check(name, passed, message, severity = "failure") {
  checks.push({ name, passed, message, severity });
  if (!passed) (severity === "warning" ? warnings : failures).push(`${name}: ${message}`);
}

function run(command, args) {
  const executable = process.platform === "win32" && command === "npx" ? "npx.cmd" : command;
  return spawnSync(executable, args, { cwd: root, encoding: "utf8", windowsHide: true });
}

const configPath = path.join(root, "deploy", "cloudflare", `wrangler.${environment}.jsonc`);
check("wrangler-config", fs.existsSync(configPath), path.relative(root, configPath));
let config = null;
if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    check("wrangler-config-json", true, "Configuration is valid JSONC-compatible JSON.");
  } catch (error) {
    check("wrangler-config-json", false, error instanceof Error ? error.message : String(error));
  }
}

const docker = run("docker", ["version", "--format", "{{.Server.Version}}"]) ;
check("docker-engine", docker.status === 0, docker.status === 0 ? docker.stdout.trim() : (docker.stderr || "Docker is unavailable.").trim());
const wrangler = run(process.execPath, [path.join(root, "node_modules", "wrangler", "bin", "wrangler.js"), "--version"]);
check("wrangler-cli", wrangler.status === 0, wrangler.status === 0 ? wrangler.stdout.trim().split(/\r?\n/u).at(-1) ?? "available" : "Wrangler is unavailable.");

const requiredFiles = [
  "deploy/cloudflare/Dockerfile.api",
  "deploy/cloudflare/Dockerfile.collaboration",
  "deploy/backend/Dockerfile",
  "deploy/cloudflare/container-worker-entrypoint.mjs",
  "services/cloudflare-gateway/src/index.ts",
];
for (const relative of requiredFiles) check(`file:${relative}`, fs.existsSync(path.join(root, relative)), relative);

const sqliteRuntimeFiles = [
  "services/api/src/db.ts",
  "services/worker/src/index.ts",
  "services/collaboration/src/index.ts",
].filter((relative) => {
  const absolute = path.join(root, relative);
  return fs.existsSync(absolute) && /(?:node:sqlite|DatabaseSync)/u.test(fs.readFileSync(absolute, "utf8"));
});
check(
  "postgres-runtime-primary",
  sqliteRuntimeFiles.length === 0,
  sqliteRuntimeFiles.length === 0 ? "No production runtime imports node:sqlite." : `SQLite runtime remains in ${sqliteRuntimeFiles.join(", ")}.`,
  environment === "production" ? "failure" : "warning",
);

const apiDockerfile = fs.readFileSync(path.join(root, "deploy", "cloudflare", "Dockerfile.api"), "utf8");
const apiConfig = fs.readFileSync(path.join(root, "services", "api", "src", "config.ts"), "utf8");
const apiImageHasMalwareScanner = /\bclamav\b/iu.test(apiDockerfile)
  && /\bfreshclam\b/iu.test(apiDockerfile)
  && /CLAMAV_COMMAND=\/usr\/bin\/clamscan/u.test(apiDockerfile)
  && /CLAMAV_REQUIRED=true/u.test(apiDockerfile);
const apiImageHasMediaScanner = /\bffmpeg\b/iu.test(apiDockerfile)
  && /FFMPEG_COMMAND=\/usr\/bin\/ffmpeg/u.test(apiDockerfile)
  && /FFPROBE_COMMAND=\/usr\/bin\/ffprobe/u.test(apiDockerfile)
  && /MEDIA_SAFETY_REQUIRED=true/u.test(apiDockerfile);
const apiRejectsMissingProductionScanners = /if \(!config\.clamAvCommand && !config\.clamAvHost\)/u.test(apiConfig)
  && /if \(!config\.ffmpegCommand\)/u.test(apiConfig)
  && /if \(!config\.ffprobeCommand\)/u.test(apiConfig);
const uploadSecurityMigrated = apiImageHasMalwareScanner
  && apiImageHasMediaScanner
  && apiRejectsMissingProductionScanners;
check(
  "production-upload-security",
  uploadSecurityMigrated,
  uploadSecurityMigrated
    ? "API upload quarantine requires ClamAV signatures plus ffmpeg/ffprobe media inspection before promotion to R2."
    : "API image must install and require ClamAV signatures plus ffmpeg/ffprobe before production uploads can be enabled.",
  environment === "production" ? "failure" : "warning",
);

if (config) {
  check("region-enam", config.containers?.every((container) => container.constraints?.regions?.includes("ENAM")), "All containers must be constrained to ENAM.");
  check("r2-isolation", config.vars?.S3_BUCKET === `scoretransposer-${environment}`, `Expected scoretransposer-${environment}.`);
  check("database-declaration", config.vars?.RUNTIME_DATABASE_PRIMARY === "postgres", `Database declaration is ${config.vars?.RUNTIME_DATABASE_PRIMARY}.`);
  check(
    "database-schema",
    /^[a-z_][a-z0-9_]{0,62}$/u.test(config.vars?.POSTGRES_SCHEMA ?? ""),
    `Database schema is ${config.vars?.POSTGRES_SCHEMA || "not declared"}.`,
  );
}

if (online) {
  const whoami = run(process.execPath, [path.join(root, "node_modules", "wrangler", "bin", "wrangler.js"), "whoami"]);
  check("cloudflare-auth", whoami.status === 0 && !/not authenticated/iu.test(whoami.stdout), whoami.status === 0 ? whoami.stdout.trim().split(/\r?\n/u).at(-1) ?? "authenticated" : "Cloudflare authentication failed.");
}

if (environment === "production") {
  const gitStatus = run("git", ["status", "--porcelain=v1", "--untracked-files=all"]);
  check("clean-git", gitStatus.status === 0 && gitStatus.stdout.trim() === "", gitStatus.stdout.trim() || "Git worktree is clean.");

  const approvalPath = path.join(root, "deploy", "cloudflare", "production-approval.json");
  let approval = null;
  try {
    approval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
  } catch (error) {
    check("production-approval", false, error instanceof Error ? error.message : String(error));
  }
  if (approval) {
    const approvalChecks = ["postgresRuntimePrimary", "backupRestoreDrillPassed", "musicEngineQualificationPassed"];
    const paymentProviders = String(config?.vars?.PAYMENT_PROVIDERS ?? "").trim();
    const managedPaymentsEnabled = config?.vars?.STRIPE_MANAGED_PAYMENTS_ENABLED === "true";
    const productionPaymentEnabled = paymentProviders.length > 0 || managedPaymentsEnabled;
    const paymentApprovalPassed = productionPaymentEnabled
      ? approval.paymentProductionDrillPassed === true && approval.paymentProductionDisabled !== true
      : approval.paymentProductionDisabled === true && approval.paymentProductionDrillPassed !== true;
    check("production-approval-domain", approval.domain === "scoretransposer.com", "Approval domain must be scoretransposer.com.");
    check("production-approval-gates", approvalChecks.every((key) => approval[key] === true), `Required approvals: ${approvalChecks.join(", ")}.`);
    check(
      "production-payment-gate",
      paymentApprovalPassed,
      productionPaymentEnabled
        ? "Live payment is enabled, so a successful production payment drill is required."
        : "Live payment is disabled and the approval must explicitly record paymentProductionDisabled=true.",
    );
    const commit = run("git", ["rev-parse", "HEAD"]);
    check("production-approval-commit", commit.status === 0 && approval.releaseCommit === commit.stdout.trim(), "Approval must name the current full Git commit.");
  }

  const manifestPath = path.join(root, "artifacts", "release-manifest.json");
  check("release-manifest", fs.existsSync(manifestPath), "Run npm run release:manifest and npm run release:verify from a clean release commit.");
}

const report = {
  generatedAt: new Date().toISOString(),
  environment,
  online,
  passed: failures.length === 0,
  failures,
  warnings,
  checks,
};
const artifactDirectory = path.join(root, "artifacts");
fs.mkdirSync(artifactDirectory, { recursive: true });
const reportPath = path.join(artifactDirectory, `cloudflare-preflight-${environment}.json`);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

for (const item of checks) console.log(`${item.passed ? "PASS" : item.severity === "warning" ? "WARN" : "FAIL"} ${item.name}: ${item.message}`);
for (const warning of warnings) console.warn(`WARNING ${warning}`);
console.log(`Report: ${path.relative(root, reportPath)}`);
if (failures.length > 0) process.exitCode = 1;
