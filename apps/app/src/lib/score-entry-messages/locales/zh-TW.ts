import type { ScoreEntryMessages } from "../types";

export const zhTWScoreEntryMessages = {
  pages: {
    library: { eyebrow: "樂譜工作台", title: "辨識、管理並繼續處理你的樂譜", body: "直接上傳 PDF 或樂譜圖片開始辨識，也可開啟已儲存的樂譜繼續編輯。上傳、候選結果與樂譜庫都在同一個工作台。" },
    newScore: {
      eyebrow: "建立新樂譜", title: "你想從哪裡開始？", body: "選擇一種來源，下一頁只會顯示該來源所需的操作。", recommended: "推薦", choose: "選擇",
      choices: {
        scan: { title: "辨識 PDF 或樂譜圖片", body: "適合紙本樂譜、掃描檔與 PDF。新帳戶可從一份完整多頁 PDF 或一張樂譜圖片建立永久免費專案。" },
        jianpu: { title: "輸入簡譜", body: "輸入數字音符，建立對應的五線譜。" },
        musicxml: { title: "從製譜軟體匯入", body: "適合 MuseScore、Sibelius、Finale 等軟體匯出的 MusicXML 檔案。" },
        midi: { title: "匯入 MIDI", body: "將 MIDI 中的音符與節奏轉換為樂譜。" },
        audio: { title: "上傳錄音", body: "嘗試從單旋律錄音建立樂譜（實驗功能）。" },
        backup: { title: "還原樂譜備份", body: "開啟先前從本站下載的備份檔案。" },
      },
    },
    source: {
      chooseAnother: "選擇其他來源",
      headings: {
        scan: { eyebrow: "建立新樂譜", title: "辨識 PDF 或樂譜圖片", body: "選擇一個檔案並開始辨識。此頁面只處理掃描辨識。" },
        jianpu: { eyebrow: "建立新樂譜", title: "用簡譜建立五線譜", body: "輸入簡譜內容並建立樂譜。此頁面只處理簡譜輸入。" },
        musicxml: { eyebrow: "建立新樂譜", title: "從製譜軟體匯入", body: "選擇匯出的 MusicXML 檔案。此頁面只處理檔案匯入。" },
        midi: { eyebrow: "建立新樂譜", title: "從 MIDI 建立樂譜", body: "選擇一個 MIDI 檔案。此頁面只處理 MIDI 匯入。" },
        audio: { eyebrow: "建立新樂譜", title: "嘗試從錄音建立樂譜", body: "選擇一段旋律錄音，完成後請檢查音高與節奏。" },
        backup: { eyebrow: "建立新樂譜", title: "還原樂譜備份", body: "選擇先前下載的備份檔案。此頁面只處理備份還原。" },
      },
    },
  },
  access: { checking: "正在檢查存取權限...", errorFallback: "無法讀取目前的帳戶。" },
  library: {
    signInFirst: "請先登入。", createNew: "建立新樂譜", editable: "可編輯",
    metrics: {
      projects: { label: "我的樂譜", body: "你儲存過的樂譜都會顯示在這裡。" },
      format: { label: "可繼續編輯", body: "辨識或匯入後，可繼續校正、移調、播放與匯出。" },
      revisions: { label: "編輯記錄", body: "先前版本會保留，需要時可隨時找回。" },
    },
    common: { selected: "已選擇", importInProgress: "正在匯入...", uploadInProgress: "正在上傳...", chooseAnother: "選擇其他檔案", clearSelection: "清除選擇" },
    musicxml: {
      chooseFile: "請選擇 .musicxml、.xml 或 .mxl 檔案。", importFailed: "MusicXML 匯入失敗。", imported: "樂譜已新增至「我的樂譜」。", eyebrow: "從製譜軟體匯入", title: "選擇 MusicXML 檔案", body: "匯入 MuseScore、Sibelius、Finale 或其他製譜軟體輸出的 MusicXML，並在此繼續編輯。", dropTitle: "選擇檔案", dropBody: "支援 .musicxml、.xml 與 .mxl 檔案。", empty: "尚未選擇檔案。", button: "匯入 MusicXML",
    },
    scan: {
      chooseFile: "請選擇 PDF 或圖片檔案。", importFailed: "無法建立 OMR 匯入任務。", imported: "檔案已上傳並開始辨識，稍後可在「我的樂譜」中檢查。", eyebrow: "樂譜辨識", title: "上傳 PDF 或樂譜圖片", body: "將紙本樂譜或 PDF 轉成可檢視、可校正的電子樂譜。複雜記譜可能需要少量手動修正。", dropTitle: "選擇 PDF 或圖片", dropBody: "支援 PDF、PNG、JPG、WEBP 與 TIFF。", empty: "尚未選擇掃描檔。", button: "開始辨識", accessLoading: "正在檢查免費辨識額度...", freeEyebrow: "登入成功 · 免費編輯", freeBody: "上傳一份完整多頁 PDF 或一張樂譜圖片，建立永久免費樂譜專案，並繼續校正、播放、移調、轉換、分享與匯出。", exhaustedEyebrow: "免費辨識額度已使用", exhaustedTitle: "此帳戶已建立一個永久免費樂譜專案。", exhaustedBody: "你仍可繼續校正、播放、移調、轉換、保留版本、分享與匯出該完整樂譜；升級只用於建立與處理更多樂譜。", exhaustedLibrary: "繼續使用免費樂譜", exhaustedUpgrade: "開通完整權限",
    },
    backup: {
      chooseFile: "請選擇樂譜備份檔案。", importFailed: "無法還原備份。", imported: "樂譜備份已還原。", eyebrow: "還原備份", title: "選擇樂譜備份", body: "還原先前從本站下載的樂譜備份，並繼續編輯。", dropTitle: "選擇備份檔案", dropBody: "支援 .score.json 與 .json 檔案。", empty: "尚未選擇 Score JSON 快照。", button: "還原樂譜",
    },
    midi: {
      chooseFile: "請選擇 MIDI 檔案。", importFailed: "MIDI 匯入失敗。", imported: "MIDI 已轉換為樂譜專案。", eyebrow: "匯入 MIDI", title: "選擇 MIDI 檔案", body: "將 MIDI 音符與節奏轉成可檢視、播放與移調的樂譜。複雜排版可能需要手動調整。", dropTitle: "選擇 .mid 或 .midi 檔案", dropBody: "支援標準 MIDI 檔案。", empty: "尚未選擇 MIDI 檔案。", button: "匯入 MIDI",
    },
    audio: {
      formatLabel: "音訊",
      chooseFile: "請選擇音訊檔案。", importFailed: "無法建立音訊轉譜任務。", imported: "已建立音訊轉譜專案，Basic Pitch 將嘗試產生 MIDI 與初步可編輯的樂譜版本。", eyebrow: "錄音轉樂譜（實驗功能）", title: "選擇錄音", body: "上傳一段旋律錄音，系統會嘗試建立可編輯樂譜。合奏、雜訊與複雜和聲可能降低準確度。", dropTitle: "選擇音訊檔案", dropBody: "支援 WAV、MP3、M4A、AAC、FLAC、OGG 與 AIFF。", empty: "尚未選擇音訊。", button: "開始轉譜",
    },
    jianpu: {
      empty: "請輸入簡譜文字。", importFailed: "簡譜匯入失敗。", imported: "簡譜樂譜專案已建立，現在可以預覽、移調、播放並匯出 MusicXML。", eyebrow: "簡譜轉五線譜", title: "輸入簡譜", body: "輸入調號、拍號、數字音符、休止符與小節線，建立可播放、移調和匯出的五線譜。", titleLabel: "樂譜標題", titlePlaceholder: "例如：小星星簡譜", textLabel: "簡譜文字", textPlaceholder: "1=C\n4/4\n1 1 5 5 | 6 6 5 - |", button: "匯入簡譜", clear: "還原範例",
    },
    list: { eyebrow: "我的樂譜", title: "已儲存的樂譜", body: "開啟任一樂譜，繼續校正、轉簡譜、移調、播放或匯出。", loading: "正在載入樂譜...", empty: "目前還沒有樂譜。建立第一份樂譜後，它會顯示在這裡。", open: "開啟樂譜", revision: "編輯記錄" },
    statuses: { imported: "已匯入", candidate: "待校正", needs_review: "待確認", ready: "可使用", archived: "已封存" },
  },
  trial: {
    previewDeferred: "這是一份大型樂譜。需要使用 OSMD 對照檢視時再載入完整 MusicXML 預覽。",
    previewRender: "載入完整預覽",
    previewEventLabel: "{part} · 第 {measure} 小節 · 第 {number} 個{type}",
    previewNote: "音符",
    previewRest: "休止符",
    loadingJob: "正在讀取任務", preparing: "正在準備免費編輯", loadingScore: "正在讀取樂譜...", intro: "辨識完成後會開啟完整免費專案，可繼續校正、播放、移調、轉簡譜、保留版本、分享與匯出；升級可處理更多樂譜。", unlock: "開通完整權限", back: "返回樂譜庫",
    statuses: { queued: "等待處理", processing: "正在辨識", completed: "辨識完成", failed: "辨識失敗", cancelled: "已取消" },
    failedTitle: "辨識任務未完成，請依下方建議檢查檔案。", failedBody: "請確認頁面方向正確、影像清晰，且沒有大面積陰影或裁切。免費任務失敗需要人工檢查額度，請勿重複付款。", technicalDetails: "技術詳情", reportIssue: "回報辨識問題", diagnosticsEyebrow: "辨識診斷", diagnosticsTitle: "升級前先檢查置信度與警告。", diagnosticsWarning: "辨識引擎傳回需要人工檢查的警告。", confidenceLabel: "整體置信度", confidenceHelp: "置信度較低時必須逐小節檢查。", pagesLabel: "已辨識頁數", pagesHelp: "免費專案支援一份完整多頁 PDF。", warningsLabel: "警告數量", engineFallback: "辨識引擎診斷", previewEyebrow: "五線譜預覽", previewTitle: "Audiveris 辨識候選", previewEmpty: "處理完成後，候選五線譜會顯示在這裡。", previewLoading: "正在繪製五線譜...", previewError: "辨識結果不完整，暫時無法顯示。請改用更清晰、方向正確且邊緣完整的頁面，或聯絡支援。", previewRetry: "重新繪製",
  },
  candidate: {
    notationRetry: "重新嘗試繪製",
    notationTechnicalDetails: "技術詳情",
    notationEventLabel: "{part} · 第 {measure} 小節 · 第 {number} 個{type}",
    notationNote: "音符",
    notationRest: "休止符",
    freeEyebrow: "免費編輯", reviewEyebrow: "候選樂譜審核", freeDescription: "你正在使用永久免費樂譜專案。辨識結果 v{revision} 現在可直接校正，修改會儲存為候選版本。", reviewDescription: "辨識結果 v{revision} 尚未成為正式版本。接受前請與原件比對。", back: "返回樂譜庫", processMore: "處理更多樂譜", rejecting: "正在拒絕...", reject: "拒絕候選", accepting: "正在接受...", accept: "接受為正式版本", safetyEyebrow: "安全狀態", safetyTitle: "候選版本不會覆蓋現有正式版本", freeSafetyBody: "免費帳戶可校正完整樂譜，並繼續使用播放、移調、簡譜、版本、分享與已開放的匯出功能；升級可建立更多樂譜專案。", reviewSafetyBody: "校正會建立新的候選版本，不會修改正式樂譜。接受後會將最新候選複製為正式版本，並開放移調、播放與匯出。", historyGroupLabel: "候選校正的復原與重做", undo: "復原校正", redo: "重做校正", viewportLabel: "校對檢視", syncScroll: "同步捲動", zoomGroupLabel: "校對縮放", zoomOut: "縮小", zoomIn: "放大", fitWidth: "符合寬度", notationEyebrow: "候選譜面", notationTitle: "MusicXML 五線譜預覽", notationBody: "選取譜面音符或左側診斷，以檢查候選事件。", notationEmpty: "目前沒有可繪製的候選 MusicXML。", notationLoading: "正在繪製候選五線譜...", notationError: "無法繪製候選 MusicXML。", notationDeferred: "這是一份大型樂譜。需要逐頁比對時再載入完整 OSMD 預覽；圖形編輯器仍可直接使用。", notationRender: "載入完整 OSMD 預覽",
  },
  omr: {
    sources: { "omr-engine": "辨識引擎", structural: "結構驗證" },
    sourcePreviewFailed: "無法載入掃描原件。", pageTemplate: "第 {page} 頁", measureTemplate: "小節 {measure}", scanAltTemplate: "{name} 掃描原件", eyebrow: "OMR 對照校對", title: "掃描原件與辨識診斷", body: "紅框使用 Audiveris 符號座標；structural 分數只驗證節奏完整性，並非模型機率。", issueNavigation: "問題定位", previous: "上一項", next: "下一項", sourceMode: "原件顯示模式", original: "原始檔案", overlay: "診斷座標圖", issuesOnly: "只看問題符號", scanPages: "掃描頁面", noSource: "此專案沒有可預覽的 PDF／圖片原件。", loadingSource: "正在載入掃描原件...", geometryWarning: "頁面像素尺寸與辨識記錄不一致，座標框可能偏移；接受前請重新辨識該檔案。", symbolLayer: "低置信度符號位置", pageSymbols: "本頁符號", issueSymbols: "問題符號", problemMeasures: "異常小節", gradeLabel: "評分", contextGradeLabel: "上下文評分", noDiagnostics: "本頁沒有符合篩選條件的診斷。",
  },
} satisfies ScoreEntryMessages;
