import { getLocaleConfig } from "@score/i18n";
import { MetricCard, Panel, SectionIntro, StatusPill, WorkflowStep } from "@score/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { readSiteLocale } from "../../lib/locale";
import { getLocalizedAbsoluteUrl, getLocalizedAlternates, localizePublicHref } from "../../lib/locale-routing";
import { getProductMediaPresentation } from "../../lib/product-media";
import { getStaticMarketingLocalization, getStaticMarketingMedia } from "../../lib/static-marketing-localization";
import { getAppRegisterUrl, getCheckoutUrl, getSafeAppUrl, getSupportUrl, siteConfig } from "../../lib/site";

const canonicalPath = "/about";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();
  const localization = getStaticMarketingLocalization(locale);
  const copy = localization.about;
  const media = getStaticMarketingMedia("about", locale);
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

export default async function AboutPage() {
  const locale = await readSiteLocale();
  const localization = getStaticMarketingLocalization(locale);
  const copy = localization.about;
  const appUrl = getSafeAppUrl("about", locale);
  const registerUrl = getAppRegisterUrl(locale);
  const checkoutUrl = getCheckoutUrl(locale);
  const supportUrl = localizePublicHref(getSupportUrl("general", "about"), locale);
  const operatorLocation = [
    siteConfig.operator.addressLocality,
    siteConfig.operator.addressRegion,
    siteConfig.operator.addressCountry,
    siteConfig.operator.postalCode,
  ].filter(Boolean).join(", ");
  const operatorDetail = [
    siteConfig.operator.registrationIdentifier
      ? `${copy.registrationLabel}: ${siteConfig.operator.registrationIdentifier}`
      : "",
    operatorLocation,
  ].filter(Boolean).join(" · ");
  const pageUrl = getLocalizedAbsoluteUrl(siteConfig.siteUrl, canonicalPath, locale);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: copy.hero.title,
      description: copy.metadata.description,
      url: pageUrl,
      inLanguage: getLocaleConfig(locale).htmlLang,
      publisher: {
        "@type": "Organization",
        name: siteConfig.siteName,
        url: siteConfig.siteUrl,
        email: siteConfig.supportEmail,
      },
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
          <a href={appUrl} className="public-button secondary">{copy.hero.appAction}</a>
          <a href={supportUrl} className="public-button tertiary">{copy.hero.supportAction}</a>
        </div>
      </Panel>

      <section className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro eyebrow={copy.position.eyebrow} title={copy.position.title} body={copy.position.body} />
          <div className="workflow-grid">
            {copy.position.steps.map(([step, title, body]) => (
              <WorkflowStep key={step} step={step} title={title} body={body} />
            ))}
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro eyebrow={copy.audience.eyebrow} title={copy.audience.title} />
          <div className="metric-grid">
            {copy.audience.metrics.map(([label, value, body]) => (
              <MetricCard key={label} label={label} value={value} body={body} />
            ))}
          </div>
        </Panel>
      </section>

      <section className="preview-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro eyebrow={copy.support.eyebrow} title={copy.support.title} body={copy.support.body} />
          <div className="workflow-grid">
            {copy.support.steps.map(([step, title, body]) => (
              <WorkflowStep key={step} step={step} title={title} body={body} />
            ))}
          </div>
          <div className="metric-grid" aria-label={copy.support.operatorAriaLabel}>
            <MetricCard
              label={copy.support.serviceBrandLabel}
              value={siteConfig.siteName}
              body={`${copy.support.canonicalWebsitePrefix}: ${siteConfig.siteUrl}`}
            />
            <MetricCard
              label={copy.support.customerSupportLabel}
              value={siteConfig.supportEmail}
              body={copy.support.customerSupportBody}
            />
            {siteConfig.operator.legalName ? (
              <MetricCard
                label={copy.support.legalOperatorLabel}
                value={siteConfig.operator.legalName}
                body={operatorDetail || copy.support.legalOperatorFallback}
              />
            ) : null}
          </div>
          <div className="button-row">
            <a href={supportUrl} className="public-button secondary">{copy.support.requestAction}</a>
            <Link href={localizePublicHref("/privacy", locale)} className="public-button tertiary">
              {copy.support.privacyAction}
            </Link>
            <Link href={localizePublicHref("/terms", locale)} className="public-button tertiary">
              {copy.support.termsAction}
            </Link>
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro
            eyebrow={copy.commerce.eyebrow}
            title={siteConfig.release.checkoutAvailable ? copy.commerce.availableTitle : copy.commerce.pendingTitle}
          />
          <Panel variant="sunken" className="stack-md">
            <StatusPill tone={siteConfig.release.checkoutAvailable ? "cyan" : "amber"}>
              {siteConfig.release.checkoutAvailable ? copy.commerce.availableStatus : copy.commerce.pendingStatus}
            </StatusPill>
            <p className="body-copy">
              {siteConfig.release.checkoutAvailable ? copy.commerce.availableBody : copy.commerce.pendingBody}
            </p>
          </Panel>
          <Panel variant="sunken" className="stack-md">
            <StatusPill tone="primary">{copy.commerce.mainlandStatus}</StatusPill>
            <p className="body-copy">
              {siteConfig.release.checkoutAvailable
                ? copy.commerce.mainlandAvailableBody
                : copy.commerce.mainlandPendingBody}
            </p>
          </Panel>
          <div className="button-row">
            <a href={registerUrl} className="public-button secondary">{copy.commerce.registerAction}</a>
            {siteConfig.release.checkoutAvailable ? (
              <a href={checkoutUrl} className="public-button primary">{copy.commerce.checkoutAction}</a>
            ) : null}
          </div>
        </Panel>
      </section>

      <section className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro eyebrow={copy.useCases.eyebrow} title={copy.useCases.title} body={copy.useCases.body} />
          <div className="stack-md">
            {copy.useCases.items.map(([title, body]) => (
              <Panel key={title} variant="sunken" className="stack-sm">
                <h3 className="item-title">{title}</h3>
                <p className="body-copy">{body}</p>
              </Panel>
            ))}
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro eyebrow={copy.startingPoints.eyebrow} title={copy.startingPoints.title} />
          <div className="metric-grid">
            {copy.startingPoints.metrics.map(([label, value, body]) => (
              <MetricCard key={label} label={label} value={value} body={body} />
            ))}
          </div>
        </Panel>
      </section>

      <section className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro eyebrow={copy.learnMore.eyebrow} title={copy.learnMore.title} body={copy.learnMore.body} />
          <div className="button-row">
            <Link href={localizePublicHref("/privacy", locale)} className="public-button secondary">
              {copy.learnMore.privacyAction}
            </Link>
            <Link href={localizePublicHref("/terms", locale)} className="public-button tertiary">
              {copy.learnMore.termsAction}
            </Link>
            {siteConfig.release.checkoutAvailable ? (
              <a href={checkoutUrl} className="public-button tertiary">{copy.learnMore.checkoutAction}</a>
            ) : null}
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro eyebrow={copy.next.eyebrow} title={copy.next.title} />
          <p className="body-copy">{copy.next.body}</p>
          <div className="button-row">
            <Link href={localizePublicHref("/", locale)} className="public-button secondary">
              {copy.next.homeAction}
            </Link>
            <a href={appUrl} className="public-button tertiary">{copy.next.appAction}</a>
          </div>
        </Panel>
      </section>
    </section>
  );
}
