import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MetricCard, Panel, SectionIntro, StatusPill } from "@score/ui";
import { findPublicScore, publicScoreLibrary } from "../../../lib/public-score-library";
import { readSiteLocale } from "../../../lib/locale";
import { getAppScoreProjectsUrl, siteConfig } from "../../../lib/site";

type ScoreParams = { scoreSlug: string };

export function generateStaticParams(): ScoreParams[] {
  return publicScoreLibrary.map((score) => ({ scoreSlug: score.slug }));
}

export async function generateMetadata({ params }: { params: Promise<ScoreParams> }): Promise<Metadata> {
  const { scoreSlug } = await params;
  const score = findPublicScore(scoreSlug);
  if (!score) return {};
  const descriptiveSuffix = " View instrumentation, source, edition, rights, and workspace options in ScoreTransposer.";
  const description = score.description.en.length >= 120
    ? score.description.en
    : `${score.description.en}${descriptiveSuffix}`;
  const searchableTitle = `${score.title.en} sheet music | ${siteConfig.siteName}`;
  return {
    title: searchableTitle.length <= 60 ? searchableTitle : `${score.title.en} | ${siteConfig.siteName}`,
    description,
    alternates: { canonical: `/library/${score.slug}` },
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
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "MusicComposition",
    name: score.title[locale],
    composer: { "@type": "Person", name: score.composer[locale] },
    description: score.description[locale],
    url: `${siteConfig.siteUrl}/library/${score.slug}`,
  };

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
          <a className="public-button tertiary" href="/library">{copy.back}</a>
        </div>
      </section>
    </div>
  );
}
