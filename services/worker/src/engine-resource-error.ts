export type EngineResourceCode = "ENGINE_MEMORY_PRESSURE" | "ENGINE_RESOURCE_BUSY" | "ENGINE_RESOURCE_UNAVAILABLE";

const messages: Record<EngineResourceCode, string> = {
  ENGINE_MEMORY_PRESSURE: "The server could not safely complete this score within its memory capacity. Your original is retained and unsuccessful processing credits are released.",
  ENGINE_RESOURCE_BUSY: "The processing queue could not accept this operation in time. Your original is retained and unsuccessful processing credits are released.",
  ENGINE_RESOURCE_UNAVAILABLE: "The server could not verify safe processing resources. Your original is retained and unsuccessful processing credits are released.",
};

export class EngineResourceError extends Error {
  readonly retryable = true;
  constructor(readonly code: EngineResourceCode) {
    super(`[${code}] ${messages[code]}`);
    this.name = "EngineResourceError";
  }
}

/** Keep launch/JVM/Python/renderer failures in one category. Do not treat every
 * signal or nonzero exit as OOM: cancellation and content failures stay distinct. */
export function engineResourceError(error: unknown): EngineResourceError | undefined {
  if (error instanceof EngineResourceError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (/ENGINE_MEMORY_PRESSURE|\bENOMEM\b|\bOutOfMemoryError\b|\bout[ -]of[ -]memory\b|cannot allocate memory|java heap space|\bMemoryError\b|std::bad_alloc/iu.test(message)) {
    return new EngineResourceError("ENGINE_MEMORY_PRESSURE");
  }
  if (/ENGINE_RESOURCE_BUSY/iu.test(message)) return new EngineResourceError("ENGINE_RESOURCE_BUSY");
  if (/ENGINE_RESOURCE_UNAVAILABLE/iu.test(message)) return new EngineResourceError("ENGINE_RESOURCE_UNAVAILABLE");
  return undefined;
}

export function workerFailureMessage(error: unknown) {
  return engineResourceError(error)?.message ?? (error instanceof Error ? error.message : String(error));
}
