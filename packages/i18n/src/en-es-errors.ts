import { deRuErrors } from "./de-ru-errors.ts";

const enCodes: Record<string, string> = {
  ACTIVE_RECURRING_SUBSCRIPTION: "Stop future renewals in Billing before buying access without automatic renewal.",
  ACCOUNT_REQUIRED: "Sign in or create an account before paying.",
  CHECKOUT_INTENT_NOTIFICATION_FAILED: "Your purchase request could not be sent. Try again later. No payment was started.",
  PAYMENT_PROVIDER_BUILDING: "This payment method is not available yet. Your request was received; no payment was started.",
  PLAN_JOB_QUOTA_EXCEEDED: "You have used this month's credits. Review your plan in Billing.",
  PLAN_STORAGE_QUOTA_EXCEEDED: "Your storage is full. Remove files you no longer need or review the available plans.",
  RATE_LIMITED: "Too many requests. Wait a moment and try again.",
  UPLOAD_FAILED: "The file could not be checked. Verify its format and size, then try again.",
  SCORE_REVIEW_REQUIRED: "Review and confirm the recognized score before using this tool.",
  SCORE_PROCESSING: "Recognition is still running. Wait for the result, then review the score.",
  SCORE_NOT_READY: "No usable score is available yet. Retry recognition or import another file.",
  DELETION_CONFIRMATION_REQUIRED: "Type DELETE to confirm account deletion.",
  PASSWORD_VERIFICATION_FAILED: "The current password is incorrect.",
  ACTIVATION_INVALID: "This activation code is invalid. Check the code supplied with your purchase.",
  ACTIVATION_EXPIRED: "This activation code has expired. Contact support with your order reference.",
  ACTIVATION_REVOKED: "This activation code has been disabled. Contact support.",
  ACTIVATION_ALREADY_USED: "This code has already been redeemed. Sign in to the account where you redeemed it.",
};
const esCodes: Record<keyof typeof enCodes, string> = {
  ACTIVE_RECURRING_SUBSCRIPTION: "Detén futuras renovaciones en Facturación antes de comprar acceso sin renovación automática.",
  ACCOUNT_REQUIRED: "Inicia sesión o crea una cuenta antes de pagar.",
  CHECKOUT_INTENT_NOTIFICATION_FAILED: "No se pudo enviar tu solicitud de compra. Inténtalo más tarde. No se ha iniciado ningún pago.",
  PAYMENT_PROVIDER_BUILDING: "Este método de pago aún no está disponible. Hemos recibido tu solicitud; no se ha iniciado ningún pago.",
  PLAN_JOB_QUOTA_EXCEEDED: "Has agotado los créditos de este mes. Consulta tu plan en Facturación.",
  PLAN_STORAGE_QUOTA_EXCEEDED: "Tu almacenamiento está lleno. Elimina los archivos que ya no necesites o consulta los planes disponibles.",
  RATE_LIMITED: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
  UPLOAD_FAILED: "No se pudo comprobar el archivo. Revisa su formato y tamaño e inténtalo de nuevo.",
  SCORE_REVIEW_REQUIRED: "Revisa y confirma la partitura reconocida antes de usar esta herramienta.",
  SCORE_PROCESSING: "El reconocimiento sigue en curso. Espera el resultado y después revisa la partitura.",
  SCORE_NOT_READY: "Todavía no hay una partitura utilizable. Repite el reconocimiento o importa otro archivo.",
  DELETION_CONFIRMATION_REQUIRED: "Escribe DELETE para confirmar la eliminación de la cuenta.",
  PASSWORD_VERIFICATION_FAILED: "La contraseña actual es incorrecta.",
  ACTIVATION_INVALID: "Este código de activación no es válido. Comprueba el código recibido con la compra.",
  ACTIVATION_EXPIRED: "Este código de activación ha caducado. Contacta con soporte e indica la referencia del pedido.",
  ACTIVATION_REVOKED: "Este código de activación está deshabilitado. Contacta con soporte.",
  ACTIVATION_ALREADY_USED: "Este código ya se ha canjeado. Inicia sesión en la cuenta donde lo canjeaste.",
};
const esLegacy: Record<string, string> = {
  "Email and password are required.": "Introduce tu correo electrónico y contraseña.",
  "Please enter a valid email address.": "Introduce un correo electrónico válido.",
  "Password must be at least 8 characters.": "La contraseña debe tener al menos 8 caracteres.",
  "Email already registered.": "Este correo ya tiene una cuenta. Inicia sesión o restablece la contraseña.",
  "Invalid email or password.": "El correo electrónico o la contraseña son incorrectos.",
  "Google sign-in is not configured.": "El acceso con Google no está disponible. Utiliza tu correo electrónico.",
  "Google sign-in could not be verified. Please try again.": "No se pudo verificar el acceso con Google. Inténtalo de nuevo o utiliza tu correo electrónico.",
  "Reset token is required.": "El enlace de restablecimiento está incompleto. Solicita uno nuevo.",
  "This password reset link is invalid or expired.": "El enlace de restablecimiento no es válido o ha caducado. Solicita uno nuevo.",
  "Please choose a valid support category.": "Elige una categoría de soporte válida.",
  "Please enter a valid contact email address.": "Introduce un correo de contacto válido.",
  "Please enter a valid account email address.": "Introduce un correo de cuenta válido.",
  "Please enter a short subject so support can triage the request.": "Introduce un asunto de al menos 4 caracteres.",
  "Please describe the issue in a bit more detail.": "Describe el problema con al menos 10 caracteres.",
  "Could not save the support request.": "No se pudo guardar la solicitud. Inténtalo de nuevo o contacta con soporte por correo.",
  "A valid checkout plan is required.": "Elige un plan válido antes de continuar.",
  "Invalid purchase type or payment provider.": "Esta modalidad de compra no está disponible con el proveedor elegido.",
  "This payment provider is not enabled.": "Este proveedor de pago no está disponible. Elige otra opción.",
  "A registered account is required before payment.": "Inicia sesión en tu cuenta antes de pagar.",
  "A valid registered account email is required.": "Introduce el correo de la cuenta que recibirá el acceso.",
  "Payment order not found.": "No se ha encontrado el pedido. Si ya has pagado, contacta con soporte antes de volver a comprar.",
  "Only pending payment orders can be cancelled.": "Este pedido ya no se puede cancelar aquí. Revisa su estado o contacta con soporte.",
  "Activation code is required.": "Introduce tu código de activación.",
};
const enLegacy: Record<string, string> = {
  ...Object.fromEntries(Object.keys(deRuErrors.de.legacy).map(message => [message, message])),
  "Google sign-in is not configured.": "Google sign-in is unavailable. Use your email address to sign in.",
  "Reset token is required.": "This reset link is incomplete. Request a new link.",
  "Payment order not found.": "This order was not found. If you have paid, contact support before buying again.",
};
const legacyCodes: Record<string, string> = {
  "The monthly credit balance for this plan has been used up.": "PLAN_JOB_QUOTA_EXCEEDED",
  "The storage quota for this plan has been reached.": "PLAN_STORAGE_QUOTA_EXCEEDED",
};
const aliases: Record<string, string> = { ACTIVATION_NOT_FOUND: "ACTIVATION_INVALID", ACTIVATION_DISABLED: "ACTIVATION_REVOKED", ACTIVATION_ALREADY_REDEEMED: "ACTIVATION_ALREADY_USED" };

export function localizeEnEsError(input: { error?: string | null; code?: string | null; status?: number }, locale: "en" | "es") {
  const en = locale === "en", codes = en ? enCodes : esCodes, legacy = en ? enLegacy : esLegacy;
  const code = input.code ? aliases[input.code] ?? input.code : input.error ? legacyCodes[input.error] : undefined;
  const known = code && codes[code] || input.error && legacy[input.error];
  if (known) return known;
  if (input.status === 0) return en ? "Unable to connect. Check your internet connection and try again." : "No se pudo conectar. Comprueba tu conexión a internet e inténtalo de nuevo.";
  if (input.status === 401) return en ? "Your session has expired or is invalid. Sign in again to continue." : "Tu sesión ha caducado o no es válida. Vuelve a iniciar sesión para continuar.";
  if (input.status === 403) return en ? "Your account does not have access to this action." : "Tu cuenta no tiene permiso para realizar esta acción.";
  if (input.status === 404) return en ? "The requested item was not found or is no longer available." : "No se ha encontrado el elemento solicitado o ya no está disponible.";
  if (input.status === 413) return en ? "The file is too large. Check the permitted file size." : "El archivo es demasiado grande. Comprueba el tamaño máximo permitido.";
  if (input.status === 429) return codes.RATE_LIMITED;
  if (input.status && input.status >= 500) return en ? "The service is temporarily unavailable. Try again later or contact support if the problem continues." : "El servicio no está disponible temporalmente. Inténtalo más tarde o contacta con soporte si el problema continúa.";
  return en ? "The request could not be completed. Check the information and try again, or contact support if the problem continues." : "No se pudo completar la solicitud. Revisa los datos e inténtalo de nuevo o contacta con soporte si el problema continúa.";
}
