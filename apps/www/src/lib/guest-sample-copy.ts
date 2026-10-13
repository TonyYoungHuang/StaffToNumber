import type { SupportedLocale } from "@score/i18n";

export type GuestSampleCopy = {
  badge: string;
  title: string;
  body: string;
  allowance: string;
  source: string;
  sourceAlt: string;
  prepared: string;
  key: string;
  keyNames: { C: string; D: string; F: string; G: string; Bb: string };
  staff: string;
  jianpu: string;
  play: string;
  stop: string;
  useMyScore: string;
  error: string;
  measure: string;
  progress: string;
  preview: string;
};

export const guestSampleCopy: Record<SupportedLocale, GuestSampleCopy> = {
  en: {
    badge: "Sample / demo", title: "Try a complete sample score", body: "Change the key, switch to Jianpu, and listen before signing in.",
    allowance: "This demo uses no scan and leaves your one free scan available.", source: "View the CC0 source sample", sourceAlt: "Original CC0 sample score in C major", prepared: "Ready to try",
    key: "Transpose to", keyNames: { C: "C major", D: "D major", F: "F major", G: "G major", Bb: "B♭ major" },
    staff: "Staff notation", jianpu: "Jianpu", play: "Play sample", stop: "Stop", useMyScore: "Use my score", error: "Playback could not start. Try again.",
    measure: "Measure", progress: "Playback progress", preview: "Complete sample score: {key}",
  },
  "zh-CN": {
    badge: "样谱演示", title: "先动手试一首完整样谱", body: "无需登录，先换调、切换简谱并试听。",
    allowance: "演示不运行扫描，也不占用你的一次免费扫描资格。", source: "查看 CC0 原始样谱", sourceAlt: "C 大调 CC0 原始样谱", prepared: "可直接操作的样谱",
    key: "移调到", keyNames: { C: "C 大调", D: "D 大调", F: "F 大调", G: "G 大调", Bb: "降 B 大调" },
    staff: "五线谱", jianpu: "简谱", play: "试听样谱", stop: "停止", useMyScore: "用我的谱", error: "暂时无法播放，请再试一次。",
    measure: "小节", progress: "播放进度", preview: "完整样谱：{key}",
  },
  "zh-TW": {
    badge: "範例樂譜示範", title: "先動手試一首完整範例樂譜", body: "無需登入，先移調、切換簡譜並試聽。",
    allowance: "示範不執行掃描，也不占用你的一次免費掃描資格。", source: "查看 CC0 原始範例樂譜", sourceAlt: "C 大調 CC0 原始範例樂譜", prepared: "可直接操作的範例樂譜",
    key: "移調至", keyNames: { C: "C 大調", D: "D 大調", F: "F 大調", G: "G 大調", Bb: "降 B 大調" },
    staff: "五線譜", jianpu: "簡譜", play: "試聽範例樂譜", stop: "停止", useMyScore: "使用我的樂譜", error: "暫時無法播放，請再試一次。",
    measure: "小節", progress: "播放進度", preview: "完整範例樂譜：{key}",
  },
  ja: {
    badge: "サンプルデモ", title: "短い楽譜を最後まで試す", body: "ログイン前に移調、数字譜への切り替え、試聴を体験できます。",
    allowance: "このデモはスキャンを実行せず、1回の無料スキャン枠も使用しません。", source: "CC0の元のサンプルを見る", sourceAlt: "ハ長調のCC0元サンプル楽譜", prepared: "操作できるサンプル",
    key: "移調先", keyNames: { C: "ハ長調", D: "ニ長調", F: "ヘ長調", G: "ト長調", Bb: "変ロ長調" },
    staff: "五線譜", jianpu: "数字譜", play: "サンプルを試聴", stop: "停止", useMyScore: "自分の楽譜を使う", error: "再生できませんでした。もう一度お試しください。",
    measure: "小節", progress: "再生位置", preview: "サンプル楽譜全体：{key}",
  },
  ko: {
    badge: "샘플 데모", title: "짧은 샘플 악보 전체를 체험하세요", body: "로그인 전에 조를 바꾸고 숫자 악보로 전환하고 들어 보세요.",
    allowance: "이 데모는 스캔을 실행하지 않으며 1회 무료 스캔 기회를 사용하지 않습니다.", source: "CC0 원본 샘플 보기", sourceAlt: "C장조 CC0 원본 샘플 악보", prepared: "바로 체험할 수 있는 악보",
    key: "조옮김 대상", keyNames: { C: "C장조", D: "D장조", F: "F장조", G: "G장조", Bb: "B♭장조" },
    staff: "오선보", jianpu: "숫자 악보", play: "샘플 듣기", stop: "정지", useMyScore: "내 악보 사용", error: "재생을 시작하지 못했습니다. 다시 시도하세요.",
    measure: "마디", progress: "재생 진행률", preview: "샘플 악보 전체: {key}",
  },
  de: {
    badge: "Beispiel / Demo", title: "Eine vollständige Beispielpartitur ausprobieren", body: "Vor der Anmeldung transponieren, zur Ziffernnotation wechseln und anhören.",
    allowance: "Die Demo führt keinen Scan aus. Ihr einmaliger kostenloser Scan bleibt verfügbar.", source: "CC0-Originalbeispiel ansehen", sourceAlt: "CC0-Originalpartitur in C-Dur", prepared: "Bereit zum Ausprobieren",
    key: "Transponieren nach", keyNames: { C: "C-Dur", D: "D-Dur", F: "F-Dur", G: "G-Dur", Bb: "B-Dur" },
    staff: "Notenschrift", jianpu: "Ziffernnotation", play: "Beispiel anhören", stop: "Stopp", useMyScore: "Meine Partitur verwenden", error: "Die Wiedergabe konnte nicht starten. Bitte erneut versuchen.",
    measure: "Takt", progress: "Wiedergabefortschritt", preview: "Vollständige Beispielpartitur: {key}",
  },
  fr: {
    badge: "Exemple / démo", title: "Essayez une partition complète", body: "Changez de tonalité, passez en notation chiffrée et écoutez avant de vous connecter.",
    allowance: "La démo ne lance aucun scan et conserve votre scan gratuit unique.", source: "Voir l’exemple original CC0", sourceAlt: "Partition originale CC0 en do majeur", prepared: "Prêt à essayer",
    key: "Transposer en", keyNames: { C: "Do majeur", D: "Ré majeur", F: "Fa majeur", G: "Sol majeur", Bb: "Si♭ majeur" },
    staff: "Notation sur portée", jianpu: "Notation chiffrée", play: "Écouter l’exemple", stop: "Arrêter", useMyScore: "Utiliser ma partition", error: "La lecture n’a pas démarré. Réessayez.",
    measure: "Mesure", progress: "Progression de la lecture", preview: "Partition d’exemple complète : {key}",
  },
  es: {
    badge: "Ejemplo / demo", title: "Prueba una partitura completa", body: "Cambia la tonalidad, pasa a notación numérica y escucha antes de iniciar sesión.",
    allowance: "La demo no ejecuta ningún escaneo y conserva tu único escaneo gratuito.", source: "Ver el ejemplo original CC0", sourceAlt: "Partitura original CC0 en do mayor", prepared: "Lista para probar",
    key: "Transponer a", keyNames: { C: "Do mayor", D: "Re mayor", F: "Fa mayor", G: "Sol mayor", Bb: "Si♭ mayor" },
    staff: "Pentagrama", jianpu: "Notación numérica", play: "Escuchar ejemplo", stop: "Detener", useMyScore: "Usar mi partitura", error: "No se pudo iniciar la reproducción. Inténtalo de nuevo.",
    measure: "Compás", progress: "Progreso de reproducción", preview: "Partitura de ejemplo completa: {key}",
  },
  ru: {
    badge: "Пример / демо", title: "Попробуйте короткую партитуру целиком", body: "До входа в аккаунт смените тональность, включите цифровую нотацию и послушайте.",
    allowance: "Демо не запускает сканирование и сохраняет ваше единственное бесплатное сканирование.", source: "Посмотреть исходный пример CC0", sourceAlt: "Исходная партитура CC0 в до мажоре", prepared: "Готово к работе",
    key: "Транспонировать в", keyNames: { C: "До мажор", D: "Ре мажор", F: "Фа мажор", G: "Соль мажор", Bb: "Си♭ мажор" },
    staff: "Нотный стан", jianpu: "Цифровая нотация", play: "Послушать пример", stop: "Остановить", useMyScore: "Использовать мою партитуру", error: "Не удалось начать воспроизведение. Попробуйте снова.",
    measure: "Такт", progress: "Ход воспроизведения", preview: "Полная партитура примера: {key}",
  },
};
