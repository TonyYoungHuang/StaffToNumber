import { getScoreProcessingMessages, getScoreProcessingFailureMessages, getScoreRecognitionSupportMessage, getStagedUploadMessages, getRecognitionExperienceMessages, type SupportedLocale } from "@score/i18n";

/** Selected by the server: the browser receives only its current language. */
export function getHomeRuntimeCopy(locale: SupportedLocale) {
  return {
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
