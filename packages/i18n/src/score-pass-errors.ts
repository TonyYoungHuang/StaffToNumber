import type { SupportedLocale } from "./locales.ts";
const messages: Record<SupportedLocale, readonly string[]> = {
  en: ["Buy a One Score Pass or choose a subscription to process another score.", "This score’s 10 processing credits have been used. Choose a subscription for more processing.", "A One Score Pass supports one score of up to 5 pages.", "Use the export menu to queue this score export."],
  "zh-CN": ["购买单曲处理包或订阅套餐，即可处理下一首乐谱。", "这首乐谱的 10 个积分已用完。需要继续处理时可选择订阅套餐。", "单曲处理包支持一首乐谱，最多 5 页。", "请使用乐谱的导出菜单提交导出任务。"],
  "zh-TW": ["購買單曲處理包或訂閱方案，即可處理下一首樂譜。", "這首樂譜的 10 個點數已用完。需要繼續處理時可選擇訂閱方案。", "單曲處理包支援一首樂譜，最多 5 頁。", "請使用樂譜的匯出選單提交匯出工作。"],
  ja: ["次の楽譜には1曲パスまたは定期プランをご購入ください。", "この楽譜の10クレジットを使い切りました。続けるには定期プランを選択してください。", "1曲パスは1曲、最大5ページに対応します。", "書き出しメニューから処理を開始してください。"],
  ko: ["다음 악보를 처리하려면 한 곡 이용권 또는 구독을 구매하세요.", "이 악보의 크레딧 10개를 모두 사용했습니다. 계속 처리하려면 구독을 선택하세요.", "한 곡 이용권은 악보 1곡, 최대 5페이지까지 지원합니다.", "내보내기 메뉴에서 작업을 시작하세요."],
  fr: ["Achetez un pass ou choisissez un abonnement pour traiter une autre partition.", "Les 10 crédits de cette partition sont épuisés. Choisissez un abonnement pour continuer.", "Un pass couvre une partition de 5 pages maximum.", "Utilisez le menu d’export pour lancer ce traitement."],
  es: ["Compra un pase o elige una suscripción para procesar otra partitura.", "Se han agotado los 10 créditos de esta partitura. Elige una suscripción para continuar.", "Un pase cubre una partitura de hasta 5 páginas.", "Usa el menú de exportación para iniciar esta tarea."],
  de: ["Kaufen Sie einen Pass oder wählen Sie ein Abo für eine weitere Partitur.", "Die 10 Guthaben dieser Partitur sind aufgebraucht. Wählen Sie ein Abo für weitere Verarbeitung.", "Ein Pass gilt für eine Partitur mit bis zu 5 Seiten.", "Starten Sie den Auftrag über das Exportmenü."],
  ru: ["Купите пакет или подписку для обработки следующей партитуры.", "Все 10 кредитов этой партитуры израсходованы. Для продолжения выберите подписку.", "Пакет рассчитан на одну партитуру объёмом до 5 страниц.", "Запустите задание через меню экспорта."],
};
export function scorePassError(code: string | null | undefined, locale: SupportedLocale) {
  const index = ["SCORE_PASS_REQUIRED", "SCORE_PASS_CREDITS_EXHAUSTED", "SCORE_PASS_PAGE_LIMIT", "SCORE_PASS_QUEUED_EXPORT_REQUIRED"].indexOf(code ?? "");
  return index >= 0 ? messages[locale][index] : undefined;
}
