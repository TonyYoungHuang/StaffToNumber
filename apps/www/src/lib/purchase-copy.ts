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
