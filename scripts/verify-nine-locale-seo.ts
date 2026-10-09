import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { load } from "cheerio";
import { SUPPORTED_LOCALES, getLocaleConfig, type SupportedLocale } from "@score/i18n";
import { localizeFeaturePage } from "../apps/www/src/lib/feature-page-localization";
import { getFeatureOnPageContent } from "../apps/www/src/lib/feature-on-page";
import { platformFeaturePages } from "../apps/www/src/lib/platform-feature-pages";
import { getHomepageLocalization } from "../apps/www/src/lib/homepage-localization";
import { getSiteLocaleCatalog } from "../apps/www/src/lib/site-shell-localization";
import { localizePublicHref } from "../apps/www/src/lib/locale-routing";

const terms: Record<SupportedLocale, string[]> = {
  en: ["sheet music scanner", "sheet music scanner", "pdf to musicxml", "sheet music maker", "midi to sheet music", "transpose sheet music"],
  es: ["escáner de partituras", "escáner de partituras", "pdf a musicxml", "creador de partituras", "midi a partitura", "transponer partituras"],
  "zh-CN": ["五线谱识别", "五线谱识别", "PDF 转 MusicXML", "在线制谱", "MIDI 转乐谱", "乐谱移调", "五线谱转简谱", "简谱转五线谱"],
  "zh-TW": ["五線譜辨識", "五線譜辨識", "PDF 轉 MusicXML", "線上製譜", "MIDI 轉樂譜", "樂譜轉調", "五線譜轉簡譜", "簡譜轉五線譜"],
  ja: ["楽譜スキャン", "楽譜スキャン", "PDF から MusicXML", "楽譜作成", "MIDI から楽譜", "楽譜の移調", "五線譜を数字譜", "数字譜を五線譜"],
  ko: ["악보 스캔", "악보 스캔", "PDF를 MusicXML로", "악보 만들기", "MIDI를 악보로", "악보 조옮김", "오선보를 숫자악보로", "숫자악보를 오선보로"],
  fr: ["scanner de partitions", "scanner de partitions", "PDF vers MusicXML", "créateur de partitions", "MIDI en partition", "transposer une partition"],
  de: ["Notenscanner", "Notenscanner", "PDF in MusicXML", "Noten erstellen", "MIDI in Noten", "Noten transponieren"],
  ru: ["сканер нот", "сканер нот", "PDF в MusicXML", "создание нот", "MIDI в ноты", "транспонирование нот"],
};
const routes = ["/", "/sheet-music-scanner", "/pdf-to-musicxml", "/score-editor", "/musicxml-midi", "/transpose-score", "/staff-to-jianpu", "/jianpu-to-staff"];
const east = new Set(["zh-CN", "zh-TW", "ja", "ko"]);
const faqHeadings = { en: "FAQ", es: "Preguntas frecuentes", "zh-CN": "常见问题", "zh-TW": "常見問題", ja: "よくある質問", ko: "자주 묻는 질문", fr: "FAQ", de: "FAQ", ru: "Частые вопросы" };
const normalize = (value: string) => value.replace(/\s+/gu, " ").trim();

async function main() {
  const base = process.argv[2] || "http://localhost:3100";
  const out = path.resolve(process.argv[3] || "artifacts/nine-locale-seo");
  const captureOnly = process.argv.includes("--capture");
  const beforePath = process.argv.find(a => a.startsWith("--before="))?.slice(9);
  const before = beforePath ? JSON.parse(await fs.readFile(beforePath, "utf8")) : null;
  const pages: any[] = [], errors: string[] = [], redirects: any[] = [];
  await fs.mkdir(out, { recursive: true });
  const check = (label: string, fn: () => void) => { try { fn(); } catch (e) { errors.push(`${label}: ${String(e)}`); } };
  const jobs = SUPPORTED_LOCALES.flatMap(locale => routes.map((route, index) => ({ locale, route, index, pathname: localizePublicHref(route, locale) })));
  for (let offset = 0; offset < jobs.length; offset += 4) {
    const batch = await Promise.allSettled(jobs.slice(offset, offset + 4).map(async ({ locale, route, index, pathname }) => {
      const response = await fetch(new URL(pathname, base), { headers: { "cache-control": "no-cache" }, signal: AbortSignal.timeout(30000) });
      const html = await response.text(), $ = load(html);
      const jsonld = $("script[type='application/ld+json']").toArray().flatMap(el => JSON.parse($(el).text()));
      const faq = $("main details").toArray().map(el => ({ question: normalize($(el).find("summary").clone().children().remove().end().text()), answer: normalize($(el).find("p").text()) }));
      const faqSchema = jsonld.find(s => s["@type"] === "FAQPage");
      const frozen = index >= 6 && !east.has(locale);
      const record = {
        locale, route, pathname, frozen, status: response.status, title: $("title").text(), description: $("meta[name=description]").attr("content"),
        h1: $("h1").toArray().map(el => normalize($(el).text())), h2: $("h2").toArray().map(el => normalize($(el).text())),
        intro: normalize($("h1").next("p").text()), faq, faqHeading: normalize($("main details").first().closest("section").find("h2").text()),
        modules: $(".page-banner").next("section").find(".metric-card .helper-copy").toArray().map(el => normalize($(el).text())),
        contextualLinks: (route === "/" ? $("#workflow p a") : $(".workflow-list").parent().find("p a")).toArray().map(el => ({ text: normalize($(el).text()), href: $(el).attr("href") })),
        canonical: $("link[rel=canonical]").attr("href"), alternates: $("link[hreflang]").toArray().map(el => ({ lang: $(el).attr("hreflang"), href: $(el).attr("href") })),
        robots: $("meta[name=robots]").attr("content"), htmlLang: $("html").attr("lang"), metaKeywords: $("meta[name=keywords]").length,
        bodySections: $(".page-banner, .workflow-list, .list-item-content").toArray().map(el => normalize($(el).text())),
      };
      pages.push(record);
      if (captureOnly) return;
      check(pathname, () => {
        assert.equal(record.status, 200);
        assert.equal(record.h1.length, 1, "single H1");
        assert.equal(record.metaKeywords, 0, "no meta keywords");
        assert.equal(record.htmlLang, getLocaleConfig(locale).htmlLang, "document language");
        assert.equal(new URL(record.canonical!).href, new URL(pathname, "https://scoretransposer.com").href, "self canonical");
        assert.equal(record.alternates.length, 10, "nine languages and x-default");
        for (const alternate of SUPPORTED_LOCALES) assert.ok(record.alternates.some(a => new URL(a.href!).href === new URL(localizePublicHref(route, alternate), "https://scoretransposer.com").href), `alternate ${alternate}`);
        assert.ok(!record.robots?.includes("noindex"), "public page indexable");
        if (frozen) {
          assert.ok(before, "frozen pages require a before snapshot");
          const original = before.pages.find((p: any) => p.pathname === pathname);
          for (const key of ["title", "description", "h1", "h2", "intro", "faq", "faqHeading", "modules", "contextualLinks"] as const) assert.deepEqual(record[key], original[key], `preserve European Jianpu ${key}`);
          return;
        }
        const term = terms[locale][index].toLowerCase();
        for (const [location, text] of [["title", record.title], ["H1", record.h1[0]], ["first H2", record.h2[0]], ["opening paragraph", record.intro], ["FAQ text", faq.map(q => q.question + " " + q.answer).join(" ")]]) assert.ok(text?.toLowerCase().includes(term), `${location}: ${term}`);
        if (route === "/") {
          const copy = getHomepageLocalization(locale, { audioTranscriptionAvailable: false });
          const metadata = getSiteLocaleCatalog(locale).metadata;
          assert.equal(record.title, metadata.title); assert.equal(record.description, metadata.description);
          assert.equal(record.h1[0], copy.page.heroTitle.join(" "));
          assert.ok(record.h2.includes(copy.page.stepsTitle), "scan workflow H2");
          assert.equal($("#workflow li").length, 3);
        } else {
          const source = platformFeaturePages.find(p => `/${p.slug}` === route)!;
          const localized = localizeFeaturePage(source, locale), copy = getFeatureOnPageContent(source.slug, locale)!;
          assert.equal(record.title, `${localized.title} | ScoreTransposer`);
          assert.equal(record.description, localized.description);
          assert.equal(record.h1[0], copy.h1);
          assert.equal(record.intro, copy.intro ?? localized.description);
          assert.equal(record.h2[0], copy.moduleTitle);
          assert.ok(record.h2.includes(copy.workflowTitle));
          if (source.slug !== "staff-to-jianpu") for (const detail of localized.details) assert.ok(record.h2.includes(detail.title), `detail H2 ${detail.title}`);
          assert.equal(record.faqHeading, faqHeadings[locale]);
          assert.deepEqual(record.modules, copy.moduleDescriptions);
          assert.equal(new Set(record.modules).size, record.modules.length, "distinct module descriptions");
          assert.deepEqual(faq, copy.faq, "visible specialist FAQ");
          assert.deepEqual(faqSchema?.mainEntity.map((q: any) => ({ question: q.name, answer: q.acceptedAnswer.text })), faq, "FAQ schema describes visible content");
        }
        const required = route === "/pdf-to-musicxml" ? ["/score-editor", "/transpose-score", "/musicxml-midi"] : [];
        for (const destination of required) assert.ok(record.contextualLinks.some(a => a.href === localizePublicHref(destination, locale)), `workflow link ${destination}`);
        assert.ok(record.contextualLinks.length >= 3, "contextual body links");
        for (const link of record.contextualLinks) assert.ok(link.href && link.href === localizePublicHref(link.href.replace(/^\/(?:zh-cn|zh-tw|ja|ko|fr|es|de|ru)(?=\/)/u, ""), locale), `same-language link ${link.href}`);
        assert.equal($("a[href]").toArray().filter(el => /\/pdf-score-scanner(?:\/|$)/u.test($(el).attr("href") || "")).length, 0);
      });
    }));
    batch.forEach((r, i) => { if (r.status === "rejected") errors.push(`${jobs[offset + i].pathname}: ${String(r.reason)}`); });
  }
  for (const locale of SUPPORTED_LOCALES) for (const suffix of ["?source=nine-locale-check", "/opengraph-image/default"]) {
    const old = localizePublicHref(`/pdf-score-scanner${suffix}`, locale);
    const response = await fetch(new URL(old, base), { redirect: "manual", signal: AbortSignal.timeout(30000) });
    const location = response.headers.get("location");
    redirects.push({ from: old, status: response.status, location });
    check(old, () => { assert.equal(response.status, 301); assert.equal(new URL(location!, base).pathname + new URL(location!, base).search, localizePublicHref(`/sheet-music-scanner${suffix}`, locale)); });
  }
  const sitemap = await (await fetch(new URL("/sitemap.xml", base))).text();
  check("sitemap", () => { assert.ok(!sitemap.includes("/pdf-score-scanner")); for (const locale of SUPPORTED_LOCALES) assert.ok(sitemap.includes(`https://scoretransposer.com${localizePublicHref("/sheet-music-scanner", locale)}`)); });
  if (!captureOnly) {
    const midi = pages.find(p => p.pathname === "/musicxml-midi");
    check("original English MIDI description", () => assert.equal(midi?.description, "Upload a MIDI file and get editable sheet music in your browser: clean up the notation, transpose it, play it back, and export MusicXML, PDF or a new MIDI. Free to try."));
    for (const route of ["/pdf-to-musicxml", "/score-editor", "/musicxml-midi"]) check(`${route} original FAQ H2`, () => assert.equal(pages.find(p => p.pathname === route)?.faqHeading, "FAQ"));
  }
  pages.sort((a, b) => a.pathname.localeCompare(b.pathname));
  await fs.writeFile(path.join(out, "pages.json"), JSON.stringify({ checkedAt: new Date().toISOString(), base, captureOnly, pages, redirects, errors }, null, 2));
  console.log(JSON.stringify({ pages: pages.length, changedScope: pages.filter(p => !p.frozen).length, frozenJianpu: pages.filter(p => p.frozen).length, redirects: redirects.length, errors }, null, 2));
  if (errors.length) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
