import { spawn } from "node:child_process";
import { createEngineExecutionClock } from "./engine-execution-clock.js";
import { engineResourceError } from "./engine-resource-error.js";

export const PROCESS_OUTPUT_LIMIT_BYTES = 4 * 1024 * 1024;

/** Capture is bounded; timeout/cancellation reap the process tree and wait for
 * its pipes to close, including engine helpers such as ffmpeg. */
export function runBoundedProcess(input: {
  command: string; args: string[]; label: string; timeoutMs: number;
  isCancelled?: () => boolean; cancelledError?: () => Error; outputLimitBytes?: number;
}) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    if (!input.command) { reject(new Error(`${input.label} command is not configured for the worker.`)); return; }
    const cancellation = () => input.cancelledError?.() ?? new Error(`${input.label} was cancelled.`);
    if (input.isCancelled?.()) { reject(cancellation()); return; }
    const clock = createEngineExecutionClock({ command: input.command, timeoutMs: input.timeoutMs,
      onQueueTimeout: error => terminate(error),
      onTimeout: () => terminate(new Error(`${input.label} timed out after ${input.timeoutMs} ms.`)) });
    const child = spawn(input.command, input.args, { shell: false, detached: process.platform !== "win32",
      env: { ...process.env, ...clock.environment }, windowsHide: true });
    const limit = input.outputLimitBytes ?? PROCESS_OUTPUT_LIMIT_BYTES;
    let stdout = "", stderr = "", outputBytes = 0;
    let terminationError: Error | undefined;
    let settled = false;
    const terminate = (error: Error) => {
      if (terminationError || settled) return;
      terminationError = error;
      clock.stop();
      clearInterval(cancelPoll);
      if (process.platform === "win32" && child.pid) {
        const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
        killer.once("error", () => child.kill("SIGKILL"));
        killer.once("exit", code => { if (code !== 0) child.kill("SIGKILL"); });
      } else {
        try { if (child.pid) process.kill(-child.pid, "SIGKILL"); else child.kill("SIGKILL"); }
        catch { /* Already exited. */ }
      }
    };
    const cancelPoll = setInterval(() => { if (input.isCancelled?.()) terminate(cancellation()); }, 100);
    const capture = (stream: "stdout" | "stderr", chunk: Buffer) => {
      if (terminationError) return;
      outputBytes += chunk.length;
      if (outputBytes > limit) { terminate(new Error(`${input.label} exceeded its ${limit} byte output limit.`)); return; }
      if (stream === "stdout") stdout += String(chunk);
      else stderr += clock.stderr(chunk);
    };
    const cleanup = () => { stderr += clock.finish(); clearInterval(cancelPoll); };
    child.stdout?.on("data", chunk => capture("stdout", chunk));
    child.stderr?.on("data", chunk => capture("stderr", chunk));
    child.once("error", error => {
      if (settled) return;
      settled = true; cleanup(); reject(engineResourceError(error) ?? error);
    });
    child.once("close", code => {
      if (settled) return;
      settled = true; cleanup();
      if (terminationError) reject(terminationError);
      else if (code === 0) resolve({ stdout, stderr });
      else reject(engineResourceError(stderr || stdout) ?? new Error(`${input.label} exited with code ${code}. ${(stderr || stdout).slice(-12_000)}`.trim()));
    });
  });
}
