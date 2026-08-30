import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@score/i18n";
import {
  FEATURE_PRODUCT_MEDIA_SLUGS,
  HOMEPAGE_DEMO_MEDIA_SLUGS,
  PRODUCT_MEDIA_CAPTURE_PLANS,
  PRODUCT_MEDIA_READY_ASSETS,
  PRODUCT_MEDIA_REGISTRY,
  PRODUCT_MEDIA_SLOT_IDS,
  getFeatureProductMedia,
  getHomepageDemoProductMedia,
  getHomepageProductMediaRequestSet,
  getPendingProductMediaPresentation,
  getPlannedProductMediaSources,
  getProductMediaPresentation,
  getProductMediaVariant,
  getStaticMarketingProductMedia,
  getSupportLegalProductMedia,
  getWorkspacePreviewProductMedia,
  listPendingProductMediaOutputs,
  type ProductMediaOutput,
  type ProductMediaSlot,
  type ReadyProductMediaVariant,
} from "./index.js";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const repositoryRoot = path.resolve(appRoot, "../..");
const publicRoot = path.join(appRoot, "public");

function outputEntries(asset: ReadyProductMediaVariant) {
  return (["image", "poster", "video"] as const).flatMap((kind) => {
    const output = asset[kind];
    return output ? [{ kind, output }] : [];
  });
}

function outputFile(output: ProductMediaOutput) {
  return path.join(publicRoot, ...output.src.slice(1).split("/"));
}

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(appRoot, relativePath), "utf8");
}

test("the typed registry covers every slot and locale with an explicit ready or pending state", () => {
  assert.equal(PRODUCT_MEDIA_CAPTURE_PLANS.length, 16);
  assert.deepEqual(PRODUCT_MEDIA_SLOT_IDS, PRODUCT_MEDIA_CAPTURE_PLANS.map((plan) => plan.slot));
  assert.equal(new Set(PRODUCT_MEDIA_SLOT_IDS).size, PRODUCT_MEDIA_SLOT_IDS.length);

  let readyVariants = 0;
  let pendingVariants = 0;
  let expectedOutputFiles = 0;
  for (const plan of PRODUCT_MEDIA_CAPTURE_PLANS) {
    assert.deepEqual(Object.keys(PRODUCT_MEDIA_REGISTRY[plan.slot]), [...SUPPORTED_LOCALES]);
    for (const locale of SUPPORTED_LOCALES) {
      const variant = getProductMediaVariant(plan.slot, locale);
      assert.equal(variant.slot, plan.slot);
      assert.equal(variant.locale, locale);
      expectedOutputFiles += plan.kind === "demo" ? 2 : 1;
      if (variant.status === "ready") {
        readyVariants += 1;
        assert.equal(variant.sourceLocale, locale, `${plan.slot}/${locale} must be captured in the requested UI locale`);
      } else {
        pendingVariants += 1;
        assert.equal(variant.sourceLocale, null);
        const planned = getPlannedProductMediaSources(plan.slot, locale);
        assert.equal(variant.plannedImageSrc, planned.image);
        assert.equal(variant.plannedPosterSrc, planned.poster);
        assert.equal(variant.plannedVideoSrc, planned.video);
      }
    }
  }

  assert.equal(readyVariants, PRODUCT_MEDIA_READY_ASSETS.length);
  assert.equal(readyVariants + pendingVariants, PRODUCT_MEDIA_CAPTURE_PLANS.length * SUPPORTED_LOCALES.length);
  assert.equal(
    PRODUCT_MEDIA_READY_ASSETS.flatMap(outputEntries).length + listPendingProductMediaOutputs().length,
    expectedOutputFiles,
  );
});

test("ready evidence is truthful, present on disk, hash-stable, and binary-unique", () => {
  const hashes = new Map<string, string>();
  for (const asset of PRODUCT_MEDIA_READY_ASSETS) {
    assert.equal(asset.sourceLocale, asset.locale);
    assert.match(asset.capturedAt, /^\d{4}-\d{2}-\d{2}$/u);
    assert.match(asset.sourceRoute, /^\//u);
    assert.ok(asset.sourceRevision.length >= 7);
    assert.ok(["legacy-real-product-capture", "agent-browser"].includes(asset.captureMethod));

    for (const { kind, output } of outputEntries(asset)) {
      const filePath = outputFile(output);
      assert.equal(fs.existsSync(filePath), true, `${asset.slot}/${asset.locale}/${kind} must exist`);
      const bytes = fs.readFileSync(filePath);
      const digest = createHash("sha256").update(bytes).digest("hex");
      assert.equal(bytes.length, output.bytes, `${output.src} byte evidence`);
      assert.equal(digest, output.sha256, `${output.src} SHA-256 evidence`);
      assert.ok(output.width > 0 && output.height > 0);
      assert.equal(hashes.has(digest), false, `${output.src} must not copy ${hashes.get(digest)}`);
      hashes.set(digest, output.src);
    }
  }
});

test("resolvers never return a different-language product interface", () => {
  for (const locale of SUPPORTED_LOCALES) {
    for (const slug of FEATURE_PRODUCT_MEDIA_SLUGS) {
      const media = getFeatureProductMedia(slug, locale);
      if (media) {
        assert.equal(media.requestedLocale, locale);
        assert.equal(media.sourceLocale, locale);
        assert.equal(media.localized, true);
      }
    }
    for (const slug of HOMEPAGE_DEMO_MEDIA_SLUGS) {
      const media = getHomepageDemoProductMedia(slug, locale);
      if (media) {
        assert.equal(media.requestedLocale, locale);
        assert.equal(media.sourceLocale, locale);
        assert.equal(media.localized, true);
      }
    }
    for (const page of ["about", "faq", "readingGuide", "numberedNotation"] as const) {
      const media = getStaticMarketingProductMedia(page, locale);
      if (media) assert.equal(media.sourceLocale, locale);
    }
    const support = getSupportLegalProductMedia(locale);
    const workspace = getWorkspacePreviewProductMedia(locale);
    if (support) assert.equal(support.sourceLocale, locale);
    if (workspace) assert.equal(workspace.sourceLocale, locale);
  }

  for (const requested of SUPPORTED_LOCALES) {
    for (const source of SUPPORTED_LOCALES.filter((locale) => locale !== requested)) {
      assert.throws(
        () => getProductMediaPresentation(requested, source, "Product workflow"),
        /Cross-locale product media is not displayable/u,
      );
    }
  }
});

test("pending media has nonempty localized placeholders instead of visible fallback URLs", () => {
  const titles = new Set<string>();
  for (const locale of SUPPORTED_LOCALES) {
    const pending = getPendingProductMediaPresentation(locale, "Score editor");
    assert.ok(pending.title.trim());
    assert.ok(pending.body.trim());
    assert.ok(pending.ariaLabel.trim());
    titles.add(pending.title);
  }
  assert.equal(titles.size, SUPPORTED_LOCALES.length);

  const pendingSources = new Set(listPendingProductMediaOutputs().map((item) => item.src));
  for (const locale of SUPPORTED_LOCALES) {
    const requested = getHomepageProductMediaRequestSet(locale);
    assert.equal(new Set(requested).size, requested.length);
    for (const src of requested) {
      assert.equal(pendingSources.has(src), false, `${locale} must not request pending ${src}`);
      const exact = PRODUCT_MEDIA_READY_ASSETS.find(
        (asset) => asset.locale === locale && outputEntries(asset).some(({ output }) => output.src === src),
      );
      assert.ok(exact, `${locale} homepage media ${src} must be an exact-locale ready asset`);
    }
  }
});

test("capture plans use one stable score fixture and reserve unique locale output paths", () => {
  const scorePlans = PRODUCT_MEDIA_CAPTURE_PLANS.filter((plan) => plan.requiresScoreFixture);
  assert.ok(scorePlans.length > 0);
  assert.deepEqual(new Set(scorePlans.map((plan) => plan.target.routeTemplate)), new Set(["/scores/{scoreId}"]));
  assert.ok(scorePlans.every((plan) => plan.target.selector.startsWith("#")));

  const planned = new Set<string>();
  for (const plan of PRODUCT_MEDIA_CAPTURE_PLANS) {
    for (const locale of SUPPORTED_LOCALES) {
      const sources = getPlannedProductMediaSources(plan.slot, locale);
      for (const src of Object.values(sources)) {
        assert.match(src, new RegExp(`^/product/localized/${locale.toLowerCase()}/`, "u"));
        assert.equal(planned.has(src), false, `planned product-media path must be unique: ${src}`);
        planned.add(src);
      }
    }
  }
  assert.equal(
    getPlannedProductMediaSources("feature.pricing", "ja").image,
    "/product/localized/ja/feature-pricing-real.jpg",
  );
  for (const slot of [
    "feature.transpose-score",
    "feature.score-to-audio",
    "feature.audio-to-score",
    "feature.musicxml-midi",
    "feature.pdf-to-musicxml",
    "workspace.preview",
  ] as const) {
    const image = getPlannedProductMediaSources(slot, "de").image;
    assert.ok(image, `${slot} must plan an image output`);
    assert.match(image, /\.jpg$/u, slot);
  }
});

test("homepage and metadata code select exact current-locale media and omit pending images", () => {
  const homepage = readSource("src/app/page.tsx");
  assert.match(homepage, /getHomepageCaseProductMedia\(item\.slug, locale\)/u);
  assert.match(homepage, /getHomepageDemoProductMedia\(demo\.slug, locale\)/u);
  assert.match(homepage, /getPendingProductMediaPresentation\(locale,/u);
  assert.match(homepage, /className=\{styles\.mediaPlaceholder\}/u);
  assert.doesNotMatch(homepage, /\bisChinese\b|videoEn|videoZh|posterEn|posterZh/u);
  assert.doesNotMatch(homepage, /\/product\/(?:feature-[^"']+|demo-[^"']+)\.(?:png|jpe?g|mp4|webm)/u);

  const metadataFiles = [
    "src/app/layout.tsx",
    "src/app/features/page.tsx",
    "src/app/library/page.tsx",
    "src/app/library/[scoreSlug]/page.tsx",
    "src/app/about/page.tsx",
    "src/app/faq/page.tsx",
    "src/app/how-to-read-sheet-music/page.tsx",
    "src/app/numbered-notation-converter/page.tsx",
    "src/app/support/page.tsx",
    "src/app/copyright-complaint/page.tsx",
    "src/app/privacy/page.tsx",
    "src/app/terms/page.tsx",
  ];
  for (const file of metadataFiles) {
    const source = readSource(file);
    assert.match(source, /const media = get(?:WorkspacePreview|Feature|StaticMarketing|SupportLegal)ProductMedia|const media = get(?:StaticMarketing|SupportLegal)Media/u, file);
    assert.match(source, /media && mediaPresentation \? \{ images:/u, file);
    assert.doesNotMatch(source, /score-preview-output-real\.png|\/product\/feature-[^"']+\.png/u, file);
    assert.doesNotMatch(source, /\?\?\s*get\w+ProductMedia\([^,]+,\s*["']en["']\)/u, file);
  }

  const featureDetail = readSource("src/app/[featureSlug]/page.tsx");
  assert.match(featureDetail, /seo\.screenshot \? \(/u);
  assert.match(featureDetail, /seo\.pendingMedia/u);
  assert.doesNotMatch(featureDetail, /score-preview-output-real\.png/u);
  const featureOg = readSource("src/app/[featureSlug]/opengraph-image.tsx");
  assert.doesNotMatch(featureOg, /\/product\//u);
});

test("capture automation dry-run works from the repository root without auth or a browser session", () => {
  const script = path.join(repositoryRoot, "scripts", "capture-localized-product-media.ts");
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", script, "--plan", "--locales=ru", "--slots=feature.score-editor"],
    { cwd: repositoryRoot, encoding: "utf8", windowsHide: true },
  );
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout) as {
    selectedJobs: number;
    pendingJobs: number;
    totalPendingOutputFiles: number;
    jobs: Array<{ slot: ProductMediaSlot; locale: SupportedLocale; status: string; planned: { image: string } }>;
  };
  assert.equal(plan.selectedJobs, 1);
  assert.equal(plan.pendingJobs, 0);
  assert.equal(plan.totalPendingOutputFiles, 0);
  assert.deepEqual(plan.jobs[0], {
    slot: "feature.score-editor",
    locale: "ru",
    status: "ready",
    planned: { image: "/product/localized/ru/feature-score-editor-real.png" },
  });
});

test("capture and bootstrap scripts preserve browser evidence and forbid post-edited locale clones", () => {
  const capture = fs.readFileSync(path.join(repositoryRoot, "scripts", "capture-localized-product-media.ts"), "utf8");
  const bootstrap = fs.readFileSync(path.join(repositoryRoot, "scripts", "bootstrap-localized-product-media.ts"), "utf8");
  const budget = readSource("scripts/check-homepage-budget.mjs");

  for (const marker of [
    '"agent-browser"',
    "/api/locale?locale=",
    '"wait", "--load", "domcontentloaded"',
    "document.documentElement.lang",
    '"errors"',
    '"screenshot"',
    '"record", "start"',
    '"record", "stop"',
    '"close"',
    "PRODUCT_MEDIA_SCORE_ID",
    "PRODUCT_MEDIA_SOURCE_REVISION",
    "PRODUCT_MEDIA_CAPTURED_AT",
    "PRODUCT_MEDIA_AGENT_BROWSER_ARGS",
  ]) {
    assert.ok(capture.includes(marker), marker);
  }
  assert.doesNotMatch(capture, /copyFileSync|sharp|canvas|imagegen|postprocess/iu);
  assert.match(capture, /assertBinaryUniqueness\(merged\)/u);
  assert.match(capture, /mergeCapturedEvidence\(captured\)/u);
  assert.match(capture, /readVideoDimensions/u);
  assert.match(capture, /sourceLocale:\s*locale/u);

  assert.match(bootstrap, /createOmrCandidateFixture\(context, "localized-product-media", "satb"\)/u);
  assert.match(bootstrap, /score-auth-token/u);
  assert.match(bootstrap, /agent-browser-state\.json/u);
  assert.match(bootstrap, /candidate\/accept/u);
  assert.match(bootstrap, /vexflow-satb-page-chromium-/u);
  assert.doesNotMatch(bootstrap, /feature-[^"']+-real\.png/u);

  assert.match(budget, /capture-evidence\.json/u);
  assert.match(budget, /currentLocaleHomepageMedia/u);
  assert.match(budget, /localizedProductMediaRepositoryTotal/u);
  assert.match(budget, /asset\.locale === locale/u);
});
