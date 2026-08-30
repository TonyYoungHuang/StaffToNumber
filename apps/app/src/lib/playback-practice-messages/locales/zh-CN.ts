import type { PlaybackPracticeMessages } from "../types";

export const zhCNPlaybackPracticeMessages = {
  playback: {
    eyebrow: "播放练习", title: "Tone.js 分声部练习播放器", body: "从当前 Score JSON 生成可练习的播放事件，支持变速、片段循环、节拍器、倒拍以及声部 Solo/Mute。",
    load: "生成播放事件", play: "播放", stop: "停止", tempo: "速度 BPM", playhead: "播放位置", loop: "循环片段", loopStart: "起始拍", loopEnd: "结束拍", metronome: "节拍器", countIn: "一小节倒拍",
    loading: "正在生成播放事件……", ready: "播放事件已生成。", failed: "播放生成失败。", empty: "请先生成播放事件，再开始试听。", noEvents: "当前声部筛选下没有可播放音符。",
    events: "事件", activeEvents: "当前播放事件", beats: "总拍数", parts: "声部", solo: "Solo", mute: "Mute", allParts: "全部声部", revision: "版本",
    speedLadder: "速度阶梯", targetTempo: "目标速度", tempoStep: "每轮加速", ladderComplete: "速度阶梯训练已完成。", practiceExports: "练习导出",
    startMeasure: "起始小节", endMeasure: "结束小节", byBeat: "按拍数", partVolume: "声部音量", diagnostics: "播放诊断", playbackPath: "演奏顺序", terminated: "终止原因", unreachableMeasures: "不可达小节",
    markerTemplate: "第 {measure} 小节", repeatedMarkerTemplate: "第 {measure} 小节，第 {occurrence} 次", jumpsTemplate: "跳转 {count} 次", selectedSoloTemplate: "Solo：{count}", selectedMuteTemplate: "Mute：{count}", soloPartTemplate: "独奏 {part}", mutePartTemplate: "静音 {part}",
    navigationMeasureTemplate: "第 {measure} 小节",
    terminationReasons: { end: "乐谱末尾", fine: "Fine 终止记号", guard: "安全上限" },
    navigationActions: { play: "演奏小节", "skip-ending": "跳过反复结尾", "repeat-jump": "返回反复起点", "dc-jump": "跳转至 D.C.", "ds-jump": "跳转至 D.S.", "coda-jump": "跳转至 Coda", "fine-stop": "在 Fine 处停止", end: "到达乐谱末尾", "guard-stop": "达到安全上限后停止" },
  },
  recorder: {
    title: "浏览器录音与练习反馈 Beta", regionAria: "浏览器录音与练习反馈", device: "麦克风", defaultDevice: "系统默认麦克风", deviceTemplate: "麦克风 {index}", countIn: "预备拍", beatsTemplate: "{count} 拍",
    start: "开始录音", requesting: "正在请求麦克风权限……", pause: "暂停", resume: "继续", stop: "停止", cancel: "取消", rerecord: "重新录音", ready: "录音已附加到本次提交，可试听后再提交。",
    unsupported: "当前浏览器不支持 MediaRecorder 录音。", denied: "无法使用麦克风，请检查浏览器权限和所选输入设备。", recordingStatusTemplate: "录音中 {duration}", pausedStatusTemplate: "已暂停 {duration}", countInStatusTemplate: "准备：{count}",
    analysis: "逐音练习反馈", feedbackAria: "练习分析结果", analyzing: "正在对齐录音与乐谱……", analysisFailed: "无法分析这段录音，但仍可提交给老师人工批阅。", completeness: "检测完整度", completenessTemplate: "{detected}/{expected} · {percent}",
    alignment: "时间对齐", startOffset: "录音起点（秒）", timeScale: "时间伸缩", applyAlignment: "应用人工对齐", measureTemplate: "第 {measure} 小节", detectedTemplate: "已检测：{detected}/{total}", pitchAttentionTemplate: "音高需关注：{count}", rhythmAttentionTemplate: "节奏需关注：{count}", polyphonicTemplate: "复音未评分：{count}", jump: "试听此音",
    pitchUnavailable: "音高不可用", onsetUnavailable: "起音不可用", centsTemplate: "{value} 音分", onsetTemplate: "{value} 毫秒", feedbackButtonTemplate: "{measure}，{note}：{status}。{action}",
    statuses: { idle: "空闲", requesting: "正在请求权限", count_in: "预备拍", recording: "录音中", paused: "已暂停", ready: "已就绪", error: "出错" },
    alignmentSources: { automatic: "自动", manual: "人工" },
    eventStatuses: { matched: "匹配", pitch_attention: "音高需关注", rhythm_attention: "节奏需关注", missing: "未检测到", polyphonic_unscored: "复音，未评分" },
  },
  jianpu: { regionAria: "可交互简谱", empty: "当前乐谱没有可显示的简谱。", note: "音符", rest: "休止符", voice: "声部", staff: "谱表", voiceShort: "声部", staffShort: "谱表", eventLabelTemplate: "{kind} {degree}，声部 {voice}，谱表 {staff}", measureAriaTemplate: "第 {measure} 小节" },
  waveform: { waveformAria: "录音波形", waveformValueTemplate: "{label}：{current} / {duration}。点击或使用方向键跳转。", waveformLoading: "正在加载录音波形……", waveformUnavailable: "波形预览不可用，请改用音频控件。", recordingPlayback: "练习录音音频", practiceSpeed: "练习速度", rateTemplate: "{rate}×" },
} satisfies PlaybackPracticeMessages;
