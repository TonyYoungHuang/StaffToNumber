import type { SupportedLocale } from "@score/i18n";
import type { CheckoutMessages } from "./types";
import { enCheckoutMessages } from "./locales/en";
import { zhCNCheckoutMessages } from "./locales/zh-CN";
import { zhTWCheckoutMessages } from "./locales/zh-TW";
import { jaCheckoutMessages } from "./locales/ja";
import { koCheckoutMessages } from "./locales/ko";
import { frCheckoutMessages } from "./locales/fr";
import { esCheckoutMessages } from "./locales/es";
import { deCheckoutMessages } from "./locales/de";
import { ruCheckoutMessages } from "./locales/ru";

export type { CheckoutMessages, CheckoutStartCopy, CheckoutStatusCopy, CheckoutCancelCopy, PaddleCheckoutCopy } from "./types";

export const CHECKOUT_MESSAGE_CATALOGS = {
  en: enCheckoutMessages,
  "zh-CN": zhCNCheckoutMessages,
  "zh-TW": zhTWCheckoutMessages,
  ja: jaCheckoutMessages,
  ko: koCheckoutMessages,
  fr: frCheckoutMessages,
  es: esCheckoutMessages,
  de: deCheckoutMessages,
  ru: ruCheckoutMessages,
} as const satisfies Record<SupportedLocale, CheckoutMessages>;

export function getCheckoutMessages(locale: SupportedLocale): CheckoutMessages {
  return CHECKOUT_MESSAGE_CATALOGS[locale];
}
