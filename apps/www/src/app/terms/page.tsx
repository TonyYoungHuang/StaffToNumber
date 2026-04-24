import type { Metadata } from "next";
import Link from "next/link";
import { Panel, SectionIntro, StatusPill } from "@score/ui";
import { readSiteLocale } from "../../lib/locale";
import { getCheckoutUrl, getSupportUrl, legalLastUpdated, siteConfig } from "../../lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();

  return {
    title: locale === "zh-CN" ? `五线谱 PDF 转简谱服务条款 | ${siteConfig.siteName}` : `Terms of Service for Staff PDF to Jianpu Tool | ${siteConfig.siteName}`,
    description:
      locale === "zh-CN"
        ? "查看五线谱 PDF 转简谱工具当前的服务范围、激活开通、草稿结果模型、支持边界和可接受使用规则，适合购买前进一步确认。"
        : "Review the current service scope, activation access, draft-result model, support boundary, and acceptable use rules for the staff PDF to Jianpu tool.",
    alternates: {
      canonical: "/terms",
    },
  };
}

const termsSections = [
  {
    title: "Service scope",
    points: [
      "The current live service supports only five-line staff PDF to Jianpu conversion.",
      "Reverse conversion, in-browser editing, and transposition are not included in this production release unless explicitly announced later.",
      "The website, app, and output materials may change as the service evolves, but users should rely only on the published live scope when purchasing access.",
    ],
  },
  {
    title: "Accounts and activation",
    points: [
      "Users must create an account and redeem a valid activation code before using the conversion workflow.",
      "Activation access is tied to the purchased entitlement period and may be suspended for fraud, abuse, charge disputes, or policy violations.",
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
    title: "Refunds and support",
    points: [
      "Refund decisions should follow the support and payment policy communicated to the customer at the time of sale.",
      "Support for the first release is limited to the published workflow, account access, upload handling, and result delivery questions.",
      "Draft output is part of the intended safety model for low-confidence source material and does not by itself indicate service failure.",
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
            "当前公开服务只支持“五线谱 PDF 转简谱”这一条工作流。",
            "除非后续明确公告，否则反向转换、站内编辑和移调都不包含在当前正式版本内。",
            "网站、应用和输出材料可能随服务演进而变化，但用户购买时应仅以当时公开发布的范围为准。",
          ],
        },
        {
          title: "账号与激活",
          points: [
            "用户在使用转换流程前，需要先注册账号并兑换有效激活码。",
            "访问权限与购买的授权期限绑定；如发生欺诈、滥用、拒付争议或违反政策，权限可能被暂停。",
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
          title: "退款与支持",
          points: [
            "退款应以销售时向客户说明的支持与支付政策为准。",
            "首发版本的支持范围，主要限于已公开工作流、账号访问、上传处理和结果交付问题。",
            "对于低置信度源文件，草稿结果属于预期内的安全模型，本身不等同于服务失败。",
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
          title={isChinese ? "ScoreTransposer 当前服务条款" : "Launch-day service terms for ScoreTransposer"}
          body={
            isChinese
              ? "这些条款定义了 scoretransposer.com 当前的商业与运营边界，包括激活开通、草稿结果交付和用户责任。"
              : "These terms define the current commercial and operational boundaries for scoretransposer.com, including activation-gated access, draft-result delivery, and user responsibilities."
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
        <h2 className="card-title">{isChinese ? "运营提醒" : "Operational reminder"}</h2>
        <p className="body-copy">
          {isChinese
            ? "请确保公开条款与你线下或其他销售渠道实际执行的激活、退款、支持和交付规则保持一致。"
            : "Keep the public terms aligned with the exact activation, refund, support, and delivery practices you execute offline or in external sales channels."}
        </p>
        <p className="helper-copy">
          {isChinese
            ? "如果商业模式发生变化，请在开始销售新方案前同步更新本页和相关引导文案。"
            : "If the commercial model changes, update this page and your onboarding copy before the new offer is sold."}
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
            title={isChinese ? "条款页应与隐私页、About 页和购买路径一起组成完整说明。" : "The terms page works best when it connects to privacy, about, and purchase guidance."}
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
            <Link href="/about" className="public-button tertiary">
              {isChinese ? "打开 About / 支持页" : "Open about and support"}
            </Link>
            <a href={checkoutUrl} className="public-button tertiary">
              {isChinese ? "查看开通路径" : "View checkout path"}
            </a>
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "信任路径" : "Trust path"}
            title={isChinese ? "让访客从条款继续走向支持与转化，而不是停在法律页。" : "Move visitors from legal review into support and conversion instead of ending the journey here."}
          />
          <p className="body-copy">
            {isChinese
              ? "当条款、隐私、About 和 checkout 串起来之后，公开站点会更像一个完整可信的产品，而不是彼此割裂的单页。"
              : "Once terms, privacy, about, and checkout are linked together, the public site feels like a more complete and trustworthy product surface instead of isolated pages."
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
