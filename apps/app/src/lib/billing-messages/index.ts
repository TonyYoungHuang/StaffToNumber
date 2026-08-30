import {
  formatMessage,
  formatNumber,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@score/i18n";
import {
  getPricingPlanCatalog,
  type PricingPlanCode,
  type PricingPlanDisplay,
} from "@score/shared";
import { deBillingMessages } from "./locales/de";
import { enBillingMessages } from "./locales/en";
import { esBillingMessages } from "./locales/es";
import { frBillingMessages } from "./locales/fr";
import { jaBillingMessages } from "./locales/ja";
import { koBillingMessages } from "./locales/ko";
import { ruBillingMessages } from "./locales/ru";
import { zhCNBillingMessages } from "./locales/zh-CN";
import { zhTWBillingMessages } from "./locales/zh-TW";
import type { BillingMessageCatalog } from "./types";

const BILLING_MESSAGE_CATALOGS = {
  en: enBillingMessages,
  "zh-CN": zhCNBillingMessages,
  "zh-TW": zhTWBillingMessages,
  ja: jaBillingMessages,
  ko: koBillingMessages,
  fr: frBillingMessages,
  es: esBillingMessages,
  de: deBillingMessages,
  ru: ruBillingMessages,
} satisfies Record<SupportedLocale, BillingMessageCatalog>;

const SHARED_PRICING_PLANS = getPricingPlanCatalog("en");

function requireCapture(value: string, pattern: RegExp, label: string) {
  const capture = pattern.exec(value)?.[1];
  if (!capture) throw new Error(`Shared pricing plan fact is missing: ${label}.`);
  return capture;
}

function sharedPlanFacts(plan: PricingPlanDisplay) {
  const resources = plan.resources.join(" ");
  return {
    monthlyCredits: requireCapture(plan.credits, /(\d+)\s+credits/iu, `${plan.code} monthly credits`),
    storage: requireCapture(resources, /(\d+(?:\.\d+)?)\s+GB/iu, `${plan.code} storage`),
    unitPrice: plan.code === "free" ? null : requireCapture(plan.unitPrice, /(\$\d+(?:\.\d+)?)/u, `${plan.code} unit price`),
    annualSavings: plan.code.endsWith("-annual")
      ? requireCapture(resources, /(\$\d+(?:\.\d+)?)/u, `${plan.code} annual savings`)
      : null,
  };
}

const freePlan = SHARED_PRICING_PLANS.find((plan) => plan.code === "free");
if (!freePlan) throw new Error("The shared Free pricing plan is missing.");
const SHARED_FREE_PROJECT_COUNT = requireCapture(freePlan.credits, /^(\d+)/u, "Free project count");

function tierForPlan(code: PricingPlanCode) {
  if (code === "free") return "free" as const;
  return code.startsWith("starter-") ? "starter" as const : "converter-pro" as const;
}

function cycleForPlan(code: PricingPlanCode) {
  if (code === "free") return "lifetime" as const;
  return code.endsWith("-monthly") ? "monthly" as const : "annual" as const;
}

export function getBillingMessages(locale: SupportedLocale): BillingMessageCatalog {
  return BILLING_MESSAGE_CATALOGS[locale];
}

export function getLocalizedPricingPlanCatalog(locale: SupportedLocale): readonly PricingPlanDisplay[] {
  const copy = getBillingMessages(locale).plans;
  const projectCount = formatNumber(Number(SHARED_FREE_PROJECT_COUNT), locale);

  return SHARED_PRICING_PLANS.map((plan) => {
    const facts = sharedPlanFacts(plan);
    const values = {
      projectCount,
      monthlyCredits: formatNumber(Number(facts.monthlyCredits), locale),
      storage: formatNumber(Number(facts.storage), locale),
      unitPrice: facts.unitPrice,
      annualSavings: facts.annualSavings,
    };
    const message = (template: string) => formatMessage(template, values);
    const commonBenefits = [copy.benefits.editor, copy.benefits.practice, copy.benefits.conversion];
    const benefits = plan.code === "free"
      ? [message(copy.benefits.freeProject), ...commonBenefits, copy.benefits.freeExports]
      : [
          message(plan.code === "starter-monthly"
            ? copy.benefits.moreThanFreeProject
            : plan.code === "starter-annual"
              ? copy.benefits.starterMonthlyIncluded
              : plan.code === "converter-pro-monthly"
                ? copy.benefits.starterIncluded
                : copy.benefits.converterMonthlyIncluded),
          ...commonBenefits,
          copy.benefits.exports,
        ];
    const resources = plan.code === "free"
      ? [message(copy.resources.monthlyCreditsReset), message(copy.resources.storage), copy.resources.freeLibrary, copy.resources.noCard]
      : plan.code.endsWith("-annual")
        ? [message(copy.resources.monthlyCreditsReset), message(copy.resources.storage), message(copy.resources.annualSavings), copy.resources.personalLibrary]
        : [message(copy.resources.monthlyCredits), message(copy.resources.storage), copy.resources.personalLibrary, copy.resources.monthlyRenewal];

    return {
      code: plan.code,
      badge: copy.badges[plan.code],
      name: copy.names[tierForPlan(plan.code)],
      cycle: copy.cycles[cycleForPlan(plan.code)],
      price: plan.price,
      unitPrice: message(plan.code === "free" ? copy.freeUnitPriceTemplate : copy.unitPriceTemplate),
      credits: message(plan.code === "free" ? copy.freeCreditsTemplate : copy.creditsTemplate),
      audience: copy.audiences[plan.code],
      benefits,
      resources,
      cta: copy.ctas[plan.code],
      featured: plan.featured,
    };
  });
}

export const BILLING_SUPPORTED_LOCALES = SUPPORTED_LOCALES;

export type {
  ActivationFormCopy,
  BillingManagerCopy,
  BillingMessageCatalog,
  CheckoutClientCopy,
} from "./types";
