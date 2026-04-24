import { DashboardBannerActions } from "../../components/DashboardBannerActions";
import { DashboardClient } from "../../components/DashboardClient";
import { readAppLocale } from "../../lib/locale";

export default async function DashboardPage() {
  const locale = await readAppLocale();

  return (
    <section className="container page-shell">
      <div className="page-banner split">
        <div className="stack-md">
          <p className="eyebrow">{locale === "zh-CN" ? "控制台" : "Dashboard"}</p>
          <h1 className="page-title">
            {locale === "zh-CN" ? "账户概览与授权状态。" : "Account overview and entitlement state."}
          </h1>
          <p className="body-copy large">
            {locale === "zh-CN"
              ? "查看登录状态、当前授权有效期，以及“五线谱 PDF -> 简谱”流程的下一步操作。"
              : "Review sign-in status, current entitlement dates, and the next operational step in the Staff PDF -> Jianpu workflow."}
          </p>
        </div>
        <div className="stack-md">
          <DashboardBannerActions />
          <p className="micro-copy">
            {locale === "zh-CN"
              ? "这里把激活、上传和任务排队整合到同一套工作台视觉语言里。"
              : "This dashboard keeps activation, uploads, and queue operations visually aligned with the Stitch studio language."}
          </p>
        </div>
      </div>
      <DashboardClient />
    </section>
  );
}
