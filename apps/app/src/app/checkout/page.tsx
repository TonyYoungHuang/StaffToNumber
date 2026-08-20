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
  const plans = isChinese
    ? [
        {
          code: "pro-monthly",
          badge: "灵活月付",
          name: "专业版 Pro",
          cycle: "月付",
          price: "$19 / ¥129",
          unitPrice: "$0.19 / ¥1.29 / 积分",
          credits: "100 积分 / 月",
          audience: "适合偶尔识谱、移调和简谱转换的个人用户",
          benefits: ["PDF／图片乐谱识别", "在线结构化校对与编辑", "整谱移调与调号重算", "五线谱转简谱", "乐谱播放与已开放的服务器端导出"],
          resources: ["个人乐谱库", "MusicXML／MIDI／PDF 等已开放格式", "按月续费，可随时停止后续续费"],
          cta: "选择 Pro 月付",
          featured: false,
        },
        {
          code: "pro-annual",
          badge: "个人用户推荐",
          name: "专业版 Pro",
          cycle: "年付",
          price: "$159 / ¥999",
          unitPrice: "$0.13 / ¥0.83 / 积分",
          credits: "100 积分 / 月",
          audience: "适合持续处理个人乐谱、希望降低单次成本的用户",
          benefits: ["包含 Pro 月付全部功能", "PDF／图片识谱与在线校对", "移调、简谱转换与乐谱播放", "每月 100 积分，按月重置", "全年持续使用，无需每月重复购买"],
          resources: ["年付节省 $69 / ¥549", "个人乐谱库与修订记录", "MusicXML／MIDI／PDF 等已开放格式"],
          cta: "选择 Pro 年付",
          featured: true,
        },
        {
          code: "studio-monthly",
          badge: "批量工作",
          name: "批量版 Studio",
          cycle: "月付",
          price: "$129 / ¥899",
          unitPrice: "$0.26 / ¥1.80 / 积分",
          credits: "500 积分 / 月",
          audience: "适合工作室、教师团队和阶段性批量处理",
          benefits: ["包含 Pro 全部核心能力", "批量 PDF／图片识谱工作流", "整谱移调与五线谱转简谱", "在线校对、播放和项目管理", "每月 500 积分，适合高频任务"],
          resources: ["工作室与教学场景使用", "批量乐谱项目资源", "MusicXML／MIDI／PDF 等已开放格式"],
          cta: "选择 Studio 月付",
          featured: false,
        },
        {
          code: "studio-annual",
          badge: "批量处理优选",
          name: "批量版 Studio",
          cycle: "年付",
          price: "$1,099 / ¥7,599",
          unitPrice: "$0.18 / ¥1.27 / 积分",
          credits: "500 积分 / 月",
          audience: "适合出版、教师团队与长期批量乐谱处理",
          benefits: ["包含 Studio 月付全部能力", "每月 500 积分，按月重置", "批量识谱、校对与转换工作流", "长期项目连续使用", "适合团队、出版与稳定高频处理"],
          resources: ["年付节省 $449 / ¥3,189", "批量乐谱项目资源", "MusicXML／MIDI／PDF 等已开放格式"],
          cta: "选择 Studio 年付",
          featured: false,
        },
      ]
    : [
        {
          code: "pro-monthly",
          badge: "Flexible monthly",
          name: "Pro",
          cycle: "Monthly",
          price: "$19 / ¥129",
          unitPrice: "$0.19 / ¥1.29 per credit",
          credits: "100 credits / month",
          audience: "For individuals who occasionally recognize, transpose, or convert scores",
          benefits: ["PDF and image score recognition", "Structured online correction and editing", "Whole-score transposition", "Staff-to-Jianpu conversion", "Playback and available server exports"],
          resources: ["Personal score library", "Available MusicXML, MIDI, and PDF formats", "Monthly renewal with no long commitment"],
          cta: "Choose Pro monthly",
          featured: false,
        },
        {
          code: "pro-annual",
          badge: "Recommended for individuals",
          name: "Pro",
          cycle: "Annual",
          price: "$159 / ¥999",
          unitPrice: "$0.13 / ¥0.83 per credit",
          credits: "100 credits / month",
          audience: "For individuals who process scores regularly and want a lower unit cost",
          benefits: ["Everything in Pro monthly", "PDF/image recognition and correction", "Transposition, Jianpu, and playback", "100 credits reset each month", "Continuous annual access"],
          resources: ["Save $69 / ¥549 annually", "Personal library and revision history", "Available MusicXML, MIDI, and PDF formats"],
          cta: "Choose Pro annual",
          featured: true,
        },
        {
          code: "studio-monthly",
          badge: "Batch work",
          name: "Studio",
          cycle: "Monthly",
          price: "$129 / ¥899",
          unitPrice: "$0.26 / ¥1.80 per credit",
          credits: "500 credits / month",
          audience: "For studios, teaching teams, and short-term batch processing",
          benefits: ["All Pro core capabilities", "Batch PDF/image recognition workflows", "Whole-score transpose and Jianpu", "Correction, playback, and project management", "500 monthly credits for frequent jobs"],
          resources: ["Studio and teaching use cases", "Batch score project resources", "Available MusicXML, MIDI, and PDF formats"],
          cta: "Choose Studio monthly",
          featured: false,
        },
        {
          code: "studio-annual",
          badge: "Best for batch work",
          name: "Studio",
          cycle: "Annual",
          price: "$1,099 / ¥7,599",
          unitPrice: "$0.18 / ¥1.27 per credit",
          credits: "500 credits / month",
          audience: "For publishing, teaching teams, and sustained batch score processing",
          benefits: ["Everything in Studio monthly", "500 credits reset each month", "Batch recognition, correction, and conversion", "Continuous access for long projects", "Designed for stable high-volume workflows"],
          resources: ["Save $449 / ¥3,189 annually", "Batch score project resources", "Available MusicXML, MIDI, and PDF formats"],
          cta: "Choose Studio annual",
          featured: false,
        },
      ];

  return (
    <section className={styles.checkoutShell}>
      <header className={styles.pricingHeader}>
        <div>
          <p className="eyebrow">{isChinese ? "积分付费方案" : "Credit pricing"}</p>
          <h1 id="checkout-plans-title" className={styles.pageTitle}>{isChinese ? "选择你的积分套餐" : "Choose your credit plan"}</h1>
          <p className={styles.heroCopy}>
            {isChinese
              ? "每个创建成功的后台处理任务消耗 1 积分。先比较每项价格、能力与资源，再登录继续。"
              : "Each successfully created server-side job uses one credit. Compare price, capabilities, and resources before signing in."}
          </p>
        </div>
        <div className={styles.promoPill}>
          <span>{isChinese ? "年付更省" : "Save with annual"}</span>
          <strong>{isChinese ? "最高节省 ¥3,189" : "Save up to $449"}</strong>
        </div>
      </header>

      <section className={styles.plansPanel} aria-labelledby="checkout-plans-title">
        <div className={styles.planGrid}>
          {plans.map((plan) => (
            <article key={plan.code} className={`${styles.planCard} ${plan.featured ? styles.featuredPlan : ""}`}>
              <div className={styles.planTop}>
                <span className={styles.planBadge}>{plan.badge}</span>
                <span className={styles.planCycle}>{plan.cycle}</span>
              </div>
              <div className={styles.planIdentity}>
                <h2>{plan.name}</h2>
                <p>{plan.audience}</p>
              </div>
              <div className={styles.priceBlock}>
                <p className={styles.planPrice}>{plan.price}</p>
                <p className={styles.unitPrice}>{plan.unitPrice}</p>
              </div>
              <div className={styles.creditBox}>
                <span aria-hidden="true">⚡</span>
                <div><strong>{plan.credits}</strong><small>{isChinese ? "创建成功的后台任务计费" : "Charged for successfully created server jobs"}</small></div>
              </div>
              <a className={`button ${plan.featured ? "button-primary" : "button-secondary"} ${styles.planButton}`} href="#checkout-action">
                {plan.cta}
              </a>
              <div className={styles.cardSection}>
                <h3>{isChinese ? "包含能力" : "Included capabilities"}</h3>
                <ul className={styles.planFeatures}>{plan.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul>
              </div>
              <div className={`${styles.cardSection} ${styles.resourceSection}`}>
                <h3>{isChinese ? "福利与资源" : "Benefits and resources"}</h3>
                <ul className={styles.resourceList}>{plan.resources.map((resource) => <li key={resource}>{resource}</li>)}</ul>
              </div>
            </article>
          ))}
        </div>
        <p className={styles.planNote}>
          {isChinese
            ? "月度积分每月重置，未使用积分不滚存。查看、播放控制和未提交的基础编辑不消耗积分。"
            : "Monthly credits reset each month and do not roll over. Viewing, playback controls, and unsubmitted basic edits use no credits."}
        </p>
      </section>

      <div className={styles.checkoutActionWrap}><AppCheckoutClient /></div>
    </section>
  );
}
