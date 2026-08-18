import path from "node:path";
import { spawnSync } from "node:child_process";

const environmentArgument = process.argv.find((argument) => argument.startsWith("--environment="));
const environment = environmentArgument?.split("=")[1] ?? "staging";
const buildOnly = process.argv.includes("--build-only");
const publicOnly = process.argv.includes("--public-only");
const appOnly = process.argv.includes("--app-only");

if (!new Set(["staging", "production"]).has(environment)) {
  throw new Error("--environment must be staging or production.");
}

if (publicOnly && appOnly) {
  throw new Error("--public-only and --app-only cannot be combined.");
}

if (environment === "production") {
  const confirmation = process.argv.find((argument) => argument.startsWith("--confirm-production="))?.split("=")[1];
  if (process.env.CLOUDFLARE_PRODUCTION_APPROVED !== "true" || confirmation !== "scoretransposer.com") {
    throw new Error("Production frontend deployment requires CLOUDFLARE_PRODUCTION_APPROVED=true and --confirm-production=scoretransposer.com.");
  }
}

const root = process.cwd();
const openNext = path.join(root, "node_modules", "@opennextjs", "cloudflare", "dist", "cli", "index.js");
const wrangler = path.join(root, "node_modules", "wrangler", "bin", "wrangler.js");
const environmentConfig = environment === "production"
  ? {
      siteUrl: "https://scoretransposer.com",
      appUrl: "https://app.scoretransposer.com",
      apiUrl: "https://api.scoretransposer.com",
      collaborationUrl: "wss://collab.scoretransposer.com",
      publicLaunchReady: "true",
      productAppAvailable: "true",
      checkoutAvailable: "false",
      omrAvailable: "true",
      audioTranscriptionAvailable: "false",
      teachingAvailable: "false",
      analyticsEnabled: "false",
      ga4MeasurementId: "G-CERGG48WWE",
    }
  : {
      siteUrl: "https://staging.scoretransposer.com",
      appUrl: "https://app-staging.scoretransposer.com",
      apiUrl: "https://api-staging.scoretransposer.com",
      collaborationUrl: "wss://collab-staging.scoretransposer.com",
      publicLaunchReady: "false",
      productAppAvailable: "true",
      checkoutAvailable: "true",
      omrAvailable: "true",
      audioTranscriptionAvailable: "true",
      teachingAvailable: "true",
      analyticsEnabled: "false",
      ga4MeasurementId: "",
    };
const buildEnvironment = {
  ...process.env,
  NEXT_PUBLIC_SITE_URL: environmentConfig.siteUrl,
  NEXT_PUBLIC_APP_URL: environmentConfig.appUrl,
  NEXT_PUBLIC_CHECKOUT_URL: `${environmentConfig.siteUrl}/checkout`,
  NEXT_PUBLIC_CN_CHECKOUT_URL: `${environmentConfig.siteUrl}/checkout`,
  NEXT_PUBLIC_API_BASE_URL: environmentConfig.apiUrl,
  NEXT_PUBLIC_COLLABORATION_URL: environmentConfig.collaborationUrl,
  NEXT_PUBLIC_SUPPORT_EMAIL: "support@scoretransposer.com",
  NEXT_PUBLIC_PRICE_AMOUNT: "9.99",
  NEXT_PUBLIC_PRICE_CURRENCY: "USD",
  NEXT_PUBLIC_PUBLIC_LAUNCH_READY: environmentConfig.publicLaunchReady,
  NEXT_PUBLIC_PRODUCT_APP_AVAILABLE: environmentConfig.productAppAvailable,
  NEXT_PUBLIC_CHECKOUT_AVAILABLE:
    process.env.NEXT_PUBLIC_CHECKOUT_AVAILABLE?.trim() || environmentConfig.checkoutAvailable,
  NEXT_PUBLIC_PAYMENT_PROVIDERS:
    process.env.NEXT_PUBLIC_PAYMENT_PROVIDERS?.trim() || (environment === "production" ? "paddle" : "paddle,stripe"),
  NEXT_PUBLIC_SCHOOL_CHECKOUT_AVAILABLE: "false",
  NEXT_PUBLIC_OMR_AVAILABLE: environmentConfig.omrAvailable,
  NEXT_PUBLIC_AUDIO_TRANSCRIPTION_AVAILABLE: environmentConfig.audioTranscriptionAvailable,
  NEXT_PUBLIC_TEACHING_AVAILABLE: environmentConfig.teachingAvailable,
  NEXT_PUBLIC_ANALYTICS_ENABLED:
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED?.trim()
    || (process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim() || environmentConfig.ga4MeasurementId || process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim() ? "true" : environmentConfig.analyticsEnabled),
  NEXT_PUBLIC_GA4_MEASUREMENT_ID:
    process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim() || environmentConfig.ga4MeasurementId,
  NEXT_PUBLIC_CLARITY_PROJECT_ID: process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim() || "",
  NEXT_PUBLIC_DEMO_ACTIVATION_CODE: "",
  NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim() || "",
  NEXT_PUBLIC_PADDLE_ENVIRONMENT:
    process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT?.trim() || (environment === "production" ? "production" : "sandbox"),
  NEXT_PUBLIC_LOCALE_COOKIE_DOMAIN: ".scoretransposer.com",
};

const applications = [
  { key: "public", name: "public website", directory: path.join(root, "apps", "www") },
  { key: "app", name: "product application", directory: path.join(root, "apps", "app") },
].filter((application) => !publicOnly || application.key === "public")
  .filter((application) => !appOnly || application.key === "app");

function run(command, arguments_, options) {
  const result = spawnSync(command, arguments_, {
    encoding: "utf8",
    stdio: "inherit",
    windowsHide: true,
    ...options,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

for (const application of applications) {
  console.log(`\nBuilding ${application.name} for Cloudflare ${environment}...`);
  run(process.execPath, [openNext, "build", "--skipWranglerConfigCheck"], {
    cwd: application.directory,
    env: buildEnvironment,
  });

  if (!buildOnly) {
    console.log(`Deploying ${application.name} to Cloudflare ${environment}...`);
    run(process.execPath, [wrangler, "deploy", "--config", `wrangler.${environment}.jsonc`], {
      cwd: application.directory,
      env: buildEnvironment,
    });
  }
}

console.log(buildOnly ? `\nCloudflare ${environment} frontend builds completed.` : `\nCloudflare ${environment} frontends deployed.`);
