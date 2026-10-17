import fs from "node:fs";
import path from "node:path";
import type { PdfRasterPageEstimate } from "@score/shared";
import { AudiverisProcessError, AudiverisRecognitionError, runAudiverisWithRotationFallback, type AudiverisRunResult } from "./audiveris-runner.js";
import { enumerateAudiverisMusicXmlOutputs, enumerateAudiverisProjectOutputs, readAudiverisMusicXmlCandidates, musicXmlMovementTitle, normalizeMovementTitle, type OmrRecognitionCandidate } from "./audiveris-output.js";
import { runComplexAdapter, type ComplexOmrInput } from "./complex-omr.js";
import { engineResourceError } from "./engine-resource-error.js";

type AdapterInput = Pick<ComplexOmrInput, "pythonCommand" | "adapterPath" | "homrSourceDir" | "outputDir" | "isCancelled" | "onQueueWait">;
type Page = { page: number; imagePath: string; width: number; height: number; renderDpi: number };
type SkippedPage = { page: number; reason: "NO_MUSIC_RECOGNIZED" | "RESOURCE_BUDGET_EXHAUSTED" };
export type SimplePdfResult = AudiverisRunResult & {
  musicXml: string; musicXmlPath: string; pages: Page[]; issues: Array<{ kind: string; message: string }>;
  recognizedPages: number[]; skippedPages: SkippedPage[];
  candidates: OmrRecognitionCandidate[];
  projectPaths: string[];
  rawOutputPaths: string[];
  rawOutputWarnings: Array<{ outputPath: string; message: string }>;
};

export class SimplePdfOmrFailure extends Error {
  constructor(readonly skippedPages: SkippedPage[]) {
    super("No readable staff notation was found. This file may contain covers, very blurred pages or notation this recognizer cannot read. The original is retained and no recognition credits are charged.");
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
  let deadline = Date.now() + input.timeoutMs;
  const onQueueWait = (elapsedMs: number) => { deadline += elapsedMs; input.onQueueWait?.(elapsedMs); };
  const remaining = () => {
    if (input.isCancelled?.()) throw new AudiverisProcessError("PDF recognition was cancelled.", "cancelled");
    const budget = deadline - Date.now();
    if (budget <= 0) throw new AudiverisProcessError("PDF recognition exceeded the total job budget.", "timeout");
    return budget;
  };
  const call = input.adapter ?? (<T>(action: string, request: Record<string, unknown>, timeoutMs: number) => runComplexAdapter<T>({ ...input, onQueueWait }, action, request, timeoutMs));
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
  const candidates: OmrRecognitionCandidate[] = [];
  const projectPaths: string[] = [];
  const rawOutputPaths: string[] = [];
  const rawOutputWarnings: SimplePdfResult["rawOutputWarnings"] = [];
  const outputIssues: SimplePdfResult["issues"] = [];
  const skippedPages: SkippedPage[] = [];
  const recognize = input.recognize ?? runAudiverisWithRotationFallback;
  for (const page of prepared.pages) {
    input.onProgress?.({ stage: "recognize", page: page.page, totalPages: prepared.sourcePageCount });
    const outputDir = path.join(input.outputDir, `page-${page.page}`);
    fs.mkdirSync(outputDir, { recursive: true });
    let result: AudiverisRunResult;
    try {
      result = await recognize({ ...input.audiveris,
        ...(input.audiveris.enhancement ? { enhancement: { ...input.audiveris.enhancement, pageNumber: page.page } } : {}), inputPath: page.imagePath, outputDir,
        imageMagickCommand: input.imageMagickCommand, timeoutMs: remaining(), isCancelled: input.isCancelled, onQueueWait,
        onProgress: stage => input.onProgress?.({ stage, page: page.page, totalPages: prepared.sourcePageCount }) });
    } catch (error) {
      if (candidates.length && (engineResourceError(error) || (error instanceof AudiverisProcessError && error.reason === "timeout"))) {
        for (const remainingPage of prepared.pages.filter(candidate => candidate.page >= page.page)) skippedPages.push({ page: remainingPage.page, reason: "RESOURCE_BUDGET_EXHAUSTED" });
        outputIssues.push({ kind: "partial-delivery", message: "Recognition reached its processing budget. Earlier readable pages are retained and only delivered pages are charged." });
        break;
      }
      if (!(error instanceof AudiverisRecognitionError)) throw error;
      skippedPages.push({ page: page.page, reason: "NO_MUSIC_RECOGNIZED" });
      continue;
    }
    const selectedDir = result.recognitionOutputDir ?? outputDir;
    const directories = [...new Set([selectedDir, ...(result.enhancement?.variants.filter(variant => variant.status === "succeeded").map(variant => variant.outputDir) ?? [])])];
    const pageCandidates: OmrRecognitionCandidate[] = [];
    for (const directory of directories) {
      projectPaths.push(...enumerateAudiverisProjectOutputs(directory, { rotationDegrees: directory === outputDir ? result.appliedRotationDegrees : 0 }));
      const enhancement = result.enhancement?.variants.find(variant => variant.outputDir === directory);
      const geometry = enhancement ? (({ imagePath: _path, ...value }) => value)(enhancement.variant) : undefined;
      for (const exported of enumerateAudiverisMusicXmlOutputs(directory, { rotationDegrees: directory === outputDir ? result.appliedRotationDegrees : 0 })) {
        rawOutputPaths.push(exported);
        try {
          for (const score of readAudiverisMusicXmlCandidates(exported)) {
            if (!/<note\b/u.test(score.musicXml)) continue;
            const id = `page-${page.page}-result-${pageCandidates.length + 1}`;
            const musicXmlPath = path.join(outputDir, `${id}.musicxml`);
            fs.writeFileSync(musicXmlPath, score.musicXml, "utf8");
            const originalTitle = musicXmlMovementTitle(score.musicXml);
            pageCandidates.push({ id, musicXmlPath, musicXml: score.musicXml, sourcePages: [page.page], originalTitle,
              normalizedTitle: originalTitle ? normalizeMovementTitle(originalTitle) : undefined, relationship: "original",
              ...(enhancement ? { enhancement: { variantId: enhancement.id, geometry, quality: enhancement.quality } } : {}) });
          }
        } catch (error) {
          const message = `One result on page ${page.page} could not be read; other results are retained.`;
          rawOutputWarnings.push({ outputPath: exported, message });
          outputIssues.push({ kind: "unreadable-result", message });
        }
      }
    }
    if (!pageCandidates.length) {
      skippedPages.push({ page: page.page, reason: "NO_MUSIC_RECOGNIZED" });
      continue;
    }
    candidates.push(...pageCandidates);
    // Same-page alternatives are never concatenated. First successful variant
    // of each distinct piece participates in automatic assembly.
    const titles = new Set<string>();
    for (const candidate of pageCandidates) {
      const key = candidate.normalizedTitle ?? "untitled";
      if (titles.has(key)) continue;
      titles.add(key);
      chunks.push({ page: page.page, systemOrder: 0, scope: "page", musicXmlPath: candidate.musicXmlPath });
    }
  }
  if (!chunks.length) throw new SimplePdfOmrFailure(skippedPages);
  input.onProgress?.({ stage: "verify", totalPages: prepared.sourcePageCount });
  let merged: { musicXmlPath: string; issues: SimplePdfResult["issues"]; alternatives?: Array<{ musicXmlPath: string; sourcePages: number[]; memberPaths: string[] }> };
  try {
    merged = await call<typeof merged>("merge", { chunks, outputPath: path.join(input.outputDir, "candidate.musicxml") }, remaining());
    for (const [index, assembled] of (merged.alternatives ?? [{ ...merged, sourcePages: [...new Set(chunks.map(chunk => chunk.page))], memberPaths: chunks.map(chunk => chunk.musicXmlPath) }]).entries()) {
      const musicXml = fs.readFileSync(assembled.musicXmlPath, "utf8");
      const originalTitle = musicXmlMovementTitle(musicXml);
      candidates.push({ id: `assembled-${index + 1}`, musicXml, musicXmlPath: assembled.musicXmlPath, sourcePages: assembled.sourcePages,
        originalTitle, normalizedTitle: originalTitle ? normalizeMovementTitle(originalTitle) : undefined, relationship: "assembled",
        memberIds: candidates.filter(candidate => assembled.memberPaths.includes(candidate.musicXmlPath)).map(candidate => candidate.id) });
    }
  } catch (error) {
    if (error instanceof AudiverisProcessError && error.reason === "cancelled") throw error;
    merged = { musicXmlPath: candidates[0].musicXmlPath, issues: [{ kind: "assembly-unavailable", message: "Automatic assembly could not finish. All readable page results are available separately in this project." }] };
  }
  return { musicXml: fs.readFileSync(merged.musicXmlPath, "utf8"), musicXmlPath: merged.musicXmlPath,
    pages: prepared.pages, recognizedPages: [...new Set(chunks.map(chunk => chunk.page))], skippedPages, candidates, projectPaths,
    rawOutputPaths: [...new Set(rawOutputPaths)], rawOutputWarnings,
    issues: [...outputIssues, ...merged.issues, ...skippedPages.map(({ page }) => ({ kind: "skipped-page",
      message: `Source page ${page} has no readable music and is excluded from the delivered page count. It may be a cover, artwork or too blurred to read.` }))],
    stdout: "", stderr: "", appliedRotationDegrees: 0 };
}
