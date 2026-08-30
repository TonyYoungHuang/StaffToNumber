import { getLocaleConfig } from "@score/i18n";
import { Panel, SectionIntro } from "@score/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { readSiteLocale } from "../../lib/locale";
import { getLocalizedAbsoluteUrl, getLocalizedAlternates, localizePublicHref } from "../../lib/locale-routing";
import { getProductMediaPresentation } from "../../lib/product-media";
import { getStaticMarketingLocalization, getStaticMarketingMedia } from "../../lib/static-marketing-localization";
import { siteConfig } from "../../lib/site";

const canonicalPath = "/numbered-notation-converter";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();
  const localization = getStaticMarketingLocalization(locale);
  const copy = localization.numberedNotation;
  const media = getStaticMarketingMedia("numberedNotation", locale);
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
      type: "website",
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

export default async function NumberedNotationConverterPage() {
  const locale = await readSiteLocale();
  const localization = getStaticMarketingLocalization(locale);
  const copy = localization.numberedNotation;
  const pageUrl = getLocalizedAbsoluteUrl(siteConfig.siteUrl, canonicalPath, locale);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: copy.title,
      description: copy.intro,
      url: pageUrl,
      inLanguage: getLocaleConfig(locale).htmlLang,
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
    <div className="public-container page-stack">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }}
      />

      <section className="page-banner">
        <SectionIntro eyebrow={copy.eyebrow} title={copy.title} body={copy.intro} titleAs="h1" largeBody />
      </section>

      <section className="split-layout">
        <Panel className="stack-lg">
          <SectionIntro eyebrow={copy.directionOneEyebrow} title={copy.staffTitle} body={copy.staffBody} />
          <Link className="public-button primary" href={localizePublicHref("/staff-to-jianpu", locale)}>
            {copy.staffAction}
          </Link>
        </Panel>
        <Panel className="stack-lg">
          <SectionIntro eyebrow={copy.directionTwoEyebrow} title={copy.jianpuTitle} body={copy.jianpuBody} />
          <Link className="public-button primary" href={localizePublicHref("/jianpu-to-staff", locale)}>
            {copy.jianpuAction}
          </Link>
        </Panel>
      </section>

      <section className="split-layout">
        <Panel variant="glass" className="stack-sm">
          <h2 className="item-title">{copy.modelTitle}</h2>
          <p className="body-copy">{copy.modelBody}</p>
        </Panel>
        <Panel variant="glass" className="stack-sm">
          <h2 className="item-title">{copy.limitsTitle}</h2>
          <p className="body-copy">{copy.limitsBody}</p>
        </Panel>
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
    </div>
  );
}
