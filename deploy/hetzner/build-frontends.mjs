import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
const frontend = process.argv[2];
if (!new Set(["app", "www"]).has(frontend)) throw new Error("Expected app or www");
const environment = JSON.parse(fs.readFileSync(new URL("./public-build.json", import.meta.url), "utf8"));
if (Object.keys(environment).some((key) => !key.startsWith("NEXT_PUBLIC_"))) throw new Error("Only public variables are allowed in the frontend build file");
// Resolve the workspace's Next version. The root tooling dependency may use a
// different version; mixing them breaks Next's async request context at build time.
const cwd = path.resolve("apps", frontend);
const next = createRequire(path.join(cwd, "package.json")).resolve("next/dist/bin/next");
if (frontend === "www") {
  const social = spawnSync(process.execPath, ["--import", "tsx", "scripts/generate-social-images.tsx"], {
    cwd, stdio: "inherit", env: { ...process.env, ...environment },
  });
  if (social.status !== 0) process.exit(social.status ?? 1);
}
const result = spawnSync(process.execPath, [next, "build"], {
  cwd,
  stdio: "inherit", env: { ...process.env, ...environment, SCORE_SELF_HOSTED: "true", NEXT_TELEMETRY_DISABLED: "1" },
});
process.exit(result.status ?? 1);
