import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const temporaryRoot = path.resolve(root, ".tmp");
const target = path.resolve(temporaryRoot, "cloudflare-build-context");

if (!target.startsWith(`${temporaryRoot}${path.sep}`)) {
  throw new Error(`Refusing to replace build context outside ${temporaryRoot}.`);
}

const skippedDirectories = new Set([".git", ".next", "coverage", "dist", "node_modules", "test-results"]);

function includeSource(sourceRoot, source) {
  const relative = path.relative(sourceRoot, source);
  if (!relative) return true;
  const segments = relative.split(path.sep);
  if (segments.some((segment) => skippedDirectories.has(segment))) return false;
  if (path.basename(sourceRoot) === "services" && segments.slice(1).includes("storage")) return false;
  const name = path.basename(source);
  if (name.startsWith(".env") || name.endsWith(".sqlite") || name.endsWith(".tsbuildinfo")) return false;
  return true;
}

function copyFile(relative) {
  const source = path.resolve(root, relative);
  const destination = path.resolve(target, relative);
  if (!fs.existsSync(source)) throw new Error(`Missing Cloudflare build input: ${relative}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function copyTree(relative) {
  const source = path.resolve(root, relative);
  const destination = path.resolve(target, relative);
  if (!fs.existsSync(source)) throw new Error(`Missing Cloudflare build input: ${relative}`);
  fs.cpSync(source, destination, {
    recursive: true,
    filter: (candidate) => includeSource(source, candidate),
  });
}

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });

for (const relative of ["package.json", "package-lock.json", "tsconfig.base.json"]) copyFile(relative);
for (const relative of ["apps/app/package.json", "apps/www/package.json"]) copyFile(relative);
for (const relative of ["packages", "services"]) copyTree(relative);
copyFile("deploy/cloudflare/container-worker-entrypoint.mjs");
copyFile("deploy/backend/soundfont-license-manifest.json");
copyTree("deploy/backend/licenses");
fs.writeFileSync(path.join(target, ".dockerignore"), "node_modules\ndist\n.next\n.env*\n*.sqlite\n*.tsbuildinfo\n", "utf8");

let files = 0;
let bytes = 0;
function measure(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) measure(absolute);
    else if (entry.isFile()) {
      files += 1;
      bytes += fs.statSync(absolute).size;
    }
  }
}
measure(target);
console.log(`Prepared Cloudflare build context: ${path.relative(root, target)} (${files} files, ${(bytes / 1024 / 1024).toFixed(2)} MiB)`);
