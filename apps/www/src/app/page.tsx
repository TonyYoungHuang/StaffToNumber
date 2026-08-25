import Image from "next/image";
import Link from "next/link";
import { getPricingPlanCatalog } from "@score/shared";
import { ArrowNorthEastIcon, CheckSealIcon, CreditPlanCard, CreditPlanGrid, FileStackIcon, SparkIcon } from "@score/ui";
import { HomeHeroWorkbench } from "../components/HomeHeroWorkbench";
import { readSiteLocale } from "../lib/locale";
import { getLocalizedAbsoluteUrl, localizePublicHref } from "../lib/locale-routing";
import { getAppStartConversionUrl, getCheckoutUrl, siteConfig } from "../lib/site";
import styles from "./home-page.module.css";

const caseImages = [
  { slug: "pdf-score-scanner", image: "/product/feature-pdf-score-scanner-real.png", altZh: "PDF 与图片乐谱识别候选对照界面", altEn: "PDF and image recognition candidate review interface" },
  { slug: "transpose-score", image: "/product/feature-transpose-score-real.png", altZh: "结构化乐谱移调工作区", altEn: "Structured score transposition workspace" },
  { slug: "score-to-audio", image: "/product/feature-score-to-audio-real.png", altZh: "乐谱播放与练习音频工作区", altEn: "Score playback and practice-audio workspace" },
] as const;

const featureDemos = [
  { slug: "score-editor", video: "/product/demo-score-editor.mp4", poster: "/product/demo-score-editor-poster.jpg", altZh: "在线编辑五线谱功能短片", altEn: "Online score editing product demo" },
  { slug: "transpose-score", video: "/product/demo-transpose-score.mp4", poster: "/product/demo-transpose-score-poster.jpg", altZh: "五线谱移调功能短片", altEn: "Score transposition product demo" },
  { slug: "staff-to-jianpu", video: "/product/demo-staff-to-jianpu.mp4", poster: "/product/demo-staff-to-jianpu-poster.jpg", altZh: "五线谱转简谱功能短片", altEn: "Staff notation to Jianpu product demo" },
  { slug: "score-to-audio", video: "/product/demo-score-to-audio.mp4", poster: "/product/demo-score-to-audio-poster.jpg", altZh: "五线谱生成练习音频功能短片", altEn: "Score-to-audio product demo" },
] as const;

export default async function HomePage() {
  const locale = await readSiteLocale();
  const isChinese = locale === "zh-CN";
  const startUrl = localizePublicHref(getAppStartConversionUrl(locale), locale);
  const plans = getPricingPlanCatalog(locale);

  const copy = isChinese
    ? {
        heroKicker: "AI 识谱与结构化处理工作台",
        heroTitle: ["让 AI 读懂你的乐谱，", "继续编辑、转换与播放"],
        heroIntro: ["上传 PDF、乐谱图片、MusicXML 或音视频文件。", "先生成可人工校正的五线谱。", "再继续完成简谱、移调、播放与导出。"],
        heroPoints: [
          ["结果可以核对", "保留来源、诊断与需要人工判断的位置。"],
          ["一份乐谱持续使用", "编辑、简谱、移调与播放回到同一个工程。"],
          ["开放格式可以带走", "以 MusicXML 交换，并支持 MIDI 与项目快照。"],
        ],
        heroCases: "先看真实案例",
        facts: [["永久免费", "一个完整乐谱项目"], ["输入", "完整 PDF／图片／MusicXML"], ["继续处理", "编辑／简谱／移调／播放"]],
        stepsKicker: "三步使用",
        stepsTitle: "从原始文件到可以继续使用，只需三步",
        steps: [
          ["上传来源", "从 PDF、乐谱图片、MusicXML 或允许使用的音视频文件开始。"],
          ["生成并核对候选", "检查音高、时值、调号与小节，不把候选稿当成最终答案。"],
          ["继续编辑和输出", "转简谱、创建移调版本、播放练习，或导出开放格式。"],
        ],
        casesKicker: "真实工作流案例",
        casesTitle: "先看真实结果，再决定如何处理你的乐谱",
        casesBody: "案例使用当前产品工作区截图和自制测试谱例，不用抽象功能图代替结果。",
        demosKicker: "功能短片",
        demosTitle: "用十几秒看清每个核心功能",
        demosBody: "短片直接录制当前产品工作区与真实操作过程。点击视频就地播放，不会跳离首页。",
        demosProof: "真实界面录制",
        demosAction: "进入完整功能",
        demos: [
          ["在线编辑", "修改音高、时值与小节内容。"],
          ["整谱移调", "保留原调并创建目标调版本。"],
          ["五线谱转简谱", "从同一份结构化乐谱生成简谱。"],
          ["五线谱生成音频", "控制速度、循环并生成练习素材。"],
        ],
        cases: [
          ["教师备课", "扫描纸质谱，核对后生成简谱", "保留原谱、识别诊断和候选版本，修正可疑位置后再用于教学。"],
          ["编曲与排练", "导入 MusicXML，创建移调版本", "在同一个乐谱工程中保留原调，并创建可追踪的新修订。"],
          ["自主练习", "边看、边听、边循环困难小节", "通过速度、循环和声部控制辅助练习，并生成 MIDI 或练习音频。"],
        ],
        caseAction: "查看完整功能",
        engineKicker: "工作原理与核心能力",
        engineTitle: "一份结构化乐谱，连接所有后续动作",
        engineBody: "输入文件先成为可核对的候选，确认后进入同一个 Score JSON 乐谱工程。",
        pipeline: [["输入来源", "PDF／图片／音视频"], ["识别与校正", "MusicXML 候选"], ["项目真源", "Score JSON"]],
        capabilities: [
          ["在线编辑", "修正音高、时值、调号与小节。", "/score-editor"],
          ["生成简谱", "由同一份结构化音符生成简谱。", "/staff-to-jianpu"],
          ["整谱移调", "按目标调创建可回溯的新版本。", "/transpose-score"],
          ["播放与音频", "控制速度、循环并生成练习素材。", "/score-to-audio"],
          ["音视频转谱", "生成需要人工校正的候选五线谱。", "/audio-to-score"],
        ],
        trustKicker: "可信边界",
        trustTitle: "自动化可靠步骤，明确保留人工判断",
        trust: [
          ["不承诺完美识别", "低清扫描、复杂排版和多声部内容通常需要人工校正。"],
          ["候选结果可以修正", "音符、时值、调号、歌词和小节都进入结构化修订。"],
          ["私人文件不会公开", "项目文件与公共案例分开，公开证据需要单独审核。"],
          ["格式和项目可以带走", "MusicXML、MIDI、简谱文本和 Score JSON 降低工具锁定。"],
        ],
        pricingKicker: "积分付费方案",
        pricingTitle: "选择你的积分套餐",
        pricingBody: "每个创建成功的后台处理任务消耗 1 积分。比较价格、能力与资源后，登录继续付款。",
        pricingPromoLabel: "年付更省",
        pricingPromoValue: "年付节省约 45%～49%",
        creditRulesTitle: "当前积分如何计算",
        creditRulesBody: "现阶段与已经投产的后台任务配额完全一致：一个创建成功的后台处理任务计 1 积分。",
        creditRules: [
          ["$0", "一个完整免费项目", "一份完整多页 PDF 或乐谱图片可终身使用现有项目级功能，每月最多 25 个后台任务。"],
          ["1 积分／任务", "实际创建的后台任务", "PDF／图片识谱、异步渲染及持久化导出等真正进入任务队列的处理；同步移调或简谱预览不固定扣分。"],
          ["每月重置", "套餐额度", "Starter 每月 50 积分；Converter Pro 每月 200 积分，未使用额度不滚存。"],
        ],
        priceNote: "Free、Starter 与 Converter Pro 使用相同的现有项目级能力，主要区别是可创建和处理的乐谱容量。登录后可选择已完成配置的 Stripe 或 Paddle；缺少对应套餐 Price ID 时不会进入支付。",
        faqKicker: "FAQ",
        faqTitle: "开始前常见问题",
        faqs: [
          ["识别结果会百分之百准确吗？", "不会。PDF、图片和音视频首先生成候选谱，复杂内容需要人工核对。"],
          ["识别以后可以继续移调或转简谱吗？", "可以。接受候选版本后，编辑、简谱、移调、播放和导出都读取同一个乐谱工程。"],
          ["支持哪些导出格式？", "主要交换格式为 MusicXML，并支持 MIDI、Score JSON、简谱文本和当前部署已验证的导出格式。"],
          ["音视频转谱现在可用吗？", "该能力按实验功能开放，并会明确支持格式、配额与人工校正边界。"],
          ["上传文件会被公开吗？", "不会。私人项目不会自动进入公共案例。"],
        ],
        finalKicker: "从一份完整乐谱开始",
        finalTitle: "免费创建一个完整项目，再决定是否处理更多乐谱。",
        finalAction: "免费编辑",
      }
    : {
        heroKicker: "AI recognition and structured score workspace",
        heroTitle: ["Online sheet music converter and editor.", "Scan, transpose, play, and export."],
        heroIntro: ["Upload a PDF, score image, MusicXML file, or audio/video source.", "Create a reviewable structured score.", "Then edit, transpose, convert, play, and export it."],
        heroPoints: [
          ["Reviewable results", "Keep source evidence, diagnostics, and uncertain positions together."],
          ["One score keeps working", "Editing, Jianpu, transposition, and playback return to one project."],
          ["Portable open formats", "Exchange with MusicXML and keep MIDI and project snapshots."],
        ],
        heroCases: "See real examples",
        facts: [["Free forever", "One complete score project"], ["Inputs", "Complete PDF / image / MusicXML"], ["Keep working", "Edit / Jianpu / transpose / play"]],
        stepsKicker: "Three-step workflow",
        stepsTitle: "Go from a source file to a usable score in three steps",
        steps: [
          ["Upload a source", "Start with PDF, score image, MusicXML, or permitted audio and video."],
          ["Create and review", "Check pitch, duration, key, and measures instead of treating a candidate as final."],
          ["Edit and export", "Create Jianpu, transpose, practice with playback, or export an open format."],
        ],
        casesKicker: "Real workflow examples",
        casesTitle: "See the result before deciding how to process your score",
        casesBody: "These examples use current product captures and self-authored test scores rather than abstract feature art.",
        demosKicker: "Product demos",
        demosTitle: "See each core tool in a few seconds",
        demosBody: "Each clip records the current product workspace and a real operation. Play it in place without leaving the homepage.",
        demosProof: "Recorded in product",
        demosAction: "Open the full tool",
        demos: [
          ["Edit online", "Change pitch, duration, and measure content."],
          ["Transpose a score", "Keep the source key and create a target-key revision."],
          ["Staff to Jianpu", "Generate Jianpu from the same structured score."],
          ["Score to audio", "Control tempo and loops, then create practice media."],
        ],
        cases: [
          ["Lesson preparation", "Scan a paper score, review it, then create Jianpu", "Keep the source, diagnostics, and candidate together, then correct uncertain positions."],
          ["Arrangement and rehearsal", "Import MusicXML and create a transposed revision", "Preserve the original key and create a traceable revision inside one score project."],
          ["Independent practice", "See, hear, and loop difficult measures", "Control tempo, loops, and parts, then create MIDI or practice audio."],
        ],
        caseAction: "Explore the feature",
        engineKicker: "How it works and what it does",
        engineTitle: "One structured score connects every next action",
        engineBody: "A source becomes a reviewable candidate, then moves into one Score JSON project after confirmation.",
        pipeline: [["Source", "PDF / image / audio"], ["Recognition and review", "MusicXML candidate"], ["Project truth", "Score JSON"]],
        capabilities: [
          ["Edit online", "Correct pitch, duration, key, and measures.", "/score-editor"],
          ["Create Jianpu", "Generate Jianpu from the same structured notes.", "/staff-to-jianpu"],
          ["Transpose", "Create a traceable target-key revision.", "/transpose-score"],
          ["Playback and audio", "Control tempo and loops, then create practice media.", "/score-to-audio"],
          ["Audio to score", "Create a notation candidate that still needs review.", "/audio-to-score"],
        ],
        trustKicker: "Trust boundaries",
        trustTitle: "Automate reliable steps and keep human judgment explicit",
        trust: [
          ["No perfect-recognition promise", "Weak scans, dense engraving, and polyphony commonly require correction."],
          ["Candidates stay correctable", "Notes, duration, key, lyrics, and measures enter structured revisions."],
          ["Private files stay private", "Projects remain separate from public examples and evidence."],
          ["Formats and projects are portable", "MusicXML, MIDI, Jianpu text, and Score JSON reduce lock-in."],
        ],
        pricingKicker: "Credit pricing",
        pricingTitle: "Choose your credit plan",
        pricingBody: "Each successfully created server-side job uses one credit. Compare price, capabilities, and resources before signing in.",
        pricingPromoLabel: "Save with annual",
        pricingPromoValue: "Save about 45%–49% annually",
        creditRulesTitle: "How credits are counted today",
        creditRulesBody: "The current display matches the production task quota exactly: one successfully created server-side processing job uses one credit.",
        creditRules: [
          ["$0", "One complete free project", "Use one complete multi-page PDF or score image with all current project-level tools for life, with up to 25 server jobs monthly."],
          ["1 credit / job", "Jobs actually created", "OMR, asynchronous rendering, and persisted exports count when they enter the job queue. Synchronous transposition or Jianpu preview does not automatically spend a credit."],
          ["Monthly reset", "Plan allowance", "Starter includes 50 credits per month; Converter Pro includes 200. Unused allowance does not roll over."],
        ],
        priceNote: "Free, Starter, and Converter Pro use the same current project-level tools; the main difference is score-processing capacity. Checkout proceeds only when the selected Stripe or Paddle plan has its own configured Price ID.",
        faqKicker: "FAQ",
        faqTitle: "Questions before you start",
        faqs: [
          ["Is recognition 100% accurate?", "No. PDF, image, audio, and video sources produce candidates; difficult material requires human review."],
          ["Can I transpose or create Jianpu afterward?", "Yes. Editing, Jianpu, transposition, playback, and export read the same accepted score project."],
          ["Which export formats are supported?", "MusicXML is the primary interchange format, with MIDI, Score JSON, Jianpu text, and verified deployment exports."],
          ["Is audio-to-score available now?", "It opens as an experimental capability with explicit format, quota, and correction boundaries."],
          ["Will my uploads become public?", "No. Private projects do not automatically become public examples."],
        ],
        finalKicker: "Start with one complete score",
        finalTitle: "Create one complete project for free, then decide whether to process more scores.",
        finalAction: "Edit for free",
      };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.siteName,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    url: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/", locale),
    description: siteConfig.description,
    featureList: copy.capabilities.map(([title]) => title),
  };

  return (
    <div className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />

      <section className={`${styles.section} ${styles.hero}`} aria-labelledby="home-title">
        <div className={styles.heroGlowOne} /><div className={styles.heroGlowTwo} />
        <div className={`${styles.container} ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}><SparkIcon width={16} height={16} />{copy.heroKicker}</p>
            <h1 id="home-title" className={isChinese ? undefined : styles.heroTitleEnglish}>
              {copy.heroTitle.map((line) => <span className={styles.heroTitleLine} key={line}>{line}</span>)}
            </h1>
          </div>
          <HomeHeroWorkbench isChinese={isChinese} appUrl={siteConfig.appUrl} startUrl={startUrl} audioAvailable={siteConfig.release.audioTranscriptionAvailable} />
        </div>
        <div className={`${styles.container} ${styles.factBar}`}>{copy.facts.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      </section>

      <section id="demos" className={`${styles.section} ${styles.demoSection}`} aria-labelledby="demos-title">
        <div className={styles.container}>
          <div className={styles.demoHeading}>
            <div><p className={styles.kicker}>{copy.demosKicker}</p><h2 id="demos-title">{copy.demosTitle}</h2></div>
            <p>{copy.demosBody}</p>
          </div>
          <div className={styles.demoGrid}>
            {copy.demos.map(([title, body], index) => {
              const demo = featureDemos[index];
              return (
                <article key={title} className={styles.demoCard}>
                  <div className={styles.demoMedia}>
                    <video
                      src={demo.video}
                      poster={demo.poster}
                      controls
                      muted
                      playsInline
                      preload="none"
                      aria-label={isChinese ? demo.altZh : demo.altEn}
                    />
                    <span className={styles.demoProof}>{copy.demosProof}</span>
                  </div>
                  <div className={styles.demoCopy}>
                    <strong>{title}</strong>
                    <small>{body}</small>
                    <Link href={localizePublicHref(`/${demo.slug}`, locale)}>{copy.demosAction}<ArrowNorthEastIcon width={14} height={14} /></Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="workflow" className={`${styles.section} ${styles.softSection}`} aria-labelledby="workflow-title">
        <div className={styles.container}>
          <header className={styles.sectionHeading}><p className={styles.kicker}>{copy.stepsKicker}</p><h2 id="workflow-title">{copy.stepsTitle}</h2></header>
          <ol className={styles.stepsGrid}>{copy.steps.map(([title, body], index) => <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{body}</p></li>)}</ol>
        </div>
      </section>

      <section id="cases" className={styles.section} aria-labelledby="cases-title">
        <div className={styles.container}>
          <header className={styles.sectionHeading}><p className={styles.kicker}>{copy.casesKicker}</p><h2 id="cases-title">{copy.casesTitle}</h2><p>{copy.casesBody}</p></header>
          <div className={styles.caseGrid}>
            {copy.cases.map(([eyebrow, title, body], index) => {
              const image = caseImages[index];
              return <article key={eyebrow} className={styles.caseCard}><Link href={localizePublicHref(`/${image.slug}`, locale)} className={styles.caseMedia}><Image src={image.image} alt={isChinese ? image.altZh : image.altEn} width={1425} height={891} sizes="(max-width: 820px) 92vw, 31vw" /></Link><div className={styles.caseBody}><span>{eyebrow}</span><h3>{title}</h3><p>{body}</p><Link href={localizePublicHref(`/${image.slug}`, locale)}>{copy.caseAction} →</Link></div></article>;
            })}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.engineSection}`} aria-labelledby="engine-title">
        <div className={styles.container}>
          <header className={styles.sectionHeading}><p className={styles.kicker}>{copy.engineKicker}</p><h2 id="engine-title">{copy.engineTitle}</h2><p>{copy.engineBody}</p></header>
          <div className={styles.pipeline}>{copy.pipeline.map(([label, value], index) => <div key={label} className={index === copy.pipeline.length - 1 ? styles.pipelineCore : undefined}><small>{label}</small><strong>{value}</strong>{index < copy.pipeline.length - 1 ? <i aria-hidden="true">→</i> : null}</div>)}</div>
          <div className={styles.capabilityGrid}>{copy.capabilities.map(([title, body, href]) => <Link href={localizePublicHref(href, locale)} key={title}><strong>{title}</strong><span>{body}</span><ArrowNorthEastIcon width={15} height={15} /></Link>)}</div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.softSection}`} aria-labelledby="trust-title">
        <div className={`${styles.container} ${styles.trustLayout}`}>
          <div className={styles.trustHeading}><span><FileStackIcon width={26} height={26} /></span><p className={styles.kicker}>{copy.trustKicker}</p><h2 id="trust-title">{copy.trustTitle}</h2></div>
          <div className={styles.trustGrid}>{copy.trust.map(([title, body]) => <article key={title}><CheckSealIcon width={20} height={20} /><div><h3>{title}</h3><p>{body}</p></div></article>)}</div>
        </div>
      </section>

      <section id="pricing" className={styles.section} aria-labelledby="pricing-title">
        <div className={`${styles.container} ${styles.pricingContainer}`}>
          <header className={styles.pricingHeader}>
            <div><p className={styles.kicker}>{copy.pricingKicker}</p><h2 id="pricing-title">{copy.pricingTitle}</h2><p>{copy.pricingBody}</p></div>
            <div className={styles.pricingSavings}><span>{copy.pricingPromoLabel}</span><strong>{copy.pricingPromoValue}</strong></div>
          </header>
          <CreditPlanGrid label={isChinese ? "积分套餐" : "Credit plans"}>
            {plans.map((plan) => (
              <CreditPlanCard
                key={plan.code}
                plan={plan}
                isChinese={isChinese}
                selected={plan.featured}
                actionHref={plan.code === "free" ? startUrl : getCheckoutUrl(locale, plan.code)}
                headingLevel={3}
              />
            ))}
          </CreditPlanGrid>
          <div className={styles.creditRules}>
            <div><p className={styles.kicker}>{isChinese ? "积分口径" : "Credit rules"}</p><h3>{copy.creditRulesTitle}</h3><p>{copy.creditRulesBody}</p></div>
            <div>{copy.creditRules.map(([amount, title, body]) => <article key={title}><strong>{amount}</strong><span>{title}</span><p>{body}</p></article>)}</div>
          </div>
          <p className={styles.priceNote}>{copy.priceNote}</p>
        </div>
      </section>

      <section id="faq" className={`${styles.section} ${styles.faqSection}`} aria-labelledby="faq-title">
        <div className={`${styles.container} ${styles.faqLayout}`}><header className={styles.faqHeading}><p className={styles.kicker}>{copy.faqKicker}</p><h2 id="faq-title">{copy.faqTitle}</h2></header><div className={styles.faqList}>{copy.faqs.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></div>
      </section>

      <section className={styles.finalSection}><div className={`${styles.container} ${styles.finalCard}`}><div><span>{copy.finalKicker}</span><h2>{copy.finalTitle}</h2></div><a href="#home-workbench">{copy.finalAction}<ArrowNorthEastIcon width={18} height={18} /></a></div></section>
    </div>
  );
}
