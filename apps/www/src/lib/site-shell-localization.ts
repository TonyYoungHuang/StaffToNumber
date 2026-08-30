import type { SupportedLocale } from "@score/i18n";

export type SiteMetadataCopy = {
  title: string;
  description: string;
  keywords: readonly string[];
  openGraphLocale: string;
  openGraphImageAlt: string;
};

export type SiteShellCopy = {
  scanner: string;
  features: string;
  library: string;
  education: string;
  pricing: string;
  help: string;
  guide: string;
  numberedNotation: string;
  contact: string;
  discord: string;
  login: string;
  faq: string;
  about: string;
  support: string;
  terms: string;
  privacy: string;
  copyright: string;
  openMenu: string;
  closeMenu: string;
  editForFree: string;
  launchStatus: string;
  upgrade: string;
  brandLabel: string;
  brandCaption: string;
  footerCopy: string;
  workflow: string;
  useCases: string;
  eventAnnouncement: string;
  liveEvent: string;
  dismissAnnouncement: string;
  primaryNavigation: string;
  languageSwitcher: string;
};

export type SiteLocaleCatalog = {
  metadata: SiteMetadataCopy;
  shell: SiteShellCopy;
};

const catalogs = {
  en: {
    metadata: {
      title: "ScoreTransposer | Scan, Edit, Transpose & Export Sheet Music",
      description: "Convert, correct, transpose, play, and export staff notation and Jianpu in a MusicXML-first online sheet music workspace.",
      keywords: ["sheet music scanner", "sheet music editor", "transpose sheet music", "PDF to MusicXML", "numbered notation converter"],
      openGraphLocale: "en_US",
      openGraphImageAlt: "ScoreTransposer rendered sheet-music workspace",
    },
    shell: {
      scanner: "Sheet music scanner", features: "Features", library: "Score library", education: "Education", pricing: "Pricing",
      help: "Help", guide: "How to read sheet music", numberedNotation: "Numbered notation converter", contact: "Contact us", discord: "Discord", login: "Sign in",
      faq: "FAQ", about: "About", support: "Support", terms: "Terms", privacy: "Privacy", copyright: "Copyright",
      openMenu: "Open navigation menu", closeMenu: "Close navigation menu", editForFree: "Edit for free", launchStatus: "Launch status", upgrade: "Upgrade",
      brandLabel: "ScoreTransposer home", brandCaption: "PDF and image score scanner",
      footerCopy: "Create one free project from a complete multi-page staff-score PDF or image, then correct, convert, transpose, play, share, and export it.",
      workflow: "How it works", useCases: "Use cases", eventAnnouncement: "Event announcement", liveEvent: "Live event",
      dismissAnnouncement: "Dismiss event announcement", primaryNavigation: "Primary navigation", languageSwitcher: "Language",
    },
  },
  "zh-CN": {
    metadata: {
      title: "ScoreTransposer｜五线谱识别、编辑、移调、播放与导出",
      description: "在线识别、校正、编辑、移调、播放并导出五线谱与简谱；以 MusicXML 和结构化乐谱工程连接 PDF、图片、MIDI 与音频工作流。",
      keywords: ["五线谱识别", "五线谱编辑器", "乐谱移调", "PDF 转 MusicXML", "五线谱转简谱"],
      openGraphLocale: "zh_CN",
      openGraphImageAlt: "ScoreTransposer 乐谱编辑工作台",
    },
    shell: {
      scanner: "扫描识谱", features: "功能", library: "曲库", education: "教学", pricing: "价格",
      help: "帮助", guide: "五线谱入门", numberedNotation: "五线谱与简谱转换", contact: "联系我们", discord: "Discord 社群", login: "登录",
      faq: "问答", about: "关于", support: "支持", terms: "条款", privacy: "隐私", copyright: "版权投诉",
      openMenu: "打开导航菜单", closeMenu: "关闭导航菜单", editForFree: "免费编辑", launchStatus: "上线状态", upgrade: "升级套餐",
      brandLabel: "ScoreTransposer 首页", brandCaption: "PDF / 图片五线谱识别工作台",
      footerCopy: "上传一份完整多页五线谱 PDF 或图片，免费创建一个可校正、转换、移调、播放、分享与导出的乐谱项目。",
      workflow: "使用流程", useCases: "使用场景", eventAnnouncement: "活动公告", liveEvent: "限时活动",
      dismissAnnouncement: "关闭活动公告", primaryNavigation: "主导航", languageSwitcher: "语言",
    },
  },
  "zh-TW": {
    metadata: {
      title: "ScoreTransposer｜五線譜辨識、編輯、移調、播放與匯出",
      description: "線上辨識、校正、編輯、移調、播放並匯出五線譜與簡譜；以 MusicXML 和結構化樂譜專案串接 PDF、圖片、MIDI 與音訊流程。",
      keywords: ["五線譜辨識", "五線譜編輯器", "樂譜移調", "PDF 轉 MusicXML", "五線譜轉簡譜"],
      openGraphLocale: "zh_TW",
      openGraphImageAlt: "ScoreTransposer 樂譜編輯工作區",
    },
    shell: {
      scanner: "掃描識譜", features: "功能", library: "樂譜庫", education: "教學", pricing: "價格",
      help: "說明", guide: "五線譜入門", numberedNotation: "五線譜與簡譜轉換", contact: "聯絡我們", discord: "Discord 社群", login: "登入",
      faq: "常見問題", about: "關於", support: "支援", terms: "條款", privacy: "隱私", copyright: "版權申訴",
      openMenu: "開啟導覽選單", closeMenu: "關閉導覽選單", editForFree: "免費編輯", launchStatus: "上線狀態", upgrade: "升級方案",
      brandLabel: "ScoreTransposer 首頁", brandCaption: "PDF／圖片五線譜辨識工作區",
      footerCopy: "上傳一份完整多頁五線譜 PDF 或圖片，即可免費建立一個能校正、轉換、移調、播放、分享與匯出的樂譜專案。",
      workflow: "使用流程", useCases: "使用情境", eventAnnouncement: "活動公告", liveEvent: "限時活動",
      dismissAnnouncement: "關閉活動公告", primaryNavigation: "主要導覽", languageSwitcher: "語言",
    },
  },
  ja: {
    metadata: {
      title: "ScoreTransposer | 楽譜のスキャン・編集・移調・再生・書き出し",
      description: "五線譜と数字譜をオンラインで認識、修正、編集、移調、再生、書き出し。MusicXML を中心に PDF、画像、MIDI、音声のワークフローをつなぎます。",
      keywords: ["楽譜スキャン", "楽譜編集", "楽譜移調", "PDF MusicXML 変換", "数字譜変換"],
      openGraphLocale: "ja_JP",
      openGraphImageAlt: "ScoreTransposer 楽譜編集ワークスペース",
    },
    shell: {
      scanner: "楽譜スキャン", features: "機能", library: "楽譜ライブラリ", education: "学習", pricing: "料金",
      help: "ヘルプ", guide: "楽譜の読み方", numberedNotation: "数字譜コンバーター", contact: "お問い合わせ", discord: "Discord", login: "ログイン",
      faq: "よくある質問", about: "概要", support: "サポート", terms: "利用規約", privacy: "プライバシー", copyright: "著作権申立て",
      openMenu: "ナビゲーションを開く", closeMenu: "ナビゲーションを閉じる", editForFree: "無料で編集", launchStatus: "公開状況", upgrade: "アップグレード",
      brandLabel: "ScoreTransposer ホーム", brandCaption: "PDF・画像対応の楽譜スキャナー",
      footerCopy: "複数ページの五線譜 PDF または画像一式から、修正、変換、移調、再生、共有、書き出しができるプロジェクトを1件無料で作成できます。",
      workflow: "使い方", useCases: "活用例", eventAnnouncement: "イベントのお知らせ", liveEvent: "開催中",
      dismissAnnouncement: "イベントのお知らせを閉じる", primaryNavigation: "メインナビゲーション", languageSwitcher: "言語",
    },
  },
  ko: {
    metadata: {
      title: "ScoreTransposer | 악보 스캔, 편집, 조옮김, 재생 및 내보내기",
      description: "오선보와 숫자보를 온라인에서 인식, 교정, 편집, 조옮김, 재생 및 내보내기 하세요. MusicXML 중심으로 PDF, 이미지, MIDI와 오디오 작업 흐름을 연결합니다.",
      keywords: ["악보 스캔", "악보 편집기", "악보 조옮김", "PDF MusicXML 변환", "숫자보 변환"],
      openGraphLocale: "ko_KR",
      openGraphImageAlt: "ScoreTransposer 악보 편집 작업 공간",
    },
    shell: {
      scanner: "악보 스캔", features: "기능", library: "악보 라이브러리", education: "학습", pricing: "요금",
      help: "도움말", guide: "악보 읽는 법", numberedNotation: "숫자보 변환기", contact: "문의하기", discord: "Discord", login: "로그인",
      faq: "자주 묻는 질문", about: "소개", support: "지원", terms: "이용약관", privacy: "개인정보", copyright: "저작권 신고",
      openMenu: "탐색 메뉴 열기", closeMenu: "탐색 메뉴 닫기", editForFree: "무료로 편집", launchStatus: "출시 상태", upgrade: "업그레이드",
      brandLabel: "ScoreTransposer 홈", brandCaption: "PDF 및 이미지 악보 스캐너",
      footerCopy: "여러 페이지로 된 완전한 오선보 PDF 또는 이미지 한 건으로 교정, 변환, 조옮김, 재생, 공유 및 내보내기가 가능한 프로젝트를 무료로 만드세요.",
      workflow: "사용 방법", useCases: "활용 사례", eventAnnouncement: "이벤트 안내", liveEvent: "진행 중인 이벤트",
      dismissAnnouncement: "이벤트 안내 닫기", primaryNavigation: "기본 탐색", languageSwitcher: "언어",
    },
  },
  fr: {
    metadata: {
      title: "ScoreTransposer | Numérisez, éditez, transposez et exportez vos partitions",
      description: "Reconnaissez, corrigez, éditez, transposez, écoutez et exportez des partitions et du Jianpu dans un espace de travail en ligne centré sur MusicXML.",
      keywords: ["scanner de partitions", "éditeur de partitions", "transposer une partition", "PDF vers MusicXML", "convertisseur de notation chiffrée"],
      openGraphLocale: "fr_FR",
      openGraphImageAlt: "Espace de travail de partitions ScoreTransposer",
    },
    shell: {
      scanner: "Scanner de partitions", features: "Fonctionnalités", library: "Bibliothèque", education: "Apprendre", pricing: "Tarifs",
      help: "Aide", guide: "Lire une partition", numberedNotation: "Convertisseur de notation chiffrée", contact: "Nous contacter", discord: "Discord", login: "Se connecter",
      faq: "FAQ", about: "À propos", support: "Assistance", terms: "Conditions", privacy: "Confidentialité", copyright: "Réclamation de droits d’auteur",
      openMenu: "Ouvrir le menu", closeMenu: "Fermer le menu", editForFree: "Modifier gratuitement", launchStatus: "État du lancement", upgrade: "Mettre à niveau",
      brandLabel: "Accueil ScoreTransposer", brandCaption: "Scanner de partitions PDF et image",
      footerCopy: "Créez gratuitement un projet à partir d’une partition complète de plusieurs pages en PDF ou en images, puis corrigez-la, convertissez-la, transposez-la, écoutez-la, partagez-la et exportez-la.",
      workflow: "Fonctionnement", useCases: "Cas d’usage", eventAnnouncement: "Annonce d’événement", liveEvent: "Événement en cours",
      dismissAnnouncement: "Fermer l’annonce", primaryNavigation: "Navigation principale", languageSwitcher: "Langue",
    },
  },
  es: {
    metadata: {
      title: "ScoreTransposer | Escanea, edita, transporta y exporta partituras",
      description: "Reconoce, corrige, edita, transporta, reproduce y exporta partituras y notación numerada en un espacio de trabajo en línea centrado en MusicXML.",
      keywords: ["escáner de partituras", "editor de partituras", "transportar partituras", "PDF a MusicXML", "conversor de notación numerada"],
      openGraphLocale: "es_ES",
      openGraphImageAlt: "Espacio de trabajo de partituras de ScoreTransposer",
    },
    shell: {
      scanner: "Escáner de partituras", features: "Funciones", library: "Biblioteca", education: "Aprender", pricing: "Precios",
      help: "Ayuda", guide: "Cómo leer partituras", numberedNotation: "Conversor de notación numerada", contact: "Contacto", discord: "Discord", login: "Iniciar sesión",
      faq: "Preguntas frecuentes", about: "Acerca de", support: "Soporte", terms: "Términos", privacy: "Privacidad", copyright: "Reclamación de derechos",
      openMenu: "Abrir menú de navegación", closeMenu: "Cerrar menú de navegación", editForFree: "Editar gratis", launchStatus: "Estado del lanzamiento", upgrade: "Mejorar plan",
      brandLabel: "Inicio de ScoreTransposer", brandCaption: "Escáner de partituras PDF e imágenes",
      footerCopy: "Crea gratis un proyecto a partir de una partitura completa de varias páginas en PDF o imágenes y luego corrígela, conviértela, transpórtala, reprodúcela, compártela y expórtala.",
      workflow: "Cómo funciona", useCases: "Casos de uso", eventAnnouncement: "Anuncio de evento", liveEvent: "Evento activo",
      dismissAnnouncement: "Cerrar anuncio", primaryNavigation: "Navegación principal", languageSwitcher: "Idioma",
    },
  },
  de: {
    metadata: {
      title: "ScoreTransposer | Noten scannen, bearbeiten, transponieren und exportieren",
      description: "Noten und Ziffernnotation online erkennen, korrigieren, bearbeiten, transponieren, abspielen und exportieren – in einem MusicXML-basierten Arbeitsbereich.",
      keywords: ["Noten scannen", "Noteneditor", "Noten transponieren", "PDF in MusicXML", "Ziffernnotation konvertieren"],
      openGraphLocale: "de_DE",
      openGraphImageAlt: "ScoreTransposer-Arbeitsbereich für Noten",
    },
    shell: {
      scanner: "Noten scannen", features: "Funktionen", library: "Notenbibliothek", education: "Lernen", pricing: "Preise",
      help: "Hilfe", guide: "Noten lesen lernen", numberedNotation: "Ziffernnotation konvertieren", contact: "Kontakt", discord: "Discord", login: "Anmelden",
      faq: "FAQ", about: "Über uns", support: "Support", terms: "Bedingungen", privacy: "Datenschutz", copyright: "Urheberrechtsbeschwerde",
      openMenu: "Navigationsmenü öffnen", closeMenu: "Navigationsmenü schließen", editForFree: "Kostenlos bearbeiten", launchStatus: "Startstatus", upgrade: "Upgrade",
      brandLabel: "ScoreTransposer-Startseite", brandCaption: "Notenscanner für PDF und Bilder",
      footerCopy: "Erstelle kostenlos ein Projekt aus einer vollständigen mehrseitigen Noten-PDF oder Bildfolge und korrigiere, konvertiere, transponiere, spiele, teile und exportiere es.",
      workflow: "So funktioniert’s", useCases: "Anwendungsfälle", eventAnnouncement: "Veranstaltungshinweis", liveEvent: "Aktuelle Veranstaltung",
      dismissAnnouncement: "Hinweis schließen", primaryNavigation: "Hauptnavigation", languageSwitcher: "Sprache",
    },
  },
  ru: {
    metadata: {
      title: "ScoreTransposer | Сканирование, редактирование, транспонирование и экспорт нот",
      description: "Распознавайте, исправляйте, редактируйте, транспонируйте, воспроизводите и экспортируйте нотную и цифровую запись в онлайн-среде на основе MusicXML.",
      keywords: ["сканер нот", "редактор нот", "транспонирование нот", "PDF в MusicXML", "конвертер цифровой нотации"],
      openGraphLocale: "ru_RU",
      openGraphImageAlt: "Рабочая область нот ScoreTransposer",
    },
    shell: {
      scanner: "Сканер нот", features: "Возможности", library: "Библиотека нот", education: "Обучение", pricing: "Тарифы",
      help: "Помощь", guide: "Как читать ноты", numberedNotation: "Конвертер цифровой нотации", contact: "Связаться с нами", discord: "Discord", login: "Войти",
      faq: "Вопросы и ответы", about: "О сервисе", support: "Поддержка", terms: "Условия", privacy: "Конфиденциальность", copyright: "Жалоба на авторские права",
      openMenu: "Открыть меню навигации", closeMenu: "Закрыть меню навигации", editForFree: "Редактировать бесплатно", launchStatus: "Статус запуска", upgrade: "Улучшить тариф",
      brandLabel: "Главная ScoreTransposer", brandCaption: "Сканер нот из PDF и изображений",
      footerCopy: "Бесплатно создайте один проект из полной многостраничной партитуры в PDF или изображениях, а затем исправляйте, конвертируйте, транспонируйте, воспроизводите, публикуйте и экспортируйте её.",
      workflow: "Как это работает", useCases: "Сценарии", eventAnnouncement: "Объявление о событии", liveEvent: "Текущее событие",
      dismissAnnouncement: "Закрыть объявление", primaryNavigation: "Основная навигация", languageSwitcher: "Язык",
    },
  },
} as const satisfies Record<SupportedLocale, SiteLocaleCatalog>;

export function getSiteLocaleCatalog(locale: SupportedLocale): SiteLocaleCatalog {
  return catalogs[locale];
}
