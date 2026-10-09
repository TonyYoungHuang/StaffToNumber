import { getPricingPlanCatalog, getPurchaseOptionsCopy, type CheckoutBillingKind } from "@score/shared";
import { localizeHomepagePlans } from "./homepage-localization";

export const frenchPricingFaqs = [
  { question: "Quelle différence entre un achat unique et un abonnement ?", answer: "Un achat unique donne accès à la formule pendant un mois ou un an, sans renouvellement automatique. Un abonnement se renouvelle à la fin de chaque période tant que vous ne l’avez pas résilié. Les outils et les quotas de la formule choisie sont les mêmes." },
  { question: "Les crédits annuels sont-ils disponibles en une seule fois ?", answer: "Non. Starter comprend 50 crédits par mois et Converter Pro 200 crédits par mois, même pour un accès d’un an. Les crédits sont réinitialisés chaque mois ; les crédits inutilisés ne sont pas reportés." },
  { question: "Dans quelle devise vais-je payer ?", answer: "Les prix sont indiqués en dollars américains ($US). Le montant final et les éventuelles taxes sont affichés sur la page de paiement avant confirmation. Votre banque peut appliquer un taux de change ou des frais si votre compte utilise une autre devise." },
  { question: "Que se passe-t-il à la fin de mon accès ?", answer: "Un achat unique expire sans nouveau prélèvement. Un nouvel achat de la même formule prolonge l’accès. Pour un abonnement, vous pouvez arrêter les prochains renouvellements depuis Facturation ; l’accès reste actif jusqu’à la fin de la période payée, sauf remboursement ou autre restriction prévue dans les conditions." },
  { question: "Comment demander de l’aide ou un remboursement ?", answer: "Contactez l’assistance avec la référence de votre commande. Les demandes sont examinées selon les conditions d’achat et les règles applicables. Si vous avez déjà payé et que l’accès manque, ne payez pas une seconde fois." },
] as const;

export function getFrenchPricingPlans(kind: CheckoutBillingKind) {
  const purchase = getPurchaseOptionsCopy("fr");
  return localizeHomepagePlans("fr", getPricingPlanCatalog("en"))
    .filter(plan => plan.code !== "free")
    .map(plan => {
      if (kind === "subscription") return plan;
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
