import Link from "next/link";
import { APP_ROUTES } from "@score/shared";
import { EntitlementGate } from "../../components/EntitlementGate";
import { UploadManager } from "../../components/UploadManager";
import { readAppLocale } from "../../lib/locale";

export default async function UploadPage() {
  const locale = await readAppLocale();

  return (
    <section className="container page-shell">
      <div className="page-banner split">
        <div className="stack-md">
          <p className="eyebrow">{locale === "zh-CN" ? "模块 3" : "Module 3"}</p>
          <h1 className="page-title">{locale === "zh-CN" ? "文件上传与源文件存储。" : "File upload and source storage."}</h1>
          <p className="body-copy large">
            {locale === "zh-CN"
              ? "将五线谱 PDF 上传到工作台，沉淀为可复用素材，并为后续转换任务准备干净输入。"
              : "Upload staff PDFs into the studio, keep them reusable, and prepare clean inputs for the conversion job queue."}
          </p>
        </div>
        <div className="stack-md">
          <div className="page-banner-actions">
            <Link href={APP_ROUTES.jobs} className="button button-primary">
              {locale === "zh-CN" ? "前往任务页" : "Go to jobs"}
            </Link>
            <Link href={APP_ROUTES.dashboard} className="button button-secondary">
              {locale === "zh-CN" ? "打开控制台" : "Open dashboard"}
            </Link>
          </div>
          <p className="micro-copy">
            {locale === "zh-CN"
              ? "当前线上环境仍只接受 PDF，这与 v2 已确认的产品范围保持一致。"
              : "Current live acceptance remains PDF only, matching the app scope you confirmed for v2."}
          </p>
        </div>
      </div>
      <EntitlementGate>
        <UploadManager />
      </EntitlementGate>
    </section>
  );
}
