import type { SupportedLocale } from "@score/i18n";

/**
 * Post-free-preview upsell copy. One Score Pass (US$2.99, one-time) is the primary
 * purchase action; subscriptions are secondary.
 */
export type OneScoreUpsellCopy = {
  passCta: string;
  passNote: string;
  subscriptionCta: string;
  loading: string;
  signIn: string;
  failed: string;
  building: string;
};

const catalog: Record<SupportedLocale, OneScoreUpsellCopy> = {
  en: {
    passCta: "One Score Pass · US$2.99",
    passNote: "Cards, Alipay or Link, as offered at Stripe Checkout · One Score Pass · one-time payment, no subscription · 1 new PDF or image score, unlimited pages",
    subscriptionCta: "Or compare subscription plans",
    loading: "Opening secure checkout…",
    signIn: "Sign in first to buy a One Score Pass.",
    failed: "Checkout could not start. Please try again.",
    building: "Secure checkout is being prepared. Please try again later.",
  },
  "zh-CN": {
    passCta: "单曲处理包 · US$2.99",
    passNote: "可使用银行卡、支付宝或 Link，以 Stripe 收银台实际显示为准 · 一次付费、无订阅 · 1 首新的 PDF 或图片乐谱，页数不限",
    subscriptionCta: "订阅套餐（Starter / Converter Pro）",
    loading: "正在打开安全支付页…",
    signIn: "请先登录，再购买单曲处理包。",
    failed: "暂时无法发起支付，请重试。",
    building: "在线支付正在准备中，请稍后再试。",
  },
  "zh-TW": {
    passCta: "單曲處理包 · US$2.99",
    passNote: "可使用信用卡、支付寶或 Link，以 Stripe 結帳頁實際顯示為準 · 一次付費、無訂閱 · 1 首新的 PDF 或圖片樂譜，頁數不限",
    subscriptionCta: "訂閱方案（Starter / Converter Pro）",
    loading: "正在開啟安全付款頁…",
    signIn: "請先登入，再購買單曲處理包。",
    failed: "暫時無法發起付款，請重試。",
    building: "線上付款正在準備中，請稍後再試。",
  },
  ja: {
    passCta: "1曲パス · US$2.99",
    passNote: "Stripe の決済画面で表示されるカード、Alipay、Link を利用できます · 1曲パス · 1回払い・定期購入なし · 新しいPDF・画像の楽譜1曲（ページ数無制限）",
    subscriptionCta: "サブスクリプションプランを比較",
    loading: "安全な決済ページを開いています…",
    signIn: "1曲パスを購入するには先にログインしてください。",
    failed: "決済を開始できませんでした。もう一度お試しください。",
    building: "安全な決済ページを準備中です。しばらくしてからお試しください。",
  },
  ko: {
    passCta: "한 곡 이용권 · US$2.99",
    passNote: "Stripe 결제 화면에 표시되는 카드, Alipay 또는 Link를 사용할 수 있습니다 · 한 곡 이용권 · 일회성 결제, 구독 없음 · 새 PDF 또는 이미지 악보 1곡(페이지 수 제한 없음)",
    subscriptionCta: "구독 요금제 비교",
    loading: "안전한 결제 페이지를 여는 중…",
    signIn: "한 곡 이용권을 구매하려면 먼저 로그인하세요.",
    failed: "결제를 시작하지 못했습니다. 다시 시도하세요.",
    building: "안전한 결제를 준비 중입니다. 잠시 후 다시 시도하세요.",
  },
  fr: {
    passCta: "Pass une partition · US$2.99",
    passNote: "Cartes, Alipay ou Link, selon les options proposées par Stripe Checkout · Pass une partition · paiement unique, sans abonnement · 1 nouvelle partition PDF ou image, nombre de pages illimité",
    subscriptionCta: "Ou comparer les abonnements",
    loading: "Ouverture du paiement sécurisé…",
    signIn: "Connectez-vous d’abord pour acheter un Pass une partition.",
    failed: "Le paiement n’a pas pu démarrer. Réessayez.",
    building: "Le paiement sécurisé est en préparation. Réessayez plus tard.",
  },
  es: {
    passCta: "Pase para una partitura · US$2.99",
    passNote: "Tarjetas, Alipay o Link, según las opciones de Stripe Checkout · Pase para una partitura · pago único, sin suscripción · 1 nueva partitura PDF o imagen, páginas ilimitadas",
    subscriptionCta: "O comparar planes de suscripción",
    loading: "Abriendo el pago seguro…",
    signIn: "Inicia sesión para comprar un Pase para una partitura.",
    failed: "No se pudo iniciar el pago. Inténtalo de nuevo.",
    building: "El pago seguro se está preparando. Inténtalo más tarde.",
  },
  de: {
    passCta: "Einzelpartitur-Pass · US$2.99",
    passNote: "Karten, Alipay oder Link, wie im Stripe-Checkout angeboten · Einzelpartitur-Pass · Einmalzahlung, kein Abo · 1 neue Partitur als PDF oder Bild, unbegrenzte Seitenzahl",
    subscriptionCta: "Oder Abo-Pläne vergleichen",
    loading: "Sicherer Checkout wird geöffnet…",
    signIn: "Bitte zuerst anmelden, um einen Einzelpartitur-Pass zu kaufen.",
    failed: "Der Checkout konnte nicht gestartet werden. Bitte erneut versuchen.",
    building: "Der sichere Checkout wird vorbereitet. Bitte später erneut versuchen.",
  },
  ru: {
    passCta: "Пакет для одной партитуры · US$2.99",
    passNote: "Карты, Alipay или Link — в зависимости от вариантов в Stripe Checkout · Пакет для одной партитуры · разовая оплата, без подписки · 1 новая партитура PDF или изображение, без ограничений по числу страниц",
    subscriptionCta: "Или сравнить подписки",
    loading: "Открываем защищённую оплату…",
    signIn: "Сначала войдите, чтобы купить пакет для одной партитуры.",
    failed: "Не удалось начать оплату. Попробуйте ещё раз.",
    building: "Защищённая оплата готовится. Попробуйте позже.",
  },
};

export function getOneScoreUpsellCopy(locale: SupportedLocale): OneScoreUpsellCopy {
  return catalog[locale] ?? catalog.en;
}
