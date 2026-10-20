import { getPricingPlanCatalog, getPurchaseOptionsCopy, type CheckoutBillingKind } from "@score/shared";
import { localizeHomepagePlans } from "./homepage-localization";

import { getPurchaseFaqs } from "./pricing-body-copy";

export const frenchPricingFaqs = [
  { question: "Quelle différence entre un achat unique et un abonnement ?", answer: "Converter Pro à vie coûte 99 USD en un seul paiement et offre un accès permanent et illimité. Les achats à durée fixe couvrent un mois ou un an sans renouvellement automatique. Les abonnements se renouvellent jusqu’à résiliation." },
  { question: "Les crédits annuels sont-ils disponibles en une seule fois ?", answer: "Starter comprend 50 crédits par mois, y compris avec un accès annuel. Converter Pro mensuel comprend 200 crédits par mois. Ces crédits sont réinitialisés chaque mois sans report. Converter Pro à vie offre une utilisation illimitée, sans expiration ni quota mensuel de crédits." },
  { question: "Dans quelle devise vais-je payer ?", answer: "Les prix sont indiqués en dollars américains ($US). Le montant final et les éventuelles taxes sont affichés sur la page de paiement avant confirmation. Votre banque peut appliquer un taux de change ou des frais si votre compte utilise une autre devise." },
  { question: "Que se passe-t-il à la fin de mon accès ?", answer: "L’accès à vie n’expire pas et ne se renouvelle pas. Les achats à durée fixe expirent sans nouveau prélèvement ; un nouvel achat du même niveau prolonge l’accès. Vous pouvez annuler les renouvellements d’abonnement dans Facturation. Les conditions de remboursement et d’utilisation restent applicables." },
  { question: "Comment demander de l’aide ou un remboursement ?", answer: "Contactez l’assistance avec la référence de votre commande. Les demandes sont examinées selon les conditions d’achat et les règles applicables. Si vous avez déjà payé et que l’accès manque, ne payez pas une seconde fois." },
  ...getPurchaseFaqs("fr"),
] as const;

export function getFrenchPricingPlans(kind: CheckoutBillingKind) {
  const purchase = getPurchaseOptionsCopy("fr");
  return localizeHomepagePlans("fr", getPricingPlanCatalog("en"))
    .filter(plan => plan.code !== "free")
    .map(plan => {
      if (kind === "subscription" || plan.code === "converter-pro-annual") return plan;
      const duration = plan.code.endsWith("-annual") ? purchase.year : purchase.month;
      return {
        ...plan,
        cycle: duration,
        badge: purchase.oneTime,
        cta: purchase.buyTemplate.replace("{name}", plan.name).replace("{duration}", duration),
        resources: [...plan.resources.filter(resource => !/renouvellement|douze mensualités/iu.test(resource)), purchase.oneTimeNote],
      };
    });
}
