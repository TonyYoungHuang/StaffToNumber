import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { AudiverisProcessError, runAudiverisCommand } from "./audiveris-runner.js";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "audiveris-runner-"));
const mockScript = path.join(tempDir, "mock-audiveris.cjs");
fs.writeFileSync(mockScript, `
const mode = process.argv[2];
if (mode === "success") { process.stdout.write("exported"); process.exit(0); }
if (mode === "failure") { process.stderr.write("invalid score image"); process.exit(7); }
setInterval(() => {}, 1000);
`, "utf8");

after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

function run(mode: string, overrides: Partial<Parameters<typeof runAudiverisCommand>[0]> = {}) {
  return runAudiverisCommand({
    command: process.execPath,
    commandArgsPrefix: [mockScript, mode],
    inputPath: path.join(tempDir, "source.pdf"),
    outputDir: tempDir,
    timeoutMs: 2_000,
    cancellationPollMs: 25,
    ...overrides,
  });
}

test("captures a successful Audiveris command", async () => {
  const result = await run("success");
  assert.equal(result.stdout, "exported");
  assert.equal(result.stderr, "");
});

test("classifies a non-zero Audiveris exit", async () => {
  await assert.rejects(run("failure"), (error: unknown) => {
    assert.ok(error instanceof AudiverisProcessError);
    assert.equal(error.reason, "exit");
    assert.equal(error.exitCode, 7);
    assert.match(error.message, /invalid score image/u);
    return true;
  });
});

test("terminates and classifies an Audiveris timeout", async () => {
  await assert.rejects(run("wait", { timeoutMs: 100 }), (error: unknown) => {
    assert.ok(error instanceof AudiverisProcessError);
    assert.equal(error.reason, "timeout");
    return true;
  });
});

test("terminates Audiveris after a persisted cancellation is observed", async () => {
  let cancelled = false;
  setTimeout(() => { cancelled = true; }, 75);
  await assert.rejects(run("wait", { isCancelled: () => cancelled }), (error: unknown) => {
    assert.ok(error instanceof AudiverisProcessError);
    assert.equal(error.reason, "cancelled");
    return true;
  });
});
