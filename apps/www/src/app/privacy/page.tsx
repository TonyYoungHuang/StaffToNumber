import type { Metadata } from "next";
import Link from "next/link";
import { Panel, SectionIntro, StatusPill } from "@score/ui";
import { readSiteLocale } from "../../lib/locale";
import { getLocalizedAbsoluteUrl, getLocalizedAlternates, localizePublicHref } from "../../lib/locale-routing";
import { getCheckoutUrl, getSupportUrl, legalLastUpdated, siteConfig } from "../../lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();
  const title = locale === "zh-CN" ? `在线乐谱平台隐私政策 | ${siteConfig.siteName}` : `Music Notation Platform Privacy Policy | ${siteConfig.siteName}`;
  const description =
    locale === "zh-CN"
      ? "查看在线乐谱平台如何处理账号信息、上传乐谱、音频视频、生成结果和支持记录，以及数据导出、删除宽限期与文件保留规则。"
      : "Learn how the music notation platform handles account data, uploaded scores and media, generated outputs, exports, deletion grace periods, and retention.";
  const socialImage = "/product/score-preview-output-real.png";

  return {
    title,
    description,
    alternates: getLocalizedAlternates("/privacy", locale),
    openGraph: {
      title,
      description,
      url: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/privacy", locale),
      siteName: siteConfig.siteName,
      locale: locale === "zh-CN" ? "zh_CN" : "en_US",
      type: "website",
      images: [{ url: socialImage, width: 1265, height: 712, alt: "ScoreTransposer rendered score workspace output" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

const privacySections = [
  {
    title: "Information collected",
    points: [
      "Account data such as email address, password hash, activation status, and entitlement dates.",
      "Uploaded scores, scans, audio or video, structured MusicXML and Score JSON, generated exports, and correction history.",
      "Operational metadata such as upload timestamps, job status, file names, and support contact records.",
    ],
  },
  {
    title: "How data is used",
    points: [
      "To authenticate users, verify paid access, and deliver score scanning, editing, conversion, transposition, playback, practice, and export workflows.",
      "To retain source files and generated results for the signed-in user to review and download inside the app.",
      "To investigate failed jobs, respond to support requests, and improve heuristic conversion quality.",
    ],
  },
  {
    title: "Retention and deletion",
    points: [
      "Account and entitlement records are retained while the account remains active and for follow-up support when needed.",
      "Uploaded source files and generated outputs are retained to support download, review, and service troubleshooting.",
      "Signed-in users can download a structured data copy and request deletion after password verification. Deletion has a 14-day cancellation window.",
      "After the grace period, user scores, classroom data, support records, and stored files are removed; payment records required for audit are de-identified.",
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
    title: "Cookies and analytics",
    points: [
      "A functional locale cookie remembers the selected interface language.",
      "Cloudflare Web Analytics Real User Measurement (RUM) is enabled globally to measure page views, loading performance, browser and network characteristics. It is cookieless, does not read browser storage, and discards visitor IP addresses at Cloudflare's edge.",
      "GA4 or Microsoft Clarity loads only after explicit consent and only when production analytics is enabled.",
      "Visitors can decline analytics without losing access to public content or product workflows.",
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
            "上传的乐谱、扫描件、音频或视频、结构化 MusicXML 与 Score JSON、生成的导出文件和校对修订历史。",
            "运行元数据，例如上传时间、任务状态、文件名和支持联系记录。",
          ],
        },
        {
          title: "如何使用这些数据",
          points: [
            "用于认证用户、校验付费权限，并交付乐谱扫描、编辑、互换、移调、播放、练习和导出流程。",
            "用于为已登录用户保留源文件和生成结果，方便其在应用内查看和下载。",
            "用于排查失败任务、响应支持请求，并持续改进启发式识别质量。",
          ],
        },
        {
          title: "保留与删除",
          points: [
            "账号和授权记录会在账号活跃期间保留，并在需要时用于后续支持。",
            "上传源文件和生成结果会被保留，以支持下载、复核和服务排障。",
            "登录用户可下载结构化数据副本，并在再次验证密码后申请删除账户；删除申请有 14 天可取消宽限期。",
            "宽限期结束后会删除用户乐谱、课堂数据、支持记录和存储文件；依法需要保留的支付审计记录会去标识化。",
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
          title: "Cookie 与访问分析",
          points: [
            "功能性语言 Cookie 用于记住用户选择的界面语言。",
            "Cloudflare Web Analytics 的真实用户监测（RUM）已全局启用，用于统计页面访问、加载性能、浏览器与网络特征；该服务不使用 Cookie、不读取浏览器存储，并会在 Cloudflare 边缘节点丢弃访客 IP 地址。",
            "只有在用户明确同意且生产分析配置已启用时，才会加载 GA4 或 Microsoft Clarity。",
            "拒绝访问分析不会影响公开内容或产品功能的使用。",
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
              ? "这份政策说明 ScoreTransposer 如何处理账号数据、上传乐谱和媒体、结构化修订、生成结果以及支持记录。"
              : "This policy describes how ScoreTransposer handles account data, uploaded scores and media, structured revisions, generated outputs, and support records."
          }
          titleAs="h1"
          largeBody
        />
        <div className="button-row">
          <StatusPill tone="cyan">{isChinese ? `更新于 ${legalLastUpdated}` : `Last updated ${legalLastUpdated}`}</StatusPill>
          <Link href={localizePublicHref("/terms", locale)} className="public-button secondary">
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
            ? "数据导出和账号删除可在登录后的账户控制台自助完成；如果无法登录或需要政策解释，请通过公开支持渠道提交请求并确认账号身份。"
            : "Data export and account deletion are available in the signed-in dashboard. If you cannot sign in or need policy clarification, use the public support channel and confirm account identity."}
        </p>
        <p className="helper-copy">
          {isChinese
            ? "如我们的托管、存储、分析、支付或账号处理方式发生重大变化，本政策也会相应更新。"
            : "We will update this policy when material changes affect hosting, storage, analytics, payments, or account handling."}
        </p>
        <div className="button-row">
          <a href={localizePublicHref(getSupportUrl("privacy", "privacy"), locale)} className="public-button secondary">
            {isChinese ? "提交隐私请求" : "Open privacy support"}
          </a>
        </div>
      </Panel>

      <section className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "相关说明" : "Related information"}
            title={isChinese ? "继续了解服务条款和产品说明" : "Continue to terms and product information"}
            body={
              isChinese
                ? "如果访客是从搜索结果或支付流程进入这里，他们通常还会继续确认产品定位、使用边界和购买路径。"
                : "If a visitor lands here from search or checkout, they often still want to verify the product position, service boundaries, and purchase path."
            }
          />
          <div className="button-row">
            <Link href={localizePublicHref("/about", locale)} className="public-button secondary">
              {isChinese ? "打开 About / 支持页" : "Open about and support"}
            </Link>
            <Link href={localizePublicHref("/terms", locale)} className="public-button tertiary">
              {isChinese ? "打开服务条款" : "Open terms"}
            </Link>
            {siteConfig.release.checkoutAvailable ? <a href={checkoutUrl} className="public-button tertiary">{isChinese ? "查看开通路径" : "View checkout path"}</a> : null}
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "继续浏览" : "Continue exploring"}
            title={isChinese ? "下一步最常见的去向，就是支持、条款和购买说明。" : "The next common destinations are support, terms, and purchase guidance."}
          />
          <p className="body-copy">
            {isChinese
              ? "如对数据处理、账户删除或隐私权利有疑问，请通过支持表单联系我们。"
              : "If you have questions about data handling, account deletion, or privacy rights, contact us through the support form."}
          </p>
          <div className="button-row">
            <a href={localizePublicHref(getSupportUrl("privacy", "privacy"), locale)} className="public-button secondary">
              {isChinese ? "联系支持" : "Contact support"}
            </a>
            <Link href={localizePublicHref("/", locale)} className="public-button tertiary">
              {isChinese ? "返回首页" : "Back to homepage"}
            </Link>
          </div>
        </Panel>
      </section>
    </section>
  );
}
