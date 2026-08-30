import type { Metadata } from "next";
import { SUPPORTED_LOCALES, getLocaleConfig } from "@score/i18n";
import { Panel, SectionIntro, StatusPill } from "@score/ui";
import { readSiteLocale } from "../../lib/locale";
import { getLocalizedAbsoluteUrl, getLocalizedAlternates, localizePublicHref } from "../../lib/locale-routing";
import { FEATURE_OPEN_GRAPH_LOCALES, getFeatureIndexCatalog } from "../../lib/feature-page-localization";
import type { BetaFeatureId, FormalFeatureId } from "../../lib/feature-localization/types";
import { getFeatureProductMedia, getProductMediaPresentation } from "../../lib/product-media";
import { getAppScoreProjectsUrl, siteConfig } from "../../lib/site";

const formalFeatureLinks = [
  { id: "online-editor", href: "/score-editor" },
  { id: "playback-practice", href: "/score-to-audio" },
  { id: "smart-transposer", href: "/transpose-score" },
  { id: "staff-jianpu", href: "/numbered-notation-converter" },
  { id: "version-history", href: "/score-editor" },
  { id: "share-collaborate", href: "/score-editor" },
  { id: "musicxml-midi", href: "/musicxml-midi" },
] as const satisfies ReadonlyArray<{ id: FormalFeatureId; href: string }>;

const betaFeatureLinks = [
  { id: "part-copy", href: "/score-editor" },
  { id: "recording-feedback", href: "/score-to-audio" },
  { id: "real-time-collaboration", href: "/score-editor" },
  { id: "image-export", href: "/musicxml-midi" },
  { id: "audio-export", href: "/score-to-audio" },
  { id: "school-beta", href: "/teaching" },
] as const satisfies ReadonlyArray<{ id: BetaFeatureId; href: string }>;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();
  const { metadata } = getFeatureIndexCatalog(locale);
  const media = getFeatureProductMedia("score-editor", locale);
  const mediaPresentation = media ? getProductMediaPresentation(locale, media.sourceLocale, metadata.title) : null;

  return {
    title: metadata.title,
    description: metadata.description,
    keywords: metadata.keywords,
    alternates: getLocalizedAlternates("/features", locale),
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      url: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/features", locale),
      siteName: siteConfig.siteName,
      locale: FEATURE_OPEN_GRAPH_LOCALES[locale],
      alternateLocale: SUPPORTED_LOCALES
        .filter((alternateLocale) => alternateLocale !== locale)
        .map((alternateLocale) => FEATURE_OPEN_GRAPH_LOCALES[alternateLocale]),
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

export default async function FeaturesPage() {
  const locale = await readSiteLocale();
  const catalog = getFeatureIndexCatalog(locale);
  const copy = catalog.page;
  const workspace = getAppScoreProjectsUrl(locale);
  const allFeatures = [
    ...formalFeatureLinks.map((feature) => ({ ...feature, ...catalog.formal[feature.id] })),
    ...betaFeatureLinks.map((feature) => ({ ...feature, ...catalog.betaFeatures[feature.id] })),
  ];
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: copy.structuredDataName,
    inLanguage: getLocaleConfig(locale).htmlLang,
    itemListElement: allFeatures.map((feature, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: feature.title,
      description: feature.body,
      url: getLocalizedAbsoluteUrl(siteConfig.siteUrl, feature.href, locale),
    })),
  };

  return (
    <div className="public-container page-stack">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }}
      />
      <section className="page-banner split">
        <SectionIntro eyebrow={copy.eyebrow} title={copy.title} body={copy.body} titleAs="h1" largeBody />
        <Panel variant="glass" className="stack-md">
          <StatusPill tone="green">{copy.available}</StatusPill>
          <a className="public-button primary" href={workspace}>{copy.workspace}</a>
        </Panel>
      </section>
      <section className="list-grid">
        {formalFeatureLinks.map((feature) => {
          const content = catalog.formal[feature.id];
          return (
            <article className="list-item" id={feature.id} key={feature.id}>
              <div className="list-item-content stack-sm">
                <StatusPill tone="green">{copy.available}</StatusPill>
                <h2 className="item-title">{content.title}</h2>
                <p className="body-copy">{content.body}</p>
                <a className="public-button secondary" href={localizePublicHref(feature.href, locale)}>{copy.open}</a>
              </div>
            </article>
          );
        })}
      </section>
      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow={copy.beta} title={copy.betaTitle} body={copy.betaBody} />
        <div className="list-grid">
          {betaFeatureLinks.map((feature) => {
            const content = catalog.betaFeatures[feature.id];
            return (
              <article className="list-item" id={feature.id} key={feature.id}>
                <div className="list-item-content stack-sm">
                  <StatusPill tone="amber">{copy.beta}</StatusPill>
                  <h2 className="item-title">{content.title}</h2>
                  <p className="body-copy">{content.body}</p>
                  <a className="public-button tertiary" href={localizePublicHref(feature.href, locale)}>{copy.open}</a>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
