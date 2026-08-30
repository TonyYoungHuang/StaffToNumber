import type { ScoreEntryMessages } from "../types";

export const jaScoreEntryMessages = {
  pages: {
    library: { eyebrow: "楽譜ワークスペース", title: "楽譜を認識、管理し、作業を続ける", body: "PDF や楽譜画像をアップロードして認識を始めるか、保存済みの楽譜を開いて編集を続けられます。アップロード、候補、ライブラリを 1 つのワークスペースで管理できます。" },
    newScore: {
      eyebrow: "新しい楽譜を作成", title: "何から始めますか？", body: "入力元を 1 つ選んでください。次のページには、その方法に必要な手順だけが表示されます。", recommended: "おすすめ", choose: "選択",
      choices: {
        scan: { title: "PDF または楽譜画像をスキャン", body: "印刷楽譜、スキャン、PDF に適しています。新しいアカウントでは、完全な複数ページ PDF または楽譜画像から生涯無料のプロジェクトを 1 件作成できます。" },
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
        scan: { eyebrow: "新しい楽譜を作成", title: "PDF または楽譜画像をスキャン", body: "ファイルを 1 つ選んで認識を開始します。このページはスキャン専用です。" },
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
      chooseFile: "PDF または画像ファイルを選択してください。", importFailed: "OMR 読み込みジョブを作成できませんでした。", imported: "ファイルをアップロードし、認識を開始しました。後で「自分の楽譜」から確認できます。", eyebrow: "楽譜認識", title: "PDF または楽譜画像をアップロード", body: "印刷楽譜や PDF を、確認・修正できる電子楽譜に変換します。複雑な記譜では少し手作業が必要な場合があります。", dropTitle: "PDF または画像を選択", dropBody: "PDF、PNG、JPG、WEBP、TIFF に対応しています。", empty: "スキャンがまだ選択されていません。", button: "認識を開始", accessLoading: "無料スキャンの利用可否を確認しています...", freeEyebrow: "ログイン済み · 無料で編集", freeBody: "完全な複数ページ PDF または楽譜画像を 1 件アップロードして、生涯無料の楽譜プロジェクトを作成できます。修正、再生、移調、変換、共有、書き出しを続けられます。", exhaustedEyebrow: "無料編集スキャンは使用済みです", exhaustedTitle: "このアカウントでは生涯無料の楽譜プロジェクトを 1 件作成済みです。", exhaustedBody: "その完全な楽譜は引き続き修正、再生、移調、変換、版管理、共有、書き出しができます。さらに楽譜を作成・処理する場合のみアップグレードしてください。", exhaustedLibrary: "無料の楽譜を続ける", exhaustedUpgrade: "完全アクセスを有効化",
    },
    backup: {
      chooseFile: "楽譜バックアップを選択してください。", importFailed: "バックアップを復元できませんでした。", imported: "楽譜バックアップを復元しました。", eyebrow: "バックアップを復元", title: "楽譜バックアップを選択", body: "以前このサイトからダウンロードした楽譜バックアップを復元して、編集を続けます。", dropTitle: "バックアップを選択", dropBody: ".score.json と .json ファイルに対応しています。", empty: "Score JSON スナップショットがまだ選択されていません。", button: "楽譜を復元",
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
    loadingJob: "ジョブを読み込んでいます", preparing: "無料編集を準備しています", loadingScore: "楽譜を読み込んでいます...", intro: "認識が完了すると、完全な無料プロジェクトで修正、再生、移調、数字譜、版管理、共有、書き出しができます。さらに楽譜を処理する場合はアップグレードしてください。", unlock: "完全アクセスを有効化", back: "ライブラリへ戻る",
    statuses: { queued: "待機中", processing: "認識中", completed: "認識完了", failed: "認識失敗", cancelled: "キャンセル済み" },
    failedTitle: "認識を完了できませんでした。以下の案内に沿ってファイルを確認してください。", failedBody: "ページが正しい向きで鮮明に写り、大きな影や切り落としがないことを確認してください。無料ジョブの失敗は利用枠の手動確認が必要です。再度支払わないでください。", technicalDetails: "技術情報", reportIssue: "認識の問題を報告", diagnosticsEyebrow: "認識診断", diagnosticsTitle: "アップグレード前に信頼度と警告を確認してください。", diagnosticsWarning: "認識エンジンから手動確認が必要な警告が返されました。", confidenceLabel: "全体の信頼度", confidenceHelp: "信頼度が低い場合は小節ごとの確認が必要です。", pagesLabel: "認識したページ数", pagesHelp: "無料プロジェクトは完全な複数ページ PDF 1 件に対応します。", warningsLabel: "警告", engineFallback: "認識エンジン診断", previewEyebrow: "五線譜プレビュー", previewTitle: "Audiveris 認識候補", previewEmpty: "処理が完了すると、候補の五線譜がここに表示されます。", previewLoading: "五線譜を描画しています...", previewError: "認識結果が不完全なため表示できません。より鮮明で向きが正しく、端が切れていないページを試すか、サポートへお問い合わせください。", previewRetry: "もう一度描画",
  },
  candidate: {
    notationRetry: "もう一度描画する",
    notationTechnicalDetails: "技術情報",
    notationEventLabel: "{part} · 第 {measure} 小節 · {number} 番目の{type}",
    notationNote: "音符",
    notationRest: "休符",
    freeEyebrow: "無料編集", reviewEyebrow: "候補楽譜の確認", freeDescription: "生涯無料の楽譜プロジェクトを利用中です。認識結果 v{revision} を修正でき、変更は候補版として保存されます。", reviewDescription: "認識結果 v{revision} はまだ正式版ではありません。承認前に原稿と比較してください。", back: "楽譜一覧へ戻る", processMore: "さらに楽譜を処理", rejecting: "却下しています...", reject: "候補を却下", accepting: "承認しています...", accept: "正式版として承認", safetyEyebrow: "安全な状態", safetyTitle: "候補版が既存の正式版を上書きすることはありません", freeSafetyBody: "無料アカウントでも楽譜全体を修正し、再生、移調、数字譜、版管理、共有、利用可能な書き出しを続けられます。さらにプロジェクトを作成する場合はアップグレードしてください。", reviewSafetyBody: "修正は正式な楽譜を変更せず、新しい候補版を作成します。承認すると最新の候補を正式版へ複製し、移調、再生、書き出しが利用可能になります。", historyGroupLabel: "候補修正の元に戻す・やり直し", undo: "修正を元に戻す", redo: "修正をやり直す", viewportLabel: "確認表示", syncScroll: "スクロールを同期", zoomGroupLabel: "確認表示の拡大縮小", zoomOut: "縮小", zoomIn: "拡大", fitWidth: "幅に合わせる", notationEyebrow: "候補譜面", notationTitle: "MusicXML 五線譜プレビュー", notationBody: "譜面の音符または診断を選択して、候補イベントを確認します。", notationEmpty: "描画可能な候補 MusicXML はまだありません。", notationLoading: "候補の五線譜を描画しています...", notationError: "候補 MusicXML を描画できませんでした。", notationDeferred: "大きな楽譜です。比較表示が必要なときに完全な OSMD プレビューを読み込んでください。グラフィカルエディターはそのまま利用できます。", notationRender: "完全な OSMD プレビューを読み込む",
  },
  omr: {
    sources: { "omr-engine": "認識エンジン", structural: "構造検証" },
    sourcePreviewFailed: "スキャン原稿を読み込めませんでした。", pageTemplate: "{page} ページ", measureTemplate: "第 {measure} 小節", scanAltTemplate: "{name} のスキャン原稿", eyebrow: "OMR 比較", title: "スキャン原稿と認識診断", body: "赤枠は Audiveris の記号座標を使用します。structural スコアはリズムの完全性を検証するもので、モデルの確率ではありません。", issueNavigation: "問題間を移動", previous: "前へ", next: "次へ", sourceMode: "原稿の表示方法", original: "原本", overlay: "診断オーバーレイ", issuesOnly: "問題のある記号のみ", scanPages: "スキャンページ", noSource: "このプロジェクトにはプレビュー可能な PDF／画像原稿がありません。", loadingSource: "スキャン原稿を読み込んでいます...", geometryWarning: "ページ画像のピクセル寸法が認識記録と一致しません。承認前にこのファイルを再認識してください。", symbolLayer: "信頼度の低い記号の位置", pageSymbols: "ページの記号", issueSymbols: "問題のある記号", problemMeasures: "問題のある小節", gradeLabel: "評価", contextGradeLabel: "文脈評価", noDiagnostics: "このページとフィルターに一致する診断はありません。",
  },
} satisfies ScoreEntryMessages;
