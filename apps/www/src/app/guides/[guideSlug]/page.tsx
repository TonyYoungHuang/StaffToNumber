import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MetricCard, Panel, SectionIntro, WorkflowStep } from "@score/ui";
import { readSiteLocale } from "../../../lib/locale";
import { getLocalizedAbsoluteUrl, localizePublicHref } from "../../../lib/locale-routing";
import {
  PDF_MUSICXML_GUIDE_LOCALES,
  getPdfMusicXmlGuide,
  isPdfMusicXmlGuideLocale,
  pdfMusicXmlGuideSlugs,
  type PdfMusicXmlGuideLocale,
} from "../../../lib/pdf-musicxml-guides";
import { findPlatformFeaturePage } from "../../../lib/platform-feature-pages";
import { localizeFeaturePage } from "../../../lib/feature-page-localization";
import { siteConfig } from "../../../lib/site";

type GuideRouteParams = { guideSlug: string };

function getGuideAlternates(pathname: string, locale: PdfMusicXmlGuideLocale): NonNullable<Metadata["alternates"]> {
  const languages = Object.fromEntries(
    PDF_MUSICXML_GUIDE_LOCALES.map((supportedLocale) => [
      supportedLocale,
      getLocalizedAbsoluteUrl(siteConfig.siteUrl, pathname, supportedLocale),
    ]),
  ) as Record<PdfMusicXmlGuideLocale, string>;

  return {
    canonical: languages[locale],
    languages: { ...languages, "x-default": languages.en },
  };
}

export function generateStaticParams(): GuideRouteParams[] {
  return pdfMusicXmlGuideSlugs.map((guideSlug) => ({ guideSlug }));
}

export async function generateMetadata({ params }: { params: Promise<GuideRouteParams> }): Promise<Metadata> {
  const { guideSlug } = await params;
  const locale = await readSiteLocale();
  if (!isPdfMusicXmlGuideLocale(locale)) notFound();
  const guide = getPdfMusicXmlGuide(guideSlug, locale);
  if (!guide) notFound();
  const canonicalPath = `/guides/${guide.slug}`;
  return {
    title: `${guide.title} | ${siteConfig.siteName}`,
    description: guide.description,
    keywords: guide.keywords,
    alternates: getGuideAlternates(canonicalPath, locale),
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: getLocalizedAbsoluteUrl(siteConfig.siteUrl, canonicalPath, locale),
      siteName: siteConfig.siteName,
      locale: locale === "zh-CN" ? "zh_CN" : "en_US",
      alternateLocale: locale === "zh-CN" ? ["en_US"] : ["zh_CN"],
      type: "article",
      publishedTime: guide.updatedAt,
      modifiedTime: guide.updatedAt,
      images: [{ url: "/product/feature-pdf-score-scanner-real.png", width: 1425, height: 891, alt: guide.title }],
    },
    twitter: { card: "summary_large_image", title: guide.title, description: guide.description, images: ["/product/feature-pdf-score-scanner-real.png"] },
  };
}

function getRelatedLabel(path: string, locale: Awaited<ReturnType<typeof readSiteLocale>>) {
  const guideSlug = path.match(/^\/guides\/([^/]+)$/u)?.[1];
  const guide = guideSlug ? getPdfMusicXmlGuide(guideSlug, locale) : null;
  if (guide) return guide.title;
  const feature = findPlatformFeaturePage(path.replace(/^\//u, ""));
  if (feature) return localizeFeaturePage(feature, locale).title;
  if (path === "/guides") return locale === "zh-CN" ? "全部 PDF 与 MusicXML 指南" : "All PDF and MusicXML guides";
  return path;
}

export default async function PdfMusicXmlGuidePage({ params }: { params: Promise<GuideRouteParams> }) {
  const { guideSlug } = await params;
  const locale = await readSiteLocale();
  if (!isPdfMusicXmlGuideLocale(locale)) notFound();
  const chinese = locale === "zh-CN";
  const guide = getPdfMusicXmlGuide(guideSlug, locale);
  if (!guide) notFound();

  const canonicalPath = `/guides/${guide.slug}`;
  const canonicalUrl = getLocalizedAbsoluteUrl(siteConfig.siteUrl, canonicalPath, locale);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": guide.slug === "pdf-to-musicxml-recognition-benchmark" ? "TechArticle" : "Article",
      "@id": `${canonicalUrl}#article`,
      url: canonicalUrl,
      headline: guide.title,
      description: guide.description,
      inLanguage: locale,
      datePublished: guide.updatedAt,
      dateModified: guide.updatedAt,
      author: { "@type": "Organization", name: "ScoreTransposer product team", url: siteConfig.siteUrl },
      reviewedBy: { "@type": "Organization", name: "ScoreTransposer product owner" },
      publisher: { "@type": "Organization", name: siteConfig.siteName, url: siteConfig.siteUrl },
      keywords: guide.keywords.join(", "),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: chinese ? "首页" : "Home", item: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/", locale) },
        { "@type": "ListItem", position: 2, name: chinese ? "指南" : "Guides", item: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/guides", locale) },
        { "@type": "ListItem", position: 3, name: guide.title, item: canonicalUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: guide.title,
      description: guide.description,
      inLanguage: locale,
      step: guide.steps.map(([name, text], index) => ({ "@type": "HowToStep", position: index + 1, name, text })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: guide.faqs.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })),
    },
  ];

  return (
    <article className="public-container page-stack">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }} />
      <section className="page-banner split">
        <SectionIntro eyebrow={guide.eyebrow} title={guide.title} body={guide.intro} titleAs="h1" largeBody />
        <Panel variant="glass" className="stack-md">
          <p className="eyebrow">{chinese ? "实践入口" : "Put this into practice"}</p>
          <h2>{chinese ? "用一页有代表性的乐谱测试" : "Test one representative score page"}</h2>
          <p className="body-copy">{chinese ? "真实识别结果必须对照来源并人工复核。" : "A real recognition result must be compared with the source and reviewed by a person."}</p>
          <div className="button-row">
            <Link className="public-button primary" href={localizePublicHref("/pdf-to-musicxml", locale)}>{chinese ? "打开转换页" : "Open converter"}</Link>
            {guide.evidenceDownload ? <a className="public-button tertiary" href={guide.evidenceDownload} download>{chinese ? "下载证据 JSON" : "Download evidence JSON"}</a> : null}
          </div>
        </Panel>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow={chinese ? "先看结论" : "Key takeaways"} title={chinese ? "三件最重要的事" : "The three points that matter most"} />
        <div className="metric-grid">
          {guide.takeaways.map(([title, body]) => <MetricCard key={title} label={guide.primaryKeyword} value={title} body={body} />)}
        </div>
      </section>

      {guide.sections.map((section, index) => (
        <section key={section.title} className="surface-panel stack-lg">
          <SectionIntro eyebrow={`${chinese ? "详解" : "Explanation"} ${String(index + 1).padStart(2, "0")}`} title={section.title} />
          {section.paragraphs.map((paragraph) => <p key={paragraph} className="body-copy">{paragraph}</p>)}
          {section.bullets ? <ul className="feature-check-list">{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul> : null}
        </section>
      ))}

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow={chinese ? "操作步骤" : "Step-by-step"} title={chinese ? "按这个顺序执行" : "Follow this order"} />
        <div className="workflow-list">
          {guide.steps.map(([title, body], index) => <WorkflowStep key={title} step={String(index + 1).padStart(2, "0")} title={title} body={body} />)}
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow="FAQ" title={chinese ? "常见问题" : "Frequently asked questions"} />
        <div className="list-grid">
          {guide.faqs.map(([question, answer]) => (
            <details key={question} className="list-item"><summary className="item-title">{question}</summary><p className="body-copy">{answer}</p></details>
          ))}
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow={chinese ? "核验来源" : "Verification sources"} title={chinese ? "优先引用官方与上游资料" : "Primary and upstream sources"} body={chinese ? "这些链接用于核验格式、软件行为和公开限制；不代表对 ScoreTransposer 的商业背书。" : "These links verify formats, software behavior, and public limitations; they do not imply commercial endorsement of ScoreTransposer."} />
        <div className="list-grid">
          {guide.sources.map((source) => (
            <a key={source.href} className="list-item" href={source.href} target="_blank" rel="noreferrer">
              <div className="list-item-content"><h3 className="item-title">{source.title}</h3><p className="item-meta">{source.note}</p></div>
            </a>
          ))}
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow={chinese ? "继续阅读" : "Continue reading"} title={chinese ? "相关产品与指南" : "Related products and guides"} />
        <div className="metric-grid">
          {[...guide.relatedPaths, "/guides"].map((path) => (
            <Link key={path} className="list-item" href={localizePublicHref(path, locale)}>
              <div className="list-item-content"><h3 className="item-title">{getRelatedLabel(path, locale)}</h3><p className="item-meta">{path}</p></div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="feature-evidence-meta">
        <p className="eyebrow">{chinese ? "内容责任" : "Content accountability"}</p>
        <dl>
          <div><dt>{chinese ? "作者" : "Author"}</dt><dd>ScoreTransposer product team</dd></div>
          <div><dt>{chinese ? "更新时间" : "Updated"}</dt><dd><time dateTime={guide.updatedAt}>{guide.updatedAt}</time></dd></div>
          <div className="wide"><dt>{chinese ? "审核原则" : "Review basis"}</dt><dd>{chinese ? "产品代码、版本化测试证据与官方上游文档；不推断未测量准确率。" : "Product code, versioned test evidence, and primary upstream documentation; no inference from unmeasured accuracy."}</dd></div>
        </dl>
      </footer>
    </article>
  );
}
