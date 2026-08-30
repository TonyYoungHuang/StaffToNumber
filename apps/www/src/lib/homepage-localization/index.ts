import type { SupportedLocale } from "@score/i18n";
import type { PricingPlanDisplay } from "@score/shared";
import { deHomepage } from "./locales/de";
import { enHomepage } from "./locales/en";
import { esHomepage } from "./locales/es";
import { frHomepage } from "./locales/fr";
import { jaHomepage } from "./locales/ja";
import { koHomepage } from "./locales/ko";
import { ruHomepage } from "./locales/ru";
import { zhCNHomepage } from "./locales/zh-CN";
import { zhTWHomepage } from "./locales/zh-TW";
import type { HomepageLocalization, HomepagePlanTranslation } from "./types";

export { HOMEPAGE_MEDIA_SOURCE_LOCALES, getHomepageMediaSourceLocale } from "./media";
export type {
  HomepageLocalization,
  HomepageMediaCopy,
  HomepagePageCopy,
  HomepagePlanTranslation,
  HomepagePlanTranslations,
  HomepageWorkbenchCopy,
} from "./types";

export const HOMEPAGE_LOCALIZATIONS = {
  en: enHomepage,
  "zh-CN": zhCNHomepage,
  "zh-TW": zhTWHomepage,
  ja: jaHomepage,
  ko: koHomepage,
  fr: frHomepage,
  es: esHomepage,
  de: deHomepage,
  ru: ruHomepage,
} as const satisfies Readonly<Record<SupportedLocale, HomepageLocalization>>;

export function getHomepageLocalization(locale: SupportedLocale): HomepageLocalization {
  return HOMEPAGE_LOCALIZATIONS[locale];
}

export function localizeHomepagePlans(
  locale: SupportedLocale,
  plans: readonly PricingPlanDisplay[],
): readonly PricingPlanDisplay[] {
  const translations = getHomepageLocalization(locale).plans;
  return plans.map((plan) => ({
    ...plan,
    ...translations[plan.code],
    code: plan.code,
    price: plan.price,
    featured: plan.featured,
  } satisfies PricingPlanDisplay));
}

export function getHomepagePlanTranslation(
  locale: SupportedLocale,
  code: PricingPlanDisplay["code"],
): HomepagePlanTranslation {
  return getHomepageLocalization(locale).plans[code];
}
