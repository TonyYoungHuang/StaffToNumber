import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const outputPath = path.join(root, "artifacts", "release-manifest.json");

function git(...args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function fileSha256(file) {
  return sha256(fs.readFileSync(file));
}

function collectFiles(directory, base = directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (["cache", "diagnostics", "logs"].includes(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(absolute, base));
    else if (!/\.(?:map|tsbuildinfo)$/u.test(entry.name) && entry.name !== "trace") {
      files.push({ path: path.relative(root, absolute).replaceAll("\\", "/"), sha256: fileSha256(absolute), bytes: fs.statSync(absolute).size });
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

const rootPackage = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const packagePaths = ["apps/www", "apps/app", "services/api", "services/worker", "services/collaboration", "services/cloudflare-gateway", "packages/shared", "packages/ui"];
const packages = Object.fromEntries(packagePaths.map((directory) => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, directory, "package.json"), "utf8"));
  return [manifest.name, manifest.version];
}));
const apiSchema = await import(pathToFileURL(path.join(root, "services/api/dist/schema-version.js")).href);
const shared = await import(pathToFileURL(path.join(root, "packages/shared/dist/index.js")).href);
const commit = process.env.GITHUB_SHA || git("rev-parse", "HEAD") || "unknown";
const commitEpoch = git("show", "-s", "--format=%ct", commit);
const sourceEpoch = Number(process.env.SOURCE_DATE_EPOCH || commitEpoch || Math.floor(Date.now() / 1000));
const status = git("status", "--porcelain=v1", "--untracked-files=all");
const artifacts = [
  ...collectFiles(path.join(root, "packages/shared/dist")),
  ...collectFiles(path.join(root, "packages/ui/dist")),
  ...collectFiles(path.join(root, "services/api/dist")),
  ...collectFiles(path.join(root, "services/worker/dist")),
  ...collectFiles(path.join(root, "services/collaboration/dist")),
  ...collectFiles(path.join(root, "apps/www/.next/server")),
  ...collectFiles(path.join(root, "apps/app/.next/server")),
].sort((a, b) => a.path.localeCompare(b.path));

if (artifacts.length === 0) throw new Error("No build artifacts found. Run npm run build first.");

const payload = {
  manifestVersion: 1,
  product: "ScoreTransposer",
  version: rootPackage.version,
  source: { commit, dirty: Boolean(status), sourceDateEpoch: sourceEpoch },
  schemas: { database: apiSchema.DATABASE_SCHEMA_VERSION, scoreJson: shared.SCORE_JSON_SCHEMA_VERSION },
  toolchain: { node: process.version, npmLockSha256: fileSha256(path.join(root, "package-lock.json")) },
  packages,
  artifacts,
};
const canonical = JSON.stringify(payload);
const manifest = { ...payload, releaseSha256: sha256(canonical) };
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Release manifest generated: ${path.relative(root, outputPath)} (${artifacts.length} artifacts, ${manifest.releaseSha256}).`);
