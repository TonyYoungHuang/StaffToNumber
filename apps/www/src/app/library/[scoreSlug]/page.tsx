import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SUPPORTED_LOCALES, formatMessage, getLocaleConfig } from "@score/i18n";
import { MetricCard, Panel, SectionIntro, StatusPill } from "@score/ui";
import {
  LIBRARY_OPEN_GRAPH_LOCALES,
  formatLibraryComposerDates,
  getLibraryCatalog,
} from "../../../lib/library-localization";
import { readSiteLocale } from "../../../lib/locale";
import { getLocalizedAbsoluteUrl, getLocalizedAlternates, localizePublicHref } from "../../../lib/locale-routing";
import { findPublicScore, getPublicScoreText, publicScoreLibrary } from "../../../lib/public-score-library";
import { getProductMediaPresentation, getWorkspacePreviewProductMedia } from "../../../lib/product-media";
import { getAppScoreProjectsUrl, siteConfig } from "../../../lib/site";

type ScoreParams = { scoreSlug: string };

export function generateStaticParams(): ScoreParams[] {
  return publicScoreLibrary.map((score) => ({ scoreSlug: score.slug }));
}

export async function generateMetadata({ params }: { params: Promise<ScoreParams> }): Promise<Metadata> {
  const [{ scoreSlug }, locale] = await Promise.all([params, readSiteLocale()]);
  const score = findPublicScore(scoreSlug);
  if (!score) return {};

  const catalog = getLibraryCatalog(locale);
  const title = getPublicScoreText(score.title, locale);
  const composer = getPublicScoreText(score.composer, locale);
  const searchableTitle = formatMessage(catalog.detail.titleTemplate, { title, site: siteConfig.siteName });
  const metadataTitle = searchableTitle.length <= 60 ? searchableTitle : `${title} | ${siteConfig.siteName}`;
  const description = formatMessage(catalog.detail.descriptionTemplate, {
    description: getPublicScoreText(score.description, locale),
  });
  const media = getWorkspacePreviewProductMedia(locale);
  const mediaPresentation = media ? getProductMediaPresentation(locale, media.sourceLocale, title) : null;

  return {
    title: metadataTitle,
    description,
    keywords: [
      title,
      formatMessage(catalog.detail.titleKeywordTemplate, { title }),
      composer,
      formatMessage(catalog.detail.composerKeywordTemplate, { composer }),
      catalog.detail.genericKeyword,
    ],
    alternates: getLocalizedAlternates(`/library/${score.slug}`, locale),
    openGraph: {
      title: searchableTitle,
      description,
      url: getLocalizedAbsoluteUrl(siteConfig.siteUrl, `/library/${score.slug}`, locale),
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
      title: searchableTitle,
      description,
      ...(media && mediaPresentation ? { images: [{ url: media.src, alt: mediaPresentation.alt }] } : {}),
    },
  };
}

export default async function PublicScoreDetailPage({ params }: { params: Promise<ScoreParams> }) {
  const [{ scoreSlug }, locale] = await Promise.all([params, readSiteLocale()]);
  const score = findPublicScore(scoreSlug);
  if (!score) notFound();

  const catalog = getLibraryCatalog(locale);
  const copy = catalog.detail;
  const title = getPublicScoreText(score.title, locale);
  const composer = getPublicScoreText(score.composer, locale);
  const description = getPublicScoreText(score.description, locale);
  const composerDates = formatLibraryComposerDates(score.composerDates, locale);
  const sourceIsExternal = score.sourceUrl.startsWith("http");
  const canonicalPath = `/library/${score.slug}`;
  const htmlLang = getLocaleConfig(locale).htmlLang;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      inLanguage: htmlLang,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: copy.home, item: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/", locale) },
        { "@type": "ListItem", position: 2, name: copy.libraryName, item: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/library", locale) },
        { "@type": "ListItem", position: 3, name: title, item: getLocalizedAbsoluteUrl(siteConfig.siteUrl, canonicalPath, locale) },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "MusicComposition",
      inLanguage: htmlLang,
      name: title,
      composer: { "@type": "Person", name: composer },
      description,
      url: getLocalizedAbsoluteUrl(siteConfig.siteUrl, canonicalPath, locale),
    },
  ];

  return (
    <div className="public-container page-stack">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }}
      />
      <nav aria-label={copy.breadcrumb} className="button-row">
        <Link className="public-button tertiary" href={localizePublicHref("/", locale)}>{copy.home}</Link>
        <span aria-hidden="true">›</span>
        <Link className="public-button tertiary" href={localizePublicHref("/library", locale)}>{copy.libraryName}</Link>
        <span aria-hidden="true">›</span>
        <span className="helper-copy" aria-current="page">{title}</span>
      </nav>
      <section className="page-banner split">
        <SectionIntro eyebrow={copy.eyebrow} title={title} body={`${composer} · ${composerDates}`} titleAs="h1" largeBody />
        <Panel variant="glass" className="stack-md">
          <div className="button-row">
            <StatusPill tone={score.assetStatus === "downloadable" ? "green" : "cyan"}>{catalog.values.assetStatuses[score.assetStatus]}</StatusPill>
            <StatusPill tone="amber">{catalog.values.workRights[score.workRights]}</StatusPill>
          </div>
          <p className="body-copy">{description}</p>
        </Panel>
      </section>

      <section className="metric-grid">
        <MetricCard
          label={copy.instruments}
          value={score.instruments.map((value) => catalog.values.instruments[value]).join(" · ")}
          body={`${catalog.values.eras[score.era]} · ${catalog.values.ensembles[score.ensemble]} · ${catalog.values.difficulties[score.difficulty]}`}
        />
        <MetricCard
          label={copy.source}
          value={score.sourceProvider}
          body={score.formats.map((value) => catalog.values.formats[value]).join(" · ")}
        />
        <MetricCard
          label={copy.rights}
          value={catalog.values.workRights[score.workRights]}
          body={catalog.values.assetLicenses[score.assetLicenseKey]}
        />
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro
          eyebrow={copy.rights}
          title={copy.source}
          body={score.assetStatus === "source-linked" ? copy.notice : catalog.values.assetLicenses[score.assetLicenseKey]}
        />
        <div className="button-row">
          {score.localMusicXmlUrl ? <a className="public-button primary" href={score.localMusicXmlUrl} download>{copy.download}</a> : null}
          {score.assetStatus === "source-linked" ? (
            <a className="public-button secondary" href={score.sourceUrl} target={sourceIsExternal ? "_blank" : undefined} rel={sourceIsExternal ? "noreferrer" : undefined}>{copy.openSource}</a>
          ) : null}
          <a className="public-button tertiary" href={getAppScoreProjectsUrl(locale)}>{copy.workspace}</a>
          <Link className="public-button tertiary" href={localizePublicHref("/library", locale)}>{copy.back}</Link>
        </div>
      </section>
    </div>
  );
}
