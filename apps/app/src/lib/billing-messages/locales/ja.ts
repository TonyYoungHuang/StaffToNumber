import type { BillingMessageCatalog } from "../types";

export const jaBillingMessages = {
  reviewNotice: "以下の決済文言は翻訳草案で、専門家による確認前です。相違がある場合は、英語の条件と決済サービスの画面が優先されます。",
  activation: {
    page: { title: "アクティベーションコードを利用", description: "購入時に受け取ったコードを入力し、現在の楽譜ワークスペースを1年間利用できるようにします。" },
    form: {
      eyebrow: "コードを利用", title: "購入内容を1年間のアクセス権に交換", body: "購入時に提供されたアクティベーションコードを入力してください。アクセス権を現在のアカウントに紐付けるため、先にログインしてください。",
      devSeed: "開発用デモコード", devSeedFootnote: "ローカル開発環境または明示的なテスト環境でのみ表示されます。", codeLabel: "アクティベーションコード", codePlaceholder: "コードを入力",
      submit: "コードを利用", submitting: "処理中...", fillDemo: "デモコードを入力", loginFirst: "コードを利用する前にログインしてください。", required: "アクティベーションコードを入力してください。",
      success: "有効化しました。楽譜を開いています...", footnote: "有効なコードは、アカウントの利用期間を直ちに更新します。", fallbackError: "コードを利用できませんでした。もう一度お試しください。",
    },
  },
  checkout: {
    unavailable: {
      eyebrow: "決済の公開状況", title: "本番決済は実取引の最終確認中です。",
      body: "本番サイトではテスト注文を作成せず、staging の決済にも移動しません。実際の支払い、返金、定期購入の更新が最終確認を通過した後に、この入口を公開します。", continueFree: "無料編集を続ける",
    },
    page: {
      eyebrow: "クレジット料金", title: "クレジットプランを選択", body: "課金対象となる操作が成功するたびに1クレジットを使用します。ログイン前に料金、機能、リソースを比較できます。",
      promoLabel: "年払いでお得", promoValue: "約45%～49%お得", planNote: "月間クレジットは毎月リセットされ、未使用分は繰り越されません。閲覧、再生操作、未送信の基本編集ではクレジットを使いません。",
    },
    selector: {
      plansAria: "クレジットプランを選択", selectedPlan: "選択中のプラン", continueTemplate: "{name} {cycle}で続ける", freeEyebrow: "無料",
      freeTitle: "最初の完全な楽譜を無料で作成", freeBody: "支払いもカードも不要です。無料プランでは完全な楽譜プロジェクトを1件保持し、毎月クレジットを受け取れます。", freeCta: "無料で楽譜を作成", creditUsage: "実際に使ったときだけクレジットを差し引き", includedCapabilities: "含まれる機能", benefitsAndResources: "特典とリソース",
    },
    client: {
      checkoutEyebrow: "決済", title: "オンラインで支払い、アクセス権を自動有効化", body: "支払いが完了すると、登録アカウントのアクセス権が自動で有効になります。海外のお客様はコードを手動で利用する必要がありません。",
      provider: "決済サービス", plan: "サブスクリプション種別", individual: "個人", school: "学校・組織の席", organization: "請求先組織", organizationPlaceholder: "組織を選択",
      noOrganizations: "このアカウントには請求に使用できる組織がありません。", seats: "席数", seatsHelp: "2～100,000席を選択できます。",
      stripeTitle: "Stripe", stripeLiveBody: "海外発行カードやウォレットでの支払いに適しています。", stripeBuildingBody: "本番決済は未接続です。現在は請求せずに要望だけを記録します。",
      paddleTitle: "Paddle", paddleLiveBody: "Paddle が海外決済、税、サブスクリプションを処理します。", paddleBuildingBody: "本番用加盟店アカウントは承認待ちです。現在は請求せずに要望だけを記録します。",
      available: "利用可能", building: "開発中", waiting: "本番用加盟店の承認待ち", button: "このタブで安全な支払いに進む", intentButton: "購入希望を運営者に通知",
      loading: "決済ページに移動しています...", checking: "ログイン状態を確認しています...", signInEyebrow: "ログインが必要", signInTitle: "決済サービスを選ぶ前にログイン",
      signInBody: "Google またはメールでログインしてください。ログイン後もこのページに留まり、Stripe と Paddle を確認できます。公開前のサービスから請求されることはありません。",
      signInPoints: ["クレジットを正しいアカウントに付与", "購入希望を送信できるのはログイン済みのお客様のみ", "Google またはメールでログイン可能"], selectedPlan: "選択中のプラン",
      accountNote: "Google アカウントはサブスクリプションの付与先を確認するために使います。カード、Google Pay などは選択した決済サービスが提供し、決済はこのタブで開きます。",
      intentNote: "続行前に、サーバーが運営者へ購入希望メールを送ります。公開済みのサービスだけが決済へ進み、開発中のサービスから請求されることはありません。",
      providerBuildingTemplate: "{provider} の本番決済は開発中です。購入希望は運営者に通知され、請求は発生していません。", notificationFailed: "運営者に通知できませんでした。後でもう一度お試しください。請求は発生していません。",
      fallbackError: "決済を開始できませんでした。もう一度お試しください。",
    },
    status: {
      loading: "支払い状況を確認しています...", pendingTitle: "支払いを確認中", pendingBody: "支払いが完了すると、現在のアカウントでアクセス権が自動的に有効になります。",
      successTitle: "支払い完了、アカウントを有効化しました", successBody: "アクセス権を利用できます。コードを手動で入力せずに楽譜を開けます。", cancelledTitle: "支払いはキャンセルされました", cancelledBody: "完了した支払いは記録されていません。楽譜に戻るか、プランを選び直せます。", failedTitle: "支払いが完了しませんでした", failedBody: "アクセス権の変更は確認されていません。決済サービスの画面を確認するか、再試行してください。", scores: "自分の楽譜を開く", jobs: "ジョブを開く", fallbackError: "支払い状況を読み込めませんでした。もう一度お試しください。",
    },
  },
  billing: {
    page: { eyebrow: "請求", title: "サブスクリプション、更新、返金、学校用の席を管理します。", body: "アクセス権は検証済みの決済サービス Webhook 台帳に従い、更新失敗、解約、返金も権限状態に反映されます。" },
    manager: {
      loading: "請求情報を読み込んでいます...", fallbackError: "請求情報を読み込めませんでした。もう一度お試しください。", signIn: "請求情報を見るにはログインしてください。",
      creditEyebrow: "クレジット残高", availableCredits: "今月利用できるクレジット", creditUnit: "クレジット", creditSummaryTemplate: "今月は {limit} クレジット、{used} 使用済みです。", creditUsage: "今月のクレジット使用量", storage: "ファイル保存容量",
      quotaNote: "課金対象となる操作が成功するたびに1クレジットを使用します。クレジットは毎月リセットされ、繰り越されません。",
      freeEyebrow: "無料利用状況", noPaidTitle: "有効な有料プランはありません", freeBody: "無料アカウントでは、完全な複数ページ PDF または楽譜画像から生涯利用できるプロジェクトを1件作成し、修正、再生、移調、数字譜、共有、書き出しを利用できます。無料枠は {credits} です。", unlock: "フルアクセスを有効化",
      subscriptionsEyebrow: "サブスクリプション", subscriptionsTitle: "アクセス権と更新状況", manageStripe: "Stripe の支払い方法を管理", managingStripe: "Stripe を開いています...", noSubscriptions: "このアカウントに紐付くサブスクリプションはありません。",
      currentPeriodEndsTemplate: "現在の期間は {date} まで", noFixedEnd: "期間終了日は設定されていません", renewalFailed: "直近の更新に失敗しました。支払い方法を更新してください。", cancellationScheduled: "現在の期間終了時に解約されます。",
      seatsTemplate: "{count} 席", cancel: "期間終了時に解約", canceling: "解約処理中...", cancelSuccess: "現在の請求期間の終了時にサブスクリプションを解約します。",
      memberEmail: "メンバーのメール", memberEmailPlaceholder: "member@example.com", assignSeat: "席を割り当てる", assigningSeat: "割り当て中...", revoke: "取り消す", revoking: "取り消し中...",
      invoicesEyebrow: "請求書", invoicesTitle: "支払い、返金、失敗の履歴", noInvoices: "請求書はまだありません。", invoicePaidTemplate: "{date} に支払済み", invoiceDueTemplate: "支払期限：{date}", invoiceFailedTemplate: "{date} に失敗", refundedTemplate: "返金済み {amount}", viewInvoice: "請求書を見る", amountPending: "金額を確認中",
      subscriptionStatuses: { trialing: "試用中", active: "有効", past_due: "支払期限超過", paused: "一時停止", unpaid: "未払い", incomplete: "未完了", cancelled: "解約済み" },
      invoiceStatuses: { draft: "下書き", open: "未払い", paid: "支払済み", failed: "失敗", void: "無効", refunded: "返金済み" },
      quotaTiers: { free: "無料", starter: "Starter", "converter-pro": "Converter Pro" }, providers: { stripe: "Stripe", paddle: "Paddle" },
    },
  },
  plans: {
    names: { free: "無料", starter: "Starter", "converter-pro": "Converter Pro" }, cycles: { lifetime: "無期限", monthly: "月払い", annual: "年払い" },
    badges: { free: "ずっと無料", "starter-monthly": "柔軟な月払い", "starter-annual": "Starter 年払い", "converter-pro-monthly": "大容量", "converter-pro-annual": "大容量の年払い" },
    audiences: {
      free: "完全な楽譜1件で現在の全プロジェクト機能を試す", "starter-monthly": "個人の楽譜を継続的に処理する方向け", "starter-annual": "クレジット単価を抑えて長期間使う個人向け",
      "converter-pro-monthly": "毎月より多くの楽譜を処理する個人向け", "converter-pro-annual": "長期かつ高頻度で個人の楽譜を処理する方向け",
    },
    ctas: { free: "無料で楽譜を作成", "starter-monthly": "Starter 月払いを選択", "starter-annual": "Starter 年払いを選択", "converter-pro-monthly": "Converter Pro 月払いを選択", "converter-pro-annual": "Converter Pro 年払いを選択" },
    unitPriceTemplate: "1クレジットあたり {unitPrice}", freeUnitPriceTemplate: "完全な楽譜プロジェクト {projectCount} 件", creditsTemplate: "月 {monthlyCredits} クレジット", freeCreditsTemplate: "完全な楽譜 {projectCount} 件 · 月 {monthlyCredits} クレジット",
    benefits: {
      freeProject: "完全な楽譜プロジェクトを {projectCount} 件、生涯作成", moreThanFreeProject: "無料の楽譜プロジェクト {projectCount} 件という制限を解除", starterIncluded: "現在の Starter の全機能", starterMonthlyIncluded: "現在の Starter 月払いの全機能", converterMonthlyIncluded: "現在の Converter Pro 月払いの全機能",
      editor: "オンラインエディター、パート譜コピー作成 Beta、リアルタイム共同編集 Beta", practice: "再生、ブラウザー録音・練習フィードバック Beta、スマート移調", conversion: "五線譜 ↔ 数字譜、MusicXML ↔ MIDI 変換",
      exports: "対応するレンダラーが利用可能な場合の PDF／SVG／PNG と WAV／MP3 書き出し", freeExports: "無料楽譜で公開済みの書き出し機能とプロジェクト機能を利用",
    },
    resources: {
      monthlyCredits: "毎月 {monthlyCredits} クレジット", monthlyCreditsReset: "毎月 {monthlyCredits} クレジット、月ごとにリセット", storage: "ファイル保存容量 {storage} GB", personalLibrary: "個人ライブラリ、改訂履歴、公開楽譜カタログ",
      monthlyRenewal: "長期契約なしの月次更新", annualSavings: "12回の月払いと比べて {annualSavings} お得", freeLibrary: "公開楽譜ライブラリと CC0 ダウンロード", noCard: "カード不要。無料プロジェクトを保持できます",
    },
  },
} satisfies BillingMessageCatalog;
