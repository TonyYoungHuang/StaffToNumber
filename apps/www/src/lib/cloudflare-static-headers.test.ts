import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("fingerprinted Next.js assets use an immutable one-year browser cache", () => {
  const headersFile = fs.readFileSync(path.join(process.cwd(), "public", "_headers"), "utf8");

  assert.match(headersFile, /^\/_next\/static\/\*$/mu);
  assert.match(headersFile, /^\s+Cache-Control:\s*public,\s*max-age=31536000,\s*immutable$/mu);
});

test("public evidence assets reach the Worker before static delivery so canonical-host redirects apply", () => {
  const expectedPublicAssetRoutes = ["/product/*", "/examples/*", "/library/*", "/research/*"];

  for (const environment of ["staging", "production"]) {
    const configPath = path.join(process.cwd(), `wrangler.${environment}.jsonc`);
    const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
      assets?: { binding?: string; run_worker_first?: string[] };
    };

    assert.equal(config.assets?.binding, "ASSETS");
    assert.deepEqual(config.assets?.run_worker_first, expectedPublicAssetRoutes);
  }
});
