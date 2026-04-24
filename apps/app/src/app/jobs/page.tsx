import { EntitlementGate } from "../../components/EntitlementGate";
import { JobsManager } from "../../components/JobsManager";
import { readAppLocale } from "../../lib/locale";

export default async function JobsPage() {
  const locale = await readAppLocale();

  return (
    <section className="container page-shell">
      <div className="page-banner">
        <p className="eyebrow">{locale === "zh-CN" ? "模块 4 + 模块 5" : "Module 4 + Module 5"}</p>
        <h1 className="page-title">{locale === "zh-CN" ? "转换任务与结果查看。" : "Conversion jobs and output review."}</h1>
        <p className="body-copy large">
          {locale === "zh-CN"
            ? "发起“五线谱 PDF -> 简谱”任务，查看状态更新、预览文本，并下载最终 PDF 或草稿包。"
            : "Queue Staff PDF -> Jianpu jobs, watch status updates, inspect preview text, and download the final PDF or draft bundle."}
        </p>
      </div>
      <EntitlementGate>
        <JobsManager />
      </EntitlementGate>
    </section>
  );
}
