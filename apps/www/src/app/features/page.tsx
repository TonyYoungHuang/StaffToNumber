import type { Metadata } from "next";
import { Panel, SectionIntro, StatusPill } from "@score/ui";
import { readSiteLocale } from "../../lib/locale";
import { getLocalizedAbsoluteUrl, getLocalizedAlternates, localizePublicHref } from "../../lib/locale-routing";
import { getAppScoreProjectsUrl, siteConfig } from "../../lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();
  const isChinese = locale === "zh-CN";
  const title = isChinese ? `在线五线谱软件与乐谱工具 | ${siteConfig.siteName}` : `Sheet Music Software & Online Tools | ${siteConfig.siteName}`;
  const description = isChinese
    ? "集中使用在线五线谱编辑、分谱提取、多人协作、练习反馈、音乐课堂和 PDF、MP3、SVG、PNG 乐谱导出工具。"
    : "Explore online sheet music software for notation editing, part extraction, collaboration, practice feedback, classroom work, and PDF, MP3, SVG, or PNG export.";

  return {
    title,
    description,
    keywords: isChinese
      ? ["在线五线谱软件", "五线谱编辑器", "乐谱工具", "总谱提取声部", "多人协作乐谱", "乐谱转 MP3", "乐谱导出 PDF"]
      : ["online sheet music software", "extract parts from score", "split score into parts", "collaborative music notation software", "music practice app", "export sheet music to PDF", "sheet music to MP3", "music classroom software"],
    alternates: getLocalizedAlternates("/features", locale),
    openGraph: {
      title,
      description,
      url: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/features", locale),
      siteName: siteConfig.siteName,
      locale: isChinese ? "zh_CN" : "en_US",
      alternateLocale: isChinese ? ["en_US"] : ["zh_CN"],
      type: "website",
      images: [{ url: "/product/feature-score-editor-real.png", width: 1425, height: 891, alt: isChinese ? "ScoreTransposer 在线五线谱编辑与功能工作台" : "ScoreTransposer online sheet music editor and feature workspace" }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/product/feature-score-editor-real.png"] },
  };
}

const formalFeatures = [
  { id: "pdf-musicxml", en: "PDF to MusicXML Converter", zh: "PDF 转 MusicXML", href: "/pdf-to-musicxml", bodyEn: "Upload a permitted PDF or score image, review the OMR candidate and diagnostics, correct the structure, and export MusicXML.", bodyZh: "上传有权处理的 PDF 或乐谱图片，检查 OMR 候选稿与诊断，校正结构后导出 MusicXML。" },
  { id: "online-editor", en: "Online Sheet Music Editor", zh: "在线乐谱编辑与校正", href: "/score-editor", bodyEn: "Edit notes, rhythm, lyrics, harmony, dynamics, score structure, and correction candidates.", bodyZh: "编辑音符、节奏、歌词、和弦、力度、乐谱结构和识谱候选稿。" },
  { id: "playback-practice", en: "Playback & Practice Mode", zh: "练习播放模式", href: "/score-to-audio", bodyEn: "Change tempo, loop measures, use a metronome and count-in, and solo or mute parts.", bodyZh: "调节速度、循环小节、使用节拍器与预备拍，并独奏或静音声部。" },
  { id: "smart-transposer", en: "Smart Sheet Music Transposer", zh: "智能乐谱移调", href: "/transpose-score", bodyEn: "Transpose by semitone, interval, target key, or transposing-instrument profile with range review.", bodyZh: "按半音、音程、目标调或移调乐器配置移调，并检查音域。" },
  { id: "staff-jianpu", en: "Staff ↔ Jianpu Converter", zh: "五线谱 / 简谱转换", href: "/numbered-notation-converter", bodyEn: "Move between staff notation and structured numbered notation from the same score model.", bodyZh: "从同一个乐谱结构在五线谱和结构化简谱之间转换。" },
  { id: "version-history", en: "Version History & Restore", zh: "版本历史与恢复", href: "/score-editor", bodyEn: "Keep immutable score revisions and restore an earlier state without deleting later history.", bodyZh: "保存不可变乐谱版本，并在不删除后续记录的情况下恢复早期状态。" },
  { id: "share-collaborate", en: "Share & Collaborate", zh: "分享与协作", href: "/score-editor", bodyEn: "Use a collaborative sheet music editor with revocable view, comment, and edit access plus score annotations.", bodyZh: "使用多人协作乐谱编辑器，创建可撤销的查看、评论和编辑权限，并支持谱面批注。" },
  { id: "musicxml-midi", en: "MusicXML & MIDI Converter", zh: "MusicXML 与 MIDI 转换", href: "/musicxml-midi", bodyEn: "Import, edit, and export portable notation and MIDI files without locking the score to PDF pixels.", bodyZh: "导入、编辑和导出可迁移的乐谱与 MIDI 文件，不把 PDF 像素当作编辑源。" },
] as const;

const betaFeatures = [
  { id: "part-copy", en: "Part Copy Generator Beta", zh: "声部分谱副本 Beta", href: "/score-editor", bodyEn: "Extract parts from a score or split a full score into independent practice projects. Copies do not yet follow later full-score edits.", bodyZh: "从总谱提取所选声部并拆分为独立练习工程；副本暂不会自动跟随总谱后续修改。" },
  { id: "recording-feedback", en: "Browser Recording & Practice Feedback Beta", zh: "浏览器录音与练习反馈 Beta", href: "/score-to-audio", bodyEn: "Use the browser as a music practice app and receive reviewable pitch and timing observations for monophonic recording practice.", bodyZh: "把浏览器作为音乐练习工具录音，并获得需要人工复核的单旋律音高和节奏观察。" },
  { id: "real-time-collaboration", en: "Real-time Collaboration Beta", zh: "多人实时协作 Beta", href: "/score-editor", bodyEn: "Use collaborative music notation software with presence, conflict handling, offline queues, and role-aware access.", bodyZh: "通过协作乐谱软件的在线状态、冲突处理、离线队列和角色权限共同编辑乐谱。" },
  { id: "image-export", en: "High-quality PDF, SVG & PNG Export", zh: "PDF、SVG、PNG 高质量导出", href: "/musicxml-midi", bodyEn: "Export sheet music to PDF or render high-resolution SVG and PNG files from an immutable Score JSON/MusicXML revision.", bodyZh: "从固定的 Score JSON／MusicXML 版本导出带页面设置的 PDF 与高分辨率 SVG、PNG 图片。" },
  { id: "audio-export", en: "WAV & MP3 Audio Export", zh: "WAV、MP3 音频导出", href: "/score-to-audio", bodyEn: "Convert sheet music to MP3 or WAV practice audio through MIDI, a licensed SoundFont, FluidSynth, and ffmpeg.", bodyZh: "通过 MIDI、许可清晰的 SoundFont、FluidSynth 和 ffmpeg，把乐谱转换为 MP3 或 WAV 练习音频。" },
  { id: "school-beta", en: "Classroom / School Beta", zh: "Classroom / School Beta", href: "/teaching", bodyEn: "Use music classroom software to manage classes, assignments, submissions, recordings, rubrics, feedback, and an LTI pilot.", bodyZh: "通过音乐课堂软件管理班级、作业、学生提交、录音、评分量规、反馈和 LTI 试点。" },
] as const;

export default async function FeaturesPage() {
  const locale = await readSiteLocale();
  const isChinese = locale === "zh-CN";
  const workspace = getAppScoreProjectsUrl(locale);
  const copy = isChinese
    ? { eyebrow: "正式功能", title: "从识谱到协作的完整乐谱工作台", body: "首批正式功能使用统一的 Score JSON 与 MusicXML 版本，不会为播放、移调、简谱或导出各建一套互不兼容的数据。", available: "正式开放", beta: "Beta 能力", betaTitle: "按生产门禁逐步开放", betaBody: "Beta 功能已有产品路径，但仍保留准确率、浏览器兼容、外部引擎或生产规模边界。", open: "打开功能", workspace: "进入我的乐谱工作台" }
    : { eyebrow: "Online sheet music software", title: "One score workspace from recognition to collaboration", body: "Edit notation, extract parts, collaborate, practise, teach, and export from versioned Score JSON and MusicXML instead of sending one score through disconnected tools.", available: "Available", beta: "Beta capability", betaTitle: "Released behind production gates", betaBody: "Beta features have working product paths while retaining clear accuracy, browser, external-engine, or production-scale boundaries.", open: "Open feature", workspace: "Open my score workspace" };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: isChinese ? "ScoreTransposer 乐谱功能" : "ScoreTransposer sheet music tools",
    itemListElement: [...formalFeatures, ...betaFeatures].map((feature, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: isChinese ? feature.zh : feature.en,
      description: isChinese ? feature.bodyZh : feature.bodyEn,
      url: getLocalizedAbsoluteUrl(siteConfig.siteUrl, feature.href, locale),
    })),
  };

  return (
    <div className="public-container page-stack">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <section className="page-banner split">
        <SectionIntro eyebrow={copy.eyebrow} title={copy.title} body={copy.body} titleAs="h1" largeBody />
        <Panel variant="glass" className="stack-md"><StatusPill tone="green">{copy.available}</StatusPill><a className="public-button primary" href={workspace}>{copy.workspace}</a></Panel>
      </section>
      <section className="list-grid">
        {formalFeatures.map((feature) => (
          <article className="list-item" id={feature.id} key={feature.id}><div className="list-item-content stack-sm"><StatusPill tone="green">{copy.available}</StatusPill><h2 className="item-title">{isChinese ? feature.zh : feature.en}</h2><p className="body-copy">{isChinese ? feature.bodyZh : feature.bodyEn}</p><a className="public-button secondary" href={localizePublicHref(feature.href, locale)}>{copy.open}</a></div></article>
        ))}
      </section>
      <section className="surface-panel stack-lg"><SectionIntro eyebrow={copy.beta} title={copy.betaTitle} body={copy.betaBody} /><div className="list-grid">{betaFeatures.map((feature) => <article className="list-item" id={feature.id} key={feature.id}><div className="list-item-content stack-sm"><StatusPill tone="amber">Beta</StatusPill><h2 className="item-title">{isChinese ? feature.zh : feature.en}</h2><p className="body-copy">{isChinese ? feature.bodyZh : feature.bodyEn}</p><a className="public-button tertiary" href={localizePublicHref(feature.href, locale)}>{copy.open}</a></div></article>)}</div></section>
    </div>
  );
}
