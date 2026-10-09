import type { SupportedLocale } from "@score/i18n";

const copy = {
  en: ["Choose your plan", "Sign in to continue", "Your plan stays selected. After signing in, click it again to open secure checkout.", "Continue with email", "Selected plan", "Opening checkout…", "Signed in. Your plan is ready below.", "Payment options", "Unable to open checkout. Please try again.", "Sign in to save your scores and manage your purchases."],
  "zh-CN": ["选择适合你的套餐", "登录后继续", "已保留你选择的套餐。登录后，再点一次套餐即可进入安全付款页面。", "使用邮箱继续", "已选套餐", "正在打开付款页面…", "登录成功，已保留你选择的套餐。", "其他支付方式", "暂时无法打开付款页面，请重试。", "登录以保存乐谱并管理已购套餐。"],
  "zh-TW": ["選擇適合你的方案", "登入後繼續", "已保留你選擇的方案。登入後，再點一次方案即可進入安全付款頁面。", "使用電子郵件繼續", "已選方案", "正在開啟付款頁面…", "登入成功，已保留你選擇的方案。", "其他付款方式", "暫時無法開啟付款頁面，請重試。", "登入以儲存樂譜並管理已購方案。"],
  ja: ["プランを選択", "ログインして続ける", "選択したプランは保持されます。ログイン後、もう一度クリックすると安全な決済ページが開きます。", "メールで続ける", "選択中のプラン", "決済ページを開いています…", "ログインしました。プランは選択されたままです。", "その他の支払い方法", "決済ページを開けません。もう一度お試しください。", "ログインして楽譜を保存し、購入したプランを管理できます。"],
  ko: ["요금제 선택", "로그인하고 계속하기", "선택한 요금제가 유지됩니다. 로그인 후 다시 클릭하면 안전한 결제 페이지가 열립니다.", "이메일로 계속하기", "선택한 요금제", "결제 페이지를 여는 중…", "로그인했습니다. 선택한 요금제가 유지됩니다.", "다른 결제 방법", "결제 페이지를 열 수 없습니다. 다시 시도해 주세요.", "로그인하여 악보를 저장하고 구매한 요금제를 관리하세요."],
  fr: ["Choisissez votre formule", "Connectez-vous pour continuer", "Votre formule reste sélectionnée. Après connexion, cliquez à nouveau dessus pour ouvrir le paiement sécurisé.", "Continuer avec un e-mail", "Formule sélectionnée", "Ouverture du paiement…", "Connexion réussie. Votre formule reste sélectionnée.", "Autres moyens de paiement", "Impossible d’ouvrir le paiement. Réessayez.", "Connectez-vous pour enregistrer vos partitions et gérer vos achats."],
  es: ["Elige tu plan", "Inicia sesión para continuar", "Tu plan queda seleccionado. Tras iniciar sesión, vuelve a pulsarlo para abrir el pago seguro.", "Continuar con correo", "Plan seleccionado", "Abriendo el pago…", "Sesión iniciada. Tu plan sigue seleccionado.", "Otras formas de pago", "No se puede abrir el pago. Inténtalo de nuevo.", "Inicia sesión para guardar partituras y gestionar tus compras."],
  de: ["Wählen Sie Ihren Tarif", "Anmelden und fortfahren", "Ihr Tarif bleibt ausgewählt. Klicken Sie nach der Anmeldung erneut darauf, um die sichere Zahlung zu öffnen.", "Mit E-Mail fortfahren", "Ausgewählter Tarif", "Zahlung wird geöffnet…", "Angemeldet. Ihr Tarif bleibt ausgewählt.", "Weitere Zahlungsarten", "Die Zahlung konnte nicht geöffnet werden. Bitte erneut versuchen.", "Melden Sie sich an, um Partituren zu speichern und Käufe zu verwalten."],
  ru: ["Выберите тариф", "Войдите, чтобы продолжить", "Тариф останется выбранным. После входа нажмите на него ещё раз, чтобы открыть безопасную оплату.", "Продолжить с почтой", "Выбранный тариф", "Открываем оплату…", "Вы вошли. Тариф остаётся выбранным.", "Другие способы оплаты", "Не удалось открыть оплату. Попробуйте ещё раз.", "Войдите, чтобы сохранять партитуры и управлять покупками."],
} as const satisfies Record<SupportedLocale, readonly string[]>;

export function getPurchaseFlowCopy(locale: SupportedLocale) {
  const [title, authTitle, authBody, emailAction, selected, loading, signedIn, paymentOptions, failed, accountBody] = copy[locale];
  return { title, authTitle, authBody, emailAction, selected, loading, signedIn, paymentOptions, failed, accountBody };
}
export type PurchaseFlowCopy = ReturnType<typeof getPurchaseFlowCopy>;
