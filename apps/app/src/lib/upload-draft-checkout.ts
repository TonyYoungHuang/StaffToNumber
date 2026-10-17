import type { CheckoutIntendedAction, CheckoutReturnState, RecognitionMemoryAssessment } from "@score/shared";
import type { SupportedLocale } from "@score/i18n";

export type UploadCheckoutDraft = { id: string; documentId: string; filename: string; title: string; mode: "simple" | "complex"; creditCost: number; status: string; expiresAt: string; taskId: string | null; confirmation: "required"; memoryAssessment?: RecognitionMemoryAssessment };
export type UploadCheckoutOrder = { id: string; token: string; status: string; resumeResult?: { documentId: string; job?: { id: string }; error?: string; code?: string } | null };
type StorageLike = Pick<Storage, "getItem" | "setItem">;

/** Persist before sending prepare; a remount or timeout reuses the same server receipt. */
export function uploadDraftPrepareKey(userId: string, stagedId: string, mode: string, title: string, storage: StorageLike = window.localStorage, uuid = () => crypto.randomUUID()) {
  const storageKey = `score-upload-prepare:v1:${JSON.stringify([userId, stagedId, mode, title.trim().slice(0, 200)])}`;
  const previous = storage.getItem(storageKey);
  if (previous) return previous;
  const key = uuid();
  storage.setItem(storageKey, key);
  return key;
}
export function uploadDraftReturnPath(path: string, draftId: string) {
  const url = new URL(path, "https://app.invalid");
  url.searchParams.set("uploadDraft", draftId);
  url.searchParams.delete("checkoutOrderId");
  return url.pathname + url.search + url.hash;
}
export function uploadDraftCheckoutContext(draft: UploadCheckoutDraft, path: string) {
  return { targetDocumentId: draft.documentId,
    intendedAction: { kind: "recognition", mode: draft.mode, uploadDraftId: draft.id } as CheckoutIntendedAction,
    returnPath: uploadDraftReturnPath(path, draft.id),
    returnState: { version: 1, intent: "continue_action", uploadDraftId: draft.id, confirmation: "required" } as CheckoutReturnState };
}

const copy: Record<SupportedLocale, { ready: string; continue: string; waiting: string; queued: string; unavailable: string; credits: string }> = {
  en: { ready: "Your uploaded source is saved. Start recognition when you are ready.", continue: "Continue recognition", waiting: "Payment is still being confirmed. Recheck the original order.", queued: "Recognition is queued.", unavailable: "This upload could not be restored. Check your order or choose the file again.", credits: "Recognition credits" },
  "zh-CN": { ready: "上传源文件已保存。点击后才会排队识别。", continue: "继续识别", waiting: "付款仍在确认中，请重新查看原订单。", queued: "识别任务已排队。", unavailable: "暂时无法恢复这次上传，请查看原订单或重新选择文件。", credits: "识别积分" },
  "zh-TW": { ready: "上傳來源檔案已儲存。點擊後才會排隊辨識。", continue: "繼續辨識", waiting: "付款仍在確認中，請重新查看原訂單。", queued: "辨識任務已排隊。", unavailable: "暫時無法恢復這次上傳，請查看原訂單或重新選擇檔案。", credits: "辨識點數" },
  ja: { ready: "アップロードしたファイルを保存しました。ボタンを押すと認識を開始します。", continue: "認識を続ける", waiting: "お支払いを確認中です。元の注文をご確認ください。", queued: "認識タスクをキューに登録しました。", unavailable: "アップロードを復元できません。注文を確認するかファイルを選び直してください。", credits: "認識クレジット" },
  ko: { ready: "업로드한 파일이 저장되었습니다. 버튼을 누르면 인식을 시작합니다.", continue: "인식 계속하기", waiting: "결제를 확인 중입니다. 기존 주문을 다시 확인하세요.", queued: "인식 작업이 대기열에 등록되었습니다.", unavailable: "업로드를 복원하지 못했습니다. 주문을 확인하거나 파일을 다시 선택하세요.", credits: "인식 크레딧" },
  fr: { ready: "Votre fichier est enregistré. Cliquez pour lancer la reconnaissance.", continue: "Continuer la reconnaissance", waiting: "Le paiement est en cours de confirmation. Vérifiez la commande initiale.", queued: "La reconnaissance est en file d’attente.", unavailable: "Impossible de restaurer ce fichier. Vérifiez votre commande ou sélectionnez-le à nouveau.", credits: "Crédits de reconnaissance" },
  es: { ready: "El archivo está guardado. Pulsa para iniciar el reconocimiento.", continue: "Continuar el reconocimiento", waiting: "El pago se está confirmando. Revisa el pedido original.", queued: "El reconocimiento está en cola.", unavailable: "No se pudo restaurar el archivo. Revisa el pedido o vuelve a seleccionarlo.", credits: "Créditos de reconocimiento" },
  de: { ready: "Ihre Datei ist gespeichert. Klicken Sie, um die Erkennung zu starten.", continue: "Erkennung fortsetzen", waiting: "Die Zahlung wird noch bestätigt. Prüfen Sie die ursprüngliche Bestellung.", queued: "Die Erkennung wurde eingereiht.", unavailable: "Die Datei konnte nicht wiederhergestellt werden. Prüfen Sie die Bestellung oder wählen Sie die Datei erneut.", credits: "Erkennungscredits" },
  ru: { ready: "Файл сохранён. Нажмите кнопку, чтобы начать распознавание.", continue: "Продолжить распознавание", waiting: "Платёж ещё подтверждается. Проверьте исходный заказ.", queued: "Распознавание поставлено в очередь.", unavailable: "Не удалось восстановить файл. Проверьте заказ или выберите файл снова.", credits: "Баллы распознавания" },
};
export function uploadDraftCopy(locale: SupportedLocale) { return copy[locale]; }
