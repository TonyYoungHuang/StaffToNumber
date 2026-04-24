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

  const flow = isChinese
    ? [
        {
          step: "01",
          title: "在托管支付页完成付款",
          body: "支付发生在 Stripe 或 Paddle 的托管页面，而不是直接在本站收集银行卡信息。",
        },
        {
          step: "02",
          title: "系统确认订单并发放激活码",
          body: "付款成功后，成功页会校验支付结果，并展示为这笔订单生成的一年期激活码。",
        },
        {
          step: "03",
          title: "到应用内兑换并开始使用",
          body: "把激活码带到应用内兑换，后续上传、任务和结果下载也都在应用里完成。",
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
          title: "The system confirms the order and issues a code",
          body: "After payment, the success page checks the provider response and shows the one-year activation code issued for the order.",
        },
        {
          step: "03",
          title: "Redeem in the app and start using the tool",
          body: "Bring the activation code into the app, then continue with uploads, jobs, and result downloads there.",
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
                ? "你在这里购买的是一年访问权限，而不是把整套工作流都塞进公开官网。支付确认、发码和应用内兑换是分开的步骤。"
                : "What you buy here is one year of access, not the entire workflow inside the public site. Payment confirmation, code issuance, and in-app redemption happen as separate steps."
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
              value={isChinese ? "激活码" : "Activation code"}
              body={
                isChinese
                  ? "支付成功后会发放一枚激活码，用户可在应用内兑换为一年访问权限。"
                  : "Successful payment issues a code that can be redeemed inside the app for one year of access."
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
