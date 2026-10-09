import type { FeatureTranslationSlug } from "./types";

export const deRuFeatureExamples = {
  de: {
    "staff-to-jianpu": { input: "MusicXML in C-Dur: C4 D4 E4 G4 im 4/4-Takt.", output: "Zahlennotation 1 2 3 5 mit Tonart, Notenwerten und Taktgrenzen." },
    "jianpu-to-staff": { input: "Strukturierter Jianpu-Text: 1=C, 4/4-Takt, Melodie 1 2 3 5.", output: "Bearbeitbare Partitur mit C4 D4 E4 G4, Vorschau auf dem Notensystem und MusicXML-Export." },
    "transpose-score": { input: "C-Dur: C4 D4 E4 G4. Transposition um zwei Halbtöne aufwärts.", output: "D-Dur: D4 E4 F♯4 A4 als neue Version; die ursprüngliche Partitur bleibt erhalten." },
    "score-editor": { input: "Die Viertelnote E4 in Takt 2 einer importierten Partitur.", output: "Die Achtelnote F♯4 in einer neuen Partiturversion; die vorherige Version bleibt verfügbar." },
    "score-to-audio": { input: "Partitur mit 96 Schlägen pro Minute und einer Wiederholung von vier Takten.", output: "Wiedergabe des Abschnitts und MIDI-, WAV- oder MP3-Dateien, soweit das Exportformat verfügbar ist." },
    "audio-to-score": { input: "Kurze einstimmige WAV- oder MP3-Aufnahme, für deren Verarbeitung eine Erlaubnis vorliegt.", output: "Erste MIDI-Transkription und bearbeitbare Noten zur Prüfung und Korrektur. Die Funktion ist experimentell." },
    "musicxml-midi": { input: "MusicXML- oder MIDI-Datei mit Noten, Tempo und Takten.", output: "Bearbeitbare Partitur mit MusicXML- und MIDI-Export sowie PDF- oder Bildausgabe nach Verfügbarkeit." },
    "sheet-music-scanner": { input: "Gut lesbares PDF oder Bild einer Partitur auf Notenlinien.", output: "Bearbeitbarer MusicXML-Vorschlag mit Hinweisen auf Stellen, die geprüft werden müssen." },
    "pdf-to-musicxml": { input: "PDF oder Bild einer Partitur, zu deren Verarbeitung Sie berechtigt sind.", output: "MusicXML-Erkennungsergebnis zur Prüfung. Korrigieren Sie Noten und Rhythmus vor dem Download." },
    teaching: { input: "Referenzpartitur, Aufgabenbeschreibung, Abgabefrist und Bewertungskriterien der Lehrkraft.", output: "Geteilte Aufgabe, Abgaben der Lernenden und Rückmeldungen der Lehrkraft. Klassenfunktionen sind in der Beta-Phase." },
    pricing: { input: "Starter oder Converter Pro für einen Monat oder ein Jahr auswählen.", output: "Zugang zum angemeldeten Konto nach bestätigter Zahlung, je nach Auswahl mit oder ohne automatische Verlängerung." },
  },
  ru: {
    "staff-to-jianpu": { input: "MusicXML в до мажоре: C4 D4 E4 G4, размер 4/4.", output: "Цифровая запись 1 2 3 5 с сохранением тональности, длительностей и тактов." },
    "jianpu-to-staff": { input: "Структурированный текст Jianpu: 1=C, размер 4/4, мелодия 1 2 3 5.", output: "Редактируемая партитура с нотами C4 D4 E4 G4, просмотр на нотном стане и экспорт MusicXML." },
    "transpose-score": { input: "До мажор: C4 D4 E4 G4. Транспонирование на два полутона вверх.", output: "Ре мажор: D4 E4 F♯4 A4 в новой версии; исходная партитура сохраняется." },
    "score-editor": { input: "Четвертная нота E4 во втором такте импортированной партитуры.", output: "Восьмая нота F♯4 в новой версии партитуры; предыдущая версия остаётся доступной." },
    "score-to-audio": { input: "Партитура с темпом 96 ударов в минуту и повтором четырёх тактов.", output: "Воспроизведение фрагмента и файлы MIDI, WAV или MP3 в зависимости от доступности экспорта." },
    "audio-to-score": { input: "Короткая одноголосная запись WAV или MP3, которую разрешено обрабатывать.", output: "Первая транскрипция MIDI и редактируемые ноты для проверки и исправления. Функция экспериментальная." },
    "musicxml-midi": { input: "Файл MusicXML или MIDI с нотами, темпом и тактами.", output: "Редактируемая партитура, экспорт MusicXML или MIDI и вывод PDF или изображения при доступности формата." },
    "sheet-music-scanner": { input: "Хорошо читаемый PDF или изображение нот на нотном стане.", output: "Редактируемый результат MusicXML с указаниями на фрагменты, требующие проверки." },
    "pdf-to-musicxml": { input: "PDF или изображение партитуры, которую вы вправе обрабатывать.", output: "Результат распознавания MusicXML для проверки. Исправьте ноты и ритм перед скачиванием." },
    teaching: { input: "Образец партитуры преподавателя, инструкции, срок сдачи и критерии задания.", output: "Задание для класса, работы учеников и комментарии преподавателя. Функции класса находятся в бета-версии." },
    pricing: { input: "Выбор Starter или Converter Pro на месяц или год.", output: "Доступ привязывается к аккаунту после подтверждения оплаты, с автопродлением или без него в зависимости от выбора." },
  },
} satisfies Record<"de" | "ru", Record<FeatureTranslationSlug, { input: string; output: string }>>;
