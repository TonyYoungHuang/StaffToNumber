import type { Metadata } from "next";
import Link from "next/link";
import { APP_ROUTES } from "@score/shared";
import { EntitlementGate } from "../../../components/EntitlementGate";
import { readAppLocale } from "../../../lib/locale";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function NewScorePage() {
  const locale = await readAppLocale();
  const isChinese = locale === "zh-CN";
  const audioAvailable = process.env.NEXT_PUBLIC_AUDIO_TRANSCRIPTION_AVAILABLE === "true";
  const choices = [
    {
      source: "scan",
      title: isChinese ? "识别 PDF 或乐谱图片" : "Scan a PDF or score image",
      body: isChinese ? "适合纸质谱、扫描件和 PDF。新账户可从一份完整多页 PDF 或一张图片创建终身免费项目。" : "For printed music, scans, and PDFs. New accounts can create one lifetime free project from a complete multi-page PDF or score image.",
      recommended: true,
    },
    {
      source: "jianpu",
      title: isChinese ? "输入简谱" : "Enter numbered notation",
      body: isChinese ? "输入数字音符，生成对应五线谱。" : "Enter numbered notes to create a staff score.",
    },
    {
      source: "musicxml",
      title: isChinese ? "导入制谱软件文件" : "Import from notation software",
      body: isChinese ? "适合 MuseScore、Sibelius、Finale 等导出的 MusicXML 文件。" : "For MusicXML exports from MuseScore, Sibelius, Finale, and similar apps.",
    },
    {
      source: "midi",
      title: isChinese ? "导入 MIDI" : "Import MIDI",
      body: isChinese ? "把 MIDI 中的音符和节奏转换成乐谱。" : "Turn MIDI notes and rhythm into a score.",
    },
    ...(audioAvailable ? [{
      source: "audio",
      title: isChinese ? "上传录音" : "Upload a recording",
      body: isChinese ? "从单旋律录音尝试生成乐谱（试用功能）。" : "Try creating a score from a melody recording (experimental).",
    }] : []),
    {
      source: "backup",
      title: isChinese ? "恢复乐谱备份" : "Restore a score backup",
      body: isChinese ? "打开以前从本网站下载的备份文件。" : "Open a backup previously downloaded from this site.",
    },
  ];

  return (
    <section className="container page-shell">
      <div className="page-banner">
        <p className="eyebrow">{isChinese ? "创建新乐谱" : "Create a new score"}</p>
        <h1 className="page-title">{isChinese ? "你想从哪里开始？" : "What are you starting with?"}</h1>
        <p className="body-copy large">
          {isChinese ? "选择一种方式，下一页只会显示这一项需要的操作。" : "Choose one source. The next page shows only the steps for that choice."}
        </p>
      </div>

      <EntitlementGate allowFreePreview>
        <div className="new-score-grid">
          {choices.map((choice) => (
            <Link key={choice.source} href={`${APP_ROUTES.scores}/new/${choice.source}`} className="source-choice">
              <span className={`status-chip ${choice.recommended ? "tone-primary" : "tone-cyan"}`}>
                {choice.recommended ? (isChinese ? "推荐" : "Recommended") : (isChinese ? "选择" : "Choose")}
              </span>
              <h2 className="card-title">{choice.title}</h2>
              <p className="body-copy">{choice.body}</p>
            </Link>
          ))}
        </div>
      </EntitlementGate>
    </section>
  );
}
