import assert from "node:assert/strict";
import test from "node:test";
import { load } from "cheerio";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { renderToStaticMarkup } from "react-dom/server";
import { AppLocaleProvider } from "./AppLocaleProvider";
import { AppLocaleSwitcher } from "./AppLocaleSwitcher";

const expectedOptions = [
  ["en", "en", "English"],
  ["fr", "fr", "Français"],
  ["de", "de", "Deutsch"],
  ["es", "es", "Español"],
  ["ru", "ru", "Русский"],
  ["ja", "ja", "日本語"],
  ["ko", "ko", "한국어"],
  ["zh-TW", "zh-TW", "繁體中文"],
  ["zh-CN", "zh-CN", "简体中文"],
] as const;

const router: AppRouterInstance = {
  back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: "locale-test",
};

test("app language menu renders the exact display order for every selected locale", () => {
  for (const [locale] of expectedOptions) {
    const html = renderToStaticMarkup(
      <AppRouterContext.Provider value={router}>
        <AppLocaleProvider locale={locale}>
          <AppLocaleSwitcher label="Language" errorMessage="Could not change language" />
        </AppLocaleProvider>
      </AppRouterContext.Provider>,
    );
    const $ = load(html);
    const options = $("select[aria-label='Language'] option");

    assert.deepEqual(
      options.toArray().map((option) => [
        $(option).attr("value"),
        $(option).attr("lang"),
        $(option).text(),
      ]),
      expectedOptions,
      `${locale} option values, language tags, labels and display order`,
    );
    const selected = options.filter("[selected]");
    assert.equal(selected.length, 1, `${locale} has one selected option`);
    assert.equal(selected.attr("value"), locale, `${locale} remains selected`);
  }
});
