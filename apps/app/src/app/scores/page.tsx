import { EntitlementGate } from "../../components/EntitlementGate";
import { ScoreLibraryManager } from "../../components/ScoreLibraryManager";
import { readAppLocale } from "../../lib/locale";

export default async function ScoresPage() {
  const locale = await readAppLocale();

  return (
    <section className="container page-shell">
      <div className="page-banner">
        <p className="eyebrow">{locale === "zh-CN" ? "我的乐谱" : "My scores"}</p>
        <h1 className="page-title">
          {locale === "zh-CN" ? "继续处理你的乐谱" : "Continue working on your scores"}
        </h1>
        <p className="body-copy large">
          {locale === "zh-CN"
            ? "打开一份已有乐谱继续修改，或创建一份新乐谱。每一步都会自动保留修改记录。"
            : "Open a saved score to continue editing, or create a new one. Your edit history stays available."}
        </p>
      </div>
      <EntitlementGate allowFreePreview>
        <ScoreLibraryManager />
      </EntitlementGate>
    </section>
  );
}
