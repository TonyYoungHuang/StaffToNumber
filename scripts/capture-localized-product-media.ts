import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { SUPPORTED_LOCALES, getLocaleConfig, isSupportedLocale, type SupportedLocale } from "@score/i18n";
import {
  PRODUCT_MEDIA_CAPTURE_PLANS,
  PRODUCT_MEDIA_READY_ASSETS,
  PRODUCT_MEDIA_SLOT_IDS,
  getProductMediaCapturePlan,
  getPlannedProductMediaSources,
  getProductMediaVariant,
  listPendingProductMediaOutputs,
  type ProductMediaCapturePlan,
  type ProductMediaOutput,
  type ProductMediaSlot,
  type ReadyProductMediaVariant,
} from "../apps/www/src/lib/product-media";

function resolveRepositoryRoot() {
  const candidate = path.resolve(process.cwd());
  const packageJsonPath = path.join(candidate, "package.json");
  const productAppPath = path.join(candidate, "apps", "www", "public", "product");
  if (!fs.existsSync(packageJsonPath) || !fs.existsSync(productAppPath)) {
    throw new Error(
      "Run capture-localized-product-media.ts from the repository root so package.json and apps/www/public/product are available.",
    );
  }
  return candidate;
}

const repositoryRoot = resolveRepositoryRoot();
const publicRoot = path.join(repositoryRoot, "apps", "www", "public");
const evidencePath = path.join(repositoryRoot, "apps", "www", "src", "lib", "product-media", "capture-evidence.json");
const jpegScreenshotQuality = "70";

type EvidenceFile = { version: 1; assets: ReadyProductMediaVariant[] };
type CaptureOptions = {
  mode: "plan" | "audit" | "capture";
  locales: SupportedLocale[];
  slots: ProductMediaSlot[];
  force: boolean;
  posterOnly: boolean;
  requireComplete: boolean;
};

type AgentBrowserState = {
  cookies?: Array<{
    name?: unknown;
    value?: unknown;
    domain?: unknown;
    path?: unknown;
    expires?: unknown;
    httpOnly?: unknown;
    secure?: unknown;
    sameSite?: unknown;
  }>;
  origins?: Array<{
    origin?: unknown;
    localStorage?: Array<{ name?: unknown; value?: unknown }>;
  }>;
};

function parseListArgument(name: string) {
  const prefix = `--${name}=`;
  const value = process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
  return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : null;
}

function parseOptions(): CaptureOptions {
  const modes = ["plan", "audit", "capture"].filter((mode) => process.argv.includes(`--${mode}`));
  if (modes.length > 1) throw new Error("Choose exactly one of --plan, --audit, or --capture.");
  const localeInput = parseListArgument("locales") ?? [...SUPPORTED_LOCALES];
  if (!localeInput.every(isSupportedLocale)) throw new Error(`Unsupported locale in --locales: ${localeInput.join(", ")}`);
  const slotInput = parseListArgument("slots") ?? [...PRODUCT_MEDIA_SLOT_IDS];
  if (!slotInput.every((slot): slot is ProductMediaSlot => PRODUCT_MEDIA_SLOT_IDS.includes(slot as ProductMediaSlot))) {
    throw new Error(`Unknown slot in --slots: ${slotInput.join(", ")}`);
  }
  const posterOnly = process.argv.includes("--poster-only");
  if (posterOnly && modes[0] !== "capture") throw new Error("--poster-only is available only with --capture.");
  if (posterOnly && slotInput.some((slot) => getProductMediaCapturePlan(slot as ProductMediaSlot).kind !== "demo")) {
    throw new Error("--poster-only accepts only homepage demo slots.");
  }
  return {
    mode: (modes[0] ?? "plan") as CaptureOptions["mode"],
    locales: localeInput as SupportedLocale[],
    slots: slotInput,
    force: process.argv.includes("--force"),
    posterOnly,
    requireComplete: process.argv.includes("--require-complete"),
  };
}

function loadEvidence(): EvidenceFile {
  return JSON.parse(fs.readFileSync(evidencePath, "utf8")) as EvidenceFile;
}

function publicFilePath(src: string) {
  if (!src.startsWith("/product/") || src.includes("..") || src.includes("\\")) {
    throw new Error(`Unsafe public product path: ${src}`);
  }
  return path.join(publicRoot, ...src.slice(1).split("/"));
}

function sha256(bytes: Buffer) {
  return createHash("sha256").update(bytes).digest("hex");
}

function readPngDimensions(bytes: Buffer) {
  if (bytes.length < 24 || bytes.toString("ascii", 1, 4) !== "PNG") throw new Error("Captured PNG is invalid.");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function readJpegDimensions(bytes: Buffer) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("Captured JPEG is invalid.");
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1]!;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    const segmentLength = bytes.readUInt16BE(offset + 2);
    if (segmentLength < 2) break;
    offset += segmentLength + 2;
  }
  throw new Error("Could not read captured JPEG dimensions.");
}

function readVideoDimensions(filePath: string) {
  const binary = process.env.PRODUCT_MEDIA_FFPROBE_BIN?.trim() || "ffprobe";
  const result = spawnSync(binary, [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height",
    "-of", "json",
    filePath,
  ], { cwd: repositoryRoot, encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error(`ffprobe could not inspect ${filePath}: ${String(result.stderr ?? "").trim()}`);
  const parsed = JSON.parse(String(result.stdout)) as { streams?: Array<{ width?: unknown; height?: unknown }> };
  const width = Number(parsed.streams?.[0]?.width);
  const height = Number(parsed.streams?.[0]?.height);
  if (!Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(height) || height <= 0) {
    throw new Error(`ffprobe returned invalid dimensions for ${filePath}.`);
  }
  return { width, height };
}

function capturedOutput(src: string, kind: "png" | "jpeg" | "video"): ProductMediaOutput {
  const filePath = publicFilePath(src);
  const bytes = fs.readFileSync(filePath);
  const dimensions = kind === "png"
    ? readPngDimensions(bytes)
    : kind === "jpeg"
      ? readJpegDimensions(bytes)
      : readVideoDimensions(filePath);
  return { src, ...dimensions, bytes: bytes.length, sha256: sha256(bytes) };
}

function resolveAgentBrowserBinary() {
  const configured = process.env.PRODUCT_MEDIA_AGENT_BROWSER_BIN?.trim();
  if (configured) return configured;
  if (process.platform !== "win32") return "agent-browser";
  const appData = process.env.APPDATA;
  if (!appData) throw new Error("APPDATA is unavailable; set PRODUCT_MEDIA_AGENT_BROWSER_BIN explicitly.");
  const binary = path.join(appData, "npm", "node_modules", "agent-browser", "bin", "agent-browser-win32-x64.exe");
  if (!fs.existsSync(binary)) throw new Error(`agent-browser binary was not found at ${binary}. Set PRODUCT_MEDIA_AGENT_BROWSER_BIN.`);
  return binary;
}

let browserCommandSequence = 0;

function runBrowser(binary: string, session: string, args: string[], options: { state?: string; allowFailure?: boolean } = {}) {
  const browserArgs = process.env.PRODUCT_MEDIA_AGENT_BROWSER_ARGS?.trim();
  const commandArgs = ["--session", session, ...(options.state ? ["--state", options.state] : []), ...args];
  const commandOutputDirectory = path.join(repositoryRoot, ".tmp", "product-media", "command-output");
  fs.mkdirSync(commandOutputDirectory, { recursive: true });
  const commandId = `${process.pid}-${Date.now()}-${browserCommandSequence += 1}`;
  const stdoutPath = path.join(commandOutputDirectory, `${commandId}.stdout.txt`);
  const stderrPath = path.join(commandOutputDirectory, `${commandId}.stderr.txt`);
  const stdoutDescriptor = fs.openSync(stdoutPath, "w");
  const stderrDescriptor = fs.openSync(stderrPath, "w");
  let result: ReturnType<typeof spawnSync>;
  try {
    // On Windows the agent-browser launcher starts a daemon. File-backed stdio
    // prevents that grandchild from keeping Node's synchronous pipe open.
    result = spawnSync(binary, commandArgs, {
      cwd: repositoryRoot,
      windowsHide: true,
      timeout: 120_000,
      stdio: ["ignore", stdoutDescriptor, stderrDescriptor],
      // Some Windows hosts restart the daemon between CLI invocations. Keep
      // required browser launch flags available to every invocation, not only open.
      env: browserArgs ? { ...process.env, AGENT_BROWSER_ARGS: browserArgs } : process.env,
    });
  } finally {
    fs.closeSync(stdoutDescriptor);
    fs.closeSync(stderrDescriptor);
  }
  const output = `${fs.readFileSync(stdoutPath, "utf8")}${fs.readFileSync(stderrPath, "utf8")}`.trim();
  fs.rmSync(stdoutPath, { force: true });
  fs.rmSync(stderrPath, { force: true });
  if (result.error && !options.allowFailure) {
    throw new Error(`agent-browser ${args[0]} could not run: ${result.error.message}${output ? `\n${output}` : ""}`);
  }
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`agent-browser ${args[0]} failed (${result.status ?? "no status"}):\n${output}`);
  }
  return output;
}

function requiredEnvironment(plan: ProductMediaCapturePlan) {
  const appUrl = new URL(process.env.PRODUCT_MEDIA_APP_URL?.trim() || "http://127.0.0.1:3001");
  if (!['http:', 'https:'].includes(appUrl.protocol)) throw new Error("PRODUCT_MEDIA_APP_URL must be HTTP(S).");
  const authState = path.resolve(repositoryRoot, process.env.PRODUCT_MEDIA_AUTH_STATE?.trim() || "");
  if (!process.env.PRODUCT_MEDIA_AUTH_STATE || !fs.existsSync(authState)) throw new Error("PRODUCT_MEDIA_AUTH_STATE must point to an agent-browser auth-state JSON file.");
  const state = JSON.parse(fs.readFileSync(authState, "utf8")) as AgentBrowserState;
  const stateOrigin = state.origins?.find((candidate) => candidate.origin === appUrl.origin);
  const localStorage = stateOrigin?.localStorage?.flatMap((entry) => (
    typeof entry.name === "string" && typeof entry.value === "string"
      ? [{ name: entry.name, value: entry.value }]
      : []
  )) ?? [];
  if (!localStorage.some((entry) => entry.name === "score-auth-token" && entry.value.length > 0)) {
    throw new Error(`PRODUCT_MEDIA_AUTH_STATE must include score-auth-token storage for ${appUrl.origin}.`);
  }
  const cookies = state.cookies?.flatMap((cookie) => {
    if (
      typeof cookie.name !== "string"
      || typeof cookie.value !== "string"
      || typeof cookie.domain !== "string"
      || typeof cookie.path !== "string"
    ) return [];
    return [{
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: typeof cookie.expires === "number" ? cookie.expires : -1,
      httpOnly: cookie.httpOnly === true,
      secure: cookie.secure === true,
      sameSite: ["Strict", "Lax", "None"].includes(String(cookie.sameSite)) ? String(cookie.sameSite) : "Lax",
    }];
  }) ?? [];
  if (!cookies.some((cookie) => cookie.name.startsWith("score_session") && cookie.value.length > 0)) {
    throw new Error("PRODUCT_MEDIA_AUTH_STATE must include the local score_session cookie.");
  }
  const fixtureId = process.env.PRODUCT_MEDIA_SCORE_ID?.trim() || "";
  if (plan.requiresScoreFixture && !/^[a-zA-Z0-9_-]{8,128}$/u.test(fixtureId)) throw new Error("PRODUCT_MEDIA_SCORE_ID must identify the shared test score fixture.");
  const capturedAt = process.env.PRODUCT_MEDIA_CAPTURED_AT?.trim() || "";
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(capturedAt)) throw new Error("PRODUCT_MEDIA_CAPTURED_AT must be an explicit YYYY-MM-DD evidence date.");
  const sourceRevision = process.env.PRODUCT_MEDIA_SOURCE_REVISION?.trim() || "";
  if (!/^[a-zA-Z0-9._-]{7,128}$/u.test(sourceRevision)) throw new Error("PRODUCT_MEDIA_SOURCE_REVISION must identify the exact staged product revision.");
  return { appUrl, localStorage, cookies, fixtureId, capturedAt, sourceRevision };
}

function targetRoute(plan: ProductMediaCapturePlan, fixtureId: string) {
  return plan.target.routeTemplate.replace("{scoreId}", encodeURIComponent(fixtureId));
}

function assertBrowserPage(binary: string, session: string, locale: SupportedLocale, selector: string) {
  // Score pages keep collaboration and job-status traffic alive, so a strict
  // network-idle gate can never settle even when the UI is fully ready.
  runBrowser(binary, session, ["wait", "--load", "domcontentloaded"]);
  runBrowser(binary, session, ["wait", selector]);
  const renderedLang = runBrowser(binary, session, ["eval", "document.documentElement.lang"]);
  const expectedHtmlLang = getLocaleConfig(locale).htmlLang;
  if (!renderedLang.includes(expectedHtmlLang)) throw new Error(`Expected html lang ${expectedHtmlLang}; agent-browser returned ${renderedLang}.`);
  const content = runBrowser(binary, session, ["eval", "document.body.innerText.trim().length > 0 ? 'HAS_CONTENT' : 'BLANK'"]);
  if (!content.includes("HAS_CONTENT")) throw new Error("Product page is blank.");
  const overlay = runBrowser(binary, session, ["eval", "document.querySelector('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay') ? 'ERROR_OVERLAY' : 'OK'"]);
  if (!overlay.includes("OK")) throw new Error("A framework error overlay is visible.");
  const errors = runBrowser(binary, session, ["errors"]);
  if (errors && !/no (?:page )?errors|\[\]/iu.test(errors)) throw new Error(`Browser page errors detected:\n${errors}`);
  const scrollResult = runBrowser(binary, session, [
    "eval",
    `(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) return 'MISSING'; element.scrollIntoView({ block: 'start', inline: 'nearest' }); window.scrollBy(0, -96); return 'SCROLLED'; })()`,
  ]);
  if (!scrollResult.includes("SCROLLED")) throw new Error(`Could not align product-media target ${selector}.`);
  runBrowser(binary, session, ["wait", "250"]);
}

function runDemoInteraction(binary: string, session: string, interaction: NonNullable<ProductMediaCapturePlan["interaction"]>) {
  if (interaction === "editor-nudge") {
    runBrowser(binary, session, ["click", "#visual-editor [data-vexflow-event-id]"]);
    const result = runBrowser(binary, session, ["eval", "(() => { const rows = document.querySelectorAll('#visual-editor .visual-score-editor > .mini-card > .button-row'); const button = rows[2]?.querySelectorAll('button')[1]; if (!button) return 'MISSING'; button.click(); return 'CLICKED'; })()"]);
    if (!result.includes("CLICKED")) throw new Error("Could not exercise the visual-editor pitch preview.");
    return;
  }
  if (interaction === "transpose-preview") {
    runBrowser(binary, session, ["fill", "#transpose-score input[type=number]", "2"]);
    return;
  }
  if (interaction === "jianpu-refresh") {
    runBrowser(binary, session, ["select", "#jianpu-preview select", "fixed-do"]);
    runBrowser(binary, session, ["click", "#jianpu-preview button"]);
    return;
  }
  runBrowser(binary, session, ["click", "#playback-practice .playback-panel .button-row button:nth-child(1)"]);
  runBrowser(binary, session, ["wait", "1500"]);
  runBrowser(binary, session, ["click", "#playback-practice .playback-panel .button-row button:nth-child(2)"]);
}

function capturePlanVariant(
  plan: ProductMediaCapturePlan,
  locale: SupportedLocale,
  binary: string,
  posterOnly: boolean,
  reusableSession?: string,
): ReadyProductMediaVariant {
  const env = requiredEnvironment(plan);
  const route = targetRoute(plan, env.fixtureId);
  const sourceRoute = plan.target.selector.startsWith("#")
    ? `${route}${plan.target.selector}`
    : `${route}#${plan.target.selector}`;
  const session = reusableSession ?? `score-product-media-${process.pid}-${locale.toLowerCase()}-${plan.slot.replaceAll(".", "-")}`;
  const next = encodeURIComponent(route);
  const localeUrl = new URL(`/api/locale?locale=${encodeURIComponent(locale)}&next=${next}`, env.appUrl);
  const sources = getPlannedProductMediaSources(plan.slot, locale);
  const hydrateAuthentication = () => {
    for (const entry of env.localStorage) {
      runBrowser(binary, session, ["storage", "local", "set", entry.name, entry.value]);
    }
    for (const cookie of env.cookies) {
      const cookieArgs = [
        "cookies", "set", cookie.name, cookie.value,
        "--domain", cookie.domain,
        "--path", cookie.path,
        "--sameSite", cookie.sameSite,
        ...(cookie.expires > 0 ? ["--expires", String(Math.floor(cookie.expires))] : []),
        ...(cookie.httpOnly ? ["--httpOnly"] : []),
        ...(cookie.secure ? ["--secure"] : []),
      ];
      runBrowser(binary, session, cookieArgs);
    }
  };
  try {
    runBrowser(binary, session, ["open", new URL("/login", env.appUrl).toString()]);
    hydrateAuthentication();
    runBrowser(binary, session, ["open", localeUrl.toString()]);
    runBrowser(binary, session, ["set", "viewport", String(plan.target.viewport[0]), String(plan.target.viewport[1]), "1"]);
    runBrowser(binary, session, ["reload"]);
    assertBrowserPage(binary, session, locale, plan.target.selector);
    runBrowser(binary, session, ["wait", String(plan.target.settleMs)]);

    if (plan.kind === "image") {
      const destination = publicFilePath(sources.image!);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      // CDP element clips become blank on Windows when a tall section extends
      // beyond the viewport. The target is aligned above, so capture the fixed
      // evidence viewport instead of an unreliable element clip.
      const imageKind = destination.toLowerCase().endsWith(".jpg") ? "jpeg" : "png";
      runBrowser(binary, session, [
        "screenshot",
        destination,
        "--screenshot-format",
        imageKind,
        ...(imageKind === "jpeg" ? ["--screenshot-quality", jpegScreenshotQuality] : []),
      ]);
      return {
        slot: plan.slot,
        locale,
        sourceLocale: locale,
        capturedAt: env.capturedAt,
        sourceRoute,
        sourceRevision: env.sourceRevision,
        fixtureId: plan.requiresScoreFixture ? env.fixtureId : null,
        captureMethod: "agent-browser",
        image: capturedOutput(sources.image!, imageKind),
      };
    }

    const posterPath = publicFilePath(sources.poster!);
    const videoPath = publicFilePath(sources.video!);
    fs.mkdirSync(path.dirname(posterPath), { recursive: true });
    if (posterOnly) {
      if (!fs.existsSync(videoPath)) throw new Error(`Poster-only capture needs the existing real browser video ${sources.video}.`);
      if (plan.interaction === "editor-nudge") {
        runBrowser(binary, session, ["wait", "#visual-editor [data-vexflow-event-id]"]);
      }
      runDemoInteraction(binary, session, plan.interaction!);
      runBrowser(binary, session, ["wait", "1000"]);
      assertBrowserPage(binary, session, locale, plan.target.selector);
      runBrowser(binary, session, ["wait", "1500"]);
      runBrowser(binary, session, ["screenshot", posterPath, "--screenshot-format", "jpeg", "--screenshot-quality", jpegScreenshotQuality]);
      return {
        slot: plan.slot,
        locale,
        sourceLocale: locale,
        capturedAt: env.capturedAt,
        sourceRoute,
        sourceRevision: env.sourceRevision,
        fixtureId: env.fixtureId,
        captureMethod: "agent-browser",
        poster: capturedOutput(sources.poster!, "jpeg"),
        video: capturedOutput(sources.video!, "video"),
      };
    }
    runBrowser(binary, session, ["record", "start", videoPath]);
    // Recording starts in a fresh context and navigates back to the current
    // URL, so wait for the localized interactive target a second time.
    hydrateAuthentication();
    runBrowser(binary, session, ["open", localeUrl.toString()]);
    assertBrowserPage(binary, session, locale, plan.target.selector);
    runBrowser(binary, session, ["wait", String(plan.target.settleMs)]);
    if (plan.interaction === "editor-nudge") {
      runBrowser(binary, session, ["wait", "#visual-editor [data-vexflow-event-id]"]);
    }
    runDemoInteraction(binary, session, plan.interaction!);
    runBrowser(binary, session, ["wait", "1000"]);
    assertBrowserPage(binary, session, locale, plan.target.selector);
    runBrowser(binary, session, ["wait", "1500"]);
    runBrowser(binary, session, ["screenshot", posterPath, "--screenshot-format", "jpeg", "--screenshot-quality", jpegScreenshotQuality]);
    runBrowser(binary, session, ["record", "stop"]);
    return {
      slot: plan.slot,
      locale,
      sourceLocale: locale,
      capturedAt: env.capturedAt,
      sourceRoute,
      sourceRevision: env.sourceRevision,
      fixtureId: env.fixtureId,
      captureMethod: "agent-browser",
      poster: capturedOutput(sources.poster!, "jpeg"),
      video: capturedOutput(sources.video!, "video"),
    };
  } finally {
    if (!reusableSession) runBrowser(binary, session, ["close"], { allowFailure: true });
  }
}

function assetOutputs(asset: ReadyProductMediaVariant) {
  return (["image", "poster", "video"] as const).flatMap((kind) => asset[kind] ? [{ kind, output: asset[kind]! }] : []);
}

function assertBinaryUniqueness(assets: readonly ReadyProductMediaVariant[]) {
  const seen = new Map<string, { slot: ProductMediaSlot; locale: SupportedLocale; kind: string }>();
  for (const asset of assets) {
    for (const { kind, output } of assetOutputs(asset)) {
      const hash = output.sha256.toLowerCase();
      const duplicate = seen.get(hash);
      if (duplicate) {
        throw new Error(
          `${asset.slot}/${asset.locale}/${kind} reuses identical bytes from ${duplicate.slot}/${duplicate.locale}/${duplicate.kind}.`,
        );
      }
      seen.set(hash, { slot: asset.slot, locale: asset.locale, kind });
    }
  }
}

function auditAssets(assets: readonly ReadyProductMediaVariant[]) {
  const errors: string[] = [];
  for (const asset of assets) {
    if (asset.sourceLocale !== asset.locale) errors.push(`${asset.slot}/${asset.locale}: sourceLocale mismatch`);
    for (const { kind, output } of assetOutputs(asset)) {
      const filePath = publicFilePath(output.src);
      if (!fs.existsSync(filePath)) { errors.push(`${asset.slot}/${asset.locale}/${kind}: missing ${output.src}`); continue; }
      const bytes = fs.readFileSync(filePath);
      if (bytes.length !== output.bytes) errors.push(`${asset.slot}/${asset.locale}/${kind}: byte count changed`);
      if (sha256(bytes) !== output.sha256.toLowerCase()) errors.push(`${asset.slot}/${asset.locale}/${kind}: SHA-256 changed`);
    }
  }
  try { assertBinaryUniqueness(assets); } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  return errors;
}

function planSummary(options: CaptureOptions) {
  const jobs = options.slots.flatMap((slot) => options.locales.map((locale) => ({
    slot,
    locale,
    status: getProductMediaVariant(slot, locale).status,
    planned: getPlannedProductMediaSources(slot, locale),
  })));
  const pendingJobs = jobs.filter((job) => job.status === "pending");
  return {
    fixturePolicy: "Every score-based slot uses PRODUCT_MEDIA_SCORE_ID unchanged across locales.",
    selectedJobs: jobs.length,
    pendingJobs: pendingJobs.length,
    totalRegisteredAssets: PRODUCT_MEDIA_READY_ASSETS.length,
    totalPendingOutputFiles: listPendingProductMediaOutputs().length,
    jobs,
  };
}

function writeEvidence(assets: ReadyProductMediaVariant[]) {
  const temporaryPath = `${evidencePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify({ version: 1, assets }, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, evidencePath);
}

function mergeCapturedEvidence(captured: ReadyProductMediaVariant) {
  const lockPath = `${evidencePath}.lock`;
  const deadline = Date.now() + 60_000;
  let lockDescriptor: number | null = null;
  while (lockDescriptor === null) {
    try {
      lockDescriptor = fs.openSync(lockPath, "wx");
      fs.writeFileSync(lockDescriptor, `${process.pid}\n`, "utf8");
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      if (code !== "EEXIST" || Date.now() >= deadline) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }

  try {
    const latest = loadEvidence().assets;
    const merged = [...latest];
    const existingIndex = merged.findIndex((asset) => asset.slot === captured.slot && asset.locale === captured.locale);
    if (existingIndex >= 0) merged.splice(existingIndex, 1, captured);
    else merged.push(captured);
    assertBinaryUniqueness(merged);
    writeEvidence(merged);
    return merged.length;
  } finally {
    fs.closeSync(lockDescriptor);
    fs.rmSync(lockPath, { force: true });
  }
}

function main() {
  const options = parseOptions();
  if (options.mode === "plan") {
    process.stdout.write(`${JSON.stringify(planSummary(options), null, 2)}\n`);
    return;
  }

  const evidence = loadEvidence();
  const selectedKeys = new Set(options.slots.flatMap((slot) => options.locales.map((locale) => `${slot}/${locale}`)));
  const assetsToAudit = options.mode === "capture" && options.force
    ? evidence.assets.filter((asset) => !selectedKeys.has(`${asset.slot}/${asset.locale}`))
    : evidence.assets;
  const auditErrors = auditAssets(assetsToAudit);
  if (options.mode === "audit") {
    const pending = listPendingProductMediaOutputs();
    process.stdout.write(`${JSON.stringify({ readyVariants: evidence.assets.length, pendingOutputFiles: pending.length, errors: auditErrors }, null, 2)}\n`);
    if (auditErrors.length > 0 || (options.requireComplete && pending.length > 0)) process.exitCode = 1;
    return;
  }
  if (auditErrors.length > 0) throw new Error(`Existing media evidence failed audit:\n${auditErrors.join("\n")}`);

  if (options.force) {
    const retainedAssets = evidence.assets.filter((asset) => !selectedKeys.has(`${asset.slot}/${asset.locale}`));
    assertBinaryUniqueness(retainedAssets);
    writeEvidence(retainedAssets);
  }

  const binary = resolveAgentBrowserBinary();
  const reusableSession = options.slots.every((slot) => getProductMediaCapturePlan(slot).kind === "image")
    ? `score-product-media-${process.pid}-image-batch`
    : undefined;
  try {
    for (const slot of options.slots) {
      const plan = PRODUCT_MEDIA_CAPTURE_PLANS.find((candidate) => candidate.slot === slot)!;
      for (const locale of options.locales) {
        if (getProductMediaVariant(slot, locale).status === "ready" && !options.force) continue;
        const captured = capturePlanVariant(plan, locale, binary, options.posterOnly, reusableSession);
        mergeCapturedEvidence(captured);
        process.stdout.write(`Captured ${slot}/${locale} from ${captured.sourceRoute}.\n`);
      }
    }
  } finally {
    if (reusableSession) runBrowser(binary, reusableSession, ["close"], { allowFailure: true });
  }
  process.stdout.write(`Updated ${evidencePath} with ${loadEvidence().assets.length} truthful locale variants.\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
}
