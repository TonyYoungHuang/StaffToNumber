import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { planPdfRasterBudget } from "@score/shared";
import { runSimplePdfOmr } from "./simple-pdf-omr.js";

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
        fs.writeFileSync(path.join(recovered, "score.musicxml"), "<score-partwise/>");
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
