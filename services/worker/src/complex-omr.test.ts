import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { AudiverisProcessError } from "./audiveris-runner.js";
import { ComplexOmrFailure, complexEvidenceEntries, recognitionStructurePenalty, runComplexOmr, type ComplexOmrInput, type PageInventory } from "./complex-omr.js";

const analysis = (parts = 2, systems = 1, issues: Array<{ kind: string; message: string }> = []) => ({ partCount: parts, physicalStaffCount: parts, systemCount: systems, measureCount: 1, parts: Array.from({ length: parts }, (_, index) => ({ id: `P${index + 1}`, name: index ? "Violin" : "Flute", staffCount: 1, measureCount: 1, systemMeasureCounts: [1], issues: [] })), issues });

test("equal total staff counts cannot hide incorrectly coupled instrument groups", () => {
  const recognized = analysis(1);
  recognized.physicalStaffCount = 2;
  recognized.parts[0].staffCount = 2;
  const staffs: PageInventory["staffs"] = [1, 2].map((index) => ({ id: `s${index}`, page: 1, systemId: "sys1", lineCount: 5, kind: "standard", bbox: { x: 0, y: index * 100, width: 800, height: 40 } }));
  assert.equal(recognitionStructurePenalty(recognized, staffs, 1), 0);
  assert.ok(recognitionStructurePenalty(recognized, staffs, 1, undefined, [1, 1]) > 0);
});

function fixture(t: { after: (cleanup: () => void) => void }) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "complex-omr-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const source = path.join(directory, "source.png");
  const xml = path.join(directory, "candidate.musicxml");
  fs.writeFileSync(source, "original authored test source");
  fs.writeFileSync(xml, '<score-partwise version="4.0"><part-list/></score-partwise>');
  const calls: string[] = [];
  const inventory: PageInventory = {
    page: 1, width: 1000, height: 1000, imagePath: source, warnings: [],
    staffs: [
      { id: "s1", page: 1, systemId: "sys1", lineCount: 5, kind: "standard", bbox: { x: 100, y: 100, width: 800, height: 40 } },
      { id: "s2", page: 1, systemId: "sys1", lineCount: 5, kind: "standard", bbox: { x: 100, y: 300, width: 800, height: 40 } },
    ],
    systems: [{ id: "sys1", bbox: { x: 0, y: 50, width: 1000, height: 400 }, staffIds: ["s1", "s2"], groups: [
      { id: "g1", ordinal: 0, staffIds: ["s1"], bbox: { x: 0, y: 50, width: 1000, height: 180 } },
      { id: "g2", ordinal: 1, staffIds: ["s2"], bbox: { x: 0, y: 250, width: 1000, height: 180 } },
    ] }],
  };
  const input: ComplexOmrInput = {
    inputPath: source, outputDir: directory, pythonCommand: process.execPath, adapterPath: source, homrSourceDir: directory,
    timeoutMs: 30_000, attemptTimeoutMs: 10_000, maxGroupAttempts: 2, dpi: 300, maxPagePixels: 1_000_000, maxTotalPixels: 2_000_000,
    audiveris: { command: "audiveris" },
    adapter: async <T>(action: string, request: Record<string, unknown>): Promise<T> => {
      calls.push(action);
      const result = action === "prepare" ? { pages: [{ page: 1, width: 1000, height: 1000, imagePath: source }], sourcePageCount: 1 }
        : action === "orient" ? inventory
        : action === "recognize" ? { musicXmlPath: xml, analysis: analysis(1, 1) }
        : action === "merge" ? { musicXmlPath: xml, sourceRefs: [], issues: [], analysis: analysis() }
        : action === "annotate" ? { analysis: analysis(), issues: [] }
        : { imagePath: request.outputPath };
      return result as T;
    },
    recognizeAudiveris: async () => { calls.push("audiveris"); return { musicXmlPath: xml, analysis: analysis() }; },
  };
  return { input, inventory, calls, xml };
}

test("successful structural recognition remains a review-required candidate", async (t) => {
  const { input, calls } = fixture(t);
  const result = await runComplexOmr(input);
  assert.equal(result.coverage.status, "review-required");
  assert.equal(result.coverage.sourcePageCount, 1);
  assert.ok(result.coverage.gaps.some((gap) => gap.kind === "coverage-unverified"));
  assert.equal(calls.filter((call) => call === "audiveris").length, 1);
  assert.equal(calls.includes("recognize"), false, "A successful whole-page structural candidate should not trigger redundant recognition");
});

test("failed recognition retains the detected layout, gaps and actual engine failures", async t => {
  const { input, inventory } = fixture(t);
  const adapter = input.adapter!;
  input.adapter = async <T>(action: string, request: Record<string, unknown>, timeout: number) => {
    if (action === "recognize") throw new Error("Unreadable region");
    return adapter<T>(action, request, timeout);
  };
  input.recognizeAudiveris = async () => { throw new Error("No export"); };
  await assert.rejects(runComplexOmr(input), error => {
    assert.ok(error instanceof ComplexOmrFailure);
    assert.equal(error.coverage.staffs.length, inventory.staffs.length);
    assert.equal(error.coverage.pages.length, 1);
    assert.ok(error.coverage.gaps.length > 0);
    assert.ok(error.coverage.attempts.some(attempt => attempt.message === "No export"));
    assert.ok(fs.existsSync(input.inputPath));
    assert.ok(fs.existsSync(path.join(input.outputDir, "coverage-report.json")));
    return true;
  });
});

test("a model failure keeps independent staff structure and explicit uncertainty", async t => {
  const { input, inventory } = fixture(t); const adapter = input.adapter!;
  input.adapter = async <T>(action: string, request: Record<string, unknown>, timeout: number) => {
    if (action === "orient" && !request.lineOnly) throw new Error("Layout model timeout");
    return adapter<T>(action, request, timeout);
  };
  const result = await runComplexOmr(input);
  assert.equal(result.coverage.staffs.length, inventory.staffs.length);
  assert.ok(result.coverage.gaps.some(gap => gap.message === "Layout model timeout"));
  assert.equal(result.coverage.status, "review-required");
});

test("equal layout coverage retains the primary score and exposes timing/engine disagreement", async t => {
  const { input, xml } = fixture(t); const adapter = input.adapter!;
  const primary = analysis(2, 1, [{ kind: "duration-mismatch", message: "Review measure 38 timing" }]);
  input.recognizeAudiveris = async () => ({ musicXmlPath: xml, analysis: primary });
  const secondary = analysis(2); secondary.measureCount = 2;
  let chosen: unknown;
  input.adapter = async <T>(action: string, request: Record<string, unknown>, timeout: number) => {
    if (action === "recognize") return { musicXmlPath: "secondary.musicxml", analysis: secondary } as T;
    if (action === "merge") chosen = (request.chunks as Array<{ musicXmlPath: string }>)[0].musicXmlPath;
    return adapter<T>(action, request, timeout);
  };
  const result = await runComplexOmr(input);
  assert.equal(chosen, xml);
  assert.ok(result.coverage.gaps.some(gap => gap.kind === "duration-mismatch"));
  assert.ok(result.coverage.gaps.some(gap => gap.kind === "engine-disagreement"));
});

test("TAB remains a visible source gap and is masked only in the recognition copy", async (t) => {
  const { input, inventory } = fixture(t);
  inventory.staffs.push({ id: "tab", page: 1, systemId: "sys1", lineCount: 6, kind: "tablature", bbox: { x: 100, y: 200, width: 800, height: 50 } });
  const adapter = input.adapter!;
  let masked = false;
  input.adapter = async <T>(action: string, request: Record<string, unknown>, timeout: number) => {
    if (action === "crop" && Array.isArray(request.maskRegions)) masked = request.maskRegions.length === 1;
    return adapter<T>(action, request, timeout);
  };
  const result = await runComplexOmr(input);
  assert.equal(masked, true);
  assert.equal(result.coverage.status, "incomplete");
  assert.equal(result.coverage.staffs.find((staff) => staff.id === "tab")?.lineCount, 6);
  assert.ok(result.coverage.gaps.some((gap) => gap.kind === "tab-unrecognized" && gap.staffId === "tab"));
});

test("a failed whole page recovers its systems and engines run serially", async (t) => {
  const { input, calls } = fixture(t);
  let active = 0;
  let maximumActive = 0;
  input.recognizeAudiveris = async (_source, outputDir) => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    calls.push(outputDir.includes("full") ? "page-failed" : "system-recovered");
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
    if (outputDir.includes("full")) throw new Error("Whole-page export contained multiple movements");
    return { musicXmlPath: path.join(input.outputDir, "candidate.musicxml"), analysis: analysis() };
  };
  const result = await runComplexOmr(input);
  assert.equal(maximumActive, 1);
  assert.ok(calls.includes("system-recovered"));
  assert.ok(result.coverage.attempts.some((attempt) => attempt.scope === "page" && attempt.status === "failed"));
  assert.ok(result.coverage.attempts.some((attempt) => attempt.scope === "system" && attempt.status === "succeeded"));
});

test("persisted cancellation prevents merge and candidate creation", async (t) => {
  const { input, calls } = fixture(t);
  let cancelled = false;
  input.isCancelled = () => cancelled;
  input.recognizeAudiveris = async () => { cancelled = true; return { musicXmlPath: path.join(input.outputDir, "candidate.musicxml"), analysis: analysis() }; };
  await assert.rejects(runComplexOmr(input), (error: unknown) => error instanceof AudiverisProcessError && error.reason === "cancelled");
  assert.equal(calls.includes("merge"), false);
});

test("an exhausted total budget does not launch even page preparation", async (t) => {
  const { input, calls } = fixture(t);
  input.timeoutMs = 1;
  await assert.rejects(runComplexOmr(input), (error: unknown) => error instanceof AudiverisProcessError && error.reason === "timeout");
  assert.equal(calls.length, 0);
});

test("an unresolved original page is retained in coverage instead of disappearing", async (t) => {
  const { input } = fixture(t);
  const originalAdapter = input.adapter!;
  input.adapter = async <T>(action: string, request: Record<string, unknown>, timeout: number) => {
    if (action === "prepare") return { pages: [{ page: 1, width: 1000, height: 1000, imagePath: input.inputPath }, { page: 2, width: 1000, height: 1000, imagePath: input.inputPath }], sourcePageCount: 2 } as T;
    if (action === "orient" && request.page === 2) return { page: 2, width: 1000, height: 1000, imagePath: input.inputPath, staffs: [], systems: [], warnings: ["No staff regions detected"] } as T;
    return originalAdapter<T>(action, request, timeout);
  };
  const result = await runComplexOmr(input);
  assert.equal(result.coverage.sourcePageCount, 2);
  assert.equal(result.coverage.pages.length, 2);
  assert.ok(result.coverage.gaps.some((gap) => gap.page === 2 && gap.severity === "error"));
  assert.equal(result.pageImagePaths.length, 2);
});

test("selected raw region XML survives scratch cleanup without leaking job paths", async (t) => {
  const { input, xml } = fixture(t);
  const result = await runComplexOmr(input);
  const raw = fs.readFileSync(xml);
  const entries = complexEvidenceEntries(result);
  assert.ok(entries.some((entry) => entry.name.startsWith("regions/") && entry.content.equals(raw)));
  const report = entries.find((entry) => entry.name === "coverage-report.json")!;
  assert.equal(report.content.toString().includes(input.outputDir), false);
  fs.unlinkSync(xml);
  assert.ok(entries.find((entry) => entry.name === "candidate.musicxml")!.content.length > 0);
});
