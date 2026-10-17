import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import type { ScoreStructurePreflight } from "@score/shared";
import { config } from "../config.js";
import { acquireNativeMemoryAdmission } from "./native-memory-admission.js";

export class ScorePreflightError extends Error {
  constructor(readonly code: "SCORE_PREFLIGHT_BUSY" | "SCORE_PREFLIGHT_RATE_LIMIT" | "SCORE_PREFLIGHT_UNAVAILABLE" | "SCORE_PREFLIGHT_TIMEOUT" | "SCORE_PREFLIGHT_INVALID_SOURCE" | "SCORE_PREFLIGHT_FAILED", message: string, readonly statusCode: number) {
    super(message);
    this.name = "ScorePreflightError";
  }
}

type PreflightQueueOptions = { maxConcurrency: number; queueWaitMs: number; requestsPerMinute: number };
type PreflightWaiter = { grant: () => void; cancel: () => void };

/** Per-instance FIFO resource queue. Capacity is shared across all users, without per-user serialization. */
export class ScorePreflightQueue {
  private activeCount = 0;
  private readonly attempts = new Map<string, number[]>();
  private readonly waiting: PreflightWaiter[] = [];

  constructor(private readonly options: () => PreflightQueueOptions) {}

  async acquire(userId: string, signal?: AbortSignal): Promise<() => void> {
    if (signal?.aborted) throw this.cancelled();
    const now = Date.now();
    const options = this.options();
    if (options.requestsPerMinute > 0) {
      for (const [key, dates] of this.attempts) if (!dates.some(date => date > now - 60_000)) this.attempts.delete(key);
      const recent = (this.attempts.get(userId) ?? []).filter(date => date > now - 60_000);
      if (recent.length >= options.requestsPerMinute) {
        throw new ScorePreflightError("SCORE_PREFLIGHT_RATE_LIMIT", "Too many free structure checks. Please retry in one minute.", 429);
      }
      this.attempts.set(userId, [...recent, now]);
    } else {
      this.attempts.clear();
    }
    return new Promise<() => void>((resolve, reject) => {
      let settled = false;
      const cleanup = () => { clearTimeout(timer); signal?.removeEventListener("abort", aborted); };
      const remove = () => {
        const index = this.waiting.indexOf(waiter);
        if (index !== -1) this.waiting.splice(index, 1);
      };
      const fail = (error: ScorePreflightError) => {
        if (settled) return;
        settled = true; cleanup(); remove(); reject(error); this.drain();
      };
      const aborted = () => fail(this.cancelled());
      const waiter: PreflightWaiter = {
        cancel: aborted,
        grant: () => {
          if (settled) return;
          settled = true; cleanup(); remove(); this.activeCount += 1;
          let released = false;
          resolve(() => {
            if (released) return;
            released = true; this.activeCount -= 1; this.drain();
          });
        },
      };
      const timer = setTimeout(() => fail(new ScorePreflightError("SCORE_PREFLIGHT_BUSY", "The free structure check queue is busy. Please retry shortly.", 429)), options.queueWaitMs);
      signal?.addEventListener("abort", waiter.cancel, { once: true });
      this.waiting.push(waiter); this.drain();
    });
  }

  private cancelled() {
    return new ScorePreflightError("SCORE_PREFLIGHT_FAILED", "The structure check was cancelled. Please retry.", 503);
  }

  private drain() {
    const maxConcurrency = this.options().maxConcurrency;
    while (this.activeCount < maxConcurrency) {
      const next = this.waiting[0];
      if (!next) return;
      next.grant();
    }
  }
}

const preflightQueue = new ScorePreflightQueue(() => ({
  maxConcurrency: process.env.RECOGNITION_LANES_ENABLED === "true" ? Math.min(1,config.scorePreflightMaxConcurrency) : config.scorePreflightMaxConcurrency,
  queueWaitMs: config.scorePreflightQueueWaitMs,
  requestsPerMinute: config.scorePreflightRequestsPerMinute,
}));
export function acquireScorePreflightSlot(userId: string, signal?: AbortSignal): Promise<() => void> {
  return preflightQueue.acquire(userId, signal);
}

function validateResult(value: unknown): ScoreStructurePreflight {
  const invalid = () => new ScorePreflightError("SCORE_PREFLIGHT_FAILED", "The structure check returned an invalid result. Please retry.", 503);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid();
  const data = value as Record<string, unknown>;
  const integer = (n: unknown, minimum: number, maximum: number) => typeof n === "number" && Number.isSafeInteger(n) && n >= minimum && n <= maximum;
  const codes = (input: unknown): string[] => {
    if (!Array.isArray(input) || input.length > 40 || input.some(code => typeof code !== "string" || !/^[A-Z][A-Z0-9_]{0,79}$/.test(code))) throw invalid();
    return [...new Set(input as string[])];
  };
  if (data.schemaVersion !== 1 || !["simple", "complex", "uncertain"].includes(String(data.recommendation))
    || !["high", "medium", "low"].includes(String(data.confidence))
    || !integer(data.sourcePageCount, 1, 100_000) || !integer(data.pagesAnalyzed, 0, config.scorePreflightMaxPages)
    || typeof data.complete !== "boolean" || !Array.isArray(data.pages) || data.pages.length !== data.pagesAnalyzed
    || (data.complete && data.pagesAnalyzed !== data.sourcePageCount)) throw invalid();
  const seenPages = new Set<number>();
  const pages = data.pages.map((input): ScoreStructurePreflight["pages"][number] => {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw invalid();
    const page = input as Record<string, unknown>;
    if (!integer(page.page, 1, data.sourcePageCount as number) || seenPages.has(page.page as number)
      || !integer(page.staffCount, 0, 1000) || !integer(page.systemCount, 0, 1000) || !integer(page.maxStavesPerSystem, 0, 1000)
      || typeof page.hasTab !== "boolean" || typeof page.uncertain !== "boolean") throw invalid();
    seenPages.add(page.page as number);
    const result: ScoreStructurePreflight["pages"][number] = {
      page: page.page as number, staffCount: page.staffCount as number, systemCount: page.systemCount as number,
      maxStavesPerSystem: page.maxStavesPerSystem as number, hasTab: page.hasTab, uncertain: page.uncertain,
    };
    for (const name of ["width", "height", "sourceWidth", "sourceHeight", "standardStaffCount", "tabStaffCount"] as const) {
      if (page[name] !== undefined) { if (!integer(page[name], 0, 100_000)) throw invalid(); result[name] = page[name] as number; }
    }
    for (const name of ["staffSpacing", "brightness", "blurVariance"] as const) {
      if (page[name] === null && name === "staffSpacing") { result.staffSpacing = null; continue; }
      if (page[name] !== undefined) {
        if (typeof page[name] !== "number" || !Number.isFinite(page[name]) || page[name] < 0 || page[name] > 1e9) throw invalid();
        result[name] = page[name];
      }
    }
    if (page.rotation !== undefined) {
      if (page.rotation !== null && ![0, 90, 180, 270].includes(page.rotation as number)) throw invalid();
      result.rotation = page.rotation as 0 | 90 | 180 | 270 | null;
    }
    if (page.orientationCertain !== undefined) {
      if (typeof page.orientationCertain !== "boolean") throw invalid(); result.orientationCertain = page.orientationCertain;
    }
    if (page.reasonCodes !== undefined) result.reasonCodes = codes(page.reasonCodes);
    return result;
  });
  const complete = data.complete as boolean;
  const forcedUncertain = !complete || pages.some(page => page.uncertain || page.staffCount === 0);
  const reasonCodes = codes(data.reasonCodes);
  if (!complete && !reasonCodes.includes("INCOMPLETE_ANALYSIS")) reasonCodes.push("INCOMPLETE_ANALYSIS");
  return {
    schemaVersion: 1,
    recommendation: forcedUncertain ? "uncertain" : data.recommendation as ScoreStructurePreflight["recommendation"],
    confidence: forcedUncertain ? "low" : data.confidence as ScoreStructurePreflight["confidence"],
    sourcePageCount: data.sourcePageCount as number, pagesAnalyzed: data.pagesAnalyzed as number, complete, reasonCodes, pages,
    ...(typeof data.elapsedMs === "number" && Number.isFinite(data.elapsedMs) && data.elapsedMs >= 0 ? { elapsedMs: Math.round(data.elapsedMs) } : {}),
  };
}

/** Uses a bounded, model-free adapter. The caller owns the disposable workspace. */
export async function runScoreStructurePreflight(input: { sourcePath: string; workspace: string; signal?: AbortSignal }): Promise<ScoreStructurePreflight> {
  const adapterPath = config.scorePreflightAdapterPath
    ? path.resolve(config.scorePreflightAdapterPath)
    : fileURLToPath(new URL("../../../worker/python/score_structure_preflight.py", import.meta.url));
  try { if (!(await fs.stat(adapterPath)).isFile()) throw new Error("Adapter unavailable"); }
  catch { throw new ScorePreflightError("SCORE_PREFLIGHT_UNAVAILABLE", "The free structure check is temporarily unavailable. Please retry.", 503); }
  const requestPath = path.join(input.workspace, "request.json");
  const responsePath = path.join(input.workspace, "response.json");
  await fs.writeFile(requestPath, JSON.stringify({ sourcePath: input.sourcePath, limits: {
    maxPagePixels: 1_000_000, maxTotalPixels: 30_000_000,
    maxPages: config.scorePreflightMaxPages, dpi: 100, budgetMs: Math.max(100, config.scorePreflightTimeoutMs - 1000),
  } }), { flag: "wx" });
  const releaseMemory = await acquireNativeMemoryAdmission({memoryMb:256,signal:input.signal});
  try { await new Promise<void>((resolve, reject) => {
    let failure: ScorePreflightError | undefined;
    if (input.signal?.aborted) { reject(new ScorePreflightError("SCORE_PREFLIGHT_FAILED", "The structure check was cancelled. Please retry.", 503)); return; }
    const pythonArgs = /^python(?:\d+(?:\.\d+)*)?(?:\.exe)?$/iu.test(path.basename(config.scorePreflightPythonCommand)) ? ["-B", "-X", "utf8"] : [];
    const child = spawn(config.scorePreflightPythonCommand, [...pythonArgs, adapterPath, "--request", requestPath, "--response", responsePath], {
      shell: false, windowsHide: true, cwd: input.workspace, stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1", PYTHONUTF8: "1", OMP_NUM_THREADS: "1", OPENBLAS_NUM_THREADS: "1" },
    });
    let diagnosticBytes = 0;
    const stop = (error: ScorePreflightError) => { failure ??= error; child.kill("SIGKILL"); };
    const timer = setTimeout(() => stop(new ScorePreflightError("SCORE_PREFLIGHT_TIMEOUT", "The free structure check timed out. Please retry.", 504)), config.scorePreflightTimeoutMs);
    const aborted = () => stop(new ScorePreflightError("SCORE_PREFLIGHT_FAILED", "The structure check was cancelled. Please retry.", 503));
    input.signal?.addEventListener("abort", aborted, { once: true });
    for (const stream of [child.stdout, child.stderr]) stream?.on("data", (chunk: Buffer) => {
      diagnosticBytes += chunk.length;
      if (diagnosticBytes > 32_768) stop(new ScorePreflightError("SCORE_PREFLIGHT_FAILED", "The structure check exceeded its output limit. Please retry.", 503));
    });
    child.on("error", () => { failure ??= new ScorePreflightError("SCORE_PREFLIGHT_UNAVAILABLE", "The free structure check is temporarily unavailable. Please retry.", 503); });
    child.on("close", code => {
      clearTimeout(timer); input.signal?.removeEventListener("abort", aborted);
      if (failure) reject(failure);
      else if (code === 3) reject(new ScorePreflightError("SCORE_PREFLIGHT_UNAVAILABLE", "The free structure check is temporarily unavailable. Please retry.", 503));
      else if (code === 2) reject(new ScorePreflightError("SCORE_PREFLIGHT_INVALID_SOURCE", "The score image or PDF could not be inspected. Check the file and retry.", 422));
      else if (code !== 0) reject(new ScorePreflightError("SCORE_PREFLIGHT_FAILED", "The free structure check could not finish. Please retry.", 503));
      else resolve();
    });
  }); } finally { releaseMemory(); }
  try {
    const stat = await fs.stat(responsePath);
    if (!stat.isFile() || stat.size > 128_000) throw new Error("Invalid response file");
    return validateResult(JSON.parse(await fs.readFile(responsePath, "utf8")));
  } catch (error) {
    if (error instanceof ScorePreflightError) throw error;
    throw new ScorePreflightError("SCORE_PREFLIGHT_FAILED", "The structure check did not return a usable result. Please retry.", 503);
  }
}
