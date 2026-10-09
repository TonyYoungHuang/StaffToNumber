import type { SupportedLocale } from "@score/i18n";

const en = {
  addInstrument: "Add instrument", createMissingInstrument: "Create instrument and enter missing music", addInstrumentBody: "Create an instrument with empty measures, then use the note editor to enter the missing music. This creates a review candidate and uses no recognition credits.", instrumentName: "Instrument name", abbreviation: "Abbreviation", instrumentKind: "Notation type", pitched: "Pitched staff", percussion: "Percussion", staffCount: "Number of staves", createInstrument: "Create instrument", cancel: "Cancel", partCreateFailed: "The instrument could not be created. Your entries are kept for retry.",
  tabPositionMissing: "These TAB symbols do not specify a string. They remain visible in the complete score; select one here to set its string and fret.",
  coverageReviewConfirm: "I have compared every source page and instrument and corrected the missing passages.", sourceLayers: "Source staff layers", unmatchedLayer: "Not linked to a recognized instrument", manualReviewed: "Manually reviewed", saveFailed: "The notation could not be saved. Your changes are still available to retry.",
  simpleTitle: "Simple score", simpleBody: "Single melody and straightforward staff notation. Review, edit, transpose, play and export in the existing workbench.",
  complexTitle: "Ensemble score", complexBody: "Multi-instrument scores with multiple staves, voices, tablature, percussion, lyrics and playing techniques. Review every source page before confirming.",
  creditPrice: "{credits} credits per recognition", quoteLoading: "Loading your recognition price…", quoteFailed: "Could not load your recognition allowance.", retry: "Retry",
  chooseSimple: "Open simple recognition", chooseComplex: "Open ensemble recognition", compareTitle: "Choose recognition for your score", quotaRemaining: "Available credits: {credits}",
  structuredImport: "Importing an existing MusicXML file does not run photo recognition. The recognition price applies to PDF and image scans.",
  unavailable: "Your current allowance cannot cover this recognition. Upgrade or add credits to continue.", ensembleTitle: "Ensemble workbench", standardWorkbench: "Standard workbench",
  instruments: "Instruments", allInstruments: "All instruments", sourcePage: "Source page", allPages: "All source pages", coverageTitle: "Recognition coverage",
  coverageUnknown: "Source coverage has not been verified. Compare each page with the score; the displayed note count does not prove completeness.",
  coverageIncomplete: "Some source fragments still need review.", coverageComplete: "Every reported source fragment has been checked.",
  noNotes: "No visible events match this selection.", voice: "Voice", staff: "Staff", measure: "Measure", note: "Note", rest: "Rest", selected: "Selected event", previous: "Previous event", next: "Next event",
  viewFull: "Complete score", tabDrumTitle: "Tablature and instrument playback", loadTabPlayer: "Open tablature and playback", loading: "Loading…", play: "Play", pause: "Pause", stop: "Stop", mute: "Mute", solo: "Solo", speed: "Speed", volume: "Volume",
  playerFailed: "The instrument preview could not be loaded. The complete score and correction tools remain available below.", playerMappingMissing: "This rendered note has no unique editable match. Select it from the event list or the complete score.",
  notationTitle: "Lyrics, tablature and percussion", lyrics: "Lyrics", fret: "Fret", string: "String", drum: "Percussion MIDI note", save: "Save notation", saving: "Saving…", saved: "Notation saved.", unknownPitch: "No defined sounding pitch", fullPreview: "Full score preview", zoom: "Zoom",
  jumpEditor: "Edit selected event", source: "Source comparison", coveragePending: "Coverage verification pending", notationProtected: "Other notation and playing techniques are preserved when this event is edited.",
  bend: "Bend (semitones)", hammerOn: "Hammer-on", pullOff: "Pull-off", slide: "Slide", none: "None", start: "Start", end: "End", continue: "Continue", extend: "Lyric extender", verse: "Verse", addLyric: "Add lyric verse", removeLyric: "Remove lyric verse", discard: "Discard notation changes", instrumentId: "Instrument ID", displayStep: "Display step", displayOctave: "Display octave",
};
export type EnsembleMessages = typeof en;

const zh: EnsembleMessages = {
  addInstrument: "新增乐器", createMissingInstrument: "创建乐器并补录", addInstrumentBody: "创建带空小节的乐器，再使用音符编辑器补录缺失谱段。此操作会生成待复核候选，不消耗识谱积分。", instrumentName: "乐器名称", abbreviation: "简称", instrumentKind: "记谱类型", pitched: "有音高谱表", percussion: "打击乐", staffCount: "谱表数量", createInstrument: "创建乐器", cancel: "取消", partCreateFailed: "创建乐器失败，已填写内容仍保留，可以重试。",
  tabPositionMissing: "这些 TAB 记号尚未指定弦号，完整总谱仍保留原记号。可在此选择后补充弦号和品位。",
  coverageReviewConfirm: "我已逐页核对原稿中的全部乐器，并补齐缺失的谱段。", sourceLayers: "原稿谱层清单", unmatchedLayer: "尚未关联到识别的乐器", manualReviewed: "已由用户复核", saveFailed: "谱面属性保存失败，修改仍保留，可以重试。",
  simpleTitle: "简单乐谱", simpleBody: "适合单旋律和常规五线谱。继续使用原工作台校对、编辑、移调、播放和导出。",
  complexTitle: "复杂总谱", complexBody: "适合多乐器、多谱表、多声部，包含 TAB、鼓谱、歌词和演奏技法的总谱。确认前逐页核对原稿。",
  creditPrice: "每次识谱 {credits} 积分", quoteLoading: "正在读取你的识谱价格…", quoteFailed: "暂时无法读取识谱额度。", retry: "重试",
  chooseSimple: "打开简单识谱", chooseComplex: "打开复杂识谱", compareTitle: "选择适合乐谱的识谱方式", quotaRemaining: "可用积分：{credits}",
  structuredImport: "导入已有 MusicXML 不会进行照片识谱。识谱价格适用于 PDF 和图片扫描件。", unavailable: "当前额度不足以完成此识谱，请升级或补充积分。",
  ensembleTitle: "总谱工作台", standardWorkbench: "常规工作台", instruments: "乐器", allInstruments: "全部乐器", sourcePage: "原稿页", allPages: "全部原稿页", coverageTitle: "识谱覆盖情况",
  coverageUnknown: "原稿覆盖情况尚未核验。请逐页对照原图，显示的音符数不能证明识谱完整。", coverageIncomplete: "部分原稿片段仍需检查。", coverageComplete: "全部已报告的原稿片段已检查。",
  noNotes: "当前筛选下没有可见事件。", voice: "声部", staff: "谱表", measure: "小节", note: "音符", rest: "休止符", selected: "当前事件", previous: "上一个事件", next: "下一个事件",
  viewFull: "完整总谱", tabDrumTitle: "TAB 与乐器播放", loadTabPlayer: "打开 TAB 与播放", loading: "正在加载…", play: "播放", pause: "暂停", stop: "停止", mute: "静音", solo: "独奏", speed: "速度", volume: "音量",
  playerFailed: "乐器预览暂时无法加载，下方完整总谱和校对工具仍可使用。", playerMappingMissing: "此音符没有唯一对应的可编辑事件，请在事件列表或完整总谱中选择。",
  notationTitle: "歌词、TAB 与鼓谱属性", lyrics: "歌词", fret: "品位", string: "弦号", drum: "鼓声音色 MIDI 编号", save: "保存谱面属性", saving: "正在保存…", saved: "谱面属性已保存。", unknownPitch: "未定义实际音高", fullPreview: "完整总谱预览", zoom: "缩放",
  jumpEditor: "编辑当前事件", source: "原稿对照", coveragePending: "覆盖核验待完成", notationProtected: "修改此事件时保留其他记号和演奏技法。",
  bend: "推弦（半音）", hammerOn: "击弦", pullOff: "勾弦", slide: "滑音", none: "无", start: "开始", end: "结束", continue: "继续", extend: "歌词延长线", verse: "歌词段号", addLyric: "添加一段歌词", removeLyric: "删除此段歌词", discard: "放弃谱面属性修改", instrumentId: "乐器标识", displayStep: "显示位置音名", displayOctave: "显示位置八度",
};
const ja: EnsembleMessages = {
  addInstrument: "楽器を追加", createMissingInstrument: "楽器を作成して欠けた音符を入力", addInstrumentBody: "空小節のある楽器を作成し、音符エディターで欠けた譜面を入力します。確認候補を作成する操作で、認識クレジットは消費しません。", instrumentName: "楽器名", abbreviation: "略称", instrumentKind: "記譜の種類", pitched: "音高のある譜表", percussion: "打楽器", staffCount: "譜表数", createInstrument: "楽器を作成", cancel: "キャンセル", partCreateFailed: "楽器を作成できませんでした。入力内容は保持されており、再試行できます。",
  tabPositionMissing: "これらの TAB 記号には弦番号がありません。総譜には原記号を保持しています。ここで選択して弦番号・フレットを設定できます。",
  coverageReviewConfirm: "原稿の全ページ・全楽器と照合し、欠けた譜面を補正しました。", sourceLayers: "原稿の譜表一覧", unmatchedLayer: "認識した楽器との関連付けなし", manualReviewed: "ユーザーによる確認済み", saveFailed: "譜面属性を保存できませんでした。変更は保持されており、再試行できます。",
  bend: "ベンド（半音）", hammerOn: "ハンマリング", pullOff: "プリング", slide: "スライド", none: "なし", start: "開始", end: "終了", continue: "継続", extend: "歌詞の延長線", verse: "歌詞の段番号", addLyric: "歌詞の段を追加", removeLyric: "この歌詞の段を削除", discard: "譜面属性の変更を破棄", instrumentId: "楽器 ID", displayStep: "表示位置の音名", displayOctave: "表示位置のオクターブ",
  simpleTitle: "シンプルな楽譜", simpleBody: "単旋律と通常の五線譜向け。既存のワークスペースで校正、編集、移調、再生、書き出しができます。",
  complexTitle: "アンサンブル総譜", complexBody: "複数楽器・譜表・声部、TAB、ドラム、歌詞、奏法を含む総譜向け。確定前に原稿の各ページと照合してください。",
  creditPrice: "認識1回につき {credits} クレジット", quoteLoading: "認識料金を確認中…", quoteFailed: "認識枠を取得できませんでした。", retry: "再試行", chooseSimple: "シンプル認識を開く", chooseComplex: "総譜認識を開く", compareTitle: "楽譜に合った認識方法を選択", quotaRemaining: "利用可能：{credits} クレジット",
  structuredImport: "既存の MusicXML の読み込みでは画像認識を行いません。認識料金は PDF・画像のスキャンに適用されます。", unavailable: "この認識に必要なクレジットが不足しています。プラン変更またはクレジット追加が必要です。",
  ensembleTitle: "総譜ワークスペース", standardWorkbench: "通常のワークスペース", instruments: "楽器", allInstruments: "すべての楽器", sourcePage: "原稿ページ", allPages: "すべての原稿ページ", coverageTitle: "認識範囲の確認",
  coverageUnknown: "原稿の認識範囲は未確認です。各ページを原稿と照合してください。表示された音符数だけでは完全性を確認できません。", coverageIncomplete: "確認が必要な原稿部分が残っています。", coverageComplete: "報告された原稿部分はすべて確認済みです。",
  noNotes: "この条件に一致する表示イベントはありません。", voice: "声部", staff: "譜表", measure: "小節", note: "音符", rest: "休符", selected: "選択中のイベント", previous: "前のイベント", next: "次のイベント", viewFull: "総譜全体",
  tabDrumTitle: "TAB と楽器再生", loadTabPlayer: "TAB と再生を開く", loading: "読み込み中…", play: "再生", pause: "一時停止", stop: "停止", mute: "ミュート", solo: "ソロ", speed: "速度", volume: "音量",
  playerFailed: "楽器プレビューを読み込めませんでした。下の総譜と校正ツールは引き続き使えます。", playerMappingMissing: "この音符に一意の編集イベントが見つかりません。イベント一覧または総譜で選択してください。",
  notationTitle: "歌詞・TAB・打楽器の属性", lyrics: "歌詞", fret: "フレット", string: "弦番号", drum: "打楽器の MIDI 番号", save: "譜面属性を保存", saving: "保存中…", saved: "譜面属性を保存しました。", unknownPitch: "実音高が未定義", fullPreview: "総譜全体のプレビュー", zoom: "ズーム", jumpEditor: "選択イベントを編集", source: "原稿と比較", coveragePending: "認識範囲の確認待ち", notationProtected: "このイベントの編集では、ほかの記号と奏法を保持します。",
};

// New ensemble controls share the existing application's language selection.
// Languages without specialized notation wording use English until their full copy is reviewed.
export function getEnsembleMessages(locale: SupportedLocale): EnsembleMessages {
  if (locale === "ja") return ja;
  if (locale === "zh-CN") return zh;
  if (locale === "zh-TW") return { ...zh, simpleTitle: "簡單樂譜", complexTitle: "複雜總譜", chooseSimple: "打開簡單識譜", chooseComplex: "打開複雜識譜", ensembleTitle: "總譜工作台", instruments: "樂器", measure: "小節", lyrics: "歌詞", save: "儲存譜面屬性", saved: "譜面屬性已儲存。" };
  return en;
}
