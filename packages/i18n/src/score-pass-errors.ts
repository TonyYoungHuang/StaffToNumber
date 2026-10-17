import type { SupportedLocale } from "./locales.ts";
import { getRecognitionExperienceMessages } from "./recognition-experience-messages.ts";
const messages: Record<SupportedLocale, readonly string[]> = {
  en: ["Choose a One Score Pass or plan to process another score.", "The processing credits shared by this score and its parts are insufficient. Add credits to this score or choose a plan.", "The uploaded score must contain at least one valid page.", "Use the export menu to queue this score export.", "Your lifetime free simple scan has been used.", "Complex recognition requires an active plan or a One Score Pass with enough credits."],
  "zh-CN": ["购买单谱通行证或套餐，即可处理新的乐谱。", "这份乐谱与其分谱共享的处理积分不足。请为这份乐谱补充积分，或选择套餐。", "上传的乐谱必须至少包含一页有效页面。", "请使用乐谱的导出菜单提交导出任务。", "你的终身免费简单识谱机会已使用。", "复杂识谱需要有效套餐，或积分足够的单谱通行证。"],
  "zh-TW": ["購買單譜通行證或方案，即可處理新的樂譜。", "這份樂譜與其分譜共享的處理點數不足。請為這份樂譜補充點數，或選擇方案。", "上傳的樂譜必須至少包含一頁有效頁面。", "請使用樂譜的匯出選單提交匯出工作。", "你的終身免費簡單辨識機會已使用。", "複雜辨識需要有效方案，或點數足夠的單譜通行證。"],
  ja: ["次の楽譜には1曲パスまたはプランをご購入ください。", "この楽譜とパートで共有する処理クレジットが不足しています。この楽譜にクレジットを追加するか、プランを選択してください。", "アップロードする楽譜には、有効なページが1ページ以上必要です。", "書き出しメニューから処理を開始してください。", "生涯1回の無料シンプル認識は使用済みです。", "複雑な認識には有効なプラン、または十分なクレジットがある1曲パスが必要です。"],
  ko: ["새 악보를 처리하려면 한 곡 이용권 또는 요금제를 구매하세요.", "이 악보와 파트가 공유하는 처리 크레딧이 부족합니다. 이 악보에 크레딧을 추가하거나 요금제를 선택하세요.", "업로드한 악보에는 유효한 페이지가 하나 이상 있어야 합니다.", "내보내기 메뉴에서 작업을 시작하세요.", "평생 1회 무료 간단 인식을 사용했습니다.", "복잡한 인식에는 유효한 요금제나 크레딧이 충분한 한 곡 이용권이 필요합니다."],
  fr: ["Choisissez un pass ou forfait pour traiter une autre partition.", "Les crédits de traitement partagés par cette partition et ses parties sont insuffisants. Ajoutez des crédits à cette partition ou choisissez un forfait.", "La partition importée doit contenir au moins une page valide.", "Utilisez le menu d’export pour lancer ce traitement.", "Votre reconnaissance simple gratuite à vie a été utilisée.", "La reconnaissance complexe nécessite un forfait actif ou un Pass une partition avec assez de crédits."],
  es: ["Elige un pase o plan para procesar otra partitura.", "Los créditos compartidos por esta partitura y sus partes son insuficientes. Añade créditos a esta partitura o elige un plan.", "La partitura subida debe contener al menos una página válida.", "Usa el menú de exportación para iniciar esta tarea.", "Ya has usado tu reconocimiento simple gratuito de por vida.", "El reconocimiento complejo requiere un plan activo o un Pase para una partitura con créditos suficientes."],
  de: ["Wählen Sie einen Pass oder Tarif für eine weitere Partitur.", "Die gemeinsamen Verarbeitungscredits dieser Partitur und ihrer Stimmen reichen nicht aus. Fügen Sie Credits hinzu oder wählen Sie einen Tarif.", "Die hochgeladene Partitur muss mindestens eine gültige Seite enthalten.", "Starten Sie den Auftrag über das Exportmenü.", "Ihre lebenslang einmalige kostenlose einfache Erkennung wurde genutzt.", "Komplexe Erkennung erfordert einen aktiven Tarif oder einen Einzelpartitur-Pass mit genügend Credits."],
  ru: ["Выберите пакет или тариф для обработки новой партитуры.", "Общих кредитов обработки этой партитуры и её партий недостаточно. Добавьте кредиты для этой партитуры или выберите тариф.", "Загруженная партитура должна содержать хотя бы одну корректную страницу.", "Запустите задание через меню экспорта.", "Единственное бесплатное простое распознавание уже использовано.", "Сложное распознавание требует активного тарифа или пакета для одной партитуры с достаточным числом кредитов."],
};
export function scorePassError(code: string | null | undefined, locale: SupportedLocale) {
  const index = ["SCORE_PASS_REQUIRED", "SCORE_PASS_CREDITS_EXHAUSTED", "SCORE_SOURCE_PAGE_COUNT_INVALID", "SCORE_PASS_QUEUED_EXPORT_REQUIRED", "FREE_TRIAL_OMR_LIMIT_REACHED", "COMPLEX_RECOGNITION_ENTITLEMENT_REQUIRED"].indexOf(code ?? "");
  if (index < 0) return undefined;
  if ([0, 4, 5].includes(index)) {
    const copy = getRecognitionExperienceMessages(locale);
    return `${messages[locale][index]} ${copy.passPlan} ${copy.starterPlan}`;
  }
  return messages[locale][index];
}
