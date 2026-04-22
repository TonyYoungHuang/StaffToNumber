import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

type SampleCategory = "clean" | "draft" | "fail";

type SampleManifestEntry = {
  id: string;
  category: SampleCategory;
  file: string;
  expectedResultKind: "final" | "draft";
  sourceKind?: "uploaded_copy" | "composed" | "synthetic";
  notes?: string;
};

type SampleManifest = {
  version: number;
  samples: SampleManifestEntry[];
};

type PreviousResult = {
  id: string;
  status: string;
  resultKind: string;
  previewHash: string;
};

type EvaluationResult = {
  id: string;
  category: SampleCategory;
  file: string;
  expectedResultKind: "final" | "draft";
  sourceKind?: "uploaded_copy" | "composed" | "synthetic";
  status: string;
  resultKind: string;
  matchedExpectation: boolean;
  previewHash: string;
  previewText: string;
  noteCount: number | null;
  restCount: number | null;
  barlineCount: number | null;
  promotionScore: number | null;
  changedSinceLastRun: boolean;
  notes?: string;
};

const currentFile = fileURLToPath(import.meta.url);
const workerRoot = path.resolve(path.dirname(currentFile), "..");
const repoRoot = path.resolve(workerRoot, "..", "..");
const samplesRoot = path.join(repoRoot, "samples");
const manifestPath = path.join(samplesRoot, "manifest.json");
const reportsRoot = path.join(samplesRoot, "reports");
const historyRoot = path.join(reportsRoot, "history");
const runsRoot = path.join(samplesRoot, ".runs");
const userId = "sample-evaluator-user";

function loadManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as SampleManifest;
}

function buildRunId() {
  return new Date().toISOString().replace(/[:]/g, "-").replace(/\..+/, "");
}

function initDb(dbFile: string) {
  const db = new DatabaseSync(dbFile);
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      file_kind TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      input_file_id TEXT NOT NULL,
      direction TEXT NOT NULL,
      status TEXT NOT NULL,
      result_kind TEXT NOT NULL,
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      output_file_id TEXT,
      draft_bundle_file_id TEXT,
      preview_text TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
  `);
  return db;
}

function nowIso() {
  return new Date().toISOString();
}

function insertQueuedJobs(db: DatabaseSync, manifest: SampleManifest) {
  const jobIds = new Map<string, string>();

  for (const sample of manifest.samples) {
    const absolutePath = path.resolve(repoRoot, sample.file);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Sample file is missing: ${absolutePath}`);
    }

    const fileId = crypto.randomUUID();
    const jobId = crypto.randomUUID();
    const timestamp = nowIso();
    const originalName = path.basename(absolutePath);

    db.prepare(
      `
        INSERT INTO files (id, user_id, original_name, stored_name, storage_path, mime_type, size_bytes, file_kind, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      fileId,
      userId,
      originalName,
      originalName,
      absolutePath,
      "application/pdf",
      fs.statSync(absolutePath).size,
      "input_pdf",
      timestamp,
    );

    db.prepare(
      `
        INSERT INTO jobs (
          id, user_id, input_file_id, direction, status, result_kind, error_message,
          created_at, updated_at, started_at, completed_at, output_file_id, draft_bundle_file_id, preview_text
        )
        VALUES (?, ?, ?, 'staff_pdf_to_numbered', 'queued', 'none', NULL, ?, ?, NULL, NULL, NULL, NULL, NULL)
      `,
    ).run(jobId, userId, fileId, timestamp, timestamp);

    jobIds.set(sample.id, jobId);
  }

  return jobIds;
}

function startWorkerProcess(dbFile: string, storageDir: string) {
  const child = spawn(process.execPath, ["dist/index.js"], {
    cwd: workerRoot,
    env: {
      ...process.env,
      DB_FILE: dbFile,
      STORAGE_DIR: storageDir,
      WORKER_POLL_INTERVAL_MS: "150",
      WORKER_PROCESSING_DELAY_MS: "0",
    },
    stdio: "ignore",
  });

  return child;
}

async function waitForCompletion(db: DatabaseSync, jobIds: string[], timeoutMs: number) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const statuses = jobIds.map((jobId) =>
      db.prepare(`SELECT status FROM jobs WHERE id = ?`).get(jobId) as { status: string } | undefined,
    );
    if (statuses.every((entry) => entry && entry.status !== "queued" && entry.status !== "processing")) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error("Timed out while waiting for sample evaluation jobs to finish.");
}

function loadPreviousResults() {
  const latestPath = path.join(reportsRoot, "latest.json");
  if (!fs.existsSync(latestPath)) {
    return new Map<string, PreviousResult>();
  }

  const payload = JSON.parse(fs.readFileSync(latestPath, "utf-8")) as { results?: PreviousResult[] };
  return new Map((payload.results ?? []).map((result) => [result.id, result]));
}

function parseNoteCount(status: string, resultKind: string, previewText: string) {
  const match = previewText.match(/notes:\s*(\d+)/i);
  if (match) {
    return Number(match[1]);
  }

  if (status === "completed" && resultKind === "final" && previewText) {
    return previewText
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean).length;
  }

  return null;
}

function parsePromotionScore(previewText: string) {
  const match = previewText.match(/promotion:\s*([0-9.]+)/i);
  return match ? Number(match[1]) : null;
}

function parseRestCount(previewText: string) {
  const match = previewText.match(/rests:\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

function parseBarlineCount(previewText: string) {
  const match = previewText.match(/bars:\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

function buildMarkdownReport(results: EvaluationResult[], runId: string) {
  const categorySummary = ["clean", "draft", "fail"].map((category) => {
    const subset = results.filter((result) => result.category === category);
    const matched = subset.filter((result) => result.matchedExpectation).length;
    return `- ${category}: ${matched}/${subset.length} matched`;
  });

  const changed = results.filter((result) => result.changedSinceLastRun);
  const lines = [
    `# Module 5 Sample Report - ${runId}`,
    "",
    "## Summary",
    ...categorySummary,
    "",
    "## Changes Since Last Run",
    ...(changed.length
      ? changed.map(
          (result) =>
            `- ${result.id}: ${result.resultKind} | hash ${result.previewHash} | noteCount ${result.noteCount ?? "n/a"} | restCount ${result.restCount ?? "n/a"} | bars ${result.barlineCount ?? "n/a"}`,
        )
      : ["- No final/draft preview changes detected."]),
    "",
    "## Results",
    "| Sample | Category | Expected | Actual | Notes |",
    "| --- | --- | --- | --- | --- |",
    ...results.map(
      (result) =>
        `| ${result.id} | ${result.category} | ${result.expectedResultKind} | ${result.resultKind} | ${result.notes ?? ""} |`,
    ),
    "",
  ];

  return lines.join("\n");
}

async function main() {
  const manifest = loadManifest();
  const runId = buildRunId();
  const runRoot = path.join(runsRoot, runId);
  const storageDir = path.join(runRoot, "storage");
  const dbFile = path.join(runRoot, "samples.sqlite");
  fs.mkdirSync(storageDir, { recursive: true });
  fs.mkdirSync(historyRoot, { recursive: true });
  fs.mkdirSync(runsRoot, { recursive: true });

  const previous = loadPreviousResults();
  const db = initDb(dbFile);
  const jobIds = insertQueuedJobs(db, manifest);
  const worker = startWorkerProcess(dbFile, storageDir);

  try {
    await waitForCompletion(db, [...jobIds.values()], 60000);
  } finally {
    if (!worker.killed) {
      worker.kill("SIGTERM");
    }
  }

  const results: EvaluationResult[] = manifest.samples.map((sample) => {
    const jobId = jobIds.get(sample.id)!;
    const row = db.prepare(
      `
        SELECT status, result_kind, preview_text
        FROM jobs
        WHERE id = ?
      `,
    ).get(jobId) as { status: string; result_kind: string; preview_text: string | null };

    const previewText = row.preview_text ?? "";
    const previewHash = crypto.createHash("sha1").update(previewText).digest("hex").slice(0, 10);
    const previousResult = previous.get(sample.id);

    return {
      id: sample.id,
      category: sample.category,
      file: sample.file,
      expectedResultKind: sample.expectedResultKind,
      sourceKind: sample.sourceKind,
      status: row.status,
      resultKind: row.result_kind,
      matchedExpectation: row.status === "completed" && row.result_kind === sample.expectedResultKind,
      previewHash,
      previewText,
      noteCount: parseNoteCount(row.status, row.result_kind, previewText),
      restCount: parseRestCount(previewText),
      barlineCount: parseBarlineCount(previewText),
      promotionScore: parsePromotionScore(previewText),
      changedSinceLastRun:
        previousResult !== undefined &&
        (previousResult.status !== row.status ||
          previousResult.resultKind !== row.result_kind ||
          previousResult.previewHash !== previewHash),
      notes: sample.notes,
    };
  });

  const jsonPayload = {
    generatedAt: nowIso(),
    runId,
    results,
    summary: {
      total: results.length,
      matched: results.filter((result) => result.matchedExpectation).length,
      cleanFinal: results.filter((result) => result.category === "clean" && result.resultKind === "final").length,
      draftDraft: results.filter((result) => result.category === "draft" && result.resultKind === "draft").length,
      failNonFinal: results.filter((result) => result.category === "fail" && result.resultKind !== "final").length,
    },
  };
  const markdown = buildMarkdownReport(results, runId);

  const latestJsonPath = path.join(reportsRoot, "latest.json");
  const latestMarkdownPath = path.join(reportsRoot, "latest.md");
  const historyJsonPath = path.join(historyRoot, `${runId}.json`);
  const historyMarkdownPath = path.join(historyRoot, `${runId}.md`);

  fs.writeFileSync(latestJsonPath, JSON.stringify(jsonPayload, null, 2));
  fs.writeFileSync(latestMarkdownPath, markdown);
  fs.writeFileSync(historyJsonPath, JSON.stringify(jsonPayload, null, 2));
  fs.writeFileSync(historyMarkdownPath, markdown);

  console.log(`Sample evaluation complete: ${latestMarkdownPath}`);

  const mismatches = results.filter((result) => !result.matchedExpectation);
  if (mismatches.length > 0) {
    console.error(`Expectation mismatches: ${mismatches.map((result) => result.id).join(", ")}`);
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
