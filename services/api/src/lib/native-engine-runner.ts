import { spawn } from "node:child_process";
import path from "node:path";

const START_MARKER = "SCORE_ENGINE_STARTED\n";
const MAX_CAPTURED_OUTPUT = 4 * 1024 * 1024;

export function isManagedMusicEngine(command: string, platform: NodeJS.Platform = process.platform) {
  return platform !== "win32" && /^score-(?:audiveris|basic-pitch|musescore|fluidsynth|music21|homr)$/u.test(path.basename(command));
}

/** Admission to the shared engine pool has its own cancellable wait. Only the
 * native execution consumes timeoutMs; ordinary commands begin immediately. */
export function createNativeEngineClock(input: { managed: boolean; timeoutMs: number; onTimeout: () => void }) {
  let waiting = input.managed;
  let buffered = "";
  let timer: NodeJS.Timeout | undefined;
  let finished = false;
  const start = () => { timer = setTimeout(input.onTimeout, Math.max(1, input.timeoutMs)); };
  if (!waiting) start();
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
    const stop = (error: Error) => {
      failure ??= error;
      try {
        if (detached && child.pid) process.kill(-child.pid, "SIGKILL");
        else child.kill("SIGKILL");
      } catch { child.kill("SIGKILL"); }
    };
    const clock = createNativeEngineClock({
      managed,
      timeoutMs: input.timeoutMs,
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
    };
    child.on("error", error => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    });
    child.on("close", code => {
      if (settled) return;
      settled = true;
      cleanup();
      if (failure) reject(failure);
      else if (code !== 0) reject(new Error(`${input.label} exited with code ${code}. ${stderr || stdout}`.trim()));
      else resolve({ stdout, stderr });
    });
  });
}
