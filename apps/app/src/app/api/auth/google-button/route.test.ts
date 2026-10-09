import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { GET } from "./route.js";

function env(t: TestContext, key: string, value: string) {
  const original = process.env[key]; process.env[key] = value;
  t.after(() => { if (original === undefined) delete process.env[key]; else process.env[key] = original; });
}

test("Google button cannot forward a credential to an arbitrary embedding origin", async t => {
  env(t, "NEXT_PUBLIC_SITE_URL", "https://scoretransposer.com");
  for (const parent of ["", "https://evil.example", "https://scoretransposer.com.evil.example", "https://scoretransposer.com/path", "null"]) {
    const response = await GET(new Request(`https://app.scoretransposer.com/api/auth/google-button?parent=${encodeURIComponent(parent)}`));
    assert.equal(response.status, 403);
    assert.equal(await response.text(), "");
  }
});

test("Google button confines embedding, escapes script data and prevents caching/indexing", async t => {
  env(t, "NEXT_PUBLIC_SITE_URL", "https://scoretransposer.com");
  env(t, "NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test-client</script>");
  const response = await GET(new Request("https://app.scoretransposer.com/api/auth/google-button?parent=https%3A%2F%2Fscoretransposer.com&locale=fr"));
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-security-policy") || "", /frame-ancestors https:\/\/scoretransposer\.com$/u);
  assert.match(response.headers.get("cache-control") || "", /no-store/u);
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.match(html, /<html lang="fr">/u);
  assert.ok(!html.includes("test-client</script>"));
  assert.match(html, /config\.parent\)/u);
});
