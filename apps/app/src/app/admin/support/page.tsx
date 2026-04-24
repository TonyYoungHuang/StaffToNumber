import { AdminSupportRequestsManager } from "../../../components/AdminSupportRequestsManager";
import { readAppLocale } from "../../../lib/locale";

export default async function AdminSupportPage() {
  const locale = await readAppLocale();

  return (
    <section className="container page-shell">
      <div className="page-banner">
        <p className="eyebrow">{locale === "zh-CN" ? "支持后台" : "Support admin"}</p>
        <h1 className="page-title">{locale === "zh-CN" ? "查看工单、筛选状态并更新处理进度。" : "Review support requests, filter by status, and update handling progress."}</h1>
        <p className="body-copy large">
          {locale === "zh-CN"
            ? "这里用于查看官网 Support 表单提交到 API 的工单，并用 `ADMIN_API_KEY` 更新状态。"
            : "Use this console to inspect support requests submitted from the public support form and update their status with `ADMIN_API_KEY`."}
        </p>
      </div>
      <AdminSupportRequestsManager />
    </section>
  );
}
