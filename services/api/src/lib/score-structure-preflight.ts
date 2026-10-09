import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import type { ScoreStructurePreflight } from "@score/shared";
import { config } from "../config.js";

export class ScorePreflightError extends Error {
  constructor(readonly code: "SCORE_PREFLIGHT_BUSY" | "SCORE_PREFLIGHT_RATE_LIMIT" | "SCORE_PREFLIGHT_UNAVAILABLE" | "SCORE_PREFLIGHT_TIMEOUT" | "SCORE_PREFLIGHT_INVALID_SOURCE" | "SCORE_PREFLIGHT_FAILED", message: string, readonly statusCode: number) {
    super(message);
    this.name = "ScorePreflightError";
  }
}

const activeUsers = new Set<string>();
const attempts = new Map<string, number[]>();

/** Per-instance resource gate only; no jobs, billing records or durable files. */
export function acquireScorePreflightSlot(userId: string): () => void {
  const now = Date.now();
  for (const [key, dates] of attempts) if (!dates.some(date => date > now - 60_000)) attempts.delete(key);
  if (activeUsers.has(userId) || activeUsers.size >= config.scorePreflightMaxConcurrency) {
    throw new ScorePreflightError("SCORE_PREFLIGHT_BUSY", "The free structure check is busy. Please retry shortly.", 429);
  }
  const recent = (attempts.get(userId) ?? []).filter(date => date > now - 60_000);
  if (recent.length >= config.scorePreflightRequestsPerMinute) {
    throw new ScorePreflightError("SCORE_PREFLIGHT_RATE_LIMIT", "Too many free structure checks. Please retry in one minute.", 429);
  }
  recent.push(now);
  attempts.set(userId, recent);
  activeUsers.add(userId);
  let released = false;
  return () => { if (!released) { activeUsers.delete(userId); released = true; } };
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
    for (const name of ["width", "height", "standardStaffCount", "tabStaffCount"] as const) {
      if (page[name] !== undefined) { if (!integer(page[name], 0, 100_000)) throw invalid(); result[name] = page[name] as number; }
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
    maxPages: config.scorePreflightMaxPages, dpi: 100, budgetMs: Math.min(15_000, Math.max(100, config.scorePreflightTimeoutMs - 1000)),
  } }), { flag: "wx" });
  await new Promise<void>((resolve, reject) => {
    let failure: ScorePreflightError | undefined;
    if (input.signal?.aborted) { reject(new ScorePreflightError("SCORE_PREFLIGHT_FAILED", "The structure check was cancelled. Please retry.", 503)); return; }
    const child = spawn(config.scorePreflightPythonCommand, [adapterPath, "--request", requestPath, "--response", responsePath], {
      shell: false, windowsHide: true, cwd: input.workspace, stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1", OMP_NUM_THREADS: "1", OPENBLAS_NUM_THREADS: "1" },
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
  });
  try {
    const stat = await fs.stat(responsePath);
    if (!stat.isFile() || stat.size > 128_000) throw new Error("Invalid response file");
    return validateResult(JSON.parse(await fs.readFile(responsePath, "utf8")));
  } catch (error) {
    if (error instanceof ScorePreflightError) throw error;
    throw new ScorePreflightError("SCORE_PREFLIGHT_FAILED", "The structure check did not return a usable result. Please retry.", 503);
  }
}
