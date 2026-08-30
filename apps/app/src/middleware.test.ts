import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { config, middleware } from "./middleware.js";

const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://scoretransposer.com";

test("the Edge middleware hands the app root to the public site with the shared locale", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const response = middleware(new NextRequest("https://app.scoretransposer.com/", {
      headers: { cookie: `score_locale=${encodeURIComponent(locale)}` },
    }));
    const location = new URL(response.headers.get("location") ?? "");
    assert.equal(response.status, 307);
    assert.equal(location.origin, new URL(publicSiteUrl).origin);
    assert.equal(location.pathname, "/api/locale");
    assert.equal(location.searchParams.get("locale"), locale);
    assert.equal(location.searchParams.get("next"), "/");
  }
});

test("the app root middleware defaults malformed or missing locale cookies to English", () => {
  for (const cookie of [undefined, "score_locale=unsupported", "score_locale=%E0%A4%A"]) {
    const response = middleware(new NextRequest("https://app.scoretransposer.com/", {
      headers: cookie ? { cookie } : undefined,
    }));
    const location = new URL(response.headers.get("location") ?? "");
    assert.equal(location.searchParams.get("locale"), "en");
  }
  assert.equal(config.matcher, "/");
});
