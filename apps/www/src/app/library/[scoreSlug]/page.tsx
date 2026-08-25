import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MetricCard, Panel, SectionIntro, StatusPill } from "@score/ui";
import { findPublicScore, publicScoreLibrary } from "../../../lib/public-score-library";
import { readSiteLocale } from "../../../lib/locale";
import { getLocalizedAbsoluteUrl, getLocalizedAlternates, localizePublicHref } from "../../../lib/locale-routing";
import { getAppScoreProjectsUrl, siteConfig } from "../../../lib/site";

type ScoreParams = { scoreSlug: string };

export function generateStaticParams(): ScoreParams[] {
  return publicScoreLibrary.map((score) => ({ scoreSlug: score.slug }));
}

export async function generateMetadata({ params }: { params: Promise<ScoreParams> }): Promise<Metadata> {
  const { scoreSlug } = await params;
  const score = findPublicScore(scoreSlug);
  if (!score) return {};
  const locale = await readSiteLocale();
  const isChinese = locale === "zh-CN";
  const localizedDescription = score.description[locale];
  const descriptiveSuffix = isChinese
    ? " 查看乐器编制、来源版本、版权状态和 ScoreTransposer 乐谱工作台选项。"
    : " View instrumentation, source, edition, rights, and workspace options in ScoreTransposer.";
  const description = localizedDescription.length >= (isChinese ? 55 : 120) ? localizedDescription : `${localizedDescription}${descriptiveSuffix}`;
  const searchableTitle = isChinese
    ? `${score.title[locale]} 五线谱 | ${siteConfig.siteName}`
    : `${score.title.en} sheet music | ${siteConfig.siteName}`;
  return {
    title: searchableTitle.length <= 60 ? searchableTitle : `${score.title[locale]} | ${siteConfig.siteName}`,
    description,
    keywords: isChinese
      ? [score.title[locale], `${score.title[locale]} 五线谱`, score.composer[locale], `${score.composer[locale]} 乐谱`, "免费公版五线谱"]
      : [score.title.en, `${score.title.en} sheet music`, score.composer.en, `${score.composer.en} sheet music`, "public domain sheet music"],
    alternates: getLocalizedAlternates(`/library/${score.slug}`, locale),
    openGraph: {
      title: searchableTitle,
      description,
      url: getLocalizedAbsoluteUrl(siteConfig.siteUrl, `/library/${score.slug}`, locale),
      siteName: siteConfig.siteName,
      locale: isChinese ? "zh_CN" : "en_US",
      alternateLocale: isChinese ? ["en_US"] : ["zh_CN"],
      type: "website",
      images: [{ url: "/product/score-preview-output-real.png", width: 1265, height: 712, alt: isChinese ? `${score.title[locale]} 五线谱预览` : `${score.title.en} sheet music preview` }],
    },
    twitter: {
      card: "summary_large_image",
      title: searchableTitle,
      description,
      images: ["/product/score-preview-output-real.png"],
    },
  };
}

export default async function PublicScoreDetailPage({ params }: { params: Promise<ScoreParams> }) {
  const { scoreSlug } = await params;
  const score = findPublicScore(scoreSlug);
  if (!score) notFound();
  const locale = await readSiteLocale();
  const isChinese = locale === "zh-CN";
  const copy = isChinese
    ? {
        eyebrow: "曲库作品记录",
        source: "来源与版本",
        rights: "权利说明",
        instruments: "乐器与编制",
        download: "下载 CC0 MusicXML",
        openSource: "打开原始资料库",
        workspace: "进入乐谱工作台",
        back: "返回曲库",
        notice: "来源链接条目不会在本站镜像文件。导入任何具体版本前，请核对来源页面上的许可和地区说明。",
      }
    : {
        eyebrow: "Library work record",
        source: "Source and edition",
        rights: "Rights statement",
        instruments: "Instrumentation",
        download: "Download CC0 MusicXML",
        openSource: "Open source collection",
        workspace: "Open score workspace",
        back: "Back to library",
        notice: "Source-linked records are not mirrored here. Review the source page's edition license and regional terms before importing any file.",
      };
  const sourceIsExternal = score.sourceUrl.startsWith("http");
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: isChinese ? "首页" : "Home", item: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/", locale) },
        { "@type": "ListItem", position: 2, name: isChinese ? "公版乐谱曲库" : "Public domain sheet music library", item: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/library", locale) },
        { "@type": "ListItem", position: 3, name: score.title[locale], item: getLocalizedAbsoluteUrl(siteConfig.siteUrl, `/library/${score.slug}`, locale) },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "MusicComposition",
      name: score.title[locale],
      composer: { "@type": "Person", name: score.composer[locale] },
      description: score.description[locale],
      url: getLocalizedAbsoluteUrl(siteConfig.siteUrl, `/library/${score.slug}`, locale),
    },
  ];

  return (
    <div className="public-container page-stack">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <section className="page-banner split">
        <SectionIntro eyebrow={copy.eyebrow} title={score.title[locale]} body={`${score.composer[locale]} · ${score.composerDates}`} titleAs="h1" largeBody />
        <Panel variant="glass" className="stack-md">
          <div className="button-row"><StatusPill tone={score.assetStatus === "downloadable" ? "green" : "cyan"}>{score.assetStatus}</StatusPill><StatusPill tone="amber">{score.workRights}</StatusPill></div>
          <p className="body-copy">{score.description[locale]}</p>
        </Panel>
      </section>

      <section className="metric-grid">
        <MetricCard label={copy.instruments} value={score.instruments.join(" · ")} body={`${score.ensemble} · ${score.difficulty}`} />
        <MetricCard label={copy.source} value={score.sourceProvider} body={score.formats.join(" · ")} />
        <MetricCard label={copy.rights} value={score.workRights} body={score.assetLicense} />
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow={copy.rights} title={copy.source} body={score.assetStatus === "source-linked" ? copy.notice : score.assetLicense} />
        <div className="button-row">
          {score.localMusicXmlUrl ? <a className="public-button primary" href={score.localMusicXmlUrl} download>{copy.download}</a> : null}
          {score.assetStatus === "source-linked" ? (
            <a className="public-button secondary" href={score.sourceUrl} target={sourceIsExternal ? "_blank" : undefined} rel={sourceIsExternal ? "noreferrer" : undefined}>{copy.openSource}</a>
          ) : null}
          <a className="public-button tertiary" href={getAppScoreProjectsUrl(locale)}>{copy.workspace}</a>
          <a className="public-button tertiary" href={localizePublicHref("/library", locale)}>{copy.back}</a>
        </div>
      </section>
    </div>
  );
}
