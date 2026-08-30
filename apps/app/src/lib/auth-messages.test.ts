import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { AUTH_MESSAGE_CATALOGS, getAuthMessages } from "./auth-messages.js";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];

  return Object.entries(value).flatMap(([key, nested]) =>
    leafKeys(nested, prefix ? `${prefix}.${key}` : key));
}

function leafStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(leafStrings);
}

test("authentication entry flows have a complete non-empty catalog for all supported locales", () => {
  assert.deepEqual(Object.keys(AUTH_MESSAGE_CATALOGS), [...SUPPORTED_LOCALES]);
  const englishKeys = leafKeys(AUTH_MESSAGE_CATALOGS.en).sort();

  for (const locale of SUPPORTED_LOCALES) {
    const catalog = getAuthMessages(locale);
    assert.deepEqual(leafKeys(catalog).sort(), englishKeys, `${locale} message keys`);
    for (const message of leafStrings(catalog)) {
      assert.ok(message.trim().length > 0, `${locale} has an empty message`);
    }
  }
});

test("authentication validation, loading, success, and accessibility text is translated", () => {
  const english = getAuthMessages("en");

  for (const locale of SUPPORTED_LOCALES) {
    const catalog = getAuthMessages(locale);
    assert.ok(catalog.form.shared.googleButtonRegionLabel.length > 0);
    assert.ok(catalog.form.shared.googleFailed.length > 0);
    assert.ok(catalog.form.register.success.length > 0);
    assert.ok(catalog.resetRequest.submitting.length > 0);
    assert.ok(catalog.resetConfirm.loading.length > 0);
    assert.ok(catalog.resetConfirm.mismatch.length > 0);
    assert.ok(catalog.entitlement.checking.length > 0);

    if (locale !== "en") {
      assert.notEqual(catalog.routes.login.title, english.routes.login.title, `${locale} login title`);
      assert.notEqual(catalog.resetConfirm.mismatch, english.resetConfirm.mismatch, `${locale} mismatch`);
      assert.notEqual(catalog.entitlement.checking, english.entitlement.checking, `${locale} access status`);
    }
  }
});

test("representative authentication copy uses each requested language", () => {
  assert.equal(getAuthMessages("zh-TW").form.login.title, "歡迎回來");
  assert.equal(getAuthMessages("ja").resetConfirm.submit, "新しいパスワードを保存");
  assert.equal(getAuthMessages("ko").resetRequest.back, "로그인으로 돌아가기");
  assert.equal(getAuthMessages("fr").notFound.eyebrow, "Page introuvable");
  assert.equal(getAuthMessages("es").form.shared.email, "Correo electrónico");
  assert.equal(getAuthMessages("de").routes.register.title, "Konto erstellen");
  assert.equal(getAuthMessages("ru").entitlement.redeemAction, "Активировать код");
});

test("scoped authentication UI has no binary locale branches and preserves API errors verbatim", () => {
  const files = [
    "../app/login/page.tsx",
    "../app/register/page.tsx",
    "../app/forgot-password/page.tsx",
    "../app/reset-password/page.tsx",
    "../app/not-found.tsx",
    "../components/AuthShell.tsx",
    "../components/AuthForm.tsx",
    "../components/PasswordResetRequestForm.tsx",
    "../components/PasswordResetConfirmForm.tsx",
    "../components/EntitlementGate.tsx",
  ];
  const sources = files.map((file) => readFileSync(new URL(file, import.meta.url), "utf8"));

  for (const [index, source] of sources.entries()) {
    assert.doesNotMatch(source, /locale\s*===\s*["']zh-CN["']/, files[index]);
    assert.doesNotMatch(source, /isChinese/, files[index]);
  }

  const authForm = sources[6];
  const resetRequest = sources[7];
  const resetConfirm = sources[8];
  assert.doesNotMatch(authForm, /userFacingError/);
  assert.match(authForm, /setStatus\(result\.error\)/);
  assert.match(resetRequest, /setStatus\(result\.error\)/);
  assert.match(resetConfirm, /setVerificationError\(result\.error\)/);
  assert.match(resetConfirm, /setStatus\(result\.error\)/);
});
