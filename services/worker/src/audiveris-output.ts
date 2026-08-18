import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";
import { XMLParser } from "fast-xml-parser";

const MAX_ARCHIVE_ENTRIES = 1_000;
const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
const MAX_SCORE_BYTES = 20 * 1024 * 1024;

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function newestFile(outputDir: string, pattern: RegExp) {
  const candidates: string[] = [];

  function walk(directory: string) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (pattern.test(entry.name)) candidates.push(fullPath);
    }
  }

  if (fs.existsSync(outputDir)) walk(outputDir);
  return candidates.sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs)[0];
}

export function findAudiverisMusicXmlOutput(outputDir: string) {
  return newestFile(outputDir, /\.(musicxml|mxl|xml)$/iu);
}

export function findAudiverisProjectOutput(outputDir: string) {
  return newestFile(outputDir, /\.omr$/iu);
}

function validateMusicXml(musicXml: string) {
  const normalized = musicXml.replace(/^\uFEFF/u, "");
  if (!/<score-(?:partwise|timewise)\b/iu.test(normalized)) {
    throw new Error("The Audiveris MusicXML output does not contain a supported score document.");
  }
  return normalized;
}

export function readAudiverisMusicXml(outputPath: string) {
  if (!outputPath.toLowerCase().endsWith(".mxl")) {
    return validateMusicXml(fs.readFileSync(outputPath, "utf8"));
  }

  const archive = new AdmZip(outputPath);
  const entries = archive.getEntries();
  if (entries.length > MAX_ARCHIVE_ENTRIES) {
    throw new Error("The Audiveris MXL output contains too many files.");
  }
  const totalBytes = entries.reduce((total, entry) => total + Number(entry.header.size || 0), 0);
  if (totalBytes > MAX_ARCHIVE_BYTES) {
    throw new Error("The Audiveris MXL output expands beyond the 50 MB safety limit.");
  }

  const candidatePaths: string[] = [];
  const containerEntry = archive.getEntry("META-INF/container.xml");
  if (containerEntry && !containerEntry.isDirectory) {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
    const container = parser.parse(containerEntry.getData().toString("utf8")) as {
      container?: {
        rootfiles?: {
          rootfile?: { "full-path"?: string } | Array<{ "full-path"?: string }>;
        };
      };
    };
    for (const rootfile of asArray(container.container?.rootfiles?.rootfile)) {
      if (rootfile["full-path"]) candidatePaths.push(rootfile["full-path"]);
    }
  }

  candidatePaths.push(
    ...entries
      .filter((entry) => !entry.isDirectory)
      .map((entry) => entry.entryName)
      .filter((entryName) => /\.(musicxml|xml)$/iu.test(entryName) && !entryName.toLowerCase().startsWith("meta-inf/")),
  );
  const scoreEntry = candidatePaths.map((candidate) => archive.getEntry(candidate)).find(Boolean);
  if (!scoreEntry || scoreEntry.isDirectory) {
    throw new Error("The Audiveris MXL output does not contain a score XML file.");
  }
  if (Number(scoreEntry.header.size || 0) > MAX_SCORE_BYTES) {
    throw new Error("The score XML inside the Audiveris MXL output exceeds 20 MB.");
  }
  return validateMusicXml(scoreEntry.getData().toString("utf8"));
}
