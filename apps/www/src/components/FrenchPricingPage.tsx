import { Panel } from "@score/ui";
import { PricingCreditGuide } from "./PricingCreditGuide";
import { PricingOffers } from "./PricingOffers";
import { PricingDetails } from "./PricingDetails";
import { frenchPricingFaqs } from "../lib/french-pricing";
import { getAppStartConversionUrl, siteConfig } from "../lib/site";
import { getLocalizedAbsoluteUrl } from "../lib/locale-routing";

export function FrenchPricingPage() {
  const url = getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/pricing", "fr");
  const structuredData = [
    { "@context": "https://schema.org", "@type": "WebPage", name: "Tarifs : abonnement ou achat unique", url, inLanguage: "fr" },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/", "fr") },
      { "@type": "ListItem", position: 2, name: "Tarifs", item: url },
    ] },
    { "@context": "https://schema.org", "@type": "FAQPage", inLanguage: "fr", mainEntity: frenchPricingFaqs.map(item => ({
      "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer },
    })) },
  ];
  return <div className="public-container page-stack french-pricing-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }} />
    <PricingOffers locale="fr" title="Abonnement ou achat unique : choisissez votre accès" />
    <PricingDetails locale="fr">
    <Panel className="stack-md">
      <h2 className="section-title">Commencez gratuitement, sans carte bancaire</h2>
      <p className="body-copy">1 reconnaissance simple gratuite à vie, en traitement standard : généralement une photo ou un PDF A4/Letter d’environ 1–5 pages, sous réserve de vérification. La formule gratuite ne fournit aucun crédit mensuel ; le scan gratuit ne demande aucun solde. Sur cette partition, la modification, la transposition, la lecture, le choix des résultats, le titre et le partage sont gratuits, ainsi que les exports Jianpu et fichier de partition modifiable. Les exports PDF, MusicXML, MIDI, SVG, PNG, WAV et MP3, une autre partition, la reconnaissance complexe, les fichiers volumineux et l’extraction de parties nécessitent un pass une partition à 2,99 USD ou Starter dès 7,99 USD/mois.</p>
      <div className="button-row"><a className="public-button secondary" href={getAppStartConversionUrl("fr")}>Créer ma partition gratuite</a></div>
    </Panel>
    <PricingCreditGuide locale="fr" />
    <section className="surface-panel stack-lg"><h2 className="section-title">Questions sur l’achat et l’accès</h2>
      {frenchPricingFaqs.map(item => <details key={item.question} className="list-item"><summary className="item-title">{item.question}</summary><p className="body-copy">{item.answer}</p></details>)}
      <div className="button-row"><a className="public-button secondary" href="/fr/terms">Conditions d’utilisation</a><a className="public-button tertiary" href="/fr/support?category=payment">Contacter l’assistance</a></div>
    </section>
    </PricingDetails>
  </div>;
}
