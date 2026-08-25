import assert from "node:assert/strict";
import test from "node:test";
import { getCanonicalPublicUrl } from "./canonical-host.js";

const redirectCases = [
  "http://scoretransposer.com/library/bach?instrument=piano&level=easy",
  "http://www.scoretransposer.com/library/bach?instrument=piano&level=easy",
  "https://www.scoretransposer.com/library/bach?instrument=piano&level=easy",
] as const;

for (const source of redirectCases) {
  test(`${new URL(source).origin} redirects to the canonical HTTPS origin`, () => {
    assert.equal(
      getCanonicalPublicUrl(new URL(source))?.toString(),
      "https://scoretransposer.com/library/bach?instrument=piano&level=easy",
    );
  });
}

test("canonical HTTPS requests pass through without a redirect", () => {
  assert.equal(getCanonicalPublicUrl(new URL("https://scoretransposer.com/teaching?ref=seo")), null);
});

test("proxy origin headers take precedence over an internal runtime URL", () => {
  const internalUrl = new URL("http://127.0.0.1:3101/faq?source=redirect");

  assert.equal(
    getCanonicalPublicUrl(internalUrl, {
      hostname: "www.scoretransposer.com:443",
      protocol: "https",
    })?.toString(),
    "https://scoretransposer.com/faq?source=redirect",
  );
  assert.equal(
    getCanonicalPublicUrl(internalUrl, {
      hostname: "scoretransposer.com",
      protocol: "https",
    }),
    null,
  );
});

test("local, preview, and sibling application hosts are not rewritten", () => {
  assert.equal(getCanonicalPublicUrl(new URL("http://localhost:3000/teaching")), null);
  assert.equal(getCanonicalPublicUrl(new URL("https://preview.example.workers.dev/teaching")), null);
  assert.equal(getCanonicalPublicUrl(new URL("https://app.scoretransposer.com/scores")), null);
});

test("a DNS trailing dot and explicit port are removed from the canonical destination", () => {
  assert.equal(
    getCanonicalPublicUrl(new URL("http://www.scoretransposer.com.:8080/faq?q=redirect"))?.toString(),
    "https://scoretransposer.com/faq?q=redirect",
  );
});
