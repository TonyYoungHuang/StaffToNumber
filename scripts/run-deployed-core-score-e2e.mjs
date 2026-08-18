import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const apiUrl = (process.env.CORE_E2E_API_URL ?? "https://api-staging.scoretransposer.com").replace(/\/$/u, "");
const accountFile = path.resolve(process.env.CORE_E2E_ACCOUNT_FILE ?? ".tmp/phase2-account.json");
const imageFile = path.resolve(process.env.CORE_E2E_IMAGE ?? ".tmp/candidate-review-runtime/storage/source.png");
const reportFile = path.resolve(process.env.CORE_E2E_REPORT ?? ".tmp/deployed-core-e2e-report.json");
const timeoutMinutes = Number(process.env.CORE_E2E_TIMEOUT_MINUTES ?? "25");
const requestTimeoutMs = Number(process.env.CORE_E2E_REQUEST_TIMEOUT_MS ?? "300000");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function redact(text) {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+/giu, "Bearer [redacted]")
    .replace(/\b(?:sk|rk|whsec|re)_[A-Za-z0-9_]+\b/gu, "[redacted]")
    .slice(0, 1_000);
}

function findNote(scoreJson, eventId) {
  const events = scoreJson?.measures?.flatMap((measure) => measure.events ?? []) ?? [];
  return events.find((event) => event?.type === "note" && (!eventId || event.id === eventId));
}

function stage(report, name, details = {}) {
  const result = { name, completedAt: new Date().toISOString(), ...details };
  report.stages.push(result);
  console.log(`PASS ${name}${details.summary ? `: ${details.summary}` : ""}`);
  return result;
}

async function main() {
  assert(Number.isFinite(timeoutMinutes) && timeoutMinutes > 0, "CORE_E2E_TIMEOUT_MINUTES must be positive.");
  const startedAt = new Date().toISOString();
  const report = {
    schemaVersion: 1,
    status: "running",
    environment: apiUrl.includes("staging") ? "staging" : "custom",
    apiUrl,
    startedAt,
    stages: [],
  };

  let token = "";
  const request = async (pathname, options = {}) => {
    const headers = new Headers(options.headers);
    if (token) headers.set("authorization", `Bearer ${token}`);
    if (options.body !== undefined && !(options.body instanceof FormData)) {
      headers.set("content-type", "application/json");
    }
    const response = await fetch(`${apiUrl}${pathname}`, {
      method: options.method ?? "GET",
      headers,
      body:
        options.body === undefined
          ? undefined
          : options.body instanceof FormData
            ? options.body
            : JSON.stringify(options.body),
      redirect: "manual",
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
    const expectedStatuses = options.expectedStatuses ?? [200];
    if (!expectedStatuses.includes(response.status)) {
      const body = redact(await response.text());
      throw new Error(`${options.method ?? "GET"} ${pathname} returned ${response.status}: ${body}`);
    }
    if (options.binary) return Buffer.from(await response.arrayBuffer());
    return response.json();
  };

  try {
    const account = JSON.parse(await readFile(accountFile, "utf8"));
    assert(typeof account.token === "string" && account.token.length > 20, "The temporary E2E account file does not contain a valid token.");
    token = account.token;

    const readiness = await request("/__edge/readiness");
    assert(readiness?.ready === true || readiness?.status === "ready", "The deployed edge readiness endpoint is not ready.");
    stage(report, "deployed readiness", { summary: "API, worker dependencies, and edge gateway are ready" });

    const image = await readFile(imageFile);
    assert(image.length > 0, "The E2E source image is empty.");
    const form = new FormData();
    form.set("file", new Blob([image], { type: "image/png" }), path.basename(imageFile));
    const imported = await request("/api/scores/import/omr", {
      method: "POST",
      body: form,
      expectedStatuses: [201],
    });
    assert(typeof imported?.score?.id === "string", "OMR import did not return a score document id.");
    assert(typeof imported?.job?.id === "string", "OMR import did not return a job id.");
    report.scoreId = imported.score.id;
    report.jobId = imported.job.id;
    stage(report, "image upload", { summary: `${image.length} bytes accepted as an OMR source` });

    const deadline = Date.now() + timeoutMinutes * 60_000;
    let terminalJob;
    let jobsPayload;
    let lastProgress = "";
    while (Date.now() < deadline) {
      jobsPayload = await request(`/api/scores/${report.scoreId}/jobs`);
      const current = jobsPayload?.jobs?.find((job) => job.id === report.jobId);
      assert(current, "The deployed API lost the OMR job after accepting the upload.");
      const progress = `${current.status}:${current.progressPercent ?? 0}`;
      if (progress !== lastProgress) {
        console.log(`OMR ${current.status} ${current.progressPercent ?? 0}%`);
        lastProgress = progress;
      }
      if (["completed", "failed", "cancelled"].includes(current.status)) {
        terminalJob = current;
        break;
      }
      await sleep(5_000);
    }
    assert(terminalJob, `OMR did not finish within ${timeoutMinutes} minutes.`);
    assert(terminalJob.status === "completed", `OMR ended with ${terminalJob.status}: ${terminalJob.errorMessage ?? "no error message"}`);
    const omrDiagnostics = Array.isArray(jobsPayload?.omrDiagnostics) ? jobsPayload.omrDiagnostics : [];
    stage(report, "Audiveris OMR", {
      summary: `completed after ${terminalJob.attemptCount ?? 1} attempt(s)`,
      resultRevisionId: terminalJob.resultRevisionId ?? null,
      diagnosticCount: omrDiagnostics.length,
    });

    const candidatePreview = await request(`/api/scores/${report.scoreId}/candidate/musicxml-preview`);
    assert(typeof candidatePreview?.revisionId === "string", "Candidate review did not expose a revision id.");
    assert(candidatePreview?.musicXml?.includes("<score-partwise"), "Candidate review did not expose valid MusicXML.");
    stage(report, "candidate review", {
      summary: `${Buffer.byteLength(candidatePreview.musicXml, "utf8")} MusicXML bytes are reviewable`,
      candidateRevisionId: candidatePreview.revisionId,
    });

    const accepted = await request(`/api/scores/${report.scoreId}/candidate/accept`, {
      method: "POST",
      body: { pendingRevisionId: candidatePreview.revisionId },
    });
    const acceptedScoreJson = accepted?.revision?.scoreJson;
    const recognition = acceptedScoreJson?.recognitionLayer;
    assert(recognition?.engine === "audiveris", "Accepted score does not contain Audiveris recognition provenance.");
    assert(Array.isArray(recognition.symbols), "Accepted score does not contain a recognition symbol collection.");
    const recognizedSymbols = recognition.symbols;
    const gradedSymbols = recognizedSymbols.filter((symbol) => Number.isFinite(symbol.confidence));
    const firstNote = findNote(acceptedScoreJson);
    assert(firstNote, "Accepted score does not contain an editable note.");
    report.recognition = {
      engine: recognition.engine,
      engineVersion: recognition.engineVersion ?? null,
      pageCount: recognition.pages?.length ?? 0,
      symbolCount: recognizedSymbols.length,
      confidenceCount: gradedSymbols.length,
      diagnosticCount: omrDiagnostics.length,
    };
    stage(report, "candidate acceptance", {
      summary: `${acceptedScoreJson.metadata.noteCount} notes accepted with Audiveris provenance`,
      recognition: report.recognition,
    });

    const originalOctave = firstNote.pitch.octave;
    const editedOctave = originalOctave < 9 ? originalOctave + 1 : originalOctave - 1;
    const edited = await request(`/api/scores/${report.scoreId}/edit/note`, {
      method: "POST",
      body: { eventId: firstNote.id, octave: editedOctave },
      expectedStatuses: [201],
    });
    const editedNote = findNote(edited?.revision?.scoreJson, firstNote.id);
    assert(editedNote?.pitch?.octave === editedOctave, "The note edit endpoint returned success without changing the selected note.");
    stage(report, "structured score edit", {
      summary: `note ${firstNote.id} octave changed from ${originalOctave} to ${editedOctave}`,
      revisionId: edited.revision.id,
    });

    const transposed = await request(`/api/scores/${report.scoreId}/transpose`, {
      method: "POST",
      body: { semitones: 2, useMusic21: true, spellingPolicy: "auto" },
      expectedStatuses: [201],
    });
    assert(
      transposed?.transposeEngine === "music21",
      `Requested music21 but deployed API used ${transposed?.transposeEngine ?? "no engine"}: ${
        Array.isArray(transposed?.transposeWarnings) && transposed.transposeWarnings.length > 0
          ? transposed.transposeWarnings.join(" | ")
          : "no server warning"
      }`,
    );
    assert(findNote(transposed?.revision?.scoreJson, firstNote.id), "Transposition did not preserve an editable note in the new revision.");
    report.transpose = { engine: transposed.transposeEngine, semitones: 2, warnings: transposed.transposeWarnings ?? [] };
    stage(report, "music21 transposition", { summary: "+2 semitones completed by music21", revisionId: transposed.revision.id });

    const playbackPayload = await request(`/api/scores/${report.scoreId}/playback`);
    const playback = playbackPayload?.playback;
    assert(Array.isArray(playback?.events) && playback.events.length > 0, "Playback generation returned no note events.");
    assert(Number.isFinite(playback.totalBeats) && playback.totalBeats > 0, "Playback generation returned an invalid duration.");
    report.playback = {
      eventCount: playback.events.length,
      totalBeats: playback.totalBeats,
      tempoBpm: playback.tempoBpm,
      partCount: playback.parts?.length ?? 0,
    };
    stage(report, "playback generation", { summary: `${playback.events.length} timed note events across ${report.playback.partCount} part(s)` });

    const exportChecks = [
      { name: "MusicXML", route: "musicxml", magic: (buffer) => buffer.toString("utf8", 0, Math.min(buffer.length, 4_096)).includes("<score-partwise") },
      { name: "MIDI", route: "midi", magic: (buffer) => buffer.subarray(0, 4).toString("ascii") === "MThd" },
      { name: "WAV", route: "audio/wav", magic: (buffer) => buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WAVE" },
      { name: "PDF", route: "pdf", magic: (buffer) => buffer.subarray(0, 5).toString("ascii") === "%PDF-" },
    ];
    report.exports = [];
    for (const check of exportChecks) {
      const created = await request(`/api/scores/${report.scoreId}/export/${check.route}`, {
        method: "POST",
        body: {},
        expectedStatuses: [201],
      });
      assert(typeof created?.file?.id === "string", `${check.name} export did not return a stored file id.`);
      const downloaded = await request(`/api/files/${created.file.id}/download`, { binary: true });
      assert(downloaded.length > 0, `${check.name} export downloaded as an empty file.`);
      assert(check.magic(downloaded), `${check.name} export failed its file signature check.`);
      const evidence = {
        format: check.name,
        fileId: created.file.id,
        originalName: created.file.originalName,
        sizeBytes: downloaded.length,
        sha256: sha256(downloaded),
      };
      report.exports.push(evidence);
      stage(report, `${check.name} export`, { summary: `${downloaded.length} bytes, signature verified` });
    }

    report.status = "passed";
    report.completedAt = new Date().toISOString();
    report.durationSeconds = Math.round((Date.parse(report.completedAt) - Date.parse(startedAt)) / 1_000);
    await writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`PASS deployed core score E2E in ${report.durationSeconds}s`);
    console.log(`Report: ${reportFile}`);
  } catch (error) {
    report.status = "failed";
    report.completedAt = new Date().toISOString();
    report.error = redact(errorMessage(error));
    await writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.error(`FAIL deployed core score E2E: ${report.error}`);
    console.error(`Report: ${reportFile}`);
    process.exitCode = 1;
  }
}

await main();
