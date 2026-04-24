import type { Metadata } from "next";
import Link from "next/link";
import { MetricCard, Panel, SectionIntro, StatusPill, WorkflowStep } from "@score/ui";
import { readSiteLocale } from "../../lib/locale";
import { getAppHomeUrl, getAppRegisterUrl, getCheckoutUrl, getSupportUrl, siteConfig } from "../../lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();

  return {
    title:
      locale === "zh-CN"
        ? `关于五线谱 PDF 转简谱工具、联系与支持 | ${siteConfig.siteName}`
        : `About the Staff PDF to Jianpu Tool, Contact, and Support | ${siteConfig.siteName}`,
    description:
      locale === "zh-CN"
        ? "了解这款五线谱 PDF 转简谱工具当前提供什么、适合谁、如何开通，以及遇到支付、激活码或结果问题时怎样联系支持。"
        : "Learn what this staff PDF to Jianpu tool currently offers, who it fits, how access works, and how to contact support for payment, activation, or result issues.",
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
  const appUrl = getAppHomeUrl();
  const registerUrl = getAppRegisterUrl();
  const checkoutUrl = getCheckoutUrl(locale);

  const currentFit = isChinese
    ? [
        {
          step: "01",
          title: "这套公开范围是刻意收窄的",
          body: "当前公开版本聚焦五线谱 PDF 转简谱，不把尚未成熟的反向转换或站内编辑能力一起打包销售。",
        },
        {
          step: "02",
          title: "官网负责解释并承接转化",
          body: "公开站点负责承接搜索流量、解释购买路径，并在用户真正使用工具前先把预期说清楚。",
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
          title: "The offer stays narrow on purpose",
          body: "The current public release focuses on staff PDF to Jianpu and avoids bundling unfinished reverse-conversion or editing promises into the offer.",
        },
        {
          step: "02",
          title: "The website handles explanation and conversion",
          body: "The public site is there to capture search traffic, explain the purchase path, and set expectations before users touch the tool.",
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
          body: "首页负责承接转化，About 页更适合解释这些关键词背后的真实产品边界：当前版本是受控的五线谱 PDF 转简谱流程，不是假装什么都能做的全能乐谱平台。",
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
          body: "The homepage is where conversion happens, but the About page is where you explain the product boundary behind those keywords. This is a controlled staff PDF to Jianpu workflow, not a vague promise of every music-editing feature.",
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
              ? "关于这款五线谱 PDF 转简谱工具：它是什么、适合谁、怎样开通。"
              : "About ScoreTransposer: a controlled staff PDF to Jianpu workflow, support path, and activation model."
          }
          body={
            isChinese
              ? "ScoreTransposer 当前不是全能乐谱编辑平台，而是一条范围明确的五线谱 PDF 转简谱路径：官网负责解释，支付或激活码负责开通，应用负责上传、任务和结果交付。"
              : "ScoreTransposer is not positioned as a full music-notation editing suite today. It is a controlled product path built around staff PDF to Jianpu: the website explains it, checkout unlocks it, and the app executes it."
          }
          titleAs="h1"
          largeBody
        />
        <div className="button-row">
          <a href={checkoutUrl} className="public-button primary">
            {isChinese ? "查看开通路径" : "View checkout path"}
          </a>
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
            title={isChinese ? "这是不是一个“五线谱 PDF 转简谱”网站？是，但范围是受控的。" : "What this staff PDF to Jianpu website is, and what it is not"}
            body={
              isChinese
                ? "这一页不是为了夸大功能，而是为了让从搜索结果进来的用户先看明白：你现在能买到什么、还不能期待什么，以及整条开通路径怎样运转。"
                : "At this stage, the highest-value work is not more infrastructure. It is helping users understand what they can buy, what they should not expect yet, and how the product path actually works."
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
            <Link href="/operations-checklist" className="public-button tertiary">
              {isChinese ? "运营检查表" : "Operations checklist"}
            </Link>
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "开通路径" : "Commercial path"}
            title={isChinese ? "官网、支付页和激活码路径是如何一起工作的" : "How the public site, checkout, and activation-code path work together"}
          />
          <Panel variant="sunken" className="stack-md">
            <StatusPill tone="cyan">{isChinese ? "国际支付" : "International checkout"}</StatusPill>
            <p className="body-copy">
              {isChinese
                ? "国际访客可以从公开官网进入托管支付页，并在支付成功后获得激活码。"
                : "International visitors can move from the public site into hosted checkout and receive an activation code after successful payment."}
            </p>
          </Panel>
          <Panel variant="sunken" className="stack-md">
            <StatusPill tone="primary">{isChinese ? "中国大陆激活码" : "Mainland-China codes"}</StatusPill>
            <p className="body-copy">
              {isChinese
                ? "中国大陆用户可以继续通过电商或人工分发渠道购买，再到应用内完成兑换。"
                : "Mainland-China customers can continue buying through ecommerce or manual distribution channels, then redeem inside the app."}
            </p>
          </Panel>
          <div className="button-row">
            <a href={registerUrl} className="public-button secondary">
              {isChinese ? "创建账号" : "Create account"}
            </a>
            <a href={checkoutUrl} className="public-button primary">
              {isChinese ? "进入支付" : "Go to checkout"}
            </a>
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
            <a href={checkoutUrl} className="public-button tertiary">
              {isChinese ? "查看开通路径" : "View checkout path"}
            </a>
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
