import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const manifestPath = path.join(root, "artifacts", "release-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const sha256 = (input) => crypto.createHash("sha256").update(input).digest("hex");
const fileSha256 = (file) => sha256(fs.readFileSync(file));
const apiSchema = await import(pathToFileURL(path.join(root, "services/api/dist/schema-version.js")).href);
const shared = await import(pathToFileURL(path.join(root, "packages/shared/dist/index.js")).href);
const failures = [];

if (manifest.manifestVersion !== 1) failures.push("unsupported manifestVersion");
if (manifest.schemas?.database !== apiSchema.DATABASE_SCHEMA_VERSION) failures.push("database schema version mismatch");
if (manifest.schemas?.scoreJson !== shared.SCORE_JSON_SCHEMA_VERSION) failures.push("Score JSON schema version mismatch");
if (manifest.toolchain?.npmLockSha256 !== fileSha256(path.join(root, "package-lock.json"))) failures.push("package-lock hash mismatch");
if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length === 0) failures.push("artifact list is empty");
for (const artifact of manifest.artifacts ?? []) {
  const absolute = path.resolve(root, artifact.path);
  if (!absolute.startsWith(`${root}${path.sep}`) || !fs.existsSync(absolute)) failures.push(`missing artifact: ${artifact.path}`);
  else if (fileSha256(absolute) !== artifact.sha256) failures.push(`artifact hash mismatch: ${artifact.path}`);
}
const { releaseSha256, ...payload } = manifest;
if (releaseSha256 !== sha256(JSON.stringify(payload))) failures.push("release manifest checksum mismatch");
if (process.env.CI === "true" && manifest.source?.dirty) failures.push("CI release manifest must come from a clean checkout");

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Release manifest verified (${manifest.artifacts.length} artifacts, database schema ${manifest.schemas.database}, Score JSON schema ${manifest.schemas.scoreJson}).`);
}
