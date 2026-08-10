import { spawn } from "node:child_process";

export type AudiverisFailureReason = "cancelled" | "timeout" | "spawn" | "exit";

export class AudiverisProcessError extends Error {
  constructor(
    message: string,
    readonly reason: AudiverisFailureReason,
    readonly exitCode: number | null = null,
  ) {
    super(message);
    this.name = "AudiverisProcessError";
  }
}

type RunAudiverisInput = {
  command: string;
  commandArgsPrefix?: string[];
  inputPath: string;
  outputDir: string;
  timeoutMs: number;
  isCancelled?: () => boolean;
  cancellationPollMs?: number;
};

const MAX_CAPTURED_OUTPUT = 4 * 1024 * 1024;

function appendOutput(current: string, chunk: unknown) {
  const combined = current + String(chunk);
  return combined.length > MAX_CAPTURED_OUTPUT ? combined.slice(-MAX_CAPTURED_OUTPUT) : combined;
}

export function runAudiverisCommand(input: RunAudiverisInput) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    if (!input.command.trim()) {
      reject(new AudiverisProcessError("AUDIVERIS_COMMAND is not configured for the worker.", "spawn"));
      return;
    }
    if (input.isCancelled?.()) {
      reject(new AudiverisProcessError("Audiveris processing was cancelled before launch.", "cancelled"));
      return;
    }

    const args = [...(input.commandArgsPrefix ?? []), "-batch", "-export", "-output", input.outputDir, input.inputPath];
    const child = spawn(input.command, args, {
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const cleanup = () => {
      clearTimeout(timeout);
      clearInterval(cancellationPoll);
    };
    const fail = (error: AudiverisProcessError, terminate: boolean) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (terminate && child.exitCode === null) child.kill("SIGTERM");
      reject(error);
    };
    const timeout = setTimeout(() => {
      fail(new AudiverisProcessError(`Audiveris timed out after ${input.timeoutMs} ms.`, "timeout"), true);
    }, input.timeoutMs);
    const cancellationPoll = setInterval(() => {
      if (input.isCancelled?.()) {
        fail(new AudiverisProcessError("Audiveris processing was cancelled.", "cancelled"), true);
      }
    }, Math.max(25, input.cancellationPollMs ?? 250));
    cancellationPoll.unref();

    child.stdout?.on("data", (chunk) => {
      stdout = appendOutput(stdout, chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr = appendOutput(stderr, chunk);
    });
    child.on("error", (error) => {
      fail(new AudiverisProcessError(`Audiveris could not start: ${error.message}`, "spawn"), false);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new AudiverisProcessError(`Audiveris exited with code ${code}. ${stderr || stdout}`.trim(), "exit", code));
    });
  });
}
