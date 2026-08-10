import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { type TestContext } from "node:test";
import { applyAudiverisOmrDiagnostics } from "./audiveris-omr-diagnostics.js";
import { AudiverisProcessError, runAudiverisCommand } from "./audiveris-runner.js";
import { parseAudiverisMusicXmlToScoreJson } from "./musicxml-score-parser.js";
import { summarizeAudiverisConfidence } from "./omr-confidence.js";

const SCENARIOS = [
  "multipage",
  "rotation-90",
  "rotation-180",
  "rotation-270",
  "crop",
  "low-confidence",
  "corrupted-input",
  "timeout",
  "cancellation",
] as const;

type Scenario = (typeof SCENARIOS)[number];

type FixtureExpected = {
  minPages?: number;
  minMeasures?: number;
  minNotes?: number;
  maxAverageConfidence?: number;
  lowConfidenceThreshold?: number;
  minSymbolsBelowThreshold?: number;
};

type Fixture = {
  id: string;
  scenario: Scenario;
  path: string;
  sha256: string;
  rights: {
    classification: "public-domain" | "user-provided";
    source?: string;
    statement: string;
  };
  input?: {
    rotationDegrees?: 0 | 90 | 180 | 270;
    cropped?: boolean;
  };
  expected: FixtureExpected;
};

type FixtureManifest = {
  schemaVersion: 1;
  fixtures: Fixture[];
};

type ManifestState =
  | { kind: "ready"; manifest: FixtureManifest; manifestPath: string }
  | { kind: "skip"; reason: string }
  | { kind: "invalid"; reason: string };

const enabled = process.env.AUDIVERIS_REAL_TESTS === "1";
const command = (process.env.AUDIVERIS_REAL_COMMAND ?? process.env.AUDIVERIS_COMMAND ?? "").trim();
const parsedCommandArgs = parseCommandArgs(process.env.AUDIVERIS_REAL_COMMAND_ARGS);
const commandArgsError = parsedCommandArgs instanceof Error ? parsedCommandArgs : undefined;
const commandArgsPrefix = parsedCommandArgs instanceof Error ? [] : parsedCommandArgs;
const normalTimeoutMs = positiveIntegerEnv("AUDIVERIS_REAL_TIMEOUT_MS", 300_000);
const timeoutProbeMs = positiveIntegerEnv("AUDIVERIS_REAL_TIMEOUT_PROBE_MS", 10);
const cancelAfterMs = positiveIntegerEnv("AUDIVERIS_REAL_CANCEL_AFTER_MS", 50);
const cancellationPollMs = positiveIntegerEnv("AUDIVERIS_REAL_CANCEL_POLL_MS", 25);
const keepOutput = process.env.AUDIVERIS_REAL_KEEP_OUTPUT === "1";
const manifestState = loadManifestState();

test("Audiveris real-engine qualification configuration", (t) => {
  const reason = globalSkipReason();
  if (reason) {
    t.skip(reason);
    return;
  }
  if (manifestState.kind === "invalid") {
    assert.fail(manifestState.reason);
  }
  if (commandArgsError) {
    assert.fail(commandArgsError.message);
  }
  assert.equal(manifestState.kind, "ready");
  t.diagnostic(
    JSON.stringify({
      command,
      commandArgsPrefix,
      manifestPath: manifestState.manifestPath,
      fixtureCount: manifestState.manifest.fixtures.length,
      normalTimeoutMs,
      timeoutProbeMs,
      cancelAfterMs,
      cancellationPollMs,
      keepOutput,
    }),
  );
});

qualificationTest("multipage", "recognizes a checksum-pinned multipage score", async (t, fixture) => {
  const result = await runSuccessfulFixture(t, fixture);
  assertThresholds(result, fixture);
  assert.ok(result.pageCount >= 2, diagnosticMessage(fixture, result, "Audiveris did not retain at least two source pages."));
});

for (const rotation of [90, 180, 270] as const) {
  const scenario = `rotation-${rotation}` as Scenario;
  qualificationTest(scenario, `recognizes a score rotated ${rotation} degrees`, async (t, fixture) => {
    assert.equal(
      fixture.input?.rotationDegrees,
      rotation,
      `${fixture.id}: manifest input.rotationDegrees must be ${rotation} for the checksum-pinned rotation fixture.`,
    );
    const result = await runSuccessfulFixture(t, fixture);
    assertThresholds(result, fixture);
  });
}

qualificationTest("crop", "recognizes a cropped score without producing an empty candidate", async (t, fixture) => {
  assert.equal(fixture.input?.cropped, true, `${fixture.id}: manifest input.cropped must be true for the crop fixture.`);
  const result = await runSuccessfulFixture(t, fixture);
  assertThresholds(result, fixture);
});

qualificationTest("low-confidence", "reports genuine low-confidence Audiveris symbols", async (t, fixture) => {
  const result = await runSuccessfulFixture(t, fixture);
  assertThresholds(result, fixture);
  assert.ok(result.omrPath, diagnosticMessage(fixture, result, "Low-confidence qualification requires Audiveris .omr output."));
  assert.ok(result.confidences.length > 0, diagnosticMessage(fixture, result, "Audiveris emitted no symbol grades to qualify."));
  assert.ok(
    result.confidences.every((value) => Number.isFinite(value) && value >= 0 && value <= 1),
    diagnosticMessage(fixture, result, "Audiveris emitted a symbol grade outside [0, 1]."),
  );

  const threshold = fixture.expected.lowConfidenceThreshold;
  const minimumCount = fixture.expected.minSymbolsBelowThreshold;
  assert.notEqual(threshold, undefined, `${fixture.id}: expected.lowConfidenceThreshold is required.`);
  assert.notEqual(minimumCount, undefined, `${fixture.id}: expected.minSymbolsBelowThreshold is required.`);
  const lowCount = result.confidences.filter((value) => value < threshold!).length;
  assert.ok(
    lowCount >= minimumCount!,
    diagnosticMessage(fixture, result, `Expected at least ${minimumCount} Audiveris symbols below ${threshold}; received ${lowCount}.`),
  );
  if (fixture.expected.maxAverageConfidence !== undefined) {
    assert.notEqual(result.averageConfidence, null);
    assert.ok(
      result.averageConfidence! <= fixture.expected.maxAverageConfidence,
      diagnosticMessage(
        fixture,
        result,
        `Expected average Audiveris confidence <= ${fixture.expected.maxAverageConfidence}; received ${result.averageConfidence}.`,
      ),
    );
  }
});

qualificationTest("corrupted-input", "rejects corrupted input without publishing usable MusicXML", async (t, fixture) => {
  const output = createOutputDirectory(fixture);
  const startedAt = Date.now();
  try {
    let processResult: Awaited<ReturnType<typeof runAudiverisCommand>>;
    try {
      processResult = await runAudiverisCommand({
        command,
        commandArgsPrefix,
        inputPath: fixture.absolutePath,
        outputDir: output.path,
        timeoutMs: normalTimeoutMs,
        cancellationPollMs,
      });
    } catch (error) {
      assert.ok(error instanceof AudiverisProcessError, describeUnknownError(fixture, error));
      assert.equal(error.reason, "exit", `${fixture.id}: corrupted input should be rejected by Audiveris, received ${error.reason}.`);
      t.diagnostic(`${fixture.id}: rejected in ${Date.now() - startedAt} ms with exitCode=${String(error.exitCode)} message=${tail(error.message)}`);
      return;
    }
    const musicXmlPath = findNewestOutput(output.path, /\.(musicxml|xml)$/iu);
    assert.equal(
      musicXmlPath,
      undefined,
      `${fixture.id}: corrupted input unexpectedly produced usable-looking MusicXML at ${musicXmlPath}. ` +
        `stdout=${tail(processResult.stdout)} stderr=${tail(processResult.stderr)}`,
    );
    t.diagnostic(`${fixture.id}: Audiveris exited successfully but emitted no MusicXML for the corrupted input.`);
  } finally {
    output.cleanup(t);
  }
});

qualificationTest("timeout", "terminates a real Audiveris process at the qualification deadline", async (t, fixture) => {
  const output = createOutputDirectory(fixture);
  const startedAt = Date.now();
  try {
    await assert.rejects(
      runAudiverisCommand({
        command,
        commandArgsPrefix,
        inputPath: fixture.absolutePath,
        outputDir: output.path,
        timeoutMs: timeoutProbeMs,
        cancellationPollMs,
      }),
      (error: unknown) => {
        assert.ok(error instanceof AudiverisProcessError, describeUnknownError(fixture, error));
        assert.equal(error.reason, "timeout", `${fixture.id}: expected timeout classification, received ${error.reason}.`);
        return true;
      },
    );
    t.diagnostic(`${fixture.id}: timeout classified after ${Date.now() - startedAt} ms (deadline ${timeoutProbeMs} ms).`);
  } finally {
    output.cleanup(t);
  }
});

qualificationTest("cancellation", "terminates a real Audiveris process after cancellation", async (t, fixture) => {
  const output = createOutputDirectory(fixture);
  const startedAt = Date.now();
  let cancelled = false;
  const cancellationTimer = setTimeout(() => {
    cancelled = true;
  }, cancelAfterMs);
  try {
    await assert.rejects(
      runAudiverisCommand({
        command,
        commandArgsPrefix,
        inputPath: fixture.absolutePath,
        outputDir: output.path,
        timeoutMs: normalTimeoutMs,
        isCancelled: () => cancelled,
        cancellationPollMs,
      }),
      (error: unknown) => {
        assert.ok(error instanceof AudiverisProcessError, describeUnknownError(fixture, error));
        assert.equal(error.reason, "cancelled", `${fixture.id}: expected cancellation classification, received ${error.reason}.`);
        return true;
      },
    );
    t.diagnostic(`${fixture.id}: cancellation classified after ${Date.now() - startedAt} ms (requested after ${cancelAfterMs} ms).`);
  } finally {
    clearTimeout(cancellationTimer);
    output.cleanup(t);
  }
});

function qualificationTest(
  scenario: Scenario,
  title: string,
  run: (t: TestContext, fixture: Fixture & { absolutePath: string }) => Promise<void>,
) {
  test(`Audiveris real engine: ${title}`, async (t) => {
    const reason = globalSkipReason();
    if (reason) {
      t.skip(reason);
      return;
    }
    if (manifestState.kind === "invalid") {
      t.skip(`Fixture manifest is invalid; see the qualification configuration test. ${manifestState.reason}`);
      return;
    }
    if (commandArgsError) {
      t.skip(`Audiveris command arguments are invalid; see the qualification configuration test. ${commandArgsError.message}`);
      return;
    }
    if (manifestState.kind !== "ready") {
      t.skip(manifestState.reason);
      return;
    }

    const fixture = manifestState.manifest.fixtures.find((candidate) => candidate.scenario === scenario);
    if (!fixture) {
      t.skip(`No ${scenario} fixture is declared in ${manifestState.manifestPath}.`);
      return;
    }
    const absolutePath = path.resolve(path.dirname(manifestState.manifestPath), fixture.path);
    if (!fs.existsSync(absolutePath)) {
      t.skip(`Fixture ${fixture.id} is absent at ${absolutePath}.`);
      return;
    }
    assert.ok(fs.statSync(absolutePath).isFile(), `${fixture.id}: fixture path is not a file: ${absolutePath}`);
    const actualChecksum = sha256File(absolutePath);
    assert.equal(
      actualChecksum,
      fixture.sha256.toLowerCase(),
      `${fixture.id}: SHA-256 mismatch for ${absolutePath}; expected ${fixture.sha256.toLowerCase()}, received ${actualChecksum}.`,
    );
    t.diagnostic(
      `${fixture.id}: scenario=${scenario} rights=${fixture.rights.classification} sha256=${actualChecksum} path=${absolutePath}`,
    );
    await run(t, { ...fixture, absolutePath });
  });
}

type SuccessfulResult = {
  elapsedMs: number;
  musicXmlPath: string;
  omrPath?: string;
  pageCount: number;
  measureCount: number;
  noteCount: number;
  symbolCount: number;
  confidences: number[];
  averageConfidence: number | null;
  stdout: string;
  stderr: string;
};

async function runSuccessfulFixture(t: TestContext, fixture: Fixture & { absolutePath: string }): Promise<SuccessfulResult> {
  const output = createOutputDirectory(fixture);
  const startedAt = Date.now();
  try {
    const processResult = await runAudiverisCommand({
      command,
      commandArgsPrefix,
      inputPath: fixture.absolutePath,
      outputDir: output.path,
      timeoutMs: normalTimeoutMs,
      cancellationPollMs,
    });
    const musicXmlPath = findNewestOutput(output.path, /\.(musicxml|xml)$/iu);
    assert.ok(
      musicXmlPath,
      `${fixture.id}: Audiveris exited successfully but emitted no .musicxml/.xml output in ${output.path}. ` +
        `stdout=${tail(processResult.stdout)} stderr=${tail(processResult.stderr)}`,
    );
    const score = parseAudiverisMusicXmlToScoreJson({
      musicXml: fs.readFileSync(musicXmlPath, "utf8"),
      title: fixture.id,
      sourceFileId: `qualification-${fixture.id}`,
      sourceOriginalName: path.basename(fixture.absolutePath),
      importedAt: new Date().toISOString(),
    });
    const omrPath = findNewestOutput(output.path, /\.omr$/iu);
    const diagnosedScore = omrPath ? applyAudiverisOmrDiagnostics(score, omrPath) : score;
    const summary = summarizeAudiverisConfidence(diagnosedScore);
    const confidences =
      diagnosedScore.recognitionLayer?.engine === "audiveris"
        ? diagnosedScore.recognitionLayer.symbols
            .map((symbol) => symbol.confidence)
            .filter((confidence): confidence is number => confidence !== null && Number.isFinite(confidence))
        : [];
    const result: SuccessfulResult = {
      elapsedMs: Date.now() - startedAt,
      musicXmlPath,
      omrPath,
      pageCount:
        diagnosedScore.recognitionLayer?.engine === "audiveris"
          ? (diagnosedScore.recognitionLayer.pages?.length ?? summary.sourcePageCount ?? 0)
          : (summary.sourcePageCount ?? 0),
      measureCount: diagnosedScore.measures.length,
      noteCount: diagnosedScore.measures.reduce(
        (count, measure) => count + measure.events.filter((event) => event.type === "note").length,
        0,
      ),
      symbolCount: summary.symbolCount,
      confidences,
      averageConfidence: summary.confidence,
      stdout: processResult.stdout,
      stderr: processResult.stderr,
    };
    t.diagnostic(
      `${fixture.id}: elapsedMs=${result.elapsedMs} pages=${result.pageCount} measures=${result.measureCount} ` +
        `notes=${result.noteCount} audiverisSymbols=${result.symbolCount} averageAudiverisConfidence=${String(result.averageConfidence)} ` +
        `musicXml=${result.musicXmlPath} omr=${result.omrPath ?? "not emitted"}`,
    );
    return result;
  } finally {
    output.cleanup(t);
  }
}

function assertThresholds(result: SuccessfulResult, fixture: Fixture) {
  const { expected } = fixture;
  if (expected.minPages !== undefined) {
    assert.ok(result.omrPath, diagnosticMessage(fixture, result, "Page-count qualification requires Audiveris .omr output."));
    assert.ok(
      result.pageCount >= expected.minPages,
      diagnosticMessage(fixture, result, `Expected at least ${expected.minPages} pages; received ${result.pageCount}.`),
    );
  }
  if (expected.minMeasures !== undefined) {
    assert.ok(
      result.measureCount >= expected.minMeasures,
      diagnosticMessage(fixture, result, `Expected at least ${expected.minMeasures} measures; received ${result.measureCount}.`),
    );
  }
  if (expected.minNotes !== undefined) {
    assert.ok(
      result.noteCount >= expected.minNotes,
      diagnosticMessage(fixture, result, `Expected at least ${expected.minNotes} notes; received ${result.noteCount}.`),
    );
  }
}

function createOutputDirectory(fixture: Fixture) {
  const outputPath = fs.mkdtempSync(path.join(os.tmpdir(), `audiveris-real-${fixture.scenario}-`));
  return {
    path: outputPath,
    cleanup(t: TestContext) {
      if (keepOutput) {
        t.diagnostic(`${fixture.id}: retained Audiveris output at ${outputPath}`);
      } else {
        fs.rmSync(outputPath, { recursive: true, force: true });
      }
    },
  };
}

function findNewestOutput(directory: string, pattern: RegExp): string | undefined {
  const candidates: string[] = [];
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) walk(entryPath);
      else if (pattern.test(entry.name)) candidates.push(entryPath);
    }
  };
  if (fs.existsSync(directory)) walk(directory);
  return candidates.sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs)[0];
}

function loadManifestState(): ManifestState {
  if (!enabled) {
    return { kind: "skip", reason: "Set AUDIVERIS_REAL_TESTS=1 to opt in to real-engine qualification." };
  }
  const configuredPath = process.env.AUDIVERIS_REAL_FIXTURE_MANIFEST?.trim();
  if (!configuredPath) {
    return {
      kind: "skip",
      reason: "AUDIVERIS_REAL_FIXTURE_MANIFEST is not set; point it to a manifest matching audiveris-real-fixtures/manifest.schema.json.",
    };
  }
  const manifestPath = path.resolve(configuredPath);
  if (!fs.existsSync(manifestPath)) {
    return { kind: "skip", reason: `Audiveris fixture manifest is absent at ${manifestPath}.` };
  }
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const manifest = validateManifest(parsed, manifestPath);
    return { kind: "ready", manifest, manifestPath };
  } catch (error) {
    return {
      kind: "invalid",
      reason: `Invalid Audiveris fixture manifest ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function validateManifest(value: unknown, manifestPath: string): FixtureManifest {
  assertRecord(value, `${manifestPath}: root must be an object.`);
  assert.equal(value.schemaVersion, 1, `${manifestPath}: schemaVersion must be 1.`);
  assert.ok(Array.isArray(value.fixtures), `${manifestPath}: fixtures must be an array.`);
  const fixtures = value.fixtures.map((candidate, index) => validateFixture(candidate, index, manifestPath));
  const ids = new Set<string>();
  const scenarios = new Set<Scenario>();
  for (const fixture of fixtures) {
    assert.ok(!ids.has(fixture.id), `${manifestPath}: duplicate fixture id ${fixture.id}.`);
    assert.ok(!scenarios.has(fixture.scenario), `${manifestPath}: duplicate scenario ${fixture.scenario}; declare one pinned fixture per matrix row.`);
    ids.add(fixture.id);
    scenarios.add(fixture.scenario);
  }
  return { schemaVersion: 1, fixtures };
}

function validateFixture(value: unknown, index: number, manifestPath: string): Fixture {
  const label = `${manifestPath}: fixtures[${index}]`;
  assertRecord(value, `${label} must be an object.`);
  assert.match(requireString(value.id, `${label}.id`), /^[a-z0-9][a-z0-9._-]{0,79}$/u, `${label}.id is invalid.`);
  const scenario = requireString(value.scenario, `${label}.scenario`);
  assert.ok(isScenario(scenario), `${label}.scenario must be one of: ${SCENARIOS.join(", ")}.`);
  const fixturePath = requireString(value.path, `${label}.path`);
  const sha256 = requireString(value.sha256, `${label}.sha256`).toLowerCase();
  assert.match(sha256, /^[a-f0-9]{64}$/u, `${label}.sha256 must contain 64 hexadecimal characters.`);

  assertRecord(value.rights, `${label}.rights must be an object.`);
  const classification = requireString(value.rights.classification, `${label}.rights.classification`);
  assert.ok(
    classification === "public-domain" || classification === "user-provided",
    `${label}.rights.classification must be public-domain or user-provided.`,
  );
  const statement = requireString(value.rights.statement, `${label}.rights.statement`);
  assert.ok(statement.length >= 8, `${label}.rights.statement must explain permission for qualification use.`);
  const source = optionalString(value.rights.source, `${label}.rights.source`);
  if (classification === "public-domain") {
    assert.ok(source, `${label}.rights.source is required for a public-domain fixture.`);
  }

  const input = validateInput(value.input, label);
  const expected = validateExpected(value.expected, label);
  if (scenario.startsWith("rotation-")) {
    assert.equal(input?.rotationDegrees, Number(scenario.slice("rotation-".length)), `${label}.input.rotationDegrees must match ${scenario}.`);
  }
  if (scenario === "crop") assert.equal(input?.cropped, true, `${label}.input.cropped must be true.`);
  if (scenario === "multipage") {
    assert.ok((expected.minPages ?? 0) >= 2, `${label}.expected.minPages must be at least 2.`);
    requireRecognitionThresholds(expected, label);
  }
  if (scenario.startsWith("rotation-") || scenario === "crop") requireRecognitionThresholds(expected, label);
  if (scenario === "low-confidence") {
    assert.notEqual(expected.lowConfidenceThreshold, undefined, `${label}.expected.lowConfidenceThreshold is required.`);
    assert.notEqual(expected.minSymbolsBelowThreshold, undefined, `${label}.expected.minSymbolsBelowThreshold is required.`);
  }

  return {
    id: String(value.id),
    scenario,
    path: fixturePath,
    sha256,
    rights: { classification, source, statement },
    input,
    expected,
  };
}

function validateInput(value: unknown, label: string): Fixture["input"] {
  if (value === undefined) return undefined;
  assertRecord(value, `${label}.input must be an object.`);
  const rotation = value.rotationDegrees;
  if (rotation !== undefined) {
    assert.ok(rotation === 0 || rotation === 90 || rotation === 180 || rotation === 270, `${label}.input.rotationDegrees is invalid.`);
  }
  if (value.cropped !== undefined) assert.equal(typeof value.cropped, "boolean", `${label}.input.cropped must be boolean.`);
  return {
    rotationDegrees: rotation as 0 | 90 | 180 | 270 | undefined,
    cropped: value.cropped as boolean | undefined,
  };
}

function validateExpected(value: unknown, label: string): FixtureExpected {
  assertRecord(value, `${label}.expected must be an object.`);
  const expected: FixtureExpected = {};
  expected.minPages = optionalInteger(value.minPages, `${label}.expected.minPages`, 1);
  expected.minMeasures = optionalInteger(value.minMeasures, `${label}.expected.minMeasures`, 0);
  expected.minNotes = optionalInteger(value.minNotes, `${label}.expected.minNotes`, 0);
  expected.minSymbolsBelowThreshold = optionalInteger(
    value.minSymbolsBelowThreshold,
    `${label}.expected.minSymbolsBelowThreshold`,
    1,
  );
  expected.maxAverageConfidence = optionalProbability(value.maxAverageConfidence, `${label}.expected.maxAverageConfidence`, true);
  expected.lowConfidenceThreshold = optionalProbability(value.lowConfidenceThreshold, `${label}.expected.lowConfidenceThreshold`, false);
  return expected;
}

function requireRecognitionThresholds(expected: FixtureExpected, label: string) {
  assert.notEqual(expected.minMeasures, undefined, `${label}.expected.minMeasures is required.`);
  assert.notEqual(expected.minNotes, undefined, `${label}.expected.minNotes is required.`);
  assert.ok(expected.minMeasures! >= 1, `${label}.expected.minMeasures must be at least 1.`);
  assert.ok(expected.minNotes! >= 1, `${label}.expected.minNotes must be at least 1.`);
}

function globalSkipReason(): string | undefined {
  if (!enabled) return "Set AUDIVERIS_REAL_TESTS=1 to opt in to real-engine qualification.";
  if (!command) return "AUDIVERIS_REAL_COMMAND (or AUDIVERIS_COMMAND) is not configured; real Audiveris is unavailable.";
  if (!commandExists(command)) return `Configured real Audiveris command is absent or not executable: ${command}`;
  if (manifestState.kind === "skip") return manifestState.reason;
  return undefined;
}

function parseCommandArgs(value: string | undefined): string[] | Error {
  if (!value?.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
      return new Error("AUDIVERIS_REAL_COMMAND_ARGS must be a JSON array of strings.");
    }
    return parsed;
  } catch (error) {
    return new Error(`AUDIVERIS_REAL_COMMAND_ARGS is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function commandExists(candidate: string): boolean {
  const hasPathSeparator = candidate.includes("/") || candidate.includes("\\");
  if (path.isAbsolute(candidate) || hasPathSeparator) return isExecutableFile(path.resolve(candidate));
  const extensions = process.platform === "win32" ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";") : [""];
  const candidateHasExtension = path.extname(candidate) !== "";
  for (const directory of (process.env.PATH ?? "").split(path.delimiter).filter(Boolean)) {
    for (const extension of candidateHasExtension ? [""] : extensions) {
      if (isExecutableFile(path.join(directory, `${candidate}${extension}`))) return true;
    }
  }
  return false;
}

function isExecutableFile(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}

function positiveIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer; received ${raw}.`);
  return value;
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function diagnosticMessage(fixture: Fixture, result: SuccessfulResult, message: string): string {
  return (
    `${fixture.id}: ${message} elapsedMs=${result.elapsedMs} pages=${result.pageCount} measures=${result.measureCount} ` +
    `notes=${result.noteCount} audiverisSymbols=${result.symbolCount} averageAudiverisConfidence=${String(result.averageConfidence)} ` +
    `stdout=${tail(result.stdout)} stderr=${tail(result.stderr)}`
  );
}

function describeUnknownError(fixture: Fixture, error: unknown): string {
  return `${fixture.id}: expected an AudiverisProcessError, received ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}.`;
}

function tail(value: string, limit = 2_000): string {
  const normalized = value.trim().replaceAll(/\s+/gu, " ");
  return JSON.stringify(normalized.length > limit ? normalized.slice(-limit) : normalized);
}

function assertRecord(value: unknown, message: string): asserts value is Record<string, unknown> {
  assert.ok(value !== null && typeof value === "object" && !Array.isArray(value), message);
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string") assert.fail(`${label} must be a string.`);
  assert.ok(value.trim(), `${label} must not be empty.`);
  return value;
}

function optionalString(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  return requireString(value, label);
}

function optionalInteger(value: unknown, label: string, minimum: number): number | undefined {
  if (value === undefined) return undefined;
  assert.ok(Number.isInteger(value) && Number(value) >= minimum, `${label} must be an integer >= ${minimum}.`);
  return Number(value);
}

function optionalProbability(value: unknown, label: string, allowZero: boolean): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number") assert.fail(`${label} must be a number.`);
  assert.ok(Number.isFinite(value) && value <= 1 && (allowZero ? value >= 0 : value > 0), `${label} must be ${allowZero ? "between 0 and 1" : "> 0 and <= 1"}.`);
  return value;
}

function isScenario(value: string): value is Scenario {
  return (SCENARIOS as readonly string[]).includes(value);
}
