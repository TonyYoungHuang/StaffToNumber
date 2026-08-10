import { EntitlementGate } from "../../components/EntitlementGate";
import { ScoreLibraryManager } from "../../components/ScoreLibraryManager";
import { readAppLocale } from "../../lib/locale";

export default async function ScoresPage() {
  const locale = await readAppLocale();

  return (
    <section className="container page-shell">
      <div className="page-banner">
        <p className="eyebrow">{locale === "zh-CN" ? "MusicXML-first" : "MusicXML-first"}</p>
        <h1 className="page-title">
          {locale === "zh-CN" ? "乐谱工程库。" : "Score project library."}
        </h1>
        <p className="body-copy large">
          {locale === "zh-CN"
            ? "以 MusicXML 和内部 Score JSON 为核心，把后续扫描识别、校对、移调、播放、简谱互换和导出都沉淀到同一个乐谱工程里。"
            : "Create MusicXML and Score JSON based projects so scanning, correction, transposition, playback, Jianpu conversion, and export can share one foundation."}
        </p>
      </div>
      <EntitlementGate>
        <ScoreLibraryManager />
      </EntitlementGate>
    </section>
  );
}
