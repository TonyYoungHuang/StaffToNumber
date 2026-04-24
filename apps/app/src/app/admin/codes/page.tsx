import { AdminActivationCodesManager } from "../../../components/AdminActivationCodesManager";
import { readAppLocale } from "../../../lib/locale";

export default async function AdminCodesPage() {
  const locale = await readAppLocale();

  return (
    <section className="container page-shell">
      <div className="page-banner">
        <p className="eyebrow">{locale === "zh-CN" ? "激活码后台" : "Activation admin"}</p>
        <h1 className="page-title">{locale === "zh-CN" ? "生成、复制和管理激活码。" : "Generate, copy, and manage activation codes."}</h1>
        <p className="body-copy large">
          {locale === "zh-CN"
            ? "这里用于后台批量生成激活码，然后分发给中国大陆用户完成激活。接口受 `ADMIN_API_KEY` 保护。"
            : "Use this console to generate activation-code batches and distribute them to mainland China users. Requests are protected by `ADMIN_API_KEY`."}
        </p>
      </div>
      <AdminActivationCodesManager />
    </section>
  );
}

