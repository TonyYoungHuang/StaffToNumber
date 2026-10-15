import type { SupportedLocale } from "./locales.ts";
const messages: Record<SupportedLocale, string> = {
  en: "You have used this month's credits. Review your plan in Billing.",
  "zh-CN": "可用积分已用完。请选择套餐升级，或为这首乐谱补充积分后继续。",
  "zh-TW": "可用點數已用完。請選擇方案升級，或為這首樂譜補充點數後繼續。",
  ja: "利用可能なクレジットを使い切りました。プランを変更するか、この楽譜にクレジットを追加してください。",
  ko: "사용 가능한 크레딧을 모두 사용했습니다. 요금제를 업그레이드하거나 이 악보에 크레딧을 추가해 계속하세요.",
  fr: "Vous avez utilisé les crédits disponibles pour ce mois. Consultez votre formule dans Facturation.",
  es: "Has agotado los créditos de este mes. Consulta tu plan en Facturación.",
  de: "Ihre Credits für diesen Monat sind aufgebraucht. Prüfen Sie Ihren Tarif unter Abrechnung.",
  ru: "Кредиты на этот месяц закончились. Проверьте свой тариф в разделе «Оплата».",
};
export function creditQuotaError(code: string | null | undefined, locale: SupportedLocale) {
  return code === "PLAN_JOB_QUOTA_EXCEEDED" ? messages[locale] : undefined;
}
