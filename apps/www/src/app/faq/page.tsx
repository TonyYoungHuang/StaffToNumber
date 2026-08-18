import type { Metadata } from "next";
import Link from "next/link";
import { MetricCard, Panel, SectionIntro, WorkflowStep } from "@score/ui";
import { readSiteLocale } from "../../lib/locale";
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
            question: "当前真正上线的能力是什么？",
            answer:
              "注册用户可以免费识别一页五线谱 PDF 或一张图片，并查看需要人工检查的候选五线谱与基础诊断。开通后可继续多页识别、校对、简谱互换、移调、播放和完整导出。",
          },
          {
            question: "国际用户和中国大陆用户的购买路径一样吗？",
            answer: checkoutAvailable
              ? "不完全一样。国际用户可以直接走在线支付；中国大陆用户也可以继续通过激活码路径开通，然后进入应用内兑换使用。"
              : "在线支付尚未开放。Paddle 生产交易、退款和权益发放通过验证后，网站才会启用购买入口；免费单页体验不受影响。",
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
              "免费入口支持一页 PDF 或一张 PNG、JPG、WebP、TIFF 乐谱图片。付费工程还支持 MusicXML/MXL、MIDI、结构化简谱和 Score JSON；音频转谱保持实验状态，不进入当前主路径。",
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
        title: "支持与信任",
        items: [
          {
            question: "遇到支付或激活码问题时怎么处理？",
            answer:
              "优先走站内 Support 表单。支付问题会进入 payment 分类，激活问题会进入 activation 分类，支持侧可以看到请求编号并跟踪状态。",
          },
          {
            question: "Support 表单提交后会发生什么？",
            answer:
              "表单会提交到 API，保存为支持工单，并自动向联系邮箱发送确认邮件；如果当前环境没有启用正式邮件服务，系统仍会在 API 日志保留预览。",
          },
          {
            question: "FAQ 页为什么也会写 staff pdf to jianpu / 五线谱转简谱 这类关键词？",
            answer:
              "因为 FAQ 既服务真实用户，也服务搜索落地页场景。用户常常想先确认这个站点是不是他们要找的 staff pdf to jianpu / 五线谱转简谱工具，再决定是否继续购买。",
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
            "A registered user can scan one staff-score PDF page or image for free and review a staff candidate with basic diagnostics. Paid access continues into multi-page OMR, correction, Jianpu conversion, transposition, playback, and full export.",
        },
        {
          question: "Do international and mainland-China users follow the same path?",
          answer: checkoutAvailable
            ? "Not exactly. International customers can pay online directly, while mainland-China customers can also continue through activation-code distribution and redeem inside the app."
            : "Online checkout is not open yet. It will be enabled after Paddle production payments, refunds, and entitlement delivery pass verification; the free one-page experience remains available.",
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
            "The free entry accepts one PDF page or one PNG, JPG, WebP, or TIFF score image. Paid projects also accept MusicXML/MXL, MIDI, structured Jianpu, and Score JSON. Audio transcription remains experimental and is not part of the current primary path.",
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
      title: "Support and trust",
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
          question: "Why does the FAQ page also target searches like staff pdf to jianpu?",
          answer:
            "Because the FAQ page works as both user help and search landing content. Many visitors want to confirm whether this is really the staff-pdf-to-Jianpu tool they need before moving into purchase.",
        },
      ],
    },
  ];
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();

  return {
    title:
      locale === "zh-CN"
        ? `乐谱扫描、简谱互换、移调与导出常见问题 | ${siteConfig.siteName}`
        : `Sheet Music Converter and Editor FAQ | ${siteConfig.siteName}`,
    description:
      locale === "zh-CN"
        ? "查看乐谱扫描校对、五线谱与简谱互换、移调、编辑、播放、导出、购买和支持流程的常见问题。"
        : "Read common questions about score scanning, Jianpu conversion, transposition, editing, playback, exports, access, and support.",
    alternates: {
      canonical: "/faq",
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
          body: "确认当前版本是不是你要找的五线谱 PDF 转简谱工作流，而不是泛化的乐谱编辑平台。",
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
          eyebrow={isChinese ? "FAQ / 支持 / 搜索落地" : "FAQ / Support / Search landing"}
          title={
            isChinese
              ? "五线谱转简谱 FAQ：购买、上传、结果与 Support 表单的常见问题"
              : "FAQ for the staff PDF to Jianpu workflow, checkout path, and support form"
          }
          body={
            isChinese
              ? "这页同时服务真实用户和搜索落地用户：它既回答购买与使用问题，也帮助搜索用户判断这是不是他们在找的 staff pdf to jianpu / 五线谱转简谱工具。"
              : "This page serves both real users and search-land visitors. It answers purchase and workflow questions while helping visitors decide whether this is the staff-PDF-to-Jianpu tool they were looking for."
          }
          titleAs="h1"
          largeBody
        />
        <div className="button-row">
          {siteConfig.release.checkoutAvailable ? <a href={checkoutUrl} className="public-button primary">{isChinese ? "查看开通路径" : "View checkout path"}</a> : null}
          <Link href={getSupportUrl("general", "faq-top")} className="public-button secondary">
            {isChinese ? "打开支持页" : "Open support"}
          </Link>
          <a href={getSupportUrl("general", "faq-top")} className="public-button tertiary">
            {isChinese ? "联系支持" : "Contact support"}
          </a>
        </div>
      </Panel>

      <section className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "搜索解释路径" : "Search explanation path"}
            title={
              isChinese
                ? "FAQ 页也承担搜索落地页职责"
                : "The FAQ page also acts like a search landing page"
            }
            body={
              isChinese
                ? "很多用户会从 staff pdf to jianpu、五线谱转简谱、numbered notation converter 这类词进入站点，然后先看 FAQ 再决定是否购买。"
                : "Many visitors land from searches like staff pdf to jianpu, five-line staff to Jianpu, or numbered notation converter, then read FAQ before deciding whether to buy."
            }
          />
          <div className="metric-grid">
            <MetricCard label={isChinese ? "核心词" : "Primary term"} value="staff pdf to jianpu" body={isChinese ? "直接表达从五线谱 PDF 到简谱的工作流需求。" : "Directly expresses the need for a staff-PDF-to-Jianpu workflow."} />
            <MetricCard label={isChinese ? "中文意图" : "Chinese intent"} value={isChinese ? "五线谱转简谱" : "Wuxianpu to Jianpu"} body={isChinese ? "覆盖中文搜索用户的解释型与购买前判断需求。" : "Captures Chinese-language search intent around explanation and purchase validation."} />
            <MetricCard label={isChinese ? "相邻词" : "Adjacent term"} value="numbered notation converter" body={isChinese ? "覆盖不熟悉 Jianpu 一词、但熟悉 numbered notation 的用户。" : "Captures visitors who think in numbered-notation terms rather than using the word Jianpu."} />
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "继续确认" : "Keep verifying"}
            title={
              isChinese
                ? "FAQ 不是终点，而是把用户带进更完整的信任链路"
                : "The FAQ should move visitors into the wider trust loop"
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
            <Link href={getSupportUrl("general", "faq-bottom")} className="public-button primary">
              {isChinese ? "打开支持" : "Open support"}
            </Link>
            <a href={getSupportUrl("general", "faq-bottom")} className="public-button secondary">
              {isChinese ? "提交支持请求" : "Open support request"}
            </a>
            <Link href="/about" className="public-button tertiary">
              {isChinese ? "查看 About" : "Open about"}
            </Link>
            {siteConfig.release.checkoutAvailable ? <a href={checkoutUrl} className="public-button tertiary">{isChinese ? "查看购买路径" : "Checkout"}</a> : null}
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "站内闭环" : "On-site loop"}
            title={
              isChinese
                ? "FAQ 会把访客带回支持、隐私、条款和购买页"
                : "FAQ should flow users back into support, privacy, terms, and checkout"
            }
            body={
              isChinese
                ? "当 FAQ、About、Support、Privacy、Terms 和 Checkout 互相呼应时，网站更像真正的商用产品面，而不是零散页面集合。"
                : "When FAQ, About, Support, Privacy, Terms, and Checkout reinforce each other, the site feels like a real commercial product surface instead of a collection of isolated pages."
            }
          />
          <div className="button-row">
            <Link href="/privacy" className="public-button secondary">
              {isChinese ? "隐私政策" : "Privacy"}
            </Link>
            <Link href="/terms" className="public-button tertiary">
              {isChinese ? "服务条款" : "Terms"}
            </Link>
            <Link href="/support" className="public-button tertiary">
              {isChinese ? "支持页" : "Support page"}
            </Link>
          </div>
        </Panel>
      </section>
    </section>
  );
}
