import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("fingerprinted Next.js assets use an immutable one-year browser cache", () => {
  const headersFile = fs.readFileSync(path.join(process.cwd(), "public", "_headers"), "utf8");

  assert.match(headersFile, /^\/_next\/static\/\*$/mu);
  assert.match(headersFile, /^\s+Cache-Control:\s*public,\s*max-age=31536000,\s*immutable$/mu);
});
