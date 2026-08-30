import type { ScoreSharingMessages } from "../types";

export const zhTWScoreSharingMessages = {
  viewer: {
    loading: "正在載入分享樂譜...", missing: "此分享連結無法使用或已撤銷。", back: "開啟工作臺", shared: "分享樂譜",
    revision: "目前修訂", preview: "五線譜預覽", previewEmpty: "此分享目前沒有可呈現的 MusicXML。", previewLoading: "正在呈現五線譜...",
    previewError: "無法呈現五線譜預覽。", previewRetry: "重新嘗試呈現", previewTechnicalDetails: "技術詳細資料", previewDeferred: "此樂譜較大。需要 OSMD 對照檢視時再載入完整 MusicXML 預覽。", previewRender: "載入完整預覽", previewEventLabel: "{part} · 第 {measure} 小節 · 第 {number} 個{type}", previewNote: "音符", previewRest: "休止符",
    jianpu: "簡譜預覽", summary: "結構化摘要", parts: "聲部", measures: "小節", notes: "音符", rests: "休止符",
    musicXmlEyebrow: "MusicXML", jianpuEyebrow: "簡譜", scoreJsonEyebrow: "Score JSON", assignmentScoreFailed: "無法載入作業指定的樂譜版本。",
    assignmentScoreShown: "正在顯示作業樂譜版本 {version}。", loadingAria: "分享樂譜載入狀態",
  },
  assignments: {
    title: "練習作業", statuses: { open: "進行中", archived: "已封存" }, dueAt: "截止時間", noDue: "無截止時間", submitterName: "姓名", submitterContact: "聯絡方式",
    practiceMinutes: "練習分鐘數", recordingUrl: "錄音/影片連結", performanceFile: "上傳演奏檔案", performanceFileHint: "支援音訊或常見影片檔案，最大 100 MB",
    performanceFileAria: "選擇音訊或影片演奏檔案", note: "練習備註", namePlaceholder: "請輸入你的姓名", nameRequired: "請先填寫姓名再提交。",
    contactPlaceholder: "電子郵件、電話或老師要求的聯絡方式", recordingPlaceholder: "https://...", rubric: "評分規準", rubricEmpty: "未設定評分規準。",
    notePlaceholder: "寫下練習速度、難點、完成範圍或想問老師的問題...", submit: "提交作業", submitting: "正在提交...",
    submitSuccess: "作業已提交，老師可以在樂譜專案中審閱。", submitFailed: "作業提交失敗。", practicePreset: "練習預設", submittedPractice: "提交時的練習設定",
    loadScore: "套用練習預設", loadingScore: "正在載入樂譜版本...", statusAria: "作業提交狀態",
  },
  practice: { tempo: "{tempo} BPM", loop: "循環 {start}–{end}", fullScore: "完整樂譜", solo: "獨奏 {parts}", mute: "靜音 {parts}", allParts: "全部聲部", metronome: "節拍器", countIn: "預備拍" },
  reviews: {
    title: "我的提交回饋", statuses: { submitted: "已提交", reviewed: "已審閱" }, feedback: "老師回饋", timedFeedback: "演奏時間點回饋", performanceFile: "我的演奏檔案",
    loadPerformancePreview: "載入演奏回放", loadingPerformancePreview: "正在載入回放...", performancePreviewFailed: "無法載入演奏回放。", seekTimedFeedback: "跳至此時間點",
    grade: "評分", waiting: "等待老師審閱。", empty: "提交作業後，老師的回饋會顯示在這裡。", playbackAria: "已提交的演奏回放",
  },
  annotations: {
    eyebrow: "樂譜批註", titles: { comment: "評論者工作區", edit: "協作批註" },
    body: "在下方樂譜中選擇音符，即可加入精確批註。連結身份由樂譜擁有者命名，只能證明訪客持有該連結，並非已驗證的個人身份。",
    score: "整份樂譜", selection: "所選音符", noSelection: "請先在樂譜中選擇一個音符", placeholder: "描述修改建議、練習重點或問題", post: "發布批註", posting: "正在發布...",
    posted: "批註已發布。", failed: "無法發布批註。", empty: "目前沒有批註。", identities: { account: "帳號身份", share_link: "連結身份" }, resolved: "已解決", locate: "在樂譜中定位",
    measure: "小節", targetModeAria: "批註目標", statusAria: "批註發布狀態", listAria: "樂譜批註",
  },
  collaboration: {
    title: "多人即時協作 Beta", note: "共享排練備註", noteAria: "共享排練備註", online: "線上成員（顯示名稱未經驗證）", operations: "最近的樂譜操作", conflicts: "並行衝突",
    noOperations: "等待第一筆樂譜編輯操作。", revision: "修訂", targets: "{count} 個目標", identities: { account: "帳號身份", share_link: "連結身份", unverified: "未驗證的廣播身份" },
    statuses: { disconnected: "已中斷", connecting: "正在連線", connected: "已連線" }, roles: { owner: "擁有者", editor: "編輯者", commenter: "評論者", viewer: "檢視者" },
    collaborator: "協作者", currentUser: "目前使用者", operationTypes: { note_edit: "編輯音符", measure_edit: "編輯小節", part_edit: "編輯聲部", transpose: "移調", restore: "還原修訂", candidate_accept: "接受候選", candidate_reject: "拒絕候選", unknown: "樂譜操作" },
    presenceAria: "線上協作者和衝突", operationsAria: "最近的協作操作",
  },
  modes: { major: "大調", minor: "小調", dorian: "多利亞調式", phrygian: "弗里吉亞調式", lydian: "利底亞調式", mixolydian: "混合利底亞調式", locrian: "洛克利亞調式" },
} satisfies ScoreSharingMessages;
