import { getScoreProcessingMessages, getScoreProcessingFailureMessages, getScoreRecognitionSupportMessage, getStagedUploadMessages, getRecognitionExperienceMessages, type SupportedLocale } from "@score/i18n";

const paymentOptions = {"en": "Payment options", "zh-CN": "付款选项", "zh-TW": "付款選項", "ja": "お支払いの選択", "ko": "결제 옵션", "fr": "Options de paiement", "es": "Opciones de pago", "de": "Zahlungsoptionen", "ru": "Варианты оплаты"};
const close = {"en": "Close", "zh-CN": "关闭", "zh-TW": "關閉", "ja": "閉じる", "ko": "닫기", "fr": "Fermer", "es": "Cerrar", "de": "Schließen", "ru": "Закрыть"};
const previewFailures = {"en": "The score preview could not be loaded. Try again or open the score in the app.", "zh-CN": "乐谱预览加载失败。请重试，或在应用中打开乐谱。", "zh-TW": "樂譜預覽載入失敗。請重試，或在應用程式中開啟樂譜。", "ja": "楽譜プレビューを読み込めません。再試行するか、アプリで楽譜を開いてください。", "ko": "악보 미리보기를 불러오지 못했습니다. 다시 시도하거나 앱에서 여세요.", "fr": "Impossible de charger l’aperçu. Réessayez ou ouvrez la partition dans l’application.", "es": "No se pudo cargar la vista previa. Reintenta o abre la partitura en la aplicación.", "de": "Die Vorschau konnte nicht geladen werden. Erneut versuchen oder in der App öffnen.", "ru": "Не удалось загрузить предпросмотр. Повторите попытку или откройте партитуру в приложении."};

/** Selected by the server: the browser receives only its current language. */
export function getHomeRuntimeCopy(locale: SupportedLocale) {
  return {
    paymentOptions: paymentOptions[locale],
    close: close[locale],
    previewFailure: previewFailures[locale],
    recognitionExperience: getRecognitionExperienceMessages(locale),
    processing: getScoreProcessingMessages(locale),
    staged: getStagedUploadMessages(locale),
    failure: {
      lowResolution: getScoreProcessingFailureMessages(locale, "too low interline").reason,
      timeout: getScoreProcessingFailureMessages(locale, "time-out").reason,
      unavailable: getScoreProcessingFailureMessages(locale, "not configured").reason,
      storage: getScoreProcessingFailureMessages(locale, "STORAGE_CAPACITY_REACHED").reason,
      generic: getScoreProcessingFailureMessages(locale, null).reason,
      recovery: getScoreProcessingFailureMessages(locale, null).recovery,
    },
    support: {
      READY: getScoreRecognitionSupportMessage(locale, "READY"),
      PDF_ADAPTIVE_RENDER: getScoreRecognitionSupportMessage(locale, "PDF_ADAPTIVE_RENDER"),
      PDF_INVALID: getScoreRecognitionSupportMessage(locale, "PDF_INVALID"),
      PDF_PAGE_PIXEL_LIMIT: getScoreRecognitionSupportMessage(locale, "PDF_PAGE_PIXEL_LIMIT"),
      PDF_TOTAL_PIXEL_LIMIT: getScoreRecognitionSupportMessage(locale, "PDF_TOTAL_PIXEL_LIMIT"),
      RECOGNITION_CAPACITY_LIMIT: getScoreRecognitionSupportMessage(locale, "RECOGNITION_CAPACITY_LIMIT"),
      fallback: getScoreRecognitionSupportMessage(locale, "unknown"),
    } as Record<string, string>,
  };
}

export type HomeRuntimeCopy = ReturnType<typeof getHomeRuntimeCopy>;
