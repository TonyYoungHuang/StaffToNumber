import type { SupportedLocale } from "@score/i18n";
import { deStaticMarketing } from "./locales/de";
import { enStaticMarketing } from "./locales/en";
import { esStaticMarketing } from "./locales/es";
import { frStaticMarketing } from "./locales/fr";
import { jaStaticMarketing } from "./locales/ja";
import { koStaticMarketing } from "./locales/ko";
import { ruStaticMarketing } from "./locales/ru";
import { zhCNStaticMarketing } from "./locales/zh-CN";
import { zhTWStaticMarketing } from "./locales/zh-TW";
import type { ResolvedFaqGroup, StaticMarketingLocalization } from "./types";

export { STATIC_MARKETING_MEDIA_SOURCE_LOCALES, getStaticMarketingMedia } from "./media";
export type {
  AboutPageCopy,
  FaqPageCopy,
  MarketingMetadataCopy,
  NumberedNotationPageCopy,
  ReadingGuidePageCopy,
  ResolvedFaqGroup,
  StaticMarketingLocalization,
} from "./types";

export const STATIC_MARKETING_LOCALIZATIONS = {
  en: enStaticMarketing,
  "zh-CN": zhCNStaticMarketing,
  "zh-TW": zhTWStaticMarketing,
  ja: jaStaticMarketing,
  ko: koStaticMarketing,
  fr: frStaticMarketing,
  es: esStaticMarketing,
  de: deStaticMarketing,
  ru: ruStaticMarketing,
} as const satisfies Readonly<Record<SupportedLocale, StaticMarketingLocalization>>;

export function getStaticMarketingLocalization(locale: SupportedLocale): StaticMarketingLocalization {
  return STATIC_MARKETING_LOCALIZATIONS[locale];
}

export function resolveFaqGroups(
  locale: SupportedLocale,
  checkoutAvailable: boolean,
): readonly ResolvedFaqGroup[] {
  const [purchase, uploads, support] = getStaticMarketingLocalization(locale).faq.groups;
  const [liveItem, accessItem, paymentItem] = purchase.items;
  return [
    {
      title: purchase.title,
      items: [
        { question: liveItem[0], answer: liveItem[1] },
        {
          question: accessItem.question,
          answer: checkoutAvailable ? accessItem.availableAnswer : accessItem.pendingAnswer,
        },
        {
          question: paymentItem.question,
          answer: checkoutAvailable ? paymentItem.availableAnswer : paymentItem.pendingAnswer,
        },
      ],
    },
    {
      title: uploads.title,
      items: uploads.items.map(([question, answer]) => ({ question, answer })),
    },
    {
      title: support.title,
      items: support.items.map(([question, answer]) => ({ question, answer })),
    },
  ];
}
