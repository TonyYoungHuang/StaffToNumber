import Image from "next/image";
import Link from "next/link";
import {
  ArrowNorthEastIcon,
  CheckSealIcon,
  FileStackIcon,
  SparkIcon,
  UploadIcon,
} from "@score/ui";
import {
  HomeExampleGallery,
  HomeProcessShowcase,
  type HomeExample,
  type HomeProcessStage,
} from "../components/HomeShowcase";
import {
  HomeIntentSwitcher,
  HomePlaybackDemo,
  type HomeIntent,
  type PlaybackTrack,
} from "../components/HomeP1Showcase";
import { featureSeoRecords } from "../lib/feature-seo";
import {
  findPlatformFeaturePage,
  isFeatureAvailable,
  type PlatformFeaturePage,
} from "../lib/platform-feature-pages";
import { readSiteLocale } from "../lib/locale";
import { getPublishableTestimonials } from "../lib/public-content";
import { getAppStartConversionUrl, getCheckoutUrl, publicContentLastUpdated, siteConfig } from "../lib/site";

function requireFeature(slug: string) {
  const page = findPlatformFeaturePage(slug);
  const record = featureSeoRecords[slug];
  if (!page || !record) {
    throw new Error(`Missing public feature evidence for ${slug}.`);
  }
  return { page, record };
}

function localizedFeatureStatus(page: PlatformFeaturePage, isChinese: boolean) {
  if (!isFeatureAvailable(page)) {
    return isChinese ? "待生产验证" : "Production check pending";
  }
  if (!isChinese) return page.status;
  if (page.status === "Available") return "已上线";
  if (page.status === "Beta") return "测试版";
  return "预览版";
}

function publicImage(
  screenshot: { src: string; width: number; height: number; alt: string },
  alt = screenshot.alt,
) {
  return {
    src: screenshot.src,
    width: screenshot.width,
    height: screenshot.height,
    alt,
  };
}

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const [locale, resolvedSearchParams] = await Promise.all([readSiteLocale(), searchParams]);
  const isChinese = locale === "zh-CN";
  const startUrl = getAppStartConversionUrl();
  const checkoutUrl = getCheckoutUrl(locale);
  const initialCategory = typeof resolvedSearchParams.case === "string" ? resolvedSearchParams.case : "all";
  const initialIntent = typeof resolvedSearchParams.mode === "string" ? resolvedSearchParams.mode : undefined;
  const testimonials = getPublishableTestimonials();

  const copy = isChinese
    ? {
        eyebrow: "AI 乐谱识别与结构化编辑工作台",
        titleLead: "把一页五线谱，",
        titleAccent: "变成可以继续工作的乐谱。",
        intro:
          "上传 PDF 或乐谱图片，先获得可核对的 OMR 候选；再在同一个项目里校正、转简谱、移调、播放并导出 MusicXML。",
        primaryAction: siteConfig.release.productAppAvailable ? "免费识别一页" : "查看上线状态",
        secondaryAction: "先看真实案例",
        primaryNote: "注册后可免费识别 1 页；识别结果始终需要人工核对。",
        uploadEyebrow: "从这里开始",
        uploadTitle: "进入工作台上传 PDF 或图片",
        uploadBody: "点击后前往受保护的乐谱工作台，再选择本地文件。营销页不会伪装执行上传。",
        uploadAction: siteConfig.release.productAppAvailable ? "选择乐谱文件" : "查看开放状态",
        privacy: "文件用于创建你的乐谱项目，不会出现在公共案例中。",
        previewEyebrow: "真实产品输出",
        previewTitle: "识别候选与原谱对照，而不是一键假装完成",
        previewNote: "当前工作台实拍 · 结果可进入校正流程",
        facts: [
          ["免费起步", "注册后识别 1 页"],
          ["输入", "PDF / 常见乐谱图片"],
          ["项目真源", "Score JSON"],
          ["交换格式", "MusicXML"],
          ["结果方式", "候选 + 诊断 + 人工校正"],
        ],
        examplesKicker: "真实案例，而不是抽象功能清单",
        examplesTitle: "先看输入和结果，再决定是否开始",
        examplesBody:
          "以下画面均来自当前产品工作区。每个案例都对应一条可继续编辑、转换或导出的真实工作流。",
        allExamples: "全部案例",
        openExample: "查看功能详情",
        processKicker: "一条连续工作流",
        processTitle: "从上传到可编辑乐谱，每个状态都看得见",
        processBody:
          "我们把识别、审阅和转换拆成清楚的阶段。用户知道系统正在做什么，也知道什么时候必须自己判断。",
        workflowKicker: "四步完成一次可信转换",
        workflowTitle: "每一步只做一个明确决定",
        workflow: [
          ["上传来源", "从 PDF、图片、MusicXML、MIDI 或结构化简谱开始。"],
          ["生成候选", "保留来源文件、识别诊断与可追踪的候选版本。"],
          ["核对校正", "对照渲染结果修正音高、时值、调号、歌词与小节。"],
          ["继续使用", "转简谱、移调、播放，或导出 MusicXML、MIDI 与项目快照。"],
        ],
        capabilityKicker: "同一个乐谱项目",
        capabilityTitle: "识别以后，不必在不同工具之间反复搬运",
        capabilityBody:
          "所有后续动作都回到同一份结构化乐谱与版本历史，避免“识别一次、数据丢一次”。",
        learnMore: "查看完整说明",
        useKicker: "为真实场景组织界面",
        useTitle: "教师、编曲者和练习者，都能看到清晰的下一步",
        trustKicker: "可信边界",
        trustTitle: "自动化可靠步骤，明确保留人工复核",
        trustPoints: [
          ["不承诺完美识别", "OMR 和音频转谱都是可编辑候选，复杂排版、低清扫描与多声部内容通常需要校正。"],
          ["格式与项目可带走", "MusicXML 是主要交换格式，Score JSON 快照用于项目备份与迁移。"],
          ["简谱是一等能力", "五线谱与简谱围绕同一结构化模型互相转换，而不是只做不可编辑图片。"],
          ["状态有明确含义", "成功、处理中、需要复核与失败使用不同文案和颜色，不用同一种品牌色混淆。"],
        ],
        priceKicker: "清楚的付费边界",
        priceTitle: "先验证一页，再决定是否继续",
        priceBody: "免费预览用来判断识别质量；更多页数、完整校正与导出按当前部署方案开放。",
        priceAction: "查看当前方案",
        faqKicker: "开始前常见问题",
        faqTitle: "把限制和下一步先说明白",
        faqs: [
          ["识别结果会百分之百准确吗？", "不会。系统产出的是带来源和诊断的候选乐谱，复杂扫描件需要人工核对。"],
          ["支持简谱吗？", "支持。结构化五线谱可以生成简谱，结构化简谱也可以生成五线谱项目。"],
          ["为什么主要使用 MusicXML？", "MusicXML 能保留调号、拍号、声部、歌词和大部分记谱结构，比只输出图片更适合后续编辑与交换。"],
          ["上传后还能继续移调或播放吗？", "可以。候选被接受为项目版本后，可继续移调、练习播放和导出。"],
          ["我的文件会自动公开吗？", "不会。项目文件属于受保护的工作台内容，公开案例使用单独审核过的产品证据。"],
        ],
        finalKicker: "从一页开始",
        finalTitle: "把最难确认的一页，变成可校正乐谱",
        finalBody: "不用先理解所有格式。上传一页、核对结果，再决定是否继续处理整份乐谱。",
        finalSecondary: "查看识别流程",
      }
    : {
        eyebrow: "AI score recognition and structured editing workspace",
        titleLead: "Turn one page of notation into",
        titleAccent: "a score you can keep working on.",
        intro:
          "Upload a PDF or score image, review an OMR candidate, then correct, convert to Jianpu, transpose, play, and export MusicXML in one project.",
        primaryAction: siteConfig.release.productAppAvailable ? "Scan one page free" : "Check launch status",
        secondaryAction: "See real examples",
        primaryNote: "One page is free after registration. Recognition always needs human review.",
        uploadEyebrow: "Start here",
        uploadTitle: "Open the workspace to upload a PDF or image",
        uploadBody: "Continue to the protected score workspace, then choose a local file. This marketing page does not pretend to upload it.",
        uploadAction: siteConfig.release.productAppAvailable ? "Choose a score file" : "Check availability",
        privacy: "Files create your private score project and never become public examples automatically.",
        previewEyebrow: "Real product output",
        previewTitle: "Compare the candidate with the source instead of faking one-click completion",
        previewNote: "Current workspace capture · ready for correction",
        facts: [
          ["Free start", "One page after registration"],
          ["Input", "PDF and common score images"],
          ["Project truth", "Score JSON"],
          ["Interchange", "MusicXML"],
          ["Result", "Candidate + diagnostics + correction"],
        ],
        examplesKicker: "Real examples, not an abstract feature list",
        examplesTitle: "See the input and outcome before you start",
        examplesBody:
          "Every image comes from the current product workspace and maps to a workflow you can continue editing, converting, or exporting.",
        allExamples: "All examples",
        openExample: "Open feature details",
        processKicker: "One continuous workflow",
        processTitle: "See every state from upload to editable score",
        processBody:
          "Recognition, review, and transformation are distinct stages. You can see what the system did and where your judgment is required.",
        workflowKicker: "Four steps to a trustworthy conversion",
        workflowTitle: "One clear decision at each step",
        workflow: [
          ["Upload a source", "Start with PDF, image, MusicXML, MIDI, or structured Jianpu."],
          ["Create a candidate", "Keep the source, diagnostics, and a traceable candidate revision together."],
          ["Review and correct", "Check pitch, duration, key, lyrics, and measures against the rendered score."],
          ["Keep working", "Convert to Jianpu, transpose, play, or export MusicXML, MIDI, and project snapshots."],
        ],
        capabilityKicker: "One score project",
        capabilityTitle: "Recognition is the start, not a dead-end export",
        capabilityBody:
          "Every next action returns to the same structured score and revision history, so data does not disappear between tools.",
        learnMore: "Read the full workflow",
        useKicker: "Interface organized around real work",
        useTitle: "Clear next steps for teachers, arrangers, and learners",
        trustKicker: "Trust boundaries",
        trustTitle: "Automate the reliable. Keep human review explicit.",
        trustPoints: [
          ["No perfect-recognition promise", "OMR and audio transcription produce editable candidates. Dense engraving, weak scans, and polyphony often need correction."],
          ["Portable formats and projects", "MusicXML is the primary interchange format; Score JSON snapshots support backup and migration."],
          ["Jianpu is first-class", "Staff notation and Jianpu share one structured model instead of becoming uneditable images."],
          ["States have distinct meanings", "Success, processing, review, and failure use separate language and colors rather than one ambiguous brand color."],
        ],
        priceKicker: "Clear paid boundaries",
        priceTitle: "Validate one page before you continue",
        priceBody: "Use the free preview to judge recognition quality; more pages, full correction, and exports follow the current deployment plan.",
        priceAction: "See current plan",
        faqKicker: "Questions before starting",
        faqTitle: "Know the limits and next steps",
        faqs: [
          ["Is recognition 100% accurate?", "No. The system produces a candidate with source evidence and diagnostics; difficult scans require review."],
          ["Does it support Jianpu?", "Yes. Structured staff notation can generate Jianpu, and structured Jianpu can create a staff-notation project."],
          ["Why is MusicXML the main format?", "MusicXML preserves keys, meters, parts, lyrics, and notation structure, making it more useful for editing than a flat image."],
          ["Can I transpose or play the result?", "Yes. After accepting a candidate revision, you can transpose, practice with playback, and export."],
          ["Are my uploads public?", "No. Project files live in the protected workspace; public examples use separately reviewed product evidence."],
        ],
        finalKicker: "Start with one page",
        finalTitle: "Turn one difficult page into an editable score",
        finalBody: "You do not need to understand every format first. Upload, inspect the result, then decide whether to process the full score.",
        finalSecondary: "Review the scanner workflow",
      };

  const p1Copy = isChinese
    ? {
        intentKicker: "按任务选择入口",
        intentTitle: "先选择你要完成的工作，不必先理解产品模块",
        intentBody: "三个入口共享同一乐谱工程；当前部署未开放的能力会直接标记为待验证，不把预览误写成已上线。",
        intentAria: "乐谱任务模式",
        modelLabel: "同一 Score JSON 工程",
        exampleEvidence: "查看证据与来源",
        inputLabel: "输入类型",
        outputLabel: "结果意图",
        evidenceLabel: "截取证据",
        capturedLabel: "截取日期",
        rightsLabel: "审核 / 权利",
        playbackKicker: "浅色沉浸演示",
        playbackTitle: "同一段 MusicXML，让移调、声音和光标保持同步",
        playbackBody: "这个演示不使用第三方歌曲。C–D–E–G 来自仓库内可下载的自制 MusicXML，服务器按同一音符生成原调与升高两半音的 WAV。",
        playbackAria: "原调与移调播放版本",
        playback: {
          play: "播放样本",
          pause: "暂停",
          muted: "默认静音",
          unmuted: "声音已开启",
          muteAction: "关闭声音",
          unmuteAction: "开启声音",
          tempo: "播放速度",
          currentNote: "当前音符",
          idle: "尚未播放",
          sample: "可复现自制样本",
          sampleNote: "MusicXML、移调音名与 WAV 使用同一四音乐句",
          revisionLabel: "修订",
          inputDownload: "下载源 MusicXML",
          audioDownload: "下载当前 WAV",
          error: "音频未能载入，可下载 WAV 后检查。",
        },
        proofKicker: "状态与能力边界",
        proofTitle: "颜色只是提示，文字和下一步才说明状态",
        proofBody: `公开内容更新于 ${publicContentLastUpdated}。复杂谱例未完成生产审核前保持“待复核”，不会用通用截图代替证据。`,
        boundaryTitle: "复杂谱与导出验证矩阵",
        accessTitle: "免费预览与工程工作区得到什么",
        accessNote: "具体开通价格和生产可用性以当前部署状态为准。",
      }
    : {
        intentKicker: "Choose by task",
        intentTitle: "Start with the job you need to finish, not a product-module map",
        intentBody: "All three entries return to one score project. Capabilities not open in this deployment are labeled pending rather than presented as live.",
        intentAria: "Score task modes",
        modelLabel: "One Score JSON project",
        exampleEvidence: "View evidence and source",
        inputLabel: "Input",
        outputLabel: "Outcome",
        evidenceLabel: "Capture evidence",
        capturedLabel: "Captured",
        rightsLabel: "Review / rights",
        playbackKicker: "Light immersive demo",
        playbackTitle: "Transposition, sound, and cursor stay in sync",
        playbackBody: "This demo uses no third-party song. C–D–E–G comes from the downloadable repository example, and the server renders both the source and two-semitone WAV from the same notes.",
        playbackAria: "Source and transposed playback revisions",
        playback: {
          play: "Play sample",
          pause: "Pause",
          muted: "Muted by default",
          unmuted: "Sound on",
          muteAction: "Mute sound",
          unmuteAction: "Turn sound on",
          tempo: "Playback speed",
          currentNote: "Current note",
          idle: "Not playing",
          sample: "Reproducible self-authored sample",
          sampleNote: "MusicXML, transposed note names, and WAV share one four-note phrase",
          revisionLabel: "Revision",
          inputDownload: "Download source MusicXML",
          audioDownload: "Download current WAV",
          error: "Audio could not load. Download the WAV to inspect it.",
        },
        proofKicker: "States and capability boundaries",
        proofTitle: "Use color as a cue, not the whole message",
        proofBody: `Public content updated ${publicContentLastUpdated}. Complex examples remain under review until production evidence is approved.`,
        boundaryTitle: "Complex-score and export verification matrix",
        accessTitle: "What the free preview and project workspace deliver",
        accessNote: "Exact price and production availability follow the current deployment status.",
      };

  const exampleDefinitions = [
    {
      slug: "pdf-score-scanner",
      title: isChinese ? "PDF / 图片识谱" : "PDF and image recognition",
      eyebrow: isChinese ? "扫描输入" : "Scan input",
      summary: isChinese ? "把来源文件、识别诊断和可校正候选放在同一视图。" : "Keep the source, diagnostics, and correctable candidate in one view.",
      category: "recognize",
      categoryLabel: isChinese ? "识别" : "Recognition",
    },
    {
      slug: "staff-to-jianpu",
      title: isChinese ? "五线谱转简谱" : "Staff notation to Jianpu",
      eyebrow: isChinese ? "双向转换" : "Two-way conversion",
      summary: isChinese ? "由结构化音符生成简谱，保留调号、拍号与小节语义。" : "Generate Jianpu from structured notes while preserving key, meter, and measures.",
      category: "convert",
      categoryLabel: isChinese ? "转换" : "Conversion",
    },
    {
      slug: "transpose-score",
      title: isChinese ? "整谱移调" : "Structured transposition",
      eyebrow: isChinese ? "版本变换" : "Revision transform",
      summary: isChinese ? "按半音、目标调或移调乐器生成可追踪的新版本。" : "Create a traceable revision by semitone, target key, or transposing instrument.",
      category: "transform",
      categoryLabel: isChinese ? "处理" : "Transform",
    },
    {
      slug: "score-editor",
      title: isChinese ? "在线校正" : "Browser score correction",
      eyebrow: isChinese ? "人工复核" : "Human review",
      summary: isChinese ? "选中错误音符，修正音高、时值与结构，并保留版本。" : "Select mistakes, correct pitch, duration, and structure, and keep the revision.",
      category: "edit",
      categoryLabel: isChinese ? "编辑" : "Editing",
    },
    {
      slug: "score-to-audio",
      title: isChinese ? "练习播放与音频" : "Practice playback and audio",
      eyebrow: isChinese ? "听觉核对" : "Aural review",
      summary: isChinese ? "用播放、速度和循环区间辅助核对与练习。" : "Use playback, tempo, and loop ranges for checking and rehearsal.",
      category: "practice",
      categoryLabel: isChinese ? "练习" : "Practice",
    },
    {
      slug: "musicxml-midi",
      title: isChinese ? "MusicXML / MIDI 导入导出" : "MusicXML and MIDI exchange",
      eyebrow: isChinese ? "开放格式" : "Open formats",
      summary: isChinese ? "在常见结构化格式与项目快照之间交换，减少工具锁定。" : "Move between common structured formats and project snapshots with less lock-in.",
      category: "export",
      categoryLabel: isChinese ? "导出" : "Export",
    },
  ] as const;

  const examples: HomeExample[] = exampleDefinitions.map((definition) => {
    const { page, record } = requireFeature(definition.slug);
    return {
      ...definition,
      status: localizedFeatureStatus(page, isChinese),
      mediaRatio: definition.slug === "pdf-score-scanner" || definition.slug === "score-editor" ? "wide" : "landscape",
      inputLabel: p1Copy.inputLabel,
      outputLabel: p1Copy.outputLabel,
      evidenceLabel: p1Copy.evidenceLabel,
      evidence: record.screenshot.evidence,
      capturedLabel: p1Copy.capturedLabel,
      capturedAt: record.screenshot.capturedAt,
      rightsLabel: p1Copy.rightsLabel,
      reviewLabel: isChinese
        ? `ScoreTransposer 自制测试数据 · ${record.review.status === "approved" ? "已审核" : "事实审核中"}`
        : `ScoreTransposer self-authored test data · ${record.review.status.replace("_", " ")}`,
      image: publicImage(
        record.screenshot,
        isChinese ? `${definition.title}的真实产品界面` : record.screenshot.alt,
      ),
    };
  });

  const scanner = requireFeature("pdf-score-scanner");
  const staffToJianpu = requireFeature("staff-to-jianpu");
  const editor = requireFeature("score-editor");
  const transposer = requireFeature("transpose-score");
  const playback = requireFeature("score-to-audio");
  const exchange = requireFeature("musicxml-midi");

  const intentFeatures = [
    {
      id: "scan",
      feature: scanner,
      label: isChinese ? "扫描识谱" : "Scan a score",
      eyebrow: isChinese ? "PDF / 图片 → 可校正候选" : "PDF / image → correctable candidate",
      title: isChinese ? "先保留原图和诊断，再进入人工校正" : "Preserve the source and diagnostics before correction",
      body: isChinese ? "适合从纸质谱、扫描 PDF 或乐谱照片开始。" : "Use this when starting from paper notation, a scanned PDF, or a score image.",
      input: isChinese ? "PDF / 图片" : "PDF / image",
      output: isChinese ? "OMR 候选 + 诊断" : "OMR candidate + diagnostics",
    },
    {
      id: "jianpu",
      feature: staffToJianpu,
      label: isChinese ? "五线谱转简谱" : "Convert to Jianpu",
      eyebrow: isChinese ? "结构化五线谱 → 简谱" : "Structured staff → Jianpu",
      title: isChinese ? "调号、拍号、时值和歌词继续属于同一工程" : "Keep key, meter, duration, and lyrics in one project",
      body: isChinese ? "适合教学、排练与中文市场的简谱交付。" : "Use this for teaching, rehearsal, and numbered-notation delivery.",
      input: isChinese ? "确认后的五线谱" : "Accepted staff revision",
      output: isChinese ? "可再生成的简谱" : "Regenerable Jianpu",
    },
    {
      id: "transpose",
      feature: transposer,
      label: isChinese ? "移调与练习" : "Transpose and practice",
      eyebrow: isChinese ? "当前修订 → 新调版本" : "Current revision → new key",
      title: isChinese ? "新调号、音符和练习音频一起更新" : "Update key, notes, and practice audio together",
      body: isChinese ? "适合移调乐器、歌手音域和分声部练习。" : "Use this for transposing instruments, vocal ranges, and part rehearsal.",
      input: isChinese ? "当前 Score JSON" : "Current Score JSON",
      output: isChinese ? "新修订 + 播放" : "New revision + playback",
    },
  ];

  const intents: HomeIntent[] = intentFeatures.map(({ feature, ...intent }) => ({
    ...intent,
    status: localizedFeatureStatus(feature.page, isChinese),
    statusTone: isFeatureAvailable(feature.page) ? "ready" : "pending",
    href: feature.page.canonical,
    action: isChinese ? "查看该工作流" : "Open this workflow",
  }));

  const playbackTracks: PlaybackTrack[] = [
    {
      id: "source-c",
      label: isChinese ? "原始修订" : "Source revision",
      keyLabel: isChinese ? "C 大调 · 4/4" : "C major · 4/4",
      revision: "rev-source-c",
      audioSrc: "/examples/score-to-audio/output?semitones=0",
      notes: [
        { name: "C4", degree: "1", y: 58 },
        { name: "D4", degree: "2", y: 52 },
        { name: "E4", degree: "3", y: 46 },
        { name: "G4", degree: "5", y: 34 },
      ],
    },
    {
      id: "transpose-d",
      label: isChinese ? "移调修订" : "Transposed revision",
      keyLabel: isChinese ? "D 大调 · +2 半音" : "D major · +2 semitones",
      revision: "rev-transpose-d",
      audioSrc: "/examples/score-to-audio/output?semitones=2",
      notes: [
        { name: "D4", degree: "1", y: 52 },
        { name: "E4", degree: "2", y: 46 },
        { name: "F♯4", degree: "3", y: 40 },
        { name: "A4", degree: "5", y: 28 },
      ],
    },
  ];

  const statusLegend = isChinese
    ? [
        ["ready", "已验证", "当前部署和真实样本均已通过。"],
        ["progress", "处理中", "任务正在运行，保留进度和来源。"],
        ["review", "需要复核", "已有候选，但必须核对不确定位置。"],
        ["error", "需要处理", "明确错误原因，并提供重试或支持入口。"],
      ]
    : [
        ["ready", "Verified", "The current deployment and real sample both passed."],
        ["progress", "Processing", "The job is running while progress and source stay visible."],
        ["review", "Review required", "A candidate exists, but uncertain positions need review."],
        ["error", "Action required", "Explain the error and provide retry or support."],
      ];

  const boundaryRows = isChinese
    ? [
        ["单旋律四分音符", "已验证", "自制 MusicXML、移调与 WAV 可下载复现", "ready"],
        ["钢琴双谱表 / 多页", "样本审核中", "产品引擎有覆盖，首页尚无许可与生产审核齐全的案例", "review"],
        ["SATB / 多声部合唱", "待生产验证", "不使用普通单谱表截图冒充多声部证明", "pending"],
        ["歌词、和弦与复杂符号", "结构支持待视觉校核", "需要带来源的真实谱面逐符号验收", "review"],
        ["MusicXML / MIDI", "核心路径", "结构化交换已实现；MIDI 记谱仍需人工修整", "ready"],
        ["PDF / PNG / WAV / MP3", "按部署能力开放", "渲染与高质量音频依赖服务器工具链", "pending"],
      ]
    : [
        ["Single-line quarter-note phrase", "Verified", "Self-authored MusicXML, transpose, and WAV are reproducible", "ready"],
        ["Piano grand staff / multi-page", "Sample review in progress", "Engine coverage exists; licensed production evidence is not complete", "review"],
        ["SATB / multi-part choir", "Production check pending", "A single-staff screenshot is not used as false polyphonic proof", "pending"],
        ["Lyrics, chords, and complex symbols", "Visual review required", "A sourced score must pass symbol-by-symbol review", "review"],
        ["MusicXML / MIDI", "Core path", "Structured exchange exists; MIDI engraving still needs correction", "ready"],
        ["PDF / PNG / WAV / MP3", "Deployment dependent", "Rendering and high-quality audio require server tools", "pending"],
      ];

  const accessRows = isChinese
    ? [
        ["识别范围", "1 页 PDF 或 1 张乐谱图片", "更多页数与完整工程"],
        ["结果", "五线谱候选 + 基础诊断", "校正修订、简谱、移调与历史"],
        ["导出", "先判断候选质量", "MusicXML、MIDI 与已配置的渲染/音频格式"],
        ["责任边界", "仍需人工核对", "保留来源、诊断和每次修订"],
      ]
    : [
        ["Recognition", "One PDF page or one score image", "More pages and a full project"],
        ["Outcome", "Staff candidate with basic diagnostics", "Corrected revisions, Jianpu, transpose, and history"],
        ["Export", "Judge candidate quality first", "MusicXML, MIDI, and configured render/audio formats"],
        ["Review boundary", "Human review is still required", "Keep source, diagnostics, and every revision"],
      ];

  const processStages: HomeProcessStage[] = [
    {
      id: "source",
      label: isChinese ? "导入来源" : "Import source",
      eyebrow: isChinese ? "阶段一 · 保留原始证据" : "Stage one · preserve source evidence",
      title: isChinese ? "上传以后，来源文件仍然是核对依据" : "The original file remains available after upload",
      body: isChinese
        ? "系统为来源文件创建项目与处理任务，不把 PDF 或图片误当成最终可编辑乐谱。"
        : "The system creates a project and processing job without pretending the PDF or image is already an editable score.",
      note: isChinese ? "输入、任务状态和错误信息均可追踪" : "Input, job state, and errors remain traceable",
      image: publicImage(scanner.record.screenshot),
    },
    {
      id: "candidate",
      label: isChinese ? "审阅候选" : "Review candidate",
      eyebrow: isChinese ? "阶段二 · 人机共同确认" : "Stage two · human review",
      title: isChinese ? "识别结果是候选版本，不是不可质疑的答案" : "Recognition creates a candidate, not an unquestionable answer",
      body: isChinese
        ? "用谱面预览与诊断定位可疑小节，再在结构化编辑器里修正，而不是重新从头制作。"
        : "Use the score preview and diagnostics to locate uncertain measures, then correct them in the structured editor.",
      note: isChinese ? "每次接受或修改都会形成可追踪版本" : "Accepted changes create traceable revisions",
      image: publicImage(editor.record.screenshot),
    },
    {
      id: "continue",
      label: isChinese ? "继续使用" : "Keep working",
      eyebrow: isChinese ? "阶段三 · 同一项目继续" : "Stage three · continue in one project",
      title: isChinese ? "校正后的乐谱直接进入简谱、移调与导出" : "The corrected score continues into Jianpu, transposition, and export",
      body: isChinese
        ? "所有功能读取同一份 Score JSON，以 MusicXML 交换，减少重复上传和格式断层。"
        : "Every feature reads the same Score JSON and exchanges MusicXML, reducing repeated uploads and format gaps.",
      note: isChinese ? "简谱与五线谱共享同一结构化来源" : "Jianpu and staff notation share one structured source",
      image: publicImage(staffToJianpu.record.screenshot),
    },
  ];

  const capabilityCards = [staffToJianpu, editor, transposer, playback, exchange, scanner];
  const capabilityCopy: Record<string, { title: [string, string]; body: [string, string] }> = {
    "staff-to-jianpu": {
      title: ["五线谱与简谱互转", "Staff and Jianpu conversion"],
      body: ["从同一份结构化音符生成五线谱或简谱，并保留调号、拍号、歌词与小节关系。", staffToJianpu.page.description],
    },
    "score-editor": {
      title: ["结构化校正", "Structured correction"],
      body: ["直接修改音高、时值和记谱属性；每次重要修改都可以形成新版本。", editor.page.description],
    },
    "transpose-score": {
      title: ["移调与新版本", "Transposition revisions"],
      body: ["按半音、目标调或移调乐器转换，并把结果保存为可回溯版本。", transposer.page.description],
    },
    "score-to-audio": {
      title: ["播放与练习音频", "Playback and practice audio"],
      body: ["通过速度、循环和声部设置播放乐谱，并生成可重复的练习素材。", playback.page.description],
    },
    "musicxml-midi": {
      title: ["开放格式导入导出", "Open-format exchange"],
      body: ["使用 MusicXML 交换、MIDI 导入导出和 Score JSON 快照，降低格式锁定。", exchange.page.description],
    },
    "pdf-score-scanner": {
      title: ["PDF / 图片识谱", "PDF and image recognition"],
      body: ["把扫描件作为 OMR 来源，保留诊断、置信信息与可进入校正的候选版本。", scanner.page.description],
    },
  };

  const useCases = [
    {
      slug: "teaching",
      title: isChinese ? "教师：先校正，再布置练习" : "Teachers: correct before assigning",
      body: isChinese ? "以教师确认过的版本创建分享、任务与反馈，避免把识别错误直接交给学生。" : "Create sharing, assignments, and feedback from a teacher-approved revision.",
    },
    {
      slug: "staff-to-jianpu",
      title: isChinese ? "编曲者：保留结构再转换" : "Arrangers: preserve structure while converting",
      body: isChinese ? "在五线谱、简谱、移调与 MusicXML 之间工作，不把成果压扁成图片。" : "Work across staff, Jianpu, transposition, and MusicXML without flattening the result.",
    },
    {
      slug: "score-to-audio",
      title: isChinese ? "练习者：边看、边听、边循环" : "Learners: see, hear, and loop",
      body: isChinese ? "用速度、循环和声部控制练习，并通过听觉发现可能的识别错误。" : "Practice with tempo, loops, and parts while using playback to catch possible errors.",
    },
  ].map((item) => ({ ...item, feature: requireFeature(item.slug) }));

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.siteName,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    url: siteConfig.siteUrl,
    description: siteConfig.description,
    featureList: [
      "PDF and image optical music recognition",
      "Structured score correction",
      "Staff notation and Jianpu conversion",
      "Score transposition",
      "MusicXML and MIDI exchange",
      "Practice playback and audio export",
    ],
  };

  return (
    <div className="home-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />

      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-stage-container home-hero-grid">
          <div className="home-hero-copy">
            <p className="home-kicker"><SparkIcon width={17} height={17} />{copy.eyebrow}</p>
            <h1 id="home-title">
              <span>{copy.titleLead}{isChinese ? "" : " "}</span>
              <strong>{copy.titleAccent}</strong>
            </h1>
            <p className="home-hero-intro">{copy.intro}</p>
            <div className="home-action-row">
              <a href={startUrl} className="home-button primary">
                {copy.primaryAction}
                <ArrowNorthEastIcon width={18} height={18} />
              </a>
              <a href="#examples" className="home-button secondary">{copy.secondaryAction}</a>
            </div>
            <p className="home-action-note"><CheckSealIcon width={17} height={17} />{copy.primaryNote}</p>
          </div>

          <div className="home-hero-product" aria-label={copy.previewEyebrow}>
            <a className="home-upload-card" href={startUrl}>
              <span className="home-upload-icon"><UploadIcon width={25} height={25} /></span>
              <span className="home-upload-copy">
                <small>{copy.uploadEyebrow}</small>
                <strong>{copy.uploadTitle}</strong>
                <span>{copy.uploadBody}</span>
              </span>
              <span className="home-upload-action">{copy.uploadAction}<ArrowNorthEastIcon width={16} height={16} /></span>
              <span className="home-format-row" aria-label={isChinese ? "支持格式" : "Supported formats"}>
                <span>PDF</span><span>PNG</span><span>JPG</span><span>WEBP</span><span>TIFF</span>
              </span>
              <span className="home-upload-privacy"><CheckSealIcon width={15} height={15} />{copy.privacy}</span>
            </a>

            <div className="home-preview-card">
              <div className="home-media-toolbar" aria-hidden="true">
                <span /><span /><span /><strong>ScoreTransposer</strong>
              </div>
              <div className="home-preview-image">
                <Image
                  src="/product/feature-score-editor-real.png"
                  width={1425}
                  height={891}
                  alt={isChinese ? "ScoreTransposer 当前浅色乐谱编辑工作区实拍" : "Current light ScoreTransposer score editor workspace"}
                  priority
                  sizes="(max-width: 720px) calc(100vw - 20px), calc(100vw - 64px)"
                />
              </div>
              <div className="home-preview-caption">
                <span><small>{copy.previewEyebrow}</small><strong>{copy.previewTitle}</strong></span>
                <em>{copy.previewNote}</em>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="home-fact-strip" aria-label={isChinese ? "产品事实" : "Product facts"}>
        <div className="home-container">
          {copy.facts.map(([label, value]) => (
            <div key={label}><span>{label}</span><strong>{value}</strong></div>
          ))}
        </div>
      </div>

      <section className="home-section home-intent-section" aria-labelledby="intent-title">
        <div className="home-container">
          <div className="home-section-heading is-split">
            <div><p className="home-kicker">{p1Copy.intentKicker}</p><h2 id="intent-title">{p1Copy.intentTitle}</h2></div>
            <p>{p1Copy.intentBody}</p>
          </div>
          <HomeIntentSwitcher
            intents={intents}
            initialIntent={initialIntent}
            modelLabel={p1Copy.modelLabel}
            ariaLabel={p1Copy.intentAria}
          />
        </div>
      </section>

      <section id="examples" className="home-section">
        <div className="home-stage-container">
          <div className="home-section-heading is-split">
            <div><p className="home-kicker">{copy.examplesKicker}</p><h2>{copy.examplesTitle}</h2></div>
            <p>{copy.examplesBody}</p>
          </div>
          <HomeExampleGallery
            examples={examples}
            allLabel={copy.allExamples}
            openLabel={copy.openExample}
            evidenceToggleLabel={p1Copy.exampleEvidence}
            initialCategory={initialCategory}
          />
        </div>
      </section>

      <section className="home-section is-soft" aria-labelledby="process-title">
        <div className="home-stage-container">
          <div className="home-section-heading centered">
            <p className="home-kicker">{copy.processKicker}</p>
            <h2 id="process-title">{copy.processTitle}</h2>
            <p>{copy.processBody}</p>
          </div>
          <HomeProcessShowcase stages={processStages} />
        </div>
      </section>

      <section id="workflow" className="home-section" aria-labelledby="workflow-title">
        <div className="home-container">
          <div className="home-section-heading centered compact">
            <p className="home-kicker">{copy.workflowKicker}</p>
            <h2 id="workflow-title">{copy.workflowTitle}</h2>
          </div>
          <ol className="home-workflow-grid">
            {copy.workflow.map(([title, body], index) => (
              <li key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="home-section home-playback-section" aria-labelledby="playback-demo-title">
        <div className="home-stage-container">
          <div className="home-section-heading is-split">
            <div><p className="home-kicker">{p1Copy.playbackKicker}</p><h2 id="playback-demo-title">{p1Copy.playbackTitle}</h2></div>
            <p>{p1Copy.playbackBody}</p>
          </div>
          <HomePlaybackDemo tracks={playbackTracks} copy={p1Copy.playback} ariaLabel={p1Copy.playbackAria} />
        </div>
      </section>

      <section className="home-section is-tint" aria-labelledby="capability-title">
        <div className="home-container">
          <div className="home-section-heading is-split">
            <div><p className="home-kicker">{copy.capabilityKicker}</p><h2 id="capability-title">{copy.capabilityTitle}</h2></div>
            <p>{copy.capabilityBody}</p>
          </div>
          <div className="home-capability-grid">
            {capabilityCards.map(({ page }, index) => (
              <article key={page.slug} className={index === 0 || index === 3 ? "is-wide" : undefined}>
                <span className="home-capability-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="home-status-chip">{localizedFeatureStatus(page, isChinese)}</span>
                <h3>{capabilityCopy[page.slug]?.title[isChinese ? 0 : 1] ?? page.title}</h3>
                <p>{capabilityCopy[page.slug]?.body[isChinese ? 0 : 1] ?? page.description}</p>
                <Link href={page.canonical}>{copy.learnMore}<ArrowNorthEastIcon width={15} height={15} /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="use-cases" className="home-section" aria-labelledby="use-cases-title">
        <div className="home-stage-container">
          <div className="home-section-heading centered compact">
            <p className="home-kicker">{copy.useKicker}</p>
            <h2 id="use-cases-title">{copy.useTitle}</h2>
          </div>
          <div className="home-use-grid">
            {useCases.map((item) => (
              <article key={item.slug}>
                <Link href={item.feature.page.canonical} className="home-use-media">
                  <Image
                    src={item.feature.record.screenshot.src}
                    width={item.feature.record.screenshot.width}
                    height={item.feature.record.screenshot.height}
                    alt={isChinese ? `${item.title}的真实产品界面` : item.feature.record.screenshot.alt}
                    sizes="(max-width: 760px) calc(100vw - 20px), (max-width: 1100px) 45vw, 31vw"
                  />
                </Link>
                <div><h3>{item.title}</h3><p>{item.body}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {testimonials.length > 0 ? (
        <section className="home-section is-soft" aria-labelledby="testimonial-title">
          <div className="home-container">
            <div className="home-section-heading centered compact">
              <p className="home-kicker">{isChinese ? "经过授权的真实反馈" : "Permissioned customer evidence"}</p>
              <h2 id="testimonial-title">{isChinese ? "每一条评价都保留来源和书面许可" : "Every quote keeps its source and written permission"}</h2>
            </div>
            <div className="home-testimonial-grid">
              {testimonials.map((testimonial) => (
                <figure key={testimonial.id}>
                  <blockquote>“{testimonial.quote[locale]}”</blockquote>
                  <figcaption>
                    <strong>{testimonial.person}</strong>
                    <span>{testimonial.role[locale]} · {testimonial.sourceLabel}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="home-section home-proof-section" aria-labelledby="proof-title">
        <div className="home-container">
          <div className="home-section-heading is-split">
            <div><p className="home-kicker">{p1Copy.proofKicker}</p><h2 id="proof-title">{p1Copy.proofTitle}</h2></div>
            <p>{p1Copy.proofBody}</p>
          </div>

          <div className="home-state-legend" aria-label={isChinese ? "状态图例" : "Status legend"}>
            {statusLegend.map(([tone, title, body]) => (
              <article key={tone} className={`is-${tone}`}>
                <span aria-hidden="true" />
                <div><h3>{title}</h3><p>{body}</p></div>
              </article>
            ))}
          </div>

          <div className="home-proof-grid">
            <div className="home-boundary-card">
              <h3>{p1Copy.boundaryTitle}</h3>
              <div className="home-boundary-list">
                {boundaryRows.map(([name, status, evidence, tone]) => (
                  <article key={name}>
                    <div><strong>{name}</strong><span className={`is-${tone}`}>{status}</span></div>
                    <p>{evidence}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="home-access-card">
              <h3>{p1Copy.accessTitle}</h3>
              <div className="home-access-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">{isChinese ? "对比项" : "Outcome"}</th>
                      <th scope="col">{isChinese ? "免费预览" : "Free preview"}</th>
                      <th scope="col">{isChinese ? "工程工作区" : "Project workspace"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accessRows.map(([label, free, project]) => (
                      <tr key={label}><th scope="row">{label}</th><td>{free}</td><td>{project}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>{p1Copy.accessNote}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section is-soft" aria-labelledby="trust-title">
        <div className="home-container home-trust-grid">
          <div className="home-trust-heading">
            <span className="home-trust-icon"><FileStackIcon width={27} height={27} /></span>
            <p className="home-kicker">{copy.trustKicker}</p>
            <h2 id="trust-title">{copy.trustTitle}</h2>
          </div>
          <div className="home-trust-list">
            {copy.trustPoints.map(([title, body]) => (
              <article key={title}><CheckSealIcon width={20} height={20} /><div><h3>{title}</h3><p>{body}</p></div></article>
            ))}
          </div>
        </div>
      </section>

      {siteConfig.release.checkoutAvailable ? (
        <section className="home-section" aria-labelledby="price-title">
          <div className="home-container home-price-card">
            <div><p className="home-kicker">{copy.priceKicker}</p><h2 id="price-title">{copy.priceTitle}</h2><p>{copy.priceBody}</p></div>
            <a className="home-button primary" href={checkoutUrl}>{copy.priceAction}<ArrowNorthEastIcon width={18} height={18} /></a>
          </div>
        </section>
      ) : null}

      <section id="faq" className="home-section" aria-labelledby="faq-title">
        <div className="home-container home-faq-grid">
          <div className="home-section-heading compact">
            <p className="home-kicker">{copy.faqKicker}</p>
            <h2 id="faq-title">{copy.faqTitle}</h2>
          </div>
          <div className="home-faq-list">
            {copy.faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}<span aria-hidden="true">+</span></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="home-final-section">
        <div className="home-container home-final-card">
          <div>
            <p className="home-kicker">{copy.finalKicker}</p>
            <h2>{copy.finalTitle}</h2>
            <p>{copy.finalBody}</p>
          </div>
          <div className="home-action-row">
            <a href={startUrl} className="home-button primary">{copy.primaryAction}<ArrowNorthEastIcon width={18} height={18} /></a>
            <Link href="/pdf-score-scanner" className="home-button secondary">{copy.finalSecondary}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
