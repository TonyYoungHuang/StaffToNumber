import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { APP_ROUTES } from "@score/shared";
import { MetricCard, Panel, PreviewStaffGraphic, SectionIntro, StatusPill, WorkflowStep } from "@score/ui";
import { getFeatureSeoRecord } from "../../lib/feature-seo";
import { findPlatformFeaturePage, isFeatureAvailable, isFeatureIndexable, platformFeaturePages } from "../../lib/platform-feature-pages";
import { getAppHomeUrl, getAppStartConversionUrl, getCheckoutUrl, getSupportUrl, siteConfig } from "../../lib/site";
import { readSiteLocale } from "../../lib/locale";
import { FeaturePracticeDemo } from "../../components/FeaturePracticeDemo";

type FeatureRouteParams = {
  featureSlug: string;
};

function appScoresUrl() {
  return new URL(APP_ROUTES.scores, `${getAppHomeUrl().replace(/\/$/, "")}/`).toString();
}

function actionUrl(page: NonNullable<ReturnType<typeof findPlatformFeaturePage>>, locale: Awaited<ReturnType<typeof readSiteLocale>>) {
  if (!isFeatureAvailable(page)) {
    return getSupportUrl("general", `${page.slug}-release-status`);
  }

  const action = page.primaryAction;
  if (action === "upload") {
    return getAppStartConversionUrl();
  }

  if (action === "checkout") {
    return getCheckoutUrl(locale);
  }

  return appScoresUrl();
}

function actionLabel(page: NonNullable<ReturnType<typeof findPlatformFeaturePage>>) {
  if (!isFeatureAvailable(page)) {
    return "Check release availability";
  }

  const action = page.primaryAction;
  if (action === "upload") {
    return "Scan one page free";
  }

  if (action === "checkout") {
    return "View access options";
  }

  return "Open score projects";
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
  const page = findPlatformFeaturePage(featureSlug);

  if (!page) {
    return {};
  }

  return {
    title: `${page.title} | ${siteConfig.siteName}`,
    description: page.description,
    keywords: page.keywords,
    alternates: {
      canonical: page.canonical,
    },
    robots: {
      index: isFeatureIndexable(page),
      follow: isFeatureIndexable(page),
    },
    openGraph: {
      title: `${page.title} | ${siteConfig.siteName}`,
      description: page.description,
      url: `${siteConfig.siteUrl}${page.canonical}`,
      siteName: siteConfig.siteName,
      type: "website",
      images: [{ url: `${page.canonical}/opengraph-image`, width: 1200, height: 630, alt: page.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${page.title} | ${siteConfig.siteName}`,
      description: page.description,
      images: [`${page.canonical}/opengraph-image`],
    },
  };
}

export default async function PlatformFeaturePage({ params }: { params: Promise<FeatureRouteParams> }) {
  const { featureSlug } = await params;
  const page = findPlatformFeaturePage(featureSlug);

  if (!page) {
    notFound();
  }

  const locale = await readSiteLocale();
  const available = isFeatureAvailable(page);
  const ctaUrl = actionUrl(page, locale);
  const seo = getFeatureSeoRecord(page.slug);
  if (!seo) {
    notFound();
  }
  const relatedPages = seo.relatedSlugs
    .map((slug) => findPlatformFeaturePage(slug))
    .filter((relatedPage): relatedPage is NonNullable<typeof relatedPage> => Boolean(relatedPage && isFeatureAvailable(relatedPage)));
  const faqItems = [
    {
      question: `What input does ${page.title} accept?`,
      answer: page.workflow[0]?.body ?? page.description,
    },
    {
      question: "Can I edit the result after conversion?",
      answer: "Yes. Successful imports become Score JSON revisions that can be corrected, transposed, played, and exported from the score workspace.",
    },
    {
      question: "What should I check before relying on the result?",
      answer: page.guardrail,
    },
  ];
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.siteUrl },
        { "@type": "ListItem", position: 2, name: page.title, item: `${siteConfig.siteUrl}${page.canonical}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: page.title,
      description: page.description,
      step: page.workflow.map((item, index) => ({ "@type": "HowToStep", position: index + 1, name: item.title, text: item.body })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
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
      applicationSubCategory: "Music notation software",
      operatingSystem: "Web browser",
      url: `${siteConfig.siteUrl}${page.canonical}`,
      description: page.description,
      featureList: page.modules,
      screenshot: `${siteConfig.siteUrl}${seo.screenshot.src}`,
      offers: {
        "@type": "Offer",
        priceCurrency: siteConfig.priceCurrency,
        ...(siteConfig.priceAmount ? { price: siteConfig.priceAmount } : {}),
        url: `${siteConfig.siteUrl}/pricing`,
      },
    },
  ];

  return (
    <div className="public-container page-stack">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <section className="page-banner split">
        <SectionIntro eyebrow={page.eyebrow} title={page.title} body={page.description} titleAs="h1" largeBody />
        <Panel variant="glass" className="stack-md">
          <StatusPill tone={available ? statusTone(page.status) : "amber"}>{available ? page.status : "Pending production verification"}</StatusPill>
          <PreviewStaffGraphic />
          <p className="body-copy">{page.guardrail}</p>
          <div className="button-row">
            <a href={ctaUrl} className="public-button primary">
              {actionLabel(page)}
            </a>
            {siteConfig.release.checkoutAvailable ? <a href="/pricing" className="public-button tertiary">Pricing</a> : null}
          </div>
        </Panel>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow="Platform modules" title="Built on MusicXML and Score JSON" body="Each feature page maps back to the same score project model rather than a separate one-off converter." />
        <div className="metric-grid">
          {page.modules.map((module) => (
            <MetricCard key={module} label="Module" value={module} body="Connected to the score project workflow." />
          ))}
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow="Real product example" title="One score, structured input and reusable output" body={`${seo.screenshot.evidence} Captured ${seo.screenshot.capturedAt}.`} />
        <Image
          className="feature-product-screenshot"
          src={seo.screenshot.src}
          width={seo.screenshot.width}
          height={seo.screenshot.height}
          alt={seo.screenshot.alt}
          sizes="(max-width: 760px) calc(100vw - 40px), 1100px"
        />
        <div className="split-layout">
          <Panel className="stack-sm">
            <p className="eyebrow">Input</p>
            <code className="feature-example-code">{seo.example.input}</code>
            <a className="public-button tertiary" href={`/examples/${page.slug}/input`} download>
              Download input case
            </a>
          </Panel>
          <Panel className="stack-sm">
            <p className="eyebrow">Output</p>
            <code className="feature-example-code">{seo.example.output}</code>
            <a className="public-button tertiary" href={`/examples/${page.slug}/output`} download>
              Download output case
            </a>
          </Panel>
        </div>
        <p className="body-copy">{seo.example.notes}</p>
      </section>

      {page.slug === "score-to-audio" ? (
        <FeaturePracticeDemo
          locale={locale}
          workspaceHref={ctaUrl}
          workspaceAvailable={available}
        />
      ) : null}

      <section className="split-layout">
        <Panel className="stack-lg">
          <SectionIntro eyebrow="Workflow" title="How this path works" body="The public page leads into the authenticated app workflow when users are ready to process a score." />
          <div className="workflow-list">
            {page.workflow.map((item, index) => (
              <WorkflowStep key={item.title} step={String(index + 1).padStart(2, "0")} title={item.title} body={item.body} />
            ))}
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro eyebrow="Product detail" title="What to expect" />
          <div className="list-grid">
            {page.details.map((item) => (
              <div key={item.title} className="list-item">
                <div className="list-item-content">
                  <p className="item-title">{item.title}</p>
                  <p className="item-meta">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow="FAQ" title={`Questions about ${page.title}`} body="Practical limits and expected workflow for this score tool." />
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
        <SectionIntro eyebrow="Related workflows" title="Continue with the same score project" body="These pages use the same MusicXML and Score JSON source instead of sending the score through disconnected converters." />
        <div className="metric-grid">
          {relatedPages.map((relatedPage) => (
            <a key={relatedPage.slug} href={relatedPage.canonical} className="list-item">
              <div className="list-item-content">
                <p className="item-title">{relatedPage.title}</p>
                <p className="item-meta">{relatedPage.description}</p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
