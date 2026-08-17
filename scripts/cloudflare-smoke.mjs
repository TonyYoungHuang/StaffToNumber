const baseArgument = process.argv.find((argument) => argument.startsWith("--base-url="));
const baseUrl = baseArgument?.slice("--base-url=".length)?.replace(/\/$/u, "");
const expectReady = process.argv.includes("--expect-ready");
if (!baseUrl?.startsWith("https://")) throw new Error("Provide --base-url=https://host.");

const checks = [
  { path: "/__edge/health", statuses: expectReady ? [200] : [200, 503] },
  { path: "/health", statuses: [200] },
];

let failed = false;
for (const check of checks) {
  const startedAt = performance.now();
  try {
    const response = await fetch(`${baseUrl}${check.path}`, { redirect: "manual", signal: AbortSignal.timeout(180_000) });
    const elapsedMs = Math.round(performance.now() - startedAt);
    const body = await response.text();
    const passed = check.statuses.includes(response.status);
    console.log(`${passed ? "PASS" : "FAIL"} ${check.path}: ${response.status} in ${elapsedMs} ms ${body.slice(0, 300)}`);
    failed ||= !passed;
  } catch (error) {
    failed = true;
    console.error(`FAIL ${check.path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
if (failed) process.exitCode = 1;
