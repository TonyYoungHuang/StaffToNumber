import type { SupportedLocale } from "./index.ts";
const queues: Record<SupportedLocale, string> = {
    en: "Lifetime access allows 1 recognition job at a time and up to 3 waiting jobs. Please wait for a job to finish.",
    "zh-CN": "终身版每个账户同时运行 1 个识谱任务，最多排队 3 个。请等待一个任务完成后再提交。",
    "zh-TW": "終身版每個帳戶同時執行 1 個識譜任務，最多排隊 3 個。請等待一個任務完成後再提交。",
    ja: "永久版は同時に1件、待機は最大3件の楽譜認識に対応します。処理が完了してから再度お試しください。",
    ko: "평생 요금제는 악보 인식을 한 번에 1개 실행하고 최대 3개 대기할 수 있습니다. 작업이 끝난 후 다시 제출하세요.",
    fr: "L’accès à vie permet une reconnaissance en cours et jusqu’à 3 en attente par compte. Attendez la fin d’une tâche avant de réessayer.",
    es: "El acceso de por vida permite 1 reconocimiento en curso y hasta 3 en espera por cuenta. Espera a que termine una tarea.",
    de: "Der lebenslange Zugang erlaubt eine laufende Notenerkennung und bis zu 3 wartende Aufträge pro Konto. Bitte warten Sie, bis ein Auftrag fertig ist.",
    ru: "Постоянный доступ допускает одно распознавание одновременно и до 3 заданий в очереди. Дождитесь завершения одного задания."
  };

export function getLifetimeQueueMessage(locale: SupportedLocale) { return queues[locale]; }
