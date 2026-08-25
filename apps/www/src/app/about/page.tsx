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
          title: "从扫描件创建可编辑乐谱",
          body: "上传五线谱 PDF 或图片，查看识别候选，并在同一个乐谱工程中继续处理。",
        },
        {
          step: "02",
          title: "先了解适用范围",
          body: "识别结果是候选稿，复杂谱面需要人工校对；免费账户可用一份完整 PDF 或乐谱图片创建终身项目。",
        },
        {
          step: "03",
          title: "在应用内完成处理",
          body: "登录后可上传文件、查看任务和候选；获得完整权限后可继续编辑与导出。",
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
          title: "Understand the scope first",
          body: "Recognition produces a candidate that may need correction. Free accounts can create one lifetime project from a complete PDF or score image.",
        },
        {
          step: "03",
          title: "Continue in the app",
          body: "Sign in to upload, track recognition, and view candidates; full access adds editing and exports.",
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

  const useCases = isChinese
    ? [
        {
          title: "已有五线谱 PDF 或图片",
          body: "适合希望把纸质谱或 PDF 识别成结构化乐谱，再继续查看或处理的用户。",
        },
        {
          title: "需要五线谱与简谱协作",
          body: "同一份结构化乐谱可以用于五线谱查看、简谱转换、移调、练习和导出。",
        },
        {
          title: "接受自动识别后人工复核",
          body: "复杂节奏、低清扫描或多声部内容可能需要校对，平台会保留候选和诊断信息。",
        },
      ]
    : [
        {
          title: "You already have a staff PDF or image",
          body: "Use recognition to create a structured candidate that you can inspect and continue working with.",
        },
        {
          title: "You work with both staff and numbered notation",
          body: "One structured score can support staff viewing, Jianpu conversion, transposition, practice, and exports.",
        },
        {
          title: "You can review automatic recognition",
          body: "Complex rhythms, low-quality scans, and multi-part scores may need correction, so candidates and diagnostics remain reviewable.",
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
                ? "你可以先确认文件类型、免费范围和识别边界，再决定是否进入应用。识别候选始终建议人工复核。"
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
            title={isChinese ? "哪些用户适合使用 ScoreTransposer" : "Who ScoreTransposer is for"}
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
                ? "账号、激活、上传、识别和下载遇到问题时，可通过支持表单提交请求。"
                : "Use the support form for account, activation, upload, recognition, and download questions."
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
            eyebrow={isChinese ? "适用场景" : "Use cases"}
            title={
              isChinese
                ? "从现有乐谱进入结构化处理流程"
                : "Move an existing score into a structured workflow"
            }
            body={
              isChinese
                ? "无论你从五线谱 PDF、图片还是简谱开始，都应先确认识别或导入结果，再继续编辑、移调、练习与导出。"
                : "Whether you start from a staff PDF, image, or Jianpu, review the imported result before editing, transposing, practicing, or exporting."
            }
          />
          <div className="stack-md">
            {useCases.map((item) => (
              <Panel key={item.title} variant="sunken" className="stack-sm">
                <h3 className="item-title">{item.title}</h3>
                <p className="body-copy">{item.body}</p>
              </Panel>
            ))}
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "常见起点" : "Common starting points"}
            title={
              isChinese
                ? "根据手头素材选择合适入口"
                : "Choose the right entry point for your source material"
            }
          />
          <div className="metric-grid">
            <MetricCard
              label={isChinese ? "PDF 或图片" : "PDF or image"}
              value={isChinese ? "扫描识谱" : "Score recognition"}
              body={
                isChinese
                  ? "上传清晰、方向正确、边缘完整的一份多页 PDF 或乐谱图片，先查看并校正识别候选。"
                  : "Upload a clear, upright, uncropped score page and review the recognition candidate."
              }
            />
            <MetricCard
              label={isChinese ? "五线谱与简谱" : "Staff and Jianpu"}
              value={isChinese ? "双向转换" : "Conversion"}
              body={
                isChinese
                  ? "校对结构化乐谱后，再进行简谱转换、移调、播放与练习。"
                  : "Review the structured score before converting to Jianpu, transposing, playing, or practicing."
              }
            />
            <MetricCard
              label={isChinese ? "备份或制谱文件" : "Notation file or backup"}
              value={isChinese ? "继续编辑" : "Continue editing"}
              body={
                isChinese
                  ? "已有 MusicXML、MIDI 或乐谱备份时，可在完整权限下直接导入。"
                  : "With full access, import MusicXML, MIDI, or a score backup directly."
              }
            />
          </div>
        </Panel>
      </section>

      <section className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "了解更多" : "Learn more"}
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
            eyebrow={isChinese ? "下一步" : "Next step"}
            title={isChinese ? "先免费创建一个完整乐谱项目，或继续查看帮助说明。" : "Create one complete score project for free or continue to the help pages."}
          />
          <p className="body-copy">
            {isChinese
              ? "你可以返回首页查看功能，也可以打开应用创建一个完整免费乐谱项目；隐私政策和服务条款提供数据与使用边界说明。"
              : "Return home to review features, open the app to create one complete free score project, or read privacy and terms for data and service details."}
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
