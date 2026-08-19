import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import zlib from "node:zlib";

const appRoot = process.cwd();
const buildRoot = path.join(appRoot, ".next");
const manifestPath = path.join(buildRoot, "server", "app", "page_client-reference-manifest.js");
const productRoot = path.join(appRoot, "public", "product");

const limits = {
  javascriptGzip: 110 * 1024,
  cssGzip: 42 * 1024,
  productImageTotal: 1.5 * 1024 * 1024,
  productImageLargest: 300 * 1024,
};

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function readPageManifest() {
  if (!fs.existsSync(manifestPath)) {
    throw new Error("Homepage build manifest is missing. Run `npm run build` before this check.");
  }
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(manifestPath, "utf8"), context, { filename: manifestPath });
  const manifest = context.globalThis.__RSC_MANIFEST?.["/page"];
  if (!manifest) throw new Error("The homepage entry was not found in the Next.js client manifest.");
  return manifest;
}

function collectEntryFiles(entryMap) {
  const wantedEntries = Object.entries(entryMap).filter(([entry]) => entry.endsWith("/app/layout") || entry.endsWith("/app/page"));
  return [...new Set(wantedEntries.flatMap(([, files]) => files.map((file) => typeof file === "string" ? file : file.path)))];
}

function measureBuildFiles(files) {
  return files.reduce((total, relativePath) => {
    const bytes = fs.readFileSync(path.join(buildRoot, relativePath));
    total.raw += bytes.length;
    total.gzip += zlib.gzipSync(bytes, { level: 9 }).length;
    return total;
  }, { raw: 0, gzip: 0 });
}

function measureProductImages() {
  const entries = fs.readdirSync(productRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(avif|gif|jpe?g|png|webp)$/i.test(entry.name))
    .map((entry) => ({ name: entry.name, bytes: fs.statSync(path.join(productRoot, entry.name)).size }));
  return {
    total: entries.reduce((sum, entry) => sum + entry.bytes, 0),
    largest: entries.sort((a, b) => b.bytes - a.bytes)[0] ?? { name: "none", bytes: 0 },
  };
}

const manifest = readPageManifest();
const javascript = measureBuildFiles(collectEntryFiles(manifest.entryJSFiles));
const css = measureBuildFiles(collectEntryFiles(manifest.entryCSSFiles));
const images = measureProductImages();

const checks = [
  ["Homepage JavaScript (gzip)", javascript.gzip, limits.javascriptGzip],
  ["Homepage CSS (gzip)", css.gzip, limits.cssGzip],
  ["Product image library", images.total, limits.productImageTotal],
  [`Largest product image (${images.largest.name})`, images.largest.bytes, limits.productImageLargest],
];

console.log(`Homepage JavaScript: ${formatBytes(javascript.raw)} raw / ${formatBytes(javascript.gzip)} gzip`);
console.log(`Homepage CSS: ${formatBytes(css.raw)} raw / ${formatBytes(css.gzip)} gzip`);

const failures = checks.filter(([, actual, limit]) => actual > limit);
for (const [label, actual, limit] of checks) {
  console.log(`${actual <= limit ? "PASS" : "FAIL"} ${label}: ${formatBytes(actual)} / ${formatBytes(limit)}`);
}

if (failures.length > 0) process.exitCode = 1;
