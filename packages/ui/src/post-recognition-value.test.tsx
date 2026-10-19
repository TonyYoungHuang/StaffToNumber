import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { isPurchasePlanCode } from "@score/shared";
import { PostRecognitionValue } from "./post-recognition-value";
import { workbenchCopy } from "./workbench-copy";

test("value hook offers only existing one-time and monthly checkout plans in every locale", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const $ = load(renderToStaticMarkup(<PostRecognitionValue locale={locale} freeUsed preview={<svg data-real-preview />} onPurchase={() => {}} onLater={() => {}} />));
    const plans = $("input[type=radio]").toArray().map(node => $(node).attr("value"));
    assert.deepEqual(plans, ["single-score", "starter-monthly", "converter-pro-monthly"]);
    assert.ok(plans.every(isPurchasePlanCode));
    assert.equal($(".wb-plan").length, 3);
    assert.match($(".wb-plan").eq(0).text(), /2\.99/);
    assert.doesNotMatch($(".wb-plan").eq(0).text(), /10|50|200/);
    assert.match($(".wb-plan").eq(1).text(), /7\.99/);
    assert.match($(".wb-plan").eq(2).text(), /14\.99/);
    assert.equal($(".wb-free-chips span").last().text(), workbenchCopy[locale].chips[4]);
    assert.ok($(".wb-free").text().includes(workbenchCopy[locale].used));
    assert.equal($(".wb-value-preview svg[data-real-preview]").length, 1);
  }
});

test("paid-feature hook does not falsely claim a free scan was used", () => {
  const $ = load(renderToStaticMarkup(<PostRecognitionValue locale="en" freeUsed={false} preview={null} onPurchase={() => {}} onLater={() => {}} />));
  assert.ok(!$.text().includes(workbenchCopy.en.used));
  assert.ok(!$.text().includes(workbenchCopy.en.lead));
});
