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
import { FrenchPricingPage } from "../../components/FrenchPricingPage";
import { LocalizedPricingPage } from "../../components/LocalizedPricingPage";
import { PricingOffers } from "../../components/PricingOffers";
import { teachingFaq } from "../../lib/feature-localization/teaching-faq";
import { getEnEsFeatureFaq } from "../../lib/feature-localization/en-es-faq";
import { getFeatureOnPageContent } from "../../lib/feature-on-page";

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
  if (featureSlug === "pricing" && locale === "fr") return <FrenchPricingPage />;
  if (featureSlug === "pricing" && (locale === "en" || locale === "es" || locale === "de" || locale === "ru")) return <LocalizedPricingPage locale={locale} />;
  const page = localizeFeaturePage(sourcePage, locale);
  const onPage = getFeatureOnPageContent(page.slug, locale);
  const heading = onPage?.h1 ?? page.title;
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
  const faqItems = onPage?.faq ?? (locale === "en" || locale === "es" ? getEnEsFeatureFaq(page, locale, available) : page.slug === "teaching" && (locale === "de" || locale === "ru") ? teachingFaq[locale] : [
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
  ]);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      inLanguage: htmlLang,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: ui.home, item: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/", locale) },
        { "@type": "ListItem", position: 2, name: heading, item: canonicalUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: onPage?.workflowTitle ?? page.title,
      description: page.description,
      inLanguage: htmlLang,
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
      featureList: page.modules,
      ...(seo.screenshot ? { screenshot: `${siteConfig.siteUrl}${seo.screenshot.src}` } : {}),
    },
  ];

  if (featureSlug === "pricing") return <div className="public-container page-stack french-pricing-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData.filter(item => item["@type"] !== "HowTo")).replaceAll("<", "\\u003c") }} />
    <PricingOffers locale={locale} />
    <Panel className="stack-md"><p className="body-copy">{page.guardrail}</p>{page.details.map(item => <div key={item.title}><h2 className="section-title">{item.title}</h2><p className="body-copy">{item.body}</p></div>)}</Panel>
    <section className="surface-panel stack-lg">{faqItems.map(item => <details key={item.question} className="list-item"><summary className="item-title">{item.question}</summary><p className="body-copy">{item.answer}</p></details>)}</section>
  </div>;

  return (
    <div className={`public-container page-stack${page.slug === "teaching" ? " feature-teaching-page" : ""}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }}
      />
      <nav aria-label={locale === "en" ? "Breadcrumb" : ui.home} className="body-copy">
        <a href={localizePublicHref("/", locale)}>{ui.home}</a> / <span aria-current="page">{heading}</span>
      </nav>
      <section className="page-banner split">
        <SectionIntro eyebrow={page.eyebrow} title={heading} body={onPage?.intro ?? page.description} titleAs="h1" largeBody />
        <Panel variant="glass" className="stack-md">
          <StatusPill tone={available ? statusTone(page.status) : "amber"}>{available ? ui.statuses[page.status] : ui.unavailable}</StatusPill>
          <PreviewStaffGraphic />
          <p className="body-copy">{page.guardrail}</p>
          <div className="button-row">
            <a href={ctaUrl} className="public-button primary">
              {actionLabel(sourcePage, locale)}
            </a>
            {siteConfig.release.checkoutAvailable ? <a href={localizePublicHref(locale === "fr" ? "/pricing" : "/#pricing", locale)} className="public-button tertiary">{ui.pricing}</a> : null}
          </div>
        </Panel>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow={ui.moduleEyebrow} title={onPage?.moduleTitle ?? ui.moduleTitle} body={onPage ? undefined : ui.moduleBody} />
        <div className="metric-grid">
          {page.modules.map((module, index) => (
            <MetricCard key={module} label={ui.moduleLabel} value={module} body={onPage?.moduleDescriptions[index] ?? ui.moduleCardBody} />
          ))}
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro
          eyebrow={ui.exampleEyebrow}
          title={ui.exampleTitle}
          body={seo.screenshot
            ? [seo.screenshot.evidence, `${ui.captured}: ${capturedAt}${capturedAt?.endsWith(".") ? "" : "."}`, seo.screenshot.interfaceNote].filter(Boolean).join(" ")
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
          <SectionIntro eyebrow={ui.workflowEyebrow} title={onPage?.workflowTitle ?? ui.workflowTitle} body={onPage ? undefined : ui.workflowBody} />
          <div className="workflow-list">
            {page.workflow.map((item, index) => (
              <WorkflowStep key={item.title} step={String(index + 1).padStart(2, "0")} title={item.title} body={item.body} />
            ))}
          </div>
          {onPage?.nextSteps ? <p className="body-copy">
            {onPage.nextSteps.map((part, index) => part.href
              ? <a key={index} href={localizePublicHref(part.href, locale)}>{part.text}</a>
              : <span key={index}>{part.text}</span>)}
          </p> : null}
        </Panel>

        <Panel variant="glass" className="stack-lg">
          {onPage ? <p className="eyebrow">{ui.detailEyebrow}</p> : <SectionIntro eyebrow={ui.detailEyebrow} title={ui.detailTitle} />}
          <div className="list-grid">
            {page.details.map((item) => (
              <div key={item.title} className="list-item">
                <div className="list-item-content">
                  {onPage && page.slug !== "staff-to-jianpu"
                    ? <h2 className="item-title">{item.title}</h2>
                    : <h3 className="item-title">{item.title}</h3>}
                  <p className="item-meta">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow={ui.faqEyebrow} title={onPage?.faqTitle ?? ui.faqTitle(heading)} body={ui.faqBody} />
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
