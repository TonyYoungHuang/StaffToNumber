import type { PhotoCorner, RecognitionMemoryAssessment, ScoreRecognitionMode, ScoreStructurePreflight } from "@score/shared";
import { estimateRecognitionMemoryMb, recognitionMemoryLane, RECOGNITION_MEMORY_BUDGET } from "@score/shared";
import { inspectPdfRasterSafety } from "./upload-security.js";
import fs from "node:fs/promises";
import { recognitionImageMetadata } from "./recognition-image-metadata.js";

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
/** Memory-only admission shared with worker reservation validation. */
export function estimateRecognitionMemory(input: { sizeBytes: number; pageCount: number; maxPagePixels: number; mode?: ScoreRecognitionMode;
  preflight?: ScoreStructurePreflight; supported?: boolean; heavyEnhancement?: boolean }, env = {
    enabled: recognitionLanesEnabled(), normalMb: positive("RECOGNITION_NORMAL_MAX_MB", RECOGNITION_MEMORY_BUDGET.normalMaxMb),
    bigMb: positive("RECOGNITION_BIG_MAX_MB", RECOGNITION_MEMORY_BUDGET.bigMaxMb), capacityVersion: process.env.RECOGNITION_CAPACITY_VERSION || "cx33-raster-v2",
  }): RecognitionMemoryAssessment {
  // The shipped complex path reuses Audiveris sequentially; HOMR is offline
  // evaluation only. Its confidence and mode are quality diagnostics, not RAM.
  const normalHeapMb = positive("AUDIVERIS_MAX_HEAP_MB", RECOGNITION_MEMORY_BUDGET.heapMb);
  const bigHeapMb = Math.max(256, Math.min(positive("RECOGNITION_BIG_HEAP_MB", normalHeapMb), env.bigMb - 512));
  const estimatedMemoryMb = estimateRecognitionMemoryMb({ ...input, heapMb: Math.max(normalHeapMb, bigHeapMb) });
  let lane = recognitionMemoryLane(estimatedMemoryMb, env.normalMb, env.bigMb);
  const reasonCodes = lane === "big" ? ["MEMORY_NORMAL_CEILING"] : [];
  if (input.supported === false || lane === "unsupported") { lane = "unsupported"; reasonCodes.push("CAPACITY_CEILING"); }
  // Disabling queue separation preserves the legacy normal queue, never a
  // bypass of the machine's absolute capacity or source-decoder safeguards.
  const acceptedLane = !env.enabled && lane === "big" ? "normal" : lane;
  return { version: 1, capacityVersion: env.capacityVersion, lane: acceptedLane,
    estimatedMemoryMb, reasonCodes, waitEstimateSeconds: acceptedLane === "big" ? [60, 600] : acceptedLane === "unsupported" ? [0, 0] : [0, 120], sourcePageCount: input.pageCount,
    maxPagePixels: input.maxPagePixels, enabled: env.enabled };
}
export function revalidateRecognitionAssessment(assessment: RecognitionMemoryAssessment | undefined) {
  if (!assessment) {
    if (recognitionLanesEnabled()) throw new RecognitionAdmissionError("RECOGNITION_ASSESSMENT_REQUIRED", "Check this file's processing needs before continuing.", 409);
    return;
  }
  const lane = recognitionMemoryLane(assessment.estimatedMemoryMb,
    positive("RECOGNITION_NORMAL_MAX_MB", RECOGNITION_MEMORY_BUDGET.normalMaxMb), positive("RECOGNITION_BIG_MAX_MB", RECOGNITION_MEMORY_BUDGET.bigMaxMb));
  if (assessment.lane === "unsupported" || lane === "unsupported" || (recognitionLanesEnabled() && lane !== assessment.lane)) {
    throw new RecognitionAdmissionError("RECOGNITION_UNSUPPORTED", "This file exceeds our current processing capacity. No credits will be charged. Use MusicXML or a smaller file.");
  }
}
export async function assessRecognitionSource(input: { sourcePath: string; detectedKind: string; sizeBytes: number; mode?: ScoreRecognitionMode;
  preflight?: ScoreStructurePreflight; supported?: boolean; photoCorners?: PhotoCorner[] }) {
  const bytes = await fs.readFile(input.sourcePath);
  const pdf = input.detectedKind === "pdf" ? await inspectPdfRasterSafety(bytes) : undefined;
  const image = pdf ? undefined : recognitionImageMetadata(bytes, input.detectedKind);
  // Preflight and final/direct admission read the same original header. Quality
  // thumbnails and manual rectification must not change its source decode budget.
  const pageCount = pdf?.pageCount ?? image?.pageCount ?? 1;
  // A small image may be enlarged by a quality alternative up to 12 MP. Reserve
  // for that processing canvas as well as the original source decode. PDF page
  // alternatives use their accepted render-plan ceiling in the worker.
  const maxPagePixels = pdf ? Math.max(...pdf.pages.map(p => p.pixelCount)) : image ? Math.max(12_000_000, image.maxPagePixels) : Number.MAX_SAFE_INTEGER;
  return estimateRecognitionMemory({ ...input, pageCount, maxPagePixels,
    supported: input.supported !== false && (Boolean(pdf) || Boolean(image && image.maxPagePixels <= 32_000_000)) });
}
