import type { SupportedLocale } from "@score/i18n";

export type HomeCommercialCopy = {
  continueScan: string;
  scanAction: string;
  sampleAction: string;
  title: string;
  description: string;
  eyebrow: string;
  metricsLabel: string;
  users: string;
  countries: string;
  scoresCorrected: string;
  startAction: string;
  plansAction: string;
  watchFilm: string;
  enableSound: string;
  muteSound: string;
  soundOff: string;
  soundOn: string;
  pause: string;
  play: string;
  caption: string;
};

export const homeCommercialCopy: Record<SupportedLocale, HomeCommercialCopy> = {
  en: {
    continueScan: "Continue: choose a score file",
    scanAction: "Scan my score for free", sampleAction: "Try a sample score",
    title: "Your score. More possibilities.", description: "Transpose. Refine. Hear it come alive.",
    eyebrow: "ScoreTransposer by the numbers", metricsLabel: "ScoreTransposer in numbers",
    users: "Users", countries: "Countries", scoresCorrected: "Scores corrected",
    startAction: "Start with your score", plansAction: "Explore plans", watchFilm: "Watch the film",
    enableSound: "Enable sound", muteSound: "Mute sound", soundOff: "Sound off", soundOn: "Sound on",
    pause: "Pause animation", play: "Play animation",
    caption: "Your score in motion: transpose, refine and listen.",
  },
  "zh-CN": {
    continueScan: "继续：选择乐谱文件",
    scanAction: "免费扫我的谱", sampleAction: "先试样谱",
    title: "一份乐谱，更多可能。", description: "移调、校对，让音乐响起来。",
    eyebrow: "ScoreTransposer 数据概览", metricsLabel: "ScoreTransposer 规模数据",
    users: "用户", countries: "国家", scoresCorrected: "已校对乐谱",
    startAction: "从我的乐谱开始", plansAction: "查看方案", watchFilm: "观看短片",
    enableSound: "开启声音", muteSound: "静音", soundOff: "声音已关闭", soundOn: "声音已开启",
    pause: "暂停动画", play: "播放动画",
    caption: "让乐谱动起来：移调、校对、试听。",
  },
  "zh-TW": {
    continueScan: "繼續：選擇樂譜檔案",
    scanAction: "免費掃描我的樂譜", sampleAction: "先試範例樂譜",
    title: "一份樂譜，更多可能。", description: "移調、校對，讓音樂響起來。",
    eyebrow: "ScoreTransposer 數據概覽", metricsLabel: "ScoreTransposer 規模數據",
    users: "使用者", countries: "國家", scoresCorrected: "已校對樂譜",
    startAction: "從我的樂譜開始", plansAction: "查看方案", watchFilm: "觀看短片",
    enableSound: "開啟聲音", muteSound: "靜音", soundOff: "聲音已關閉", soundOn: "聲音已開啟",
    pause: "暫停動畫", play: "播放動畫",
    caption: "讓樂譜動起來：移調、校對、試聽。",
  },
  ja: {
    continueScan: "続ける：楽譜ファイルを選択",
    scanAction: "自分の楽譜を無料スキャン", sampleAction: "サンプル楽譜を試す",
    title: "あなたの楽譜に、もっと可能性を。", description: "移調して、整えて、音にする。",
    eyebrow: "数字で見る ScoreTransposer", metricsLabel: "ScoreTransposer の利用規模",
    users: "ユーザー", countries: "国", scoresCorrected: "校正済みの楽譜",
    startAction: "自分の楽譜で始める", plansAction: "プランを見る", watchFilm: "動画を見る",
    enableSound: "音声を有効にする", muteSound: "消音する", soundOff: "音声オフ", soundOn: "音声オン",
    pause: "アニメーションを一時停止", play: "アニメーションを再生",
    caption: "楽譜を動かす：移調、校正、試聴。",
  },
  ko: {
    continueScan: "계속: 악보 파일 선택",
    scanAction: "내 악보 무료 스캔", sampleAction: "샘플 악보 체험",
    title: "내 악보, 더 많은 가능성.", description: "조옮김하고, 다듬고, 소리로 들어보세요.",
    eyebrow: "숫자로 보는 ScoreTransposer", metricsLabel: "ScoreTransposer 이용 규모",
    users: "사용자", countries: "국가", scoresCorrected: "교정된 악보",
    startAction: "내 악보로 시작", plansAction: "요금제 보기", watchFilm: "영상 보기",
    enableSound: "소리 켜기", muteSound: "음소거", soundOff: "소리 꺼짐", soundOn: "소리 켜짐",
    pause: "애니메이션 일시 정지", play: "애니메이션 재생",
    caption: "움직이는 악보: 조옮김, 교정, 미리 듣기.",
  },
  de: {
    continueScan: "Weiter: Notendatei auswählen",
    scanAction: "Meine Noten kostenlos scannen", sampleAction: "Beispielnoten ausprobieren",
    title: "Deine Noten. Mehr Möglichkeiten.", description: "Transponieren. Verfeinern. Zum Klingen bringen.",
    eyebrow: "ScoreTransposer in Zahlen", metricsLabel: "ScoreTransposer in Zahlen",
    users: "Nutzer", countries: "Länder", scoresCorrected: "Korrigierte Partituren",
    startAction: "Mit eigenen Noten starten", plansAction: "Tarife ansehen", watchFilm: "Film ansehen",
    enableSound: "Ton einschalten", muteSound: "Ton stummschalten", soundOff: "Ton aus", soundOn: "Ton an",
    pause: "Animation pausieren", play: "Animation abspielen",
    caption: "Deine Noten in Bewegung: transponieren, verfeinern und anhören.",
  },
  fr: {
    continueScan: "Continuer : choisir une partition",
    scanAction: "Scanner ma partition gratuitement", sampleAction: "Essayer une partition exemple",
    title: "Votre partition. Plus de possibilités.", description: "Transposez. Affinez. Écoutez-la prendre vie.",
    eyebrow: "ScoreTransposer en chiffres", metricsLabel: "ScoreTransposer en chiffres",
    users: "Utilisateurs", countries: "Pays", scoresCorrected: "Partitions corrigées",
    startAction: "Commencer avec ma partition", plansAction: "Voir les offres", watchFilm: "Voir le film",
    enableSound: "Activer le son", muteSound: "Couper le son", soundOff: "Son désactivé", soundOn: "Son activé",
    pause: "Mettre l’animation en pause", play: "Lire l’animation",
    caption: "Votre partition en mouvement : transposez, affinez et écoutez.",
  },
  es: {
    continueScan: "Continuar: elegir una partitura",
    scanAction: "Escanear mi partitura gratis", sampleAction: "Probar una partitura de ejemplo",
    title: "Tu partitura. Más posibilidades.", description: "Transporta. Perfecciona. Escucha cómo cobra vida.",
    eyebrow: "ScoreTransposer en cifras", metricsLabel: "ScoreTransposer en cifras",
    users: "Usuarios", countries: "Países", scoresCorrected: "Partituras corregidas",
    startAction: "Empezar con mi partitura", plansAction: "Ver planes", watchFilm: "Ver el vídeo",
    enableSound: "Activar sonido", muteSound: "Silenciar", soundOff: "Sonido desactivado", soundOn: "Sonido activado",
    pause: "Pausar animación", play: "Reproducir animación",
    caption: "Tu partitura en movimiento: transporta, perfecciona y escucha.",
  },
  ru: {
    continueScan: "Продолжить: выбрать файл партитуры",
    scanAction: "Сканировать мои ноты бесплатно", sampleAction: "Попробовать пример",
    title: "Ваши ноты. Больше возможностей.", description: "Транспонируйте. Редактируйте. Слушайте.",
    eyebrow: "ScoreTransposer в цифрах", metricsLabel: "ScoreTransposer в цифрах",
    users: "Пользователи", countries: "Страны", scoresCorrected: "Исправленные партитуры",
    startAction: "Начать со своих нот", plansAction: "Посмотреть тарифы", watchFilm: "Смотреть ролик",
    enableSound: "Включить звук", muteSound: "Выключить звук", soundOff: "Звук выключен", soundOn: "Звук включён",
    pause: "Приостановить анимацию", play: "Воспроизвести анимацию",
    caption: "Ваши ноты в движении: транспонируйте, редактируйте и слушайте.",
  },
};
