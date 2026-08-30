import type { ScoreSharingMessages } from "../types";

export const ruScoreSharingMessages = {
  viewer: {
    loading: "Загрузка общей партитуры...", missing: "Эта ссылка недоступна или была отозвана.", back: "Открыть студию", shared: "Общая партитура",
    revision: "Текущая редакция", preview: "Предпросмотр нот", previewEmpty: "В этой публикации пока нет MusicXML, доступного для отображения.", previewLoading: "Отрисовка нот...",
    previewError: "Не удалось отобразить нотный текст.", previewRetry: "Попробовать отрисовать снова", previewTechnicalDetails: "Технические сведения", previewDeferred: "Эта партитура велика. Загрузите полный предпросмотр MusicXML, когда понадобится сравнительный вид OSMD.", previewRender: "Загрузить полный предпросмотр", previewEventLabel: "{part} · такт {measure} · {type} {number}", previewNote: "нота", previewRest: "пауза",
    jianpu: "Предпросмотр цифровой нотации", summary: "Структурированная сводка", parts: "Партии", measures: "Такты", notes: "Ноты", rests: "Паузы",
    musicXmlEyebrow: "MusicXML", jianpuEyebrow: "Цифровая нотация", scoreJsonEyebrow: "Score JSON", assignmentScoreFailed: "Не удалось загрузить версию партитуры для задания.",
    assignmentScoreShown: "Показана версия партитуры {version} для задания.", loadingAria: "Состояние загрузки общей партитуры",
  },
  assignments: {
    title: "Задания для практики", statuses: { open: "Открыто", archived: "В архиве" }, dueAt: "Срок", noDue: "Без срока", submitterName: "Имя", submitterContact: "Контакт",
    practiceMinutes: "Минут практики", recordingUrl: "Ссылка на аудио/видео", performanceFile: "Загрузить файл исполнения", performanceFileHint: "Аудио или распространённое видео, до 100 МБ",
    performanceFileAria: "Выбрать аудио- или видеофайл исполнения", note: "Заметка о практике", namePlaceholder: "Введите имя", nameRequired: "Перед отправкой укажите имя.",
    contactPlaceholder: "Эл. почта, телефон или контакт по просьбе преподавателя", recordingPlaceholder: "https://...", rubric: "Критерии оценки", rubricEmpty: "Критерии оценки не заданы.",
    notePlaceholder: "Укажите темп, сложные места, пройденный фрагмент или вопрос преподавателю...", submit: "Отправить задание", submitting: "Отправка...",
    submitSuccess: "Задание отправлено. Преподаватель сможет проверить его в проекте партитуры.", submitFailed: "Не удалось отправить задание.", practicePreset: "Настройки практики", submittedPractice: "Отправленные настройки практики",
    loadScore: "Применить настройки практики", loadingScore: "Загрузка версии партитуры...", statusAria: "Состояние отправки задания",
  },
  practice: { tempo: "{tempo} BPM", loop: "цикл {start}–{end}", fullScore: "вся партитура", solo: "соло {parts}", mute: "без звука {parts}", allParts: "все партии", metronome: "метроном", countIn: "отсчёт" },
  reviews: {
    title: "Отзывы на мои работы", statuses: { submitted: "Отправлено", reviewed: "Проверено" }, feedback: "Отзыв преподавателя", timedFeedback: "Комментарии к моментам исполнения", performanceFile: "Мой файл исполнения",
    loadPerformancePreview: "Загрузить воспроизведение", loadingPerformancePreview: "Загрузка воспроизведения...", performancePreviewFailed: "Не удалось загрузить воспроизведение исполнения.", seekTimedFeedback: "Перейти к этому моменту",
    grade: "Оценка", waiting: "Ожидает проверки преподавателя.", empty: "После отправки задания здесь появится отзыв преподавателя.", playbackAria: "Воспроизведение отправленного исполнения",
  },
  annotations: {
    eyebrow: "Аннотации к партитуре", titles: { comment: "Рабочая область комментатора", edit: "Совместные аннотации" },
    body: "Выберите ноту в партитуре ниже, чтобы прикрепить точную аннотацию. Имя владельца ссылки задаёт владелец партитуры; оно подтверждает владение ссылкой, но не личность человека.",
    score: "Вся партитура", selection: "Выбранная нота", noSelection: "Сначала выберите ноту в партитуре", placeholder: "Опишите исправление, цель практики или вопрос", post: "Опубликовать аннотацию", posting: "Публикация...",
    posted: "Аннотация опубликована.", failed: "Не удалось опубликовать аннотацию.", empty: "Аннотаций пока нет.", identities: { account: "Учётная запись", share_link: "Владелец ссылки" }, resolved: "Решено", locate: "Найти в партитуре",
    measure: "Такт", targetModeAria: "Объект аннотации", statusAria: "Состояние публикации аннотации", listAria: "Аннотации к партитуре",
  },
  collaboration: {
    title: "Совместная работа в реальном времени — бета", note: "Общая заметка к репетиции", noteAria: "Общая заметка к репетиции", online: "Сейчас онлайн (имена не проверены)", operations: "Недавние операции с партитурой", conflicts: "Конфликты одновременных правок",
    noOperations: "Ожидание первой операции редактирования партитуры.", revision: "Редакция", targets: "Объектов: {count}", identities: { account: "Учётная запись", share_link: "Владелец ссылки", unverified: "Непроверенное имя" },
    statuses: { disconnected: "Отключено", connecting: "Подключение", connected: "Подключено" }, roles: { owner: "Владелец", editor: "Редактор", commenter: "Комментатор", viewer: "Читатель" },
    collaborator: "Соавтор", currentUser: "Текущий пользователь", operationTypes: { note_edit: "Изменение ноты", measure_edit: "Изменение такта", part_edit: "Изменение партии", transpose: "Транспонирование", restore: "Восстановление редакции", candidate_accept: "Принятие варианта", candidate_reject: "Отклонение варианта", unknown: "Операция с партитурой" },
    presenceAria: "Соавторы онлайн и конфликты", operationsAria: "Недавние совместные операции",
  },
  modes: { major: "Мажор", minor: "Минор", dorian: "Дорийский", phrygian: "Фригийский", lydian: "Лидийский", mixolydian: "Миксолидийский", locrian: "Локрийский" },
} satisfies ScoreSharingMessages;
