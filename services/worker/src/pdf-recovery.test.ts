import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { planPdfRasterBudget } from "@score/shared";
import { runSimplePdfOmr, SimplePdfOmrFailure } from "./simple-pdf-omr.js";
import { AudiverisProcessError, AudiverisRecognitionError } from "./audiveris-runner.js";

const policy = { dpi: 300, maxPagePixels: 12_000_000, maxTotalPixels: 120_000_000 };
test("normal large pages and twenty-page PDFs retain every page within useful resolution and both budgets", () => {
  for (const sizes of [[{ widthPoints: 17 * 72, heightPoints: 24 * 72 }],
    Array.from({ length: 20 }, () => ({ widthPoints: 595.28, heightPoints: 841.89 }))]) {
    const plan = planPdfRasterBudget(sizes, policy);
    assert.equal(plan.ok, true);
    assert.equal(plan.pages.length, sizes.length);
    assert.ok(plan.totalPixels <= policy.maxTotalPixels);
    assert.ok(plan.pages.every(page => page.dpi! >= 150 && page.dpi! < 300 && page.pixelCount <= policy.maxPagePixels));
  }
  assert.equal(planPdfRasterBudget([{ widthPoints: 5000, heightPoints: 5000 }], policy).ok, false);
  assert.equal(planPdfRasterBudget(Array.from({ length: 100 }, () => ({ widthPoints: 612, heightPoints: 792 })), policy).ok, false);
});

test("simple PDF recognizes pages serially and merges in source order, using only successful recovery artifacts", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-recovery-test-"));
  const plan = planPdfRasterBudget([{ widthPoints: 612, heightPoints: 792 }, { widthPoints: 612, heightPoints: 792 }], policy);
  let busy = false;
  let merged = false;
  const pageOrder: number[] = [];
  try {
    const result = await runSimplePdfOmr({ inputPath: "source.pdf", outputDir: root, pythonCommand: "unused", adapterPath: "unused", homrSourceDir: "unused",
      renderPlan: plan.pages, ...policy, timeoutMs: 10_000, audiveris: { command: "unused" }, imageMagickCommand: "unused",
      adapter: async <T>(action: string, request: Record<string, unknown>) => {
        if (action === "prepare") return { sourcePageCount: 2, pages: plan.pages.map(page => ({ page: page.pageNumber, renderDpi: page.dpi, imagePath: `${page.pageNumber}.png`, width: page.widthPixels, height: page.heightPixels })) } as T;
        const chunks = request.chunks as Array<{ page: number; musicXmlPath: string }>;
        assert.deepEqual(chunks.map(chunk => chunk.page), [1, 2]);
        assert.ok(chunks.every(chunk => fs.readFileSync(chunk.musicXmlPath, "utf8").includes("score-partwise")));
        const output = String(request.outputPath); fs.writeFileSync(output, "<score-partwise/>"); merged = true;
        return { musicXmlPath: output, issues: [] } as T;
      },
      recognize: async input => {
        assert.equal(busy, false); busy = true;
        pageOrder.push(Number(path.basename(input.outputDir).split("-").at(-1)));
        await new Promise(resolve => setTimeout(resolve, 10));
        const recovered = path.join(input.outputDir, "resolution-2"); fs.mkdirSync(recovered);
        fs.writeFileSync(path.join(recovered, "score.musicxml"), "<score-partwise><part><measure><note><rest/></note></measure></part></score-partwise>");
        fs.writeFileSync(path.join(input.outputDir, "failed.musicxml"), "bad attempt"); busy = false;
        return { stdout: "", stderr: "", appliedRotationDegrees: 0, recognitionOutputDir: recovered, rasterScale: 2 };
      },
    });
    assert.equal(merged, true); assert.deepEqual(pageOrder, [1, 2]); assert.equal(result.pages.length, 2);
    await assert.rejects(runSimplePdfOmr({ inputPath: "source.pdf", outputDir: root, pythonCommand: "unused", adapterPath: "unused", homrSourceDir: "unused",
      renderPlan: plan.pages, ...policy, timeoutMs: 10_000, audiveris: { command: "unused" }, imageMagickCommand: "unused",
      adapter: async <T>() => ({ sourcePageCount: 2, pages: [] }) as T,
    }), /did not preserve/u);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("PDF covers and empty outputs are skipped; musical pages keep their original page numbers", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-skip-test-"));
  const plan = planPdfRasterBudget(Array.from({ length: 5 }, () => ({ widthPoints: 612, heightPoints: 792 })), policy);
  const seen: number[] = [];
  try {
    const result = await runSimplePdfOmr({ inputPath: "source.pdf", outputDir: root, pythonCommand: "unused", adapterPath: "unused", homrSourceDir: "unused",
      renderPlan: plan.pages, ...policy, timeoutMs: 10_000, audiveris: { command: "unused" }, imageMagickCommand: "unused",
      adapter: async <T>(action: string, request: Record<string, unknown>) => {
        if (action === "prepare") return { sourcePageCount: 5, pages: plan.pages.map(page => ({ page: page.pageNumber, renderDpi: page.dpi,
          imagePath: `${page.pageNumber}.png`, width: page.widthPixels, height: page.heightPixels })) } as T;
        assert.deepEqual((request.chunks as Array<{ page: number }>).map(chunk => chunk.page), [2, 5]);
        fs.writeFileSync(String(request.outputPath), "<score-partwise/>");
        return { musicXmlPath: request.outputPath, issues: [] } as T;
      },
      recognize: async input => {
        const page = Number(path.basename(input.outputDir).split("-").at(-1)); seen.push(page);
        if (page === 1) throw new AudiverisRecognitionError("No staves found after rotation attempts", "exit", 1);
        if (page !== 3) fs.writeFileSync(path.join(input.outputDir, "score.musicxml"), page === 4 ? "<score-partwise/>"
          : "<score-partwise><part><measure><note><pitch><step>C</step><octave>4</octave></pitch></note></measure></part></score-partwise>");
        return { stdout: "", stderr: "", appliedRotationDegrees: 0 };
      },
    });
    assert.deepEqual(seen, [1, 2, 3, 4, 5]);
    assert.deepEqual(result.recognizedPages, [2, 5]);
    assert.deepEqual(result.skippedPages, [1, 3, 4].map(page => ({ page, reason: "NO_MUSIC_RECOGNIZED" })));
    assert.equal(result.pages.length, 5);
    assert.equal(result.issues.filter(issue => issue.kind === "skipped-page").length, 3);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("all non-musical PDF pages fail without merging; infrastructure errors are never skipped", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-no-music-test-"));
  const plan = planPdfRasterBudget([{ widthPoints: 612, heightPoints: 792 }], policy);
  const input = { inputPath: "source.pdf", outputDir: root, pythonCommand: "unused", adapterPath: "unused", homrSourceDir: "unused",
    renderPlan: plan.pages, ...policy, timeoutMs: 10_000, audiveris: { command: "unused" }, imageMagickCommand: "unused",
    adapter: async <T>(action: string) => {
      assert.equal(action, "prepare");
      return { sourcePageCount: 1, pages: [{ page: 1, renderDpi: plan.pages[0].dpi, imagePath: "1.png", width: 2550, height: 3300 }] } as T;
    } };
  try {
    await assert.rejects(runSimplePdfOmr({ ...input, recognize: async () => { throw new AudiverisRecognitionError("No staves", "exit", 1); } }),
      error => error instanceof SimplePdfOmrFailure && error.skippedPages[0].page === 1);
    for (const reason of ["cancelled", "timeout", "spawn", "exit"] as const) {
      const error = new AudiverisProcessError("Tool failure", reason);
      await assert.rejects(runSimplePdfOmr({ ...input, recognize: async () => { throw error; } }), candidate => candidate === error);
    }
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
