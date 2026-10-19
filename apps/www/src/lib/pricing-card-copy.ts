import type { SupportedLocale } from "@score/i18n";
import type { PricingPlanDisplay } from "@score/shared";

// Body copy only. Keep SEO descriptions, FAQ schemas and metadata independent.
type PricingCardCopy = {
  intro: string;
  starter: string;
  pro: string;
  pass: string;
  benefits: readonly string[];
  reset: string;
  passTerms: string;
  limits: string;
  details: string;
};

const copy: Record<SupportedLocale, PricingCardCopy> = {
  en: {
    intro: "One score or a monthly allowance. All prices in USD.",
    starter: "For regular personal use", pro: "For more scores each month", pass: "One score and its extracted parts",
    benefits: ["Simple + complex scans · both lanes", "Edit, transpose and play", "Paid exports + part copies (Beta)"],
    reset: "UTC monthly reset · no rollover", passTerms: "No expiry · no auto-renewal", limits: "File checks and storage limits apply",
    details: "Learn more · file limits, credits and FAQ",
  },
  "zh-CN": {
    intro: "按单谱购买，或选择每月积分套餐。价格均为美元。",
    starter: "适合日常个人使用", pro: "适合每月处理更多乐谱", pass: "绑定一首乐谱及其提取分谱",
    benefits: ["简单／复杂识谱 · 双通道", "编辑、移调与播放", "付费格式导出与分谱副本（Beta）"],
    reset: "UTC 每月重置 · 不滚存", passTerms: "不过期 · 不自动续费", limits: "受文件预检与存储额度限制",
    details: "了解更多 · 文件限制、积分与常见问题",
  },
  "zh-TW": {
    intro: "購買單譜通行證，或選擇每月積分方案。價格均為美元。",
    starter: "適合日常個人使用", pro: "適合每月處理更多樂譜", pass: "綁定一首樂譜及其擷取分譜",
    benefits: ["簡單／複雜識譜 · 雙通道", "編輯、移調與播放", "付費格式匯出與分譜副本（Beta）"],
    reset: "UTC 每月重設 · 不累積", passTerms: "不過期 · 不自動續費", limits: "受檔案預檢與儲存額度限制",
    details: "了解更多 · 檔案限制、積分與常見問題",
  },
  ja: {
    intro: "1曲パス、または月間クレジットプラン。価格はすべて米ドルです。",
    starter: "日常の個人利用に", pro: "毎月多くの楽譜を扱う方に", pass: "1曲と抽出したパート譜専用",
    benefits: ["シンプル・複雑認識／両処理ルート", "編集・移調・再生", "有料形式の出力・パート譜（Beta）"],
    reset: "UTC暦月でリセット・繰越なし", passTerms: "有効期限・自動更新なし", limits: "ファイル事前検査・保存容量制限あり",
    details: "詳しく見る · ファイル制限・クレジット・FAQ",
  },
  ko: {
    intro: "한 곡 이용권 또는 월간 크레딧 요금제. 모든 가격은 미국 달러입니다.",
    starter: "일상적인 개인 이용", pro: "매월 더 많은 악보 처리", pass: "악보 한 곡과 추출한 파트 전용",
    benefits: ["단순·복잡 인식 / 두 처리 경로", "편집·조옮김·재생", "유료 형식 내보내기·파트 사본 (Beta)"],
    reset: "UTC 월별 초기화 · 이월 없음", passTerms: "만료·자동 갱신 없음", limits: "파일 사전 검사·저장 한도 적용",
    details: "자세히 · 파일 한도·크레딧·FAQ",
  },
  fr: {
    intro: "Un pass par partition ou des crédits mensuels. Prix en dollars US.",
    starter: "Pour un usage personnel régulier", pro: "Pour davantage de partitions", pass: "Une partition et ses parties extraites",
    benefits: ["Scans simples et complexes · deux voies", "Modifier, transposer et écouter", "Exports payants et parties (Beta)"],
    reset: "Reset mensuel UTC · sans report", passTerms: "Sans expiration ni renouvellement", limits: "Vérification du fichier et quota de stockage",
    details: "En savoir plus · limites, crédits et FAQ",
  },
  es: {
    intro: "Un pase por partitura o créditos mensuales. Precios en dólares US.",
    starter: "Para uso personal habitual", pro: "Para más partituras cada mes", pass: "Una partitura y sus partes extraídas",
    benefits: ["Escaneo simple y complejo · ambas vías", "Editar, transportar y reproducir", "Exportaciones de pago y partes (Beta)"],
    reset: "Reinicio mensual UTC · sin acumulación", passTerms: "Sin caducidad ni renovación automática", limits: "Revisión de archivo y límite de espacio",
    details: "Más información · límites, créditos y FAQ",
  },
  de: {
    intro: "Ein Partitur-Pass oder monatliche Credits. Alle Preise in US-Dollar.",
    starter: "Für regelmäßige private Nutzung", pro: "Für mehr Partituren pro Monat", pass: "Eine Partitur und ihre extrahierten Stimmen",
    benefits: ["Einfache und komplexe Scans · beide Wege", "Bearbeiten, transponieren, abspielen", "Bezahlte Exporte und Stimmen (Beta)"],
    reset: "UTC-Monatsreset · kein Übertrag", passTerms: "Kein Ablauf · keine automatische Verlängerung", limits: "Dateiprüfung und Speicherlimit gelten",
    details: "Mehr erfahren · Limits, Credits und FAQ",
  },
  ru: {
    intro: "Пакет для одной партитуры или месячные кредиты. Цены в долларах США.",
    starter: "Для регулярной личной работы", pro: "Для большего числа партитур", pass: "Одна партитура и извлечённые партии",
    benefits: ["Простые и сложные сканы · оба режима", "Правка, транспонирование, воспроизведение", "Платный экспорт и партии (Beta)"],
    reset: "Обновление по месяцам UTC · без переноса", passTerms: "Без срока действия и автопродления", limits: "Проверка файла и лимит хранения",
    details: "Подробнее · лимиты, кредиты и FAQ",
  },
};

export const getPricingCardCopy = (locale: SupportedLocale) => copy[locale];

// Full catalog fields remain unchanged. Only paid cards opt into compact mobile copy.
export function withMobilePricingCopy(locale: SupportedLocale, plan: PricingPlanDisplay) {
  if (plan.code === "free") return plan;
  const card = getPricingCardCopy(locale);
  return {
    ...plan,
    audienceShort: plan.code.startsWith("starter-") ? card.starter : card.pro,
    benefitsShort: card.benefits,
    // The localized catalog's second resource is the plan's storage allowance.
    resourcesShort: [plan.resources[1], card.reset],
  };
}
