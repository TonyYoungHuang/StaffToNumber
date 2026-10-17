import { getRecognitionPricingCopy } from "./recognition-pricing-copy";
import type { SupportedLocale } from "@score/i18n";

type ScannerFaq = { question: string; answer: string };

// Added to the existing scanner FAQ at its final content source. The page uses
// that same array for visible answers and its existing FAQPage JSON-LD.
const scannerFaqs: Record<SupportedLocale, ScannerFaq[]> = {
  en: [
    { question: "What should I expect from a handwritten score?", answer: "The scanner mainly processes clear, printed staff notation. Handwritten scores are not reliably supported, and a usable recognition result cannot be guaranteed." },
    { question: "Which phone-photo formats can I upload, and how should I take the photo?", answer: "You can upload PDF, PNG, JPG/JPEG, WebP and TIFF files. For a phone photo, keep the page flat, hold the camera parallel to it, use even lighting and keep every note in frame. Avoid blur and cropped edges." },
    { question: "Are processing credits released if a scan fails or is cancelled?", answer: "Credits are reserved when a validated upload becomes a queued job. They are released when the server marks the job as failed or cancelled. Clicking Cancel while processing does not release them until the job actually becomes cancelled. A completed result that needs correction, or rejecting its candidate, does not automatically release credits. Retrying reserves credits again." + " " + getRecognitionPricingCopy("en").refund },
    { question: "How do I use my lifetime free scan?", answer: getRecognitionPricingCopy("en").freeScope + " " + getRecognitionPricingCopy("en").laneGuide },
    { question: "How should I choose between simple and complex scanning?", answer: getRecognitionPricingCopy("en").billing + " " + getRecognitionPricingCopy("en").passScope + " " + getRecognitionPricingCopy("en").starterScope },
    { question: "Is the scanned result ready for rehearsal straight away?", answer: "First compare pitches, rhythms and the parts and measures covered with the original score, then listen to the result. Machine recognition creates a candidate that still needs your review and confirmation before rehearsal." },
  ],
  es: [
    { question: "¿Qué resultado puedo esperar con una partitura manuscrita?", answer: "El escáner procesa principalmente notación en pentagrama impresa y nítida. No admite de forma fiable las partituras manuscritas y no puede garantizar un resultado utilizable." },
    { question: "¿Qué formatos de foto puedo subir y cómo debo tomarla?", answer: "Puedes subir archivos PDF, PNG, JPG/JPEG, WebP y TIFF. Para una foto del móvil, coloca la página plana, mantén la cámara paralela al papel y utiliza una luz uniforme. Incluye todas las notas y evita el desenfoque y los bordes recortados." },
    { question: "¿Se liberan los créditos de procesamiento si el escaneo falla o se cancela?", answer: "Los créditos se reservan cuando un archivo validado entra en la cola como tarea. Se liberan cuando el servidor marca la tarea como fallida o cancelada. Pulsar Cancelar durante el procesamiento no los libera hasta que la tarea queda realmente cancelada. Un resultado completado que necesita correcciones, o el rechazo de su propuesta, no libera créditos automáticamente. Cada reintento vuelve a reservar créditos." + " " + getRecognitionPricingCopy("es").refund },
    { question: "¿Cómo uso mi escaneo gratuito único?", answer: getRecognitionPricingCopy("es").freeScope + " " + getRecognitionPricingCopy("es").laneGuide },
    { question: "¿Cómo elijo entre el escaneo simple y el complejo?", answer: getRecognitionPricingCopy("es").billing + " " + getRecognitionPricingCopy("es").passScope + " " + getRecognitionPricingCopy("es").starterScope },
    { question: "¿Puedo usar el resultado en un ensayo inmediatamente?", answer: "Primero compara las alturas, el ritmo y las partes y los compases incluidos con la partitura original; después escucha el resultado. El reconocimiento genera una propuesta que debes revisar y confirmar antes de ensayar." },
  ],
  de: [
    { question: "Was kann ich bei einer handgeschriebenen Partitur erwarten?", answer: "Der Scanner verarbeitet hauptsächlich gut lesbare, gedruckte Noten auf Notenlinien. Handschriftliche Partituren werden nicht zuverlässig unterstützt; ein brauchbares Erkennungsergebnis lässt sich nicht garantieren." },
    { question: "Welche Fotoformate kann ich hochladen und wie sollte ich fotografieren?", answer: "Unterstützt werden PDF, PNG, JPG/JPEG, WebP und TIFF. Legen Sie die Seite flach hin, halten Sie die Handykamera parallel zum Papier und sorgen Sie für gleichmäßiges Licht. Alle Noten müssen im Bild bleiben; vermeiden Sie Unschärfe und abgeschnittene Ränder." },
    { question: "Werden Credits bei einem fehlgeschlagenen oder abgebrochenen Scan freigegeben?", answer: "Credits werden reserviert, sobald eine geprüfte Datei als Auftrag in die Warteschlange kommt. Sie werden freigegeben, wenn der Server den Auftrag als fehlgeschlagen oder abgebrochen einstuft. Ein Klick auf Abbrechen während der Verarbeitung gibt sie erst frei, wenn der Auftrag tatsächlich den Status Abgebrochen erreicht. Ein abgeschlossenes Ergebnis mit Korrekturbedarf oder das Ablehnen des Vorschlags führt nicht automatisch zur Freigabe. Bei einem erneuten Versuch werden Credits erneut reserviert." + " " + getRecognitionPricingCopy("de").refund },
    { question: "Wie nutze ich meinen einmaligen kostenlosen Scan?", answer: getRecognitionPricingCopy("de").freeScope + " " + getRecognitionPricingCopy("de").laneGuide },
    { question: "Wie wähle ich zwischen einfachem und komplexem Scan?", answer: getRecognitionPricingCopy("de").billing + " " + getRecognitionPricingCopy("de").passScope + " " + getRecognitionPricingCopy("de").starterScope },
    { question: "Kann ich das Scanergebnis sofort für eine Probe verwenden?", answer: "Vergleichen Sie zuerst Tonhöhen, Rhythmen sowie die erfassten Stimmen und Takte mit der Vorlage und hören Sie anschließend das Ergebnis an. Die maschinelle Erkennung erstellt einen Vorschlag, den Sie vor der Probe prüfen und bestätigen müssen." },
  ],
  ru: [
    { question: "Какого результата ожидать от рукописной партитуры?", answer: "Сканер в первую очередь обрабатывает чёткие печатные ноты на нотном стане. Надёжное распознавание рукописных партитур не поддерживается, и пригодный для работы результат не гарантируется." },
    { question: "Какие форматы фотографий можно загрузить и как лучше снимать?", answer: "Можно загружать PDF, PNG, JPG/JPEG, WebP и TIFF. Разложите страницу ровно, держите камеру телефона параллельно бумаге и обеспечьте равномерное освещение. Все ноты должны попасть в кадр; избегайте смазывания и обрезанных краёв." },
    { question: "Освобождаются ли кредиты, если сканирование завершилось сбоем или было отменено?", answer: "Кредиты резервируются, когда проверенный файл становится заданием в очереди. Они освобождаются, когда сервер переводит задание в состояние сбоя или отмены. Нажатие «Отменить» во время обработки не освобождает кредиты до фактического перехода задания в состояние отмены. Завершённый результат, требующий правки, или отклонение предложенного результата не ведут к автоматическому освобождению кредитов. При повторной попытке кредиты резервируются заново." + " " + getRecognitionPricingCopy("ru").refund },
    { question: "Как воспользоваться моим единственным бесплатным сканированием?", answer: getRecognitionPricingCopy("ru").freeScope + " " + getRecognitionPricingCopy("ru").laneGuide },
    { question: "Как выбрать между простым и сложным режимами?", answer: getRecognitionPricingCopy("ru").billing + " " + getRecognitionPricingCopy("ru").passScope + " " + getRecognitionPricingCopy("ru").starterScope },
    { question: "Можно ли сразу использовать результат на репетиции?", answer: "Сначала сверьте высоты нот, ритм, а также распознанные партии и такты с оригиналом, затем прослушайте результат. Машинное распознавание создаёт предварительный вариант, который нужно проверить и подтвердить перед репетицией." },
  ],
  fr: [
    { question: "Quel résultat attendre d’une partition manuscrite ?", answer: "Le scanner traite principalement des partitions imprimées sur portée, bien lisibles. Les partitions manuscrites ne sont pas prises en charge de manière fiable et un résultat exploitable ne peut pas être garanti." },
    { question: "Quels formats de photo puis-je importer et comment prendre la photo ?", answer: "Vous pouvez importer des fichiers PDF, PNG, JPG/JPEG, WebP et TIFF. Pour une photo de téléphone, posez la page à plat, gardez l’appareil parallèle au papier et utilisez une lumière uniforme. Toutes les notes doivent rester dans le cadre ; évitez le flou et les bords coupés." },
    { question: "Les crédits sont-ils libérés si le scan échoue ou est annulé ?", answer: "Les crédits sont réservés lorsqu’un fichier validé devient un traitement en file d’attente. Ils sont libérés lorsque le serveur marque le traitement comme échoué ou annulé. Cliquer sur Annuler pendant le traitement ne les libère qu’une fois l’annulation effective. Un résultat terminé qui nécessite des corrections, ou le rejet de la proposition, ne libère pas automatiquement les crédits. Une nouvelle tentative les réserve à nouveau." + " " + getRecognitionPricingCopy("fr").refund },
    { question: "Comment utiliser mon scan gratuit unique ?", answer: getRecognitionPricingCopy("fr").freeScope + " " + getRecognitionPricingCopy("fr").laneGuide },
    { question: "Comment choisir entre le scan simple et le scan complexe ?", answer: getRecognitionPricingCopy("fr").billing + " " + getRecognitionPricingCopy("fr").passScope + " " + getRecognitionPricingCopy("fr").starterScope },
    { question: "Le résultat peut-il servir immédiatement en répétition ?", answer: "Comparez d’abord les hauteurs, le rythme, ainsi que les parties et les mesures couvertes avec la partition originale, puis écoutez le résultat. La reconnaissance produit une proposition que vous devez encore vérifier et confirmer avant la répétition." },
  ],
  "zh-CN": [
    { question: "上传手写乐谱时，应该怎样预期结果？", answer: "目前主要处理清晰的印刷五线谱，尚不支持可靠的手写识别，不能保证手写乐谱能得到可用结果。" },
    { question: "手机照片支持哪些格式，怎样拍摄更合适？", answer: "支持 PDF、PNG、JPG/JPEG、WebP 和 TIFF 文件。手机拍照时请把纸面放平，让镜头与纸面平行、光线均匀，保留完整音符，避免模糊或裁掉页面边缘。" },
    { question: "扫谱失败或取消后，处理积分会释放吗？", answer: "上传文件通过校验并进入任务队列时会预占积分。后台真正将任务标为失败或已取消后，会释放积分；处理中点击取消，需要等任务实际进入已取消状态。识别已完成但需要人工修正，或用户拒绝识别候选，都不代表自动释放积分。重试会重新预占积分。" + " " + getRecognitionPricingCopy("zh-CN").refund },
    { question: "终身一次的免费扫谱资格怎么用？", answer: getRecognitionPricingCopy("zh-CN").freeScope + " " + getRecognitionPricingCopy("zh-CN").laneGuide },
    { question: "如何选择简单扫谱和复杂扫谱？", answer: getRecognitionPricingCopy("zh-CN").billing + " " + getRecognitionPricingCopy("zh-CN").passScope + " " + getRecognitionPricingCopy("zh-CN").starterScope },
    { question: "识别结果可以立刻拿去排练吗？", answer: "请先对照原谱检查音高、节奏，以及识别覆盖的声部和小节，再试听结果。机器识别生成的是候选，排练前仍需要你校对并确认。" },
  ],
  "zh-TW": [
    { question: "上傳手寫樂譜時，應該如何預期結果？", answer: "目前主要處理清晰的印刷五線譜，尚無法可靠辨識手寫內容，不能保證手寫樂譜能產生可用結果。" },
    { question: "手機照片支援哪些格式，怎麼拍比較合適？", answer: "支援 PDF、PNG、JPG/JPEG、WebP 和 TIFF 檔案。請將紙面放平，讓鏡頭與紙面平行，保持光線均勻，保留完整音符，避免模糊或裁切頁面邊緣。" },
    { question: "辨識失敗或取消後，處理點數會釋放嗎？", answer: "上傳檔案通過檢查並進入工作佇列時會預先占用點數。伺服器實際將工作標為失敗或已取消後，才會釋放點數；處理中按下取消，要等工作確實進入已取消狀態。辨識已完成但需要人工修正，或拒絕辨識候選，都不會自動釋放點數。重新嘗試會再次預先占用點數。" + " " + getRecognitionPricingCopy("zh-TW").refund },
    { question: "終身一次的免費辨識資格怎麼使用？", answer: getRecognitionPricingCopy("zh-TW").freeScope + " " + getRecognitionPricingCopy("zh-TW").laneGuide },
    { question: "簡單辨識和複雜辨識應該怎麼選？", answer: getRecognitionPricingCopy("zh-TW").billing + " " + getRecognitionPricingCopy("zh-TW").passScope + " " + getRecognitionPricingCopy("zh-TW").starterScope },
    { question: "辨識結果可以直接拿去排練嗎？", answer: "請先對照原譜檢查音高、節奏，以及辨識涵蓋的聲部和小節，再試聽結果。機器辨識產生的是候選，排練前仍需要你校對並確認。" },
  ],
  ja: [
    { question: "手書きの楽譜では、どのような結果を期待できますか？", answer: "主な対象は、鮮明に印刷された五線譜です。手書きの楽譜を安定して認識することには対応しておらず、使える結果が得られるとは保証できません。" },
    { question: "写真はどの形式に対応し、どのように撮影すればよいですか？", answer: "PDF、PNG、JPG/JPEG、WebP、TIFF に対応しています。スマートフォンで撮影する際は紙を平らに置き、カメラを紙面と平行にして、均一な明るさで撮ってください。音符をすべて画面に収め、ぼけやページ端の切れを避けてください。" },
    { question: "読み取りが失敗またはキャンセルされた場合、クレジットは解放されますか？", answer: "ファイルの検証後、処理が待ち行列に入るとクレジットが仮確保されます。サーバーが処理を失敗またはキャンセル済みと判定した時点で解放されます。処理中にキャンセルを押しても、実際にキャンセル済みになるまでは解放されません。完了した結果に修正が必要な場合や、候補を却下した場合は、自動的には解放されません。再試行では改めて仮確保されます。" + " " + getRecognitionPricingCopy("ja").refund },
    { question: "アカウントで一度だけの無料読み取りはどう使いますか？", answer: getRecognitionPricingCopy("ja").freeScope + " " + getRecognitionPricingCopy("ja").laneGuide },
    { question: "シンプルモードと複雑モードはどう選びますか？", answer: getRecognitionPricingCopy("ja").billing + " " + getRecognitionPricingCopy("ja").passScope + " " + getRecognitionPricingCopy("ja").starterScope },
    { question: "読み取り結果をすぐにリハーサルで使えますか？", answer: "まず原譜と音高、リズム、認識されたパートと小節の範囲を照合し、その後に試聴してください。機械認識で作成されるのは候補なので、リハーサル前にご自身で校正し、確認する必要があります。" },
  ],
  ko: [
    { question: "손으로 쓴 악보에서는 어떤 결과를 기대할 수 있나요?", answer: "주로 선명하게 인쇄된 오선보를 처리합니다. 손으로 쓴 악보를 안정적으로 인식하는 기능은 지원하지 않으며, 사용할 수 있는 결과를 보장할 수 없습니다." },
    { question: "사진은 어떤 형식을 지원하고 어떻게 찍어야 하나요?", answer: "PDF, PNG, JPG/JPEG, WebP, TIFF 파일을 지원합니다. 휴대폰으로 촬영할 때는 종이를 평평하게 놓고 카메라를 종이와 평행하게 유지하며 균일한 조명을 사용하세요. 모든 음표가 화면에 들어오게 하고 흐릿한 사진이나 잘린 페이지 가장자리는 피하세요." },
    { question: "스캔이 실패하거나 취소되면 처리 크레딧이 해제되나요?", answer: "파일 검증 후 작업이 대기열에 들어가면 크레딧이 미리 확보됩니다. 서버가 작업을 실패 또는 취소 상태로 바꾸면 확보된 크레딧이 해제됩니다. 처리 중 취소를 눌러도 실제로 취소 상태가 되기 전에는 해제되지 않습니다. 완료된 결과에 수정이 필요하거나 인식 후보를 거부한 경우에는 크레딧이 자동으로 해제되지 않습니다. 재시도 시 크레딧을 다시 확보합니다." + " " + getRecognitionPricingCopy("ko").refund },
    { question: "계정당 한 번의 무료 스캔은 어떻게 사용하나요?", answer: getRecognitionPricingCopy("ko").freeScope + " " + getRecognitionPricingCopy("ko").laneGuide },
    { question: "간단 스캔과 복잡 스캔은 어떻게 선택하나요?", answer: getRecognitionPricingCopy("ko").billing + " " + getRecognitionPricingCopy("ko").passScope + " " + getRecognitionPricingCopy("ko").starterScope },
    { question: "스캔 결과를 곧바로 합주나 연습에 써도 되나요?", answer: "먼저 원본과 음높이, 리듬, 인식된 파트와 마디 범위를 비교한 다음 결과를 들어 보세요. 기계가 만든 결과는 후보이므로 연습 전에 직접 검토하고 확인해야 합니다." },
  ],
};

export function getScannerFaq(locale: SupportedLocale): ScannerFaq[] {
  return scannerFaqs[locale];
}
