import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function assertCloudflareDeploymentAllowed() {
  const marker = new URL("../deploy/cloudflare/paused.json", import.meta.url);
  if (fs.existsSync(marker) && JSON.parse(fs.readFileSync(marker, "utf8")).paused) {
    throw new Error("Cloudflare staging and production are paused by the owner. See docs/operations/cloudflare-pause-2026-09-12.md before an explicitly requested restoration or migration.");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assertCloudflareDeploymentAllowed();
}
