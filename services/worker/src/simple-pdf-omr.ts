import fs from "node:fs";
import path from "node:path";
import type { PdfRasterPageEstimate } from "@score/shared";
import { AudiverisProcessError, AudiverisRecognitionError, runAudiverisWithRotationFallback, type AudiverisRunResult } from "./audiveris-runner.js";
import { findAudiverisMusicXmlOutput, readAudiverisMusicXml } from "./audiveris-output.js";
import { runComplexAdapter, type ComplexOmrInput } from "./complex-omr.js";

type AdapterInput = Pick<ComplexOmrInput, "pythonCommand" | "adapterPath" | "homrSourceDir" | "outputDir" | "isCancelled">;
type Page = { page: number; imagePath: string; width: number; height: number; renderDpi: number };
type SkippedPage = { page: number; reason: "NO_MUSIC_RECOGNIZED" };
export type SimplePdfResult = AudiverisRunResult & {
  musicXml: string; musicXmlPath: string; pages: Page[]; issues: Array<{ kind: string; message: string }>;
  recognizedPages: number[]; skippedPages: SkippedPage[];
};

export class SimplePdfOmrFailure extends Error {
  constructor(readonly skippedPages: SkippedPage[]) {
    super("No music could be recognized on any PDF page. The original PDF is retained; check the score and retry recognition.");
    this.name = "SimplePdfOmrFailure";
  }
}

/** A PDF never reaches Audiveris's unbounded internal renderer. Render and
 * recognize sequential pages under one deadline, then assemble recognized pages.
 * Content failures (including text-only covers) are recorded for review. Process
 * failures such as timeout, cancellation and missing tools still fail the job.
 */
export async function runSimplePdfOmr(input: AdapterInput & {
  inputPath: string; renderPlan: PdfRasterPageEstimate[]; dpi: number;
  maxPagePixels: number; maxTotalPixels: number; timeoutMs: number;
  audiveris: ComplexOmrInput["audiveris"]; imageMagickCommand: string;
  adapter?: <T>(action: string, request: Record<string, unknown>, timeoutMs: number) => Promise<T>;
  recognize?: typeof runAudiverisWithRotationFallback;
  onProgress?: (update: { stage: "prepare-pages" | "recognize" | "restore-image" | "verify"; page?: number; totalPages: number }) => void;
}): Promise<SimplePdfResult> {
  const deadline = Date.now() + input.timeoutMs;
  const remaining = () => {
    if (input.isCancelled?.()) throw new AudiverisProcessError("PDF recognition was cancelled.", "cancelled");
    const budget = deadline - Date.now();
    if (budget <= 0) throw new AudiverisProcessError("PDF recognition exceeded the total job budget.", "timeout");
    return budget;
  };
  const call = input.adapter ?? (<T>(action: string, request: Record<string, unknown>, timeoutMs: number) => runComplexAdapter<T>(input, action, request, timeoutMs));
  input.onProgress?.({ stage: "prepare-pages", totalPages: input.renderPlan.length });
  const prepared = await call<{ pages: Page[]; sourcePageCount: number }>("prepare", {
    inputPath: input.inputPath, outputDir: path.join(input.outputDir, "pages"),
    renderPlan: input.renderPlan, dpi: input.dpi, maxPagePixels: input.maxPagePixels, maxTotalPixels: input.maxTotalPixels,
  }, remaining());
  if (prepared.sourcePageCount !== input.renderPlan.length || prepared.pages.length !== input.renderPlan.length ||
      prepared.pages.some((page, index) => page.page !== index + 1 || page.renderDpi !== input.renderPlan[index].dpi)) {
    throw new Error("PDF renderer did not preserve the admitted page plan.");
  }
  const chunks = [];
  const skippedPages: SkippedPage[] = [];
  const recognize = input.recognize ?? runAudiverisWithRotationFallback;
  for (const page of prepared.pages) {
    input.onProgress?.({ stage: "recognize", page: page.page, totalPages: prepared.sourcePageCount });
    const outputDir = path.join(input.outputDir, `page-${page.page}`);
    fs.mkdirSync(outputDir, { recursive: true });
    let result: AudiverisRunResult;
    try {
      result = await recognize({ ...input.audiveris, inputPath: page.imagePath, outputDir,
        imageMagickCommand: input.imageMagickCommand, timeoutMs: remaining(), isCancelled: input.isCancelled,
        onProgress: stage => input.onProgress?.({ stage, page: page.page, totalPages: prepared.sourcePageCount }) });
    } catch (error) {
      if (!(error instanceof AudiverisRecognitionError)) throw error;
      skippedPages.push({ page: page.page, reason: "NO_MUSIC_RECOGNIZED" });
      continue;
    }
    const selected = findAudiverisMusicXmlOutput(result.recognitionOutputDir ?? outputDir,
      { rotationDegrees: result.recognitionOutputDir ? 0 : result.appliedRotationDegrees });
    const musicXml = selected ? readAudiverisMusicXml(selected) : "";
    if (!/<note\b/u.test(musicXml)) {
      skippedPages.push({ page: page.page, reason: "NO_MUSIC_RECOGNIZED" });
      continue;
    }
    const musicXmlPath = path.join(outputDir, "candidate.musicxml");
    fs.writeFileSync(musicXmlPath, musicXml, "utf8");
    chunks.push({ page: page.page, systemOrder: 0, scope: "page", musicXmlPath });
  }
  remaining();
  if (!chunks.length) throw new SimplePdfOmrFailure(skippedPages);
  input.onProgress?.({ stage: "verify", totalPages: prepared.sourcePageCount });
  const merged = await call<{ musicXmlPath: string; issues: SimplePdfResult["issues"] }>("merge", {
    chunks, outputPath: path.join(input.outputDir, "candidate.musicxml"),
  }, remaining());
  return { musicXml: fs.readFileSync(merged.musicXmlPath, "utf8"), musicXmlPath: merged.musicXmlPath,
    pages: prepared.pages, recognizedPages: chunks.map(chunk => chunk.page), skippedPages,
    issues: [...merged.issues, ...skippedPages.map(({ page }) => ({ kind: "skipped-page",
      message: `Source page ${page} was skipped because no music could be recognized. Review the original page; it may be a cover or require another recognition attempt.` }))],
    stdout: "", stderr: "", appliedRotationDegrees: 0 };
}
