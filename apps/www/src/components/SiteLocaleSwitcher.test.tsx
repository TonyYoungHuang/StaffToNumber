import assert from "node:assert/strict";
import test from "node:test";
import { load } from "cheerio";
import { renderToStaticMarkup } from "react-dom/server";
import { SiteLocaleProvider } from "./SiteLocaleProvider";
import { SiteLocaleSwitcher } from "./SiteLocaleSwitcher";

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

test("www language menu renders the exact display order for every selected locale", () => {
  for (const [locale] of expectedOptions) {
    const html = renderToStaticMarkup(
      <SiteLocaleProvider locale={locale}>
        <SiteLocaleSwitcher label="Language" />
      </SiteLocaleProvider>,
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
