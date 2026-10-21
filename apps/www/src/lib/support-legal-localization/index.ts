import type { SupportedLocale } from "@score/i18n";
import { getLifetimeCopy, getLifetimePolicy } from "@score/shared";
import { deSupportLegal } from "./locales/de";
import { enSupportLegal } from "./locales/en";
import { esSupportLegal } from "./locales/es";
import { frSupportLegal } from "./locales/fr";
import { jaSupportLegal } from "./locales/ja";
import { koSupportLegal } from "./locales/ko";
import { ruSupportLegal } from "./locales/ru";
import { zhCNSupportLegal } from "./locales/zh-CN";
import { zhTWSupportLegal } from "./locales/zh-TW";
import type { SupportLegalLocalization } from "./types";

export { SUPPORT_LEGAL_MEDIA_SOURCE_LOCALES, getSupportLegalMedia } from "./media";
export type {
  CopyrightComplaintFormCopy,
  CopyrightComplaintStatus,
  SupportCategory,
  SupportFormCopy,
  SupportLegalLocalization,
} from "./types";

const baseLocalizations = {
  en: enSupportLegal,
  "zh-CN": zhCNSupportLegal,
  "zh-TW": zhTWSupportLegal,
  ja: jaSupportLegal,
  ko: koSupportLegal,
  fr: frSupportLegal,
  es: esSupportLegal,
  de: deSupportLegal,
  ru: ruSupportLegal,
} as const satisfies Readonly<Record<SupportedLocale, SupportLegalLocalization>>;

function withLifetimePolicy(locale: SupportedLocale, base: SupportLegalLocalization): SupportLegalLocalization {
  const policy = getLifetimePolicy(locale);
  return { ...base, terms: { ...base.terms, sections: [...base.terms.sections,
    { title: `${getLifetimeCopy(locale).name} · $99 USD`, points: [policy.refund, policy.upgrade] }],
    purchase: { ...base.terms.purchase, body: `${base.terms.purchase.body} ${policy.refund}` } } };
}

export const SUPPORT_LEGAL_LOCALIZATIONS = Object.fromEntries(
  (Object.keys(baseLocalizations) as SupportedLocale[]).map(locale => [locale, withLifetimePolicy(locale, baseLocalizations[locale])]),
) as Record<SupportedLocale, SupportLegalLocalization>;

export function getSupportLegalLocalization(locale: SupportedLocale): SupportLegalLocalization {
  return SUPPORT_LEGAL_LOCALIZATIONS[locale];
}
