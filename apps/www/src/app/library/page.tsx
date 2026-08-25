import type { Metadata } from "next";
import Link from "next/link";
import { MetricCard, Panel, SectionIntro, StatusPill } from "@score/ui";
import { filterPublicScores, listPublicScoreFacets, publicScoreLibrary } from "../../lib/public-score-library";
import { readSiteLocale } from "../../lib/locale";
import { getAppScoreProjectsUrl, siteConfig } from "../../lib/site";

export const metadata: Metadata = {
  title: `Public Domain Sheet Music Library | ${siteConfig.siteName}`,
  description: "Browse a rights-aware public domain sheet music library for classical, piano, orchestral, vocal, and a-cappella scores by instrument, ensemble, and era.",
  keywords: ["public domain sheet music", "public domain sheet music library", "free sheet music", "free sheet music PDF", "free classical sheet music PDF", "public domain sheet music PDF", "classical sheet music", "piano sheet music", "orchestral sheet music", "choral sheet music", "MusicXML sheet music"],
  alternates: { canonical: "/library" },
  openGraph: {
    title: `Public Domain Sheet Music Library | ${siteConfig.siteName}`,
    description: "Browse rights-aware classical, piano, orchestral, vocal, and a-cappella score records by instrument, ensemble, and era.",
    url: `${siteConfig.siteUrl}/library`,
    siteName: siteConfig.siteName,
    type: "website",
    images: [{ url: "/product/score-preview-output-real.png", width: 1265, height: 712, alt: "Public domain sheet music score preview" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Public Domain Sheet Music Library | ${siteConfig.siteName}`,
    description: "Browse a rights-aware public domain sheet music library by instrument, ensemble, and era.",
    images: ["/product/score-preview-output-real.png"],
  },
};

type LibrarySearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function PublicScoreLibraryPage({ searchParams }: { searchParams: Promise<LibrarySearchParams> }) {
  const locale = await readSiteLocale();
  const isChinese = locale === "zh-CN";
  const params = await searchParams;
  const query = first(params.q);
  const instrument = first(params.instrument);
  const ensemble = first(params.ensemble);
  const era = first(params.era);
  const scores = filterPublicScores({ query, instrument, ensemble, era });
  const facets = listPublicScoreFacets();
  const workspaceUrl = getAppScoreProjectsUrl(locale);
  const copy = isChinese
    ? {
        eyebrow: "开放乐谱曲库",
        title: "按乐器、编制和时期查找公版乐谱",
        body: "第一版收录经过作品层权利核对的古典、交响、钢琴、声乐与阿卡贝拉条目。站内只直接提供明确 CC0 的文件；其他条目跳转到原始资料库核对具体版本许可。",
        catalog: "精选目录",
        catalogBody: "搜索标题或作曲家，并按乐器、编制与时期筛选。",
        query: "标题或作曲家",
        instrument: "乐器 / 声部",
        ensemble: "编制",
        era: "时期",
        all: "全部",
        search: "筛选曲库",
        clear: "清除筛选",
        results: "个结果",
        details: "查看乐谱与权利信息",
        downloadable: "站内可下载",
        sourceLinked: "来源链接",
        rights: "作品权利",
        why: "为什么有些条目不能直接下载？",
        whyBody: "作曲家的作品可能已经进入公版，但现代校订、编曲、扫描和录入文件仍可能受版权或地区规则限制。ScoreTransposer 分别记录作品、版本和文件权利，未知文件默认不镜像。",
        start: "进入我的乐谱工作台",
      }
    : {
        eyebrow: "Open score library",
        title: "Public domain sheet music for classical ensembles and instruments",
        body: "Search rights-reviewed records for classical, orchestral, piano, vocal, and a-cappella sheet music. Only explicitly CC0 files are hosted here; other records link to the source collection for edition-level review.",
        catalog: "Curated catalog",
        catalogBody: "Search by title or composer and filter by instrument, ensemble, or era.",
        query: "Title or composer",
        instrument: "Instrument / part",
        ensemble: "Ensemble",
        era: "Era",
        all: "All",
        search: "Filter library",
        clear: "Clear filters",
        results: "results",
        details: "View score and rights details",
        downloadable: "Downloadable here",
        sourceLinked: "Source-linked",
        rights: "Work rights",
        why: "How does this library handle free classical sheet music?",
        whyBody: "A composer's work can be public domain while a modern edition, arrangement, scan, or transcription remains protected or region-restricted. ScoreTransposer tracks work-, edition-, and file-level rights separately and does not mirror unknown files.",
        start: "Open my score workspace",
      };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: copy.title,
    description: copy.body,
    url: `${siteConfig.siteUrl}/library`,
    mainEntity: scores.map((score) => ({
      "@type": "MusicComposition",
      name: score.title[locale],
      composer: { "@type": "Person", name: score.composer[locale] },
      url: `${siteConfig.siteUrl}/library/${score.slug}`,
    })),
  };

  return (
    <div className="public-container page-stack">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <section className="page-banner split">
        <SectionIntro eyebrow={copy.eyebrow} title={copy.title} body={copy.body} titleAs="h1" largeBody />
        <Panel variant="glass" className="stack-md">
          <MetricCard label={copy.catalog} value={String(publicScoreLibrary.length)} body={copy.catalogBody} />
          <div className="button-row"><a className="public-button primary" href={workspaceUrl}>{copy.start}</a></div>
        </Panel>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow={copy.catalog} title={`${scores.length} ${copy.results}`} body={copy.catalogBody} />
        <form className="form-grid" action="/library" method="get">
          <label className="field-group wide"><span>{copy.query}</span><input className="field-control" type="search" name="q" defaultValue={query} /></label>
          <label className="field-group"><span>{copy.instrument}</span><select className="field-control" name="instrument" defaultValue={instrument}><option value="">{copy.all}</option>{facets.instruments.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="field-group"><span>{copy.ensemble}</span><select className="field-control" name="ensemble" defaultValue={ensemble}><option value="">{copy.all}</option>{facets.ensembles.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="field-group"><span>{copy.era}</span><select className="field-control" name="era" defaultValue={era}><option value="">{copy.all}</option>{facets.eras.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <div className="button-row wide"><button className="public-button primary" type="submit">{copy.search}</button><Link className="public-button tertiary" href="/library">{copy.clear}</Link></div>
        </form>
      </section>

      <section className="list-grid">
        {scores.map((score) => (
          <article className="list-item" key={score.slug}>
            <div className="list-item-content stack-sm">
              <div className="button-row">
                <StatusPill tone={score.assetStatus === "downloadable" ? "green" : "cyan"}>{score.assetStatus === "downloadable" ? copy.downloadable : copy.sourceLinked}</StatusPill>
                <StatusPill tone="amber">{score.workRights}</StatusPill>
              </div>
              <h2 className="item-title">{score.title[locale]}</h2>
              <p className="item-meta">{score.composer[locale]} · {score.composerDates}</p>
              <p className="body-copy">{score.description[locale]}</p>
              <p className="helper-copy">{score.era} · {score.ensemble} · {score.difficulty}</p>
              <p className="helper-copy">{score.instruments.join(" · ")}</p>
              <Link className="public-button secondary" href={`/library/${score.slug}`}>{copy.details}</Link>
            </div>
          </article>
        ))}
      </section>

      <section className="surface-panel stack-md">
        <SectionIntro eyebrow={copy.rights} title={copy.why} body={copy.whyBody} />
      </section>
    </div>
  );
}
