import type { SupportedLocale } from "@score/i18n";

export type FeatureSearchIntentContent = {
  eyebrow: string;
  title: string;
  body: string;
  faq: {
    question: string;
    answer: string;
  };
};

type SearchIntentFeatureSlug = "score-editor" | "score-to-audio";

const searchIntentContent = {
  en: {
    "score-to-audio": {
      eyebrow: "PDF sheet music playback",
      title: "How to play PDF sheet music or turn it into MP3",
      body: "A PDF or score image first becomes an OMR candidate. Review the notes, rhythm, key, measures, and parts, then promote the corrected result to MusicXML and Score JSON before playback or MIDI, WAV, or MP3 export. This is not arbitrary PDF text-to-speech or a promise of perfect one-click recognition.",
      faq: {
        question: "Can I convert PDF sheet music to MP3 automatically?",
        answer: "You can scan PDF sheet music, review and correct the OMR candidate, and then play the structured score or export MIDI, WAV, or MP3. Recognition quality depends on the source, so the PDF must be checked before relying on the audio.",
      },
    },
    "score-editor": {
      eyebrow: "Online notation creation",
      title: "Use an online sheet music editor as a structured sheet music maker",
      body: "Create and edit sheet music online from MusicXML, MIDI, Jianpu, a reviewed scan, or an existing score project. The music notation editor keeps notes, measures, parts, and revisions structured so you can extract parts, collaborate, transpose, play, and export the same score.",
      faq: {
        question: "Can I create sheet music online with this editor?",
        answer: "Yes. The editor supports structured score creation and correction, including notes, rhythm, score properties, revisions, and part extraction. Advanced desktop-style engraving and unrestricted page layout are still in development.",
      },
    },
  },
  "zh-CN": {
    "score-to-audio": {
      eyebrow: "PDF 五线谱播放",
      title: "如何把 PDF 五线谱转成音频或 MP3",
      body: "PDF 或乐谱图片需要先经过乐谱识别，生成 OMR 候选稿；人工核对音高、节奏、调号、小节和声部后，再确认成 MusicXML 与 Score JSON 结构化乐谱，最后播放或导出 MIDI、WAV、MP3。这里不是普通 PDF 朗读，也不承诺任意乐谱都能一键完美识别。",
      faq: {
        question: "可以把 PDF 乐谱自动播放并导出 MP3 吗？",
        answer: "可以先扫描 PDF 乐谱、检查并校正识别候选稿，再播放确认后的结构化乐谱，或导出 MIDI、WAV、MP3。识别质量取决于原稿，因此依赖音频前必须人工检查。",
      },
    },
    "score-editor": {
      eyebrow: "在线打谱与制谱",
      title: "使用在线五线谱编辑器打谱和制谱",
      body: "这款在线打谱软件和制谱软件可以从 MusicXML、MIDI、简谱、已审核的识谱候选稿或现有乐谱工程开始，继续创建和修改五线谱、提取声部、协作编辑、移调、播放与导出。",
      faq: {
        question: "可以使用这个五线谱编辑器在线制谱吗？",
        answer: "可以。编辑器支持结构化乐谱的创建与校正，包括音符、节奏、乐谱属性、版本和声部提取；完整桌面级自由排版仍在持续开发。",
      },
    },
  },
  "zh-TW": {
    "score-to-audio": {
      eyebrow: "PDF 樂譜播放",
      title: "如何播放 PDF 樂譜並轉成 MP3 音檔",
      body: "PDF 或樂譜圖片要先經過樂譜辨識，產生 OMR 候選稿；人工核對音高、節奏、調號、小節與聲部後，再確認為 MusicXML 與 Score JSON 結構化樂譜，最後播放或匯出 MIDI、WAV、MP3。這不是一般 PDF 朗讀，也不承諾任何樂譜都能一鍵完美辨識。",
      faq: {
        question: "可以自動播放 PDF 樂譜並匯出 MP3 嗎？",
        answer: "可以先掃描 PDF 樂譜、檢查並校正辨識候選稿，再播放確認後的結構化樂譜，或匯出 MIDI、WAV、MP3。辨識品質取決於原稿，因此採用音檔前仍須人工檢查。",
      },
    },
    "score-editor": {
      eyebrow: "線上打譜與製譜",
      title: "使用線上樂譜編輯器打譜與製譜",
      body: "這套線上打譜軟體與製譜軟體可從 MusicXML、MIDI、簡譜、已審核的辨識候選稿或現有樂譜專案開始，繼續建立與修改樂譜、擷取聲部、共同編輯、移調、播放與匯出。",
      faq: {
        question: "可以使用這個五線譜編輯器在線上製譜嗎？",
        answer: "可以。編輯器支援結構化樂譜的建立與校正，包括音符、節奏、樂譜屬性、版本與聲部擷取；完整桌面級自由排版仍在持續開發。",
      },
    },
  },
  ja: {
    "score-to-audio": {
      eyebrow: "PDF 楽譜の再生",
      title: "PDF楽譜を再生してMP3に変換する方法",
      body: "PDF または楽譜画像をまず OMR 候補として読み取り、音高、リズム、調号、小節、パートを人が確認・修正します。修正版を MusicXML と Score JSON の構造化楽譜にしてから、自動演奏または MIDI、WAV、MP3 の書き出しを行います。一般的な PDF 読み上げではなく、ワンクリックでの完全認識を保証するものでもありません。",
      faq: {
        question: "PDF楽譜を自動演奏してMP3にできますか？",
        answer: "PDF楽譜をスキャンし、OMR 候補を確認・修正した後、構造化楽譜を再生するか MIDI、WAV、MP3 に書き出せます。認識品質は元の楽譜に左右されるため、音声を利用する前に確認が必要です。",
      },
    },
    "score-editor": {
      eyebrow: "オンライン楽譜作成",
      title: "楽譜作成ソフトとしてオンラインで楽譜を作成・編集",
      body: "MusicXML、MIDI、数字譜、確認済みのスキャン候補、または既存の楽譜プロジェクトから始め、楽譜編集ソフトで音符やパートを修正し、パート抽出、共同編集、移調、再生、書き出しまで続けられます。",
      faq: {
        question: "このオンライン楽譜エディターで楽譜を作成できますか？",
        answer: "はい。音符、リズム、楽譜属性、リビジョン、パート抽出を含む構造化楽譜の作成と修正に対応しています。高度なデスクトップ向け浄書と自由なページレイアウトは開発中です。",
      },
    },
  },
  ko: {
    "score-to-audio": {
      eyebrow: "PDF 악보 재생",
      title: "PDF 악보를 재생하고 MP3로 변환하는 방법",
      body: "PDF 또는 악보 이미지를 먼저 OMR 후보로 인식한 뒤 음높이, 리듬, 조표, 마디와 파트를 사람이 확인하고 교정합니다. 수정본을 MusicXML과 Score JSON 구조화 악보로 만든 다음 자동 연주하거나 MIDI, WAV, MP3로 내보냅니다. 일반 PDF 음성 읽기가 아니며 모든 악보의 완벽한 원클릭 인식을 보장하지 않습니다.",
      faq: {
        question: "PDF 악보를 자동 연주하고 MP3로 만들 수 있나요?",
        answer: "PDF 악보를 스캔하고 OMR 후보를 확인·교정한 뒤 구조화 악보를 재생하거나 MIDI, WAV, MP3로 내보낼 수 있습니다. 인식 품질은 원본에 따라 달라지므로 오디오를 사용하기 전에 검토해야 합니다.",
      },
    },
    "score-editor": {
      eyebrow: "온라인 악보 만들기",
      title: "악보 제작 프로그램으로 온라인에서 악보 만들기와 편집",
      body: "MusicXML, MIDI, 숫자보, 검토된 스캔 후보 또는 기존 악보 프로젝트에서 시작해 악보 편집 프로그램으로 음표와 파트를 수정하고 파트 추출, 공동 편집, 조옮김, 재생과 내보내기를 이어갈 수 있습니다.",
      faq: {
        question: "이 온라인 악보 편집기로 악보를 만들 수 있나요?",
        answer: "예. 음표, 리듬, 악보 속성, 리비전과 파트 추출을 포함한 구조화 악보 제작 및 교정을 지원합니다. 고급 데스크톱 조판과 자유로운 페이지 레이아웃은 개발 중입니다.",
      },
    },
  },
  fr: {
    "score-to-audio": {
      eyebrow: "Lecture d’une partition PDF",
      title: "Comment écouter une partition PDF et l’exporter en MP3",
      body: "Le PDF ou l’image de partition est d’abord reconnu comme candidat OMR. Vérifiez et corrigez notes, rythmes, armure, mesures et parties, puis validez une partition structurée MusicXML et Score JSON avant la lecture ou l’export MIDI, WAV ou MP3. Il ne s’agit ni de lecture vocale de PDF ni d’une promesse de reconnaissance parfaite en un clic.",
      faq: {
        question: "Puis-je convertir automatiquement une partition PDF en MP3 ?",
        answer: "Vous pouvez scanner la partition PDF, vérifier et corriger le candidat OMR, puis lire la partition structurée ou l’exporter en MIDI, WAV ou MP3. La qualité dépend de la source ; une vérification humaine reste nécessaire avant d’utiliser l’audio.",
      },
    },
    "score-editor": {
      eyebrow: "Création de partitions en ligne",
      title: "Créer une partition en ligne avec un éditeur de notation musicale",
      body: "Commencez par MusicXML, MIDI, Jianpu, un scan vérifié ou un projet existant, puis utilisez le logiciel de notation musicale pour créer et modifier la partition, extraire des parties, collaborer, transposer, lire et exporter le même projet.",
      faq: {
        question: "Puis-je créer une partition en ligne avec cet éditeur ?",
        answer: "Oui. L’éditeur gère la création et la correction structurées des notes, rythmes, propriétés, révisions et parties. La gravure avancée et la mise en page entièrement libre restent en développement.",
      },
    },
  },
  es: {
    "score-to-audio": {
      eyebrow: "Reproducción de partituras PDF",
      title: "Cómo reproducir una partitura PDF y convertirla a MP3",
      body: "El PDF o la imagen de la partitura se reconoce primero como candidato OMR. Revisa y corrige notas, ritmo, armadura, compases y partes; después confirma una partitura estructurada en MusicXML y Score JSON antes de reproducirla o exportarla como MIDI, WAV o MP3. No es lectura de texto PDF ni una promesa de reconocimiento perfecto con un clic.",
      faq: {
        question: "¿Puedo convertir automáticamente una partitura PDF a MP3?",
        answer: "Puedes escanear la partitura PDF, revisar y corregir el candidato OMR y, después, reproducir la partitura estructurada o exportarla como MIDI, WAV o MP3. La calidad depende del original, por lo que debes comprobar el resultado antes de usar el audio.",
      },
    },
    "score-editor": {
      eyebrow: "Creación de partituras online",
      title: "Crear partituras online con un software de notación musical",
      body: "Empieza con MusicXML, MIDI, Jianpu, un escaneo revisado o un proyecto existente y utiliza el editor de partituras para crear y modificar música, extraer partes, colaborar, transponer, reproducir y exportar el mismo proyecto.",
      faq: {
        question: "¿Puedo crear partituras online con este editor?",
        answer: "Sí. El editor permite crear y corregir notas, ritmos, propiedades, revisiones y partes de forma estructurada. La notación avanzada y la maquetación totalmente libre siguen en desarrollo.",
      },
    },
  },
  de: {
    "score-to-audio": {
      eyebrow: "PDF-Noten abspielen",
      title: "PDF-Noten abspielen und in MP3 umwandeln",
      body: "Eine PDF-Datei oder ein Notenbild wird zuerst als OMR-Kandidat erkannt. Prüfe und korrigiere Noten, Rhythmus, Tonart, Takte und Stimmen und bestätige daraus strukturierte MusicXML- und Score JSON-Noten, bevor du sie abspielst oder als MIDI, WAV oder MP3 exportierst. Das ist weder PDF-Sprachausgabe noch ein Versprechen perfekter Ein-Klick-Erkennung.",
      faq: {
        question: "Kann ich PDF-Noten automatisch in MP3 umwandeln?",
        answer: "Du kannst PDF-Noten scannen, den OMR-Kandidaten prüfen und korrigieren und die strukturierten Noten anschließend abspielen oder als MIDI, WAV oder MP3 exportieren. Die Erkennungsqualität hängt von der Vorlage ab; vor der Audionutzung ist eine Kontrolle nötig.",
      },
    },
    "score-editor": {
      eyebrow: "Noten online schreiben",
      title: "Noten online schreiben mit einem Notensatzprogramm",
      body: "Beginne mit MusicXML, MIDI, Jianpu, einem geprüften Scan oder einem vorhandenen Projekt und nutze den Online-Noteneditor, um Noten zu erstellen und zu bearbeiten, Stimmen zu extrahieren, zusammenzuarbeiten, zu transponieren, abzuspielen und zu exportieren.",
      faq: {
        question: "Kann ich mit diesem Noteneditor online Noten erstellen?",
        answer: "Ja. Der Editor unterstützt die strukturierte Erstellung und Korrektur von Noten, Rhythmus, Eigenschaften, Revisionen und Stimmen. Fortgeschrittener Notensatz und völlig freie Seitengestaltung sind noch in Entwicklung.",
      },
    },
  },
  ru: {
    "score-to-audio": {
      eyebrow: "Воспроизведение нот из PDF",
      title: "Как прослушать ноты из PDF и сохранить их в MP3",
      body: "PDF или изображение нот сначала распознаётся как кандидат OMR. Проверьте и исправьте ноты, ритм, ключевые знаки, такты и партии, затем подтвердите структурированную партитуру MusicXML и Score JSON перед воспроизведением или экспортом в MIDI, WAV или MP3. Это не озвучивание текста PDF и не обещание идеального распознавания одним нажатием.",
      faq: {
        question: "Можно ли автоматически конвертировать ноты из PDF в MP3?",
        answer: "Можно отсканировать ноты из PDF, проверить и исправить кандидат OMR, а затем воспроизвести структурированную партитуру или экспортировать её в MIDI, WAV или MP3. Качество зависит от исходника, поэтому перед использованием аудио результат нужно проверить.",
      },
    },
    "score-editor": {
      eyebrow: "Создание нот онлайн",
      title: "Создать ноты онлайн в программе для нотной записи",
      body: "Начните с MusicXML, MIDI, Jianpu, проверенного скана или существующего проекта и используйте нотный редактор онлайн, чтобы создавать и исправлять ноты, извлекать партии, работать вместе, транспонировать, воспроизводить и экспортировать один проект.",
      faq: {
        question: "Можно ли создать ноты онлайн в этом редакторе?",
        answer: "Да. Редактор поддерживает структурированное создание и исправление нот, ритма, свойств, ревизий и партий. Продвинутая вёрстка и полностью свободный макет страницы ещё разрабатываются.",
      },
    },
  },
} satisfies Record<SupportedLocale, Record<SearchIntentFeatureSlug, FeatureSearchIntentContent>>;

export function getFeatureSearchIntentContent(
  slug: string,
  locale: SupportedLocale,
): FeatureSearchIntentContent | null {
  if (slug !== "score-editor" && slug !== "score-to-audio") {
    return null;
  }

  return searchIntentContent[locale][slug];
}
