import type { SupportedLocale } from "@score/shared";

export const priorityAnswerPageSlugs = [
  "pdf-to-musicxml",
  "pdf-score-scanner",
  "score-editor",
  "transpose-score",
  "score-to-audio",
] as const;

export type PriorityAnswerPageSlug = (typeof priorityAnswerPageSlugs)[number];

type CommonError = {
  title: string;
  symptom: string;
  fix: string;
};

type ComparisonRow = {
  workflow: string;
  bestFor: string;
  tradeoff: string;
};

export type FeatureAnswerContent = {
  promise: string;
  before: string;
  after: string;
  checkpoints: string[];
  commonErrors: CommonError[];
  accuracySummary: string;
  accuracyChecks: string[];
  comparisonRows: ComparisonRow[];
  screenshot?: {
    src: string;
    width: number;
    height: number;
    alt: string;
  };
  video?: {
    src: string;
    poster: string;
    title: string;
  };
};

const englishContent: Record<PriorityAnswerPageSlug, FeatureAnswerContent> = {
  "pdf-to-musicxml": {
    promise: "Upload a score PDF, inspect the recognition evidence, correct the candidate, and export a reusable MusicXML file from one project.",
    before: "A self-authored, deterministic one-page reference PDF with four quarter notes and clear staff lines.",
    after: "A separate deterministic MusicXML reference containing the same four notes, meter, clef, pitches, and durations. It demonstrates the downloadable format, not measured Audiveris accuracy.",
    checkpoints: ["Measure count and barlines", "Key, meter, clef, and accidentals", "Voice assignment, rhythm, ties, lyrics, and repeats"],
    commonErrors: [
      { title: "The scan is skewed or soft", symptom: "Staff lines merge, noteheads disappear, or symbols land on the wrong staff.", fix: "Use a flat 300 dpi scan when possible; crop borders, rotate the page, and avoid shadows before uploading." },
      { title: "The PDF contains photos or mixed page sizes", symptom: "Some pages recognize well while others create empty or fragmented measures.", fix: "Split unlike pages, straighten photographs, and test the hardest page before starting a long document." },
      { title: "The first export is treated as final", symptom: "The file opens, but rhythm, voices, tuplets, lyrics, or repeats are musically wrong.", fix: "Compare every measure with the source and correct the candidate before using it for rehearsal, publication, or analysis." },
    ],
    accuracySummary: "There is no honest universal accuracy percentage for PDF-to-MusicXML. Results change with resolution, engraving density, number of voices, handwriting, page curvature, and notation complexity. The product therefore returns a reviewable candidate rather than claiming a perfect transcription.",
    accuracyChecks: ["Count measures before checking individual notes.", "Compare rhythm and voice allocation before pitch spelling.", "Re-open the downloaded MusicXML in an independent notation renderer before relying on it."],
    comparisonRows: [
      { workflow: "ScoreTransposer browser workflow", bestFor: "Keeping source PDF, diagnostics, correction history, playback, and export in one score project.", tradeoff: "Recognition still needs human review, especially for dense or low-quality notation." },
      { workflow: "Scan-only OMR tool", bestFor: "Producing a quick recognition file from a clean scan.", tradeoff: "Cleanup, version history, playback, and later conversions may require another application." },
      { workflow: "Traditional notation editor", bestFor: "Detailed engraving and manual reconstruction.", tradeoff: "Often requires installation and more manual re-entry when the source is only a PDF." },
    ],
    screenshot: { src: "/product/feature-pdf-score-scanner-real.png", width: 1425, height: 891, alt: "Real PDF recognition workspace with source page, diagnostics, and editable MusicXML preview" },
  },
  "pdf-score-scanner": {
    promise: "See the uploaded page, recognition diagnostics, MusicXML preview, and correction path before deciding whether the scan is usable.",
    before: "A clean score image or PDF page that you have the right to process.",
    after: "A structured recognition candidate with diagnostic evidence, not an unexplained black-box download.",
    checkpoints: ["Page orientation and staff detection", "Recognized measure structure and symbols", "Warnings that require manual correction"],
    commonErrors: [
      { title: "Camera perspective bends the staves", symptom: "The same staff changes width or angle across the photo.", fix: "Photograph the page straight-on in even light, or use a scanner; crop and deskew before recognition." },
      { title: "The score is handwritten or visually dense", symptom: "Voices, beams, ornaments, or cross-staff notation are merged or omitted.", fix: "Use the scan as a starting candidate and budget time for measure-by-measure correction." },
      { title: "A successful job is mistaken for an accurate score", symptom: "The task completes but the musical content still differs from the page.", fix: "Completion only means files were produced; inspect diagnostics, render the candidate, and compare it with the source." },
    ],
    accuracySummary: "OMR quality depends on the source, not just the file type. Clean printed notation is usually easier than handwriting, phone photos, faded copies, cross-staff piano writing, or dense orchestral pages. We expose the candidate and diagnostics so users can judge the result themselves.",
    accuracyChecks: ["Test one representative page before a multi-page batch.", "Review every warning and visually compare the rendered candidate.", "Keep the original source beside the corrected revision for traceability."],
    comparisonRows: [
      { workflow: "ScoreTransposer browser workflow", bestFor: "Recognition followed by correction, transposition, playback, and open-format export.", tradeoff: "It prioritizes a reviewable project over a one-click perfection claim." },
      { workflow: "Scan-only OMR tool", bestFor: "Fast file conversion when the source is already very clean.", tradeoff: "The result may need to be moved elsewhere for correction and version control." },
      { workflow: "Manual notation entry", bestFor: "Maximum control on difficult or unusual engraving.", tradeoff: "Accurate but slower because the score is reconstructed by hand." },
    ],
  },
  "score-editor": {
    promise: "Open a real structured score immediately, select a correction target, save a new revision, and keep MusicXML available for work in other notation software.",
    before: "Imported MusicXML, MIDI, Jianpu, Score JSON, or a reviewed scan candidate.",
    after: "A corrected structured revision that can be rendered, played, transposed, split into parts, and exported.",
    checkpoints: ["Pitch, duration, rests, ties, and slurs", "Key, meter, clef, tempo, dynamics, lyrics, and barlines", "Revision history and exported MusicXML after editing"],
    commonErrors: [
      { title: "Trying to edit PDF pixels", symptom: "A scanned page looks editable, but the notes are still only an image.", fix: "Run recognition first or import MusicXML; the editor changes Score JSON and MusicXML, not pixels in a PDF." },
      { title: "Correcting notation without checking the source", symptom: "A plausible edit fixes one measure but changes the intended voice or rhythm.", fix: "Keep the source visible and validate the whole measure before saving a correction." },
      { title: "Expecting desktop engraving controls", symptom: "The musical data is editable but advanced page layout is not available.", fix: "Use this editor for structured correction and workflow continuity; finish specialized engraving in a compatible notation editor when needed." },
    ],
    accuracySummary: "Edits to structured notes are deterministic, but the editor cannot make an uncertain import correct by itself. MusicXML and MIDI can contain incomplete semantics, and OMR candidates can contain recognition errors. Accuracy therefore means preserving and validating the intended musical structure, not merely rendering a plausible page.",
    accuracyChecks: ["Compare the edited measure with the source or musical intent.", "Play the changed passage and inspect voice timing.", "Download and re-open MusicXML before publication or a high-stakes rehearsal."],
    comparisonRows: [
      { workflow: "ScoreTransposer browser workflow", bestFor: "OMR cleanup, revision history, open-format export, and connected transposition/playback.", tradeoff: "Advanced free-form engraving and page layout are still more limited than mature desktop suites." },
      { workflow: "Traditional notation editor", bestFor: "Deep engraving, layout, and composition from scratch.", tradeoff: "Scan diagnostics and browser-based project continuity may require separate tools or file handoffs." },
      { workflow: "Scan-only OMR tool", bestFor: "Creating the first structured candidate.", tradeoff: "It is not a replacement for measure-level correction and revision management." },
    ],
    video: { src: "/product/localized/en/demo-score-editor.webm", poster: "/product/localized/en/demo-score-editor-poster.jpg", title: "Short product demo: correcting a structured score revision" },
  },
  "transpose-score": {
    promise: "Choose semitones, a target key, or a transposing-instrument profile, then compare the new revision with the untouched source.",
    before: "A structured MusicXML/Score JSON score in C major with the notes C, D, E, and G.",
    after: "A separate D-major revision with D, E, F-sharp, and A, available as real MusicXML.",
    checkpoints: ["Direction and interval of transposition", "Concert pitch versus written transposing-instrument pitch", "Enharmonic spelling, clef comfort, and playable range"],
    commonErrors: [
      { title: "The interval moves in the wrong direction", symptom: "The new score is higher when the singer or instrument needed a lower key.", fix: "Confirm up/down direction and preview the lowest and highest resulting notes before export." },
      { title: "Concert pitch is confused with written pitch", symptom: "A Bb, Eb, F, or A instrument part sounds in the wrong key.", fix: "Use the instrument profile and verify one known written-to-sounding pitch before processing the whole part." },
      { title: "Correct pitches use awkward spelling", symptom: "The notes sound right but contain hard-to-read double accidentals or uncomfortable clefs.", fix: "Review enharmonic spelling, key signature, clef, and range; musical readability still needs human judgment." },
    ],
    accuracySummary: "The pitch interval transformation is deterministic for structured notes, and the downloadable example is checked note-for-note. That does not make every notation choice automatically optimal: enharmonic spelling, octave placement, clef changes, vocal tessitura, and instrument range remain musical decisions.",
    accuracyChecks: ["Verify the first and last notes against the chosen interval.", "Check the new key signature and all accidentals.", "Play the result and inspect the full range before distributing parts."],
    comparisonRows: [
      { workflow: "ScoreTransposer browser workflow", bestFor: "Non-destructive revisions, target-key/instrument modes, range checks, and regenerated exports.", tradeoff: "Final spelling and part readability still need review." },
      { workflow: "Traditional notation editor", bestFor: "Manual engraving adjustments after transposition.", tradeoff: "The operation may involve more setup and manual comparison with the source revision." },
      { workflow: "Static PDF pitch-shift workflow", bestFor: "Changing playback audio without needing editable notation.", tradeoff: "It does not create a trustworthy structured score or instrument part." },
    ],
    video: { src: "/product/localized/en/demo-transpose-score.webm", poster: "/product/localized/en/demo-transpose-score-poster.jpg", title: "Short product demo: transposing a score into a new revision" },
  },
  "score-to-audio": {
    promise: "Load a structured score, hear playback in the browser, change tempo and loop settings, then download a deterministic WAV/MIDI practice example.",
    before: "A four-note MusicXML score with explicit pitch, rhythm, meter, and tempo context.",
    after: "Timed playback events and a 3.2-second synthesized WAV practice file; MIDI remains available as an open event format.",
    checkpoints: ["Tempo, repeats, ties, and measure timing", "Part balance, instrument sound, loop boundaries, and count-in", "Export format and whether MP3/WAV rendering is enabled"],
    commonErrors: [
      { title: "The source score lacks playback semantics", symptom: "Repeats, tempo changes, ties, or articulations do not sound as expected.", fix: "Correct the MusicXML/Score JSON structure first; audio can only follow the information present in the score." },
      { title: "Browser preview is confused with final rendering", symptom: "The preview timbre differs from the downloaded practice file.", fix: "Use preview for timing and practice, then test the actual exported WAV/MP3 before sharing it." },
      { title: "MP3 is requested when the renderer is unavailable", symptom: "Playback works but server-side MP3 export is not offered.", fix: "Use the available MIDI/WAV path or confirm that FluidSynth, a SoundFont, and ffmpeg are configured for the environment." },
    ],
    accuracySummary: "Score-to-audio does not recognize a performance; it schedules the structured notes already in the score. Pitch and timing are reproducible for the same revision and settings, while timbre remains synthesized and expressive interpretation is intentionally limited. Incorrect source notation produces incorrect audio.",
    accuracyChecks: ["Compare playback measure markers with the notation.", "Test repeats, ties, tempo changes, and part mutes.", "Listen to the downloaded file, not only the browser preview, before distribution."],
    comparisonRows: [
      { workflow: "ScoreTransposer browser workflow", bestFor: "Connected notation playback, loops, tempo practice, open MIDI, and reusable audio exports.", tradeoff: "Synthetic playback is a practice aid, not a human performance." },
      { workflow: "Traditional notation editor playback", bestFor: "Playback while composing and detailed score editing.", tradeoff: "Sharing practice variants may require repeated local exports and file management." },
      { workflow: "Audio-to-score transcription tool", bestFor: "Starting from a recording rather than notation.", tradeoff: "It solves the opposite problem and introduces recognition uncertainty before playback." },
    ],
    video: { src: "/product/localized/en/demo-score-to-audio.webm", poster: "/product/localized/en/demo-score-to-audio-poster.jpg", title: "Short product demo: turning a structured score into practice audio" },
  },
};

const chineseContent: Record<PriorityAnswerPageSlug, FeatureAnswerContent> = {
  "pdf-to-musicxml": {
    promise: "上传乐谱 PDF，查看识别证据，校正候选稿，再从同一个工程导出可复用的 MusicXML。",
    before: "一页自制的确定性参考 PDF，包含清晰五线谱与四个四分音符。",
    after: "另一份包含相同四个音符、拍号、谱号、音高与时值的确定性 MusicXML 参考文件。它用于证明下载格式，不代表 Audiveris 识别准确率。",
    checkpoints: ["小节数量与小节线", "调号、拍号、谱号和临时记号", "声部、节奏、连音、歌词与反复"],
    commonErrors: [
      { title: "扫描歪斜或模糊", symptom: "五线粘连、符头丢失，或符号落到错误的谱表。", fix: "尽量使用平整的 300 dpi 扫描；上传前裁边、旋转并去除阴影。" },
      { title: "PDF 混有照片或不同页面尺寸", symptom: "部分页面识别正常，另一些页面却出现空小节或结构碎片。", fix: "拆分差异较大的页面，先用最难的一页测试，再处理长文档。" },
      { title: "把第一次导出当成最终稿", symptom: "文件能打开，但节奏、声部、连音线、歌词或反复在音乐上不正确。", fix: "逐小节对照原谱并校正，再用于排练、出版或分析。" },
    ],
    accuracySummary: "PDF 转 MusicXML 不存在诚实且通用的固定准确率。分辨率、排版密度、声部数量、手写内容、页面弯曲和符号复杂度都会改变结果。因此产品返回可检查的候选稿，而不是宣称一次得到完美乐谱。",
    accuracyChecks: ["先核对小节数量，再检查单个音符。", "先核对节奏与声部分配，再检查音高拼写。", "正式使用前，用另一款制谱渲染器重新打开下载的 MusicXML。"],
    comparisonRows: [
      { workflow: "ScoreTransposer 浏览器工作流", bestFor: "在一个工程中保留来源 PDF、诊断、校正历史、播放和导出。", tradeoff: "密集或低质量乐谱仍必须人工检查。" },
      { workflow: "只做扫描识别的 OMR 工具", bestFor: "从清晰扫描件快速生成识别文件。", tradeoff: "校正、版本历史、播放和后续转换往往需要另一款软件。" },
      { workflow: "传统制谱软件", bestFor: "精细排版和手工重建。", tradeoff: "只有 PDF 时通常需要安装软件并进行更多手工录入。" },
    ],
    screenshot: { src: "/product/feature-pdf-score-scanner-real.png", width: 1425, height: 891, alt: "真实 PDF 识别工作区，包含来源页面、诊断与可编辑 MusicXML 预览" },
  },
  "pdf-score-scanner": {
    promise: "先看到上传页面、识别诊断、MusicXML 预览和校正路径，再判断这次扫描是否可用。",
    before: "你有权处理的清晰乐谱图片或 PDF 页面。",
    after: "带诊断证据的结构化识别候选稿，而不是无法解释的黑箱下载。",
    checkpoints: ["页面方向与谱表检测", "小节结构与乐谱符号", "必须人工校正的警告"],
    commonErrors: [
      { title: "拍照透视让五线弯曲", symptom: "同一谱表在照片中宽度或角度不断变化。", fix: "从正上方均匀打光拍摄，最好使用扫描仪；识别前裁切并校正倾斜。" },
      { title: "手写谱或排版过密", symptom: "声部、符杠、装饰音或跨谱表记谱被合并或遗漏。", fix: "把识别结果当作起始候选稿，并预留逐小节校正时间。" },
      { title: "任务成功被误认为识别准确", symptom: "任务已经完成，但音乐内容仍与原谱不同。", fix: "任务完成只代表生成了文件；仍要查看诊断、渲染候选稿并对照来源。" },
    ],
    accuracySummary: "OMR 质量取决于来源，而不只取决于文件格式。清晰印刷谱通常比手写谱、手机照片、褪色复印件、跨谱表钢琴谱或密集管弦乐总谱更容易识别。页面公开候选稿与诊断，让使用者自己判断结果。",
    accuracyChecks: ["多页处理前先测试一页有代表性的内容。", "查看全部警告，并逐页对照渲染候选稿。", "在校正版旁保留原始来源，方便追溯。"],
    comparisonRows: [
      { workflow: "ScoreTransposer 浏览器工作流", bestFor: "识别后继续校正、移调、播放和开放格式导出。", tradeoff: "优先提供可检查工程，不做“一键完美”的承诺。" },
      { workflow: "只做扫描识别的 OMR 工具", bestFor: "来源非常清晰时快速转换文件。", tradeoff: "结果通常还要转移到别处校正和管理版本。" },
      { workflow: "人工录谱", bestFor: "处理困难或特殊排版并获得最大控制。", tradeoff: "精确但较慢，因为需要手工重建乐谱。" },
    ],
  },
  "score-editor": {
    promise: "打开真实结构化乐谱，选择校正目标，保存新版本，并始终保留可在其他制谱软件中使用的 MusicXML。",
    before: "导入的 MusicXML、MIDI、简谱、Score JSON，或已经检查的识谱候选稿。",
    after: "可渲染、播放、移调、提取声部并导出的结构化校正版。",
    checkpoints: ["音高、时值、休止符、连音线与圆滑线", "调号、拍号、谱号、速度、力度、歌词与小节线", "修改历史与导出的 MusicXML"],
    commonErrors: [
      { title: "试图直接修改 PDF 像素", symptom: "扫描页看起来像乐谱，但音符仍只是一张图片。", fix: "先运行识别或导入 MusicXML；编辑器修改的是 Score JSON 与 MusicXML，不是 PDF 图片。" },
      { title: "不对照来源就修改", symptom: "某个改动看起来合理，却改变了原本的声部或节奏。", fix: "保持来源可见，先核对整个小节，再保存校正。" },
      { title: "期待完整桌面排版能力", symptom: "音乐数据可以编辑，但缺少高级页面排版选项。", fix: "这里用于结构校正和连续工作流；需要专业雕版时，可把 MusicXML 交给兼容制谱软件完成。" },
    ],
    accuracySummary: "对结构化音符的修改是确定性的，但编辑器不会自动把不确定的导入变正确。MusicXML、MIDI 可能缺少语义，OMR 候选也可能包含识别错误。因此“准确”意味着保留并验证预期音乐结构，而不只是页面看起来像乐谱。",
    accuracyChecks: ["把修改后的小节与来源或创作意图对照。", "播放修改片段并检查声部时序。", "出版或重要排练前，下载并重新打开 MusicXML。"],
    comparisonRows: [
      { workflow: "ScoreTransposer 浏览器工作流", bestFor: "OMR 校正、版本历史、开放格式导出，以及连续的移调和播放。", tradeoff: "自由雕版和页面排版仍少于成熟桌面软件。" },
      { workflow: "传统制谱软件", bestFor: "深度雕版、排版和从零创作。", tradeoff: "扫描诊断与浏览器工程连续性可能需要额外工具和文件传递。" },
      { workflow: "只做扫描识别的 OMR 工具", bestFor: "生成第一份结构化候选稿。", tradeoff: "不能代替逐小节校正和版本管理。" },
    ],
    video: { src: "/product/localized/zh-cn/demo-score-editor.webm", poster: "/product/localized/zh-cn/demo-score-editor-poster.jpg", title: "产品短演示：校正结构化乐谱版本" },
  },
  "transpose-score": {
    promise: "选择半音数、目标调或移调乐器预设，再把新版本与完全未改动的原谱进行比较。",
    before: "C 大调的结构化 MusicXML／Score JSON，包含 C、D、E、G 四个音。",
    after: "独立的 D 大调版本，音符为 D、E、升 F、A，并提供真实 MusicXML 下载。",
    checkpoints: ["移调方向和音程", "实际音高与移调乐器记谱音高", "等音拼写、谱号舒适度与可演奏音域"],
    commonErrors: [
      { title: "移调方向相反", symptom: "歌手或乐器需要降调，结果却变得更高。", fix: "确认向上／向下方向，并在导出前预览结果的最低音与最高音。" },
      { title: "混淆实际音高与记谱音高", symptom: "降 B、降 E、F 或 A 调乐器声部听起来不在正确调上。", fix: "使用乐器预设，并先用一个已知音验证记谱音与实际音的关系。" },
      { title: "音高正确但拼写难读", symptom: "听起来正确，却出现难读的重升降号或不舒适谱号。", fix: "人工检查等音拼写、调号、谱号和音域；可读性仍是音乐判断。" },
    ],
    accuracySummary: "对结构化音符的音程变换是确定性的，下载样例也逐音核对。但这不代表所有记谱选择都会自动达到最佳：等音拼写、八度位置、谱号变化、歌唱舒适区和乐器音域仍需要人工判断。",
    accuracyChecks: ["按所选音程核对第一个和最后一个音。", "检查新调号和全部临时记号。", "分发声部前播放结果并检查完整音域。"],
    comparisonRows: [
      { workflow: "ScoreTransposer 浏览器工作流", bestFor: "非破坏性版本、目标调／乐器模式、音域检查和重新生成导出。", tradeoff: "最终拼写与声部可读性仍需人工复核。" },
      { workflow: "传统制谱软件", bestFor: "移调后的手工雕版调整。", tradeoff: "通常需要更多设置，并手动与来源版本比较。" },
      { workflow: "只改变 PDF 播放音高", bestFor: "只想改变听感、不需要可编辑乐谱。", tradeoff: "无法得到可信的结构化乐谱或移调乐器声部。" },
    ],
    video: { src: "/product/localized/zh-cn/demo-transpose-score.webm", poster: "/product/localized/zh-cn/demo-transpose-score-poster.jpg", title: "产品短演示：把移调结果保存为新版本" },
  },
  "score-to-audio": {
    promise: "载入结构化乐谱，在浏览器中立即播放，调整速度与循环，再下载可复现的 WAV／MIDI 练习样例。",
    before: "包含明确音高、节奏、拍号和速度信息的四音 MusicXML。",
    after: "定时播放事件与 3.2 秒合成 WAV 练习文件；同时保留开放的 MIDI 事件格式。",
    checkpoints: ["速度、反复、连音与小节时序", "声部平衡、音色、循环边界与预备拍", "导出格式以及 MP3／WAV 渲染是否开放"],
    commonErrors: [
      { title: "来源乐谱缺少播放语义", symptom: "反复、速度变化、连音或演奏法听起来不符合预期。", fix: "先校正 MusicXML／Score JSON；音频只能依据乐谱中已有的信息。" },
      { title: "把浏览器预览当成最终渲染", symptom: "预览音色与下载的练习文件不同。", fix: "用预览检查时序和练习设置，分享前再测试实际导出的 WAV／MP3。" },
      { title: "渲染服务未开放时要求 MP3", symptom: "浏览器可以播放，但没有服务器端 MP3 导出。", fix: "使用现有 MIDI／WAV，或确认环境已配置 FluidSynth、SoundFont 和 ffmpeg。" },
    ],
    accuracySummary: "乐谱转音频不是识别演奏录音，而是安排乐谱中已经存在的结构化音符。相同版本和设置会得到可复现的音高与时序；音色属于合成效果，表现力也有意保持有限。来源乐谱错误时，音频同样会错误。",
    accuracyChecks: ["把播放小节标记与乐谱对照。", "测试反复、连音、速度变化和声部静音。", "分发前试听下载文件，而不只听浏览器预览。"],
    comparisonRows: [
      { workflow: "ScoreTransposer 浏览器工作流", bestFor: "连续的乐谱播放、循环、变速练习、开放 MIDI 和可复用音频导出。", tradeoff: "合成播放是练习辅助，不是真人演奏。" },
      { workflow: "传统制谱软件播放", bestFor: "创作过程中播放并进行深度乐谱编辑。", tradeoff: "分享多个练习版本时，可能需要反复在本地导出和管理文件。" },
      { workflow: "音频转乐谱工具", bestFor: "从录音而不是乐谱开始。", tradeoff: "它解决相反问题，并在播放前先引入识别不确定性。" },
    ],
    video: { src: "/product/localized/zh-cn/demo-score-to-audio.webm", poster: "/product/localized/zh-cn/demo-score-to-audio-poster.jpg", title: "产品短演示：把结构化乐谱转换成练习音频" },
  },
};

export function isPriorityAnswerPage(slug: string): slug is PriorityAnswerPageSlug {
  return priorityAnswerPageSlugs.includes(slug as PriorityAnswerPageSlug);
}

export function getFeatureAnswerContent(slug: string, locale: SupportedLocale): FeatureAnswerContent | null {
  if (!isPriorityAnswerPage(slug)) return null;
  if (locale !== "en" && locale !== "zh-CN") return null;
  return locale === "zh-CN" ? chineseContent[slug] : englishContent[slug];
}

export function getFeatureAnswerUi(locale: SupportedLocale) {
  if (locale === "zh-CN") {
    return {
      proofEyebrow: "先看真实结果",
      proofTitle: "上传前后发生了什么",
      before: "输入前",
      after: "处理后",
      check: "需要核对",
      sampleEyebrow: "真实下载样例",
      sampleTitle: "不要只看文字，直接检查原生文件",
      sampleBody: "样例由团队自制测试短句生成，可下载、解析，并在其他兼容软件中独立打开。",
      samples: [
        { label: "MusicXML 样例", detail: "C-D-E-G 四音结构化来源", href: "/examples/score-editor/input" },
        { label: "PDF 样例", detail: "真实五线谱测试页", href: "/examples/scoretransposer-reference-score.pdf" },
        { label: "MIDI 样例", detail: "C-D-E-G 四音事件", href: "/examples/musicxml-midi/output" },
      ],
      videoEyebrow: "产品短演示",
      videoTitle: "观看实际操作路径",
      errorsEyebrow: "常见错误",
      errorsTitle: "失败通常发生在哪里",
      symptom: "表现",
      fix: "处理方法",
      accuracyEyebrow: "准确度说明",
      accuracyTitle: "哪些可以复现，哪些必须人工判断",
      accuracyCheck: "测试与复核清单",
      comparisonEyebrow: "工作方式对比",
      comparisonTitle: "选择适合任务的流程",
      comparisonBody: "以下比较的是工作流类别，不是对任何品牌做总体优劣结论；产品范围和能力会随版本变化。",
      workflow: "工作方式",
      bestFor: "更适合",
      tradeoff: "需要接受的取舍",
      evidenceEyebrow: "作者与测试依据",
      author: "内容作者",
      authorValue: "ScoreTransposer 产品团队",
      updated: "页面更新",
      factReview: "功能事实复核",
      basis: "测试依据",
      basisValue: "当前产品真实截图／短视频、自制原生格式样例、自动文件签名与 SEO 测试，以及页面所列人工检查项。",
    } as const;
  }

  return {
    proofEyebrow: "See the real result first",
    proofTitle: "What changes before and after processing",
    before: "Before",
    after: "After",
    check: "What to inspect",
    sampleEyebrow: "Real downloadable samples",
    sampleTitle: "Inspect native files instead of trusting copy",
    sampleBody: "The team created this short test phrase. Each file can be downloaded, parsed, and opened independently in compatible software.",
    samples: [
      { label: "MusicXML sample", detail: "Four-note C-D-E-G source", href: "/examples/score-editor/input" },
      { label: "PDF sample", detail: "Real staff-notation test page", href: "/examples/scoretransposer-reference-score.pdf" },
      { label: "MIDI sample", detail: "Four events: C-D-E-G", href: "/examples/musicxml-midi/output" },
    ],
    videoEyebrow: "Short product demo",
    videoTitle: "Watch the actual workflow",
    errorsEyebrow: "Common errors",
    errorsTitle: "Where this workflow usually fails",
    symptom: "Symptom",
    fix: "How to fix it",
    accuracyEyebrow: "Accuracy statement",
    accuracyTitle: "What is reproducible and what needs judgment",
    accuracyCheck: "Test and review checklist",
    comparisonEyebrow: "Workflow comparison",
    comparisonTitle: "Choose the workflow that fits the task",
    comparisonBody: "This compares workflow categories, not the overall superiority of any brand. Product scope and capabilities change over time.",
    workflow: "Workflow",
    bestFor: "Best for",
    tradeoff: "Tradeoff",
    evidenceEyebrow: "Authorship and test evidence",
    author: "Author",
    authorValue: "ScoreTransposer product team",
    updated: "Page updated",
    factReview: "Product facts reviewed",
    basis: "Test basis",
    basisValue: "Current real product captures/videos, self-authored native-format samples, automated file-signature and SEO tests, plus the manual checks listed on this page.",
  } as const;
}
