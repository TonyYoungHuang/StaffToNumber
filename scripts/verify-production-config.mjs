import { execFileSync } from "node:child_process";
import process from "node:process";

const failures = [];
const warnings = [];
const env = process.env;
const flag = (name) => env[name]?.trim().toLowerCase() === "true";
const present = (name) => Boolean(env[name]?.trim() && !/(?:replace-with|\.\.\.|example)/iu.test(env[name]));
const httpsUrl = (name) => {
  if (!present(name)) {
    failures.push(`${name} is required.`);
    return;
  }
  try {
    if (new URL(env[name]).protocol !== "https:") failures.push(`${name} must use HTTPS.`);
  } catch {
    failures.push(`${name} must be a valid absolute URL.`);
  }
};

for (const name of ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_API_BASE_URL"]) httpsUrl(name);
for (const name of ["NEXT_PUBLIC_PUBLIC_LAUNCH_READY", "NEXT_PUBLIC_PRODUCT_APP_AVAILABLE"]) {
  if (!flag(name)) failures.push(`${name} must be true for a public production release.`);
}

if (!present("INTERNAL_TOOLS_TOKEN") || env.INTERNAL_TOOLS_TOKEN.trim().length < 32) {
  failures.push("INTERNAL_TOOLS_TOKEN must be a non-placeholder secret of at least 32 characters.");
}
if (!present("GOOGLE_SITE_VERIFICATION")) failures.push("GOOGLE_SITE_VERIFICATION is required before index submission.");
if (!present("BING_SITE_VERIFICATION")) failures.push("BING_SITE_VERIFICATION is required before index submission.");
if (!flag("NEXT_PUBLIC_ANALYTICS_ENABLED")) failures.push("NEXT_PUBLIC_ANALYTICS_ENABLED must be true for launch measurement.");
if (!present("NEXT_PUBLIC_GA4_MEASUREMENT_ID")) failures.push("NEXT_PUBLIC_GA4_MEASUREMENT_ID is required.");
if (!present("NEXT_PUBLIC_CLARITY_PROJECT_ID")) warnings.push("NEXT_PUBLIC_CLARITY_PROJECT_ID is not configured.");

if (flag("NEXT_PUBLIC_CHECKOUT_AVAILABLE")) {
  httpsUrl("NEXT_PUBLIC_CHECKOUT_URL");
  if (!present("NEXT_PUBLIC_PRICE_AMOUNT")) failures.push("NEXT_PUBLIC_PRICE_AMOUNT is required when checkout is available.");
  if (!present("NEXT_PUBLIC_PRICE_CURRENCY")) failures.push("NEXT_PUBLIC_PRICE_CURRENCY is required when checkout is available.");
}

if (!process.argv.includes("--skip-git")) {
  try {
    const status = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { encoding: "utf8" }).trim();
    if (status) failures.push("Git worktree is not clean. Create the reviewed release commit before production deployment.");
  } catch {
    failures.push("Git release state could not be verified.");
  }
}

for (const warning of warnings) console.warn(`WARNING: ${warning}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`ERROR: ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Production configuration gate passed.");
}
