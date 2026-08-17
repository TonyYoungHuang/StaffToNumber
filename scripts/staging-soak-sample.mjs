import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const samplePath = path.resolve(root, process.env.STAGING_SOAK_SAMPLE_PATH || ".tmp/staging-soak/samples.jsonl");
const statusPath = path.resolve(root, process.env.STAGING_SOAK_STATUS_PATH || "artifacts/staging-soak-status.json");
const evidencePath = path.resolve(root, process.env.STAGING_SOAK_EVIDENCE_PATH || "docs/audits/evidence/staging-soak-7-day.json");
const timeoutMs = positiveInteger(process.env.STAGING_SOAK_TIMEOUT_MS, 20_000);
const finalize = process.argv.includes("--finalize");
const endpoints = [
  ["public", "https://staging.scoretransposer.com/"],
  ["app", "https://app-staging.scoretransposer.com/"],
  ["edge-health", "https://api-staging.scoretransposer.com/__edge/health"],
  ["api-health", "https://api-staging.scoretransposer.com/health"],
  ["aggregate-readiness", "https://api-staging.scoretransposer.com/__edge/readiness"],
  ["collaboration-health", "https://collab-staging.scoretransposer.com/health"],
];

fs.mkdirSync(path.dirname(samplePath), { recursive: true });
const sampledAt = new Date().toISOString();
const checks = await Promise.all(endpoints.map(([name, url]) => probe(name, url)));
const sample = { schemaVersion: 1, sampledAt, passed: checks.every((item) => item.passed), checks };
fs.appendFileSync(samplePath, `${JSON.stringify(sample)}\n`, "utf8");

const samples = fs.readFileSync(samplePath, "utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
const status = summarize(samples);
fs.mkdirSync(path.dirname(statusPath), { recursive: true });
fs.writeFileSync(statusPath, `${JSON.stringify(status, null, 2)}\n`, "utf8");
console.log(`Staging soak sample ${sample.passed ? "passed" : "failed"}; ${status.successfulSamples}/${status.minimumSuccessfulSamples} successful samples across ${status.elapsedHours} hours.`);

if (finalize) {
  if (!status.acceptancePassed) {
    console.error(`Seven-day soak remains in progress. Earliest completion requires 168 real elapsed hours; current elapsed time is ${status.elapsedHours} hours.`);
    process.exitCode = 1;
  } else {
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    fs.writeFileSync(evidencePath, `${JSON.stringify({ ...status, finalizedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
    console.log(`Seven-day soak evidence finalized: ${evidencePath}`);
  }
} else if (!sample.passed) {
  process.exitCode = 1;
}

async function probe(name, url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const response = await fetch(url, { redirect: "follow", signal: controller.signal, headers: { "user-agent": "ScoreTransposer-Staging-Soak/1.0" } });
    const body = (await response.text()).slice(0, 4_096);
    const readiness = name !== "aggregate-readiness" || /"(?:ready|ok)"\s*:\s*true|"status"\s*:\s*"(?:ready|ok|healthy)"/iu.test(body);
    return { name, url, status: response.status, durationMs: Math.round(performance.now() - started), passed: response.ok && readiness };
  } catch (error) {
    return { name, url, status: null, durationMs: Math.round(performance.now() - started), passed: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

function summarize(samples) {
  const times = samples.map((item) => Date.parse(item.sampledAt)).filter(Number.isFinite).sort((a, b) => a - b);
  const gaps = times.slice(1).map((time, index) => (time - times[index]) / 60_000);
  const elapsedHours = times.length > 1 ? Number(((times.at(-1) - times[0]) / 3_600_000).toFixed(2)) : 0;
  const successfulSamples = samples.filter((item) => item.passed).length;
  const failedSamples = samples.length - successfulSamples;
  const maximumGapMinutes = gaps.length ? Number(Math.max(...gaps).toFixed(2)) : 0;
  const minimumSuccessfulSamples = 160;
  const acceptancePassed = elapsedHours >= 168 && successfulSamples >= minimumSuccessfulSamples && failedSamples === 0 && maximumGapMinutes <= 90;
  return {
    schemaVersion: 1,
    startedAt: times.length ? new Date(times[0]).toISOString() : null,
    lastSampleAt: times.length ? new Date(times.at(-1)).toISOString() : null,
    elapsedHours,
    totalSamples: samples.length,
    successfulSamples,
    failedSamples,
    minimumSuccessfulSamples,
    maximumGapMinutes,
    maximumAllowedGapMinutes: 90,
    requiredElapsedHours: 168,
    acceptancePassed,
    endpointNames: endpoints.map(([name]) => name),
  };
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
