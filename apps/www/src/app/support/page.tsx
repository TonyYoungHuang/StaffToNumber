import { getLocaleConfig } from "@score/i18n";
import { MetricCard, Panel, SectionIntro, StatusPill, WorkflowStep } from "@score/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { SupportRequestForm } from "../../components/SupportRequestForm";
import { readSiteLocale } from "../../lib/locale";
import { getLocalizedAbsoluteUrl, getLocalizedAlternates, localizePublicHref } from "../../lib/locale-routing";
import { getProductMediaPresentation } from "../../lib/product-media";
import { getSupportLegalLocalization, getSupportLegalMedia } from "../../lib/support-legal-localization";
import { getCheckoutUrl, siteConfig } from "../../lib/site";

const canonicalPath = "/support";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();
  const localization = getSupportLegalLocalization(locale);
  const copy = localization.support;
  const media = getSupportLegalMedia("support", locale);
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

export default async function SupportPage() {
  const locale = await readSiteLocale();
  const localization = getSupportLegalLocalization(locale);
  const copy = localization.support;
  const checkoutUrl = getCheckoutUrl(locale);
  const pageUrl = getLocalizedAbsoluteUrl(siteConfig.siteUrl, canonicalPath, locale);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: copy.schemaName,
      description: copy.metadata.description,
      url: pageUrl,
      inLanguage: getLocaleConfig(locale).htmlLang,
      mainEntity: {
        "@type": "Organization",
        name: siteConfig.siteName,
        email: siteConfig.supportEmail,
        contactPoint: [{
          "@type": "ContactPoint",
          contactType: copy.schemaContactType,
          email: siteConfig.supportEmail,
          availableLanguage: ["en", "zh-CN"],
        }],
      },
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
          <a href="#support-form" className="public-button primary">{copy.hero.submitAction}</a>
          <Link href={localizePublicHref("/faq", locale)} className="public-button secondary">{copy.hero.faqAction}</Link>
          {siteConfig.release.checkoutAvailable ? <a href={checkoutUrl} className="public-button tertiary">{copy.hero.checkoutAction}</a> : null}
        </div>
      </Panel>

      <SupportRequestForm locale={locale} supportEmail={siteConfig.supportEmail} copy={copy.form} />

      <section className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro eyebrow={copy.workflows.eyebrow} title={copy.workflows.title} />
          <div className="workflow-grid">
            {copy.workflows.items.map(([step, title, body]) => <WorkflowStep key={step} step={step} title={title} body={body} />)}
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro eyebrow={copy.evidence.eyebrow} title={copy.evidence.title} />
          <Panel variant="sunken" className="stack-md">
            <StatusPill tone="cyan">{copy.evidence.status}</StatusPill>
            {copy.evidence.points.map((point) => <p key={point} className="body-copy">{point}</p>)}
          </Panel>
        </Panel>
      </section>

      <section className="preview-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro eyebrow={copy.boundary.eyebrow} title={copy.boundary.title} body={copy.boundary.body} />
          <div className="metric-grid">
            {copy.boundary.metrics.map(([label, value, body]) => <MetricCard key={label} label={label} value={value} body={body} />)}
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro eyebrow={copy.after.eyebrow} title={copy.after.title} body={copy.after.body} />
          <div className="button-row">
            <Link href={localizePublicHref("/about", locale)} className="public-button secondary">{copy.after.aboutAction}</Link>
            <Link href={localizePublicHref("/privacy", locale)} className="public-button tertiary">{copy.after.privacyAction}</Link>
            <Link href={localizePublicHref("/terms", locale)} className="public-button tertiary">{copy.after.termsAction}</Link>
          </div>
        </Panel>
      </section>

      <Panel variant="sunken" className="stack-md">
        <h2 className="card-title">{copy.final.title}</h2>
        <p className="body-copy">{copy.final.body}</p>
        <div className="button-row">
          <a href="#support-form" className="public-button primary">{copy.final.formAction}</a>
          <Link href={localizePublicHref("/faq", locale)} className="public-button secondary">{copy.final.faqAction}</Link>
          {siteConfig.release.checkoutAvailable ? <a href={checkoutUrl} className="public-button tertiary">{copy.final.checkoutAction}</a> : null}
        </div>
        <p className="helper-copy">{siteConfig.supportEmail}</p>
      </Panel>
    </section>
  );
}
