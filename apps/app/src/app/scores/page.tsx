import { EntitlementGate } from "../../components/EntitlementGate";
import { ScoreLibraryManager } from "../../components/ScoreLibraryManager";
import { readAppLocale } from "../../lib/locale";

export default async function ScoresPage() {
  const locale = await readAppLocale();

  return (
    <section className="container page-shell">
      <div className="page-banner">
        <p className="eyebrow">{locale === "zh-CN" ? "乐谱工作台" : "Score workspace"}</p>
        <h1 className="page-title">
          {locale === "zh-CN" ? "识别、管理并继续处理你的乐谱" : "Scan, manage, and keep working on your scores"}
        </h1>
        <p className="body-copy large">
          {locale === "zh-CN"
            ? "直接上传 PDF 或乐谱图片开始识别，也可以打开已有乐谱继续编辑。上传、候选结果和乐谱库都在同一个工作台。"
            : "Upload a PDF or score image right here, or open a saved score to continue editing. Uploads, candidates, and your library stay in one workspace."}
        </p>
      </div>
      <EntitlementGate allowFreePreview>
        <ScoreLibraryManager />
      </EntitlementGate>
    </section>
  );
}
