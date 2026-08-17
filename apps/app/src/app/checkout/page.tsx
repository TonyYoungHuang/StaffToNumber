import { AppCheckoutClient } from "../../components/AppCheckoutClient";
import { readAppLocale } from "../../lib/locale";

export default async function CheckoutPage() {
  const locale = await readAppLocale();
  const checkoutAvailable = process.env.NEXT_PUBLIC_CHECKOUT_AVAILABLE === "true";

  if (!checkoutAvailable) {
    return (
      <section className="container page-shell">
        <div className="page-banner">
          <p className="eyebrow">{locale === "zh-CN" ? "支付上线状态" : "Checkout launch status"}</p>
          <h1 className="page-title">
            {locale === "zh-CN" ? "正式支付正在完成生产交易验收。" : "Production checkout is completing live transaction verification."}
          </h1>
          <p className="body-copy large">
            {locale === "zh-CN"
              ? "当前正式站不会创建测试订单或跳转到 staging 支付。生产支付、退款和订阅续费通过最终验收后，此入口将正式开放。"
              : "The production site will not create test orders or redirect to staging checkout. This entry opens after live payments, refunds, and subscription renewals pass final verification."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="container page-shell">
      <div className="page-banner">
        <p className="eyebrow">{locale === "zh-CN" ? "在线支付" : "Online payment"}</p>
        <h1 className="page-title">{locale === "zh-CN" ? "注册后支付，系统自动开通。" : "Register, pay, and get activated automatically."}</h1>
        <p className="body-copy large">
          {locale === "zh-CN"
            ? "针对海外用户，支付完成后会直接把权限开通到当前账户；激活码仅保留给中国大陆电商销售场景。"
            : "For international customers, payment activates the current account automatically. Activation codes stay reserved for mainland-China ecommerce sales."}
        </p>
      </div>
      <AppCheckoutClient />
    </section>
  );
}
