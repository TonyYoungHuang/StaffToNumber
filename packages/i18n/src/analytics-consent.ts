import type { SupportedLocale } from "./locales.ts";

export type AnalyticsConsentMessages = {
  ariaLabel: string;
  body: string;
  privacy: string;
  accept: string;
  decline: string;
};

export const ANALYTICS_CONSENT_MESSAGE_CATALOGS = {
  en: {
    ariaLabel: "Analytics cookie choice",
    body: "We use anonymous analytics only after you consent, to improve the website and product experience.",
    privacy: "Privacy details",
    accept: "Accept",
    decline: "Decline",
  },
  "zh-CN": {
    ariaLabel: "分析 Cookie 选择",
    body: "我们仅在你同意后使用匿名分析，以改进网站和产品体验。",
    privacy: "隐私说明",
    accept: "同意",
    decline: "拒绝",
  },
  "zh-TW": {
    ariaLabel: "分析 Cookie 選擇",
    body: "我們只會在你同意後使用匿名分析，以改善網站與產品體驗。",
    privacy: "隱私權說明",
    accept: "同意",
    decline: "拒絕",
  },
  ja: {
    ariaLabel: "解析 Cookie の選択",
    body: "同意いただいた場合にのみ匿名の利用状況を分析し、ウェブサイトと製品の体験を改善します。",
    privacy: "プライバシーの詳細",
    accept: "同意する",
    decline: "拒否する",
  },
  ko: {
    ariaLabel: "분석 쿠키 선택",
    body: "동의한 경우에만 익명 분석을 사용하여 웹사이트와 제품 경험을 개선합니다.",
    privacy: "개인정보 처리 안내",
    accept: "동의",
    decline: "거부",
  },
  fr: {
    ariaLabel: "Choix des cookies d’analyse",
    body: "Nous utilisons des données d’analyse anonymes uniquement après votre accord afin d’améliorer le site et l’expérience produit.",
    privacy: "Détails sur la confidentialité",
    accept: "Accepter",
    decline: "Refuser",
  },
  es: {
    ariaLabel: "Preferencias de cookies analíticas",
    body: "Solo usamos analítica anónima con tu consentimiento para mejorar el sitio web y la experiencia del producto.",
    privacy: "Detalles de privacidad",
    accept: "Aceptar",
    decline: "Rechazar",
  },
  de: {
    ariaLabel: "Auswahl der Analyse-Cookies",
    body: "Wir verwenden anonyme Analysedaten erst nach Ihrer Zustimmung, um die Website und das Produkterlebnis zu verbessern.",
    privacy: "Datenschutzhinweise",
    accept: "Akzeptieren",
    decline: "Ablehnen",
  },
  ru: {
    ariaLabel: "Настройка аналитических cookie",
    body: "Мы используем анонимную аналитику только с вашего согласия, чтобы улучшать сайт и работу с продуктом.",
    privacy: "Подробнее о конфиденциальности",
    accept: "Принять",
    decline: "Отклонить",
  },
} as const satisfies Record<SupportedLocale, AnalyticsConsentMessages>;

export function getAnalyticsConsentMessages(locale: SupportedLocale): AnalyticsConsentMessages {
  return ANALYTICS_CONSENT_MESSAGE_CATALOGS[locale];
}
