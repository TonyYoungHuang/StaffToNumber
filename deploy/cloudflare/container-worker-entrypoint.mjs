import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

const healthPort = Number(process.env.HEALTH_PORT ?? 8080);
const readinessFile = process.env.WORKER_RUNTIME_READY_FILE || "/tmp/scoretransposer/runtime/worker-ready.json";
let stopping = false;
let childExit = null;
let childError = null;
let child = null;
let restartTimer = null;
let restartAttempt = 0;
let lastChildStartAt = null;
const recentChildLogs = [];

async function downloadPrivateAsset(objectKey, targetPath) {
  if (!objectKey) return false;
  const client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT,
    credentials: process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
      ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
      : undefined,
  });
  const result = await client.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: objectKey }));
  if (!result.Body) throw new Error(`Private worker asset is empty: ${path.basename(targetPath)}`);
  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
  await pipeline(result.Body, fs.createWriteStream(targetPath, { mode: 0o600 }));
  return true;
}

const assetRoot = "/tmp/scoretransposer/private-assets";
if (await downloadPrivateAsset(process.env.SOUNDFONT_OBJECT_KEY, path.join(assetRoot, "soundfont.sf2"))) {
  process.env.SOUNDFONT_PATH = path.join(assetRoot, "soundfont.sf2");
}
if (await downloadPrivateAsset(process.env.SOUNDFONT_LICENSE_OBJECT_KEY, path.join(assetRoot, "soundfont-license-manifest.json"))) {
  process.env.SOUNDFONT_LICENSE_MANIFEST = path.join(assetRoot, "soundfont-license-manifest.json");
}

process.env.WORKER_RUNTIME_READY_FILE = readinessFile;
await fs.promises.rm(readinessFile, { force: true });

function redactLogLine(value) {
  return value
    .replace(/(postgres(?:ql)?|redis(?:s)?):\/\/[^\s]+/gi, "$1://[redacted]")
    .replace(/(password|token|secret|key)=([^\s&]+)/gi, "$1=[redacted]")
    .slice(0, 1000);
}

function captureChildOutput(stream, label) {
  let pending = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    pending += chunk;
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      recentChildLogs.push(`${label}: ${redactLogLine(line)}`);
      if (recentChildLogs.length > 30) recentChildLogs.shift();
    }
  });
  stream.on("close", () => {
    if (!pending.trim()) return;
    recentChildLogs.push(`${label}: ${redactLogLine(pending)}`);
    if (recentChildLogs.length > 30) recentChildLogs.shift();
    pending = "";
  });
}

function scheduleChildRestart() {
  if (stopping || restartTimer) return;
  restartAttempt += 1;
  const delayMs = Math.min(30_000, 1000 * (2 ** Math.min(restartAttempt - 1, 5)));
  restartTimer = setTimeout(() => {
    restartTimer = null;
    startChild();
  }, delayMs);
}

function startChild() {
  if (stopping) return;
  childExit = null;
  childError = null;
  lastChildStartAt = new Date().toISOString();
  child = spawn(process.execPath, ["services/worker/dist/index.js"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  captureChildOutput(child.stdout, "stdout");
  captureChildOutput(child.stderr, "stderr");
  child.once("exit", (code, signal) => {
    childExit = { code, signal, at: new Date().toISOString() };
    void fs.promises.rm(readinessFile, { force: true });
    scheduleChildRestart();
  });
  child.once("error", (error) => {
    childError = error instanceof Error ? error.message : String(error);
    scheduleChildRestart();
  });
}

startChild();

function readRuntimeReadiness() {
  try {
    const readiness = JSON.parse(fs.readFileSync(readinessFile, "utf8"));
    return readiness && typeof readiness === "object" ? readiness : null;
  } catch {
    return null;
  }
}

const server = http.createServer((request, response) => {
  const requestPath = new URL(request.url || "/", "http://container").pathname;
  const probe = requestPath.split("/").filter(Boolean).at(-1);
  if (probe !== "health" && probe !== "ping" && probe !== "ready") {
    response.writeHead(404, { "content-type": "application/json", "cache-control": "no-store" });
    response.end(JSON.stringify({ error: "Not found." }));
    return;
  }
  const childRunning = child !== null && childExit === null && child.exitCode === null && childError === null;
  const readiness = childRunning ? readRuntimeReadiness() : null;
  const ready = childRunning && readiness !== null;
  if (ready) restartAttempt = 0;
  const readinessRequest = probe === "ready";
  const available = readinessRequest ? ready : true;
  const status = ready ? "ready" : childRunning ? "starting" : "failed";
  response.writeHead(available ? 200 : 503, { "content-type": "application/json", "cache-control": "no-store" });
  response.end(JSON.stringify({
    status,
    service: "music-worker",
    databasePrimary: readiness?.databasePrimary || process.env.RUNTIME_DATABASE_PRIMARY || "unknown",
    databaseSchema: readiness?.databaseSchema || process.env.POSTGRES_SCHEMA || "unknown",
    broker: readiness?.broker || process.env.JOB_BROKER_BACKEND || "unknown",
    readyAt: readiness?.readyAt || null,
    dependencies: {
      database: ready ? "ready" : childRunning ? "checking" : "unknown",
      broker: ready ? "ready" : childRunning ? "checking" : "unknown",
    },
    childExit,
    childError,
    restartAttempt,
    lastChildStartAt,
    recentChildLogs: ready ? [] : recentChildLogs.slice(-12),
  }));
});

server.listen(healthPort, "0.0.0.0");

function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  if (restartTimer) clearTimeout(restartTimer);
  server.close();
  if (child?.exitCode === null) child.kill(signal);
  const timer = setTimeout(() => {
    if (child?.exitCode === null) child.kill("SIGKILL");
    process.exit(1);
  }, 15_000);
  timer.unref();
  if (child) child.once("exit", () => process.exit(0));
  else process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
