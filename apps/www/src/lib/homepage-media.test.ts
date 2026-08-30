import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { HOMEPAGE_DEMO_MEDIA_SLUGS, getHomepageDemoProductMedia } from "./product-media/index.js";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const publicRoot = path.join(appRoot, "public");
const pageSource = readFileSync(path.join(appRoot, "src", "app", "page.tsx"), "utf8");

test("homepage demos resolve only complete, same-locale recordings and posters", () => {
  for (const locale of SUPPORTED_LOCALES) {
    for (const slug of HOMEPAGE_DEMO_MEDIA_SLUGS) {
      const media = getHomepageDemoProductMedia(slug, locale);
      if (!media) continue;
      assert.equal(media.sourceLocale, locale);
      for (const src of [media.poster.src, media.video.src]) {
        const assetPath = path.join(publicRoot, ...src.slice(1).split("/"));
        assert.equal(existsSync(assetPath), true, `${assetPath} should exist`);
        assert.ok(statSync(assetPath).size > 20_000, `${assetPath} should contain real media`);
      }
    }
  }

  assert.match(pageSource, /getHomepageDemoProductMedia\(demo\.slug, locale\)/u);
  assert.match(pageSource, /getPendingProductMediaPresentation\(locale, title\)/u);
  assert.doesNotMatch(pageSource, /isChinese|videoEn|videoZh|posterEn|posterZh/u);
  assert.doesNotMatch(pageSource, /demo-[^"']+\.(?:mp4|webm|jpg)/u);
});

test("homepage score showcase excludes the Chinese Hanon scan", () => {
  const beethoven = path.join(publicRoot, "product", "score-samples", "beethoven-appassionata.webp");
  const hanon = path.join(publicRoot, "product", "score-samples", "hanon-exercise.webp");

  assert.equal(existsSync(beethoven), true);
  assert.ok(statSync(beethoven).size > 50_000);
  assert.equal(existsSync(hanon), false);
  assert.doesNotMatch(pageSource, /hanon-exercise/u);
});
