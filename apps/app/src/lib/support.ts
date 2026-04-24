export type SupportTemplate = {
  key: string;
  title: string;
  description: string;
  href: string;
};

export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@scoretransposer.com";
export const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://scoretransposer.com";

function buildSupportHref(category: string) {
  const base = PUBLIC_SITE_URL.endsWith("/") ? PUBLIC_SITE_URL.slice(0, -1) : PUBLIC_SITE_URL;
  return `${base}/support?category=${encodeURIComponent(category)}&source=app`;
}

export function buildSupportTemplates(locale: string): SupportTemplate[] {
  if (locale === "zh-CN") {
    return [
      {
        key: "payment",
        title: "支付 / 订单核查",
        description: "适用于支付后未看到激活码、回跳异常、重复扣款或需要人工核单的情况。",
        href: buildSupportHref("payment"),
      },
      {
        key: "activation",
        title: "激活码 / 权限异常",
        description: "适用于兑换失败、权限未生效、到期时间异常等问题。",
        href: buildSupportHref("activation"),
      },
      {
        key: "job",
        title: "上传 / 结果问题",
        description: "适用于 PDF 上传失败、任务卡住、结果下载异常或 final / draft 需要人工确认。",
        href: buildSupportHref("job"),
      },
      {
        key: "privacy",
        title: "删除 / 隐私请求",
        description: "适用于删除数据、导出数据或隐私相关人工处理。",
        href: buildSupportHref("privacy"),
      },
    ];
  }

  return [
    {
      key: "payment",
      title: "Payment and order review",
      description: "Use when checkout succeeds but no activation code appears, or when a manual order review is needed.",
      href: buildSupportHref("payment"),
    },
    {
      key: "activation",
      title: "Activation and entitlement issue",
      description: "Use when redemption fails, access does not activate, or entitlement dates look wrong.",
      href: buildSupportHref("activation"),
    },
    {
      key: "job",
      title: "Upload or result issue",
      description: "Use when PDF upload fails, jobs stall, downloads break, or final vs draft needs manual review.",
      href: buildSupportHref("job"),
    },
    {
      key: "privacy",
      title: "Privacy or deletion request",
      description: "Use when you need deletion, export, or a privacy-related manual review.",
      href: buildSupportHref("privacy"),
    },
  ];
}
