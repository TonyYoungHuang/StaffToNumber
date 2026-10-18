import { getScorePassCopy } from "../score-pass-copy";
import type { BillingMessageCatalog } from "../types";

export const frBillingMessages = {
  scorePass: getScorePassCopy("fr"),
  reviewNotice: "Les textes de paiement ci-dessous sont une traduction provisoire en attente d’une révision professionnelle. En cas de divergence, les conditions en anglais et la page du prestataire de paiement prévalent.",
  activation: {
    page: { title: "Utiliser un code d’activation", description: "Saisissez le code reçu après l’achat pour activer l’espace de travail de partitions pendant un an." },
    form: {
      eyebrow: "Utiliser un code", title: "Transformer l’achat en un an d’accès", body: "Saisissez le code d’activation fourni avec votre achat. Connectez-vous d’abord afin d’associer l’accès à votre compte actuel.",
      devSeed: "Code de démonstration de développement", devSeedFootnote: "Affiché uniquement en développement local ou dans un environnement de test explicite.", codeLabel: "Code d’activation", codePlaceholder: "Saisissez le code d’activation",
      submit: "Utiliser le code", submitting: "Activation...", fillDemo: "Insérer le code de démonstration", loginFirst: "Connectez-vous avant d’utiliser un code.", required: "Saisissez un code d’activation.",
      success: "Code activé. Ouverture de vos partitions...", footnote: "Un code valide met immédiatement à jour les dates d’accès du compte.", fallbackError: "Le code n’a pas pu être utilisé. Réessayez.",
    },
  },
  checkout: {
    unavailable: {
      eyebrow: "État du lancement du paiement", title: "Le paiement en production termine sa vérification par transactions réelles.",
      body: "Le site de production ne crée pas de commandes de test et ne redirige pas vers un paiement staging. Cet accès ouvrira après la validation finale des paiements, remboursements et renouvellements réels.", continueFree: "Continuer la modification gratuite",
    },
    page: {
      eyebrow: "Tarifs en crédits", title: "Choisissez votre formule de crédits", body: "Les crédits sont réservés à la création de la tâche ; ils sont automatiquement restitués en cas d’échec ou d’annulation. Comparez prix, fonctions et ressources avant de vous connecter.",
      promoLabel: "Économisez avec l’annuel", promoValue: "Environ 45 % à 49 % d’économie", planNote: "La reconnaissance simple coûte 1 crédit par tâche, la complexe 5. Le nombre de pages détermine la file, sans multiplier le prix par page. Une livraison partielle restitue la part des crédits prévus correspondant aux pages non livrées ; un échec ou une annulation restitue les crédits de traitement. Il s’agit d’un retour de crédits, pas d’un remboursement en argent. Les crédits mensuels sont réinitialisés au début de chaque mois civil UTC, sans report. La consultation, la lecture et les modifications de base sans tâche serveur ne consomment aucun crédit.",
    },
    selector: {
      plansAria: "Choisir une formule de crédits", selectedPlan: "Formule sélectionnée", continueTemplate: "Continuer avec {name} {cycle}", freeEyebrow: "Gratuit",
      freeTitle: "Créez gratuitement votre première partition complète", freeBody: "1 reconnaissance simple gratuite à vie, en traitement standard : généralement une photo ou un PDF A4/Letter d’environ 1–5 pages, sous réserve de vérification. La formule gratuite ne fournit aucun crédit mensuel ; le scan gratuit ne demande aucun solde. Sur cette partition, la modification, la transposition, la lecture, le choix des résultats, le titre et le partage sont gratuits, ainsi que les exports Jianpu et Score JSON. Les exports PDF, MusicXML, MIDI, SVG, PNG, WAV et MP3, une autre partition, la reconnaissance complexe, les fichiers volumineux et l’extraction de parties nécessitent un pass une partition à 2,99 USD ou Starter dès 7,99 USD/mois.", freeCta: "Créer une partition gratuitement", creditUsage: "Crédits réservés par tâche", includedCapabilities: "Fonctions incluses", benefitsAndResources: "Avantages et ressources",
    },
    client: {
      checkoutEyebrow: "Paiement", title: "Payez en ligne et activez automatiquement l’accès", body: "Après le paiement, l’accès est activé automatiquement sur votre compte.",
      provider: "Prestataire de paiement", plan: "Formule", individual: "Individuel", school: "Places école ou organisme", organization: "Organisme facturé", organizationPlaceholder: "Choisir un organisme",
      noOrganizations: "Aucun organisme facturable n’est disponible pour ce compte.", seats: "Nombre de places", seatsHelp: "Choisissez entre 2 et 100 000 places.",
      stripeTitle: "Stripe", stripeLiveBody: "Pass une partition: Cartes, Alipay ou Link, selon les options proposées par Stripe Checkout. Pour les abonnements, utilisez les moyens affichés au paiement.", stripeBuildingBody: "Le paiement réel n’est pas encore connecté. Seule la demande est enregistrée, sans débit.",
      paddleTitle: "Paddle", paddleLiveBody: "Paddle gère les paiements internationaux, les taxes et les abonnements.", paddleBuildingBody: "Le compte marchand réel attend encore son approbation. Seule la demande est enregistrée, sans débit.",
      available: "Disponible", building: "En développement", waiting: "En attente d’approbation du compte marchand", button: "Continuer vers le paiement sécurisé dans cet onglet", intentButton: "Informer le responsable de ma demande d’achat",
      loading: "Redirection vers la page de paiement...", checking: "Vérification de la connexion...", signInEyebrow: "Connexion requise", signInTitle: "Connectez-vous avant de choisir le prestataire",
      signInBody: "Continuez avec Google ou votre adresse e-mail. Après connexion, vous restez sur cette page pour examiner Stripe et Paddle ; un prestataire non disponible ne vous débite jamais.",
      signInPoints: ["Associer les crédits au bon compte", "Réserver les demandes d’achat aux clients connectés", "Utiliser Google ou la connexion par e-mail"], selectedPlan: "Formule sélectionnée",
      accountNote: "Le compte connecté reçoit l’accès acheté. Le paiement s’ouvre dans cet onglet.",
      intentNote: "Avant de continuer, le serveur envoie une demande d’achat au responsable. Seul un prestataire disponible ouvre le paiement ; un prestataire en développement ne vous débite jamais.",
      providerBuildingTemplate: "Le paiement réel de {provider} est en développement. Le responsable a reçu votre demande et aucun débit n’a été créé.", notificationFailed: "Le responsable n’a pas pu être informé. Réessayez plus tard. Aucun débit n’a été créé.",
      fallbackError: "Le paiement n’a pas pu démarrer. Réessayez.",
    },
    status: {
      loading: "Vérification de l’état du paiement...", pendingTitle: "Confirmation de votre paiement", pendingBody: "Une fois le paiement terminé, l’accès est activé automatiquement sur le compte actuel.",
      successTitle: "Paiement réussi et compte activé", successBody: "Votre accès est prêt. Ouvrez vos partitions pour continuer.", cancelledTitle: "Le paiement a été annulé", cancelledBody: "Aucun paiement terminé n’a été enregistré. Revenez à vos partitions ou choisissez de nouveau une formule.", failedTitle: "Le paiement n’a pas abouti", failedBody: "Aucun changement d’accès n’a été confirmé. Consultez la page du prestataire ou réessayez.", scores: "Ouvrir mes partitions", jobs: "Ouvrir les tâches", fallbackError: "L’état du paiement n’a pas pu être chargé. Réessayez.",
    },
  },
  billing: {
    page: { eyebrow: "Facturation", title: "Gérez votre accès, vos abonnements, vos paiements et vos places scolaires.", body: "Consultez votre période d’accès et l’état de vos paiements. Un achat unique ne se renouvelle pas automatiquement ; un abonnement reste renouvelable jusqu’à sa résiliation.",
      displayBody: "Les paiements confirmés activent l’accès choisi. Un accès de durée limitée acheté en une fois expire sans renouvellement automatique ; les abonnements se renouvellent jusqu’à résiliation. Les crédits du Pass une partition n’expirent pas et sont partagés avec ses parties extraites. Les échecs, annulations et remboursements de paiement sont indiqués ici." },
    manager: {
      loading: "Chargement de la facturation...", fallbackError: "La facturation n’a pas pu être chargée. Réessayez.", signIn: "Connectez-vous pour consulter la facturation.",
      creditEyebrow: "Solde de crédits", availableCredits: "Crédits disponibles ce mois-ci", creditUnit: "crédits", creditSummaryTemplate: "{limit} crédits ce mois-ci, dont {used} utilisés.", creditUsage: "Crédits utilisés ce mois-ci", storage: "Stockage de fichiers",
      prepaidTitle: "Crédits prépayés",
      prepaidSummaryTemplate: "{limit} crédits prépayés, dont {used} utilisés ou réservés. Sans remise à zéro mensuelle ni expiration.",
      prepaidNote: "La reconnaissance simple coûte 1 crédit par tâche, la complexe 5. Le nombre de pages détermine la file, sans multiplier le prix par page. Une livraison partielle restitue la part des crédits prévus correspondant aux pages non livrées ; un échec ou une annulation restitue les crédits de traitement. Il s’agit d’un retour de crédits, pas d’un remboursement en argent.",
      additionalPrepaidTemplate: "Crédits prépayés supplémentaires : {remaining} / {total}. Utilisés lorsque les crédits mensuels sont insuffisants. Les crédits inutilisés sont conservés.",
      quotaNote: "La reconnaissance simple coûte 1 crédit par tâche, la complexe 5. Le nombre de pages détermine la file, sans multiplier le prix par page. Une livraison partielle restitue la part des crédits prévus correspondant aux pages non livrées ; un échec ou une annulation restitue les crédits de traitement. Il s’agit d’un retour de crédits, pas d’un remboursement en argent. Les crédits mensuels sont réinitialisés au début de chaque mois civil UTC, sans report. La consultation, la lecture et les modifications de base sans tâche serveur ne consomment aucun crédit.",
      freeEyebrow: "État de l’accès gratuit", noPaidTitle: "Aucune formule payante active", freeBody: "1 reconnaissance simple gratuite à vie, en traitement standard : généralement une photo ou un PDF A4/Letter d’environ 1–5 pages, sous réserve de vérification. La formule gratuite ne fournit aucun crédit mensuel ; le scan gratuit ne demande aucun solde. Sur cette partition, la modification, la transposition, la lecture, le choix des résultats, le titre et le partage sont gratuits, ainsi que les exports Jianpu et Score JSON. Les exports PDF, MusicXML, MIDI, SVG, PNG, WAV et MP3, une autre partition, la reconnaissance complexe, les fichiers volumineux et l’extraction de parties nécessitent un pass une partition à 2,99 USD ou Starter dès 7,99 USD/mois.", unlock: "Activer l’accès complet",
      subscriptionsEyebrow: "Abonnements", subscriptionsTitle: "Accès et état du renouvellement", manageStripe: "Gérer le moyen de paiement Stripe", managingStripe: "Ouverture de Stripe...", noSubscriptions: "Aucun abonnement n’est associé à ce compte.",
      currentPeriodEndsTemplate: "Période actuelle jusqu’au {date}", noFixedEnd: "Aucune date de fin fixe", renewalFailed: "Le dernier renouvellement a échoué. Mettez à jour le moyen de paiement.", cancellationScheduled: "La résiliation est prévue à la fin de cette période.",
      seatsTemplate: "{count} places", cancel: "Résilier en fin de période", canceling: "Résiliation...", cancelSuccess: "L’abonnement sera résilié à la fin de la période de facturation actuelle.",
      memberEmail: "E-mail du membre", memberEmailPlaceholder: "member@example.com", assignSeat: "Attribuer une place", assigningSeat: "Attribution...", revoke: "Retirer", revoking: "Retrait...",
      invoicesEyebrow: "Factures", invoicesTitle: "Paiements, remboursements et échecs", noInvoices: "Aucune facture pour le moment.", invoicePaidTemplate: "Payée le {date}", invoiceDueTemplate: "À payer le {date}", invoiceFailedTemplate: "Échec le {date}", refundedTemplate: "remboursé {amount}", viewInvoice: "Voir la facture", amountPending: "Montant en attente",
      subscriptionStatuses: { trialing: "Essai", active: "Actif", past_due: "En retard", paused: "Suspendu", unpaid: "Impayé", incomplete: "Incomplet", cancelled: "Résilié" },
      invoiceStatuses: { draft: "Brouillon", open: "À payer", paid: "Payée", failed: "Échec", void: "Annulée", refunded: "Remboursée" },
      quotaTiers: { free: "Gratuit", starter: "Starter", "converter-pro": "Converter Pro" }, providers: { stripe: "Stripe", paddle: "Paddle" },
    },
  },
  plans: {
    names: { free: "Gratuit", starter: "Starter", "converter-pro": "Converter Pro" }, cycles: { lifetime: "À vie", monthly: "Mensuel", annual: "Annuel" },
    badges: { free: "Gratuit à vie", "starter-monthly": "Mensuel flexible", "starter-annual": "Starter annuel", "converter-pro-monthly": "Capacité supérieure", "converter-pro-annual": "Grande capacité annuelle" },
    audiences: {
      free: "1 reconnaissance simple gratuite à vie, en traitement standard : généralement une photo ou un PDF A4/Letter d’environ 1–5 pages, sous réserve de vérification. La formule gratuite ne fournit aucun crédit mensuel ; le scan gratuit ne demande aucun solde.", "starter-monthly": "Pour traiter régulièrement des partitions personnelles", "starter-annual": "Pour un usage individuel durable à moindre coût par crédit",
      "converter-pro-monthly": "Pour traiter davantage de partitions chaque mois", "converter-pro-annual": "Pour un traitement personnel soutenu et fréquent des partitions",
    },
    ctas: { free: "Créer une partition gratuite", "starter-monthly": "Choisir Starter mensuel", "starter-annual": "Choisir Starter annuel", "converter-pro-monthly": "Choisir Converter Pro mensuel", "converter-pro-annual": "Choisir Converter Pro annuel" },
    unitPriceTemplate: "{unitPrice} par crédit", freeUnitPriceTemplate: "{projectCount} projet de partition complet", creditsTemplate: "{monthlyCredits} crédits / mois", freeCreditsTemplate: "{projectCount} scan simple gratuit à vie · traitement standard · aucun crédit mensuel",
    benefits: {
      freeProject: "{projectCount} reconnaissance simple gratuite à vie dans la file standard ; généralement une photo ou environ 5 pages PDF A4/Letter maximum, selon la vérification", freeTools: "Sur cette partition, la modification, la transposition, la lecture, le choix des résultats, le titre et le partage sont gratuits, ainsi que les exports Jianpu et Score JSON. Les exports PDF, MusicXML, MIDI, SVG, PNG, WAV et MP3, une autre partition, la reconnaissance complexe, les fichiers volumineux et l’extraction de parties nécessitent un pass une partition à 2,99 USD ou Starter dès 7,99 USD/mois.", moreThanFreeProject: "Dépasser la limite de {projectCount} projet gratuit", starterIncluded: "Toutes les fonctions actuelles de Starter", starterMonthlyIncluded: "Toutes les fonctions actuelles de Starter mensuel", converterMonthlyIncluded: "Toutes les fonctions actuelles de Converter Pro mensuel",
      editor: "Éditeur en ligne, générateur de copie de partie bêta et collaboration en temps réel bêta", practice: "Lecture, enregistrement dans le navigateur et retour d’entraînement bêta, plus transposition intelligente", conversion: "Conversion portée ↔ Jianpu et MusicXML ↔ MIDI",
      exports: "Export PDF/SVG/PNG et WAV/MP3 lorsque le moteur correspondant est disponible", freeExports: "Exports Jianpu et Score JSON gratuits ; autres formats avec un pass une partition ou Starter",
    },
    resources: {
      monthlyCredits: "{monthlyCredits} crédits chaque mois ; reconnaissance simple : 1 crédit par tâche, complexe : 5 ; files standard et gros fichiers selon la vérification", monthlyCreditsReset: "{monthlyCredits} crédits par mois civil UTC, sans report ; reconnaissance simple : 1 crédit par tâche, complexe : 5 ; les deux files selon la vérification", freeMonthlyCredits: "Aucun crédit mensuel ; le scan simple gratuit à vie ne consomme aucun crédit.", storage: "{storage} Mo de stockage", personalLibrary: "Bibliothèque personnelle, historique des révisions et catalogue ouvert",
      monthlyRenewal: "Renouvellement mensuel sans engagement long", annualSavings: "Économisez {annualSavings} par rapport à douze mensualités", freeLibrary: "Bibliothèque ouverte et téléchargements CC0", noCard: "Aucune carte requise ; conservez le projet gratuit",
    },
  },
} satisfies BillingMessageCatalog;
