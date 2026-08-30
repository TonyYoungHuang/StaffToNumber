import type { WorkspaceMessages } from "../types";
import { enWorkspaceMessages } from "./en";

export const zhTWWorkspaceMessages = {
  ...enWorkspaceMessages,
  pages: {
    dashboard: { eyebrow: "控制台", title: "帳戶概覽與授權狀態。", body: "查看登入狀態、目前授權期限，以及「五線譜 PDF → 簡譜」流程的下一步。", note: "啟用、上傳與排隊工作集中在同一個樂譜工作台。" },
    jobs: { eyebrow: "轉換工作台", title: "轉換工作與結果檢視。", body: "建立「五線譜 PDF → 簡譜」工作、查看狀態與預覽文字，並下載最終 PDF 或草稿包。" },
  },
  banner: { payNow: "立即開通", activationOptions: "查看啟用方式", accountSetup: "查看帳戶設定", importScore: "匯入 PDF 或圖片", openJobs: "開啟工作頁" },
  dashboard: {
    signInFirst: "請先登入再查看控制台。", loadingEyebrow: "正在讀取帳戶資料", loadingTitle: "正在載入帳戶詳細資料...", accessEyebrow: "需要登入", accessTitle: "此工作台區域需要有效登入。", signIn: "登入", createAccount: "建立帳戶", lookupEyebrow: "帳戶查詢", lookupTitle: "找不到此帳戶。",
    metrics: { email: "帳戶電子郵件", emailBody: "已登入，可繼續上傳檔案或建立工作。", freeEmailBody: "已登入，可從一份完整 PDF 或樂譜圖片建立終身免費專案。", entitlement: "授權狀態", entitlementBody: "一年期存取權由啟用碼統一管理。", route: "樂譜工作台", routeValue: "掃描、編輯、轉換與移調", routeBody: "所有流程以 MusicXML 與 Score JSON 為基礎，並支援播放、練習與多格式匯出。", freeRouteValue: "一個完整免費專案", freeRouteBody: "免費專案可使用現有專案功能，每月含 25 點額度；升級可取得更多額度。" },
    statuses: { active: "有效", expired: "已到期", inactive: "未啟用" },
    profile: { eyebrow: "資料", title: "帳戶概覽", email: "電子郵件", created: "建立時間" },
    entitlement: { eyebrow: "授權", title: "存取期限", starts: "開始時間", ends: "結束時間", inactive: "尚未生效", missing: "沒有授權" },
    workflow: { eyebrow: "工作流程", title: "建議的下一步", step1Title: "1. 匯入或建立樂譜", step1Body: "可從 PDF、圖片、MusicXML、MIDI、簡譜或音訊進入結構化樂譜流程。", step1FreeBody: "上傳一份完整多頁 PDF 或一張樂譜圖片，建立可校正的辨識候選。", step2Title: "2. 校對、編輯與練習", step2Body: "在同一份修訂歷程中完成 OMR 校對、圖形編輯、移調、播放與分聲部練習。", step2FreeBody: "在「我的樂譜」校正候選，接著播放、移調、轉簡譜、保留版本、分享及匯出。", step3Title: "3. 匯出交付版本", step3Body: "依目前正式修訂產生 MusicXML、MIDI、PDF、圖片或高品質音訊。", step3FreeBody: "需要更多樂譜或每月工作容量時，再選擇 Starter、Converter Pro 或兌換既有啟用碼。" },
    actions: { eyebrow: "操作", title: "管理工作台", checkout: "線上付款開通", uploads: "開啟上傳頁", freeEditing: "開啟免費編輯", jobs: "開啟工作頁", redeem: "兌換新的啟用碼", supportAdmin: "開啟支援後台", signOut: "登出" },
    privacy: { eyebrow: "隱私與資料", title: "管理資料副本與帳戶生命週期", body: "資料匯出不包含密碼、工作階段權杖、重設權杖或分享密鑰。帳戶刪除有 14 天寬限期，之後會刪除樂譜、課堂與檔案，並將必須保留的付款稽核記錄去識別化。", export: "下載資料副本", exporting: "正在準備資料匯出...", exportFailed: "資料匯出失敗。", password: "目前密碼", confirmation: "輸入 DELETE 確認", schedule: "申請刪除帳戶", scheduling: "正在安排刪除...", pending: "帳戶刪除處於寬限期", pendingBody: "預定刪除時間", cancel: "取消帳戶刪除", cancelling: "正在取消...", required: "請輸入目前密碼並準確輸入 DELETE。", scheduled: "刪除已排定。此工作階段已登出；請在寬限期內重新登入以取消。", cancelled: "帳戶刪除已取消。", exportReady: "資料副本已下載。", statusAria: "帳戶資料請求狀態" },
  },
  operations: {
    operations: { eyebrow: "運行狀態", title: "基本健康狀態", loading: "正在檢查 API、儲存空間、Worker、付款與郵件狀態...", error: "目前無法載入執行環境狀態。", checked: "最近檢查", technicalDetails: "技術詳細資料", servicesAria: "執行環境服務狀態" },
    support: { eyebrow: "支援入口", title: "站內支援表單", body: "這些連結會開啟站內支援表單並預選類別。提交內容會傳送至 API，並自動寄出確認郵件。", openForm: "開啟表單", publicPage: "公開支援頁", templates: { payment: { title: "付款與訂單查核", description: "適用於付款後未出現權限或需要人工查核訂單。" }, activation: { title: "啟用與授權問題", description: "適用於兌換失敗、權限未生效或期限異常。" }, job: { title: "上傳或結果問題", description: "適用於 PDF 上傳失敗、工作停滯、下載異常或結果需人工確認。" }, privacy: { title: "隱私或刪除請求", description: "適用於刪除、匯出或隱私相關人工處理。" } } },
    statuses: { ok: "正常", warning: "注意", error: "異常", disabled: "停用" }, serviceLabels: { api: "應用程式 API", database: "資料庫", storage: "檔案儲存", worker: "辨識處理服務", payment: "付款設定", email: "郵件通知", unknown: "系統服務" }, serviceMessages: { ok: "運作正常。", warning: "目前可用，但設定或運行狀態需要檢查。", error: "目前無法使用，請稍後重試或聯絡支援。", disabled: "目前未啟用。" },
  },
  jobs: {
    signInFirst: "請先登入。", uploadFirst: "請先上傳 PDF。", downloadFailed: "下載失敗。", createdJob: "工作 {id} 已建立。",
    summary: { queued: ["排隊中", "等待 Worker 接手。"], processing: ["處理中", "正在產生預覽與輸出包。"], completed: ["已完成", "可下載最終 PDF 或草稿包。"] },
    create: { eyebrow: "建立轉換工作", title: "建立五線譜轉簡譜工作", body: "選擇已上傳的來源、保持轉換方向鎖定，再將 PDF 送入佇列。", input: "輸入檔案", inputPlaceholder: "選擇已上傳的 PDF", direction: "方向", lockedDirection: "五線譜 PDF 轉簡譜", draftTitle: "草稿感知流程", draftBody: "低信心頁面可保留為草稿，不會過早升級。", source: "所選來源", noSource: "尚未選擇來源", uploadHint: "若選單為空，請先上傳來源 PDF。", createButton: "建立工作", creating: "建立中...", refresh: "重新整理佇列", uploads: "開啟上傳頁", recentSources: "最近來源庫", emptySources: "尚未上傳 PDF。請先上傳，再回來建立轉換工作。", useThis: "使用此檔案" },
    monitor: { eyebrow: "佇列監控", title: "即時轉換面板", auto: "自動重新整理中", loading: "正在載入工作...", empty: "尚未建立工作。請在左側選擇 PDF 並建立第一個工作。", latest: "最新工作", created: "建立於", resultCenter: "結果中心", final: "此工作目前分類為最終結果。", draft: "此工作目前保留為草稿結果。", none: "此工作尚未產生可下載結果。", previewWaiting: "Worker 產生預覽文字後會顯示於此。", primary: "主要輸出", primaryTitle: "最終 PDF", primaryBody: "工作順利升級為最終版後即可下載。", fallback: "備用輸出", fallbackTitle: "草稿包", fallbackBody: "需在瀏覽器外人工校正時可下載。", downloadPdf: "下載結果 PDF", downloadDraft: "下載草稿包", notReady: "尚未就緒", liveAria: "即時轉換佇列" },
    archive: { eyebrow: "最近工作", title: "工作封存", body: "預覽文字、結果類型與下載入口會保留，方便回顧舊工作。" }, statuses: { queued: "排隊中", processing: "處理中", completed: "已完成", failed: "失敗" }, resultKinds: { none: "無", final: "最終版", draft: "草稿" }, directions: { staff_pdf_to_numbered: "五線譜 PDF → 簡譜" }, phases: { completed: "已完成", running: "運行中", waiting: "等待中" },
  },
  uploads: {
    signInFirst: "請先登入。", chooseFile: "請選擇 PDF 檔案。", uploadFailed: "上傳失敗。", downloadFailed: "下載失敗。", uploaded: "已成功上傳 {name}。", previewAwaiting: "等待上傳 PDF",
    metrics: { stored: ["已儲存樂譜", "每次上傳都會成為可重複使用的來源。"], format: ["接受格式", "目前正式環境僅接受五線譜 PDF。"], storage: ["總儲存量", "建立工作前可快速檢查批次上傳用量。"] },
    upload: { eyebrow: "上傳樂譜", title: "將五線譜加入工作台", body: "透過專注的上傳區與預覽內容加入可重用來源。", dropTitle: "拖曳樂譜到此處，或點擊選擇檔案", dropBody: "目前僅支援五線譜 PDF；圖片上傳與反向轉換尚未推出。", maxSize: "大小上限依 API 限制", cloud: "從雲端匯入", planned: "規劃中", selected: "已選擇並可上傳。", empty: "尚未選擇檔案。請選擇一份 PDF 建立可重用來源記錄。", uploadButton: "上傳 PDF", uploading: "上傳中...", clear: "清除選擇", jobs: "前往工作頁", inputAria: "選擇五線譜 PDF" },
    preview: { eyebrow: "即時預覽", title: "目前上傳內容", ready: "準備進入佇列", numbered: "簡譜預覽", previewBody: "清晰 PDF 可升級為最終輸出；品質較弱的素材會保留草稿交付。", latest: "最新儲存來源", latestEmpty: "尚無已儲存來源", latestHint: "上傳一份 PDF 即可開啟工作佇列。", next: "下一步", nextTitle: "建立轉換工作", nextBody: "PDF 儲存後，工作佇列會保持「五線譜 PDF → 簡譜」方向。", openQueue: "開啟工作佇列", downloadSource: "下載來源" },
    stored: { eyebrow: "已儲存檔案", title: "已上傳的五線譜 PDF", body: "這些檔案可作為工作輸入；下載可核對 API 儲存的原始來源。", loading: "正在載入檔案...", empty: "尚未上傳檔案。請先上傳五線譜 PDF 再建立工作。", download: "下載" }, fileKinds: { input_pdf: "輸入 PDF", unknown: "檔案" },
  },
} satisfies WorkspaceMessages;
