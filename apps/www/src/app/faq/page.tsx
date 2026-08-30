import { getLocaleConfig } from "@score/i18n";
import { MetricCard, Panel, SectionIntro, WorkflowStep } from "@score/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { readSiteLocale } from "../../lib/locale";
import { getLocalizedAbsoluteUrl, getLocalizedAlternates, localizePublicHref } from "../../lib/locale-routing";
import { getProductMediaPresentation } from "../../lib/product-media";
import {
  getStaticMarketingLocalization,
  getStaticMarketingMedia,
  resolveFaqGroups,
} from "../../lib/static-marketing-localization";
import { getCheckoutUrl, getSupportUrl, siteConfig } from "../../lib/site";

const canonicalPath = "/faq";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();
  const localization = getStaticMarketingLocalization(locale);
  const copy = localization.faq;
  const media = getStaticMarketingMedia("faq", locale);
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
    twitter: {
      card: "summary_large_image",
      title: copy.metadata.title,
      description: copy.metadata.description,
      ...(media && mediaPresentation ? { images: [{ url: media.src, alt: mediaPresentation.alt }] } : {}),
    },
  };
}

export default async function FaqPage() {
  const locale = await readSiteLocale();
  const localization = getStaticMarketingLocalization(locale);
  const copy = localization.faq;
  const checkoutUrl = getCheckoutUrl(locale);
  const faqGroups = resolveFaqGroups(locale, siteConfig.release.checkoutAvailable);
  const pageUrl = getLocalizedAbsoluteUrl(siteConfig.siteUrl, canonicalPath, locale);
  const topSupportUrl = localizePublicHref(getSupportUrl("general", "faq-top"), locale);
  const bottomSupportUrl = localizePublicHref(getSupportUrl("general", "faq-bottom"), locale);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      name: copy.hero.title,
      description: copy.metadata.description,
      url: pageUrl,
      inLanguage: getLocaleConfig(locale).htmlLang,
      mainEntity: faqGroups.flatMap((group) => group.items).map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
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
        { "@type": "ListItem", position: 2, name: copy.hero.title, item: pageUrl },
      ],
    },
  ];

  return (
    <section className="public-container public-page stack-xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }}
      />

      <Panel variant="surface" className="stack-lg">
        <SectionIntro
          eyebrow={copy.hero.eyebrow}
          title={copy.hero.title}
          body={copy.hero.body}
          titleAs="h1"
          largeBody
        />
        <div className="button-row">
          {siteConfig.release.checkoutAvailable ? (
            <a href={checkoutUrl} className="public-button primary">{copy.hero.checkoutAction}</a>
          ) : null}
          <Link href={topSupportUrl} className="public-button secondary">{copy.hero.supportPageAction}</Link>
          <a href={topSupportUrl} className="public-button tertiary">{copy.hero.contactAction}</a>
        </div>
      </Panel>

      <section className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro eyebrow={copy.workflow.eyebrow} title={copy.workflow.title} body={copy.workflow.body} />
          <div className="metric-grid">
            {copy.workflow.metrics.map(([label, value, body]) => (
              <MetricCard key={label} label={label} value={value} body={body} />
            ))}
          </div>
          <div className="button-row">
            <Link href={localizePublicHref("/pdf-score-scanner", locale)} className="public-button secondary">
              {copy.workflow.scannerAction}
            </Link>
            <Link href={localizePublicHref("/numbered-notation-converter", locale)} className="public-button tertiary">
              {copy.workflow.converterAction}
            </Link>
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro eyebrow={copy.verification.eyebrow} title={copy.verification.title} />
          <div className="workflow-grid">
            {copy.verification.steps.map(([step, title, body]) => (
              <WorkflowStep key={step} step={step} title={title} body={body} />
            ))}
          </div>
        </Panel>
      </section>

      <div className="stack-lg">
        {faqGroups.map((group) => (
          <Panel key={group.title} variant="glass" className="stack-md">
            <h2 className="section-title">{group.title}</h2>
            <div className="stack-md">
              {group.items.map((item) => (
                <Panel key={item.question} variant="sunken" className="stack-sm">
                  <h3 className="item-title">{item.question}</h3>
                  <p className="body-copy">{item.answer}</p>
                </Panel>
              ))}
            </div>
          </Panel>
        ))}
      </div>

      <section className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro eyebrow={copy.next.eyebrow} title={copy.next.title} />
          <div className="button-row">
            <Link href={bottomSupportUrl} className="public-button primary">{copy.next.supportAction}</Link>
            <a href={bottomSupportUrl} className="public-button secondary">{copy.next.requestAction}</a>
            <Link href={localizePublicHref("/about", locale)} className="public-button tertiary">
              {copy.next.aboutAction}
            </Link>
            {siteConfig.release.checkoutAvailable ? (
              <a href={checkoutUrl} className="public-button tertiary">{copy.next.checkoutAction}</a>
            ) : null}
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro eyebrow={copy.related.eyebrow} title={copy.related.title} body={copy.related.body} />
          <div className="button-row">
            <Link href={localizePublicHref("/privacy", locale)} className="public-button secondary">
              {copy.related.privacyAction}
            </Link>
            <Link href={localizePublicHref("/terms", locale)} className="public-button tertiary">
              {copy.related.termsAction}
            </Link>
            <Link href={localizePublicHref("/support", locale)} className="public-button tertiary">
              {copy.related.supportAction}
            </Link>
          </div>
        </Panel>
      </section>
    </section>
  );
}
