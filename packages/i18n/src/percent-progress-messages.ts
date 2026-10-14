import type { SupportedLocale } from "./locales.ts";

const progress: Record<SupportedLocale, readonly [string, string, string]> = {
  en: ["Estimated progress", "Complete", "Downloading…"],
  "zh-CN": ["估算进度", "已完成", "正在下载…"],
  "zh-TW": ["估算進度", "已完成", "正在下載…"],
  ja: ["推定進捗", "完了", "ダウンロード中…"],
  ko: ["예상 진행률", "완료", "다운로드 중…"],
  fr: ["Progression estimée", "Terminé", "Téléchargement…"],
  es: ["Progreso estimado", "Completado", "Descargando…"],
  de: ["Geschätzter Fortschritt", "Abgeschlossen", "Wird heruntergeladen…"],
  ru: ["Оценка прогресса", "Завершено", "Скачивание…"],
};

export function getPercentProgressMessages(locale: SupportedLocale) {
  const [estimated, complete, downloading] = progress[locale];
  return { estimated, complete, downloading };
}

const staged: Record<SupportedLocale, readonly [string, string, string, string]> = {
  en: ["The temporary upload has expired. Run the free check again to upload the selected file once more. No credits were used for this attempt.", "This temporary upload is no longer available. Run the free check again to upload the selected file once more.", "Recognition is already starting for this upload. Refresh its status before trying again.", "Upload again and recheck"],
  "zh-CN": ["暂存文件已过期。请重新免费预检，所选文件会再次上传一次；本次确认未扣积分。", "此暂存文件已不可用。请重新免费预检，所选文件会再次上传一次。", "此文件的识谱请求正在启动，请先刷新状态再重试。", "重新上传并预检"],
  "zh-TW": ["暫存檔案已過期。請重新免費預檢，所選檔案會再次上傳一次；本次確認未扣點數。", "此暫存檔案已無法使用。請重新免費預檢，所選檔案會再次上傳一次。", "此檔案的辨識請求正在啟動，請先重新整理狀態再重試。", "重新上傳並預檢"],
  ja: ["一時保存したファイルの期限が切れました。無料確認をやり直すと、選択中のファイルをもう一度アップロードします。今回の確定ではクレジットを消費していません。", "一時保存したファイルは利用できません。無料確認をやり直して、選択中のファイルをもう一度アップロードしてください。", "このファイルの認識を開始しています。再試行する前に状態を更新してください。", "再アップロードして確認"],
  ko: ["임시 파일이 만료되었습니다. 무료 사전 검사를 다시 실행하면 선택한 파일을 한 번 더 업로드합니다. 이번 확인에서는 크레딧이 차감되지 않았습니다.", "임시 파일을 더 이상 사용할 수 없습니다. 무료 사전 검사를 다시 실행해 선택한 파일을 한 번 더 업로드하세요.", "이 파일의 인식이 이미 시작 중입니다. 다시 시도하기 전에 상태를 새로고침하세요.", "다시 업로드하고 검사"],
  fr: ["Le fichier temporaire a expiré. Relancez la vérification gratuite pour envoyer une nouvelle fois le fichier sélectionné. Aucun crédit utilisé pour cette tentative.", "Ce fichier temporaire n’est plus disponible. Relancez la vérification gratuite pour envoyer une nouvelle fois le fichier sélectionné.", "La reconnaissance de ce fichier démarre déjà. Actualisez son état avant de réessayer.", "Renvoyer et vérifier"],
  es: ["El archivo temporal ha caducado. Repite la comprobación gratuita para subir el archivo seleccionado una vez más. Este intento no ha usado créditos.", "Este archivo temporal ya no está disponible. Repite la comprobación gratuita para subir el archivo seleccionado una vez más.", "El reconocimiento de este archivo ya se está iniciando. Actualiza el estado antes de reintentar.", "Volver a subir y comprobar"],
  de: ["Die temporäre Datei ist abgelaufen. Starten Sie die kostenlose Prüfung erneut, um die ausgewählte Datei noch einmal hochzuladen. Für diesen Versuch wurden keine Credits verbraucht.", "Die temporäre Datei ist nicht mehr verfügbar. Starten Sie die kostenlose Prüfung erneut, um die ausgewählte Datei noch einmal hochzuladen.", "Die Erkennung dieser Datei startet bereits. Aktualisieren Sie vor einem erneuten Versuch den Status.", "Erneut hochladen und prüfen"],
  ru: ["Срок хранения временного файла истёк. Повторите бесплатную проверку, чтобы ещё раз загрузить выбранный файл. За эту попытку кредиты не списаны.", "Временный файл больше недоступен. Повторите бесплатную проверку, чтобы ещё раз загрузить выбранный файл.", "Распознавание этого файла уже запускается. Обновите состояние перед повторной попыткой.", "Загрузить и проверить снова"],
};

export function getStagedUploadMessages(locale: SupportedLocale) {
  const [expired, unavailable, busy, retry] = staged[locale];
  return { expired, unavailable, busy, retry };
}
