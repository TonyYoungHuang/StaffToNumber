import { validateCheckoutReturnPath, type CheckoutReturnSite } from "./checkout-return.ts";

/** One language input for the OAuth screen, GIS scripts, buttons and HTML. */
export const GOOGLE_LOCALES = {
  en: { hl: "en", buttonLocale: "en", htmlLang: "en" },
  "zh-CN": { hl: "zh-CN", buttonLocale: "zh_CN", htmlLang: "zh-CN" },
  "zh-TW": { hl: "zh-TW", buttonLocale: "zh_TW", htmlLang: "zh-TW" },
  ja: { hl: "ja", buttonLocale: "ja", htmlLang: "ja" },
  ko: { hl: "ko", buttonLocale: "ko", htmlLang: "ko" },
  fr: { hl: "fr", buttonLocale: "fr", htmlLang: "fr" },
  es: { hl: "es", buttonLocale: "es", htmlLang: "es" },
  de: { hl: "de", buttonLocale: "de", htmlLang: "de" },
  ru: { hl: "ru", buttonLocale: "ru", htmlLang: "ru" },
} as const;
export type GoogleLocale = keyof typeof GOOGLE_LOCALES;
export function normalizeGoogleLocale(value: unknown): GoogleLocale {
  return typeof value === "string" && Object.hasOwn(GOOGLE_LOCALES, value) ? value as GoogleLocale : "en";
}
export function getGoogleLocale(value: unknown) { return GOOGLE_LOCALES[normalizeGoogleLocale(value)]; }

export type GoogleAuthCopy = {
  googleSignIn: string; emailSignIn: string; inAppBrowser: string; copyLink: string; linkCopied: string;
  googleUnavailable: string; googleError: string; checking: string; fileReselect: string;
};
const copy: Record<GoogleLocale, GoogleAuthCopy> = {
  en: { googleSignIn: "Continue with Google", emailSignIn: "Use email and password", inAppBrowser: "Open this page in Safari or Chrome to sign in with Google. You can also use email and password here.", copyLink: "Copy link", linkCopied: "Link copied", googleUnavailable: "Use the Google button below or sign in with email.", googleError: "Google sign-in could not finish. Please try again or use email.", checking: "Checking your session…", fileReselect: "Please choose your file once more to continue after returning from sign-in." },
  "zh-CN": { googleSignIn: "使用 Google 继续", emailSignIn: "使用邮箱和密码", inAppBrowser: "请在 Safari 或 Chrome 中打开本页，再使用 Google 登录。也可以在这里用邮箱和密码登录。", copyLink: "复制链接", linkCopied: "链接已复制", googleUnavailable: "请使用下方 Google 按钮，或用邮箱登录。", googleError: "Google 登录未完成，请重试或使用邮箱。", checking: "正在检查登录状态…", fileReselect: "登录返回后，请再选择一次文件以继续。" },
  "zh-TW": { googleSignIn: "使用 Google 繼續", emailSignIn: "使用電子郵件和密碼", inAppBrowser: "請在 Safari 或 Chrome 中開啟本頁，再使用 Google 登入。也可以在這裡用電子郵件和密碼登入。", copyLink: "複製連結", linkCopied: "已複製連結", googleUnavailable: "請使用下方 Google 按鈕，或用電子郵件登入。", googleError: "Google 登入未完成，請重試或使用電子郵件。", checking: "正在檢查登入狀態…", fileReselect: "登入返回後，請再選擇一次檔案以繼續。" },
  ja: { googleSignIn: "Google で続行", emailSignIn: "メールとパスワードでログイン", inAppBrowser: "Google でログインするには Safari または Chrome でこのページを開いてください。ここではメールとパスワードも使えます。", copyLink: "リンクをコピー", linkCopied: "コピーしました", googleUnavailable: "下の Google ボタン、またはメールでログインしてください。", googleError: "Google ログインが完了しませんでした。再試行するかメールを使ってください。", checking: "ログイン状態を確認中…", fileReselect: "ログインから戻ったら、続行するファイルをもう一度選んでください。" },
  ko: { googleSignIn: "Google로 계속", emailSignIn: "이메일과 비밀번호 사용", inAppBrowser: "Google 로그인은 Safari 또는 Chrome에서 이 페이지를 열어 진행하세요. 여기서는 이메일과 비밀번호도 사용할 수 있습니다.", copyLink: "링크 복사", linkCopied: "링크 복사됨", googleUnavailable: "아래 Google 버튼이나 이메일로 로그인하세요.", googleError: "Google 로그인을 완료하지 못했습니다. 다시 시도하거나 이메일을 사용하세요.", checking: "로그인 상태 확인 중…", fileReselect: "로그인 후 돌아오면 계속할 파일을 한 번 더 선택하세요." },
  fr: { googleSignIn: "Continuer avec Google", emailSignIn: "Utiliser un e-mail et un mot de passe", inAppBrowser: "Ouvrez cette page dans Safari ou Chrome pour vous connecter avec Google. Vous pouvez aussi utiliser votre e-mail et votre mot de passe ici.", copyLink: "Copier le lien", linkCopied: "Lien copié", googleUnavailable: "Utilisez le bouton Google ci-dessous ou connectez-vous par e-mail.", googleError: "La connexion Google a échoué. Réessayez ou utilisez votre e-mail.", checking: "Vérification de la session…", fileReselect: "Après votre connexion, sélectionnez une nouvelle fois le fichier pour continuer." },
  es: { googleSignIn: "Continuar con Google", emailSignIn: "Usar correo y contraseña", inAppBrowser: "Abre esta página en Safari o Chrome para iniciar sesión con Google. También puedes usar tu correo y contraseña aquí.", copyLink: "Copiar enlace", linkCopied: "Enlace copiado", googleUnavailable: "Usa el botón de Google de abajo o inicia sesión por correo.", googleError: "No se pudo completar el inicio de sesión con Google. Reinténtalo o usa tu correo.", checking: "Comprobando la sesión…", fileReselect: "Al volver del inicio de sesión, selecciona el archivo una vez más para continuar." },
  de: { googleSignIn: "Mit Google fortfahren", emailSignIn: "E-Mail und Passwort verwenden", inAppBrowser: "Öffne diese Seite in Safari oder Chrome, um dich mit Google anzumelden. Hier kannst du auch E-Mail und Passwort verwenden.", copyLink: "Link kopieren", linkCopied: "Link kopiert", googleUnavailable: "Verwende die Google-Schaltfläche unten oder melde dich per E-Mail an.", googleError: "Die Google-Anmeldung wurde nicht abgeschlossen. Versuche es erneut oder verwende E-Mail.", checking: "Sitzung wird geprüft…", fileReselect: "Wähle nach der Rückkehr von der Anmeldung die Datei noch einmal aus, um fortzufahren." },
  ru: { googleSignIn: "Продолжить с Google", emailSignIn: "Войти по почте и паролю", inAppBrowser: "Откройте эту страницу в Safari или Chrome для входа через Google. Здесь также можно войти по почте и паролю.", copyLink: "Копировать ссылку", linkCopied: "Ссылка скопирована", googleUnavailable: "Используйте кнопку Google ниже или войдите по почте.", googleError: "Не удалось завершить вход через Google. Повторите попытку или используйте почту.", checking: "Проверяем сеанс…", fileReselect: "После возврата со страницы входа выберите файл ещё раз, чтобы продолжить." },
};
export function getGoogleAuthCopy(locale: unknown): GoogleAuthCopy { return copy[normalizeGoogleLocale(locale)]; }

/** Authentication may restore payment/activation pages without creating a new purchase. */
export function validateAuthReturnPath(site: CheckoutReturnSite, value: unknown): string | null {
  if (typeof value !== "string" || !value || value.length > 24576 || value !== value.trim()) return null;
  let decoded = value;
  for (let round = 0; round < 5; round++) {
    if (/[\u0000-\u0020\u007f\\]/u.test(decoded) || !decoded.startsWith("/") || decoded.startsWith("//")) return null;
    if (/%(?:2f|5c|00|0[ad]|25)/iu.test(decoded.split(/[?#]/u)[0]!)) return null;
    try { const next = decodeURIComponent(decoded); if (next === decoded) break; decoded = next; } catch { return null; }
  }
  try {
    const url = new URL(value, "https://return.invalid");
    if (url.origin !== "https://return.invalid") return null;
    const unlocalized = url.pathname.replace(/^\/(?:en|zh-cn|zh-tw|ja|ko|fr|es|de|ru)(?=\/|$)/iu, "") || "/";
    const paymentPage = /^\/checkout(?:\/(?:success|cancel|paddle))?\/?$/u.test(unlocalized);
    const accountPage = site === "app" && /^\/(?:activate|login|register|forgot-password|reset-password)\/?$/u.test(unlocalized);
    return paymentPage || accountPage || validateCheckoutReturnPath(site, url.pathname) ? `${url.pathname}${url.search}${url.hash}` : null;
  } catch { return null; }
}

export function isInAppBrowser(userAgent: string): boolean {
  return /MicroMessenger|WeChat|Instagram|FBAN|FBAV|\bLine\/|LinkedInApp|TikTok|Snapchat|;\s*wv\)|\bWebView\b/iu.test(userAgent);
}

export const GOOGLE_KNOWN_ACCOUNT_KEY = "score-google-known-account";
export const GOOGLE_AUTO_SIGNIN_SUPPRESSION_COOKIE = "score_google_logout";
const knownAccountKey = GOOGLE_KNOWN_ACCOUNT_KEY;
const accountTtlMs = 90 * 24 * 60 * 60_000;
/** Call only after a real, verified successful session. Never accepts URL hints. */
export function rememberGoogleAccount(email: string): void {
  if (typeof window === "undefined" || !/^[^\s@]{1,200}@[^\s@]{1,200}$/u.test(email)) return;
  try { window.localStorage.setItem(knownAccountKey, JSON.stringify({ email, expiresAt: Date.now() + accountTtlMs })); } catch { /* Storage can be disabled. */ }
}
export function getKnownGoogleAccount(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const value = JSON.parse(window.localStorage.getItem(knownAccountKey) ?? "null");
    if (value && typeof value.email === "string" && /^[^\s@]{1,200}@[^\s@]{1,200}$/u.test(value.email) && typeof value.expiresAt === "number" && value.expiresAt > Date.now()) return value.email;
  } catch { /* No known verified account. */ }
  return undefined;
}
function suppressionCookieName() {
  return typeof window !== "undefined" && window.location.hostname.includes("staging") ? `${GOOGLE_AUTO_SIGNIN_SUPPRESSION_COOKIE}_staging` : GOOGLE_AUTO_SIGNIN_SUPPRESSION_COOKIE;
}
function suppressionCookie(value: string, maxAge: number) {
  const domain = window.location.hostname === "scoretransposer.com" || window.location.hostname.endsWith(".scoretransposer.com") ? "; Domain=scoretransposer.com" : "";
  document.cookie = `${suppressionCookieName()}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${domain}${window.location.protocol === "https:" ? "; Secure" : ""}`;
}
export function suppressGoogleAutoSignIn(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  suppressionCookie("1", 24 * 60 * 60);
  const google = (window as unknown as { google?: { accounts?: { id?: { disableAutoSelect?: () => void; cancel?: () => void } } } }).google;
  google?.accounts?.id?.disableAutoSelect?.();
  google?.accounts?.id?.cancel?.();
  window.dispatchEvent(new Event("score-google-suppression-changed"));
}
export function clearGoogleAutoSignInSuppression(): void {
  if (typeof window !== "undefined" && typeof document !== "undefined") suppressionCookie("", 0);
}
export function isGoogleAutoSignInSuppressed(): boolean {
  return typeof document !== "undefined" && document.cookie.split(";").some(part => part.trim() === `${suppressionCookieName()}=1`);
}
export function isGoogleAutoSignInAllowed(pathAndQuery: string): boolean {
  let url: URL;
  try { url = new URL(pathAndQuery, "https://local.invalid"); } catch { return false; }
  const path = url.pathname.replace(/^\/(?:en|zh-cn|zh-tw|ja|ko|fr|es|de|ru)(?=\/|$)/iu, "") || "/";
  return !/^\/(?:checkout|activate|paddle|oauth)|^\/billing(?:\/|$)|^\/api\/auth\/google(?:\/|$)/iu.test(path)
    && !url.searchParams.has("google_auth") && !isGoogleAutoSignInSuppressed();
}

function googleStatusQuery(search: string) {
  let status: string | undefined;
  const parts = search.replace(/^\?/u, "").split("&").filter(part => {
    const separator = part.indexOf("=");
    const name = separator < 0 ? part : part.slice(0, separator);
    try {
      if (decodeURIComponent(name.replace(/\+/gu, " ")) !== "google_auth") return true;
      status = decodeURIComponent(separator < 0 ? "" : part.slice(separator + 1));
      return false;
    } catch { return true; }
  });
  return { query: parts.join("&"), status };
}

/** Append a status without changing the original query encoding or order. */
export function withGoogleAuthStatus(returnUrl: string, status: string): string {
  const target = new URL(returnUrl);
  const { query } = googleStatusQuery(target.search);
  target.search = `${query ? `?${query}&` : "?"}google_auth=${encodeURIComponent(status)}`;
  return target.href;
}

/** This status is only a UI signal: callers must revalidate the actual session. */
export function consumeGoogleRedirectResult(): "success" | "unavailable" | "disallowed_useragent" | "error" | undefined {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const { query, status: result } = googleStatusQuery(url.search);
  if (!result) return;
  window.history.replaceState(window.history.state, "", `${url.pathname}${query ? `?${query}` : ""}${url.hash}`);
  return ["success", "unavailable", "disallowed_useragent", "error"].includes(result) ? result as "success" | "unavailable" | "disallowed_useragent" | "error" : "error";
}

const availability = new Map<string, boolean>();
const preparations = new Map<string, Promise<boolean | null>>();
/** Warm only the availability check. The server creates PKCE/nonce/state on popup navigation. */
export function prepareGoogleSignIn(apiBaseUrl: string): Promise<boolean | null> {
  const existing = preparations.get(apiBaseUrl);
  if (existing) return existing;
  const promise = (async () => {
    try {
      const response = await fetch(`${apiBaseUrl.replace(/\/$/u, "")}/api/auth/google/config`, { credentials: "include", cache: "no-store", signal: AbortSignal.timeout(8_000) });
      if (!response.ok) return null;
      const result = await response.json() as { codeFlowAvailable?: unknown };
      if (typeof result.codeFlowAvailable !== "boolean") return null;
      availability.set(apiBaseUrl, result.codeFlowAvailable);
      return result.codeFlowAvailable;
    } catch { return null; }
  })();
  preparations.set(apiBaseUrl, promise);
  // Do not cache a transient network failure forever.
  void promise.then(result => { if (result === null) preparations.delete(apiBaseUrl); });
  return promise;
}

export type LaunchGoogleSignInOptions = {
  apiBaseUrl: string; locale: string; returnPath?: string; popup?: Window | null;
  onSuccess: () => void | Promise<void>; onFallback?: (reason: string) => void; onError?: (reason: string) => void;
  beforeRedirect?: () => void | Promise<void>;
};
/** This function must be invoked within the original click handler, before any await. */
export function launchGoogleSignIn(input: LaunchGoogleSignInOptions): { cancel(): void } | undefined {
  if (typeof window === "undefined") return;
  if (isInAppBrowser(window.navigator.userAgent)) {
    input.popup?.close();
    if (input.onFallback) input.onFallback("disallowed_useragent");
    else input.onError?.("disallowed_useragent");
    return;
  }
  if (availability.get(input.apiBaseUrl) === false) {
    input.popup?.close(); input.onFallback?.("unavailable"); return;
  }
  const transactionId = window.crypto.randomUUID();
  const start = new URL(`${input.apiBaseUrl.replace(/\/$/u, "")}/api/auth/google/start`);
  start.searchParams.set("origin", window.location.origin);
  start.searchParams.set("return_path", input.returnPath ?? `${window.location.pathname}${window.location.search}${window.location.hash}`);
  start.searchParams.set("transaction_id", transactionId);
  start.searchParams.set("locale", normalizeGoogleLocale(input.locale));
  start.searchParams.set("mode", "popup");
  // B2 can carry a large, validated editor snapshot. Post it instead of putting
  // it into a URL that browsers/proxies may truncate. No async work precedes open.
  const postStart = start.href.length > 6000;
  const popupName = `score-google-${transactionId}`;
  function submitStart(target: string) {
    const form = document.createElement("form");
    form.method = "POST"; form.action = `${start.origin}${start.pathname}`; form.target = target;
    form.style.display = "none";
    for (const [name, value] of start.searchParams) {
      const field = document.createElement("input");
      field.type = "hidden"; field.name = name; field.value = value; form.append(field);
    }
    document.body.append(form);
    try { form.submit(); } finally { form.remove(); }
  }
  let popup: Window | null = null;
  try {
    popup = Object.hasOwn(input, "popup") ? input.popup ?? null : window.open(postStart ? "" : start.href, popupName, "popup,width=500,height=650");
    if (popup && postStart) popup.name = popupName;
    else if (popup && Object.hasOwn(input, "popup")) popup.location.href = start.href;
  } catch {
    try { popup?.close(); } catch { /* A blocked window can also reject close. */ }
    popup = null;
  }
  let settled = false;
  let cancelled = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  const expiresAt = Date.now() + 5 * 60_000;
  function cleanup() { if (timer) clearInterval(timer); window.removeEventListener("message", receive); }
  function redirect() {
    if (settled) return;
    settled = true; cleanup(); popup?.close(); start.searchParams.set("mode", "redirect");
    let save: void | Promise<void>;
    try { save = input.beforeRedirect?.(); } catch { input.onError?.("redirect_save_failed"); return; }
    const navigate = () => {
      if (cancelled) return;
      try { if (postStart) submitStart("_self"); else window.location.assign(start.href); }
      catch { input.onError?.("redirect_failed"); }
    };
    if (save && typeof save.then === "function") void save.then(navigate).catch(() => input.onError?.("redirect_save_failed"));
    else navigate();
  }
  function receive(event: MessageEvent) {
    if (settled || event.origin !== start.origin || event.source !== popup) return;
    const data = event.data as Record<string, unknown> | null;
    if (!data || data.type !== "score-google-auth" || data.transactionId !== transactionId) return;
    if (data.status === "error") { redirect(); return; }
    if (!["success", "unavailable", "disallowed_useragent"].includes(String(data.status))) return;
    settled = true; cleanup(); popup?.close();
    if (data.status === "success") { clearGoogleAutoSignInSuppression(); void Promise.resolve(input.onSuccess()).catch(() => input.onError?.("session_restore_failed")); }
    else if (input.onFallback) input.onFallback(String(data.status));
    else input.onError?.(String(data.status));
  }
  if (!popup) redirect();
  else {
    window.addEventListener("message", receive);
    timer = setInterval(() => { if (popup.closed || Date.now() >= expiresAt) redirect(); }, 500);
    if (postStart) {
      try { submitStart(popupName); } catch { redirect(); }
    }
  }
  return { cancel() { cancelled = true; settled = true; cleanup(); popup?.close(); } };
}
