import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const root = process.cwd();
const apiUrl = "http://127.0.0.1:43102";
const siteUrl = "http://127.0.0.1:43100";
const appUrl = "http://127.0.0.1:43101";
const localNoProxy = [process.env.NO_PROXY, process.env.no_proxy, "127.0.0.1", "localhost"]
  .filter(Boolean)
  .join(",");

// Playwright's web-server probes inherit proxy variables. Always keep local E2E traffic local.
process.env.NO_PROXY = localNoProxy;
process.env.no_proxy = localNoProxy;

const commonApiEnv = {
  ...process.env,
  NODE_ENV: "test",
  HOST: "127.0.0.1",
  PORT: "43102",
  DB_FILE: path.join(root, ".tmp", "e2e", "app.sqlite"),
  STORAGE_DIR: path.join(root, ".tmp", "e2e", "storage"),
  PUBLIC_SITE_URL: siteUrl,
  PUBLIC_APP_URL: appUrl,
  ADMIN_API_KEY: "e2e-admin-key-with-at-least-32-characters",
  RATE_LIMIT_ENABLED: "false",
  LIFECYCLE_CLEANUP_ENABLED: "false",
};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  use: {
    baseURL: siteUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { args: ["--no-proxy-server"] },
        ...(process.env.CI ? {} : { channel: "chrome" }),
      },
    },
  ],
  webServer: [
    {
      command: "node services/api/dist/index.js",
      url: `${apiUrl}/health`,
      env: commonApiEnv,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "npm exec -- next start --hostname 127.0.0.1 --port 43100",
      cwd: path.join(root, "apps", "www"),
      url: `${siteUrl}/copyright-complaint`,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: apiUrl },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "npm exec -- next start --hostname 127.0.0.1 --port 43101",
      cwd: path.join(root, "apps", "app"),
      url: `${appUrl}/admin/copyright`,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: apiUrl },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
