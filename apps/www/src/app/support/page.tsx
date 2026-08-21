import type { Metadata } from "next";
import Link from "next/link";
import { MetricCard, Panel, SectionIntro, StatusPill, WorkflowStep } from "@score/ui";
import { SupportRequestForm } from "../../components/SupportRequestForm";
import { readSiteLocale } from "../../lib/locale";
import { getCheckoutUrl, siteConfig } from "../../lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();

  return {
    title:
      locale === "zh-CN"
        ? `支持 / 联系我们 / 订单核查 | ${siteConfig.siteName}`
        : `Support, Contact, and Order Review | ${siteConfig.siteName}`,
    description:
      locale === "zh-CN"
        ? "联系 ScoreTransposer 支持，处理账号、激活码、上传识别、结果下载和隐私请求。"
        : "Contact ScoreTransposer support for account, activation, score recognition, result delivery, and privacy questions.",
    alternates: {
      canonical: "/support",
    },
  };
}

export default async function SupportPage() {
  const locale = await readSiteLocale();
  const isChinese = locale === "zh-CN";
  const checkoutUrl = getCheckoutUrl(locale);

  const workflows = isChinese
    ? [
        {
          step: "01",
          title: "支付 / 订单问题",
          body: "适用于支付成功后账户权益未生效、支付回跳异常、重复扣款疑问，或需要人工核查订单状态。",
        },
        {
          step: "02",
          title: "激活 / 权限问题",
          body: "适用于激活码无法兑换、权限未生效、到期时间异常，或需要人工确认授权范围。",
        },
        {
          step: "03",
          title: "上传 / 结果问题",
          body: "适用于 PDF 上传失败、任务卡住、结果下载异常，或 final / draft 结果需要人工判断。",
        },
      ]
    : [
        {
          step: "01",
          title: "Payment and order issues",
          body: "Use this route when checkout succeeds but account access does not appear, when the return path looks incomplete, or when an order needs manual review.",
        },
        {
          step: "02",
          title: "Activation and entitlement issues",
          body: "Use this route when redemption fails, access does not activate, entitlement dates look wrong, or support needs to verify account scope.",
        },
        {
          step: "03",
          title: "Upload and result issues",
          body: "Use this route when PDF upload fails, jobs stall, downloads break, or a final-vs-draft outcome needs human context.",
        },
      ];

  const evidencePoints = isChinese
    ? [
        "联系邮箱或账号邮箱",
        "购买时间、支付渠道、支付截图",
        "激活码、订单号、任务号、文件名等可核对信息",
        "报错截图、触发步骤、问题出现的大致时间",
      ]
    : [
        "Contact email or account email",
        "Purchase time, payment provider, and payment screenshot",
        "Activation code, order id, job id, or file name when available",
        "Error screenshot, trigger steps, and approximate time of the issue",
      ];

  return (
    <section className="public-container public-page stack-xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: `${siteConfig.siteName} Support`,
            url: `${siteConfig.siteUrl}/support`,
            mainEntity: {
              "@type": "Organization",
              name: siteConfig.siteName,
              email: siteConfig.supportEmail,
              contactPoint: [
                {
                  "@type": "ContactPoint",
                  contactType: "customer support",
                  email: siteConfig.supportEmail,
                  availableLanguage: ["English", "Chinese"],
                },
              ],
            },
          }),
        }}
      />

      <Panel variant="surface" className="stack-lg">
        <SectionIntro
          eyebrow={isChinese ? "支持 / 联系 / 核查" : "Support / Contact / Review"}
          title={
            isChinese
              ? "需要帮助？请告诉我们遇到了什么问题"
              : "Need help? Tell us what happened"
          }
          body={
            isChinese
              ? "你可以在这里提交账号、激活、识谱、下载或隐私相关问题。信息越完整，我们越容易定位并回复。"
              : "Submit account, activation, recognition, download, or privacy questions here. More complete details help us investigate and reply faster."
          }
          titleAs="h1"
          largeBody
        />
        <div className="button-row">
          <a href="#support-form" className="public-button primary">
            {isChinese ? "提交支持请求" : "Submit support request"}
          </a>
          <Link href="/faq" className="public-button secondary">
            {isChinese ? "查看 FAQ" : "Open FAQ"}
          </Link>
          {siteConfig.release.checkoutAvailable ? <a href={checkoutUrl} className="public-button tertiary">{isChinese ? "查看购买路径" : "View checkout path"}</a> : null}
        </div>
      </Panel>

      <SupportRequestForm locale={locale} supportEmail={siteConfig.supportEmail} />

      <section className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "支持分类" : "Support categories"}
            title={
              isChinese ? "先把问题分对类，再进入人工核查" : "Classify the issue first, then move into manual review"
            }
          />
          <div className="workflow-grid">
            {workflows.map((item) => (
              <WorkflowStep key={item.step} step={item.step} title={item.title} body={item.body} />
            ))}
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "提交建议" : "What to include"}
            title={
              isChinese
                ? "支持请求写得越完整，人工处理通常越快"
                : "Manual support usually moves faster when the request includes enough detail"
            }
          />
          <Panel variant="sunken" className="stack-md">
            <StatusPill tone="cyan">{isChinese ? "建议附带信息" : "Recommended evidence"}</StatusPill>
            {evidencePoints.map((point) => (
              <p key={point} className="body-copy">
                {point}
              </p>
            ))}
          </Panel>
        </Panel>
      </section>

      <section className="preview-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "处理边界" : "Support boundary"}
            title={
              isChinese ? "我们可以帮助处理哪些问题" : "What support can help with"
            }
            body={
              isChinese
                ? "支持范围包括账户访问、激活码、文件上传、识谱任务、结果查看与下载，以及隐私请求。"
                : "Support covers account access, activation codes, file uploads, recognition jobs, result viewing and downloads, and privacy requests."
            }
          />
          <div className="metric-grid">
            <MetricCard
              label={isChinese ? "产品问题" : "Product help"}
              value={isChinese ? "账号与乐谱" : "Accounts and scores"}
              body={
                isChinese
                  ? "账号、支付、激活码、上传、任务与结果下载问题。"
                  : "Account, checkout, activation, upload, job, and result-delivery issues."
              }
            />
            <MetricCard
              label={isChinese ? "识别说明" : "Recognition note"}
              value={isChinese ? "候选需复核" : "Review required"}
              body={
                isChinese
                  ? "自动识别结果可能需要人工校对；复杂谱面请附上原文件和问题截图。"
                  : "Automatic recognition may need manual correction. For complex scores, include the source file and a screenshot."
              }
            />
            <MetricCard
              label={isChinese ? "人工核查" : "Manual review"}
              value={isChinese ? "可处理" : "Available"}
              body={
                isChinese
                  ? "订单核查、兑换异常、下载异常、删除请求等。"
                  : "Order review, redemption issues, download anomalies, and deletion requests."
              }
            />
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "提交之后" : "After submission"}
            title={
              isChinese
                ? "提交后会发生什么"
                : "What happens after submission"
            }
            body={
              isChinese
                ? "提交成功后会生成请求编号。请保存编号；如邮件通知已启用，你也会在联系邮箱收到确认。"
                : "A successful submission creates a request reference. Keep that reference; when email notifications are available, a confirmation is also sent to your contact address."
            }
          />
          <div className="button-row">
            <Link href="/about" className="public-button secondary">
              {isChinese ? "查看 About" : "Open about"}
            </Link>
            <Link href="/privacy" className="public-button tertiary">
              {isChinese ? "隐私政策" : "Privacy"}
            </Link>
            <Link href="/terms" className="public-button tertiary">
              {isChinese ? "服务条款" : "Terms"}
            </Link>
          </div>
        </Panel>
      </section>

      <Panel variant="sunken" className="stack-md">
        <h2 className="card-title">{isChinese ? "现在提交支持请求" : "Submit a support request"}</h2>
        <p className="body-copy">
          {isChinese
            ? "请先选择问题类型，并附上账号邮箱、任务号、文件名、发生时间和相关截图。"
            : "Choose the issue type and include the account email, job reference, file name, approximate time, and relevant screenshots."}
        </p>
        <div className="button-row">
          <a href="#support-form" className="public-button primary">
            {isChinese ? "填写 Support 表单" : "Open support form"}
          </a>
          <Link href="/faq" className="public-button secondary">
            {isChinese ? "常见问题" : "FAQ"}
          </Link>
          {siteConfig.release.checkoutAvailable ? <a href={checkoutUrl} className="public-button tertiary">{isChinese ? "购买 / 开通" : "Checkout"}</a> : null}
        </div>
        <p className="helper-copy">{siteConfig.supportEmail}</p>
      </Panel>
    </section>
  );
}
