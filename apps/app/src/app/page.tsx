import type { Metadata } from "next";
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

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function AppHomePage() {
  const locale = await readAppLocale();
  const featureCards =
    locale === "zh-CN"
      ? [
          {
            title: "识别纸质谱和 PDF",
            body: "上传一页 PDF 或乐谱图片，先查看识别结果，再逐处校对需要调整的音符。",
            icon: VaultIcon,
            tone: "",
          },
          {
            title: "修改、移调和简谱转换",
            body: "直接点选谱面修改音符，转换五线谱与简谱，并为不同乐器或音域移调。",
            icon: SparkIcon,
            tone: " tertiary",
          },
          {
            title: "播放练习与常用格式导出",
            body: "变速、循环、打开节拍器或单独听某个声部，并导出常用乐谱、图片和音频格式。",
            icon: CheckSealIcon,
            tone: "",
          },
        ]
      : [
          {
            title: "Scan printed music and PDFs",
            body: "Upload one PDF page or score image, review the recognized score, and correct any notes that need attention.",
            icon: VaultIcon,
            tone: "",
          },
          {
            title: "Edit, transpose, and convert notation",
            body: "Select notes on the page, convert between staff and numbered notation, and transpose for another instrument or vocal range.",
            icon: SparkIcon,
            tone: " tertiary",
          },
          {
            title: "Practice and export",
            body: "Loop a passage, change tempo, use a metronome, isolate parts, and export common score, image, and audio formats.",
            icon: CheckSealIcon,
            tone: "",
          },
        ];

  const copy =
    locale === "zh-CN"
      ? {
          eyebrow: "在线乐谱工具",
          title: (
            <>
              把乐谱变成可以继续<em>修改、播放和移调</em>的电子谱。
            </>
          ),
          body:
            "上传 PDF 或乐谱图片，先免费识别一页。确认识别效果后，再继续校对、转简谱、移调、练习和导出。",
          startUpload: "免费识别一页",
          openJobs: "已有账户登录",
          createAccount: "创建免费账户",
          truthTitle: "识别结果由你确认",
          truthBody: "复杂排版、模糊扫描或手写谱可能识别不准。系统会先让你检查，不会直接覆盖已经确认的乐谱。",
          sequenceTitle: "只需三步",
          sequenceBody: "上传乐谱 → 检查识别结果 → 修改、移调、练习或导出。",
          previewStatus: "识别结果预览",
          previewCopy: "五线谱和简谱会随你的修改一起更新，不需要在多个工具之间重复操作。",
          step1Label: "第 1 步",
          step1Title: "上传一页 PDF 或一张乐谱图片",
          step2Label: "第 2 步",
          step2Title: "检查并确认识别结果",
          step2Status: "可以手动修改",
          bannerEyebrow: "识别之后还能继续",
          bannerTitle: "不用识别完就重新找别的工具。",
          bannerBody:
            "识别后的乐谱可以继续校对、转简谱、移调、播放练习和导出，修改记录也会自动保留。",
          openDashboard: "打开我的乐谱",
          signIn: "登录",
          bannerFootnote: "提示：复杂乐谱仍需人工检查；识别结果以你最终确认的版本为准。",
        }
      : {
          eyebrow: "Online sheet-music tools",
          title: (
            <>
              Turn sheet music into a score you can <em>edit, play, and transpose</em>.
            </>
          ),
          body:
            "Upload a PDF or score image and scan one page free. Review the result, then continue correcting, converting, transposing, practicing, and exporting.",
          startUpload: "Scan one page free",
          openJobs: "Sign in",
          createAccount: "Create free account",
          truthTitle: "You approve the recognized score",
          truthBody: "Complex engraving, blurry scans, and handwriting can reduce accuracy. You review the result before it becomes an approved version.",
          sequenceTitle: "Three simple steps",
          sequenceBody: "Upload a score → review the result → edit, transpose, practice, or export.",
          previewStatus: "Recognition preview",
          previewCopy: "Staff and numbered notation update together as you edit, so you do not need to repeat work in separate tools.",
          step1Label: "Step 1",
          step1Title: "Upload one PDF page or one score image",
          step2Label: "Step 2",
          step2Title: "Review and approve the result",
          step2Status: "Manual fixes available",
          bannerEyebrow: "Continue after recognition",
          bannerTitle: "Keep working without switching tools.",
          bannerBody:
            "Correct the recognized score, convert notation, transpose, practice, and export while your edit history stays available.",
          openDashboard: "Open my scores",
          signIn: "Sign in",
          bannerFootnote: "Complex notation still needs human review. Your approved version remains the final reference.",
        };
  const faqItems = locale === "zh-CN"
    ? [
        { question: "识别结果会完全准确吗？", answer: "不能保证。清晰、排版标准的乐谱通常效果更好；复杂声部、模糊扫描和手写谱需要人工检查。" },
        { question: "可以用 Google 账户注册吗？", answer: "可以。在登录或注册页选择“使用 Google 继续”，即可创建账户或进入已有账户。" },
        { question: "识别后还能做什么？", answer: "可以校对音符、转换五线谱与简谱、移调、播放练习，并导出常用格式。" },
      ]
    : [
        { question: "Is score recognition always accurate?", answer: "No. Clear, conventionally engraved scores work best; complex parts, blurry scans, and handwriting need human review." },
        { question: "Can I register with Google?", answer: "Yes. Choose Continue with Google on the sign-in or registration page to create or access your account." },
        { question: "What can I do after recognition?", answer: "Correct notes, convert staff and numbered notation, transpose, practice with playback, and export common formats." },
      ];

  return (
    <section className="container page-shell">
      <div className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 className="display-title">{copy.title}</h1>
          <p className="body-copy large">{copy.body}</p>
          <div className="button-row">
            <Link href={`${APP_ROUTES.scores}/new/scan`} className="button button-primary">
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

      <section className="stack-md" aria-labelledby="home-capabilities-title">
        <h2 id="home-capabilities-title" className="section-title">
          {locale === "zh-CN" ? "从识别到导出，一处完成" : "From recognition to export in one place"}
        </h2>
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
      </section>

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

      <section className="surface-panel stack-md" aria-labelledby="home-faq-title">
        <div className="stack-sm">
          <p className="eyebrow">{locale === "zh-CN" ? "常见问题" : "Common questions"}</p>
          <h2 id="home-faq-title" className="section-title">
            {locale === "zh-CN" ? "开始前，你可能想知道" : "What to know before you start"}
          </h2>
        </div>
        <div className="info-grid">
          {faqItems.map((item) => (
            <article key={item.question} className="mini-card stack-sm">
              <h3 className="card-title">{item.question}</h3>
              <p className="body-copy">{item.answer}</p>
            </article>
          ))}
        </div>
        <p className="micro-copy">
          {locale === "zh-CN"
            ? "产品说明更新于 2026 年 8 月 19 日。如需帮助，请联系 support@scoretransposer.com。"
            : "Product information updated August 19, 2026. Contact support@scoretransposer.com for help."}
        </p>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "SoftwareApplication",
                name: "ScoreTransposer",
                url: "https://app.scoretransposer.com/",
                applicationCategory: "MultimediaApplication",
                operatingSystem: "Web",
                inLanguage: ["zh-CN", "en"],
                description: locale === "zh-CN"
                  ? "在线识别、校对、转换、移调、播放和导出乐谱。"
                  : "Scan, correct, convert, transpose, practice, and export sheet music online.",
              },
              {
                "@type": "FAQPage",
                mainEntity: faqItems.map((item) => ({
                  "@type": "Question",
                  name: item.question,
                  acceptedAnswer: { "@type": "Answer", text: item.answer },
                })),
              },
            ],
          }),
        }}
      />
    </section>
  );
}
