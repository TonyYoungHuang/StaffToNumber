import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const publicRoot = path.join(appRoot, "public");
const pageSource = readFileSync(path.join(appRoot, "src", "app", "page.tsx"), "utf8");

const englishDemoNames = [
  "demo-score-editor-en",
  "demo-transpose-score-en",
  "demo-staff-to-jianpu-en",
  "demo-score-to-audio-en",
] as const;

test("English homepage demos use dedicated English recordings and posters", () => {
  for (const name of englishDemoNames) {
    for (const extension of ["mp4", "jpg"] as const) {
      const suffix = extension === "jpg" ? "-poster.jpg" : ".mp4";
      const assetPath = path.join(publicRoot, "product", `${name}${suffix}`);
      assert.equal(existsSync(assetPath), true, `${assetPath} should exist`);
      assert.ok(statSync(assetPath).size > 20_000, `${assetPath} should contain real media`);
      assert.match(pageSource, new RegExp(`${name}${suffix.replace(".", "\\.")}`));
    }
  }

  assert.match(pageSource, /isChinese \? demo\.videoZh : demo\.videoEn/u);
  assert.match(pageSource, /isChinese \? demo\.posterZh : demo\.posterEn/u);
});

test("homepage score showcase excludes the Chinese Hanon scan", () => {
  const beethoven = path.join(publicRoot, "product", "score-samples", "beethoven-appassionata.webp");
  const hanon = path.join(publicRoot, "product", "score-samples", "hanon-exercise.webp");

  assert.equal(existsSync(beethoven), true);
  assert.ok(statSync(beethoven).size > 50_000);
  assert.equal(existsSync(hanon), false);
  assert.doesNotMatch(pageSource, /hanon-exercise/u);
});
