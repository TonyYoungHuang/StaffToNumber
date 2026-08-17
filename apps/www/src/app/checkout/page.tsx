import type { Metadata } from "next";
import { MetricCard, Panel, SectionIntro, WorkflowStep } from "@score/ui";
import { CheckoutClient } from "../../components/CheckoutClient";
import { readSiteLocale } from "../../lib/locale";
import { siteConfig } from "../../lib/site";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CheckoutPage() {
  const locale = await readSiteLocale();
  const isChinese = locale === "zh-CN";

  if (!siteConfig.release.checkoutAvailable) {
    return (
      <section className="public-container public-page stack-xl">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "支付状态" : "Checkout status"}
            title={isChinese ? "在线支付仍在完成生产交易验证。" : "Online checkout is pending production transaction verification."}
            body={isChinese ? "在 Stripe 或 Paddle 的成功、失败、退款和权益发放路径全部验证前，本站不会开始收款。" : "This site will not accept payment until Stripe or Paddle success, failure, refund, and entitlement paths have all passed production verification."}
            titleAs="h1"
            largeBody
          />
          <div className="button-row">
            <a href="/support?category=payment&source=checkout-disabled" className="public-button primary">{isChinese ? "联系支持" : "Contact support"}</a>
          </div>
        </Panel>
      </section>
    );
  }

  const flow = isChinese
    ? [
        {
          step: "01",
          title: "在托管支付页完成付款",
          body: "支付发生在 Stripe 或 Paddle 的托管页面，而不是直接在本站收集银行卡信息。",
        },
        {
          step: "02",
          title: "系统确认订阅并绑定账户",
          body: "付款成功后，系统校验 Stripe 事件，并按付款邮箱把订阅权益绑定到已注册账户。",
        },
        {
          step: "03",
          title: "登录应用并开始使用",
          body: "使用付款邮箱登录应用，后续上传、任务、用量与订阅管理都在账户中完成。",
        },
      ]
    : [
        {
          step: "01",
          title: "Complete payment on the hosted checkout page",
          body: "Payment happens on Stripe or Paddle hosted checkout rather than collecting card data directly on this site.",
        },
        {
          step: "02",
          title: "The system confirms and links the subscription",
          body: "After payment, Stripe events are verified and the subscription is linked to the registered checkout email.",
        },
        {
          step: "03",
          title: "Sign in and start using the tool",
          body: "Sign in with the checkout email, then manage uploads, jobs, usage, and billing in the app.",
        },
      ];

  return (
    <section className="public-container public-page stack-xl">
      <CheckoutClient />

      <section className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "支付之后" : "After checkout"}
            title={isChinese ? "付款之后的路径被刻意设计得很简单。" : "The path after payment is intentionally simple."}
            body={
              isChinese
                ? "你在这里开通的是按月订阅。支付确认、账户归属和应用内使用是连贯的自动化流程。"
                : "You start a monthly subscription here. Payment confirmation, account attribution, and in-app access form one automated flow."
            }
            largeBody
          />
          <div className="workflow-grid">
            {flow.map((item) => (
              <WorkflowStep key={item.step} step={item.step} title={item.title} body={item.body} />
            ))}
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "信任细节" : "Trust details"}
            title={isChinese ? "在付款前先把交付边界讲清楚。" : "Clarify the delivery boundary before the user pays."}
          />
          <div className="metric-grid">
            <MetricCard
              label={isChinese ? "购买结果" : "Purchase result"}
              value={isChinese ? "账户订阅" : "Account subscription"}
              body={
                isChinese
                  ? "支付成功后，订阅按付款邮箱归属到已注册账户，无需额外兑换。"
                  : "After payment, the subscription is attributed to the registered checkout email without an extra redemption step."
              }
            />
            <MetricCard
              label={isChinese ? "文件处理" : "File handling"}
              value={isChinese ? "应用内完成" : "Inside the app"}
              body={
                isChinese
                  ? "上传 PDF、跟踪任务和下载结果都继续在登录后的应用里处理。"
                  : "Uploads, job tracking, and result downloads continue inside the authenticated app."
              }
            />
            <MetricCard
              label={isChinese ? "支持路径" : "Support route"}
              value={siteConfig.supportEmail}
              body={
                isChinese
                  ? "如果支付回跳异常或激活码未出现，支持团队可以人工核查订单链路。"
                  : "If checkout returns unexpectedly or a code does not appear, support can manually inspect the order path."
              }
            />
          </div>
        </Panel>
      </section>
    </section>
  );
}
