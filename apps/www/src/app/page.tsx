import Image from "next/image";
import Link from "next/link";
import { getLocaleConfig } from "@score/i18n";
import { getPricingPlanCatalog } from "@score/shared";
import { ArrowNorthEastIcon, CheckSealIcon, CreditPlanCard, CreditPlanGrid, FileStackIcon, SparkIcon } from "@score/ui";
import { HomeHeroWorkbench } from "../components/HomeHeroWorkbench";
import {
  getHomepageLocalization,
  localizeHomepagePlans,
} from "../lib/homepage-localization/index";
import { readSiteLocale } from "../lib/locale";
import { getLocalizedAbsoluteUrl, localizePublicHref } from "../lib/locale-routing";
import {
  getHomepageCaseProductMedia,
  getHomepageDemoProductMedia,
  getPendingProductMediaPresentation,
  getProductMediaPresentation,
} from "../lib/product-media";
import { getAppStartConversionUrl, getCheckoutUrl, siteConfig } from "../lib/site";
import styles from "./home-page.module.css";

const caseImages = [
  { slug: "pdf-score-scanner" },
  { slug: "transpose-score" },
  { slug: "score-to-audio" },
] as const;

const featureDemos = [
  { slug: "score-editor" },
  { slug: "transpose-score" },
  { slug: "staff-to-jianpu" },
  { slug: "score-to-audio" },
] as const;

const capabilityScoreSamples = [
  { image: "/product/score-samples/mozart-k265.webp" },
  { image: "/product/score-samples/pachelbel-canon.webp" },
  { image: "/product/score-samples/chopin-op9-2.webp" },
  { image: "/product/score-samples/bach-bwv846.webp" },
  { image: "/product/score-samples/beethoven-appassionata.webp" },
] as const;

export default async function HomePage() {
  const locale = await readSiteLocale();
  const localization = getHomepageLocalization(locale);
  const copy = localization.page;
  const mediaCopy = localization.media;
  const startUrl = localizePublicHref(getAppStartConversionUrl(locale), locale);
  const plans = localizeHomepagePlans(locale, getPricingPlanCatalog("en"));
  const usesCjkLayout = locale === "zh-CN" || locale === "zh-TW" || locale === "ja" || locale === "ko";
  const usesSingleLineDesktopHero = locale === "ja" || locale === "ko" || locale === "fr" || locale === "de";

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.siteName,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    url: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/", locale),
    inLanguage: getLocaleConfig(locale).htmlLang,
    description: copy.schemaDescription,
    featureList: copy.capabilities.map(([title]) => title),
  };

  return (
    <div className={`${styles.page} ${usesCjkLayout ? "" : styles.pageEnglish} ${usesSingleLineDesktopHero ? styles.pageWideHero : ""}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema).replaceAll("<", "\\u003c") }}
      />

      <section className={`${styles.section} ${styles.hero}`} aria-labelledby="home-title">
        <div className={styles.heroGlowOne} /><div className={styles.heroGlowTwo} />
        <div className={`${styles.container} ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}><SparkIcon width={16} height={16} />{copy.heroKicker}</p>
            <h1
              id="home-title"
              className={`${usesCjkLayout ? "" : styles.heroTitleEnglish} ${usesSingleLineDesktopHero ? styles.heroTitleWide : ""}`.trim() || undefined}
            >
              {copy.heroTitle.map((line) => <span className={styles.heroTitleLine} key={line}>{line}</span>)}
            </h1>
          </div>
          <HomeHeroWorkbench
            locale={locale}
            copy={localization.workbench}
            startUrl={startUrl}
            audioAvailable={siteConfig.release.audioTranscriptionAvailable}
          />
        </div>
        <div className={`${styles.container} ${styles.factBar}`}>{copy.facts.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      </section>

      <section id="demos" className={`${styles.section} ${styles.demoSection}`} aria-labelledby="demos-title">
        <div className={styles.container}>
          <div className={styles.demoHeading}>
            <div><p className={styles.kicker}>{copy.demosKicker}</p><h2 id="demos-title">{copy.demosTitle}</h2></div>
            <p>{copy.demosBody}</p>
          </div>
          <div className={styles.demoGrid}>
            {copy.demos.map(([title, body], index) => {
              const demo = featureDemos[index];
              const media = getHomepageDemoProductMedia(demo.slug, locale);
              const mediaPresentation = media ? getProductMediaPresentation(locale, media.sourceLocale, title) : null;
              const pendingPresentation = media ? null : getPendingProductMediaPresentation(locale, title);
              return (
                <article key={title} className={styles.demoCard}>
                  <div className={styles.demoMedia}>
                    {media ? (
                      <>
                        <video
                          src={media.video.src}
                          poster={media.poster.src}
                          controls
                          muted
                          playsInline
                          preload="none"
                          aria-label={mediaPresentation?.alt}
                        />
                        <span className={styles.demoProof}>{copy.demosProof}</span>
                      </>
                    ) : (
                      <div className={styles.mediaPlaceholder} role="img" aria-label={pendingPresentation?.ariaLabel}>
                        <strong>{pendingPresentation?.title}</strong>
                        <span>{pendingPresentation?.body}</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.demoCopy}>
                    <strong>{title}</strong><small>{body}</small>
                    <Link href={localizePublicHref(`/${demo.slug}`, locale)}>{copy.demosAction}<ArrowNorthEastIcon width={14} height={14} /></Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="workflow" className={`${styles.section} ${styles.softSection}`} aria-labelledby="workflow-title">
        <div className={styles.container}>
          <header className={styles.sectionHeading}><p className={styles.kicker}>{copy.stepsKicker}</p><h2 id="workflow-title">{copy.stepsTitle}</h2></header>
          <ol className={styles.stepsGrid}>{copy.steps.map(([title, body], index) => <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{body}</p></li>)}</ol>
        </div>
      </section>

      <section id="cases" className={styles.section} aria-labelledby="cases-title">
        <div className={styles.container}>
          <header className={styles.sectionHeading}><p className={styles.kicker}>{copy.casesKicker}</p><h2 id="cases-title">{copy.casesTitle}</h2><p>{copy.casesBody}</p></header>
          <div className={styles.caseGrid}>
            {copy.cases.map(([eyebrow, title, body], index) => {
              const item = caseImages[index];
              const media = getHomepageCaseProductMedia(item.slug, locale);
              const mediaPresentation = media ? getProductMediaPresentation(locale, media.sourceLocale, title) : null;
              const pendingPresentation = media ? null : getPendingProductMediaPresentation(locale, title);
              return (
                <article key={eyebrow} className={styles.caseCard}>
                  <Link href={localizePublicHref(`/${item.slug}`, locale)} className={styles.caseMedia}>
                    {media ? (
                      <Image src={media.src} alt={mediaPresentation?.alt ?? title} width={media.width} height={media.height} sizes="(max-width: 820px) 92vw, 31vw" />
                    ) : (
                      <div className={styles.mediaPlaceholder} role="img" aria-label={pendingPresentation?.ariaLabel}>
                        <strong>{pendingPresentation?.title}</strong>
                        <span>{pendingPresentation?.body}</span>
                      </div>
                    )}
                  </Link>
                  <div className={styles.caseBody}><span>{eyebrow}</span><h3>{title}</h3><p>{body}</p><Link href={localizePublicHref(`/${item.slug}`, locale)}>{copy.caseAction} →</Link></div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.engineSection}`} aria-labelledby="engine-title">
        <div className={styles.container}>
          <header className={styles.sectionHeading}><p className={styles.kicker}>{copy.engineKicker}</p><h2 id="engine-title">{copy.engineTitle}</h2><p>{copy.engineBody}</p></header>
          <div className={styles.pipeline}>{copy.pipeline.map(([label, value], index) => <div key={label} className={index === copy.pipeline.length - 1 ? styles.pipelineCore : undefined}><small>{label}</small><strong>{value}</strong>{index < copy.pipeline.length - 1 ? <i aria-hidden="true">→</i> : null}</div>)}</div>
          <div className={styles.capabilityGrid}>
            {copy.capabilities.map(([title, body, href], index) => {
              const sample = capabilityScoreSamples[index];
              const [sampleTitle, sampleAlt] = mediaCopy.scoreSamples[index];
              return (
                <Link href={localizePublicHref(href, locale)} key={title}>
                  <div className={styles.capabilitySample}>
                    <Image src={sample.image} alt={sampleAlt} width={1200} height={720} sizes="(max-width: 560px) 92vw, (max-width: 820px) 46vw, (max-width: 1100px) 31vw, 19vw" />
                    <span>{copy.capabilityProof} · {sampleTitle}</span>
                  </div>
                  <div className={styles.capabilityCopy}><strong>{title}</strong><span>{body}</span></div>
                  <ArrowNorthEastIcon width={15} height={15} />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.softSection}`} aria-labelledby="trust-title">
        <div className={`${styles.container} ${styles.trustLayout} ${usesCjkLayout ? "" : styles.trustLayoutEnglish}`}>
          <div className={`${styles.trustHeading} ${usesCjkLayout ? "" : styles.trustHeadingEnglish}`}><span><FileStackIcon width={26} height={26} /></span><p className={styles.kicker}>{copy.trustKicker}</p><h2 id="trust-title">{copy.trustTitle}</h2></div>
          <div className={styles.trustGrid}>{copy.trust.map(([title, body]) => <article key={title}><CheckSealIcon width={20} height={20} /><div><h3>{title}</h3><p>{body}</p></div></article>)}</div>
        </div>
      </section>

      <section id="pricing" className={styles.section} aria-labelledby="pricing-title">
        <div className={`${styles.container} ${styles.pricingContainer}`}>
          <header className={styles.pricingHeader}>
            <div><p className={styles.kicker}>{copy.pricingKicker}</p><h2 id="pricing-title">{copy.pricingTitle}</h2><p>{copy.pricingBody}</p></div>
            <div className={styles.pricingSavings}><span>{copy.pricingPromoLabel}</span><strong>{copy.pricingPromoValue}</strong></div>
          </header>
          <CreditPlanGrid label={copy.creditPlanGridLabel}>
            {plans.map((plan) => (
              <CreditPlanCard key={plan.code} plan={plan} labels={copy.creditPlanCardLabels} selected={plan.featured} actionHref={plan.code === "free" ? startUrl : getCheckoutUrl(locale, plan.code)} headingLevel={3} />
            ))}
          </CreditPlanGrid>
          <div className={styles.creditRules}>
            <div><p className={styles.kicker}>{copy.creditRulesKicker}</p><h3>{copy.creditRulesTitle}</h3><p>{copy.creditRulesBody}</p></div>
            <div>{copy.creditRules.map(([amount, title, body]) => <article key={title}><strong>{amount}</strong><span>{title}</span><p>{body}</p></article>)}</div>
          </div>
          <p className={styles.priceNote}>{copy.priceNote}</p>
        </div>
      </section>

      <section id="faq" className={`${styles.section} ${styles.faqSection}`} aria-labelledby="faq-title">
        <div className={`${styles.container} ${styles.faqLayout}`}><header className={styles.faqHeading}><p className={styles.kicker}>{copy.faqKicker}</p><h2 id="faq-title">{copy.faqTitle}</h2></header><div className={styles.faqList}>{copy.faqs.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></div>
      </section>

      <section className={styles.finalSection}><div className={`${styles.container} ${styles.finalCard}`}><div><span>{copy.finalKicker}</span><h2>{copy.finalTitle}</h2></div><a href="#home-workbench">{copy.finalAction}<ArrowNorthEastIcon width={18} height={18} /></a></div></section>
    </div>
  );
}
