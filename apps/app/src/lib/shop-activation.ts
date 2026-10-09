export const shopPlanNames: Record<string, string> = {
  "starter-monthly": "Starter · 1 个月",
  "starter-annual": "Starter · 1 年",
  "converter-pro-monthly": "Converter Pro · 1 个月",
  "converter-pro-annual": "Converter Pro · 1 年",
};

export function shopError(error: string, status?: number) {
  const messages: Record<string, string> = {
    "Activation code not found.": "没有找到这个激活码，请完整复制店铺发来的激活码。",
    "Activation code has expired.": "这个激活码已超过兑换截止时间，请联系购买店铺。",
    "Activation code has been disabled.": "这个激活码已停用，请联系购买店铺核对订单。",
    "Activation code already used.": "这个激活码已绑定其他账户。请使用首次激活时的邮箱登录，或联系购买店铺。",
    "Activation code is required.": "请输入完整的激活码。",
    "Code login must be enabled by the existing account.": "此码已兑换，但尚未开启登录。续期码请配合原登录码使用；旧邮箱账户可在下方登录原账户后开启。",
    "This code account is unavailable.": "这个账户当前无法使用，请联系购买店铺核对订单。",
    "Only a code redeemed by this account can enable login.": "请填写已由当前账户兑换的激活码，未兑换或属于其他账户的码不能用于此操作。",
    "Email already registered.": "这个邮箱已注册，请点击“登录”并输入原密码。",
    "Invalid email or password.": "邮箱或密码不正确，请重新输入，或点击“忘记密码”。",
    "Email and password are required.": "请输入邮箱和密码。",
    "Please enter a valid email address.": "请输入有效的邮箱，例如 QQ 邮箱或 163 邮箱。",
    "Password must be at least 8 characters.": "密码至少需要 8 个字符。",
    "Invalid admin API key.": "管理密码不正确，请重新输入。",
    "Admin routes are disabled.": "管理后台尚未配置，请联系网站管理员。",
    "Only unused activation codes can be disabled.": "只能停用未兑换的激活码，请刷新列表后核对状态。",
    "Redemption deadline must be in the future.": "兑换截止时间必须晚于当前时间。",
    "Invalid prefix or note.": "前缀只能包含最多 8 位字母或数字，备注不能超过 500 字。",
  };
  if (messages[error]) return messages[error];
  if (status === 401) return "登录已过期，请重新登录后再操作。";
  if (status === 429) return "操作过于频繁，请稍后再试。";
  return "暂时无法完成操作，请检查网络后重试；仍有问题请联系购买店铺。";
}

export function shopDeliveryText(item: { code: string; planCode: string | null; entitlementDays: number; expiresAt: string | null }, origin: string) {
  return [
    "五线谱工具使用入口：", `${origin.replace(/\/$/, "")}/cn`,
    `激活码：${item.code}`,
    `套餐：${item.planCode ? shopPlanNames[item.planCode] ?? item.planCode : `${item.entitlementDays} 天使用权限`}`,
    "打开链接 → 输入激活码登录 → 选择功能开始使用，无需邮箱、密码或注册。",
    "首次登录开始计算使用期限；以后换设备仍用同一码登录，乐谱和额度保存在同一账户中，重复登录不会重新计时。不会自动续费或扣款。",
    "激活码就是登录凭证，请妥善保存、不要分享。续期时先用原码登录，再选择“续期当前账户”兑换新码；以后仍用原码登录。",
    ...(item.expiresAt ? [`请在 ${new Date(item.expiresAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}（北京时间）前兑换。`] : []),
    process.env.NEXT_PUBLIC_AUDIO_TRANSCRIPTION_AVAILABLE === "true" ? "扫描件和录音识别后请校对；音频转谱适合清晰单旋律，复杂伴奏、人声混合不保证准确。" : "扫描件识别后请校对。音频转五线谱暂未开放，激活套餐不会提前开启此功能。",
    "遇到问题请在购买店铺提供订单号和报错截图。",
  ].join("\n");
}
