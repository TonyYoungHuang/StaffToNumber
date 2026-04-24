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
  PreviewStaffGraphic,
  SectionIntro,
  SparkIcon,
  StatusPill,
  UploadIcon,
  VaultIcon,
  WorkflowStep,
  sonataCopy,
} from "@score/ui";
import { readSiteLocale } from "../lib/locale";
import {
  getAppHomeUrl,
  getAppRegisterUrl,
  getAppStartConversionUrl,
  getCheckoutUrl,
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
  const appHomeUrl = getAppHomeUrl();
  const appRegisterUrl = getAppRegisterUrl();
  const startConversionUrl = getAppStartConversionUrl();
  const checkoutUrl = getCheckoutUrl(locale);

  const featureCards: ReadonlyArray<FeatureCardItem> = isChinese
    ? [
        {
          title: "只承诺已正式上线的范围",
          body: "官网当前只对外描述五线谱 PDF 转简谱，不再提前售卖尚未成熟的反向转换、移调或站内编辑能力。",
          icon: <SparkIcon width={20} height={20} />,
        },
        {
          title: "同一站点承接搜索与开通",
          body: "海外用户可继续进入在线支付，中国大陆用户也能沿用激活码路径，公开站点只负责把这件事讲清楚。",
          icon: <GlobeIcon width={20} height={20} />,
          tone: "tertiary",
        },
        {
          title: "低置信度结果先保留草稿",
          body: "当页面识别质量不足时，结果会停留在更安全的草稿包，而不是被包装成看似完整的最终成品。",
          icon: <CheckSealIcon width={20} height={20} />,
        },
      ]
    : [
        {
          title: "Only market what is already live",
          body: "The site now promises only staff PDF to Jianpu, without pre-selling reverse conversion, transposition, or in-browser editing.",
          icon: <SparkIcon width={20} height={20} />,
        },
        {
          title: "One site for discovery and conversion",
          body: "International visitors can continue into online checkout while mainland-China users can stay on the activation-code path, all from the same public story.",
          icon: <GlobeIcon width={20} height={20} />,
          tone: "tertiary",
        },
        {
          title: "Draft-first when confidence is weak",
          body: "Low-confidence pages stay in a safer draft package instead of being dressed up as a polished final export.",
          icon: <CheckSealIcon width={20} height={20} />,
        },
      ];

  const workflow: ReadonlyArray<WorkflowItem> = isChinese
    ? [
        {
          step: "01",
          title: "选择开通路径",
          body: "海外用户可直接在线支付，中国大陆用户继续使用已购买的激活码开通访问权限。",
        },
        {
          step: "02",
          title: "上传五线谱 PDF",
          body: "当前正式输入格式先收敛到 PDF，这样更容易控制上线质量、排查问题并压住支持成本。",
        },
        {
          step: "03",
          title: "获取正式结果或草稿包",
          body: "识别质量较高的任务可提升为正式输出，低置信度页面则保留预览文本与诊断信息。",
        },
        {
          step: "04",
          title: "下载并人工复核",
          body: "在教学、排练、出版或演出前，仍建议在浏览器外完成最后的乐谱校对与人工确认。",
        },
      ]
    : [
        {
          step: "01",
          title: "Choose the access path",
          body: "International users can pay online, while mainland-China users can keep using purchased activation codes.",
        },
        {
          step: "02",
          title: "Upload a five-line staff PDF",
          body: "The first public release accepts PDF only so the launch surface stays narrower and easier to control.",
        },
        {
          step: "03",
          title: "Receive final output or a draft bundle",
          body: "Higher-confidence jobs can promote to final output, while weaker pages stay draft-first with diagnostics.",
        },
        {
          step: "04",
          title: "Download and review",
          body: "Users still perform the final musical check outside the browser before teaching, rehearsal, publishing, or performance.",
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
          label: "预览层",
          value: "简谱片段",
          body: "先帮助用户确认识别方向是否合理，再决定要不要继续信任整份交付结果。",
        },
        {
          label: "正式输出",
          value: "PDF 导出",
          body: "仅在当前识别链路足够稳定、足以支撑正式结果时，才会提升为最终导出。",
        },
        {
          label: "安全回退",
          value: "草稿包",
          body: "当源 PDF 噪声较高、结构复杂或仅部分可恢复时，仍可保留一个可工作的下载包。",
        },
      ]
    : [
        {
          label: "Preview layer",
          value: "Jianpu snippet",
          body: "Lets users inspect the direction of the recognition before trusting a full deliverable.",
        },
        {
          label: "Final output",
          value: "PDF export",
          body: "Only promoted when the current heuristic chain is strong enough to justify a final result.",
        },
        {
          label: "Safety fallback",
          value: "Draft bundle",
          body: "Keeps the job usable even when the source PDF is noisy, complex, or only partially recoverable.",
        },
      ];

  const faq: ReadonlyArray<QnaItem> = isChinese
    ? [
        {
          q: "现在真正上线了什么？",
          a: "当前正式上线的范围只有五线谱 PDF 转简谱。反向转换、移调和站内手工编辑仍不在本次公开范围内。",
        },
        {
          q: "需要先注册账号吗？",
          a: "官网无需登录即可浏览。海外用户可以从官网直接进入支付，中国大陆用户继续走激活码路径；上传、任务记录和结果下载仍在应用内完成。",
        },
        {
          q: "如果 PDF 不清晰怎么办？",
          a: "系统会优先把结果保留在草稿包中，连同预览文本和诊断信息一起提供，而不是假装结果已经适合直接发布。",
        },
        {
          q: "支持中国大陆用户吗？",
          a: "支持。网站可以保持公开与双语展示，中国大陆销售仍可继续通过激活码和你现有的商业流程来完成。",
        },
        {
          q: "这里可以直接在线做五线谱 PDF 转简谱吗？",
          a: "可以，这正是当前版本的核心公开范围：上传五线谱 PDF，运行转换流程，再获得正式结果或草稿包。",
        },
        {
          q: "它和 numbered notation converter 是同一类需求吗？",
          a: "对当前版本来说基本是同一类搜索意图。无论你搜索 numbered notation converter、staff pdf to jianpu 还是 staff notation to numbered notation，这里描述的都是同一条实际工作流。",
        },
      ]
    : [
        {
          q: "What is actually live right now?",
          a: "Only five-line staff PDF to Jianpu is live in the current release. Reverse conversion, transposition, and in-browser editing are still outside scope.",
        },
        {
          q: "Do users need an account first?",
          a: "The public site is open without login. International checkout can begin from the website, while activation redemption, uploads, and job history still live inside the app.",
        },
        {
          q: "What happens when a PDF is unclear?",
          a: "The pipeline can keep the job in a draft-safe bundle with preview text and diagnostics instead of pretending the result is ready for publication.",
        },
        {
          q: "Does this support mainland-China customers?",
          a: "Yes. The website can stay public and bilingual while mainland-China sales continue through activation codes and your existing commerce workflow.",
        },
        {
          q: "Can I convert a staff PDF to Jianpu online here?",
          a: "Yes, that is the core live scope of this release: upload a five-line staff PDF, run the conversion workflow, and receive either a promoted result or a draft-safe bundle.",
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
          body: "在当前公开版本里，它指的是导入已有五线谱 PDF，并拿到可复核的简谱输出、预览文本或草稿包，而不是承诺完整的站内制谱编辑。",
        },
        {
          title: "为什么多种关键词会落到同一条流程",
          body: "当用户搜索 staff pdf to jianpu、staff notation to numbered notation、numbered notation converter、五线谱转简谱或乐谱 PDF 转简谱时，他们通常寻找的是同一条可执行的工作路径。",
        },
        {
          title: "为什么文案要刻意保持收窄",
          body: "首页既要匹配 Google 和中文搜索意图，也要如实反映当前能力范围。反向转换、移调和站内编辑还不会被提前包装进这些词里。",
        },
      ]
    : [
        {
          title: "What staff PDF to Jianpu means on this site",
          body: "On this release, staff PDF to Jianpu means importing an existing five-line staff PDF and receiving usable numbered-notation output, preview text, or a draft-safe bundle for review.",
        },
        {
          title: "Keyword variants that map to the same workflow",
          body: "Users may search for staff PDF to Jianpu, staff notation to numbered notation, numbered notation converter, music score converter, or five-line staff to Jianpu. On this site, those searches map to the same practical workflow.",
        },
        {
          title: "Why the wording stays narrow",
          body: "The public copy uses these phrases to match real search intent while still staying honest about scope. Reverse conversion, transposition, and in-browser editing are not being folded into those terms yet.",
        },
      ];

  const definitionItems: ReadonlyArray<DefinitionItem> = isChinese
    ? [
        {
          label: "这里的“五线谱 PDF 转简谱”是什么",
          body: "它指把现有五线谱 PDF 导入系统，得到简谱输出、预览文本或草稿包，而不是直接承诺一套完整的站内乐谱编辑器。",
        },
        {
          label: "它服务什么样的搜索意图",
          body: "帮助搜索 staff pdf to jianpu、五线谱转简谱、numbered notation converter 或乐谱 PDF 转简谱的用户快速判断这是不是合适路径。",
        },
        {
          label: "当前公开版本不包含什么",
          body: "反向转换、移调、站内编辑，以及对所有复杂乐谱都一键生成最终成品，仍不在当前公开范围内。",
        },
      ]
    : [
        {
          label: "What a staff PDF to Jianpu converter means here",
          body: "It means importing an existing five-line staff PDF and receiving Jianpu output, preview text, or a draft-safe bundle for review instead of promising full in-browser score editing.",
        },
        {
          label: "What kind of search intent it serves",
          body: "It helps visitors searching for staff PDF to Jianpu, five-line staff to Jianpu, numbered notation converter, or music score PDF to numbered notation quickly decide whether this is the right workflow.",
        },
        {
          label: "What the current release does not include",
          body: "Reverse conversion, transposition, in-browser editing, and universal one-click final output for every complex score are still outside the public scope.",
        },
      ];

  const copy = isChinese
    ? {
        heroEyebrow: "五线谱 PDF 转简谱",
        heroTitle: "把五线谱 PDF 转成简谱：先定义真实工作流，再引导购买与开通。",
        heroBody: `${PRODUCT_NAME} 当前对外聚焦 ${sonataCopy.currentScope}。这个首页先解释这条工作流是什么、适合谁、怎样开通，再把访问者引导进实际转化。`,
        featuredEyebrow: "定义摘要",
        featuredTitle: "什么是“五线谱 PDF 转简谱”工具？这是搜索用户最先该看到的短答案。",
        featuredBody: "如果用户通过 staff pdf to jianpu、五线谱转简谱或 numbered notation converter 进入网站，最核心的解释应该很直接：这条流程是把现有五线谱 PDF 转成可复核的简谱输出，而不是假装自己是一套全功能乐谱编辑平台。",
        start: "开始转换",
        createAccount: "注册账号",
        buyAccess: "购买或开通权限",
        scope: "只展示已上线范围",
        scopeBody: "今天真正能卖的是一条受控的单向转换流程，而不是完整的乐谱编辑套件；官网文案现在也保持在这个边界内。",
        previewChip: "当前转换预览",
        previewLabel: "简谱预览概念",
        previewBody: "源 PDF 足够清晰时可以推进到正式输出；置信度不足的页面会留在草稿包，避免制造错误信心。",
        methodsEyebrow: "内容策略",
        methodsTitle: "面向真实搜索需求的五线谱 PDF 转简谱落地页，而不是空泛承诺。",
        methodsBody: "这个首页现在按搜索落地页方式组织内容：承接 Google 与中文搜索意图，把用户导向支付或激活路径，并在支持成本扩大前先把当前范围讲清楚。",
        deliverEyebrow: "交付结果",
        deliverTitle: "上传五线谱 PDF 后，可能拿到的是预览文本、正式 PDF，或草稿包。",
        deliverBody: "在购买前先说明三种结果层级，可以同时降低售前误解与售后支持压力。",
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
          "反向转换或更复杂的双向工作流。",
          "站内编辑、移调或版面修复。",
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
        heroEyebrow: "Staff PDF to Jianpu landing page",
        heroTitle: "Convert staff PDF to Jianpu with a landing page that defines the workflow before it sells it.",
        heroBody: `${PRODUCT_NAME} is currently presented as a narrow first release: ${sonataCopy.currentScope}. This homepage explains what the workflow means, who it is for, and how access works before it pushes visitors into conversion.`,
        featuredEyebrow: "Definition snippet",
        featuredTitle: "What is a staff PDF to Jianpu converter? This is the short answer a search visitor should see first.",
        featuredBody: "If someone arrives here from queries like staff PDF to Jianpu, five-line staff to Jianpu, or numbered notation converter, the core answer is simple: this workflow takes an existing staff PDF and turns it into reviewable Jianpu output instead of pretending to be a full score-editing suite.",
        start: "Start conversion",
        createAccount: "Create account",
        buyAccess: "Buy or unlock access",
        scope: "Only the live scope is shown",
        scopeBody: "What you can sell today is a controlled one-way conversion workflow, not a full music-notation editing suite. The website now stays inside that boundary.",
        previewChip: "Current conversion preview",
        previewLabel: "Jianpu preview concept",
        previewBody: "Clear PDFs can move toward final output. Lower-confidence pages stay in a draft bundle to reduce false confidence.",
        methodsEyebrow: "Content strategy",
        methodsTitle: "Staff PDF to Jianpu conversion for people who need a real workflow, not a placeholder promise.",
        methodsBody: "This landing page is structured to capture search traffic for staff PDF to Jianpu and numbered-notation intent, route users into checkout or activation, and explain the live scope before support debt builds up.",
        deliverEyebrow: "Deliverables",
        deliverTitle: "What a staff PDF to Jianpu upload can return: preview text, final PDF, or a draft bundle.",
        deliverBody: "That lowers both presale and support overhead because the landing page explains the difference between preview text, promoted final output, and draft-safe fallback bundles before purchase.",
        fitEyebrow: "Launch fit",
        fitTitle: "Good for a controlled release, not yet for every notation scenario.",
        fitBody: "Pre-qualifying expectations on the site is cheaper than explaining the gaps after payment.",
        fitGood: "Good fit right now",
        fitGoodPoints: [
          "Users already have relatively clean five-line staff PDFs.",
          "They accept a final manual review after export.",
          "They want a faster route into teaching, rehearsal, or internal circulation materials.",
        ],
        fitWait: "Not ready to promise yet",
        fitWaitPoints: [
          "Reverse conversion or more complex bi-directional workflows.",
          "In-browser editing, transposition, or layout repair.",
          "Very poor scans or highly complex pages that still expect one-click final output.",
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
            offers: siteConfig.priceAmount
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
            <a href={checkoutUrl} className="public-button tertiary">
              {copy.buyAccess}
            </a>
          </div>
          <Panel variant="sunken" className="stack-md">
            <StatusPill tone="cyan">{copy.scope}</StatusPill>
            <p className="body-copy">{copy.scopeBody}</p>
          </Panel>
        </div>

        <div className="preview-shell">
          <div className="button-row">
            <span className="live-chip">{copy.previewChip}</span>
          </div>
          <PreviewStaffGraphic />
          <Panel variant="sunken" className="stack-md">
            <p className="metric-label">{copy.previewLabel}</p>
            <div className="kianpu-line">
              <span>1</span>
              <span>.</span>
              <span>3</span>
              <span>5</span>
              <span>6</span>
            </div>
            <p className="helper-copy">{copy.previewBody}</p>
          </Panel>
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

      <section id="pricing" className="access-grid">
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
              label={isChinese ? "权限周期" : "Access term"}
              value={isChinese ? "1 年" : "1 year"}
              body={
                isChinese
                  ? "当前支付与激活模型以一年访问权限为主。"
                  : "The current payment and activation flow is positioned around one year of access."
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
      </section>

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
              value={isChinese ? "单向" : "One way"}
              body={isChinese ? "仅支持五线谱 PDF -> 简谱。" : "Staff PDF -> Jianpu only."}
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
