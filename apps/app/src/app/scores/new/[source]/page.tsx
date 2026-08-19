import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { APP_ROUTES } from "@score/shared";
import { EntitlementGate } from "../../../../components/EntitlementGate";
import { ScoreLibraryManager, type ScoreImportView } from "../../../../components/ScoreLibraryManager";
import { readAppLocale } from "../../../../lib/locale";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const SUPPORTED_SOURCES = new Set<ScoreImportView>(["scan", "jianpu", "musicxml", "midi", "audio", "backup"]);

export default async function ScoreSourcePage({ params }: { params: Promise<{ source: string }> }) {
  const { source } = await params;
  if (!SUPPORTED_SOURCES.has(source as ScoreImportView)) notFound();
  if (source === "audio" && process.env.NEXT_PUBLIC_AUDIO_TRANSCRIPTION_AVAILABLE !== "true") notFound();

  const view = source as ScoreImportView;
  const locale = await readAppLocale();
  const isChinese = locale === "zh-CN";
  const headings: Record<Exclude<ScoreImportView, "library">, { eyebrow: string; title: string; body: string }> = isChinese
    ? {
        scan: { eyebrow: "创建新乐谱", title: "识别 PDF 或乐谱图片", body: "选择一个文件并开始识别。这个页面只处理扫描识别。" },
        jianpu: { eyebrow: "创建新乐谱", title: "用简谱生成五线谱", body: "输入简谱内容并创建乐谱。这个页面只处理简谱输入。" },
        musicxml: { eyebrow: "创建新乐谱", title: "从制谱软件导入", body: "选择导出的 MusicXML 文件。这个页面只处理文件导入。" },
        midi: { eyebrow: "创建新乐谱", title: "从 MIDI 创建乐谱", body: "选择一个 MIDI 文件。这个页面只处理 MIDI 导入。" },
        audio: { eyebrow: "创建新乐谱", title: "从录音尝试生成乐谱", body: "选择一段旋律录音。生成后请检查音高和节奏。" },
        backup: { eyebrow: "创建新乐谱", title: "恢复乐谱备份", body: "选择以前下载的备份文件。这个页面只处理备份恢复。" },
      }
    : {
        scan: { eyebrow: "Create a new score", title: "Scan a PDF or score image", body: "Choose one file and start recognition. This page is only for scanning." },
        jianpu: { eyebrow: "Create a new score", title: "Create a staff score from numbered notation", body: "Enter your notation and create the score. This page is only for numbered notation." },
        musicxml: { eyebrow: "Create a new score", title: "Import from notation software", body: "Choose a MusicXML export. This page is only for file import." },
        midi: { eyebrow: "Create a new score", title: "Create a score from MIDI", body: "Choose one MIDI file. This page is only for MIDI import." },
        audio: { eyebrow: "Create a new score", title: "Try creating a score from a recording", body: "Choose a melody recording, then review the generated pitches and rhythm." },
        backup: { eyebrow: "Create a new score", title: "Restore a score backup", body: "Choose a previously downloaded backup. This page is only for restoration." },
      };
  const heading = headings[view as Exclude<ScoreImportView, "library">];

  return (
    <section className="container page-shell">
      <div className="page-banner">
        <p className="eyebrow">{heading.eyebrow}</p>
        <h1 className="page-title">{heading.title}</h1>
        <p className="body-copy large">{heading.body}</p>
        <div className="button-row">
          <Link href={`${APP_ROUTES.scores}/new`} className="button button-secondary">
            {isChinese ? "换一种方式" : "Choose another source"}
          </Link>
        </div>
      </div>

      <EntitlementGate allowFreePreview={view === "scan"}>
        <ScoreLibraryManager view={view} />
      </EntitlementGate>
    </section>
  );
}
