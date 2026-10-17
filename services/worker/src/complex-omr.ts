import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ScoreJson } from "@score/shared";
import { AudiverisProcessError, runAudiverisWithRotationFallback, type RunAudiverisInput } from "./audiveris-runner.js";
import { enumerateAudiverisMusicXmlOutputs, enumerateAudiverisProjectOutputs, readAudiverisMusicXmlCandidates, musicXmlMovementTitle, normalizeMovementTitle, type OmrRecognitionCandidate } from "./audiveris-output.js";
import { homrEngineSlotWeight, withOmrEngineSlot } from "./omr-engine-gate.js";
import { createEngineExecutionClock } from "./engine-execution-clock.js";
import { engineResourceError } from "./engine-resource-error.js";
import { engineMemoryReservationMb } from "./engine-memory.js";
import { getJobMemoryLeaseEnvironment } from "./job-memory-lease.js";

export type RegionBox = { x: number; y: number; width: number; height: number };
type PreparedPage = { page: number; width: number; height: number; imagePath: string };
export type InventoryStaff = { id: string; page: number; systemId: string; lineCount: number; kind: "standard" | "tablature" | "percussion" | "unknown"; bbox: RegionBox; unit?: number; detector?: string; partId?: string; measureIds?: string[]; eventIds?: string[]; instrumentGroupId?: string };
export type InventoryGroup = { id: string; ordinal: number; staffIds: string[]; bbox: RegionBox; name?: string; labelConfidence?: number; role?: "pitched" | "percussion" };
export type InventorySystem = { id: string; bbox: RegionBox; staffIds: string[]; groups: InventoryGroup[]; expectedMeasureCount?: number | null };
export type PageInventory = PreparedPage & { staffs: InventoryStaff[]; systems: InventorySystem[]; warnings: string[]; homrError?: string | null; sourceTransform?: { rotationDegrees: 0 | 90 | 180 | 270; exifOrientation?: number; sourceWidth: number; sourceHeight: number; sourceToImage: number[]; imageToSource: number[] } };
export type CoverageGap = { id: string; kind: string; page: number; systemId?: string; staffId?: string; partId?: string; measureNumber?: number; message: string; severity: "warning" | "error"; instrumentGroupId?: string };
export type ComplexAttempt = { id: string; engine: "audiveris" | "homr" | "layout"; scope: "page" | "system" | "instrument-group" | "merge" | "inventory"; page?: number; systemId?: string; status: "succeeded" | "failed" | "cancelled" | "budget-exhausted"; elapsedMs: number; message?: string };
export type ComplexCoverage = {
  schemaVersion: 1;
  status: "review-required" | "incomplete";
  coverageBasis: "detected-layout";
  sourcePageCount: number;
  pages: Array<{ page: number; width: number; height: number; sourceTransform?: PageInventory["sourceTransform"]; systems: Array<{ id: string; bbox: RegionBox; staffIds: string[]; expectedMeasureCount?: number; groups: InventoryGroup[] }> }>;
  staffs: InventoryStaff[];
  gaps: CoverageGap[];
  attempts: ComplexAttempt[];
};
type XmlIssue = { kind: string; message: string; page?: number; systemId?: string; partId?: string; measure?: number };
type XmlAnalysis = {
  partCount: number;
  physicalStaffCount: number;
  systemCount: number;
  measureCount: number;
  movementTitle?: string;
  parts: Array<{ id: string; name: string; staffCount: number; measureCount: number; systemMeasureCounts: number[]; hasTabTechnical?: boolean; issues: XmlIssue[] }>;
  issues: XmlIssue[];
};
export type ComplexSourceRef = { noteId: string; page: number; systemId?: string; sourceStaffId?: string; partId: string; measureNumber: number; sourceMeasureNumber?: string; sourceRegion?: RegionBox; sourceNoteIndex?: number; staff?: number };
export type ComplexStaffBinding = { sourceStaffId: string; partId: string; page: number; systemId: string; measureNumbers: number[] };
type Chunk = { musicXmlPath: string; page: number; systemOrder: number; systemId?: string; scope: "page" | "system" | "instrument-group"; groupOrdinal?: number; bbox?: RegionBox; sourceStaffMap?: Record<string, string>; trustedPartNames?: Record<string, string> };
type Recognition = { musicXmlPath: string; analysis: XmlAnalysis; engine: "audiveris" | "homr" };

export type ComplexOmrInput = {
  inputPath: string;
  outputDir: string;
  pythonCommand: string;
  pythonArgsPrefix?: string[];
  adapterPath: string;
  homrSourceDir: string;
  /** HOMR remains offline evaluation only; never required by the shipped path. */
  enableHomrEvaluation?: boolean;
  timeoutMs: number;
  attemptTimeoutMs: number;
  maxGroupAttempts: number;
  renderPlan?: import("@score/shared").PdfRasterPageEstimate[];
  dpi: number;
  maxPagePixels: number;
  maxTotalPixels: number;
  imageMagickCommand?: string;
  audiveris: Omit<RunAudiverisInput, "inputPath" | "outputDir" | "timeoutMs" | "isCancelled">;
  isCancelled?: () => boolean;
  onQueueWait?: (elapsedMs: number) => void;
  onProgress?: (update: { message: string; attempts: number; page?: number; totalPages?: number; stage?: "prepare-pages" | "layout" | "recognize" | "restore-image" | "verify" }) => void;
  /** Injectable operations make scheduler/coverage tests independent of models. */
  adapter?: <T>(action: string, request: Record<string, unknown>, timeoutMs: number) => Promise<T>;
  recognizeAudiveris?: (inputPath: string, outputDir: string, timeoutMs: number) => Promise<{ musicXmlPath: string; analysis: XmlAnalysis }>;
};
export type ComplexOmrResult = { musicXml: string; musicXmlPath: string; coverage: ComplexCoverage; sourceRefs: ComplexSourceRef[]; staffBindings?: ComplexStaffBinding[]; pageImagePaths: string[]; reportPath: string; stdout: string; stderr: string; appliedRotationDegrees: 0 | 90 | 180 | 270; candidates: OmrRecognitionCandidate[]; recognizedPages: number[]; projectPaths: string[]; rawOutputPaths: string[]; rawOutputWarnings: Array<{ outputPath: string; message: string }> };

export class ComplexOmrFailure extends Error {
  constructor(message: string, readonly coverage: ComplexCoverage) { super(message); this.name = "ComplexOmrFailure"; }
}

function containedPath(directory: string, filename: string) {
  const root = path.resolve(directory);
  const resolved = path.resolve(filename);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) throw new Error("Complex OMR output escaped its private job directory.");
  return resolved;
}

export async function runComplexAdapter<T>(input: Pick<ComplexOmrInput, "pythonCommand" | "pythonArgsPrefix" | "adapterPath" | "homrSourceDir" | "outputDir" | "isCancelled" | "onQueueWait">, action: string, request: Record<string, unknown>, timeoutMs: number): Promise<T> {
  const heavy = ["orient", "inventory", "recognize"].includes(action);
  return withOmrEngineSlot({
    timeoutMs, isCancelled: input.isCancelled, slots: heavy ? homrEngineSlotWeight() : 1, onQueueWait: input.onQueueWait,
    memoryMb: engineMemoryReservationMb(heavy),
    cancelledError: () => new AudiverisProcessError("Complex recognition was cancelled while waiting for the OMR engine.", "cancelled"),
    timeoutError: () => new AudiverisProcessError("Complex recognition budget was exhausted while waiting for the OMR engine.", "timeout"),
  }, (remaining) => runComplexAdapterWithSlot<T>(input, action, request, remaining));
}

async function runComplexAdapterWithSlot<T>(input: Pick<ComplexOmrInput, "pythonCommand" | "pythonArgsPrefix" | "adapterPath" | "homrSourceDir" | "outputDir" | "isCancelled" | "onQueueWait">, action: string, request: Record<string, unknown>, timeoutMs: number): Promise<T> {
  fs.mkdirSync(input.outputDir, { recursive: true });
  const requestPath = path.join(input.outputDir, `${action}-${randomUUID()}.request.json`);
  const resultPath = requestPath.replace(/\.request\.json$/u, ".result.json");
  fs.writeFileSync(requestPath, JSON.stringify({ ...request, homrSourceDir: input.homrSourceDir }), "utf8");
  if (input.isCancelled?.()) throw new AudiverisProcessError("Complex recognition was cancelled before launch.", "cancelled");
  await new Promise<void>((resolve, reject) => {
    const clock = createEngineExecutionClock({ command: input.pythonCommand, timeoutMs, onQueueWait: input.onQueueWait,
      onQueueTimeout: (cause) => terminate("resource", cause.message), onTimeout: () => terminate("timeout") });
    const child = spawn(input.pythonCommand, [...(input.pythonArgsPrefix ?? []), input.adapterPath, action, requestPath, resultPath], {
      shell: false, windowsHide: true, detached: process.platform !== "win32", stdio: ["ignore", "ignore", "pipe"],
      env: { ...process.env, ...clock.environment, ...getJobMemoryLeaseEnvironment(), PYTHONUTF8: "1", OMP_NUM_THREADS: "1", OPENBLAS_NUM_THREADS: "1" },
    });
    let stderr = "";
    let error: AudiverisProcessError | undefined;
    let settled = false;
    let forceKill: NodeJS.Timeout | undefined;
    const kill = (signal: NodeJS.Signals) => {
      try {
        if (process.platform !== "win32" && child.pid) process.kill(-child.pid, signal);
        else child.kill(signal);
      } catch { /* The child may have already exited. */ }
    };
    const terminate = (reason: "timeout" | "cancelled" | "resource", message?: string) => {
      if (settled || error) return;
      error = new AudiverisProcessError(message ?? (reason === "cancelled" ? "Complex recognition was cancelled." : `Complex ${action} exceeded its remaining execution budget.`), reason);
      clock.stop();
      kill("SIGTERM");
      forceKill = setTimeout(() => kill("SIGKILL"), 2_000);
      forceKill.unref();
    };
    const poll = setInterval(() => { if (input.isCancelled?.()) terminate("cancelled"); }, 100);
    poll.unref();
    const cleanup = () => { stderr = (stderr + clock.finish()).slice(-16_000); clearInterval(poll); if (forceKill) clearTimeout(forceKill); };
    child.stderr.on("data", (chunk) => { stderr = (stderr + clock.stderr(chunk)).slice(-16_000); });
    child.on("error", (cause) => {
      if (settled) return;
      settled = true;
      cleanup();
      const resource = engineResourceError(cause);
      reject(new AudiverisProcessError(resource?.message ?? `Complex OMR Python adapter could not start: ${cause.message}`, resource ? "resource" : "spawn"));
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else if (code !== 0) {
        const resource = engineResourceError(stderr);
        reject(new AudiverisProcessError(resource?.message ?? `Complex OMR ${action} failed: ${stderr.trim()}`, resource ? "resource" : "exit", code));
      }
      else resolve();
    });
  });
  if (!fs.existsSync(resultPath) || fs.statSync(resultPath).size > 20 * 1024 * 1024) throw new Error("Complex OMR adapter returned missing or oversized diagnostics.");
  return JSON.parse(fs.readFileSync(resultPath, "utf8")) as T;
}

/** Lower is better. Counts compare structure, never claim pitch accuracy. */
export function recognitionStructurePenalty(analysis: XmlAnalysis, staffs: InventoryStaff[], systemCount: number, expectedMeasures?: number | null, expectedGroupStaffCounts?: number[]) {
  const expectedStaffs = staffs.filter((staff) => staff.kind !== "tablature").length;
  const outputStaffs = analysis.physicalStaffCount * Math.max(1, analysis.systemCount);
  const groupingPenalty = expectedGroupStaffCounts
    ? Math.abs(analysis.partCount - expectedGroupStaffCounts.length) * 100
      + expectedGroupStaffCounts.reduce((sum, count, index) => sum + Math.abs((analysis.parts[index]?.staffCount ?? 0) - count) * 50, 0)
    : 0;
  return Math.abs(outputStaffs - expectedStaffs) * 100 + Math.abs(analysis.systemCount - systemCount) * 50 + groupingPenalty
    + (expectedMeasures ? Math.abs(analysis.measureCount - expectedMeasures) * 10 : 0) + analysis.issues.length * 5 + (analysis.measureCount === 0 ? 1_000 : 0);
}

export async function runComplexOmr(input: ComplexOmrInput): Promise<ComplexOmrResult> {
  if (!input.pythonCommand.trim() || !fs.existsSync(input.adapterPath) || (input.enableHomrEvaluation && !fs.existsSync(input.homrSourceDir))) {
    throw new Error("Complex recognition requires the provisioned Python adapter; HOMR evaluation additionally requires its offline models.");
  }
  fs.mkdirSync(input.outputDir, { recursive: true });
  const startedAt = Date.now();
  let deadline = startedAt + input.timeoutMs;
  const onQueueWait = (elapsedMs: number) => { deadline += elapsedMs; input.onQueueWait?.(elapsedMs); };
  const assemblyReserve = Math.min(30_000, Math.max(2_000, input.timeoutMs * .05));
  const attempts: ComplexAttempt[] = [];
  const gaps: CoverageGap[] = [];
  const inventories: PageInventory[] = [];
  const chunks: Chunk[] = [];
  const candidates: OmrRecognitionCandidate[] = [];
  const projectPaths: string[] = [];
  const rawOutputPaths: string[] = [];
  const rawOutputWarnings: ComplexOmrResult["rawOutputWarnings"] = [];
  const validatedCandidatePaths = new Set<string>();
  const retainCandidate = (musicXmlPath: string, page: number, warnings: string[] = []) => {
    containedPath(input.outputDir, musicXmlPath);
    if (candidates.some(candidate => candidate.musicXmlPath === musicXmlPath && candidate.sourcePages.includes(page))) return;
    const musicXml = fs.readFileSync(musicXmlPath, "utf8");
    const originalTitle = musicXmlMovementTitle(musicXml);
    candidates.push({ id: `original-${candidates.length + 1}`, musicXmlPath, musicXml, sourcePages: [page], originalTitle,
      normalizedTitle: originalTitle ? normalizeMovementTitle(originalTitle) : undefined, relationship: "original", warnings });
  };
  let groupAttempts = 0;
  const remaining = (reserve = 0) => {
    if (input.isCancelled?.()) throw new AudiverisProcessError("Complex recognition was cancelled.", "cancelled");
    return Math.max(0, deadline - Date.now() - reserve);
  };
  const call = input.adapter ?? (<T>(action: string, request: Record<string, unknown>, timeoutMs: number) => runComplexAdapter<T>({ ...input, onQueueWait }, action, request, timeoutMs));
  const addGap = (value: Omit<CoverageGap, "id">) => gaps.push({ ...value, id: `gap-${gaps.length + 1}` });
  const layoutPenalty = (analysis: XmlAnalysis, staffs: InventoryStaff[], systems: number, measures?: number | null, groups?: number[]) =>
    recognitionStructurePenalty(analysis, staffs, systems, measures, groups) - analysis.issues.length * 5;
  const retainIssues = (recognized: Recognition, page: number) => {
    for (const issue of recognized.analysis.issues) addGap({ kind: issue.kind, page, message: issue.message, severity: "warning" });
  };
  const audit = async <T>(engine: ComplexAttempt["engine"], scope: ComplexAttempt["scope"], page: number | undefined, systemId: string | undefined, operation: () => Promise<T>) => {
    const attempt: ComplexAttempt = { id: `attempt-${attempts.length + 1}`, engine, scope, page, systemId, status: "succeeded", elapsedMs: 0 };
    attempts.push(attempt);
    const start = Date.now();
    try { return await operation(); }
    catch (error) {
      attempt.status = error instanceof AudiverisProcessError && error.reason === "cancelled" ? "cancelled" : error instanceof AudiverisProcessError && error.reason === "timeout" ? "budget-exhausted" : "failed";
      attempt.message = (error instanceof Error ? error.message : String(error)).slice(-2_000);
      throw error;
    } finally { attempt.elapsedMs = Date.now() - start; }
  };
  const prepareBudget = Math.min(input.attemptTimeoutMs, remaining(assemblyReserve));
  input.onProgress?.({ stage: "prepare-pages", message: "Preparing source pages.", attempts: 0 });
  if (prepareBudget <= 0) throw new AudiverisProcessError("Complex recognition budget was exhausted before page preparation.", "timeout");
  const prepared = await call<{ pages: PreparedPage[]; sourcePageCount: number }>("prepare", { inputPath: input.inputPath, outputDir: path.join(input.outputDir, "pages"), dpi: input.dpi, maxPagePixels: input.maxPagePixels, maxTotalPixels: input.maxTotalPixels, renderPlan: input.renderPlan }, prepareBudget);
  const sourceMapping = (recognition: Recognition, inventory: PageInventory, systems: InventorySystem[], selectedGroup?: InventoryGroup): Pick<Chunk, "sourceStaffMap" | "trustedPartNames"> => {
    const sourceStaffMap: Record<string, string> = {};
    const trustedPartNames: Record<string, string> = {};
    for (const system of systems) {
      const groups = selectedGroup ? [selectedGroup] : system.groups;
      if (groups.length !== recognition.analysis.partCount) continue;
      const groupStaffs = groups.map((group) => inventory.staffs.filter((staff) => group.staffIds.includes(staff.id) && staff.kind !== "tablature"));
      if (!groupStaffs.every((staffs, index) => staffs.length === recognition.analysis.parts[index].staffCount)) continue;
      recognition.analysis.parts.forEach((part, index) => {
        groupStaffs[index].forEach((staff, staffIndex) => { sourceStaffMap[`${system.id}|${part.id}|${staffIndex + 1}`] = staff.id; });
        if (groups[index].name && (groups[index].labelConfidence ?? 0) >= .7) trustedPartNames[part.id] = groups[index].name!;
      });
    }
    return { sourceStaffMap, trustedPartNames };
  };
  const recognize = async (imagePath: string, scope: Chunk["scope"], page: number, systemId: string | undefined, outputDir: string, expectedStaffs: InventoryStaff[], expectedSystems: number, expectedMeasures?: number | null): Promise<Recognition | null> => {
    let best: Recognition | null = null;
    const layoutPage = inventories.find((inventory) => inventory.page === page);
    const layoutSystem = layoutPage?.systems.find((system) => system.id === systemId) ?? layoutPage?.systems[0];
    const labelGroups = layoutSystem?.groups.filter((group) => expectedStaffs.some((staff) => group.staffIds.includes(staff.id))) ?? [];
    const groupStaffCounts = labelGroups.map((group) => expectedStaffs.filter((staff) => group.staffIds.includes(staff.id) && staff.kind !== "tablature" && (!systemId || staff.systemId === systemId)).length);
    const penalty = (analysis: XmlAnalysis) => layoutPenalty(analysis, expectedStaffs, expectedSystems, expectedMeasures, groupStaffCounts.length ? groupStaffCounts : undefined);
    for (const engine of (input.enableHomrEvaluation ? ["audiveris", "homr"] : ["audiveris"]) as Array<"audiveris" | "homr">) {
      const budget = Math.min(input.attemptTimeoutMs, remaining(assemblyReserve));
      if (budget <= 0) break;
      if (engine === "audiveris" && !input.audiveris.command.trim()) continue;
      try {
        input.onProgress?.({ stage: "recognize", message: "Recognizing musical content.", attempts: attempts.length, page, totalPages: prepared.sourcePageCount });
        const recognized = await audit(engine, scope, page, systemId, async () => {
          if (engine === "homr") return call<{ musicXmlPath: string; analysis: XmlAnalysis }>("recognize", { imagePath }, budget);
          if (input.recognizeAudiveris) return input.recognizeAudiveris(imagePath, outputDir, budget);
          fs.mkdirSync(outputDir, { recursive: true });
          const recognizedRun = await runAudiverisWithRotationFallback({ ...input.audiveris,
            ...(input.audiveris.enhancement ? { enhancement: { ...input.audiveris.enhancement, pageNumber: page } } : {}), imageMagickCommand: input.imageMagickCommand ?? "convert", allowedRotations: [0], inputPath: imagePath, outputDir, timeoutMs: budget, isCancelled: input.isCancelled, onQueueWait,
            onProgress: stage => input.onProgress?.({ stage, message: "Recognizing musical content.", attempts: attempts.length, page, totalPages: prepared.sourcePageCount }) });
          const selectedDir = recognizedRun.recognitionOutputDir ?? outputDir;
          const directories = [...new Set([selectedDir, ...(recognizedRun.enhancement?.variants.filter(variant => variant.status === "succeeded").map(variant => variant.outputDir) ?? [])])];
          const outputs: Array<{ musicXmlPath: string; analysis: XmlAnalysis }> = [];
          for (const directory of directories) {
            projectPaths.push(...enumerateAudiverisProjectOutputs(directory, { rotationDegrees: directory === outputDir ? recognizedRun.appliedRotationDegrees : 0 }));
            for (const exported of enumerateAudiverisMusicXmlOutputs(directory, { rotationDegrees: directory === outputDir ? recognizedRun.appliedRotationDegrees : 0 })) {
              rawOutputPaths.push(exported);
              try {
                for (const score of readAudiverisMusicXmlCandidates(exported)) {
                  const xmlPath = path.join(outputDir, `region-${candidates.length + outputs.length + 1}.musicxml`);
                  fs.writeFileSync(xmlPath, score.musicXml, "utf8");
                  retainCandidate(xmlPath, page);
                  const enhancement = recognizedRun.enhancement?.variants.find(variant => variant.outputDir === directory);
                  if (enhancement) {
                    const { imagePath: _path, ...geometry } = enhancement.variant;
                    candidates.find(candidate => candidate.musicXmlPath === xmlPath)!.enhancement = { variantId: enhancement.id, geometry, quality: enhancement.quality };
                  }
                  try {
                    const analysis = await call<XmlAnalysis>("analyze", { musicXmlPath: xmlPath }, Math.min(30_000, remaining()));
                    if (analysis.partCount && analysis.measureCount) { outputs.push({ musicXmlPath: xmlPath, analysis }); validatedCandidatePaths.add(xmlPath); }
                  } catch (error) {
                    if (engineResourceError(error) || (error instanceof AudiverisProcessError && error.reason === "cancelled")) throw error;
                    addGap({ kind: "unreadable-result", page, systemId, message: "One exported result could not be analyzed; the original and other results are retained.", severity: "warning" });
                  }
                }
              } catch (error) {
                if (engineResourceError(error) || (error instanceof AudiverisProcessError && error.reason === "cancelled")) throw error;
                rawOutputWarnings.push({ outputPath: exported, message: "This exported result could not be read. The original output and other results are retained." });
                addGap({ kind: "unreadable-result", page, systemId, message: "One exported result could not be read; other results are retained.", severity: "warning" });
              }
            }
          }
          if (!outputs.length) throw new Error("Audiveris did not export a readable score for this region.");
          return outputs.sort((left, right) => penalty(left.analysis) - penalty(right.analysis))[0];
        });
        if (recognized.analysis.partCount === 0 || recognized.analysis.measureCount === 0) throw new Error("The region contains no recognized musical parts/measures.");
        validatedCandidatePaths.add(recognized.musicXmlPath);
        retainCandidate(recognized.musicXmlPath, page, recognized.analysis.issues.map(issue => issue.message));
        const matchingLayout = recognized.analysis.partCount === labelGroups.length && labelGroups.every((group, index) => recognized.analysis.parts[index].staffCount === expectedStaffs.filter((staff) => group.staffIds.includes(staff.id) && staff.kind !== "tablature").length);
        if (matchingLayout && labelGroups.some((group) => group.name)) {
          const annotated = await call<{ analysis: XmlAnalysis; issues: XmlIssue[] }>("annotate", { musicXmlPath: recognized.musicXmlPath, labels: labelGroups }, Math.min(30_000, remaining()));
          recognized.analysis = annotated.analysis;
          for (const issue of annotated.issues) addGap({ kind: issue.kind, page, systemId, message: issue.message, severity: "warning" });
        }
        if (best && best.analysis.measureCount !== recognized.analysis.measureCount) {
          addGap({ kind: "engine-disagreement", page, systemId, message: "Recognition engines disagree about the measure count. Compare the original score before confirming.", severity: "warning" });
        }
        // Equal layout coverage retains the primary score; timing warnings
        // must not silently replace its lyrics or rewrite the original meter.
        if (!best || penalty(recognized.analysis) < penalty(best.analysis)) best = { ...recognized, engine };
        if (best && penalty(best.analysis) === 0 && best.analysis.issues.length === 0) break;
      } catch (error) {
        if (engineResourceError(error)) throw error;
        if (error instanceof AudiverisProcessError && (error.reason === "cancelled" || error.reason === "timeout")) throw error;
        input.onProgress?.({ message: `${engine} ${scope} recognition needs recovery.`, attempts: attempts.length, page });
      }
    }
    return best;
  };
  for (const page of prepared.pages) {
    try {
    containedPath(input.outputDir, page.imagePath);
    if (remaining(assemblyReserve) <= 0) {
      addGap({ kind: "budget-exhausted", page: page.page, message: "This source page was retained but not recognized within the total job budget.", severity: "error" });
      inventories.push({ ...page, staffs: [], systems: [], warnings: ["Page inventory was not completed"] });
      continue;
    }
    input.onProgress?.({ stage: "layout", message: "Building independent page, system, and staff inventory.", attempts: attempts.length, page: page.page, totalPages: prepared.sourcePageCount });
    let inventory: PageInventory;
    try {
      inventory = await audit("layout", "inventory", page.page, undefined, () => call<PageInventory>("orient", { ...page, lineOnly: !input.enableHomrEvaluation }, Math.min(input.attemptTimeoutMs, remaining(assemblyReserve))));
    } catch (error) {
      if (engineResourceError(error)) throw error;
      if (error instanceof AudiverisProcessError && error.reason === "cancelled") throw error;
      const warning = error instanceof Error ? error.message : "Page layout inventory failed";
      // A slow/failed model must not erase independently visible staff/TAB
      // structure. The fallback uses no models and explicitly requires review.
      try {
        inventory = await audit("layout", "inventory", page.page, undefined, () => call<PageInventory>("orient", { ...page, lineOnly: true }, Math.min(30_000, remaining(assemblyReserve))));
        inventory.warnings.push(warning);
      } catch (fallbackError) {
        if (engineResourceError(fallbackError)) throw fallbackError;
        if (fallbackError instanceof AudiverisProcessError && fallbackError.reason === "cancelled") throw fallbackError;
        inventory = { ...page, staffs: [], systems: [], warnings: [warning, "Independent line inventory could not finish; review the retained source"] };
      }
    }
    Object.assign(page, { imagePath: inventory.imagePath, width: inventory.width, height: inventory.height });
    inventories.push(inventory);
    for (const warning of inventory.warnings) addGap({ kind: "layout-uncertain", page: page.page, message: warning, severity: "warning" });
    if (inventory.staffs.length === 0) addGap({ kind: "layout-uncertain", page: page.page, message: "An empty detection cannot prove this source page is blank.", severity: "error" });
    for (const staff of inventory.staffs.filter((item) => item.kind === "tablature")) addGap({ kind: "tab-unrecognized", page: page.page, systemId: staff.systemId, staffId: staff.id, instrumentGroupId: staff.instrumentGroupId, message: "Original TAB staff retained in the source inventory. Pitch OMR does not reconstruct its string/fret notation; it requires review.", severity: "error" });
    const recognitionPage = path.join(path.dirname(page.imagePath), `page-${page.page}-pitch.png`);
    await call("crop", { imagePath: page.imagePath, outputPath: recognitionPage, bbox: { x: 0, y: 0, width: page.width, height: page.height }, maskRegions: inventory.staffs.filter((staff) => staff.kind === "tablature").map((staff) => ({ ...staff.bbox, y: Math.max(0, staff.bbox.y - (staff.unit ?? 8) * 2), height: staff.bbox.height + (staff.unit ?? 8) * 4 })) }, Math.min(30_000, remaining()));
    const full = await recognize(recognitionPage, "page", page.page, undefined, path.join(input.outputDir, `p${page.page}-full`), inventory.staffs, Math.max(1, inventory.systems.length));
    const pageGroupStaffCounts = inventory.systems[0]?.groups.map((group) => inventory.staffs.filter((staff) => group.staffIds.includes(staff.id) && staff.kind !== "tablature").length);
    if (full && inventory.systems.length > 0 && layoutPenalty(full.analysis, inventory.staffs, inventory.systems.length, undefined, pageGroupStaffCounts) === 0) {
      retainIssues(full, page.page);
      chunks.push({ musicXmlPath: full.musicXmlPath, page: page.page, systemOrder: 0, scope: "page", bbox: { x: 0, y: 0, width: page.width, height: page.height }, ...sourceMapping(full, inventory, inventory.systems) });
      continue;
    }
    if (inventory.systems.length === 0) {
      if (full) { retainIssues(full, page.page); chunks.push({ musicXmlPath: full.musicXmlPath, page: page.page, systemOrder: 0, scope: "page" }); }
      else addGap({ kind: "recognition-failed", page: page.page, message: "No recognized score was produced for this page.", severity: "error" });
      continue;
    }
    let recoveredSystems = 0;
    for (const [systemOrder, system] of inventory.systems.entries()) {
      if (remaining(assemblyReserve) <= 0) {
        addGap({ kind: "budget-exhausted", page: page.page, systemId: system.id, message: "System recovery was not finished within the total job budget.", severity: "error" });
        continue;
      }
      const systemStaffs = inventory.staffs.filter((staff) => system.staffIds.includes(staff.id));
      const cropPath = path.join(input.outputDir, `${system.id}.png`);
      await call("crop", { imagePath: recognitionPage, outputPath: cropPath, bbox: system.bbox }, Math.min(30_000, remaining()));
      const recognized = await recognize(cropPath, "system", page.page, system.id, path.join(input.outputDir, system.id), systemStaffs, 1, system.expectedMeasureCount);
      const systemGroupStaffCounts = system.groups.map((group) => systemStaffs.filter((staff) => group.staffIds.includes(staff.id) && staff.kind !== "tablature").length);
      if (recognized && layoutPenalty(recognized.analysis, systemStaffs, 1, system.expectedMeasureCount, systemGroupStaffCounts) === 0) {
        retainIssues(recognized, page.page);
        chunks.push({ musicXmlPath: recognized.musicXmlPath, page: page.page, systemOrder, systemId: system.id, scope: "system", bbox: system.bbox, ...sourceMapping(recognized, inventory, [system]) });
        recoveredSystems += 1;
        continue;
      }
      const groupChunks: Chunk[] = [];
      for (const group of system.groups) {
        if (groupAttempts >= input.maxGroupAttempts || remaining(assemblyReserve) <= 0) break;
        const groupStaffs = systemStaffs.filter((staff) => group.staffIds.includes(staff.id));
        if (!groupStaffs.some((staff) => staff.kind !== "tablature")) continue;
        groupAttempts += 1;
        const groupPath = path.join(input.outputDir, `${group.id}.png`);
        await call("crop", { imagePath: recognitionPage, outputPath: groupPath, bbox: group.bbox }, Math.min(30_000, remaining()));
        const groupResult = await recognize(groupPath, "instrument-group", page.page, system.id, path.join(input.outputDir, group.id), groupStaffs, 1, system.expectedMeasureCount);
        if (groupResult) {
          groupChunks.push({ musicXmlPath: groupResult.musicXmlPath, page: page.page, systemOrder, systemId: system.id, scope: "instrument-group", groupOrdinal: group.ordinal, bbox: group.bbox, ...sourceMapping(groupResult, inventory, [system], group) });
          retainIssues(groupResult, page.page);
          if (layoutPenalty(groupResult.analysis, groupStaffs, 1, system.expectedMeasureCount, [groupStaffs.filter((staff) => staff.kind !== "tablature").length]) > 0) addGap({ kind: "group-structure", page: page.page, systemId: system.id, instrumentGroupId: group.id, message: "This instrument group produced notation but did not satisfy its staff/bar/duration inventory; source review is required.", severity: "error" });
        }
      }
      if (groupChunks.length === system.groups.filter((group) => systemStaffs.some((staff) => group.staffIds.includes(staff.id) && staff.kind !== "tablature")).length && groupChunks.length > 0) {
        chunks.push(...groupChunks);
        recoveredSystems += 1;
      } else if (recognized) {
        // Keep the best complete-system candidate rather than partially replacing its parts.
        chunks.push({ musicXmlPath: recognized.musicXmlPath, page: page.page, systemOrder, systemId: system.id, scope: "system", bbox: system.bbox, ...sourceMapping(recognized, inventory, [system]) });
        recoveredSystems += 1;
        addGap({ kind: "missing-staff", page: page.page, systemId: system.id, message: "System recovery did not satisfy its detected staff/bar/duration inventory. Candidate material is retained for correction.", severity: "error" });
      } else {
        chunks.push(...groupChunks);
        if (groupChunks.length) recoveredSystems += 1;
        addGap({ kind: "recognition-failed", page: page.page, systemId: system.id, message: "One or more original instrument groups could not be recognized. No missing notes were fabricated.", severity: "error" });
      }
    }
    if (recoveredSystems === 0 && full) {
      chunks.push({ musicXmlPath: full.musicXmlPath, page: page.page, systemOrder: 0, scope: "page" });
      addGap({ kind: "missing-staff", page: page.page, message: "Only the whole-page fallback is available; original system coverage remains unresolved.", severity: "error" });
    }
    } catch (error) {
      const exhausted = engineResourceError(error) || (error instanceof AudiverisProcessError && error.reason === "timeout");
      if (!exhausted || (!chunks.length && !validatedCandidatePaths.size)) throw error;
      for (const remainingPage of prepared.pages.filter(candidate => candidate.page >= page.page)) {
        addGap({ kind: "resource-budget-exhausted", page: remainingPage.page, message: "Processing capacity was reached. Earlier readable results are retained; only delivered pages are charged.", severity: "error" });
        if (!inventories.some(inventory => inventory.page === remainingPage.page)) inventories.push({ ...remainingPage, staffs: [], systems: [], warnings: ["Page processing was not completed"] });
      }
      break;
    }
  }
  if (input.isCancelled?.()) throw new AudiverisProcessError("Complex recognition was cancelled before assembly.", "cancelled");
  if (chunks.length === 0 && validatedCandidatePaths.size) {
    const fallback = candidates.find(candidate => validatedCandidatePaths.has(candidate.musicXmlPath));
    if (fallback) chunks.push({ musicXmlPath: fallback.musicXmlPath, page: fallback.sourcePages[0], systemOrder: 0, scope: "page" });
  }
  if (chunks.length === 0) {
    const coverage: ComplexCoverage = {
      schemaVersion: 1, status: "incomplete", coverageBasis: "detected-layout", sourcePageCount: prepared.sourcePageCount,
      pages: inventories.map(page => ({ page: page.page, width: page.width, height: page.height, sourceTransform: page.sourceTransform,
        systems: page.systems.map(({ expectedMeasureCount, ...system }) => ({ ...system, ...(expectedMeasureCount ? { expectedMeasureCount } : {}) })) })),
      staffs: inventories.flatMap(page => page.staffs), gaps, attempts,
    };
    fs.writeFileSync(path.join(input.outputDir, "coverage-report.json"), JSON.stringify({ coverage, inventories }, null, 2));
    throw new ComplexOmrFailure("No readable staff notation was produced. Covers, severe blur, handwritten symbols or non-staff notation may prevent recognition. Your source is retained and recognition credits are released.", coverage);
  }
  const mergedPath = path.join(input.outputDir, "complex-candidate.musicxml");
  input.onProgress?.({ stage: "verify", message: "Assembling and checking recognized structure.", attempts: attempts.length, totalPages: prepared.sourcePageCount });
  type Assembled = { musicXmlPath: string; sourceRefs: ComplexSourceRef[]; staffBindings?: ComplexStaffBinding[]; issues: XmlIssue[]; analysis: XmlAnalysis; sourcePages?: number[]; memberPaths?: string[] };
  let merged: Assembled & { alternatives?: Assembled[] };
  try {
    merged = await audit("layout", "merge", undefined, undefined, () => call<typeof merged>("merge", { chunks, outputPath: mergedPath }, Math.max(1, remaining())));
    for (const [index, assembled] of (merged.alternatives ?? [merged]).entries()) {
      containedPath(input.outputDir, assembled.musicXmlPath);
      const musicXml = fs.readFileSync(assembled.musicXmlPath, "utf8");
      const originalTitle = musicXmlMovementTitle(musicXml);
      candidates.push({ id: `assembled-${index + 1}`, musicXmlPath: assembled.musicXmlPath, musicXml,
        sourcePages: assembled.sourcePages ?? [...new Set(chunks.map(chunk => chunk.page))], originalTitle,
        normalizedTitle: originalTitle ? normalizeMovementTitle(originalTitle) : undefined, relationship: "assembled",
        memberIds: candidates.filter(candidate => (assembled.memberPaths ?? chunks.map(chunk => chunk.musicXmlPath)).includes(candidate.musicXmlPath)).map(candidate => candidate.id) });
    }
  } catch (error) {
    if (error instanceof AudiverisProcessError && error.reason === "cancelled") throw error;
    const fallback = candidates.find(candidate => chunks.some(chunk => chunk.musicXmlPath === candidate.musicXmlPath));
    if (!fallback) throw error;
    merged = { musicXmlPath: fallback.musicXmlPath, sourceRefs: [], issues: [{ kind: "assembly-unavailable", message: "Automatic assembly could not finish. All readable source results are retained separately." }], analysis: { partCount: 0, physicalStaffCount: 0, systemCount: 0, measureCount: 0, parts: [], issues: [] } };
  }
  containedPath(input.outputDir, merged.musicXmlPath);
  for (const issue of [...merged.issues, ...merged.analysis.issues]) addGap({ kind: issue.kind, page: issue.page ?? 1, systemId: issue.systemId, partId: issue.partId, measureNumber: issue.measure, message: issue.message, severity: "error" });
  // Passing structure checks is not proof of note accuracy or a complete source inventory.
  addGap({ kind: "coverage-unverified", page: 1, message: "Detected layout and duration checks do not prove every source symbol or pitch was recognized. Explicit score review is required.", severity: "warning" });
  const coverage: ComplexCoverage = {
    schemaVersion: 1, status: gaps.some((gap) => gap.severity === "error") ? "incomplete" : "review-required", coverageBasis: "detected-layout", sourcePageCount: prepared.sourcePageCount,
    pages: inventories.map((page) => ({ page: page.page, width: page.width, height: page.height, sourceTransform: page.sourceTransform, systems: page.systems.map((system) => ({ id: system.id, bbox: system.bbox, staffIds: system.staffIds, groups: system.groups, ...(system.expectedMeasureCount ? { expectedMeasureCount: system.expectedMeasureCount } : {}) })) })),
    staffs: inventories.flatMap((page) => page.staffs), gaps, attempts,
  };
  const reportPath = path.join(input.outputDir, "coverage-report.json");
  fs.writeFileSync(reportPath, JSON.stringify({ coverage, sourceRefs: merged.sourceRefs, staffBindings: merged.staffBindings, inventories, chunks, alternatives: candidates.map(({ musicXml: _xml, ...candidate }) => candidate), elapsedMs: Date.now() - startedAt }, null, 2), "utf8");
  const firstTransform = inventories[0]?.sourceTransform;
  const exifRotation = ({ 3: 180, 6: 90, 8: 270 } as Record<number, number>)[firstTransform?.exifOrientation ?? 1] ?? 0;
  const singlePageRotation = inventories.length === 1 ? ((firstTransform?.rotationDegrees ?? 0) + exifRotation) % 360 : 0;
  return { musicXml: fs.readFileSync(merged.musicXmlPath, "utf8"), musicXmlPath: merged.musicXmlPath, coverage, sourceRefs: merged.sourceRefs, staffBindings: merged.staffBindings, pageImagePaths: prepared.pages.map((page) => page.imagePath), reportPath, candidates, projectPaths: [...new Set(projectPaths)], rawOutputPaths: [...new Set(rawOutputPaths)], rawOutputWarnings, recognizedPages: [...new Set(chunks.map(chunk => chunk.page))], stdout: `Complex OMR completed ${attempts.length} serial attempts; candidate coverage ${coverage.status}.`, stderr: "", appliedRotationDegrees: singlePageRotation as 0 | 90 | 180 | 270 };
}

export function applyComplexCoverage(score: ScoreJson, result: Pick<ComplexOmrResult, "coverage" | "sourceRefs" | "staffBindings">): ScoreJson {
  const staffs = result.coverage.staffs.map((staff) => ({ ...staff, measureIds: [] as string[], eventIds: [] as string[] }));
  const measures = score.measures.map((measure) => ({ ...measure, events: measure.events.map((event) => ({ ...event })) }));
  for (const binding of result.staffBindings ?? []) {
    const staff = staffs.find((item) => item.id === binding.sourceStaffId && item.page === binding.page && item.systemId === binding.systemId);
    if (!staff) continue;
    staff.partId = binding.partId;
    staff.measureIds = measures.filter((measure) => measure.partId === binding.partId && binding.measureNumbers.includes(Number(measure.number))).map((measure) => measure.id);
  }
  for (const ref of result.sourceRefs) {
    const measure = measures.find((item) => item.partId === ref.partId && item.number === String(ref.measureNumber));
    if (!measure) continue;
    const event = measure.events[ref.sourceNoteIndex ?? -1];
    if (event) event.recognition = { ...(event.recognition ?? { confidence: null, source: "omr-engine", issues: [] }), page: ref.page };
    const matching = staffs.filter((staff) => staff.page === ref.page && (!ref.systemId || staff.systemId === ref.systemId) && staff.kind !== "tablature");
    // A region containing one physical staff is safe to bind. Other identities remain explicit gaps.
    const region = ref.sourceRegion;
    const inRegion = ref.sourceStaffId ? matching.filter((staff) => staff.id === ref.sourceStaffId) : matching.filter((staff) => region && staff.bbox.y >= region.y && staff.bbox.y + staff.bbox.height <= region.y + region.height);
    if (inRegion.length === 1) {
      const staff = inRegion[0];
      staff.partId = ref.partId;
      if (!staff.measureIds.includes(measure.id)) staff.measureIds.push(measure.id);
      if (event && !staff.eventIds.includes(event.id)) staff.eventIds.push(event.id);
    }
  }
  return {
    ...score,
    measures,
    recognitionLayer: {
      engine: "hybrid", recognitionMode: "complex", engineVersion: "audiveris-layout-v2",
      pages: result.coverage.pages.map((page) => ({ page: page.page, width: page.width, height: page.height })), symbols: [], coverage: { ...result.coverage, staffs },
    },
    metadata: { ...score.metadata, warnings: [...score.metadata.warnings, ...result.coverage.gaps.map((gap) => `[${gap.kind}] ${gap.message}`)] },
  };
}

/** Materialize selected raw region XML before private job-directory cleanup. */
export function complexEvidenceEntries(result: Pick<ComplexOmrResult, "reportPath" | "musicXmlPath">): Array<{ name: string; content: Buffer }> {
  const directory = path.dirname(result.reportPath);
  const report = JSON.parse(fs.readFileSync(containedPath(directory, result.reportPath), "utf8")) as {
    coverage: ComplexCoverage; sourceRefs: ComplexSourceRef[]; inventories: PageInventory[]; chunks: Chunk[]; elapsedMs: number;
    alternatives?: Array<Omit<OmrRecognitionCandidate, "musicXml">>;
  };
  const entries: Array<{ name: string; content: Buffer }> = [];
  const chunks = report.chunks.map((chunk, index) => {
    const name = `regions/p${String(chunk.page).padStart(3, "0")}-s${String(chunk.systemOrder + 1).padStart(3, "0")}-${index + 1}.musicxml`;
    entries.push({ name, content: fs.readFileSync(containedPath(directory, chunk.musicXmlPath)) });
    return { ...chunk, musicXmlPath: name };
  });
  const publicReport = {
    ...report,
    coverage: { ...report.coverage, attempts: report.coverage.attempts.map((attempt) => ({ ...attempt, ...(attempt.message ? { message: attempt.message.trim().split(/\r?\n/u).at(-1) } : {}) })) },
    inventories: report.inventories.map(({ imagePath: _path, homrError, ...inventory }) => ({ ...inventory, imagePath: `source-page-${String(inventory.page).padStart(3, "0")}.png`, ...(homrError ? { homrError: homrError.trim().split(/\r?\n/u).at(-1) } : {}) })),
    chunks,
    alternatives: (report.alternatives ?? []).map((candidate, index) => {
      const name = `alternatives/result-${index + 1}.musicxml`;
      entries.push({ name, content: fs.readFileSync(containedPath(directory, candidate.musicXmlPath)) });
      return { ...candidate, musicXmlPath: name };
    }),
  };
  entries.push({ name: "coverage-report.json", content: Buffer.from(JSON.stringify(publicReport, null, 2), "utf8") });
  entries.push({ name: "candidate.musicxml", content: fs.readFileSync(containedPath(directory, result.musicXmlPath)) });
  return entries;
}
