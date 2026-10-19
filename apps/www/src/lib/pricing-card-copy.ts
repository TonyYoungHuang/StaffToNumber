import type { SupportedLocale } from "@score/i18n";

// Body copy only. Keep SEO descriptions, FAQ schemas and metadata independent.
type PricingCardCopy = {
  intro: string;
  reset: string;
  passTerms: string;
  limits: string;
  details: string;
};

const copy: Record<SupportedLocale, PricingCardCopy> = {
  en: {
    intro: "One score or a monthly allowance. All prices in USD.",
    reset: "UTC monthly reset · no rollover", passTerms: "No expiry · no auto-renewal", limits: "File checks and storage limits apply",
    details: "Learn more · file limits, credits and FAQ",
  },
  "zh-CN": {
    intro: "按单谱购买，或选择每月积分套餐。价格均为美元。",
    reset: "UTC 每月重置 · 不滚存", passTerms: "不过期 · 不自动续费", limits: "受文件预检与存储额度限制",
    details: "了解更多 · 文件限制、积分与常见问题",
  },
  "zh-TW": {
    intro: "購買單譜通行證，或選擇每月積分方案。價格均為美元。",
    reset: "UTC 每月重設 · 不累積", passTerms: "不過期 · 不自動續費", limits: "受檔案預檢與儲存額度限制",
    details: "了解更多 · 檔案限制、積分與常見問題",
  },
  ja: {
    intro: "1曲パス、または月間クレジットプラン。価格はすべて米ドルです。",
    reset: "UTC暦月でリセット・繰越なし", passTerms: "有効期限・自動更新なし", limits: "ファイル事前検査・保存容量制限あり",
    details: "詳しく見る · ファイル制限・クレジット・FAQ",
  },
  ko: {
    intro: "한 곡 이용권 또는 월간 크레딧 요금제. 모든 가격은 미국 달러입니다.",
    reset: "UTC 월별 초기화 · 이월 없음", passTerms: "만료·자동 갱신 없음", limits: "파일 사전 검사·저장 한도 적용",
    details: "자세히 · 파일 한도·크레딧·FAQ",
  },
  fr: {
    intro: "Un pass par partition ou des crédits mensuels. Prix en dollars US.",
    reset: "Reset mensuel UTC · sans report", passTerms: "Sans expiration ni renouvellement", limits: "Vérification du fichier et quota de stockage",
    details: "En savoir plus · limites, crédits et FAQ",
  },
  es: {
    intro: "Un pase por partitura o créditos mensuales. Precios en dólares US.",
    reset: "Reinicio mensual UTC · sin acumulación", passTerms: "Sin caducidad ni renovación automática", limits: "Revisión de archivo y límite de espacio",
    details: "Más información · límites, créditos y FAQ",
  },
  de: {
    intro: "Ein Partitur-Pass oder monatliche Credits. Alle Preise in US-Dollar.",
    reset: "UTC-Monatsreset · kein Übertrag", passTerms: "Kein Ablauf · keine automatische Verlängerung", limits: "Dateiprüfung und Speicherlimit gelten",
    details: "Mehr erfahren · Limits, Credits und FAQ",
  },
  ru: {
    intro: "Пакет для одной партитуры или месячные кредиты. Цены в долларах США.",
    reset: "Обновление по месяцам UTC · без переноса", passTerms: "Без срока действия и автопродления", limits: "Проверка файла и лимит хранения",
    details: "Подробнее · лимиты, кредиты и FAQ",
  },
};

export const getPricingCardCopy = (locale: SupportedLocale) => copy[locale];
