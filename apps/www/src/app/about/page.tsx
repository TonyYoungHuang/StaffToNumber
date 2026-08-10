import type { Metadata } from "next";
import Link from "next/link";
import { MetricCard, Panel, SectionIntro, StatusPill, WorkflowStep } from "@score/ui";
import { readSiteLocale } from "../../lib/locale";
import { getAppRegisterUrl, getCheckoutUrl, getSafeAppUrl, getSupportUrl, siteConfig } from "../../lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();

  return {
    title:
      locale === "zh-CN"
        ? `关于在线乐谱工作台、联系与支持 | ${siteConfig.siteName}`
        : `About ${siteConfig.siteName}: Online Sheet Music Workspace`,
    description:
      locale === "zh-CN"
        ? "了解这款 MusicXML 乐谱工作台的扫描校对、简谱互换、移调、编辑、播放、导出和教学能力，以及开通与支持流程。"
        : "Learn about the MusicXML-first workspace for scan review, Jianpu conversion, transposition, editing, playback, export, teaching, access, and support.",
    keywords:
      locale === "zh-CN"
        ? ["五线谱转简谱", "乐谱 PDF 转简谱", "staff pdf to jianpu", "简谱转换器", "numbered notation converter"]
        : ["staff pdf to jianpu", "staff notation to numbered notation", "numbered notation converter", "five-line staff to jianpu", "music score converter"],
    alternates: {
      canonical: "/about",
    },
  };
}

export default async function AboutPage() {
  const locale = await readSiteLocale();
  const isChinese = locale === "zh-CN";
  const appUrl = getSafeAppUrl("about");
  const registerUrl = getAppRegisterUrl();
  const checkoutUrl = getCheckoutUrl(locale);

  const currentFit = isChinese
    ? [
        {
          step: "01",
          title: "从明确入口扩展为乐谱工程",
          body: "平台以五线谱 PDF 转简谱承接主要需求，同时已经提供结构化导入、简谱互换、移调、修谱、播放练习和导出。",
        },
        {
          step: "02",
          title: "官网负责解释并承接转化",
          body: "公开站点负责承接搜索流量、解释真实产品边界，并在用户进入工具前先把预期说清楚。",
        },
        {
          step: "03",
          title: "应用负责真正执行工作",
          body: "注册、激活、上传、任务追踪和结果下载仍在登录后的应用内完成。",
        },
      ]
    : [
        {
          step: "01",
          title: "One clear entry point, one score workspace",
          body: "The platform leads with staff PDF to Jianpu and now also provides structured imports, Jianpu round trips, transposition, correction, practice playback, and exports.",
        },
        {
          step: "02",
          title: "The website handles explanation and conversion",
          body: "The public site captures search traffic, explains verified product boundaries, and sets expectations before users enter the tool.",
        },
        {
          step: "03",
          title: "The app handles actual work",
          body: "Registration, activation, uploads, job tracking, and result downloads still happen inside the authenticated app.",
        },
      ];

  const supportSteps = isChinese
    ? [
        {
          step: "A",
          title: "购买前与支付相关问题",
          body: "如果你想确认开通路径、激活码规则、支付回跳异常或公开范围是否匹配需求，可以先联系支持。",
        },
        {
          step: "B",
          title: "购买后与文件相关问题",
          body: "兑换失败、订单核对、上传异常或人工删除请求，也都可以通过支持入口处理。",
        },
        {
          step: "C",
          title: "联系支持时最好带上什么",
          body: "邮箱、激活码、支付截图、购买时间或文件名，都会让人工复核更快。",
        },
      ]
    : [
        {
          step: "A",
          title: "Before-purchase and payment questions",
          body: "Use support for access-path questions, activation-code clarification, payment-return issues, or scope confirmation before buying.",
        },
        {
          step: "B",
          title: "After-purchase and file questions",
          body: "Use support for redemption issues, order verification, unexpected upload outcomes, or manual deletion requests.",
        },
        {
          step: "C",
          title: "What to include when you contact support",
          body: "Email address, activation code, payment screenshot, purchase time, or file name will make manual review faster.",
        },
      ];

  const seoNarrative = isChinese
    ? [
        {
          title: "为什么会有人搜索“staff pdf to jianpu”",
          body: "因为很多用户手里已经有五线谱 PDF，但教学、排练或内部流转仍更依赖简谱，所以他们会直接搜索 staff pdf to jianpu、五线谱转简谱或乐谱 PDF 转简谱这样的明确工作流。",
        },
        {
          title: "为什么 About 页也要写这些词",
          body: "首页负责承接明确的转换意图，About 页解释它如何进入完整乐谱工程：识别结果先校对，编辑、移调、练习和导出都基于同一份结构化乐谱。",
        },
        {
          title: "这页适合回答什么搜索意图",
          body: "如果搜索者想知道这是不是一个 numbered notation converter、简谱转换器或 staff notation to numbered notation 工具，这一页会把定位、适用人群和支持方式解释清楚。",
        },
      ]
    : [
        {
          title: "Why people search for staff PDF to Jianpu",
          body: "Many users already have staff PDFs but still need numbered notation for teaching, rehearsal, or internal circulation. That is why they search for staff PDF to Jianpu, five-line staff to Jianpu, or music score PDF to numbered notation.",
        },
        {
          title: "Why these phrases belong on the About page too",
          body: "The homepage captures a clear conversion intent, while the About page explains how it enters a complete score project: recognition is reviewed first, and editing, transposition, practice, and export share one structured score.",
        },
        {
          title: "What kind of search intent this page answers",
          body: "If someone is asking whether this is a numbered notation converter, a Jianpu converter, or a staff notation to numbered notation tool, this page gives the contextual answer instead of just another CTA.",
        },
      ];

  return (
    <section className="public-container public-page stack-xl">
      <Panel variant="surface" className="stack-lg">
        <SectionIntro
          eyebrow={isChinese ? "关于 / 联系 / 支持" : "About / Contact / Support"}
          title={
            isChinese
              ? "关于 ScoreTransposer：它是什么、适合谁、怎样开通。"
              : "About ScoreTransposer: a MusicXML-first score workspace, support path, and access model."
          }
          body={
            isChinese
              ? "ScoreTransposer 是以 MusicXML 和 Score JSON 为核心的在线乐谱工程平台：官网解释各项能力，应用负责导入、校对、移调、练习、教学和导出。"
              : "ScoreTransposer is a MusicXML- and Score JSON-first online score workspace. The website explains each workflow, while the app handles import, correction, transposition, practice, teaching, and export."
          }
          titleAs="h1"
          largeBody
        />
        <div className="button-row">
          {siteConfig.release.checkoutAvailable ? <a href={checkoutUrl} className="public-button primary">{isChinese ? "查看开通路径" : "View checkout path"}</a> : null}
          <a href={appUrl} className="public-button secondary">
            {isChinese ? "打开应用" : "Open app"}
          </a>
          <a href={getSupportUrl("general", "about")} className="public-button tertiary">
            {isChinese ? "联系支持" : "Contact support"}
          </a>
        </div>
      </Panel>

      <section className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "产品定位" : "Product position"}
            title={isChinese ? "从五线谱转简谱入口进入完整的结构化乐谱工程。" : "From staff-to-Jianpu entry point to a complete structured score workspace"}
            body={
              isChinese
                ? "这一页让从搜索结果进入的用户先看明白：哪些能力已在应用中可用，哪些依赖外部渲染工具，以及识别候选为什么仍要人工校对。"
                : "This page shows search visitors which workflows are available in the app, which depend on external renderers, and why recognition candidates still require human review."
            }
          />
          <div className="workflow-grid">
            {currentFit.map((item) => (
              <WorkflowStep key={item.step} step={item.step} title={item.title} body={item.body} />
            ))}
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "适用人群" : "Who it fits"}
            title={isChinese ? "哪些搜索“五线谱 PDF 转简谱”的用户最适合当前版本" : "Who searches for a staff PDF to Jianpu tool and fits this release best"}
          />
          <div className="metric-grid">
            <MetricCard
              label={isChinese ? "教学" : "Teaching"}
              value={isChinese ? "讲义整理" : "Handout prep"}
              body={
                isChinese
                  ? "适合希望把现有五线谱 PDF 更快整理成简谱教学材料的老师和培训机构。"
                  : "Good for teachers and studios that need faster Jianpu-first handout preparation from existing staff PDFs."
              }
            />
            <MetricCard
              label={isChinese ? "排练" : "Rehearsal"}
              value={isChinese ? "跨文化协作" : "Cross-cultural use"}
              body={
                isChinese
                  ? "适合需要同时服务五线谱读者和简谱读者的团队。"
                  : "Good for groups that need one score source while serving both staff and Jianpu readers."
              }
            />
            <MetricCard
              label={isChinese ? "制作" : "Production"}
              value={isChinese ? "草稿优先" : "Draft-safe"}
              body={
                isChinese
                  ? "适合接受“自动识别 + 人工复核”流程的编曲、制谱和出版协作方。"
                  : "Good for arrangers and publishers who accept an automation-plus-human-review workflow."
              }
            />
          </div>
        </Panel>
      </section>

      <section className="preview-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "联系与支持" : "Contact and support"}
            title={isChinese ? "这款简谱转换工具的支持方式、联系入口和人工核查路径" : "How support works for this numbered-notation converter and activation flow"}
            body={
              isChinese
                ? "如果你暂时不想搭更复杂的客服系统，这一页至少要把支持入口、问题类型和联系时应提供的信息说明清楚。"
                : "If you do not want to build a heavier support system yet, the next best thing is to make the public support route, question types, and required details explicit."
            }
          />
          <div className="workflow-grid">
            {supportSteps.map((item) => (
              <WorkflowStep key={item.step} step={item.step} title={item.title} body={item.body} />
            ))}
          </div>
          <div className="button-row">
            <a href={getSupportUrl("general", "about")} className="public-button secondary">
              {isChinese ? "提交支持请求" : "Open support request"}
            </a>
            <Link href="/privacy" className="public-button tertiary">
              {isChinese ? "打开隐私政策" : "Open privacy policy"}
            </Link>
            <Link href="/terms" className="public-button tertiary">
              {isChinese ? "打开服务条款" : "Open terms of service"}
            </Link>
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "开通路径" : "Commercial path"}
            title={siteConfig.release.checkoutAvailable ? (isChinese ? "官网、支付页和激活码路径如何协同" : "How the public site, checkout, and activation codes work together") : (isChinese ? "支付入口将在生产交易验证后开放" : "Checkout opens after production transaction verification")}
          />
          <Panel variant="sunken" className="stack-md">
            <StatusPill tone={siteConfig.release.checkoutAvailable ? "cyan" : "amber"}>{siteConfig.release.checkoutAvailable ? (isChinese ? "国际支付" : "International checkout") : (isChinese ? "待验证" : "Pending verification")}</StatusPill>
            <p className="body-copy">
              {siteConfig.release.checkoutAvailable
                ? (isChinese ? "国际访客可以从公开官网进入托管支付页，并在支付成功后获得激活码。" : "International visitors can move from the public site into hosted checkout and receive an activation code after successful payment.")
                : (isChinese ? "当前不会收款；待支付成功、失败、退款和权益发放全部验证后再启用入口。" : "No payment is collected now. The entry point stays disabled until success, failure, refund, and entitlement paths are verified.")}
            </p>
          </Panel>
          <Panel variant="sunken" className="stack-md">
            <StatusPill tone="primary">{isChinese ? "中国大陆激活码" : "Mainland-China codes"}</StatusPill>
            <p className="body-copy">
              {siteConfig.release.checkoutAvailable
                ? (isChinese ? "中国大陆用户可以继续通过已验证渠道购买，再到应用内完成兑换。" : "Mainland-China customers can use a verified distribution channel and redeem inside the app.")
                : (isChinese ? "激活码分发也应在订单核对和权益发放流程验证后再对外承诺。" : "Activation-code distribution should also remain unavailable until order review and entitlement delivery are verified.")}
            </p>
          </Panel>
          <div className="button-row">
            <a href={registerUrl} className="public-button secondary">
              {isChinese ? "创建账号" : "Create account"}
            </a>
            {siteConfig.release.checkoutAvailable ? <a href={checkoutUrl} className="public-button primary">{isChinese ? "进入支付" : "Go to checkout"}</a> : null}
          </div>
        </Panel>
      </section>

      <section className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "SEO 解释段落" : "SEO narrative / About intent"}
            title={
              isChinese
                ? "为什么 About 页也要覆盖 staff pdf to jianpu、五线谱转简谱这类搜索词"
                : "Why this About page targets staff PDF to Jianpu and staff notation to numbered notation searches"
            }
            body={
              isChinese
                ? "首页更偏转化，About 页则更适合承接“解释型搜索意图”：用户想先判断这是不是他们在找的五线谱 PDF 转简谱工具。"
                : "This page helps search engines and human readers understand that the product is a real staff PDF to Jianpu workflow with clear scope, support, and activation logic."
            }
          />
          <div className="stack-md">
            {seoNarrative.map((item) => (
              <Panel key={item.title} variant="sunken" className="stack-sm">
                <h3 className="item-title">{item.title}</h3>
                <p className="body-copy">{item.body}</p>
              </Panel>
            ))}
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "关键词路径" : "Keyword map"}
            title={
              isChinese
                ? "哪些关键词会把同一个搜索者带到这页解释型内容"
                : "Keyword clusters that can lead the same searcher to this About page"
            }
          />
          <div className="metric-grid">
            <MetricCard
              label={isChinese ? "直接搜索" : "Direct search"}
              value="staff pdf to jianpu"
              body={
                isChinese
                  ? "适合已经知道自己需要从五线谱 PDF 直接进入简谱工作流的搜索者。"
                  : "Used by searchers who already know they need a direct route from staff PDF into Jianpu."
              }
            />
            <MetricCard
              label={isChinese ? "中文意图" : "Chinese intent"}
              value={isChinese ? "五线谱转简谱" : "五线谱转简谱"}
              body={
                isChinese
                  ? "用来承接中文用户对同一条“五线谱到简谱”工作流的搜索表达。"
                  : "Captures Chinese-language search intent for the same staff-to-numbered-notation workflow."
              }
            />
            <MetricCard
              label={isChinese ? "邻近术语" : "Adjacent term"}
              value="numbered notation converter"
              body={
                isChinese
                  ? "适合那些更习惯用 numbered notation 而不是 Jianpu 来描述需求的人。"
                  : "Useful for people who think in terms of numbered notation rather than the word Jianpu."
              }
            />
          </div>
        </Panel>
      </section>

      <section className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "信任中心" : "Trust center"}
            title={isChinese ? "About 页可以继续把用户带向隐私、条款和购买说明。" : "The About page can keep the trust path moving into privacy, terms, and checkout."}
            body={
              isChinese
                ? "当用户先看过产品定位和支持方式后，下一步最常见的验证动作，就是查看隐私政策、服务条款和开通路径。"
                : "After users understand the product position and support model, the next verification step is usually privacy, terms, and the access path."
            }
          />
          <div className="button-row">
            <Link href="/privacy" className="public-button secondary">
              {isChinese ? "查看隐私政策" : "Open privacy policy"}
            </Link>
            <Link href="/terms" className="public-button tertiary">
              {isChinese ? "查看服务条款" : "Open terms"}
            </Link>
            {siteConfig.release.checkoutAvailable ? <a href={checkoutUrl} className="public-button tertiary">{isChinese ? "查看开通路径" : "View checkout path"}</a> : null}
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "站内闭环" : "On-site loop"}
            title={isChinese ? "现在这几页已经更像一个完整的信任闭环。" : "These pages now behave more like a full trust loop."}
          />
          <p className="body-copy">
            {isChinese
              ? "首页负责解释产品，About 负责补背景和支持，隐私页解释数据处理，条款页解释服务边界，checkout 负责完成开通。"
              : "The homepage explains the offer, the About page adds support context, privacy explains data handling, terms explains service boundaries, and checkout handles activation."}
          </p>
          <div className="button-row">
            <Link href="/" className="public-button secondary">
              {isChinese ? "返回首页" : "Back to homepage"}
            </Link>
            <a href={appUrl} className="public-button tertiary">
              {isChinese ? "打开应用" : "Open app"}
            </a>
          </div>
        </Panel>
      </section>
    </section>
  );
}
