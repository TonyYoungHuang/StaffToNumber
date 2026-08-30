import { getLocaleConfig } from "@score/i18n";
import { Panel, SectionIntro, StatusPill } from "@score/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { readSiteLocale } from "../../lib/locale";
import { getLocalizedAbsoluteUrl, getLocalizedAlternates, localizePublicHref } from "../../lib/locale-routing";
import { getProductMediaPresentation } from "../../lib/product-media";
import { getSupportLegalLocalization, getSupportLegalMedia } from "../../lib/support-legal-localization";
import { getCheckoutUrl, getSupportUrl, legalLastUpdated, siteConfig } from "../../lib/site";

const canonicalPath = "/privacy";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();
  const localization = getSupportLegalLocalization(locale);
  const copy = localization.privacy;
  const media = getSupportLegalMedia("privacy", locale);
  const mediaPresentation = media ? getProductMediaPresentation(locale, media.sourceLocale, copy.hero.title) : null;

  return {
    title: copy.metadata.title,
    description: copy.metadata.description,
    keywords: [...copy.metadata.keywords],
    alternates: getLocalizedAlternates(canonicalPath, locale),
    openGraph: {
      title: copy.metadata.title,
      description: copy.metadata.description,
      url: getLocalizedAbsoluteUrl(siteConfig.siteUrl, canonicalPath, locale),
      siteName: siteConfig.siteName,
      locale: localization.openGraphLocale,
      type: "website",
      ...(media && mediaPresentation ? { images: [{ url: media.src, width: media.width, height: media.height, alt: mediaPresentation.alt }] } : {}),
    },
    twitter: { card: "summary_large_image", title: copy.metadata.title, description: copy.metadata.description, ...(media && mediaPresentation ? { images: [{ url: media.src, alt: mediaPresentation.alt }] } : {}) },
  };
}

export default async function PrivacyPage() {
  const locale = await readSiteLocale();
  const localization = getSupportLegalLocalization(locale);
  const copy = localization.privacy;
  const checkoutUrl = getCheckoutUrl(locale);
  const supportUrl = localizePublicHref(getSupportUrl("privacy", "privacy"), locale);
  const pageUrl = getLocalizedAbsoluteUrl(siteConfig.siteUrl, canonicalPath, locale);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: copy.hero.title,
      description: copy.metadata.description,
      url: pageUrl,
      inLanguage: getLocaleConfig(locale).htmlLang,
      dateModified: legalLastUpdated,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: localization.homeBreadcrumb, item: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/", locale) },
        { "@type": "ListItem", position: 2, name: copy.hero.title, item: pageUrl },
      ],
    },
  ];

  return (
    <section className="public-container public-page stack-xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }} />

      <Panel variant="surface" className="stack-lg">
        <SectionIntro eyebrow={copy.hero.eyebrow} title={copy.hero.title} body={copy.hero.body} titleAs="h1" largeBody />
        <div className="button-row">
          <StatusPill tone="cyan">{copy.hero.updatedPrefix} {legalLastUpdated}</StatusPill>
          <Link href={localizePublicHref("/terms", locale)} className="public-button secondary">{copy.hero.termsAction}</Link>
        </div>
      </Panel>

      {locale !== "en" ? (
        <section role="note" aria-label={localization.legalReviewNotice.ariaLabel}>
          <Panel variant="sunken" className="stack-md">
            <StatusPill tone="amber">{localization.legalReviewNotice.eyebrow}</StatusPill>
            <h2 className="card-title">{localization.legalReviewNotice.title}</h2>
            <p className="body-copy">{localization.legalReviewNotice.body}</p>
          </Panel>
        </section>
      ) : null}

      <div className="stack-lg">
        {copy.sections.map((section) => (
          <Panel key={section.title} variant="glass" className="stack-md">
            <h2 className="section-title">{section.title}</h2>
            <div className="stack-sm">
              {section.points.map((point) => <p key={point} className="body-copy">{point}</p>)}
            </div>
          </Panel>
        ))}
      </div>

      <Panel variant="sunken" className="stack-md">
        <h2 className="card-title">{copy.contact.title}</h2>
        <p className="body-copy">{copy.contact.body}</p>
        <p className="helper-copy">{copy.contact.note}</p>
        <div className="button-row">
          <a href={supportUrl} className="public-button secondary">{copy.contact.action}</a>
        </div>
      </Panel>

      <section className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro eyebrow={copy.related.eyebrow} title={copy.related.title} body={copy.related.body} />
          <div className="button-row">
            <Link href={localizePublicHref("/about", locale)} className="public-button secondary">{copy.related.aboutAction}</Link>
            <Link href={localizePublicHref("/terms", locale)} className="public-button tertiary">{copy.related.termsAction}</Link>
            {siteConfig.release.checkoutAvailable ? <a href={checkoutUrl} className="public-button tertiary">{copy.related.checkoutAction}</a> : null}
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro eyebrow={copy.continue.eyebrow} title={copy.continue.title} />
          <p className="body-copy">{copy.continue.body}</p>
          <div className="button-row">
            <a href={supportUrl} className="public-button secondary">{copy.continue.supportAction}</a>
            <Link href={localizePublicHref("/", locale)} className="public-button tertiary">{copy.continue.homeAction}</Link>
          </div>
        </Panel>
      </section>
    </section>
  );
}
