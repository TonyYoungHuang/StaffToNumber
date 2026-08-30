import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { GET, POST, safeSameOriginNextUrl } from "./route.js";

const origin = "https://app.scoretransposer.com";

test("safe locale return URLs preserve same-origin paths, queries, and fragments", () => {
  const request = new NextRequest(`${origin}/api/locale`);
  assert.equal(
    safeSameOriginNextUrl(request, "/scores/score-1?tab=editor#measure-8").toString(),
    `${origin}/scores/score-1?tab=editor#measure-8`,
  );
  assert.equal(
    safeSameOriginNextUrl(request, `${origin}/scores/new/scan?from=header`).toString(),
    `${origin}/scores/new/scan?from=header`,
  );
});

test("safe locale return URLs reject cross-origin, network-path, backslash, and malformed values", () => {
  const request = new NextRequest(`${origin}/api/locale`);
  const unsafeValues = [
    "//evil.example/scores",
    "https://evil.example/scores",
    "https://app.scoretransposer.com.evil.example/scores",
    "/\\evil.example/scores",
    "/%5c%5cevil.example/scores",
    "/%255c%255cevil.example/scores",
    "/%252f%252fevil.example/scores",
    "/api/auth/me",
    "/_next/static/chunk.js",
    "/%2561pi/auth/me",
    "scores/score-1",
    " /scores/score-1",
    "/%E0%A4%A",
    "/scores/\u0000next",
  ];

  for (const value of unsafeValues) {
    assert.equal(safeSameOriginNextUrl(request, value).toString(), `${origin}/`, value);
  }
});

test("GET sets every supported locale and redirects only within the request origin", async () => {
  const previousDomain = process.env.NEXT_PUBLIC_LOCALE_COOKIE_DOMAIN;
  process.env.NEXT_PUBLIC_LOCALE_COOKIE_DOMAIN = ".scoretransposer.com";

  try {
    for (const locale of SUPPORTED_LOCALES) {
      const request = new NextRequest(`${origin}/api/locale?locale=${encodeURIComponent(locale)}&next=${encodeURIComponent("/scores/score-1?tab=editor")}`);
      const response = await GET(request);
      assert.equal(response.status, 307);
      assert.equal(response.headers.get("location"), `${origin}/scores/score-1?tab=editor`);
      const cookie = response.headers.get("set-cookie") ?? "";
      assert.match(cookie, new RegExp(`score_locale=${encodeURIComponent(locale)}`));
      assert.match(cookie, /Domain=\.scoretransposer\.com/u);
      assert.match(cookie, /SameSite=Lax/u);
      assert.match(cookie, /Secure/u);
    }
  } finally {
    if (previousDomain === undefined) delete process.env.NEXT_PUBLIC_LOCALE_COOKIE_DOMAIN;
    else process.env.NEXT_PUBLIC_LOCALE_COOKIE_DOMAIN = previousDomain;
  }
});

test("GET falls back to the app root for an unsafe next URL", async () => {
  const response = await GET(new NextRequest(`${origin}/api/locale?locale=de&next=${encodeURIComponent("https://evil.example/")}`));
  assert.equal(response.headers.get("location"), `${origin}/`);
  assert.match(response.headers.get("set-cookie") ?? "", /score_locale=de/u);
});

test("POST accepts all supported locales and rejects unsupported values in English", async () => {
  for (const locale of SUPPORTED_LOCALES) {
    const response = await POST(new NextRequest(`${origin}/api/locale`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { locale });
    assert.match(response.headers.get("set-cookie") ?? "", new RegExp(`score_locale=${encodeURIComponent(locale)}`));
  }

  const invalidResponse = await POST(new NextRequest(`${origin}/api/locale`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale: "pt-BR" }),
  }));
  assert.equal(invalidResponse.status, 400);
  assert.deepEqual(await invalidResponse.json(), { error: "Unsupported locale." });
  assert.equal(invalidResponse.headers.get("set-cookie"), null);
});
