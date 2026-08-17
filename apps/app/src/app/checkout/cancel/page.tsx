import Link from "next/link";
import { APP_ROUTES } from "@score/shared";
import { readAppLocale } from "../../../lib/locale";
import { accountActivationRoute, checkoutAvailable } from "../../../lib/release";

export default async function CheckoutCancelPage() {
  const locale = await readAppLocale();

  return (
    <section className="container page-shell">
      <div className="surface-panel stack-lg">
        <h1 className="page-title">{locale === "zh-CN" ? "支付已取消" : "Payment cancelled"}</h1>
        <p className="body-copy large">
          {locale === "zh-CN"
            ? "订单尚未完成支付。你可以稍后重新发起支付。"
            : "The order was not completed. You can restart payment whenever you are ready."}
        </p>
        <div className="button-row">
          <Link href={accountActivationRoute} className="button button-primary">
            {checkoutAvailable
              ? locale === "zh-CN" ? "重新支付" : "Try payment again"
              : locale === "zh-CN" ? "查看激活方式" : "View activation options"}
          </Link>
          <Link href={APP_ROUTES.dashboard} className="button button-secondary">
            {locale === "zh-CN" ? "返回控制台" : "Back to dashboard"}
          </Link>
        </div>
      </div>
    </section>
  );
}
