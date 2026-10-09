import assert from "node:assert/strict";
import test from "node:test";
import { CHECKOUT_PLAN_CODES, getCheckoutPlanCatalog, getPricingPlanCatalog } from "@score/shared";
import { frenchPricingFaqs, getFrenchPricingPlans } from "./french-pricing";
import sitemap from "../app/sitemap";
import { localizedContentLastUpdated } from "./public-content-dates";
import { getLocalizedPaidPlans } from "./localized-pricing";
import { getHomepageLocalization } from "./homepage-localization";
import { getEnEsFeatureFaq } from "./feature-localization/en-es-faq";
import { findPlatformFeaturePage } from "./platform-feature-pages";

test("English and Spanish purchase types preserve amounts and quotas without recurring labels on prepaid access", () => {
  for (const locale of ["en", "es"] as const) {
    const subscription = getLocalizedPaidPlans(locale, "subscription");
    const oneTime = getLocalizedPaidPlans(locale, "one_time");
    assert.deepEqual(oneTime.map(plan => plan.code), [...CHECKOUT_PLAN_CODES]);
    for (const [index, plan] of oneTime.entries()) {
      assert.equal(plan.price, subscription[index].price);
      assert.equal(plan.credits, subscription[index].credits);
      assert.deepEqual(plan.benefits, subscription[index].benefits);
      assert.notEqual(plan.cycle, subscription[index].cycle);
      assert.doesNotMatch(plan.resources.slice(0, -1).join(" "), /renewal|renovación|twelve monthly|doce pagos/iu);
    }
    const unavailable = getHomepageLocalization(locale, { audioTranscriptionAvailable: false });
    assert.doesNotMatch(unavailable.page.schemaDescription, /audio|video|vídeo/iu);
    assert.ok(unavailable.page.capabilities.every(item => item[2] !== "/audio-to-score"));
    assert.ok(getHomepageLocalization(locale, { audioTranscriptionAvailable: true }).page.capabilities.some(item => item[2] === "/audio-to-score"));
    const teaching = getEnEsFeatureFaq(findPlatformFeaturePage("teaching")!, locale, true);
    assert.doesNotMatch(JSON.stringify(teaching), /after conversion|después de convertir/iu);
    const scanner = getEnEsFeatureFaq(findPlatformFeaturePage("sheet-music-scanner")!, locale, true);
    assert.match(scanner[0].answer, /PDF.*PNG.*JPG.*WebP.*TIFF/u);
    const audio = { ...findPlatformFeaturePage("audio-to-score")!, guardrail: "Unavailable for this deployment" };
    assert.equal(getEnEsFeatureFaq(audio, locale, false)[0].answer, audio.guardrail);
  }
});

test("German and Russian prices share plan codes, amounts and quotas across purchase kinds", () => {
  for (const locale of ["de", "ru"] as const) {
    const recurring = getLocalizedPaidPlans(locale,"subscription");
    const prepaid = getLocalizedPaidPlans(locale,"one_time");
    assert.deepEqual(prepaid.map(plan=>plan.code), [...CHECKOUT_PLAN_CODES]);
    assert.deepEqual(prepaid.map(plan=>plan.price.replace(/\s/gu," ")), ["7,99 USD","49,00 USD","14,99 USD","99,00 USD"]);
    for (const [index,plan] of prepaid.entries()) {
      assert.equal(plan.price,recurring[index].price); assert.equal(plan.credits,recurring[index].credits);
      assert.notEqual(plan.cycle,recurring[index].cycle);
      assert.doesNotMatch(plan.resources.slice(0,-1).join(" "),/automatische Verlängerung|Автоматическое продление/);
    }
    const disabled=getHomepageLocalization(locale,{audioTranscriptionAvailable:false});
    assert.doesNotMatch(disabled.page.schemaDescription,/Audio|аудио/iu);
    assert.ok(disabled.page.capabilities.every(item=>item[2]!=="/audio-to-score"));
    assert.ok(getHomepageLocalization(locale,{audioTranscriptionAvailable:true}).page.capabilities.some(item=>item[2]==="/audio-to-score"));
  }
});

test("French pricing distinguishes one-time access without changing amounts or quotas", () => {
  const recurring = getFrenchPricingPlans("subscription");
  const prepaid = getFrenchPricingPlans("one_time");
  assert.deepEqual(prepaid.map(plan => plan.code), [...CHECKOUT_PLAN_CODES]);
  assert.deepEqual(prepaid.map(plan => plan.price.replace(/\s/gu, " ")), ["7,99 $US", "49,00 $US", "14,99 $US", "99,00 $US"]);
  for (const [index, plan] of prepaid.entries()) {
    assert.equal(plan.price, recurring[index].price);
    assert.equal(plan.credits, recurring[index].credits);
    assert.deepEqual(plan.benefits, recurring[index].benefits);
    assert.match(plan.cta, /une fois/u);
    assert.match(plan.resources.join(" "), /Sans renouvellement automatique/u);
    assert.doesNotMatch(plan.resources.join(" "), /Renouvellement mensuel|douze mensualités/u);
    assert.equal(plan.cycle, plan.code.endsWith("annual") ? "1 an" : "1 mois");
  }
  assert.match(JSON.stringify(frenchPricingFaqs), /200 crédits par mois/u);
  assert.match(JSON.stringify(frenchPricingFaqs), /dollars américains/u);
});

test("French editorial dates change only the revised pages and retain language alternates", () => {
  const entries = sitemap();
  const find = (path: string) => entries.find(entry => new URL(entry.url).pathname === path)!;
  assert.equal(localizedContentLastUpdated("/pricing", "fr", "2026-08-25"), "2026-09-29");
  assert.equal(find("/fr/terms").lastModified, "2026-09-29");
  assert.equal(new Date(find("/terms").lastModified!).toISOString().slice(0, 10), "2026-09-30");
  assert.equal(new Date(find("/es/terms").lastModified!).toISOString().slice(0, 10), "2026-09-30");
  assert.equal(new Date(find("/fr/privacy").lastModified!).toISOString().slice(0, 10), "2026-08-25");
  assert.equal(Object.keys(find("/fr/terms").alternates!.languages!).length, 10);
  assert.ok(find("/fr/terms").alternates!.languages!["x-default"]);
});

test("Chinese and English checkout surfaces share one complete four-plan catalog", () => {
  const chinese = getCheckoutPlanCatalog("zh-CN");
  const english = getCheckoutPlanCatalog("en");

  assert.deepEqual(chinese.map((plan) => plan.code), [...CHECKOUT_PLAN_CODES]);
  assert.deepEqual(english.map((plan) => plan.code), [...CHECKOUT_PLAN_CODES]);

  for (const code of CHECKOUT_PLAN_CODES) {
    const zhPlan = chinese.find((plan) => plan.code === code);
    const enPlan = english.find((plan) => plan.code === code);
    assert.ok(zhPlan);
    assert.ok(enPlan);
    assert.equal(zhPlan.price, enPlan.price);
    assert.equal(zhPlan.featured, enPlan.featured);
    assert.ok(zhPlan.benefits.length >= 5);
    assert.ok(zhPlan.resources.length >= 3);
    assert.ok(zhPlan.credits.length > 0);
    assert.ok(zhPlan.unitPrice.length > 0);
  }

  assert.deepEqual(chinese.map((plan) => plan.price), ["$7.99", "$49", "$14.99", "$99"]);
  assert.deepEqual(chinese.map((plan) => plan.credits), ["50 积分 / 月", "50 积分 / 月", "200 积分 / 月", "200 积分 / 月"]);
  assert.ok(chinese.slice(0, 2).every((plan) => plan.resources.includes("250 MB 文件存储")));
  assert.ok(chinese.slice(2).every((plan) => plan.resources.includes("500 MB 文件存储")));
  assert.ok(english.every((plan) => plan.benefits.some((benefit) => benefit.includes("Part Copy Generator Beta"))));
  assert.ok(english.every((plan) => plan.benefits.some((benefit) => benefit.includes("Browser Recording & Practice Feedback Beta"))));
  assert.equal(getPricingPlanCatalog("zh-CN")[0]?.code, "free");
  assert.equal(getPricingPlanCatalog("zh-CN")[0]?.price, "$0");
  assert.ok(getPricingPlanCatalog("en")[0]?.resources.includes("50 MB file storage"));
  assert.equal(getPricingPlanCatalog("en")[0]?.code, "free");
  assert.ok(chinese.every((plan) => !JSON.stringify(plan).includes("后台任务")));
  assert.ok(english.every((plan) => !/server jobs?/iu.test(JSON.stringify(plan))));
});
