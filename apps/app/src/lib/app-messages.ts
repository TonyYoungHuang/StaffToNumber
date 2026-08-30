import type { SupportedLocale } from "@score/i18n";

export type AppMessageCatalog = {
  metadata: {
    title: string;
    description: string;
    keywords: readonly string[];
    openGraphLocale: string;
  };
  shell: {
    localeSwitcherLabel: string;
    localeSwitcherError: string;
    brandHomeLabel: string;
    primaryNavigationLabel: string;
    scores: string;
    scanner: string;
    editor: string;
    transpose: string;
    library: string;
    pricing: string;
    classes: string;
    help: string;
    guide: string;
    contact: string;
    billing: string;
    credits: string;
    upgrade: string;
    primaryAction: string;
    openMenu: string;
    closeMenu: string;
    brandCaption: string;
    footerDescription: string;
    register: string;
    activate: string;
    checkout: string;
    about: string;
    support: string;
    privacy: string;
  };
  openGraph: {
    alt: string;
    title: string;
    subtitle: string;
  };
};

export type AppShellCopy = AppMessageCatalog["shell"];

export const APP_MESSAGE_CATALOGS = {
  en: {
    metadata: {
      title: "ScoreTransposer | Scan, Edit, Transpose & Export Sheet Music",
      description: "Upload sheet-music PDFs or images, review recognized notes, convert staff and numbered notation, transpose, practice, and export common formats.",
      keywords: ["sheet music scanner", "music notation converter", "score transposer", "PDF to sheet music", "numbered notation"],
      openGraphLocale: "en_US",
    },
    shell: {
      localeSwitcherLabel: "Language",
      localeSwitcherError: "Could not change language. Please try again.",
      brandHomeLabel: "ScoreTransposer home",
      primaryNavigationLabel: "Primary navigation",
      scores: "My scores",
      scanner: "Scanner",
      editor: "Editor",
      transpose: "Transpose",
      library: "Score library",
      pricing: "Pricing",
      classes: "Classes",
      help: "Help",
      guide: "Guide",
      contact: "Contact us",
      billing: "Billing",
      credits: "Credits",
      upgrade: "Upgrade",
      primaryAction: "Edit for free",
      openMenu: "Open navigation menu",
      closeMenu: "Close navigation menu",
      brandCaption: "PDF and image score scanner",
      footerDescription: "Create one lifetime free score project from a complete PDF or image, then correct, convert, transpose, play, share, and export it.",
      register: "Create account",
      activate: "Redeem code",
      checkout: "Pay online",
      about: "About",
      support: "Support",
      privacy: "Privacy",
    },
    openGraph: {
      alt: "ScoreTransposer online sheet-music workspace",
      title: "Scan, edit, transpose, and practice sheet music online.",
      subtitle: "PDF & images → reviewable notation → Jianpu, playback, and export",
    },
  },
  "zh-CN": {
    metadata: {
      title: "ScoreTransposer | 五线谱识别、编辑、移调、播放与导出",
      description: "上传五线谱 PDF 或图片，在线识别并校对音符，继续完成五线谱与简谱转换、移调、播放练习和常用格式导出。",
      keywords: ["乐谱识别", "五线谱", "简谱转换", "乐谱移调", "PDF 转乐谱", "在线乐谱编辑"],
      openGraphLocale: "zh_CN",
    },
    shell: {
      localeSwitcherLabel: "语言",
      localeSwitcherError: "无法切换语言，请重试。",
      brandHomeLabel: "ScoreTransposer 首页",
      primaryNavigationLabel: "主导航",
      scores: "我的乐谱",
      scanner: "扫描识谱",
      editor: "在线编辑",
      transpose: "移调",
      library: "曲库",
      pricing: "价格",
      classes: "课堂",
      help: "帮助",
      guide: "使用指南",
      contact: "联系我们",
      billing: "账单",
      credits: "积分",
      upgrade: "升级",
      primaryAction: "免费编辑",
      openMenu: "打开导航菜单",
      closeMenu: "关闭导航菜单",
      brandCaption: "PDF / 图片五线谱识别工作台",
      footerDescription: "免费从一份完整多页 PDF 或图片创建一个终身乐谱项目，并继续校正、转简谱、移调、播放、分享与导出。",
      register: "注册账户",
      activate: "兑换激活码",
      checkout: "在线支付",
      about: "关于我们",
      support: "帮助与联系",
      privacy: "隐私说明",
    },
    openGraph: {
      alt: "ScoreTransposer 在线乐谱工作台",
      title: "在线识别、编辑、移调和练习五线谱。",
      subtitle: "PDF 与图片 → 可校对乐谱 → 简谱、播放与导出",
    },
  },
  "zh-TW": {
    metadata: {
      title: "ScoreTransposer | 五線譜辨識、編輯、移調、播放與匯出",
      description: "上傳五線譜 PDF 或圖片，在線上辨識並校對音符，接著完成五線譜與簡譜轉換、移調、播放練習及常用格式匯出。",
      keywords: ["樂譜辨識", "五線譜", "簡譜轉換", "樂譜移調", "PDF 轉樂譜", "線上樂譜編輯"],
      openGraphLocale: "zh_TW",
    },
    shell: {
      localeSwitcherLabel: "語言",
      localeSwitcherError: "無法切換語言，請再試一次。",
      brandHomeLabel: "ScoreTransposer 首頁",
      primaryNavigationLabel: "主要導覽",
      scores: "我的樂譜",
      scanner: "掃描識譜",
      editor: "線上編輯",
      transpose: "移調",
      library: "樂譜庫",
      pricing: "價格方案",
      classes: "課堂",
      help: "說明",
      guide: "使用指南",
      contact: "聯絡我們",
      billing: "帳單",
      credits: "點數",
      upgrade: "升級",
      primaryAction: "免費編輯",
      openMenu: "開啟導覽選單",
      closeMenu: "關閉導覽選單",
      brandCaption: "PDF／圖片五線譜辨識工作台",
      footerDescription: "免費從一份完整多頁 PDF 或圖片建立一個永久樂譜專案，並繼續校正、轉簡譜、移調、播放、分享與匯出。",
      register: "建立帳戶",
      activate: "兌換啟用碼",
      checkout: "線上付款",
      about: "關於我們",
      support: "說明與聯絡",
      privacy: "隱私權說明",
    },
    openGraph: {
      alt: "ScoreTransposer 線上樂譜工作台",
      title: "在線上辨識、編輯、移調與練習五線譜。",
      subtitle: "PDF 與圖片 → 可校對樂譜 → 簡譜、播放與匯出",
    },
  },
  ja: {
    metadata: {
      title: "ScoreTransposer | 楽譜をスキャン、編集、移調、書き出し",
      description: "楽譜の PDF や画像をアップロードして認識結果を確認し、五線譜と数字譜の変換、移調、再生練習、各種形式への書き出しを行えます。",
      keywords: ["楽譜スキャン", "楽譜認識", "楽譜移調", "PDF 楽譜変換", "数字譜", "オンライン楽譜編集"],
      openGraphLocale: "ja_JP",
    },
    shell: {
      localeSwitcherLabel: "言語",
      localeSwitcherError: "言語を変更できませんでした。もう一度お試しください。",
      brandHomeLabel: "ScoreTransposer ホーム",
      primaryNavigationLabel: "メインナビゲーション",
      scores: "自分の楽譜",
      scanner: "楽譜スキャン",
      editor: "オンライン編集",
      transpose: "移調",
      library: "楽譜ライブラリ",
      pricing: "料金",
      classes: "クラス",
      help: "ヘルプ",
      guide: "使い方",
      contact: "お問い合わせ",
      billing: "請求",
      credits: "クレジット",
      upgrade: "アップグレード",
      primaryAction: "無料で編集",
      openMenu: "ナビゲーションメニューを開く",
      closeMenu: "ナビゲーションメニューを閉じる",
      brandCaption: "PDF・画像楽譜スキャナー",
      footerDescription: "完全な複数ページ PDF または画像から、生涯無料の楽譜プロジェクトを 1 件作成し、修正、数字譜変換、移調、再生、共有、書き出しまで続けられます。",
      register: "アカウント作成",
      activate: "コードを利用",
      checkout: "オンライン決済",
      about: "サービスについて",
      support: "サポート",
      privacy: "プライバシー",
    },
    openGraph: {
      alt: "ScoreTransposer オンライン楽譜ワークスペース",
      title: "楽譜をオンラインでスキャン、編集、移調、練習。",
      subtitle: "PDF・画像 → 確認できる楽譜 → 数字譜、再生、書き出し",
    },
  },
  ko: {
    metadata: {
      title: "ScoreTransposer | 악보 스캔, 편집, 조옮김 및 내보내기",
      description: "악보 PDF나 이미지를 업로드하고 인식된 음표를 검토한 뒤 오선보와 숫자보 변환, 조옮김, 재생 연습, 다양한 형식 내보내기를 진행하세요.",
      keywords: ["악보 스캔", "악보 인식", "악보 조옮김", "PDF 악보 변환", "숫자보", "온라인 악보 편집"],
      openGraphLocale: "ko_KR",
    },
    shell: {
      localeSwitcherLabel: "언어",
      localeSwitcherError: "언어를 변경하지 못했습니다. 다시 시도해 주세요.",
      brandHomeLabel: "ScoreTransposer 홈",
      primaryNavigationLabel: "기본 탐색",
      scores: "내 악보",
      scanner: "악보 스캔",
      editor: "온라인 편집",
      transpose: "조옮김",
      library: "악보 라이브러리",
      pricing: "요금",
      classes: "수업",
      help: "도움말",
      guide: "사용 가이드",
      contact: "문의하기",
      billing: "결제 관리",
      credits: "크레딧",
      upgrade: "업그레이드",
      primaryAction: "무료로 편집",
      openMenu: "탐색 메뉴 열기",
      closeMenu: "탐색 메뉴 닫기",
      brandCaption: "PDF 및 이미지 악보 스캐너",
      footerDescription: "완전한 여러 페이지 PDF 또는 이미지로 평생 무료 악보 프로젝트 하나를 만들고 교정, 숫자보 변환, 조옮김, 재생, 공유 및 내보내기를 계속할 수 있습니다.",
      register: "계정 만들기",
      activate: "코드 사용",
      checkout: "온라인 결제",
      about: "서비스 소개",
      support: "지원",
      privacy: "개인정보 보호",
    },
    openGraph: {
      alt: "ScoreTransposer 온라인 악보 작업 공간",
      title: "온라인에서 악보를 스캔하고 편집하고 조옮김하고 연습하세요.",
      subtitle: "PDF 및 이미지 → 검토 가능한 악보 → 숫자보, 재생 및 내보내기",
    },
  },
  fr: {
    metadata: {
      title: "ScoreTransposer | Numériser, modifier, transposer et exporter des partitions",
      description: "Importez des partitions en PDF ou en image, vérifiez les notes reconnues, convertissez la notation sur portée et la notation chiffrée, transposez, travaillez et exportez les formats courants.",
      keywords: ["scanner de partitions", "reconnaissance de partitions", "transposition de partitions", "PDF en partition", "notation chiffrée", "éditeur de partitions en ligne"],
      openGraphLocale: "fr_FR",
    },
    shell: {
      localeSwitcherLabel: "Langue",
      localeSwitcherError: "Impossible de changer de langue. Réessayez.",
      brandHomeLabel: "Accueil ScoreTransposer",
      primaryNavigationLabel: "Navigation principale",
      scores: "Mes partitions",
      scanner: "Scanner",
      editor: "Éditeur",
      transpose: "Transposer",
      library: "Bibliothèque",
      pricing: "Tarifs",
      classes: "Cours",
      help: "Aide",
      guide: "Guide",
      contact: "Nous contacter",
      billing: "Facturation",
      credits: "Crédits",
      upgrade: "Mettre à niveau",
      primaryAction: "Modifier gratuitement",
      openMenu: "Ouvrir le menu de navigation",
      closeMenu: "Fermer le menu de navigation",
      brandCaption: "Scanner de partitions PDF et images",
      footerDescription: "Créez gratuitement un projet de partition à vie à partir d’un PDF multipage complet ou d’une image, puis corrigez, convertissez, transposez, lisez, partagez et exportez la partition.",
      register: "Créer un compte",
      activate: "Utiliser un code",
      checkout: "Payer en ligne",
      about: "À propos",
      support: "Assistance",
      privacy: "Confidentialité",
    },
    openGraph: {
      alt: "Espace de travail de partitions ScoreTransposer",
      title: "Numérisez, modifiez, transposez et travaillez vos partitions en ligne.",
      subtitle: "PDF et images → notation vérifiable → Jianpu, lecture et export",
    },
  },
  es: {
    metadata: {
      title: "ScoreTransposer | Escanea, edita, transporta y exporta partituras",
      description: "Sube partituras en PDF o imagen, revisa las notas reconocidas, convierte entre pentagrama y notación numérica, transporta, practica y exporta a los formatos habituales.",
      keywords: ["escáner de partituras", "reconocimiento de partituras", "transportar partituras", "PDF a partitura", "notación numérica", "editor de partituras en línea"],
      openGraphLocale: "es_ES",
    },
    shell: {
      localeSwitcherLabel: "Idioma",
      localeSwitcherError: "No se pudo cambiar el idioma. Inténtalo de nuevo.",
      brandHomeLabel: "Inicio de ScoreTransposer",
      primaryNavigationLabel: "Navegación principal",
      scores: "Mis partituras",
      scanner: "Escáner",
      editor: "Editor",
      transpose: "Transportar",
      library: "Biblioteca",
      pricing: "Precios",
      classes: "Clases",
      help: "Ayuda",
      guide: "Guía",
      contact: "Contacto",
      billing: "Facturación",
      credits: "Créditos",
      upgrade: "Mejorar plan",
      primaryAction: "Editar gratis",
      openMenu: "Abrir el menú de navegación",
      closeMenu: "Cerrar el menú de navegación",
      brandCaption: "Escáner de partituras en PDF e imagen",
      footerDescription: "Crea gratis un proyecto de partitura para siempre a partir de un PDF multipágina completo o una imagen y continúa corrigiendo, convirtiendo, transportando, reproduciendo, compartiendo y exportando.",
      register: "Crear una cuenta",
      activate: "Canjear código",
      checkout: "Pagar en línea",
      about: "Acerca de",
      support: "Soporte",
      privacy: "Privacidad",
    },
    openGraph: {
      alt: "Espacio de trabajo de partituras ScoreTransposer",
      title: "Escanea, edita, transporta y practica partituras en línea.",
      subtitle: "PDF e imágenes → notación revisable → Jianpu, reproducción y exportación",
    },
  },
  de: {
    metadata: {
      title: "ScoreTransposer | Noten scannen, bearbeiten, transponieren und exportieren",
      description: "Laden Sie Noten als PDF oder Bild hoch, prüfen Sie erkannte Noten, konvertieren Sie Notenschrift und Ziffernnotation, transponieren und üben Sie und exportieren Sie gängige Formate.",
      keywords: ["Noten scannen", "Notenerkennung", "Noten transponieren", "PDF in Noten", "Ziffernnotation", "Online-Noteneditor"],
      openGraphLocale: "de_DE",
    },
    shell: {
      localeSwitcherLabel: "Sprache",
      localeSwitcherError: "Die Sprache konnte nicht geändert werden. Versuchen Sie es erneut.",
      brandHomeLabel: "ScoreTransposer-Startseite",
      primaryNavigationLabel: "Hauptnavigation",
      scores: "Meine Noten",
      scanner: "Noten scannen",
      editor: "Online-Editor",
      transpose: "Transponieren",
      library: "Notenbibliothek",
      pricing: "Preise",
      classes: "Kurse",
      help: "Hilfe",
      guide: "Anleitung",
      contact: "Kontakt",
      billing: "Abrechnung",
      credits: "Credits",
      upgrade: "Upgrade",
      primaryAction: "Kostenlos bearbeiten",
      openMenu: "Navigationsmenü öffnen",
      closeMenu: "Navigationsmenü schließen",
      brandCaption: "Notenscanner für PDF und Bilder",
      footerDescription: "Erstellen Sie aus einem vollständigen mehrseitigen PDF oder Bild ein dauerhaft kostenloses Notenprojekt und korrigieren, konvertieren, transponieren, spielen, teilen und exportieren Sie es.",
      register: "Konto erstellen",
      activate: "Code einlösen",
      checkout: "Online bezahlen",
      about: "Über uns",
      support: "Support",
      privacy: "Datenschutz",
    },
    openGraph: {
      alt: "Online-Notenarbeitsbereich von ScoreTransposer",
      title: "Noten online scannen, bearbeiten, transponieren und üben.",
      subtitle: "PDF und Bilder → prüfbare Notation → Jianpu, Wiedergabe und Export",
    },
  },
  ru: {
    metadata: {
      title: "ScoreTransposer | Сканирование, редактирование, транспонирование и экспорт нот",
      description: "Загрузите ноты в PDF или изображении, проверьте распознанные ноты, преобразуйте нотную и цифровую запись, транспонируйте, занимайтесь и экспортируйте в распространённые форматы.",
      keywords: ["сканер нот", "распознавание нот", "транспонирование нот", "PDF в ноты", "цифровая нотация", "онлайн-редактор нот"],
      openGraphLocale: "ru_RU",
    },
    shell: {
      localeSwitcherLabel: "Язык",
      localeSwitcherError: "Не удалось изменить язык. Попробуйте ещё раз.",
      brandHomeLabel: "Главная ScoreTransposer",
      primaryNavigationLabel: "Основная навигация",
      scores: "Мои ноты",
      scanner: "Сканер",
      editor: "Редактор",
      transpose: "Транспонировать",
      library: "Библиотека нот",
      pricing: "Тарифы",
      classes: "Классы",
      help: "Помощь",
      guide: "Руководство",
      contact: "Связаться с нами",
      billing: "Оплата",
      credits: "Кредиты",
      upgrade: "Улучшить тариф",
      primaryAction: "Редактировать бесплатно",
      openMenu: "Открыть меню навигации",
      closeMenu: "Закрыть меню навигации",
      brandCaption: "Сканер нот из PDF и изображений",
      footerDescription: "Бесплатно создайте один бессрочный нотный проект из полного многостраничного PDF или изображения, а затем исправляйте, преобразуйте, транспонируйте, воспроизводите, делитесь и экспортируйте его.",
      register: "Создать аккаунт",
      activate: "Активировать код",
      checkout: "Оплатить онлайн",
      about: "О сервисе",
      support: "Поддержка",
      privacy: "Конфиденциальность",
    },
    openGraph: {
      alt: "Онлайн-пространство для нот ScoreTransposer",
      title: "Сканируйте, редактируйте, транспонируйте и разучивайте ноты онлайн.",
      subtitle: "PDF и изображения → проверяемая запись → цифровая нотация, воспроизведение и экспорт",
    },
  },
} as const satisfies Record<SupportedLocale, AppMessageCatalog>;

export function getAppMessages(locale: SupportedLocale): AppMessageCatalog {
  return APP_MESSAGE_CATALOGS[locale];
}
