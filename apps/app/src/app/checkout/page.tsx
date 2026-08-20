import { AppCheckoutClient } from "../../components/AppCheckoutClient";
import { readAppLocale } from "../../lib/locale";

import Link from "next/link";
import { APP_ROUTES } from "@score/shared";

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
          <div className="button-row">
            <Link href={`${APP_ROUTES.scores}/new/scan`} className="button button-primary">
              {locale === "zh-CN" ? "继续使用免费预览" : "Continue with the free preview"}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="container page-shell">
      <div className="page-banner">
        <p className="eyebrow">{locale === "zh-CN" ? "在线支付" : "Online payment"}</p>
        <h1 className="page-title">{locale === "zh-CN" ? "登录账户，选择支付渠道；未开通渠道会先记录你的需求。" : "Sign in and choose a provider; unavailable channels record your purchase request first."}</h1>
        <p className="body-copy large">
          {locale === "zh-CN"
            ? "点击继续后，后台会先向站长发送付款意向邮件。只有已完成正式商户配置的 Stripe 或 Paddle 才会跳转付款；建设中的渠道只记录需求，不会扣款。"
            : "After you continue, the server first emails the owner about your purchase intent. Only a fully configured Stripe or Paddle channel redirects to payment; a channel under construction records demand without charging you."}
        </p>
      </div>
      <AppCheckoutClient />
    </section>
  );
}
