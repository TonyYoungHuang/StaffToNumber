import path from "node:path";

const START_MARKER = "SCORE_ENGINE_STARTED\n";

/** Wrapped engines announce admission before exec. Queueing is cancellable by
 * the runner's existing process-group cancellation and has no engine deadline. */
export function createEngineExecutionClock(input: {
  command: string; timeoutMs: number; onTimeout: () => void; onQueueWait?: (elapsedMs: number) => void;
}) {
  const wrapped = process.platform !== "win32" && /^score-(?:audiveris|basic-pitch|musescore|fluidsynth|music21|homr)$/u.test(path.basename(input.command));
  const queuedAt = Date.now();
  let timer: NodeJS.Timeout | undefined;
  let waiting = wrapped;
  let stopped = false;
  let buffered = "";
  const start = () => {
    if (stopped) return;
    timer = setTimeout(input.onTimeout, Math.max(1, input.timeoutMs));
  };
  if (!wrapped) start();
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
