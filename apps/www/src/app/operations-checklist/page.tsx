import type { Metadata } from "next";
import Link from "next/link";
import { Panel, SectionIntro, StatusPill, WorkflowStep } from "@score/ui";
import { readSiteLocale } from "../../lib/locale";
import { getCheckoutUrl, getSupportUrl, siteConfig } from "../../lib/site";

type ChecklistGroup = {
  title: string;
  items: Array<{ title: string; body: string }>;
};

function buildChecklistGroups(isChinese: boolean): ChecklistGroup[] {
  if (isChinese) {
    return [
      {
        title: "监控与告警",
        items: [
          { title: "API / worker 健康检查", body: "确认 API、数据库、存储、worker 心跳和支付配置都有基础可视化或探针。" },
          { title: "关键失败事件", body: "为支付回调失败、上传失败、任务失败、邮件发送失败准备告警或至少日志筛查口径。" },
          { title: "上线后第一天观察", body: "发布后主动检查订单、上传、任务队列和支持请求是否按预期流转。" },
        ],
      },
      {
        title: "备份与恢复",
        items: [
          { title: "数据库备份", body: "为 SQLite 或主数据库准备可重复执行的备份动作，并明确保留周期。" },
          { title: "文件存储备份", body: "确认上传文件、结果文件和草稿包是否有外部存储或定期快照策略。" },
          { title: "恢复演练", body: "至少走一遍从备份恢复到可读取状态的演练，避免只有备份、没有恢复。" },
        ],
      },
      {
        title: "支持与人工流程",
        items: [
          { title: "Support 表单入口", body: "确保支付页、FAQ、隐私页、条款页等都能回流到站内 Support 表单。" },
          { title: "工单状态管理", body: "管理员能够查看支持请求、筛选状态，并把 open / in_review / resolved / closed 跟进下去。" },
          { title: "证据清单", body: "支持流程应固定收集邮箱、订单时间、截图、任务号、文件名等信息。" },
        ],
      },
      {
        title: "上线检查",
        items: [
          { title: "支付与成功页", body: "检查 checkout、success、cancel、激活码发放和人工核查路径都能闭环。" },
          { title: "文档与法律页", body: "确认 About、FAQ、Privacy、Terms、Support 的文案和内部链接与当前真实能力一致。" },
          { title: "回滚准备", body: "发布前明确失败时如何回滚页面、禁用支付或暂停对外推广。" },
        ],
      },
    ];
  }

  return [
    {
      title: "Monitoring and alerts",
      items: [
        { title: "API / worker health", body: "Make sure API, database, storage, worker heartbeat, and payment configuration all have at least basic visibility." },
        { title: "Key failure signals", body: "Prepare alerts or at least a log-review path for payment callback failures, upload failures, job failures, and email delivery errors." },
        { title: "Day-one observation", body: "After launch, actively review orders, uploads, queue behavior, and support requests instead of assuming the happy path holds." },
      ],
    },
    {
      title: "Backups and recovery",
      items: [
        { title: "Database backup", body: "Have a repeatable backup action for SQLite or the production database and define a retention policy." },
        { title: "Storage backup", body: "Confirm whether uploaded files, results, and draft bundles have off-machine storage or scheduled snapshots." },
        { title: "Recovery drill", body: "Run at least one restore drill so you know recovery works, not just backup creation." },
      ],
    },
    {
      title: "Support and manual operations",
      items: [
        { title: "Support-form entry points", body: "Make checkout, FAQ, privacy, and terms all flow back into the on-site support form when needed." },
        { title: "Ticket status handling", body: "Operators should be able to view support requests, filter by status, and move them through open, in_review, resolved, and closed states." },
        { title: "Evidence checklist", body: "The support process should consistently collect email, payment time, screenshots, job ids, and file names." },
      ],
    },
    {
      title: "Launch checks",
      items: [
        { title: "Checkout and success path", body: "Verify checkout, success, cancel, activation-code issuance, and manual-review fallback all form one operational loop." },
        { title: "Docs and legal pages", body: "Make sure About, FAQ, Privacy, Terms, and Support all match the product you are actually shipping today." },
        { title: "Rollback readiness", body: "Before launch, decide how you would roll back pages, disable payment, or pause promotion if something breaks." },
      ],
    },
  ];
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();

  return {
    title:
      locale === "zh-CN"
        ? `商用运营基础设施清单 / 上线检查 / 支持流程 | ${siteConfig.siteName}`
        : `Commercial Operations Checklist, Backups, and Launch Readiness | ${siteConfig.siteName}`,
    description:
      locale === "zh-CN"
        ? "查看监控、备份、支持流程和上线检查的运营清单，把公开网站真正变成可运营的商用产品。"
        : "Review the operations checklist for monitoring, backups, support workflow, and launch readiness so the public site behaves like a commercial product.",
    alternates: {
      canonical: "/operations-checklist",
    },
  };
}

export default async function OperationsChecklistPage() {
  const locale = await readSiteLocale();
  const isChinese = locale === "zh-CN";
  const checkoutUrl = getCheckoutUrl(locale);
  const checklistGroups = buildChecklistGroups(isChinese);

  const launchSteps = isChinese
    ? [
        { step: "01", title: "先把支持入口补齐", body: "让官网主要页面都能回流到 Support 表单，而不是只留下一个邮箱地址。" },
        { step: "02", title: "再把运行状态看见", body: "至少知道 API、数据库、worker 和邮件是不是正常。" },
        { step: "03", title: "最后把备份与回滚写下来", body: "这样出问题时不会只剩人工记忆。" },
      ]
    : [
        { step: "01", title: "Complete the support path", body: "Make key public pages flow back into the support form instead of relying on a single mailbox." },
        { step: "02", title: "Make runtime health visible", body: "At minimum, know whether API, database, worker, and email are healthy." },
        { step: "03", title: "Write down backup and rollback actions", body: "That way incident handling does not depend on memory alone." },
      ];

  return (
    <section className="public-container public-page stack-xl">
      <Panel variant="surface" className="stack-lg">
        <SectionIntro
          eyebrow={isChinese ? "运营 / 备份 / 支持 / 上线" : "Operations / Backup / Support / Launch"}
          title={
            isChinese
              ? "商用运营基础设施清单：把公开网站变成能持续运营的产品"
              : "Commercial operations checklist: turn the public site into a product you can actually run"
          }
          body={
            isChinese
              ? "当官网、应用和支付链路都存在后，下一步不是继续堆页面，而是把监控、备份、支持流程和上线检查做成可重复执行的日常动作。"
              : "Once the site, app, and payment flow exist, the next step is not more pages. It is turning monitoring, backups, support handling, and launch checks into repeated operating actions."
          }
          titleAs="h1"
          largeBody
        />
        <div className="button-row">
          <StatusPill tone="cyan">{isChinese ? "适合上线前逐项核对" : "Use before public launch"}</StatusPill>
          <Link href={getSupportUrl("general", "operations-checklist-top")} className="public-button secondary">
            {isChinese ? "支持流程页" : "Support page"}
          </Link>
          <a href={checkoutUrl} className="public-button tertiary">
            {isChinese ? "查看购买路径" : "View checkout path"}
          </a>
        </div>
      </Panel>

      <section className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "落地顺序" : "Practical order"}
            title={isChinese ? "先补支持，再补可视化，最后补恢复能力" : "Complete support first, then visibility, then recovery"}
          />
          <div className="workflow-grid">
            {launchSteps.map((item) => (
              <WorkflowStep key={item.step} step={item.step} title={item.title} body={item.body} />
            ))}
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "为什么重要" : "Why this matters"}
            title={
              isChinese
                ? "商用站点不只要能卖，还要能接住异常"
                : "A commercial site must absorb exceptions, not just handle the happy path"
            }
            body={
              isChinese
                ? "真正的商用风险，往往不在首屏文案，而在支付异常、任务失败、数据恢复和人工支持是否接得住。"
                : "The real commercial risk often lives in payment anomalies, failed jobs, data recovery, and support handling rather than headline copy alone."
            }
          />
          <div className="button-row">
            <Link href="/support" className="public-button secondary">
              {isChinese ? "查看 Support" : "Open support"}
            </Link>
            <Link href="/about" className="public-button tertiary">
              {isChinese ? "查看 About" : "Open about"}
            </Link>
          </div>
        </Panel>
      </section>

      <div className="stack-lg">
        {checklistGroups.map((group) => (
          <Panel key={group.title} variant="glass" className="stack-md">
            <h2 className="section-title">{group.title}</h2>
            <div className="stack-md">
              {group.items.map((item) => (
                <Panel key={item.title} variant="sunken" className="stack-sm">
                  <h3 className="item-title">{item.title}</h3>
                  <p className="body-copy">{item.body}</p>
                </Panel>
              ))}
            </div>
          </Panel>
        ))}
      </div>

      <section className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "站内闭环" : "On-site trust loop"}
            title={
              isChinese
                ? "让清单页也回到 Support、Privacy、Terms 和 Checkout"
                : "Let the checklist page feed back into support, privacy, terms, and checkout"
            }
            body={
              isChinese
                ? "这类运营清单页的价值，不只是给自己看，也是在向用户解释产品如何被运营、如何承担责任。"
                : "The value of an operations page is not just internal. It also explains how the product is operated and how responsibility is handled."
            }
          />
          <div className="button-row">
            <Link href={getSupportUrl("general", "operations-checklist-bottom")} className="public-button secondary">
              {isChinese ? "支持页" : "Support"}
            </Link>
            <Link href="/privacy" className="public-button tertiary">
              {isChinese ? "隐私政策" : "Privacy"}
            </Link>
            <Link href="/terms" className="public-button tertiary">
              {isChinese ? "服务条款" : "Terms"}
            </Link>
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro
            eyebrow={isChinese ? "下一步" : "Next move"}
            title={
              isChinese
                ? "把 checklist 变成重复执行动作"
                : "Turn the checklist into repeated operating actions"
            }
            body={
              isChinese
                ? "如果今天已经补了支持表单、工单后台和基础健康可视化，下一步就是补自动备份、日志告警或值班流程。"
                : "If support forms, admin ticket views, and basic health visibility already exist, the next operational upgrade is automated backup, alerting, or an incident-response routine."
            }
          />
          <div className="button-row">
            <a href={getSupportUrl("general", "operations-checklist-cta")} className="public-button secondary">
              {isChinese ? "提交支持请求" : "Open support request"}
            </a>
            <Link href="/about" className="public-button tertiary">
              About
            </Link>
          </div>
        </Panel>
      </section>
    </section>
  );
}
