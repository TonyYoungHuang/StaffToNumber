import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runBoundedProcess } from "./bounded-process-runner.js";

test("captured engine output cannot grow beyond the configured combined limit", async () => {
  await assert.rejects(runBoundedProcess({ command: process.execPath, args: ["-e", "setInterval(()=>{process.stdout.write('x'.repeat(8192));process.stderr.write('y'.repeat(8192))},1)"],
    label: "noisy engine", timeoutMs: 3000, outputLimitBytes: 32_768 }), /output limit/u);
});

test("timeout waits for the engine and its descendant process tree to stop", { timeout: 10_000 }, async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bounded-tree-"));
  const pidFile = path.join(directory, "child.pid");
  const script = `const child=require('node:child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)']);require('node:fs').writeFileSync(process.argv[1],String(child.pid));setInterval(()=>{},1000);`;
  try {
    await assert.rejects(runBoundedProcess({ command: process.execPath, args: ["-e", script, pidFile], label: "tree engine", timeoutMs: 500 }), /timed out/u);
    const pid = Number(fs.readFileSync(pidFile, "utf8"));
    let running = false;
    try {
      process.kill(pid, 0);
      running = process.platform !== "linux" || !/\) Z /u.test(fs.readFileSync(`/proc/${pid}/stat`, "utf8"));
    } catch { /* No live descendant. */ }
    assert.equal(running, false);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
