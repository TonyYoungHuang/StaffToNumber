import { getLocaleConfig } from "@score/i18n";
import { Panel, StatusPill } from "@score/ui";
import type { Metadata } from "next";
import { CopyrightComplaintForm } from "../../components/CopyrightComplaintForm";
import { readSiteLocale } from "../../lib/locale";
import { getLocalizedAbsoluteUrl, getLocalizedAlternates } from "../../lib/locale-routing";
import { getProductMediaPresentation } from "../../lib/product-media";
import { getSupportLegalLocalization, getSupportLegalMedia } from "../../lib/support-legal-localization";
import { siteConfig } from "../../lib/site";

const canonicalPath = "/copyright-complaint";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();
  const localization = getSupportLegalLocalization(locale);
  const copy = localization.copyright;
  const media = getSupportLegalMedia("copyright", locale);
  const mediaPresentation = media ? getProductMediaPresentation(locale, media.sourceLocale, copy.hero.title) : null;

  return {
    title: copy.metadata.title,
    description: copy.metadata.description,
    keywords: [...copy.metadata.keywords],
    alternates: getLocalizedAlternates(canonicalPath, locale),
    robots: { index: true, follow: true },
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

export default async function CopyrightComplaintPage() {
  const locale = await readSiteLocale();
  const localization = getSupportLegalLocalization(locale);
  const copy = localization.copyright;
  const pageUrl = getLocalizedAbsoluteUrl(siteConfig.siteUrl, canonicalPath, locale);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: copy.hero.title,
      description: copy.metadata.description,
      url: pageUrl,
      inLanguage: getLocaleConfig(locale).htmlLang,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: localization.homeBreadcrumb, item: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/", locale) },
        { "@type": "ListItem", position: 2, name: copy.hero.title, item: pageUrl },
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
    <section className="public-container page-shell stack-xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }} />

      <header className="page-banner">
        <p className="eyebrow">{copy.hero.eyebrow}</p>
        <h1 className="page-title">{copy.hero.title}</h1>
        <p className="body-copy">{copy.hero.body}</p>
      </header>

      {locale !== "en" ? (
        <section role="note" aria-label={localization.legalReviewNotice.ariaLabel}>
          <Panel variant="sunken" className="stack-md">
            <StatusPill tone="amber">{localization.legalReviewNotice.eyebrow}</StatusPill>
            <h2 className="card-title">{localization.legalReviewNotice.title}</h2>
            <p className="body-copy">{localization.legalReviewNotice.body}</p>
          </Panel>
        </section>
      ) : null}

      <CopyrightComplaintForm locale={locale} copy={copy.form} />

      <section className="surface-panel stack-lg">
        <h2 className="card-title">{copy.faqTitle}</h2>
        {copy.faqs.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p className="body-copy">{answer}</p>
          </details>
        ))}
      </section>
    </section>
  );
}
