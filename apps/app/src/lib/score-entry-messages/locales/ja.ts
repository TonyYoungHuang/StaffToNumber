import type { ScoreEntryMessages } from "../types";

export const jaScoreEntryMessages = {
  reviewEntry: {
    "label": "スキャン譜の確認",
    "titles": {
      "one": "確認を待っているスキャン譜が1件あります",
      "few": "確認を待っているスキャン譜が{count}件あります",
      "many": "確認を待っているスキャン譜が{count}件あります",
      "other": "確認を待っているスキャン譜が{count}件あります"
    },
    "body": "元の画像と見比べ、内容を確認してから確定してください。",
    "continue": "確認を続ける",
    "all": "確認待ちのスキャン譜をすべて見る",
    "emptyTitle": "確認待ちのスキャン譜はありません",
    "emptyBody": "次のスキャン譜は処理が終わるとここに表示されます。保存済みの楽譜も引き続き編集できます。",
    "upload": "楽譜をアップロード",
    "loading": "確認待ちのスキャン譜を調べています…",
    "failed": "確認待ちのスキャン譜を読み込めませんでした。もう一度お試しください。",
    "retry": "再試行"
  },
  pages: {
    library: { eyebrow: "楽譜ワークスペース", title: "楽譜を認識、管理し、作業を続ける", body: "無料のファイル確認でページ数と、標準処理または大容量ファイル処理のどちらが必要かを表示します。無料認識枠やクレジットは使いません。未使用の生涯無料の簡単な認識は標準処理のみで利用できます。" },
    newScore: {
      eyebrow: "新しい楽譜を作成", title: "何から始めますか？", body: "入力元を 1 つ選んでください。次のページには、その方法に必要な手順だけが表示されます。", recommended: "おすすめ", choose: "選択",
      choices: {
        scan: { title: "PDF または楽譜画像をスキャン", body: "生涯1回の無料スキャン。 編集, 移調, 再生, 編集可能な楽譜ファイル, 数字譜. One Score Pass · US$2.99. この楽譜専用 · 買い切り. この楽譜の全書き出し形式を利用（PDF / MusicXML / MIDI / MP3 など）. 新しい楽譜を認識 · Starter / Proが必要（One Score Passには含まれません）. Starter · US$7.99/月 · 毎月 50 クレジット. 月額プラン：通常の楽譜は約1クレジット/曲、複数ページの大きな楽譜（約6ページ以上）は約5クレジット/曲." },
        jianpu: { title: "数字譜を入力", body: "数字音符を入力して五線譜を作成します。" },
        musicxml: { title: "楽譜作成ソフトから読み込む", body: "MuseScore、Sibelius、Finale などから書き出した MusicXML 向けです。" },
        midi: { title: "MIDI を読み込む", body: "MIDI の音符とリズムを楽譜に変換します。" },
        audio: { title: "録音をアップロード", body: "単旋律の録音から楽譜の作成を試します（実験機能）。" },
        backup: { title: "楽譜バックアップを復元", body: "以前このサイトからダウンロードしたバックアップを開きます。" },
      },
    },
    source: {
      chooseAnother: "別の入力元を選ぶ",
      headings: {
        scan: { eyebrow: "新しい楽譜を作成", title: "PDF または楽譜画像をスキャン", body: "無料のファイル確認でページ数と、標準処理または大容量ファイル処理のどちらが必要かを表示します。無料認識枠やクレジットは使いません。未使用の生涯無料の簡単な認識は標準処理のみで利用できます。" },
        jianpu: { eyebrow: "新しい楽譜を作成", title: "数字譜から五線譜を作成", body: "数字譜を入力して楽譜を作成します。このページは数字譜入力専用です。" },
        musicxml: { eyebrow: "新しい楽譜を作成", title: "楽譜作成ソフトから読み込む", body: "書き出した MusicXML を選択します。このページはファイル読み込み専用です。" },
        midi: { eyebrow: "新しい楽譜を作成", title: "MIDI から楽譜を作成", body: "MIDI ファイルを 1 つ選択します。このページは MIDI 読み込み専用です。" },
        audio: { eyebrow: "新しい楽譜を作成", title: "録音から楽譜の作成を試す", body: "旋律の録音を選び、生成された音高とリズムを確認してください。" },
        backup: { eyebrow: "新しい楽譜を作成", title: "楽譜バックアップを復元", body: "以前ダウンロードしたバックアップを選びます。このページは復元専用です。" },
      },
    },
  },
  access: { checking: "アクセス権を確認しています...", errorFallback: "現在のアカウントを読み込めませんでした。" },
  library: {
    signInFirst: "先にログインしてください。", createNew: "新しい楽譜を作成", editable: "編集可能",
    metrics: {
      projects: { label: "自分の楽譜", body: "保存した楽譜はすべてここに表示されます。" },
      format: { label: "編集を継続可能", body: "認識または読み込み後、修正、移調、練習、書き出しを続けられます。" },
      revisions: { label: "編集履歴", body: "以前の版は必要なときに戻せるよう保存されます。" },
    },
    common: { selected: "選択済み", importInProgress: "読み込み中...", uploadInProgress: "アップロード中...", chooseAnother: "別のファイルを選ぶ", clearSelection: "選択を解除" },
    musicxml: {
      chooseFile: ".musicxml、.xml、または .mxl ファイルを選択してください。", importFailed: "MusicXML を読み込めませんでした。", imported: "楽譜を「自分の楽譜」に追加しました。", eyebrow: "楽譜作成ソフトから読み込む", title: "MusicXML ファイルを選択", body: "MuseScore、Sibelius、Finale などの楽譜作成アプリから書き出した MusicXML を読み込み、ここで編集を続けます。", dropTitle: "ファイルを選択", dropBody: ".musicxml、.xml、.mxl ファイルに対応しています。", empty: "ファイルがまだ選択されていません。", button: "MusicXML を読み込む",
    },
    scan: {
      chooseFile: "PDF または画像ファイルを選択してください。", importFailed: "OMR 読み込みジョブを作成できませんでした。", imported: "ファイルをアップロードし、認識を開始しました。後で「自分の楽譜」から確認できます。", eyebrow: "楽譜認識", title: "PDF または楽譜画像をアップロード", body: "通常処理は楽譜写真 1 枚、または約 1～5 ページの A4・Letter PDF、大容量ファイル処理は約 6～24 ページの PDF が目安です。約 25 ページ以上の A4・Letter PDF は処理上限を超える場合があります。20 MiB を超えるファイル、3200 万画素（32 MP）を超える画像、またはページが事前確認の画素数上限を超える PDF は受け付けられません。ページ数は目安で、実際の受付可否と処理経路はファイル容量・ページ構成と事前確認で決まります。PDF は 1 ファイル約 24 ページ以内に分割し、大きすぎるファイルや画像を圧縮するか、MusicXML を取り込んでください。受け付けられないファイルには料金やクレジットはかかりません。 Starter / Pro: 簡単な認識は1タスク1クレジット、複雑な認識は5クレジットです。ページ数は処理経路に影響しますが、ページ数倍の料金にはなりません。一部のみ完成した場合は未完成部分の見積クレジットを比例して返し、失敗やキャンセルでは処理クレジットを返します。これはクレジットの返却で、現金返金ではありません。", dropTitle: "PDF または画像を選択", dropBody: "PDF、PNG、JPG、WEBP、TIFF に対応しています。", empty: "スキャンがまだ選択されていません。", button: "認識を開始", accessLoading: "無料スキャンの利用可否を確認しています...", freeEyebrow: "ログイン済み · 無料で編集", freeBody: "生涯1回の無料スキャン。 編集, 移調, 再生, 編集可能な楽譜ファイル, 数字譜. One Score Pass · US$2.99. この楽譜専用 · 買い切り. この楽譜の全書き出し形式を利用（PDF / MusicXML / MIDI / MP3 など）. 新しい楽譜を認識 · Starter / Proが必要（One Score Passには含まれません）. Starter · US$7.99/月 · 毎月 50 クレジット. 月額プラン：通常の楽譜は約1クレジット/曲、複数ページの大きな楽譜（約6ページ以上）は約5クレジット/曲.", exhaustedEyebrow: "無料編集スキャンは使用済みです", exhaustedTitle: "このアカウントでは生涯無料の楽譜プロジェクトを 1 件作成済みです。", exhaustedBody: "One Score Pass · US$2.99. この楽譜専用 · 買い切り. この楽譜の全書き出し形式を利用（PDF / MusicXML / MIDI / MP3 など）. 新しい楽譜を認識 · Starter / Proが必要（One Score Passには含まれません）. Starter · US$7.99/月 · 毎月 50 クレジット. 月額プラン：通常の楽譜は約1クレジット/曲、複数ページの大きな楽譜（約6ページ以上）は約5クレジット/曲.", exhaustedLibrary: "無料の楽譜を続ける", exhaustedUpgrade: "完全アクセスを有効化",
    },
    backup: {
      chooseFile: "楽譜バックアップを選択してください。", importFailed: "バックアップを復元できませんでした。", imported: "楽譜バックアップを復元しました。", eyebrow: "バックアップを復元", title: "楽譜バックアップを選択", body: "以前このサイトからダウンロードした楽譜バックアップを復元して、編集を続けます。", dropTitle: "バックアップを選択", dropBody: ".score.json と .json ファイルに対応しています。", empty: "編集可能な楽譜ファイル スナップショットがまだ選択されていません。", button: "楽譜を復元",
    },
    midi: {
      chooseFile: "MIDI ファイルを選択してください。", importFailed: "MIDI を読み込めませんでした。", imported: "MIDI を楽譜プロジェクトに変換しました。", eyebrow: "MIDI を読み込む", title: "MIDI ファイルを選択", body: "MIDI の音符とリズムを、表示、再生、移調できる楽譜に変換します。複雑な譜面配置は手動調整が必要な場合があります。", dropTitle: ".mid または .midi ファイルを選択", dropBody: "標準 MIDI ファイルに対応しています。", empty: "MIDI ファイルがまだ選択されていません。", button: "MIDI を読み込む",
    },
    audio: {
      formatLabel: "オーディオ",
      chooseFile: "音声ファイルを選択してください。", importFailed: "音声採譜ジョブを作成できませんでした。", imported: "音声採譜プロジェクトを作成しました。Basic Pitch が MIDI と初期の編集可能な楽譜版を生成します。", eyebrow: "録音から楽譜へ（実験機能）", title: "録音を選択", body: "旋律の録音をアップロードすると、編集可能な楽譜の作成を試みます。合奏、ノイズ、複雑な和声は精度を下げることがあります。", dropTitle: "音声ファイルを選択", dropBody: "WAV、MP3、M4A、AAC、FLAC、OGG、AIFF に対応しています。", empty: "音声がまだ選択されていません。", button: "採譜を開始",
    },
    jianpu: {
      empty: "数字譜を入力してください。", importFailed: "数字譜を読み込めませんでした。", imported: "数字譜プロジェクトを作成しました。プレビュー、移調、再生、MusicXML 書き出しが利用できます。", eyebrow: "数字譜から五線譜へ", title: "数字譜を入力", body: "調、拍子、数字音符、休符、小節線を入力して、再生、移調、書き出しができる五線譜を作成します。", titleLabel: "楽譜タイトル", titlePlaceholder: "例：きらきら星の数字譜", textLabel: "数字譜", textPlaceholder: "1=C\n4/4\n1 1 5 5 | 6 6 5 - |", button: "数字譜を読み込む", clear: "サンプルに戻す",
    },
    list: { eyebrow: "自分の楽譜", title: "保存済みの楽譜", body: "楽譜を開いて、修正、変換、移調、練習、書き出しを続けます。", loading: "楽譜を読み込んでいます...", empty: "楽譜はまだありません。最初の楽譜を作成すると、ここに表示されます。", open: "楽譜を開く", revision: "編集履歴" },
    statuses: { imported: "読み込み済み", candidate: "修正が必要", needs_review: "確認が必要", ready: "利用可能", archived: "アーカイブ済み" },
  },
  trial: {
    previewDeferred: "大きな楽譜です。OSMD の比較表示が必要なときに完全な MusicXML プレビューを読み込んでください。",
    previewRender: "完全なプレビューを読み込む",
    previewEventLabel: "{part} · 第 {measure} 小節 · {number} 番目の{type}",
    previewNote: "音符",
    previewRest: "休符",
    loadingJob: "ジョブを読み込んでいます", preparing: "無料編集を準備しています", loadingScore: "楽譜を読み込んでいます...", intro: "編集, 移調, 再生, 編集可能な楽譜ファイル, 数字譜. One Score Pass · US$2.99. この楽譜専用 · 買い切り. この楽譜の全書き出し形式を利用（PDF / MusicXML / MIDI / MP3 など）. 新しい楽譜を認識 · Starter / Proが必要（One Score Passには含まれません）. Starter · US$7.99/月 · 毎月 50 クレジット. 月額プラン：通常の楽譜は約1クレジット/曲、複数ページの大きな楽譜（約6ページ以上）は約5クレジット/曲.", unlock: "完全アクセスを有効化", back: "ライブラリへ戻る",
    statuses: { queued: "待機中", processing: "認識中", completed: "認識完了", failed: "認識失敗", cancelled: "キャンセル済み" },
    failedTitle: "認識を完了できませんでした。以下の案内に沿ってファイルを確認してください。", failedBody: "ページが正しい向きで鮮明に写り、大きな影や切り落としがないことを確認してください。無料ジョブの失敗は利用枠の手動確認が必要です。再度支払わないでください。", technicalDetails: "技術情報", reportIssue: "認識の問題を報告", diagnosticsEyebrow: "認識診断", diagnosticsTitle: "アップグレード前に信頼度と警告を確認してください。", diagnosticsWarning: "認識エンジンから手動確認が必要な警告が返されました。", confidenceLabel: "全体の信頼度", confidenceHelp: "信頼度が低い場合は小節ごとの確認が必要です。", pagesLabel: "認識したページ数", pagesHelp: "無料プロジェクトは完全な複数ページ PDF 1 件に対応します。", warningsLabel: "警告", engineFallback: "認識エンジン診断", previewEyebrow: "五線譜プレビュー", previewTitle: "Audiveris 認識候補", previewEmpty: "処理が完了すると、候補の五線譜がここに表示されます。", previewLoading: "五線譜を描画しています...", previewError: "認識結果が不完全なため表示できません。より鮮明で向きが正しく、端が切れていないページを試すか、サポートへお問い合わせください。", previewRetry: "もう一度描画",
  },
  candidate: {
    compareSource: "元の画像と見比べる",
    confirmationHelp: "元の画像と比較して必要な修正を終えたら、楽譜全体を確定して確認済みの版を使ってください。",
    notationRetry: "もう一度描画する",
    notationTechnicalDetails: "技術情報",
    notationEventLabel: "{part} · 第 {measure} 小節 · {number} 番目の{type}",
    notationNote: "音符",
    notationRest: "休符",
    freeEyebrow: "無料編集", reviewEyebrow: "候補楽譜の確認", freeDescription: "生涯無料の楽譜プロジェクトを利用中です。認識結果 v{revision} を修正でき、変更は候補版として保存されます。", reviewDescription: "認識結果 v{revision} はまだ正式版ではありません。承認前に原稿と比較してください。", back: "楽譜一覧へ戻る", processMore: "さらに楽譜を処理", rejecting: "却下しています...", reject: "候補を却下", accepting: "承認しています...", accept: "この楽譜を確定", safetyEyebrow: "安全な状態", safetyTitle: "候補版が既存の正式版を上書きすることはありません", freeSafetyBody: "編集, 移調, 再生, 編集可能な楽譜ファイル, 数字譜. One Score Pass · US$2.99. この楽譜専用 · 買い切り. この楽譜の全書き出し形式を利用（PDF / MusicXML / MIDI / MP3 など）. 新しい楽譜を認識 · Starter / Proが必要（One Score Passには含まれません）. Starter · US$7.99/月 · 毎月 50 クレジット. 月額プラン：通常の楽譜は約1クレジット/曲、複数ページの大きな楽譜（約6ページ以上）は約5クレジット/曲.", reviewSafetyBody: "修正は正式な楽譜を変更せず、新しい候補版を作成します。承認すると最新の候補を正式版へ複製し、移調、再生、書き出しが利用可能になります。", historyGroupLabel: "候補修正の元に戻す・やり直し", undo: "修正を元に戻す", redo: "修正をやり直す", viewportLabel: "確認表示", syncScroll: "スクロールを同期", zoomGroupLabel: "確認表示の拡大縮小", zoomOut: "縮小", zoomIn: "拡大", fitWidth: "幅に合わせる", notationEyebrow: "候補譜面", notationTitle: "MusicXML 五線譜プレビュー", notationBody: "譜面の音符または診断を選択して、候補イベントを確認します。", notationEmpty: "描画可能な候補 MusicXML はまだありません。", notationLoading: "候補の五線譜を描画しています...", notationError: "候補 MusicXML を描画できませんでした。", notationDeferred: "大きな楽譜です。比較表示が必要なときに完全な OSMD プレビューを読み込んでください。グラフィカルエディターはそのまま利用できます。", notationRender: "完全な OSMD プレビューを読み込む",
  },
  omr: {
    symbolLabel: "記号",
    summary: "{count}か所を確認してください。元の画像と見比べてから楽譜全体を確定してください。",
    noIssues: "注意箇所は見つかりませんでしたが、元の画像といくつかの箇所を見比べてください。",
    checkLabel: "要確認",
    noFlagLabel: "注意箇所なし",
    noLocation: "対応する音符や枠を正確に示せません。表示されたページや小節を確認してください。",
    technicalDetails: "技術情報",
    technicalHelp: "認識の点数は目安で、正確さを示す割合ではありません。調査用に元の診断内容をここに残しています。",
    reasons: {"uncertainSymbol":"この記号は読み違えている可能性があります。元の画像と見比べてください。","rhythm":"この小節の拍数が合わない可能性があります。音符と休符を確認してください。","duration":"この音符や休符の長さが不確かです。何拍分か確認してください。","durationType":"音符や休符の長さを読み取れませんでした。元の画像の形を確認してください。","timeSignature":"拍子が不確かです。楽譜の先頭の拍子記号を確認してください。","unknown":"この箇所は確認が必要です。元の画像と見比べてください。"},
    sources: { "omr-engine": "認識エンジン", structural: "構造検証" },
    sourcePreviewFailed: "スキャン原稿を読み込めませんでした。", pageTemplate: "{page} ページ", measureTemplate: "第 {measure} 小節", scanAltTemplate: "{name} のスキャン原稿", eyebrow: "OMR 比較", title: "元の画像と見比べる", body: "不確かな箇所を元の画像で確認してください。印は確認をお願いするもので、誤りが確定したわけではありません。", issueNavigation: "問題間を移動", previous: "前へ", next: "次へ", sourceMode: "原稿の表示方法", original: "元の画像を見る", overlay: "注意箇所を表示", issuesOnly: "問題のある記号のみ", scanPages: "スキャンページ", noSource: "このプロジェクトにはプレビュー可能な PDF／画像原稿がありません。", loadingSource: "スキャン原稿を読み込んでいます...", geometryWarning: "ページ画像のピクセル寸法が認識記録と一致しません。承認前にこのファイルを再認識してください。", symbolLayer: "信頼度の低い記号の位置", pageSymbols: "ページの記号", issueSymbols: "問題のある記号", problemMeasures: "問題のある小節", gradeLabel: "評価", contextGradeLabel: "文脈評価", noDiagnostics: "このページと絞り込み条件では注意箇所がありません。元の画像との比較はできます。",
  },
} satisfies ScoreEntryMessages;
