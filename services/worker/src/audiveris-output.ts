import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";
import { XMLBuilder, XMLParser, XMLValidator } from "fast-xml-parser";

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

/** Enumerate the successful attempt only. A bad sibling must not hide good scores. */
export function enumerateAudiverisMusicXmlOutputs(outputDir: string, selection: AudiverisOutputSelection = {}) {
  return outputFiles(selectedOutputDirectory(outputDir, selection), /\.(musicxml|mxl|xml)$/iu)
    .filter((candidate) => {
      // XML project metadata can share the output directory with actual scores.
      if (/\.xml$/iu.test(candidate)) {
        if (fs.statSync(candidate).size > MAX_SCORE_BYTES) return true;
        const xml = fs.readFileSync(candidate, "utf8");
        return /<(?:score-(?:partwise|timewise)|opus)\b/iu.test(xml);
      }
      return true;
    });
}

/** Legacy selected-score lookup. New recognition callers consume the enumeration. */
export function findAudiverisMusicXmlOutput(outputDir: string, selection: AudiverisOutputSelection = {}) {
  return enumerateAudiverisMusicXmlOutputs(outputDir, selection)[0];
}

export function enumerateAudiverisProjectOutputs(outputDir: string, selection: AudiverisOutputSelection = {}) {
  return outputFiles(selectedOutputDirectory(outputDir, selection), /\.omr$/iu);
}

export function findAudiverisProjectOutput(outputDir: string, selection: AudiverisOutputSelection = {}) {
  return enumerateAudiverisProjectOutputs(outputDir, selection)[0];
}

function validateMusicXml(musicXml: string) {
  const normalized = musicXml.replace(/^\uFEFF/u, "");
  if (Buffer.byteLength(normalized, "utf8") > MAX_SCORE_BYTES || /<!ENTITY\b/iu.test(normalized) || XMLValidator.validate(normalized) !== true) {
    throw new Error("The Audiveris MusicXML output is unsafe, malformed or exceeds 20 MB.");
  }
  if (/<opus\b/iu.test(normalized)) {
    throw new AudiverisOutputSelectionError("Audiveris opus output requires complete movement handling.", "MULTIPLE_MOVEMENTS");
  }
  if (!/<score-(?:partwise|timewise)\b/iu.test(normalized)) {
    throw new Error("The Audiveris MusicXML output does not contain a supported score document.");
  }
  if (/<score-timewise\b/iu.test(normalized)) {
    // Keep original XML in its raw output asset. Editable alternatives use a
    // structural conversion so timewise roots are genuinely selectable too.
    const tree = new XMLParser({ preserveOrder: true, ignoreAttributes: false, parseTagValue: false, trimValues: false }).parse(normalized) as Array<Record<string, any>>;
    const root = tree.find(node => Array.isArray(node["score-timewise"]));
    if (!root) throw new Error("The timewise MusicXML score root could not be read.");
    const children = root["score-timewise"] as Array<Record<string, any>>;
    const output = children.filter(node => !Array.isArray(node.measure));
    const parts = new Map<string, Record<string, any>>();
    for (const measure of children.filter(node => Array.isArray(node.measure))) {
      for (const sourcePart of (measure.measure as Array<Record<string, any>>).filter(node => Array.isArray(node.part))) {
        const id = String(sourcePart[":@"]?.["@_id"] ?? "");
        if (!id) throw new Error("A timewise MusicXML part has no identity.");
        let part = parts.get(id);
        if (!part) { part = { part: [], ":@": { "@_id": id } }; parts.set(id, part); output.push(part); }
        part.part.push({ measure: sourcePart.part, ...(measure[":@"] ? { ":@": measure[":@"] } : {}) });
      }
    }
    delete root["score-timewise"]; root["score-partwise"] = output;
    return new XMLBuilder({ preserveOrder: true, ignoreAttributes: false }).build(tree) as string;
  }
  return normalized;
}

export type AudiverisMusicXmlCandidate = { outputPath: string; rootPath?: string; musicXml: string };
export type OmrRecognitionCandidate = {
  id: string; musicXml: string; musicXmlPath: string; sourcePages: number[];
  originalTitle?: string; normalizedTitle?: string; relationship: "original" | "assembled";
  memberIds?: string[]; warnings?: string[]; enhancement?: Record<string, unknown>;
};

export function normalizeMovementTitle(title: string): string {
  return title.normalize("NFKC").toLocaleLowerCase("und")
    .replace(/ß/gu, "ss").replace(/ς/gu, "σ")
    .replace(/(?:\s*[-–—]\s*\d+|\s*\(\s*\d+\s*\))\s*$/u, "")
    .replace(/[\p{P}\p{Z}\s]/gu, "");
}

export function musicXmlMovementTitle(musicXml: string): string | undefined {
  const parsed = new XMLParser({ ignoreAttributes: false, parseTagValue: false }).parse(musicXml) as Record<string, { "movement-title"?: unknown; work?: { "work-title"?: unknown } }>;
  const score = parsed["score-partwise"] ?? parsed["score-timewise"];
  const raw = score?.["movement-title"] ?? score?.work?.["work-title"];
  const value = raw && typeof raw === "object" && "#text" in raw ? (raw as { "#text": unknown })["#text"] : raw;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** All local roots, including opus references. Archive/path limits remain per source. */
export function readAudiverisMusicXmlCandidates(outputPath: string): AudiverisMusicXmlCandidate[] {
  if (!outputPath.toLowerCase().endsWith(".mxl")) {
    const root = path.dirname(path.resolve(outputPath));
    const visited = new Set<string>();
    const active = new Set<string>();
    let totalBytes = 0;
    const scores: AudiverisMusicXmlCandidate[] = [];
    const visit = (filename: string) => {
      if (active.has(filename)) throw new Error("MusicXML opus references contain a cycle.");
      if (visited.has(filename)) return;
      if (visited.size >= MAX_ARCHIVE_ENTRIES) throw new Error("Too many local MusicXML references.");
      if (filename !== root && !filename.startsWith(root + path.sep)) throw new Error("MusicXML reference escaped the recognition directory.");
      visited.add(filename);
      active.add(filename);
      if (fs.statSync(filename).size > MAX_SCORE_BYTES) throw new Error("The Audiveris XML output exceeds 20 MB.");
      const xml = fs.readFileSync(filename, "utf8");
      totalBytes += Buffer.byteLength(xml, "utf8");
      if (totalBytes > MAX_ARCHIVE_BYTES) throw new Error("Local MusicXML references exceed the 50 MB safety limit.");
      if (/<opus\b/iu.test(xml)) {
        if (/<!ENTITY\b/iu.test(xml) || XMLValidator.validate(xml) !== true) throw new Error("Unsafe or malformed MusicXML opus.");
        for (const reference of xml.matchAll(/(?:xlink:)?href\s*=\s*["']([^"']+)["']/giu)) {
          if (/^(?:[a-z][a-z\d+.-]*:|[\\/])|[?#]/iu.test(reference[1])) throw new Error("External MusicXML references are not supported.");
          visit(path.resolve(path.dirname(filename), reference[1]));
        }
      } else {
        try { scores.push({ outputPath, ...(filename !== path.resolve(outputPath) ? { rootPath: path.relative(root, filename) } : {}), musicXml: validateMusicXml(xml) }); }
        catch (error) { if (filename === path.resolve(outputPath)) throw error; }
      }
      active.delete(filename);
    };
    visit(path.resolve(outputPath));
    if (!scores.length) throw new Error("The Audiveris output does not contain a score XML file.");
    return scores;
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
    if (Number(containerEntry.header.size || 0) > MAX_SCORE_BYTES) throw new Error("The MusicXML container exceeds the safety limit.");
    const containerXml = containerEntry.getData().toString("utf8");
    if (Buffer.byteLength(containerXml, "utf8") > MAX_SCORE_BYTES || /<!ENTITY\b/iu.test(containerXml) || XMLValidator.validate(containerXml) !== true) throw new Error("Unsafe or malformed MusicXML container.");
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
    const container = parser.parse(containerXml) as {
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
  const scores: AudiverisMusicXmlCandidate[] = [];
  let actualBytes = 0;
  const cache = new Map<string, string>();
  const read = (entry: ReturnType<AdmZip["getEntries"]>[number]) => {
    const cached = cache.get(entry.entryName);
    if (cached !== undefined) return cached;
    const data = entry.getData(); actualBytes += data.byteLength;
    if (data.byteLength > MAX_SCORE_BYTES || actualBytes > MAX_ARCHIVE_BYTES) throw new Error("The Audiveris MXL output exceeds its decompression safety limit.");
    const xml = data.toString("utf8"); cache.set(entry.entryName, xml); return xml;
  };
  const visited = new Set<string>(), active = new Set<string>();
  const visit = (candidate: string) => {
    if (/^(?:[a-z][a-z\d+.-]*:|[\\/])/iu.test(candidate) || candidate.split(/[\\/]/u).includes("..")) throw new Error("Unsafe MusicXML archive path.");
    if (active.has(candidate)) throw new Error("MusicXML opus references contain a cycle.");
    if (visited.has(candidate)) return;
    visited.add(candidate); active.add(candidate);
    const scoreEntry = archive.getEntry(candidate);
    if (!scoreEntry || scoreEntry.isDirectory) { active.delete(candidate); return; }
    if (Number(scoreEntry.header.size || 0) > MAX_SCORE_BYTES) {
      active.delete(candidate); return;
    }
    const musicXml = read(scoreEntry);
    if (/<opus\b/iu.test(musicXml)) {
      if (/<!ENTITY\b/iu.test(musicXml) || XMLValidator.validate(musicXml) !== true) throw new Error("Unsafe or malformed MusicXML opus.");
      for (const reference of musicXml.matchAll(/(?:xlink:)?href\s*=\s*["']([^"']+)["']/giu)) {
        if (/^(?:[a-z][a-z\d+.-]*:|[\\/])|[?#]/iu.test(reference[1])) throw new Error("External MusicXML references are not supported.");
        const referenced = path.posix.normalize(path.posix.join(path.posix.dirname(candidate), reference[1]));
        if (referenced.startsWith("../")) throw new Error("Unsafe MusicXML archive reference.");
        if (!archive.getEntry(referenced)) throw new Error("A local MusicXML opus reference is missing.");
        visit(referenced);
      }
    } else if (/<score-(?:partwise|timewise)\b/iu.test(musicXml)) {
      try { scores.push({ outputPath, rootPath: candidate, musicXml: validateMusicXml(musicXml) }); }
      catch { /* A malformed root does not erase another valid root. */ }
    }
    active.delete(candidate);
  };
  for (const candidate of new Set(candidatePaths)) visit(candidate);
  if (scores.length === 0) {
    throw new Error("The Audiveris MXL output does not contain a score XML file.");
  }
  return scores;
}

export function readAudiverisMusicXml(outputPath: string) {
  return readAudiverisMusicXmlCandidates(outputPath)[0].musicXml;
}
