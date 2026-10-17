import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";
import { XMLParser } from "fast-xml-parser";
import { withOmrEngineSlot } from "./omr-engine-gate.js";
import { getJobMemoryLeaseEnvironment } from "./job-memory-lease.js";

export type RasterEnhancementBudget = {
  sourcePageCount: number;
  maxCalls: number;
  calls: number;
  extraCalls: number;
  sampledPages: number[];
  primaryPages: number[];
  preferredVariantId?: string;
};
export function createRasterEnhancementBudget(sourcePageCount: number): RasterEnhancementBudget {
  const pages = Number.isSafeInteger(sourcePageCount) && sourcePageCount > 0 ? sourcePageCount : 1;
  return { sourcePageCount: pages, maxCalls: pages + 4, calls: 0, extraCalls: 0, sampledPages: [], primaryPages: [] };
}
export type RasterEnhancementOptions = {
  enabled: boolean;
  lane: "normal" | "big";
  pythonCommand: string;
  pythonArgsPrefix?: string[];
  pythonScriptPath: string;
  maxPixels?: number;
  pageNumber?: number;
  rotationDegrees?: 0 | 90 | 180 | 270;
  /** Server-assessed orientations; never infer orientation from note counts. */
  pageRotations?: Record<string, 0 | 90 | 180 | 270>;
  photoCorners?: Array<{ x: number; y: number }>;
  /** Reuse one object for the entire PDF/job, including its primary calls. */
  budget?: RasterEnhancementBudget;
};
export type RasterVariant = {
  id: string; imagePath: string; width: number; height: number; scale: number;
  operations: string[]; requiresBigLane: boolean; crop: number[];
  sourceToImage: number[]; imageToSource: number[];
  sourceWidth: number; sourceHeight: number; exifOrientation: number;
  coordinateSpace: "exif-oriented-source";
};
export type RasterEnhancementManifest = {
  schemaVersion: 1;
  diagnostics: { staffSpacing: number | null; expectedStaffCount: number | null; staffDetection: "estimated" | "uncertain"; brightness: number; contrast: number; blurVariance: number; crop: number[]; staffCountEvidence?: number[] };
  variants: RasterVariant[];
};
export type RasterQuality = {
  valid: boolean;
  musicXmlCount: number;
  noteCount: number;
  measureCount: number;
  physicalStaffCount: number | null;
  expectedStaffCount: number | null;
  coverage: number | null;
  invalidDurationRatio: number;
  hasTimeSignature: boolean;
  abnormalMeasureRatio: number | null;
  confidence: number | null;
  lowConfidenceRatio: number | null;
};
export type RasterEnhancementRun = {
  id: string; outputDir: string; status: "succeeded" | "failed";
  variant: RasterVariant; quality?: RasterQuality; message?: string;
};
export type RasterEnhancementSummary = {
  selectedVariantId: string; reasons: string[];
  diagnostics: RasterEnhancementManifest["diagnostics"];
  variants: RasterEnhancementRun[];
  calls: number; maxCalls: number;
};

/** Frozen configuration list: no rotations × enhancements retry tree. */
export function rasterVariantIds(options: RasterEnhancementOptions): string[] {
  // Both lanes keep the bounded quality alternatives. They run sequentially,
  // within the same pixel/memory reservation and the same P+4 attempt budget.
  const budget = options.budget;
  const page = options.pageNumber ?? 1;
  if (budget && (budget.extraCalls >= 4 || (!budget.sampledPages.includes(page) && budget.sampledPages.length >= 2))) return [budget.preferredVariantId ?? "gray"];
  return ["gray", "detail", "shadow-detail"];
}

/** Reserves primary work for unvisited pages; only two sample pages use extras. */
export function claimRasterCall(budget: RasterEnhancementBudget, page: number, extra: boolean): boolean {
  if (budget.calls >= budget.maxCalls) return false;
  // Reprocessing a page during the single normal→big escalation also consumes
  // overhead. It cannot spend another page's reserved primary call.
  const repeatedPage = budget.primaryPages.includes(page);
  if (extra || repeatedPage) {
    if (budget.extraCalls >= 4 || (!budget.sampledPages.includes(page) && budget.sampledPages.length >= 2)) return false;
    if (!budget.sampledPages.includes(page)) budget.sampledPages.push(page);
    budget.extraCalls++;
  }
  if (!extra && !repeatedPage) budget.primaryPages.push(page);
  budget.calls++;
  return true;
}

export class RasterPreparationError extends Error {
  constructor(message: string, readonly reason: "cancelled" | "timeout" | "spawn" | "exit") { super(message); }
}

export async function prepareRasterEnhancement(input: {
  inputPath: string; outputDir: string; timeoutMs: number; options: RasterEnhancementOptions;
  isCancelled?: () => boolean; onQueueWait?: (elapsedMs: number) => void;
}): Promise<RasterEnhancementManifest> {
  fs.mkdirSync(input.outputDir, { recursive: true });
  const requestPath = path.join(input.outputDir, "enhancement.request.json");
  const resultPath = path.join(input.outputDir, "enhancement.manifest.json");
  fs.writeFileSync(requestPath, JSON.stringify({ inputPath: input.inputPath, outputDir: input.outputDir,
    lane: input.options.lane, maxPixels: Math.min(12_000_000, input.options.maxPixels ?? 12_000_000),
    maxVariants: 3, variantIds: rasterVariantIds(input.options),
    rotationDegrees: input.options.rotationDegrees ?? 0,
    corners: input.options.photoCorners?.map((point) => [point.x, point.y]),
  }));
  await withOmrEngineSlot({ timeoutMs: input.timeoutMs, isCancelled: input.isCancelled, onQueueWait: input.onQueueWait,
    cancelledError: () => new RasterPreparationError("Raster preparation was cancelled.", "cancelled"),
    timeoutError: () => new RasterPreparationError("Raster preparation exceeded its execution budget.", "timeout"),
  }, (timeoutMs) => new Promise<void>((resolve, reject) => {
    if (input.isCancelled?.()) { reject(new RasterPreparationError("Raster preparation was cancelled.", "cancelled")); return; }
    const child = spawn(input.options.pythonCommand, [...(input.options.pythonArgsPrefix ?? []), input.options.pythonScriptPath, requestPath, resultPath], {
      shell: false, windowsHide: true, detached: process.platform !== "win32", stdio: ["ignore", "ignore", "pipe"],
      env: { ...process.env, ...getJobMemoryLeaseEnvironment(), PYTHONDONTWRITEBYTECODE: "1", PYTHONUTF8: "1", OMP_NUM_THREADS: "1", OPENBLAS_NUM_THREADS: "1" },
    });
    let stderr = "";
    let termination: RasterPreparationError | undefined;
    let forceKill: NodeJS.Timeout | undefined;
    const kill = (signal: NodeJS.Signals) => {
      try { if (process.platform !== "win32" && child.pid) process.kill(-child.pid, signal); else child.kill(signal); } catch { /* exited */ }
    };
    const stop = (reason: "cancelled" | "timeout") => {
      if (termination) return;
      termination = new RasterPreparationError(reason === "cancelled" ? "Raster preparation was cancelled." : "Raster preparation exceeded its execution budget.", reason);
      kill("SIGTERM");
      forceKill = setTimeout(() => kill("SIGKILL"), 2_000); forceKill.unref();
    };
    const timer = setTimeout(() => stop("timeout"), Math.max(1, timeoutMs));
    const poll = setInterval(() => { if (input.isCancelled?.()) stop("cancelled"); }, 100); poll.unref();
    const cleanup = () => { clearTimeout(timer); clearInterval(poll); if (forceKill) clearTimeout(forceKill); };
    child.stderr.on("data", (chunk) => { stderr = (stderr + String(chunk)).slice(-8_000); });
    child.once("error", (cause) => { cleanup(); reject(new RasterPreparationError(`Raster preparation could not start: ${cause.message}`, "spawn")); });
    child.once("close", (code) => {
      cleanup();
      if (termination) reject(termination);
      else if (code !== 0) reject(new RasterPreparationError(`Raster preparation exited with code ${code}. ${stderr}`, "exit"));
      else resolve();
    });
  }));
  const manifest = JSON.parse(fs.readFileSync(resultPath, "utf8")) as RasterEnhancementManifest;
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.variants) || !manifest.variants.length || manifest.variants.length > 3) throw new RasterPreparationError("Raster preparation returned an invalid configuration list.", "exit");
  for (const variant of manifest.variants) {
    const relative = path.relative(path.resolve(input.outputDir), path.resolve(variant.imagePath));
    if (relative.startsWith("..") || path.isAbsolute(relative) || !fs.existsSync(variant.imagePath)
      || !Number.isSafeInteger(variant.width) || !Number.isSafeInteger(variant.height) || variant.width <= 0 || variant.height <= 0
      || variant.width * variant.height > Math.min(12_000_000, input.options.maxPixels ?? 12_000_000)
      || (variant.requiresBigLane && input.options.lane !== "big")) throw new RasterPreparationError("Raster preparation exceeded its accepted safety budget.", "exit");
  }
  return manifest;
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", parseAttributeValue: true });
function records(value: unknown): Record<string, unknown>[] {
  return (Array.isArray(value) ? value : value === undefined || value === null ? [] : [value]).filter((item) => typeof item === "object" && item !== null) as Record<string, unknown>[];
}
function allFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? allFiles(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
}
function readXml(filename: string): string | null {
  if (fs.statSync(filename).size > 32 * 1024 * 1024) return null;
  if (!filename.toLowerCase().endsWith(".mxl")) return fs.readFileSync(filename, "utf8");
  const zip = new AdmZip(filename);
  const container = zip.getEntry("META-INF/container.xml");
  if (!container) return null;
  const parsed = parser.parse(zip.readAsText(container));
  const entryName = records(parsed.container?.rootfiles?.rootfile)[0]?.["full-path"];
  const entry = typeof entryName === "string" ? zip.getEntry(entryName) : null;
  return entry && entry.header.size <= 32 * 1024 * 1024 ? zip.readAsText(entry) : null;
}

/** Compare every document in a run; a JVM exit code alone is not success. */
export function inspectRasterQuality(outputDir: string, expectedStaffCount: number | null): RasterQuality {
  const result: RasterQuality = { valid: false, musicXmlCount: 0, noteCount: 0, measureCount: 0,
    physicalStaffCount: null, expectedStaffCount, coverage: null, invalidDurationRatio: 1,
    hasTimeSignature: false, abnormalMeasureRatio: null, confidence: null, lowConfidenceRatio: null };
  let invalidDurations = 0;
  let timedEvents = 0;
  const confidences: number[] = [];
  let stacks = 0; let abnormal = 0;
  for (const filename of allFiles(outputDir)) {
    try {
      if (/\.(?:musicxml|mxl|xml)$/iu.test(filename) && !filename.endsWith(".request.json")) {
        const text = readXml(filename); if (!text) continue;
        const score = parser.parse(text)["score-partwise"]; if (!score) continue;
        result.musicXmlCount++;
        for (const part of records(score.part)) for (const measure of records(part.measure)) {
          result.measureCount++;
          if (records(measure.attributes).some((attributes) => records(attributes.time).length > 0)) result.hasTimeSignature = true;
          for (const note of records(measure.note)) {
            if (note.pitch || note.unpitched) result.noteCount++;
            if (note.grace !== undefined) continue;
            timedEvents++;
            if (!(Number(note.duration) > 0)) invalidDurations++;
          }
        }
      } else if (/\.omr$/iu.test(filename)) {
        const zip = new AdmZip(filename);
        let staffCount = 0;
        for (const entry of zip.getEntries()) if (/^sheet#\d+\/sheet#\d+\.xml$/iu.test(entry.entryName) && entry.header.size <= 32 * 1024 * 1024) {
          const text = zip.readAsText(entry);
          const sheet = parser.parse(text).sheet;
          for (const page of records(sheet?.page)) for (const system of records(page.system)) {
            const abnormalIds = new Set<string>();
            for (const part of records(system.part)) {
              staffCount += records(part.staff).length;
              for (const measure of records(part.measure)) if (measure.abnormal === true || measure.abnormal === "true") abnormalIds.add(String(measure.id));
            }
            for (const stack of records(system.stack)) {
              stacks++;
              if (stack.abnormal === true || stack.abnormal === "true" || stack.excess !== undefined || abnormalIds.has(String(stack.id))) abnormal++;
            }
            for (const sig of records(system.sig)) for (const inters of records(sig.inters)) for (const values of Object.values(inters)) for (const symbol of records(values)) {
              const value = Number(symbol["ctx-grade"] ?? symbol.grade);
              if (Number.isFinite(value) && value >= 0 && value <= 1) confidences.push(value);
            }
          }
          // Some older exports flatten these definitions under sheet. Keep
          // support for that schema without matching staff-barline symbols.
          if (!records(sheet?.page).length) {
            staffCount += records(sheet?.staff).length;
            for (const stack of records(sheet?.stack)) { stacks++; if (stack.abnormal === true || stack.excess !== undefined) abnormal++; }
            for (const match of text.matchAll(/<(?:[\w-]*-inter|inter)\s[^>]*\b(?:ctx-grade|grade)="([0-9.]+)"/gu)) {
              const value = Number(match[1]); if (Number.isFinite(value) && value >= 0 && value <= 1) confidences.push(value);
            }
          }
        }
        if (staffCount) result.physicalStaffCount = Math.max(result.physicalStaffCount ?? 0, staffCount);
      }
    } catch { /* One malformed artifact must not hide other valid alternatives. */ }
  }
  result.valid = result.musicXmlCount > 0 && result.noteCount > 0;
  result.invalidDurationRatio = timedEvents ? invalidDurations / timedEvents : 1;
  result.coverage = expectedStaffCount && result.physicalStaffCount ? Math.min(1, result.physicalStaffCount / expectedStaffCount) : null;
  result.abnormalMeasureRatio = stacks ? abnormal / stacks : null;
  result.confidence = confidences.length ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length : null;
  result.lowConfidenceRatio = confidences.length ? confidences.filter((value) => value < .5).length / confidences.length : null;
  return result;
}

/** Coverage/known rhythm/diagnostics precede note count. Unknown is penalized. */
export function rasterQualityRank(quality: RasterQuality): number[] {
  return [Number(quality.valid), quality.coverage ?? .4, Number(quality.hasTimeSignature),
    1 - quality.invalidDurationRatio, 1 - (quality.abnormalMeasureRatio ?? .5),
    1 - (quality.lowConfidenceRatio ?? .5), quality.confidence ?? .5,
    Math.min(quality.noteCount, 100) / 100];
}
export function selectRasterVariant(runs: RasterEnhancementRun[]): RasterEnhancementRun | undefined {
  return runs.filter((run) => run.status === "succeeded" && run.quality?.valid).reduce<RasterEnhancementRun | undefined>((best, run) => {
    if (!best) return run;
    const a = rasterQualityRank(run.quality!); const b = rasterQualityRank(best.quality!);
    for (let index = 0; index < a.length; index++) if (Math.abs(a[index] - b[index]) > .0001) return a[index] > b[index] ? run : best;
    return best;
  }, undefined);
}
