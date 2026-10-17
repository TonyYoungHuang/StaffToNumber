import type { RecognitionLane } from "./index.js";

/** Engineering admission budget, not a measurement of an engine's RSS peak.
 * The CX33 host has 8 GiB, but one exclusive big job may reserve only 2048 MiB
 * inside the worker's 2560 MiB cgroup; the remaining 512 MiB belongs to the
 * worker/runtime and is never sold as recognition capacity. Within each job:
 * 768 MiB JVM heap + 128 MiB JVM/native overhead + 256 MiB safety headroom,
 * 24 MiB per largest rendered megapixel for decoder/preprocessing buffers,
 * 32 MiB per page for retained book/aggregate output, and 1.5 source-file copies.
 * Pages and up to three pixel-bounded variants run sequentially. Confidence,
 * staff detection, mode and manual corners do not allocate another engine.
 * Round upward to 256 MiB reservations: <=1536 normal, <=2048 exclusive big.
 * Example: 11 Letter pages at 300 dpi (8.415 MP, 5.62 MiB source) use 1792 MiB;
 * 12 A4 pages also fit 1792 MiB; a 12 MP, <=20 MiB single photo fits 1536 MiB.
 * There is no fixed page-count ceiling: render dimensions and source bytes
 * determine how many pages fit. PDF pixel/decompression safeguards still apply.
 */
export const RECOGNITION_MEMORY_BUDGET = {
  heapMb: 768,
  nativeMb: 128,
  safetyMb: 256,
  rasterMbPerMegapixel: 24,
  retainedMbPerPage: 32,
  sourceCopies: 1.5,
  reservationStepMb: 256,
  normalMaxMb: 1536,
  bigMaxMb: 2048,
} as const;

export function estimateRecognitionMemoryMb(input: {
  sizeBytes: number; pageCount: number; maxPagePixels: number; heapMb?: number;
}): number {
  const policy = RECOGNITION_MEMORY_BUDGET;
  if (!Number.isSafeInteger(input.pageCount) || input.pageCount < 1
    || !Number.isSafeInteger(input.maxPagePixels) || input.maxPagePixels < 1
    || !Number.isSafeInteger(input.sizeBytes) || input.sizeBytes < 0) return Number.MAX_SAFE_INTEGER;
  const heapMb = input.heapMb ?? policy.heapMb;
  if (!Number.isSafeInteger(heapMb) || heapMb < 256) return Number.MAX_SAFE_INTEGER;
  const raw = heapMb + policy.nativeMb + policy.safetyMb
    + policy.rasterMbPerMegapixel * input.maxPagePixels / 1_000_000
    + policy.retainedMbPerPage * input.pageCount
    + policy.sourceCopies * input.sizeBytes / 1_048_576;
  return Math.ceil(raw / policy.reservationStepMb) * policy.reservationStepMb;
}

export function recognitionMemoryLane(estimatedMemoryMb: number,
  normalMaxMb = RECOGNITION_MEMORY_BUDGET.normalMaxMb as number,
  bigMaxMb = RECOGNITION_MEMORY_BUDGET.bigMaxMb as number): RecognitionLane {
  if (!Number.isSafeInteger(estimatedMemoryMb) || estimatedMemoryMb <= 0 || estimatedMemoryMb > bigMaxMb) return "unsupported";
  return estimatedMemoryMb > normalMaxMb ? "big" : "normal";
}
