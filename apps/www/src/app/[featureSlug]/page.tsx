import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { formatDate, getLocaleConfig, SUPPORTED_LOCALES } from "@score/i18n";
import { MetricCard, Panel, PreviewStaffGraphic, SectionIntro, StatusPill, WorkflowStep } from "@score/ui";
import { getFeatureSeoRecord } from "../../lib/feature-seo";
import {
  FEATURE_OPEN_GRAPH_LOCALES,
  getFeaturePageUi,
  getFeaturePracticeCopy,
  localizeFeatureEvidence,
  localizeFeaturePage,
} from "../../lib/feature-page-localization";
import { findPlatformFeaturePage, isFeatureAvailable, isFeatureIndexable, platformFeaturePages } from "../../lib/platform-feature-pages";
import { getAppScoreProjectsUrl, getAppStartConversionUrl, getCheckoutUrl, getSupportUrl, siteConfig } from "../../lib/site";
import { readSiteLocale } from "../../lib/locale";
import { getLocalizedAbsoluteUrl, getLocalizedAlternates, localizePublicHref } from "../../lib/locale-routing";
import type { FeatureProductMediaSlug } from "../../lib/product-media";
import { FeaturePracticeDemo } from "../../components/FeaturePracticeDemo";

type FeatureRouteParams = {
  featureSlug: string;
};

function actionUrl(page: NonNullable<ReturnType<typeof findPlatformFeaturePage>>, locale: Awaited<ReturnType<typeof readSiteLocale>>) {
  if (!isFeatureAvailable(page)) {
    return localizePublicHref(getSupportUrl("general", `${page.slug}-release-status`), locale);
  }

  const action = page.primaryAction;
  if (action === "upload") {
    return localizePublicHref(getAppStartConversionUrl(locale), locale);
  }

  if (action === "checkout") {
    return getCheckoutUrl(locale);
  }

  return getAppScoreProjectsUrl(locale);
}

function actionLabel(page: NonNullable<ReturnType<typeof findPlatformFeaturePage>>, locale: Awaited<ReturnType<typeof readSiteLocale>>) {
  const actions = getFeaturePageUi(locale).actions;
  if (!isFeatureAvailable(page)) {
    return actions.unavailable;
  }

  const action = page.primaryAction;
  if (action === "upload") {
    return actions.upload;
  }

  if (action === "checkout") {
    return actions.checkout;
  }

  return actions.scores;
}

function statusTone(status: string) {
  if (status === "Preview") {
    return "amber" as const;
  }

  if (status === "Available") {
    return "cyan" as const;
  }

  return "green" as const;
}

export function generateStaticParams(): FeatureRouteParams[] {
  return platformFeaturePages.map((page) => ({
    featureSlug: page.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<FeatureRouteParams> }): Promise<Metadata> {
  const { featureSlug } = await params;
  const sourcePage = findPlatformFeaturePage(featureSlug);

  if (!sourcePage) {
    return {};
  }
  const locale = await readSiteLocale();
  const page = localizeFeaturePage(sourcePage, locale);
  const canonicalUrl = getLocalizedAbsoluteUrl(siteConfig.siteUrl, page.canonical, locale);
  const socialImage = localizePublicHref(`${page.canonical}/opengraph-image/default`, locale);
  const socialImageAlt = `${page.title} | ${siteConfig.siteName}`;

  return {
    title: `${page.title} | ${siteConfig.siteName}`,
    description: page.description,
    keywords: page.keywords,
    alternates: getLocalizedAlternates(page.canonical, locale),
    robots: {
      index: isFeatureIndexable(page),
      follow: isFeatureIndexable(page),
      googleBot: {
        index: isFeatureIndexable(page),
        follow: isFeatureIndexable(page),
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: `${page.title} | ${siteConfig.siteName}`,
      description: page.description,
      url: canonicalUrl,
      siteName: siteConfig.siteName,
      locale: FEATURE_OPEN_GRAPH_LOCALES[locale],
      alternateLocale: SUPPORTED_LOCALES
        .filter((alternateLocale) => alternateLocale !== locale)
        .map((alternateLocale) => FEATURE_OPEN_GRAPH_LOCALES[alternateLocale]),
      type: "website",
      images: [{ url: socialImage, width: 1200, height: 630, alt: socialImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${page.title} | ${siteConfig.siteName}`,
      description: page.description,
      images: [{ url: socialImage, alt: socialImageAlt }],
    },
  };
}

export default async function PlatformFeaturePage({ params }: { params: Promise<FeatureRouteParams> }) {
  const { featureSlug } = await params;
  const sourcePage = findPlatformFeaturePage(featureSlug);

  if (!sourcePage) {
    notFound();
  }

  const locale = await readSiteLocale();
  const page = localizeFeaturePage(sourcePage, locale);
  const ui = getFeaturePageUi(locale);
  const practiceCopy = getFeaturePracticeCopy(locale);
  const available = isFeatureAvailable(sourcePage);
  const ctaUrl = actionUrl(sourcePage, locale);
  const sourceSeo = getFeatureSeoRecord(page.slug);
  if (!sourceSeo) {
    notFound();
  }
  const seo = localizeFeatureEvidence(sourceSeo, locale, page.title, page.slug as FeatureProductMediaSlug);
  const canonicalUrl = getLocalizedAbsoluteUrl(siteConfig.siteUrl, page.canonical, locale);
  const htmlLang = getLocaleConfig(locale).htmlLang;
  const capturedAt = seo.screenshot
    ? formatDate(seo.screenshot.capturedAt, locale, { dateStyle: "medium", timeZone: "UTC" })
    : null;
  const relatedPages = sourceSeo.relatedSlugs
    .map((slug) => findPlatformFeaturePage(slug))
    .filter((relatedPage): relatedPage is NonNullable<typeof relatedPage> => Boolean(relatedPage && isFeatureAvailable(relatedPage)))
    .map((relatedPage) => localizeFeaturePage(relatedPage, locale));
  const faqItems = [
    {
      question: ui.faqInput(page.title),
      answer: page.workflow[0]?.body ?? page.description,
    },
    {
      question: ui.faqEdit,
      answer: ui.faqEditAnswer,
    },
    {
      question: ui.faqCheck,
      answer: page.guardrail,
    },
  ];
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      inLanguage: htmlLang,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: ui.home, item: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/", locale) },
        { "@type": "ListItem", position: 2, name: page.title, item: canonicalUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: page.title,
      description: page.description,
      inLanguage: htmlLang,
      keywords: page.keywords.join(", "),
      step: page.workflow.map((item, index) => ({ "@type": "HowToStep", position: index + 1, name: item.title, text: item.body })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: htmlLang,
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: siteConfig.siteName,
      applicationCategory: "MultimediaApplication",
      applicationSubCategory: ui.softwareSubcategory,
      operatingSystem: ui.operatingSystem,
      url: canonicalUrl,
      description: page.description,
      inLanguage: htmlLang,
      keywords: page.keywords.join(", "),
      featureList: page.modules,
      ...(seo.screenshot ? { screenshot: `${siteConfig.siteUrl}${seo.screenshot.src}` } : {}),
    },
  ];

  return (
    <div className={`public-container page-stack${page.slug === "teaching" ? " feature-teaching-page" : ""}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }}
      />
      <section className="page-banner split">
        <SectionIntro eyebrow={page.eyebrow} title={page.title} body={page.description} titleAs="h1" largeBody />
        <Panel variant="glass" className="stack-md">
          <StatusPill tone={available ? statusTone(page.status) : "amber"}>{available ? ui.statuses[page.status] : ui.unavailable}</StatusPill>
          <PreviewStaffGraphic />
          <p className="body-copy">{page.guardrail}</p>
          <div className="button-row">
            <a href={ctaUrl} className="public-button primary">
              {actionLabel(sourcePage, locale)}
            </a>
            {siteConfig.release.checkoutAvailable ? <a href={localizePublicHref("/#pricing", locale)} className="public-button tertiary">{ui.pricing}</a> : null}
          </div>
        </Panel>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow={ui.moduleEyebrow} title={ui.moduleTitle} body={ui.moduleBody} />
        <div className="metric-grid">
          {page.modules.map((module) => (
            <MetricCard key={module} label={ui.moduleLabel} value={module} body={ui.moduleCardBody} />
          ))}
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro
          eyebrow={ui.exampleEyebrow}
          title={ui.exampleTitle}
          body={seo.screenshot
            ? [seo.screenshot.evidence, `${ui.captured}: ${capturedAt}.`, seo.screenshot.interfaceNote].filter(Boolean).join(" ")
            : seo.pendingMedia?.body}
        />
        {seo.screenshot ? (
          <Image
            className="feature-product-screenshot"
            src={seo.screenshot.src}
            width={seo.screenshot.width}
            height={seo.screenshot.height}
            alt={seo.screenshot.alt}
            sizes="(max-width: 760px) calc(100vw - 40px), 1100px"
          />
        ) : seo.pendingMedia ? (
          <div className="product-media-placeholder" role="img" aria-label={seo.pendingMedia.ariaLabel}>
            <strong>{seo.pendingMedia.title}</strong>
            <span>{seo.pendingMedia.body}</span>
          </div>
        ) : null}
        <div className="split-layout">
          <Panel className="stack-sm">
            <p className="eyebrow">{ui.input}</p>
            <code className="feature-example-code">{seo.example.input}</code>
            <a className="public-button tertiary" href={localizePublicHref(`/examples/${page.slug}/input`, locale)} download>
              {ui.downloadInput}
            </a>
          </Panel>
          <Panel className="stack-sm">
            <p className="eyebrow">{ui.output}</p>
            <code className="feature-example-code">{seo.example.output}</code>
            <a className="public-button tertiary" href={localizePublicHref(`/examples/${page.slug}/output`, locale)} download>
              {ui.downloadOutput}
            </a>
          </Panel>
        </div>
        <p className="body-copy">{seo.example.notes}</p>
      </section>

      {page.slug === "score-to-audio" ? (
        <FeaturePracticeDemo
          copy={practiceCopy}
          audioSrc={localizePublicHref("/examples/score-to-audio/output?semitones=0", locale)}
          workspaceHref={ctaUrl}
          workspaceAvailable={available}
        />
      ) : null}

      <section className="split-layout">
        <Panel className="stack-lg">
          <SectionIntro eyebrow={ui.workflowEyebrow} title={ui.workflowTitle} body={ui.workflowBody} />
          <div className="workflow-list">
            {page.workflow.map((item, index) => (
              <WorkflowStep key={item.title} step={String(index + 1).padStart(2, "0")} title={item.title} body={item.body} />
            ))}
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro eyebrow={ui.detailEyebrow} title={ui.detailTitle} />
          <div className="list-grid">
            {page.details.map((item) => (
              <div key={item.title} className="list-item">
                <div className="list-item-content">
                  <h3 className="item-title">{item.title}</h3>
                  <p className="item-meta">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow={ui.faqEyebrow} title={ui.faqTitle(page.title)} body={ui.faqBody} />
        <div className="list-grid">
          {faqItems.map((item) => (
            <details key={item.question} className="list-item">
              <summary className="item-title">{item.question}</summary>
              <p className="body-copy">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow={ui.relatedEyebrow} title={ui.relatedTitle} body={ui.relatedBody} />
        <div className="metric-grid">
          {relatedPages.map((relatedPage) => (
            <a key={relatedPage.slug} href={localizePublicHref(relatedPage.canonical, locale)} className="list-item">
              <div className="list-item-content">
                <h3 className="item-title">{relatedPage.title}</h3>
                <p className="item-meta">{relatedPage.description}</p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
