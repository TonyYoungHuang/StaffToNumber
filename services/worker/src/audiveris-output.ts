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

export type AudiverisOutputSelection = { rotationDegrees?: 0 | 90 | 180 | 270 };
export type AudiverisOutputErrorCode = "ROTATION_NOT_SELECTED" | "ROTATION_OUTPUT_MISSING" | "MULTIPLE_MOVEMENTS" | "MULTIPLE_PROJECTS";

export class AudiverisOutputSelectionError extends Error {
  constructor(message: string, readonly code: AudiverisOutputErrorCode, readonly candidatePaths: string[] = []) {
    super(message);
    this.name = "AudiverisOutputSelectionError";
  }
}

function selectedOutputDirectory(outputDir: string, selection: AudiverisOutputSelection) {
  if (!fs.existsSync(outputDir)) return outputDir;
  const rotationDirectories = fs.readdirSync(outputDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^rotation-\d+$/u.test(entry.name));
  if (rotationDirectories.length === 0 && (selection.rotationDegrees === undefined || selection.rotationDegrees === 0)) return outputDir;
  if (selection.rotationDegrees === undefined) {
    throw new AudiverisOutputSelectionError(
      "Audiveris rotation output must be selected from the successful recognition attempt.", "ROTATION_NOT_SELECTED",
    );
  }
  const selected = path.join(outputDir, `rotation-${selection.rotationDegrees}`);
  if (!rotationDirectories.some((entry) => path.join(outputDir, entry.name) === selected)) {
    throw new AudiverisOutputSelectionError("The successful Audiveris rotation output directory was not found.", "ROTATION_OUTPUT_MISSING");
  }
  return selected;
}

function outputFiles(outputDir: string, pattern: RegExp) {
  const candidates: string[] = [];

  function walk(directory: string) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (pattern.test(entry.name)) candidates.push(fullPath);
    }
  }

  if (fs.existsSync(outputDir)) walk(outputDir);
  return candidates.sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

export function findAudiverisMusicXmlOutput(outputDir: string, selection: AudiverisOutputSelection = {}) {
  const candidates = outputFiles(selectedOutputDirectory(outputDir, selection), /\.(musicxml|mxl|xml)$/iu)
    .filter((candidate) => {
      // XML project metadata can share the output directory with actual scores.
      if (/\.xml$/iu.test(candidate)) {
        if (fs.statSync(candidate).size > MAX_SCORE_BYTES) throw new Error("The Audiveris XML output exceeds 20 MB.");
        const xml = fs.readFileSync(candidate, "utf8");
        if (/<opus\b/iu.test(xml)) throw new AudiverisOutputSelectionError("Audiveris opus output requires complete movement handling.", "MULTIPLE_MOVEMENTS", [candidate]);
        return /<score-(?:partwise|timewise)\b/iu.test(xml);
      }
      return true;
    });
  if (candidates.length > 1) {
    throw new AudiverisOutputSelectionError(
      "Audiveris exported multiple score movements; no partial score was selected.", "MULTIPLE_MOVEMENTS", candidates,
    );
  }
  return candidates[0];
}

export function findAudiverisProjectOutput(outputDir: string, selection: AudiverisOutputSelection = {}) {
  const candidates = outputFiles(selectedOutputDirectory(outputDir, selection), /\.omr$/iu);
  if (candidates.length > 1) {
    throw new AudiverisOutputSelectionError("Audiveris emitted multiple project files for the selected recognition attempt.", "MULTIPLE_PROJECTS", candidates);
  }
  return candidates[0];
}

function validateMusicXml(musicXml: string) {
  const normalized = musicXml.replace(/^\uFEFF/u, "");
  if (/<opus\b/iu.test(normalized)) {
    throw new AudiverisOutputSelectionError("Audiveris opus output requires complete movement handling.", "MULTIPLE_MOVEMENTS");
  }
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
  const scores: Array<{ path: string; musicXml: string }> = [];
  for (const candidate of new Set(candidatePaths)) {
    const scoreEntry = archive.getEntry(candidate);
    if (!scoreEntry || scoreEntry.isDirectory) continue;
    if (Number(scoreEntry.header.size || 0) > MAX_SCORE_BYTES) {
      throw new Error("The score XML inside the Audiveris MXL output exceeds 20 MB.");
    }
    const musicXml = scoreEntry.getData().toString("utf8");
    if (/<opus\b/iu.test(musicXml)) {
      throw new AudiverisOutputSelectionError("Audiveris opus output requires complete movement handling.", "MULTIPLE_MOVEMENTS", [candidate]);
    }
    if (/<score-(?:partwise|timewise)\b/iu.test(musicXml)) scores.push({ path: candidate, musicXml });
  }
  if (scores.length > 1) {
    throw new AudiverisOutputSelectionError("The Audiveris MXL archive contains multiple score movements; no partial score was read.", "MULTIPLE_MOVEMENTS", scores.map((score) => score.path));
  }
  if (scores.length === 0) {
    throw new Error("The Audiveris MXL output does not contain a score XML file.");
  }
  return validateMusicXml(scores[0].musicXml);
}
