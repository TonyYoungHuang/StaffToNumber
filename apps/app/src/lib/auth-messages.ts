import type { SupportedLocale } from "@score/i18n";

export type AuthMessageCatalog = {
  routes: {
    login: {
      title: string;
      checkoutTitle: string;
      description: string;
      checkoutDescription: string;
    };
    register: { title: string; description: string };
    forgotPassword: { title: string; description: string };
    resetPassword: { title: string; description: string };
  };
  notFound: {
    eyebrow: string;
    title: string;
    body: string;
    edit: string;
    home: string;
    upgrade: string;
  };
  shell: {
    eyebrow: string;
    quote: string;
    proofTitle: string;
    proofBody: string;
    accessTitle: string;
    accessBody: string;
    scopeTitle: string;
    scopeBody: string;
    draftTitle: string;
    draftBody: string;
    back: string;
    preview: string;
  };
  form: {
    shared: {
      googleDivider: string;
      googleButtonRegionLabel: string;
      email: string;
      emailPlaceholder: string;
      password: string;
      passwordPlaceholder: string;
      submitWaiting: string;
      redeem: string;
      forgot: string;
      googleFailed: string;
    };
    register: {
      eyebrow: string;
      title: string;
      body: string;
      submit: string;
      switch: string;
      footnote: string;
      success: string;
    };
    login: {
      eyebrow: string;
      title: string;
      body: string;
      submit: string;
      switch: string;
      footnote: string;
      success: string;
    };
  };
  resetRequest: {
    eyebrow: string;
    title: string;
    body: string;
    email: string;
    placeholder: string;
    submit: string;
    submitting: string;
    back: string;
    success: string;
  };
  resetConfirm: {
    eyebrow: string;
    title: string;
    body: string;
    loading: string;
    invalid: string;
    password: string;
    confirm: string;
    placeholder: string;
    submit: string;
    submitting: string;
    requestAgain: string;
    backToSignIn: string;
    mismatch: string;
    success: string;
  };
  entitlement: {
    checking: string;
    redirecting: string;
    deniedEyebrow: string;
    deniedTitle: string;
    deniedBody: string;
    unlockAction: string;
    redeemAction: string;
    back: string;
  };
};

export const AUTH_MESSAGE_CATALOGS = {
  en: {
    routes: {
      login: {
        title: "Sign in",
        checkoutTitle: "Sign in to continue to checkout",
        description: "Continue to your saved scores, edit history, and exports.",
        checkoutDescription: "Sign in with Google or email. Google identifies the account receiving access; payment is still handled securely by the configured provider.",
      },
      register: {
        title: "Create your account",
        description: "Create an account with Google or email and build one lifetime free project from a complete multi-page staff-score PDF or score image.",
      },
      forgotPassword: {
        title: "Forgot password",
        description: "Enter your account email and the system will prepare a password reset message so you can regain access to the current studio.",
      },
      resetPassword: {
        title: "Reset password",
        description: "Verify the reset link, set a new password, and sign in again to continue using the app.",
      },
    },
    notFound: {
      eyebrow: "Page not found",
      title: "This app page does not exist. Return to a live studio route.",
      body: "Return to free editing, the studio homepage, or upgrade status to continue.",
      edit: "Edit for free",
      home: "Studio home",
      upgrade: "Upgrade status",
    },
    shell: {
      eyebrow: "Secure score-workspace access",
      quote: "Sign in to keep your scores, edits, and exports together in one account.",
      proofTitle: "Real example · score to practice audio",
      proofBody: "Control tempo, loops, and parts from a structured score, then create practice media.",
      accessTitle: "Sign in to edit for free",
      accessBody: "Upload one complete multi-page PDF or score image and keep a lifetime free project for correction, playback, conversion, sharing, and export.",
      scopeTitle: "Everything stays in one place",
      scopeBody: "Correct the recognized score, convert notation, transpose, practice, and export without moving between tools.",
      draftTitle: "Your original stays safe",
      draftBody: "Recognition creates a result for your review and never replaces an approved version without confirmation.",
      back: "Return to studio",
      preview: "Edit for free",
    },
    form: {
      shared: {
        googleDivider: "or use email",
        googleButtonRegionLabel: "Google account sign-in",
        email: "Email",
        emailPlaceholder: "you@example.com",
        password: "Password",
        passwordPlaceholder: "At least 8 characters",
        submitWaiting: "Please wait...",
        redeem: "Redeem activation code (Mainland China)",
        forgot: "Forgot password",
        googleFailed: "Google sign-in did not finish. Please try again.",
      },
      register: {
        eyebrow: "Create account",
        title: "Create your score account",
        body: "Continue with Google, or create an account with email and password. Create one lifetime free project from a complete multi-page PDF or score image.",
        submit: "Create account",
        switch: "Already have an account",
        footnote: "Free includes one complete lifetime score project with current correction, playback, transposition, Jianpu, version, sharing, and export tools, plus 25 credits monthly.",
        success: "Account created. Redirecting...",
      },
      login: {
        eyebrow: "Sign in",
        title: "Welcome back",
        body: "Continue with Google or email to view, edit, and export your scores.",
        submit: "Sign in",
        switch: "Need an account",
        footnote: "If you bought an activation code through a mainland-China sales channel, redeem it after signing in.",
        success: "Signed in. Redirecting...",
      },
    },
    resetRequest: {
      eyebrow: "Password reset",
      title: "Send a reset link",
      body: "Enter the account email and the system will prepare a password reset email. If transactional email is not configured yet, the link will appear in API preview logs.",
      email: "Account email",
      placeholder: "you@example.com",
      submit: "Send reset email",
      submitting: "Sending...",
      back: "Back to sign in",
      success: "If that account exists, a password reset email has been prepared. Check your inbox or contact support.",
    },
    resetConfirm: {
      eyebrow: "Reset password",
      title: "Set a new password",
      body: "This page verifies that the reset link is still valid. Submitting a new password revokes previous sign-in sessions and requires a fresh login.",
      loading: "Checking the reset link...",
      invalid: "This reset link is invalid or expired. Request a new one.",
      password: "New password",
      confirm: "Confirm new password",
      placeholder: "At least 8 characters",
      submit: "Save new password",
      submitting: "Saving...",
      requestAgain: "Request a new link",
      backToSignIn: "Back to sign in",
      mismatch: "The two passwords do not match.",
      success: "Password updated. Redirecting to sign in...",
    },
    entitlement: {
      checking: "Checking account access...",
      redirecting: "This account is not activated yet. Redirecting to checkout...",
      deniedEyebrow: "Full access required",
      deniedTitle: "Classroom and teaching tools are not active for this account",
      deniedBody: "Full access includes organizations, classrooms, rosters, resources, notifications, and LMS management. Disabled forms are hidden until access is active.",
      unlockAction: "Unlock full access",
      redeemAction: "Redeem activation code",
      back: "Back to dashboard",
    },
  },
  "zh-CN": {
    routes: {
      login: {
        title: "登录",
        checkoutTitle: "登录后继续付款",
        description: "继续查看你保存的乐谱、修改记录和导出文件。",
        checkoutDescription: "使用 Google 或邮箱登录。Google 用于确认账户与权益归属，付款仍由已配置的第三方支付渠道安全处理。",
      },
      register: {
        title: "创建账户",
        description: "使用 Google 或邮箱创建账户，即可从一份完整多页五线谱 PDF 或一张乐谱图片创建终身免费的乐谱项目。",
      },
      forgotPassword: {
        title: "找回密码",
        description: "输入账号邮箱，系统会准备密码重置邮件，让你重新进入当前工作台。",
      },
      resetPassword: {
        title: "重置密码",
        description: "验证重置链接后，设置新的登录密码，并重新进入应用。",
      },
    },
    notFound: {
      eyebrow: "页面未找到",
      title: "这个应用内页面不存在，请返回可用工作流",
      body: "你可以返回免费识谱入口、工作台首页或升级状态页继续。",
      edit: "免费编辑",
      home: "工作台首页",
      upgrade: "升级状态",
    },
    shell: {
      eyebrow: "你的在线乐谱工作台",
      quote: "登录后，你的乐谱、修改记录和导出文件都会保存在同一个账户中。",
      proofTitle: "真实案例 · 乐谱生成练习音频",
      proofBody: "从结构化五线谱控制速度、循环与声部，再生成练习素材。",
      accessTitle: "登录后免费编辑",
      accessBody: "上传一份完整多页 PDF 或一张乐谱图片，创建一个可校正、播放、转换、分享与导出的终身免费项目。",
      scopeTitle: "从识别到导出，一处完成",
      scopeBody: "识别乐谱后，可以继续校对、转简谱、移调、播放练习，并导出常用格式。",
      draftTitle: "你的原谱不会被覆盖",
      draftBody: "系统会先生成一份待确认的结果，只有你确认后才保存为正式版本。",
      back: "返回首页",
      preview: "免费编辑",
    },
    form: {
      shared: {
        googleDivider: "或使用邮箱",
        googleButtonRegionLabel: "Google 账户登录",
        email: "邮箱",
        emailPlaceholder: "you@example.com",
        password: "密码",
        passwordPlaceholder: "至少 8 个字符",
        submitWaiting: "请稍候...",
        redeem: "兑换激活码（中国大陆）",
        forgot: "忘记密码",
        googleFailed: "Google 登录没有完成，请重试。",
      },
      register: {
        eyebrow: "创建账户",
        title: "创建你的乐谱账户",
        body: "使用 Google，或用邮箱和密码创建账户。注册后可以从一份完整多页 PDF 或乐谱图片创建终身免费项目。",
        submit: "创建账户",
        switch: "已有账户",
        footnote: "免费方案只限一个完整乐谱项目；该项目可使用现有校正、播放、移调、简谱、版本、分享和导出能力，每月包含 25 积分。",
        success: "账户已创建，正在跳转...",
      },
      login: {
        eyebrow: "登录",
        title: "欢迎回来",
        body: "使用 Google 或邮箱登录，继续查看、修改和导出你的乐谱。",
        submit: "登录",
        switch: "还没有账户",
        footnote: "如你通过电商渠道购买了激活码，可在登录后继续兑换。",
        success: "登录成功，正在跳转...",
      },
    },
    resetRequest: {
      eyebrow: "找回密码",
      title: "发送密码重置链接",
      body: "输入注册邮箱后，系统会向该账号发送密码重置邮件。如果当前没有配置正式邮件服务，链接会进入 API 预览日志。",
      email: "注册邮箱",
      placeholder: "you@example.com",
      submit: "发送重置邮件",
      submitting: "发送中...",
      back: "返回登录",
      success: "如果该账号存在，密码重置邮件已准备好，请检查收件箱或联系支持。",
    },
    resetConfirm: {
      eyebrow: "重置密码",
      title: "设置新密码",
      body: "这个页面会验证重置链接是否仍然有效。提交后，旧登录会话会被撤销，需要重新登录。",
      loading: "正在检查重置链接...",
      invalid: "这个重置链接无效或已过期，请重新申请。",
      password: "新密码",
      confirm: "确认新密码",
      placeholder: "至少 8 个字符",
      submit: "保存新密码",
      submitting: "保存中...",
      requestAgain: "重新申请链接",
      backToSignIn: "返回登录",
      mismatch: "两次输入的密码不一致。",
      success: "密码已更新，正在跳转到登录页...",
    },
    entitlement: {
      checking: "正在检查账户权限...",
      redirecting: "当前账户尚未开通，正在跳转到开通页面...",
      deniedEyebrow: "需要完整权限",
      deniedTitle: "课堂与教学管理尚未对当前账户开放",
      deniedBody: "开通后可使用机构、课堂、学生名册、资源、通知和 LMS 管理。当前页面不会展示不可操作的表单。",
      unlockAction: "开通完整权限",
      redeemAction: "兑换激活码",
      back: "返回控制台",
    },
  },
  "zh-TW": {
    routes: {
      login: {
        title: "登入",
        checkoutTitle: "登入後繼續付款",
        description: "繼續查看你儲存的樂譜、修改記錄與匯出檔案。",
        checkoutDescription: "使用 Google 或電子郵件登入。Google 用於確認取得權益的帳戶；付款仍由已設定的第三方支付服務安全處理。",
      },
      register: {
        title: "建立帳戶",
        description: "使用 Google 或電子郵件建立帳戶，即可從一份完整多頁五線譜 PDF 或一張樂譜圖片建立永久免費的樂譜專案。",
      },
      forgotPassword: {
        title: "忘記密碼",
        description: "輸入帳戶電子郵件，系統會準備密碼重設郵件，讓你重新進入目前的工作台。",
      },
      resetPassword: {
        title: "重設密碼",
        description: "驗證重設連結、設定新密碼，再次登入以繼續使用應用程式。",
      },
    },
    notFound: {
      eyebrow: "找不到頁面",
      title: "這個應用程式頁面不存在，請返回可用的工作流程。",
      body: "返回免費編輯、工作台首頁或升級狀態頁以繼續。",
      edit: "免費編輯",
      home: "工作台首頁",
      upgrade: "升級狀態",
    },
    shell: {
      eyebrow: "安全進入你的線上樂譜工作台",
      quote: "登入後，你的樂譜、修改記錄與匯出檔案都會保存在同一個帳戶中。",
      proofTitle: "實際案例 · 從樂譜製作練習音訊",
      proofBody: "從結構化樂譜控制速度、循環與聲部，再製作練習素材。",
      accessTitle: "登入後免費編輯",
      accessBody: "上傳一份完整多頁 PDF 或一張樂譜圖片，建立可校正、播放、轉換、分享與匯出的永久免費專案。",
      scopeTitle: "從辨識到匯出，一處完成",
      scopeBody: "辨識樂譜後，可繼續校對、轉簡譜、移調、播放練習並匯出常用格式。",
      draftTitle: "你的原譜不會被覆蓋",
      draftBody: "系統會先產生供你確認的結果，未經確認不會取代已核准的版本。",
      back: "返回工作台",
      preview: "免費編輯",
    },
    form: {
      shared: {
        googleDivider: "或使用電子郵件",
        googleButtonRegionLabel: "使用 Google 帳戶登入",
        email: "電子郵件",
        emailPlaceholder: "you@example.com",
        password: "密碼",
        passwordPlaceholder: "至少 8 個字元",
        submitWaiting: "請稍候...",
        redeem: "兌換啟用碼（中國大陸）",
        forgot: "忘記密碼",
        googleFailed: "Google 登入未完成，請重試。",
      },
      register: {
        eyebrow: "建立帳戶",
        title: "建立你的樂譜帳戶",
        body: "使用 Google，或以電子郵件和密碼建立帳戶。註冊後可從一份完整多頁 PDF 或樂譜圖片建立永久免費專案。",
        submit: "建立帳戶",
        switch: "已有帳戶",
        footnote: "免費方案包含一個永久完整樂譜專案，可使用現有校正、播放、移調、簡譜、版本、分享與匯出工具，並每月提供 25 點數。",
        success: "帳戶已建立，正在重新導向...",
      },
      login: {
        eyebrow: "登入",
        title: "歡迎回來",
        body: "使用 Google 或電子郵件登入，繼續查看、修改與匯出你的樂譜。",
        submit: "登入",
        switch: "還沒有帳戶",
        footnote: "若你透過中國大陸銷售通路購買啟用碼，可在登入後兌換。",
        success: "登入成功，正在重新導向...",
      },
    },
    resetRequest: {
      eyebrow: "重設密碼",
      title: "傳送密碼重設連結",
      body: "輸入帳戶電子郵件後，系統會準備密碼重設郵件。若尚未設定正式郵件服務，連結會出現在 API 預覽記錄中。",
      email: "帳戶電子郵件",
      placeholder: "you@example.com",
      submit: "傳送重設郵件",
      submitting: "傳送中...",
      back: "返回登入",
      success: "若該帳戶存在，密碼重設郵件已準備完成。請查看收件匣或聯絡支援。",
    },
    resetConfirm: {
      eyebrow: "重設密碼",
      title: "設定新密碼",
      body: "此頁面會驗證重設連結是否仍然有效。提交新密碼後，先前的登入工作階段將被撤銷，需要重新登入。",
      loading: "正在檢查重設連結...",
      invalid: "此重設連結無效或已過期，請重新申請。",
      password: "新密碼",
      confirm: "確認新密碼",
      placeholder: "至少 8 個字元",
      submit: "儲存新密碼",
      submitting: "儲存中...",
      requestAgain: "重新申請連結",
      backToSignIn: "返回登入",
      mismatch: "兩次輸入的密碼不一致。",
      success: "密碼已更新，正在前往登入頁...",
    },
    entitlement: {
      checking: "正在檢查帳戶權限...",
      redirecting: "此帳戶尚未啟用，正在前往開通頁面...",
      deniedEyebrow: "需要完整權限",
      deniedTitle: "此帳戶尚未啟用課堂與教學工具",
      deniedBody: "完整權限包含機構、課堂、學生名冊、資源、通知與 LMS 管理。啟用前不會顯示無法操作的表單。",
      unlockAction: "開通完整權限",
      redeemAction: "兌換啟用碼",
      back: "返回控制台",
    },
  },
  ja: {
    routes: {
      login: {
        title: "ログイン",
        checkoutTitle: "決済を続けるにはログイン",
        description: "保存した楽譜、編集履歴、書き出したファイルを引き続き確認できます。",
        checkoutDescription: "Google またはメールでログインしてください。Google はアクセス権を受け取るアカウントの確認に使用し、決済は設定済みの外部決済サービスが安全に処理します。",
      },
      register: {
        title: "アカウントを作成",
        description: "Google またはメールでアカウントを作成し、完全な複数ページの五線譜 PDF または楽譜画像から、生涯無料のプロジェクトを 1 件作成できます。",
      },
      forgotPassword: {
        title: "パスワードを忘れた場合",
        description: "アカウントのメールアドレスを入力すると、現在のスタジオへ再びアクセスするためのパスワード再設定メールが準備されます。",
      },
      resetPassword: {
        title: "パスワードを再設定",
        description: "再設定リンクを確認して新しいパスワードを設定し、再度ログインしてアプリを利用してください。",
      },
    },
    notFound: {
      eyebrow: "ページが見つかりません",
      title: "このアプリページは存在しません。利用可能なスタジオ画面へ戻ってください。",
      body: "無料編集、スタジオのホーム、またはアップグレード状況へ戻って続けられます。",
      edit: "無料で編集",
      home: "スタジオホーム",
      upgrade: "アップグレード状況",
    },
    shell: {
      eyebrow: "安全な楽譜ワークスペース",
      quote: "ログインすると、楽譜、編集内容、書き出しファイルを 1 つのアカウントでまとめて管理できます。",
      proofTitle: "実例 · 楽譜から練習用音声へ",
      proofBody: "構造化された楽譜からテンポ、ループ、パートを調整し、練習素材を作成できます。",
      accessTitle: "ログインして無料で編集",
      accessBody: "完全な複数ページ PDF または楽譜画像を 1 件アップロードし、修正、再生、変換、共有、書き出しに使える生涯無料プロジェクトを保存できます。",
      scopeTitle: "認識から書き出しまで 1 か所で",
      scopeBody: "認識した楽譜を修正し、数字譜へ変換、移調、練習、書き出しまでツールを移動せずに行えます。",
      draftTitle: "元の楽譜は安全です",
      draftBody: "認識結果は確認用として作成され、承認済みの版を確認なしで置き換えることはありません。",
      back: "スタジオへ戻る",
      preview: "無料で編集",
    },
    form: {
      shared: {
        googleDivider: "またはメールを使用",
        googleButtonRegionLabel: "Google アカウントでログイン",
        email: "メールアドレス",
        emailPlaceholder: "you@example.com",
        password: "パスワード",
        passwordPlaceholder: "8 文字以上",
        submitWaiting: "しばらくお待ちください...",
        redeem: "アクティベーションコードを利用（中国本土）",
        forgot: "パスワードを忘れた場合",
        googleFailed: "Google ログインを完了できませんでした。もう一度お試しください。",
      },
      register: {
        eyebrow: "アカウント作成",
        title: "楽譜アカウントを作成",
        body: "Google を使用するか、メールとパスワードでアカウントを作成します。完全な複数ページ PDF または楽譜画像から、生涯無料のプロジェクトを 1 件作成できます。",
        submit: "アカウントを作成",
        switch: "すでにアカウントをお持ちですか",
        footnote: "無料プランには、生涯利用できる完全な楽譜プロジェクト 1 件と、修正、再生、移調、数字譜、バージョン、共有、書き出しの現行ツール、さらに毎月 25 クレジットが含まれます。",
        success: "アカウントを作成しました。移動しています...",
      },
      login: {
        eyebrow: "ログイン",
        title: "おかえりなさい",
        body: "Google またはメールでログインし、楽譜の表示、編集、書き出しを続けてください。",
        submit: "ログイン",
        switch: "アカウントを作成",
        footnote: "中国本土の販売チャネルでアクティベーションコードを購入した場合は、ログイン後に利用できます。",
        success: "ログインしました。移動しています...",
      },
    },
    resetRequest: {
      eyebrow: "パスワード再設定",
      title: "再設定リンクを送信",
      body: "アカウントのメールアドレスを入力すると、パスワード再設定メールが準備されます。メール配信が未設定の場合、リンクは API のプレビューログに表示されます。",
      email: "アカウントのメールアドレス",
      placeholder: "you@example.com",
      submit: "再設定メールを送信",
      submitting: "送信しています...",
      back: "ログインへ戻る",
      success: "該当するアカウントが存在する場合、パスワード再設定メールを準備しました。受信トレイを確認するか、サポートへお問い合わせください。",
    },
    resetConfirm: {
      eyebrow: "パスワード再設定",
      title: "新しいパスワードを設定",
      body: "このページで再設定リンクが有効か確認します。新しいパスワードを送信すると、以前のログインセッションは無効になり、再ログインが必要です。",
      loading: "再設定リンクを確認しています...",
      invalid: "この再設定リンクは無効か期限切れです。新しいリンクを申請してください。",
      password: "新しいパスワード",
      confirm: "新しいパスワードを確認",
      placeholder: "8 文字以上",
      submit: "新しいパスワードを保存",
      submitting: "保存しています...",
      requestAgain: "新しいリンクを申請",
      backToSignIn: "ログインへ戻る",
      mismatch: "2 つのパスワードが一致しません。",
      success: "パスワードを更新しました。ログインへ移動しています...",
    },
    entitlement: {
      checking: "アカウントのアクセス権を確認しています...",
      redirecting: "このアカウントはまだ有効化されていません。有効化ページへ移動しています...",
      deniedEyebrow: "完全アクセスが必要です",
      deniedTitle: "このアカウントではクラスと指導ツールが有効になっていません",
      deniedBody: "完全アクセスには、組織、クラス、受講者名簿、教材、通知、LMS 管理が含まれます。有効化されるまで操作できないフォームは表示されません。",
      unlockAction: "完全アクセスを有効化",
      redeemAction: "アクティベーションコードを利用",
      back: "ダッシュボードへ戻る",
    },
  },
  ko: {
    routes: {
      login: {
        title: "로그인",
        checkoutTitle: "결제를 계속하려면 로그인",
        description: "저장한 악보, 편집 기록 및 내보낸 파일을 계속 확인하세요.",
        checkoutDescription: "Google 또는 이메일로 로그인하세요. Google은 이용 권한을 받을 계정을 확인하는 데 사용되며, 결제는 설정된 외부 결제 서비스에서 안전하게 처리됩니다.",
      },
      register: {
        title: "계정 만들기",
        description: "Google 또는 이메일로 계정을 만들고 완전한 여러 페이지 오선보 PDF나 악보 이미지로 평생 무료 프로젝트 하나를 만들 수 있습니다.",
      },
      forgotPassword: {
        title: "비밀번호 찾기",
        description: "계정 이메일을 입력하면 현재 작업 공간에 다시 접근할 수 있도록 비밀번호 재설정 메일을 준비합니다.",
      },
      resetPassword: {
        title: "비밀번호 재설정",
        description: "재설정 링크를 확인하고 새 비밀번호를 설정한 뒤 다시 로그인하여 앱을 계속 사용하세요.",
      },
    },
    notFound: {
      eyebrow: "페이지를 찾을 수 없음",
      title: "이 앱 페이지는 존재하지 않습니다. 사용 가능한 작업 공간으로 돌아가세요.",
      body: "무료 편집, 작업 공간 홈 또는 업그레이드 상태로 돌아가 계속할 수 있습니다.",
      edit: "무료로 편집",
      home: "작업 공간 홈",
      upgrade: "업그레이드 상태",
    },
    shell: {
      eyebrow: "안전한 악보 작업 공간",
      quote: "로그인하면 악보, 편집 내용 및 내보낸 파일을 한 계정에서 함께 관리할 수 있습니다.",
      proofTitle: "실제 예시 · 악보에서 연습용 오디오로",
      proofBody: "구조화된 악보에서 템포, 반복 및 파트를 조정하고 연습 자료를 만드세요.",
      accessTitle: "로그인하고 무료로 편집",
      accessBody: "완전한 여러 페이지 PDF 또는 악보 이미지 하나를 업로드하고 교정, 재생, 변환, 공유 및 내보내기를 위한 평생 무료 프로젝트를 보관하세요.",
      scopeTitle: "인식부터 내보내기까지 한곳에서",
      scopeBody: "인식한 악보를 교정하고 숫자보로 변환하고 조옮김하고 연습하고 내보내기까지 도구를 옮기지 않고 진행하세요.",
      draftTitle: "원본 악보는 안전하게 유지됩니다",
      draftBody: "인식 결과는 검토용으로 생성되며 확인 없이 승인된 버전을 대체하지 않습니다.",
      back: "작업 공간으로 돌아가기",
      preview: "무료로 편집",
    },
    form: {
      shared: {
        googleDivider: "또는 이메일 사용",
        googleButtonRegionLabel: "Google 계정으로 로그인",
        email: "이메일",
        emailPlaceholder: "you@example.com",
        password: "비밀번호",
        passwordPlaceholder: "8자 이상",
        submitWaiting: "잠시 기다려 주세요...",
        redeem: "활성화 코드 사용(중국 본토)",
        forgot: "비밀번호 찾기",
        googleFailed: "Google 로그인이 완료되지 않았습니다. 다시 시도해 주세요.",
      },
      register: {
        eyebrow: "계정 만들기",
        title: "악보 계정 만들기",
        body: "Google을 사용하거나 이메일과 비밀번호로 계정을 만드세요. 완전한 여러 페이지 PDF 또는 악보 이미지로 평생 무료 프로젝트 하나를 만들 수 있습니다.",
        submit: "계정 만들기",
        switch: "이미 계정이 있나요",
        footnote: "무료 플랜에는 평생 이용 가능한 완전한 악보 프로젝트 하나와 현재 제공되는 교정, 재생, 조옮김, 숫자보, 버전, 공유 및 내보내기 도구, 매월 25크레딧이 포함됩니다.",
        success: "계정을 만들었습니다. 이동 중...",
      },
      login: {
        eyebrow: "로그인",
        title: "다시 오신 것을 환영합니다",
        body: "Google 또는 이메일로 로그인하여 악보를 보고 편집하고 내보내세요.",
        submit: "로그인",
        switch: "계정 만들기",
        footnote: "중국 본토 판매 채널에서 활성화 코드를 구매했다면 로그인 후 사용할 수 있습니다.",
        success: "로그인했습니다. 이동 중...",
      },
    },
    resetRequest: {
      eyebrow: "비밀번호 재설정",
      title: "재설정 링크 보내기",
      body: "계정 이메일을 입력하면 비밀번호 재설정 메일을 준비합니다. 정식 이메일 서비스가 아직 설정되지 않았다면 링크가 API 미리보기 로그에 표시됩니다.",
      email: "계정 이메일",
      placeholder: "you@example.com",
      submit: "재설정 메일 보내기",
      submitting: "보내는 중...",
      back: "로그인으로 돌아가기",
      success: "해당 계정이 존재하면 비밀번호 재설정 메일이 준비되었습니다. 받은 편지함을 확인하거나 지원팀에 문의하세요.",
    },
    resetConfirm: {
      eyebrow: "비밀번호 재설정",
      title: "새 비밀번호 설정",
      body: "이 페이지에서 재설정 링크가 아직 유효한지 확인합니다. 새 비밀번호를 제출하면 이전 로그인 세션이 취소되고 다시 로그인해야 합니다.",
      loading: "재설정 링크를 확인하는 중...",
      invalid: "이 재설정 링크는 유효하지 않거나 만료되었습니다. 새 링크를 요청하세요.",
      password: "새 비밀번호",
      confirm: "새 비밀번호 확인",
      placeholder: "8자 이상",
      submit: "새 비밀번호 저장",
      submitting: "저장 중...",
      requestAgain: "새 링크 요청",
      backToSignIn: "로그인으로 돌아가기",
      mismatch: "두 비밀번호가 일치하지 않습니다.",
      success: "비밀번호가 변경되었습니다. 로그인으로 이동 중...",
    },
    entitlement: {
      checking: "계정 이용 권한을 확인하는 중...",
      redirecting: "이 계정은 아직 활성화되지 않았습니다. 활성화 페이지로 이동 중...",
      deniedEyebrow: "전체 권한 필요",
      deniedTitle: "이 계정에서 수업 및 교육 도구가 활성화되지 않았습니다",
      deniedBody: "전체 권한에는 기관, 수업, 학생 명단, 자료, 알림 및 LMS 관리가 포함됩니다. 활성화되기 전에는 사용할 수 없는 양식을 표시하지 않습니다.",
      unlockAction: "전체 권한 활성화",
      redeemAction: "활성화 코드 사용",
      back: "대시보드로 돌아가기",
    },
  },
  fr: {
    routes: {
      login: {
        title: "Se connecter",
        checkoutTitle: "Connectez-vous pour poursuivre le paiement",
        description: "Retrouvez vos partitions enregistrées, votre historique de modifications et vos exports.",
        checkoutDescription: "Connectez-vous avec Google ou par e-mail. Google sert à identifier le compte qui recevra l’accès ; le paiement reste traité de façon sécurisée par le prestataire configuré.",
      },
      register: {
        title: "Créer votre compte",
        description: "Créez un compte avec Google ou par e-mail et obtenez un projet gratuit à vie à partir d’un PDF de partition multipage complet ou d’une image de partition.",
      },
      forgotPassword: {
        title: "Mot de passe oublié",
        description: "Saisissez l’adresse e-mail de votre compte : le système préparera un message de réinitialisation pour vous permettre de retrouver l’accès au studio.",
      },
      resetPassword: {
        title: "Réinitialiser le mot de passe",
        description: "Vérifiez le lien de réinitialisation, choisissez un nouveau mot de passe, puis reconnectez-vous pour continuer à utiliser l’application.",
      },
    },
    notFound: {
      eyebrow: "Page introuvable",
      title: "Cette page de l’application n’existe pas. Revenez à un parcours actif du studio.",
      body: "Revenez à l’édition gratuite, à l’accueil du studio ou à l’état de votre mise à niveau.",
      edit: "Modifier gratuitement",
      home: "Accueil du studio",
      upgrade: "État de la mise à niveau",
    },
    shell: {
      eyebrow: "Accès sécurisé à votre espace de partitions",
      quote: "Connectez-vous pour réunir vos partitions, vos modifications et vos exports dans un même compte.",
      proofTitle: "Exemple réel · de la partition à l’audio de travail",
      proofBody: "Contrôlez le tempo, les boucles et les parties depuis une partition structurée, puis créez vos supports de travail.",
      accessTitle: "Connectez-vous pour modifier gratuitement",
      accessBody: "Importez un PDF multipage complet ou une image de partition et conservez un projet gratuit à vie pour la correction, la lecture, la conversion, le partage et l’export.",
      scopeTitle: "Tout reste au même endroit",
      scopeBody: "Corrigez la partition reconnue, convertissez la notation, transposez, travaillez et exportez sans changer d’outil.",
      draftTitle: "Votre original reste intact",
      draftBody: "La reconnaissance crée un résultat à vérifier et ne remplace jamais une version approuvée sans votre confirmation.",
      back: "Revenir au studio",
      preview: "Modifier gratuitement",
    },
    form: {
      shared: {
        googleDivider: "ou utiliser l’e-mail",
        googleButtonRegionLabel: "Connexion avec un compte Google",
        email: "E-mail",
        emailPlaceholder: "you@example.com",
        password: "Mot de passe",
        passwordPlaceholder: "8 caractères minimum",
        submitWaiting: "Veuillez patienter...",
        redeem: "Utiliser un code d’activation (Chine continentale)",
        forgot: "Mot de passe oublié",
        googleFailed: "La connexion Google n’a pas abouti. Veuillez réessayer.",
      },
      register: {
        eyebrow: "Créer un compte",
        title: "Créez votre compte de partitions",
        body: "Continuez avec Google ou créez un compte avec votre e-mail et un mot de passe. Créez un projet gratuit à vie à partir d’un PDF multipage complet ou d’une image de partition.",
        submit: "Créer un compte",
        switch: "Vous avez déjà un compte",
        footnote: "L’offre gratuite comprend un projet de partition complet à vie, les outils actuels de correction, lecture, transposition, Jianpu, versions, partage et export, ainsi que 25 crédits par mois.",
        success: "Compte créé. Redirection en cours...",
      },
      login: {
        eyebrow: "Se connecter",
        title: "Bon retour parmi nous",
        body: "Continuez avec Google ou par e-mail pour consulter, modifier et exporter vos partitions.",
        submit: "Se connecter",
        switch: "Créer un compte",
        footnote: "Si vous avez acheté un code d’activation via un canal de vente en Chine continentale, utilisez-le après vous être connecté.",
        success: "Connexion réussie. Redirection en cours...",
      },
    },
    resetRequest: {
      eyebrow: "Réinitialisation du mot de passe",
      title: "Envoyer un lien de réinitialisation",
      body: "Saisissez l’e-mail du compte pour préparer un message de réinitialisation. Si l’envoi transactionnel n’est pas encore configuré, le lien apparaîtra dans les journaux d’aperçu de l’API.",
      email: "E-mail du compte",
      placeholder: "you@example.com",
      submit: "Envoyer l’e-mail",
      submitting: "Envoi en cours...",
      back: "Retour à la connexion",
      success: "Si ce compte existe, un e-mail de réinitialisation a été préparé. Consultez votre boîte de réception ou contactez l’assistance.",
    },
    resetConfirm: {
      eyebrow: "Réinitialiser le mot de passe",
      title: "Choisir un nouveau mot de passe",
      body: "Cette page vérifie que le lien est toujours valide. L’envoi d’un nouveau mot de passe révoque les sessions précédentes et impose une nouvelle connexion.",
      loading: "Vérification du lien...",
      invalid: "Ce lien est invalide ou a expiré. Demandez-en un nouveau.",
      password: "Nouveau mot de passe",
      confirm: "Confirmer le nouveau mot de passe",
      placeholder: "8 caractères minimum",
      submit: "Enregistrer le nouveau mot de passe",
      submitting: "Enregistrement...",
      requestAgain: "Demander un nouveau lien",
      backToSignIn: "Retour à la connexion",
      mismatch: "Les deux mots de passe ne correspondent pas.",
      success: "Mot de passe mis à jour. Redirection vers la connexion...",
    },
    entitlement: {
      checking: "Vérification de l’accès au compte...",
      redirecting: "Ce compte n’est pas encore activé. Redirection vers l’activation...",
      deniedEyebrow: "Accès complet requis",
      deniedTitle: "Les outils de classe et d’enseignement ne sont pas actifs pour ce compte",
      deniedBody: "L’accès complet comprend les organisations, classes, listes d’élèves, ressources, notifications et la gestion LMS. Les formulaires indisponibles restent masqués jusqu’à l’activation.",
      unlockAction: "Activer l’accès complet",
      redeemAction: "Utiliser un code d’activation",
      back: "Retour au tableau de bord",
    },
  },
  es: {
    routes: {
      login: {
        title: "Iniciar sesión",
        checkoutTitle: "Inicia sesión para continuar con el pago",
        description: "Continúa con tus partituras guardadas, el historial de cambios y las exportaciones.",
        checkoutDescription: "Inicia sesión con Google o correo electrónico. Google identifica la cuenta que recibirá el acceso; el pago seguirá procesándose de forma segura mediante el proveedor configurado.",
      },
      register: {
        title: "Crea tu cuenta",
        description: "Crea una cuenta con Google o correo electrónico y obtén un proyecto gratuito para siempre a partir de un PDF multipágina completo o una imagen de partitura.",
      },
      forgotPassword: {
        title: "¿Olvidaste tu contraseña?",
        description: "Introduce el correo de tu cuenta y el sistema preparará un mensaje para restablecer la contraseña y recuperar el acceso al estudio.",
      },
      resetPassword: {
        title: "Restablecer contraseña",
        description: "Verifica el enlace, establece una nueva contraseña y vuelve a iniciar sesión para seguir usando la aplicación.",
      },
    },
    notFound: {
      eyebrow: "Página no encontrada",
      title: "Esta página de la aplicación no existe. Vuelve a una ruta disponible del estudio.",
      body: "Vuelve a la edición gratuita, al inicio del estudio o al estado de la mejora de plan.",
      edit: "Editar gratis",
      home: "Inicio del estudio",
      upgrade: "Estado de la mejora",
    },
    shell: {
      eyebrow: "Acceso seguro a tu espacio de partituras",
      quote: "Inicia sesión para mantener tus partituras, cambios y exportaciones juntos en una cuenta.",
      proofTitle: "Ejemplo real · de partitura a audio de práctica",
      proofBody: "Controla el tempo, los bucles y las partes desde una partitura estructurada y crea material de práctica.",
      accessTitle: "Inicia sesión para editar gratis",
      accessBody: "Sube un PDF multipágina completo o una imagen de partitura y conserva un proyecto gratuito para siempre para corregir, reproducir, convertir, compartir y exportar.",
      scopeTitle: "Todo permanece en un solo lugar",
      scopeBody: "Corrige la partitura reconocida, convierte la notación, transporta, practica y exporta sin cambiar de herramienta.",
      draftTitle: "Tu original permanece seguro",
      draftBody: "El reconocimiento crea un resultado para que lo revises y nunca sustituye una versión aprobada sin confirmación.",
      back: "Volver al estudio",
      preview: "Editar gratis",
    },
    form: {
      shared: {
        googleDivider: "o usa el correo electrónico",
        googleButtonRegionLabel: "Inicio de sesión con cuenta de Google",
        email: "Correo electrónico",
        emailPlaceholder: "you@example.com",
        password: "Contraseña",
        passwordPlaceholder: "8 caracteres como mínimo",
        submitWaiting: "Espera un momento...",
        redeem: "Canjear código de activación (China continental)",
        forgot: "Olvidé mi contraseña",
        googleFailed: "No se completó el inicio de sesión con Google. Inténtalo de nuevo.",
      },
      register: {
        eyebrow: "Crear cuenta",
        title: "Crea tu cuenta de partituras",
        body: "Continúa con Google o crea una cuenta con correo y contraseña. Crea un proyecto gratuito para siempre a partir de un PDF multipágina completo o una imagen de partitura.",
        submit: "Crear cuenta",
        switch: "Ya tengo una cuenta",
        footnote: "El plan gratuito incluye un proyecto de partitura completo para siempre, las herramientas actuales de corrección, reproducción, transporte, Jianpu, versiones, uso compartido y exportación, además de 25 créditos al mes.",
        success: "Cuenta creada. Redirigiendo...",
      },
      login: {
        eyebrow: "Iniciar sesión",
        title: "Te damos la bienvenida de nuevo",
        body: "Continúa con Google o correo electrónico para ver, editar y exportar tus partituras.",
        submit: "Iniciar sesión",
        switch: "Crear una cuenta",
        footnote: "Si compraste un código de activación mediante un canal de venta de China continental, canjéalo después de iniciar sesión.",
        success: "Sesión iniciada. Redirigiendo...",
      },
    },
    resetRequest: {
      eyebrow: "Restablecer contraseña",
      title: "Enviar un enlace de restablecimiento",
      body: "Introduce el correo de la cuenta y el sistema preparará el mensaje. Si aún no se ha configurado el correo transaccional, el enlace aparecerá en los registros de vista previa de la API.",
      email: "Correo de la cuenta",
      placeholder: "you@example.com",
      submit: "Enviar correo de restablecimiento",
      submitting: "Enviando...",
      back: "Volver al inicio de sesión",
      success: "Si esa cuenta existe, se ha preparado un correo de restablecimiento. Revisa tu bandeja de entrada o contacta con soporte.",
    },
    resetConfirm: {
      eyebrow: "Restablecer contraseña",
      title: "Establece una nueva contraseña",
      body: "Esta página verifica que el enlace siga siendo válido. Al enviar una nueva contraseña, se revocan las sesiones anteriores y es necesario volver a iniciar sesión.",
      loading: "Comprobando el enlace...",
      invalid: "Este enlace no es válido o ha caducado. Solicita uno nuevo.",
      password: "Nueva contraseña",
      confirm: "Confirmar nueva contraseña",
      placeholder: "8 caracteres como mínimo",
      submit: "Guardar nueva contraseña",
      submitting: "Guardando...",
      requestAgain: "Solicitar un nuevo enlace",
      backToSignIn: "Volver al inicio de sesión",
      mismatch: "Las dos contraseñas no coinciden.",
      success: "Contraseña actualizada. Redirigiendo al inicio de sesión...",
    },
    entitlement: {
      checking: "Comprobando el acceso de la cuenta...",
      redirecting: "Esta cuenta aún no está activada. Redirigiendo a la activación...",
      deniedEyebrow: "Se requiere acceso completo",
      deniedTitle: "Las herramientas de clases y enseñanza no están activas para esta cuenta",
      deniedBody: "El acceso completo incluye organizaciones, clases, listas de estudiantes, recursos, notificaciones y gestión del LMS. Los formularios no disponibles permanecen ocultos hasta la activación.",
      unlockAction: "Activar acceso completo",
      redeemAction: "Canjear código de activación",
      back: "Volver al panel",
    },
  },
  de: {
    routes: {
      login: {
        title: "Anmelden",
        checkoutTitle: "Zum Bezahlen anmelden",
        description: "Greifen Sie weiter auf gespeicherte Noten, den Bearbeitungsverlauf und Exporte zu.",
        checkoutDescription: "Melden Sie sich mit Google oder per E-Mail an. Google identifiziert das Konto, das den Zugriff erhält; die Zahlung wird weiterhin sicher vom konfigurierten Anbieter verarbeitet.",
      },
      register: {
        title: "Konto erstellen",
        description: "Erstellen Sie ein Konto mit Google oder E-Mail und ein dauerhaft kostenloses Projekt aus einem vollständigen mehrseitigen Noten-PDF oder Notenbild.",
      },
      forgotPassword: {
        title: "Passwort vergessen",
        description: "Geben Sie die E-Mail-Adresse Ihres Kontos ein. Das System bereitet eine Nachricht zum Zurücksetzen vor, damit Sie wieder auf den Arbeitsbereich zugreifen können.",
      },
      resetPassword: {
        title: "Passwort zurücksetzen",
        description: "Prüfen Sie den Link, legen Sie ein neues Passwort fest und melden Sie sich erneut an, um die App weiterzuverwenden.",
      },
    },
    notFound: {
      eyebrow: "Seite nicht gefunden",
      title: "Diese App-Seite existiert nicht. Kehren Sie zu einem verfügbaren Arbeitsbereich zurück.",
      body: "Kehren Sie zur kostenlosen Bearbeitung, zur Startseite oder zum Upgrade-Status zurück.",
      edit: "Kostenlos bearbeiten",
      home: "Arbeitsbereich-Startseite",
      upgrade: "Upgrade-Status",
    },
    shell: {
      eyebrow: "Sicherer Zugang zu Ihrem Notenarbeitsbereich",
      quote: "Melden Sie sich an, um Noten, Bearbeitungen und Exporte in einem Konto zusammenzuhalten.",
      proofTitle: "Praxisbeispiel · von Noten zu Übungs-Audio",
      proofBody: "Steuern Sie Tempo, Schleifen und Stimmen aus strukturierten Noten und erstellen Sie Übungsmaterial.",
      accessTitle: "Anmelden und kostenlos bearbeiten",
      accessBody: "Laden Sie ein vollständiges mehrseitiges PDF oder Notenbild hoch und behalten Sie ein dauerhaft kostenloses Projekt zum Korrigieren, Abspielen, Konvertieren, Teilen und Exportieren.",
      scopeTitle: "Alles bleibt an einem Ort",
      scopeBody: "Korrigieren Sie erkannte Noten, konvertieren Sie die Notation, transponieren, üben und exportieren Sie ohne Werkzeugwechsel.",
      draftTitle: "Ihr Original bleibt geschützt",
      draftBody: "Die Erkennung erstellt ein Ergebnis zur Prüfung und ersetzt niemals ohne Bestätigung eine freigegebene Version.",
      back: "Zum Arbeitsbereich",
      preview: "Kostenlos bearbeiten",
    },
    form: {
      shared: {
        googleDivider: "oder E-Mail verwenden",
        googleButtonRegionLabel: "Mit Google-Konto anmelden",
        email: "E-Mail",
        emailPlaceholder: "you@example.com",
        password: "Passwort",
        passwordPlaceholder: "Mindestens 8 Zeichen",
        submitWaiting: "Bitte warten...",
        redeem: "Aktivierungscode einlösen (Festlandchina)",
        forgot: "Passwort vergessen",
        googleFailed: "Die Google-Anmeldung wurde nicht abgeschlossen. Bitte versuchen Sie es erneut.",
      },
      register: {
        eyebrow: "Konto erstellen",
        title: "Notenkonto erstellen",
        body: "Fahren Sie mit Google fort oder erstellen Sie ein Konto mit E-Mail und Passwort. Erstellen Sie ein dauerhaft kostenloses Projekt aus einem vollständigen mehrseitigen PDF oder Notenbild.",
        submit: "Konto erstellen",
        switch: "Ich habe bereits ein Konto",
        footnote: "Kostenlos enthalten sind ein vollständiges, dauerhaftes Notenprojekt, die aktuellen Werkzeuge für Korrektur, Wiedergabe, Transposition, Jianpu, Versionen, Teilen und Export sowie monatlich 25 Credits.",
        success: "Konto erstellt. Weiterleitung...",
      },
      login: {
        eyebrow: "Anmelden",
        title: "Willkommen zurück",
        body: "Melden Sie sich mit Google oder per E-Mail an, um Ihre Noten anzusehen, zu bearbeiten und zu exportieren.",
        submit: "Anmelden",
        switch: "Konto erstellen",
        footnote: "Wenn Sie über einen Vertriebskanal in Festlandchina einen Aktivierungscode gekauft haben, lösen Sie ihn nach der Anmeldung ein.",
        success: "Angemeldet. Weiterleitung...",
      },
    },
    resetRequest: {
      eyebrow: "Passwort zurücksetzen",
      title: "Link zum Zurücksetzen senden",
      body: "Geben Sie die Konto-E-Mail ein, um eine Nachricht zum Zurücksetzen vorzubereiten. Wenn der E-Mail-Versand noch nicht eingerichtet ist, erscheint der Link in den API-Vorschauprotokollen.",
      email: "Konto-E-Mail",
      placeholder: "you@example.com",
      submit: "E-Mail zum Zurücksetzen senden",
      submitting: "Wird gesendet...",
      back: "Zurück zur Anmeldung",
      success: "Falls das Konto existiert, wurde eine E-Mail zum Zurücksetzen vorbereitet. Prüfen Sie Ihren Posteingang oder kontaktieren Sie den Support.",
    },
    resetConfirm: {
      eyebrow: "Passwort zurücksetzen",
      title: "Neues Passwort festlegen",
      body: "Diese Seite prüft, ob der Link noch gültig ist. Ein neues Passwort widerruft frühere Anmeldesitzungen und erfordert eine erneute Anmeldung.",
      loading: "Link wird geprüft...",
      invalid: "Dieser Link ist ungültig oder abgelaufen. Fordern Sie einen neuen an.",
      password: "Neues Passwort",
      confirm: "Neues Passwort bestätigen",
      placeholder: "Mindestens 8 Zeichen",
      submit: "Neues Passwort speichern",
      submitting: "Wird gespeichert...",
      requestAgain: "Neuen Link anfordern",
      backToSignIn: "Zurück zur Anmeldung",
      mismatch: "Die beiden Passwörter stimmen nicht überein.",
      success: "Passwort aktualisiert. Weiterleitung zur Anmeldung...",
    },
    entitlement: {
      checking: "Kontozugriff wird geprüft...",
      redirecting: "Dieses Konto ist noch nicht aktiviert. Weiterleitung zur Aktivierung...",
      deniedEyebrow: "Vollzugriff erforderlich",
      deniedTitle: "Klassen- und Unterrichtswerkzeuge sind für dieses Konto nicht aktiv",
      deniedBody: "Vollzugriff umfasst Organisationen, Klassen, Teilnehmerlisten, Ressourcen, Benachrichtigungen und LMS-Verwaltung. Nicht verfügbare Formulare bleiben bis zur Aktivierung verborgen.",
      unlockAction: "Vollzugriff aktivieren",
      redeemAction: "Aktivierungscode einlösen",
      back: "Zurück zum Dashboard",
    },
  },
  ru: {
    routes: {
      login: {
        title: "Войти",
        checkoutTitle: "Войдите, чтобы продолжить оплату",
        description: "Продолжайте работу с сохранёнными нотами, историей изменений и экспортированными файлами.",
        checkoutDescription: "Войдите через Google или по электронной почте. Google определяет аккаунт, который получит доступ; платёж по-прежнему безопасно обрабатывает настроенный платёжный сервис.",
      },
      register: {
        title: "Создать аккаунт",
        description: "Создайте аккаунт через Google или по электронной почте и один бессрочный бесплатный проект из полного многостраничного PDF с нотами или изображения нот.",
      },
      forgotPassword: {
        title: "Забыли пароль?",
        description: "Введите адрес электронной почты аккаунта, и система подготовит сообщение для сброса пароля, чтобы вы снова получили доступ к рабочему пространству.",
      },
      resetPassword: {
        title: "Сбросить пароль",
        description: "Проверьте ссылку, задайте новый пароль и снова войдите, чтобы продолжить работу в приложении.",
      },
    },
    notFound: {
      eyebrow: "Страница не найдена",
      title: "Такой страницы приложения нет. Вернитесь в доступный раздел рабочего пространства.",
      body: "Вернитесь к бесплатному редактированию, на главную страницу или к статусу обновления тарифа.",
      edit: "Редактировать бесплатно",
      home: "Главная рабочего пространства",
      upgrade: "Статус обновления",
    },
    shell: {
      eyebrow: "Безопасный доступ к нотному пространству",
      quote: "Войдите, чтобы хранить ноты, изменения и экспортированные файлы в одном аккаунте.",
      proofTitle: "Реальный пример · из нот в аудио для занятий",
      proofBody: "Управляйте темпом, повторами и партиями в структурированной партитуре и создавайте материалы для занятий.",
      accessTitle: "Войдите и редактируйте бесплатно",
      accessBody: "Загрузите один полный многостраничный PDF или изображение нот и сохраните бессрочный бесплатный проект для исправления, воспроизведения, преобразования, публикации и экспорта.",
      scopeTitle: "Всё в одном месте",
      scopeBody: "Исправляйте распознанные ноты, преобразуйте запись, транспонируйте, занимайтесь и экспортируйте без перехода между инструментами.",
      draftTitle: "Оригинал останется в безопасности",
      draftBody: "Распознавание создаёт результат для проверки и никогда не заменяет подтверждённую версию без вашего согласия.",
      back: "Вернуться в рабочее пространство",
      preview: "Редактировать бесплатно",
    },
    form: {
      shared: {
        googleDivider: "или использовать электронную почту",
        googleButtonRegionLabel: "Вход через аккаунт Google",
        email: "Электронная почта",
        emailPlaceholder: "you@example.com",
        password: "Пароль",
        passwordPlaceholder: "Не менее 8 символов",
        submitWaiting: "Подождите...",
        redeem: "Активировать код (материковый Китай)",
        forgot: "Забыли пароль?",
        googleFailed: "Не удалось завершить вход через Google. Повторите попытку.",
      },
      register: {
        eyebrow: "Создание аккаунта",
        title: "Создайте аккаунт для нот",
        body: "Продолжите через Google или создайте аккаунт с электронной почтой и паролем. Создайте один бессрочный бесплатный проект из полного многостраничного PDF или изображения нот.",
        submit: "Создать аккаунт",
        switch: "У меня уже есть аккаунт",
        footnote: "Бесплатный план включает один полный бессрочный нотный проект, текущие инструменты исправления, воспроизведения, транспонирования, цифровой записи, версий, публикации и экспорта, а также 25 кредитов ежемесячно.",
        success: "Аккаунт создан. Переходим дальше...",
      },
      login: {
        eyebrow: "Вход",
        title: "С возвращением",
        body: "Войдите через Google или по электронной почте, чтобы просматривать, редактировать и экспортировать ноты.",
        submit: "Войти",
        switch: "Создать аккаунт",
        footnote: "Если вы купили код активации через канал продаж в материковом Китае, активируйте его после входа.",
        success: "Вход выполнен. Переходим дальше...",
      },
    },
    resetRequest: {
      eyebrow: "Сброс пароля",
      title: "Отправить ссылку для сброса",
      body: "Введите электронную почту аккаунта, и система подготовит письмо для сброса пароля. Если почтовый сервис ещё не настроен, ссылка появится в журналах предварительного просмотра API.",
      email: "Электронная почта аккаунта",
      placeholder: "you@example.com",
      submit: "Отправить письмо для сброса",
      submitting: "Отправляем...",
      back: "Вернуться ко входу",
      success: "Если аккаунт существует, письмо для сброса пароля подготовлено. Проверьте входящие или обратитесь в поддержку.",
    },
    resetConfirm: {
      eyebrow: "Сброс пароля",
      title: "Задайте новый пароль",
      body: "На этой странице проверяется действительность ссылки. После отправки нового пароля предыдущие сеансы будут отозваны, и потребуется снова войти.",
      loading: "Проверяем ссылку...",
      invalid: "Ссылка недействительна или устарела. Запросите новую.",
      password: "Новый пароль",
      confirm: "Подтвердите новый пароль",
      placeholder: "Не менее 8 символов",
      submit: "Сохранить новый пароль",
      submitting: "Сохраняем...",
      requestAgain: "Запросить новую ссылку",
      backToSignIn: "Вернуться ко входу",
      mismatch: "Пароли не совпадают.",
      success: "Пароль обновлён. Переходим к входу...",
    },
    entitlement: {
      checking: "Проверяем доступ аккаунта...",
      redirecting: "Аккаунт ещё не активирован. Переходим к активации...",
      deniedEyebrow: "Требуется полный доступ",
      deniedTitle: "Инструменты классов и преподавания не активны для этого аккаунта",
      deniedBody: "Полный доступ включает организации, классы, списки учеников, ресурсы, уведомления и управление LMS. Недоступные формы скрыты до активации.",
      unlockAction: "Открыть полный доступ",
      redeemAction: "Активировать код",
      back: "Вернуться на панель",
    },
  },
} as const satisfies Record<SupportedLocale, AuthMessageCatalog>;

export function getAuthMessages(locale: SupportedLocale): AuthMessageCatalog {
  return AUTH_MESSAGE_CATALOGS[locale];
}
