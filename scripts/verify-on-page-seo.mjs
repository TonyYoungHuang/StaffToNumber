import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { load } from "cheerio";

const baseUrl = process.argv[2] || "http://localhost:3100";
const outputDir = path.resolve(process.argv[3] || "artifacts/on-page-seo");
const publicOrigin = "https://scoretransposer.com";
const prefixes = ["", "/zh-cn", "/zh-tw", "/ja", "/ko", "/fr", "/es", "/de", "/ru"];
const pages = [
  ["/", "Sheet Music Scanner, Transposer & Editor", "sheet music scanner", 0],
  ["/sheet-music-scanner", "Sheet Music Scanner for PDF & Images", "sheet music scanner", 5],
  ["/pdf-to-musicxml", "PDF to MusicXML Converter", "pdf to musicxml", 4],
  ["/score-editor", "Sheet Music Maker & Online Notation Editor", "sheet music maker", 4],
  ["/musicxml-midi", "MIDI to Sheet Music & Sheet Music to MIDI Converter", "midi to sheet music", 5],
  ["/transpose-score", "Transpose Sheet Music Online", "transpose sheet music", 4],
  ["/staff-to-jianpu", "Convert Staff Notation to Jianpu Online", "staff notation to jianpu", 0],
  ["/es", "Escáner de partituras, transpositor y editor", "escáner de partituras", 0],
  ["/es/sheet-music-scanner", "Escáner de partituras PDF e imágenes", "escáner de partituras", 5],
  ["/es/pdf-to-musicxml", "Conversor de PDF a MusicXML", "pdf a musicxml", 4],
  ["/es/score-editor", "Creador de partituras y editor de notación en línea", "creador de partituras", 4],
  ["/es/musicxml-midi", "Conversor de MIDI a partitura y de partitura a MIDI", "midi a partitura", 5],
  ["/es/transpose-score", "Transponer partituras en línea", "transponer partituras", 4],
  ["/es/staff-to-jianpu", "Convertir pentagrama a Jianpu en línea", "pentagrama a jianpu", 0],
];
const normalize = (value) => value.replace(/\s+/gu, " ").trim();
const fetchPage = (pathname, options = {}) => fetch(new URL(pathname, baseUrl), {
  headers: { "user-agent": "Googlebot" }, signal: AbortSignal.timeout(30000), ...options,
});
const report = { baseUrl, checkedAt: new Date().toISOString(), pages: [], redirects: [], localizedScanners: [], socialImages: [] };
const descriptions = new Set();
const questions = new Set();
await fs.mkdir(outputDir, { recursive: true });

for (const [pathname, heading, keyword, faqCount] of pages) {
  const response = await fetchPage(pathname);
  assert.equal(response.status, 200, pathname);
  const html = await response.text();
  const $ = load(html);
  assert.equal($("h1").length, 1, `${pathname}: single H1`);
  assert.equal(normalize($("h1").text()), heading, `${pathname}: H1`);
  assert.ok($("title").text().toLowerCase().includes(keyword), `${pathname}: title intent`);
  assert.ok($("h2").first().text().toLowerCase().includes(keyword), `${pathname}: first H2 intent`);
  assert.equal($("meta[name=keywords]").length, 0, `${pathname}: no obsolete keywords tag`);
  assert.equal(new URL($("link[rel=canonical]").attr("href")).href, new URL(pathname, publicOrigin).href, `${pathname}: canonical`);
  assert.equal($("link[rel=alternate][hreflang]").length, 10, `${pathname}: hreflang`);
  assert.doesNotMatch($("meta[name=robots]").attr("content") || "", /noindex/u, `${pathname}: indexable`);
  const description = $("meta[name=description]").attr("content");
  assert.ok(description && !descriptions.has(description), `${pathname}: unique description`);
  descriptions.add(description);
  const introduction = pathname === "/" || pathname === "/es" ? $("#home-title").next("p").text() : $(".page-banner").find("p").toArray().map(el => $(el).text()).join(" ");
  assert.ok(normalize(introduction).split(" ").slice(0, 100).join(" ").toLowerCase().includes(keyword), `${pathname}: opening copy`);
  const bodyText = normalize($("main").text());
  assert.ok(!bodyText.includes("Connected to the score project workflow."), `${pathname}: distinct feature cards`);
  const schemas = $("script[type='application/ld+json']").toArray().flatMap(el => JSON.parse($(el).text()));
  if (faqCount) {
    const faq = schemas.find(schema => schema["@type"] === "FAQPage");
    assert.equal(faq?.mainEntity.length, faqCount, `${pathname}: distinct FAQ`);
    for (const item of faq.mainEntity) {
      const questionAndAnswer = JSON.stringify([item.name, item.acceptedAnswer.text]);
      assert.ok(!questions.has(questionAndAnswer), `${pathname}: repeated FAQ question and answer`);
      questions.add(questionAndAnswer);
      assert.ok(bodyText.includes(normalize(item.name)), `${pathname}: visible schema question`);
      assert.ok(bodyText.includes(normalize(item.acceptedAnswer.text)), `${pathname}: visible schema answer`);
    }
    assert.ok($(".workflow-list").parent().find("a[href^='/']").length >= 3, `${pathname}: contextual workflow links`);
    if (pathname.startsWith("/es/")) {
      for (const anchor of $(".workflow-list").parent().find("a[href^='/']").toArray()) {
        assert.ok($(anchor).attr("href").startsWith("/es/"), `${pathname}: retain Spanish in workflow links`);
      }
    }
  }
  assert.equal($("a[href]").toArray().filter(el => /(?:^|\/)pdf-score-scanner(?:\/|$)/u.test($(el).attr("href"))).length, 0, `${pathname}: no retired links`);
  report.pages.push({ pathname, title: $("title").text(), h1: heading, description, headings: $("h2").map((_, el) => $(el).text()).get(), faqCount });
}

const sitemap = await (await fetchPage("/sitemap.xml")).text();
assert.ok(!sitemap.includes("/pdf-score-scanner"), "Sitemap must exclude the retired URL in all locales");
for (const prefix of prefixes) {
  const scannerPath = `${prefix}/sheet-music-scanner`;
  assert.ok(sitemap.includes(`${publicOrigin}${scannerPath}`), `${prefix}: new URL in sitemap`);
  for (const [oldPath, target] of [
    [`${prefix}/pdf-score-scanner?source=seo-review`, `${scannerPath}?source=seo-review`],
    [`${prefix}/examples/pdf-score-scanner/input`, `${prefix}/examples/sheet-music-scanner/input`],
    [`${prefix}/pdf-score-scanner/opengraph-image/default`, `${scannerPath}/opengraph-image/default`],
  ]) {
    const response = await fetchPage(oldPath, { redirect: "manual" });
    assert.equal(response.status, 301, `${oldPath}: permanent redirect`);
    const destination = new URL(response.headers.get("location"), baseUrl);
    assert.equal(destination.pathname + destination.search, target, `${oldPath}: preserve locale and query`);
    report.redirects.push({ from: oldPath, to: target, status: response.status });
  }
  const response = await fetchPage(scannerPath);
  assert.equal(response.status, 200, scannerPath);
  const $ = load(await response.text());
  assert.equal($("h1").length, 1, scannerPath);
  assert.equal($("link[rel=canonical]").attr("href"), `${publicOrigin}${scannerPath}`, scannerPath);
  assert.equal($("meta[name=keywords]").length, 0, scannerPath);
  for (const alternate of $("link[rel=alternate][hreflang]").toArray()) {
    assert.ok($(alternate).attr("href").endsWith("/sheet-music-scanner"), `${scannerPath}: migrated alternate`);
  }
  const example = await fetchPage(`${prefix}/examples/sheet-music-scanner/input`);
  assert.equal(example.status, 200, `${scannerPath}: input download`);
  const socialImage = await fetchPage(`${scannerPath}/opengraph-image/default`);
  assert.equal(socialImage.status, 200, `${scannerPath}: social image`);
  assert.match(socialImage.headers.get("content-type") || "", /^image\//u, `${scannerPath}: valid image response`);
  const imageBytes = new Uint8Array(await socialImage.arrayBuffer());
  assert.deepEqual(Array.from(imageBytes.slice(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10], `${scannerPath}: PNG signature`);
  for (const image of $("img[src]").toArray()) {
    const imageUrl = new URL($(image).attr("src"), baseUrl);
    if (imageUrl.origin !== new URL(baseUrl).origin) continue;
    const imageResponse = await fetchPage(`${imageUrl.pathname}${imageUrl.search}`);
    assert.equal(imageResponse.status, 200, `${scannerPath}: image ${imageUrl.pathname}`);
    assert.match(imageResponse.headers.get("content-type") || "", /^image\//u);
    await imageResponse.arrayBuffer();
  }
  report.localizedScanners.push({ pathname: scannerPath, lang: $("html").attr("lang"), title: $("title").text() });
}

await fs.writeFile(path.join(outputDir, "on-page-checks.json"), JSON.stringify(report, null, 2));
// Regression: first force a cache miss in next/image, then read every social card.
// Next 16.3.0's shared Sharp loader policy breaks runtime SVG rendering in that order.
let optimizerCache = "HIT";
for (const width of [32, 48, 64, 96, 128, 256, 384, 640]) {
  const optimized = await fetchPage(`/_next/image?url=${encodeURIComponent("/social/en/sheet-music-scanner.png")}&w=${width}&q=75`);
  assert.equal(optimized.status, 200, "next/image must work before social cards");
  optimizerCache = optimized.headers.get("x-nextjs-cache");
  await optimized.arrayBuffer();
  if (optimizerCache !== "HIT") break;
}
assert.notEqual(optimizerCache, "HIT", "Regression check needs an uncached image optimization");
const features = ["sheet-music-scanner", "pdf-to-musicxml", "score-editor", "musicxml-midi", "transpose-score", "staff-to-jianpu", "jianpu-to-staff", "score-to-audio", "audio-to-score", "teaching", "pricing"];
for (const prefix of prefixes) for (const slug of features) {
  const pathname = `${prefix}/${slug}/opengraph-image/default`;
  const response = await fetchPage(pathname);
  assert.equal(response.status, 200, pathname);
  const png = Buffer.from(await response.arrayBuffer());
  assert.deepEqual(Array.from(png.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10], pathname);
  assert.equal(png.readUInt32BE(16), 1200, `${pathname}: width`);
  assert.equal(png.readUInt32BE(20), 630, `${pathname}: height`);
  report.socialImages.push({ pathname, bytes: png.length, width: 1200, height: 630 });
}
await fs.writeFile(path.join(outputDir, "on-page-checks.json"), JSON.stringify(report, null, 2));
console.log(`Passed: ${pages.length} English/Spanish landing pages, ${prefixes.length} localized scanners, ${report.redirects.length} permanent redirects and ${report.socialImages.length} social images after next/image. Report: ${outputDir}`);
