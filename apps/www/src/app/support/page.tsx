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
        ? "提交站内 Support 表单，处理支付订单、激活码、上传结果、隐私删除等问题，并自动收到支持确认邮件。"
        : "Submit the on-site support form for payment issues, activation review, upload-result problems, and privacy requests, with automatic confirmation email delivery.",
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
          body: "适用于支付成功后未看到激活码、支付回跳异常、重复扣款疑问，或需要人工核查订单状态。",
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
          body: "Use this route when checkout succeeds but no activation code appears, when the return path looks incomplete, or when an order needs manual review.",
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
              ? "站内 Support 表单：支付、激活、上传与结果问题的公开处理入口"
              : "The public support path for payments, activation, uploads, and result-delivery issues"
          }
          body={
            isChinese
              ? "如果你还没有接入更重的客服系统，这个页面至少应该把支持入口、问题分类、人工核查边界，以及用户需要提供的关键信息讲清楚。"
              : "If you are not running a heavier helpdesk yet, this page should still make the support entry point, issue categories, manual-review boundaries, and required evidence completely clear."
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
          <Link href="/operations-checklist" className="public-button tertiary">
            {isChinese ? "运营检查清单" : "Operations checklist"}
          </Link>
          <a href={checkoutUrl} className="public-button tertiary">
            {isChinese ? "查看购买路径" : "View checkout path"}
          </a>
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
              isChinese
                ? "支持覆盖的是当前已上线流程，而不是尚未上线的未来承诺"
                : "Support covers the current live workflow, not future scope that is not launched yet"
            }
            body={
              isChinese
                ? "商用站点最容易失信的地方，不只是功能缺失，而是把还没上线的能力提前当成已交付能力去承诺。"
                : "A commercial site loses trust not only when it lacks features, but when it accidentally sells future scope as if it were already live."
            }
          />
          <div className="metric-grid">
            <MetricCard
              label={isChinese ? "当前可支持" : "Live support"}
              value={isChinese ? "当前版本" : "Current release"}
              body={
                isChinese
                  ? "账号、支付、激活码、上传、任务与结果下载问题。"
                  : "Account, checkout, activation, upload, job, and result-delivery issues."
              }
            />
            <MetricCard
              label={isChinese ? "不要过度承诺" : "Do not promise yet"}
              value={isChinese ? "未来模块" : "Later modules"}
              body={
                isChinese
                  ? "尚未上线的反向转换、站内编辑、复杂移调或所有谱面都完美自动处理。"
                  : "Reverse conversion, in-browser editing, complex transposition, or perfect automatic output for every score."
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
                ? "Support 表单的目标，是把用户带回正确流程"
                : "The point of the support form is to move the user back onto the right path"
            }
            body={
              isChinese
                ? "表单提交到 API 后，会生成请求编号，并向联系邮箱发送确认邮件；如果当前环境没有正式邮件服务，也会在日志里留下预览。"
                : "After the form reaches the API, it generates a request reference and sends a confirmation email to the contact inbox; if transactional email is not configured yet, a preview is still written to logs."
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
        <h2 className="card-title">{isChinese ? "公开支持入口" : "Public support entry point"}</h2>
        <p className="body-copy">
          {isChinese
            ? "当前比较稳妥的商用基线，是保留一个清晰的公开支持入口，让 FAQ、About、Privacy、Terms 和 Checkout 都可以回流到这里。"
            : "A good commercial baseline is to keep one clear public support entry point and make FAQ, About, Privacy, Terms, and Checkout all flow back here when needed."}
        </p>
        <div className="button-row">
          <a href="#support-form" className="public-button primary">
            {isChinese ? "填写 Support 表单" : "Open support form"}
          </a>
          <Link href="/faq" className="public-button secondary">
            {isChinese ? "常见问题" : "FAQ"}
          </Link>
          <a href={checkoutUrl} className="public-button tertiary">
            {isChinese ? "购买 / 开通" : "Checkout"}
          </a>
        </div>
        <p className="helper-copy">{siteConfig.supportEmail}</p>
      </Panel>
    </section>
  );
}
