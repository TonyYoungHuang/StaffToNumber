import { scorePassError } from "./score-pass-errors.ts";
import { normalizeLocale } from "./locales.ts";
import { localizeDeRuError } from "./de-ru-errors.ts";
import { localizeEnEsError } from "./en-es-errors.ts";

const frenchErrorCodes: Record<string, string> = {
  ACTIVE_RECURRING_SUBSCRIPTION: "Arrêtez les prochains renouvellements dans Facturation avant d’acheter un accès sans renouvellement automatique.",
  ACCOUNT_REQUIRED: "Créez un compte ou connectez-vous avant de passer au paiement.",
  CHECKOUT_INTENT_NOTIFICATION_FAILED: "Votre demande d’achat n’a pas pu être transmise. Réessayez plus tard ; aucun paiement n’a été lancé.",
  PAYMENT_PROVIDER_BUILDING: "Ce moyen de paiement est en cours de préparation. Votre demande a été transmise ; aucun paiement n’a été lancé.",
  PLAN_JOB_QUOTA_EXCEEDED: "Vous avez utilisé les crédits disponibles pour ce mois. Consultez votre formule dans Facturation.",
  PLAN_STORAGE_QUOTA_EXCEEDED: "Votre espace de stockage est plein. Supprimez des fichiers inutiles ou consultez les autres formules.",
  RATE_LIMITED: "Trop de demandes ont été envoyées. Patientez un moment avant de réessayer.",
  UPLOAD_FAILED: "Le fichier n’a pas pu être vérifié. Vérifiez son format et sa taille, puis réessayez.",
  SCORE_REVIEW_REQUIRED: "Vérifiez et confirmez la partition reconnue avant d’utiliser cet outil.",
  SCORE_PROCESSING: "La reconnaissance est en cours. Attendez sa fin, puis vérifiez et confirmez la partition.",
  SCORE_NOT_READY: "Aucune partition utilisable n’est disponible. Relancez la reconnaissance ou importez un autre fichier.",
  DELETION_CONFIRMATION_REQUIRED: "Saisissez DELETE pour confirmer la suppression du compte.",
  PASSWORD_VERIFICATION_FAILED: "Le mot de passe actuel est incorrect.",
  ACTIVATION_INVALID: "Ce code d’activation n’est pas valide. Vérifiez le code reçu après votre achat.",
  ACTIVATION_EXPIRED: "Ce code d’activation a expiré. Contactez l’assistance avec votre référence de commande.",
  ACTIVATION_REVOKED: "Ce code d’activation n’est plus utilisable. Contactez l’assistance.",
  ACTIVATION_ALREADY_USED: "Ce code a déjà été utilisé. Connectez-vous au compte sur lequel il a été activé.",
};

// Older endpoints do not yet expose codes; match their known messages exactly.
const frenchLegacyErrors: Record<string, string> = {
  "Email and password are required.": "Saisissez votre adresse e-mail et votre mot de passe.",
  "Please enter a valid email address.": "Saisissez une adresse e-mail valide.",
  "Password must be at least 8 characters.": "Le mot de passe doit comporter au moins 8 caractères.",
  "Email already registered.": "Cette adresse e-mail possède déjà un compte. Connectez-vous ou réinitialisez votre mot de passe.",
  "Invalid email or password.": "L’adresse e-mail ou le mot de passe est incorrect.",
  "Google sign-in is not configured.": "La connexion Google est indisponible. Utilisez votre adresse e-mail.",
  "Google sign-in could not be verified. Please try again.": "La connexion Google n’a pas pu être vérifiée. Réessayez ou utilisez votre adresse e-mail.",
  "Reset token is required.": "Le lien de réinitialisation est incomplet. Demandez un nouveau lien.",
  "This password reset link is invalid or expired.": "Ce lien de réinitialisation est invalide ou a expiré. Demandez un nouveau lien.",
  "Please choose a valid support category.": "Choisissez une catégorie d’assistance valide.",
  "Please enter a valid contact email address.": "Saisissez une adresse e-mail de contact valide.",
  "Please enter a valid account email address.": "Saisissez une adresse e-mail de compte valide.",
  "Please enter a short subject so support can triage the request.": "Saisissez un objet d’au moins 4 caractères pour votre demande.",
  "Please describe the issue in a bit more detail.": "Décrivez votre problème en au moins 10 caractères.",
  "Could not save the support request.": "Votre demande n’a pas pu être enregistrée. Réessayez ou contactez l’assistance par e-mail.",
  "A valid checkout plan is required.": "Choisissez une formule valide avant de continuer.",
  "Invalid purchase type or payment provider.": "Ce type d’achat n’est pas disponible avec le moyen de paiement choisi.",
  "This payment provider is not enabled.": "Ce moyen de paiement est momentanément indisponible. Choisissez une autre option.",
  "A registered account is required before payment.": "Connectez-vous à votre compte avant de passer au paiement.",
  "A valid registered account email is required.": "Saisissez l’adresse e-mail du compte qui doit recevoir l’accès.",
  "Payment order not found.": "Cette commande est introuvable. Si vous avez déjà payé, contactez l’assistance avant de recommencer.",
  "Only pending payment orders can be cancelled.": "Cette commande ne peut plus être annulée depuis cette page. Vérifiez son état ou contactez l’assistance.",
  "Activation code is required.": "Saisissez votre code d’activation.",
};

export function localizeApiError(input: { error?: string | null; code?: string | null; status?: number }, locale?: string | null): string {
  const selectedLocale = normalizeLocale(locale);
  const passMessage = scorePassError(input.code, selectedLocale ?? "en");
  if (passMessage) return passMessage;
  if (selectedLocale === "en" || selectedLocale === "es") return localizeEnEsError(input, selectedLocale);
  if (selectedLocale === "de" || selectedLocale === "ru") return localizeDeRuError(input, selectedLocale);
  if (normalizeLocale(locale) !== "fr") return input.error || "Request failed.";
  const known = (input.code && frenchErrorCodes[input.code]) || (input.error && frenchLegacyErrors[input.error]);
  if (known) return known;
  if (input.status === 0) return "Connexion impossible. Vérifiez votre connexion Internet, puis réessayez.";
  if (input.status === 401) return "Votre session a expiré ou n’est pas valide. Reconnectez-vous pour continuer.";
  if (input.status === 403) return "Votre compte ne dispose pas de l’accès nécessaire à cette action.";
  if (input.status === 404) return "L’élément demandé est introuvable ou n’est plus disponible.";
  if (input.status === 413) return "Le fichier est trop volumineux. Vérifiez la taille maximale autorisée.";
  if (input.status === 429) return frenchErrorCodes.RATE_LIMITED;
  if (input.status && input.status >= 500) return "Le service est momentanément indisponible. Réessayez plus tard ou contactez l’assistance si le problème persiste.";
  return "La demande n’a pas abouti. Vérifiez les informations saisies ou contactez l’assistance si le problème persiste.";
}

export function localizeBrowserApiError(input: Parameters<typeof localizeApiError>[0]): string {
  return localizeApiError(input, typeof document === "undefined" ? undefined : document.documentElement.lang);
}
