import path from "node:path";
import { EngineResourceError } from "./engine-resource-error.js";

const START_MARKER = "SCORE_ENGINE_STARTED\n";

/** Queue admission and engine execution have separate bounded clocks. */
export function createEngineExecutionClock(input: {
  command: string; timeoutMs: number; onTimeout: () => void; onQueueWait?: (elapsedMs: number) => void;
  queueWaitMs?: number; onQueueTimeout?: (error: EngineResourceError) => void;
}) {
  const wrapped = process.platform !== "win32" && /^score-(?:audiveris|basic-pitch|musescore|fluidsynth|music21|homr)$/u.test(path.basename(input.command));
  const queuedAt = Date.now();
  let timer: NodeJS.Timeout | undefined;
  let waiting = wrapped;
  let stopped = false;
  let buffered = "";
  const start = () => {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(input.onTimeout, Math.max(1, input.timeoutMs));
  };
  if (!wrapped) start();
  else {
    const configured = Number(process.env.MUSIC_ENGINE_QUEUE_WAIT_MS);
    const queueWaitMs = input.queueWaitMs ?? (Number.isSafeInteger(configured) && configured > 0 ? configured : 120_000);
    // The wrapper emits the detailed memory reason at its own deadline. Allow
    // a small delivery grace, then terminate wrappers that never report back.
    timer = setTimeout(() => {
      if (input.onQueueTimeout) input.onQueueTimeout(new EngineResourceError("ENGINE_RESOURCE_BUSY"));
      else input.onTimeout();
    }, Math.max(1, queueWaitMs) + 1_000);
  }
  return {
    environment: wrapped ? { SCORE_ENGINE_START_NOTIFY: "1" } : {},
    stderr(chunk: unknown) {
      const value = String(chunk);
      if (!waiting) return value;
      buffered += value;
      const marker = buffered.indexOf(START_MARKER);
      if (marker >= 0) {
        waiting = false;
        input.onQueueWait?.(Date.now() - queuedAt);
        start();
        const result = buffered.slice(0, marker) + buffered.slice(marker + START_MARKER.length);
        buffered = "";
        return result;
      }
      // Preserve diagnostics and retain just a possible split marker suffix.
      const retained = Math.min(buffered.length, START_MARKER.length - 1);
      const result = buffered.slice(0, buffered.length - retained);
      buffered = buffered.slice(-retained);
      return result;
    },
    finish() {
      stopped = true;
      if (timer) clearTimeout(timer);
      const remainder = buffered;
      buffered = "";
      return remainder;
    },
    stop() { stopped = true; if (timer) clearTimeout(timer); },
  };
}
