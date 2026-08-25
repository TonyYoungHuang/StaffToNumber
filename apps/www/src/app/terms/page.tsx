import type { Metadata } from "next";
import Link from "next/link";
import { Panel, SectionIntro, StatusPill } from "@score/ui";
import { readSiteLocale } from "../../lib/locale";
import { getCheckoutUrl, getSupportUrl, legalLastUpdated, siteConfig } from "../../lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();

  return {
    title: locale === "zh-CN" ? `全功能乐谱平台服务条款 | ${siteConfig.siteName}` : `Music Notation Platform Terms of Service | ${siteConfig.siteName}`,
    description:
      locale === "zh-CN"
        ? "查看 MusicXML 乐谱平台的导入识别、编辑、移调、简谱、播放、导出、教学、版权和可接受使用规则。"
        : "Review the MusicXML platform terms for import, editing, transposition, Jianpu, playback, export, education, copyright, and acceptable use.",
    alternates: {
      canonical: "/terms",
    },
  };
}

const termsSections = [
  {
    title: "Service scope",
    points: [
      "The service supports score projects, structured score imports, staff/Jianpu conversion, transposition, correction, playback, teaching workflows, and configured export formats.",
      "OMR, rendered PDF/image output, high-quality audio, and audio transcription require configured external tools and may be unavailable in a particular deployment.",
      "The website, app, and output materials may change as the service evolves, but users should rely only on the published live scope when purchasing access.",
    ],
  },
  {
    title: "Accounts and subscription access",
    points: [
      "A registered Free account may create one complete score project within the published monthly job and storage limits; no payment card or activation code is required for that free project.",
      "Paid access may be activated automatically after the payment provider confirms a subscription, or by redeeming a valid activation code issued through an authorized channel.",
      "Subscription or activation access is tied to the applicable entitlement period and may be suspended for fraud, abuse, charge disputes, or policy violations.",
      "Customers are responsible for keeping account credentials confidential and for all activity performed through their account.",
    ],
  },
  {
    title: "Uploads and outputs",
    points: [
      "Users may upload only content they are authorized to process.",
      "Generated outputs can be delivered either as a final PDF or as a draft package when the system cannot confidently promote the result.",
      "Users remain responsible for reviewing musical accuracy, copyright compliance, and suitability before publication, teaching, rehearsal, or performance.",
    ],
  },
  {
    title: "Billing, renewal, cancellation, and refunds",
    points: [
      "Starter and Converter Pro are recurring subscriptions billed monthly or annually at the price, currency, tax, and billing interval shown at checkout.",
      "Unless canceled, the subscription renews automatically and the payment provider charges the saved payment method at the start of each new billing period.",
      "Customers may cancel from Billing or contact support before the next renewal. Cancellation stops future renewal; paid access normally remains available through the end of the current paid period unless a refund, charge dispute, fraud review, or legal requirement causes earlier action.",
      "Refund requests may be submitted through support. Eligibility follows the purchase terms shown at checkout, the payment provider's applicable rules, and mandatory consumer law; approved refunds are reflected in Billing and a full refund may end the related paid entitlement.",
    ],
  },
  {
    title: "Acceptable use",
    points: [
      "Users may not use the service to upload malware, infringing content, or files intended to disrupt the platform.",
      "Automated abuse, credential sharing, scraping of private customer data, and attempts to bypass entitlement controls are prohibited.",
      "ScoreTransposer may suspend or terminate access when misuse, security risk, or legal exposure is detected.",
    ],
  },
] as const;

export default async function TermsPage() {
  const locale = await readSiteLocale();
  const isChinese = locale === "zh-CN";
  const checkoutUrl = getCheckoutUrl(locale);
  const sections = isChinese
    ? [
        {
          title: "服务范围",
          points: [
            "服务支持乐谱工程、结构化乐谱导入、五线谱/简谱转换、移调、校对、播放练习、教学流程和已配置的导出格式。",
            "OMR、PDF/图片渲染、高质量音频和音频转谱依赖外部工具配置，可能在特定部署环境中暂不可用。",
            "网站、应用和输出材料可能随服务演进而变化，但用户购买时应仅以当时公开发布的范围为准。",
          ],
        },
        {
          title: "账号与订阅开通",
          points: [
            "注册 Free 账号后，可以在公开的月度任务和存储限制内创建一个完整乐谱项目；该免费项目不要求绑定支付卡或兑换激活码。",
            "付费订阅可在支付渠道确认付款后自动开通，也可以通过授权渠道发放的有效激活码开通。",
            "订阅或激活权限与对应授权期限绑定；如发生欺诈、滥用、拒付争议或违反政策，权限可能被暂停。",
            "用户需自行妥善保管账号凭证，并对该账号下发生的行为负责。",
          ],
        },
        {
          title: "上传与结果",
          points: [
            "用户只能上传自己有权处理的内容。",
            "当系统无法稳定提升结果时，交付可能是正式 PDF，也可能是草稿包。",
            "在发布、教学、排练或演出前，用户仍需自行核对音乐准确性、版权合规性和实际适用性。",
          ],
        },
        {
          title: "计费、续费、取消与退款",
          points: [
            "Starter 与 Converter Pro 是按月或按年计费的自动续费订阅，价格、币种、税费和计费周期以结账页展示为准。",
            "如未取消，支付渠道会在每个新计费周期开始时使用已保存的付款方式自动扣款。",
            "用户可在账单中心取消，或在下次续费前联系支持。取消会停止后续续费；除退款、拒付、欺诈审查或法律要求导致提前处理外，已付权益通常保留到当前付费周期结束。",
            "可通过支持入口提交退款申请。是否符合条件，以购买时展示的条款、支付渠道适用规则及强制性消费者法律为准；获批退款会同步到账单，全额退款可能结束对应付费权益。",
          ],
        },
        {
          title: "可接受使用",
          points: [
            "用户不得利用本服务上传恶意软件、侵权内容或故意干扰平台运行的文件。",
            "禁止自动化滥用、共享账号、抓取私人客户数据或绕过权限控制。",
            "当检测到滥用、安全风险或法律暴露时，ScoreTransposer 可暂停或终止访问权限。",
          ],
        },
      ]
    : termsSections;

  return (
    <section className="public-container public-page stack-xl">
      <Panel variant="surface" className="stack-lg">
        <SectionIntro
          eyebrow={isChinese ? "服务条款" : "Terms of service"}
          title={isChinese ? "ScoreTransposer 服务条款" : "ScoreTransposer terms of service"}
          body={
            isChinese
              ? "这些条款说明 ScoreTransposer 的免费项目、订阅开通、自动续费、取消、结果交付和用户责任。"
              : "These terms explain ScoreTransposer free access, subscription activation, automatic renewal, cancellation, result delivery, and user responsibilities."
          }
          titleAs="h1"
          largeBody
        />
        <div className="button-row">
          <StatusPill tone="cyan">{isChinese ? `更新于 ${legalLastUpdated}` : `Last updated ${legalLastUpdated}`}</StatusPill>
          <Link href="/privacy" className="public-button secondary">
            {isChinese ? "查看隐私政策" : "View privacy policy"}
          </Link>
        </div>
      </Panel>

      <div className="stack-lg">
        {sections.map((section) => (
          <Panel key={section.title} variant="glass" className="stack-md">
            <h2 className="section-title">{section.title}</h2>
            <div className="stack-sm">
              {section.points.map((point) => (
                <p key={point} className="body-copy">
                  {point}
                </p>
              ))}
            </div>
          </Panel>
        ))}
      </div>

      <Panel variant="sunken" className="stack-md">
        <h2 className="card-title">{isChinese ? "购买与退款说明" : "Purchase and refund notes"}</h2>
        <p className="body-copy">
          {isChinese
            ? "订阅价格、计费周期、税费和支付方式以结账页为准；取消和退款按本条款、购买时展示内容及支付渠道规则处理。"
            : "Subscription price, billing interval, tax, and payment method follow checkout; cancellation and refunds follow these terms, the purchase disclosure, and provider rules."}
        </p>
        <p className="helper-copy">
          {isChinese
            ? "如套餐、价格、续费方式或服务范围发生实质变化，我们会更新相关说明。"
            : "We will update these disclosures when plans, prices, renewal mechanics, or service scope change materially."}
        </p>
        <div className="button-row">
          <a href={getSupportUrl("general", "terms")} className="public-button secondary">
            {isChinese ? "提交支持请求" : "Open support request"}
          </a>
        </div>
      </Panel>

      <section className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "相关页面" : "Related pages"}
            title={isChinese ? "继续查看隐私政策、产品说明和支持入口" : "Continue to privacy, product information, and support"}
            body={
              isChinese
                ? "用户在这里确认服务边界后，通常还会继续核对数据处理方式、支持入口和真实开通路径。"
                : "After checking service boundaries here, users often still want to confirm data handling, support routes, and the real activation path."
            }
          />
          <div className="button-row">
            <Link href="/privacy" className="public-button secondary">
              {isChinese ? "打开隐私政策" : "Open privacy policy"}
            </Link>
            <Link href="/copyright-complaint" className="public-button secondary">
              {isChinese ? "提交版权投诉" : "Submit copyright complaint"}
            </Link>
            <Link href="/about" className="public-button tertiary">
              {isChinese ? "打开 About / 支持页" : "Open about and support"}
            </Link>
            {siteConfig.release.checkoutAvailable ? <a href={checkoutUrl} className="public-button tertiary">{isChinese ? "查看开通路径" : "View checkout path"}</a> : null}
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "需要帮助" : "Need help"}
            title={isChinese ? "对条款或账户权限有疑问？" : "Questions about these terms or account access?"}
          />
          <p className="body-copy">
            {isChinese
              ? "你可以继续查看隐私政策和产品说明，或通过支持表单提交具体问题。"
              : "Continue to privacy and product information, or submit a specific question through the support form."
            }
          </p>
          <div className="button-row">
            <a href={getSupportUrl("general", "terms")} className="public-button secondary">
              {isChinese ? "联系支持" : "Contact support"}
            </a>
            <Link href="/" className="public-button tertiary">
              {isChinese ? "返回首页" : "Back to homepage"}
            </Link>
          </div>
        </Panel>
      </section>
    </section>
  );
}
