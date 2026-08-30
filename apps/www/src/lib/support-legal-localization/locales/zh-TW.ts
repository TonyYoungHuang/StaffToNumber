import type { SupportLegalLocalization } from "../types";

export const zhTWSupportLegal = {
  openGraphLocale: "zh_TW", homeBreadcrumb: "首頁",
  legalReviewNotice: { eyebrow: "法律翻譯提示", title: "本頁譯文為待審草案", body: "本譯文僅供參考，仍須由專業法律人士審閱；如與英文版衝突，以英文版為準。", ariaLabel: "法律譯文審閱提示" },
  support: {
    metadata: { title: "支援、聯絡與訂單查核 | ScoreTransposer", description: "聯絡 ScoreTransposer 支援，處理帳號、啟用碼、上傳辨識、結果下載與隱私請求。", keywords: ["ScoreTransposer 支援", "啟用協助", "樂譜上傳支援", "訂單查核", "隱私請求"], socialImageAlt: "英文介面的 ScoreTransposer 樂譜工作區輸出預覽" },
    schemaName: "ScoreTransposer 支援", schemaContactType: "客戶支援",
    hero: { eyebrow: "支援 / 聯絡 / 查核", title: "需要協助？請告訴我們發生了什麼", body: "你可以在此提交帳號、啟用、樂譜辨識、下載或隱私問題。資料越完整，我們越容易調查並回覆。", submitAction: "提交支援請求", faqAction: "查看常見問題", checkoutAction: "查看購買流程" },
    form: {
      eyebrow: "提交支援請求", title: "站內支援表單", body: "直接在網站提交支援請求。表單會送至 API、建立可追蹤的請求，並自動向聯絡信箱寄送確認信。", categoryLabel: "問題類別", categoryAriaLabel: "選擇支援問題類別", nameLabel: "聯絡人姓名（選填）", contactEmailLabel: "聯絡信箱", accountEmailLabel: "帳號信箱（選填）", orderReferenceLabel: "訂單編號 / 付款參考（選填）", jobReferenceLabel: "任務編號 / 檔名（選填）", subjectLabel: "主旨", messageLabel: "問題說明", messageHint: "請盡量說明觸發步驟、發生時間、可見錯誤或現象，以及已嘗試的處理方式。", honeypotLabel: "網站", submitting: "提交中...", submit: "提交支援請求", emailAction: "改用公開支援信箱", emailFallback: "若自動郵件暫時無法使用，仍可直接寄信至 {supportEmail}。", successSent: "已收到你的請求，編號為 {referenceCode}。確認信已寄出。", successPreview: "已收到你的請求，編號為 {referenceCode}。目前環境未設定正式郵件服務，確認內容已寫入 API 預覽記錄。", successFailed: "已收到你的請求，編號為 {referenceCode}，但確認信暫時無法自動寄送。直接聯絡支援時請引用此編號。",
      categories: { payment: { label: "付款 / 訂單", helper: "付款成功但帳號權益未出現、回跳異常、重複扣款疑問或人工查核。", subject: "付款 / 訂單查核請求" }, activation: { label: "啟用 / 權限", helper: "啟用碼無法兌換、權限未生效或到期日異常。", subject: "啟用 / 權限問題" }, job: { label: "上傳 / 結果", helper: "PDF 上傳失敗、任務停滯、下載異常或 final / draft 爭議。", subject: "上傳 / 結果支援請求" }, privacy: { label: "隱私 / 刪除", helper: "資料刪除、匯出或其他隱私人工查核。", subject: "隱私 / 刪除請求" }, general: { label: "其他", helper: "不屬於以上類別，或需要支援協助分流。", subject: "一般支援請求" } },
    },
    workflows: { eyebrow: "支援類別", title: "先將問題正確分類，再進入人工查核", items: [["01", "付款與訂單問題", "適用於結帳成功後帳號權益未出現、回跳流程不完整、重複扣款疑問或訂單需要人工查核。"], ["02", "啟用與權限問題", "適用於兌換失敗、權限未啟用、到期日異常，或需要確認帳號權限範圍。"], ["03", "上傳與結果問題", "適用於 PDF 上傳失敗、任務停滯、下載異常，或 final 與 draft 結果需要人工判斷。"]] },
    evidence: { eyebrow: "建議提供", title: "資料越完整，人工支援通常越快", status: "建議附上資料", points: ["聯絡信箱或帳號信箱", "購買時間、付款管道與付款截圖", "啟用碼、訂單編號、任務編號或檔名", "錯誤截圖、觸發步驟與大約發生時間"] },
    boundary: { eyebrow: "支援範圍", title: "支援可協助處理的問題", body: "支援範圍包括帳號存取、啟用碼、檔案上傳、樂譜辨識任務、結果查看與下載，以及隱私請求。", metrics: [["產品協助", "帳號與樂譜", "帳號、結帳、啟用、上傳、任務與結果交付問題。"], ["辨識說明", "需要檢查", "自動辨識可能需要人工校正；複雜樂譜請附原始檔與截圖。"], ["人工查核", "可受理", "訂單查核、兌換異常、下載異常與刪除請求。"]] },
    after: { eyebrow: "提交之後", title: "提交後會發生什麼", body: "成功提交後會建立請求編號。請妥善保存；郵件通知可用時，聯絡信箱也會收到確認信。", aboutAction: "查看關於", privacyAction: "隱私政策", termsAction: "服務條款" },
    final: { title: "立即提交支援請求", body: "請選擇問題類型，並提供帳號信箱、任務編號、檔名、大約時間與相關截圖。", formAction: "開啟支援表單", faqAction: "常見問題", checkoutAction: "結帳" },
  },
  copyright: {
    metadata: { title: "版權與侵權申訴 | ScoreTransposer", description: "針對樂譜、錄音或分享連結提交版權申訴，取得私密查詢碼並查看公開案件進度。", keywords: ["版權申訴", "樂譜下架請求", "侵權樂譜網址", "版權案件進度", "ScoreTransposer 版權"], socialImageAlt: "英文介面的 ScoreTransposer 樂譜預覽，用於版權申訴流程" },
    hero: { eyebrow: "版權與合規", title: "版權申訴與案件進度", body: "結構化提交、私密查詢、公開案件更新與內部稽核彼此分離。48 小時是首次回應目標，不代表法律結論或保證處理期限。" }, faqTitle: "常見問題",
    faqs: [["可以申訴哪些網址？", "請提交 ScoreTransposer 網站、應用程式或公開分享網域中的具體網址。"], ["為什麼查詢碼只顯示一次？", "平台只儲存查詢碼雜湊，無法從資料庫還原原始查詢碼。"], ["提交後會自動移除內容嗎？", "不會。平台會先審查材料，並在公開案件記錄中說明補件、採取措施或駁回原因。"]],
    form: { submitTitle: "提交版權申訴", submitBody: "請提供權利基礎、原創作品說明與平台內目標網址。提交後會產生申訴編號與一次性查詢碼。", submitFormAriaLabel: "版權申訴提交表單", name: "申訴人姓名", email: "聯絡信箱", organization: "機構 / 出版商（選填）", relationship: "與作品的關係", owner: "版權所有人", agent: "經授權代理人", work: "原創作品與權利說明", workHint: "請包含作品名稱、作者、首次發表或登記資料，以及主張的權利範圍。", targets: "疑似侵權的 ScoreTransposer 網址", targetsHint: "每行一個平台網址，最多 20 個。", evidence: "佐證連結（選填）", evidenceHint: "每行一個可公開存取的網址，最多 10 個。請勿在連結中放入敏感個人資料。", action: "要求平台採取的措施", goodFaith: "我基於誠信相信，上述使用未經權利人、代理人或法律授權。", accuracy: "我確認所填資料正確，並有權代表相關權利人提交本申訴。", signature: "電子簽名（輸入法定姓名）", honeypotLabel: "網站", submit: "提交申訴", submitting: "提交中...", receiptTitle: "申訴已登記", receiptStatus: "已收到", receiptBody: "請立即保存編號與查詢碼。基於安全考量，查詢碼之後不會再次顯示。", receiptAriaLabel: "版權申訴回執", due: "首次回應目標", trackTitle: "查詢申訴進度", trackBody: "查詢使用 POST，因此查詢碼不會寫入網址或瀏覽器歷史記錄。", trackFormAriaLabel: "版權申訴進度查詢表單", reference: "申訴編號", access: "查詢碼", lookup: "查詢進度", lookingUp: "查詢中...", current: "目前狀態", actionTaken: "已採取措施", history: "公開案件記錄", emptyHistory: "目前尚無公開案件更新。", statuses: { received: "已收到", validating: "資料核驗中", info_required: "需要補充資料", reviewing: "審查中", actioned: "已採取措施", rejected: "已駁回", closed: "已結案" } },
  },
  privacy: {
    metadata: { title: "線上樂譜平台隱私政策 | ScoreTransposer", description: "了解平台如何處理帳號資料、上傳樂譜與媒體、產生結果、資料匯出、刪除寬限期及保留規則。", keywords: ["ScoreTransposer 隱私", "樂譜檔案保留", "帳號刪除", "音樂資料隱私", "分析同意"], socialImageAlt: "英文介面的 ScoreTransposer 樂譜預覽，用於隱私政策" },
    hero: { eyebrow: "隱私政策", title: "scoretransposer.com 目前的隱私基準", body: "本政策說明 ScoreTransposer 如何處理帳號資料、上傳的樂譜與媒體、結構化修訂、產生的結果及支援記錄。", updatedPrefix: "更新日期", termsAction: "查看服務條款" },
    sections: [
      { title: "收集的資料", points: ["帳號資料，例如信箱、密碼雜湊、啟用狀態與權限期限。", "上傳的樂譜、掃描件、音訊或影片、結構化 MusicXML 與 Score JSON、產生的匯出檔及校正歷史。", "運作中繼資料，例如上傳時間、任務狀態、檔名與支援聯絡記錄。"] },
      { title: "資料用途", points: ["用於驗證使用者、確認付費權限，並提供樂譜掃描、編輯、轉換、移調、播放、練習與匯出流程。", "為已登入使用者保留來源檔與產生結果，以便在應用程式中檢查和下載。", "調查失敗任務、回應支援請求並改善啟發式轉換品質。"] },
      { title: "保留與刪除", points: ["帳號與權限記錄會在帳號啟用期間保留，並在需要時供後續支援使用。", "上傳來源檔與產生結果會保留，以支援下載、檢查與服務疑難排解。", "登入使用者可下載結構化資料副本，並在密碼驗證後申請刪除；刪除有 14 天取消寬限期。", "寬限期後會移除使用者樂譜、課堂資料、支援記錄與儲存檔案；稽核所需的付款記錄會去識別化。"] },
      { title: "資料分享", points: ["不會出售客戶檔案。", "為交付服務，流量、託管、DNS、儲存、記錄與部署供應商可能處理必要的運作資料。", "法律要求或為保護服務免受濫用、詐欺或安全事件時，可能依法揭露資料。"] },
      { title: "Cookie 與分析", points: ["功能性語言 Cookie 會記住所選介面語言。", "只有在明確同意且正式環境分析已啟用時，才會載入 GA4 或 Microsoft Clarity。", "拒絕分析不會失去公開內容或產品流程的存取權。"] },
      { title: "安全基準", points: ["轉換工具透過使用者驗證與啟用式權限檢查控制存取。", "正式環境只應由授權人員存取，密鑰應由託管平台管理而非寫入原始碼。", "使用者仍須避免違法或未授權上傳，並在出版或演出前確認音樂正確性。"] },
    ],
    contact: { title: "聯絡與政策變更", body: "資料匯出與帳號刪除可在登入後的控制台操作。若無法登入或需要政策說明，請透過公開支援管道並確認帳號身分。", note: "若託管、儲存、分析、付款或帳號處理有重大變更，我們會更新本政策。", action: "提出隱私請求" },
    related: { eyebrow: "相關資訊", title: "繼續查看條款與產品資訊", body: "從搜尋或結帳來到此頁的訪客，通常也會確認產品定位、服務範圍與購買流程。", aboutAction: "開啟關於與支援", termsAction: "開啟條款", checkoutAction: "查看結帳流程" },
    continue: { eyebrow: "繼續瀏覽", title: "接下來通常會前往支援、條款與購買說明。", body: "若對資料處理、帳號刪除或隱私權有疑問，請透過支援表單聯絡我們。", supportAction: "聯絡支援", homeAction: "返回首頁" },
  },
  terms: {
    metadata: { title: "樂譜平台服務條款 | ScoreTransposer", description: "查看 MusicXML 平台關於匯入、編輯、移調、Jianpu、播放、匯出、教學、版權與可接受使用的條款。", keywords: ["ScoreTransposer 條款", "樂譜訂閱條款", "樂譜上傳規則", "取消訂閱", "版權與可接受使用"], socialImageAlt: "英文介面的 ScoreTransposer 樂譜預覽，用於服務條款" },
    hero: { eyebrow: "服務條款", title: "ScoreTransposer 服務條款", body: "本條款說明 ScoreTransposer 免費存取、訂閱啟用、自動續訂、取消、結果交付與使用者責任。", updatedPrefix: "更新日期", privacyAction: "查看隱私政策" },
    sections: [
      { title: "服務範圍", points: ["服務支援樂譜專案、結構化樂譜匯入、五線譜/Jianpu 轉換、移調、校正、播放、教學流程及已設定的匯出格式。", "OMR、PDF/圖片輸出、高品質音訊與音訊轉譜需要已設定的外部工具，在特定部署中可能無法使用。", "網站、應用程式與輸出內容可能隨服務演進，但購買時應僅依據當時公布的實際範圍。"] },
      { title: "帳號與訂閱存取", points: ["註冊 Free 帳號可在公布的每月任務與儲存限制內建立一個完整樂譜專案；該免費專案不需要付款卡或啟用碼。", "付費權限可在付款供應商確認訂閱後自動啟用，或兌換授權管道發出的有效啟用碼。", "訂閱或啟用權限與適用期限綁定，可能因詐欺、濫用、付款爭議或違反政策而暫停。", "使用者負責妥善保管帳號憑證及帳號中的所有活動。"] },
      { title: "上傳與輸出", points: ["使用者只能上傳自己有權處理的內容。", "當系統無法有把握地提升結果時，輸出可能是 final PDF 或 draft 套件。", "出版、教學、排練或演出前，使用者仍須檢查音樂正確性、版權合規與適用性。"] },
      { title: "計費、續訂、取消與退款", points: ["Starter 與 Converter Pro 是按月或按年自動續訂的訂閱，價格、幣別、稅費與計費週期以結帳頁為準。", "若未取消，訂閱會自動續訂，付款供應商會在新計費週期開始時扣款。", "使用者可在 Billing 取消，或於下次續訂前聯絡支援。取消會停止未來續訂；除退款、付款爭議、詐欺審查或法律要求外，付費權限通常持續到當期結束。", "退款可透過支援提出。資格依購買時條款、付款供應商規則及強制消費者法律；核准退款會反映於 Billing，全額退款可能終止相關付費權限。"] },
      { title: "可接受使用", points: ["不得利用服務上傳惡意軟體、侵權內容或意圖干擾平台的檔案。", "禁止自動化濫用、共用憑證、抓取私人客戶資料及繞過權限控制。", "發現濫用、安全風險或法律曝險時，ScoreTransposer 可暫停或終止存取。"] },
    ],
    purchase: { title: "購買與退款說明", body: "訂閱價格、計費週期、稅費與付款方式以結帳頁為準；取消與退款依本條款、購買揭露及供應商規則。", note: "方案、價格、續訂機制或服務範圍有重大變更時，我們會更新相關說明。", supportAction: "提出支援請求" },
    related: { eyebrow: "相關頁面", title: "繼續查看隱私、產品資訊與支援", body: "確認服務範圍後，使用者通常也會確認資料處理、支援管道與實際啟用流程。", privacyAction: "開啟隱私政策", copyrightAction: "提交版權申訴", aboutAction: "開啟關於與支援", checkoutAction: "查看結帳流程" },
    help: { eyebrow: "需要協助", title: "對條款或帳號權限有疑問？", body: "繼續查看隱私與產品資訊，或透過支援表單提交具體問題。", supportAction: "聯絡支援", homeAction: "返回首頁" },
  },
} as const satisfies SupportLegalLocalization;
