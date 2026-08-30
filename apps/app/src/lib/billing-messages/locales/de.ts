import type { BillingMessageCatalog } from "../types";

export const deBillingMessages = {
  reviewNotice: "Die folgenden Zahlungstexte sind ein Übersetzungsentwurf und noch nicht fachlich geprüft. Bei Abweichungen gelten die englischen Bedingungen und die Seite des Zahlungsanbieters.",
  activation: {
    page: { title: "Aktivierungscode einlösen", description: "Geben Sie den beim Kauf erhaltenen Code ein, um den Notenarbeitsbereich ein Jahr lang zu aktivieren." },
    form: {
      eyebrow: "Code einlösen", title: "Kauf in ein Jahr Zugriff umwandeln", body: "Geben Sie den mit dem Kauf bereitgestellten Aktivierungscode ein. Melden Sie sich zuerst an, damit der Zugriff dem aktuellen Konto zugeordnet wird.",
      devSeed: "Demo-Code für die Entwicklung", devSeedFootnote: "Wird nur in der lokalen Entwicklung oder einer ausdrücklich eingerichteten Testumgebung angezeigt.", codeLabel: "Aktivierungscode", codePlaceholder: "Aktivierungscode eingeben",
      submit: "Code einlösen", submitting: "Wird eingelöst...", fillDemo: "Demo-Code einsetzen", loginFirst: "Melden Sie sich an, bevor Sie einen Code einlösen.", required: "Geben Sie einen Aktivierungscode ein.",
      success: "Code eingelöst. Ihre Noten werden geöffnet...", footnote: "Ein gültiger Code aktualisiert die Zugriffszeiträume des Kontos sofort.", fallbackError: "Der Code konnte nicht eingelöst werden. Versuchen Sie es erneut.",
    },
  },
  checkout: {
    unavailable: {
      eyebrow: "Status der Zahlungsfreigabe", title: "Die Produktivzahlung schließt die Prüfung mit echten Transaktionen ab.",
      body: "Die Produktivseite erstellt keine Testbestellungen und leitet nicht zu einem staging-Checkout weiter. Der Zugang öffnet nach der abschließenden Prüfung echter Zahlungen, Erstattungen und Verlängerungen.", continueFree: "Kostenlos weiterbearbeiten",
    },
    page: {
      eyebrow: "Credit-Preise", title: "Credit-Tarif auswählen", body: "Jeder erfolgreiche, abrechenbare Vorgang verbraucht einen Credit. Vergleichen Sie Preis, Funktionen und Ressourcen vor der Anmeldung.",
      promoLabel: "Mit jährlicher Zahlung sparen", promoValue: "Etwa 45 %–49 % sparen", planNote: "Monatliche Credits werden jeden Monat zurückgesetzt und nicht übertragen. Anzeigen, Wiedergabesteuerung und nicht übermittelte Grundbearbeitungen verbrauchen keine Credits.",
    },
    selector: {
      plansAria: "Credit-Tarif auswählen", selectedPlan: "Ausgewählter Tarif", continueTemplate: "Mit {name} {cycle} fortfahren", freeEyebrow: "Kostenlos",
      freeTitle: "Erste vollständige Partitur kostenlos erstellen", freeBody: "Keine Zahlung und keine Karte erforderlich. Der kostenlose Tarif behält ein vollständiges Notenprojekt und stellt monatlich Credits bereit.", freeCta: "Kostenlose Partitur erstellen", creditUsage: "Credits werden nur bei Nutzung abgezogen", includedCapabilities: "Enthaltene Funktionen", benefitsAndResources: "Vorteile und Ressourcen",
    },
    client: {
      checkoutEyebrow: "Zahlung", title: "Online bezahlen und Zugriff automatisch freischalten", body: "Nach erfolgreicher Zahlung wird der Zugriff im registrierten Konto automatisch aktiviert. Internationale Kunden müssen keinen Code manuell einlösen.",
      provider: "Zahlungsanbieter", plan: "Abonnementtyp", individual: "Einzelperson", school: "Plätze für Schule oder Organisation", organization: "Abgerechnete Organisation", organizationPlaceholder: "Organisation auswählen",
      noOrganizations: "Für dieses Konto ist keine abrechenbare Organisation verfügbar.", seats: "Anzahl der Plätze", seatsHelp: "Wählen Sie zwischen 2 und 100.000 Plätzen.",
      stripeTitle: "Stripe", stripeLiveBody: "Geeignet für internationale Karten und Wallet-Zahlungen.", stripeBuildingBody: "Der Produktiv-Checkout ist noch nicht verbunden. Der Bedarf wird ohne Abbuchung erfasst.",
      paddleTitle: "Paddle", paddleLiveBody: "Paddle verarbeitet internationale Zahlungen, Steuern und Abonnements.", paddleBuildingBody: "Das Produktiv-Händlerkonto wartet noch auf Freigabe. Der Bedarf wird ohne Abbuchung erfasst.",
      available: "Verfügbar", building: "In Entwicklung", waiting: "Freigabe des Händlerkontos ausstehend", button: "In diesem Tab sicher weiterbezahlen", intentButton: "Kaufanfrage an den Betreiber senden",
      loading: "Weiterleitung zur Zahlungsseite...", checking: "Anmeldestatus wird geprüft...", signInEyebrow: "Anmeldung erforderlich", signInTitle: "Vor Auswahl des Zahlungsanbieters anmelden",
      signInBody: "Fahren Sie mit Google oder E-Mail fort. Nach der Anmeldung bleiben Sie auf dieser Seite und können Stripe und Paddle prüfen; ein nicht verfügbarer Anbieter belastet Sie nie.",
      signInPoints: ["Credits dem richtigen Konto zuordnen", "Kaufanfragen nur von angemeldeten Kunden zulassen", "Google- oder E-Mail-Anmeldung verwenden"], selectedPlan: "Ausgewählter Tarif",
      accountNote: "Ihr Google-Konto bestimmt, wer das Abonnement erhält. Karten, Google Pay und weitere Methoden bietet der gewählte Anbieter an. Der Checkout öffnet sich in diesem Tab.",
      intentNote: "Vor dem Fortfahren sendet der Server dem Betreiber eine Kaufanfrage. Nur ein verfügbarer Anbieter öffnet den Checkout; ein Anbieter in Entwicklung belastet Sie nie.",
      providerBuildingTemplate: "Der Produktiv-Checkout von {provider} ist in Entwicklung. Der Betreiber hat Ihre Anfrage erhalten und es wurde keine Belastung erstellt.", notificationFailed: "Der Betreiber konnte nicht benachrichtigt werden. Versuchen Sie es später erneut. Es wurde keine Belastung erstellt.",
      fallbackError: "Der Checkout konnte nicht gestartet werden. Versuchen Sie es erneut.",
    },
    status: {
      loading: "Zahlungsstatus wird geprüft...", pendingTitle: "Zahlung wird bestätigt", pendingBody: "Nach Abschluss der Zahlung wird der Zugriff im aktuellen Konto automatisch aktiviert.",
      successTitle: "Zahlung erfolgreich und Konto aktiviert", successBody: "Ihr Zugriff ist bereit. Öffnen Sie Ihre Noten, ohne einen Code manuell einzulösen.", cancelledTitle: "Die Zahlung wurde abgebrochen", cancelledBody: "Es wurde keine abgeschlossene Zahlung erfasst. Kehren Sie zu Ihren Noten zurück oder wählen Sie erneut einen Tarif.", failedTitle: "Die Zahlung wurde nicht abgeschlossen", failedBody: "Es wurde keine Zugriffsänderung bestätigt. Prüfen Sie die Anbieterseite oder versuchen Sie es erneut.", scores: "Meine Noten öffnen", jobs: "Aufträge öffnen", fallbackError: "Der Zahlungsstatus konnte nicht geladen werden. Versuchen Sie es erneut.",
    },
  },
  billing: {
    page: { eyebrow: "Abrechnung", title: "Abonnements, Verlängerungen, Erstattungen und Schulplätze verwalten.", body: "Der Zugriff folgt dem geprüften Webhook-Buch des Anbieters; fehlgeschlagene Verlängerungen, Kündigungen und Erstattungen erscheinen im Berechtigungsstatus." },
    manager: {
      loading: "Abrechnungsdaten werden geladen...", fallbackError: "Abrechnungsdaten konnten nicht geladen werden. Versuchen Sie es erneut.", signIn: "Melden Sie sich an, um die Abrechnung zu sehen.",
      creditEyebrow: "Credit-Guthaben", availableCredits: "Diesen Monat verfügbare Credits", creditUnit: "Credits", creditSummaryTemplate: "{limit} Credits in diesem Monat, davon {used} verbraucht.", creditUsage: "Diesen Monat verwendete Credits", storage: "Dateispeicher",
      quotaNote: "Jeder erfolgreiche, abrechenbare Vorgang verbraucht einen Credit. Credits werden monatlich zurückgesetzt und nicht übertragen.",
      freeEyebrow: "Kostenloser Zugriffsstatus", noPaidTitle: "Kein aktiver Bezahl-Tarif", freeBody: "Ein kostenloses Konto behält ein dauerhaftes Projekt aus einem vollständigen mehrseitigen PDF oder Notenbild – mit Korrektur, Wiedergabe, Transposition, Jianpu, Teilen und Export; das kostenlose Kontingent beträgt {credits}.", unlock: "Vollzugriff freischalten",
      subscriptionsEyebrow: "Abonnements", subscriptionsTitle: "Zugriff und Verlängerungsstatus", manageStripe: "Stripe-Zahlungsmethode verwalten", managingStripe: "Stripe wird geöffnet...", noSubscriptions: "Mit diesem Konto sind keine Abonnements verknüpft.",
      currentPeriodEndsTemplate: "Aktueller Zeitraum endet am {date}", noFixedEnd: "Kein festes Enddatum", renewalFailed: "Die letzte Verlängerung ist fehlgeschlagen. Aktualisieren Sie die Zahlungsmethode.", cancellationScheduled: "Die Kündigung ist zum Ende dieses Zeitraums vorgemerkt.",
      seatsTemplate: "{count} Plätze", cancel: "Zum Periodenende kündigen", canceling: "Wird gekündigt...", cancelSuccess: "Das Abonnement endet mit dem aktuellen Abrechnungszeitraum.",
      memberEmail: "E-Mail des Mitglieds", memberEmailPlaceholder: "member@example.com", assignSeat: "Platz zuweisen", assigningSeat: "Wird zugewiesen...", revoke: "Entziehen", revoking: "Wird entzogen...",
      invoicesEyebrow: "Rechnungen", invoicesTitle: "Zahlungen, Erstattungen und Fehler", noInvoices: "Noch keine Rechnungen.", invoicePaidTemplate: "Bezahlt am {date}", invoiceDueTemplate: "Fällig am {date}", invoiceFailedTemplate: "Fehlgeschlagen am {date}", refundedTemplate: "erstattet {amount}", viewInvoice: "Rechnung ansehen", amountPending: "Betrag ausstehend",
      subscriptionStatuses: { trialing: "Testphase", active: "Aktiv", past_due: "Überfällig", paused: "Pausiert", unpaid: "Unbezahlt", incomplete: "Unvollständig", cancelled: "Gekündigt" },
      invoiceStatuses: { draft: "Entwurf", open: "Offen", paid: "Bezahlt", failed: "Fehlgeschlagen", void: "Storniert", refunded: "Erstattet" },
      quotaTiers: { free: "Kostenlos", starter: "Starter", "converter-pro": "Converter Pro" }, providers: { stripe: "Stripe", paddle: "Paddle" },
    },
  },
  plans: {
    names: { free: "Kostenlos", starter: "Starter", "converter-pro": "Converter Pro" }, cycles: { lifetime: "Dauerhaft", monthly: "Monatlich", annual: "Jährlich" },
    badges: { free: "Dauerhaft kostenlos", "starter-monthly": "Flexibel monatlich", "starter-annual": "Starter jährlich", "converter-pro-monthly": "Höhere Kapazität", "converter-pro-annual": "Hohe Kapazität jährlich" },
    audiences: {
      free: "Alle aktuellen Projektwerkzeuge mit einer vollständigen Partitur nutzen", "starter-monthly": "Für die regelmäßige Verarbeitung persönlicher Noten", "starter-annual": "Für langfristige Einzelnutzung mit niedrigeren Kosten pro Credit",
      "converter-pro-monthly": "Für mehr persönliche Notenverarbeitung pro Monat", "converter-pro-annual": "Für dauerhafte, häufige persönliche Notenverarbeitung",
    },
    ctas: { free: "Kostenlose Partitur erstellen", "starter-monthly": "Starter monatlich wählen", "starter-annual": "Starter jährlich wählen", "converter-pro-monthly": "Converter Pro monatlich wählen", "converter-pro-annual": "Converter Pro jährlich wählen" },
    unitPriceTemplate: "{unitPrice} pro Credit", freeUnitPriceTemplate: "{projectCount} vollständiges Notenprojekt", creditsTemplate: "{monthlyCredits} Credits / Monat", freeCreditsTemplate: "{projectCount} vollständige Partitur · {monthlyCredits} Credits / Monat",
    benefits: {
      freeProject: "{projectCount} vollständiges Notenprojekt dauerhaft erstellen", moreThanFreeProject: "Mehr als das {projectCount} kostenlose Notenprojekt", starterIncluded: "Alle aktuellen Funktionen von Starter", starterMonthlyIncluded: "Alle aktuellen Funktionen von Starter monatlich", converterMonthlyIncluded: "Alle aktuellen Funktionen von Converter Pro monatlich",
      editor: "Online-Editor, Partiturstimmen-Kopierer Beta und Echtzeit-Zusammenarbeit Beta", practice: "Wiedergabe, Browseraufnahme und Übungsfeedback Beta sowie intelligente Transposition", conversion: "Notenschrift ↔ Jianpu und MusicXML ↔ MIDI",
      exports: "PDF/SVG/PNG- und WAV/MP3-Export, wenn der jeweilige Renderer verfügbar ist", freeExports: "Aktuell verfügbare Exporte und Projektwerkzeuge für die kostenlose Partitur nutzen",
    },
    resources: {
      monthlyCredits: "{monthlyCredits} Credits pro Monat", monthlyCreditsReset: "{monthlyCredits} Credits monatlich, jeden Monat zurückgesetzt", storage: "{storage} GB Dateispeicher", personalLibrary: "Persönliche Bibliothek, Versionsverlauf und offener Notenkatalog",
      monthlyRenewal: "Monatliche Verlängerung ohne lange Bindung", annualSavings: "{annualSavings} gegenüber zwölf Monatszahlungen sparen", freeLibrary: "Offene Notenbibliothek und CC0-Downloads", noCard: "Keine Karte erforderlich; kostenloses Projekt behalten",
    },
  },
} satisfies BillingMessageCatalog;
