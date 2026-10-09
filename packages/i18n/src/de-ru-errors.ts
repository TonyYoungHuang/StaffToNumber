type ErrorCopy = { codes: Record<string, string>; legacy: Record<string, string>; fallback: string; network: string; session: string; forbidden: string; missing: string; tooLarge: string; busy: string };

export const deRuErrors: Record<"de" | "ru", ErrorCopy> = {
  de: {
    codes: {
      ACTIVE_RECURRING_SUBSCRIPTION: "Beenden Sie unter Abrechnung die automatische Verlängerung, bevor Sie einen Zugang ohne automatische Verlängerung kaufen.",
      ACCOUNT_REQUIRED: "Melden Sie sich an oder erstellen Sie ein Konto, bevor Sie bezahlen.",
      CHECKOUT_INTENT_NOTIFICATION_FAILED: "Ihre Kaufanfrage konnte nicht übermittelt werden. Versuchen Sie es später erneut. Es wurde keine Zahlung gestartet.",
      PAYMENT_PROVIDER_BUILDING: "Diese Zahlungsart ist noch nicht verfügbar. Ihre Anfrage wurde übermittelt; es wurde keine Zahlung gestartet.",
      PLAN_JOB_QUOTA_EXCEEDED: "Ihre Credits für diesen Monat sind aufgebraucht. Prüfen Sie Ihren Tarif unter Abrechnung.",
      PLAN_STORAGE_QUOTA_EXCEEDED: "Ihr Speicherplatz ist voll. Löschen Sie nicht benötigte Dateien oder prüfen Sie die verfügbaren Tarife.",
      RATE_LIMITED: "Zu viele Anfragen. Warten Sie einen Moment und versuchen Sie es erneut.",
      UPLOAD_FAILED: "Die Datei konnte nicht geprüft werden. Prüfen Sie Dateiformat und Dateigröße und versuchen Sie es erneut.",
      SCORE_REVIEW_REQUIRED: "Prüfen und bestätigen Sie die erkannte Partitur, bevor Sie dieses Werkzeug verwenden.",
      SCORE_PROCESSING: "Die Erkennung läuft noch. Warten Sie auf das Ergebnis und prüfen Sie anschließend die Partitur.",
      SCORE_NOT_READY: "Es ist noch keine verwendbare Partitur verfügbar. Starten Sie die Erkennung erneut oder importieren Sie eine andere Datei.",
      DELETION_CONFIRMATION_REQUIRED: "Geben Sie DELETE ein, um das Konto zu löschen.",
      PASSWORD_VERIFICATION_FAILED: "Das aktuelle Passwort ist falsch.",
      ACTIVATION_INVALID: "Dieser Aktivierungscode ist ungültig. Prüfen Sie den beim Kauf erhaltenen Code.",
      ACTIVATION_EXPIRED: "Dieser Aktivierungscode ist abgelaufen. Kontaktieren Sie den Support mit Ihrer Bestellnummer.",
      ACTIVATION_REVOKED: "Dieser Aktivierungscode wurde gesperrt. Kontaktieren Sie den Support.",
      ACTIVATION_ALREADY_USED: "Dieser Code wurde bereits eingelöst. Melden Sie sich beim zugehörigen Konto an.",
    },
    legacy: {
      "Email and password are required.": "Geben Sie Ihre E-Mail-Adresse und Ihr Passwort ein.",
      "Please enter a valid email address.": "Geben Sie eine gültige E-Mail-Adresse ein.",
      "Password must be at least 8 characters.": "Das Passwort muss mindestens 8 Zeichen lang sein.",
      "Email already registered.": "Für diese E-Mail-Adresse besteht bereits ein Konto. Melden Sie sich an oder setzen Sie Ihr Passwort zurück.",
      "Invalid email or password.": "E-Mail-Adresse oder Passwort ist falsch.",
      "Google sign-in is not configured.": "Die Anmeldung mit Google ist derzeit nicht verfügbar. Verwenden Sie Ihre E-Mail-Adresse.",
      "Google sign-in could not be verified. Please try again.": "Die Google-Anmeldung konnte nicht bestätigt werden. Versuchen Sie es erneut oder verwenden Sie Ihre E-Mail-Adresse.",
      "Reset token is required.": "Der Link zum Zurücksetzen ist unvollständig. Fordern Sie einen neuen Link an.",
      "This password reset link is invalid or expired.": "Dieser Link ist ungültig oder abgelaufen. Fordern Sie einen neuen Link an.",
      "Please choose a valid support category.": "Wählen Sie eine gültige Supportkategorie.",
      "Please enter a valid contact email address.": "Geben Sie eine gültige Kontakt-E-Mail-Adresse ein.",
      "Please enter a valid account email address.": "Geben Sie eine gültige Konto-E-Mail-Adresse ein.",
      "Please enter a short subject so support can triage the request.": "Geben Sie einen Betreff mit mindestens 4 Zeichen ein.",
      "Please describe the issue in a bit more detail.": "Beschreiben Sie das Problem mit mindestens 10 Zeichen.",
      "Could not save the support request.": "Ihre Anfrage konnte nicht gespeichert werden. Versuchen Sie es erneut oder kontaktieren Sie den Support per E-Mail.",
      "A valid checkout plan is required.": "Wählen Sie einen gültigen Tarif.",
      "Invalid purchase type or payment provider.": "Diese Kaufart ist mit dem gewählten Zahlungsanbieter nicht verfügbar.",
      "This payment provider is not enabled.": "Dieser Zahlungsanbieter ist derzeit nicht verfügbar. Wählen Sie eine andere Option.",
      "A registered account is required before payment.": "Melden Sie sich vor der Zahlung an.",
      "A valid registered account email is required.": "Geben Sie die E-Mail-Adresse des Kontos ein, das den Zugang erhalten soll.",
      "Payment order not found.": "Diese Bestellung wurde nicht gefunden. Wenn Sie bereits bezahlt haben, kontaktieren Sie vor einem weiteren Kauf den Support.",
      "Only pending payment orders can be cancelled.": "Diese Bestellung kann hier nicht mehr abgebrochen werden. Prüfen Sie den Status oder kontaktieren Sie den Support.",
      "Activation code is required.": "Geben Sie Ihren Aktivierungscode ein.",
    },
    fallback: "Die Anfrage konnte nicht abgeschlossen werden. Prüfen Sie Ihre Angaben oder kontaktieren Sie den Support, falls das Problem weiterhin besteht.",
    network: "Keine Verbindung. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.",
    session: "Ihre Sitzung ist abgelaufen oder ungültig. Melden Sie sich erneut an.",
    forbidden: "Ihr Konto hat keinen Zugriff auf diese Aktion.",
    missing: "Der angeforderte Inhalt wurde nicht gefunden oder ist nicht mehr verfügbar.",
    tooLarge: "Die Datei ist zu groß. Prüfen Sie die maximal erlaubte Dateigröße.",
    busy: "Der Dienst ist vorübergehend nicht verfügbar. Versuchen Sie es später erneut oder kontaktieren Sie den Support.",
  },
  ru: {
    codes: {
      ACTIVE_RECURRING_SUBSCRIPTION: "Отключите автопродление в разделе «Оплата», прежде чем покупать доступ без автопродления.",
      ACCOUNT_REQUIRED: "Войдите или создайте аккаунт перед оплатой.",
      CHECKOUT_INTENT_NOTIFICATION_FAILED: "Не удалось передать запрос на покупку. Попробуйте позже. Платёж не был начат.",
      PAYMENT_PROVIDER_BUILDING: "Этот способ оплаты пока недоступен. Запрос передан; платёж не был начат.",
      PLAN_JOB_QUOTA_EXCEEDED: "Кредиты на этот месяц закончились. Проверьте свой тариф в разделе «Оплата».",
      PLAN_STORAGE_QUOTA_EXCEEDED: "Хранилище заполнено. Удалите ненужные файлы или проверьте доступные тарифы.",
      RATE_LIMITED: "Слишком много запросов. Немного подождите и повторите попытку.",
      UPLOAD_FAILED: "Не удалось проверить файл. Проверьте его формат и размер и повторите попытку.",
      SCORE_REVIEW_REQUIRED: "Проверьте и подтвердите распознанные ноты перед использованием этого инструмента.",
      SCORE_PROCESSING: "Распознавание ещё выполняется. Дождитесь результата, затем проверьте ноты.",
      SCORE_NOT_READY: "Партитура пока недоступна. Запустите распознавание снова или импортируйте другой файл.",
      DELETION_CONFIRMATION_REQUIRED: "Введите DELETE, чтобы подтвердить удаление аккаунта.",
      PASSWORD_VERIFICATION_FAILED: "Текущий пароль неверен.",
      ACTIVATION_INVALID: "Код активации недействителен. Проверьте код, полученный при покупке.",
      ACTIVATION_EXPIRED: "Срок действия кода истёк. Обратитесь в поддержку и укажите номер заказа.",
      ACTIVATION_REVOKED: "Код активации заблокирован. Обратитесь в поддержку.",
      ACTIVATION_ALREADY_USED: "Этот код уже использован. Войдите в аккаунт, к которому он привязан.",
    },
    legacy: {
      "Email and password are required.": "Введите адрес электронной почты и пароль.",
      "Please enter a valid email address.": "Введите корректный адрес электронной почты.",
      "Password must be at least 8 characters.": "Пароль должен содержать не менее 8 символов.",
      "Email already registered.": "Аккаунт с таким адресом уже существует. Войдите или сбросьте пароль.",
      "Invalid email or password.": "Неверный адрес электронной почты или пароль.",
      "Google sign-in is not configured.": "Вход через Google сейчас недоступен. Войдите по электронной почте.",
      "Google sign-in could not be verified. Please try again.": "Не удалось подтвердить вход через Google. Повторите попытку или войдите по электронной почте.",
      "Reset token is required.": "Ссылка для сброса пароля неполная. Запросите новую ссылку.",
      "This password reset link is invalid or expired.": "Ссылка недействительна или срок её действия истёк. Запросите новую ссылку.",
      "Please choose a valid support category.": "Выберите категорию обращения.",
      "Please enter a valid contact email address.": "Введите корректный адрес для связи.",
      "Please enter a valid account email address.": "Введите корректный адрес электронной почты аккаунта.",
      "Please enter a short subject so support can triage the request.": "Введите тему обращения длиной не менее 4 символов.",
      "Please describe the issue in a bit more detail.": "Опишите проблему: не менее 10 символов.",
      "Could not save the support request.": "Не удалось сохранить обращение. Повторите попытку или напишите в поддержку.",
      "A valid checkout plan is required.": "Выберите действующий тариф.",
      "Invalid purchase type or payment provider.": "Этот вид покупки недоступен у выбранного платёжного сервиса.",
      "This payment provider is not enabled.": "Этот платёжный сервис сейчас недоступен. Выберите другой вариант.",
      "A registered account is required before payment.": "Войдите в свой аккаунт перед оплатой.",
      "A valid registered account email is required.": "Укажите адрес аккаунта, которому нужно предоставить доступ.",
      "Payment order not found.": "Заказ не найден. Если вы уже оплатили его, обратитесь в поддержку перед повторной покупкой.",
      "Only pending payment orders can be cancelled.": "Этот заказ уже нельзя отменить здесь. Проверьте его статус или обратитесь в поддержку.",
      "Activation code is required.": "Введите код активации.",
    },
    fallback: "Не удалось выполнить запрос. Проверьте введённые данные или обратитесь в поддержку, если проблема повторяется.",
    network: "Нет соединения. Проверьте подключение к интернету и повторите попытку.",
    session: "Сеанс истёк или недействителен. Войдите снова.",
    forbidden: "У вашего аккаунта нет доступа к этому действию.",
    missing: "Запрошенный материал не найден или больше недоступен.",
    tooLarge: "Файл слишком большой. Проверьте допустимый размер файла.",
    busy: "Сервис временно недоступен. Попробуйте позже или обратитесь в поддержку.",
  },
};

export function localizeDeRuError(input: { error?: string | null; code?: string | null; status?: number }, locale: "de" | "ru") {
  const copy = deRuErrors[locale];
  const aliases: Record<string, string> = { ACTIVATION_NOT_FOUND: "ACTIVATION_INVALID", ACTIVATION_DISABLED: "ACTIVATION_REVOKED", ACTIVATION_ALREADY_REDEEMED: "ACTIVATION_ALREADY_USED" };
  const known = input.code && copy.codes[aliases[input.code] ?? input.code] || input.error && copy.legacy[input.error];
  if (known) return known;
  if (input.status === 0) return copy.network;
  if (input.status === 401) return copy.session;
  if (input.status === 403) return copy.forbidden;
  if (input.status === 404) return copy.missing;
  if (input.status === 413) return copy.tooLarge;
  if (input.status === 429) return copy.codes.RATE_LIMITED;
  if (input.status && input.status >= 500) return copy.busy;
  return copy.fallback;
}
