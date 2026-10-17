import type { PhotoCorner, RecognitionMemoryAssessment, ScoreRecognitionMode, ScoreStructurePreflight } from "@score/shared";
import { inspectPdfRasterSafety } from "./upload-security.js";
import fs from "node:fs/promises";

const positive = (key: string, fallback: number) => {
  const value = Number(process.env[key]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
};
export const recognitionLanesEnabled = () => process.env.RECOGNITION_LANES_ENABLED === "true";
export class RecognitionAdmissionError extends Error {
  constructor(readonly code: string, message: string, readonly statusCode = 422) { super(message); }
}
export function parsePhotoCorners(value: unknown): PhotoCorner[] | undefined {
  if (value === undefined || value === "") return undefined;
  let corners: unknown;
  try { corners = typeof value === "string" ? JSON.parse(value) : value; } catch { corners = null; }
  if (!Array.isArray(corners) || corners.length !== 4 || corners.some(p => !p || typeof p !== "object" ||
    ![p.x, p.y].every(n => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1))) {
    throw new RecognitionAdmissionError("INVALID_PHOTO_CORNERS", "Select all four corners of the score page.", 400);
  }
  const points = corners as PhotoCorner[];
  const cross = points.map((p, i) => { const q=points[(i+1)%4]!, r=points[(i+2)%4]!; return (q.x-p.x)*(r.y-q.y)-(q.y-p.y)*(r.x-q.x); });
  const area=Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%4]!;return sum+p.x*q.y-p.y*q.x;},0))/2;
  if (!cross.every(n => n > .0001) || area<.05) throw new RecognitionAdmissionError("INVALID_PHOTO_CORNERS", "The four corners must surround a visible page without crossing.", 400);
  return points;
}
/** Conservative admission model, in MiB. Disabled by default until full-service capacity qualification. */
export function estimateRecognitionMemory(input: { sizeBytes: number; pageCount: number; maxPagePixels: number; mode?: ScoreRecognitionMode;
  preflight?: ScoreStructurePreflight; supported?: boolean; heavyEnhancement?: boolean }, env = {
    enabled: recognitionLanesEnabled(), normalMb: positive("RECOGNITION_NORMAL_MAX_MB", 1536),
    bigMb: positive("RECOGNITION_BIG_MAX_MB", 2048), capacityVersion: process.env.RECOGNITION_CAPACITY_VERSION || "cx33-conservative-v1",
  }): RecognitionMemoryAssessment {
  const complex = input.mode === "complex";
  const staffCount = Math.max(0, ...(input.preflight?.pages.map(p => p.staffCount) ?? []));
  const uncertain = input.preflight ? !input.preflight.complete || input.preflight.confidence === "low" : true;
  let raw = Math.max(complex ? 1536 : 1024, (complex ? 1536 : 768) + 24 * input.maxPagePixels / 1e6 +
    4 * input.pageCount + 8 * staffCount + 1.5 * input.sizeBytes / 1048576);
  if (uncertain) raw *= 1.5;
  let estimatedMemoryMb = Math.ceil((raw + Math.max(256, raw * .25)) / 256) * 256;
  const reasonCodes = [...(uncertain ? ["INCOMPLETE_INSPECTION"] : []), ...(complex ? ["HEAVY_ENGINE"] : []),
    ...(input.heavyEnhancement ? ["RASTER_ENHANCEMENT"] : []), ...(input.pageCount > 20 ? ["LONG_SCORE"] : [])];
  let lane: RecognitionMemoryAssessment["lane"] = estimatedMemoryMb > env.normalMb || complex || input.heavyEnhancement || input.pageCount > 20 ? "big" : "normal";
  if(lane==="big")estimatedMemoryMb=Math.max(estimatedMemoryMb,Math.ceil((positive("RECOGNITION_BIG_HEAP_MB",768)+512)/256)*256);
  if (input.supported === false || (env.enabled && estimatedMemoryMb > env.bigMb)) { lane = "unsupported"; reasonCodes.push("CAPACITY_CEILING"); }
  return { version: 1, capacityVersion: env.capacityVersion, lane: !env.enabled && input.supported !== false ? "normal" : lane,
    estimatedMemoryMb, reasonCodes, waitEstimateSeconds: lane === "big" ? [60, 600] : [0, 120], sourcePageCount: input.pageCount,
    maxPagePixels: input.maxPagePixels, enabled: env.enabled };
}
export function revalidateRecognitionAssessment(assessment: RecognitionMemoryAssessment | undefined) {
  if (!assessment) {
    if (recognitionLanesEnabled()) throw new RecognitionAdmissionError("RECOGNITION_ASSESSMENT_REQUIRED", "Check this file's processing needs before continuing.", 409);
    return;
  }
  if (assessment.lane === "unsupported" || (recognitionLanesEnabled() && assessment.estimatedMemoryMb > positive("RECOGNITION_BIG_MAX_MB", 2048))) {
    throw new RecognitionAdmissionError("RECOGNITION_UNSUPPORTED", "This file exceeds our current processing capacity. No credits will be charged. Use MusicXML or a smaller file.");
  }
}
export async function assessRecognitionSource(input: { sourcePath: string; detectedKind: string; sizeBytes: number; mode?: ScoreRecognitionMode;
  preflight?: ScoreStructurePreflight; supported?: boolean; photoCorners?: PhotoCorner[] }) {
  const pdf = input.detectedKind === "pdf" ? await inspectPdfRasterSafety(await fs.readFile(input.sourcePath)) : undefined;
  const pageCount = pdf?.pageCount ?? input.preflight?.sourcePageCount ?? 1;
  // Image decoder limits remain enforced by upload security and the worker. The
  // metadata preflight supplies actual decoded dimensions; unknown sources use the ceiling.
  const maxPagePixels = pdf ? Math.max(...pdf.pages.map(p => p.pixelCount)) : Math.max(1, ...(input.preflight?.pages.map(p => (p.sourceWidth ?? p.width ?? 12000)*(p.sourceHeight ?? p.height ?? 1000)) ?? [12_000_000]));
  return estimateRecognitionMemory({ ...input, pageCount, maxPagePixels,
    heavyEnhancement: Boolean(input.photoCorners?.length) || (process.env.RASTER_ENHANCEMENT_ENABLED === "true" && Boolean(input.preflight?.pages.some(p => p.uncertain || (p.staffSpacing != null && p.staffSpacing < 10)))) });
}
