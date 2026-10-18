import { AudiverisProcessError } from "./audiveris-runner.js";
import { runBoundedProcess } from "./bounded-process-runner.js";

export function runBasicPitch(input: {
  command: string; timeoutMs: number; inputPath: string; outputDir: string; isCancelled: () => boolean;
}) {
  if (!input.command) return Promise.reject(new Error("BASIC_PITCH_COMMAND is not configured for the worker."));
  return runBoundedProcess({ ...input, label: "Basic Pitch", args: [input.outputDir, input.inputPath],
    cancelledError: () => new AudiverisProcessError("Audio transcription was cancelled.", "cancelled") });
}
