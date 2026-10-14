import { spawn } from "node:child_process";
import path from "node:path";

const START_MARKER = "SCORE_ENGINE_STARTED\n";
const MAX_CAPTURED_OUTPUT = 4 * 1024 * 1024;

export class NativeEngineQueueError extends Error {
  readonly code = "ENGINE_RESOURCE_BUSY";
  readonly retryable = true;
  constructor() {
    super("[ENGINE_RESOURCE_BUSY] The recognition and export queue did not become available in time. This attempt has ended. Your original score is retained; retry in a few minutes.");
    this.name = "NativeEngineQueueError";
  }
}

export function isManagedMusicEngine(command: string, platform: NodeJS.Platform = process.platform) {
  return platform !== "win32" && /^score-(?:audiveris|basic-pitch|musescore|fluidsynth|music21|homr)$/u.test(path.basename(command));
}

/** Admission to the shared engine pool has its own cancellable wait. Only the
 * native execution consumes timeoutMs; ordinary commands begin immediately. */
export function createNativeEngineClock(input: {
  managed: boolean; timeoutMs: number; onTimeout: () => void;
  queueWaitMs?: number; onQueueTimeout?: (error: NativeEngineQueueError) => void;
}) {
  let waiting = input.managed;
  let buffered = "";
  let timer: NodeJS.Timeout | undefined;
  let finished = false;
  const start = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(input.onTimeout, Math.max(1, input.timeoutMs));
  };
  if (!waiting) start();
  else {
    const configured = Number(process.env.MUSIC_ENGINE_QUEUE_WAIT_MS);
    const queueWaitMs = input.queueWaitMs ?? (Number.isSafeInteger(configured) && configured > 0 ? configured : 120_000);
    // Let the wrapper report its memory-specific admission error first, then
    // terminate a wrapper that stalls or never announces admission.
    timer = setTimeout(() => {
      if (input.onQueueTimeout) input.onQueueTimeout(new NativeEngineQueueError());
      else input.onTimeout();
    }, Math.max(1, queueWaitMs) + 1_000);
  }
  return {
    stderr(chunk: unknown) {
      const value = String(chunk);
      if (finished || !waiting) return value;
      buffered += value;
      const marker = buffered.indexOf(START_MARKER);
      if (marker >= 0) {
        waiting = false;
        start();
        const result = buffered.slice(0, marker) + buffered.slice(marker + START_MARKER.length);
        buffered = "";
        return result;
      }
      // Keep only a possible split marker suffix; emit earlier diagnostics.
      const retained = Math.min(buffered.length, START_MARKER.length - 1);
      const result = buffered.slice(0, buffered.length - retained);
      buffered = buffered.slice(-retained);
      return result;
    },
    finish() {
      finished = true;
      if (timer) clearTimeout(timer);
      const remainder = buffered;
      buffered = "";
      return remainder;
    },
  };
}

function appendOutput(previous: string, value: string) {
  const result = previous + value;
  return result.length > MAX_CAPTURED_OUTPUT ? result.slice(-MAX_CAPTURED_OUTPUT) : result;
}

export function runNativeEngine(input: {
  command: string;
  args: string[];
  label: string;
  timeoutMs: number;
  queueWaitMs?: number;
  shell?: boolean;
  signal?: AbortSignal;
}): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    if (input.signal?.aborted) { reject(new Error(`${input.label} was cancelled.`)); return; }
    const managed = isManagedMusicEngine(input.command);
    const detached = process.platform !== "win32";
    const child = spawn(input.command, input.args, {
      shell: managed ? false : (input.shell ?? false),
      windowsHide: true,
      detached,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...(managed ? { SCORE_ENGINE_START_NOTIFY: "1" } : {}) },
    });
    let stdout = "";
    let stderr = "";
    let failure: Error | undefined;
    let settled = false;
    let terminationFallback: NodeJS.Timeout | undefined;
    const stop = (error: Error) => {
      if (settled || failure) return;
      failure = error;
      stderr = appendOutput(stderr, clock.finish());
      try {
        if (detached && child.pid) process.kill(-child.pid, "SIGKILL");
        else child.kill("SIGKILL");
      } catch {
        try { child.kill("SIGKILL"); } catch { /* A process can already be gone. */ }
      }
      terminationFallback = setTimeout(() => finish(error), 2_000);
    };
    const clock = createNativeEngineClock({
      managed,
      timeoutMs: input.timeoutMs,
      queueWaitMs: input.queueWaitMs,
      onQueueTimeout: error => stop(error),
      onTimeout: () => stop(new Error(`${input.label} timed out after ${input.timeoutMs} ms.`)),
    });
    const cancel = () => stop(new Error(`${input.label} was cancelled.`));
    input.signal?.addEventListener("abort", cancel, { once: true });
    // Cover cancellation between the initial check and event registration.
    if (input.signal?.aborted) cancel();
    child.stdout?.on("data", chunk => { stdout = appendOutput(stdout, String(chunk)); });
    child.stderr?.on("data", chunk => { stderr = appendOutput(stderr, clock.stderr(chunk)); });
    const cleanup = () => {
      stderr = appendOutput(stderr, clock.finish());
      input.signal?.removeEventListener("abort", cancel);
      if (terminationFallback) clearTimeout(terminationFallback);
    };
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve({ stdout, stderr });
    };
    child.on("error", error => {
      finish(failure ?? error);
    });
    child.on("close", code => {
      if (failure) finish(failure);
      else if (code !== 0) finish(new Error(`${input.label} exited with code ${code}. ${stderr || stdout}`.trim()));
      else finish();
    });
  });
}
