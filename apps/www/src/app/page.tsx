import type { ReactElement } from "react";
import { PRODUCT_NAME } from "@score/shared";
import {
  ArrowNorthEastIcon,
  CheckSealIcon,
  FeatureCard,
  FileStackIcon,
  GlobeIcon,
  MetricCard,
  Panel,
  SectionIntro,
  SparkIcon,
  StatusPill,
  UploadIcon,
  VaultIcon,
  WorkflowStep,
  sonataCopy,
} from "@score/ui";
import { readSiteLocale } from "../lib/locale";
import { isFeatureAvailable, platformFeaturePages } from "../lib/platform-feature-pages";
import {
  getAppRegisterUrl,
  getAppStartConversionUrl,
  getCheckoutUrl,
  getSafeAppUrl,
  siteConfig,
} from "../lib/site";

type FeatureCardItem = {
  title: string;
  body: string;
  icon: ReactElement;
  tone?: "tertiary";
};

type WorkflowItem = {
  step: string;
  title: string;
  body: string;
};

type MetricItem = {
  label: string;
  value: string;
  body: string;
};

type QnaItem = {
  q: string;
  a: string;
};

type SeoTopicItem = {
  title: string;
  body: string;
};

type DefinitionItem = {
  label: string;
  body: string;
};

export default async function HomePage() {
  const locale = await readSiteLocale();
  const isChinese = locale === "zh-CN";
  const appHomeUrl = getSafeAppUrl("homepage");
  const appRegisterUrl = getAppRegisterUrl();
  const startConversionUrl = getAppStartConversionUrl();
  const checkoutUrl = getCheckoutUrl(locale);
  const visibleFeaturePages = platformFeaturePages.filter((page) => page.slug !== "pricing" && isFeatureAvailable(page));

  const featureCards: ReadonlyArray<FeatureCardItem> = isChinese
    ? [
        {
          title: "注册后先免费识别一页",
          body: "上传一页五线谱 PDF 或一张 PNG、JPG、WebP、TIFF 图片，先查看候选五线谱和识别诊断，无需先付款。",
          icon: <SparkIcon width={20} height={20} />,
        },
        {
          title: "候选稿明确需要人工检查",
          body: "识别结果不会伪装成出版级成品；低置信度符号、错误提示和任务状态会与五线谱候选一起显示。",
          icon: <GlobeIcon width={20} height={20} />,
          tone: "tertiary",
        },
        {
          title: "需要完整使用时再开通",
          body: "第二次识别、多页处理、校对、简谱互换、移调和完整导出进入付费层；免费预览不会提供下载。",
          icon: <CheckSealIcon width={20} height={20} />,
        },
      ]
    : [
        {
          title: "Scan one page before paying",
          body: "Upload one staff-score PDF page or a PNG, JPG, WebP, or TIFF image and review the staff candidate and diagnostics without paying first.",
          icon: <SparkIcon width={20} height={20} />,
        },
        {
          title: "Review-first, not publication-ready claims",
          body: "The product shows job status, recognition warnings, and lower-confidence notation alongside the staff candidate so users know what needs checking.",
          icon: <GlobeIcon width={20} height={20} />,
          tone: "tertiary",
        },
        {
          title: "Unlock only when you need more",
          body: "Additional scans, multi-page work, correction, Jianpu conversion, transposition, and full exports belong to the paid tier. The free preview has no downloads.",
          icon: <CheckSealIcon width={20} height={20} />,
        },
      ];

  const workflow: ReadonlyArray<WorkflowItem> = isChinese
    ? [
        {
          step: "01",
          title: "注册并上传一页",
          body: "上传一页 PDF 或一张乐谱图片。免费账户终身可创建一次 OMR 预览任务。",
        },
        {
          step: "02",
          title: "校对候选谱",
          body: "扫描识别结果先作为候选修订，结合原图、置信度和错误小节定位完成确认。",
        },
        {
          step: "03",
          title: "编辑、互换与移调",
          body: "在同一 Score JSON 工程中修改音符与符号，进行五线谱/简谱互换、移调和练习设置。",
        },
        {
          step: "04",
          title: "播放并导出",
          body: "完成最终人工复核后，按已验证能力导出 MusicXML、MIDI、PDF、WAV 或 MP3。",
        },
      ]
    : [
        {
          step: "01",
          title: "Create an account and upload one page",
          body: "Upload one PDF page or one score image. A free account can create one OMR preview job.",
        },
        {
          step: "02",
          title: "Review the score candidate",
          body: "Recognition output stays a candidate revision until the source image, confidence data, and flagged measures have been checked.",
        },
        {
          step: "03",
          title: "Edit, convert, and transpose",
          body: "Correct notation, convert between staff and Jianpu, transpose, and configure practice from the same Score JSON project.",
        },
        {
          step: "04",
          title: "Play and export",
          body: "After final human review, export MusicXML, MIDI, PDF, WAV, or MP3 according to the capabilities verified in production.",
        },
      ];

  const useCases = isChinese
    ? [
        {
          title: "音乐教师与培训机构",
          body: "把现有五线谱 PDF 更快整理成简谱讲义，减少同一份编配被重复手工重写的时间。",
        },
        {
          title: "跨文化排练团队",
          body: "保留同一份乐谱来源，同时为更习惯简谱的演奏者准备可复核的数字谱输出。",
        },
        {
          title: "编曲、制谱与出版协作",
          body: "通过草稿优先的交付方式，把真正需要人工修订的页面尽早分离出来，减少返工。",
        },
      ]
    : [
        {
          title: "Music teachers and training studios",
          body: "Turn existing staff PDFs into Jianpu-first teaching handouts without rewriting the same arrangement manually.",
        },
        {
          title: "Cross-cultural rehearsal teams",
          body: "Keep one score source while generating numbered notation for players who move faster with Jianpu.",
        },
        {
          title: "Arrangers, engravers, and publishers",
          body: "Use a draft-safe output path to isolate the pages that still need human cleanup.",
        },
      ];

  const deliverables: ReadonlyArray<MetricItem> = isChinese
    ? [
        {
          label: "免费结果",
          value: "OMR 候选谱",
          body: "查看候选五线谱、任务状态与基础诊断；结果明确标记为需要人工检查，且不能下载。",
        },
        {
          label: "开通后",
          value: "可编辑工程",
          body: "确认候选后继续校对、简谱互换、移调、播放，并把结构化修订保存在工程中。",
        },
        {
          label: "完整交付",
          value: "多格式导出",
          body: "付费权益通过统一权限层开放 MusicXML、MIDI、PDF、图片、简谱文本和音频等导出。",
        },
      ]
    : [
        {
          label: "Free result",
          value: "OMR candidate",
          body: "Review the staff candidate, job status, and basic diagnostics. It is explicitly marked for human review and cannot be downloaded.",
        },
        {
          label: "After upgrade",
          value: "Editable project",
          body: "Accept and correct the candidate, convert to Jianpu, transpose, practice, and save structured revisions in the project.",
        },
        {
          label: "Full delivery",
          value: "Multi-format export",
          body: "A shared entitlement layer unlocks MusicXML, MIDI, PDF, images, Jianpu text, audio, and other full exports.",
        },
      ];

  const faq: ReadonlyArray<QnaItem> = isChinese
    ? [
        {
          q: "现在真正上线了什么？",
          a: "注册用户现在可以免费上传一页五线谱 PDF 或一张图片，查看 OMR 候选五线谱与基础诊断。开通后可继续多页识别、校对、简谱互换、移调、播放和完整导出。",
        },
        {
          q: "需要先注册账号吗？",
          a: "官网无需登录即可浏览；创建免费 OMR 任务需要邮箱注册。注册后直接进入上传区，不需要先付款或兑换激活码。",
        },
        {
          q: "如果 PDF 不清晰怎么办？",
          a: "候选谱会保留识别诊断并明确提示人工检查。若任务失败，页面会显示原因和支持入口，而不是把不可靠结果当成正式乐谱。",
        },
        {
          q: "支持中国大陆用户吗？",
          a: "支持。网站可以保持公开与双语展示，中国大陆销售仍可继续通过激活码和你现有的商业流程来完成。",
        },
        {
          q: "这里可以直接在线做五线谱 PDF 转简谱吗？",
          a: "可以先免费识别一页 PDF 或图片并查看候选五线谱；简谱互换、校对、再次识别和完整导出需要开通完整权限。",
        },
        {
          q: "它和 numbered notation converter 是同一类需求吗？",
          a: "对当前版本来说基本是同一类搜索意图。无论你搜索 numbered notation converter、staff pdf to jianpu 还是 staff notation to numbered notation，这里描述的都是同一条实际工作流。",
        },
      ]
    : [
        {
          q: "What is actually live right now?",
          a: "A registered user can upload one staff-score PDF page or image for free and review an OMR staff candidate with basic diagnostics. Paid access continues into multi-page OMR, correction, Jianpu conversion, transposition, playback, and full export.",
        },
        {
          q: "Do users need an account first?",
          a: "The public site is open without login. Creating the free OMR job requires an email account, then registration goes directly to the upload area without payment or an activation code.",
        },
        {
          q: "What happens when a PDF is unclear?",
          a: "The candidate keeps recognition diagnostics and an explicit human-review warning. If processing fails, the page shows the reason and a support path instead of presenting an unreliable result as final notation.",
        },
        {
          q: "Does this support mainland-China customers?",
          a: "Yes. The website can stay public and bilingual while mainland-China sales continue through activation codes and your existing commerce workflow.",
        },
        {
          q: "Can I convert a staff PDF to Jianpu online here?",
          a: "You can scan one PDF page or image for free and review the staff candidate. Jianpu conversion, correction, additional scans, and full exports require paid access.",
        },
        {
          q: "Is this the same as a numbered notation converter?",
          a: "In the current release, yes. If you are searching for a numbered notation converter, staff notation to Jianpu, or staff PDF to numbered notation, this website is describing that same practical workflow.",
        },
      ];

  const seoTopics: ReadonlyArray<SeoTopicItem> = isChinese
    ? [
        {
          title: "这里说的“五线谱 PDF 转简谱”到底是什么意思",
          body: "在当前公开版本里，它先指上传一页 PDF 或图片并得到可复核的五线谱候选；候选确认后，再在付费工程中完成简谱互换、编辑和导出。",
        },
        {
          title: "为什么多种关键词会落到同一条流程",
          body: "当用户搜索 staff pdf to jianpu、staff notation to numbered notation、numbered notation converter、五线谱转简谱或乐谱 PDF 转简谱时，他们通常寻找的是同一条可执行的工作路径。",
        },
        {
          title: "为什么文案要刻意保持收窄",
          body: "首页保持 PDF/图片识谱和五线谱转简谱这一主要意图；移调、编辑与播放由独立功能页承接，实验性音频转谱和教学能力不进入首购主路径。",
        },
      ]
    : [
        {
          title: "What staff PDF to Jianpu means on this site",
          body: "On this release, the path starts by scanning one PDF page or image into a reviewable staff candidate. After acceptance, paid projects continue into Jianpu conversion, editing, and export.",
        },
        {
          title: "Keyword variants that map to the same workflow",
          body: "Users may search for staff PDF to Jianpu, staff notation to numbered notation, numbered notation converter, music score converter, or five-line staff to Jianpu. On this site, those searches map to the same practical workflow.",
        },
        {
          title: "Why the wording stays narrow",
          body: "The homepage keeps PDF/image score scanning and staff-to-Jianpu as its primary intent. Dedicated pages cover transposition, editing, and playback, while experimental transcription and teaching stay out of the purchase path.",
        },
      ];

  const definitionItems: ReadonlyArray<DefinitionItem> = isChinese
    ? [
        {
          label: "上传后会得到什么",
          body: "PDF 或图片先成为可校对的 MusicXML 候选谱；确认后保存为 Score JSON 修订，再用于简谱互换、移调、播放与导出。",
        },
        {
          label: "为什么不直接编辑 PDF",
          body: "PDF 和图片只是导入源。所有可持续编辑、移调、播放和导出都基于结构化乐谱，避免对图像像素做脆弱修改。",
        },
        {
          label: "识别与转谱边界",
          body: "复杂总谱、低清扫描、倾斜照片和手写谱仍需要更多人工校对；当前不承诺一键得到出版级成品。",
        },
      ]
    : [
        {
          label: "What an upload creates",
          body: "A PDF or image becomes a reviewable MusicXML candidate. Once accepted, it is stored as a Score JSON revision for Jianpu conversion, transposition, playback, and export.",
        },
        {
          label: "Why the PDF is not edited directly",
          body: "PDF and image files remain import sources. Durable editing, transposition, playback, and export operate on structured notation rather than page pixels.",
        },
        {
          label: "Current product limits",
          body: "Complex scores, low-resolution scans, skewed photos, and handwritten notation require more human review. The product does not promise one-click publication-ready output.",
        },
      ];

  const copy = isChinese
    ? {
        heroEyebrow: "免费识别一页五线谱 PDF 或图片",
        heroTitle: "在线识别五线谱 PDF 与乐谱图片",
        heroBody: `${PRODUCT_NAME} 先把一页 PDF 或图片识别成可人工检查的五线谱候选；开通后再继续简谱互换、移调、修谱、播放和多格式导出。`,
        featuredEyebrow: "定义摘要",
        featuredTitle: "什么是“五线谱 PDF 转简谱”工具？这是搜索用户最先该看到的短答案。",
        featuredBody: "如果用户通过 staff pdf to jianpu、五线谱转简谱或 numbered notation converter 进入网站，最核心的解释应该很直接：扫描结果会成为可校对的结构化候选，确认后可继续做简谱互换、移调、编辑、练习和导出。",
        start: "免费识别一页",
        createAccount: "注册账号",
        buyAccess: "购买或开通权限",
        scope: "能力状态清晰可见",
        scopeBody: "PDF 与图片 OMR 已接入免费体验；MuseScore 与 SoundFont 等服务端渲染能力会显示部署条件，所有识别结果都需要人工校对。",
        previewChip: "当前转换预览",
        previewLabel: "简谱预览概念",
        previewBody: "源 PDF 足够清晰时可进入候选校对；置信度不足的符号和小节会保留诊断，避免未经确认就成为正式修订。",
        methodsEyebrow: "核心能力",
        methodsTitle: "一份结构化乐谱贯穿识别、校对、转换、练习和导出。",
        methodsBody: "每项功能都回到同一个 MusicXML 与 Score JSON 工程，避免把用户文件送进互不相通的一次性转换器。",
        deliverEyebrow: "交付结果",
        deliverTitle: "上传五线谱 PDF 后，得到可校对候选、正式修订与按需导出。",
        deliverBody: "源文件、识别候选、确认后的 Score JSON 修订和导出资产分层保存，识别失败不会覆盖已有正式版本。",
        fitEyebrow: "上线适配",
        fitTitle: "适合受控发布，但还不适合对所有乐谱场景都做强承诺。",
        fitBody: "在官网上先预筛用户预期，通常比付款后再解释边界更省成本。",
        fitGood: "当前比较适合",
        fitGoodPoints: [
          "已经有相对清晰的五线谱 PDF。",
          "接受导出后再做最后人工复核。",
          "想更快得到教学、排练或内部流转用的简谱材料。",
        ],
        fitWait: "暂不建议承诺",
        fitWaitPoints: [
          "MuseScore 级自由拖拽排版与复杂出版级制谱。",
          "复音录音的一键转谱，或无需校对的自动出版。",
          "扫描质量很差却仍期待一键得到最终成品的复杂 PDF。",
        ],
        useCasesEyebrow: "适用场景",
        useCasesTitle: "哪些人最需要五线谱 PDF 转简谱或 numbered notation converter",
        useCasesBody: "这页主要写给已经理解乐谱处理取舍、正在寻找从五线谱进入简谱实用途径的人。",
        surfaceEyebrow: "产品表面",
        surfaceTitle: "官网与应用现在共享同一套 numbered notation / Jianpu 工作流语言。",
        workflowEyebrow: "从访问到交付",
        workflowTitle: "五线谱 PDF 转简谱，当前正式版本的四步路径。",
        pricingEyebrow: "价格与开通",
        pricingTitle: "对外公开可发现，实际使用通过支付或激活开通的五线谱 PDF 转简谱工具。",
        pricingBody: "这样既保留官网的搜索可见性，也把交易与权限逻辑留在支付流程和应用内，而不必让营销站承担后台控制台职责。",
        openApp: "打开应用",
        commercialTitle: "当前商用结构",
        commercialA: "公开发现层",
        commercialB: "付费访问层",
        faqEyebrow: "常见问题",
        faqTitle: "用户在联系支持或付费前，最常问的五线谱 PDF 转简谱问题。",
        deliveryEyebrow: "交付逻辑",
        deliveryTitle: "结果强就升正式，结果弱就保留草稿。",
        seoEyebrow: "搜索意图",
        seoTitle: "staff pdf to jianpu、five-line staff to jianpu 与 numbered notation converter 的核心落地页意图。",
        seoBody: "这样能让搜索用户在落地时更快确认：这里讲的是一条现实可用的五线谱 PDF 转简谱路径，而不是关键词堆砌。",
        privacyEyebrow: "隐私",
        privacyTitle: "面向公开上线的隐私说明，现在已经足够清晰。",
        privacyBody: "上传的 PDF 会用于执行请求的转换流程，保留源文件与结果文件，并支持后续下载、复核与支持排查。",
        privacyButton: "查看隐私政策",
        termsEyebrow: "条款",
        termsTitle: "在付款前明确服务边界、复核责任与交付限制。",
        termsBody: "这能帮助客户购买的是当前明确存在的能力，而不是模糊的未来路线图。",
        termsButton: "查看服务条款",
      }
    : {
        heroEyebrow: "Free one-page PDF and image score scanner",
        heroTitle: "Scan Sheet Music PDFs and Images into Editable Notation",
        heroBody: `${PRODUCT_NAME} turns one PDF page or score image into a staff-notation candidate for human review, then continues into Jianpu conversion, transposition, correction, playback, and export after upgrade.`,
        featuredEyebrow: "Definition snippet",
        featuredTitle: "What is a staff PDF to Jianpu converter? This is the short answer a search visitor should see first.",
        featuredBody: "If someone arrives from staff PDF to Jianpu or numbered-notation searches, the answer is direct: a scan becomes a reviewable structured candidate that can continue into Jianpu, transposition, editing, practice, and export.",
        start: "Scan one page free",
        createAccount: "Create account",
        buyAccess: "Buy or unlock access",
        scope: "Capability status stays visible",
        scopeBody: "PDF and image OMR is available in the free experience. Server-rendered engraving and audio show their deployment requirements, and all recognition output remains review-first.",
        previewChip: "Current conversion preview",
        previewLabel: "Jianpu preview concept",
        previewBody: "Clear PDFs can move into candidate review. Lower-confidence symbols and measures retain diagnostics instead of becoming accepted revisions without confirmation.",
        methodsEyebrow: "Core capabilities",
        methodsTitle: "One structured score connects recognition, correction, conversion, practice, and export.",
        methodsBody: "Every workflow returns to the same MusicXML and Score JSON project instead of sending user files through disconnected one-off converters.",
        deliverEyebrow: "Deliverables",
        deliverTitle: "What a staff PDF upload creates: a review candidate, an accepted revision, and derived exports.",
        deliverBody: "Source files, recognition candidates, accepted Score JSON revisions, and export assets remain separate so failed recognition cannot replace accepted work.",
        fitEyebrow: "Launch fit",
        fitTitle: "Good for a controlled release, not yet for every notation scenario.",
        fitBody: "Pre-qualifying expectations on the site is cheaper than explaining the gaps after payment.",
        fitGood: "Good fit right now",
        fitGoodPoints: [
          "Users already have relatively clean five-line staff PDFs.",
          "They accept a final manual review after export.",
          "They want a faster route into teaching, rehearsal, or internal circulation materials.",
        ],
        fitWait: "Still being productized",
        fitWaitPoints: [
          "Desktop-grade free-form engraving and complex layout repair.",
          "One-click publication-ready output from complex scores, poor scans, or skewed photos.",
          "Very poor scans or highly complex pages that expect one-click publication-ready output.",
        ],
        useCasesEyebrow: "Use cases",
        useCasesTitle: "Who needs a staff PDF to Jianpu or numbered-notation converter most",
        useCasesBody: "The page is written for people who already understand score-processing tradeoffs and are specifically looking for a practical route from five-line staff into Jianpu.",
        surfaceEyebrow: "Product surface",
        surfaceTitle: "The public website and the app now share the same vocabulary and visual tone.",
        workflowEyebrow: "From visit to delivery",
        workflowTitle: "How to convert a five-line staff PDF into usable Jianpu in four steps.",
        pricingEyebrow: "Pricing and activation",
        pricingTitle: "Open discovery, checkout access, and activation-based use for a staff PDF to Jianpu tool.",
        pricingBody: "That preserves search visibility for the landing page while keeping the actual transaction and entitlement logic inside checkout and the app, without turning the marketing site into a backend console.",
        openApp: "Open app",
        commercialTitle: "Current commercial structure",
        commercialA: "Open discovery layer",
        commercialB: "Paid access layer",
        faqEyebrow: "FAQ",
        faqTitle: "Staff PDF to Jianpu FAQ before a buyer reaches support.",
        deliveryEyebrow: "Delivery logic",
        deliveryTitle: "Final when strong, draft when uncertain.",
        seoEyebrow: "Search intent",
        seoTitle: "Staff PDF to Jianpu, five-line staff to Jianpu, and numbered-notation converter: the main landing-page intent.",
        seoBody: "That gives search users clearer landing-page context when they are looking for a staff PDF to Jianpu workflow, a numbered notation converter, staff notation to numbered notation, or a practical route from five-line staff into Jianpu.",
        privacyEyebrow: "Privacy",
        privacyTitle: "The launch privacy story is now clear enough for a real public site.",
        privacyBody: "Uploaded PDFs are used to run the requested workflow, retain source and result files, and support later download, review, and support investigation.",
        privacyButton: "Open privacy policy",
        termsEyebrow: "Terms",
        termsTitle: "State the service boundary, review responsibility, and delivery limits before payment.",
        termsBody: "That helps customers buy a clearly defined present-day capability instead of a fuzzy future roadmap.",
        termsButton: "Open terms of service",
      };

  return (
    <section className="public-container public-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: siteConfig.siteName,
            applicationCategory: "MusicApplication",
            operatingSystem: "Web",
            description: copy.heroBody,
            url: siteConfig.siteUrl,
            offers: siteConfig.release.checkoutAvailable && siteConfig.priceAmount
              ? {
                  "@type": "Offer",
                  price: siteConfig.priceAmount,
                  priceCurrency: siteConfig.priceCurrency,
                  url: checkoutUrl,
                }
              : undefined,
          }),
        }}
      />

      <div className="hero-section">
        <div className="hero-copy">
          <SectionIntro
            eyebrow={copy.heroEyebrow}
            title={copy.heroTitle}
            body={copy.heroBody}
            titleAs="h1"
            largeBody
          />
          <div className="button-row">
            <a href={startConversionUrl} className="public-button primary">
              {copy.start}
              <ArrowNorthEastIcon width={16} height={16} />
            </a>
            <a href={appRegisterUrl} className="public-button secondary">
              {copy.createAccount}
            </a>
            {siteConfig.release.checkoutAvailable ? <a href={checkoutUrl} className="public-button tertiary">{copy.buyAccess}</a> : null}
          </div>
        </div>

        <div className="preview-shell">
          <div className="button-row">
            <span className="live-chip">{copy.previewChip}</span>
          </div>
          <img
            className="feature-product-screenshot"
            src="/product/score-preview-output-real.png"
            width={1265}
            height={712}
            alt={isChinese ? "ScoreTransposer 乐谱工程中的真实五线谱输出预览" : "Real rendered score output in the ScoreTransposer project workspace"}
          />
          <p className="helper-copy">{copy.previewBody}</p>
        </div>
      </div>

      <section className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro eyebrow={copy.featuredEyebrow} title={copy.featuredTitle} body={copy.featuredBody} largeBody />
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <div className="stack-md">
            {definitionItems.map((item) => (
              <Panel key={item.label} variant="sunken" className="stack-sm">
                <h2 className="item-title">{item.label}</h2>
                <p className="body-copy">{item.body}</p>
              </Panel>
            ))}
          </div>
        </Panel>
      </section>

      <Panel className="stack-xl" variant="surface">
        <SectionIntro
          eyebrow={copy.methodsEyebrow}
          title={copy.methodsTitle}
          body={copy.methodsBody}
          className="stack-md"
          largeBody
        />
        <div id="methods" className="feature-grid">
          {featureCards.map((card) => (
            <FeatureCard key={card.title} icon={card.icon} title={card.title} body={card.body} tone={card.tone} />
          ))}
        </div>
      </Panel>

      <Panel className="stack-xl" variant="glass">
        <SectionIntro
          eyebrow={isChinese ? "平台功能页" : "Platform feature pages"}
          title={isChinese ? "从单一 PDF 转简谱入口，扩展到完整五线谱项目工作流。" : "From one conversion entry point into a full score-project workflow."}
          body={
            isChinese
              ? "这里只展示当前主路径中可用的扫描、简谱互换、移调、编辑、播放与 MusicXML/MIDI 能力，并把用户带回同一套 Score JSON / MusicXML 工程。"
              : "Only currently available scanner, Jianpu, transposition, editing, playback, and MusicXML/MIDI paths appear here, all returning to the same Score JSON and MusicXML project."
          }
          largeBody
        />
        <div className="feature-grid">
          {visibleFeaturePages.map((page) => (
              <Panel key={page.slug} variant="sunken" className="stack-sm">
                <StatusPill tone={!isFeatureAvailable(page) || page.status === "Preview" ? "amber" : page.status === "Available" ? "cyan" : "green"}>
                  {isFeatureAvailable(page) ? page.status : isChinese ? "待生产验证" : "Pending production verification"}
                </StatusPill>
                <h3 className="item-title">{page.title}</h3>
                <p className="item-meta">{page.description}</p>
                <a href={page.canonical} className="public-button tertiary">
                  {isChinese ? "查看功能" : "View feature"}
                </a>
              </Panel>
            ))}
        </div>
      </Panel>

      <section id="deliverables" className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro
            eyebrow={copy.deliverEyebrow}
            title={copy.deliverTitle}
            body={copy.deliverBody}
            largeBody
          />
          <div className="metric-grid">
            {deliverables.map((item) => (
              <MetricCard key={item.label} label={item.label} value={item.value} body={item.body} />
            ))}
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro eyebrow={copy.fitEyebrow} title={copy.fitTitle} body={copy.fitBody} />
          <Panel variant="sunken" className="stack-md">
            <StatusPill tone="green">{copy.fitGood}</StatusPill>
            {copy.fitGoodPoints.map((point) => (
              <p key={point} className="body-copy">
                {point}
              </p>
            ))}
          </Panel>
          <Panel variant="sunken" className="stack-md">
            <StatusPill tone="amber">{copy.fitWait}</StatusPill>
            {copy.fitWaitPoints.map((point) => (
              <p key={point} className="body-copy">
                {point}
              </p>
            ))}
          </Panel>
        </Panel>
      </section>

      <section id="use-cases" className="preview-grid">
        <Panel variant="glass" className="stack-lg">
          <SectionIntro eyebrow={copy.useCasesEyebrow} title={copy.useCasesTitle} body={copy.useCasesBody} />
          <div className="feature-grid">
            {useCases.map((item, index) => (
              <Panel key={item.title} variant="sunken" className="stack-md">
                <StatusPill tone={index == 1 ? "cyan" : "primary"}>{item.title}</StatusPill>
                <p className="body-copy">{item.body}</p>
              </Panel>
            ))}
          </div>
        </Panel>

        <Panel variant="surface" className="stack-lg">
          <SectionIntro eyebrow={copy.surfaceEyebrow} title={copy.surfaceTitle} />
          <div className="cloud-grid">
            <div className="cloud-chip">
              <UploadIcon width={20} height={20} />
              <span>{isChinese ? "PDF 上传" : "PDF upload"}</span>
            </div>
            <div className="cloud-chip">
              <FileStackIcon width={20} height={20} />
              <span>{isChinese ? "预览文本" : "Preview text"}</span>
            </div>
            <div className="cloud-chip">
              <CheckSealIcon width={20} height={20} />
              <span>{isChinese ? "结果包" : "Result bundle"}</span>
            </div>
          </div>
          <p className="helper-copy">
            {isChinese
              ? "官网与应用共享同一命名体系、交互语气与视觉层级，让用户从搜索进入工具时更连贯。"
              : "Marketing and product now share one naming system, one interaction tone, and one visual hierarchy, so the transition from search traffic into the tool feels more intentional."}
          </p>
        </Panel>
      </section>

      <Panel className="stack-xl" variant="surface">
        <SectionIntro eyebrow={copy.workflowEyebrow} title={copy.workflowTitle} />
        <div id="workflow" className="workflow-grid">
          {workflow.map((item) => (
            <WorkflowStep key={item.step} step={item.step} title={item.title} body={item.body} />
          ))}
        </div>
      </Panel>

      {siteConfig.release.checkoutAvailable ? <section id="pricing" className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro
            eyebrow={copy.pricingEyebrow}
            title={copy.pricingTitle}
            body={copy.pricingBody}
            largeBody
          />
          <div className="metric-grid">
            <MetricCard
              label={isChinese ? "公开站点" : "Public site"}
              value={isChinese ? "可被搜索" : "Open access"}
              body={
                isChinese
                  ? "无需登录即可阅读，便于搜索引擎和访客理解产品定位。"
                  : "Readable without login so visitors and search engines can discover the offer."
              }
            />
            <MetricCard
              label={isChinese ? "开通路径" : "Activation path"}
              value={isChinese ? "支付 / 激活" : "Pay / redeem"}
              body={
                isChinese
                  ? "海外用户可在线支付，中国大陆用户继续使用激活码。"
                  : "International users can pay online while mainland-China users can continue on activation codes."
              }
            />
            <MetricCard
              label={isChinese ? "套餐周期" : "Plan term"}
              value={isChinese ? "按月" : "Monthly"}
              body={
                isChinese
                  ? "Pro 为每月 9.99 美元，Education 为每席位每月 4.99 美元，可在账单中心管理。"
                  : "Pro is $9.99/month and Education is $4.99/seat/month, managed from Billing."
              }
            />
          </div>
          <div className="button-row">
            <a href={appHomeUrl} className="public-button primary">
              {copy.openApp}
            </a>
            <a href={startConversionUrl} className="public-button secondary">
              {copy.start}
            </a>
            <a href={appRegisterUrl} className="public-button tertiary">
              {copy.createAccount}
            </a>
            <a href={checkoutUrl} className="public-button tertiary">
              {copy.buyAccess}
            </a>
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <div className="stack-sm">
            <span className="icon-badge tertiary">
              <VaultIcon width={20} height={20} />
            </span>
            <h2 className="card-title">{copy.commercialTitle}</h2>
          </div>
          <WorkflowStep
            step="A"
            title={copy.commercialA}
            body={
              isChinese
                ? "公开站点无需登录即可阅读，有利于搜索收录、品牌解释和预期管理。"
                : "The public site stays readable without login, which supports search indexing, brand explanation, and expectation setting."
            }
          />
          <WorkflowStep
            step="B"
            title={copy.commercialB}
            body={
              isChinese
                ? "实际工具访问仍来自支付完成或激活码兑换，因此营销站不需要变成业务后台。"
                : "Actual tool access still comes from checkout completion or activation-code redemption, so the marketing site does not need to become a business console."
            }
          />
        </Panel>
      </section> : null}

      <section id="faq" className="preview-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro eyebrow={copy.faqEyebrow} title={copy.faqTitle} />
          <div className="stack-md">
            {faq.map((item) => (
              <Panel key={item.q} variant="sunken" className="stack-sm">
                <h3 className="item-title">{item.q}</h3>
                <p className="body-copy">{item.a}</p>
              </Panel>
            ))}
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro eyebrow={copy.deliveryEyebrow} title={copy.deliveryTitle} />
          <div className="metric-grid">
            <MetricCard
              label={isChinese ? "输入" : "Input"}
              value="PDF"
              body={isChinese ? "当前线上正式输入格式。" : "Current source type in production."}
            />
            <MetricCard
              label={isChinese ? "方向" : "Direction"}
              value={isChinese ? "结构化双向" : "Structured round trip"}
              body={isChinese ? "五线谱、简谱、MusicXML 与 Score JSON 共用同一工程模型。" : "Staff notation, Jianpu, MusicXML, and Score JSON share one project model."}
            />
            <MetricCard
              label={isChinese ? "回退" : "Fallback"}
              value={isChinese ? "草稿包" : "Draft bundle"}
              body={
                isChinese
                  ? "当结果还不足以提升为正式输出时，提供更安全的可下载工作包。"
                  : "A safer downloadable package when confidence is not strong enough for final promotion."
              }
            />
          </div>
        </Panel>
      </section>

      <section className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro eyebrow={copy.seoEyebrow} title={copy.seoTitle} body={copy.seoBody} />
          <div className="stack-md">
            {seoTopics.map((item) => (
              <Panel key={item.title} variant="sunken" className="stack-sm">
                <h3 className="item-title">{item.title}</h3>
                <p className="body-copy">{item.body}</p>
              </Panel>
            ))}
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "关键词覆盖" : "Keyword coverage"}
            title={
              isChinese
                ? "这个首页已经覆盖主要的 staff PDF to Jianpu 搜索簇，同时不显得像堆 SEO。"
                : "The landing page now covers the main staff PDF to Jianpu keyword clusters without turning spammy."
            }
          />
          <div className="metric-grid">
            <MetricCard
              label={isChinese ? "主关键词" : "Primary term"}
              value={isChinese ? "staff pdf to jianpu" : "Staff PDF to Jianpu"}
              body={
                isChinese
                  ? "适合用户已经明确知道目标格式，并直接寻找转换路径的场景。"
                  : "Used when the searcher already understands the destination format and wants a direct workflow."
              }
            />
            <MetricCard
              label={isChinese ? "等价说法" : "Equivalent term"}
              value={isChinese ? "五线谱 PDF 转简谱" : "Five-line staff to Jianpu"}
              body={
                isChinese
                  ? "当用户用更直白或中文方式搜索时，也能落到这条同样的工作流。"
                  : "Useful when users search with simpler or more literal phrasing."
              }
            />
            <MetricCard
              label={isChinese ? "相关意图" : "Related intent"}
              value={isChinese ? "numbered notation converter" : "Numbered notation converter"}
              body={
                isChinese
                  ? "承接把 numbered notation 与 Jianpu 视为同一目标表达的搜索需求。"
                  : "Catches adjacent search intent from users who think in terms of numbered notation rather than Jianpu."
              }
            />
          </div>
        </Panel>
      </section>

      <section id="privacy" className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro eyebrow={copy.privacyEyebrow} title={copy.privacyTitle} body={copy.privacyBody} />
          <div className="stack-sm">
            <p className="body-copy">
              {isChinese
                ? "隐私页已经覆盖账号身份信息、上传文件、生成结果、支持记录以及当前人工删除流程。"
                : "The privacy page now covers account identity data, uploaded files, generated outputs, support records, and the current manual deletion flow."}
            </p>
            <p className="helper-copy">
              {isChinese
                ? "上线前剩下的关键不是再写更多文案，而是保证公开文案与实际支持、存储流程保持一致。"
                : "Before launch, the main remaining task is simply to keep the published copy aligned with the support and storage process you actually run."}
            </p>
            <div className="button-row">
              <a href="/privacy" className="public-button secondary">
                {copy.privacyButton}
              </a>
            </div>
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro eyebrow={copy.termsEyebrow} title={copy.termsTitle} body={copy.termsBody} />
          <div id="terms" className="stack-sm">
            <p className="body-copy">
              {isChinese
                ? "当前条款已经写清服务范围、草稿结果预期、退款边界与上传内容的可接受使用规则。"
                : "The current terms already define service scope, draft-result expectations, refund boundaries, and acceptable use for uploaded material."}
            </p>
            <p className="helper-copy">
              {isChinese
                ? "只要你的支付、激活和支持流程持续按这些规则执行，这组公开页面就足以支撑正式投产。"
                : "As long as your payment, activation, and support operations continue to follow those rules, the website content is already strong enough for a public launch."}
            </p>
            <div className="button-row">
              <a href="/terms" className="public-button secondary">
                {copy.termsButton}
              </a>
            </div>
          </div>
        </Panel>
      </section>
    </section>
  );
}
