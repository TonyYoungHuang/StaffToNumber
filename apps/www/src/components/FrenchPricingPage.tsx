import { Panel } from "@score/ui";
import { PricingOffers } from "./PricingOffers";
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
    <PricingOffers locale="fr" title="Abonnement ou achat unique : choisissez votre accès" description="Un projet gratuit pour commencer, puis Starter ou Converter Pro pour traiter davantage de partitions. Tous les prix ci-dessous sont en dollars américains ($US)." />
    <Panel className="stack-md">
      <h2 className="section-title">Commencez gratuitement, sans carte bancaire</h2>
      <p className="body-copy">Le compte gratuit inclut un seul projet de numérisation gratuit à vie, 25 crédits par mois pour les exports et les outils, ainsi que 50 Mo de stockage. Numérisez un PDF multipage complet ou une image de partition ; pour numériser une nouvelle partition, il vous faut un Pass une partition (One Score Pass) ou une offre.</p>
      <div className="button-row"><a className="public-button secondary" href={getAppStartConversionUrl("fr")}>Créer ma partition gratuite</a></div>
    </Panel>
    <Panel className="stack-md"><h2 className="section-title">Comment les crédits sont-ils utilisés ?</h2>
      <p className="body-copy">Les crédits sont réservés à la création de la tâche ; ils sont automatiquement restitués en cas d’échec ou d’annulation. La lecture et les modifications de base n’en consomment pas. Les crédits mensuels se réinitialisent chaque mois et ne se reportent pas au mois suivant.</p>
      <p className="body-copy">Les sorties issues de la reconnaissance doivent être vérifiées : la qualité du scan et la complexité de la partition peuvent nécessiter des corrections.</p>
    </Panel>
    <section className="surface-panel stack-lg"><h2 className="section-title">Questions sur l’achat et l’accès</h2>
      {frenchPricingFaqs.map(item => <details key={item.question} className="list-item"><summary className="item-title">{item.question}</summary><p className="body-copy">{item.answer}</p></details>)}
      <div className="button-row"><a className="public-button secondary" href="/fr/terms">Conditions d’utilisation</a><a className="public-button tertiary" href="/fr/support?category=payment">Contacter l’assistance</a></div>
    </section>
  </div>;
}
