import type { Metadata } from "next";
import Link from "next/link";
import { MetricCard, Panel, SectionIntro, WorkflowStep } from "@score/ui";
import { readSiteLocale } from "../../lib/locale";
import { getLocalizedAbsoluteUrl, getLocalizedAlternates, localizePublicHref } from "../../lib/locale-routing";
import { getCheckoutUrl, getSupportUrl, siteConfig } from "../../lib/site";

type FaqItem = {
  question: string;
  answer: string;
};

type FaqGroup = {
  title: string;
  items: FaqItem[];
};

function buildFaqGroups(isChinese: boolean, checkoutAvailable: boolean): FaqGroup[] {
  if (isChinese) {
    return [
      {
        title: "购买与开通",
        items: [
          {
            question: "我现在可以使用哪些功能？",
            answer:
              "注册用户可以从一份完整多页五线谱 PDF 或一张图片创建终身免费项目，并在该项目内校正、播放、移调、简谱转换、保留版本、分享和导出。升级后可以创建更多乐谱。",
          },
          {
            question: "国际用户和中国大陆用户的购买路径一样吗？",
            answer: checkoutAvailable
              ? "不完全一样。国际用户可以直接走在线支付；中国大陆用户也可以继续通过激活码路径开通，然后进入应用内兑换使用。"
              : "在线支付尚未开放。Paddle 生产交易、退款和权益发放通过验证后，网站才会启用购买入口；一个完整免费项目不受影响。",
          },
          {
            question: "支付后会得到什么？",
            answer: checkoutAvailable
              ? "支付成功后，系统会把订阅直接绑定到已注册账户，不需要再兑换激活码。"
              : "当前不会收款。购买开放后，订单确认和账户权益发放会按已验证流程自动执行。",
          },
        ],
      },
      {
        title: "上传与结果",
        items: [
          {
            question: "现在支持什么输入格式？",
            answer:
              "免费入口支持一份完整多页 PDF 或一张 PNG、JPG、WebP、TIFF 乐谱图片。Starter 与 Converter Pro 还可创建更多工程，并支持当前已开放的 MusicXML/MXL、MIDI、结构化简谱和 Score JSON 导入；音频转谱保持实验状态。",
          },
          {
            question: "为什么识别结果被标记为候选稿？",
            answer:
              "OMR 可能误判音高、时值、声部或小节结构，因此免费结果会显示为需要人工检查的候选稿，并保留置信度和警告，不会伪装成出版级成品。",
          },
          {
            question: "如果上传失败或下载异常怎么办？",
            answer:
              "先保留文件名、任务时间、错误截图，再提交 Support 表单。这样支持侧可以更快定位到具体任务和问题阶段。",
          },
        ],
      },
      {
        title: "支持与账号",
        items: [
          {
            question: "遇到支付或激活码问题时怎么处理？",
            answer:
              "请打开支持表单并选择“支付”或“激活”分类。提交后会生成请求编号，便于后续查询。",
          },
          {
            question: "Support 表单提交后会发生什么？",
            answer:
              "表单会提交到 API，保存为支持工单，并自动向联系邮箱发送确认邮件；如果当前环境没有启用正式邮件服务，系统仍会在 API 日志保留预览。",
          },
          {
            question: "在哪里查看五线谱与简谱转换说明？",
            answer:
              "请打开“五线谱与简谱双向转换器”入口，再根据需要选择五线谱转简谱或简谱转五线谱。两个方向都会保留可编辑的结构化乐谱。",
          },
        ],
      },
    ];
  }

  return [
    {
      title: "Purchase and access",
      items: [
        {
          question: "What is actually live today?",
          answer:
            "A registered user can create one lifetime free project from a complete multi-page staff-score PDF or image, with current correction, playback, transposition, Jianpu, version, sharing, and export tools. Paid plans add more score-processing capacity.",
        },
        {
          question: "Do international and mainland-China users follow the same path?",
          answer: checkoutAvailable
            ? "Not exactly. International customers can pay online directly, while mainland-China customers can also continue through activation-code distribution and redeem inside the app."
            : "Online checkout is not open yet. It will be enabled after Paddle production payments, refunds, and entitlement delivery pass verification; one complete free project remains available.",
        },
        {
          question: "What do I receive after payment?",
          answer: checkoutAvailable
            ? "After a successful payment, the system links the subscription directly to the registered account. No activation-code step is required."
            : "No payment is collected right now. Once checkout opens, order confirmation and account entitlement delivery will run automatically through the verified production flow.",
        },
      ],
    },
    {
      title: "Uploads and results",
      items: [
        {
          question: "What input format is supported right now?",
          answer:
            "The free entry accepts one complete multi-page PDF or one PNG, JPG, WebP, or TIFF score image. Starter and Converter Pro add more projects and currently available MusicXML/MXL, MIDI, structured Jianpu, and Score JSON imports. Audio transcription remains experimental.",
        },
        {
          question: "Why is recognition marked as a candidate?",
          answer:
            "OMR can misread pitch, duration, voices, or measure structure. The free result therefore stays a human-review candidate with confidence and warning details instead of pretending to be publication-ready notation.",
        },
        {
          question: "What should I do if upload or download fails?",
          answer:
            "Keep the file name, job time, and an error screenshot, then submit the support form. That gives support a much faster path to the affected job.",
        },
      ],
    },
    {
      title: "Support and accounts",
      items: [
        {
          question: "How should I handle payment or activation-code issues?",
          answer:
            "Use the on-site support form first. Payment issues route into the payment category, activation issues route into the activation category, and the support team can follow the request by reference code.",
        },
        {
          question: "What happens after I submit the support form?",
          answer:
            "The form posts to the API, creates a stored support request, and automatically sends a confirmation email to the contact inbox. If transactional email is not configured yet, the API still logs a preview for testing.",
        },
        {
          question: "Where can I compare staff and Jianpu conversion paths?",
          answer:
            "Open the numbered notation converter, then choose staff to Jianpu or Jianpu to staff notation. Both paths keep the result in an editable structured score project.",
        },
      ],
    },
  ];
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();
  const title =
    locale === "zh-CN"
      ? `乐谱扫描、简谱互换、移调与导出常见问题 | ${siteConfig.siteName}`
      : `Sheet Music Converter and Editor FAQ | ${siteConfig.siteName}`;
  const description =
    locale === "zh-CN"
      ? "查看乐谱扫描校对、五线谱与简谱互换、移调、编辑、播放、导出、购买和支持流程的常见问题。"
      : "Read common questions about score scanning, Jianpu conversion, transposition, editing, playback, exports, access, and support.";
  const socialImage = "/product/score-preview-output-real.png";

  return {
    title,
    description,
    alternates: getLocalizedAlternates("/faq", locale),
    openGraph: {
      title,
      description,
      url: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/faq", locale),
      siteName: siteConfig.siteName,
      locale: locale === "zh-CN" ? "zh_CN" : "en_US",
      type: "website",
      images: [{ url: socialImage, width: 1265, height: 712, alt: "ScoreTransposer rendered score preview" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export default async function FaqPage() {
  const locale = await readSiteLocale();
  const isChinese = locale === "zh-CN";
  const checkoutUrl = getCheckoutUrl(locale);
  const faqGroups = buildFaqGroups(isChinese, siteConfig.release.checkoutAvailable);

  const verificationSteps = isChinese
    ? [
        {
          step: "01",
          title: "先确认产品边界",
          body: "先确认你需要的是五线谱 PDF 或图片识别、简谱转换与后续乐谱处理。",
        },
        {
          step: "02",
          title: "再确认支付与支持路径",
          body: "在购买前看清 checkout、activation 和 support 的实际流程，避免预期错位。",
        },
        {
          step: "03",
          title: "最后再进入开通",
          body: "适合再买，不适合就先停在 FAQ / About / Support 阶段。",
        },
      ]
    : [
        {
          step: "01",
          title: "Check product scope first",
          body: "Make sure this is the controlled staff-PDF-to-Jianpu workflow you want, not a generic music-editing suite.",
        },
        {
          step: "02",
          title: "Verify checkout and support paths",
          body: "Understand the real checkout, activation, and support flow before paying, so expectations stay aligned.",
        },
        {
          step: "03",
          title: "Then move into access",
          body: "Only continue to checkout when the current scope matches your real use case.",
        },
      ];

  return (
    <section className="public-container public-page stack-xl">
      <Panel variant="surface" className="stack-lg">
        <SectionIntro
          eyebrow={isChinese ? "FAQ / 使用与支持" : "FAQ / Product and support"}
          title={
            isChinese
              ? "乐谱扫描、编辑、转换与账户常见问题"
              : "Questions about scanning, editing, conversion, and access"
          }
          body={
            isChinese
              ? "先确认输入格式、识别边界、可编辑结果、简谱转换、账户权限和支持流程，再决定下一步处理方式。"
              : "Check supported inputs, recognition limits, editable results, Jianpu conversion, account access, and support paths before continuing."
          }
          titleAs="h1"
          largeBody
        />
        <div className="button-row">
          {siteConfig.release.checkoutAvailable ? <a href={checkoutUrl} className="public-button primary">{isChinese ? "查看开通路径" : "View checkout path"}</a> : null}
          <Link href={localizePublicHref(getSupportUrl("general", "faq-top"), locale)} className="public-button secondary">
            {isChinese ? "打开支持页" : "Open support"}
          </Link>
          <a href={localizePublicHref(getSupportUrl("general", "faq-top"), locale)} className="public-button tertiary">
            {isChinese ? "联系支持" : "Contact support"}
          </a>
        </div>
      </Panel>

      <section className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "选择工作流" : "Choose a workflow"}
            title={
              isChinese
                ? "从你现在要完成的任务开始"
                : "Start from the task you need to complete"
            }
            body={
              isChinese
                ? "扫描识谱、双向简谱转换和在线编辑分别有独立说明页，避免把不同输入与输出混在一起。"
                : "Scanning, two-way numbered notation conversion, and online editing each have a focused guide so their inputs and outputs stay clear."
            }
          />
          <div className="metric-grid">
            <MetricCard label={isChinese ? "扫描识谱" : "Scan"} value={isChinese ? "PDF 与图片" : "PDF & images"} body={isChinese ? "生成可人工校正的 MusicXML 候选稿。" : "Create a reviewable MusicXML candidate."} />
            <MetricCard label={isChinese ? "记谱转换" : "Notation"} value={isChinese ? "五线谱 ⇄ 简谱" : "Staff ⇄ Jianpu"} body={isChinese ? "按需要选择一个明确的转换方向。" : "Choose one explicit conversion direction."} />
            <MetricCard label={isChinese ? "继续处理" : "Continue"} value={isChinese ? "编辑与移调" : "Edit & transpose"} body={isChinese ? "确认结果后继续修改、播放和导出。" : "Correct, play, transpose, and export the accepted score."} />
          </div>
          <div className="button-row">
            <Link href={localizePublicHref("/pdf-to-musicxml", locale)} className="public-button primary">{isChinese ? "PDF 转 MusicXML" : "Convert PDF to MusicXML"}</Link>
            <Link href={localizePublicHref("/pdf-score-scanner", locale)} className="public-button secondary">{isChinese ? "查看扫描识谱" : "Open sheet music scanner"}</Link>
            <Link href={localizePublicHref("/guides", locale)} className="public-button tertiary">{isChinese ? "查看 PDF 与 MusicXML 指南" : "Read PDF & MusicXML guides"}</Link>
            <Link href={localizePublicHref("/numbered-notation-converter", locale)} className="public-button tertiary">{isChinese ? "查看简谱转换" : "Open numbered notation converter"}</Link>
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "继续确认" : "Keep verifying"}
            title={
              isChinese
                ? "没有找到答案时，可以继续查看说明或联系支持"
                : "If you did not find the answer, continue to the guides or contact support"
            }
          />
          <div className="workflow-grid">
            {verificationSteps.map((item) => (
              <WorkflowStep key={item.step} step={item.step} title={item.title} body={item.body} />
            ))}
          </div>
        </Panel>
      </section>

      <div className="stack-lg">
        {faqGroups.map((group) => (
          <Panel key={group.title} variant="glass" className="stack-md">
            <h2 className="section-title">{group.title}</h2>
            <div className="stack-md">
              {group.items.map((item) => (
                <Panel key={item.question} variant="sunken" className="stack-sm">
                  <h3 className="item-title">{item.question}</h3>
                  <p className="body-copy">{item.answer}</p>
                </Panel>
              ))}
            </div>
          </Panel>
        ))}
      </div>

      <section className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "下一步" : "Next step"}
            title={
              isChinese
                ? "仍有问题？继续走 Support、About 或 Checkout"
                : "Still unsure? Continue into support, about, or checkout"
            }
          />
          <div className="button-row">
            <Link href={localizePublicHref(getSupportUrl("general", "faq-bottom"), locale)} className="public-button primary">
              {isChinese ? "打开支持" : "Open support"}
            </Link>
            <a href={localizePublicHref(getSupportUrl("general", "faq-bottom"), locale)} className="public-button secondary">
              {isChinese ? "提交支持请求" : "Open support request"}
            </a>
            <Link href={localizePublicHref("/about", locale)} className="public-button tertiary">
              {isChinese ? "查看 About" : "Open about"}
            </Link>
            {siteConfig.release.checkoutAvailable ? <a href={checkoutUrl} className="public-button tertiary">{isChinese ? "查看购买路径" : "Checkout"}</a> : null}
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "相关帮助" : "Related help"}
            title={
              isChinese
                ? "继续查看支持、隐私与服务条款"
                : "Continue to support, privacy, and terms"
            }
            body={
              isChinese
                ? "这些页面提供联系入口、数据处理方式和服务使用边界。"
                : "These pages provide contact options, data-handling information, and service boundaries."
            }
          />
          <div className="button-row">
            <Link href={localizePublicHref("/privacy", locale)} className="public-button secondary">
              {isChinese ? "隐私政策" : "Privacy"}
            </Link>
            <Link href={localizePublicHref("/terms", locale)} className="public-button tertiary">
              {isChinese ? "服务条款" : "Terms"}
            </Link>
            <Link href={localizePublicHref("/support", locale)} className="public-button tertiary">
              {isChinese ? "支持页" : "Support page"}
            </Link>
          </div>
        </Panel>
      </section>
    </section>
  );
}
