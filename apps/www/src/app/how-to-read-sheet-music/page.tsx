import { getLocaleConfig } from "@score/i18n";
import { Panel, SectionIntro, WorkflowStep } from "@score/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { readSiteLocale } from "../../lib/locale";
import { getLocalizedAbsoluteUrl, getLocalizedAlternates, localizePublicHref } from "../../lib/locale-routing";
import { getProductMediaPresentation } from "../../lib/product-media";
import { getStaticMarketingLocalization, getStaticMarketingMedia } from "../../lib/static-marketing-localization";
import { siteConfig } from "../../lib/site";

const canonicalPath = "/how-to-read-sheet-music";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();
  const localization = getStaticMarketingLocalization(locale);
  const copy = localization.readingGuide;
  const media = getStaticMarketingMedia("readingGuide", locale);
  const mediaPresentation = media ? getProductMediaPresentation(locale, media.sourceLocale, copy.title) : null;

  return {
    title: copy.metadata.title,
    description: copy.metadata.description,
    keywords: [...copy.metadata.keywords],
    alternates: getLocalizedAlternates(canonicalPath, locale),
    robots: {
      index: siteConfig.release.publicLaunchReady,
      follow: siteConfig.release.publicLaunchReady,
      googleBot: {
        index: siteConfig.release.publicLaunchReady,
        follow: siteConfig.release.publicLaunchReady,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: copy.metadata.title,
      description: copy.metadata.description,
      url: getLocalizedAbsoluteUrl(siteConfig.siteUrl, canonicalPath, locale),
      siteName: siteConfig.siteName,
      locale: localization.openGraphLocale,
      type: "article",
      ...(media && mediaPresentation ? { images: [{ url: media.src, width: media.width, height: media.height, alt: mediaPresentation.alt }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: copy.metadata.title,
      description: copy.metadata.description,
      ...(media && mediaPresentation ? { images: [{ url: media.src, alt: mediaPresentation.alt }] } : {}),
    },
  };
}

export default async function HowToReadSheetMusicPage() {
  const locale = await readSiteLocale();
  const localization = getStaticMarketingLocalization(locale);
  const copy = localization.readingGuide;
  const pageUrl = getLocalizedAbsoluteUrl(siteConfig.siteUrl, canonicalPath, locale);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: copy.title,
      description: copy.intro,
      inLanguage: getLocaleConfig(locale).htmlLang,
      dateModified: "2026-08-24",
      mainEntityOfPage: pageUrl,
      author: { "@type": "Organization", name: siteConfig.siteName },
      publisher: { "@type": "Organization", name: siteConfig.siteName },
      keywords: copy.metadata.keywords.join(", "),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: localization.homeBreadcrumb,
          item: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/", locale),
        },
        { "@type": "ListItem", position: 2, name: copy.title, item: pageUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: getLocaleConfig(locale).htmlLang,
      mainEntity: copy.faqs.map(([question, answer]) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    },
  ];

  return (
    <article className="public-container page-stack">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }}
      />

      <section className="page-banner">
        <SectionIntro eyebrow={copy.eyebrow} title={copy.title} body={copy.intro} titleAs="h1" largeBody />
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow={copy.basicsEyebrow} title={copy.summaryTitle} body={copy.summaryBody} />
        <div className="metric-grid">
          {copy.concepts.map(([title, body]) => (
            <Panel key={title} className="stack-sm">
              <h3 className="item-title">{title}</h3>
              <p className="body-copy">{body}</p>
            </Panel>
          ))}
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow={copy.orderEyebrow} title={copy.stepsTitle} body={copy.stepsBody} />
        <div className="workflow-list">
          {copy.steps.map(([title, body], index) => (
            <WorkflowStep key={title} step={String(index + 1).padStart(2, "0")} title={title} body={body} />
          ))}
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow={copy.symbolsEyebrow} title={copy.symbolsTitle} body={copy.symbolsBody} />
        <div className="list-grid">
          {copy.symbols.map(([title, body]) => (
            <div key={title} className="list-item">
              <div className="list-item-content">
                <h3 className="item-title">{title}</h3>
                <p className="item-meta">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow={copy.practiceEyebrow} title={copy.practiceTitle} body={copy.practiceBody} />
        <div className="button-row">
          <Link className="public-button primary" href={localizePublicHref("/score-editor", locale)}>
            {copy.editAction}
          </Link>
          <Link className="public-button secondary" href={localizePublicHref("/pdf-score-scanner", locale)}>
            {copy.scanAction}
          </Link>
          <Link className="public-button tertiary" href={localizePublicHref("/score-to-audio", locale)}>
            {copy.playAction}
          </Link>
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow={copy.faqEyebrow} title={copy.faqTitle} />
        <div className="list-grid">
          {copy.faqs.map(([question, answer]) => (
            <details key={question} className="list-item">
              <summary className="item-title">{question}</summary>
              <p className="body-copy">{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </article>
  );
}
