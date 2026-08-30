import type { PlaybackPracticeMessages } from "../types";

export const ruPlaybackPracticeMessages = {
  playback: {
    eyebrow: "Репетиция воспроизведения", title: "Проигрыватель партий на Tone.js", body: "Создаёт из текущего Score JSON события для занятий с настройкой темпа, цикла, метронома, отсчёта и Solo/Mute партий.",
    load: "Создать события воспроизведения", play: "Воспроизвести", stop: "Остановить", tempo: "Темп, BPM", playhead: "Позиция воспроизведения", loop: "Повторять фрагмент", loopStart: "Начальная доля", loopEnd: "Конечная доля", metronome: "Метроном", countIn: "Отсчёт в один такт",
    loading: "Создание событий воспроизведения…", ready: "События воспроизведения созданы.", failed: "Не удалось создать воспроизведение.", empty: "Перед прослушиванием создайте события воспроизведения.", noEvents: "С текущим фильтром партий нет воспроизводимых нот.",
    events: "События", activeEvents: "Активные события", beats: "Всего долей", parts: "Партии", solo: "Solo", mute: "Без звука", allParts: "Все партии", revision: "Версия",
    speedLadder: "Лестница темпа", targetTempo: "Целевой темп", tempoStep: "Прибавка за проход", ladderComplete: "Лестница темпа завершена.", practiceExports: "Экспорт для занятий",
    startMeasure: "Начальный такт", endMeasure: "Конечный такт", byBeat: "По долям", partVolume: "Громкость партии", diagnostics: "Диагностика воспроизведения", playbackPath: "Порядок воспроизведения", terminated: "Завершение", unreachableMeasures: "Недостижимые такты",
    markerTemplate: "Такт {measure}", repeatedMarkerTemplate: "Такт {measure}, повтор {occurrence}", jumpsTemplate: "Переходов: {count}", selectedSoloTemplate: "Solo: {count}", selectedMuteTemplate: "Без звука: {count}", soloPartTemplate: "Соло: {part}", mutePartTemplate: "Отключить {part}",
    navigationMeasureTemplate: "Такт {measure}",
    terminationReasons: { end: "Конец партитуры", fine: "Знак Fine", guard: "Защитный предел" },
    navigationActions: { play: "Воспроизвести такт", "skip-ending": "Пропустить вольту", "repeat-jump": "Вернуться к началу повтора", "dc-jump": "Перейти к D.C.", "ds-jump": "Перейти к D.S.", "coda-jump": "Перейти к коде", "fine-stop": "Остановиться на Fine", end: "Дойти до конца", "guard-stop": "Остановиться на защитном пределе" },
  },
  recorder: {
    title: "Запись в браузере и обратная связь Beta", regionAria: "Запись в браузере и обратная связь по занятию", device: "Микрофон", defaultDevice: "Системный микрофон по умолчанию", deviceTemplate: "Микрофон {index}", countIn: "Отсчёт", beatsTemplate: "Долей: {count}",
    start: "Начать запись", requesting: "Запрашиваем доступ к микрофону…", pause: "Пауза", resume: "Продолжить", stop: "Остановить", cancel: "Отмена", rerecord: "Записать снова", ready: "Запись прикреплена к этой работе. Прослушайте её перед отправкой.",
    unsupported: "Этот браузер не поддерживает MediaRecorder.", denied: "Микрофон недоступен. Проверьте разрешение браузера и выбранное устройство ввода.", recordingStatusTemplate: "Запись {duration}", pausedStatusTemplate: "Пауза {duration}", countInStatusTemplate: "Приготовьтесь: {count}",
    analysis: "Обратная связь по каждой ноте", feedbackAria: "Результаты анализа занятия", analyzing: "Сопоставляем запись с партитурой…", analysisFailed: "Эту запись не удалось проанализировать, но её можно отправить преподавателю на проверку.", completeness: "Полнота распознавания", completenessTemplate: "{detected}/{expected} · {percent}",
    alignment: "Временное выравнивание", startOffset: "Начало записи (секунды)", timeScale: "Масштаб времени", applyAlignment: "Применить ручное выравнивание", measureTemplate: "Такт {measure}", detectedTemplate: "Распознано: {detected}/{total}", pitchAttentionTemplate: "Проверить высоту: {count}", rhythmAttentionTemplate: "Проверить ритм: {count}", polyphonicTemplate: "Полифония без оценки: {count}", jump: "Прослушать эту ноту",
    pitchUnavailable: "высота недоступна", onsetUnavailable: "атака недоступна", centsTemplate: "{value} центов", onsetTemplate: "{value} мс", feedbackButtonTemplate: "{measure}, {note}: {status}. {action}",
    statuses: { idle: "Ожидание", requesting: "Запрос доступа", count_in: "Отсчёт", recording: "Запись", paused: "Пауза", ready: "Готово", error: "Ошибка" },
    alignmentSources: { automatic: "Автоматически", manual: "Вручную" },
    eventStatuses: { matched: "Совпадает", pitch_attention: "Проверить высоту", rhythm_attention: "Проверить ритм", missing: "Не распознано", polyphonic_unscored: "Полифония, без оценки" },
  },
  jianpu: { regionAria: "Интерактивная цифровая нотация цзяньпу", empty: "Для этой партитуры нет доступной нотации цзяньпу.", note: "нота", rest: "пауза", voice: "голос", staff: "нотоносец", voiceShort: "Г", staffShort: "Н", eventLabelTemplate: "{kind} {degree}, голос {voice}, нотоносец {staff}", measureAriaTemplate: "Такт {measure}" },
  waveform: { waveformAria: "Форма волны записи", waveformValueTemplate: "{label}: {current} из {duration}. Нажмите или используйте стрелки для перехода.", waveformLoading: "Загрузка формы волны…", waveformUnavailable: "Предпросмотр формы волны недоступен; используйте элементы управления аудио.", recordingPlayback: "Записанное исполнение", practiceSpeed: "Скорость занятия", rateTemplate: "{rate}×" },
} satisfies PlaybackPracticeMessages;
