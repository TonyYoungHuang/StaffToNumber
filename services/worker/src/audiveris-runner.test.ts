import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { AudiverisProcessError, buildAudiverisEnvironment, runAudiverisCommand, runAudiverisWithRotationFallback } from "./audiveris-runner.js";
import { findAudiverisMusicXmlOutput, findAudiverisProjectOutput } from "./audiveris-output.js";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "audiveris-runner-"));
const mockScript = path.join(tempDir, "mock-audiveris.cjs");
fs.writeFileSync(mockScript, `
const mode = process.argv[2];
if (mode === "success") { process.stdout.write("exported"); process.exit(0); }
if (mode === "heap") { process.stdout.write(process.env.JAVA_TOOL_OPTIONS || ""); process.exit(0); }
if (mode === "failure") { process.stderr.write("invalid score image"); process.exit(7); }
if (mode === "memory") { process.stderr.write("java.lang.OutOfMemoryError: Java heap space"); process.exit(3); }
if (mode === "stdout-diagnostic") { process.stdout.write("SCALE: no usable staff spacing detected"); process.stderr.write("Picked up JAVA_TOOL_OPTIONS: -Xmx768m"); process.exit(1); }
if (mode === "small-staff" || mode === "small-staff-wait") {
  const fs = require("node:fs"), path = require("node:path");
  const dir = path.dirname(process.argv.at(-1));
  const recovery = dir.includes("resolution-2");
  fs.writeFileSync(path.join(dir, recovery ? "recognized.xml" : "stale.xml"), '<score-partwise/>');
  fs.writeFileSync(path.join(dir, recovery ? "recognized.omr" : "stale.omr"), "fixture");
  if (recovery && mode === "small-staff") { process.stdout.write("recovered"); process.exit(0); }
  if (!recovery) { process.stdout.write("With a too low interline value of 5 pixels, the picture resolution is too low"); process.exit(1); }
}
if (mode === "rotation-fallback") {
  const inputPath = process.argv.at(-1);
  if (inputPath.includes("rotation-180")) { process.stdout.write("corrected"); process.exit(0); }
  process.stderr.write("wrong orientation"); process.exit(7);
}
if (mode === "enhancement" || mode === "enhancement-memory") {
  const fs=require("node:fs"),path=require("node:path");
  const dir=process.argv[process.argv.indexOf("-output")+1];
  const detail=dir.endsWith("enhanced-detail");
  if(mode==='enhancement-memory' && detail){process.stderr.write('java.lang.OutOfMemoryError: Java heap space');process.exit(3);}
  const notes=Array.from({length:detail ? 3 : 30},()=>'<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note>').join('');
  fs.writeFileSync(path.join(dir,"score.musicxml"), '<score-partwise><part id="P1"><measure>'+(detail?'<attributes><time><beats>4</beats><beat-type>4</beat-type></time></attributes>':'')+notes+'</measure></part></score-partwise>');
  process.stdout.write(detail ? "detail" : "other"); process.exit(0);
}
setInterval(() => {}, 1000);
`, "utf8");
const mockConvertScript = path.join(tempDir, "mock-convert.cjs");
fs.writeFileSync(mockConvertScript, `
const fs = require("node:fs");
fs.copyFileSync(process.argv[2], process.argv.at(-1));
fs.writeFileSync(process.argv.at(-1) + ".args.json", JSON.stringify(process.argv.slice(3,-1)));
`, "utf8");
const mockEnhancementScript = path.join(tempDir, "mock-enhancement.cjs");
fs.writeFileSync(mockEnhancementScript, `
const fs=require('node:fs'),path=require('node:path');
const request=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const variants=request.variantIds.map(id=>{ const imagePath=path.join(request.outputDir,id+'.png');fs.copyFileSync(request.inputPath,imagePath);return {id,imagePath,width:100,height:100,scale:id==='detail'?3:1,operations:['grayscale-detail'],requiresBigLane:id!=='gray',crop:[0,0,100,100],sourceToImage:[1,0,0,0,1,0,0,0,1],imageToSource:[1,0,0,0,1,0,0,0,1]};});
fs.writeFileSync(process.argv[3],JSON.stringify({schemaVersion:1,diagnostics:{expectedStaffCount:null,staffDetection:'uncertain'},variants}));
`, "utf8");

after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

function run(mode: string, overrides: Partial<Parameters<typeof runAudiverisCommand>[0]> = {}) {
  return runAudiverisCommand({
    command: process.execPath,
    commandArgsPrefix: [mockScript, mode],
    inputPath: path.join(tempDir, "source.pdf"),
    outputDir: tempDir,
    timeoutMs: 10_000,
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

test("retains recognition errors from stdout when stderr only contains JVM startup options", async () => {
  await assert.rejects(run("stdout-diagnostic"), (error: unknown) => {
    assert.ok(error instanceof AudiverisProcessError);
    assert.match(error.message, /no usable staff spacing detected/);
    assert.match(error.message, /JAVA_TOOL_OPTIONS/);
    return true;
  });
});

test("JVM allocation failure ends as a resource error with no customer retry instruction", async () => {
  await assert.rejects(run("memory"), (error: unknown) => {
    assert.ok(error instanceof AudiverisProcessError);
    assert.equal(error.reason, "resource");
    assert.match(error.message, /\[ENGINE_MEMORY_PRESSURE\]/iu);
    assert.doesNotMatch(error.message, /retry/iu);
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
    timeoutMs: 10_000,
    cancellationPollMs: 25,
  });
  assert.equal(result.appliedRotationDegrees, 180);
  assert.equal(result.stdout, "corrected");
  assert.equal(result.rasterScale, undefined);
  assert.equal(fs.existsSync(path.join(outputDir, "rotation-0", "resolution-2")), false);
});

test("recovers a small-staff image within the same job and selects only recovered artifacts", async () => {
  const source = path.join(tempDir, "small-staff.jpg");
  const outputDir = path.join(tempDir, "small-staff-output");
  fs.writeFileSync(source, "unchanged-source");
  const result = await runAudiverisWithRotationFallback({
    command: process.execPath, commandArgsPrefix: [mockScript, "small-staff"],
    imageMagickCommand: process.execPath, imageMagickCommandArgsPrefix: [mockConvertScript],
    inputPath: source, outputDir, timeoutMs: 10_000, cancellationPollMs: 25,
  });
  assert.equal(result.stdout, "recovered");
  assert.equal(result.appliedRotationDegrees, 0);
  assert.equal(result.rasterScale, 2);
  assert.equal(fs.readFileSync(source, "utf8"), "unchanged-source");
  const recoveredDir = path.join(outputDir, "rotation-0", "resolution-2");
  assert.equal(result.recognitionOutputDir, recoveredDir);
  assert.equal(findAudiverisMusicXmlOutput(recoveredDir), path.join(recoveredDir, "recognized.xml"));
  assert.equal(findAudiverisProjectOutput(recoveredDir), path.join(recoveredDir, "recognized.omr"));
  const args = JSON.parse(fs.readFileSync(path.join(recoveredDir, "normalized.png.args.json"), "utf8")) as string[];
  assert.deepEqual(args.slice(0, 8), ["-auto-orient", "-resize", "3000x3000>", "-resize", "200%", "-resize", "3000x3000>", "-colorspace"]);
  assert.equal(fs.existsSync(path.join(outputDir, "rotation-90")), false);
});

test("resolution recovery respects the original deadline", async () => {
  const source = path.join(tempDir, "small-staff-timeout.jpg");
  const outputDir = path.join(tempDir, "small-staff-timeout");
  fs.writeFileSync(source, "source");
  await assert.rejects(runAudiverisWithRotationFallback({
    command: process.execPath, commandArgsPrefix: [mockScript, "small-staff-wait"],
    imageMagickCommand: process.execPath, imageMagickCommandArgsPrefix: [mockConvertScript],
    inputPath: source, outputDir, timeoutMs: 600, cancellationPollMs: 25,
  }), (error: unknown) => error instanceof AudiverisProcessError && error.reason === "timeout");
  // Under CPU contention the shared deadline may expire before recovery starts.
  // Both outcomes must still stop without advancing to another orientation.
  assert.equal(fs.existsSync(path.join(outputDir, "rotation-90")), false);
});

test("resolution recovery stops when the customer cancels", async () => {
  const source = path.join(tempDir, "small-staff-cancel.jpg");
  const outputDir = path.join(tempDir, "small-staff-cancel");
  const recoveryPath = path.join(outputDir, "rotation-0", "resolution-2", "normalized.png");
  fs.writeFileSync(source, "source");
  await assert.rejects(runAudiverisWithRotationFallback({
    command: process.execPath, commandArgsPrefix: [mockScript, "small-staff"],
    imageMagickCommand: process.execPath, imageMagickCommandArgsPrefix: [mockConvertScript],
    inputPath: source, outputDir, timeoutMs: 15_000, cancellationPollMs: 25,
    isCancelled: () => fs.existsSync(recoveryPath),
  }), (error: unknown) => error instanceof AudiverisProcessError && error.reason === "cancelled");
  assert.equal(fs.existsSync(path.join(outputDir, "rotation-90")), false);
  assert.equal(fs.readFileSync(source, "utf8"), "source");
});

test("bounded enhancement compares three outputs by quality and preserves alternatives", async () => {
  const source = path.join(tempDir, "enhancement.png"); fs.writeFileSync(source, "fixture");
  const result = await runAudiverisWithRotationFallback({
    command: process.execPath, commandArgsPrefix: [mockScript, "enhancement"], imageMagickCommand: "",
    inputPath: source, outputDir: path.join(tempDir, "enhancement-output"), timeoutMs: 15_000,
    enhancement: { enabled: true, lane: "big", pythonCommand: process.execPath, pythonScriptPath: mockEnhancementScript, pageNumber: 2, pageRotations: { "2": 90 } },
  });
  assert.equal(result.enhancement?.selectedVariantId, "detail");
  assert.equal(result.enhancement?.variants.length, 3);
  assert.equal(result.enhancement?.variants.filter((run) => run.status === "succeeded").length, 3);
  assert.equal(result.enhancement?.calls, 3);
  assert.equal(result.rasterScale, 3);
  assert.equal(result.appliedRotationDegrees, 90);
  assert.ok(result.recognitionOutputDir?.endsWith("enhanced-detail"));
  assert.equal(result.stdout, "detail");
});

test("bounded enhancement does not accept a successful process with empty output", async () => {
  const source = path.join(tempDir, "empty-enhancement.png"); fs.writeFileSync(source, "fixture");
  await assert.rejects(runAudiverisWithRotationFallback({
    command: process.execPath, commandArgsPrefix: [mockScript, "success"], imageMagickCommand: "",
    inputPath: source, outputDir: path.join(tempDir, "empty-enhancement-output"), timeoutMs: 15_000,
    enhancement: { enabled: true, lane: "normal", pythonCommand: process.execPath, pythonScriptPath: mockEnhancementScript },
  }), /No five-line music/);
});

test("a heavier variant allocation failure preserves an earlier delivered draft", async () => {
  const source = path.join(tempDir, "memory-enhancement.png"); fs.writeFileSync(source, "fixture");
  const result = await runAudiverisWithRotationFallback({
    command: process.execPath, commandArgsPrefix: [mockScript, "enhancement-memory"], imageMagickCommand: "",
    inputPath: source, outputDir: path.join(tempDir, "memory-enhancement-output"), timeoutMs: 15_000,
    enhancement: { enabled: true, lane: "big", pythonCommand: process.execPath, pythonScriptPath: mockEnhancementScript },
  });
  assert.equal(result.enhancement?.selectedVariantId, "gray");
  assert.equal(result.enhancement?.variants.length, 2);
  assert.equal(result.enhancement?.variants[1].status, "failed");
  assert.equal(result.enhancement?.calls, 2);
});
