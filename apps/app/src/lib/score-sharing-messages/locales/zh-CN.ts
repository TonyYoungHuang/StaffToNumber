import type { ScoreSharingMessages } from "../types";

export const zhCNScoreSharingMessages = {
  viewer: {
    loading: "正在加载分享乐谱...", missing: "此分享链接不可用或已撤销。", back: "打开工作台", shared: "分享乐谱",
    revision: "当前修订", preview: "五线谱预览", previewEmpty: "此分享暂时没有可渲染的 MusicXML。", previewLoading: "正在渲染五线谱...",
    previewError: "无法渲染五线谱预览。", previewRetry: "重新尝试渲染", previewTechnicalDetails: "技术详情", previewDeferred: "此乐谱较大。需要 OSMD 对照视图时再加载完整 MusicXML 预览。", previewRender: "加载完整预览", previewEventLabel: "{part} · 第 {measure} 小节 · 第 {number} 个{type}", previewNote: "音符", previewRest: "休止符",
    jianpu: "简谱预览", summary: "结构化摘要", parts: "声部", measures: "小节", notes: "音符", rests: "休止符",
    musicXmlEyebrow: "MusicXML", jianpuEyebrow: "简谱", scoreJsonEyebrow: "Score JSON", assignmentScoreFailed: "无法加载作业指定的乐谱版本。",
    assignmentScoreShown: "正在显示作业乐谱版本 {version}。", loadingAria: "分享乐谱加载状态",
  },
  assignments: {
    title: "练习作业", statuses: { open: "进行中", archived: "已归档" }, dueAt: "截止时间", noDue: "无截止时间", submitterName: "姓名", submitterContact: "联系方式",
    practiceMinutes: "练习分钟数", recordingUrl: "录音/视频链接", performanceFile: "上传演奏文件", performanceFileHint: "支持音频或常见视频文件，最大 100 MB",
    performanceFileAria: "选择音频或视频演奏文件", note: "练习备注", namePlaceholder: "请输入你的姓名", nameRequired: "请先填写姓名再提交。",
    contactPlaceholder: "邮箱、电话或老师要求的联系方式", recordingPlaceholder: "https://...", rubric: "评分细则", rubricEmpty: "未设置评分细则。",
    notePlaceholder: "写下练习速度、难点、完成范围或想问老师的问题...", submit: "提交作业", submitting: "正在提交...",
    submitSuccess: "作业已提交，老师可以在乐谱工程中审阅。", submitFailed: "作业提交失败。", practicePreset: "练习预设", submittedPractice: "提交时的练习设置",
    loadScore: "应用练习预设", loadingScore: "正在加载乐谱版本...", statusAria: "作业提交状态",
  },
  practice: { tempo: "{tempo} BPM", loop: "循环 {start}–{end}", fullScore: "整首乐谱", solo: "独奏 {parts}", mute: "静音 {parts}", allParts: "全部声部", metronome: "节拍器", countIn: "预备拍" },
  reviews: {
    title: "我的提交反馈", statuses: { submitted: "已提交", reviewed: "已审阅" }, feedback: "老师反馈", timedFeedback: "演奏时间点反馈", performanceFile: "我的演奏文件",
    loadPerformancePreview: "加载演奏回放", loadingPerformancePreview: "正在加载回放...", performancePreviewFailed: "无法加载演奏回放。", seekTimedFeedback: "跳到此时间点",
    grade: "评分", waiting: "等待老师审阅。", empty: "提交作业后，老师的反馈会显示在这里。", playbackAria: "已提交的演奏回放",
  },
  annotations: {
    eyebrow: "乐谱批注", titles: { comment: "评论者工作区", edit: "协作批注" },
    body: "在下方乐谱中选择音符，即可添加精确批注。链接身份由乐谱所有者命名，只能证明访问者持有该链接，并非已验证的个人身份。",
    score: "整份乐谱", selection: "所选音符", noSelection: "请先在乐谱中选择一个音符", placeholder: "描述修改建议、练习要点或问题", post: "发布批注", posting: "正在发布...",
    posted: "批注已发布。", failed: "无法发布批注。", empty: "还没有批注。", identities: { account: "账号身份", share_link: "链接身份" }, resolved: "已解决", locate: "在乐谱中定位",
    measure: "小节", targetModeAria: "批注目标", statusAria: "批注发布状态", listAria: "乐谱批注",
  },
  collaboration: {
    title: "多人实时协作 Beta", note: "共享排练备注", noteAria: "共享排练备注", online: "在线成员（显示名称未经验证）", operations: "最近的乐谱操作", conflicts: "并发冲突",
    noOperations: "等待第一条乐谱编辑操作。", revision: "修订", targets: "{count} 个目标", identities: { account: "账号身份", share_link: "链接身份", unverified: "未验证的广播身份" },
    statuses: { disconnected: "已断开", connecting: "正在连接", connected: "已连接" }, roles: { owner: "所有者", editor: "编辑者", commenter: "评论者", viewer: "查看者" },
    collaborator: "协作者", currentUser: "当前用户", operationTypes: { note_edit: "编辑音符", measure_edit: "编辑小节", part_edit: "编辑声部", transpose: "移调", restore: "恢复修订", candidate_accept: "接受候选", candidate_reject: "拒绝候选", unknown: "乐谱操作" },
    presenceAria: "在线协作者和冲突", operationsAria: "最近的协作操作",
  },
  modes: { major: "大调", minor: "小调", dorian: "多利亚调式", phrygian: "弗里几亚调式", lydian: "利底亚调式", mixolydian: "混合利底亚调式", locrian: "洛克利亚调式" },
} satisfies ScoreSharingMessages;
