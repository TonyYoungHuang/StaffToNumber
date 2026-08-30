import type { BillingMessageCatalog } from "../types";

export const zhTWBillingMessages = {
  reviewNotice: "以下付款文案為翻譯草案，尚待專業複核；如有衝突，以英文條款與支付平台頁面為準。",
  activation: {
    page: { title: "兌換啟用碼", description: "輸入購買後取得的啟用碼，為目前的樂譜工作台開通一年使用權限。" },
    form: {
      eyebrow: "兌換啟用碼", title: "將購買記錄兌換為一年存取權", body: "輸入購買時提供的啟用碼。請先登入，以便將存取權綁定到目前帳戶。",
      devSeed: "開發示範碼", devSeedFootnote: "僅在本機開發或明確的測試環境中顯示。", codeLabel: "啟用碼", codePlaceholder: "輸入啟用碼",
      submit: "兌換啟用碼", submitting: "兌換中...", fillDemo: "填入示範碼", loginFirst: "請先登入，再兌換啟用碼。", required: "請輸入啟用碼。",
      success: "啟用成功，正在開啟我的樂譜...", footnote: "有效的啟用碼會立即更新帳戶的授權起訖時間。", fallbackError: "目前無法兌換啟用碼，請重試。",
    },
  },
  checkout: {
    unavailable: {
      eyebrow: "付款上線狀態", title: "正式付款正在完成實際交易驗收。",
      body: "正式網站不會建立測試訂單或重新導向 staging 付款。實際付款、退款與訂閱續費通過最終驗收後，此入口才會開放。", continueFree: "繼續免費編輯",
    },
    page: {
      eyebrow: "點數付費方案", title: "選擇你的點數方案", body: "每次符合計費規則的成功操作會使用一點。登入前可比較價格、功能與資源。",
      promoLabel: "年繳更優惠", promoValue: "約節省 45%～49%", planNote: "每月點數會按月重設，未使用點數不會累積。檢視、播放控制與未提交的基本編輯不使用點數。",
    },
    selector: {
      plansAria: "選擇點數方案", selectedPlan: "目前已選", continueTemplate: "繼續購買 {name} {cycle}", freeEyebrow: "免費版",
      freeTitle: "免費建立你的第一份完整樂譜", freeBody: "無需付款或信用卡。免費方案會長期保留一個完整樂譜專案，並按月提供點數。", freeCta: "免費建立樂譜", creditUsage: "僅在實際使用時扣除點數", includedCapabilities: "包含功能", benefitsAndResources: "權益與資源",
    },
    client: {
      checkoutEyebrow: "付款", title: "線上付款並自動開通權限", body: "付款成功後，權限會自動開通到註冊帳戶。國際使用者不必手動兌換啟用碼。",
      provider: "支付服務", plan: "訂閱類型", individual: "個人訂閱", school: "學校／機構席位", organization: "付款機構", organizationPlaceholder: "選擇機構",
      noOrganizations: "目前帳戶沒有可用於購買席位的機構。", seats: "席位數量", seatsHelp: "可選擇 2 至 100,000 個席位。",
      stripeTitle: "Stripe", stripeLiveBody: "適合國際信用卡與錢包付款。", stripeBuildingBody: "正式付款尚未連接；目前只記錄需求，不會扣款。",
      paddleTitle: "Paddle", paddleLiveBody: "由 Paddle 處理海外付款、稅務與訂閱。", paddleBuildingBody: "正式商戶仍待驗收；目前只記錄需求，不會扣款。",
      available: "已開通", building: "建置中", waiting: "等待正式商戶驗收", button: "在目前頁面進入安全付款", intentButton: "通知站長我的購買需求",
      loading: "正在前往付款頁面...", checking: "正在檢查登入狀態...", signInEyebrow: "需要登入", signInTitle: "先登入，再選擇支付服務",
      signInBody: "使用 Google 或電子郵件登入。登入後會留在此頁，可繼續查看 Stripe 與 Paddle；尚未正式開通的服務不會扣款。",
      signInPoints: ["確認點數方案歸屬到正確帳戶", "只有已登入使用者可以提交購買需求", "可使用 Google 或電子郵件登入"], selectedPlan: "目前選擇",
      accountNote: "Google 帳戶用於確認訂閱歸屬；信用卡、Google Pay 等付款方式由所選服務提供。付款會在目前分頁開啟。",
      intentNote: "繼續前，伺服器會先向站長寄送購買意向郵件。只有已開通的服務會前往付款；建置中的服務不會扣款。",
      providerBuildingTemplate: "{provider} 正式付款正在建置。購買需求已通知站長，目前沒有產生扣款。", notificationFailed: "目前無法通知站長，請稍後重試。沒有產生扣款。",
      fallbackError: "目前無法開始付款，請重試。",
    },
    status: {
      loading: "正在檢查付款狀態...", pendingTitle: "正在確認付款結果", pendingBody: "付款完成後，系統會自動將權限開通到目前帳戶。",
      successTitle: "付款成功，帳戶已自動開通", successBody: "權限已生效。現在可直接開啟我的樂譜，無需手動兌換啟用碼。", cancelledTitle: "付款已取消", cancelledBody: "系統沒有記錄已完成的付款。你可返回我的樂譜或重新選擇方案。", failedTitle: "付款未完成", failedBody: "系統未確認權限變更。請查看支付服務頁面或重試。", scores: "開啟我的樂譜", jobs: "查看工作", fallbackError: "目前無法載入付款狀態，請重試。",
    },
  },
  billing: {
    page: { eyebrow: "帳單中心", title: "管理訂閱、續費、退款與學校席位。", body: "訂閱存取權以支付服務的已驗證 Webhook 帳本為準，續費失敗、取消與退款都會同步反映在權限狀態。" },
    manager: {
      loading: "正在載入帳單資訊...", fallbackError: "目前無法載入帳單資訊，請重試。", signIn: "請先登入以查看帳單。",
      creditEyebrow: "點數餘額", availableCredits: "本月可用點數", creditUnit: "點數", creditSummaryTemplate: "本月共 {limit} 點，已使用 {used} 點。", creditUsage: "本月點數使用", storage: "檔案儲存空間",
      quotaNote: "每次符合計費規則的成功操作會使用一點；點數按月重設，未使用點數不會累積。",
      freeEyebrow: "免費使用狀態", noPaidTitle: "目前沒有生效中的付費方案", freeBody: "免費帳戶可從一份完整多頁 PDF 或樂譜圖片建立一個永久專案，並使用校正、播放、移調、轉簡譜、分享與匯出；免費額度為 {credits}。", unlock: "開通完整權限",
      subscriptionsEyebrow: "訂閱", subscriptionsTitle: "存取權與續費狀態", manageStripe: "管理 Stripe 付款方式", managingStripe: "正在開啟 Stripe...", noSubscriptions: "目前帳戶尚無訂閱。",
      currentPeriodEndsTemplate: "目前週期至 {date}", noFixedEnd: "沒有固定的週期結束時間", renewalFailed: "最近一次續費失敗，請更新付款方式。", cancellationScheduled: "已安排在目前週期結束時取消。",
      seatsTemplate: "{count} 個席位", cancel: "於週期結束時取消", canceling: "正在取消...", cancelSuccess: "訂閱將於目前計費週期結束時取消。",
      memberEmail: "成員電子郵件", memberEmailPlaceholder: "member@example.com", assignSeat: "分配席位", assigningSeat: "正在分配...", revoke: "撤銷", revoking: "正在撤銷...",
      invoicesEyebrow: "帳單", invoicesTitle: "付款、退款與失敗記錄", noInvoices: "目前沒有帳單記錄。", invoicePaidTemplate: "付款時間：{date}", invoiceDueTemplate: "到期時間：{date}", invoiceFailedTemplate: "失敗時間：{date}", refundedTemplate: "已退款 {amount}", viewInvoice: "查看帳單", amountPending: "金額待確認",
      subscriptionStatuses: { trialing: "試用中", active: "有效", past_due: "逾期", paused: "已暫停", unpaid: "未付款", incomplete: "未完成", cancelled: "已取消" },
      invoiceStatuses: { draft: "草稿", open: "待付款", paid: "已付款", failed: "失敗", void: "已作廢", refunded: "已退款" },
      quotaTiers: { free: "免費版", starter: "Starter", "converter-pro": "Converter Pro" }, providers: { stripe: "Stripe", paddle: "Paddle" },
    },
  },
  plans: {
    names: { free: "免費版", starter: "Starter", "converter-pro": "Converter Pro" }, cycles: { lifetime: "永久", monthly: "月繳", annual: "年繳" },
    badges: { free: "永久免費", "starter-monthly": "彈性月繳", "starter-annual": "Starter 年繳", "converter-pro-monthly": "更高容量", "converter-pro-annual": "高容量年繳" },
    audiences: {
      free: "用一份完整樂譜體驗目前所有專案級功能", "starter-monthly": "適合持續處理個人樂譜的使用者", "starter-annual": "適合長期使用並希望降低單次點數成本的個人使用者",
      "converter-pro-monthly": "適合每月處理更多樂譜的高頻個人使用者", "converter-pro-annual": "適合長期、高頻處理個人樂譜的使用者",
    },
    ctas: { free: "免費建立樂譜", "starter-monthly": "選擇 Starter 月繳", "starter-annual": "選擇 Starter 年繳", "converter-pro-monthly": "選擇 Converter Pro 月繳", "converter-pro-annual": "選擇 Converter Pro 年繳" },
    unitPriceTemplate: "每點 {unitPrice}", freeUnitPriceTemplate: "{projectCount} 個完整樂譜專案", creditsTemplate: "每月 {monthlyCredits} 點", freeCreditsTemplate: "{projectCount} 個完整樂譜 · 每月 {monthlyCredits} 點",
    benefits: {
      freeProject: "永久建立 {projectCount} 個完整樂譜專案", moreThanFreeProject: "不再受 {projectCount} 個免費樂譜專案限制", starterIncluded: "包含 Starter 的所有現有功能", starterMonthlyIncluded: "包含 Starter 月繳的所有現有功能", converterMonthlyIncluded: "包含 Converter Pro 月繳的所有現有功能",
      editor: "線上樂譜編輯、聲部分譜副本與多人協作 Beta", practice: "練習播放、瀏覽器錄音回饋 Beta 與智慧移調", conversion: "五線譜／簡譜及 MusicXML／MIDI 轉換",
      exports: "對應渲染服務可用時，支援 PDF／SVG／PNG 與 WAV／MP3 匯出", freeExports: "在該免費樂譜內使用已開放的匯出與專案級功能",
    },
    resources: {
      monthlyCredits: "每月 {monthlyCredits} 點", monthlyCreditsReset: "每月 {monthlyCredits} 點，按月重設", storage: "{storage} GB 檔案儲存空間", personalLibrary: "個人樂譜庫、修訂記錄與開放曲庫",
      monthlyRenewal: "按月續費，可隨時停止後續續費", annualSavings: "相較連續月繳一年節省 {annualSavings}", freeLibrary: "開放曲庫瀏覽與 CC0 檔案下載", noCard: "無需信用卡，免費專案長期保留",
    },
  },
} satisfies BillingMessageCatalog;
