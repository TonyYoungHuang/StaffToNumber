import type { BillingMessageCatalog } from "../types";

export const frBillingMessages = {
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
      eyebrow: "Tarifs en crédits", title: "Choisissez votre formule de crédits", body: "Chaque opération éligible réussie utilise un crédit. Comparez prix, fonctions et ressources avant de vous connecter.",
      promoLabel: "Économisez avec l’annuel", promoValue: "Environ 45 % à 49 % d’économie", planNote: "Les crédits mensuels sont réinitialisés chaque mois et ne sont pas reportés. La consultation, les commandes de lecture et les modifications de base non envoyées ne consomment aucun crédit.",
    },
    selector: {
      plansAria: "Choisir une formule de crédits", selectedPlan: "Formule sélectionnée", continueTemplate: "Continuer avec {name} {cycle}", freeEyebrow: "Gratuit",
      freeTitle: "Créez gratuitement votre première partition complète", freeBody: "Aucun paiement ni carte n’est nécessaire. La formule gratuite conserve un projet de partition complet et fournit des crédits chaque mois.", freeCta: "Créer une partition gratuitement", creditUsage: "Les crédits ne sont déduits qu’à l’utilisation", includedCapabilities: "Fonctions incluses", benefitsAndResources: "Avantages et ressources",
    },
    client: {
      checkoutEyebrow: "Paiement", title: "Payez en ligne et activez automatiquement l’accès", body: "Après le paiement, l’accès est activé automatiquement sur votre compte. Les clients internationaux n’ont pas à saisir de code manuellement.",
      provider: "Prestataire de paiement", plan: "Type d’abonnement", individual: "Individuel", school: "Places école ou organisme", organization: "Organisme facturé", organizationPlaceholder: "Choisir un organisme",
      noOrganizations: "Aucun organisme facturable n’est disponible pour ce compte.", seats: "Nombre de places", seatsHelp: "Choisissez entre 2 et 100 000 places.",
      stripeTitle: "Stripe", stripeLiveBody: "Adapté aux cartes internationales et aux portefeuilles numériques.", stripeBuildingBody: "Le paiement réel n’est pas encore connecté. Seule la demande est enregistrée, sans débit.",
      paddleTitle: "Paddle", paddleLiveBody: "Paddle gère les paiements internationaux, les taxes et les abonnements.", paddleBuildingBody: "Le compte marchand réel attend encore son approbation. Seule la demande est enregistrée, sans débit.",
      available: "Disponible", building: "En développement", waiting: "En attente d’approbation du compte marchand", button: "Continuer vers le paiement sécurisé dans cet onglet", intentButton: "Informer le responsable de ma demande d’achat",
      loading: "Redirection vers la page de paiement...", checking: "Vérification de la connexion...", signInEyebrow: "Connexion requise", signInTitle: "Connectez-vous avant de choisir le prestataire",
      signInBody: "Continuez avec Google ou votre adresse e-mail. Après connexion, vous restez sur cette page pour examiner Stripe et Paddle ; un prestataire non disponible ne vous débite jamais.",
      signInPoints: ["Associer les crédits au bon compte", "Réserver les demandes d’achat aux clients connectés", "Utiliser Google ou la connexion par e-mail"], selectedPlan: "Formule sélectionnée",
      accountNote: "Votre compte Google identifie le bénéficiaire de l’abonnement. Les cartes, Google Pay et les autres moyens sont proposés par le prestataire choisi. Le paiement s’ouvre dans cet onglet.",
      intentNote: "Avant de continuer, le serveur envoie une demande d’achat au responsable. Seul un prestataire disponible ouvre le paiement ; un prestataire en développement ne vous débite jamais.",
      providerBuildingTemplate: "Le paiement réel de {provider} est en développement. Le responsable a reçu votre demande et aucun débit n’a été créé.", notificationFailed: "Le responsable n’a pas pu être informé. Réessayez plus tard. Aucun débit n’a été créé.",
      fallbackError: "Le paiement n’a pas pu démarrer. Réessayez.",
    },
    status: {
      loading: "Vérification de l’état du paiement...", pendingTitle: "Confirmation de votre paiement", pendingBody: "Une fois le paiement terminé, l’accès est activé automatiquement sur le compte actuel.",
      successTitle: "Paiement réussi et compte activé", successBody: "Votre accès est prêt. Ouvrez vos partitions sans utiliser de code manuellement.", cancelledTitle: "Le paiement a été annulé", cancelledBody: "Aucun paiement terminé n’a été enregistré. Revenez à vos partitions ou choisissez de nouveau une formule.", failedTitle: "Le paiement n’a pas abouti", failedBody: "Aucun changement d’accès n’a été confirmé. Consultez la page du prestataire ou réessayez.", scores: "Ouvrir mes partitions", jobs: "Ouvrir les tâches", fallbackError: "L’état du paiement n’a pas pu être chargé. Réessayez.",
    },
  },
  billing: {
    page: { eyebrow: "Facturation", title: "Gérez abonnements, renouvellements, remboursements et places scolaires.", body: "L’accès suit le registre Webhook vérifié du prestataire ; les échecs de renouvellement, résiliations et remboursements sont répercutés dans les droits." },
    manager: {
      loading: "Chargement de la facturation...", fallbackError: "La facturation n’a pas pu être chargée. Réessayez.", signIn: "Connectez-vous pour consulter la facturation.",
      creditEyebrow: "Solde de crédits", availableCredits: "Crédits disponibles ce mois-ci", creditUnit: "crédits", creditSummaryTemplate: "{limit} crédits ce mois-ci, dont {used} utilisés.", creditUsage: "Crédits utilisés ce mois-ci", storage: "Stockage de fichiers",
      quotaNote: "Chaque opération éligible réussie utilise un crédit. Les crédits sont réinitialisés chaque mois et ne sont pas reportés.",
      freeEyebrow: "État de l’accès gratuit", noPaidTitle: "Aucune formule payante active", freeBody: "Un compte gratuit conserve un projet à vie créé à partir d’un PDF multipage complet ou d’une image de partition, avec correction, lecture, transposition, Jianpu, partage et export ; l’allocation gratuite est de {credits}.", unlock: "Activer l’accès complet",
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
      free: "Utiliser tous les outils de projet actuels sur une partition complète", "starter-monthly": "Pour traiter régulièrement des partitions personnelles", "starter-annual": "Pour un usage individuel durable à moindre coût par crédit",
      "converter-pro-monthly": "Pour traiter davantage de partitions chaque mois", "converter-pro-annual": "Pour un traitement personnel soutenu et fréquent des partitions",
    },
    ctas: { free: "Créer une partition gratuite", "starter-monthly": "Choisir Starter mensuel", "starter-annual": "Choisir Starter annuel", "converter-pro-monthly": "Choisir Converter Pro mensuel", "converter-pro-annual": "Choisir Converter Pro annuel" },
    unitPriceTemplate: "{unitPrice} par crédit", freeUnitPriceTemplate: "{projectCount} projet de partition complet", creditsTemplate: "{monthlyCredits} crédits / mois", freeCreditsTemplate: "{projectCount} partition complète · {monthlyCredits} crédits / mois",
    benefits: {
      freeProject: "Créer {projectCount} projet de partition complet à vie", moreThanFreeProject: "Dépasser la limite de {projectCount} projet gratuit", starterIncluded: "Toutes les fonctions actuelles de Starter", starterMonthlyIncluded: "Toutes les fonctions actuelles de Starter mensuel", converterMonthlyIncluded: "Toutes les fonctions actuelles de Converter Pro mensuel",
      editor: "Éditeur en ligne, générateur de copie de partie Beta et collaboration en temps réel Beta", practice: "Lecture, enregistrement dans le navigateur et retour d’entraînement Beta, plus transposition intelligente", conversion: "Conversion portée ↔ Jianpu et MusicXML ↔ MIDI",
      exports: "Export PDF/SVG/PNG et WAV/MP3 lorsque le moteur correspondant est disponible", freeExports: "Utiliser les exports et outils de projet actuellement disponibles sur la partition gratuite",
    },
    resources: {
      monthlyCredits: "{monthlyCredits} crédits chaque mois", monthlyCreditsReset: "{monthlyCredits} crédits par mois, réinitialisés mensuellement", storage: "{storage} Go de stockage", personalLibrary: "Bibliothèque personnelle, historique des révisions et catalogue ouvert",
      monthlyRenewal: "Renouvellement mensuel sans engagement long", annualSavings: "Économisez {annualSavings} par rapport à douze mensualités", freeLibrary: "Bibliothèque ouverte et téléchargements CC0", noCard: "Aucune carte requise ; conservez le projet gratuit",
    },
  },
} satisfies BillingMessageCatalog;
