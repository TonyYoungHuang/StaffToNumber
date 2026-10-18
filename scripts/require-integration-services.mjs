/** Dedicated integration gates require real services locally and in CI. Never
 * inspect application env files or print connection strings. */
const names = process.argv.slice(2);
const required = names.length ? names : ["POSTGRES_TEST_URL", "JOB_BROKER_TEST_URL"];
const missing = required.filter(name => !process.env[name]?.trim());
if (missing.length) {
  console.error(`Integration prerequisites missing: ${missing.join(", ")}. Configure isolated test services; this gate cannot skip them.`);
  process.exitCode = 1;
}
