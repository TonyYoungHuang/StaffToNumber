import type { SupportedLocale } from "@score/i18n";

const keys = ["saving", "transposing", "suggesting", "updating", "preparingExport", "wait", "slow", "unsaved", "saveFirst", "exporting", "exportWait"] as const;
const catalogs: Record<SupportedLocale, readonly string[]> = {
  "en": [
    "Saving your changes…",
    "Transposing your score…",
    "Finding suitable transpositions…",
    "Updating your score…",
    "Preparing your export…",
    "Editing and repeat submissions are paused. Controls return automatically when this finishes.",
    "Still processing. Larger scores may take longer. Please do not submit again.",
    "Changes are not saved yet",
    "Save or retry your changes before switching tools.",
    "Generating your file…",
    "You can continue editing. This file uses the score version submitted for export."
  ],
  "zh-CN": [
    "正在保存修改…",
    "正在移调乐谱…",
    "正在计算移调建议…",
    "正在更新乐谱…",
    "正在准备导出…",
    "处理中，暂时不能编辑或重复提交。完成后会自动恢复操作。",
    "仍在处理中，较大的乐谱可能需要更久。请勿重复提交。",
    "修改尚未保存",
    "请保存或重试修改后，再切换其他功能。",
    "正在生成文件…",
    "可以继续编辑；本次文件使用提交导出时的乐谱版本。"
  ],
  "zh-TW": [
    "正在儲存修改…",
    "正在移調樂譜…",
    "正在計算移調建議…",
    "正在更新樂譜…",
    "正在準備匯出…",
    "處理中，暫時不能編輯或重複提交。完成後會自動恢復操作。",
    "仍在處理中，較大的樂譜可能需要更久。請勿重複提交。",
    "修改尚未儲存",
    "請儲存或重試修改後，再切換其他功能。",
    "正在產生檔案…",
    "可以繼續編輯；本次檔案使用提交匯出時的樂譜版本。"
  ],
  "fr": [
    "Enregistrement des modifications…",
    "Transposition de la partition…",
    "Recherche de transpositions adaptées…",
    "Mise à jour de la partition…",
    "Préparation de l’export…",
    "La modification et les envois répétés sont suspendus. Les commandes seront réactivées automatiquement.",
    "Le traitement continue. Les grandes partitions peuvent prendre plus de temps. Ne renvoyez pas la demande.",
    "Modifications non enregistrées",
    "Enregistrez ou réessayez avant de changer d’outil.",
    "Création du fichier…",
    "Vous pouvez continuer à modifier. Le fichier utilise la version envoyée à l’export."
  ],
  "de": [
    "Änderungen werden gespeichert…",
    "Partitur wird transponiert…",
    "Passende Transpositionen werden gesucht…",
    "Partitur wird aktualisiert…",
    "Export wird vorbereitet…",
    "Bearbeitung und erneutes Senden sind pausiert. Die Bedienung wird danach automatisch freigegeben.",
    "Die Verarbeitung läuft noch. Größere Partituren können länger dauern. Bitte nicht erneut senden.",
    "Änderungen noch nicht gespeichert",
    "Speichern Sie die Änderungen oder versuchen Sie es erneut, bevor Sie das Werkzeug wechseln.",
    "Datei wird erstellt…",
    "Sie können weiter bearbeiten. Die Datei verwendet die beim Export übermittelte Version."
  ],
  "es": [
    "Guardando los cambios…",
    "Transportando la partitura…",
    "Buscando transposiciones adecuadas…",
    "Actualizando la partitura…",
    "Preparando la exportación…",
    "La edición y los envíos repetidos están pausados. Los controles se reactivarán automáticamente.",
    "El proceso continúa. Las partituras grandes pueden tardar más. No vuelva a enviar la solicitud.",
    "Cambios sin guardar",
    "Guarde o reintente antes de cambiar de herramienta.",
    "Generando el archivo…",
    "Puede seguir editando. El archivo usa la versión enviada para exportar."
  ],
  "ja": [
    "変更を保存しています…",
    "楽譜を移調しています…",
    "移調候補を計算しています…",
    "楽譜を更新しています…",
    "書き出しを準備しています…",
    "処理中は編集や再送信が一時停止します。完了すると自動で操作できるようになります。",
    "処理を続けています。大きな楽譜は時間がかかる場合があります。再送信しないでください。",
    "変更がまだ保存されていません",
    "保存または再試行してからツールを切り替えてください。",
    "ファイルを生成しています…",
    "編集は続けられます。書き出しを開始した時点の楽譜を使用します。"
  ],
  "ko": [
    "변경 사항을 저장하고 있습니다…",
    "악보를 조옮김하고 있습니다…",
    "조옮김 제안을 계산하고 있습니다…",
    "악보를 업데이트하고 있습니다…",
    "내보내기를 준비하고 있습니다…",
    "처리 중에는 편집과 중복 제출이 일시 중지됩니다. 완료되면 자동으로 다시 사용할 수 있습니다.",
    "아직 처리 중입니다. 큰 악보는 시간이 더 걸릴 수 있습니다. 다시 제출하지 마세요.",
    "변경 사항이 아직 저장되지 않았습니다",
    "저장하거나 다시 시도한 후 다른 도구로 이동하세요.",
    "파일을 생성하고 있습니다…",
    "계속 편집할 수 있습니다. 파일은 내보내기 요청 시점의 악보를 사용합니다."
  ],
  "ru": [
    "Сохранение изменений…",
    "Транспонирование партитуры…",
    "Поиск вариантов транспонирования…",
    "Обновление партитуры…",
    "Подготовка экспорта…",
    "Редактирование и повторная отправка временно недоступны. После завершения управление восстановится автоматически.",
    "Обработка продолжается. Большие партитуры требуют больше времени. Не отправляйте запрос повторно.",
    "Изменения ещё не сохранены",
    "Сохраните изменения или повторите попытку перед сменой инструмента.",
    "Создание файла…",
    "Можно продолжать редактирование. Файл использует версию партитуры на момент запроса экспорта."
  ]
};
export function getScoreOperationMessages(locale: SupportedLocale) {
  return Object.fromEntries(keys.map((key, index) => [key, catalogs[locale][index]])) as Record<typeof keys[number], string>;
}
