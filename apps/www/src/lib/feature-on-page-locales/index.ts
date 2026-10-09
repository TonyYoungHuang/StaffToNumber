import type { SupportedLocale } from "@score/i18n";
import type { FeatureOnPageContent } from "../feature-on-page";
import { zhCN } from "./zh-CN";
import { zhTW } from "./zh-TW";
import { ja } from "./ja";
import { ko } from "./ko";
import { fr } from "./fr";
import { de } from "./de";
import { ru } from "./ru";

// Jianpu changes are deliberately limited to the four locales requested by the owner.
export const localizedFeatureOnPage: Partial<Record<SupportedLocale, Record<string, FeatureOnPageContent>>> = {
  "zh-CN": zhCN, "zh-TW": zhTW, ja, ko, fr, de, ru,
};
