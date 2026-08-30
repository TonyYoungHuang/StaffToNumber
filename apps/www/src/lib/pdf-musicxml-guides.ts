import type { SupportedLocale } from "@score/i18n";

export const PDF_MUSICXML_GUIDE_LOCALES = ["en", "zh-CN"] as const satisfies readonly SupportedLocale[];

export type PdfMusicXmlGuideLocale = (typeof PDF_MUSICXML_GUIDE_LOCALES)[number];

export const pdfMusicXmlGuideSlugs = [
  "convert-pdf-sheet-music-to-musicxml",
  "pdf-vs-musicxml-vs-midi",
  "correct-omr-recognition-errors",
  "best-scan-settings-for-sheet-music-ocr",
  "import-musicxml-into-musescore",
  "pdf-to-musicxml-recognition-benchmark",
] as const;

export type PdfMusicXmlGuideSlug = (typeof pdfMusicXmlGuideSlugs)[number];

type GuideSource = {
  title: string;
  href: string;
  note: string;
};

type GuideSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type PdfMusicXmlGuide = {
  slug: PdfMusicXmlGuideSlug;
  updatedAt: string;
  title: string;
  description: string;
  eyebrow: string;
  intro: string;
  primaryKeyword: string;
  keywords: string[];
  takeaways: Array<[title: string, body: string]>;
  sections: GuideSection[];
  steps: Array<[title: string, body: string]>;
  faqs: Array<[question: string, answer: string]>;
  sources: GuideSource[];
  relatedPaths: string[];
  evidenceDownload?: string;
};

type LocalizedGuide = Record<PdfMusicXmlGuideLocale, Omit<PdfMusicXmlGuide, "slug">>;

const officialSources = {
  musicXml: "https://www.w3.org/2021/06/musicxml40/",
  musicXmlStructure: "https://www.w3.org/2021/06/musicxml40/tutorial/structure-of-musicxml-files/",
  audiveris: "https://audiveris.github.io/audiveris/_pages/handbook/",
  audiverisInput: "https://audiveris.github.io/audiveris/_pages/guides/main/book_parameters/",
  audiverisExport: "https://audiveris.github.io/audiveris/_pages/tutorials/quick/export/",
  museScoreMusicXml: "https://handbook.musescore.org/file-management/working-with-musicxml-files",
  museScoreOpen: "https://handbook.musescore.org/file-management/opening-and-saving-scores",
} as const;

const guides: Record<PdfMusicXmlGuideSlug, LocalizedGuide> = {
  "convert-pdf-sheet-music-to-musicxml": {
    en: {
      updatedAt: "2026-08-29",
      title: "How to Convert PDF Sheet Music to MusicXML",
      description: "Convert printed PDF sheet music into a reviewable MusicXML candidate, correct OMR errors, and verify the file before using it in notation software.",
      eyebrow: "PDF to MusicXML guide",
      intro: "A PDF stores the appearance of a score; MusicXML stores musical structure. Converting between them is optical music recognition (OMR), so the reliable workflow is scan, inspect, correct, and independently reopen—not upload and blindly trust the first file.",
      primaryKeyword: "how to convert PDF sheet music to MusicXML",
      keywords: ["convert PDF sheet music to MusicXML", "PDF to MusicXML", "sheet music OCR", "OMR workflow", "editable sheet music"],
      takeaways: [
        ["Start with one representative page", "A difficult page exposes scan and notation problems before you spend time on the full document."],
        ["Treat recognition as a candidate", "Check measure structure, rhythm, voices, pitch spelling, lyrics, repeats, and layout against the source."],
        ["Verify in another renderer", "Open the downloaded MusicXML in MuseScore or another compatible notation application before relying on it."],
      ],
      sections: [
        {
          title: "Why PDF-to-MusicXML is recognition, not file repackaging",
          paragraphs: [
            "A normal PDF describes where marks appear on a page. It usually does not say that a black oval is a C4 quarter note in voice 1. OMR has to infer staves, measures, symbols, musical relationships, and text before it can write structured notation.",
            "MusicXML is an open exchange format for digital sheet music. It can represent parts, measures, notes, attributes, lyrics, and other notation data, but an OMR system must first recover that meaning from pixels. The source scan therefore determines much of the result quality.",
          ],
        },
        {
          title: "What to inspect before accepting the result",
          paragraphs: ["Review from large structure to small detail. Fixing isolated pitches first can hide a missing measure, wrong voice, or incorrect time signature that affects the whole passage."],
          bullets: [
            "Page, system, staff, and measure count",
            "Clefs, key signatures, time signatures, and transposing instruments",
            "Rhythmic totals, rests, tuplets, ties, beams, and separate voices",
            "Pitch, accidentals, articulations, dynamics, lyrics, repeats, and endings",
            "Warnings or low-confidence regions shown by the recognition workspace",
          ],
        },
        {
          title: "When manual entry is the better choice",
          paragraphs: [
            "Handwriting, severe perspective, page curvature, faded copies, dense orchestral engraving, cross-staff piano notation, and unusual symbols can require more correction than manual entry. Test the hardest page first and compare the estimated cleanup time with rebuilding the passage in an editor.",
            "Keep the original PDF beside the candidate. It is the authority when recognition and musical context disagree.",
          ],
        },
      ],
      steps: [
        ["Prepare the source", "Use a flat, upright, uncropped score page. Around 300 dpi is a practical starting point for printed notation; avoid shadows and compression artifacts."],
        ["Upload a representative page", "Choose a page containing the same voices, lyrics, tuplets, and notation density as the rest of the score."],
        ["Review the OMR candidate", "Compare measures, rhythm, voices, pitch, key, lyrics, and repeats with the source before making downstream edits."],
        ["Correct the score", "Repair structural errors before cosmetic layout. Save a reviewed revision rather than overwriting the source evidence."],
        ["Download and reopen MusicXML", "Open the file in an independent notation application, play it, and recheck difficult measures."],
      ],
      faqs: [
        ["Can a PDF be converted to MusicXML perfectly?", "No universal percentage applies to every score. Printed, clean, simple notation is usually easier than handwriting, damaged scans, dense voices, or unusual engraving."],
        ["Does a text-based PDF make OMR unnecessary?", "Not usually. Embedded text may preserve titles and lyrics, but musical symbols are commonly page graphics rather than structured notes."],
        ["Should I delete the source after export?", "No. Keep the source PDF and recognition evidence so every correction can be traced back to the page."],
      ],
      sources: [
        { title: "MusicXML 4.0", href: officialSources.musicXml, note: "Official format overview and specification from the W3C Music Notation Community Group." },
        { title: "Audiveris Handbook", href: officialSources.audiveris, note: "The upstream OMR handbook explains supported printed notation, limitations, and the need for manual correction." },
        { title: "MuseScore: Working with MusicXML files", href: officialSources.museScoreMusicXml, note: "Official import guidance notes that cleanup is commonly required after transfer." },
      ],
      relatedPaths: ["/pdf-to-musicxml", "/pdf-score-scanner", "/score-editor", "/guides/best-scan-settings-for-sheet-music-ocr", "/guides/correct-omr-recognition-errors"],
    },
    "zh-CN": {
      updatedAt: "2026-08-29",
      title: "如何把 PDF 乐谱转换为 MusicXML",
      description: "把印刷版 PDF 乐谱识别为可检查的 MusicXML 候选稿，校正 OMR 错误，并在制谱软件中重新打开验证。",
      eyebrow: "PDF 转 MusicXML 指南",
      intro: "PDF 保存的是乐谱外观，MusicXML 保存的是音乐结构。两者之间不是简单改扩展名，而是光学乐谱识别（OMR）。可靠流程应当是扫描、检查、校正、再用另一款软件复核。",
      primaryKeyword: "PDF 乐谱转 MusicXML",
      keywords: ["PDF 乐谱转 MusicXML", "PDF 转 MusicXML", "乐谱 OCR", "OMR 识别", "可编辑乐谱"],
      takeaways: [
        ["先测试有代表性的一页", "先用最难的一页发现扫描和排版问题，避免整本处理后才返工。"],
        ["把识别结果当候选稿", "逐项核对小节、节奏、声部、音高、歌词、反复与版面。"],
        ["用另一款软件复核", "下载后在 MuseScore 或其他兼容软件中重新打开并播放检查。"],
      ],
      sections: [
        {
          title: "为什么 PDF 转 MusicXML 属于识别任务",
          paragraphs: [
            "普通 PDF 只描述符号画在页面的什么位置，并不会告诉软件某个黑色符头是第一声部的 C4 四分音符。OMR 必须从像素中推断谱表、小节、符号、音乐关系和文字。",
            "MusicXML 是交换数字乐谱的开放格式，可保存声部、小节、音符、调拍号和歌词等结构；但这些结构必须先从扫描图像中恢复，因此来源质量会直接影响结果。",
          ],
        },
        {
          title: "接受结果前需要检查什么",
          paragraphs: ["应当先看大结构，再看小细节。若先改零散音高，可能会忽略缺小节、声部错误或拍号错误等全局问题。"],
          bullets: ["页数、系统、谱表和小节数量", "谱号、调号、拍号和移调乐器", "节奏总时值、休止、连音、符杠和多声部", "音高、临时记号、力度、歌词、反复与跳房子", "工作区显示的警告与低置信度区域"],
        },
        {
          title: "什么时候手工录入更划算",
          paragraphs: [
            "手写谱、严重透视、弯曲书页、褪色复印件、密集管弦乐、跨谱表钢琴记谱和特殊符号，可能需要大量校正。先测试最难的一页，再比较校正时间与手工重建时间。",
            "始终把原 PDF 保留在候选稿旁边；当识别结果与音乐语境冲突时，原谱才是依据。",
          ],
        },
      ],
      steps: [
        ["整理来源", "使用平整、方向正确且未裁掉谱表边缘的页面。印刷谱可从约 300 dpi 开始，避免阴影与严重压缩。"],
        ["上传代表性页面", "选择包含相同声部、歌词、连音和排版密度的一页进行试识别。"],
        ["检查 OMR 候选稿", "对照来源核对小节、节奏、声部、音高、调号、歌词和反复。"],
        ["校正乐谱", "先修结构错误，再修版面；保存已审核版本，不要覆盖来源证据。"],
        ["下载并重新打开", "在另一款制谱软件中打开 MusicXML，播放并复查困难小节。"],
      ],
      faqs: [
        ["PDF 能不能百分之百转换为 MusicXML？", "不存在适用于所有乐谱的固定准确率。清晰、简单的印刷谱通常比手写、破损扫描、多声部密集谱或特殊排版容易。"],
        ["文字版 PDF 是否不需要 OMR？", "通常仍然需要。嵌入文字可能保留标题和歌词，但乐谱符号往往只是页面图形，不是结构化音符。"],
        ["导出后可以删除原文件吗？", "不建议。保留来源 PDF 和识别证据，才能把每次校正追溯到原谱。"],
      ],
      sources: [
        { title: "MusicXML 4.0", href: officialSources.musicXml, note: "W3C 音乐记谱社区组发布的格式概览与规范。" },
        { title: "Audiveris Handbook", href: officialSources.audiveris, note: "上游 OMR 手册说明了印刷谱支持范围、限制和人工校正必要性。" },
        { title: "MuseScore：MusicXML 文件", href: officialSources.museScoreMusicXml, note: "官方导入说明明确指出格式转换后通常仍需要清理。" },
      ],
      relatedPaths: ["/pdf-to-musicxml", "/pdf-score-scanner", "/score-editor", "/guides/best-scan-settings-for-sheet-music-ocr", "/guides/correct-omr-recognition-errors"],
    },
  },
  "pdf-vs-musicxml-vs-midi": {
    en: {
      updatedAt: "2026-08-29",
      title: "PDF vs MusicXML vs MIDI for Sheet Music",
      description: "Compare PDF, MusicXML, and MIDI for printing, notation editing, playback, transposition, and reliable score exchange.",
      eyebrow: "Sheet music format comparison",
      intro: "PDF, MusicXML, and MIDI solve different problems. PDF preserves the printed page, MusicXML preserves notation structure, and MIDI primarily preserves performance events. Choosing the right source and export format prevents avoidable conversion loss.",
      primaryKeyword: "PDF vs MusicXML vs MIDI",
      keywords: ["PDF vs MusicXML vs MIDI", "sheet music file formats", "MusicXML vs MIDI", "editable sheet music format"],
      takeaways: [
        ["PDF is for appearance", "Use it to distribute or print a page whose layout should remain stable."],
        ["MusicXML is for notation exchange", "Use it when notes, parts, measures, lyrics, and notation semantics must remain editable."],
        ["MIDI is for performance events", "Use it for playback and sequencing, not as a complete substitute for engraved notation."],
      ],
      sections: [
        { title: "What each format is designed to preserve", paragraphs: ["PDF describes a visual page. MusicXML represents a score hierarchy with parts, measures, notes, attributes, and notation information. MIDI describes timed musical events and controller data. The same piece can exist in all three formats, but conversion cannot recreate information the source never contained."], bullets: ["PDF: page geometry, fonts, lines, and graphics", "MusicXML: score structure, notation semantics, and exchange metadata", "MIDI: note-on/off timing, velocity, channels, instruments, and controllers"] },
        { title: "Editing and transposition", paragraphs: ["A MusicXML file is normally the strongest source for notation editing and transposition because it identifies notes and measures directly. MIDI can be quantized into notation, but spelling, voices, tuplets, lyrics, articulations, and layout may be ambiguous. PDF requires OMR or manual entry before structural editing."], bullets: ["Choose MusicXML when moving a score between notation applications.", "Choose MIDI when the performance timeline matters more than engraving.", "Choose PDF when human-readable visual fidelity is the main requirement."] },
        { title: "A practical archive strategy", paragraphs: ["For an important score, keep the reviewed MusicXML as the editable master, a PDF as a stable reading copy, and MIDI or audio as optional playback derivatives. Also retain the original scan and OMR project evidence when the master came from recognition."], },
      ],
      steps: [
        ["Identify the next task", "Decide whether the recipient must print, edit notation, or sequence playback."],
        ["Choose the richest available source", "Prefer existing MusicXML over re-recognizing a PDF; prefer the original MIDI over extracting events from audio."],
        ["Convert once", "Avoid repeated round trips among formats because each step can discard structure or layout."],
        ["Verify the derivative", "Reopen, render, and play the output in the target application."],
      ],
      faqs: [
        ["Is MusicXML the same as MIDI?", "No. MusicXML is designed for digital sheet-music exchange; MIDI focuses on timed performance events."],
        ["Can MIDI preserve lyrics and page layout?", "Some MIDI workflows can carry limited text, but MIDI is not intended to preserve complete notation or engraving."],
        ["Which format should I send to a musician?", "Send PDF for immediate reading and printing; include MusicXML when the musician needs to edit or arrange the score."],
      ],
      sources: [
        { title: "MusicXML 4.0 overview", href: officialSources.musicXml, note: "Defines MusicXML as an open format for exchanging and archiving digital sheet music." },
        { title: "The structure of MusicXML files", href: officialSources.musicXmlStructure, note: "Explains partwise and timewise score hierarchies." },
        { title: "MuseScore file export", href: "https://handbook.musescore.org/en_gb/file-management/file-export", note: "Official descriptions of PDF, MusicXML, MIDI, and other export targets." },
      ],
      relatedPaths: ["/musicxml-midi", "/score-editor", "/transpose-score", "/guides/convert-pdf-sheet-music-to-musicxml", "/guides/import-musicxml-into-musescore"],
    },
    "zh-CN": {
      updatedAt: "2026-08-29",
      title: "PDF、MusicXML 与 MIDI 有什么区别",
      description: "比较 PDF、MusicXML 与 MIDI 在打印、乐谱编辑、播放、移调和跨软件交换中的差异。",
      eyebrow: "乐谱格式对比",
      intro: "PDF、MusicXML 和 MIDI 解决的是不同问题：PDF 保留打印页面，MusicXML 保留记谱结构，MIDI 主要保留演奏事件。选对来源与导出格式，可以减少不必要的信息损失。",
      primaryKeyword: "PDF MusicXML MIDI 区别",
      keywords: ["PDF MusicXML MIDI 区别", "乐谱文件格式", "MusicXML 与 MIDI", "可编辑乐谱格式"],
      takeaways: [["PDF 保存外观", "适合分发和打印版面稳定的页面。"], ["MusicXML 保存记谱结构", "适合让音符、声部、小节、歌词和记谱语义继续编辑。"], ["MIDI 保存演奏事件", "适合播放与编曲序列，不等同于完整制谱文件。"]],
      sections: [
        { title: "三种格式分别保留什么", paragraphs: ["PDF 描述视觉页面；MusicXML 用声部、小节、音符、属性和记谱信息表示乐谱；MIDI 描述带时间的音乐事件与控制数据。同一首曲子可以同时拥有三种文件，但转换无法凭空恢复来源里没有的信息。"], bullets: ["PDF：页面几何、字体、线条与图形", "MusicXML：乐谱结构、记谱语义与交换元数据", "MIDI：音符开关时间、力度、通道、音色和控制器"] },
        { title: "编辑与移调应该选哪一种", paragraphs: ["MusicXML 通常最适合制谱编辑和移调，因为音符与小节已被直接标识。MIDI 可以量化成谱，但音名拼写、声部、连音、歌词、奏法和版面可能不明确；PDF 则要先做 OMR 或手工录入。"], bullets: ["跨制谱软件交换优先选择 MusicXML。", "重视演奏时间线时选择 MIDI。", "重视人类阅读与打印外观时选择 PDF。"] },
        { title: "实用归档方法", paragraphs: ["重要乐谱可把审核后的 MusicXML 作为可编辑母版，把 PDF 作为稳定阅读版，把 MIDI 或音频作为播放衍生物。若母版来自识别，还应保留原扫描件和 OMR 证据。"] },
      ],
      steps: [["先确定下一步用途", "收件人是要打印、编辑记谱，还是制作播放序列。"], ["选择信息最丰富的来源", "已有 MusicXML 就不要重新识别 PDF；已有原始 MIDI 就不要从音频反推。"], ["尽量只转换一次", "格式之间反复往返会不断丢失结构或版面。"], ["验证衍生文件", "在目标软件中重新打开、渲染并播放检查。"]],
      faqs: [["MusicXML 和 MIDI 是一回事吗？", "不是。MusicXML 面向数字乐谱交换，MIDI 侧重带时间的演奏事件。"], ["MIDI 能保留歌词和页面版式吗？", "部分流程可以保存有限文字，但 MIDI 不是为了完整记谱和排版而设计。"], ["给演奏者应该发什么格式？", "直接阅读和打印发 PDF；需要修改或编配时同时提供 MusicXML。"]],
      sources: [
        { title: "MusicXML 4.0 概览", href: officialSources.musicXml, note: "将 MusicXML 定义为交换和归档数字乐谱的开放格式。" },
        { title: "MusicXML 文件结构", href: officialSources.musicXmlStructure, note: "说明按声部与按小节组织的两种结构。" },
        { title: "MuseScore 文件导出", href: "https://handbook.musescore.org/en_gb/file-management/file-export", note: "官方说明 PDF、MusicXML、MIDI 等导出目标。" },
      ],
      relatedPaths: ["/musicxml-midi", "/score-editor", "/transpose-score", "/guides/convert-pdf-sheet-music-to-musicxml", "/guides/import-musicxml-into-musescore"],
    },
  },
  "correct-omr-recognition-errors": {
    en: {
      updatedAt: "2026-08-29",
      title: "How to Correct OMR Recognition Errors",
      description: "Correct optical music recognition errors in the right order: score structure, rhythm, voices, pitch, text, and layout before exporting MusicXML.",
      eyebrow: "OMR correction workflow",
      intro: "OMR cleanup is fastest when you fix structural errors before individual symbols. A missing measure or wrong voice can make dozens of notes appear wrong, while cosmetic spacing can wait until the musical data is stable.",
      primaryKeyword: "correct OMR recognition errors",
      keywords: ["correct OMR recognition errors", "fix MusicXML errors", "optical music recognition cleanup", "sheet music OCR correction"],
      takeaways: [["Structure first", "Confirm pages, systems, staves, measures, clefs, keys, and meters before editing notes."], ["Rhythm before spelling", "Make every voice add up correctly before polishing enharmonic spelling or layout."], ["Keep an audit trail", "Retain the source, candidate, warnings, and accepted revision so corrections remain explainable."]],
      sections: [
        { title: "The correction order that prevents rework", paragraphs: ["Start at page level and work inward. A wrong staff assignment changes the context used to understand pitch and voice; a wrong time signature changes how durations should add up. Once structure and rhythm are correct, pitch, text, and layout become safer to edit."], bullets: ["Page and system boundaries", "Part and staff mapping", "Measure boundaries, clefs, key and time signatures", "Voices, durations, rests, beams, ties, and tuplets", "Pitch, accidentals, lyrics, dynamics, articulations, and repeats", "Spacing, breaks, fonts, and engraving"] },
        { title: "Use musical invariants as error detectors", paragraphs: ["A measure normally has a duration implied by its meter, tied notes must connect compatible pitches, and lyrics need a sensible syllable-to-note sequence. These invariants expose problems that can be hard to spot visually."], bullets: ["Check duration totals separately for each voice.", "Compare accidentals with the key signature and source page.", "Play slowly to reveal missing rests, doubled notes, or shifted ties.", "Reopen MusicXML in a second renderer to reveal invalid or unsupported structures."] },
        { title: "What not to automate away", paragraphs: ["Do not auto-accept low-confidence regions solely because the file opens. OMR completion proves that an artifact was produced, not that its musical meaning matches the page. Dense polyphony, cross-staff notation, handwritten marks, lyrics, ornaments, and repeats deserve explicit human review."] },
      ],
      steps: [["Freeze the source", "Keep an unchanged copy of the original page beside the recognition candidate."], ["Repair score structure", "Correct part, staff, measure, clef, key, and time context."], ["Balance rhythm and voices", "Check duration totals, rests, tuplets, ties, beams, and voice allocation."], ["Correct pitch and notation", "Fix note spelling, accidentals, articulations, dynamics, lyrics, and repeats."], ["Validate the export", "Download MusicXML, reopen it elsewhere, play difficult measures, and record the accepted revision."]],
      faqs: [["Why does the score play incorrectly although it looks close?", "Hidden voice assignment, durations, rests, ties, or tempo data can be wrong even when noteheads appear near the right place."], ["Should layout be corrected first?", "No. Stabilize score structure and musical meaning first because structural edits can reflow the page."], ["Can validation guarantee musical correctness?", "Schema validation can catch malformed data, but only comparison with the source and musical review can establish correctness."]],
      sources: [
        { title: "Audiveris user editing", href: "https://audiveris.github.io/audiveris/_pages/guides/ui/README/", note: "Upstream guidance explains why manual correction remains part of practical OMR." },
        { title: "Audiveris export", href: officialSources.audiverisExport, note: "Explains the difference between editable OMR project evidence and lossy MusicXML export." },
        { title: "MuseScore MusicXML cleanup", href: officialSources.museScoreMusicXml, note: "Official guidance says imported MusicXML commonly needs cleanup." },
      ],
      relatedPaths: ["/score-editor", "/pdf-to-musicxml", "/guides/convert-pdf-sheet-music-to-musicxml", "/guides/import-musicxml-into-musescore", "/guides/pdf-to-musicxml-recognition-benchmark"],
    },
    "zh-CN": {
      updatedAt: "2026-08-29",
      title: "如何校正 OMR 乐谱识别错误",
      description: "按结构、节奏、声部、音高、文字和版面的顺序校正光学乐谱识别错误，再导出 MusicXML。",
      eyebrow: "OMR 校正流程",
      intro: "先修结构、后修单个符号，OMR 校正速度会更快。一个缺失小节或错误声部可能让几十个音符看起来都错；间距和字体则可以等音乐数据稳定后再处理。",
      primaryKeyword: "校正 OMR 乐谱识别错误",
      keywords: ["校正 OMR 乐谱识别错误", "修复 MusicXML", "乐谱 OCR 校正", "光学乐谱识别"],
      takeaways: [["结构优先", "先确认页、系统、谱表、小节、谱号、调号与拍号。"], ["先节奏后音名", "先让每个声部时值正确，再处理等音拼写与版面。"], ["保留审核轨迹", "保留来源、候选稿、警告与接受版本，让校正可解释。"]],
      sections: [
        { title: "避免返工的校正顺序", paragraphs: ["从页面层级逐步向内检查。错误谱表会改变音高与声部语境，错误拍号会改变时值总和。结构和节奏稳定后，再改音高、文字和版面更安全。"], bullets: ["页面与系统边界", "声部与谱表对应", "小节线、谱号、调号、拍号", "声部、时值、休止、符杠、连音与连音组", "音高、临时记号、歌词、力度、奏法与反复", "间距、换行、字体与制谱版式"] },
        { title: "用音乐规则发现隐藏错误", paragraphs: ["小节通常要满足拍号规定的时值，相连音符要有合理音高，歌词音节与音符也应顺畅对应。这些规则能发现肉眼不容易察觉的问题。"], bullets: ["分别统计每个声部的时值。", "把临时记号与调号、来源页面一起核对。", "慢速播放，寻找漏休止、重音符或连音错位。", "在第二款渲染器中打开 MusicXML，发现不兼容结构。"] },
        { title: "哪些判断不能交给自动通过", paragraphs: ["不要因为文件能打开就自动接受低置信度区域。任务完成只证明生成了产物，不证明音乐含义与页面一致。密集复调、跨谱表、手写标注、歌词、装饰音和反复必须人工查看。"] },
      ],
      steps: [["冻结来源", "在候选稿旁保留一份不修改的原始页面。"], ["修复乐谱结构", "校正声部、谱表、小节、谱号、调号和拍号。"], ["平衡节奏与声部", "核对时值、休止、连音组、延音、符杠和声部分配。"], ["校正音高与记号", "修复音名、临时记号、奏法、力度、歌词和反复。"], ["验证导出", "下载 MusicXML，在其他软件中打开、播放困难小节并记录接受版本。"]],
      faqs: [["为什么谱面看起来接近，播放却不对？", "声部、时值、休止、连音或速度数据可能隐藏着错误。"], ["应该先调版面吗？", "不应该。先稳定结构和音乐含义，因为结构修改还会让页面重新排版。"], ["通过格式验证就代表音乐正确吗？", "格式验证只能发现数据结构问题；音乐是否正确仍要对照来源并由人审核。"]],
      sources: [
        { title: "Audiveris 人工编辑", href: "https://audiveris.github.io/audiveris/_pages/guides/ui/README/", note: "上游文档解释了为何实际 OMR 必须包含人工校正。" },
        { title: "Audiveris 导出", href: officialSources.audiverisExport, note: "说明可编辑 OMR 工程证据与有损 MusicXML 导出的区别。" },
        { title: "MuseScore MusicXML 清理", href: officialSources.museScoreMusicXml, note: "官方说明导入 MusicXML 后通常仍需要清理。" },
      ],
      relatedPaths: ["/score-editor", "/pdf-to-musicxml", "/guides/convert-pdf-sheet-music-to-musicxml", "/guides/import-musicxml-into-musescore", "/guides/pdf-to-musicxml-recognition-benchmark"],
    },
  },
  "best-scan-settings-for-sheet-music-ocr": {
    en: {
      updatedAt: "2026-08-29",
      title: "Best Scan Settings for Sheet Music OCR",
      description: "Prepare printed sheet music for OMR with practical resolution, alignment, contrast, cropping, page-order, and photography checks.",
      eyebrow: "OMR input preparation",
      intro: "OMR cannot recover symbols that the image has erased. A clean, flat, upright source usually improves recognition more than repeatedly changing export settings after the fact.",
      primaryKeyword: "best scan settings for sheet music OCR",
      keywords: ["best scan settings for sheet music OCR", "sheet music scanning 300 dpi", "OMR scan quality", "scan music to MusicXML"],
      takeaways: [["Use a lossless or high-quality source", "Prefer scanner output or a sharp original over screenshots and repeatedly compressed images."], ["Start around 300 dpi", "This is a practical baseline for printed notation; extremely low resolution removes staff and symbol detail."], ["Geometry matters", "Keep staves horizontal, pages flat, margins intact, and lighting even."]],
      sections: [
        { title: "Resolution, color, and compression", paragraphs: ["For ordinary printed scores, around 300 dpi is a useful starting point rather than a guaranteed optimum. Higher resolution may help small print, but it also increases file size and processing cost. Preserve grayscale information when pages are faded or uneven; let the OMR pipeline choose binarization instead of crushing detail too early."], bullets: ["Avoid screenshots of browser-rendered pages when the original PDF is available.", "Prefer PNG or TIFF for intermediate images; use high-quality JPEG only when necessary.", "Do not sharpen so aggressively that staff lines and noteheads merge.", "Check the actual pixels, not just the DPI metadata field."] },
        { title: "Deskew, crop, and page geometry", paragraphs: ["Staff lines are strong geometric anchors. Rotation, perspective, curvature, and shadows make it harder to separate staff lines from beams and text. Keep every full staff visible and avoid cropping clefs, key signatures, barlines, or ledger lines."], bullets: ["Rotate the page until staves are horizontal.", "Photograph straight-on with even light and no fingers or binding shadow.", "Keep page order and orientation consistent in multi-page PDFs.", "Split pages with very different sizes or scan conditions before testing."] },
        { title: "Run a representative-page test", paragraphs: ["The cleanest cover page is not a useful qualification sample. Test a page containing the densest voices, smallest staff, lyrics, tuplets, or cross-staff notation you expect. If that page needs heavy correction, plan the project around human review or manual entry."], },
      ],
      steps: [["Inspect the physical page", "Flatten folds, remove shadows, and confirm you have the right to digitize the score."], ["Scan at a practical baseline", "Start near 300 dpi in grayscale or color when tonal detail matters."], ["Deskew and crop safely", "Straighten staves while keeping all musical context and margins needed for recognition."], ["Check at 100% zoom", "Look for broken staff lines, blocked noteheads, compression blocks, blur, and missing edges."], ["Test the hardest page", "Compare its candidate with the source before processing the rest of the document."]],
      faqs: [["Is 600 dpi always better than 300 dpi?", "No. It can help very small print, but also increases processing cost and cannot repair blur, shadows, or perspective."], ["Should I convert the page to black and white first?", "Only if the result preserves fine symbols. Grayscale may retain useful information for adaptive binarization."], ["Can I use a phone photo?", "Yes for a careful straight-on photo, but a flat scan is usually easier to recognize because it avoids perspective, curvature, and uneven light."]],
      sources: [
        { title: "Audiveris book parameters", href: officialSources.audiverisInput, note: "The official handbook exposes synthetic, standard, and poor input-quality modes plus configurable binarization." },
        { title: "Audiveris input formats", href: "https://audiveris.github.io/audiveris/_pages/tutorials/quick/load/", note: "Lists supported image and PDF inputs." },
        { title: "Library of Congress copies and formats matrix", href: "https://www.loc.gov/duplicationservices/formats/Copies-and-Formats-Matrix-01-13-2012.pdf", note: "A public institutional reference noting 300 dpi as a common sheet-music scan resolution; it is a baseline, not an OMR guarantee." },
      ],
      relatedPaths: ["/pdf-score-scanner", "/pdf-to-musicxml", "/guides/convert-pdf-sheet-music-to-musicxml", "/guides/correct-omr-recognition-errors", "/guides/pdf-to-musicxml-recognition-benchmark"],
    },
    "zh-CN": {
      updatedAt: "2026-08-29",
      title: "乐谱 OCR 的最佳扫描设置",
      description: "用实用的分辨率、方向、对比度、裁切、页序和拍摄检查，为 OMR 乐谱识别准备印刷谱。",
      eyebrow: "OMR 来源准备",
      intro: "图像已经丢失的符号，OMR 无法凭空恢复。清晰、平整、方向正确的来源，通常比识别完成后不断换导出参数更有效。",
      primaryKeyword: "乐谱 OCR 扫描设置",
      keywords: ["乐谱 OCR 扫描设置", "乐谱扫描 300 dpi", "OMR 扫描质量", "扫描乐谱转 MusicXML"],
      takeaways: [["使用无损或高质量来源", "优先扫描原件或清晰原图，避免截图和多次压缩。"], ["从约 300 dpi 开始", "这是印刷谱的实用起点；分辨率过低会丢失谱线与符号细节。"], ["几何比参数更重要", "保持谱线水平、书页平整、边缘完整、光线均匀。"]],
      sections: [
        { title: "分辨率、颜色与压缩", paragraphs: ["普通印刷谱可从约 300 dpi 开始，但这不是保证准确的万能值。小字号可能受益于更高分辨率，同时也会增加文件和处理成本。褪色或光线不均时保留灰度，让 OMR 决定二值化方式，不要过早压掉细节。"], bullets: ["有原 PDF 时不要改用浏览器截图。", "中间图像优先 PNG 或 TIFF；必要时才用高质量 JPEG。", "不要过度锐化到谱线和符头粘连。", "检查真实像素，不要只看 DPI 元数据。"] },
        { title: "校正倾斜、裁切和页面几何", paragraphs: ["五线谱线是重要几何参照。旋转、透视、页面弯曲和阴影会让谱线、符杠和文字更难分离。应保留完整谱表，避免裁掉谱号、调号、小节线或加线。"], bullets: ["旋转页面直到谱线水平。", "从正上方拍摄，光线均匀，不要出现手指或装订阴影。", "多页 PDF 的页序和方向保持一致。", "页面尺寸或扫描条件差异很大时先拆分测试。"] },
        { title: "测试有代表性的一页", paragraphs: ["最干净的封面页并不是有效样本。应选择声部最密、谱表最小、含歌词、连音或跨谱表的一页。如果它需要大量校正，就应把人工审核或手工录入纳入项目计划。"] },
      ],
      steps: [["检查纸面", "压平折痕、去除阴影，并确认你有权数字化该乐谱。"], ["用实用基线扫描", "可从约 300 dpi 开始；需要保留色调细节时使用灰度或彩色。"], ["安全校正与裁切", "拉直谱线，同时保留识别需要的音乐上下文和边缘。"], ["按 100% 比例检查", "寻找断谱线、粘连符头、压缩块、模糊和缺边。"], ["测试最难的一页", "先对照候选稿与来源，再处理剩余文档。"]],
      faqs: [["600 dpi 一定比 300 dpi 好吗？", "不一定。它可能帮助很小的印刷，但也增加处理成本，而且无法修复模糊、阴影与透视。"], ["需要先转成纯黑白吗？", "只有细符号没有丢失时才适合。灰度有时更利于自适应二值化。"], ["可以用手机拍照吗？", "可以，但要正对页面并均匀打光。平板扫描通常更容易识别，因为透视、弯曲和光照问题更少。"]],
      sources: [
        { title: "Audiveris 工程参数", href: officialSources.audiverisInput, note: "官方手册提供 synthetic、standard、poor 三种输入质量模式和可配置二值化。" },
        { title: "Audiveris 输入格式", href: "https://audiveris.github.io/audiveris/_pages/tutorials/quick/load/", note: "列出支持的图片与 PDF 输入。" },
        { title: "美国国会图书馆复制格式表", href: "https://www.loc.gov/duplicationservices/formats/Copies-and-Formats-Matrix-01-13-2012.pdf", note: "公共机构资料把 300 dpi 列为乐谱常见扫描分辨率；这是起点，不是 OMR 准确率保证。" },
      ],
      relatedPaths: ["/pdf-score-scanner", "/pdf-to-musicxml", "/guides/convert-pdf-sheet-music-to-musicxml", "/guides/correct-omr-recognition-errors", "/guides/pdf-to-musicxml-recognition-benchmark"],
    },
  },
  "import-musicxml-into-musescore": {
    en: {
      updatedAt: "2026-08-29",
      title: "How to Import MusicXML into MuseScore",
      description: "Open MusicXML or compressed MXL in MuseScore Studio, review import settings, correct notation and layout, then save an editable score.",
      eyebrow: "MusicXML interoperability guide",
      intro: "MuseScore Studio can open MusicXML and compressed MusicXML files, but a successful import does not mean every layout and notation detail transferred perfectly. Save a native copy, review musical structure, and compare it with the source.",
      primaryKeyword: "import MusicXML into MuseScore",
      keywords: ["import MusicXML into MuseScore", "open MXL in MuseScore", "MusicXML cleanup", "MuseScore import settings"],
      takeaways: [["Open, then save a native copy", "Preserve the downloaded MusicXML while creating a separate MuseScore working file."], ["Review musical data before layout", "Check parts, measures, voices, rhythm, key, lyrics, and repeats before spacing."], ["Expect some cleanup", "MusicXML aims to preserve notation exchange, but application-specific layout and text behavior can differ."]],
      sections: [
        { title: "Opening MusicXML and MXL", paragraphs: ["Use File → Open and choose the .musicxml, .xml, or .mxl file. MuseScore documents MusicXML and compressed MusicXML as supported import formats. After the score opens, save a new .mscz copy so the original exchange file remains unchanged."], bullets: ["Keep the original MusicXML for comparison.", "Confirm all parts and instruments appear.", "Check whether transposing instruments are displayed as expected.", "Note any warning shown during import."] },
        { title: "Review import preferences and layout", paragraphs: ["MuseScore exposes MusicXML import preferences, including whether layout information should be imported. Imported page size, margins, breaks, text positions, and fonts can vary according to what the file contains and what MuseScore supports."], bullets: ["Inspect page size, staff size, margins, and system breaks.", "Reset imported text styles or positions only after saving a backup.", "Do not mistake a layout difference for a pitch or rhythm difference."] },
        { title: "Verify an OMR-derived file", paragraphs: ["If the MusicXML came from a PDF or image, compare the rendered score with the source page measure by measure. OMR errors are upstream of MuseScore; importing the file cannot automatically correct a wrong duration, voice, accidental, lyric, or repeat."], },
      ],
      steps: [["Download the MusicXML or MXL", "Keep the file name and original source together."], ["Open it in MuseScore", "Choose File → Open and select the exchange file."], ["Save a MuseScore working copy", "Use Save As to create a separate .mscz file before cleanup."], ["Audit musical structure", "Check parts, measures, clefs, keys, meters, voices, rhythm, pitch, lyrics, and repeats."], ["Clean layout and playback", "Adjust breaks, spacing, text, instruments, and playback only after the musical data is correct."]],
      faqs: [["Why does the imported score look different?", "MusicXML carries substantial notation and layout information, but application-specific fonts, positioning, and engraving rules can still differ."], ["Should I use .musicxml or .mxl?", "Both are MusicXML. MXL is compressed; uncompressed MusicXML is easier to inspect with text tools."], ["Can MuseScore fix OMR errors automatically?", "No. It can help you edit them, but the source page must still be used to decide what is correct."]],
      sources: [
        { title: "MuseScore: Opening and saving scores", href: officialSources.museScoreOpen, note: "Official list of supported import formats and saving workflow." },
        { title: "MuseScore: Working with MusicXML files", href: officialSources.museScoreMusicXml, note: "Official import options, cleanup, text-style, and layout guidance." },
        { title: "MusicXML 4.0", href: officialSources.musicXml, note: "The format specification and interoperability purpose." },
      ],
      relatedPaths: ["/score-editor", "/musicxml-midi", "/guides/convert-pdf-sheet-music-to-musicxml", "/guides/correct-omr-recognition-errors", "/guides/pdf-vs-musicxml-vs-midi"],
    },
    "zh-CN": {
      updatedAt: "2026-08-29",
      title: "如何把 MusicXML 导入 MuseScore",
      description: "在 MuseScore Studio 中打开 MusicXML 或压缩 MXL，检查导入设置、校正记谱和版面，再保存可编辑乐谱。",
      eyebrow: "MusicXML 互操作指南",
      intro: "MuseScore Studio 可以打开 MusicXML 和压缩 MusicXML，但成功导入不代表所有版面与记谱细节都完整一致。应先另存原生副本，再检查音乐结构并与来源对照。",
      primaryKeyword: "MusicXML 导入 MuseScore",
      keywords: ["MusicXML 导入 MuseScore", "MuseScore 打开 MXL", "MusicXML 清理", "MuseScore 导入设置"],
      takeaways: [["打开后先另存", "保留下载的 MusicXML，同时建立独立的 MuseScore 工作文件。"], ["先检查音乐数据", "先核对声部、小节、节奏、调号、歌词和反复，再处理间距。"], ["预期需要清理", "MusicXML 面向记谱交换，但不同软件的版面与文字行为仍可能不同。"]],
      sections: [
        { title: "打开 MusicXML 与 MXL", paragraphs: ["选择“文件 → 打开”，再选 .musicxml、.xml 或 .mxl 文件。MuseScore 官方文档把 MusicXML 和压缩 MusicXML 列为支持导入格式。打开后另存新的 .mscz 副本，避免修改原交换文件。"], bullets: ["保留原 MusicXML 用于比较。", "确认所有声部与乐器都存在。", "检查移调乐器显示是否符合预期。", "记录导入过程中出现的警告。"] },
        { title: "检查导入偏好与版面", paragraphs: ["MuseScore 提供 MusicXML 导入偏好，包括是否导入版面信息。页面尺寸、边距、换行、文字位置和字体会受文件内容与软件支持范围影响。"], bullets: ["检查页面、谱表尺寸、边距和系统换行。", "重置文字样式或位置前先保存备份。", "不要把版面差异误当成音高或节奏差异。"] },
        { title: "验证 OMR 生成的文件", paragraphs: ["如果 MusicXML 来自 PDF 或图片，应逐小节与原页面比较。OMR 错误发生在导入 MuseScore 之前；软件打开文件并不会自动修正错误时值、声部、临时记号、歌词或反复。"] },
      ],
      steps: [["下载 MusicXML 或 MXL", "把文件名与原始来源一起保存。"], ["在 MuseScore 中打开", "选择“文件 → 打开”并选择交换文件。"], ["保存 MuseScore 工作副本", "清理前用“另存为”建立单独的 .mscz 文件。"], ["审核音乐结构", "核对声部、小节、谱号、调拍号、节奏、音高、歌词和反复。"], ["清理版面与播放", "音乐数据正确后再调整换行、间距、文字、乐器和播放。"]],
      faqs: [["为什么导入后版面变了？", "MusicXML 能保存大量记谱和版面信息，但软件专有字体、定位和制谱规则仍可能不同。"], ["应该使用 .musicxml 还是 .mxl？", "两者都是 MusicXML；MXL 是压缩格式，未压缩 MusicXML 更便于用文本工具检查。"], ["MuseScore 会自动修正 OMR 错误吗？", "不会。它可以帮助编辑，但判断正确内容仍要依据原页面。"]],
      sources: [
        { title: "MuseScore：打开与保存乐谱", href: officialSources.museScoreOpen, note: "官方列出的导入格式和保存流程。" },
        { title: "MuseScore：MusicXML 文件", href: officialSources.museScoreMusicXml, note: "官方导入选项、清理、文字和版面说明。" },
        { title: "MusicXML 4.0", href: officialSources.musicXml, note: "格式规范与互操作用途。" },
      ],
      relatedPaths: ["/score-editor", "/musicxml-midi", "/guides/convert-pdf-sheet-music-to-musicxml", "/guides/correct-omr-recognition-errors", "/guides/pdf-vs-musicxml-vs-midi"],
    },
  },
  "pdf-to-musicxml-recognition-benchmark": {
    en: {
      updatedAt: "2026-08-29",
      title: "PDF to MusicXML Recognition Benchmark",
      description: "See exactly what ScoreTransposer has measured for PDF-to-MusicXML recognition, what remains unmeasured, and the reproducible gold-set protocol.",
      eyebrow: "Transparent OMR evidence",
      intro: "We do not publish a universal recognition percentage. This report separates verified runtime and regression evidence from pitch, rhythm, key, and lyric accuracy metrics that do not yet have a sufficiently aligned gold set.",
      primaryKeyword: "PDF to MusicXML recognition benchmark",
      keywords: ["PDF to MusicXML recognition benchmark", "OMR accuracy test", "MusicXML recognition accuracy", "sheet music OCR benchmark"],
      takeaways: [
        ["20 of 20 routing expectations matched", "The checked-in 2026-06-30 regression report correctly kept clean, difficult, and unusable repository samples in their expected candidate/final lanes."],
        ["This is not note accuracy", "The regression result measures workflow classification, not aligned pitch, rhythm, key-signature, or lyric correctness."],
        ["Four percentages remain unpublished", "We will not infer note, rhythm, key, or lyric accuracy until a versioned gold set and alignment report exist."],
      ],
      sections: [
        {
          title: "Evidence currently available",
          paragraphs: [
            "The repository contains a 20-file regression report with 20 matched expected outcomes: 11 clean/final, 6 difficult/draft, and 3 unusable/non-final cases. It also contains checksum-pinned real-engine fixtures for multi-page, rotation, crop, degraded, corrupted, timeout, and cancellation scenarios, plus a recorded Audiveris 5.10.2 runtime qualification dated 2026-08-17.",
            "Those artifacts prove that explicit workflow and engine gates exist. They do not justify a claim that a given percentage of notes or rhythms is correct. The downloadable JSON records this distinction in machine-readable form.",
          ],
          bullets: ["Candidate-routing regression: measured and versioned", "Runtime qualification: measured and versioned", "Pitch accuracy: not published", "Rhythm error rate: not published", "Key-signature retention: not published", "Lyric retention: not published"],
        },
        {
          title: "Gold-set protocol for publishable accuracy",
          paragraphs: ["A future recognition percentage must identify the exact engine version, corpus license, scan matrix, alignment algorithm, sample count, and exclusions. Results must be reported separately by scan condition and notation complexity rather than averaged into a promotional number."],
          bullets: ["Create human-verified MusicXML references and immutable source PDFs.", "Run clean 300 dpi, lower-resolution, rotated, cropped, shadowed, lyric, piano, and dense-voice conditions.", "Align parts, measures, voices, and events before scoring pitch or duration.", "Report note precision/recall, duration edit rate, measure structure, key/time retention, lyrics, and unsupported symbols separately.", "Publish failures, engine version, checksums, scripts, and reviewer disagreements."],
        },
        {
          title: "How to read this report",
          paragraphs: ["A blank metric means evidence is insufficient, not that performance is zero. A successful job means an artifact was produced; only aligned comparison with a human-reviewed reference measures recognition correctness. Users should still test a representative page and inspect the candidate."],
        },
      ],
      steps: [["Download the evidence JSON", "Review the scope, source files, dates, counts, and explicit non-claims."], ["Download the public PDF and MusicXML", "Inspect the open sample pair without an account."], ["Run the product on a permitted score", "Test a representative page and retain the source beside the candidate."], ["Compare measure by measure", "Review structure, rhythm, voices, pitch, key, lyrics, and repeats."], ["Do not generalize one sample", "Report results by source condition and notation type rather than as a universal percentage."]],
      faqs: [["Why not publish 99% accuracy?", "Because no aligned, versioned gold-set evidence supports such a universal claim across scan qualities and notation types."], ["Does 20/20 mean every note was correct?", "No. It means each regression sample followed its expected final/draft/non-final workflow outcome."], ["When will note and rhythm percentages appear?", "Only after the gold-set runner produces an auditable report with aligned references, engine version, checksums, and reviewer-approved scoring."]],
      sources: [
        { title: "Audiveris Handbook", href: officialSources.audiveris, note: "The upstream project explicitly says OMR accuracy is far from perfect and provides correction tools." },
        { title: "MusicXML 4.0", href: officialSources.musicXml, note: "Defines the score structure that a benchmark must compare." },
        { title: "MuseScore MusicXML guidance", href: officialSources.museScoreMusicXml, note: "A second renderer and editor for interoperability checks." },
      ],
      relatedPaths: ["/pdf-to-musicxml", "/pdf-score-scanner", "/guides/convert-pdf-sheet-music-to-musicxml", "/guides/best-scan-settings-for-sheet-music-ocr", "/guides/correct-omr-recognition-errors"],
      evidenceDownload: "/research/pdf-to-musicxml-evidence-2026-08-29.json",
    },
    "zh-CN": {
      updatedAt: "2026-08-29",
      title: "PDF 转 MusicXML 识别基准报告",
      description: "查看 ScoreTransposer 对 PDF 转 MusicXML 已测量、尚未测量的内容，以及可复现的金标准测试协议。",
      eyebrow: "透明 OMR 证据",
      intro: "我们不公布通用识别百分比。本报告把已经验证的运行环境和回归证据，与尚未建立充分对齐金标准的音高、节奏、调号和歌词准确率严格分开。",
      primaryKeyword: "PDF 转 MusicXML 识别准确率",
      keywords: ["PDF 转 MusicXML 识别准确率", "OMR 准确率测试", "MusicXML 识别基准", "乐谱 OCR 测试"],
      takeaways: [["20/20 个分流预期符合", "仓库中的 2026-06-30 回归报告把清晰、困难和不可用样本正确留在预期的候选/正式通道。"], ["这不是音符准确率", "该结果衡量工作流分流，不是对齐后的音高、节奏、调号或歌词正确率。"], ["四项百分比暂不发布", "在有版本化金标准和对齐报告前，不推算音符、节奏、调号与歌词准确率。"]],
      sections: [
        { title: "目前已有的证据", paragraphs: ["仓库包含一份 20 文件回归报告，20 个预期结果全部符合：11 个清晰/正式、6 个困难/候选、3 个不可用/不晋级。另有带校验和的真实引擎场景夹具，覆盖多页、旋转、裁切、降质、损坏、超时与取消，并保存了 2026-08-17 的 Audiveris 5.10.2 运行环境资格记录。", "这些资料证明系统存在明确工作流与引擎门禁，但不能证明某个比例的音符或节奏正确。可下载 JSON 会以机器可读形式记录这一边界。"], bullets: ["候选分流回归：已测量并版本化", "运行环境资格：已测量并版本化", "音高准确率：暂不发布", "节奏错误率：暂不发布", "调号保留率：暂不发布", "歌词保留率：暂不发布"] },
        { title: "可发布准确率所需的金标准协议", paragraphs: ["未来的识别百分比必须说明引擎版本、语料许可、扫描矩阵、对齐算法、样本数和排除项。应按扫描条件与记谱复杂度分别报告，不能压成一个宣传数字。"], bullets: ["建立人工审核 MusicXML 参考与不可变来源 PDF。", "运行清晰 300 dpi、低分辨率、旋转、裁切、阴影、歌词、钢琴和密集声部条件。", "先对齐声部、小节、声部层和事件，再评分音高与时值。", "分别报告音符精确率/召回率、时值编辑率、小节结构、调拍号、歌词和不支持符号。", "公开失败、引擎版本、校验和、脚本和审核分歧。"] },
        { title: "如何阅读这份报告", paragraphs: ["空白指标代表证据不足，不代表表现为零。任务成功只代表生成了产物；只有与人工审核参考对齐比较，才能衡量识别正确性。用户仍应测试代表性页面并检查候选稿。"] },
      ],
      steps: [["下载证据 JSON", "查看范围、来源、日期、数量和明确不做的声明。"], ["下载公开 PDF 与 MusicXML", "无需账号即可检查开放样例对。"], ["用有权处理的乐谱试用", "测试有代表性的一页，把来源保留在候选稿旁边。"], ["逐小节比较", "检查结构、节奏、声部、音高、调号、歌词和反复。"], ["不要用单一样本外推", "按来源条件与记谱类型报告，不做通用百分比。"]],
      faqs: [["为什么不宣传 99%？", "因为没有对齐、版本化的金标准证据支持跨扫描质量和记谱类型的通用结论。"], ["20/20 是否代表每个音符都正确？", "不是。它代表每个回归样本进入了预期的正式、候选或不晋级工作流。"], ["什么时候会有音符和节奏百分比？", "只有金标准执行器生成带参考对齐、引擎版本、校验和并经审核的报告后才发布。"]],
      sources: [
        { title: "Audiveris Handbook", href: officialSources.audiveris, note: "上游项目明确说明 OMR 离完美仍有距离，因此提供人工校正工具。" },
        { title: "MusicXML 4.0", href: officialSources.musicXml, note: "定义基准测试需要比较的乐谱结构。" },
        { title: "MuseScore MusicXML 指南", href: officialSources.museScoreMusicXml, note: "用于互操作检查的第二款渲染与编辑软件。" },
      ],
      relatedPaths: ["/pdf-to-musicxml", "/pdf-score-scanner", "/guides/convert-pdf-sheet-music-to-musicxml", "/guides/best-scan-settings-for-sheet-music-ocr", "/guides/correct-omr-recognition-errors"],
      evidenceDownload: "/research/pdf-to-musicxml-evidence-2026-08-29.json",
    },
  },
};

export function isPdfMusicXmlGuideLocale(locale: SupportedLocale): locale is PdfMusicXmlGuideLocale {
  return PDF_MUSICXML_GUIDE_LOCALES.includes(locale as PdfMusicXmlGuideLocale);
}

export function getPdfMusicXmlGuide(slug: string, locale: SupportedLocale): PdfMusicXmlGuide | null {
  if (!isPdfMusicXmlGuideLocale(locale) || !pdfMusicXmlGuideSlugs.includes(slug as PdfMusicXmlGuideSlug)) return null;
  const typedSlug = slug as PdfMusicXmlGuideSlug;
  return { slug: typedSlug, ...guides[typedSlug][locale] };
}

export function listPdfMusicXmlGuides(locale: SupportedLocale): PdfMusicXmlGuide[] {
  if (!isPdfMusicXmlGuideLocale(locale)) return [];
  return pdfMusicXmlGuideSlugs.map((slug) => ({ slug, ...guides[slug][locale] }));
}

export function getPdfMusicXmlGuideHubAction(locale: SupportedLocale): string | null {
  if (!isPdfMusicXmlGuideLocale(locale)) return null;
  return locale === "zh-CN" ? "查看 PDF 与 MusicXML 指南" : "Read PDF & MusicXML guides";
}
