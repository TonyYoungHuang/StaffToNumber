import type { Metadata } from "next";
import Link from "next/link";
import { Panel, SectionIntro, StatusPill } from "@score/ui";
import { readSiteLocale } from "../../lib/locale";
import { getCheckoutUrl, getSupportUrl, legalLastUpdated, siteConfig } from "../../lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();

  return {
    title: locale === "zh-CN" ? `五线谱 PDF 转简谱服务隐私政策 | ${siteConfig.siteName}` : `Privacy Policy for Staff PDF to Jianpu Service | ${siteConfig.siteName}`,
    description:
      locale === "zh-CN"
        ? "查看五线谱 PDF 转简谱服务如何处理账号信息、上传文件、结果文件和支持记录，适合从搜索结果进入后继续核对数据处理方式的用户。"
        : "Learn how the staff PDF to Jianpu service handles account data, uploaded files, generated outputs, and support records in the current release.",
    alternates: {
      canonical: "/privacy",
    },
  };
}

const privacySections = [
  {
    title: "Information collected",
    points: [
      "Account data such as email address, password hash, activation status, and entitlement dates.",
      "Uploaded PDF files, generated preview text, output PDFs, and draft bundles required to fulfill conversions.",
      "Operational metadata such as upload timestamps, job status, file names, and support contact records.",
    ],
  },
  {
    title: "How data is used",
    points: [
      "To authenticate users, verify paid access, and deliver the requested staff PDF to Jianpu workflow.",
      "To retain source files and generated results for the signed-in user to review and download inside the app.",
      "To investigate failed jobs, respond to support requests, and improve heuristic conversion quality.",
    ],
  },
  {
    title: "Retention and deletion",
    points: [
      "Account and entitlement records are retained while the account remains active and for follow-up support when needed.",
      "Uploaded source files and generated outputs are retained to support download, review, and service troubleshooting.",
      "Deletion requests should be handled through manual support review until a self-service deletion flow is released.",
    ],
  },
  {
    title: "Data sharing",
    points: [
      "Customer files are not sold.",
      "Operational vendors may process traffic, hosting, DNS, storage, logging, and deployment data as part of delivering the service.",
      "Data may be disclosed when required by law or to protect the service from abuse, fraud, or security incidents.",
    ],
  },
  {
    title: "Security baseline",
    points: [
      "Access to the conversion tool is gated by user authentication and activation-based entitlement checks.",
      "Production access should be limited to authorized operators, and secrets should be managed in the hosting platform instead of source control.",
      "Users remain responsible for avoiding unlawful or unauthorized uploads and for verifying musical correctness before publication or performance.",
    ],
  },
] as const;

export default async function PrivacyPage() {
  const locale = await readSiteLocale();
  const isChinese = locale === "zh-CN";
  const checkoutUrl = getCheckoutUrl(locale);
  const sections = isChinese
    ? [
        {
          title: "收集哪些信息",
          points: [
            "账号数据，例如邮箱、密码哈希、激活状态和授权期限。",
            "为完成转换流程而上传的 PDF、生成的预览文本、输出 PDF 和草稿包。",
            "运行元数据，例如上传时间、任务状态、文件名和支持联系记录。",
          ],
        },
        {
          title: "如何使用这些数据",
          points: [
            "用于认证用户、校验付费权限，并交付请求的“五线谱 PDF 转简谱”工作流。",
            "用于为已登录用户保留源文件和生成结果，方便其在应用内查看和下载。",
            "用于排查失败任务、响应支持请求，并持续改进启发式识别质量。",
          ],
        },
        {
          title: "保留与删除",
          points: [
            "账号和授权记录会在账号活跃期间保留，并在需要时用于后续支持。",
            "上传源文件和生成结果会被保留，以支持下载、复核和服务排障。",
            "在自助删除功能上线前，删除请求会通过人工支持流程处理。",
          ],
        },
        {
          title: "数据共享",
          points: [
            "客户文件不会被出售。",
            "为了交付服务，托管、DNS、存储、日志和部署供应商可能处理必要的运行数据。",
            "在法律要求或为防止滥用、欺诈和安全事件时，数据可能被依法披露。",
          ],
        },
        {
          title: "安全基线",
          points: [
            "转换工具通过用户认证和基于激活的权限校验来控制访问。",
            "生产环境访问应限制给授权操作人员，密钥也应保存在托管平台而不是源码中。",
            "用户仍需自行避免非法或未授权上传，并在发布或演出前核对音乐内容是否正确。",
          ],
        },
      ]
    : privacySections;

  return (
    <section className="public-container public-page stack-xl">
      <Panel variant="surface" className="stack-lg">
        <SectionIntro
          eyebrow={isChinese ? "隐私政策" : "Privacy policy"}
          title={isChinese ? "scoretransposer.com 当前隐私基线" : "Current privacy baseline for scoretransposer.com"}
          body={
            isChinese
              ? "这份政策说明 ScoreTransposer 在当前公开版本中如何处理账号数据、上传乐谱 PDF、生成的简谱结果以及支持记录。"
              : "This policy describes how ScoreTransposer handles account data, uploaded music PDFs, generated Jianpu outputs, and support records for the current production release."
          }
          titleAs="h1"
          largeBody
        />
        <div className="button-row">
          <StatusPill tone="cyan">{isChinese ? `更新于 ${legalLastUpdated}` : `Last updated ${legalLastUpdated}`}</StatusPill>
          <Link href="/terms" className="public-button secondary">
            {isChinese ? "查看服务条款" : "View terms of service"}
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
        <h2 className="card-title">{isChinese ? "联系与政策更新" : "Contact and policy changes"}</h2>
        <p className="body-copy">
          {isChinese
            ? "如果你需要账号删除、数据导出或政策解释，请通过公开支持渠道提交请求，并在处理前确认账号身份。"
            : "If you need account deletion, data export, or policy clarification, route the request through your published support channel and confirm account identity before taking action."}
        </p>
        <p className="helper-copy">
          {isChinese
            ? "如果托管、存储、分析、支付或账号流程发生实质变化，应在新流程上线前同步更新本页。"
            : "Material changes to hosting, storage, analytics, payments, or account workflows should trigger a policy update before the new flow goes live."}
        </p>
        <div className="button-row">
          <a href={getSupportUrl("privacy", "privacy")} className="public-button secondary">
            {isChinese ? "提交隐私请求" : "Open privacy support"}
          </a>
        </div>
      </Panel>

      <section className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "信任闭环" : "Trust loop"}
            title={isChinese ? "隐私页不应孤立存在，而应与 About 页和条款页互相印证。" : "The privacy page should reinforce the about page and the terms page, not stand alone."}
            body={
              isChinese
                ? "如果访客是从搜索结果或支付流程进入这里，他们通常还会继续确认产品定位、使用边界和购买路径。"
                : "If a visitor lands here from search or checkout, they often still want to verify the product position, service boundaries, and purchase path."
            }
          />
          <div className="button-row">
            <Link href="/about" className="public-button secondary">
              {isChinese ? "打开 About / 支持页" : "Open about and support"}
            </Link>
            <Link href="/terms" className="public-button tertiary">
              {isChinese ? "打开服务条款" : "Open terms"}
            </Link>
            <a href={checkoutUrl} className="public-button tertiary">
              {isChinese ? "查看开通路径" : "View checkout path"}
            </a>
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "继续浏览" : "Continue exploring"}
            title={isChinese ? "下一步最常见的去向，就是支持、条款和购买说明。" : "The next common destinations are support, terms, and purchase guidance."}
          />
          <p className="body-copy">
            {isChinese
              ? "这样用户就能从隐私政策继续看到服务条款、About 说明和开通入口，不会在信任链路中断掉。"
              : "This keeps users moving from privacy into terms, support context, and access guidance instead of dropping out of the trust path."}
          </p>
          <div className="button-row">
            <a href={getSupportUrl("privacy", "privacy")} className="public-button secondary">
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
