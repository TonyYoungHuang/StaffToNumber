import { AppCheckoutClient } from "../../components/AppCheckoutClient";
import styles from "../../components/AppCheckout.module.css";
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

  const isChinese = locale === "zh-CN";

  return (
    <section className="container page-shell">
      <div className={`page-banner ${styles.hero}`}>
        <p className="eyebrow">{isChinese ? "升级套餐" : "Upgrade your plan"}</p>
        <h1 className={styles.pageTitle}>{isChinese ? "选择适合你的积分套餐" : "Choose the credit plan that fits your work"}</h1>
        <p className="body-copy large">
          {isChinese
            ? "每个后台处理任务消耗 1 积分；查看、播放控制和未提交的基础编辑为 0 积分。请先查看套餐，再登录账户继续。"
            : "Each server-side processing job uses one credit. Viewing, playback controls, and unsubmitted basic edits use zero credits. Review the plans, then sign in to continue."}
        </p>
      </div>

      <section className={styles.plansPanel} aria-labelledby="checkout-plans-title">
        <div className={styles.sectionHeader}>
          <div>
            <p className="eyebrow">{isChinese ? "积分付费方案" : "Credit pricing"}</p>
            <h2 id="checkout-plans-title" className={styles.sectionHeading}>
              {isChinese ? "按实际处理任务购买积分" : "Buy credits for real processing jobs"}
            </h2>
          </div>
          <p className="body-copy">
            {isChinese ? "月度积分每月重置，未用积分不滚存。" : "Monthly credits reset each month and do not roll over."}
          </p>
        </div>

        <div className={styles.planGrid}>
          {isChinese ? (
            <>
              <article className={styles.planCard}>
                <div className={styles.planTop}><div><span className={styles.planBadge}>个人用户</span><h3>专业版 Pro</h3></div><strong>100 积分 / 月</strong></div>
                <p className={styles.creditPrice}>$0.13 <span>/ ¥0.83 / 积分</span></p>
                <p className={styles.regularPrice}>年付折算 · 常规月付单价 $0.19 / ¥1.29</p>
                <ul className={styles.planFeatures}><li>月付：$19 / ¥129</li><li>年付：$159 / ¥999</li><li>适合偶尔识谱、移调和简谱转换</li></ul>
                <a className="button button-primary" href="#checkout-action">登录后继续</a>
              </article>
              <article className={`${styles.planCard} ${styles.studioPlan}`}>
                <div className={styles.planTop}><div><span className={styles.planBadge}>批量处理</span><h3>批量版 Studio</h3></div><strong>500 积分 / 月</strong></div>
                <p className={styles.creditPrice}>$0.18 <span>/ ¥1.27 / 积分</span></p>
                <p className={styles.regularPrice}>年付折算 · 常规月付单价 $0.26 / ¥1.80</p>
                <ul className={styles.planFeatures}><li>月付：$129 / ¥899</li><li>年付：$1,099 / ¥7,599</li><li>适合工作室、教师团队、出版与批量处理</li></ul>
                <a className="button button-secondary" href="#checkout-action">登录后继续</a>
              </article>
            </>
          ) : (
            <>
              <article className={styles.planCard}>
                <div className={styles.planTop}><div><span className={styles.planBadge}>Individuals</span><h3>Pro</h3></div><strong>100 credits / month</strong></div>
                <p className={styles.creditPrice}>$0.13 <span>/ ¥0.83 / credit</span></p>
                <p className={styles.regularPrice}>Annual effective rate · regular monthly rate $0.19 / ¥1.29</p>
                <ul className={styles.planFeatures}><li>Monthly: $19 / ¥129</li><li>Annual: $159 / ¥999</li><li>For occasional recognition, transposition, and Jianpu conversion</li></ul>
                <a className="button button-primary" href="#checkout-action">Sign in to continue</a>
              </article>
              <article className={`${styles.planCard} ${styles.studioPlan}`}>
                <div className={styles.planTop}><div><span className={styles.planBadge}>Batch work</span><h3>Studio</h3></div><strong>500 credits / month</strong></div>
                <p className={styles.creditPrice}>$0.18 <span>/ ¥1.27 / credit</span></p>
                <p className={styles.regularPrice}>Annual effective rate · regular monthly rate $0.26 / ¥1.80</p>
                <ul className={styles.planFeatures}><li>Monthly: $129 / ¥899</li><li>Annual: $1,099 / ¥7,599</li><li>For studios, teaching teams, publishing, and batch processing</li></ul>
                <a className="button button-secondary" href="#checkout-action">Sign in to continue</a>
              </article>
            </>
          )}
        </div>
        <p className={styles.planNote}>
          {isChinese
            ? "1 积分对应一次创建成功的后台任务，包括 PDF／图片识谱、整谱移调、五线谱转简谱和已开放的服务器端导出。"
            : "One credit covers one successfully created server-side job, including PDF/image recognition, whole-score transposition, staff-to-Jianpu, and available server exports."}
        </p>
      </section>

      <AppCheckoutClient />
    </section>
  );
}
