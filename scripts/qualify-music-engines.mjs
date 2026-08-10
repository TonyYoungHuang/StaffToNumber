import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const generatedAt = new Date().toISOString();
const required = process.env.MUSIC_ENGINE_QUALIFICATION_REQUIRED === "true";
const timeoutMs = positiveInteger(process.env.MUSIC_ENGINE_QUALIFICATION_TIMEOUT_MS, 30_000);
const reportPath = path.resolve(root, process.env.MUSIC_ENGINE_QUALIFICATION_REPORT || "artifacts/music-engine-qualification.json");

const tools = [
  tool("audiveris", "Audiveris", "AUDIVERIS_COMMAND", ["-version"]),
  tool("music21", "music21", "MUSIC21_COMMAND", ["-c", "import json, music21; print(json.dumps({'version': music21.__version__}))"]),
  tool("musescore", "MuseScore", "MUSESCORE_COMMAND", ["--version"]),
  tool("fluidsynth", "FluidSynth", "FLUIDSYNTH_COMMAND", ["--version"]),
  tool("ffmpeg", "ffmpeg", "FFMPEG_COMMAND", ["-version"]),
  tool("ffprobe", "ffprobe", "FFPROBE_COMMAND", ["-version"]),
  tool("basic-pitch", "Basic Pitch", "BASIC_PITCH_COMMAND", ["--help"]),
  tool("yt-dlp", "yt-dlp", "YT_DLP_COMMAND", ["--version"]),
];

const toolResults = [];
for (const definition of tools) {
  toolResults.push(await qualifyTool(definition));
}

const soundFont = qualifySoundFont(process.env.SOUNDFONT_LICENSE_MANIFEST || "");
const failures = [
  ...toolResults.filter((result) => result.status !== "passed").map((result) => `${result.id}: ${result.reason}`),
  ...(soundFont.status === "passed" ? [] : [`soundfont: ${soundFont.reason}`]),
];
const report = {
  schemaVersion: 1,
  generatedAt,
  required,
  complete: failures.length === 0,
  timeoutMs,
  platform: { platform: process.platform, arch: process.arch, node: process.version },
  tools: toolResults,
  soundFont,
  failures,
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Music engine qualification ${report.complete ? "passed" : "incomplete"}; report: ${reportPath}`);
for (const failure of failures) console.log(`- ${failure}`);

if (required && !report.complete) process.exitCode = 1;

function tool(id, label, envName, args) {
  return { id, label, envName, command: process.env[envName]?.trim() || "", args };
}

async function qualifyTool(definition) {
  if (!definition.command) {
    return result(definition, "missing", `${definition.envName} is not configured.`);
  }

  const startedAt = Date.now();
  try {
    const execution = await run(definition.command, definition.args, timeoutMs);
    const output = sanitizeOutput(`${execution.stdout}\n${execution.stderr}`);
    if (execution.timedOut) {
      return result(definition, "failed", `Timed out after ${timeoutMs} ms.`, Date.now() - startedAt, output);
    }
    if (execution.exitCode !== 0) {
      return result(definition, "failed", `Exited with code ${execution.exitCode}.`, Date.now() - startedAt, output);
    }
    return result(definition, "passed", null, Date.now() - startedAt, output);
  } catch (error) {
    return result(definition, "failed", error instanceof Error ? error.message : String(error), Date.now() - startedAt);
  }
}

function result(definition, status, reason, durationMs = 0, output = "") {
  return {
    id: definition.id,
    label: definition.label,
    envName: definition.envName,
    command: path.basename(definition.command || ""),
    status,
    reason,
    durationMs,
    output,
  };
}

function run(command, args, limitMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, windowsHide: true, env: process.env });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, limitMs);

    child.stdout?.on("data", (chunk) => { stdout = appendBounded(stdout, chunk); });
    child.stderr?.on("data", (chunk) => { stderr = appendBounded(stderr, chunk); });
    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (exitCode) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ exitCode, stdout, stderr, timedOut });
    });
  });
}

function qualifySoundFont(manifestValue) {
  if (!manifestValue.trim()) return { status: "missing", reason: "SOUNDFONT_LICENSE_MANIFEST is not configured." };
  const manifestPath = path.resolve(root, manifestValue);
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.soundFonts) || manifest.soundFonts.length === 0) {
      throw new Error("License manifest must use schemaVersion 1 and include at least one soundFonts entry.");
    }
    const entries = manifest.soundFonts.map((entry, index) => validateSoundFontEntry(entry, index, path.dirname(manifestPath)));
    const failed = entries.filter((entry) => entry.status !== "passed");
    return {
      status: failed.length === 0 ? "passed" : "failed",
      reason: failed.length === 0 ? null : `${failed.length} SoundFont license or checksum validation(s) failed.`,
      manifestPath,
      entries,
    };
  } catch (error) {
    return { status: "failed", reason: error instanceof Error ? error.message : String(error), manifestPath };
  }
}

function validateSoundFontEntry(entry, index, baseDir) {
  const errors = [];
  const name = text(entry?.name) || `entry-${index + 1}`;
  const filePath = text(entry?.path) ? path.resolve(baseDir, entry.path) : "";
  const expectedSha256 = text(entry?.sha256).toLowerCase();
  if (!filePath || !fs.existsSync(filePath)) errors.push("SoundFont file is missing.");
  if (!/^[a-f0-9]{64}$/.test(expectedSha256)) errors.push("sha256 must contain 64 lowercase hexadecimal characters.");
  if (!text(entry?.licenseId)) errors.push("licenseId is required.");
  if (!/^https:\/\//u.test(text(entry?.sourceUrl))) errors.push("sourceUrl must be an HTTPS URL.");
  if (entry?.commercialUseApproved !== true) errors.push("commercialUseApproved must be true.");
  if (!/^\d{4}-\d{2}-\d{2}T/u.test(text(entry?.reviewedAt))) errors.push("reviewedAt must be an ISO timestamp.");
  if (!text(entry?.reviewedBy)) errors.push("reviewedBy is required.");

  let actualSha256 = null;
  if (filePath && fs.existsSync(filePath)) {
    actualSha256 = createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
    if (/^[a-f0-9]{64}$/.test(expectedSha256) && actualSha256 !== expectedSha256) errors.push("SoundFont SHA-256 does not match the reviewed file.");
  }
  return { name, path: filePath, expectedSha256, actualSha256, licenseId: text(entry?.licenseId), status: errors.length === 0 ? "passed" : "failed", errors };
}

function appendBounded(current, chunk) {
  return `${current}${String(chunk)}`.slice(-16_384);
}

function sanitizeOutput(value) {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, "").trim().slice(0, 4_096);
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}
