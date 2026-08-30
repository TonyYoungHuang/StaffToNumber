import { getLocaleConfig, type SupportedLocale } from "@score/i18n";

export type ProductMediaPresentation = {
  alt: string;
  evidence: string;
  sourceNote: string;
};

export type PendingProductMediaPresentation = {
  title: string;
  body: string;
  ariaLabel: string;
};

type ProductMediaPresentationFactory = (
  subject: string,
  sourceLabel: string,
  localized: boolean,
) => ProductMediaPresentation;

const presentationFactories = {
  en: (subject, sourceLabel, localized) => ({
    alt: localized ? `${subject} in the real product interface` : `${subject} in the ${sourceLabel} product interface`,
    evidence: localized
      ? "Captured from the current product interface as evidence of the real workflow."
      : `Captured from the current ${sourceLabel} product interface as evidence of the real workflow.`,
    sourceNote: localized ? "" : `This locale's capture is still pending, so the displayed media uses the ${sourceLabel} interface.`,
  }),
  "zh-CN": (subject, sourceLabel, localized) => ({
    alt: localized ? `${subject}的真实产品界面` : `${subject}的真实产品截图（${sourceLabel}界面）`,
    evidence: localized ? "截图来自当前产品界面，用于呈现真实工作流。" : `截图来自当前${sourceLabel}产品界面，用于呈现真实工作流。`,
    sourceNote: localized ? "" : `当前语言截图仍待生成，因此这里明确沿用${sourceLabel}界面。`,
  }),
  "zh-TW": (subject, sourceLabel, localized) => ({
    alt: localized ? `${subject}的真實產品介面` : `${subject}的真實產品截圖（${sourceLabel}介面）`,
    evidence: localized ? "截圖取自目前產品介面，用於呈現真實工作流程。" : `截圖取自目前${sourceLabel}產品介面，用於呈現真實工作流程。`,
    sourceNote: localized ? "" : `目前語言的截圖仍待產生，因此這裡明確沿用${sourceLabel}介面。`,
  }),
  ja: (subject, sourceLabel, localized) => ({
    alt: localized ? `実際の製品画面に表示された${subject}` : `${sourceLabel}の実際の製品画面に表示された${subject}`,
    evidence: localized ? "現在の製品画面から取得した、実際のワークフローを示すキャプチャです。" : `現在の${sourceLabel}製品画面から取得した、実際のワークフローを示すキャプチャです。`,
    sourceNote: localized ? "" : `この言語のキャプチャは作成待ちのため、表示中のメディアは${sourceLabel}画面です。`,
  }),
  ko: (subject, sourceLabel, localized) => ({
    alt: localized ? `실제 제품 인터페이스의 ${subject}` : `${sourceLabel} 실제 제품 인터페이스의 ${subject}`,
    evidence: localized ? "현재 제품 인터페이스에서 실제 작업 흐름을 보여 주기 위해 캡처했습니다." : `현재 ${sourceLabel} 제품 인터페이스에서 실제 작업 흐름을 보여 주기 위해 캡처했습니다.`,
    sourceNote: localized ? "" : `이 언어의 캡처는 아직 준비 중이므로 표시된 미디어는 ${sourceLabel} 인터페이스입니다.`,
  }),
  fr: (subject, sourceLabel, localized) => ({
    alt: localized ? `${subject} dans l’interface réelle du produit` : `${subject} dans l’interface réelle du produit en ${sourceLabel}`,
    evidence: localized ? "Capture de l’interface actuelle du produit attestant le parcours réel." : `Capture de l’interface actuelle du produit en ${sourceLabel} attestant le parcours réel.`,
    sourceNote: localized ? "" : `La capture dans cette langue reste à produire ; le média affiché utilise donc l’interface en ${sourceLabel}.`,
  }),
  es: (subject, sourceLabel, localized) => ({
    alt: localized ? `${subject} en la interfaz real del producto` : `${subject} en la interfaz real del producto en ${sourceLabel}`,
    evidence: localized ? "Captura de la interfaz actual del producto que demuestra el flujo real." : `Captura de la interfaz actual del producto en ${sourceLabel} que demuestra el flujo real.`,
    sourceNote: localized ? "" : `La captura en este idioma sigue pendiente; por eso el contenido mostrado usa la interfaz en ${sourceLabel}.`,
  }),
  de: (subject, sourceLabel, localized) => ({
    alt: localized ? `${subject} in der realen Produktoberfläche` : `${subject} in der realen Produktoberfläche auf ${sourceLabel}`,
    evidence: localized ? "Aufnahme der aktuellen Produktoberfläche als Nachweis des realen Arbeitsablaufs." : `Aufnahme der aktuellen Produktoberfläche auf ${sourceLabel} als Nachweis des realen Arbeitsablaufs.`,
    sourceNote: localized ? "" : `Die Aufnahme für diese Sprache steht noch aus; das angezeigte Medium verwendet daher die Oberfläche auf ${sourceLabel}.`,
  }),
  ru: (subject, sourceLabel, localized) => ({
    alt: localized ? `${subject} в реальном интерфейсе продукта` : `${subject} в реальном интерфейсе продукта на языке ${sourceLabel}`,
    evidence: localized ? "Снимок текущего интерфейса продукта, подтверждающий реальный рабочий процесс." : `Снимок текущего интерфейса продукта на языке ${sourceLabel}, подтверждающий реальный рабочий процесс.`,
    sourceNote: localized ? "" : `Снимок для этого языка ещё не готов, поэтому показан интерфейс на языке ${sourceLabel}.`,
  }),
} satisfies Record<SupportedLocale, ProductMediaPresentationFactory>;

export function getProductMediaPresentation(
  locale: SupportedLocale,
  sourceLocale: SupportedLocale,
  subject: string,
): ProductMediaPresentation {
  if (locale !== sourceLocale) {
    throw new Error(`Cross-locale product media is not displayable: requested ${locale}, source ${sourceLocale}.`);
  }
  return presentationFactories[locale](subject, getLocaleConfig(sourceLocale).label, locale === sourceLocale);
}

const pendingFactories = {
  en: (subject: string) => ({ title: "Localized media in progress", body: "A current product capture is being prepared for this language.", ariaLabel: `${subject}: localized product media in progress` }),
  "zh-CN": (subject: string) => ({ title: "本地化素材生成中", body: "当前语言的真实产品截图正在生成，完成前不会显示其他语言界面。", ariaLabel: `${subject}：本地化产品素材生成中` }),
  "zh-TW": (subject: string) => ({ title: "本地化素材製作中", body: "目前語言的真實產品截圖正在製作，完成前不會顯示其他語言介面。", ariaLabel: `${subject}：本地化產品素材製作中` }),
  ja: (subject: string) => ({ title: "ローカライズ画像を準備中", body: "この言語の実製品キャプチャを準備しています。完成まで他言語の画面は表示しません。", ariaLabel: `${subject}：ローカライズした製品メディアを準備中` }),
  ko: (subject: string) => ({ title: "현지화 미디어 준비 중", body: "이 언어의 실제 제품 화면을 준비하고 있습니다. 완료 전에는 다른 언어 화면을 표시하지 않습니다.", ariaLabel: `${subject}: 현지화 제품 미디어 준비 중` }),
  fr: (subject: string) => ({ title: "Média localisé en préparation", body: "Une capture réelle du produit est en cours de préparation dans cette langue. Aucune interface dans une autre langue n’est affichée entre-temps.", ariaLabel: `${subject} : média produit localisé en préparation` }),
  es: (subject: string) => ({ title: "Contenido localizado en preparación", body: "Estamos preparando una captura real del producto en este idioma. Mientras tanto no se muestra ninguna interfaz en otro idioma.", ariaLabel: `${subject}: contenido del producto localizado en preparación` }),
  de: (subject: string) => ({ title: "Lokalisierte Medien werden erstellt", body: "Eine reale Produktaufnahme in dieser Sprache wird vorbereitet. Bis dahin wird keine anderssprachige Oberfläche angezeigt.", ariaLabel: `${subject}: lokalisierte Produktmedien werden erstellt` }),
  ru: (subject: string) => ({ title: "Локализованный материал готовится", body: "Мы готовим снимок реального продукта на этом языке. До его завершения интерфейс на другом языке не показывается.", ariaLabel: `${subject}: локализованный материал продукта готовится` }),
} satisfies Record<SupportedLocale, (subject: string) => PendingProductMediaPresentation>;

export function getPendingProductMediaPresentation(locale: SupportedLocale, subject: string) {
  return pendingFactories[locale](subject);
}
