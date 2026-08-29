import type { Metadata } from "next";
import Link from "next/link";
import { Panel, SectionIntro } from "@score/ui";
import { readSiteLocale } from "../../lib/locale";
import { getLocalizedAbsoluteUrl, getLocalizedAlternates, localizePublicHref } from "../../lib/locale-routing";
import { listPdfMusicXmlGuides } from "../../lib/pdf-musicxml-guides";
import { siteConfig } from "../../lib/site";

const canonicalPath = "/guides";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();
  const chinese = locale === "zh-CN";
  const title = chinese ? "PDF 乐谱、MusicXML 与 OMR 指南" : "PDF, MusicXML & OMR Guides | ScoreTransposer";
  const description = chinese
    ? "查看 PDF 乐谱转 MusicXML、扫描设置、OMR 错误校正、格式对比、MuseScore 导入和透明识别基准。"
    : "Practical guides for PDF-to-MusicXML conversion, scan preparation, OMR correction, notation formats, MuseScore import, and transparent recognition evidence.";
  return {
    title,
    description,
    keywords: chinese
      ? ["PDF 转 MusicXML", "OMR 指南", "乐谱 OCR", "MusicXML 教程"]
      : ["PDF to MusicXML guides", "OMR guide", "sheet music OCR", "MusicXML tutorial"],
    alternates: getLocalizedAlternates(canonicalPath, locale),
    openGraph: {
      title,
      description,
      url: getLocalizedAbsoluteUrl(siteConfig.siteUrl, canonicalPath, locale),
      siteName: siteConfig.siteName,
      locale: chinese ? "zh_CN" : "en_US",
      type: "website",
      images: [{ url: "/product/feature-pdf-score-scanner-real.png", width: 1425, height: 891, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/product/feature-pdf-score-scanner-real.png"] },
  };
}

export default async function GuidesIndexPage() {
  const locale = await readSiteLocale();
  const chinese = locale === "zh-CN";
  const guides = listPdfMusicXmlGuides(locale);
  const canonicalUrl = getLocalizedAbsoluteUrl(siteConfig.siteUrl, canonicalPath, locale);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      url: canonicalUrl,
      name: chinese ? "PDF 乐谱、MusicXML 与 OMR 指南" : "PDF, MusicXML and OMR guides",
      description: chinese ? "围绕 PDF 乐谱转 MusicXML 的实用教程与透明测试资料。" : "Practical tutorials and transparent evidence for PDF-to-MusicXML workflows.",
      inLanguage: locale,
      mainEntity: {
        "@type": "ItemList",
        itemListElement: guides.map((guide, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: guide.title,
          url: getLocalizedAbsoluteUrl(siteConfig.siteUrl, `/guides/${guide.slug}`, locale),
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: chinese ? "首页" : "Home", item: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/", locale) },
        { "@type": "ListItem", position: 2, name: chinese ? "指南" : "Guides", item: canonicalUrl },
      ],
    },
  ];

  return (
    <div className="public-container page-stack">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <section className="page-banner split">
        <SectionIntro
          eyebrow={chinese ? "PDF 与 MusicXML 知识库" : "PDF and MusicXML knowledge base"}
          title={chinese ? "从扫描页面到可编辑乐谱" : "From scanned page to editable score"}
          body={chinese
            ? "这些指南把产品入口、文件格式、扫描准备、人工校正和可复核证据连成一套流程，不用无法证明的准确率替代实际测试。"
            : "These guides connect the product, file formats, scan preparation, human correction, and reproducible evidence without substituting unsupported accuracy claims for testing."}
          titleAs="h1"
          largeBody
        />
        <Panel variant="glass" className="stack-md">
          <p className="eyebrow">{chinese ? "从这里开始" : "Start here"}</p>
          <h2>{chinese ? "第一次把 PDF 变成 MusicXML？" : "Converting a PDF to MusicXML for the first time?"}</h2>
          <p className="body-copy">{chinese ? "先读完整转换流程，再用一页有代表性的乐谱验证。" : "Read the complete workflow, then qualify one representative score page."}</p>
          <Link className="public-button primary" href={localizePublicHref("/guides/convert-pdf-sheet-music-to-musicxml", locale)}>
            {chinese ? "阅读转换指南" : "Read the conversion guide"}
          </Link>
        </Panel>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro
          eyebrow={chinese ? "六份深度资料" : "Six in-depth resources"}
          title={chinese ? "按你的问题选择" : "Choose by the question you need to answer"}
          body={chinese ? "每一页服务不同搜索意图，避免用多篇近义薄内容争夺同一个关键词。" : "Each page serves a distinct search intent instead of publishing near-duplicate pages that compete for the same query."}
        />
        <div className="metric-grid">
          {guides.map((guide) => (
            <Panel key={guide.slug} className="stack-sm">
              <p className="eyebrow">{guide.eyebrow}</p>
              <h2 className="item-title">{guide.title}</h2>
              <p className="body-copy">{guide.description}</p>
              <Link className="public-button tertiary" href={localizePublicHref(`/guides/${guide.slug}`, locale)}>
                {chinese ? "打开指南" : "Open guide"}
              </Link>
            </Panel>
          ))}
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro
          eyebrow={chinese ? "真实工作流" : "Real workflow"}
          title={chinese ? "读完后直接测试一页" : "Test one page after reading"}
          body={chinese ? "产品页提供实际入口、确定性参考样例和清楚的人工复核边界。" : "The product page provides the working entry point, deterministic reference downloads, and explicit human-review boundaries."}
        />
        <div className="button-row">
          <Link className="public-button primary" href={localizePublicHref("/pdf-to-musicxml", locale)}>{chinese ? "PDF 转 MusicXML" : "PDF to MusicXML"}</Link>
          <Link className="public-button secondary" href={localizePublicHref("/pdf-score-scanner", locale)}>{chinese ? "乐谱扫描识别" : "Sheet music scanner"}</Link>
          <Link className="public-button tertiary" href={localizePublicHref("/score-editor", locale)}>{chinese ? "校正乐谱" : "Correct a score"}</Link>
        </div>
      </section>
    </div>
  );
}
