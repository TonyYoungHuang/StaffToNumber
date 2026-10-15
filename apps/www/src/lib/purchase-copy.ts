import type { SupportedLocale } from "@score/i18n";

const copy = {
  en: ["Choose your plan", "Sign in to continue", "Your plan stays selected. After signing in, secure checkout opens automatically.", "Other options / Use email", "Selected plan", "Opening checkout…", "Signed in. Opening secure checkout…", "Payment options", "Unable to open checkout. Please try again.", "Sign in to save your scores and manage your purchases.", "Forgot password?"],
  "zh-CN": ["选择适合你的套餐", "登录后继续", "已保留你选择的套餐。登录后将自动进入安全付款页面。", "其他方式 / 用邮箱", "已选套餐", "正在打开付款页面…", "登录成功，正在打开安全付款页面…", "其他支付方式", "暂时无法打开付款页面，请重试。", "登录以保存乐谱并管理已购套餐。", "忘记密码？"],
  "zh-TW": ["選擇適合你的方案", "登入後繼續", "已保留你選擇的方案。登入後將自動開啟安全付款頁面。", "其他方式 / 用電子郵件", "已選方案", "正在開啟付款頁面…", "登入成功，正在開啟安全付款頁面…", "其他付款方式", "暫時無法開啟付款頁面，請重試。", "登入以儲存樂譜並管理已購方案。", "忘記密碼？"],
  ja: ["プランを選択", "ログインして続ける", "選択したプランは保持されます。ログイン後、安全な決済ページが自動で開きます。", "その他の方法 / メールを使う", "選択中のプラン", "決済ページを開いています…", "ログインしました。安全な決済ページを開いています…", "その他の支払い方法", "決済ページを開けません。もう一度お試しください。", "ログインして楽譜を保存し、購入したプランを管理できます。", "パスワードを忘れた方"],
  ko: ["요금제 선택", "로그인하고 계속하기", "선택한 요금제가 유지됩니다. 로그인 후 안전한 결제 페이지가 자동으로 열립니다.", "다른 방법 / 이메일 사용", "선택한 요금제", "결제 페이지를 여는 중…", "로그인했습니다. 안전한 결제 페이지를 여는 중…", "다른 결제 방법", "결제 페이지를 열 수 없습니다. 다시 시도해 주세요.", "로그인하여 악보를 저장하고 구매한 요금제를 관리하세요.", "비밀번호를 잊으셨나요?"],
  fr: ["Choisissez votre formule", "Connectez-vous pour continuer", "Votre formule reste sélectionnée. Le paiement sécurisé s’ouvre automatiquement après connexion.", "Autres options / Utiliser un e-mail", "Formule sélectionnée", "Ouverture du paiement…", "Connexion réussie. Ouverture du paiement sécurisé…", "Autres moyens de paiement", "Impossible d’ouvrir le paiement. Réessayez.", "Connectez-vous pour enregistrer vos partitions et gérer vos achats.", "Mot de passe oublié ?"],
  es: ["Elige tu plan", "Inicia sesión para continuar", "Tu plan queda seleccionado. El pago seguro se abre automáticamente al iniciar sesión.", "Otras opciones / Usar correo", "Plan seleccionado", "Abriendo el pago…", "Sesión iniciada. Abriendo el pago seguro…", "Otras formas de pago", "No se puede abrir el pago. Inténtalo de nuevo.", "Inicia sesión para guardar partituras y gestionar tus compras.", "¿Olvidaste tu contraseña?"],
  de: ["Wählen Sie Ihren Tarif", "Anmelden und fortfahren", "Ihr Tarif bleibt ausgewählt. Nach der Anmeldung öffnet sich die sichere Zahlung automatisch.", "Weitere Optionen / E-Mail verwenden", "Ausgewählter Tarif", "Zahlung wird geöffnet…", "Angemeldet. Sichere Zahlung wird geöffnet…", "Weitere Zahlungsarten", "Die Zahlung konnte nicht geöffnet werden. Bitte erneut versuchen.", "Melden Sie sich an, um Partituren zu speichern und Käufe zu verwalten.", "Passwort vergessen?"],
  ru: ["Выберите тариф", "Войдите, чтобы продолжить", "Тариф останется выбранным. После входа защищённая оплата откроется автоматически.", "Другие способы / Электронная почта", "Выбранный тариф", "Открываем оплату…", "Вы вошли. Открываем защищённую оплату…", "Другие способы оплаты", "Не удалось открыть оплату. Попробуйте ещё раз.", "Войдите, чтобы сохранять партитуры и управлять покупками.", "Забыли пароль?"],
} as const satisfies Record<SupportedLocale, readonly string[]>;

export function getPurchaseFlowCopy(locale: SupportedLocale) {
  const [title, authTitle, authBody, emailAction, selected, loading, signedIn, paymentOptions, failed, accountBody, forgotPassword] = copy[locale];
  return { title, authTitle, authBody, emailAction, selected, loading, signedIn, paymentOptions, failed, accountBody, forgotPassword };
}
export type PurchaseFlowCopy = ReturnType<typeof getPurchaseFlowCopy>;

const recovery = {
  en: ["You have an existing purchase. Check the original order before starting another.", "Check original order", "Start a separate new purchase"],
  "zh-CN": ["已有购买订单，请先核验原订单；另购请选择新购买。", "核验原订单", "明确发起另一笔新购买"],
  "zh-TW": ["已有購買訂單，請先核驗原訂單；另購請選擇新購買。", "核驗原訂單", "另行發起一筆新購買"],
  ja: ["購入済みの注文があります。別の購入を始める前に元の注文を確認してください。", "元の注文を確認", "別の新しい購入を開始"],
  ko: ["기존 구매 주문이 있습니다. 새로 구매하기 전에 기존 주문을 확인하세요.", "기존 주문 확인", "별도의 새 구매 시작"],
  fr: ["Un achat existe déjà. Vérifiez la commande d’origine avant d’en commencer un autre.", "Vérifier la commande", "Commencer un autre achat"],
  es: ["Ya tienes una compra. Comprueba el pedido original antes de iniciar otra.", "Comprobar el pedido", "Iniciar otra compra nueva"],
  de: ["Ein Kauf ist bereits vorhanden. Prüfen Sie die ursprüngliche Bestellung vor einem weiteren Kauf.", "Bestellung prüfen", "Einen separaten neuen Kauf beginnen"],
  ru: ["У вас уже есть покупка. Проверьте исходный заказ перед новой покупкой.", "Проверить исходный заказ", "Начать отдельную новую покупку"],
} as const satisfies Record<SupportedLocale, readonly string[]>;

export function getPurchaseRecoveryCopy(locale: SupportedLocale) {
  const [found, resume, newPurchase] = recovery[locale];
  const cancelled = {
    en: "Checkout was cancelled. Your selection is restored; the original order remains available to check.",
    "zh-CN": "已返回原购买位置并恢复选择。可继续核验原订单；如已付款，请勿重复购买。",
    "zh-TW": "已返回原購買位置並恢復選擇。可繼續核驗原訂單；如已付款，請勿重複購買。",
    ja: "元の購入画面と選択を復元しました。お支払い済みの場合は再購入せず元の注文をご確認ください。",
    ko: "구매 위치와 선택을 복원했습니다. 결제했다면 다시 구매하지 말고 기존 주문을 확인하세요.",
    fr: "Votre sélection et votre page ont été restaurées. Si vous avez payé, vérifiez la commande initiale avant tout nouvel achat.",
    es: "Se han restaurado tu página y selección. Si ya has pagado, comprueba el pedido original antes de volver a comprar.",
    de: "Seite und Auswahl wurden wiederhergestellt. Wenn Sie bezahlt haben, prüfen Sie die ursprüngliche Bestellung vor einem weiteren Kauf.",
    ru: "Страница и выбор восстановлены. Если вы уже заплатили, проверьте исходный заказ перед новой покупкой.",
  } satisfies Record<SupportedLocale, string>;
  return { found, resume, newPurchase, cancelled: cancelled[locale] };
}
