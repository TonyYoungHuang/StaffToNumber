
import { adminText } from "../../../lib/admin-messages";
﻿import { AdminActivationCodesManager } from "../../../components/AdminActivationCodesManager";
import { readAppLocale } from "../../../lib/locale";

export default async function AdminCodesPage() {
  const locale = await readAppLocale();

  return (
    <section className="container page-shell">
      <div className="page-banner">
        <p className="eyebrow">{locale === "zh-CN" ? "激活码后台" : adminText(locale, "Activation admin")}</p>
        <h1 className="page-title">{locale === "zh-CN" ? "生成、复制和管理激活码。" : adminText(locale, "Generate, copy, and manage activation codes.")}</h1>
        <p className="body-copy large">
          {locale === "zh-CN"
            ? "选择与网站一致的套餐，生成激活码并复制发货文案。管理密码仅供店主使用，请勿发送给买家。"
            : adminText(locale, "Use this console to generate activation-code batches and distribute them to mainland China users. Requests are protected by `ADMIN_API_KEY`.")}
        </p>
      </div>
      <AdminActivationCodesManager />
    </section>
  );
}

