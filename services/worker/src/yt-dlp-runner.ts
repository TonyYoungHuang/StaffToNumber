import { AudiverisProcessError } from "./audiveris-runner.js";
import { runBoundedProcess } from "./bounded-process-runner.js";

export function runYtDlp(input: { command: string; timeoutMs: number; inputUrl: string; outputTemplate: string; isCancelled: () => boolean }) {
  if (!input.command) return Promise.reject(new Error("YT_DLP_COMMAND is not configured for the worker."));
  return runBoundedProcess({ ...input, label: "yt-dlp",
    args: ["-x", "--audio-format", "wav", "-o", input.outputTemplate, input.inputUrl],
    cancelledError: () => new AudiverisProcessError("Audio download was cancelled.", "cancelled") });
}
