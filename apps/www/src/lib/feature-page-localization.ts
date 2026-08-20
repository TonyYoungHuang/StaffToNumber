import type { SupportedLocale } from "@score/shared";
import type { FeatureSeoRecord } from "./feature-seo";
import type { PlatformFeaturePage } from "./platform-feature-pages";

type FeatureTranslation = Pick<PlatformFeaturePage, "title" | "eyebrow" | "description" | "modules" | "workflow" | "details" | "guardrail">;

const zhFeatureTranslations: Record<string, FeatureTranslation> = {
  "staff-to-jianpu": {
    title: "五线谱转简谱",
    eyebrow: "从五线谱生成数字简谱",
    description: "从同一个结构化乐谱工程生成简谱，并继续完成在线编辑、播放、移调和开放格式导出。",
    modules: ["Score JSON 乐谱结构", "简谱生成器", "MusicXML 预览", "导出中心"],
    workflow: [
      { title: "导入或识别乐谱", body: "从 MusicXML、MIDI、简谱文本、Score JSON，或 PDF／图片识别候选稿开始。" },
      { title: "从结构化音符生成简谱", body: "系统读取音高、调号、拍号、歌词与和弦，而不是直接处理 PDF 图片文字。" },
      { title: "导出或继续编辑", body: "下载简谱文本、重新生成五线谱、移调，或制作 MIDI 与练习音频。" },
    ],
    details: [
      { title: "适配中文乐谱使用习惯", body: "保留调式、音级、八度点、时值线、歌词、小节分组与和弦标记。" },
      { title: "同一个乐谱工程反复使用", body: "生成的简谱可以和 MusicXML、MIDI、乐谱图片及 Score JSON 备份一起保存。" },
    ],
    guardrail: "该功能转换结构化五线谱，不承诺从任意扫描简谱图片中直接得到完全正确的结果。",
  },
  "jianpu-to-staff": {
    title: "简谱转五线谱",
    eyebrow: "从数字简谱生成五线谱",
    description: "粘贴结构化简谱文本，生成可编辑的 Score JSON 乐谱，并预览、播放或导出 MusicXML。",
    modules: ["结构化简谱解析", "Score JSON", "MusicXML 导出", "五线谱预览"],
    workflow: [
      { title: "输入结构化简谱", body: "输入或粘贴带调号、拍号、声部、和弦与歌词信息的简谱文本。" },
      { title: "创建乐谱工程", body: "解析结果进入 Score JSON，可继续预览、修正、移调、播放与导出。" },
      { title: "导出五线谱", body: "生成 MusicXML；配置渲染服务后还可导出 PDF、SVG 或 PNG。" },
    ],
    details: [
      { title: "适合中文音乐教学", body: "教师可以从简谱逐步制作五线谱、MIDI 和练习素材。" },
      { title: "优先使用结构化输入", body: "当前版本面向输入或粘贴的简谱文本，图片简谱识别属于后续导入能力。" },
    ],
    guardrail: "简谱转五线谱当前使用结构化文本输入，并非任意扫描简谱图片识别。",
  },
  "transpose-score": {
    title: "在线整谱移调",
    eyebrow: "目标调、半音数与移调乐器声部",
    description: "按半音数、目标调或常见移调乐器创建新的乐谱修订，并在移调后检查音域。",
    modules: ["Score JSON 移调", "目标调模式", "移调乐器预设", "音域诊断"],
    workflow: [
      { title: "打开乐谱工程", body: "使用由 MusicXML、识谱候选、简谱、MIDI 或 Score JSON 创建的结构化乐谱。" },
      { title: "选择移调方式", body: "按半音移动、选择目标调，或为降 B、A、降 E、F 调乐器生成记谱声部。" },
      { title: "检查移调结果", body: "可选音域配置会检查最低音和最高音，并把提示写入新的乐谱版本。" },
    ],
    details: [
      { title: "保留版本历史", body: "每次移调都创建新版本，不会覆盖原谱，方便教师和编曲者比较。" },
      { title: "所有输出重新生成", body: "简谱、MusicXML、MIDI、PDF、图片和练习音频都从移调后的结构重新生成。" },
    ],
    guardrail: "复杂的等音拼写、谱号舒适度与演奏音域仍需人工检查。",
  },
  "score-editor": {
    title: "在线乐谱编辑与校正",
    eyebrow: "五线谱预览与结构化修改",
    description: "通过属性面板修改音符、休止符、调号、拍号、歌词、和弦、力度、连线和小节线。",
    modules: ["五线谱预览", "Score JSON 版本", "校正面板", "历史恢复"],
    workflow: [
      { title: "导入结构化乐谱", body: "从 MusicXML、MIDI、简谱、Score JSON 或已确认的识谱候选稿开始。" },
      { title: "选择并修改内容", body: "编辑音符、休止符、小节属性、和弦、速度、力度、歌词、连线与小节线。" },
      { title: "保存新版本", body: "每次修改保存为新的 Score JSON 修订，随时可以恢复早期版本。" },
    ],
    details: [
      { title: "为识谱校正而设计", body: "扫描识别很难永远完美，因此先修正错误，再播放、转换或导出。" },
      { title: "支持交互式校正", body: "可选择音符、拖动音高与时值、插入、删除并修改结构化属性；完整桌面排版能力仍在持续建设。" },
    ],
    guardrail: "编辑建立在 Score JSON 与 MusicXML 上，不会直接修改 PDF 文字或图片像素。",
  },
  "score-to-audio": {
    title: "乐谱转音频与练习播放",
    eyebrow: "播放、循环与音频导出",
    description: "把结构化乐谱变成浏览器播放及 MIDI、WAV 或 MP3 练习文件，并控制速度、循环、节拍器和声部。",
    modules: ["浏览器播放", "播放时间线", "MIDI 导出", "WAV／MP3 渲染"],
    workflow: [
      { title: "生成播放事件", body: "系统把 Score JSON 转换为包含速度、小节、力度、连音和反复信息的时间事件。" },
      { title: "在浏览器中练习", body: "调节速度、循环范围、节拍器、预备拍、独奏／静音与各声部音量。" },
      { title: "导出练习素材", body: "从固定的乐谱版本和当前练习设置生成可重复的 MIDI、WAV 或 MP3。" },
    ],
    details: [
      { title: "适合合唱与乐队排练", body: "单独播放一个声部、放慢困难小节，并导出练习片段。" },
      { title: "服务器配置完成后提供高质量音频", body: "WAV 与 MP3 需要已配置的 FluidSynth、SoundFont 和 ffmpeg；配置缺失时会明确提示。" },
    ],
    guardrail: "该功能从结构化乐谱生成音频；音视频转谱属于另一项实验性导入能力。",
  },
  "audio-to-score": {
    title: "音视频转五线谱",
    eyebrow: "音频到 MIDI 候选，再到可编辑乐谱",
    description: "上传有权使用的音频或视频，生成 MIDI 与五线谱候选稿，再人工检查并进入可编辑乐谱工程。",
    modules: ["音视频上传", "音频识别任务", "MIDI 候选稿", "乐谱校正"],
    workflow: [
      { title: "上传音视频来源", body: "保存来源文件，并创建与乐谱工程关联的音频识别任务。" },
      { title: "生成 MIDI 候选", body: "识别服务生成 MIDI 文件，并在任务面板保留诊断信息。" },
      { title: "创建可编辑乐谱草稿", body: "候选结果转换为 Score JSON，随后可以预览、校正、转简谱、播放、移调与导出。" },
    ],
    details: [
      { title: "候选稿优先", body: "多声部、伴奏、混响和噪声通常需要人工校正，不把识别草稿当作最终乐谱。" },
      { title: "导入后使用同一工程", body: "候选版本与 MusicXML、MIDI、简谱及图片识谱使用相同的乐谱结构。" },
    ],
    guardrail: "只上传有权使用的音视频，并预留人工检查；网站不承诺商业录音可以自动得到完美乐谱。",
  },
  "musicxml-midi": {
    title: "MusicXML 与 MIDI 乐谱工具",
    eyebrow: "导入、导出与工程备份",
    description: "使用 MusicXML 交换乐谱、Score JSON 保存编辑工程，并支持 MIDI 导入导出与可迁移备份。",
    modules: ["MusicXML 导入导出", "MIDI 导入导出", "Score JSON 快照", "五线谱预览"],
    workflow: [
      { title: "导入开放格式", body: "从 MusicXML、MXL、MIDI 或 Score JSON 创建可重复使用的乐谱工程。" },
      { title: "统一为 Score JSON", body: "播放、简谱、移调、校正和导出都读取同一份结构化模型。" },
      { title: "不被平台锁定", body: "下载 MusicXML、MIDI、简谱文本、渲染文件、音频或 Score JSON 备份。" },
    ],
    details: [
      { title: "保留导入来源", body: "工程元数据会记录乐谱来自 MusicXML、简谱、MIDI 或快照。" },
      { title: "MIDI 导入是结构化草稿", body: "系统提取轨道、速度、拍号、音色、和弦与跨小节连音，结果仍可校正。" },
    ],
    guardrail: "从 MIDI 生成复杂排版仍需要人工检查和校正。",
  },
  "pdf-score-scanner": {
    title: "PDF 与图片乐谱识别",
    eyebrow: "识谱导入与人工校正",
    description: "上传 PDF 或乐谱图片，生成 MusicXML 与 Score JSON 候选稿，并在编辑前检查诊断与识别结果。",
    modules: ["识谱上传", "Audiveris 任务", "MusicXML 输出", "诊断面板"],
    workflow: [
      { title: "上传 PDF 或图片", body: "系统保存来源文件，并创建与乐谱工程关联的识谱任务。" },
      { title: "运行乐谱识别", body: "识别服务生成 MusicXML，并创建可以继续编辑的候选版本。" },
      { title: "校正候选稿", body: "检查诊断、预览乐谱、修正错误，再导出或生成练习素材。" },
    ],
    details: [
      { title: "候选稿而不是最终答案", body: "识别结果保留置信度和诊断信息，方便人工修正。" },
      { title: "免费预览一页", body: "免费账户可以识别一页 PDF 或一张乐谱图片；更多页面和完整导出需要相应权限。" },
    ],
    guardrail: "识谱是“导入加校正”的流程，不承诺所有 PDF 和照片都能自动得到完美结果。",
  },
  teaching: {
    title: "音乐教师作业与反馈",
    eyebrow: "分享、提交、批改与评论",
    description: "分享只读乐谱、布置练习、收集学生提交、批改录音，并使用带时间点的评论和评分标准。",
    modules: ["乐谱分享", "练习作业", "学生提交", "评分标准"],
    workflow: [
      { title: "创建乐谱工程", body: "导入或识别乐谱并完成校正，把教师版本作为统一来源。" },
      { title: "分享并布置任务", body: "创建只读学生链接，填写要求与截止时间，并添加评分标准。" },
      { title: "批改学生提交", body: "学生提交文字、链接、练习时长或演奏文件，教师评分并提供带时间点的反馈。" },
    ],
    details: [
      { title: "学生可轻量提交", body: "初期流程不强制学生登录，并使用私密查询凭证查看反馈。" },
      { title: "支持后续课堂扩展", body: "学生账户、班级文件夹、通知和更丰富的媒体批注将继续扩展。" },
    ],
    guardrail: "当前教学功能以乐谱工程和作业为中心，更完整的课堂角色仍在持续建设。",
  },
  pricing: {
    title: "ScoreTransposer 价格与积分套餐",
    eyebrow: "识谱、转换与工程处理权限",
    description: "先免费识别一页，再按积分套餐继续识谱、校正、简谱转换、移调、播放和完整导出。",
    modules: ["在线付款", "激活码", "账户权限", "付费能力控制"],
    workflow: [
      { title: "选择积分套餐", body: "根据个人处理或批量工作选择月付或年付方案。" },
      { title: "登录并进入付款", body: "账户权限与订单绑定，正式开通的渠道会进入对应收银台。" },
      { title: "使用完整工作流", body: "创建工程、导入来源、校正、移调、播放，并导出确认后的版本。" },
    ],
    details: [
      { title: "付费边界清晰", body: "更多识谱页面、批量任务、完整导出、高质量音频和长期历史记录需要相应权限。" },
      { title: "付款问题可以追踪", body: "结账、激活、上传、任务与导出问题都进入统一支持流程。" },
    ],
    guardrail: "页面价格和可用支付渠道以当前生产环境展示为准。",
  },
};

export function localizeFeaturePage(page: PlatformFeaturePage, locale: SupportedLocale): PlatformFeaturePage {
  const translation = locale === "zh-CN" ? zhFeatureTranslations[page.slug] : undefined;
  return translation ? { ...page, ...translation } : page;
}

export function localizeFeatureEvidence(record: FeatureSeoRecord, locale: SupportedLocale) {
  if (locale !== "zh-CN") return record;
  return {
    ...record,
    screenshot: {
      ...record.screenshot,
      evidence: "来自当前产品工作区的真实功能截图。",
    },
    example: {
      ...record.example,
      notes: "输入和输出都保留在同一个结构化乐谱工程中，复杂结果仍需人工检查。",
    },
  };
}

export function getFeaturePageUi(locale: SupportedLocale) {
  if (locale !== "zh-CN") {
    return {
      home: "Home",
      unavailable: "Pending production verification",
      actions: { upload: "Scan one page free", checkout: "View access options", scores: "Open score projects", unavailable: "Check release availability" },
      pricing: "Pricing",
      moduleEyebrow: "Platform modules",
      moduleTitle: "Built on MusicXML and Score JSON",
      moduleBody: "Each feature page maps back to the same score project model rather than a separate one-off converter.",
      moduleLabel: "Module",
      moduleCardBody: "Connected to the score project workflow.",
      exampleEyebrow: "Real product example",
      exampleTitle: "One score, structured input and reusable output",
      captured: "Captured",
      input: "Input",
      output: "Output",
      downloadInput: "Download input case",
      downloadOutput: "Download output case",
      workflowEyebrow: "Workflow",
      workflowTitle: "How this path works",
      workflowBody: "The public page leads into the authenticated app workflow when users are ready to process a score.",
      detailEyebrow: "Product detail",
      detailTitle: "What to expect",
      faqTitle: (title: string) => `Questions about ${title}`,
      faqBody: "Practical limits and expected workflow for this score tool.",
      faqInput: (title: string) => `What input does ${title} accept?`,
      faqEdit: "Can I edit the result after conversion?",
      faqEditAnswer: "Yes. Successful imports become Score JSON revisions that can be corrected, transposed, played, and exported from the score workspace.",
      faqCheck: "What should I check before relying on the result?",
      relatedEyebrow: "Related workflows",
      relatedTitle: "Continue with the same score project",
      relatedBody: "These pages use the same MusicXML and Score JSON source instead of sending the score through disconnected converters.",
      statuses: { Available: "Available", Beta: "Beta", Preview: "Preview" },
    } as const;
  }

  return {
    home: "首页",
    unavailable: "等待生产环境验证",
    actions: { upload: "免费识别一页", checkout: "查看积分套餐", scores: "打开我的乐谱", unavailable: "查看功能开放状态" },
    pricing: "价格",
    moduleEyebrow: "平台模块",
    moduleTitle: "基于 MusicXML 与 Score JSON",
    moduleBody: "所有功能都回到同一个乐谱工程，而不是互不相通的一次性转换器。",
    moduleLabel: "模块",
    moduleCardBody: "连接到同一个结构化乐谱工作流。",
    exampleEyebrow: "真实产品案例",
    exampleTitle: "一份乐谱，结构化输入并持续复用",
    captured: "截图日期",
    input: "输入",
    output: "输出",
    downloadInput: "下载输入案例",
    downloadOutput: "下载输出案例",
    workflowEyebrow: "使用流程",
    workflowTitle: "这个功能如何使用",
    workflowBody: "了解功能后进入登录工作台，继续处理同一份结构化乐谱。",
    detailEyebrow: "产品说明",
    detailTitle: "使用前需要知道",
    faqTitle: (title: string) => `${title}常见问题`,
    faqBody: "开始处理乐谱前需要了解的能力与边界。",
    faqInput: (title: string) => `${title}支持什么输入？`,
    faqEdit: "转换以后还可以继续编辑吗？",
    faqEditAnswer: "可以。成功导入后会创建 Score JSON 版本，可以继续校正、移调、播放和导出。",
    faqCheck: "依赖结果前需要检查什么？",
    relatedEyebrow: "相关工作流",
    relatedTitle: "继续处理同一个乐谱工程",
    relatedBody: "这些功能使用同一份 MusicXML 与 Score JSON，不会把乐谱反复交给互不相通的转换器。",
    statuses: { Available: "已开放", Beta: "测试版", Preview: "预览版" },
  } as const;
}
