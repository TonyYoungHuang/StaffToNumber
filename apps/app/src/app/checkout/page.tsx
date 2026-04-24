import { AppCheckoutClient } from "../../components/AppCheckoutClient";
import { readAppLocale } from "../../lib/locale";

export default async function CheckoutPage() {
  const locale = await readAppLocale();

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
