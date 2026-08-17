import path from "node:path";
import { spawnSync } from "node:child_process";

const environmentArgument = process.argv.find((argument) => argument.startsWith("--environment="));
const environment = environmentArgument?.split("=")[1] ?? "staging";
const execute = process.argv.includes("--execute");
if (!new Set(["staging", "production"]).has(environment)) throw new Error("--environment must be staging or production.");
if (environment === "production" && execute) throw new Error("Production resources are created only after staging acceptance; this bootstrap intentionally handles staging only.");

const bucket = `scoretransposer-${environment}`;
const commands = [
  ["wrangler", "whoami"],
  ["wrangler", "r2", "bucket", "create", bucket, "--location", "enam"],
];

console.log(`Cloudflare bootstrap plan for ${environment}:`);
for (const command of commands) console.log(`npx ${command.join(" ")}`);
if (!execute) {
  console.log("Dry run only. Add --execute after reviewing the plan.");
  process.exit(0);
}

const wrangler = path.join(process.cwd(), "node_modules", "wrangler", "bin", "wrangler.js");
for (const [tool, ...args] of commands) {
  if (tool !== "wrangler") throw new Error(`Unsupported bootstrap tool: ${tool}`);
  const result = spawnSync(process.execPath, [wrangler, ...args], { cwd: process.cwd(), encoding: "utf8", stdio: "inherit", windowsHide: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
