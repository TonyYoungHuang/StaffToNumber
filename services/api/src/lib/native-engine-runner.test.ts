import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createNativeEngineClock, isManagedMusicEngine, runNativeEngine } from "./native-engine-runner.js";

test("managed engine execution budget starts after admission, including a split marker", context => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let timedOut = false;
  const clock = createNativeEngineClock({ managed: true, timeoutMs: 120, onTimeout: () => { timedOut = true; } });
  context.mock.timers.tick(10_000);
  assert.equal(timedOut, false, "time spent in the semaphore queue must not consume the native execution budget");
  let diagnostics = clock.stderr("before admission\nSCORE_ENGINE_STA");
  context.mock.timers.tick(10_000);
  assert.equal(timedOut, false);
  diagnostics += clock.stderr("RTED\nengine warning\n");
  assert.equal(diagnostics, "before admission\nengine warning\n");
  context.mock.timers.tick(119);
  assert.equal(timedOut, false);
  context.mock.timers.tick(1);
  assert.equal(timedOut, true, "a stalled engine must still exhaust its own execution budget");
  assert.equal(clock.finish(), "");
});

test("unmanaged commands retain an immediate bounded timeout", context => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let timedOut = false;
  const clock = createNativeEngineClock({ managed: false, timeoutMs: 50, onTimeout: () => { timedOut = true; } });
  assert.equal(clock.stderr("ordinary diagnostics\n"), "ordinary diagnostics\n");
  context.mock.timers.tick(50);
  assert.equal(timedOut, true);
  clock.finish();
});

test("finishing an admitted or cancelled waiter clears timers and preserves trailing diagnostics", context => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let timeouts = 0;
  const queued = createNativeEngineClock({ managed: true, timeoutMs: 50, onTimeout: () => { timeouts += 1; } });
  assert.equal(queued.stderr("wrapper error"), "");
  assert.equal(queued.finish(), "wrapper error");
  queued.stderr("SCORE_ENGINE_STARTED\n");
  const running = createNativeEngineClock({ managed: true, timeoutMs: 50, onTimeout: () => { timeouts += 1; } });
  running.stderr("SCORE_ENGINE_STARTED\n");
  running.finish();
  context.mock.timers.tick(1000);
  assert.equal(timeouts, 0);
});

test("only the deployed protocol wrappers opt into admission-aware deadlines", () => {
  assert.equal(isManagedMusicEngine("/usr/local/bin/score-musescore", "linux"), true);
  assert.equal(isManagedMusicEngine("/usr/local/bin/score-music21", "linux"), true);
  assert.equal(isManagedMusicEngine("/usr/local/bin/score-homr", "linux"), true);
  assert.equal(isManagedMusicEngine("/usr/bin/python3", "linux"), false);
  assert.equal(isManagedMusicEngine("/usr/bin/ffmpeg", "linux"), false);
  assert.equal(isManagedMusicEngine("score-musescore", "win32"), false);
});

test("native runner captures output, rejects failures, times out, and handles cancellation", async () => {
  const result = await runNativeEngine({ command: process.execPath, args: ["-e", "process.stdout.write('ok'); process.stderr.write('warning')"], label: "fixture", timeoutMs: 3000 });
  assert.deepEqual(result, { stdout: "ok", stderr: "warning" });
  await assert.rejects(runNativeEngine({ command: process.execPath, args: ["-e", "process.stderr.write('failed'); process.exit(7)"], label: "fixture", timeoutMs: 3000 }), /fixture exited with code 7\. failed/u);
  await assert.rejects(runNativeEngine({ command: process.execPath, args: ["-e", "setInterval(() => {}, 1000)"], label: "fixture", timeoutMs: 100 }), /fixture timed out after 100 ms/u);
  const controller = new AbortController();
  const pending = runNativeEngine({ command: process.execPath, args: ["-e", "setInterval(() => {}, 1000)"], label: "fixture", timeoutMs: 3000, signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, /fixture was cancelled/u);
});

test("a real managed wrapper can wait longer than its execution timeout", { skip: process.platform === "win32" }, async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "score-api-engine-clock-"));
  const command = path.join(directory, "score-musescore");
  try {
    await fs.writeFile(command, `#!/bin/sh\nsleep 0.4\nprintf 'SCORE_ENGINE_STARTED\\n' >&2\nexec '${process.execPath.replaceAll("'", "'\\''")}' -e "process.stderr.write('native warning'); process.stdout.write('rendered')"\n`, { mode: 0o755 });
    const result = await runNativeEngine({ command, args: [], label: "MuseScore", timeoutMs: 200 });
    assert.deepEqual(result, { stdout: "rendered", stderr: "native warning" });
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("the production semaphore wrapper waits for occupied slots without using the API execution budget", {
  skip: process.platform === "win32" || !process.env.SCORE_TEST_ENGINE_COMMAND,
}, async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "score-api-production-pool-"));
  const previousDirectory = process.env.MUSIC_ENGINE_LOCK_DIR;
  const previousCapacity = process.env.MUSIC_ENGINE_MAX_CONCURRENCY;
  process.env.MUSIC_ENGINE_LOCK_DIR = directory;
  process.env.MUSIC_ENGINE_MAX_CONCURRENCY = "1";
  const command = process.env.SCORE_TEST_ENGINE_COMMAND!;
  const holder = spawn(command, ["hold"], { env: { ...process.env, SCORE_ENGINE_START_NOTIFY: "1" }, stdio: ["ignore", "ignore", "pipe"] });
  const holderDone = new Promise<void>((resolve, reject) => {
    holder.on("error", reject);
    holder.on("close", code => { if (code === 0) resolve(); else reject(new Error(`slot holder exited with ${code}`)); });
  });
  // Handle an early holder failure while waiting for the admission marker.
  void holderDone.catch(() => undefined);
  try {
    await new Promise<void>((resolve, reject) => {
      let stderr = "";
      const timer = setTimeout(() => reject(new Error("slot holder never announced admission")), 3000);
      holder.stderr.on("data", chunk => {
        stderr += String(chunk);
        if (stderr.includes("SCORE_ENGINE_STARTED\n")) { clearTimeout(timer); resolve(); }
      });
      holderDone.catch(error => { clearTimeout(timer); reject(error); });
    });
    const started = Date.now();
    const result = await runNativeEngine({ command, args: ["complete"], label: "MuseScore", timeoutMs: 200 });
    assert.ok(Date.now() - started > 200, "the occupied pool must have kept this API process queued beyond its execution budget");
    assert.equal(result.stdout.trim(), "rendered");
    assert.equal(result.stderr, "");
    await holderDone;
    await assert.rejects(runNativeEngine({ command, args: ["stall"], label: "MuseScore", timeoutMs: 100 }), /MuseScore timed out after 100 ms/u);
    const recovered = await runNativeEngine({ command, args: ["complete"], label: "MuseScore", timeoutMs: 200 });
    assert.equal(recovered.stdout.trim(), "rendered", "killing the native process group must release its semaphore slots");
  } finally {
    holder.kill("SIGKILL");
    if (previousDirectory === undefined) delete process.env.MUSIC_ENGINE_LOCK_DIR;
    else process.env.MUSIC_ENGINE_LOCK_DIR = previousDirectory;
    if (previousCapacity === undefined) delete process.env.MUSIC_ENGINE_MAX_CONCURRENCY;
    else process.env.MUSIC_ENGINE_MAX_CONCURRENCY = previousCapacity;
    await fs.rm(directory, { recursive: true, force: true });
  }
});
