import Link from "next/link";
import { APP_ROUTES } from "@score/shared";
import {
  ArrowNorthEastIcon,
  CheckSealIcon,
  FeatureCard,
  FileStackIcon,
  PreviewStaffGraphic,
  SparkIcon,
  StatusPill,
  VaultIcon,
} from "@score/ui";
import { readAppLocale } from "../lib/locale";

export default async function AppHomePage() {
  const locale = await readAppLocale();
  const featureCards =
    locale === "zh-CN"
      ? [
          {
            title: "双轨开通模型",
            body: "海外用户注册后可直接在线支付自动开通；中国大陆用户仍可通过销售渠道获得激活码。",
            icon: VaultIcon,
            tone: "",
          },
          {
            title: "聚焦当前上线范围",
            body: "当前版本只开放五线谱 PDF 转简谱，避免功能承诺和实际交付脱节。",
            icon: SparkIcon,
            tone: " tertiary",
          },
          {
            title: "低置信度走草稿",
            body: "当识别结果不够稳定时，系统会保留草稿结果，而不是过度承诺最终质量。",
            icon: CheckSealIcon,
            tone: "",
          },
        ]
      : [
          {
            title: "Automatic paid access",
            body: "International users register first, then unlock access by paying online. Activation codes remain reserved for mainland-China distribution.",
            icon: VaultIcon,
            tone: "",
          },
          {
            title: "Focused conversion scope",
            body: "This release keeps the product narrow: only five-line staff PDF to numbered notation is live, so QA and user expectations stay aligned.",
            icon: SparkIcon,
            tone: " tertiary",
          },
          {
            title: "Draft-safe outputs",
            body: "The pipeline already distinguishes stronger pages from weak pages, which lets low-confidence material stay draft instead of over-promising final quality.",
            icon: CheckSealIcon,
            tone: "",
          },
        ];

  const copy =
    locale === "zh-CN"
      ? {
          eyebrow: "The Sonic Manuscript",
          title: (
            <>
              一个更完整的 <em>五线谱 PDF</em> 转简谱工作台。
            </>
          ),
          body:
            "当前已登录应用已统一使用 Stitch 视觉系统，覆盖注册、激活、上传、任务创建与结果下载。现阶段产品范围刻意保持收敛：只支持五线谱 PDF 转简谱。",
          startUpload: "从上传开始",
          openJobs: "打开任务队列",
          createAccount: "创建账户",
          truthTitle: "当前产品边界",
          truthBody: "`numbered_pdf_to_staff` 仍未在界面开放，移调功能也保留到后续模块。",
          sequenceTitle: "当前操作顺序",
          sequenceBody: "海外：注册账户 -> 在线支付 -> 自动开通 -> 上传 PDF -> 创建任务。中国大陆：注册账户 -> 兑换激活码 -> 使用。",
          previewStatus: "当前上线预览",
          previewCopy: "当 OCR 或页面置信度不足时，预览文本会保留为草稿。",
          step1Label: "流程步骤 1",
          step1Title: "上传可复用的源 PDF",
          step2Label: "流程步骤 2",
          step2Title: "发起当前唯一开放的转换方向",
          step2Status: "五线谱 -> 简谱",
          bannerEyebrow: "当前应用能力",
          bannerTitle: "已上线功能都已纳入这一套统一工作台外壳。",
          bannerBody:
            "现有界面已经覆盖今天真正可用的页面：注册、登录、激活码兑换、PDF 上传、任务排队、预览展示与结果下载。",
          openDashboard: "打开控制台",
          signIn: "登录",
          bannerFootnote: "如果你后续需要，同一套视觉系统也可以继续扩展到 `apps/www` 的公网 SEO 站。",
        }
      : {
          eyebrow: "The Sonic Manuscript",
          title: (
            <>
              A composed studio for <em>staff PDF</em> to Jianpu conversion.
            </>
          ),
          body:
            "This authenticated app now carries the Stitch visual system across registration, activation, uploads, job creation, and result retrieval. Current live scope is intentionally narrow: only five-line staff PDF to numbered notation.",
          startUpload: "Start with upload",
          openJobs: "Open job queue",
          createAccount: "Create account",
          truthTitle: "Current product truth",
          truthBody: "`numbered_pdf_to_staff` stays closed in the UI. Transposition is deferred to a future module on the same website.",
          sequenceTitle: "Operational sequence",
          sequenceBody: "International: create account -> pay online -> access activates automatically -> upload PDF -> create job.",
          previewStatus: "Current live preview",
          previewCopy: "Preview text can remain draft when OCR or page confidence is weak.",
          step1Label: "Workflow step 1",
          step1Title: "Upload reusable source PDFs",
          step2Label: "Workflow step 2",
          step2Title: "Queue one locked conversion direction",
          step2Status: "Staff -> Jianpu",
          bannerEyebrow: "Current app surface",
          bannerTitle: "All active functionality now belongs inside this Stitch-based studio shell.",
          bannerBody:
            "The migrated interface covers the pages that already work today: account creation, sign-in, activation code redemption, PDF upload, job queuing, preview display, and result download.",
          openDashboard: "Open dashboard",
          signIn: "Sign in",
          bannerFootnote: "If you later want, the same visual system can be extended into the public SEO site in `apps/www`.",
        };

  return (
    <section className="container page-shell">
      <div className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 className="display-title">{copy.title}</h1>
          <p className="body-copy large">{copy.body}</p>
          <div className="button-row">
            <Link href={APP_ROUTES.upload} className="button button-primary">
              {copy.startUpload}
              <ArrowNorthEastIcon width={16} height={16} />
            </Link>
            <Link href={APP_ROUTES.jobs} className="button button-secondary">
              {copy.openJobs}
            </Link>
            <Link href={APP_ROUTES.register} className="button button-tertiary">
              {copy.createAccount}
            </Link>
          </div>
          <div className="editorial-points">
            <div className="editorial-point">
              <div>
                <strong>{copy.truthTitle}</strong>
                <p className="helper-copy">{copy.truthBody}</p>
              </div>
            </div>
            <div className="editorial-point">
              <div>
                <strong>{copy.sequenceTitle}</strong>
                <p className="helper-copy">{copy.sequenceBody}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-preview">
          <div className="stack-sm">
            <StatusPill tone="primary">{copy.previewStatus}</StatusPill>
            <PreviewStaffGraphic />
            <div className="sunken-panel stack-sm">
              <p className="metric-label">{locale === "zh-CN" ? "简谱预览" : "Numbered preview"}</p>
              <div className="hero-notation">
                <span>1</span>
                <span>.</span>
                <span>3</span>
                <span>5</span>
                <span>6</span>
              </div>
              <p className="micro-copy">{copy.previewCopy}</p>
            </div>
          </div>

          <div className="list-grid">
            <div className="list-item">
              <div className="list-item-content">
                <p className="metric-label">{copy.step1Label}</p>
                <p className="item-title">{copy.step1Title}</p>
              </div>
              <span className="info-icon tertiary">
                <FileStackIcon width={20} height={20} />
              </span>
            </div>
            <div className="list-item">
              <div className="list-item-content">
                <p className="metric-label">{copy.step2Label}</p>
                <p className="item-title">{copy.step2Title}</p>
              </div>
              <StatusPill tone="cyan">{copy.step2Status}</StatusPill>
            </div>
          </div>
        </div>
      </div>

      <div className="feature-grid">
        {featureCards.map((card) => {
          const Icon = card.icon;
          return (
            <FeatureCard
              key={card.title}
              icon={<Icon width={20} height={20} />}
              title={card.title}
              body={card.body}
              tone={card.tone.trim() === "tertiary" ? "tertiary" : undefined}
            />
          );
        })}
      </div>

      <div className="page-banner split">
        <div className="stack-md">
          <p className="eyebrow">{copy.bannerEyebrow}</p>
          <h2 className="section-title">{copy.bannerTitle}</h2>
          <p className="body-copy">{copy.bannerBody}</p>
        </div>
        <div className="stack-md">
          <div className="button-row">
            <Link href={APP_ROUTES.dashboard} className="button button-primary">
              {copy.openDashboard}
            </Link>
            <Link href={APP_ROUTES.login} className="button button-secondary">
              {copy.signIn}
            </Link>
          </div>
          <p className="micro-copy">{copy.bannerFootnote}</p>
        </div>
      </div>
    </section>
  );
}
