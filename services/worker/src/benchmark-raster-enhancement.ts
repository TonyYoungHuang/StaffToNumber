/** Local offline benchmark. Explicit private fixture manifest and output directory
 * are required; never discovers production files or downloads engines/models.
 *
 * node --import tsx services/worker/src/benchmark-raster-enhancement.ts manifest.json
 *
 * The manifest supplies engine command/args, Python command, outputDir, and sources
 * [{id,weight,sourcePageCount,pages:[{page,inputPath,baselineHasDraft}]}]. Engine
 * isolation/network policy is the caller's responsibility. Fixture and result
 * files belong outside the repository. No customer originals are test fixtures.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runAudiverisWithRotationFallback } from "./audiveris-runner.js";
import { createRasterEnhancementBudget, type RasterEnhancementBudget, type RasterEnhancementSummary, type RasterQuality } from "./raster-enhancement.js";

type Fixture = {
  outputDir: string; pythonCommand: string; engine: { command: string; commandArgsPrefix?: string[]; maxHeapMb?: number };
  sources: Array<{ id: string; weight: number; sourcePageCount: number; pages: Array<{ page: number; inputPath: string; baselineHasDraft: boolean; photoCorners?: Array<{ x: number; y: number }> }> }>;
};
const manifestPath = process.argv[2];
if (!manifestPath) throw new Error("An explicit, local private fixture manifest is required.");
const fixture = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Fixture;
fs.mkdirSync(fixture.outputDir, { recursive: true });
type PageResult = { page: number; baselineHasDraft: boolean; hasDraft: boolean; passesStructuralScreen: boolean;
  quality?: RasterQuality; selectedVariantId?: string; calls?: number; elapsedMs: number; message?: string;
  enhancement?: RasterEnhancementSummary; budget: RasterEnhancementBudget };
type SourceResult = { source: string; weight: number; sourcePageCount: number; baselineHasDraft: boolean; hasDraft: boolean; passesStructuralScreen: boolean; pages: PageResult[] };
const results: SourceResult[] = [];
const began = Date.now();
for (const source of fixture.sources) {
  const budget = createRasterEnhancementBudget(source.sourcePageCount);
  const pages: PageResult[] = [];
  for (const page of source.pages) {
    const outputDir = path.join(fixture.outputDir, source.id, `page-${page.page}`);
    const resultPath = path.join(outputDir, "benchmark-result.json");
    // A completed benchmark page may be resumed without spending new calls.
    if (fs.existsSync(resultPath)) {
      const saved = JSON.parse(fs.readFileSync(resultPath, "utf8"));
      Object.assign(budget, structuredClone(saved.budget)); pages.push(saved); continue;
    }
    fs.mkdirSync(outputDir, { recursive: true });
    const started = Date.now();
    let record: PageResult;
    try {
      const result = await runAudiverisWithRotationFallback({ ...fixture.engine,
        inputPath: page.inputPath, outputDir, timeoutMs: 120_000, imageMagickCommand: "",
        enhancement: { enabled: true, lane: "big", pythonCommand: fixture.pythonCommand,
          pythonScriptPath: fileURLToPath(new URL("../python/raster_enhancement.py", import.meta.url)),
          pageNumber: page.page, budget, photoCorners: page.photoCorners,
        },
      });
      const selected = result.enhancement!.variants.find((variant) => variant.id === result.enhancement!.selectedVariantId)!;
      const quality = selected.quality!;
      record = { page: page.page, baselineHasDraft: page.baselineHasDraft, hasDraft: true,
        // A structural review screen, explicitly not a pitch/rhythm ground truth.
        passesStructuralScreen: quality.hasTimeSignature && quality.invalidDurationRatio <= .1
          && quality.coverage !== null && quality.coverage >= .9 && (quality.abnormalMeasureRatio ?? 1) <= .35
          && (quality.physicalStaffCount ?? Infinity) <= (quality.expectedStaffCount ?? 0) * 1.2,
        selectedVariantId: selected.id, quality, calls: budget.calls, elapsedMs: Date.now() - started,
        enhancement: result.enhancement, budget: structuredClone(budget) };
    } catch (cause) {
      record = { page: page.page, baselineHasDraft: page.baselineHasDraft, hasDraft: false, passesStructuralScreen: false,
        message: cause instanceof Error ? cause.message : String(cause), elapsedMs: Date.now() - started, budget: structuredClone(budget) };
    }
    fs.writeFileSync(resultPath, JSON.stringify(record, null, 2)); pages.push(record);
    process.stdout.write(JSON.stringify({ source: source.id, page: page.page, hasDraft: record.hasDraft, calls: budget.calls }) + "\n");
  }
  results.push({ source: source.id, weight: source.weight, sourcePageCount: source.sourcePageCount,
    baselineHasDraft: pages.some((page) => page.baselineHasDraft), hasDraft: pages.some((page) => page.hasDraft),
    passesStructuralScreen: pages.some((page) => page.passesStructuralScreen), pages });
}
const count = (property: "baselineHasDraft" | "hasDraft" | "passesStructuralScreen") => results.reduce((sum, source) => sum + (source[property] ? source.weight : 0), 0);
const summary = { historicalSamples: results.reduce((sum, source) => sum + source.weight, 0), uniqueSources: results.length,
  pagesTested: results.reduce((sum, source) => sum + source.pages.length, 0), baselineDrafts: count("baselineHasDraft"),
  enhancedDrafts: count("hasDraft"), passesStructuralScreen: count("passesStructuralScreen"),
  verifiedMusicallyCorrectDrafts: null,
  elapsedMs: Date.now() - began, limits: "Max 3 configurations; sample at most 2 pages; at most P+4 calls per source, serial. No HOMR.",
  limitations: "Cached baseline is the earlier offline replay, not production equivalence. Nonempty MusicXML is a draft requiring review, not verified correctness. Multi-page sources are only as complete as the explicit page manifest.",
};
fs.writeFileSync(path.join(fixture.outputDir, "benchmark-report.private.json"), JSON.stringify({ summary, results }, null, 2));
process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
