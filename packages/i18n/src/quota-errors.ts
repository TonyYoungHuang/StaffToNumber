import type { SupportedLocale } from "./locales.ts";
const messages: Record<SupportedLocale, string> = {
  en: "Your available credits do not cover this task. Review your plan or add credits to this score in Billing.",
  "zh-CN": "可用积分不足以完成此任务。请到账单查看套餐，或为这份乐谱补充积分。",
  "zh-TW": "可用點數不足以完成此工作。請至帳單查看方案，或為這份樂譜補充點數。",
  ja: "このタスクに必要なクレジットが不足しています。請求画面でプランを確認するか、この楽譜にクレジットを追加してください。",
  ko: "이 작업에 필요한 크레딧이 부족합니다. 결제 관리에서 요금제를 확인하거나 이 악보에 크레딧을 추가하세요.",
  fr: "Vos crédits disponibles ne suffisent pas pour cette tâche. Consultez votre forfait ou ajoutez des crédits à cette partition dans Facturation.",
  es: "Tus créditos disponibles no cubren esta tarea. Revisa tu plan o añade créditos a esta partitura en Facturación.",
  de: "Ihre verfügbaren Credits reichen für diesen Auftrag nicht aus. Prüfen Sie unter Abrechnung Ihren Tarif oder fügen Sie Credits für diese Partitur hinzu.",
  ru: "Доступных кредитов недостаточно для этой задачи. Проверьте тариф или добавьте кредиты для этой партитуры в разделе «Оплата».",
};
export function creditQuotaError(code: string | null | undefined, locale: SupportedLocale) {
  return code === "PLAN_JOB_QUOTA_EXCEEDED" ? messages[locale] : undefined;
}
