import Link from "next/link";
import { APP_ROUTES, getPricingPlanCatalog, isCheckoutPlanCode } from "@score/shared";
import { CheckoutPlanSelector } from "../../components/CheckoutPlanSelector";
import styles from "../../components/AppCheckout.module.css";
import { readAppLocale } from "../../lib/locale";

type CheckoutSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CheckoutPage({ searchParams }: { searchParams: CheckoutSearchParams }) {
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
              {locale === "zh-CN" ? "继续免费编辑" : "Continue free editing"}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const isChinese = locale === "zh-CN";
  const plans = getPricingPlanCatalog(locale);
  const params = await searchParams;
  const requestedPlan = Array.isArray(params.plan) ? params.plan[0] : params.plan;
  const initialPlanCode = isCheckoutPlanCode(requestedPlan) ? requestedPlan : undefined;

  return (
    <section className={styles.checkoutShell}>
      <header className={styles.pricingHeader}>
        <div>
          <p className="eyebrow">{isChinese ? "积分付费方案" : "Credit pricing"}</p>
          <h1 id="checkout-plans-title" className={styles.pageTitle}>{isChinese ? "选择你的积分套餐" : "Choose your credit plan"}</h1>
          <p className={styles.heroCopy}>
            {isChinese
              ? "每次符合计费规则的成功操作消耗 1 积分。先比较每项价格、能力与资源，再登录继续。"
              : "Each eligible successful operation uses one credit. Compare price, capabilities, and resources before signing in."}
          </p>
        </div>
        <div className={styles.promoPill}>
          <span>{isChinese ? "年付更省" : "Save with annual"}</span>
          <strong>{isChinese ? "节省约 45%～49%" : "Save about 45%–49%"}</strong>
        </div>
      </header>

      <CheckoutPlanSelector
        plans={plans}
        initialPlanCode={initialPlanCode}
        isChinese={isChinese}
        planNote={isChinese
          ? "月度积分每月重置，未使用积分不滚存。查看、播放控制和未提交的基础编辑不消耗积分。"
          : "Monthly credits reset each month and do not roll over. Viewing, playback controls, and unsubmitted basic edits use no credits."}
      />
    </section>
  );
}
