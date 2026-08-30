import type { PlaybackPracticeMessages } from "../types";

export const jaPlaybackPracticeMessages = {
  playback: {
    eyebrow: "再生練習", title: "Tone.js パート練習プレーヤー", body: "現在の Score JSON から練習用の再生イベントを生成し、テンポ変更、区間ループ、メトロノーム、カウントイン、パートの Solo/Mute に対応します。",
    load: "再生イベントを生成", play: "再生", stop: "停止", tempo: "テンポ BPM", playhead: "再生位置", loop: "区間をループ", loopStart: "開始拍", loopEnd: "終了拍", metronome: "メトロノーム", countIn: "1 小節のカウントイン",
    loading: "再生イベントを生成しています…", ready: "再生イベントを生成しました。", failed: "再生イベントを生成できませんでした。", empty: "再生する前に再生イベントを生成してください。", noEvents: "現在のパート絞り込みには再生可能な音符がありません。",
    events: "イベント", activeEvents: "有効なイベント", beats: "総拍数", parts: "パート", solo: "Solo", mute: "Mute", allParts: "すべてのパート", revision: "リビジョン",
    speedLadder: "テンポ階段練習", targetTempo: "目標テンポ", tempoStep: "1 回ごとの増加", ladderComplete: "テンポ階段練習が完了しました。", practiceExports: "練習用書き出し",
    startMeasure: "開始小節", endMeasure: "終了小節", byBeat: "拍で指定", partVolume: "パート音量", diagnostics: "再生診断", playbackPath: "演奏順序", terminated: "終了理由", unreachableMeasures: "到達不能な小節",
    markerTemplate: "第 {measure} 小節", repeatedMarkerTemplate: "第 {measure} 小節、{occurrence} 回目", jumpsTemplate: "ジャンプ {count} 回", selectedSoloTemplate: "Solo：{count}", selectedMuteTemplate: "Mute：{count}", soloPartTemplate: "{part} をソロ", mutePartTemplate: "{part} をミュート",
    navigationMeasureTemplate: "第 {measure} 小節",
    terminationReasons: { end: "楽譜の終端", fine: "Fine 記号", guard: "安全上限" },
    navigationActions: { play: "小節を演奏", "skip-ending": "反復括弧をスキップ", "repeat-jump": "反復開始位置に戻る", "dc-jump": "D.C. へ移動", "ds-jump": "D.S. へ移動", "coda-jump": "Coda へ移動", "fine-stop": "Fine で停止", end: "楽譜の終端に到達", "guard-stop": "安全上限で停止" },
  },
  recorder: {
    title: "ブラウザー録音と練習フィードバック Beta", regionAria: "ブラウザー録音と練習フィードバック", device: "マイク", defaultDevice: "システム既定のマイク", deviceTemplate: "マイク {index}", countIn: "カウントイン", beatsTemplate: "{count} 拍",
    start: "録音を開始", requesting: "マイクの使用許可を求めています…", pause: "一時停止", resume: "再開", stop: "停止", cancel: "キャンセル", rerecord: "録り直す", ready: "録音をこの提出物に添付しました。提出前に確認できます。",
    unsupported: "このブラウザーは MediaRecorder に対応していません。", denied: "マイクを使用できません。ブラウザーの権限と入力デバイスを確認してください。", recordingStatusTemplate: "録音中 {duration}", pausedStatusTemplate: "一時停止 {duration}", countInStatusTemplate: "準備：{count}",
    analysis: "音符ごとの練習フィードバック", feedbackAria: "練習分析結果", analyzing: "録音と楽譜を位置合わせしています…", analysisFailed: "この録音を分析できませんでしたが、教師による確認用として提出できます。", completeness: "検出率", completenessTemplate: "{detected}/{expected} · {percent}",
    alignment: "時間軸の位置合わせ", startOffset: "録音開始位置（秒）", timeScale: "時間倍率", applyAlignment: "手動位置合わせを適用", measureTemplate: "第 {measure} 小節", detectedTemplate: "検出：{detected}/{total}", pitchAttentionTemplate: "音高の要確認：{count}", rhythmAttentionTemplate: "リズムの要確認：{count}", polyphonicTemplate: "多声音・採点なし：{count}", jump: "この音を再生",
    pitchUnavailable: "音高なし", onsetUnavailable: "発音時刻なし", centsTemplate: "{value} セント", onsetTemplate: "{value} ミリ秒", feedbackButtonTemplate: "{measure}、{note}：{status}。{action}",
    statuses: { idle: "待機中", requesting: "許可を要求中", count_in: "カウントイン", recording: "録音中", paused: "一時停止", ready: "準備完了", error: "エラー" },
    alignmentSources: { automatic: "自動", manual: "手動" },
    eventStatuses: { matched: "一致", pitch_attention: "音高を要確認", rhythm_attention: "リズムを要確認", missing: "未検出", polyphonic_unscored: "多声音・採点なし" },
  },
  jianpu: { regionAria: "操作可能な数字譜", empty: "この楽譜には表示できる数字譜がありません。", note: "音符", rest: "休符", voice: "声部", staff: "譜表", voiceShort: "声", staffShort: "譜", eventLabelTemplate: "{kind} {degree}、声部 {voice}、譜表 {staff}", measureAriaTemplate: "第 {measure} 小節" },
  waveform: { waveformAria: "録音波形", waveformValueTemplate: "{label}：{current} / {duration}。クリックまたは矢印キーで移動できます。", waveformLoading: "録音波形を読み込んでいます…", waveformUnavailable: "波形プレビューを利用できません。音声コントロールを使用してください。", recordingPlayback: "練習録音", practiceSpeed: "練習速度", rateTemplate: "{rate}×" },
} satisfies PlaybackPracticeMessages;
