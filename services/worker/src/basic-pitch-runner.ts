import { spawn } from "node:child_process";
import { AudiverisProcessError } from "./audiveris-runner.js";
import { createEngineExecutionClock } from "./engine-execution-clock.js";

export function runBasicPitch(input: {
  command: string; timeoutMs: number; inputPath: string; outputDir: string; isCancelled: () => boolean;
}) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    if (!input.command) {
      reject(new Error("BASIC_PITCH_COMMAND is not configured for the worker."));
      return;
    }
    if (input.isCancelled()) {
      reject(new AudiverisProcessError("Audio transcription was cancelled before launch.", "cancelled"));
      return;
    }
    const clock = createEngineExecutionClock({ command: input.command, timeoutMs: input.timeoutMs,
      onTimeout: () => terminate(new Error(`Basic Pitch timed out after ${input.timeoutMs} ms.`)) });
    const child = spawn(input.command, [input.outputDir, input.inputPath], {
      shell: false,
      detached: process.platform !== "win32",
      env: { ...process.env, ...clock.environment },
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let terminationError: Error | undefined;
    const terminate = (error: Error) => {
      if (terminationError) return;
      terminationError = error;
      clock.stop();
      clearInterval(cancelPoll);
      try {
        if (process.platform !== "win32" && child.pid) process.kill(-child.pid, "SIGKILL");
        else child.kill("SIGKILL");
      } catch { /* The process may already have exited. */ }
    };
    const cancelPoll = setInterval(() => {
      if (input.isCancelled()) terminate(new AudiverisProcessError("Audio transcription was cancelled.", "cancelled"));
    }, 250);
    const cleanup = () => { stderr += clock.finish(); clearInterval(cancelPoll); };
    child.stdout?.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr?.on("data", (chunk) => { stderr += clock.stderr(chunk); });
    child.on("error", (error) => { cleanup(); reject(error); });
    child.on("close", (code) => {
      cleanup();
      if (terminationError) { reject(terminationError); return; }
      if (code === 0) { resolve({ stdout, stderr }); return; }
      reject(new Error(`Basic Pitch exited with code ${code}. ${stderr || stdout}`.trim()));
    });
  });
}
