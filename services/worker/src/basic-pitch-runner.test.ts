import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { AudiverisProcessError } from "./audiveris-runner.js";
import { runBasicPitch } from "./basic-pitch-runner.js";

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "basic-pitch-runner-"));
const mockCli = path.join(temporaryDirectory, "mock-cli.cjs");
fs.writeFileSync(mockCli, `
const fs = require("node:fs");
const options = JSON.parse(process.argv[2]);
fs.writeFileSync(options.pidFile, String(process.pid));
if (options.mode === "success") {
  process.stdout.write("transcribed MIDI");
  process.stderr.write("model diagnostic");
  process.exit(0);
}
if (options.mode === "failure") { process.stderr.write("invalid audio"); process.exit(7); }
if (options.childPidFile) {
  const child = require("node:child_process").spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"]);
  fs.writeFileSync(options.childPidFile, String(child.pid));
}
setInterval(() => {}, 1000);
`, "utf8");
after(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

function cancelled(error: unknown) {
  assert.ok(error instanceof AudiverisProcessError);
  assert.equal(error.reason, "cancelled");
  return true;
}

function launchedProcessHasStopped(pid: number) {
  try {
    process.kill(pid, 0);
    if (process.platform === "linux") {
      // A killed descendant can briefly remain a zombie until PID 1 reaps it.
      return /\) Z /u.test(fs.readFileSync(`/proc/${pid}/stat`, "utf8"));
    }
    return false;
  } catch { return true; }
}

test("Basic Pitch cancellation before launch never starts its CLI", async () => {
  const pidFile = path.join(temporaryDirectory, "prelaunch.pid");
  await assert.rejects(runBasicPitch({ command: process.execPath, timeoutMs: 2000, outputDir: mockCli,
    inputPath: JSON.stringify({ mode: "success", pidFile }), isCancelled: () => true }), cancelled);
  assert.equal(fs.existsSync(pidFile), false);
});

test("Basic Pitch captures successful CLI output", async () => {
  const result = await runBasicPitch({ command: process.execPath, timeoutMs: 2000, outputDir: mockCli,
    inputPath: JSON.stringify({ mode: "success", pidFile: path.join(temporaryDirectory, "success.pid") }), isCancelled: () => false });
  assert.deepEqual(result, { stdout: "transcribed MIDI", stderr: "model diagnostic" });
});

test("Basic Pitch running cancellation terminates the CLI and its Linux process group", { timeout: 5000 }, async () => {
  const pidFile = path.join(temporaryDirectory, "cancel.pid");
  const childPidFile = process.platform === "linux" ? path.join(temporaryDirectory, "cancel-child.pid") : undefined;
  await assert.rejects(runBasicPitch({ command: process.execPath, timeoutMs: 3000, outputDir: mockCli,
    inputPath: JSON.stringify({ mode: "wait", pidFile, childPidFile }),
    isCancelled: () => fs.existsSync(childPidFile ?? pidFile) }), cancelled);
  assert.equal(launchedProcessHasStopped(Number(fs.readFileSync(pidFile, "utf8"))), true);
  if (childPidFile) assert.equal(launchedProcessHasStopped(Number(fs.readFileSync(childPidFile, "utf8"))), true);
});

test("Basic Pitch still terminates an engine execution timeout", { timeout: 5000 }, async () => {
  const pidFile = path.join(temporaryDirectory, "timeout.pid");
  await assert.rejects(runBasicPitch({ command: process.execPath, timeoutMs: 250, outputDir: mockCli,
    inputPath: JSON.stringify({ mode: "wait", pidFile }), isCancelled: () => false }), /Basic Pitch timed out after 250 ms/u);
  assert.equal(launchedProcessHasStopped(Number(fs.readFileSync(pidFile, "utf8"))), true);
});

test("Basic Pitch reports failed CLI diagnostics", async () => {
  await assert.rejects(runBasicPitch({ command: process.execPath, timeoutMs: 2000, outputDir: mockCli,
    inputPath: JSON.stringify({ mode: "failure", pidFile: path.join(temporaryDirectory, "failure.pid") }), isCancelled: () => false }), /code 7.*invalid audio/u);
});

test("cancelled managed wrapper releases its queue without launching the audio engine", { skip: process.platform !== "linux", timeout: 5000 }, async () => {
  const wrapper = path.join(temporaryDirectory, "score-basic-pitch");
  const wrapperPid = path.join(temporaryDirectory, "wrapper.pid");
  const launched = path.join(temporaryDirectory, "engine-launched");
  // Simulate a wrapper waiting for an occupied shared pool. Admission would
  // occur after one second, well beyond the 20 ms execution budget.
  fs.writeFileSync(wrapper, `#!/bin/sh\nprintf '%s' "$$" > '${wrapperPid}'\nsleep 1\nprintf 'SCORE_ENGINE_STARTED\\n' >&2\nprintf started > '${launched}'\nexec '${process.execPath}' "$@"\n`, { mode: 0o755 });
  await assert.rejects(runBasicPitch({ command: wrapper, timeoutMs: 20, outputDir: mockCli,
    inputPath: JSON.stringify({ mode: "success", pidFile: path.join(temporaryDirectory, "queued-engine.pid") }),
    isCancelled: () => fs.existsSync(wrapperPid) }), cancelled);
  assert.equal(fs.existsSync(launched), false);
  assert.equal(launchedProcessHasStopped(Number(fs.readFileSync(wrapperPid, "utf8"))), true);
});
