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
    passNote: "Cards, Alipay or Link, as offered at Stripe checkout. One Score Pass · US$2.99. Bound to this score · One-time purchase. Unlock all export formats for this score (PDF / MusicXML / MIDI / MP3 and more). Scan more scores · Requires Starter / Pro (not included in One Score Pass).",
    subscriptionCta: "Compare Starter · US$7.99/month · 50 credits",
    loading: "Opening secure checkout…",
    signIn: "Sign in first to buy a One Score Pass.",
    failed: "Checkout could not start. Please try again.",
    building: "Secure checkout is being prepared. Please try again later.",
  },
  "zh-CN": {
    passCta: "单谱通行证 · US$2.99",
    passNote: "银行卡、支付宝或 Link 以 Stripe 收银台实际显示为准。 单谱通行证 · One Score Pass · US$2.99。绑定当前这首谱 · 一次性。解锁这首谱的全部导出格式（PDF / MusicXML / MIDI / MP3 等）。继续识别新乐谱 · 需 Starter / Pro（单谱通行证不含）.",
    subscriptionCta: "比较 Starter · US$7.99/月 · 50 积分",
    loading: "正在打开安全支付页…",
    signIn: "请先登录，再购买单谱通行证。",
    failed: "暂时无法发起支付，请重试。",
    building: "在线支付正在准备中，请稍后再试。",
  },
  "zh-TW": {
    passCta: "單譜通行證 · US$2.99",
    passNote: "信用卡、支付寶或 Link 以 Stripe 結帳頁實際顯示為準。 單譜通行證 · One Score Pass · US$2.99。綁定目前這首譜 · 一次性。解鎖這首譜的全部匯出格式（PDF / MusicXML / MIDI / MP3 等）。繼續識別新樂譜 · 需 Starter / Pro（單譜通行證不含）.",
    subscriptionCta: "比較 Starter · US$7.99/月 · 50 點",
    loading: "正在開啟安全付款頁…",
    signIn: "請先登入，再購買單譜通行證。",
    failed: "暫時無法發起付款，請重試。",
    building: "線上付款正在準備中，請稍後再試。",
  },
  ja: {
    passCta: "1曲パス · US$2.99",
    passNote: "カード、Alipay、LinkはStripeの決済画面に表示される方法を利用できます。 One Score Pass · US$2.99. この楽譜専用 · 買い切り. この楽譜の全書き出し形式を利用（PDF / MusicXML / MIDI / MP3 など）. 新しい楽譜を認識 · Starter / Proが必要（One Score Passには含まれません）.",
    subscriptionCta: "Starterを比較 · 月額US$7.99 · 50クレジット",
    loading: "安全な決済ページを開いています…",
    signIn: "1曲パスを購入するには先にログインしてください。",
    failed: "決済を開始できませんでした。もう一度お試しください。",
    building: "安全な決済ページを準備中です。しばらくしてからお試しください。",
  },
  ko: {
    passCta: "한 곡 이용권 · US$2.99",
    passNote: "Stripe 결제 화면에 표시되는 카드, Alipay 또는 Link를 사용할 수 있습니다. One Score Pass · US$2.99. 현재 악보 전용 · 일회성 구매. 이 악보의 모든 내보내기 형식 이용 (PDF / MusicXML / MIDI / MP3 등). 새 악보 추가 인식 · Starter / Pro 필요 (One Score Pass 제외).",
    subscriptionCta: "Starter 비교 · 월 US$7.99 · 50크레딧",
    loading: "안전한 결제 페이지를 여는 중…",
    signIn: "한 곡 이용권을 구매하려면 먼저 로그인하세요.",
    failed: "결제를 시작하지 못했습니다. 다시 시도하세요.",
    building: "안전한 결제를 준비 중입니다. 잠시 후 다시 시도하세요.",
  },
  fr: {
    passCta: "Pass une partition · US$2.99",
    passNote: "Cartes, Alipay ou Link, selon les options du paiement Stripe. One Score Pass · US$2.99. Lié à cette partition · Achat unique. Débloquez tous les formats d’export de cette partition (PDF / MusicXML / MIDI / MP3 et plus). Scanner d’autres partitions · Nécessite Starter / Pro (non inclus dans One Score Pass).",
    subscriptionCta: "Comparer Starter · 7,99 USD/mois · 50 crédits",
    loading: "Ouverture du paiement sécurisé…",
    signIn: "Connectez-vous d’abord pour acheter un Pass une partition.",
    failed: "Le paiement n’a pas pu démarrer. Réessayez.",
    building: "Le paiement sécurisé est en préparation. Réessayez plus tard.",
  },
  es: {
    passCta: "Pase para una partitura · US$2.99",
    passNote: "Tarjetas, Alipay o Link, según las opciones del pago de Stripe. One Score Pass · US$2.99. Vinculado a esta partitura · Pago único. Desbloquea todos los formatos de exportación de esta partitura (PDF / MusicXML / MIDI / MP3 y más). Escanear más partituras · Requiere Starter / Pro (no incluido en One Score Pass).",
    subscriptionCta: "Comparar Starter · 7,99 USD/mes · 50 créditos",
    loading: "Abriendo el pago seguro…",
    signIn: "Inicia sesión para comprar un Pase para una partitura.",
    failed: "No se pudo iniciar el pago. Inténtalo de nuevo.",
    building: "El pago seguro se está preparando. Inténtalo más tarde.",
  },
  de: {
    passCta: "Einzelpartitur-Pass · US$2.99",
    passNote: "Karten, Alipay oder Link, wie auf der Stripe-Zahlungsseite angeboten. One Score Pass · US$2.99. An diese Partitur gebunden · Einmaliger Kauf. Alle Exportformate für diese Partitur freischalten (PDF / MusicXML / MIDI / MP3 und mehr). Weitere Partituren scannen · Starter / Pro erforderlich (nicht im One Score Pass enthalten).",
    subscriptionCta: "Starter vergleichen · 7,99 USD/Monat · 50 Credits",
    loading: "Sicherer Checkout wird geöffnet…",
    signIn: "Bitte zuerst anmelden, um einen Einzelpartitur-Pass zu kaufen.",
    failed: "Der Checkout konnte nicht gestartet werden. Bitte erneut versuchen.",
    building: "Der sichere Checkout wird vorbereitet. Bitte später erneut versuchen.",
  },
  ru: {
    passCta: "Пакет для одной партитуры · US$2.99",
    passNote: "Карты, Alipay или Link — в зависимости от вариантов на странице оплаты Stripe. One Score Pass · US$2.99. Для этой партитуры · Разовая покупка. Все форматы экспорта этой партитуры (PDF / MusicXML / MIDI / MP3 и другие). Сканирование новых партитур · Нужен Starter / Pro (не входит в One Score Pass).",
    subscriptionCta: "Сравнить Starter · 7,99 USD/месяц · 50 кредитов",
    loading: "Открываем защищённую оплату…",
    signIn: "Сначала войдите, чтобы купить пакет для одной партитуры.",
    failed: "Не удалось начать оплату. Попробуйте ещё раз.",
    building: "Защищённая оплата готовится. Попробуйте позже.",
  },
};

export function getOneScoreUpsellCopy(locale: SupportedLocale): OneScoreUpsellCopy {
  return catalog[locale] ?? catalog.en;
}
