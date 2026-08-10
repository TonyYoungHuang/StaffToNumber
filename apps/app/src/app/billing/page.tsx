import { BillingManager } from "../../components/BillingManager";
import { readAppLocale } from "../../lib/locale";

export default async function BillingPage() {
  const locale = await readAppLocale();
  return (
    <section className="container page-shell">
      <div className="page-banner">
        <p className="eyebrow">{locale === "zh-CN" ? "账单中心" : "Billing"}</p>
        <h1 className="page-title">{locale === "zh-CN" ? "管理订阅、续费、退款与学校席位。" : "Manage subscriptions, renewals, refunds, and school seats."}</h1>
        <p className="body-copy large">{locale === "zh-CN" ? "订阅访问以支付平台 Webhook 账本为准，续费失败、取消和退款会同步反映在权限状态中。" : "Subscription access follows the verified provider webhook ledger, including renewal failures, cancellations, and refunds."}</p>
      </div>
      <BillingManager />
    </section>
  );
}
