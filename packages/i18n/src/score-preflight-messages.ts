import type { SupportedLocale } from './locales.ts';

const supportCopy: Record<SupportedLocale, readonly [string, string, string, string]> = {
  en: ['This file is supported for recognition. Results still need review.', 'This PDF is supported. Page resolution will be adjusted to the processing budget, and all pages will be recognized in order.', 'This PDF cannot be processed at a useful reading resolution. Crop oversized pages or split the file before confirming. No credits have been used.', 'This PDF cannot be read safely. Export it again before confirming. No credits have been used.'],
  'zh-CN': ['此文件支持正式识谱，结果仍需校对。', '此 PDF 支持正式识谱。将按处理预算自动调整每页分辨率，按顺序识别全部页面。', '此 PDF 无法在可用清晰度下完成识谱。请裁切过大页面或拆分文件后再确认，当前未扣积分。', '此 PDF 无法安全读取，请重新导出后再确认，当前未扣积分。'],
  'zh-TW': ['此檔案支援正式識譜，結果仍需校對。', '此 PDF 支援正式識譜。會依處理預算調整每頁解析度，依序辨識全部頁面。', '此 PDF 無法在可用清晰度下完成識譜。請裁切過大頁面或拆分檔案後再確認，目前未扣點數。', '此 PDF 無法安全讀取，請重新匯出後再確認，目前未扣點數。'],
  ja: ['このファイルは認識できます。結果の確認は必要です。', 'この PDF は認識できます。処理上限に合わせて各ページの解像度を調整し、全ページを順番に処理します。', '十分な解像度で処理できません。大きなページを切り抜くかファイルを分割してから確定してください。クレジットは未消費です。', 'PDF を安全に読み取れません。再出力してください。クレジットは未消費です。'],
  ko: ['이 파일은 인식을 지원합니다. 결과 검토는 필요합니다.', '이 PDF는 인식을 지원합니다. 처리 한도에 맞춰 페이지 해상도를 조정하고 모든 페이지를 순서대로 처리합니다.', '충분한 해상도로 처리할 수 없습니다. 큰 페이지를 자르거나 파일을 나눈 후 확정하세요. 크레딧은 사용되지 않았습니다.', 'PDF를 안전하게 읽을 수 없습니다. 다시 내보내세요. 크레딧은 사용되지 않았습니다.'],
  fr: ['Ce fichier est accepté pour la reconnaissance. Le résultat reste à vérifier.', 'Ce PDF est accepté. La résolution de chaque page sera adaptée au budget et toutes les pages seront traitées dans l’ordre.', 'Ce PDF ne peut pas être traité avec une résolution suffisante. Recadrez les grandes pages ou divisez le fichier avant de confirmer. Aucun crédit utilisé.', 'Ce PDF ne peut pas être lu correctement. Exportez-le à nouveau. Aucun crédit utilisé.'],
  es: ['Este archivo admite reconocimiento. Revise el resultado.', 'Este PDF admite reconocimiento. La resolución se ajustará al presupuesto y todas las páginas se procesarán en orden.', 'No se puede procesar este PDF con resolución suficiente. Recorte las páginas grandes o divida el archivo antes de confirmar. No se han usado créditos.', 'No se puede leer el PDF de forma segura. Expórtelo de nuevo. No se han usado créditos.'],
  de: ['Diese Datei wird für die Erkennung unterstützt. Das Ergebnis muss geprüft werden.', 'Dieses PDF wird unterstützt. Die Seitenauflösung wird an das Verarbeitungsbudget angepasst; alle Seiten werden der Reihe nach erkannt.', 'Dieses PDF kann nicht mit ausreichender Auflösung verarbeitet werden. Beschneiden Sie große Seiten oder teilen Sie die Datei vor der Bestätigung. Keine Credits verbraucht.', 'Das PDF kann nicht sicher gelesen werden. Exportieren Sie es erneut. Keine Credits verbraucht.'],
  ru: ['Файл поддерживается для распознавания. Результат необходимо проверить.', 'PDF поддерживается. Разрешение каждой страницы будет адаптировано к лимиту, все страницы обработаются по порядку.', 'PDF нельзя обработать с достаточным разрешением. Обрежьте большие страницы или разделите файл перед подтверждением. Кредиты не списаны.', 'PDF нельзя безопасно прочитать. Экспортируйте его заново. Кредиты не списаны.'],
};

export function getScoreRecognitionSupportMessage(locale: SupportedLocale, code: string) {
  return supportCopy[locale][code === 'READY' ? 0 : code === 'PDF_ADAPTIVE_RENDER' ? 1 : code === 'PDF_INVALID' ? 3 : 2];
}

const en = {
  title: 'Check your score before recognition',
  freeBody: 'This structure check uses no credits. When your free project is available, simple recognition starts with one tap.',
  checking: 'Checking score structure…', failed: 'The structure check could not finish. Retry with the same file.', retry: 'Retry free check',
  recommendedSimple: 'Recommended: simple recognition', recommendedComplex: 'Recommended: complex score recognition',
  recommendationUncertain: 'The structure is unclear. Please choose a mode.',
  incomplete: 'Only part of the file could be checked. All original pages will still be submitted for recognition.',
  summary: '{analyzed} of {pages} pages checked · up to {staves} staves in one score system',
  tabDetected: 'TAB lines were detected. The complex workbench helps review and complete this notation.',
  manyStaves: 'Several staves occur together; layered recognition and instrument review may be needed.',
  ordinaryStaves: 'The detected layout fits ordinary single-staff or two-staff notation.',
  uncertainStructure: 'The image does not provide enough reliable structure information.',
  manualChoice: 'Select simple or complex after checking your original score.', chooseMode: 'Recognition mode',
  confirmRecognition: 'Confirm {mode} · {credits} credits',
  startRecognition: 'Start recognition',
  freeProjectPrice: 'Free — uses your 1 free project',
  advancedModes: 'Advanced: complex / multi-staff recognition',
  showModes: 'Show recognition modes',
  hideModes: 'Hide recognition modes',
  priceChanged: 'The price has changed. Review the updated price and confirm again.',
  notReady: 'Wait for the free structure check to finish before starting recognition.',
  noCredit: 'Your current allowance does not cover this mode.', selectedFilePreserved: 'Your file stays selected when you change modes.',
  simpleTitle: 'Simple score', complexTitle: 'Complex score', price: '{credits} credits per recognition', changeFile: 'Choose another file',
  fileTooLarge: 'Choose a file up to 20 MB.',
  priceLoading: 'Checking your recognition price…', priceFailed: 'Could not load the recognition price. Please retry.',
  reasonStrings: {
    SINGLE_STAFF_LAYOUT: 'Single-staff layout detected.', PIANO_STAFF_LAYOUT: 'Ordinary two-staff layout detected.',
    MULTI_INSTRUMENT_LAYOUT: 'Several staves occur together.', TAB_NOTATION: 'TAB lines detected.',
    SYSTEM_GROUPING_UNCERTAIN: 'The grouping of staves needs your review.', PAGE_READ_FAILED: 'Some pages could not be read.',
    NO_STAFF_DETECTED: 'No reliable staff structure was detected.', ORIENTATION_UNCERTAIN: 'The page direction is unclear.',
    LOW_RESOLUTION: 'The image resolution is too low to reliably check its structure.',
    ANALYSIS_LIMIT_REACHED: 'Only part of the file could be checked within the free check limits.',
    INCOMPLETE_ANALYSIS: 'Some pages have not completed the structure check.',
    INCONSISTENT_LAYOUT: 'The staff layout varies between pages and needs your review.',
  } as Record<string, string>,
};
export type ScorePreflightMessages = typeof en;
const zh: ScorePreflightMessages = {
  title: '先检查乐谱，再开始识别', freeBody: '结构预检不消耗积分。若仍有免费项目，简单识谱可一键开始。',
  checking: '正在检查乐谱结构…', failed: '结构预检未能完成，原文件仍保留，请重试。', retry: '重新免费预检',
  recommendedSimple: '推荐：简单识谱', recommendedComplex: '推荐：复杂总谱识别', recommendationUncertain: '结构暂时无法确定，请手动选择识谱方式。',
  incomplete: '仅完成了部分预检。正式识别仍会提交完整原文件，不会删减页面。',
  summary: '已检查 {analyzed}/{pages} 页 · 同一谱段最多 {staves} 个谱表',
  tabDetected: '检测到 TAB 谱线，复杂工作台便于核对并补齐这类记谱。',
  manyStaves: '多个谱表同时出现，可能需要分层识别和按乐器核对。', ordinaryStaves: '检测到常规单谱表或双谱表结构。',
  uncertainStructure: '图像中的结构信息还不足以可靠判断。', manualChoice: '请对照原稿，选择简单识谱或复杂总谱。', chooseMode: '识谱方式',
  confirmRecognition: '确认{mode} · 消耗 {credits} 积分', startRecognition: '开始识谱', freeProjectPrice: '免费 — 使用你的 1 次免费项目', advancedModes: '高级：复杂总谱 / 多声部识谱', showModes: '显示识谱方式', hideModes: '收起识谱方式', priceChanged: '识谱价格已变化，请查看新价格后再次确认。',
  notReady: '请先完成免费预检并选定模式，再开始识别。', noCredit: '当前额度不足以使用此模式。',
  selectedFilePreserved: '切换模式会保留已选择的文件，无需重新上传。', simpleTitle: '简单乐谱', complexTitle: '复杂总谱',
  price: '每次识谱 {credits} 积分', changeFile: '选择其他文件', fileTooLarge: '请选择不超过 20 MB 的文件。',
  priceLoading: '正在读取识谱价格…', priceFailed: '暂时无法读取识谱价格，请重试。',
  reasonStrings: {
    SINGLE_STAFF_LAYOUT: '检测到单谱表结构。', PIANO_STAFF_LAYOUT: '检测到常规双谱表结构。', MULTI_INSTRUMENT_LAYOUT: '多个谱表同时出现。',
    TAB_NOTATION: '检测到 TAB 谱线。', SYSTEM_GROUPING_UNCERTAIN: '谱表的分组需要人工核对。', PAGE_READ_FAILED: '部分页面无法读取。',
    NO_STAFF_DETECTED: '未检测到可靠的谱表结构。', ORIENTATION_UNCERTAIN: '页面朝向暂时无法确定。',
    LOW_RESOLUTION: '图像分辨率不足以可靠判断结构。', ANALYSIS_LIMIT_REACHED: '免费预检达到限制，部分页面尚未检查。',
    INCOMPLETE_ANALYSIS: '部分页面未完成结构预检。', INCONSISTENT_LAYOUT: '不同页面的谱表布局存在差异，需要人工核对。',
  },
};
const ja: ScorePreflightMessages = {
  title: '認識前に楽譜を確認', freeBody: '構造の事前確認ではクレジットを消費しません。無料プロジェクトが残っていれば、シンプル認識はワンタップで開始できます。',
  checking: '楽譜の構造を確認中…', failed: '事前確認を完了できませんでした。同じファイルで再試行できます。', retry: '無料確認を再試行',
  recommendedSimple: 'おすすめ：シンプル認識', recommendedComplex: 'おすすめ：総譜認識', recommendationUncertain: '構造を確定できません。認識方式を選択してください。',
  incomplete: '一部のみ確認できました。認識には元のファイルの全ページを送信します。',
  summary: '{pages} ページ中 {analyzed} ページ確認 · 一段に最大 {staves} 譜表',
  tabDetected: 'TAB の線を検出しました。総譜ワークスペースで確認・補完できます。',
  manyStaves: '複数の譜表が並ぶため、楽器ごとの認識と確認が必要な可能性があります。', ordinaryStaves: '通常の単一譜表または大譜表の構造です。',
  uncertainStructure: '画像から十分な構造情報を得られませんでした。', manualChoice: '原稿を確認してシンプル認識または総譜認識を選択してください。', chooseMode: '認識方式',
  confirmRecognition: '{mode}を確認 · {credits} クレジット', startRecognition: '認識を開始', freeProjectPrice: '無料 — 生涯 1 件の無料プロジェクトを使用', advancedModes: '上級：複雑／複数パート認識', showModes: '認識方式を表示', hideModes: '認識方式を隠す', priceChanged: '料金が変更されました。新しい料金を確認して再度確定してください。',
  notReady: '無料確認を完了して認識方式を選択してください。', noCredit: 'この方式に必要なクレジットが不足しています。',
  selectedFilePreserved: '方式を変更しても選択したファイルは保持されます。', simpleTitle: 'シンプルな楽譜', complexTitle: '複雑な総譜',
  price: '認識ごとに {credits} クレジット', changeFile: '別のファイルを選択', fileTooLarge: '20 MB 以下のファイルを選択してください。',
  priceLoading: '認識料金を確認中…', priceFailed: '認識料金を取得できませんでした。再試行してください。',
  reasonStrings: {
    SINGLE_STAFF_LAYOUT: '単一譜表の構造を検出しました。', PIANO_STAFF_LAYOUT: '通常の大譜表を検出しました。', MULTI_INSTRUMENT_LAYOUT: '複数の譜表が並んでいます。',
    TAB_NOTATION: 'TAB の線を検出しました。', SYSTEM_GROUPING_UNCERTAIN: '譜表のグループを確認してください。', PAGE_READ_FAILED: '一部のページを読み込めませんでした。',
    NO_STAFF_DETECTED: '信頼できる譜表構造を検出できませんでした。', ORIENTATION_UNCERTAIN: 'ページの向きを確定できません。',
    LOW_RESOLUTION: '画像の解像度が低いため構造を確定できません。', ANALYSIS_LIMIT_REACHED: '無料確認の上限に達し、一部のページは未確認です。',
    INCOMPLETE_ANALYSIS: '一部のページは構造の事前確認が完了していません。', INCONSISTENT_LAYOUT: 'ページごとに譜表の配置が異なります。原稿を確認してください。',
  },
};
const zhTW: ScorePreflightMessages = {
  title: '先檢查樂譜，再開始辨識', freeBody: '結構預檢不消耗點數。若仍有免費專案，簡單辨識可一鍵開始。',
  checking: '正在檢查樂譜結構…', failed: '結構預檢未能完成，原檔案仍保留，請重試。', retry: '重新免費預檢',
  recommendedSimple: '推薦：簡單樂譜辨識', recommendedComplex: '推薦：複雜總譜辨識', recommendationUncertain: '結構暫時無法確定，請手動選擇辨識方式。',
  incomplete: '僅完成部分預檢。正式辨識仍會提交完整原檔案，不會刪減頁面。',
  summary: '已檢查 {analyzed}/{pages} 頁 · 同一譜段最多 {staves} 個譜表',
  tabDetected: '偵測到 TAB 譜線，複雜工作台可協助核對與補齊這類記譜。',
  manyStaves: '多個譜表同時出現，可能需要分層辨識與逐一核對樂器。', ordinaryStaves: '偵測到一般單譜表或雙譜表結構。',
  uncertainStructure: '影像中的結構資訊不足以可靠判斷。', manualChoice: '請對照原稿，選擇簡單樂譜或複雜總譜。', chooseMode: '辨識方式',
  confirmRecognition: '確認{mode} · 消耗 {credits} 點數', startRecognition: '開始辨識', freeProjectPrice: '免費 — 使用你的 1 次免費專案', advancedModes: '進階：複雜總譜／多聲部辨識', showModes: '顯示辨識方式', hideModes: '收起辨識方式', priceChanged: '辨識價格已變更，請查看新價格後再次確認。',
  notReady: '請先完成免費預檢並選定方式，再開始辨識。', noCredit: '目前額度不足以使用此方式。',
  selectedFilePreserved: '切換方式會保留所選檔案，無須重新上傳。', simpleTitle: '簡單樂譜', complexTitle: '複雜總譜',
  price: '每次辨識 {credits} 點數', changeFile: '選擇其他檔案', fileTooLarge: '請選擇不超過 20 MB 的檔案。',
  priceLoading: '正在讀取辨識價格…', priceFailed: '暫時無法讀取辨識價格，請重試。',
  reasonStrings: {
    SINGLE_STAFF_LAYOUT: '偵測到單譜表結構。', PIANO_STAFF_LAYOUT: '偵測到一般雙譜表結構。', MULTI_INSTRUMENT_LAYOUT: '多個譜表同時出現。',
    TAB_NOTATION: '偵測到 TAB 譜線。', SYSTEM_GROUPING_UNCERTAIN: '譜表的分組需要人工核對。', PAGE_READ_FAILED: '部分頁面無法讀取。',
    NO_STAFF_DETECTED: '未偵測到可靠的譜表結構。', ORIENTATION_UNCERTAIN: '頁面方向暫時無法確定。',
    LOW_RESOLUTION: '影像解析度不足以可靠判斷結構。', ANALYSIS_LIMIT_REACHED: '免費預檢達到限制，部分頁面尚未檢查。',
    INCOMPLETE_ANALYSIS: '部分頁面尚未完成結構預檢。', INCONSISTENT_LAYOUT: '不同頁面的譜表配置存在差異，需要人工核對。',
  },
};
const ko: ScorePreflightMessages = {
  title: '인식 전에 악보 확인', freeBody: '구조 확인에는 크레딧이 차감되지 않습니다. 무료 프로젝트가 남아 있으면 간단 인식을 한 번 탭으로 시작할 수 있습니다.',
  checking: '악보 구조 확인 중…', failed: '구조 확인을 완료하지 못했습니다. 선택한 파일로 다시 시도하세요.', retry: '무료 확인 다시 시도',
  recommendedSimple: '추천: 간단한 악보 인식', recommendedComplex: '추천: 복잡한 총보 인식', recommendationUncertain: '구조를 판단하기 어렵습니다. 인식 방식을 직접 선택하세요.',
  incomplete: '파일의 일부만 확인했습니다. 실제 인식에는 원본의 모든 페이지를 전송합니다.',
  summary: '{pages}페이지 중 {analyzed}페이지 확인 · 한 단에 최대 {staves}개 보표',
  tabDetected: 'TAB 선을 감지했습니다. 총보 작업 공간에서 이 기보를 확인하고 보완할 수 있습니다.',
  manyStaves: '여러 보표가 함께 있어 악기별 인식과 확인이 필요할 수 있습니다.', ordinaryStaves: '일반적인 단일 보표 또는 두 보표 구조입니다.',
  uncertainStructure: '이미지에서 신뢰할 만한 구조 정보를 충분히 얻지 못했습니다.', manualChoice: '원본을 확인한 후 간단한 악보 또는 복잡한 총보를 선택하세요.', chooseMode: '인식 방식',
  confirmRecognition: '{mode} 확인 · {credits} 크레딧', startRecognition: '인식 시작', freeProjectPrice: '무료 — 평생 1회 무료 프로젝트 사용', advancedModes: '고급: 복잡한 총보 / 다성부 인식', showModes: '인식 방식 보기', hideModes: '인식 방식 숨기기', priceChanged: '인식 비용이 변경되었습니다. 새 비용을 확인하고 다시 확정하세요.',
  notReady: '무료 확인을 완료하고 인식 방식을 선택한 후 시작하세요.', noCredit: '현재 크레딧으로는 이 방식을 사용할 수 없습니다.',
  selectedFilePreserved: '방식을 변경해도 선택한 파일이 유지됩니다.', simpleTitle: '간단한 악보', complexTitle: '복잡한 총보',
  price: '인식 1회당 {credits} 크레딧', changeFile: '다른 파일 선택', fileTooLarge: '20 MB 이하의 파일을 선택하세요.',
  priceLoading: '인식 비용 확인 중…', priceFailed: '인식 비용을 불러오지 못했습니다. 다시 시도하세요.',
  reasonStrings: {
    SINGLE_STAFF_LAYOUT: '단일 보표 구조를 감지했습니다.', PIANO_STAFF_LAYOUT: '일반적인 두 보표 구조를 감지했습니다.', MULTI_INSTRUMENT_LAYOUT: '여러 보표가 함께 있습니다.',
    TAB_NOTATION: 'TAB 선을 감지했습니다.', SYSTEM_GROUPING_UNCERTAIN: '보표 묶음을 직접 확인해야 합니다.', PAGE_READ_FAILED: '일부 페이지를 읽지 못했습니다.',
    NO_STAFF_DETECTED: '신뢰할 만한 보표 구조를 감지하지 못했습니다.', ORIENTATION_UNCERTAIN: '페이지 방향을 판단하지 못했습니다.',
    LOW_RESOLUTION: '이미지 해상도가 낮아 구조를 정확히 확인하기 어렵습니다.', ANALYSIS_LIMIT_REACHED: '무료 확인 한도에 도달하여 일부 페이지는 확인하지 못했습니다.',
    INCOMPLETE_ANALYSIS: '일부 페이지의 구조 확인이 완료되지 않았습니다.', INCONSISTENT_LAYOUT: '페이지마다 보표 배치가 달라 원본 확인이 필요합니다.',
  },
};
const fr: ScorePreflightMessages = {
  title: 'Vérifiez la partition avant la reconnaissance', freeBody: 'Cette vérification de structure ne consomme aucun crédit. Avec un projet gratuit disponible, la reconnaissance simple démarre en un appui.',
  checking: 'Vérification de la structure…', failed: 'La vérification n’a pas abouti. Réessayez avec le même fichier.', retry: 'Relancer la vérification gratuite',
  recommendedSimple: 'Recommandation : reconnaissance simple', recommendedComplex: 'Recommandation : reconnaissance de partition complexe', recommendationUncertain: 'La structure est incertaine. Choisissez un mode.',
  incomplete: 'Seule une partie du fichier a été vérifiée. Toutes les pages originales seront transmises pour la reconnaissance.',
  summary: '{analyzed} pages vérifiées sur {pages} · jusqu’à {staves} portées dans un même système',
  tabDetected: 'Des lignes de tablature ont été détectées. L’atelier de partition complexe permet de les vérifier et de les compléter.',
  manyStaves: 'Plusieurs portées sont regroupées ; une reconnaissance et une vérification par instrument peuvent être nécessaires.', ordinaryStaves: 'La disposition correspond à une partition courante à une ou deux portées.',
  uncertainStructure: 'L’image ne fournit pas assez d’informations fiables sur la structure.', manualChoice: 'Consultez l’original, puis choisissez une partition simple ou complexe.', chooseMode: 'Mode de reconnaissance',
  confirmRecognition: 'Confirmer : {mode} · {credits} crédits', startRecognition: 'Lancer la reconnaissance', freeProjectPrice: 'Gratuit — utilise votre 1 projet gratuit', advancedModes: 'Avancé : reconnaissance complexe / multipartite', showModes: 'Afficher les modes', hideModes: 'Masquer les modes', priceChanged: 'Le prix a changé. Consultez le nouveau prix et confirmez à nouveau.',
  notReady: 'Terminez la vérification gratuite et choisissez un mode avant de lancer la reconnaissance.', noCredit: 'Votre solde ne permet pas d’utiliser ce mode.',
  selectedFilePreserved: 'Le fichier sélectionné est conservé quand vous changez de mode.', simpleTitle: 'Partition simple', complexTitle: 'Partition complexe',
  price: '{credits} crédits par reconnaissance', changeFile: 'Choisir un autre fichier', fileTooLarge: 'Choisissez un fichier de 20 Mo maximum.',
  priceLoading: 'Vérification du prix de reconnaissance…', priceFailed: 'Impossible d’obtenir le prix de reconnaissance. Réessayez.',
  reasonStrings: {
    SINGLE_STAFF_LAYOUT: 'Disposition à une portée détectée.', PIANO_STAFF_LAYOUT: 'Disposition courante à deux portées détectée.', MULTI_INSTRUMENT_LAYOUT: 'Plusieurs portées sont regroupées.',
    TAB_NOTATION: 'Lignes de tablature détectées.', SYSTEM_GROUPING_UNCERTAIN: 'Le regroupement des portées doit être vérifié.', PAGE_READ_FAILED: 'Certaines pages n’ont pas pu être lues.',
    NO_STAFF_DETECTED: 'Aucune structure de portée fiable n’a été détectée.', ORIENTATION_UNCERTAIN: 'L’orientation de la page est incertaine.',
    LOW_RESOLUTION: 'La résolution de l’image est insuffisante pour vérifier la structure.', ANALYSIS_LIMIT_REACHED: 'La limite de la vérification gratuite est atteinte ; certaines pages restent à vérifier.',
    INCOMPLETE_ANALYSIS: 'La vérification de certaines pages n’est pas terminée.', INCONSISTENT_LAYOUT: 'La disposition des portées varie selon les pages et doit être vérifiée.',
  },
};
const es: ScorePreflightMessages = {
  title: 'Comprueba la partitura antes del reconocimiento', freeBody: 'Esta comprobación de estructura no consume créditos. Si tienes un proyecto gratuito, el reconocimiento simple empieza con un toque.',
  checking: 'Comprobando la estructura…', failed: 'No se pudo completar la comprobación. Vuelve a intentarlo con el mismo archivo.', retry: 'Repetir la comprobación gratuita',
  recommendedSimple: 'Recomendación: reconocimiento simple', recommendedComplex: 'Recomendación: reconocimiento de partitura compleja', recommendationUncertain: 'La estructura no está clara. Elige un modo.',
  incomplete: 'Solo se pudo comprobar una parte del archivo. Se enviarán todas las páginas originales para el reconocimiento.',
  summary: '{analyzed} de {pages} páginas comprobadas · hasta {staves} pentagramas en un mismo sistema',
  tabDetected: 'Se detectaron líneas de tablatura. El espacio de partitura compleja permite revisarlas y completarlas.',
  manyStaves: 'Hay varios pentagramas agrupados; puede ser necesario reconocer y revisar cada instrumento.', ordinaryStaves: 'La disposición corresponde a una partitura habitual de uno o dos pentagramas.',
  uncertainStructure: 'La imagen no ofrece suficiente información fiable sobre la estructura.', manualChoice: 'Revisa el original y elige una partitura simple o compleja.', chooseMode: 'Modo de reconocimiento',
  confirmRecognition: 'Confirmar {mode} · {credits} créditos', startRecognition: 'Iniciar reconocimiento', freeProjectPrice: 'Gratis — usa tu 1 proyecto gratuito', advancedModes: 'Avanzado: reconocimiento complejo / multiparte', showModes: 'Mostrar modos', hideModes: 'Ocultar modos', priceChanged: 'El precio ha cambiado. Revisa el nuevo precio y vuelve a confirmar.',
  notReady: 'Completa la comprobación gratuita y elige un modo antes de iniciar el reconocimiento.', noCredit: 'Tu saldo actual no permite utilizar este modo.',
  selectedFilePreserved: 'El archivo seleccionado se conserva al cambiar de modo.', simpleTitle: 'Partitura simple', complexTitle: 'Partitura compleja',
  price: '{credits} créditos por reconocimiento', changeFile: 'Elegir otro archivo', fileTooLarge: 'Elige un archivo de hasta 20 MB.',
  priceLoading: 'Consultando el precio de reconocimiento…', priceFailed: 'No se pudo obtener el precio de reconocimiento. Vuelve a intentarlo.',
  reasonStrings: {
    SINGLE_STAFF_LAYOUT: 'Se detectó una disposición de un pentagrama.', PIANO_STAFF_LAYOUT: 'Se detectó una disposición habitual de dos pentagramas.', MULTI_INSTRUMENT_LAYOUT: 'Hay varios pentagramas agrupados.',
    TAB_NOTATION: 'Se detectaron líneas de tablatura.', SYSTEM_GROUPING_UNCERTAIN: 'Es necesario revisar la agrupación de los pentagramas.', PAGE_READ_FAILED: 'No se pudieron leer algunas páginas.',
    NO_STAFF_DETECTED: 'No se detectó una estructura de pentagrama fiable.', ORIENTATION_UNCERTAIN: 'La orientación de la página no está clara.',
    LOW_RESOLUTION: 'La resolución de la imagen es insuficiente para comprobar la estructura.', ANALYSIS_LIMIT_REACHED: 'Se alcanzó el límite de la comprobación gratuita; quedan páginas sin comprobar.',
    INCOMPLETE_ANALYSIS: 'La comprobación de algunas páginas no ha terminado.', INCONSISTENT_LAYOUT: 'La disposición de los pentagramas cambia entre páginas y debe revisarse.',
  },
};
const de: ScorePreflightMessages = {
  title: 'Partitur vor der Erkennung prüfen', freeBody: 'Diese Strukturprüfung verbraucht keine Credits. Mit freiem Projekt startet die einfache Erkennung mit einem Tippen.',
  checking: 'Partiturstruktur wird geprüft…', failed: 'Die Strukturprüfung konnte nicht abgeschlossen werden. Versuchen Sie es mit derselben Datei erneut.', retry: 'Kostenlose Prüfung wiederholen',
  recommendedSimple: 'Empfehlung: einfache Erkennung', recommendedComplex: 'Empfehlung: Erkennung einer komplexen Partitur', recommendationUncertain: 'Die Struktur ist unklar. Wählen Sie einen Modus.',
  incomplete: 'Nur ein Teil der Datei konnte geprüft werden. Für die Erkennung werden alle Originalseiten übermittelt.',
  summary: '{analyzed} von {pages} Seiten geprüft · bis zu {staves} Notensysteme in einer Akkolade',
  tabDetected: 'Tabulatur wurde erkannt. Im Arbeitsbereich für komplexe Partituren können Sie diese prüfen und ergänzen.',
  manyStaves: 'Mehrere Notensysteme stehen zusammen; eine Erkennung und Prüfung je Instrument kann nötig sein.', ordinaryStaves: 'Das Layout entspricht einer üblichen Partitur mit einem oder zwei Notensystemen.',
  uncertainStructure: 'Das Bild enthält nicht genügend zuverlässige Strukturinformationen.', manualChoice: 'Prüfen Sie das Original und wählen Sie eine einfache oder komplexe Partitur.', chooseMode: 'Erkennungsmodus',
  confirmRecognition: '{mode} bestätigen · {credits} Credits', startRecognition: 'Erkennung starten', freeProjectPrice: 'Kostenlos — nutzt Ihr 1 kostenloses Projekt', advancedModes: 'Erweitert: komplexe / mehrstimmige Erkennung', showModes: 'Modi anzeigen', hideModes: 'Modi ausblenden', priceChanged: 'Der Preis hat sich geändert. Prüfen Sie den neuen Preis und bestätigen Sie erneut.',
  notReady: 'Schließen Sie die kostenlose Prüfung ab und wählen Sie einen Modus, bevor Sie die Erkennung starten.', noCredit: 'Ihr aktuelles Guthaben reicht für diesen Modus nicht aus.',
  selectedFilePreserved: 'Die ausgewählte Datei bleibt beim Wechsel des Modus erhalten.', simpleTitle: 'Einfache Partitur', complexTitle: 'Komplexe Partitur',
  price: '{credits} Credits je Erkennung', changeFile: 'Andere Datei auswählen', fileTooLarge: 'Wählen Sie eine Datei mit höchstens 20 MB.',
  priceLoading: 'Erkennungspreis wird geprüft…', priceFailed: 'Der Erkennungspreis konnte nicht geladen werden. Versuchen Sie es erneut.',
  reasonStrings: {
    SINGLE_STAFF_LAYOUT: 'Layout mit einem Notensystem erkannt.', PIANO_STAFF_LAYOUT: 'Übliches Layout mit zwei Notensystemen erkannt.', MULTI_INSTRUMENT_LAYOUT: 'Mehrere Notensysteme stehen zusammen.',
    TAB_NOTATION: 'Tabulatur erkannt.', SYSTEM_GROUPING_UNCERTAIN: 'Die Gruppierung der Notensysteme muss geprüft werden.', PAGE_READ_FAILED: 'Einige Seiten konnten nicht gelesen werden.',
    NO_STAFF_DETECTED: 'Keine zuverlässige Notensystemstruktur erkannt.', ORIENTATION_UNCERTAIN: 'Die Seitenausrichtung ist unklar.',
    LOW_RESOLUTION: 'Die Bildauflösung reicht für eine zuverlässige Strukturprüfung nicht aus.', ANALYSIS_LIMIT_REACHED: 'Die Grenze der kostenlosen Prüfung ist erreicht; einige Seiten sind ungeprüft.',
    INCOMPLETE_ANALYSIS: 'Die Strukturprüfung einiger Seiten ist noch nicht abgeschlossen.', INCONSISTENT_LAYOUT: 'Das Layout der Notensysteme unterscheidet sich je Seite und muss geprüft werden.',
  },
};
const ru: ScorePreflightMessages = {
  title: 'Проверьте партитуру перед распознаванием', freeBody: 'Проверка структуры не расходует кредиты. Если бесплатный проект доступен, простое распознавание запускается одним нажатием.',
  checking: 'Проверяем структуру партитуры…', failed: 'Не удалось завершить проверку структуры. Повторите попытку с тем же файлом.', retry: 'Повторить бесплатную проверку',
  recommendedSimple: 'Рекомендуется: простое распознавание', recommendedComplex: 'Рекомендуется: распознавание сложной партитуры', recommendationUncertain: 'Структура неясна. Выберите режим вручную.',
  incomplete: 'Удалось проверить только часть файла. Для распознавания будут отправлены все страницы оригинала.',
  summary: 'Проверено {analyzed} из {pages} страниц · до {staves} нотных станов в одной системе',
  tabDetected: 'Обнаружены линии табулатуры. Рабочая область сложной партитуры позволяет проверить и дополнить эту запись.',
  manyStaves: 'Несколько нотных станов расположены вместе; может потребоваться распознавание и проверка каждого инструмента.', ordinaryStaves: 'Обнаружена обычная структура с одним или двумя нотными станами.',
  uncertainStructure: 'На изображении недостаточно надёжных данных о структуре.', manualChoice: 'Сверьтесь с оригиналом и выберите простую или сложную партитуру.', chooseMode: 'Режим распознавания',
  confirmRecognition: 'Подтвердить: {mode} · {credits} кредитов', startRecognition: 'Начать распознавание', freeProjectPrice: 'Бесплатно — использует ваш 1 бесплатный проект', advancedModes: 'Дополнительно: сложное / многоголосые распознавание', showModes: 'Показать режимы', hideModes: 'Скрыть режимы', priceChanged: 'Цена изменилась. Проверьте новую цену и подтвердите ещё раз.',
  notReady: 'Завершите бесплатную проверку и выберите режим перед началом распознавания.', noCredit: 'Текущего баланса недостаточно для этого режима.',
  selectedFilePreserved: 'При смене режима выбранный файл сохраняется.', simpleTitle: 'Простая партитура', complexTitle: 'Сложная партитура',
  price: '{credits} кредитов за распознавание', changeFile: 'Выбрать другой файл', fileTooLarge: 'Выберите файл размером не более 20 МБ.',
  priceLoading: 'Проверяем цену распознавания…', priceFailed: 'Не удалось получить цену распознавания. Повторите попытку.',
  reasonStrings: {
    SINGLE_STAFF_LAYOUT: 'Обнаружена структура с одним нотным станом.', PIANO_STAFF_LAYOUT: 'Обнаружена обычная структура с двумя нотными станами.', MULTI_INSTRUMENT_LAYOUT: 'Несколько нотных станов расположены вместе.',
    TAB_NOTATION: 'Обнаружены линии табулатуры.', SYSTEM_GROUPING_UNCERTAIN: 'Нужно проверить группировку нотных станов.', PAGE_READ_FAILED: 'Не удалось прочитать некоторые страницы.',
    NO_STAFF_DETECTED: 'Не удалось надёжно определить структуру нотных станов.', ORIENTATION_UNCERTAIN: 'Ориентация страницы неясна.',
    LOW_RESOLUTION: 'Разрешения изображения недостаточно для надёжной проверки структуры.', ANALYSIS_LIMIT_REACHED: 'Достигнут предел бесплатной проверки; некоторые страницы ещё не проверены.',
    INCOMPLETE_ANALYSIS: 'Проверка структуры некоторых страниц не завершена.', INCONSISTENT_LAYOUT: 'Расположение нотных станов меняется между страницами и требует проверки.',
  },
};
const catalogs: Record<SupportedLocale, ScorePreflightMessages> = { en, 'zh-CN': zh, 'zh-TW': zhTW, ja, ko, fr, es, de, ru };
export function getScorePreflightMessages(locale: SupportedLocale): ScorePreflightMessages { return catalogs[locale]; }

const processingRows: Record<SupportedLocale, readonly [readonly string[], readonly string[]]> = {
  "zh-CN": [
    [
      "正在获取任务状态",
      "乐谱已保存，等待开始识别",
      "正在读取已保存的原文件",
      "正在准备页面，按预算调整 PDF 清晰度",
      "正在分析五线谱、谱行和声部结构",
      "正在识别音符、节奏和小节",
      "谱线偏小，正在自动放大图片并恢复识别",
      "正在合并页面并检查乐谱结构",
      "正在保存可校对的识别结果"
    ],
    [
      "已等待 {seconds} 秒",
      "正在处理第 {page} 页，共 {total} 页",
      "当前排队位置：{position}",
      "页面会自动更新，请勿重复提交。",
      "此步骤耗时较长。复杂或多页乐谱可能需要数分钟；后台会在达到处理时限后明确返回结果。",
      "暂未收到新的处理进度。请刷新状态确认；这不代表识谱已经失败，请勿重复提交。",
      "暂时无法获取最新进度，不代表识谱失败。请刷新状态，不必重新上传。",
      "原文件已保留。可返回乐谱库，稍后打开同一项目继续查看结果。",
      "正在上传并检查原文件",
      "上传完成后会自动进入识谱，请保持当前页面打开，避免重复上传。",
      "正在检查页面数量和乐谱结构，并确认是否支持正式识谱。此步骤不扣次数或积分。"
    ]
  ],
  "en": [
    [
      "Loading job status",
      "Score saved; waiting to start",
      "Reading your saved original",
      "Preparing pages and adjusting PDF resolution",
      "Checking staff lines, systems and parts",
      "Recognizing notes, rhythm and measures",
      "Staff lines are small; enlarging the image automatically",
      "Combining pages and checking score structure",
      "Saving your score for review"
    ],
    [
      "Waited {seconds} seconds",
      "Processing page {page} of {total}",
      "Queue position: {position}",
      "This page updates automatically. Please do not submit again.",
      "This step is taking longer. Complex or multi-page scores can take several minutes. The job will return a result or a clear time-limit notice.",
      "No new processing update yet. Refresh the status to check; this does not mean recognition failed. Please do not submit again.",
      "Cannot get the latest status right now. This does not mean recognition failed. Refresh the status; do not upload again.",
      "Your original is saved. You can return to your score library and open this project later.",
      "Uploading and checking your original",
      "Keep this page open until upload finishes. Recognition will start automatically; do not upload twice.",
      "Checking pages, score structure and support for recognition. This check uses no allowance or credits."
    ]
  ],
  "zh-TW": [
    [
      "正在取得任務狀態",
      "樂譜已儲存，等待開始辨識",
      "正在讀取已儲存的原檔案",
      "正在準備頁面並調整 PDF 解析度",
      "正在分析五線譜、譜行和聲部",
      "正在辨識音符、節奏和小節",
      "譜線偏小，正在自動放大圖片",
      "正在合併頁面並檢查樂譜結構",
      "正在儲存可校對的辨識結果"
    ],
    [
      "已等待 {seconds} 秒",
      "正在處理第 {page} 頁，共 {total} 頁",
      "目前排隊位置：{position}",
      "頁面會自動更新，請勿重複提交。",
      "此步驟耗時較長。複雜或多頁樂譜可能需要數分鐘；達到處理時限後會明確回報結果。",
      "暫未收到新進度。請重新整理狀態；這不代表辨識失敗，請勿重複提交。",
      "暫時無法取得最新進度，不代表辨識失敗。請重新整理狀態，無需重新上傳。",
      "原檔案已保留。可回到樂譜庫，稍後開啟同一專案查看結果。",
      "正在上傳並檢查原檔案",
      "上傳完成後會自動開始辨識。請保持頁面開啟，避免重複上傳。",
      "正在檢查頁數、樂譜結構及正式辨識支援。此步驟不扣次數或點數。"
    ]
  ],
  "ja": [
    [
      "処理状況を取得中",
      "楽譜を保存しました。開始待ちです",
      "保存済みの元ファイルを読込中",
      "ページを準備し PDF 解像度を調整中",
      "五線・段・パート構成を確認中",
      "音符・リズム・小節を認識中",
      "五線が小さいため画像を自動拡大中",
      "ページを結合し楽譜構造を確認中",
      "確認用の認識結果を保存中"
    ],
    [
      "待ち時間：{seconds} 秒",
      "全 {total} ページ中 {page} ページを処理中",
      "待ち順：{position}",
      "自動更新されます。重複送信しないでください。",
      "この段階は時間がかかっています。複雑な楽譜や複数ページには数分必要です。時間上限に達した場合も結果を明示します。",
      "新しい進捗が届いていません。状態を更新してください。認識失敗を意味しません。重複送信は不要です。",
      "最新状態を取得できません。認識失敗を意味しません。状態を更新してください。再アップロードは不要です。",
      "元ファイルは保存済みです。楽譜一覧に戻り、後で同じプロジェクトを開けます。",
      "元ファイルをアップロードして確認中",
      "アップロード完了までページを開いてください。認識は自動開始します。重複アップロードは不要です。",
      "ページ数・楽譜構造・認識対応を確認中です。回数やクレジットは消費しません。"
    ]
  ],
  "ko": [
    [
      "작업 상태 불러오는 중",
      "악보가 저장되어 시작을 기다립니다",
      "저장된 원본 읽는 중",
      "페이지 준비 및 PDF 해상도 조정 중",
      "오선과 악보 단, 파트 구조 확인 중",
      "음표, 리듬, 마디 인식 중",
      "오선이 작아 이미지를 자동 확대하는 중",
      "페이지 병합 및 악보 구조 확인 중",
      "검토할 인식 결과 저장 중"
    ],
    [
      "대기 시간 {seconds}초",
      "전체 {total}페이지 중 {page}페이지 처리 중",
      "대기 순서: {position}",
      "자동으로 갱신됩니다. 중복 제출하지 마세요.",
      "이 단계는 시간이 더 걸립니다. 복잡하거나 여러 페이지인 악보는 몇 분이 필요할 수 있습니다. 시간 제한에 도달하면 명확히 안내합니다.",
      "새 진행 정보를 아직 받지 못했습니다. 상태를 새로고침하세요. 인식 실패를 의미하지 않으며 중복 제출할 필요는 없습니다.",
      "최신 상태를 가져올 수 없습니다. 인식 실패를 의미하지 않습니다. 상태를 새로고침하세요. 재업로드는 필요 없습니다.",
      "원본이 저장되어 있습니다. 악보 목록으로 돌아간 후 같은 프로젝트를 다시 열어 확인할 수 있습니다.",
      "원본 업로드 및 검사 중",
      "업로드가 끝날 때까지 페이지를 열어 두세요. 이후 자동으로 인식이 시작됩니다. 중복 업로드하지 마세요.",
      "페이지 수, 악보 구조, 정식 인식 지원 여부를 확인합니다. 횟수나 크레딧을 차감하지 않습니다."
    ]
  ],
  "fr": [
    [
      "Chargement de l’état",
      "Partition conservée ; en attente",
      "Lecture du fichier original conservé",
      "Préparation des pages et résolution PDF",
      "Analyse des portées, systèmes et parties",
      "Reconnaissance des notes, rythmes et mesures",
      "Portées trop petites ; agrandissement automatique",
      "Assemblage des pages et vérification de la structure",
      "Enregistrement du résultat à vérifier"
    ],
    [
      "Attente : {seconds} secondes",
      "Traitement de la page {page} sur {total}",
      "Position dans la file : {position}",
      "Actualisation automatique. Ne soumettez pas à nouveau.",
      "Cette étape est plus longue. Une partition complexe ou multipage peut prendre plusieurs minutes. Une limite de temps atteinte sera clairement signalée.",
      "Aucune nouvelle progression reçue. Actualisez l’état ; cela ne signifie pas un échec. Ne soumettez pas à nouveau.",
      "État indisponible pour le moment. Cela ne signifie pas un échec. Actualisez l’état sans renvoyer le fichier.",
      "L’original est conservé. Vous pouvez revenir à votre bibliothèque et ouvrir ce projet plus tard.",
      "Envoi et vérification de l’original",
      "Gardez cette page ouverte pendant l’envoi. La reconnaissance démarrera automatiquement. Évitez un double envoi.",
      "Vérification des pages, de la structure et de la compatibilité. Aucun essai ni crédit consommé."
    ]
  ],
  "es": [
    [
      "Cargando estado",
      "Partitura guardada; esperando inicio",
      "Leyendo el original guardado",
      "Preparando páginas y resolución del PDF",
      "Analizando pentagramas, sistemas y partes",
      "Reconociendo notas, ritmo y compases",
      "Pentagramas pequeños; ampliando la imagen",
      "Uniendo páginas y comprobando la estructura",
      "Guardando el resultado para revisión"
    ],
    [
      "Espera: {seconds} segundos",
      "Procesando página {page} de {total}",
      "Posición en cola: {position}",
      "Actualización automática. No vuelva a enviar.",
      "Esta etapa tarda más. Las partituras complejas o con varias páginas pueden necesitar minutos. Si se alcanza el límite de tiempo, se indicará claramente.",
      "Sin nuevos datos de progreso. Actualice el estado; esto no significa un fallo. No vuelva a enviar.",
      "No se puede obtener el estado actual. Esto no significa un fallo. Actualice el estado sin volver a subir el archivo.",
      "El original está guardado. Puede volver a su biblioteca y abrir este proyecto más tarde.",
      "Subiendo y verificando el original",
      "Mantenga la página abierta durante la subida. El reconocimiento comenzará automáticamente. Evite subir dos veces.",
      "Comprobando páginas, estructura y compatibilidad del reconocimiento. No consume usos ni créditos."
    ]
  ],
  "de": [
    [
      "Status wird geladen",
      "Partitur gespeichert; wartet auf Start",
      "Gespeichertes Original wird gelesen",
      "Seiten und PDF-Auflösung werden vorbereitet",
      "Notenlinien, Systeme und Stimmen werden geprüft",
      "Noten, Rhythmus und Takte werden erkannt",
      "Kleine Notenlinien; Bild wird automatisch vergrößert",
      "Seiten werden verbunden und Struktur geprüft",
      "Ergebnis zur Prüfung wird gespeichert"
    ],
    [
      "Wartezeit: {seconds} Sekunden",
      "Seite {page} von {total} wird verarbeitet",
      "Warteposition: {position}",
      "Automatische Aktualisierung. Nicht erneut absenden.",
      "Dieser Schritt dauert länger. Komplexe oder mehrseitige Partituren können mehrere Minuten brauchen. Ein erreichtes Zeitlimit wird klar gemeldet.",
      "Noch kein neuer Fortschritt. Aktualisieren Sie den Status; dies bedeutet keinen Fehlschlag. Nicht erneut absenden.",
      "Der aktuelle Status ist nicht verfügbar. Dies bedeutet keinen Fehlschlag. Aktualisieren Sie den Status ohne erneuten Upload.",
      "Das Original ist gespeichert. Sie können später in Ihrer Bibliothek dasselbe Projekt öffnen.",
      "Original wird hochgeladen und geprüft",
      "Lassen Sie die Seite während des Uploads offen. Die Erkennung beginnt automatisch. Nicht doppelt hochladen.",
      "Seiten, Struktur und Erkennungsunterstützung werden geprüft. Keine Credits oder Versuche werden verbraucht."
    ]
  ],
  "ru": [
    [
      "Загрузка состояния",
      "Партитура сохранена; ожидание начала",
      "Чтение сохранённого оригинала",
      "Подготовка страниц и разрешения PDF",
      "Проверка нотных станов, систем и партий",
      "Распознавание нот, ритма и тактов",
      "Нотные линии малы; автоматическое увеличение",
      "Объединение страниц и проверка структуры",
      "Сохранение результата для проверки"
    ],
    [
      "Ожидание: {seconds} сек.",
      "Обработка страницы {page} из {total}",
      "Место в очереди: {position}",
      "Страница обновляется автоматически. Не отправляйте повторно.",
      "Этот этап занимает больше времени. Сложные или многостраничные партитуры могут обрабатываться несколько минут. Достижение лимита времени будет явно указано.",
      "Нового прогресса пока нет. Обновите состояние; это не означает сбой. Не отправляйте повторно.",
      "Не удалось получить текущее состояние. Это не означает сбой распознавания. Обновите состояние без повторной загрузки.",
      "Оригинал сохранён. Можно позже открыть этот проект в библиотеке партитур.",
      "Загрузка и проверка оригинала",
      "Не закрывайте страницу до завершения загрузки. Распознавание начнётся автоматически. Не загружайте дважды.",
      "Проверка страниц, структуры и поддержки распознавания. Попытки и кредиты не расходуются."
    ]
  ]
};

export function getScoreProcessingMessages(locale: SupportedLocale) {
 const [phases, body] = processingRows[locale];
 return { phases: Object.fromEntries(["loading", "queued", "fetch-source", "prepare-pages", "layout", "recognize", "restore-image", "verify", "save"].map((key,index)=>[key,phases[index]])),
  elapsed: body[0],
  page: body[1],
  queuedPosition: body[2],
  working: body[3],
  slow: body[4],
  stale: body[5],
  offline: body[6],
  saved: body[7],
  uploadTitle: body[8],
  uploadBody: body[9],
  preflightBody: body[10]
 };
}

const recoveryDetails: Record<SupportedLocale, readonly string[]> = {
  en: ['Staff lines are too small for reliable recognition. Retry to apply automatic image recovery; if it still fails, use a clearer scan.', 'Recognition reached its time limit. Retry the original file.', 'No usable musical content was produced. Retry, or use a clearer scan.', 'The recognition service could not run. Retry when it is available.', 'Your original file is saved. Retry uses it directly; no upload is needed. Failed or cancelled attempts release their reserved allowance or credits. Review the result before choosing a paid export.', "Temporary server storage space is unavailable for this job. Your original is saved; try again later."],
  'zh-CN': ['谱线间距过小，识别引擎无法可靠读取。重试会自动恢复图片尺寸；仍失败时可换更清晰的扫描件。', '识谱达到处理时限，请使用原文件重试。', '未能生成可用的乐谱内容，请重试或换更清晰的扫描件。', '识谱服务暂时无法运行，请稍后重试。', '原文件已保留，点击重试即可，无需重新上传。失败或取消会释放已预留的次数／积分。先校对结果，再选择付费导出。', "服务器暂时无法提供识谱所需的存储空间。原文件已保存，请稍后重试。"],
  'zh-TW': ['譜線間距過小，辨識引擎無法可靠讀取。重試會自動恢復圖片尺寸；仍失敗時可換更清晰的掃描檔。', '識譜達到處理時限，請使用原檔案重試。', '未能產生可用的樂譜內容，請重試或換更清晰的掃描檔。', '識譜服務暫時無法運作，請稍後重試。', '原檔案已保留，點擊重試即可，無需重新上傳。失敗或取消會釋放已預留的次數／點數。先校對結果，再選擇付費匯出。', "伺服器暫時無法提供識譜所需的儲存空間。原檔案已保存，請稍後重試。"],
  ja: ['譜線の間隔が小さすぎます。再試行で画像サイズを自動回復します。失敗が続く場合は鮮明なスキャンを使ってください。', '処理時間の上限に達しました。元のファイルで再試行してください。', '使用できる楽譜を生成できませんでした。再試行するか鮮明なスキャンを使ってください。', '認識サービスを実行できません。後で再試行してください。', '元のファイルは保存済みです。再試行に再アップロードは不要です。失敗・キャンセルした処理の予約枠やクレジットは戻ります。結果を確認してから有料書き出しを選べます。', "サーバーの一時保存領域を確保できません。元のファイルは保存済みです。後で再試行してください。"],
  ko: ['오선 간격이 너무 작습니다. 재시도하면 이미지 크기를 자동 복원합니다. 계속 실패하면 더 선명한 스캔을 사용하세요.', '처리 시간이 초과되었습니다. 원본 파일로 다시 시도하세요.', '사용 가능한 악보를 만들지 못했습니다. 다시 시도하거나 더 선명한 스캔을 사용하세요.', '인식 서비스를 실행할 수 없습니다. 나중에 다시 시도하세요.', '원본 파일이 저장되어 있습니다. 다시 업로드할 필요 없이 재시도할 수 있습니다. 실패하거나 취소된 작업은 예약 횟수나 크레딧을 반환합니다. 결과를 검토한 후 유료 내보내기를 선택하세요.', "서버의 임시 저장 공간을 확보할 수 없습니다. 원본은 저장되어 있으니 나중에 재시도하세요."],
  fr: ['Les lignes sont trop rapprochées. Réessayez pour restaurer automatiquement la taille de l’image ; sinon utilisez un scan plus net.', 'Le temps de traitement est dépassé. Réessayez avec le fichier original.', 'Aucune partition exploitable n’a été produite. Réessayez ou utilisez un scan plus net.', 'Le service de reconnaissance ne peut pas démarrer. Réessayez plus tard.', 'Le fichier original est conservé. Réessayez sans nouvel envoi. Les tentatives échouées ou annulées libèrent les crédits ou essais réservés. Vérifiez le résultat avant de choisir un export payant.', "L’espace de stockage temporaire du serveur est indisponible. Votre original est conservé ; réessayez plus tard."],
  es: ['Las líneas están demasiado juntas. Reintente para recuperar automáticamente el tamaño de la imagen; si falla, use un escaneo más claro.', 'Se agotó el tiempo de procesamiento. Reintente con el archivo original.', 'No se produjo una partitura utilizable. Reintente o use un escaneo más claro.', 'El servicio de reconocimiento no puede ejecutarse. Reintente más tarde.', 'Se conserva el archivo original. Reintente sin volver a subirlo. Los intentos fallidos o cancelados liberan los créditos o usos reservados. Revise el resultado antes de elegir una exportación de pago.', "El almacenamiento temporal del servidor no está disponible. El original está guardado; reinténtalo más tarde."],
  de: ['Die Notenlinien liegen zu eng zusammen. Ein erneuter Versuch stellt die Bildgröße automatisch wieder her. Bei weiterem Fehlschlag nutzen Sie einen klareren Scan.', 'Das Zeitlimit wurde erreicht. Versuchen Sie es mit der Originaldatei erneut.', 'Es wurde keine verwendbare Partitur erstellt. Versuchen Sie es erneut oder nutzen Sie einen klareren Scan.', 'Der Erkennungsdienst kann nicht starten. Versuchen Sie es später erneut.', 'Die Originaldatei ist gespeichert. Ein erneuter Upload ist nicht nötig. Fehlgeschlagene oder abgebrochene Versuche geben reservierte Credits oder Versuche frei. Prüfen Sie das Ergebnis vor einem kostenpflichtigen Export.', "Der temporäre Serverspeicher ist nicht verfügbar. Ihr Original ist gespeichert. Versuchen Sie es später erneut."],
  ru: ['Нотные линии слишком близко. Повторная попытка автоматически восстановит размер изображения. При повторном сбое используйте более чёткий скан.', 'Достигнут лимит времени обработки. Повторите попытку с исходным файлом.', 'Не удалось получить пригодную партитуру. Повторите попытку или используйте более чёткий скан.', 'Сервис распознавания не запускается. Повторите попытку позже.', 'Исходный файл сохранён. Повторная загрузка не нужна. Неудачные или отменённые попытки освобождают зарезервированные кредиты или попытки. Проверьте результат перед выбором платного экспорта.', "Временное хранилище сервера недоступно. Оригинал сохранён. Повторите попытку позже."],
};

export function getScoreProcessingFailureMessages(locale: SupportedLocale, error: string | null | undefined) {
  const copy = recoveryDetails[locale];
  const detail = error ?? '';
  const index = /storage capacity.*unavailable|STORAGE_CAPACITY_REACHED/iu.test(detail) ? 5 :
    /too low interline|low.resolution/iu.test(detail) ? 0 :
    /time.?out|timed out|budget.*exhaust|execution budget/iu.test(detail) ? 1 :
    /not configured|could not start|missing from storage|adapter.*missing/iu.test(detail) ? 3 : 2;
  return { reason: copy[index], recovery: copy[4] };
}

