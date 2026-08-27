import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

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

export type RunAudiverisInput = {
  command: string;
  commandArgsPrefix?: string[];
  inputPath: string;
  outputDir: string;
  timeoutMs: number;
  maxHeapMb?: number;
  isCancelled?: () => boolean;
  cancellationPollMs?: number;
};

type RunAudiverisWithRotationFallbackInput = RunAudiverisInput & {
  imageMagickCommand: string;
  imageMagickCommandArgsPrefix?: string[];
};

export type AudiverisRunResult = {
  stdout: string;
  stderr: string;
  appliedRotationDegrees: 0 | 90 | 180 | 270;
};

const MAX_CAPTURED_OUTPUT = 4 * 1024 * 1024;

export function buildAudiverisEnvironment(maxHeapMb: number | undefined, base = process.env): NodeJS.ProcessEnv {
  const env = { ...base };
  if (!Number.isSafeInteger(maxHeapMb) || (maxHeapMb ?? 0) <= 0) return env;
  const existing = (env.JAVA_TOOL_OPTIONS ?? "")
    .replace(/(^|\s)-Xmx\S+/gu, " ")
    .replace(/(^|\s)-XX:[+-]ExitOnOutOfMemoryError(?:\s|$)/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  env.JAVA_TOOL_OPTIONS = [existing, "-XX:+ExitOnOutOfMemoryError", `-Xmx${maxHeapMb}m`].filter(Boolean).join(" ");
  return env;
}

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
      env: buildAudiverisEnvironment(input.maxHeapMb),
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let terminationError: AudiverisProcessError | undefined;
    let forceKillTimer: NodeJS.Timeout | undefined;

    const cleanup = () => {
      clearTimeout(timeout);
      clearInterval(cancellationPoll);
      if (forceKillTimer) clearTimeout(forceKillTimer);
    };
    const fail = (error: AudiverisProcessError) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const terminate = (error: AudiverisProcessError) => {
      if (settled || terminationError) return;
      terminationError = error;
      clearTimeout(timeout);
      clearInterval(cancellationPoll);
      if (child.exitCode === null) child.kill("SIGTERM");
      forceKillTimer = setTimeout(() => {
        if (!settled && child.exitCode === null) child.kill("SIGKILL");
      }, 2_000);
      forceKillTimer.unref();
    };
    const timeout = setTimeout(() => {
      terminate(new AudiverisProcessError(`Audiveris timed out after ${input.timeoutMs} ms.`, "timeout"));
    }, input.timeoutMs);
    const cancellationPoll = setInterval(() => {
      if (input.isCancelled?.()) {
        terminate(new AudiverisProcessError("Audiveris processing was cancelled.", "cancelled"));
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
      fail(new AudiverisProcessError(`Audiveris could not start: ${error.message}`, "spawn"));
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (terminationError) {
        reject(terminationError);
        return;
      }
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new AudiverisProcessError(`Audiveris exited with code ${code}. ${stderr || stdout}`.trim(), "exit", code));
    });
  });
}

const RASTER_SCORE_EXTENSION = /\.(?:png|jpe?g|webp|tiff?)$/iu;

export async function runAudiverisWithRotationFallback(
  input: RunAudiverisWithRotationFallbackInput,
): Promise<AudiverisRunResult> {
  if (!RASTER_SCORE_EXTENSION.test(input.inputPath)) {
    const result = await runAudiverisCommand(input);
    return { ...result, appliedRotationDegrees: 0 };
  }
  if (!input.imageMagickCommand.trim()) {
    throw new AudiverisProcessError(
      "ImageMagick is required to normalize raster score images before Audiveris recognition.",
      "spawn",
    );
  }

  const deadline = Date.now() + input.timeoutMs;
  let lastError: AudiverisProcessError | undefined;
  for (const rotation of [0, 90, 180, 270] as const) {
    if (input.isCancelled?.()) {
      throw new AudiverisProcessError("Audiveris processing was cancelled.", "cancelled");
    }
    const attemptDir = path.join(input.outputDir, `rotation-${rotation}`);
    fs.mkdirSync(attemptDir, { recursive: true });
    const normalizedPath = path.join(attemptDir, "normalized.png");
    const remainingBeforeConvert = deadline - Date.now();
    if (remainingBeforeConvert <= 0) {
      throw new AudiverisProcessError(`Audiveris timed out after ${input.timeoutMs} ms.`, "timeout");
    }
    await runImageMagickNormalization({
      command: input.imageMagickCommand,
      commandArgsPrefix: input.imageMagickCommandArgsPrefix,
      inputPath: input.inputPath,
      outputPath: normalizedPath,
      rotation,
      timeoutMs: Math.min(30_000, remainingBeforeConvert),
      isCancelled: input.isCancelled,
      cancellationPollMs: input.cancellationPollMs,
    });

    const remainingBeforeAudiveris = deadline - Date.now();
    if (remainingBeforeAudiveris <= 0) {
      throw new AudiverisProcessError(`Audiveris timed out after ${input.timeoutMs} ms.`, "timeout");
    }
    try {
      const result = await runAudiverisCommand({
        ...input,
        inputPath: normalizedPath,
        outputDir: attemptDir,
        timeoutMs: remainingBeforeAudiveris,
      });
      return { ...result, appliedRotationDegrees: rotation };
    } catch (error) {
      if (!(error instanceof AudiverisProcessError) || error.reason !== "exit") throw error;
      lastError = error;
    }
  }
  throw new AudiverisProcessError(
    `Audiveris could not recognize the raster score after orientation attempts at 0, 90, 180, and 270 degrees. ${lastError?.message ?? ""}`.trim(),
    "exit",
    lastError?.exitCode ?? null,
  );
}

type ImageMagickNormalizationInput = {
  command: string;
  commandArgsPrefix?: string[];
  inputPath: string;
  outputPath: string;
  rotation: 0 | 90 | 180 | 270;
  timeoutMs: number;
  isCancelled?: () => boolean;
  cancellationPollMs?: number;
};

function runImageMagickNormalization(input: ImageMagickNormalizationInput) {
  return new Promise<void>((resolve, reject) => {
    const args = [
      ...(input.commandArgsPrefix ?? []),
      input.inputPath,
      "-background",
      "white",
      "-alpha",
      "remove",
      "-alpha",
      "off",
      ...(input.rotation ? ["-rotate", String(input.rotation)] : []),
      input.outputPath,
    ];
    const child = spawn(input.command, args, { shell: false, windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    let settled = false;
    let terminationError: AudiverisProcessError | undefined;
    let forceKillTimer: NodeJS.Timeout | undefined;
    const cleanup = () => {
      clearTimeout(timeout);
      clearInterval(cancellationPoll);
      if (forceKillTimer) clearTimeout(forceKillTimer);
    };
    const fail = (error: AudiverisProcessError) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const terminate = (error: AudiverisProcessError) => {
      if (settled || terminationError) return;
      terminationError = error;
      clearTimeout(timeout);
      clearInterval(cancellationPoll);
      if (child.exitCode === null) child.kill("SIGTERM");
      forceKillTimer = setTimeout(() => {
        if (!settled && child.exitCode === null) child.kill("SIGKILL");
      }, 2_000);
      forceKillTimer.unref();
    };
    const timeout = setTimeout(() => {
      terminate(new AudiverisProcessError(`Image normalization timed out after ${input.timeoutMs} ms.`, "timeout"));
    }, input.timeoutMs);
    const cancellationPoll = setInterval(() => {
      if (input.isCancelled?.()) terminate(new AudiverisProcessError("Image normalization was cancelled.", "cancelled"));
    }, Math.max(25, input.cancellationPollMs ?? 250));
    cancellationPoll.unref();

    child.stderr?.on("data", (chunk) => { stderr = appendOutput(stderr, chunk); });
    child.on("error", (error) => {
      fail(new AudiverisProcessError(`ImageMagick could not start: ${error.message}`, "spawn"));
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (terminationError) {
        reject(terminationError);
        return;
      }
      if (code === 0 && fs.existsSync(input.outputPath)) {
        resolve();
        return;
      }
      reject(new AudiverisProcessError(`ImageMagick exited with code ${String(code)}. ${stderr}`.trim(), "exit", code));
    });
  });
}
