import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignored = new Set([".git", ".next", ".tmp", ".vercel", "artifacts", "coverage", "dist", "node_modules", "playwright-report", "test-results"]);
const ignoredAtRoot = new Set(["data", "storage"]);
const textExtensions = new Set([".cjs", ".js", ".json", ".jsx", ".md", ".mjs", ".ts", ".tsx", ".yaml", ".yml"]);
const failures = [];
let checkedFiles = 0;

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name) || (directory === root && ignoredAtRoot.has(entry.name))) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (textExtensions.has(path.extname(entry.name).toLowerCase())) inspect(absolute);
  }
}

function inspect(file) {
  checkedFiles += 1;
  const relative = path.relative(root, file).replaceAll("\\", "/");
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/u);
  lines.forEach((line, index) => {
    if (/^(?:<<<<<<<|=======|>>>>>>>)(?:\s|$)/u.test(line)) failures.push(`${relative}:${index + 1} contains a merge-conflict marker`);
    if (/\b(?:describe|it|test)\.only\s*\(/u.test(line)) failures.push(`${relative}:${index + 1} contains a focused test`);
  });
  if (path.extname(file).toLowerCase() === ".json") {
    try {
      JSON.parse(content);
    } catch (error) {
      failures.push(`${relative} is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

walk(root);

for (const packagePath of ["package.json", "apps/www/package.json", "apps/app/package.json", "services/api/package.json", "services/worker/package.json", "services/collaboration/package.json", "packages/shared/package.json", "packages/storage/package.json", "packages/ui/package.json"]) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, packagePath), "utf8"));
  if (!manifest.name || !manifest.version) failures.push(`${packagePath} must define name and version`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Repository lint passed for ${checkedFiles} text files.`);
}
