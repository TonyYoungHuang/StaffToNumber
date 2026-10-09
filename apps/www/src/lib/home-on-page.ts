import type { SupportedLocale } from "@score/i18n";
import type { HomepagePageCopy, HomepagePair } from "./homepage-localization/types";

type HomeOnPage = {
  title: string;
  description: string;
  page: Pick<HomepagePageCopy, "heroTitle" | "heroIntro" | "demosTitle" | "stepsTitle" | "steps" | "faqTitle">;
  faq: HomepagePair;
};

export const homeOnPage: Partial<Record<SupportedLocale, HomeOnPage>> = {
  "zh-CN": {
    title: "五线谱识别与移调 — 在线扫描 PDF 转 MusicXML | ScoreTransposer",
    description: "从 PDF 或照片识别五线谱，在编辑器中校正 OMR 错误，移调至所需调性，并导出 MusicXML、MIDI、PDF 或简谱。一个完整乐谱项目免费，无需安装。",
    page: { heroTitle: ["五线谱识别、", "移调与编辑"], heroIntro: ["用五线谱识别工具将 PDF 或照片转为可编辑音符。", "校正识别错误，移调至所需调性，并播放检查结果。", "可导出 MusicXML、MIDI、PDF 或简谱。一个完整乐谱项目免费，无需安装。"], demosTitle: "五线谱识别工具：编辑、移调与播放", stepsTitle: "如何识别五线谱并转为可编辑乐谱", steps: [["上传 PDF 或照片", "选择清晰的印刷五线谱，保留完整谱线和音符。"], ["识别印刷音符", "五线谱识别工具读取音高与节奏，生成可编辑乐谱。"], ["校正并导出", "对照原谱修正音符和节奏，再移调、播放或下载。"]], faqTitle: "五线谱识别常见问题" },
    faq: ["五线谱识别可以免费使用吗？", "免费账户包含一个完整乐谱项目和每月 25 积分。可上传多页 PDF 或乐谱图片，之后继续编辑、移调和播放；计费服务器任务消耗积分。"],
  },
  "zh-TW": {
    title: "五線譜辨識與轉調 — 線上掃描 PDF 轉 MusicXML | ScoreTransposer",
    description: "從 PDF 或照片辨識五線譜，在編輯器中修正 OMR 錯誤，轉調至所需調性，並匯出 MusicXML、MIDI、PDF 或簡譜。一個完整樂譜專案免費，無需安裝。",
    page: { heroTitle: ["五線譜辨識、", "轉調與編輯"], heroIntro: ["用五線譜辨識工具將 PDF 或照片轉為可編輯音符。", "修正辨識錯誤、調整調性，並播放檢查結果。", "可匯出 MusicXML、MIDI、PDF 或簡譜。一個完整樂譜專案免費，無需安裝。"], demosTitle: "五線譜辨識工具：編輯、轉調與播放", stepsTitle: "如何辨識五線譜並轉為可編輯樂譜", steps: [["上傳 PDF 或照片", "選擇清晰的印刷五線譜，保留完整譜線和音符。"], ["辨識印刷音符", "五線譜辨識工具讀取音高與節奏，產生可編輯樂譜。"], ["校正並匯出", "對照原譜修正音符與節奏，再轉調、播放或下載。"]], faqTitle: "五線譜辨識常見問題" },
    faq: ["五線譜辨識可以免費使用嗎？", "免費帳戶包含一個完整樂譜專案及每月 25 點數。可上傳多頁 PDF 或樂譜圖片，之後繼續編輯、轉調及播放；計費伺服器工作會消耗點數。"],
  },
  ja: {
    title: "楽譜スキャン・移調 — PDF を MusicXML にオンライン変換 | ScoreTransposer",
    description: "PDF や写真の楽譜を読み取り、エディターで OMR の誤認識を修正。好きな調に移調して MusicXML、MIDI、PDF、数字譜に書き出せます。楽譜プロジェクト 1 件無料、インストール不要。",
    page: { heroTitle: ["楽譜スキャン・", "移調・編集"], heroIntro: ["楽譜スキャンで PDF や写真を編集可能な音符に変換します。", "誤認識を修正し、必要な調に移調して再生できます。", "MusicXML、MIDI、PDF、数字譜に書き出し可能。楽譜プロジェクト 1 件無料、インストール不要。"], demosTitle: "楽譜スキャンの後に：編集・移調・再生", stepsTitle: "楽譜をスキャンして編集可能にする方法", steps: [["PDF や写真をアップロード", "五線と音符が鮮明で、ページ全体が写った印刷楽譜を選びます。"], ["印刷された音符を認識", "楽譜スキャンで音高とリズムを読み取り、編集可能な楽譜を作ります。"], ["修正して書き出す", "原譜と比べて音符とリズムを修正し、移調・再生・保存します。"]], faqTitle: "楽譜スキャンについてのよくある質問" },
    faq: ["楽譜スキャンは無料ですか？", "無料アカウントには楽譜プロジェクト 1 件と毎月 25 クレジットが含まれます。複数ページの PDF や画像を取り込み、同じ楽譜を編集・移調・再生できます。対象のサーバー処理はクレジットを消費します。"],
  },
  ko: {
    title: "악보 스캔과 조옮김 — PDF를 MusicXML로 온라인 변환 | ScoreTransposer",
    description: "PDF나 사진에서 악보를 읽고 편집기에서 OMR 오류를 수정하세요. 원하는 조성으로 바꾼 뒤 MusicXML, MIDI, PDF, 숫자악보로 내보낼 수 있습니다. 악보 프로젝트 1개 무료, 설치 불필요.",
    page: { heroTitle: ["악보 스캔,", "조옮김과 편집"], heroIntro: ["악보 스캔으로 PDF나 사진을 편집 가능한 음표로 바꾸세요.", "인식 오류를 수정하고 필요한 조성으로 옮긴 뒤 재생해 보세요.", "MusicXML, MIDI, PDF, 숫자악보로 내보낼 수 있습니다. 악보 프로젝트 1개 무료, 설치가 필요 없습니다."], demosTitle: "악보 스캔 도구: 편집·조옮김·재생", stepsTitle: "악보를 스캔해 편집 가능한 음표로 만드는 방법", steps: [["PDF나 사진 업로드", "오선과 음표가 선명하고 페이지 전체가 보이는 인쇄 악보를 선택하세요."], ["인쇄 음표 인식", "악보 스캔으로 음높이와 리듬을 읽어 편집 가능한 악보를 만듭니다."], ["수정 후 내보내기", "원본과 비교해 음표와 리듬을 고친 뒤 조옮김, 재생, 다운로드를 진행하세요."]], faqTitle: "악보 스캔 자주 묻는 질문" },
    faq: ["악보 스캔은 무료인가요?", "무료 계정에는 악보 프로젝트 1개와 매월 25크레딧이 포함됩니다. 여러 페이지 PDF나 이미지를 가져온 뒤 같은 악보를 편집·조옮김·재생할 수 있습니다. 과금 대상 서버 작업은 크레딧을 사용합니다."],
  },
  fr: {
    title: "Scanner de partitions et transposition — PDF vers MusicXML en ligne | ScoreTransposer",
    description: "Scannez un PDF ou une photo de partition, corrigez les erreurs OMR dans l’éditeur, transposez dans la tonalité voulue et exportez MusicXML, MIDI, PDF ou Jianpu. Un projet complet gratuit, sans installation.",
    page: { heroTitle: ["Scanner de partitions,", "transposition et édition"], heroIntro: ["Utilisez le scanner de partitions pour transformer un PDF ou une photo en notes modifiables.", "Corrigez les erreurs, transposez dans la tonalité souhaitée et écoutez votre partition.", "Exportez MusicXML, MIDI, PDF ou Jianpu. Un projet complet gratuit, sans installation."], demosTitle: "Scanner de partitions : édition, transposition et lecture", stepsTitle: "Comment scanner une partition pour la rendre modifiable", steps: [["Importez un PDF ou une photo", "Choisissez une partition imprimée nette, avec les portées et les notes complètes."], ["Reconnaissez les notes imprimées", "Le scanner de partitions lit les hauteurs et les rythmes pour créer une notation modifiable."], ["Corrigez et exportez", "Comparez à l’original, corrigez les notes et le rythme, puis transposez, écoutez ou téléchargez."]], faqTitle: "FAQ du scanner de partitions" },
    faq: ["Le scanner de partitions est-il gratuit ?", "Un compte gratuit inclut un projet complet et 25 crédits par mois. Importez un PDF de plusieurs pages ou une image, puis continuez à modifier, transposer et écouter cette partition. Les traitements serveur concernés consomment des crédits."],
  },
  de: {
    title: "Notenscanner und Transposition — PDF online in MusicXML umwandeln | ScoreTransposer",
    description: "Scannen Sie Noten aus PDF oder Foto, korrigieren Sie OMR-Fehler im Editor, transponieren Sie in die gewünschte Tonart und exportieren Sie MusicXML, MIDI, PDF oder Jianpu. Ein vollständiges Projekt kostenlos, ohne Installation.",
    page: { heroTitle: ["Notenscanner,", "Transposition und Editor"], heroIntro: ["Mit dem Notenscanner wandeln Sie PDF oder Fotos in bearbeitbare Noten um.", "Korrigieren Sie Erkennungsfehler, wählen Sie eine neue Tonart und hören Sie die Partitur an.", "Exportieren Sie MusicXML, MIDI, PDF oder Jianpu. Ein vollständiges Projekt kostenlos, ohne Installation."], demosTitle: "Notenscanner: Bearbeiten, transponieren und abspielen", stepsTitle: "So scannen Sie Noten in eine bearbeitbare Partitur", steps: [["PDF oder Foto hochladen", "Wählen Sie eine klare gedruckte Vorlage mit vollständigen Notenlinien und Noten."], ["Gedruckte Noten erkennen", "Der Notenscanner liest Tonhöhen und Rhythmen und erstellt bearbeitbare Noten."], ["Korrigieren und exportieren", "Vergleichen Sie mit dem Original, korrigieren Sie Noten und Rhythmen und transponieren oder speichern Sie das Ergebnis."]], faqTitle: "Notenscanner: FAQ" },
    faq: ["Ist der Notenscanner kostenlos?", "Ein kostenloses Konto umfasst ein vollständiges Projekt und 25 Credits pro Monat. Importieren Sie ein mehrseitiges PDF oder Notenbild und bearbeiten, transponieren oder spielen Sie diese Partitur weiter ab. Entsprechende Serveraufträge verbrauchen Credits."],
  },
  ru: {
    title: "Сканер нот и транспонирование — PDF в MusicXML онлайн | ScoreTransposer",
    description: "Сканируйте ноты из PDF или фото, исправляйте ошибки OMR в редакторе, транспонируйте в нужную тональность и экспортируйте MusicXML, MIDI, PDF или Jianpu. Один полный проект бесплатно, без установки.",
    page: { heroTitle: ["Сканер нот,", "транспонирование и редактор"], heroIntro: ["Сканер нот превращает PDF или фотографию в редактируемую запись.", "Исправьте ошибки, транспонируйте в нужную тональность и прослушайте партитуру.", "Экспортируйте MusicXML, MIDI, PDF или Jianpu. Один полный проект бесплатно, без установки."], demosTitle: "Сканер нот: редактирование, транспонирование и воспроизведение", stepsTitle: "Как сканировать ноты в редактируемую партитуру", steps: [["Загрузите PDF или фото", "Выберите чёткую печатную партитуру с полными линиями стана и нотами."], ["Распознайте печатные ноты", "Сканер нот читает высоты и ритм и создаёт редактируемую запись."], ["Исправьте и экспортируйте", "Сравните с оригиналом, исправьте ноты и ритм, затем транспонируйте, прослушайте или скачайте."]], faqTitle: "Сканер нот: частые вопросы" },
    faq: ["Сканер нот можно использовать бесплатно?", "Бесплатная учётная запись включает один полный проект и 25 кредитов в месяц. Можно загрузить многостраничный PDF или изображение и продолжать редактировать, транспонировать и слушать эту партитуру. Соответствующие серверные задания расходуют кредиты."],
  },
};

type LinkPart = string | readonly [string, string];
export const homeWorkflowLinks: Record<SupportedLocale, LinkPart[]> = {
  en: ["Start with the ", ["sheet music scanner for PDFs and photos", "/sheet-music-scanner"], ", save your scan with ", ["PDF to MusicXML", "/pdf-to-musicxml"], ", fix notes in the ", ["sheet music maker and editor", "/score-editor"], ", then ", ["transpose sheet music", "/transpose-score"], " or ", ["convert sheet music to MIDI", "/musicxml-midi"], "."],
  es: ["Empieza con el ", ["escáner de partituras PDF y fotos", "/sheet-music-scanner"], ", guarda el resultado con ", ["PDF a MusicXML", "/pdf-to-musicxml"], ", corrige las notas en el ", ["creador y editor de partituras", "/score-editor"], ", después ", ["transpón la partitura", "/transpose-score"], " o ", ["conviértela a MIDI", "/musicxml-midi"], "."],
  "zh-CN": ["从", ["五线谱识别", "/sheet-music-scanner"], "开始，用", ["PDF 转 MusicXML", "/pdf-to-musicxml"], "保留可编辑文件，在", ["乐谱编辑器", "/score-editor"], "中校正，再", ["给乐谱移调", "/transpose-score"], "或", ["导出 MIDI", "/musicxml-midi"], "。"],
  "zh-TW": ["從", ["五線譜辨識", "/sheet-music-scanner"], "開始，用", ["PDF 轉 MusicXML", "/pdf-to-musicxml"], "保留可編輯檔案，在", ["樂譜編輯器", "/score-editor"], "中校正，再", ["為樂譜轉調", "/transpose-score"], "或", ["匯出 MIDI", "/musicxml-midi"], "。"],
  ja: ["まず", ["楽譜スキャン", "/sheet-music-scanner"], "で読み取り、", ["PDF から MusicXML へ変換", "/pdf-to-musicxml"], "して保存。", ["楽譜エディター", "/score-editor"], "で修正し、", ["移調", "/transpose-score"], "や", ["MIDI 書き出し", "/musicxml-midi"], "へ進めます。"],
  ko: ["먼저 ", ["악보 스캔", "/sheet-music-scanner"], "으로 읽고 ", ["PDF를 MusicXML로 변환", "/pdf-to-musicxml"], "해 저장하세요. ", ["악보 편집기", "/score-editor"], "에서 수정한 뒤 ", ["조옮김", "/transpose-score"], "과 ", ["MIDI 내보내기", "/musicxml-midi"], "를 이용할 수 있습니다."],
  fr: ["Commencez avec le ", ["scanner de partitions", "/sheet-music-scanner"], ", enregistrez avec ", ["PDF vers MusicXML", "/pdf-to-musicxml"], ", corrigez dans l’", ["éditeur de partitions", "/score-editor"], ", puis ", ["transposez", "/transpose-score"], " ou ", ["exportez en MIDI", "/musicxml-midi"], "."],
  de: ["Beginnen Sie mit dem ", ["Notenscanner", "/sheet-music-scanner"], ", speichern Sie mit ", ["PDF in MusicXML", "/pdf-to-musicxml"], ", korrigieren Sie im ", ["Noteneditor", "/score-editor"], " und ", ["transponieren Sie", "/transpose-score"], " oder ", ["exportieren Sie MIDI", "/musicxml-midi"], "."],
  ru: ["Начните со ", ["сканера нот", "/sheet-music-scanner"], ", сохраните через ", ["PDF в MusicXML", "/pdf-to-musicxml"], ", исправьте в ", ["нотном редакторе", "/score-editor"], ", затем выполните ", ["транспонирование", "/transpose-score"], " или ", ["экспорт MIDI", "/musicxml-midi"], "."],
};
