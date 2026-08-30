import type { PlaybackPracticeMessages } from "../types";

export const zhTWPlaybackPracticeMessages = {
  playback: {
    eyebrow: "播放練習", title: "Tone.js 分聲部練習播放器", body: "從目前的 Score JSON 產生可練習的播放事件，支援變速、片段循環、節拍器、倒數拍以及聲部 Solo/Mute。",
    load: "產生播放事件", play: "播放", stop: "停止", tempo: "速度 BPM", playhead: "播放位置", loop: "循環片段", loopStart: "起始拍", loopEnd: "結束拍", metronome: "節拍器", countIn: "一小節倒數拍",
    loading: "正在產生播放事件……", ready: "播放事件已產生。", failed: "無法產生播放事件。", empty: "請先產生播放事件，再開始試聽。", noEvents: "目前聲部篩選下沒有可播放的音符。",
    events: "事件", activeEvents: "目前播放事件", beats: "總拍數", parts: "聲部", solo: "Solo", mute: "Mute", allParts: "全部聲部", revision: "版本",
    speedLadder: "速度階梯", targetTempo: "目標速度", tempoStep: "每輪加速", ladderComplete: "速度階梯訓練已完成。", practiceExports: "練習匯出",
    startMeasure: "起始小節", endMeasure: "結束小節", byBeat: "依拍數", partVolume: "聲部音量", diagnostics: "播放診斷", playbackPath: "演奏順序", terminated: "終止原因", unreachableMeasures: "無法到達的小節",
    markerTemplate: "第 {measure} 小節", repeatedMarkerTemplate: "第 {measure} 小節，第 {occurrence} 次", jumpsTemplate: "跳轉 {count} 次", selectedSoloTemplate: "Solo：{count}", selectedMuteTemplate: "Mute：{count}", soloPartTemplate: "獨奏 {part}", mutePartTemplate: "靜音 {part}",
    navigationMeasureTemplate: "第 {measure} 小節",
    terminationReasons: { end: "樂譜結尾", fine: "Fine 終止記號", guard: "安全上限" },
    navigationActions: { play: "演奏小節", "skip-ending": "略過反覆結尾", "repeat-jump": "返回反覆起點", "dc-jump": "跳轉至 D.C.", "ds-jump": "跳轉至 D.S.", "coda-jump": "跳轉至 Coda", "fine-stop": "在 Fine 處停止", end: "到達樂譜結尾", "guard-stop": "達到安全上限後停止" },
  },
  recorder: {
    title: "瀏覽器錄音與練習回饋 Beta", regionAria: "瀏覽器錄音與練習回饋", device: "麥克風", defaultDevice: "系統預設麥克風", deviceTemplate: "麥克風 {index}", countIn: "預備拍", beatsTemplate: "{count} 拍",
    start: "開始錄音", requesting: "正在請求麥克風權限……", pause: "暫停", resume: "繼續", stop: "停止", cancel: "取消", rerecord: "重新錄音", ready: "錄音已附加至本次提交，可試聽後再提交。",
    unsupported: "目前瀏覽器不支援 MediaRecorder 錄音。", denied: "無法使用麥克風，請檢查瀏覽器權限與所選輸入裝置。", recordingStatusTemplate: "錄音中 {duration}", pausedStatusTemplate: "已暫停 {duration}", countInStatusTemplate: "準備：{count}",
    analysis: "逐音練習回饋", feedbackAria: "練習分析結果", analyzing: "正在對齊錄音與樂譜……", analysisFailed: "無法分析這段錄音，但仍可提交給老師人工批閱。", completeness: "偵測完整度", completenessTemplate: "{detected}/{expected} · {percent}",
    alignment: "時間對齊", startOffset: "錄音起點（秒）", timeScale: "時間伸縮", applyAlignment: "套用人工對齊", measureTemplate: "第 {measure} 小節", detectedTemplate: "已偵測：{detected}/{total}", pitchAttentionTemplate: "音高需注意：{count}", rhythmAttentionTemplate: "節奏需注意：{count}", polyphonicTemplate: "複音未評分：{count}", jump: "試聽此音",
    pitchUnavailable: "音高不可用", onsetUnavailable: "起音不可用", centsTemplate: "{value} 音分", onsetTemplate: "{value} 毫秒", feedbackButtonTemplate: "{measure}，{note}：{status}。{action}",
    statuses: { idle: "閒置", requesting: "正在請求權限", count_in: "預備拍", recording: "錄音中", paused: "已暫停", ready: "已就緒", error: "發生錯誤" },
    alignmentSources: { automatic: "自動", manual: "人工" },
    eventStatuses: { matched: "相符", pitch_attention: "音高需注意", rhythm_attention: "節奏需注意", missing: "未偵測到", polyphonic_unscored: "複音，未評分" },
  },
  jianpu: { regionAria: "可互動簡譜", empty: "目前樂譜沒有可顯示的簡譜。", note: "音符", rest: "休止符", voice: "聲部", staff: "譜表", voiceShort: "聲部", staffShort: "譜表", eventLabelTemplate: "{kind} {degree}，聲部 {voice}，譜表 {staff}", measureAriaTemplate: "第 {measure} 小節" },
  waveform: { waveformAria: "錄音波形", waveformValueTemplate: "{label}：{current} / {duration}。點選或使用方向鍵跳轉。", waveformLoading: "正在載入錄音波形……", waveformUnavailable: "波形預覽無法使用，請改用音訊控制項。", recordingPlayback: "練習錄音音訊", practiceSpeed: "練習速度", rateTemplate: "{rate}×" },
} satisfies PlaybackPracticeMessages;
