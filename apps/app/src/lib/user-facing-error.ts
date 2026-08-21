export type UserFacingLocale = "zh-CN" | "en";

const ERROR_COPY: Array<{ pattern: RegExp; zh: string; en: string }> = [
  {
    pattern: /password must be at least 8 characters/iu,
    zh: "密码至少需要 8 个字符。",
    en: "Password must be at least 8 characters.",
  },
  {
    pattern: /invalid email or password/iu,
    zh: "邮箱或密码不正确，请检查后重试。",
    en: "The email or password is incorrect. Please try again.",
  },
  {
    pattern: /uploaded file content does not match a supported file type/iu,
    zh: "文件内容与支持的格式不符，请重新选择有效的乐谱 PDF 或图片。",
    en: "The file contents do not match a supported score format. Choose another PDF or image.",
  },
  {
    pattern: /activation code not found/iu,
    zh: "未找到这个激活码，请检查是否输入完整，或联系支持核查。",
    en: "That activation code was not found. Check the code or contact support.",
  },
  {
    pattern: /an active entitlement is required/iu,
    zh: "此功能需要有效权限，请先完成开通。",
    en: "This feature requires active access.",
  },
  {
    pattern: /request failed|network request failed|failed to fetch/iu,
    zh: "请求未完成，请检查网络后重试。",
    en: "The request did not finish. Check your connection and try again.",
  },
];

export function userFacingError(error: string | null | undefined, locale: string, fallback?: string) {
  const normalized = error?.trim();
  const isChinese = locale === "zh-CN";
  if (!normalized) return fallback ?? (isChinese ? "操作未完成，请稍后重试。" : "The action did not finish. Please try again.");

  const match = ERROR_COPY.find((item) => item.pattern.test(normalized));
  if (match) return isChinese ? match.zh : match.en;
  if (!isChinese || /[\u3400-\u9fff]/u.test(normalized)) return normalized;
  return fallback ?? "操作未完成，请稍后重试。";
}
