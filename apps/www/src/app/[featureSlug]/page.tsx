import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MetricCard, Panel, PreviewStaffGraphic, SectionIntro, StatusPill, WorkflowStep } from "@score/ui";
import { getFeatureSeoRecord } from "../../lib/feature-seo";
import { getFeaturePageUi, localizeFeatureEvidence, localizeFeaturePage } from "../../lib/feature-page-localization";
import { findPlatformFeaturePage, isFeatureAvailable, isFeatureIndexable, platformFeaturePages } from "../../lib/platform-feature-pages";
import { getAppScoreProjectsUrl, getAppStartConversionUrl, getCheckoutUrl, getSupportUrl, siteConfig } from "../../lib/site";
import { readSiteLocale } from "../../lib/locale";
import { getLocalizedAbsoluteUrl, getLocalizedAlternates, localizePublicHref } from "../../lib/locale-routing";
import { FeaturePracticeDemo } from "../../components/FeaturePracticeDemo";
import { getFeatureAnswerContent, getFeatureAnswerUi } from "../../lib/feature-answer-content";
import { listPdfMusicXmlGuides } from "../../lib/pdf-musicxml-guides";

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
  const socialImage = localizePublicHref(`${page.canonical}/opengraph-image`, locale);

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
      locale: locale === "zh-CN" ? "zh_CN" : "en_US",
      alternateLocale: locale === "zh-CN" ? ["en_US"] : ["zh_CN"],
      type: "website",
      images: [{ url: socialImage, width: 1200, height: 630, alt: page.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${page.title} | ${siteConfig.siteName}`,
      description: page.description,
      images: [socialImage],
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
  const answer = getFeatureAnswerContent(page.slug, locale);
  const answerUi = getFeatureAnswerUi(locale);
  const available = isFeatureAvailable(sourcePage);
  const ctaUrl = actionUrl(sourcePage, locale);
  const sourceSeo = getFeatureSeoRecord(page.slug);
  if (!sourceSeo) {
    notFound();
  }
  const seo = localizeFeatureEvidence(sourceSeo, locale);
  const displayedScreenshot = answer?.screenshot ?? seo.screenshot;
  const pdfGuideCards = ["pdf-to-musicxml", "pdf-score-scanner"].includes(page.slug)
    ? listPdfMusicXmlGuides(locale)
    : [];
  const canonicalUrl = getLocalizedAbsoluteUrl(siteConfig.siteUrl, page.canonical, locale);
  const webPageId = `${canonicalUrl}#webpage`;
  const breadcrumbId = `${canonicalUrl}#breadcrumb`;
  const softwareId = `${canonicalUrl}#software`;
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
      "@type": "WebPage",
      "@id": webPageId,
      url: canonicalUrl,
      name: page.title,
      description: page.description,
      inLanguage: locale,
      dateModified: page.updatedAt,
      author: { "@type": "Organization", name: "ScoreTransposer product team", url: siteConfig.siteUrl },
      reviewedBy: { "@type": "Organization", name: "ScoreTransposer product owner" },
      breadcrumb: { "@id": breadcrumbId },
      mainEntity: { "@id": softwareId },
      keywords: page.keywords.join(", "),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "@id": breadcrumbId,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: ui.home, item: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/", locale) },
        { "@type": "ListItem", position: 2, name: page.title, item: canonicalUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "@id": `${canonicalUrl}#howto`,
      name: page.title,
      description: page.description,
      inLanguage: locale,
      dateModified: page.updatedAt,
      mainEntityOfPage: { "@id": webPageId },
      keywords: page.keywords.join(", "),
      step: page.workflow.map((item, index) => ({ "@type": "HowToStep", position: index + 1, name: item.title, text: item.body })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": `${canonicalUrl}#faq`,
      mainEntityOfPage: { "@id": webPageId },
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "@id": softwareId,
      name: siteConfig.siteName,
      applicationCategory: "MultimediaApplication",
      applicationSubCategory: "Music notation software",
      operatingSystem: "Web browser",
      url: canonicalUrl,
      description: page.description,
      mainEntityOfPage: { "@id": webPageId },
      inLanguage: locale,
      keywords: page.keywords.join(", "),
      featureList: page.modules,
      screenshot: `${siteConfig.siteUrl}${displayedScreenshot.src}`,
    },
  ];

  return (
    <div className={`public-container page-stack${page.slug === "teaching" ? " feature-teaching-page" : ""}${answer ? " feature-answer-page" : ""}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <section className="page-banner split">
        <SectionIntro eyebrow={page.eyebrow} title={page.title} body={page.description} titleAs="h1" largeBody />
        <Panel variant="glass" className={`stack-md${answer ? " feature-hero-product-panel" : ""}`}>
          <StatusPill tone={available ? statusTone(page.status) : "amber"}>{available ? ui.statuses[page.status] : ui.unavailable}</StatusPill>
          {answer ? (
            <figure className="feature-hero-product">
              <Image
                src={displayedScreenshot.src}
                width={displayedScreenshot.width}
                height={displayedScreenshot.height}
                alt={displayedScreenshot.alt}
                sizes="(max-width: 760px) calc(100vw - 40px), 520px"
                priority
              />
              <figcaption>{answer.promise}</figcaption>
            </figure>
          ) : <PreviewStaffGraphic />}
          <p className="body-copy">{page.guardrail}</p>
          <div className="button-row">
            <a href={ctaUrl} className="public-button primary">
              {actionLabel(sourcePage, locale)}
            </a>
            {pdfGuideCards.length ? (
              <a href={localizePublicHref("/#home-workbench", locale)} className="public-button secondary">
                {locale === "zh-CN" ? "查看真实上传工作台" : "See the working uploader"}
              </a>
            ) : null}
            {siteConfig.release.checkoutAvailable ? <a href={localizePublicHref("/pricing", locale)} className="public-button tertiary">{ui.pricing}</a> : null}
          </div>
        </Panel>
      </section>

      {answer ? (
        <section className="surface-panel stack-lg">
          <SectionIntro eyebrow={answerUi.proofEyebrow} title={answerUi.proofTitle} body={answer.promise} />
          <div className="feature-proof-grid">
            <Panel className="stack-sm">
              <p className="eyebrow">{answerUi.before}</p>
              <p className="body-copy">{answer.before}</p>
              <a className="public-button tertiary" href={`/examples/${page.slug}/input`} download>{ui.downloadInput}</a>
            </Panel>
            <Panel className="stack-sm">
              <p className="eyebrow">{answerUi.after}</p>
              <p className="body-copy">{answer.after}</p>
              <a className="public-button tertiary" href={`/examples/${page.slug}/output`} download>{ui.downloadOutput}</a>
            </Panel>
            <Panel variant="glass" className="stack-sm">
              <p className="eyebrow">{answerUi.check}</p>
              <ul className="feature-check-list">
                {answer.checkpoints.map((checkpoint) => <li key={checkpoint}>{checkpoint}</li>)}
              </ul>
            </Panel>
          </div>
          <div className="feature-sample-heading">
            <div>
              <p className="eyebrow">{answerUi.sampleEyebrow}</p>
              <h3>{answerUi.sampleTitle}</h3>
              <p className="body-copy">{answerUi.sampleBody}</p>
            </div>
            <div className="feature-sample-downloads">
              {answerUi.samples.map((sample) => (
                <a key={sample.href} href={sample.href} download className="feature-sample-link">
                  <strong>{sample.label}</strong>
                  <span>{sample.detail}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {pdfGuideCards.length ? (
        <section className="surface-panel stack-lg">
          <SectionIntro
            eyebrow={locale === "zh-CN" ? "PDF 与 MusicXML 专题" : "PDF and MusicXML topic hub"}
            title={locale === "zh-CN" ? "从转换到校正，再到可复核测试" : "From conversion and correction to reproducible evidence"}
            body={locale === "zh-CN"
              ? "六份独立指南覆盖转换流程、格式选择、扫描设置、OMR 校正、MuseScore 导入和透明基准；每一页回答不同问题，避免关键词互相争夺。"
              : "Six distinct guides cover conversion, format choice, scan preparation, OMR correction, MuseScore import, and a transparent benchmark without making the pages compete for one query."}
          />
          <div className="metric-grid">
            {pdfGuideCards.map((guide) => (
              <a key={guide.slug} href={localizePublicHref(`/guides/${guide.slug}`, locale)} className="list-item">
                <div className="list-item-content">
                  <h3 className="item-title">{guide.title}</h3>
                  <p className="item-meta">{guide.description}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow={ui.moduleEyebrow} title={ui.moduleTitle} body={ui.moduleBody} />
        <div className="metric-grid">
          {page.modules.map((module) => (
            <MetricCard key={module} label={ui.moduleLabel} value={module} body={ui.moduleCardBody} />
          ))}
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow={ui.exampleEyebrow} title={ui.exampleTitle} body={`${seo.screenshot.evidence} ${ui.captured} ${seo.screenshot.capturedAt}${locale === "zh-CN" ? "。" : "."}`} />
        <Image
          className="feature-product-screenshot"
          src={displayedScreenshot.src}
          width={displayedScreenshot.width}
          height={displayedScreenshot.height}
          alt={displayedScreenshot.alt}
          sizes="(max-width: 760px) calc(100vw - 40px), 1100px"
        />
        <div className="split-layout">
          <Panel className="stack-sm">
            <p className="eyebrow">{ui.input}</p>
            <code className="feature-example-code">{seo.example.input}</code>
            <a className="public-button tertiary" href={`/examples/${page.slug}/input`} download>
              {ui.downloadInput}
            </a>
          </Panel>
          <Panel className="stack-sm">
            <p className="eyebrow">{ui.output}</p>
            <code className="feature-example-code">{seo.example.output}</code>
            <a className="public-button tertiary" href={`/examples/${page.slug}/output`} download>
              {ui.downloadOutput}
            </a>
          </Panel>
        </div>
        <p className="body-copy">{seo.example.notes}</p>
        {answer?.video ? (
          <div className="stack-md">
            <SectionIntro eyebrow={answerUi.videoEyebrow} title={answerUi.videoTitle} body={answer.video.title} />
            <video className="feature-demo-video" controls preload="metadata" playsInline poster={answer.video.poster} aria-label={answer.video.title}>
              <source src={answer.video.src} type="video/mp4" />
            </video>
          </div>
        ) : null}
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

      {answer ? (
        <>
          <section className="surface-panel stack-lg">
            <SectionIntro eyebrow={answerUi.errorsEyebrow} title={answerUi.errorsTitle} />
            <div className="feature-error-grid">
              {answer.commonErrors.map((error) => (
                <article key={error.title} className="feature-error-card">
                  <h3>{error.title}</h3>
                  <p><strong>{answerUi.symptom}: </strong>{error.symptom}</p>
                  <p><strong>{answerUi.fix}: </strong>{error.fix}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="feature-accuracy-panel stack-lg">
            <SectionIntro eyebrow={answerUi.accuracyEyebrow} title={answerUi.accuracyTitle} body={answer.accuracySummary} />
            <div>
              <h3>{answerUi.accuracyCheck}</h3>
              <ol className="feature-check-list numbered">
                {answer.accuracyChecks.map((item) => <li key={item}>{item}</li>)}
              </ol>
            </div>
          </section>

          <section className="surface-panel stack-lg">
            <SectionIntro eyebrow={answerUi.comparisonEyebrow} title={answerUi.comparisonTitle} body={answerUi.comparisonBody} />
            <div className="feature-comparison-wrap">
              <table className="feature-comparison">
                <thead>
                  <tr><th scope="col">{answerUi.workflow}</th><th scope="col">{answerUi.bestFor}</th><th scope="col">{answerUi.tradeoff}</th></tr>
                </thead>
                <tbody>
                  {answer.comparisonRows.map((row) => (
                    <tr key={row.workflow}><th scope="row">{row.workflow}</th><td>{row.bestFor}</td><td>{row.tradeoff}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow="FAQ" title={ui.faqTitle(page.title)} body={ui.faqBody} />
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

      {answer ? (
        <section className="feature-evidence-meta">
          <p className="eyebrow">{answerUi.evidenceEyebrow}</p>
          <dl>
            <div><dt>{answerUi.author}</dt><dd>{answerUi.authorValue}</dd></div>
            <div><dt>{answerUi.updated}</dt><dd><time dateTime={page.updatedAt}>{page.updatedAt}</time></dd></div>
            <div><dt>{answerUi.factReview}</dt><dd><time dateTime={seo.review.factsReviewedAt ?? undefined}>{seo.review.factsReviewedAt ?? page.updatedAt}</time></dd></div>
            <div className="wide"><dt>{answerUi.basis}</dt><dd>{answerUi.basisValue}</dd></div>
          </dl>
        </section>
      ) : null}
    </div>
  );
}
