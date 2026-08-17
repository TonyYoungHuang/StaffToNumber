import path from "node:path";
import { spawnSync } from "node:child_process";

const environmentArgument = process.argv.find((argument) => argument.startsWith("--environment="));
const environment = environmentArgument?.split("=")[1] ?? "staging";
if (!new Set(["staging", "production"]).has(environment)) throw new Error("--environment must be staging or production.");

if (environment === "production") {
  const confirmation = process.argv.find((argument) => argument.startsWith("--confirm-production="))?.split("=")[1];
  if (confirmation !== "scoretransposer.com" || process.env.CLOUDFLARE_PRODUCTION_APPROVED !== "true") {
    throw new Error("Production requires CLOUDFLARE_PRODUCTION_APPROVED=true and --confirm-production=scoretransposer.com.");
  }
}

const prepareContext = spawnSync(process.execPath, ["scripts/prepare-cloudflare-build-context.mjs"], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: "inherit",
  windowsHide: true,
});
if (prepareContext.status !== 0) process.exit(prepareContext.status ?? 1);

const preflight = spawnSync(process.execPath, ["scripts/cloudflare-preflight.mjs", `--environment=${environment}`, "--online"], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: "inherit",
  windowsHide: true,
});
if (preflight.status !== 0) process.exit(preflight.status ?? 1);

const wrangler = path.join(process.cwd(), "node_modules", "wrangler", "bin", "wrangler.js");
const deploy = spawnSync(process.execPath, [wrangler, "deploy", "--config", `deploy/cloudflare/wrangler.${environment}.jsonc`], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: "inherit",
  windowsHide: true,
});
process.exit(deploy.status ?? 1);
