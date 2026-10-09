
import { adminText } from "../../../lib/admin-messages";
import { AdminSecurityAuditManager } from "../../../components/AdminSecurityAuditManager";
import { readAppLocale } from "../../../lib/locale";

export default async function AdminSecurityPage() {
  const locale = await readAppLocale();
  return (
    <section className="container page-shell">
      <div className="page-banner">
        <p className="eyebrow">{locale === "zh-CN" ? "安全运营" : adminText(locale, "Security operations")}</p>
        <h1 className="page-title">{locale === "zh-CN" ? "安全审计与请求追踪" : adminText(locale, "Security audit and request tracing")}</h1>
      </div>
      <AdminSecurityAuditManager />
    </section>
  );
}
