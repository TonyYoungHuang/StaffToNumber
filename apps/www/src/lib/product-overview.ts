import type { SupportedLocale } from "@score/i18n";

export const PRODUCT_OVERVIEW_DURATION = 80;

export const PRODUCT_OVERVIEW_SCENES = [
  { id: "intro", start: 0, duration: 4 },
  { id: "import", start: 4, duration: 8 },
  { id: "edit", start: 12, duration: 8 },
  { id: "transpose", start: 20, duration: 8 },
  { id: "jianpu", start: 28, duration: 8 },
  { id: "playback", start: 36, duration: 12 },
  { id: "export", start: 48, duration: 8 },
  { id: "practice", start: 56, duration: 8 },
  { id: "teaching", start: 64, duration: 8 },
  { id: "audio", start: 72, duration: 5 },
  { id: "outro", start: 77, duration: 3 },
] as const;

export type ProductOverviewSceneId = (typeof PRODUCT_OVERVIEW_SCENES)[number]["id"];

type OverviewLocaleCopy = {
  title: string;
  description: string;
  playLabel: string;
  videoLabel: string;
  chapterLabel: string;
  note: string;
  scenes: Record<ProductOverviewSceneId, readonly [title: string, detail: string]>;
};

const copy: Record<SupportedLocale, OverviewLocaleCopy> = {
  en: {
    title: "One score. See what you can do.",
    description: "Follow one score from import and editing to playback, export and practice assignments in 80 seconds.",
    playLabel: "Watch the 80-second demo",
    videoLabel: "ScoreTransposer feature demonstration",
    chapterLabel: "Explore the video chapters",
    note: "The same demo score is used throughout. Audio-to-score transcription is not yet available.",
    scenes: {
      intro: ["One score. Many uses.", "Import, edit, listen and practise."],
      import: ["Bring in your score", "Import MusicXML. PDFs and photos need recognition and review."],
      edit: ["Edit a note", "Change the selected note’s pitch and save."],
      transpose: ["Move to a new key", "Transpose up two semitones and save a new version."],
      jianpu: ["Read numbered notation", "See the same score in numbered notation."],
      playback: ["Hear your score", "Play the current score at 80 BPM."],
      export: ["Take your music with you", "Export MusicXML, MIDI and WAV audio."],
      practice: ["Practise at your pace", "Loop a passage at 80 BPM."],
      teaching: ["Set a practice assignment", "Assign measures 1–4 and add practice instructions."],
      audio: ["Audio to score: not yet available", "Audio transcription is not part of this demo."],
      outro: ["Start with your own score", "Bring your music to ScoreTransposer."],
    },
  },
  "zh-CN": {
    title: "一份乐谱，完整看懂各种操作",
    description: "用 80 秒，跟着同一份乐谱看懂导入、编辑、移调、播放、导出与布置练习。",
    playLabel: "观看 80 秒功能演示",
    videoLabel: "ScoreTransposer 乐谱功能演示",
    chapterLabel: "选择演示章节",
    note: "全片使用同一份演示乐谱。音频转五线谱暂未开放。",
    scenes: {
      intro: ["一份乐谱，多种用法", "从导入、编辑到听见与练习。"],
      import: ["导入你的乐谱", "直接导入 MusicXML；PDF 与照片需识别后校对。"],
      edit: ["修改一个音符", "调整所选音符的音高并保存。"],
      transpose: ["换一个调，继续演奏", "整体升高 2 个半音，保存为新版本。"],
      jianpu: ["换成简谱阅读", "用简谱查看同一份旋律。"],
      playback: ["让乐谱发出声音", "以 80 BPM 播放当前乐谱。"],
      export: ["把乐谱带走", "导出 MusicXML、MIDI 与 WAV 音频。"],
      practice: ["按自己的节奏练习", "以 80 BPM 循环练习选定片段。"],
      teaching: ["布置一份练习作业", "安排第 1–4 小节慢练，写下练习要求。"],
      audio: ["音频转谱：暂未开放", "本片不演示尚未开放的音频识谱功能。"],
      outro: ["开始处理你自己的乐谱", "把音乐带进 ScoreTransposer。"],
    },
  },
  "zh-TW": {
    title: "一份樂譜，完整看懂各種操作",
    description: "用 80 秒，跟著同一份樂譜了解匯入、編輯、移調、播放、匯出與安排練習。",
    playLabel: "觀看 80 秒功能示範",
    videoLabel: "ScoreTransposer 樂譜功能示範",
    chapterLabel: "選擇示範章節",
    note: "全片使用同一份示範樂譜。音訊轉五線譜尚未開放。",
    scenes: {
      intro: ["一份樂譜，多種用法", "從匯入、編輯到聆聽與練習。"],
      import: ["匯入你的樂譜", "直接匯入 MusicXML；PDF 與照片需辨識後校對。"],
      edit: ["修改一個音符", "調整所選音符的音高並儲存。"],
      transpose: ["換一個調，繼續演奏", "整體升高 2 個半音，儲存為新版本。"],
      jianpu: ["換成簡譜閱讀", "用簡譜查看同一份旋律。"],
      playback: ["讓樂譜發出聲音", "以 80 BPM 播放目前的樂譜。"],
      export: ["把樂譜帶走", "匯出 MusicXML、MIDI 與 WAV 音訊。"],
      practice: ["按自己的節奏練習", "以 80 BPM 循環練習選定片段。"],
      teaching: ["安排一份練習作業", "安排第 1–4 小節慢練，寫下練習要求。"],
      audio: ["音訊轉譜：尚未開放", "本片不示範尚未開放的音訊辨識功能。"],
      outro: ["開始處理你自己的樂譜", "把音樂帶進 ScoreTransposer。"],
    },
  },
  ja: {
    title: "ひとつの楽譜で、できることがわかる",
    description: "読み込みから編集、移調、再生、書き出し、練習課題の作成まで。80秒でご紹介します。",
    playLabel: "80秒のデモを見る",
    videoLabel: "ScoreTransposerの楽譜機能デモ",
    chapterLabel: "チャプターを選ぶ",
    note: "全編で同じデモ楽譜を使用しています。音声からの採譜はまだ利用できません。",
    scenes: {
      intro: ["ひとつの楽譜、広がる使い方", "読み込んで、編集して、聴いて、練習。"],
      import: ["楽譜を読み込む", "MusicXMLを読み込み。PDFや写真は認識後に確認・修正します。"],
      edit: ["音符を編集する", "選んだ音符の高さを変えて保存します。"],
      transpose: ["演奏しやすい調へ", "半音2つ分上げて、新しい版として保存します。"],
      jianpu: ["数字譜で読む", "同じ旋律を数字譜で確認します。"],
      playback: ["楽譜の音を聴く", "現在の楽譜を80 BPMで再生します。"],
      export: ["楽譜を書き出す", "MusicXML、MIDI、WAV音声で書き出します。"],
      practice: ["自分のペースで練習", "80 BPMで選んだ箇所を繰り返します。"],
      teaching: ["練習課題を作る", "第1〜4小節を指定し、練習方法を書き添えます。"],
      audio: ["音声からの採譜：未公開", "このデモに音声からの採譜は含まれません。"],
      outro: ["自分の楽譜で始めよう", "ScoreTransposerに音楽を持ち込もう。"],
    },
  },
  ko: {
    title: "악보 하나로 살펴보는 모든 과정",
    description: "같은 악보로 가져오기, 편집, 조옮김, 재생, 내보내기와 연습 과제 만들기를 80초 동안 살펴보세요.",
    playLabel: "80초 기능 영상 보기",
    videoLabel: "ScoreTransposer 악보 기능 시연",
    chapterLabel: "영상 챕터 선택",
    note: "영상 전체에서 같은 시연 악보를 사용합니다. 오디오를 악보로 변환하는 기능은 아직 제공하지 않습니다.",
    scenes: {
      intro: ["악보 하나, 다양한 활용", "가져오고, 편집하고, 듣고, 연습하세요."],
      import: ["악보 가져오기", "MusicXML을 가져오세요. PDF와 사진은 인식 후 검토와 수정이 필요합니다."],
      edit: ["음표 편집", "선택한 음표의 음높이를 바꾸고 저장하세요."],
      transpose: ["새로운 조로 연주", "반음 두 개만큼 올리고 새 버전으로 저장하세요."],
      jianpu: ["숫자보로 읽기", "같은 선율을 숫자보로 확인하세요."],
      playback: ["악보를 소리로 듣기", "현재 악보를 80 BPM으로 재생하세요."],
      export: ["악보 내보내기", "MusicXML, MIDI, WAV 오디오로 내보내세요."],
      practice: ["나만의 속도로 연습", "80 BPM으로 선택한 구간을 반복하세요."],
      teaching: ["연습 과제 만들기", "1~4마디를 지정하고 연습 방법을 적으세요."],
      audio: ["오디오에서 악보로: 아직 미제공", "이 영상은 오디오 채보 기능을 시연하지 않습니다."],
      outro: ["내 악보로 시작하기", "ScoreTransposer에서 음악을 이어가세요."],
    },
  },
  fr: {
    title: "Une partition, toutes les étapes en images",
    description: "De l’import à l’édition, la transposition, l’écoute, l’export et les exercices : découvrez le parcours en 80 secondes.",
    playLabel: "Voir la démo de 80 secondes",
    videoLabel: "Démonstration des fonctions de ScoreTransposer",
    chapterLabel: "Choisir un chapitre",
    note: "La même partition sert de fil conducteur. La transcription audio en partition n’est pas encore disponible.",
    scenes: {
      intro: ["Une partition, tout un parcours", "Importez, modifiez, écoutez et pratiquez."],
      import: ["Importez votre partition", "Importez un MusicXML. PDF et photos nécessitent reconnaissance et vérification."],
      edit: ["Modifiez une note", "Changez la hauteur de la note choisie et enregistrez."],
      transpose: ["Changez de tonalité", "Montez de deux demi-tons et enregistrez une nouvelle version."],
      jianpu: ["Lisez en notation chiffrée", "Retrouvez la même mélodie en notation chiffrée."],
      playback: ["Écoutez votre partition", "Lancez la lecture de la partition à 80 BPM."],
      export: ["Emportez votre musique", "Exportez en MusicXML, MIDI et audio WAV."],
      practice: ["Pratiquez à votre rythme", "Répétez un passage en boucle à 80 BPM."],
      teaching: ["Préparez un exercice", "Indiquez les mesures 1 à 4 et ajoutez des consignes."],
      audio: ["Audio vers partition : indisponible", "La transcription audio ne fait pas partie de cette démonstration."],
      outro: ["Commencez avec votre partition", "Apportez votre musique dans ScoreTransposer."],
    },
  },
  es: {
    title: "Una partitura, todo el proceso a la vista",
    description: "Sigue una misma partitura al importar, editar, transportar, escuchar, exportar y preparar ejercicios. Todo en 80 segundos.",
    playLabel: "Ver la demo de 80 segundos",
    videoLabel: "Demostración de funciones de ScoreTransposer",
    chapterLabel: "Elegir un capítulo",
    note: "Se usa la misma partitura durante todo el vídeo. La transcripción de audio a partitura aún no está disponible.",
    scenes: {
      intro: ["Una partitura, muchos usos", "Importa, edita, escucha y practica."],
      import: ["Importa tu partitura", "Importa MusicXML. Los PDF y las fotos requieren reconocimiento y revisión."],
      edit: ["Edita una nota", "Cambia la altura de la nota elegida y guarda."],
      transpose: ["Cambia de tonalidad", "Sube dos semitonos y guarda una nueva versión."],
      jianpu: ["Lee en notación numérica", "Consulta la misma melodía en notación numérica."],
      playback: ["Escucha tu partitura", "Reproduce la partitura actual a 80 BPM."],
      export: ["Llévate tu música", "Exporta en MusicXML, MIDI y audio WAV."],
      practice: ["Practica a tu ritmo", "Repite un pasaje en bucle a 80 BPM."],
      teaching: ["Prepara un ejercicio", "Asigna los compases 1–4 y añade instrucciones."],
      audio: ["De audio a partitura: aún no disponible", "La transcripción de audio no forma parte de esta demo."],
      outro: ["Empieza con tu propia partitura", "Trae tu música a ScoreTransposer."],
    },
  },
  de: {
    title: "Ein Notenblatt. Alle Schritte im Überblick.",
    description: "Vom Import über Bearbeitung, Transposition und Wiedergabe bis zum Export und zur Übungsaufgabe: in 80 Sekunden erklärt.",
    playLabel: "80-Sekunden-Demo ansehen",
    videoLabel: "Funktionsdemo von ScoreTransposer",
    chapterLabel: "Videokapitel auswählen",
    note: "Das Video verwendet durchgehend dieselben Beispielnoten. Audio in Noten umzuwandeln ist noch nicht verfügbar.",
    scenes: {
      intro: ["Ein Notenblatt. Viel mehr.", "Importieren, bearbeiten, anhören und üben."],
      import: ["Noten importieren", "MusicXML direkt importieren. PDFs und Fotos müssen erkannt und geprüft werden."],
      edit: ["Eine Note bearbeiten", "Die Tonhöhe der gewählten Note ändern und speichern."],
      transpose: ["In eine neue Tonart wechseln", "Um zwei Halbtöne erhöhen und als neue Version speichern."],
      jianpu: ["Ziffernnotation lesen", "Dieselbe Melodie in Ziffernnotation ansehen."],
      playback: ["Die eigenen Noten hören", "Die aktuelle Fassung mit 80 BPM abspielen."],
      export: ["Musik mitnehmen", "Als MusicXML, MIDI und WAV-Audio exportieren."],
      practice: ["Im eigenen Tempo üben", "Einen Abschnitt mit 80 BPM in Schleife spielen."],
      teaching: ["Eine Übungsaufgabe erstellen", "Takte 1–4 vorgeben und Übungshinweise ergänzen."],
      audio: ["Audio in Noten: noch nicht verfügbar", "Audiotranskription ist nicht Teil dieser Demo."],
      outro: ["Mit eigenen Noten beginnen", "Musik in ScoreTransposer weiterbearbeiten."],
    },
  },
  ru: {
    title: "Одна партитура — весь процесс на экране",
    description: "За 80 секунд пройдите путь от импорта до редактирования, транспонирования, прослушивания, экспорта и учебного задания.",
    playLabel: "Смотреть демо — 80 секунд",
    videoLabel: "Демонстрация функций ScoreTransposer",
    chapterLabel: "Выбрать главу видео",
    note: "Во всём видео используется одна демонстрационная партитура. Преобразование аудио в ноты пока недоступно.",
    scenes: {
      intro: ["Одна партитура, много задач", "Импортируйте, редактируйте, слушайте и упражняйтесь."],
      import: ["Импортируйте партитуру", "Загрузите MusicXML. PDF и фото требуют распознавания и проверки."],
      edit: ["Измените ноту", "Измените высоту выбранной ноты и сохраните."],
      transpose: ["Смените тональность", "Поднимите на два полутона и сохраните новую версию."],
      jianpu: ["Читайте цифровую запись", "Посмотрите ту же мелодию в цифровой нотации."],
      playback: ["Услышьте свою партитуру", "Воспроизведите текущую версию в темпе 80 BPM."],
      export: ["Экспортируйте музыку", "Сохраните MusicXML, MIDI и аудио WAV."],
      practice: ["Занимайтесь в своём темпе", "Повторяйте фрагмент в темпе 80 BPM."],
      teaching: ["Создайте учебное задание", "Укажите такты 1–4 и добавьте инструкции."],
      audio: ["Аудио в ноты: пока недоступно", "Распознавание нот из аудио не входит в эту демонстрацию."],
      outro: ["Начните со своей партитуры", "Продолжите работу с музыкой в ScoreTransposer."],
    },
  },
};

export function getProductOverviewCopy(locale: SupportedLocale) {
  const { scenes: sceneCopy, ...labels } = copy[locale];
  const scenes = PRODUCT_OVERVIEW_SCENES.map((scene) => {
    const [title, detail] = sceneCopy[scene.id];
    return { ...scene, title, detail };
  });
  const chapters = scenes
    .filter((scene) => scene.id !== "intro" && scene.id !== "audio" && scene.id !== "outro")
    .map(({ id, start, title, detail }) => ({ id, start, title, detail }));

  return { ...labels, scenes, chapters };
}

export type ProductOverviewCopy = ReturnType<typeof getProductOverviewCopy>;
