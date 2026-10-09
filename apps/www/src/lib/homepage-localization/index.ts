import { localizeUsdText, type SupportedLocale } from "@score/i18n";
import type { PricingPlanDisplay } from "@score/shared";
import { homeOnPage } from "../home-on-page";
import { deHomepage } from "./locales/de";
import { enHomepage } from "./locales/en";
import { esHomepage } from "./locales/es";
import { frHomepage } from "./locales/fr";
import { jaHomepage } from "./locales/ja";
import { koHomepage } from "./locales/ko";
import { ruHomepage } from "./locales/ru";
import { zhCNHomepage } from "./locales/zh-CN";
import { zhTWHomepage } from "./locales/zh-TW";
import type { HomepageLocalization, HomepagePlanTranslation } from "./types";

export { HOMEPAGE_MEDIA_SOURCE_LOCALES, getHomepageMediaSourceLocale } from "./media";
export type {
  HomepageLocalization,
  HomepageMediaCopy,
  HomepagePageCopy,
  HomepagePlanTranslation,
  HomepagePlanTranslations,
  HomepageWorkbenchCopy,
} from "./types";

export const HOMEPAGE_LOCALIZATIONS = {
  en: enHomepage,
  "zh-CN": zhCNHomepage,
  "zh-TW": zhTWHomepage,
  ja: jaHomepage,
  ko: koHomepage,
  fr: frHomepage,
  es: esHomepage,
  de: deHomepage,
  ru: ruHomepage,
} as const satisfies Readonly<Record<SupportedLocale, HomepageLocalization>>;

function getHomepageWithAvailability(locale: SupportedLocale, availability?: { audioTranscriptionAvailable: boolean }): HomepageLocalization {
  const copy = HOMEPAGE_LOCALIZATIONS[locale];
  if ((locale === "en" || locale === "es") && availability?.audioTranscriptionAvailable === false) {
    const en = locale === "en";
    return { ...copy, page: { ...copy.page,
      capabilities: [copy.page.capabilities[0], copy.page.capabilities[1], copy.page.capabilities[2], copy.page.capabilities[3], [en ? "PDF to MusicXML" : "PDF a MusicXML", en ? "Recognize, review and save sheet music as MusicXML." : "Reconoce y revisa la partitura y guárdala como MusicXML.", "/pdf-to-musicxml"]],
      faqs: [
        copy.page.faqs[0],
        copy.page.faqs[1], copy.page.faqs[2],
        [copy.page.faqs[3][0], en ? "Audio and video import is not currently open to the public. Playback of structured scores and the available audio exports remain available." : "La importación de audio y vídeo aún no está abierta al público. Puedes seguir reproduciendo partituras estructuradas y usando las exportaciones de audio disponibles."], copy.page.faqs[4],
      ],
    } };
  }
  if ((locale !== "de" && locale !== "ru") || availability?.audioTranscriptionAvailable !== false) return copy;
  const de = locale === "de";
  const inputs = de ? "Laden Sie ein PDF, ein Notenbild oder eine MusicXML-Datei hoch." : "Загрузите PDF, изображение нот или файл MusicXML.";
  return { ...copy, page: { ...copy.page,
    schemaDescription: de ? "Importieren Sie PDF, Notenbilder oder MusicXML. Prüfen und bearbeiten Sie die erkannte Partitur, transponieren Sie, erstellen Sie Jianpu und nutzen Sie Wiedergabe und verfügbare Exporte." : "Импортируйте PDF, изображения нот или MusicXML. Проверяйте и исправляйте распознанную партитуру, транспонируйте, создавайте Jianpu, воспроизводите и экспортируйте в доступные форматы.",
    heroIntro: [inputs, copy.page.heroIntro[1], copy.page.heroIntro[2]],
    steps: [[copy.page.steps[0][0], inputs], copy.page.steps[1], copy.page.steps[2]],
    pipeline: [[copy.page.pipeline[0][0], "PDF / MusicXML"], copy.page.pipeline[1], copy.page.pipeline[2]],
    capabilities: [copy.page.capabilities[0], copy.page.capabilities[1], copy.page.capabilities[2], copy.page.capabilities[3], [de ? "PDF in MusicXML" : "PDF в MusicXML", de ? "Noten erkennen, prüfen und als MusicXML speichern." : "Распознайте ноты, проверьте их и сохраните MusicXML.", "/pdf-to-musicxml"]],
    faqs: [
      [copy.page.faqs[0][0], de ? "Nein. Erkennung aus PDF oder Bildern erfordert eine Prüfung. Komplexe oder schlecht lesbare Vorlagen können Korrekturen benötigen." : "Нет. Результат распознавания PDF или изображения нужно проверить. Сложные или плохо читаемые ноты могут потребовать исправлений."],
      copy.page.faqs[1], copy.page.faqs[2],
      [copy.page.faqs[3][0], de ? "Der Import von Audio und Video ist derzeit nicht öffentlich verfügbar. Die Wiedergabe strukturierter Partituren und verfügbare Audioexporte können Sie weiterhin nutzen." : "Импорт аудио и видео сейчас не открыт для общего доступа. Воспроизведение структурированных партитур и доступный экспорт аудио продолжают работать."], copy.page.faqs[4],
    ],
  } };
}

export function getHomepageLocalization(locale: SupportedLocale, availability?: { audioTranscriptionAvailable: boolean }): HomepageLocalization {
  const copy = getHomepageWithAvailability(locale, availability);
  const onPage = homeOnPage[locale];
  if (!onPage) return copy;
  return { ...copy, page: { ...copy.page, ...onPage.page, schemaDescription: onPage.description,
    faqs: [onPage.faq, copy.page.faqs[1], copy.page.faqs[2], copy.page.faqs[3], copy.page.faqs[4]],
  } };
}

export function localizeHomepagePlans(
  locale: SupportedLocale,
  plans: readonly PricingPlanDisplay[],
): readonly PricingPlanDisplay[] {
  const translations = getHomepageLocalization(locale).plans;
  return plans.map((plan) => ({
    ...plan,
    ...translations[plan.code],
    code: plan.code,
    price: localizeUsdText(plan.price, locale),
    featured: plan.featured,
  } satisfies PricingPlanDisplay));
}

export function getHomepagePlanTranslation(
  locale: SupportedLocale,
  code: PricingPlanDisplay["code"],
): HomepagePlanTranslation {
  return getHomepageLocalization(locale).plans[code];
}
