import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import * as cheerio from "cheerio";

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) args[key] = true;
    else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const baseUrl = new URL(String(args["base-url"] || process.env.SEO_AUDIT_BASE_URL || "http://127.0.0.1:3000"));
const outputPath = path.resolve(String(args.output || "artifacts/production-seo-audit.json"));
const timeoutMs = Number(args.timeout || 15000);
const requiredFeaturePaths = String(args["required-paths"] || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const expectedSitemapCount = args["expected-sitemap-count"] == null
  ? null
  : Number(args["expected-sitemap-count"]);
const socialMetadataPaths = new Set([
  "/about",
  "/faq",
  "/support",
  "/privacy",
  "/terms",
  "/copyright-complaint",
]);
const localeConfigs = [
  { code: "en", htmlLang: "en", prefix: "" },
  { code: "zh-CN", htmlLang: "zh-CN", prefix: "/zh-cn" },
  { code: "zh-TW", htmlLang: "zh-TW", prefix: "/zh-tw" },
  { code: "ja", htmlLang: "ja", prefix: "/ja" },
  { code: "ko", htmlLang: "ko", prefix: "/ko" },
  { code: "fr", htmlLang: "fr", prefix: "/fr" },
  { code: "es", htmlLang: "es", prefix: "/es" },
  { code: "de", htmlLang: "de", prefix: "/de" },
  { code: "ru", htmlLang: "ru", prefix: "/ru" },
];
const defaultLocaleConfig = localeConfigs[0];
const prefixedLocaleConfigs = localeConfigs.filter((locale) => locale.prefix).sort((left, right) => right.prefix.length - left.prefix.length);
const guideLocaleCodes = new Set(["en", "zh-CN"]);
const issues = [];
const pages = [];
const nextStaticAssets = new Set();

function issue(severity, scope, message) {
  issues.push({ severity, scope, message });
}

async function request(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { redirect: "follow", signal: controller.signal, headers: { "user-agent": "ScoreTransposerReleaseAudit/1.0" }, ...options });
  } finally {
    clearTimeout(timer);
  }
}

function absoluteUrl(value, pageUrl) {
  try {
    return new URL(value, pageUrl).toString();
  } catch {
    return null;
  }
}

function comparableUrl(value, pageUrl) {
  const absolute = absoluteUrl(value, pageUrl);
  if (!absolute) return null;
  const parsed = new URL(absolute);
  return parsed.pathname === "/" && !parsed.search && !parsed.hash ? parsed.origin : parsed.toString();
}

function normalizePathname(pathname) {
  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (withLeadingSlash === "/") return "/";
  return withLeadingSlash.replace(/\/+$/u, "");
}

function getRouteInfo(pathname) {
  const normalizedPathname = normalizePathname(pathname);
  for (const locale of prefixedLocaleConfigs) {
    if (normalizedPathname === locale.prefix || normalizedPathname.startsWith(`${locale.prefix}/`)) {
      const stripped = normalizedPathname.slice(locale.prefix.length);
      return { locale, basePath: stripped || "/" };
    }
  }
  return { locale: defaultLocaleConfig, basePath: normalizedPathname };
}

function localizePathname(basePath, locale) {
  const normalizedBasePath = normalizePathname(basePath);
  if (!locale.prefix) return normalizedBasePath;
  return normalizedBasePath === "/" ? locale.prefix : `${locale.prefix}${normalizedBasePath}`;
}

function isGuidePath(basePath) {
  return basePath === "/guides" || basePath.startsWith("/guides/");
}

function getExpectedLocaleConfigs(basePath) {
  return isGuidePath(basePath)
    ? localeConfigs.filter((locale) => guideLocaleCodes.has(locale.code))
    : localeConfigs;
}

function getExpectedLanguageAlternates(pathname, origin) {
  const route = getRouteInfo(pathname);
  const expectedLocales = getExpectedLocaleConfigs(route.basePath);
  const expected = Object.fromEntries(
    expectedLocales.map((locale) => [locale.code, comparableUrl(localizePathname(route.basePath, locale), origin)]),
  );
  expected["x-default"] = expected.en;
  return { route, expected, expectedLocales };
}

function validateLanguageAlternates({ pathname, origin, actual, scope, source }) {
  const { route, expected, expectedLocales } = getExpectedLanguageAlternates(pathname, origin);
  const allowedLocaleCodes = new Set(expectedLocales.map((locale) => locale.code));
  if (!allowedLocaleCodes.has(route.locale.code)) {
    issue("error", scope, `${source} publishes ${route.locale.code} for ${route.basePath}, but guide pages are limited to en and zh-CN until their main content is translated.`);
  }

  for (const [language, expectedHref] of Object.entries(expected)) {
    const actualHref = comparableUrl(actual[language] || "", origin);
    if (actualHref !== expectedHref) {
      issue("error", scope, `${source} hreflang ${language} points to ${actualHref || "nothing"}; expected ${expectedHref}.`);
    }
  }

  for (const language of Object.keys(actual)) {
    if (!(language in expected)) {
      issue("error", scope, `${source} publishes unexpected hreflang ${language} for ${route.basePath}.`);
    }
  }

  return route;
}

async function inspectPage(url, sitemapEntry = null) {
  const scope = new URL(url).pathname || "/";
  let response;
  try {
    response = await request(url);
  } catch (error) {
    issue("error", scope, `Page request failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
  const html = await response.text();
  const $ = cheerio.load(html);
  const title = $("head title").first().text().trim();
  const description = $('meta[name="description"]').attr("content")?.trim() || "";
  const canonical = absoluteUrl($('link[rel="canonical"]').attr("href") || "", response.url);
  const documentLanguage = ($("html").attr("lang") || "").trim();
  const languageAlternates = Object.fromEntries(
    $('link[rel="alternate"][hreflang]').toArray().map((node) => [
      ($(node).attr("hreflang") || "").trim(),
      absoluteUrl($(node).attr("href") || "", response.url),
    ]).filter(([language, href]) => Boolean(language && href)),
  );
  const robots = ($('meta[name="robots"]').attr("content") || "").toLowerCase();
  const indexable = !robots.includes("noindex");
  const h1Count = $("h1").length;
  const h2Count = $("h2").length;
  const images = $("img").toArray().map((node) => ({
    src: absoluteUrl($(node).attr("src") || "", response.url),
    alt: $(node).attr("alt")?.trim() || "",
    width: $(node).attr("width") || "",
    height: $(node).attr("height") || "",
  }));
  const staticAssets = $("script[src], link[href]").toArray().map((node) => {
    const value = $(node).attr("src") || $(node).attr("href") || "";
    return absoluteUrl(value, response.url);
  }).filter((value) => {
    if (!value) return false;
    try {
      return new URL(value).pathname.startsWith("/_next/static/");
    } catch {
      return false;
    }
  });
  for (const staticAsset of staticAssets) nextStaticAssets.add(staticAsset);
  const links = $("a[href]").toArray().map((node) => absoluteUrl($(node).attr("href") || "", response.url)).filter(Boolean);
  const schemaTypes = [];
  $('script[type="application/ld+json"]').each((_, node) => {
    try {
      const parsed = JSON.parse($(node).text());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) if (item && typeof item === "object" && typeof item["@type"] === "string") schemaTypes.push(item["@type"]);
    } catch {
      issue("error", scope, "JSON-LD is not valid JSON.");
    }
  });
  const ogImage = absoluteUrl($('meta[property="og:image"]').attr("content") || "", response.url);
  const ogUrl = absoluteUrl($('meta[property="og:url"]').attr("content") || "", response.url);
  const twitterImage = absoluteUrl($('meta[name="twitter:image"]').attr("content") || "", response.url);
  const twitterCard = ($('meta[name="twitter:card"]').attr("content") || "").trim();
  const hasGoogleSiteVerification = Boolean($('meta[name="google-site-verification"]').attr("content")?.trim());
  const compactScriptDocument = /^(?:zh-(?:cn|tw)|ja|ko)$/iu.test(documentLanguage);
  const titleLengthRange = compactScriptDocument ? { minimum: 10, maximum: 45 } : { minimum: 25, maximum: 65 };
  const descriptionLengthRange = compactScriptDocument ? { minimum: 30, maximum: 90 } : { minimum: 100, maximum: 170 };

  if (response.status !== 200) issue("error", scope, `Expected HTTP 200, received ${response.status}.`);
  if (!title) issue("error", scope, "Missing document title.");
  else if (title.length < titleLengthRange.minimum || title.length > titleLengthRange.maximum) issue("warning", scope, `Title length is ${title.length}; review the search snippet.`);
  if (!description) issue("error", scope, "Missing meta description.");
  else if (description.length < descriptionLengthRange.minimum || description.length > descriptionLengthRange.maximum) issue("warning", scope, `Meta description length is ${description.length}; review the search snippet.`);
  if (!canonical) issue("error", scope, "Missing or invalid canonical URL.");
  else if (new URL(canonical).pathname !== new URL(response.url).pathname) issue("error", scope, `Canonical points to ${canonical}.`);
  if (sitemapEntry && indexable) {
    const pageOrigin = canonical ? new URL(canonical).origin : new URL(response.url).origin;
    const route = validateLanguageAlternates({ pathname: scope, origin: pageOrigin, actual: languageAlternates, scope, source: "HTML" });
    if (documentLanguage !== route.locale.htmlLang) {
      issue("error", scope, `Expected html lang=${route.locale.htmlLang}, received ${documentLanguage || "none"}.`);
    }
  }
  if (h1Count !== 1) issue("error", scope, `Expected exactly one H1, found ${h1Count}.`);
  if (h2Count === 0) issue("warning", scope, "No H2 headings found.");
  for (const image of images) {
    if (!image.alt) issue("warning", scope, `Image is missing alt text: ${image.src || "unknown source"}.`);
    if (!image.width || !image.height) issue("warning", scope, `Image is missing intrinsic dimensions: ${image.src || "unknown source"}.`);
  }
  if (indexable && !ogImage) issue("error", scope, "Indexable page is missing an Open Graph image.");
  if (indexable && !twitterImage) issue("warning", scope, "Indexable page is missing a Twitter image.");
  const socialBasePath = getRouteInfo(scope).basePath;
  if (socialMetadataPaths.has(socialBasePath)) {
    if (comparableUrl(ogUrl || "", response.url) !== comparableUrl(canonical || "", response.url)) {
      issue("error", scope, `Open Graph URL ${ogUrl || "is missing"}; expected the page canonical ${canonical || "URL"}.`);
    }
    if (twitterCard !== "summary_large_image") {
      issue("error", scope, `Expected twitter:card=summary_large_image, received ${twitterCard || "nothing"}.`);
    }
  }
  if (sitemapEntry && !indexable) issue("error", scope, "Sitemap contains a noindex page.");
  if (sitemapEntry?.lastmod) {
    const lastModified = new Date(sitemapEntry.lastmod);
    if (Number.isNaN(lastModified.valueOf())) issue("error", scope, `Invalid sitemap lastmod: ${sitemapEntry.lastmod}.`);
    else if (lastModified.valueOf() > Date.now() + 86400000) issue("error", scope, "Sitemap lastmod is in the future.");
  }

  const result = { url, finalUrl: response.url, status: response.status, title, description, canonical, documentLanguage, languageAlternates, robots, indexable, hasGoogleSiteVerification, h1Count, h2Count, images, staticAssets, links, schemaTypes, ogImage, ogUrl, twitterImage, twitterCard };
  pages.push(result);
  return result;
}

async function inspectAsset(url, scope, label) {
  if (!url) return;
  const sourceUrl = new URL(url);
  const targetUrl = args["map-sitemap-to-base"]
    ? new URL(`${sourceUrl.pathname}${sourceUrl.search}`, baseUrl).toString()
    : sourceUrl.toString();
  try {
    const response = await request(targetUrl, { method: "HEAD" });
    if (!response.ok) issue("error", scope, `${label} returned HTTP ${response.status}: ${url}.`);
    const contentType = response.headers.get("content-type") || "";
    if (label.includes("image") && !contentType.startsWith("image/")) issue("error", scope, `${label} is not an image: ${contentType || "unknown type"}.`);
  } catch (error) {
    issue("error", scope, `${label} request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function inspectImmutableStaticAsset(url) {
  const sourceUrl = new URL(url);
  const targetUrl = args["map-sitemap-to-base"]
    ? new URL(`${sourceUrl.pathname}${sourceUrl.search}`, baseUrl).toString()
    : sourceUrl.toString();
  try {
    const response = await request(targetUrl, { method: "HEAD" });
    if (!response.ok) {
      issue("error", sourceUrl.pathname, `Next static asset returned HTTP ${response.status}: ${url}.`);
      return;
    }
    const cacheControl = (response.headers.get("cache-control") || "").toLowerCase();
    const maxAge = Number(cacheControl.match(/(?:^|,)\s*max-age=(\d+)/u)?.[1] || 0);
    if (!cacheControl.split(",").map((directive) => directive.trim()).includes("public") || !cacheControl.includes("immutable") || maxAge < 31_536_000) {
      issue("error", sourceUrl.pathname, `Next static asset must use Cache-Control: public, max-age=31536000, immutable; received ${cacheControl || "no Cache-Control header"}.`);
    }
  } catch (error) {
    issue("error", sourceUrl.pathname, `Next static asset request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function inspectEndpoint(label, value, pathname = "/") {
  if (!value) return;
  const target = new URL(pathname, value).toString();
  try {
    const response = await request(target);
    if (!response.ok) issue("error", label, `${target} returned HTTP ${response.status}.`);
  } catch (error) {
    issue("error", label, `${target} could not be reached: ${error instanceof Error ? error.message : String(error)}`);
  }
}

let sitemapEntries = [];
try {
  const sitemapResponse = await request(new URL("/sitemap.xml", baseUrl));
  if (!sitemapResponse.ok) issue("error", "sitemap", `sitemap.xml returned HTTP ${sitemapResponse.status}.`);
  else {
    const xml = await sitemapResponse.text();
    const $xml = cheerio.load(xml, { xmlMode: true });
    sitemapEntries = $xml("url").toArray().map((node) => ({
      loc: $xml(node).find("loc").text().trim(),
      lastmod: $xml(node).find("lastmod").text().trim(),
      languageAlternates: Object.fromEntries(
        $xml(node).find('[rel="alternate"][hreflang]').toArray().map((alternateNode) => [
          ($xml(alternateNode).attr("hreflang") || "").trim(),
          absoluteUrl($xml(alternateNode).attr("href") || "", baseUrl),
        ]).filter(([language, href]) => Boolean(language && href)),
      ),
    }));
    if (sitemapEntries.length === 0) issue("error", "sitemap", "sitemap.xml contains no URLs.");
    if (Number.isInteger(expectedSitemapCount) && sitemapEntries.length !== expectedSitemapCount) {
      issue("error", "sitemap", `Expected ${expectedSitemapCount} URLs, received ${sitemapEntries.length}.`);
    }
    const sitemapLocations = new Set(sitemapEntries.map((entry) => comparableUrl(entry.loc, baseUrl)).filter(Boolean));
    for (const entry of sitemapEntries) {
      try {
        const entryUrl = new URL(entry.loc);
        const scope = entryUrl.pathname || "/";
        const { expected } = getExpectedLanguageAlternates(scope, entryUrl.origin);
        validateLanguageAlternates({
          pathname: scope,
          origin: entryUrl.origin,
          actual: entry.languageAlternates,
          scope,
          source: "Sitemap",
        });
        for (const [language, expectedHref] of Object.entries(expected)) {
          if (language !== "x-default" && !sitemapLocations.has(expectedHref)) {
            issue("error", scope, `Sitemap hreflang ${language} target is not present as a sitemap URL: ${expectedHref}.`);
          }
        }
      } catch (error) {
        issue("error", "sitemap", `Invalid sitemap URL ${entry.loc || "(empty)"}: ${error instanceof Error ? error.message : String(error)}.`);
      }
    }
  }
} catch (error) {
  issue("error", "sitemap", `sitemap.xml request failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const robotsResponse = await request(new URL("/robots.txt", baseUrl));
  const robotsText = await robotsResponse.text();
  if (!robotsResponse.ok) issue("error", "robots", `robots.txt returned HTTP ${robotsResponse.status}.`);
  if (!/sitemap:\s*https?:\/\//iu.test(robotsText)) issue("error", "robots", "robots.txt does not declare an absolute sitemap URL.");
  if (!robotsText.includes("/seo-audit") || !robotsText.includes("/operations-checklist")) issue("warning", "robots", "Internal audit routes are not explicitly disallowed.");
  if (args["require-ai-crawlers"]) {
    for (const userAgent of ["GPTBot", "ClaudeBot", "Google-Extended"]) {
      const blocks = robotsText.split(/(?:\r?\n){2,}/u).filter((block) => new RegExp(`^User-agent:\\s*${userAgent.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\s*$`, "imu").test(block));
      if (blocks.some((block) => /^Disallow:\s*\/$/imu.test(block))) {
        issue("error", "robots", `${userAgent} is explicitly disallowed; disable Cloudflare managed robots/AI blocking before release.`);
      }
    }
  }
} catch (error) {
  issue("error", "robots", `robots.txt request failed: ${error instanceof Error ? error.message : String(error)}`);
}

const crawlTargets = new Map([[baseUrl.toString(), null]]);
for (const entry of sitemapEntries) {
  const sitemapUrl = new URL(entry.loc);
  const crawlUrl = args["map-sitemap-to-base"]
    ? new URL(`${sitemapUrl.pathname}${sitemapUrl.search}`, baseUrl).toString()
    : sitemapUrl.toString();
  crawlTargets.set(crawlUrl, entry);
}

if (args["require-canonical-host"]) {
  const auditPaths = [
    "/canonical-host-audit?source=release",
    "/product/score-preview-output-real.png?source=release",
  ];
  for (const auditPath of auditPaths) {
    const expectedLocation = `https://scoretransposer.com${auditPath}`;
    for (const origin of ["http://scoretransposer.com", "http://www.scoretransposer.com", "https://www.scoretransposer.com"]) {
      try {
        const response = await request(`${origin}${auditPath}`, { redirect: "manual" });
        const location = absoluteUrl(response.headers.get("location") || "", `${origin}${auditPath}`);
        if (![301, 308].includes(response.status) || location !== expectedLocation) {
          issue("error", "canonical-host", `${origin}${auditPath} returned ${response.status} -> ${location || "no Location"}; expected 301/308 -> ${expectedLocation}.`);
        }
      } catch (error) {
        issue("error", "canonical-host", `${origin}${auditPath} redirect check failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
}
for (const pathname of requiredFeaturePaths) {
  const requiredUrl = new URL(pathname, baseUrl).toString();
  const sitemapEntry = sitemapEntries.find((entry) => new URL(entry.loc).pathname === new URL(requiredUrl).pathname) ?? null;
  if (!sitemapEntry) issue("error", new URL(requiredUrl).pathname, "Required acquisition page is absent from sitemap.xml.");
  crawlTargets.set(requiredUrl, sitemapEntry);
}
for (const [url, sitemapEntry] of crawlTargets) await inspectPage(url, sitemapEntry);

if (args["require-google-verification"]) {
  const homepage = pages.find((page) => new URL(page.url).pathname === "/");
  if (!homepage?.hasGoogleSiteVerification) issue("error", "/", "Google Search Console verification meta tag is missing.");
}

const internalLinks = new Set(pages.flatMap((page) => page.links).filter((url) => new URL(url).origin === baseUrl.origin));
const knownStatuses = new Map(pages.map((page) => [new URL(page.finalUrl).toString(), page.status]));
for (const url of internalLinks) {
  if (knownStatuses.has(url)) continue;
  try {
    const response = await request(url, { method: "HEAD" });
    if (response.status >= 400) issue("error", new URL(url).pathname, `Internal link returned HTTP ${response.status}: ${url}.`);
  } catch (error) {
    issue("error", new URL(url).pathname, `Internal link could not be reached: ${error instanceof Error ? error.message : String(error)}`);
  }
}

for (const page of pages) {
  await inspectAsset(page.ogImage, new URL(page.url).pathname, "Open Graph image");
  for (const image of page.images) await inspectAsset(image.src, new URL(page.url).pathname, "content image");
}
if (nextStaticAssets.size === 0) {
  issue("error", "static-assets", "No /_next/static/ asset was discovered, so immutable browser caching could not be verified.");
} else {
  for (const staticAsset of nextStaticAssets) await inspectImmutableStaticAsset(staticAsset);
}

await inspectEndpoint("app", args["app-url"] || process.env.SEO_AUDIT_APP_URL);
await inspectEndpoint("api", args["api-url"] || process.env.SEO_AUDIT_API_URL, String(args["api-health-path"] || "/health"));

if (args["require-analytics"]) {
  const homepage = pages.find((page) => new URL(page.url).pathname === "/");
  const htmlResponse = await request(baseUrl);
  const html = await htmlResponse.text();
  const $ = cheerio.load(html);
  const analyticsHosts = new Set(["googletagmanager.com", "www.googletagmanager.com", "clarity.ms", "www.clarity.ms"]);
  const hasAnalyticsScript = $("script[src]").toArray().some((element) => {
    const src = $(element).attr("src");
    if (!src) return false;
    try {
      return analyticsHosts.has(new URL(src, baseUrl).hostname.toLowerCase());
    } catch {
      return false;
    }
  });
  if (!homepage || !hasAnalyticsScript) {
    issue("warning", "/", "Analytics scripts are consent-gated and were not visible in the server response; verify them after granting consent in a real browser.");
  }
}

const errors = issues.filter((item) => item.severity === "error").length;
const warnings = issues.filter((item) => item.severity === "warning").length;
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: baseUrl.toString(),
  publishReady: errors === 0,
  metrics: { pages: pages.length, sitemapUrls: sitemapEntries.length, internalLinks: internalLinks.size, staticAssets: nextStaticAssets.size, errors, warnings },
  issues,
  pages,
};
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Production SEO audit: ${errors} errors, ${warnings} warnings, ${pages.length} pages. Report: ${path.relative(process.cwd(), outputPath)}`);
if (errors > 0) process.exitCode = 1;
