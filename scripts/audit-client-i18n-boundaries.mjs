import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const sourceRoots = [
  path.join(repositoryRoot, "apps", "www", "src"),
  path.join(repositoryRoot, "apps", "app", "src"),
];
const sourceExtensions = new Set([".js", ".jsx", ".ts", ".tsx"]);
const importPattern = /\bimport\s+([\s\S]*?)\s+from\s+["']([^"']+)["']/gu;
const dynamicImportPattern = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu;
const catalogValuePattern = /\b(?:get[A-Za-z0-9]*(?:Messages|Catalog)|[A-Z][A-Z0-9_]*(?:MESSAGES|CATALOGS))\b/u;

function isClientModule(source) {
  return /^\s*["']use client["'];/u.test(source);
}

function isCatalogModule(specifier) {
  return /(?:messages?|localization)(?:\/|$|[-.])/iu.test(specifier);
}

function isClientSafeI18nModule(specifier) {
  return /\/(?:client|types|formats?|formatters?)(?:\.[cm]?[jt]sx?)?$/iu.test(specifier);
}

function isTypeOnlyImport(clause) {
  const trimmed = clause.trim();
  if (trimmed.startsWith("type ")) return true;
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return false;

  const specifiers = trimmed.slice(1, -1).split(",").map((entry) => entry.trim()).filter(Boolean);
  return specifiers.length > 0 && specifiers.every((entry) => entry.startsWith("type "));
}

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(absolutePath);
    if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) return [absolutePath];
    return [];
  }));
  return nested.flat();
}

const sourceFiles = (await Promise.all(sourceRoots.map(collectSourceFiles))).flat();
const violations = [];

for (const absolutePath of sourceFiles) {
  const source = await readFile(absolutePath, "utf8");
  if (!isClientModule(source)) continue;

  for (const match of source.matchAll(importPattern)) {
    const [, clause, specifier] = match;
    if (!isCatalogModule(specifier) || isClientSafeI18nModule(specifier) || isTypeOnlyImport(clause)) continue;
    violations.push(`${path.relative(repositoryRoot, absolutePath)} imports the full catalog module ${specifier}`);
  }

  for (const match of source.matchAll(dynamicImportPattern)) {
    const specifier = match[1];
    if (isCatalogModule(specifier) && !isClientSafeI18nModule(specifier)) {
      violations.push(`${path.relative(repositoryRoot, absolutePath)} dynamically imports the full catalog module ${specifier}`);
    }
  }

  const sourceWithoutTypeImports = source.replace(/\bimport\s+type\s+[\s\S]*?\s+from\s+["'][^"']+["'];?/gu, "");
  const catalogValue = sourceWithoutTypeImports.match(catalogValuePattern)?.[0];
  if (catalogValue) {
    violations.push(`${path.relative(repositoryRoot, absolutePath)} references catalog value ${catalogValue}`);
  }
}

if (violations.length > 0) {
  console.error("Client i18n boundary audit failed:\n");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log(`Client i18n boundary audit passed (${sourceFiles.length} source files scanned).`);
}
