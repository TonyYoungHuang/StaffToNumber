import type { Metadata } from "next";
import Link from "next/link";
import { SUPPORTED_LOCALES, formatMessage, formatNumber, getLocaleConfig } from "@score/i18n";
import { MetricCard, Panel, SectionIntro, StatusPill } from "@score/ui";
import {
  LIBRARY_OPEN_GRAPH_LOCALES,
  formatLibraryComposerDates,
  getLibraryCatalog,
} from "../../lib/library-localization";
import { readSiteLocale } from "../../lib/locale";
import { getLocalizedAbsoluteUrl, getLocalizedAlternates, localizePublicHref } from "../../lib/locale-routing";
import { filterPublicScores, getPublicScoreText, listPublicScoreFacets, publicScoreLibrary } from "../../lib/public-score-library";
import { getProductMediaPresentation, getWorkspacePreviewProductMedia } from "../../lib/product-media";
import { getAppScoreProjectsUrl, siteConfig } from "../../lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();
  const { metadata } = getLibraryCatalog(locale);
  const media = getWorkspacePreviewProductMedia(locale);
  const mediaPresentation = media ? getProductMediaPresentation(locale, media.sourceLocale, metadata.title) : null;

  return {
    title: metadata.title,
    description: metadata.description,
    keywords: [...metadata.keywords],
    alternates: getLocalizedAlternates("/library", locale),
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      url: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/library", locale),
      siteName: siteConfig.siteName,
      locale: LIBRARY_OPEN_GRAPH_LOCALES[locale],
      alternateLocale: SUPPORTED_LOCALES
        .filter((alternateLocale) => alternateLocale !== locale)
        .map((alternateLocale) => LIBRARY_OPEN_GRAPH_LOCALES[alternateLocale]),
      type: "website",
      ...(media && mediaPresentation ? { images: [{ url: media.src, width: media.width, height: media.height, alt: mediaPresentation.alt }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: metadata.title,
      description: metadata.description,
      ...(media && mediaPresentation ? { images: [{ url: media.src, alt: mediaPresentation.alt }] } : {}),
    },
  };
}

type LibrarySearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function PublicScoreLibraryPage({ searchParams }: { searchParams: Promise<LibrarySearchParams> }) {
  const [locale, params] = await Promise.all([readSiteLocale(), searchParams]);
  const catalog = getLibraryCatalog(locale);
  const copy = catalog.index;
  const query = first(params.q);
  const instrument = first(params.instrument);
  const ensemble = first(params.ensemble);
  const era = first(params.era);
  const scores = filterPublicScores({ query, instrument, ensemble, era });
  const facets = listPublicScoreFacets(locale);
  const workspaceUrl = getAppScoreProjectsUrl(locale);
  const htmlLang = getLocaleConfig(locale).htmlLang;
  const resultCount = formatMessage(copy.resultTemplate, { count: formatNumber(scores.length, locale) });
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      inLanguage: htmlLang,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: catalog.detail.home, item: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/", locale) },
        { "@type": "ListItem", position: 2, name: catalog.detail.libraryName, item: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/library", locale) },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      inLanguage: htmlLang,
      name: copy.title,
      description: copy.body,
      url: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/library", locale),
      mainEntity: scores.map((score) => ({
        "@type": "MusicComposition",
        inLanguage: htmlLang,
        name: getPublicScoreText(score.title, locale),
        composer: { "@type": "Person", name: getPublicScoreText(score.composer, locale) },
        url: getLocalizedAbsoluteUrl(siteConfig.siteUrl, `/library/${score.slug}`, locale),
      })),
    },
  ];

  return (
    <div className="public-container page-stack">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }}
      />
      <nav aria-label={catalog.detail.breadcrumb} className="button-row">
        <Link className="public-button tertiary" href={localizePublicHref("/", locale)}>{catalog.detail.home}</Link>
        <span aria-hidden="true">›</span>
        <span className="helper-copy" aria-current="page">{catalog.detail.libraryName}</span>
      </nav>
      <section className="page-banner split">
        <SectionIntro eyebrow={copy.eyebrow} title={copy.title} body={copy.body} titleAs="h1" largeBody />
        <Panel variant="glass" className="stack-md">
          <MetricCard label={copy.catalog} value={formatNumber(publicScoreLibrary.length, locale)} body={copy.catalogBody} />
          <div className="button-row"><a className="public-button primary" href={workspaceUrl}>{copy.start}</a></div>
        </Panel>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow={copy.catalog} title={resultCount} body={copy.catalogBody} />
        <form className="form-grid" action={localizePublicHref("/library", locale)} method="get" aria-label={copy.filtersAria}>
          <label className="field-group wide">
            <span>{copy.query}</span>
            <input className="field-control" type="search" name="q" defaultValue={query} placeholder={copy.queryPlaceholder} />
          </label>
          <label className="field-group">
            <span>{copy.instrument}</span>
            <select className="field-control" name="instrument" defaultValue={instrument}>
              <option value="">{copy.all}</option>
              {facets.instruments.map((value) => <option key={value} value={value}>{catalog.values.instruments[value]}</option>)}
            </select>
          </label>
          <label className="field-group">
            <span>{copy.ensemble}</span>
            <select className="field-control" name="ensemble" defaultValue={ensemble}>
              <option value="">{copy.all}</option>
              {facets.ensembles.map((value) => <option key={value} value={value}>{catalog.values.ensembles[value]}</option>)}
            </select>
          </label>
          <label className="field-group">
            <span>{copy.era}</span>
            <select className="field-control" name="era" defaultValue={era}>
              <option value="">{copy.all}</option>
              {facets.eras.map((value) => <option key={value} value={value}>{catalog.values.eras[value]}</option>)}
            </select>
          </label>
          <div className="button-row wide">
            <button className="public-button primary" type="submit">{copy.search}</button>
            <Link className="public-button tertiary" href={localizePublicHref("/library", locale)}>{copy.clear}</Link>
          </div>
        </form>
      </section>

      {scores.length > 0 ? (
        <section className="list-grid">
          {scores.map((score) => (
            <article className="list-item" key={score.slug}>
              <div className="list-item-content stack-sm">
                <div className="button-row">
                  <StatusPill tone={score.assetStatus === "downloadable" ? "green" : "cyan"}>{catalog.values.assetStatuses[score.assetStatus]}</StatusPill>
                  <StatusPill tone="amber">{catalog.values.workRights[score.workRights]}</StatusPill>
                </div>
                <h2 className="item-title">{getPublicScoreText(score.title, locale)}</h2>
                <p className="item-meta">{getPublicScoreText(score.composer, locale)} · {formatLibraryComposerDates(score.composerDates, locale)}</p>
                <p className="body-copy">{getPublicScoreText(score.description, locale)}</p>
                <p className="helper-copy">{catalog.values.eras[score.era]} · {catalog.values.ensembles[score.ensemble]} · {catalog.values.difficulties[score.difficulty]}</p>
                <p className="helper-copy">{score.instruments.map((value) => catalog.values.instruments[value]).join(" · ")}</p>
                <Link className="public-button secondary" href={localizePublicHref(`/library/${score.slug}`, locale)}>{copy.details}</Link>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div role="status">
          <Panel className="stack-sm">
            <h2 className="item-title">{copy.emptyTitle}</h2>
            <p className="body-copy">{copy.emptyBody}</p>
          </Panel>
        </div>
      )}

      <section className="surface-panel stack-md">
        <SectionIntro eyebrow={copy.rights} title={copy.why} body={copy.whyBody} />
      </section>
    </div>
  );
}
