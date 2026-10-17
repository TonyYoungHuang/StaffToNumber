import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { withOmrEngineSlot } from "./omr-engine-gate.js";
import { createEngineExecutionClock } from "./engine-execution-clock.js";
import { engineResourceError } from "./engine-resource-error.js";
import { engineMemoryReservationMb } from "./engine-memory.js";
import { getJobMemoryLeaseEnvironment } from "./job-memory-lease.js";
import { claimRasterCall, createRasterEnhancementBudget, inspectRasterQuality, prepareRasterEnhancement, RasterPreparationError, selectRasterVariant,
  type RasterEnhancementOptions, type RasterEnhancementRun, type RasterEnhancementSummary } from "./raster-enhancement.js";

export type AudiverisFailureReason = "cancelled" | "timeout" | "spawn" | "exit" | "resource";

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

/** All bounded orientation attempts exited without recognizing this image. */
export class AudiverisRecognitionError extends AudiverisProcessError {}

export type RunAudiverisInput = {
  command: string;
  commandArgsPrefix?: string[];
  inputPath: string;
  outputDir: string;
  timeoutMs: number;
  maxHeapMb?: number;
  isCancelled?: () => boolean;
  cancellationPollMs?: number;
  onQueueWait?: (elapsedMs: number) => void;
  /** Off by default; heavy configurations require an accepted big-memory lane. */
  enhancement?: RasterEnhancementOptions;
};

type RunAudiverisWithRotationFallbackInput = RunAudiverisInput & {
  /** Layout-selected regions must retain the orientation used by source mapping. */
  allowedRotations?: readonly (0 | 90 | 180 | 270)[];
  onProgress?: (stage: "recognize" | "restore-image") => void;
  imageMagickCommand: string;
  imageMagickCommandArgsPrefix?: string[];
};

export type AudiverisRunResult = {
  stdout: string;
  stderr: string;
  appliedRotationDegrees: 0 | 90 | 180 | 270;
  /** Successful recovery directory; failed attempts must not supply artifacts. */
  recognitionOutputDir?: string;
  /** Requested enlargement, still capped by the normal 3000-pixel side limit. */
  rasterScale?: 2 | 3;
  enhancement?: RasterEnhancementSummary;
};

const MAX_CAPTURED_OUTPUT = 4 * 1024 * 1024;

export function buildAudiverisEnvironment(maxHeapMb: number | undefined, base = process.env): NodeJS.ProcessEnv {
  const env = { ...base };
  // Audiveris needs combined legacy + LSTM data; Debian's LSTM-only package
  // cannot initialize its OCR engine. Use the bundled, pinned combined data.
  if (!env.TESSDATA_PREFIX && fs.existsSync("/opt/audiveris/tessdata/eng.traineddata")) {
    env.TESSDATA_PREFIX = "/opt/audiveris/tessdata";
  }
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
  return withOmrEngineSlot({
    timeoutMs: input.timeoutMs,
    memoryMb: Math.max(engineMemoryReservationMb(), (input.maxHeapMb ?? 768) + 256),
    isCancelled: input.isCancelled,
    onQueueWait: input.onQueueWait,
    cancelledError: () => new AudiverisProcessError("Audiveris processing was cancelled while waiting for the OMR engine.", "cancelled"),
    timeoutError: () => new AudiverisProcessError("Audiveris execution budget was exhausted while waiting for the OMR engine.", "timeout"),
  }, (remaining) => runAudiverisCommandWithSlot({ ...input, timeoutMs: remaining }));
}

function runAudiverisCommandWithSlot(input: RunAudiverisInput) {
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
    const clock = createEngineExecutionClock({ command: input.command, timeoutMs: input.timeoutMs, onQueueWait: input.onQueueWait,
      onQueueTimeout: (error) => terminate(new AudiverisProcessError(error.message, "resource")),
      onTimeout: () => terminate(new AudiverisProcessError(`Audiveris timed out after ${input.timeoutMs} ms.`, "timeout")) });
    const child = spawn(input.command, args, {
      env: { ...buildAudiverisEnvironment(input.maxHeapMb), ...clock.environment, ...getJobMemoryLeaseEnvironment() },
      shell: false,
      detached: process.platform !== "win32",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let terminationError: AudiverisProcessError | undefined;
    let forceKillTimer: NodeJS.Timeout | undefined;

    const cleanup = () => {
      stderr = appendOutput(stderr, clock.finish());
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
      clock.stop();
      clearInterval(cancellationPoll);
      const kill = (signal: NodeJS.Signals) => {
        try {
          if (process.platform !== "win32" && child.pid) process.kill(-child.pid, signal);
          else child.kill(signal);
        } catch { /* The process may already have exited. */ }
      };
      if (child.exitCode === null) kill("SIGTERM");
      forceKillTimer = setTimeout(() => {
        if (!settled && child.exitCode === null) kill("SIGKILL");
      }, 2_000);
      forceKillTimer.unref();
    };
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
      stderr = appendOutput(stderr, clock.stderr(chunk));
    });
    child.on("error", (error) => {
      const resource = engineResourceError(error);
      fail(new AudiverisProcessError(resource?.message ?? `Audiveris could not start: ${error.message}`, resource ? "resource" : "spawn"));
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
      // JVM startup options are often the only stderr output. Audiveris writes
      // its actual recognition diagnostics to stdout, so retain both streams.
      const diagnostics = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n").slice(-12_000);
      const resource = engineResourceError(diagnostics);
      reject(new AudiverisProcessError(resource?.message ?? `Audiveris exited with code ${code}. ${diagnostics}`.trim(), resource ? "resource" : "exit", code));
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
  if (input.enhancement?.enabled) return runAudiverisEnhancement(input, input.enhancement);
  if (!input.imageMagickCommand.trim()) {
    throw new AudiverisProcessError(
      "ImageMagick is required to normalize raster score images before Audiveris recognition.",
      "spawn",
    );
  }

  let deadline = Date.now() + input.timeoutMs;
  const onQueueWait = (elapsedMs: number) => { deadline += elapsedMs; input.onQueueWait?.(elapsedMs); };
  let lastError: AudiverisProcessError | undefined;
  for (const rotation of input.allowedRotations ?? [0, 90, 180, 270] as const) {
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
      onQueueWait,
    });

    const remainingBeforeAudiveris = deadline - Date.now();
    if (remainingBeforeAudiveris <= 0) {
      throw new AudiverisProcessError(`Audiveris timed out after ${input.timeoutMs} ms.`, "timeout");
    }
    try {
      input.onProgress?.("recognize");
      const result = await runAudiverisCommand({
        ...input,
        inputPath: normalizedPath,
        outputDir: attemptDir,
        timeoutMs: remainingBeforeAudiveris,
        onQueueWait,
      });
      return { ...result, appliedRotationDegrees: rotation };
    } catch (error) {
      if (!(error instanceof AudiverisProcessError) || error.reason !== "exit") throw error;
      lastError = error;
      // Rotation cannot fix a legible image rejected solely for small staff
      // spacing. Try one bounded enlargement, within the same job and deadline.
      if (!/too low interline value/iu.test(error.message)) continue;
      input.onProgress?.("restore-image");
      const recoveryDir = path.join(attemptDir, "resolution-2");
      fs.mkdirSync(recoveryDir, { recursive: true });
      const recoveryPath = path.join(recoveryDir, "normalized.png");
      const remainingBeforeRecovery = deadline - Date.now();
      if (remainingBeforeRecovery <= 0) throw new AudiverisProcessError(`Audiveris timed out after ${input.timeoutMs} ms.`, "timeout");
      await runImageMagickNormalization({
        command: input.imageMagickCommand,
        commandArgsPrefix: input.imageMagickCommandArgsPrefix,
        inputPath: input.inputPath,
        outputPath: recoveryPath,
        rotation,
        rasterScale: 2,
        timeoutMs: Math.min(30_000, remainingBeforeRecovery),
        isCancelled: input.isCancelled,
        cancellationPollMs: input.cancellationPollMs,
        onQueueWait,
      });
      const remainingAfterRecovery = deadline - Date.now();
      if (remainingAfterRecovery <= 0) throw new AudiverisProcessError(`Audiveris timed out after ${input.timeoutMs} ms.`, "timeout");
      try {
        const result = await runAudiverisCommand({
          ...input, inputPath: recoveryPath, outputDir: recoveryDir, timeoutMs: remainingAfterRecovery, onQueueWait,
        });
        return { ...result, appliedRotationDegrees: rotation, recognitionOutputDir: recoveryDir, rasterScale: 2 };
      } catch (recoveryError) {
        if (!(recoveryError instanceof AudiverisProcessError) || recoveryError.reason !== "exit") throw recoveryError;
        lastError = recoveryError;
      }
    }
  }
  throw new AudiverisRecognitionError(
    `Audiveris could not recognize the raster score after orientation attempts at 0, 90, 180, and 270 degrees. ${lastError?.message ?? ""}`.trim(),
    "exit",
    lastError?.exitCode ?? null,
  );
}

async function runAudiverisEnhancement(input: RunAudiverisWithRotationFallbackInput, options: RasterEnhancementOptions): Promise<AudiverisRunResult> {
  let deadline = Date.now() + input.timeoutMs;
  const onQueueWait = (elapsedMs: number) => { deadline += elapsedMs; input.onQueueWait?.(elapsedMs); };
  const budget = options.budget ?? createRasterEnhancementBudget(1);
  const rotationDegrees = options.rotationDegrees ?? options.pageRotations?.[String(options.pageNumber ?? 1)]
    ?? (input.allowedRotations?.length === 1 ? input.allowedRotations[0] : 0);
  let manifest;
  try {
    manifest = await prepareRasterEnhancement({ inputPath: input.inputPath, outputDir: path.join(input.outputDir, "raster-enhancement"),
      options: { ...options, budget, rotationDegrees },
      timeoutMs: Math.min(15_000, Math.max(1, deadline - Date.now())), isCancelled: input.isCancelled, onQueueWait });
  } catch (error) {
    if (error instanceof RasterPreparationError) throw new AudiverisProcessError(error.message, error.reason);
    throw error;
  }
  const runs: RasterEnhancementRun[] = [];
  const outputs = new Map<string, { stdout: string; stderr: string }>();
  let lastError: AudiverisProcessError | undefined;
  // The list is frozen by preparation. No orientation/enhancement retry loops;
  // all attempts share the original execution deadline and job call ledger.
  for (const [index, variant] of manifest.variants.entries()) {
    if (input.isCancelled?.()) throw new AudiverisProcessError("Audiveris processing was cancelled.", "cancelled");
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    if (!claimRasterCall(budget, options.pageNumber ?? 1, index > 0)) break;
    const outputDir = path.join(input.outputDir, `enhanced-${variant.id}`);
    fs.mkdirSync(outputDir, { recursive: true });
    input.onProgress?.(index ? "restore-image" : "recognize");
    try {
      const output = await runAudiverisCommand({ ...input, inputPath: variant.imagePath, outputDir, timeoutMs: remaining, onQueueWait });
      const quality = inspectRasterQuality(outputDir, manifest.diagnostics.expectedStaffCount);
      runs.push({ id: variant.id, outputDir, variant, quality, status: quality.valid ? "succeeded" : "failed", ...(!quality.valid ? { message: "No nonempty MusicXML draft was produced." } : {}) });
      if (quality.valid) outputs.set(variant.id, output);
    } catch (error) {
      if (!(error instanceof AudiverisProcessError)) throw error;
      if (error.reason === "cancelled") throw error;
      // A later, heavier comparison cannot invalidate a draft already obtained
      // in this one-shot job. Retain it instead of requesting another fallback.
      if ((error.reason === "resource" || error.reason === "spawn") && runs.some((run) => run.status === "succeeded")) {
        runs.push({ id: variant.id, outputDir, variant, status: "failed", message: error.message });
        break;
      }
      if (error.reason === "resource" || error.reason === "spawn") throw error;
      lastError = error;
      runs.push({ id: variant.id, outputDir, variant, status: "failed", message: error.message });
      if (error.reason === "timeout") break;
    }
  }
  const selected = selectRasterVariant(runs);
  if (!selected) {
    if (lastError?.reason === "timeout" || deadline <= Date.now()) throw lastError ?? new AudiverisProcessError("Audiveris execution budget was exhausted.", "timeout");
    const reason = manifest.diagnostics.staffDetection === "uncertain"
      ? "[RASTER_NO_STAFF] No five-line music was found. This may be a cover, numbered notation, a single-line drum part, or a photo whose page needs its corners adjusted."
      : manifest.diagnostics.staffSpacing !== null && manifest.diagnostics.staffSpacing < 5
        ? "[RASTER_TOO_SMALL] The music symbols contain too few pixels to separate reliably. A larger source or a closer photo is needed."
        : "[RASTER_UNREADABLE] Music lines were found, but a usable draft could not be reconstructed. Check focus, shadows, and page corners.";
    throw new AudiverisRecognitionError(reason, "exit", lastError?.exitCode ?? null);
  }
  budget.preferredVariantId = selected.id;
  const reasons = ["Valid MusicXML and musical content", "Staff coverage, known time signatures, durations, and engine diagnostics take priority over note count."];
  if (selected.quality?.coverage === null) reasons.push("Source staff coverage is uncertain; this recommendation needs review.");
  return { ...outputs.get(selected.id)!, appliedRotationDegrees: rotationDegrees, recognitionOutputDir: selected.outputDir,
    ...(selected.variant.scale === 2 || selected.variant.scale === 3 ? { rasterScale: selected.variant.scale } : {}),
    enhancement: { selectedVariantId: selected.id, reasons, diagnostics: manifest.diagnostics, variants: runs, calls: budget.calls, maxCalls: budget.maxCalls } };
}

type ImageMagickNormalizationInput = {
  command: string;
  commandArgsPrefix?: string[];
  inputPath: string;
  outputPath: string;
  rotation: 0 | 90 | 180 | 270;
  rasterScale?: 2;
  timeoutMs: number;
  isCancelled?: () => boolean;
  cancellationPollMs?: number;
  onQueueWait?: (elapsedMs: number) => void;
};

function runImageMagickNormalization(input: ImageMagickNormalizationInput) {
  return withOmrEngineSlot({
    timeoutMs: input.timeoutMs, isCancelled: input.isCancelled, onQueueWait: input.onQueueWait,
    cancelledError: () => new AudiverisProcessError("Image normalization was cancelled.", "cancelled"),
    timeoutError: () => new AudiverisProcessError("Image normalization execution budget was exhausted.", "timeout"),
  }, (timeoutMs) => runImageMagickNormalizationWithSlot({ ...input, timeoutMs }));
}

function runImageMagickNormalizationWithSlot(input: ImageMagickNormalizationInput) {
  return new Promise<void>((resolve, reject) => {
    const args = [
      ...(input.commandArgsPrefix ?? []),
      input.inputPath,
      "-auto-orient",
      "-resize",
      "3000x3000>",
      ...(input.rasterScale ? ["-resize", "200%", "-resize", "3000x3000>"] : []),
      "-colorspace",
      "Gray",
      "-normalize",
      "-background",
      "white",
      "-alpha",
      "remove",
      "-alpha",
      "off",
      "-deskew",
      "40%",
      ...(input.rotation ? ["-rotate", String(input.rotation)] : []),
      input.outputPath,
    ];
    const child = spawn(input.command, args, { shell: false, windowsHide: true, env: { ...process.env, ...getJobMemoryLeaseEnvironment() }, stdio: ["ignore", "ignore", "pipe"] });
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
      const resource = engineResourceError(error);
      fail(new AudiverisProcessError(resource?.message ?? `ImageMagick could not start: ${error.message}`, resource ? "resource" : "spawn"));
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
      const resource = engineResourceError(stderr);
      reject(new AudiverisProcessError(resource?.message ?? `ImageMagick exited with code ${String(code)}. ${stderr}`.trim(), resource ? "resource" : "exit", code));
    });
  });
}
