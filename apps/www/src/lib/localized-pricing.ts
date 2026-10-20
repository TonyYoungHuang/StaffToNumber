import { getRecognitionPricingCopy } from "./recognition-pricing-copy";
import { getPurchaseFaqs } from "./pricing-body-copy";
import { getPricingPlanCatalog, getPurchaseOptionsCopy, type CheckoutBillingKind } from "@score/shared";
import { localizeHomepagePlans } from "./homepage-localization";
import { enEsPricingCopy } from "./en-es-pricing";

export const pricingCopy = {
  ...enEsPricingCopy,
  de: {
    title: "Preise: Einmalkauf oder Abonnement", description: "Beginnen Sie mit einem kostenlosen einfachen Scan. Für bezahlte Aktionen wählen Sie den Einzelpartitur-Pass für 2,99 USD oder Starter für 7,99 USD/Monat bzw. 49 USD/Jahr. Alle Preise sind in US-Dollar (USD) angegeben.", home: "Startseite", pricing: "Preise", freeTitle: "Kostenlos beginnen, ohne Zahlungskarte", freeBody: getRecognitionPricingCopy("de").freeScope + " " + getRecognitionPricingCopy("de").laneGuide, freeAction: "Kostenloses Notenprojekt erstellen", oneTimeTitle: "Einen Monat oder ein Jahr Zugang kaufen", subscriptionTitle: "Monats- oder Jahresabonnement wählen", oneTimeLabel: "Einmalzahlung", subscriptionLabel: "Wiederkehrende Zahlung", creditTitle: "Wann werden Credits verbraucht?", creditBody: getRecognitionPricingCopy("de").billing + " " + getRecognitionPricingCopy("de").refund, review: "Prüfen Sie erkannte Noten und Rhythmen. Die Qualität der Vorlage und die Komplexität der Partitur können Korrekturen erforderlich machen.", faqTitle: "Fragen zu Kauf und Zugang", terms: "Nutzungsbedingungen", support: "Support kontaktieren",
    faqs: [
      { question: "Was unterscheidet Einmalkauf und Abonnement?", answer: "Converter Pro mit lebenslangem Zugang kostet einmalig 99 USD und bietet dauerhafte, unbegrenzte Nutzung. Befristete Einmalkäufe gelten einen Monat oder ein Jahr ohne automatische Verlängerung. Abonnements verlängern sich bis zur Kündigung." },
      { question: "Erhalte ich bei einem Jahreszugang alle Credits sofort?", answer: "Starter enthält 50 Credits pro Monat, auch beim Jahreszugang. Converter Pro monatlich enthält 200 Credits pro Monat. Diese Kontingente werden monatlich ohne Übertrag zurückgesetzt. Converter Pro lebenslang bietet unbegrenzte Nutzung ohne Ablauf oder monatliches Credit-Kontingent." },
      { question: "In welcher Währung bezahle ich?", answer: "Die Preise sind in US-Dollar (USD) angegeben. Den Endbetrag und gegebenenfalls Steuern sehen Sie vor der Bestätigung beim Zahlungsanbieter. Ihre Bank kann Umrechnungsgebühren berechnen." },
      { question: "Was geschieht am Ende des Zugangs?", answer: "Lebenslanger Zugang läuft nicht ab und wird nicht verlängert. Befristete Einmalkäufe enden ohne weitere Abbuchung; erneute Käufe derselben Stufe verlängern den Zugang. Abo-Verlängerungen lassen sich unter Abrechnung kündigen. Erstattungs- und Nutzungsbedingungen gelten weiterhin." },
      { question: "Wie erhalte ich Hilfe zu einer Zahlung?", answer: "Kontaktieren Sie den Support mit Ihrer Bestellnummer. Wenn Sie bezahlt haben, der Zugang aber fehlt, bezahlen Sie nicht erneut. Übermitteln Sie keine Passwörter." },
      ...getPurchaseFaqs("de"),
    ],
  },
  ru: {
    title: "Тарифы: разовая покупка или подписка", description: "Начните с одного бесплатного простого сканирования. Для платных действий выберите пакет за 2,99 USD или Starter за 7,99 USD/месяц либо 49 USD/год. Все цены указаны в долларах США (USD).", home: "Главная", pricing: "Тарифы", freeTitle: "Начните бесплатно, без банковской карты", freeBody: getRecognitionPricingCopy("ru").freeScope + " " + getRecognitionPricingCopy("ru").laneGuide, freeAction: "Создать бесплатный нотный проект", oneTimeTitle: "Купить доступ на месяц или год", subscriptionTitle: "Выбрать ежемесячную или годовую подписку", oneTimeLabel: "Один платёж", subscriptionLabel: "Регулярные платежи", creditTitle: "Когда расходуются кредиты?", creditBody: getRecognitionPricingCopy("ru").billing + " " + getRecognitionPricingCopy("ru").refund, review: "Проверяйте распознанные ноты и ритм. Качество исходного файла и сложность партитуры могут потребовать исправлений.", faqTitle: "Вопросы о покупке и доступе", terms: "Условия использования", support: "Связаться с поддержкой",
    faqs: [
      { question: "Чем разовая покупка отличается от подписки?", answer: "Постоянный Converter Pro стоит 99 USD одним платежом и даёт бессрочный безлимитный доступ. Разовые покупки на фиксированный срок действуют месяц или год без автопродления. Подписки продлеваются до отмены." },
      { question: "Все кредиты за год выдаются сразу?", answer: "Starter включает 50 кредитов в месяц, в том числе при годовом доступе. Месячный Converter Pro включает 200 кредитов в месяц. Эти лимиты обновляются ежемесячно без переноса. Постоянный Converter Pro предлагает безлимитное использование без срока действия и месячной квоты кредитов." },
      { question: "В какой валюте производится оплата?", answer: "Цены указаны в долларах США (USD). Итоговую сумму и возможные налоги платёжный сервис покажет до подтверждения покупки. Банк может взимать комиссию за конвертацию валюты." },
      { question: "Что происходит после окончания доступа?", answer: "Постоянный доступ не истекает и не продлевается. Разовые покупки на фиксированный срок заканчиваются без нового списания; повторная покупка того же уровня продлевает доступ. Автопродление подписки можно отменить в разделе оплаты. Условия возврата и использования продолжают действовать." },
      { question: "Как получить помощь с оплатой?", answer: "Обратитесь в поддержку и укажите номер заказа. Если вы уже заплатили, но доступ не появился, не оплачивайте повторно. Не отправляйте пароли." },
      ...getPurchaseFaqs("ru"),
    ],
  },
} as const;

export function getLocalizedPaidPlans(locale: "en" | "es" | "fr" | "de" | "ru", kind: CheckoutBillingKind) {
  const purchase = getPurchaseOptionsCopy(locale);
  return localizeHomepagePlans(locale, getPricingPlanCatalog("en")).filter(plan => plan.code !== "free").map(plan => {
    if (kind === "subscription" || plan.code === "converter-pro-annual") return plan;
    const duration = plan.code.endsWith("-annual") ? purchase.year : purchase.month;
    return { ...plan, cycle: duration, badge: purchase.oneTime, cta: purchase.buyTemplate.replace("{name}", plan.name).replace("{duration}", duration), resources: [...plan.resources.filter(resource => !/renewal|renewing|twelve monthly|renovación|doce pagos|renouvellement|douze mensualités|Verlängerung|zwölf Monatszahlungen|продлен|двенадцат/iu.test(resource)), purchase.oneTimeNote] };
  });
}
