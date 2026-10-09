import type { SupportedLocale } from "@score/i18n";

/**
 * Post-free-preview upsell copy. One Score Pass (US$2.99, one-time) is the primary
 * "process another score" action; subscriptions are secondary. Chinese locales get a
 * separate activation-code CTA so card checkout and code redemption are never one button.
 */
export type OneScoreUpsellCopy = {
  passCta: string;
  passNote: string;
  subscriptionCta: string;
  activationCta: string;
  activationNote: string;
  loading: string;
  signIn: string;
  failed: string;
  building: string;
};

const catalog: Record<SupportedLocale, OneScoreUpsellCopy> = {
  en: {
    passCta: "Process another score · US$2.99",
    passNote: "One Score Pass · one-time payment, no subscription · 1 new PDF or image score, up to 5 pages",
    subscriptionCta: "Or compare subscription plans",
    activationCta: "Redeem activation code",
    activationNote: "",
    loading: "Opening secure checkout…",
    signIn: "Sign in first to buy a One Score Pass.",
    failed: "Checkout could not start. Please try again.",
    building: "Card checkout is being prepared. Your purchase request has been recorded.",
  },
  "zh-CN": {
    passCta: "银行卡支付：单曲处理包 US$2.99",
    passNote: "国际银行卡在线支付（Stripe）· 一次付费、无订阅 · 1 首新的 PDF 或图片乐谱，最多 5 页",
    subscriptionCta: "银行卡订阅套餐（Starter / Converter Pro）",
    activationCta: "已有激活码？去兑换",
    activationNote: "通过店铺购买的激活码请在兑换页输入，无需再在线付款。",
    loading: "正在打开安全支付页…",
    signIn: "请先登录，再购买单曲处理包。",
    failed: "暂时无法发起支付，请重试。",
    building: "银行卡支付正在准备中，已记录你的购买请求。",
  },
  "zh-TW": {
    passCta: "信用卡付款：單曲處理包 US$2.99",
    passNote: "國際信用卡線上付款（Stripe）· 一次付費、無訂閱 · 1 首新的 PDF 或圖片樂譜，最多 5 頁",
    subscriptionCta: "信用卡訂閱方案（Starter / Converter Pro）",
    activationCta: "已有啟用碼？前往兌換",
    activationNote: "透過商店購買的啟用碼請在兌換頁輸入，無需再線上付款。",
    loading: "正在開啟安全付款頁…",
    signIn: "請先登入，再購買單曲處理包。",
    failed: "暫時無法發起付款，請重試。",
    building: "信用卡付款正在準備中，已記錄你的購買請求。",
  },
  ja: {
    passCta: "別の楽譜を処理する · US$2.99",
    passNote: "1曲パス · 1回払い・定期購入なし · 新しいPDF・画像の楽譜1曲（最大5ページ）",
    subscriptionCta: "サブスクリプションプランを比較",
    activationCta: "アクティベーションコードを利用",
    activationNote: "",
    loading: "安全な決済ページを開いています…",
    signIn: "1曲パスを購入するには先にログインしてください。",
    failed: "決済を開始できませんでした。もう一度お試しください。",
    building: "カード決済を準備中です。購入リクエストは記録されました。",
  },
  ko: {
    passCta: "다른 악보 처리 · US$2.99",
    passNote: "한 곡 이용권 · 일회성 결제, 구독 없음 · 새 PDF 또는 이미지 악보 1곡(최대 5페이지)",
    subscriptionCta: "구독 요금제 비교",
    activationCta: "활성화 코드 사용",
    activationNote: "",
    loading: "안전한 결제 페이지를 여는 중…",
    signIn: "한 곡 이용권을 구매하려면 먼저 로그인하세요.",
    failed: "결제를 시작하지 못했습니다. 다시 시도하세요.",
    building: "카드 결제를 준비 중입니다. 구매 요청이 기록되었습니다.",
  },
  fr: {
    passCta: "Traiter une autre partition · US$2.99",
    passNote: "Pass une partition · paiement unique, sans abonnement · 1 nouvelle partition PDF ou image, 5 pages max.",
    subscriptionCta: "Ou comparer les abonnements",
    activationCta: "Utiliser un code d’activation",
    activationNote: "",
    loading: "Ouverture du paiement sécurisé…",
    signIn: "Connectez-vous d’abord pour acheter un Pass une partition.",
    failed: "Le paiement n’a pas pu démarrer. Réessayez.",
    building: "Le paiement par carte est en préparation. Votre demande a été enregistrée.",
  },
  es: {
    passCta: "Procesar otra partitura · US$2.99",
    passNote: "Pase para una partitura · pago único, sin suscripción · 1 nueva partitura PDF o imagen, hasta 5 páginas",
    subscriptionCta: "O comparar planes de suscripción",
    activationCta: "Canjear código de activación",
    activationNote: "",
    loading: "Abriendo el pago seguro…",
    signIn: "Inicia sesión para comprar un Pase para una partitura.",
    failed: "No se pudo iniciar el pago. Inténtalo de nuevo.",
    building: "El pago con tarjeta se está preparando. Hemos registrado tu solicitud.",
  },
  de: {
    passCta: "Weitere Partitur verarbeiten · US$2.99",
    passNote: "Einzelpartitur-Pass · Einmalzahlung, kein Abo · 1 neue Partitur als PDF oder Bild, bis zu 5 Seiten",
    subscriptionCta: "Oder Abo-Pläne vergleichen",
    activationCta: "Aktivierungscode einlösen",
    activationNote: "",
    loading: "Sicherer Checkout wird geöffnet…",
    signIn: "Bitte zuerst anmelden, um einen Einzelpartitur-Pass zu kaufen.",
    failed: "Der Checkout konnte nicht gestartet werden. Bitte erneut versuchen.",
    building: "Die Kartenzahlung wird vorbereitet. Ihre Kaufanfrage wurde gespeichert.",
  },
  ru: {
    passCta: "Обработать ещё одну партитуру · US$2.99",
    passNote: "Пакет для одной партитуры · разовая оплата, без подписки · 1 новая партитура PDF или изображение, до 5 страниц",
    subscriptionCta: "Или сравнить подписки",
    activationCta: "Активировать код",
    activationNote: "",
    loading: "Открываем защищённую оплату…",
    signIn: "Сначала войдите, чтобы купить пакет для одной партитуры.",
    failed: "Не удалось начать оплату. Попробуйте ещё раз.",
    building: "Оплата картой готовится. Ваш запрос на покупку сохранён.",
  },
};

export function getOneScoreUpsellCopy(locale: SupportedLocale): OneScoreUpsellCopy {
  return catalog[locale] ?? catalog.en;
}

/** Chinese locales show activation-code redemption as its own CTA, separate from card checkout. */
export function showsSeparateActivationCta(locale: SupportedLocale) {
  return locale === "zh-CN" || locale === "zh-TW";
}
