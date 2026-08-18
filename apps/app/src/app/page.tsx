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
            title: "MusicXML 核心工程",
            body: "导入 MusicXML、MIDI、简谱、Score JSON 或扫描候选后，统一进入可修订、可恢复的乐谱工程。",
            icon: VaultIcon,
            tone: "",
          },
          {
            title: "双向转换与专业编辑",
            body: "支持五线谱与简谱互换、移调、谱面点选、插入删除、多声部编辑和版本历史。",
            icon: SparkIcon,
            tone: " tertiary",
          },
          {
            title: "播放练习与多格式导出",
            body: "提供循环、变速、节拍器、分声部练习，并从固定修订生成 MusicXML、MIDI、PDF、图片和音频。",
            icon: CheckSealIcon,
            tone: "",
          },
        ]
      : [
          {
            title: "MusicXML-first projects",
            body: "MusicXML, MIDI, Jianpu, Score JSON, and scan candidates all become versioned score projects that can be corrected and restored.",
            icon: VaultIcon,
            tone: "",
          },
          {
            title: "Round-trip conversion and editing",
            body: "Convert between staff notation and Jianpu, transpose, select rendered notation, insert or delete events, edit voices, and keep revision history.",
            icon: SparkIcon,
            tone: " tertiary",
          },
          {
            title: "Practice and reproducible exports",
            body: "Loop, change tempo, use a metronome, isolate parts, and queue MusicXML, MIDI, print, image, and audio exports from an immutable revision.",
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
              一个围绕 <em>MusicXML</em> 构建的全功能乐谱工作台。
            </>
          ),
          body:
            "注册后先免费识别一页五线谱 PDF 或一张图片，查看需要人工检查的候选谱；开通后继续简谱互换、移调、编辑、播放和完整导出。",
          startUpload: "免费识别一页",
          openJobs: "已有账户登录",
          createAccount: "创建免费账户",
          truthTitle: "当前产品边界",
          truthBody: "Score JSON 是编辑和版本事实来源，MusicXML 是交换格式；PDF 和图片只作为导入素材，识别结果必须先校对再确认。",
          sequenceTitle: "当前操作顺序",
          sequenceBody: "创建或导入乐谱工程 -> 校对候选 -> 保存正式修订 -> 转换、移调和练习 -> 按固定修订导出与分享。",
          previewStatus: "结构化乐谱预览",
          previewCopy: "五线谱和简谱预览来自同一份 Score JSON，避免多个转换工具之间的数据漂移。",
          step1Label: "流程步骤 1",
          step1Title: "上传一页 PDF 或一张乐谱图片",
          step2Label: "流程步骤 2",
          step2Title: "校对、编辑、移调、练习和导出",
          step2Status: "同一乐谱工程",
          bannerEyebrow: "当前应用能力",
          bannerTitle: "从一次性转换工具进入可持续编辑的乐谱工程。",
          bannerBody:
            "工程页集中管理识别候选、正式修订、图形编辑、简谱视图、移调诊断、播放时间线和导出任务。",
          openDashboard: "打开控制台",
          signIn: "登录",
          bannerFootnote: "Audiveris 结果是待校对候选；复杂乐谱仍需人工复核，高质量排版与音频依赖已配置的服务端渲染器。",
        }
      : {
          eyebrow: "The Sonic Manuscript",
          title: (
            <>
              A MusicXML-first workspace for <em>complete score workflows</em>.
            </>
          ),
          body:
            "Create an account and scan one staff-score PDF page or image for free. Review the candidate first, then unlock Jianpu conversion, transposition, editing, playback, and full export.",
          startUpload: "Scan one page free",
          openJobs: "Sign in",
          createAccount: "Create free account",
          truthTitle: "Current product truth",
          truthBody: "Score JSON is the editing and version source of truth, MusicXML is the interchange format, and PDF and images remain import sources that require review.",
          sequenceTitle: "Operational sequence",
          sequenceBody: "Create or import a project -> review candidates -> save an accepted revision -> convert, transpose, and practice -> export or share that exact revision.",
          previewStatus: "Structured score preview",
          previewCopy: "Staff and Jianpu previews derive from the same Score JSON so workflows do not drift between isolated converters.",
          step1Label: "Workflow step 1",
          step1Title: "Upload one PDF page or one score image",
          step2Label: "Workflow step 2",
          step2Title: "Correct, edit, transpose, practice, and export",
          step2Status: "One score project",
          bannerEyebrow: "Current app surface",
          bannerTitle: "Move from one-off conversion into a durable score project.",
          bannerBody:
            "The project workspace brings recognition candidates, accepted revisions, visual editing, Jianpu, transposition diagnostics, playback timelines, and export jobs together.",
          openDashboard: "Open dashboard",
          signIn: "Sign in",
          bannerFootnote: "Audiveris results remain review candidates. Complex notation needs human review, while high-quality engraving and audio depend on configured server renderers.",
        };

  return (
    <section className="container page-shell">
      <div className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 className="display-title">{copy.title}</h1>
          <p className="body-copy large">{copy.body}</p>
          <div className="button-row">
            <Link href={`${APP_ROUTES.scores}#omr-import`} className="button button-primary">
              {copy.startUpload}
              <ArrowNorthEastIcon width={16} height={16} />
            </Link>
            <Link href={APP_ROUTES.login} className="button button-secondary">
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
