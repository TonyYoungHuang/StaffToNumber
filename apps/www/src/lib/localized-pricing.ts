import { getPricingPlanCatalog, getPurchaseOptionsCopy, type CheckoutBillingKind } from "@score/shared";
import { localizeHomepagePlans } from "./homepage-localization";
import { enEsPricingCopy } from "./en-es-pricing";

export const pricingCopy = {
  ...enEsPricingCopy,
  de: {
    title: "Preise: Einmalkauf oder Abonnement", description: "Beginnen Sie mit einem kostenlosen Notenprojekt. Starter und Converter Pro bieten mehr Kapazität. Alle Preise sind in US-Dollar (USD) angegeben.", home: "Startseite", pricing: "Preise", freeTitle: "Kostenlos beginnen, ohne Zahlungskarte", freeBody: "Erstellen Sie ein vollständiges Projekt aus einem mehrseitigen PDF oder Notenbild. Sie erhalten 25 Credits pro Monat und 50 MB Speicher. Bearbeiten, transponieren, spielen und exportieren Sie Ihre Partitur mit den verfügbaren Werkzeugen.", freeAction: "Kostenloses Notenprojekt erstellen", oneTimeTitle: "Einen Monat oder ein Jahr Zugang kaufen", subscriptionTitle: "Monats- oder Jahresabonnement wählen", oneTimeLabel: "Einmalzahlung", subscriptionLabel: "Wiederkehrende Zahlung", creditTitle: "Wann werden Credits verbraucht?", creditBody: "Credits werden beim Erstellen eines Auftrags reserviert und bei einem Fehlschlag oder einer Stornierung automatisch zurückgegeben. Anzeigen, Wiedergabe und nicht übermittelte Grundbearbeitungen verbrauchen keine Credits. Das monatliche Kontingent wird zu Beginn jedes UTC-Kalendermonats zurückgesetzt; ungenutzte Credits werden nicht übertragen.", review: "Prüfen Sie erkannte Noten und Rhythmen. Die Qualität der Vorlage und die Komplexität der Partitur können Korrekturen erforderlich machen.", faqTitle: "Fragen zu Kauf und Zugang", terms: "Nutzungsbedingungen", support: "Support kontaktieren",
    faqs: [
      { question: "Was unterscheidet Einmalkauf und Abonnement?", answer: "Ein Einmalkauf aktiviert den gewählten Tarif für einen Monat oder ein Jahr, ohne automatische Verlängerung. Ein Abonnement verlängert sich am Ende des gewählten Zeitraums, bis Sie es kündigen. Werkzeuge und monatliche Kontingente des Tarifs sind gleich." },
      { question: "Erhalte ich bei einem Jahreszugang alle Credits sofort?", answer: "Nein. Starter enthält 50 Credits pro Monat und Converter Pro 200 Credits pro Monat. Auch bei einem Jahreszugang wird das Kontingent monatlich zurückgesetzt; ungenutzte Credits werden nicht übertragen." },
      { question: "In welcher Währung bezahle ich?", answer: "Die Preise sind in US-Dollar (USD) angegeben. Den Endbetrag und gegebenenfalls Steuern sehen Sie vor der Bestätigung beim Zahlungsanbieter. Ihre Bank kann Umrechnungsgebühren berechnen." },
      { question: "Was geschieht am Ende des Zugangs?", answer: "Ein Einmalkauf endet ohne weitere Abbuchung. Ein erneuter Kauf derselben Tarifstufe verlängert den Zugang. Bei einem Abonnement können Sie die nächsten Verlängerungen unter Abrechnung beenden. Der bereits bezahlte Zugang bleibt grundsätzlich bis zum Ende des Zeitraums bestehen, vorbehaltlich Erstattungen und der Nutzungsbedingungen." },
      { question: "Wie erhalte ich Hilfe zu einer Zahlung?", answer: "Kontaktieren Sie den Support mit Ihrer Bestellnummer. Wenn Sie bezahlt haben, der Zugang aber fehlt, bezahlen Sie nicht erneut. Übermitteln Sie keine Passwörter oder vollständigen Aktivierungscodes." },
    ],
  },
  ru: {
    title: "Тарифы: разовая покупка или подписка", description: "Начните с бесплатного нотного проекта. Starter и Converter Pro дают больше возможностей для обработки файлов. Все цены указаны в долларах США (USD).", home: "Главная", pricing: "Тарифы", freeTitle: "Начните бесплатно, без банковской карты", freeBody: "Создайте один полный проект из многостраничного PDF или изображения нот. Доступны 25 кредитов в месяц и 50 МБ хранилища. Исправляйте, транспонируйте, воспроизводите и экспортируйте партитуру с помощью доступных инструментов.", freeAction: "Создать бесплатный нотный проект", oneTimeTitle: "Купить доступ на месяц или год", subscriptionTitle: "Выбрать ежемесячную или годовую подписку", oneTimeLabel: "Один платёж", subscriptionLabel: "Регулярные платежи", creditTitle: "Когда расходуются кредиты?", creditBody: "Кредиты резервируются при создании задания и автоматически возвращаются при ошибке или отмене. Просмотр, воспроизведение и неотправленные базовые правки не расходуют кредиты. Ежемесячный лимит обновляется в начале каждого календарного месяца по UTC; неиспользованные кредиты не переносятся.", review: "Проверяйте распознанные ноты и ритм. Качество исходного файла и сложность партитуры могут потребовать исправлений.", faqTitle: "Вопросы о покупке и доступе", terms: "Условия использования", support: "Связаться с поддержкой",
    faqs: [
      { question: "Чем разовая покупка отличается от подписки?", answer: "Разовая покупка открывает выбранный тариф на месяц или год без автопродления. Подписка продлевается в конце выбранного периода до её отмены. Инструменты и ежемесячные лимиты выбранного тарифа одинаковы." },
      { question: "Все кредиты за год выдаются сразу?", answer: "Нет. Starter включает 50 кредитов в месяц, а Converter Pro — 200 кредитов в месяц. Даже при годовом доступе лимит обновляется ежемесячно; неиспользованные кредиты не переносятся." },
      { question: "В какой валюте производится оплата?", answer: "Цены указаны в долларах США (USD). Итоговую сумму и возможные налоги платёжный сервис покажет до подтверждения покупки. Банк может взимать комиссию за конвертацию валюты." },
      { question: "Что происходит после окончания доступа?", answer: "Разовая покупка заканчивается без нового списания. Повторная покупка того же тарифа продлевает доступ. Для подписки можно отключить следующие продления в разделе «Оплата». Оплаченный доступ обычно сохраняется до конца периода с учётом возвратов и условий использования." },
      { question: "Как получить помощь с оплатой?", answer: "Обратитесь в поддержку и укажите номер заказа. Если вы уже заплатили, но доступ не появился, не оплачивайте повторно. Не отправляйте пароли или полные коды активации." },
    ],
  },
} as const;

export function getLocalizedPaidPlans(locale: "en" | "es" | "fr" | "de" | "ru", kind: CheckoutBillingKind) {
  const purchase = getPurchaseOptionsCopy(locale);
  return localizeHomepagePlans(locale, getPricingPlanCatalog("en")).filter(plan => plan.code !== "free").map(plan => {
    if (kind === "subscription") return plan;
    const duration = plan.code.endsWith("-annual") ? purchase.year : purchase.month;
    return { ...plan, cycle: duration, badge: purchase.oneTime, cta: purchase.buyTemplate.replace("{name}", plan.name).replace("{duration}", duration), resources: [...plan.resources.filter(resource => !/renewal|renewing|twelve monthly|renovación|doce pagos|renouvellement|douze mensualités|Verlängerung|zwölf Monatszahlungen|продлен|двенадцат/iu.test(resource)), purchase.oneTimeNote] };
  });
}
