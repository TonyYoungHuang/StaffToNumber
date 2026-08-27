import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { AudiverisProcessError, buildAudiverisEnvironment, runAudiverisCommand, runAudiverisWithRotationFallback } from "./audiveris-runner.js";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "audiveris-runner-"));
const mockScript = path.join(tempDir, "mock-audiveris.cjs");
fs.writeFileSync(mockScript, `
const mode = process.argv[2];
if (mode === "success") { process.stdout.write("exported"); process.exit(0); }
if (mode === "heap") { process.stdout.write(process.env.JAVA_TOOL_OPTIONS || ""); process.exit(0); }
if (mode === "failure") { process.stderr.write("invalid score image"); process.exit(7); }
if (mode === "rotation-fallback") {
  const inputPath = process.argv.at(-1);
  if (inputPath.includes("rotation-180")) { process.stdout.write("corrected"); process.exit(0); }
  process.stderr.write("wrong orientation"); process.exit(7);
}
setInterval(() => {}, 1000);
`, "utf8");
const mockConvertScript = path.join(tempDir, "mock-convert.cjs");
fs.writeFileSync(mockConvertScript, `
const fs = require("node:fs");
fs.copyFileSync(process.argv[2], process.argv.at(-1));
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

test("sets a bounded Audiveris heap without discarding other JVM options", async () => {
  assert.equal(
    buildAudiverisEnvironment(4096, { JAVA_TOOL_OPTIONS: "-Dfile.encoding=UTF-8 -XX:-ExitOnOutOfMemoryError -Xmx512m" }).JAVA_TOOL_OPTIONS,
    "-Dfile.encoding=UTF-8 -XX:+ExitOnOutOfMemoryError -Xmx4096m",
  );
  const result = await run("heap", { maxHeapMb: 2048 });
  assert.match(result.stdout, /(?:^|\s)-XX:\+ExitOnOutOfMemoryError(?:\s|$)/u);
  assert.match(result.stdout, /(?:^|\s)-Xmx2048m(?:\s|$)/u);
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

test("normalizes raster input and retries alternate orientations", async () => {
  const source = path.join(tempDir, "rotated.png");
  const outputDir = path.join(tempDir, "rotation-output");
  fs.writeFileSync(source, "fixture", "utf8");
  fs.mkdirSync(outputDir, { recursive: true });
  const result = await runAudiverisWithRotationFallback({
    command: process.execPath,
    commandArgsPrefix: [mockScript, "rotation-fallback"],
    imageMagickCommand: process.execPath,
    imageMagickCommandArgsPrefix: [mockConvertScript],
    inputPath: source,
    outputDir,
    timeoutMs: 2_000,
    cancellationPollMs: 25,
  });
  assert.equal(result.appliedRotationDegrees, 180);
  assert.equal(result.stdout, "corrected");
});
