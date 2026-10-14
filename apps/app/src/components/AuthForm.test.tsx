import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@score/i18n";
import { getAuthMessages } from "../lib/auth-messages";
import { AppLocaleProvider } from "./AppLocaleProvider";
import { AuthForm } from "./AuthForm";

const router: AppRouterInstance = {
  back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: "auth-test",
};

function renderAuth(locale: SupportedLocale, mode: "login" | "register", emailOnly = false) {
  return renderToStaticMarkup(
    <AppRouterContext.Provider value={router}>
      <AppLocaleProvider locale={locale}>
        <AuthForm mode={mode} messages={getAuthMessages(locale).form} emailOnly={emailOnly} />
      </AppLocaleProvider>
    </AppRouterContext.Provider>,
  );
}

const activationText = /activation code|激活码|啟用碼|アクティベーションコード|활성화 코드|code d.activation|código de activación|Aktivierungscode|код активации/iu;

test("login and register show the same Google primary action with email closed in all nine locales", t => {
  const previous = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "test-client";
  t.after(() => { if (previous === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID; else process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = previous; });
  for (const locale of SUPPORTED_LOCALES) {
    for (const mode of ["login", "register"] as const) {
      const html = renderAuth(locale, mode);
      assert.match(html, /class="button button-primary"[^>]*>[^<]*Google/iu, `${locale} ${mode} Google action`);
      assert.equal((html.match(/class="button button-primary"/gu) ?? []).length, 1);
      assert.match(html, /aria-expanded="false"/u);
      assert.doesNotMatch(html, /<form|type="email"|type="password"|href="\/forgot-password"/u);
      assert.doesNotMatch(html, /href="\/activate/u);
      assert.doesNotMatch(html, activationText, `${locale} ${mode} activation copy`);
    }
  }
});

test("email fallback retains login, registration and password recovery with no activation entry", () => {
  for (const locale of SUPPORTED_LOCALES) {
    for (const mode of ["login", "register"] as const) {
      const html = renderAuth(locale, mode, true);
      assert.match(html, /type="email"/u);
      assert.match(html, /type="password"/u);
      assert.match(html, /type="submit"/u);
      if (mode === "login") assert.match(html, /href="\/forgot-password"/u);
      assert.doesNotMatch(html, /href="\/activate/u);
      assert.doesNotMatch(html, activationText, `${locale} ${mode} fallback activation copy`);
    }
  }
});

test("an unconfigured Google sign-in renders a usable email fallback", t => {
  const previous = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  t.after(() => { if (previous !== undefined) process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = previous; });
  const html = renderAuth("en", "login");
  assert.match(html, /type="email"/u);
  assert.match(html, /type="password"/u);
  assert.match(html, /href="\/forgot-password"/u);
  assert.doesNotMatch(html, /accounts\.google\.com/u);
});
