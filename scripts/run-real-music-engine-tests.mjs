import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const stableImage = process.env.MUSIC_ENGINE_DOCKER_IMAGE?.trim() || "scoretransposer-music-engines:test";
const deploymentImage = process.env.MUSIC_ENGINE_DEPLOYMENT_IMAGE?.trim()
  || "scoretransposer-music-worker-staging:mxl-fix-v2-20260818";
const containerRoot = "/srv/scoretransposer";

ensureDockerImage();
fs.mkdirSync(path.join(root, "artifacts"), { recursive: true });

const mounts = [
  [path.join(root, "services", "api", "src"), `${containerRoot}/services/api/src`],
  [path.join(root, "services", "api", "scripts"), `${containerRoot}/services/api/scripts`],
  [path.join(root, "services", "worker", "src"), `${containerRoot}/services/worker/src`],
  [path.join(root, "scripts", "qualify-music-engines.mjs"), `${containerRoot}/scripts/qualify-music-engines.mjs`],
  [path.join(root, "deploy", "backend"), `${containerRoot}/deploy/backend`],
  [path.join(root, "artifacts"), `${containerRoot}/artifacts`],
];

const toolEnvironment = {
  AUDIVERIS_COMMAND: "/opt/audiveris/bin/Audiveris",
  AUDIVERIS_IMAGE_MAGICK_COMMAND: "/usr/bin/convert",
  BASIC_PITCH_COMMAND: "/opt/score-python/bin/basic-pitch",
  MUSIC21_COMMAND: "/opt/score-python/bin/python",
  YT_DLP_COMMAND: "/opt/score-python/bin/yt-dlp",
  FFMPEG_COMMAND: "/usr/bin/ffmpeg",
  FFPROBE_COMMAND: "/usr/bin/ffprobe",
  FLUIDSYNTH_COMMAND: "/usr/bin/fluidsynth",
  MUSESCORE_COMMAND: "/usr/bin/musescore3",
  SOUNDFONT_PATH: "/usr/share/sounds/sf2/FluidR3_GM.sf2",
  SOUNDFONT_LICENSE_MANIFEST: `${containerRoot}/deploy/backend/soundfont-license-manifest.json`,
  QT_QPA_PLATFORM: "offscreen",
};

runSuite("engine qualification", {
  ...toolEnvironment,
  MUSIC_ENGINE_QUALIFICATION_REQUIRED: "true",
  MUSIC_ENGINE_QUALIFICATION_REPORT: "artifacts/music-engine-qualification.json",
}, ["node", "scripts/qualify-music-engines.mjs"]);

runSuite("music21 real integration", {
  ...toolEnvironment,
  MUSIC21_FIXTURE_ROOT: `${containerRoot}/services/api/src/lib/fixtures/music21-real`,
}, ["node", "--import", "tsx", "--test", "services/api/src/lib/score-music21-transpose.integration.test.ts"], true);

runSuite("Audiveris real integration", {
  ...toolEnvironment,
  AUDIVERIS_REAL_TESTS: "1",
  AUDIVERIS_REAL_COMMAND: toolEnvironment.AUDIVERIS_COMMAND,
  AUDIVERIS_REAL_IMAGE_MAGICK_COMMAND: toolEnvironment.AUDIVERIS_IMAGE_MAGICK_COMMAND,
  AUDIVERIS_REAL_FIXTURE_MANIFEST: `${containerRoot}/services/worker/src/audiveris-real-fixtures/manifest.json`,
}, ["node", "--import", "tsx", "--test", "services/worker/src/audiveris-real.integration.test.ts"], true);

runSuite("score renderer real integration", {
  ...toolEnvironment,
  RUN_SCORE_RENDERER_REAL_INTEGRATION: "1",
}, ["node", "--import", "tsx", "--test", "services/worker/src/score-renderer-real.integration.test.ts"], true);

console.log("Real music-engine matrix passed with no skipped suites.");

function ensureDockerImage() {
  requireCommand("docker", ["version", "--format", "{{.Server.Version}}"], "Docker is required for the deployment-identical engine matrix.");
  if (succeeds("docker", ["image", "inspect", stableImage])) return;

  if (succeeds("docker", ["image", "inspect", deploymentImage])) {
    requireCommand("docker", ["tag", deploymentImage, stableImage], `Could not tag deployment image ${deploymentImage}.`);
    return;
  }

  console.log(`Deployment image is unavailable locally; building ${stableImage}.`);
  requireCommand(
    "docker",
    ["build", "--file", "deploy/backend/Dockerfile", "--tag", stableImage, "."],
    `Could not build ${stableImage}.`,
  );
}

function runSuite(label, environment, command, requireNoSkips = false) {
  console.log(`\n=== ${label} ===`);
  const args = ["run", "--rm", "--workdir", containerRoot];
  for (const [source, target] of mounts) {
    args.push("--mount", `type=bind,source=${source},target=${target}`);
  }
  for (const [name, value] of Object.entries(environment)) {
    args.push("--env", `${name}=${value}`);
  }
  args.push("--entrypoint", command[0], stableImage, ...command.slice(1));
  if (!requireNoSkips) {
    requireCommand("docker", args, `${label} failed.`);
    return;
  }

  const result = spawnSync("docker", args, {
    cwd: root,
    shell: false,
    windowsHide: true,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${label} failed. Exit code: ${result.status ?? "unknown"}.`);

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const skipped = [...output.matchAll(/^# skipped (\d+)$/gmu)].map((match) => Number(match[1]));
  if (skipped.length !== 1 || skipped[0] !== 0) {
    throw new Error(`${label} did not prove a zero-skip result.`);
  }
}

function succeeds(command, args) {
  return spawnSync(command, args, { cwd: root, shell: false, windowsHide: true, stdio: "ignore" }).status === 0;
}

function requireCommand(command, args, failureMessage) {
  const result = spawnSync(command, args, { cwd: root, shell: false, windowsHide: true, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${failureMessage} Exit code: ${result.status ?? "unknown"}.`);
}
