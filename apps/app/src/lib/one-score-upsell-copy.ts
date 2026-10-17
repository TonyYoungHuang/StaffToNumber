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
    passNote: "Cards, Alipay or Link, as offered at Stripe checkout. One-time payment: one PDF or image score and its extracted parts share 10 credits, with no expiry. No fixed plan page allowance; files must pass the processing check. Standard and large-file lanes are included, with no extra lane fee.",
    subscriptionCta: "Compare Starter · US$7.99/month · 50 credits",
    loading: "Opening secure checkout…",
    signIn: "Sign in first to buy a One Score Pass.",
    failed: "Checkout could not start. Please try again.",
    building: "Secure checkout is being prepared. Please try again later.",
  },
  "zh-CN": {
    passCta: "单谱通行证 · US$2.99",
    passNote: "银行卡、支付宝或 Link 以 Stripe 收银台实际显示为准。一次付费，1 份 PDF 或图片乐谱与提取分谱共享 10 积分，不过期。套餐没有固定页数额度，文件须通过处理预检；包含普通和大文件通道，不另收通道费。",
    subscriptionCta: "比较 Starter · US$7.99/月 · 50 积分",
    loading: "正在打开安全支付页…",
    signIn: "请先登录，再购买单谱通行证。",
    failed: "暂时无法发起支付，请重试。",
    building: "在线支付正在准备中，请稍后再试。",
  },
  "zh-TW": {
    passCta: "單譜通行證 · US$2.99",
    passNote: "信用卡、支付寶或 Link 以 Stripe 結帳頁實際顯示為準。一次付款，1 份 PDF 或圖片樂譜與擷取分譜共用 10 點，不到期。方案沒有固定頁數額度，檔案須通過處理預檢；包含一般和大檔案通道，不另收通道費。",
    subscriptionCta: "比較 Starter · US$7.99/月 · 50 點",
    loading: "正在開啟安全付款頁…",
    signIn: "請先登入，再購買單譜通行證。",
    failed: "暫時無法發起付款，請重試。",
    building: "線上付款正在準備中，請稍後再試。",
  },
  ja: {
    passCta: "1曲パス · US$2.99",
    passNote: "カード、Alipay、LinkはStripeの決済画面に表示される方法を利用できます。1回払いで、PDFまたは画像の楽譜1曲と抽出パートが10クレジットを共有し、有効期限はありません。プラン固有の固定ページ枠はなく、ファイル確認が必要です。標準処理と大容量ファイル処理を含み、処理経路の追加料金はありません。",
    subscriptionCta: "Starterを比較 · 月額US$7.99 · 50クレジット",
    loading: "安全な決済ページを開いています…",
    signIn: "1曲パスを購入するには先にログインしてください。",
    failed: "決済を開始できませんでした。もう一度お試しください。",
    building: "安全な決済ページを準備中です。しばらくしてからお試しください。",
  },
  ko: {
    passCta: "한 곡 이용권 · US$2.99",
    passNote: "Stripe 결제 화면에 표시되는 카드, Alipay 또는 Link를 사용할 수 있습니다. 일회성 결제로 PDF 또는 이미지 악보 1개와 추출 파트가 만료 없는 10크레딧을 공유합니다. 요금제별 고정 페이지 할당량은 없으며 파일 처리 검사를 통과해야 합니다. 표준 처리와 대용량 파일 처리가 포함되며 경로 추가 요금은 없습니다.",
    subscriptionCta: "Starter 비교 · 월 US$7.99 · 50크레딧",
    loading: "안전한 결제 페이지를 여는 중…",
    signIn: "한 곡 이용권을 구매하려면 먼저 로그인하세요.",
    failed: "결제를 시작하지 못했습니다. 다시 시도하세요.",
    building: "안전한 결제를 준비 중입니다. 잠시 후 다시 시도하세요.",
  },
  fr: {
    passCta: "Pass une partition · US$2.99",
    passNote: "Cartes, Alipay ou Link, selon les options du paiement Stripe. Paiement unique : une partition PDF ou image et ses parties extraites partagent 10 crédits sans expiration. Aucun quota fixe de pages ; le fichier doit passer la vérification de traitement. Files standard et gros fichiers incluses, sans supplément de file.",
    subscriptionCta: "Comparer Starter · 7,99 USD/mois · 50 crédits",
    loading: "Ouverture du paiement sécurisé…",
    signIn: "Connectez-vous d’abord pour acheter un Pass une partition.",
    failed: "Le paiement n’a pas pu démarrer. Réessayez.",
    building: "Le paiement sécurisé est en préparation. Réessayez plus tard.",
  },
  es: {
    passCta: "Pase para una partitura · US$2.99",
    passNote: "Tarjetas, Alipay o Link, según las opciones del pago de Stripe. Pago único: una partitura PDF o imagen y sus partes extraídas comparten 10 créditos sin caducidad. No hay una cuota fija de páginas; el archivo debe pasar la comprobación de procesamiento. Incluye las vías estándar y de archivos grandes sin recargo de vía.",
    subscriptionCta: "Comparar Starter · 7,99 USD/mes · 50 créditos",
    loading: "Abriendo el pago seguro…",
    signIn: "Inicia sesión para comprar un Pase para una partitura.",
    failed: "No se pudo iniciar el pago. Inténtalo de nuevo.",
    building: "El pago seguro se está preparando. Inténtalo más tarde.",
  },
  de: {
    passCta: "Einzelpartitur-Pass · US$2.99",
    passNote: "Karten, Alipay oder Link, wie auf der Stripe-Zahlungsseite angeboten. Einmalzahlung: eine PDF- oder Bildpartitur und ihre extrahierten Stimmen teilen 10 Credits ohne Ablaufdatum. Kein festes Seitenkontingent; die Datei muss die Verarbeitungsprüfung bestehen. Standardverarbeitung und Verarbeitung großer Dateien sind ohne zusätzlichen Aufpreis für den Verarbeitungsweg enthalten.",
    subscriptionCta: "Starter vergleichen · 7,99 USD/Monat · 50 Credits",
    loading: "Sicherer Checkout wird geöffnet…",
    signIn: "Bitte zuerst anmelden, um einen Einzelpartitur-Pass zu kaufen.",
    failed: "Der Checkout konnte nicht gestartet werden. Bitte erneut versuchen.",
    building: "Der sichere Checkout wird vorbereitet. Bitte später erneut versuchen.",
  },
  ru: {
    passCta: "Пакет для одной партитуры · US$2.99",
    passNote: "Карты, Alipay или Link — в зависимости от вариантов на странице оплаты Stripe. Разовая оплата: одна партитура PDF или изображение и извлечённые партии делят 10 бессрочных кредитов. Фиксированной квоты страниц нет; файл должен пройти проверку обработки. Включены стандартная очередь и очередь больших файлов без доплаты за очередь.",
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
