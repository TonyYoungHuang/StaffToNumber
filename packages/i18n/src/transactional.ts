import { normalizeLocale } from "./locales.ts";

const en = {
  resetSubject: "Password reset", resetIntro: "You requested a password reset for ScoreTransposer.", account: "Account email", resetAction: "Reset password", expires: "Link validity in hours: {hours}", ignore: "If you did not request this, ignore this email or contact {support}.",
  supportSubject: "Support request received", greeting: "Hello {name},", supportIntro: "We received your ScoreTransposer support request.", reference: "Reference", category: "Category", subject: "Subject", supportNext: "To add information, reply to this email or visit {url}.", supportContact: "Support: {support}",
  copyrightSubject: "Copyright complaint received", accessCode: "Access code", responseTarget: "Initial response target", statusPage: "Status page", keepCode: "Keep the access code private; it will not be shown on the website again.", copyrightReceived: "Complaint received and awaiting completeness review.",
  notificationFooter: "You received this because classroom email announcements are enabled in ScoreTransposer.", notificationSettings: "Manage notification settings: {url}",
};

type TransactionalCopy = Record<keyof typeof en, string>;
const translations: Record<string, TransactionalCopy> = {
  en,
  es: {
    resetSubject: "Restablecer contraseña", resetIntro: "Has solicitado restablecer tu contraseña de ScoreTransposer.", account: "Correo de la cuenta", resetAction: "Restablecer contraseña", expires: "Validez del enlace en horas: {hours}", ignore: "Si no has solicitado este cambio, ignora el mensaje o contacta con {support}.",
    supportSubject: "Solicitud de soporte recibida", greeting: "Hola, {name}:", supportIntro: "Hemos recibido tu solicitud de soporte de ScoreTransposer.", reference: "Referencia", category: "Categoría", subject: "Asunto", supportNext: "Para añadir información, responde a este correo o visita {url}.", supportContact: "Soporte: {support}",
    copyrightSubject: "Reclamación de derechos de autor recibida", accessCode: "Código privado de consulta", responseTarget: "Objetivo de primera respuesta", statusPage: "Estado de la reclamación", keepCode: "Guarda el código en privado para futuras consultas; no volverá a mostrarse en el sitio.", copyrightReceived: "Reclamación recibida, pendiente de comprobar que la información esté completa.",
    notificationFooter: "Has recibido este mensaje porque has activado las notificaciones de clase por correo en ScoreTransposer.", notificationSettings: "Gestionar las notificaciones: {url}",
  },
  "zh-CN": { ...en, copyrightSubject: "版权投诉已收到", reference: "编号", accessCode: "查询码", responseTarget: "首次响应目标", statusPage: "查询页面", keepCode: "请妥善保管查询码；平台不会再次在网页中显示。", copyrightReceived: "投诉材料已收到，等待完整性核验。", notificationFooter: "此邮件由你在 ScoreTransposer 的课堂通知偏好触发。", notificationSettings: "修改通知设置：{url}" },
  fr: { ...en, copyrightSubject: "Réclamation pour atteinte aux droits d’auteur reçue", reference: "Référence", accessCode: "Code de consultation", responseTarget: "Délai prévu pour la première réponse", statusPage: "Suivi de la demande", keepCode: "Conservez ce code de consultation en lieu sûr ; il ne sera plus affiché sur le site.", copyrightReceived: "Réclamation reçue, en attente de vérification des informations.", notificationFooter: "Vous recevez cet e-mail car les annonces de classe sont activées dans ScoreTransposer.", notificationSettings: "Gérer les notifications : {url}" },
  de: {
    resetSubject: "Passwort zurücksetzen", resetIntro: "Sie haben das Zurücksetzen Ihres ScoreTransposer-Passworts angefordert.", account: "Konto-E-Mail", resetAction: "Passwort zurücksetzen", expires: "Gültigkeit des Links in Stunden: {hours}", ignore: "Falls Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail oder kontaktieren Sie {support}.",
    supportSubject: "Supportanfrage eingegangen", greeting: "Guten Tag {name},", supportIntro: "Ihre Supportanfrage zu ScoreTransposer ist eingegangen.", reference: "Referenznummer", category: "Kategorie", subject: "Betreff", supportNext: "Antworten Sie auf diese E-Mail, um Angaben zu ergänzen, oder besuchen Sie {url}.", supportContact: "Support: {support}",
    copyrightSubject: "Urheberrechtsbeschwerde eingegangen", accessCode: "Abfragecode", responseTarget: "Geplante erste Antwort", statusPage: "Status der Beschwerde", keepCode: "Bewahren Sie den Abfragecode vertraulich auf. Er wird auf der Website nicht erneut angezeigt.", copyrightReceived: "Die Beschwerde ist eingegangen. Die Angaben werden auf Vollständigkeit geprüft.",
    notificationFooter: "Sie erhalten diese E-Mail, weil Sie in ScoreTransposer Klassenmitteilungen per E-Mail aktiviert haben.", notificationSettings: "Benachrichtigungen verwalten: {url}",
  },
  ru: {
    resetSubject: "Сброс пароля", resetIntro: "Вы запросили сброс пароля ScoreTransposer.", account: "Адрес аккаунта", resetAction: "Сбросить пароль", expires: "Срок действия ссылки в часах: {hours}", ignore: "Если вы не отправляли этот запрос, проигнорируйте письмо или напишите на {support}.",
    supportSubject: "Обращение в поддержку получено", greeting: "Здравствуйте, {name}!", supportIntro: "Мы получили ваше обращение в поддержку ScoreTransposer.", reference: "Номер обращения", category: "Категория", subject: "Тема", supportNext: "Чтобы добавить сведения, ответьте на это письмо или перейдите на {url}.", supportContact: "Поддержка: {support}",
    copyrightSubject: "Жалоба о нарушении авторских прав получена", accessCode: "Код проверки", responseTarget: "Плановый срок первого ответа", statusPage: "Страница статуса", keepCode: "Сохраните код проверки и никому его не сообщайте. На сайте он больше не будет показан.", copyrightReceived: "Жалоба получена и ожидает проверки полноты сведений.",
    notificationFooter: "Вы получили это письмо, потому что включили уведомления класса по электронной почте в ScoreTransposer.", notificationSettings: "Настройки уведомлений: {url}",
  },
};

export function getTransactionalCopy(locale?: string | null): TransactionalCopy {
  return translations[normalizeLocale(locale) ?? "en"] ?? en;
}
