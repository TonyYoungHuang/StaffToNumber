import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import sitemap from "../app/sitemap.js";
import { middleware } from "../middleware.js";
import {
  getLocalizedAlternates,
  localeFromPublicPath,
  localizePublicHref,
  localizePublicPath,
  stripPublicLocalePrefix,
} from "./locale-routing.js";

test("public locale paths have one stable English and Chinese form", () => {
  assert.equal(localizePublicPath("/", "en"), "/");
  assert.equal(localizePublicPath("/", "zh-CN"), "/zh-cn");
  assert.equal(localizePublicPath("/about", "zh-CN"), "/zh-cn/about");
  assert.equal(localizePublicPath("/zh-cn/about/", "en"), "/about");
  assert.equal(stripPublicLocalePrefix("/zh-CN/library/bach"), "/library/bach");
  assert.equal(localeFromPublicPath("/zh-cn/teaching"), "zh-CN");
  assert.equal(localeFromPublicPath("/teaching"), "en");
});

test("localized hrefs preserve query strings and fragments without rewriting assets or external URLs", () => {
  assert.equal(localizePublicHref("/library?q=bach#scores", "zh-CN"), "/zh-cn/library?q=bach#scores");
  assert.equal(localizePublicHref("/#pricing", "zh-CN"), "/zh-cn#pricing");
  assert.equal(localizePublicHref("/product/score.png", "zh-CN"), "/product/score.png");
  assert.equal(localizePublicHref("https://app.scoretransposer.com/login", "zh-CN"), "https://app.scoretransposer.com/login");
});

test("metadata alternates are self-canonical and bidirectional", () => {
  const english = getLocalizedAlternates("/score-editor", "en");
  const chinese = getLocalizedAlternates("/score-editor", "zh-CN");
  assert.equal(english.canonical, "/score-editor");
  assert.equal(chinese.canonical, "/zh-cn/score-editor");
  assert.deepEqual(english.languages, {
    en: "/score-editor",
    "zh-CN": "/zh-cn/score-editor",
    "x-default": "/score-editor",
  });
  assert.deepEqual(chinese.languages, english.languages);
});

test("the request URL, not a locale cookie, selects public HTML language", () => {
  const englishResponse = middleware(new NextRequest("https://scoretransposer.com/about", { headers: { cookie: "score_locale=zh-CN" } }));
  const chineseResponse = middleware(new NextRequest("https://scoretransposer.com/zh-cn/about?source=search", { headers: { cookie: "score_locale=en" } }));

  assert.equal(englishResponse.headers.get("x-middleware-request-x-score-route-locale"), "en");
  assert.equal(chineseResponse.headers.get("x-middleware-request-x-score-route-locale"), "zh-CN");
  assert.equal(chineseResponse.headers.get("x-middleware-rewrite"), "https://scoretransposer.com/about?source=search");
});

test("edge middleware permanently redirects every legacy public origin before locale routing", () => {
  for (const source of [
    "http://scoretransposer.com/library/bach?instrument=piano",
    "http://www.scoretransposer.com/library/bach?instrument=piano",
    "https://www.scoretransposer.com/library/bach?instrument=piano",
  ]) {
    const response = middleware(new NextRequest(source));
    assert.equal(response.status, 308);
    assert.equal(response.headers.get("location"), "https://scoretransposer.com/library/bach?instrument=piano");
  }
});

test("edge middleware reads the public origin from proxy headers", () => {
  const response = middleware(new NextRequest("http://127.0.0.1:3101/faq?source=redirect", {
    headers: {
      host: "www.scoretransposer.com",
      "x-forwarded-proto": "https",
    },
  }));

  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://scoretransposer.com/faq?source=redirect");
});

test("edge middleware normalizes the locale prefix spelling to one Chinese URL", () => {
  const response = middleware(new NextRequest("https://scoretransposer.com/zh-CN/about?source=search"));
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://scoretransposer.com/zh-cn/about?source=search");
});

test("sitemap publishes every indexable route in paired English and Chinese entries", () => {
  const entries = sitemap();
  assert.ok(entries.length > 0);
  assert.equal(entries.length % 2, 0);

  const urls = new Set(entries.map((entry) => entry.url));
  assert.equal(urls.size, entries.length);
  for (const entry of entries) {
    const languages = entry.alternates?.languages;
    assert.ok(languages);
    assert.ok(urls.has(String(languages.en)));
    assert.ok(urls.has(String(languages["zh-CN"])));
    assert.equal(languages["x-default"], languages.en);
  }
});
