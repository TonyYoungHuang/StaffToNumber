import { Panel } from "@score/ui";
import { PricingOffers } from "./PricingOffers";
import { pricingCopy } from "../lib/localized-pricing";
import { getAppStartConversionUrl, siteConfig } from "../lib/site";
import { getLocalizedAbsoluteUrl, localizePublicHref } from "../lib/locale-routing";

export function LocalizedPricingPage({ locale }: { locale: keyof typeof pricingCopy }) {
  const copy = pricingCopy[locale];
  const url = getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/pricing", locale);
  const structuredData = [
    { "@context": "https://schema.org", "@type": "WebPage", name: copy.title, description: copy.description, url, inLanguage: locale },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: copy.home, item: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/", locale) },
      { "@type": "ListItem", position: 2, name: copy.pricing, item: url },
    ] },
    { "@context": "https://schema.org", "@type": "FAQPage", inLanguage: locale, mainEntity: copy.faqs.map(item => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) },
  ];
  return <div className="public-container page-stack french-pricing-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }} />
    <PricingOffers locale={locale} title={copy.title} description={copy.description} />
    <Panel className="stack-md"><h2 className="section-title">{copy.freeTitle}</h2><p className="body-copy">{copy.freeBody}</p><a className="public-button secondary" href={getAppStartConversionUrl(locale)}>{copy.freeAction}</a></Panel>
    <Panel className="stack-md"><h2 className="section-title">{copy.creditTitle}</h2><p className="body-copy">{copy.creditBody}</p><p className="body-copy">{copy.review}</p></Panel>
    <section className="surface-panel stack-lg"><h2 className="section-title">{copy.faqTitle}</h2>
      {copy.faqs.map(item => <details key={item.question} className="list-item"><summary className="item-title">{item.question}</summary><p className="body-copy">{item.answer}</p></details>)}
      <div className="button-row"><a className="public-button secondary" href={localizePublicHref("/terms", locale)}>{copy.terms}</a><a className="public-button tertiary" href={localizePublicHref("/support?category=payment", locale)}>{copy.support}</a></div>
    </section>
  </div>;
}
