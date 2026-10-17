import { getRecognitionPricingCopy } from "./recognition-pricing-copy";
import type { SupportedLocale } from "@score/i18n";
import { getSingleScorePassCopy } from "@score/shared";
import { pricingFacts } from "./pricing-facts";

export type PricingIntroCopy = {
  freeTitle: string;
  freeDescription: string;
  passTitle: string;
  passDescription: string;
  notes: readonly string[];
  freeCta: string;
  passCta: string;
  comparisonNote: string;
};

export type CreditGuideCopy = {
  title: string;
  description: string;
  columns: readonly [string, string, string];
  rows: readonly { operation: string; cost: string; detail: string }[];
  examplesTitle: string;
  examples: readonly string[];
  rulesTitle: string;
  rules: readonly { title: string; body: string }[];
};

export type PurchaseFaq = { question: string; answer: string };

const s = pricingFacts.simpleScanCredits;
const c = pricingFacts.complexScanCredits;
const q = pricingFacts.queuedJobCredits;
const z = pricingFacts.unmeteredOperationCredits;
const free = pricingFacts.freeMonthlyCredits;
const starter = pricingFacts.starterMonthlyCredits;
const pro = pricingFacts.proMonthlyCredits;
const pass = pricingFacts.oneScorePassCredits;
const scans = pricingFacts.freeScanJobs;
const capacity = (credits: number, cost: number) => Math.floor(credits / cost);

function passPrice(locale: SupportedLocale) {
  const amount = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(pricingFacts.oneScorePassPriceUsd);
  return ["fr", "es", "de", "ru"].includes(locale) ? `${amount} USD` : `US$${amount}`;
}

const intro: Record<SupportedLocale, PricingIntroCopy> = {
  en: {
    freeTitle: `Scan ${scans} complete score free, once in your account’s lifetime.`,
    freeDescription: getRecognitionPricingCopy("en").freeScope + " " + getRecognitionPricingCopy("en").laneGuide,
    passTitle: `Your next score: One Score Pass for ${passPrice("en")}.`,
    passDescription: getRecognitionPricingCopy("en").passScope,
    notes: [getRecognitionPricingCopy("en").passFirst, `${pass} processing credits for this score`, "One-time payment", "No automatic renewal"],
    freeCta: "Start free",
    passCta: "Buy One Score Pass",
    comparisonNote: getRecognitionPricingCopy("en").starterScope,
  },
  "zh-CN": {
    freeTitle: `每个账号可免费扫 ${scans} 首完整乐谱，终身仅一次。`,
    freeDescription: getRecognitionPricingCopy("zh-CN").freeScope + " " + getRecognitionPricingCopy("zh-CN").laneGuide,
    passTitle: `下一首：${getSingleScorePassCopy("zh-CN").name} ${passPrice("zh-CN")}。`,
    passDescription: getRecognitionPricingCopy("zh-CN").passScope,
    notes: [getRecognitionPricingCopy("zh-CN").passFirst, `这首乐谱专属 ${pass} 个处理积分`, "一次付款", "不自动续费"],
    freeCta: "免费开始",
    passCta: "买单谱通行证",
    comparisonNote: getRecognitionPricingCopy("zh-CN").starterScope,
  },
  "zh-TW": {
    freeTitle: `每個帳號可免費辨識 ${scans} 首完整樂譜，帳號終身僅一次。`,
    freeDescription: getRecognitionPricingCopy("zh-TW").freeScope + " " + getRecognitionPricingCopy("zh-TW").laneGuide,
    passTitle: `下一首：${getSingleScorePassCopy("zh-TW").name} ${passPrice("zh-TW")}。`,
    passDescription: getRecognitionPricingCopy("zh-TW").passScope,
    notes: [getRecognitionPricingCopy("zh-TW").passFirst, `這首樂譜專屬 ${pass} 個處理點數`, "一次付款", "不自動續費"],
    freeCta: "免費開始",
    passCta: "購買單譜通行證",
    comparisonNote: getRecognitionPricingCopy("zh-TW").starterScope,
  },
  ja: {
    freeTitle: `アカウントごとに、楽譜 ${scans} 曲全体を生涯に一度だけ無料で読み取れます。`,
    freeDescription: getRecognitionPricingCopy("ja").freeScope + " " + getRecognitionPricingCopy("ja").laneGuide,
    passTitle: `次の楽譜には、${getSingleScorePassCopy("ja").name}を ${passPrice("ja")} で。`,
    passDescription: getRecognitionPricingCopy("ja").passScope,
    notes: [getRecognitionPricingCopy("ja").passFirst, `この楽譜専用の処理クレジット ${pass}`, "1回払い", "自動更新なし"],
    freeCta: "無料で始める",
    passCta: "1曲パスを購入",
    comparisonNote: getRecognitionPricingCopy("ja").starterScope,
  },
  ko: {
    freeTitle: `계정당 악보 ${scans} 곡 전체를 평생 한 번 무료로 스캔할 수 있습니다.`,
    freeDescription: getRecognitionPricingCopy("ko").freeScope + " " + getRecognitionPricingCopy("ko").laneGuide,
    passTitle: `다음 악보는 ${getSingleScorePassCopy("ko").name} ${passPrice("ko")}로.`,
    passDescription: getRecognitionPricingCopy("ko").passScope,
    notes: [getRecognitionPricingCopy("ko").passFirst, `해당 악보 전용 처리 크레딧 ${pass}개`, "일회성 결제", "자동 갱신 없음"],
    freeCta: "무료로 시작",
    passCta: "한 곡 이용권 구매",
    comparisonNote: getRecognitionPricingCopy("ko").starterScope,
  },
  fr: {
    freeTitle: `Scannez ${scans} partition complète gratuitement, une seule fois sur toute la durée de vie du compte.`,
    freeDescription: getRecognitionPricingCopy("fr").freeScope + " " + getRecognitionPricingCopy("fr").laneGuide,
    passTitle: `Pour la suivante : One Score Pass à ${passPrice("fr")}.`,
    passDescription: getRecognitionPricingCopy("fr").passScope,
    notes: [getRecognitionPricingCopy("fr").passFirst, `${pass} crédits de traitement pour cette partition`, "Paiement unique", "Sans renouvellement automatique"],
    freeCta: "Commencer gratuitement",
    passCta: "Acheter le pass une partition",
    comparisonNote: getRecognitionPricingCopy("fr").starterScope,
  },
  es: {
    freeTitle: `Escanea ${scans} partitura completa gratis, una sola vez durante la vida de tu cuenta.`,
    freeDescription: getRecognitionPricingCopy("es").freeScope + " " + getRecognitionPricingCopy("es").laneGuide,
    passTitle: `Para tu próxima partitura: One Score Pass por ${passPrice("es")}.`,
    passDescription: getRecognitionPricingCopy("es").passScope,
    notes: [getRecognitionPricingCopy("es").passFirst, `${pass} créditos de procesamiento para esta partitura`, "Pago único", "Sin renovación automática"],
    freeCta: "Empezar gratis",
    passCta: "Comprar pase para una partitura",
    comparisonNote: getRecognitionPricingCopy("es").starterScope,
  },
  de: {
    freeTitle: `Scannen Sie ${scans} vollständige Partitur kostenlos, einmal während der gesamten Laufzeit Ihres Kontos.`,
    freeDescription: getRecognitionPricingCopy("de").freeScope + " " + getRecognitionPricingCopy("de").laneGuide,
    passTitle: `Für Ihre nächste Partitur: One Score Pass für ${passPrice("de")}.`,
    passDescription: getRecognitionPricingCopy("de").passScope,
    notes: [getRecognitionPricingCopy("de").passFirst, `${pass} Verarbeitungscredits für diese Partitur`, "Einmalzahlung", "Keine automatische Verlängerung"],
    freeCta: "Kostenlos beginnen",
    passCta: "Einzelpartitur-Pass kaufen",
    comparisonNote: getRecognitionPricingCopy("de").starterScope,
  },
  ru: {
    freeTitle: `Отсканируйте ${scans} полную партитуру бесплатно, один раз за всё время существования аккаунта.`,
    freeDescription: getRecognitionPricingCopy("ru").freeScope + " " + getRecognitionPricingCopy("ru").laneGuide,
    passTitle: `Для следующей партитуры: One Score Pass за ${passPrice("ru")}.`,
    passDescription: getRecognitionPricingCopy("ru").passScope,
    notes: [getRecognitionPricingCopy("ru").passFirst, `${pass} кредитов обработки для этой партитуры`, "Разовая оплата", "Без автопродления"],
    freeCta: "Начать бесплатно",
    passCta: "Купить пакет для одной партитуры",
    comparisonNote: getRecognitionPricingCopy("ru").starterScope,
  },
};

const guides: Record<SupportedLocale, CreditGuideCopy> = {
  en: {
    title: "What can you do with your credits?",
    description: getRecognitionPricingCopy("en").billing,
    columns: ["Operation", "Processing credits", "What this covers"],
    rows: [
      { operation: "Simple scan", cost: `${s} credit per job`, detail: getRecognitionPricingCopy("en").laneGuide },
      { operation: "Complex scan", cost: `${c} credits per job`, detail: "Internal recognition-engine attempts within the same job do not add charges." },
      { operation: "Generate MusicXML, MIDI, PDF, SVG, PNG, WAV or MP3 exports", cost: `${q} credit per queued export job`, detail: "Generating a file again creates a new job." },
      { operation: "Download an already-generated file", cost: `${z} processing credits`, detail: "Access to the score is still required." },
      { operation: "View, play, proofread, save note edits, transpose or preview Jianpu", cost: `${z} processing credits`, detail: "These actions do not create processing jobs. Access and storage limits still apply." },
      { operation: "Direct Jianpu TXT or Score JSON export", cost: `${z} processing credits`, detail: "These direct exports do not create queued export jobs." },
      { operation: "Other processing that actually enters the queue", cost: `Usually ${q} credit per job`, detail: "For example, audio transcription if enabled. This does not mean a disabled feature is available." },
    ],
    examplesTitle: "Work out your processing budget",
    examples: [
      "The scan counts below assume no exports or other processing. Mixed use draws from the remaining balance.",
      `${starter} credits cover up to ${capacity(starter, s)} simple scan jobs or ${capacity(starter, c)} complex scan jobs.`,
      `${pro} credits cover up to ${capacity(pro, s)} simple scan jobs or ${capacity(pro, c)} complex scan jobs.`,
      `A One Score Pass contains ${pass} credits bound to the same one score: a simple scan uses ${s} and leaves ${pass - s}; a complex scan uses ${c} and leaves ${pass - c}. These are not credits for ${pass} different scores.` + " " + getRecognitionPricingCopy("en").passScope,
      `The free plan’s ${free} monthly credits are a processing budget for existing projects, not ${free} free new scans each month. A new free scan is limited to ${scans} in your account’s lifetime, in simple mode only.`,
    ],
    rulesTitle: "How credits are reserved and renewed",
    rules: [
      { title: "When credits are reserved", body: "Credits are reserved after upload validation, when a processing job is created and queued. They are not charged before upload or after proofreading. Internal rotation or recognition attempts within that job do not add charges." },
      { title: "Failures, cancellations and retries", body: "Reserved credits are released when the backend marks a job failed or cancelled. Cancelling a running job requires it to reach the cancelled state first. A successful result that needs correction, or a rejected candidate, does not automatically return credits. A retry reserves credits again. Failed or cancelled free scan jobs do not count against lifetime free eligibility." + " " + getRecognitionPricingCopy("en").refund },
      { title: "Monthly, prepaid and score-bound credits", body: "Monthly credits reset at the start of each UTC calendar month; unused monthly credits do not roll over or become prepaid balance. Prepaid balances have no monthly reset or expiry and decrease with use. One Score Pass credits do not refresh monthly and remain bound to that one score." },
      { title: "Which balance pays for a job", body: `An eligible monthly allowance is used first, then enough prepaid balance or an eligible One Score Pass when available. A single job needs enough credits in one source; two insufficient balances are not combined. An account with only prepaid purchases and no other monthly entitlement gets no extra ${free} monthly credits. Free-scan eligibility is separate from the processing budget: the free simple scan also reserves ${s} credit.` },
      { title: "Credits and access are different", body: "Zero-credit actions still depend on your valid access, score permissions and storage allowance. A past prepaid purchase can preserve prepaid access even after its processing balance is exhausted, but new jobs still need enough remaining credits. A lower storage allowance can restrict new uploads or generation; it does not automatically delete saved scores." },
    ],
  },
  "zh-CN": {
    title: "积分能做什么？",
    description: getRecognitionPricingCopy("zh-CN").billing,
    columns: ["操作", "处理积分费用", "说明"],
    rows: [
      { operation: "简单扫谱", cost: `${s} 积分／任务`, detail: getRecognitionPricingCopy("zh-CN").laneGuide },
      { operation: "复杂扫谱", cost: `${c} 积分／任务`, detail: "同一任务内部的多引擎识别尝试不另收费。" },
      { operation: "生成 MusicXML、MIDI、PDF、SVG、PNG、WAV、MP3 导出文件", cost: `${q} 积分／入队导出任务`, detail: "重新生成文件会创建新的导出任务。" },
      { operation: "下载已生成的文件", cost: `${z} 个处理积分`, detail: "仍需拥有该乐谱的访问权限。" },
      { operation: "查看、试听、校对确认、保存音符修改、同步移调、简谱预览", cost: `${z} 个处理积分`, detail: "这些操作不新建处理任务，访问权限和存储限制仍适用。" },
      { operation: "简谱 TXT、Score JSON 直接导出", cost: `${z} 个处理积分`, detail: "现有直接导出不创建入队导出任务。" },
      { operation: "其他真正进入队列的处理任务", cost: `通常 ${q} 积分／任务`, detail: "例如开放后的音频转谱；这不表示尚未开放的功能已经可用。" },
    ],
    examplesTitle: "算一算处理预算",
    examples: [
      "以下扫谱次数以不做导出或其他处理为前提；混用时按剩余额度扣除。",
      `${starter} 积分最多支持 ${capacity(starter, s)} 次简单扫谱，或 ${capacity(starter, c)} 次复杂扫谱。`,
      `${pro} 积分最多支持 ${capacity(pro, s)} 次简单扫谱，或 ${capacity(pro, c)} 次复杂扫谱。`,
      `单谱通行证的 ${pass} 积分只用于绑定的同一首乐谱：简单识别用 ${s} 分，剩 ${pass - s} 分；复杂识别用 ${c} 分，剩 ${pass - c} 分。这不是 ${pass} 首不同乐谱的额度。` + " " + getRecognitionPricingCopy("zh-CN").passScope,
      `免费档每月 ${free} 积分是已有项目的处理预算，不是每月免费扫 ${free} 首新谱。免费扫新谱仍是每个账号终身 ${scans} 次，仅限简单模式。`,
    ],
    rulesTitle: "积分何时预占，如何重置？",
    rules: [
      { title: "预占时机", body: "上传通过校验、处理任务创建并进入队列时才预占积分；不是上传前，也不是校对后。一个任务内部的旋转或识别尝试不另收费。" },
      { title: "失败、取消与重试", body: "后台将任务标记为失败或已取消后，会释放预占积分。运行中点击取消，要等后台真正进入已取消状态。成功生成但需要人工修正，或拒绝候选结果，不会自动退分。重试会重新预占积分；失败或已取消的免费扫谱任务不计入终身免费次数。" + " " + getRecognitionPricingCopy("zh-CN").refund },
      { title: "月度、预付与单首包", body: "月度积分按 UTC 自然月月初重置，未用积分不结转，也不变为预付余额。预付余额不按月重置、无到期日，随使用量减少。单谱通行证积分不按月刷新，始终只用于绑定的那一首乐谱。" },
      { title: "一个任务从哪里扣分", body: `有资格用于该任务的月额度优先使用；不足时，使用足够的预付余额或符合条件的单谱通行证。单个任务必须由一个来源完整支付，不会拼接两个不足的额度池。只有预付购买、没有其他月度权益的账号，不会每月另送 ${free} 积分。免费资格与处理预算是两回事，免费简单扫谱也会预占 ${s} 积分。` },
      { title: "积分与访问权限不同", body: "零积分操作仍受有效权益、乐谱访问权限和存储额度限制。曾购买的预付包可能在积分耗尽后仍保留预付访问资格，但新任务仍需足够的剩余积分。存储额度降低可能限制新增上传或生成，不会因此自动删除已保存乐谱。" },
    ],
  },
  "zh-TW": {
    title: "點數能做什麼？",
    description: getRecognitionPricingCopy("zh-TW").billing,
    columns: ["操作", "處理點數費用", "說明"],
    rows: [
      { operation: "簡單辨識", cost: `${s} 點／任務`, detail: getRecognitionPricingCopy("zh-TW").laneGuide },
      { operation: "複雜辨識", cost: `${c} 點／任務`, detail: "同一任務內部的多引擎辨識嘗試不另收費。" },
      { operation: "產生 MusicXML、MIDI、PDF、SVG、PNG、WAV、MP3 匯出檔案", cost: `${q} 點／排程匯出任務`, detail: "重新產生檔案會建立新的匯出任務。" },
      { operation: "下載已產生的檔案", cost: `${z} 個處理點數`, detail: "仍須擁有該樂譜的存取權限。" },
      { operation: "檢視、試聽、校對確認、儲存音符修改、同步移調、簡譜預覽", cost: `${z} 個處理點數`, detail: "這些操作不建立處理任務，存取權限及儲存限制仍適用。" },
      { operation: "簡譜 TXT、Score JSON 直接匯出", cost: `${z} 個處理點數`, detail: "現有直接匯出不建立排程匯出任務。" },
      { operation: "其他實際進入佇列的處理任務", cost: `通常 ${q} 點／任務`, detail: "例如開放後的音訊轉譜；不表示尚未開放的功能已可使用。" },
    ],
    examplesTitle: "估算處理預算",
    examples: [
      "以下辨識次數以不做匯出或其他處理為前提；混合使用時從剩餘額度扣除。",
      `${starter} 點最多可做 ${capacity(starter, s)} 次簡單辨識，或 ${capacity(starter, c)} 次複雜辨識。`,
      `${pro} 點最多可做 ${capacity(pro, s)} 次簡單辨識，或 ${capacity(pro, c)} 次複雜辨識。`,
      `單譜通行證的 ${pass} 點只用於綁定的同一首樂譜：簡單辨識用 ${s} 點，剩 ${pass - s} 點；複雜辨識用 ${c} 點，剩 ${pass - c} 點。這不是 ${pass} 首不同樂譜的額度。` + " " + getRecognitionPricingCopy("zh-TW").passScope,
      `免費方案每月 ${free} 點是既有專案的處理預算，不是每月免費辨識 ${free} 首新譜。免費辨識新譜仍是每個帳號終身 ${scans} 次，僅限簡單模式。`,
    ],
    rulesTitle: "點數何時預留，如何重設？",
    rules: [
      { title: "預留時機", body: "上傳通過驗證、處理任務建立並進入佇列時才預留點數，不是上傳前，也不是校對後。一個任務內部的旋轉或辨識嘗試不另收費。" },
      { title: "失敗、取消與重試", body: "後台將任務標記為失敗或已取消後，會釋放預留點數。執行中按下取消，須等後台真正進入已取消狀態。成功產生但需要人工修正，或拒絕候選結果，不會自動退點。重試會重新預留點數；失敗或已取消的免費辨識任務不計入終身免費次數。" + " " + getRecognitionPricingCopy("zh-TW").refund },
      { title: "月度、預付與單首包", body: "月度點數於每個 UTC 自然月月初重設，未用點數不累積，也不變成預付餘額。預付餘額不按月重設、無到期日，隨使用量減少。單譜通行證點數不按月更新，始終只用於綁定的那首樂譜。" },
      { title: "一個任務從哪裡扣點", body: `有資格用於該任務的月額度優先使用；不足時，使用足夠的預付餘額或符合條件的單譜通行證。單個任務須由一個來源完整支付，不會合併兩個不足的額度。只有預付購買、沒有其他月度權益的帳號，不會每月另送 ${free} 點。免費資格與處理預算是兩回事，免費簡單辨識也會預留 ${s} 點。` },
      { title: "點數與存取權限不同", body: "零點數操作仍受有效權益、樂譜存取權限及儲存額度限制。曾購買的預付包可能在點數用完後仍保留預付存取資格，但新任務仍須足夠的剩餘點數。儲存額度降低可能限制新增上傳或產生檔案，不會因此自動刪除已儲存樂譜。" },
    ],
  },
  ja: {
    title: "クレジットでできること",
    description: getRecognitionPricingCopy("ja").billing,
    columns: ["操作", "処理クレジット", "内容"],
    rows: [
      { operation: "シンプルモードの読み取り", cost: `1ジョブあたり ${s} クレジット`, detail: getRecognitionPricingCopy("ja").laneGuide },
      { operation: "複雑モードの読み取り", cost: `1ジョブあたり ${c} クレジット`, detail: "同じジョブ内で複数の認識エンジンを試しても、追加費用は発生しません。" },
      { operation: "MusicXML、MIDI、PDF、SVG、PNG、WAV、MP3 の書き出しファイルを生成", cost: `キューに入る書き出し1ジョブあたり ${q} クレジット`, detail: "ファイルを再生成すると、新しい書き出しジョブになります。" },
      { operation: "生成済みのファイルをダウンロード", cost: `処理クレジット ${z}`, detail: "楽譜へのアクセス権は必要です。" },
      { operation: "閲覧、再生、校正の確認、音符の修正保存、移調、Jianpuプレビュー", cost: `処理クレジット ${z}`, detail: "処理ジョブを作成しない操作です。アクセス権と保存容量の制限は適用されます。" },
      { operation: "Jianpu TXT・Score JSON の直接書き出し", cost: `処理クレジット ${z}`, detail: "現在の直接書き出しでは、キューに入る書き出しジョブを作成しません。" },
      { operation: "実際にキューに入るその他の処理", cost: `通常、1ジョブあたり ${q} クレジット`, detail: "有効になっている場合の音声からの採譜などです。無効な機能が利用できるという意味ではありません。" },
    ],
    examplesTitle: "処理できる量の目安",
    examples: [
      "以下の読み取り回数は、書き出しやその他の処理を行わない場合です。組み合わせて使う場合は、残高から各費用が引かれます。",
      `${starter} クレジットなら、最大 ${capacity(starter, s)} 回のシンプル読み取り、または ${capacity(starter, c)} 回の複雑読み取りができます。`,
      `${pro} クレジットなら、最大 ${capacity(pro, s)} 回のシンプル読み取り、または ${capacity(pro, c)} 回の複雑読み取りができます。`,
      `1曲パスの ${pass} クレジットは、紐付けた同じ1曲専用です。シンプル読み取りは ${s} を使い、残り ${pass - s}。複雑読み取りは ${c} を使い、残り ${pass - c} です。別々の ${pass} 曲を読み取るための枠ではありません。` + " " + getRecognitionPricingCopy("ja").passScope,
      `無料プランの月 ${free} クレジットは、既存プロジェクトの処理予算です。毎月 ${free} 曲の新しい楽譜を無料で読み取れるわけではありません。新しい楽譜の無料読み取りは、アカウントの生涯で ${scans} 回、シンプルモードに限ります。`,
    ],
    rulesTitle: "クレジットの確保と更新",
    rules: [
      { title: "クレジットを確保するタイミング", body: "アップロードの検証後、処理ジョブを作成してキューに入れるときにクレジットを確保します。アップロード前や校正後ではありません。同じジョブ内での回転や認識の試行に追加費用はかかりません。" },
      { title: "失敗、キャンセル、再試行", body: "サーバー側でジョブが失敗またはキャンセル済みになると、確保したクレジットを返還します。実行中のキャンセルは、キャンセル済みになるまで返還されません。生成に成功した結果の修正や候補の却下では、自動返還されません。再試行時は改めてクレジットを確保します。失敗・キャンセル済みの無料読み取りは、生涯の無料回数に数えません。" + " " + getRecognitionPricingCopy("ja").refund },
      { title: "月間枠、プリペイド、1曲パス", body: "月間クレジットは UTC の各暦月の初めにリセットされ、未使用分の繰り越しやプリペイド残高への移行はありません。プリペイド残高は月ごとにリセットされず、有効期限もなく、使用量に応じて減ります。1曲パスは毎月補充されず、紐付けた楽譜だけに使えます。" },
      { title: "ジョブに使う残高", body: `そのジョブに利用できる月間枠を優先し、不足すると十分なプリペイド残高または対象の1曲パスを使います。1つのジョブは、1つの残高で全額をまかなう必要があります。不足する2つの残高は合算しません。プリペイド購入のみで他の月間利用権がないアカウントには、毎月 ${free} クレジットが追加されることはありません。無料資格と処理予算は別で、無料のシンプル読み取りも ${s} クレジットを確保します。` },
      { title: "クレジットとアクセス権", body: "クレジット不要の操作にも、有効な利用権、楽譜へのアクセス権、保存容量の制限が適用されます。過去のプリペイド購入によるアクセス権は、残高を使い切った後も残る場合がありますが、新しいジョブには十分な残高が必要です。保存容量の減少で新規アップロードや生成が制限されても、保存済みの楽譜が自動削除されるわけではありません。" },
    ],
  },
  ko: {
    title: "크레딧으로 무엇을 할 수 있나요?",
    description: getRecognitionPricingCopy("ko").billing,
    columns: ["작업", "처리 크레딧", "설명"],
    rows: [
      { operation: "간단 스캔", cost: `작업당 ${s} 크레딧`, detail: getRecognitionPricingCopy("ko").laneGuide },
      { operation: "복잡 스캔", cost: `작업당 ${c} 크레딧`, detail: "같은 작업 안에서 여러 인식 엔진을 시도해도 추가로 차감하지 않습니다." },
      { operation: "MusicXML, MIDI, PDF, SVG, PNG, WAV, MP3 내보내기 파일 생성", cost: `대기열에 등록되는 내보내기 작업당 ${q} 크레딧`, detail: "파일을 다시 생성하면 새 내보내기 작업이 만들어집니다." },
      { operation: "이미 생성된 파일 다운로드", cost: `처리 크레딧 ${z}`, detail: "해당 악보에 대한 접근 권한은 필요합니다." },
      { operation: "보기, 재생, 교정 확인, 음표 수정 저장, 조옮김, Jianpu 미리보기", cost: `처리 크레딧 ${z}`, detail: "이 작업들은 처리 작업을 만들지 않습니다. 접근 권한과 저장 공간 제한은 적용됩니다." },
      { operation: "Jianpu TXT·Score JSON 직접 내보내기", cost: `처리 크레딧 ${z}`, detail: "현재 직접 내보내기는 대기열 내보내기 작업을 만들지 않습니다." },
      { operation: "실제로 대기열에 등록되는 기타 처리", cost: `보통 작업당 ${q} 크레딧`, detail: "기능이 활성화된 경우의 오디오 악보 변환 등이 해당됩니다. 아직 비활성화된 기능을 이용할 수 있다는 뜻은 아닙니다." },
    ],
    examplesTitle: "처리할 수 있는 양 계산하기",
    examples: [
      "아래 스캔 횟수는 내보내기나 다른 처리를 하지 않을 때의 기준입니다. 함께 이용하면 각 비용을 남은 잔액에서 차감합니다.",
      `${starter} 크레딧으로 최대 ${capacity(starter, s)}회의 간단 스캔 또는 ${capacity(starter, c)}회의 복잡 스캔을 할 수 있습니다.`,
      `${pro} 크레딧으로 최대 ${capacity(pro, s)}회의 간단 스캔 또는 ${capacity(pro, c)}회의 복잡 스캔을 할 수 있습니다.`,
      `한 곡 이용권의 ${pass} 크레딧은 연결된 동일한 악보 한 곡에만 사용합니다. 간단 인식은 ${s} 크레딧을 사용해 ${pass - s}개가 남고, 복잡 인식은 ${c} 크레딧을 사용해 ${pass - c}개가 남습니다. 서로 다른 악보 ${pass}곡을 처리하는 이용권이 아닙니다.` + " " + getRecognitionPricingCopy("ko").passScope,
      `무료 요금제의 월 ${free} 크레딧은 기존 프로젝트의 처리 예산입니다. 매월 새 악보 ${free}곡을 무료로 스캔하는 혜택이 아닙니다. 새 악보 무료 스캔은 계정당 평생 ${scans}회이며 간단 모드만 가능합니다.`,
    ],
    rulesTitle: "크레딧 예약과 갱신 방식",
    rules: [
      { title: "크레딧 예약 시점", body: "업로드 검증을 통과한 뒤 처리 작업을 만들고 대기열에 등록할 때 크레딧을 예약합니다. 업로드 전이나 교정 후가 아닙니다. 같은 작업 안의 회전 또는 인식 시도에는 추가 비용이 없습니다." },
      { title: "실패, 취소, 재시도", body: "서버가 작업을 실패 또는 취소 완료로 처리하면 예약한 크레딧을 반환합니다. 실행 중 취소를 누르면 실제로 취소 완료 상태가 되어야 반환됩니다. 생성에 성공한 결과의 수정이나 후보 결과 거부는 자동 반환 사유가 아닙니다. 재시도하면 크레딧을 다시 예약합니다. 실패하거나 취소 완료된 무료 스캔은 평생 무료 횟수에 포함하지 않습니다." + " " + getRecognitionPricingCopy("ko").refund },
      { title: "월간, 선불, 한 곡 이용권", body: "월간 크레딧은 UTC 기준 매달 첫날 초기화되며, 미사용분은 이월되거나 선불 잔액으로 바뀌지 않습니다. 선불 잔액은 월간 초기화나 만료 없이 사용량에 따라 줄어듭니다. 한 곡 이용권은 매달 충전되지 않으며 연결된 악보에만 사용합니다." },
      { title: "작업에 사용할 잔액", body: `해당 작업에 사용할 자격이 있는 월간 한도를 먼저 사용하고, 부족하면 충분한 선불 잔액 또는 조건에 맞는 한 곡 이용권을 사용합니다. 한 작업의 전체 비용을 하나의 잔액에서 충당해야 하며, 부족한 두 잔액을 합치지 않습니다. 선불 구매만 있고 다른 월간 이용 권한이 없는 계정에는 매달 ${free} 크레딧을 추가로 제공하지 않습니다. 무료 스캔 자격과 처리 예산은 별개이며, 무료 간단 스캔도 ${s} 크레딧을 예약합니다.` },
      { title: "크레딧과 접근 권한은 별개", body: "크레딧이 들지 않는 작업에도 유효한 이용 권한, 악보 접근 권한, 저장 공간 제한이 적용됩니다. 과거 선불 구매에 따른 접근 자격은 잔액을 모두 쓴 뒤에도 유지될 수 있지만, 새 작업에는 충분한 잔액이 필요합니다. 저장 공간 한도가 줄면 새 업로드나 생성이 제한될 수 있으나 저장된 악보가 자동 삭제되지는 않습니다." },
    ],
  },
  fr: {
    title: "Que pouvez-vous faire avec vos crédits ?",
    description: getRecognitionPricingCopy("fr").billing,
    columns: ["Opération", "Crédits de traitement", "Ce qui est inclus"],
    rows: [
      { operation: "Scan simple", cost: `${s} crédit par tâche`, detail: getRecognitionPricingCopy("fr").laneGuide },
      { operation: "Scan complexe", cost: `${c} crédits par tâche`, detail: "Les essais de plusieurs moteurs au sein de la même tâche ne coûtent pas de crédits supplémentaires." },
      { operation: "Générer un export MusicXML, MIDI, PDF, SVG, PNG, WAV ou MP3", cost: `${q} crédit par tâche d’export mise en file`, detail: "Régénérer un fichier crée une nouvelle tâche." },
      { operation: "Télécharger un fichier déjà généré", cost: `${z} crédit de traitement`, detail: "Un droit d’accès à la partition reste nécessaire." },
      { operation: "Consulter, écouter, valider une correction, enregistrer des notes modifiées, transposer ou prévisualiser le Jianpu", cost: `${z} crédit de traitement`, detail: "Ces opérations ne créent pas de tâche de traitement. Les droits d’accès et le quota de stockage s’appliquent." },
      { operation: "Export direct en Jianpu TXT ou Score JSON", cost: `${z} crédit de traitement`, detail: "Ces exports directs ne créent pas de tâche d’export mise en file." },
      { operation: "Autre traitement réellement mis en file", cost: `Généralement ${q} crédit par tâche`, detail: "Par exemple, la transcription audio si elle est activée. Cela ne rend pas disponible une fonction désactivée." },
    ],
    examplesTitle: "Estimez votre budget de traitement",
    examples: [
      "Les nombres de scans ci-dessous supposent qu’aucun export ni autre traitement n’est effectué. En usage mixte, chaque coût est déduit du solde restant.",
      `${starter} crédits permettent jusqu’à ${capacity(starter, s)} scans simples ou ${capacity(starter, c)} scans complexes.`,
      `${pro} crédits permettent jusqu’à ${capacity(pro, s)} scans simples ou ${capacity(pro, c)} scans complexes.`,
      `Le pass une partition contient ${pass} crédits liés à une seule et même partition : un scan simple utilise ${s} crédit et en laisse ${pass - s} ; un scan complexe utilise ${c} crédits et en laisse ${pass - c}. Il ne permet pas de traiter ${pass} partitions différentes.` + " " + getRecognitionPricingCopy("fr").passScope,
      `Les ${free} crédits mensuels de la formule gratuite sont un budget de traitement pour les projets existants, et non ${free} nouveaux scans gratuits par mois. Le scan gratuit d’une nouvelle partition reste limité à ${scans} sur toute la vie du compte, en mode simple uniquement.`,
    ],
    rulesTitle: "Réservation et renouvellement des crédits",
    rules: [
      { title: "Quand les crédits sont réservés", body: "Les crédits sont réservés après validation du fichier, lors de la création et de la mise en file de la tâche, pas avant l’import ni après la correction. Les essais de rotation ou de reconnaissance au sein de cette tâche ne sont pas facturés en plus." },
      { title: "Échec, annulation et nouvel essai", body: "Les crédits réservés sont libérés lorsque le serveur marque la tâche comme échouée ou annulée. Une annulation en cours d’exécution doit d’abord être confirmée par le serveur. Un résultat généré avec succès qui nécessite des corrections, ou un candidat rejeté, ne donne pas automatiquement lieu à une restitution. Un nouvel essai réserve à nouveau des crédits. Les scans gratuits échoués ou annulés ne comptent pas dans la limite gratuite à vie." + " " + getRecognitionPricingCopy("fr").refund },
      { title: "Crédits mensuels, prépayés et pass", body: "Les crédits mensuels sont réinitialisés au début de chaque mois civil en UTC. Les crédits inutilisés ne sont ni reportés ni convertis en solde prépayé. Le solde prépayé ne se réinitialise pas chaque mois, n’expire pas et diminue avec l’usage. Les crédits du pass ne sont pas renouvelés chaque mois et restent liés à sa seule partition." },
      { title: "Quel solde finance une tâche", body: `Le quota mensuel utilisable pour la tâche est prioritaire, puis un solde prépayé suffisant ou un pass admissible peut être utilisé. Une seule source doit couvrir le coût entier d’une tâche ; deux soldes insuffisants ne sont pas additionnés. Un compte avec uniquement des achats prépayés et aucun autre droit mensuel ne reçoit pas ${free} crédits mensuels supplémentaires. L’éligibilité au scan gratuit est distincte du budget : le scan simple gratuit réserve aussi ${s} crédit.` },
      { title: "Crédits et accès sont distincts", body: "Même les opérations sans crédits dépendent de vos droits valides, de l’accès à la partition et du quota de stockage. Un achat prépayé antérieur peut maintenir l’accès prépayé après épuisement du solde, mais les nouvelles tâches nécessitent toujours assez de crédits restants. Un quota réduit peut limiter les nouveaux imports ou générations sans supprimer automatiquement les partitions enregistrées." },
    ],
  },
  es: {
    title: "¿Qué puedes hacer con tus créditos?",
    description: getRecognitionPricingCopy("es").billing,
    columns: ["Operación", "Créditos de procesamiento", "Qué incluye"],
    rows: [
      { operation: "Escaneo simple", cost: `${s} crédito por tarea`, detail: getRecognitionPricingCopy("es").laneGuide },
      { operation: "Escaneo complejo", cost: `${c} créditos por tarea`, detail: "Los intentos con varios motores dentro de la misma tarea no tienen un coste adicional." },
      { operation: "Generar una exportación MusicXML, MIDI, PDF, SVG, PNG, WAV o MP3", cost: `${q} crédito por tarea de exportación en cola`, detail: "Volver a generar un archivo crea una tarea nueva." },
      { operation: "Descargar un archivo ya generado", cost: `${z} créditos de procesamiento`, detail: "Sigue siendo necesario tener acceso a la partitura." },
      { operation: "Ver, reproducir, confirmar correcciones, guardar cambios de notas, transponer o previsualizar Jianpu", cost: `${z} créditos de procesamiento`, detail: "Estas acciones no crean tareas de procesamiento. Se aplican los permisos de acceso y los límites de almacenamiento." },
      { operation: "Exportación directa de Jianpu TXT o Score JSON", cost: `${z} créditos de procesamiento`, detail: "Estas exportaciones directas no crean tareas de exportación en cola." },
      { operation: "Otros procesos que realmente entran en la cola", cost: `Normalmente ${q} crédito por tarea`, detail: "Por ejemplo, transcripción de audio si está habilitada. Esto no significa que una función deshabilitada esté disponible." },
    ],
    examplesTitle: "Calcula tu presupuesto de procesamiento",
    examples: [
      "Los siguientes números de escaneos suponen que no se hacen exportaciones ni otros procesos. Si combinas usos, cada coste se descuenta del saldo restante.",
      `${starter} créditos permiten hasta ${capacity(starter, s)} escaneos simples o ${capacity(starter, c)} escaneos complejos.`,
      `${pro} créditos permiten hasta ${capacity(pro, s)} escaneos simples o ${capacity(pro, c)} escaneos complejos.`,
      `El pase para una partitura incluye ${pass} créditos vinculados a esa misma partitura: un escaneo simple usa ${s} crédito y deja ${pass - s}; uno complejo usa ${c} y deja ${pass - c}. No es un saldo para ${pass} partituras distintas.` + " " + getRecognitionPricingCopy("es").passScope,
      `Los ${free} créditos mensuales del plan gratuito son un presupuesto de procesamiento para proyectos existentes, no ${free} nuevos escaneos gratuitos cada mes. El escaneo gratuito de una nueva partitura se limita a ${scans} durante la vida de la cuenta, solo en modo simple.`,
    ],
    rulesTitle: "Cómo se reservan y renuevan los créditos",
    rules: [
      { title: "Cuándo se reservan", body: "Los créditos se reservan después de validar el archivo, al crear la tarea y ponerla en cola; no antes de subirlo ni después de corregirlo. Los intentos de rotación o reconocimiento dentro de esa tarea no se cobran por separado." },
      { title: "Fallos, cancelaciones y reintentos", body: "Los créditos reservados se liberan cuando el servidor marca la tarea como fallida o cancelada. Si cancelas durante la ejecución, hay que esperar a que el servidor confirme la cancelación. Un resultado generado correctamente que necesita correcciones, o un candidato rechazado, no devuelve créditos automáticamente. Un reintento vuelve a reservar créditos. Los escaneos gratuitos fallidos o cancelados no cuentan para el límite gratuito de por vida." + " " + getRecognitionPricingCopy("es").refund },
      { title: "Créditos mensuales, prepago y pase", body: "Los créditos mensuales se restablecen al inicio de cada mes natural según UTC. Los no utilizados no se acumulan ni se convierten en saldo prepago. El saldo prepago no se restablece cada mes ni caduca, y disminuye con el uso. Los créditos del pase no se renuevan mensualmente y siguen vinculados a esa única partitura." },
      { title: "De qué saldo se cobra una tarea", body: `Se usa primero la asignación mensual válida para esa tarea; después, un saldo prepago suficiente o un pase válido, si están disponibles. Una sola fuente debe cubrir el coste completo de la tarea; no se combinan dos saldos insuficientes. Una cuenta con solo compras de prepago y sin otros derechos mensuales no recibe ${free} créditos mensuales adicionales. El derecho al escaneo gratuito es independiente del presupuesto: el escaneo simple gratuito también reserva ${s} crédito.` },
      { title: "Créditos y acceso son distintos", body: "Las acciones sin coste en créditos dependen igualmente de los derechos vigentes, del acceso a la partitura y del almacenamiento. Una compra de prepago anterior puede mantener el acceso prepago aunque se agote el saldo, pero las tareas nuevas siguen necesitando suficientes créditos. Un límite de almacenamiento menor puede restringir nuevas subidas o generaciones; no elimina automáticamente las partituras guardadas." },
    ],
  },
  de: {
    title: "Was können Sie mit Ihren Credits tun?",
    description: getRecognitionPricingCopy("de").billing,
    columns: ["Aktion", "Verarbeitungscredits", "Umfang"],
    rows: [
      { operation: "Einfacher Scan", cost: `${s} Credit pro Auftrag`, detail: getRecognitionPricingCopy("de").laneGuide },
      { operation: "Komplexer Scan", cost: `${c} Credits pro Auftrag`, detail: "Versuche mit mehreren Erkennungsprogrammen innerhalb desselben Auftrags kosten nicht zusätzlich." },
      { operation: "MusicXML-, MIDI-, PDF-, SVG-, PNG-, WAV- oder MP3-Export erzeugen", cost: `${q} Credit pro Exportauftrag in der Warteschlange`, detail: "Eine erneute Erzeugung ist ein neuer Auftrag." },
      { operation: "Eine bereits erzeugte Datei herunterladen", cost: `${z} Verarbeitungscredits`, detail: "Der Zugriff auf die Partitur ist weiterhin erforderlich." },
      { operation: "Ansehen, abspielen, Korrekturen bestätigen, Notenänderungen speichern, transponieren oder Jianpu ansehen", cost: `${z} Verarbeitungscredits`, detail: "Diese Aktionen erstellen keinen Verarbeitungsauftrag. Zugriffsrechte und Speichergrenzen gelten weiterhin." },
      { operation: "Jianpu TXT oder Score JSON direkt exportieren", cost: `${z} Verarbeitungscredits`, detail: "Diese direkten Exporte erstellen keinen Exportauftrag in der Warteschlange." },
      { operation: "Andere Verarbeitung, die tatsächlich in die Warteschlange kommt", cost: `In der Regel ${q} Credit pro Auftrag`, detail: "Etwa Audiotranskription, falls freigeschaltet. Dadurch werden deaktivierte Funktionen nicht verfügbar." },
    ],
    examplesTitle: "Ihr Verarbeitungsbudget berechnen",
    examples: [
      "Die folgenden Scanzahlen gelten ohne Exporte oder andere Verarbeitung. Bei gemischter Nutzung werden die jeweiligen Kosten vom Restguthaben abgezogen.",
      `${starter} Credits ermöglichen bis zu ${capacity(starter, s)} einfache oder ${capacity(starter, c)} komplexe Scans.`,
      `${pro} Credits ermöglichen bis zu ${capacity(pro, s)} einfache oder ${capacity(pro, c)} komplexe Scans.`,
      `Die ${pass} Credits eines Einzelpartitur-Passes sind an dieselbe eine Partitur gebunden: Ein einfacher Scan verbraucht ${s} Credit und lässt ${pass - s} übrig; ein komplexer verbraucht ${c} und lässt ${pass - c} übrig. Der Pass gilt nicht für ${pass} verschiedene Partituren.` + " " + getRecognitionPricingCopy("de").passScope,
      `Die ${free} monatlichen Credits des kostenlosen Tarifs sind ein Verarbeitungsbudget für vorhandene Projekte, keine ${free} kostenlosen neuen Scans pro Monat. Ein neuer kostenloser Scan bleibt während der gesamten Kontolaufzeit auf ${scans} beschränkt und ist nur im einfachen Modus möglich.`,
    ],
    rulesTitle: "Reservierung und Erneuerung der Credits",
    rules: [
      { title: "Wann Credits reserviert werden", body: "Credits werden nach der Dateiprüfung reserviert, wenn der Auftrag erstellt und eingereiht wird; nicht vor dem Hochladen oder nach der Korrektur. Rotations- und Erkennungsversuche innerhalb desselben Auftrags kosten nicht zusätzlich." },
      { title: "Fehlschläge, Abbrüche und neue Versuche", body: "Reservierte Credits werden freigegeben, sobald der Server den Auftrag als fehlgeschlagen oder abgebrochen markiert. Bei einem laufenden Auftrag muss der Abbruch zunächst auf dem Server abgeschlossen sein. Ein erfolgreich erzeugtes Ergebnis mit Korrekturbedarf oder ein abgelehnter Kandidat führt nicht automatisch zur Rückgabe. Ein neuer Versuch reserviert erneut Credits. Fehlgeschlagene oder abgebrochene kostenlose Scans zählen nicht gegen das einmalige kostenlose Kontingent." + " " + getRecognitionPricingCopy("de").refund },
      { title: "Monatliche Credits, Prepaid und Pass", body: "Das Monatskontingent wird zu Beginn jedes UTC-Kalendermonats zurückgesetzt. Ungenutzte Credits werden weder übertragen noch in Prepaid-Guthaben umgewandelt. Prepaid-Guthaben wird nicht monatlich zurückgesetzt, hat kein Ablaufdatum und sinkt mit der Nutzung. Pass-Credits werden nicht monatlich aufgefüllt und bleiben an die eine Partitur gebunden." },
      { title: "Welches Guthaben einen Auftrag bezahlt", body: `Ein für den Auftrag nutzbares Monatskontingent wird zuerst verwendet, danach ausreichend Prepaid-Guthaben oder ein geeigneter Einzelpartitur-Pass. Eine Quelle muss die gesamten Auftragskosten decken; zwei unzureichende Guthaben werden nicht kombiniert. Ein Konto mit ausschließlich Prepaid-Käufen und ohne andere monatliche Berechtigung erhält keine zusätzlichen ${free} Credits pro Monat. Die Berechtigung zum kostenlosen Scan ist vom Budget getrennt: Auch der kostenlose einfache Scan reserviert ${s} Credit.` },
      { title: "Credits und Zugriff sind verschieden", body: "Auch Aktionen ohne Credit-Verbrauch hängen von gültigen Berechtigungen, Partiturzugriff und Speicherplatz ab. Ein früherer Prepaid-Kauf kann den Prepaid-Zugriff nach Verbrauch des Guthabens erhalten, neue Aufträge brauchen jedoch weiterhin ausreichend Credits. Ein kleineres Speicherkontingent kann neue Uploads oder Erzeugungen einschränken, löscht aber gespeicherte Partituren nicht automatisch." },
    ],
  },
  ru: {
    title: "На что можно потратить кредиты?",
    description: getRecognitionPricingCopy("ru").billing,
    columns: ["Действие", "Кредиты обработки", "Что входит"],
    rows: [
      { operation: "Простое сканирование", cost: `${s} кредит за задание`, detail: getRecognitionPricingCopy("ru").laneGuide },
      { operation: "Сложное сканирование", cost: `${c} кредитов за задание`, detail: "Попытки разных движков распознавания внутри одного задания отдельно не оплачиваются." },
      { operation: "Создать экспорт MusicXML, MIDI, PDF, SVG, PNG, WAV или MP3", cost: `${q} кредит за задание экспорта в очереди`, detail: "Повторное создание файла — новое задание." },
      { operation: "Скачать уже созданный файл", cost: `${z} кредитов обработки`, detail: "Право доступа к партитуре по-прежнему необходимо." },
      { operation: "Просмотр, воспроизведение, подтверждение правок, сохранение изменений нот, транспонирование, предпросмотр Jianpu", cost: `${z} кредитов обработки`, detail: "Эти действия не создают заданий обработки. Права доступа и квота хранения сохраняются." },
      { operation: "Прямой экспорт Jianpu TXT или Score JSON", cost: `${z} кредитов обработки`, detail: "Эти прямые экспорты не создают заданий экспорта в очереди." },
      { operation: "Другая обработка, действительно поставленная в очередь", cost: `Обычно ${q} кредит за задание`, detail: "Например, транскрипция аудио, если включена. Это не означает, что отключённая функция доступна." },
    ],
    examplesTitle: "Рассчитайте бюджет обработки",
    examples: [
      "Указанное число сканирований предполагает отсутствие экспорта и другой обработки. При смешанном использовании каждый расход вычитается из оставшегося баланса.",
      `${starter} кредитов хватит максимум на ${capacity(starter, s)} простых или ${capacity(starter, c)} сложных сканирований.`,
      `${pro} кредитов хватит максимум на ${capacity(pro, s)} простых или ${capacity(pro, c)} сложных сканирований.`,
      `${pass} кредитов пакета привязаны к одной и той же партитуре: простое сканирование расходует ${s} кредит, остаётся ${pass - s}; сложное расходует ${c}, остаётся ${pass - c}. Это не лимит на ${pass} разных партитур.` + " " + getRecognitionPricingCopy("ru").passScope,
      `${free} ежемесячных кредитов бесплатного тарифа — бюджет обработки существующих проектов, а не ${free} бесплатных новых сканирований каждый месяц. Бесплатное сканирование новой партитуры доступно ${scans} раз за всё время существования аккаунта, только в простом режиме.`,
    ],
    rulesTitle: "Как резервируются и обновляются кредиты",
    rules: [
      { title: "Когда резервируются кредиты", body: "Кредиты резервируются после проверки загруженного файла, при создании задания и постановке в очередь; не до загрузки и не после проверки нот. Внутренние попытки поворота или распознавания в рамках задания отдельно не оплачиваются." },
      { title: "Ошибки, отмена и повторные попытки", body: "Резерв снимается, когда сервер отмечает задание как неудачное или отменённое. При отмене во время выполнения нужно дождаться подтверждённого состояния отмены. Успешно созданный результат, требующий правок, или отклонённый кандидат не означает автоматический возврат кредитов. Повторная попытка резервирует кредиты заново. Неудачные и отменённые бесплатные сканирования не засчитываются в бесплатный лимит за всё время использования." + " " + getRecognitionPricingCopy("ru").refund },
      { title: "Месячные кредиты, предоплата и пакет", body: "Месячный лимит обновляется в начале каждого календарного месяца по UTC. Неиспользованные кредиты не переносятся и не превращаются в предоплаченный баланс. Предоплаченный баланс не сбрасывается ежемесячно, не имеет срока действия и уменьшается по мере использования. Кредиты пакета не пополняются каждый месяц и остаются привязанными к одной партитуре." },
      { title: "Из какого баланса оплачивается задание", body: `Сначала используется месячный лимит, применимый к этому заданию, затем достаточный предоплаченный баланс или подходящий пакет для одной партитуры. В одном источнике должно хватать кредитов на всё задание; два недостаточных баланса не объединяются. Аккаунт только с предоплаченными покупками и без других ежемесячных прав не получает дополнительные ${free} кредитов в месяц. Право на бесплатный скан и бюджет — разные вещи: бесплатное простое сканирование тоже резервирует ${s} кредит.` },
      { title: "Кредиты и доступ — разные вещи", body: "Даже действия без расхода кредитов зависят от действующих прав, доступа к партитуре и квоты хранения. Прошлая предоплаченная покупка может сохранять предоплаченный доступ после исчерпания баланса, но новые задания всё равно требуют достаточного остатка кредитов. Снижение квоты может ограничить новые загрузки или создание файлов, но не удаляет автоматически сохранённые партитуры." },
    ],
  },
};

const purchaseFaqs: Record<SupportedLocale, readonly PurchaseFaq[]> = {
  en: [
    { question: "Can I cancel at any time?", answer: "You can request that your subscription stop renewing at any time in Billing. Access usually continues until the end of the current paid period. One Score Pass and fixed-term one-time purchases do not renew automatically, so there is nothing to cancel. Stopping renewal does not automatically issue a refund." },
    { question: "What happens to my saved scores after cancellation?", answer: "Cancelling a subscription does not automatically delete saved scores. After the paid period ends, viewing, editing, exporting and starting new processing depend on your remaining valid access and score permissions; subscription-created scores may have restricted access. Other valid plans, prepaid access, a free project or an active One Score Pass may still provide access within their scope. Account deletion is a separate action that removes account data." },
    { question: "What happens to unused credits when paid access ends?", answer: "Monthly credits reset by UTC calendar month and do not roll over or turn into prepaid balance. When paid access ends, your monthly allowance is determined by other valid entitlements. Prepaid balance has no monthly reset or expiry; One Score Pass balance does not refresh monthly and remains tied to its score. Keeping access is different from having enough remaining credits for a new job." },
  ],
  "zh-CN": [
    { question: "可以随时取消吗？", answer: "订阅可随时在“账单”中申请停止续费，通常仍可用到当前已付费周期结束。单谱通行证和固定期限的一次购买不自动续费，无需取消。停止续费不等于自动退款。" },
    { question: "取消订阅后，已保存的乐谱会怎样？", answer: "取消订阅不会自动删除已保存乐谱。已付费周期结束后，继续查看、编辑、导出和新增处理取决于剩余有效权益及该乐谱的访问权限，原订阅创建的乐谱可能受到访问限制。其他有效方案、预付访问资格、免费项目或有效单谱通行证，仍可能在各自范围内提供访问。删除账号是另一个独立操作，会清理账号数据。" },
    { question: "付费权益结束后，未用积分怎么办？", answer: "月度积分按 UTC 自然月重置，不结转，也不变成预付余额。付费权益结束后，月额度按其他仍有效的权益重新确定。预付余额不按月重置、无到期日；单谱通行证积分不按月刷新，仍只用于绑定的那首乐谱。有访问权限不等于有足够的剩余积分创建新任务。" },
  ],
  "zh-TW": [
    { question: "可以隨時取消嗎？", answer: "訂閱可隨時在「帳單」申請停止續費，通常仍可用到目前已付款週期結束。單譜通行證與固定期間的一次購買不自動續費，無須取消。停止續費不等於自動退款。" },
    { question: "取消訂閱後，已儲存的樂譜會怎樣？", answer: "取消訂閱不會自動刪除已儲存樂譜。已付款週期結束後，繼續檢視、編輯、匯出及新增處理，取決於剩餘有效權益與該樂譜的存取權限；原訂閱建立的樂譜可能受到存取限制。其他有效方案、預付存取資格、免費專案或有效單譜通行證，仍可能在各自範圍內提供存取。刪除帳號是另一個獨立操作，會清除帳號資料。" },
    { question: "付費權益結束後，未用點數怎麼辦？", answer: "月度點數按 UTC 自然月重設，不累積，也不變成預付餘額。付費權益結束後，月額度依其他仍有效的權益重新決定。預付餘額不按月重設、無到期日；單譜通行證點數不按月更新，仍只用於綁定的那首樂譜。有存取權限不等於有足夠的剩餘點數建立新任務。" },
  ],
  ja: [
    { question: "いつでも解約できますか？", answer: "サブスクリプションの自動更新停止は、いつでも「請求」から申し込めます。通常、現在の支払い済み期間の終了まで利用できます。1曲パスと利用期間が決まった1回払いは自動更新されないため、解約は不要です。更新の停止で自動的に返金されるわけではありません。" },
    { question: "解約後、保存した楽譜はどうなりますか？", answer: "サブスクリプションを解約しても、保存した楽譜は自動削除されません。支払い済み期間の終了後は、残っている有効な利用権と楽譜へのアクセス権に応じて、閲覧、編集、書き出し、新しい処理が制限される場合があります。ほかの有効なプラン、プリペイドのアクセス権、無料プロジェクト、有効な1曲パスがそれぞれの範囲で利用を認める場合もあります。アカウント削除は別の操作で、アカウントデータを削除します。" },
    { question: "有料の利用期間が終わると、未使用クレジットはどうなりますか？", answer: "月間クレジットは UTC の暦月ごとにリセットされ、繰り越しやプリペイド残高への移行はありません。有料の利用権が終了すると、月間枠はほかの有効な利用権に応じて決まります。プリペイド残高は月ごとにリセットされず、有効期限もありません。1曲パスの残高は毎月補充されず、その楽譜専用です。アクセス権があることと、新しいジョブに十分なクレジットがあることは別です。" },
  ],
  ko: [
    { question: "언제든 구독을 취소할 수 있나요?", answer: "구독은 언제든 ‘결제’에서 자동 갱신 중단을 신청할 수 있으며, 보통 현재 결제 기간이 끝날 때까지 이용할 수 있습니다. 한 곡 이용권과 정해진 기간의 일회성 구매는 자동 갱신되지 않으므로 취소할 필요가 없습니다. 갱신 중단이 자동 환불을 뜻하지는 않습니다." },
    { question: "구독을 취소하면 저장한 악보는 어떻게 되나요?", answer: "구독 취소만으로 저장한 악보가 자동 삭제되지는 않습니다. 결제 기간이 끝난 뒤 보기, 편집, 내보내기, 새 처리 작업은 남아 있는 유효한 이용 권한과 악보 접근 권한에 따라 달라지며, 구독으로 만든 악보의 접근이 제한될 수 있습니다. 다른 유효한 요금제, 선불 접근 자격, 무료 프로젝트 또는 유효한 한 곡 이용권이 각 범위에서 접근을 제공할 수 있습니다. 계정 삭제는 별도 작업이며 계정 데이터를 삭제합니다." },
    { question: "유료 이용 권한이 끝나면 남은 크레딧은 어떻게 되나요?", answer: "월간 크레딧은 UTC 기준 달력 월마다 초기화되며 이월되거나 선불 잔액으로 전환되지 않습니다. 유료 이용 권한이 끝나면 월간 한도는 다른 유효한 권한에 따라 정해집니다. 선불 잔액은 월간 초기화나 만료가 없으며, 한 곡 이용권 잔액은 매달 충전되지 않고 해당 악보에만 연결됩니다. 접근 권한이 있다는 것과 새 작업에 충분한 크레딧이 있다는 것은 별개입니다." },
  ],
  fr: [
    { question: "Puis-je résilier à tout moment ?", answer: "Vous pouvez demander l’arrêt du renouvellement de votre abonnement à tout moment dans Facturation. L’accès reste généralement actif jusqu’à la fin de la période payée en cours. Le pass une partition et les achats uniques à durée déterminée ne se renouvellent pas automatiquement : aucune résiliation n’est nécessaire. L’arrêt du renouvellement ne déclenche pas de remboursement automatique." },
    { question: "Que deviennent mes partitions enregistrées après la résiliation ?", answer: "Résilier un abonnement ne supprime pas automatiquement les partitions enregistrées. Après la période payée, la consultation, la modification, l’export et les nouveaux traitements dépendent des droits encore valides et de l’accès à chaque partition ; les partitions créées sous abonnement peuvent être restreintes. Une autre formule valide, l’accès prépayé, un projet gratuit ou un pass actif peut encore autoriser l’accès dans son périmètre. La suppression du compte est une action distincte qui efface les données du compte." },
    { question: "Que deviennent les crédits inutilisés à la fin de l’accès payant ?", answer: "Les crédits mensuels sont réinitialisés par mois civil en UTC, sans report ni conversion en solde prépayé. À la fin de l’accès payant, le quota mensuel dépend des autres droits valides. Le solde prépayé n’est ni réinitialisé chaque mois ni soumis à une expiration ; le pass n’est pas rechargé chaque mois et reste lié à sa partition. Conserver l’accès ne signifie pas avoir assez de crédits pour une nouvelle tâche." },
  ],
  es: [
    { question: "¿Puedo cancelar en cualquier momento?", answer: "Puedes solicitar que tu suscripción deje de renovarse en cualquier momento desde Facturación. Normalmente conservas el acceso hasta el final del periodo pagado actual. El pase para una partitura y las compras únicas por un periodo fijo no se renuevan automáticamente, por lo que no hay nada que cancelar. Detener la renovación no genera un reembolso automático." },
    { question: "¿Qué pasa con mis partituras guardadas después de cancelar?", answer: "Cancelar una suscripción no elimina automáticamente las partituras guardadas. Al terminar el periodo pagado, ver, editar, exportar y crear nuevos procesos depende de los derechos aún vigentes y del acceso a cada partitura; las creadas con una suscripción pueden tener acceso restringido. Otros planes válidos, el acceso prepago, un proyecto gratuito o un pase activo pueden mantener el acceso dentro de su alcance. Eliminar la cuenta es una acción distinta que borra los datos de la cuenta." },
    { question: "¿Qué ocurre con los créditos no utilizados al terminar el acceso de pago?", answer: "Los créditos mensuales se restablecen por mes natural según UTC, sin acumularse ni convertirse en saldo prepago. Al terminar el acceso de pago, la asignación mensual depende de otros derechos vigentes. El saldo prepago no se restablece mensualmente ni caduca; el pase no se recarga cada mes y sigue vinculado a su partitura. Conservar acceso no significa tener suficientes créditos para una tarea nueva." },
  ],
  de: [
    { question: "Kann ich jederzeit kündigen?", answer: "Sie können jederzeit unter Abrechnung beantragen, dass Ihr Abonnement nicht weiter verlängert wird. Der Zugang bleibt in der Regel bis zum Ende des laufenden bezahlten Zeitraums aktiv. Einzelpartitur-Pässe und Einmalkäufe für einen festen Zeitraum verlängern sich nicht automatisch und müssen daher nicht gekündigt werden. Das Beenden der Verlängerung löst keine automatische Erstattung aus." },
    { question: "Was geschieht nach der Kündigung mit gespeicherten Partituren?", answer: "Eine Abo-Kündigung löscht gespeicherte Partituren nicht automatisch. Nach Ende des bezahlten Zeitraums hängen Ansehen, Bearbeiten, Exportieren und neue Verarbeitung von Ihren verbleibenden gültigen Berechtigungen und dem Partiturzugriff ab; unter einem Abo erstellte Partituren können eingeschränkt sein. Andere gültige Tarife, Prepaid-Zugriff, ein kostenloses Projekt oder ein aktiver Pass können innerhalb ihres Umfangs weiter Zugriff ermöglichen. Das Löschen des Kontos ist eine separate Aktion, die Kontodaten entfernt." },
    { question: "Was passiert mit ungenutzten Credits am Ende des bezahlten Zugangs?", answer: "Monatliche Credits werden nach UTC-Kalendermonaten zurückgesetzt und weder übertragen noch in Prepaid-Guthaben umgewandelt. Nach Ende des bezahlten Zugangs richten sich die Monatslimits nach anderen gültigen Berechtigungen. Prepaid-Guthaben wird nicht monatlich zurückgesetzt und hat kein Ablaufdatum; Pass-Credits werden nicht monatlich aufgefüllt und bleiben an die Partitur gebunden. Weiterer Zugriff bedeutet nicht, dass genug Credits für einen neuen Auftrag vorhanden sind." },
  ],
  ru: [
    { question: "Можно отменить подписку в любое время?", answer: "В разделе «Оплата» можно в любой момент запросить отключение продления подписки. Доступ обычно действует до конца текущего оплаченного периода. Пакет для одной партитуры и разовые покупки на фиксированный срок не продлеваются автоматически, поэтому отменять их не нужно. Отключение продления не означает автоматический возврат денег." },
    { question: "Что будет с сохранёнными партитурами после отмены подписки?", answer: "Отмена подписки не удаляет сохранённые партитуры автоматически. После оплаченного периода просмотр, редактирование, экспорт и новая обработка зависят от оставшихся действующих прав и доступа к партитуре; созданные по подписке партитуры могут стать ограниченно доступными. Другие действующие тарифы, предоплаченный доступ, бесплатный проект или активный пакет могут сохранять доступ в пределах своих условий. Удаление аккаунта — отдельное действие, которое удаляет данные аккаунта." },
    { question: "Что происходит с неиспользованными кредитами после окончания платного доступа?", answer: "Месячные кредиты обновляются по календарным месяцам UTC, не переносятся и не превращаются в предоплаченный баланс. После окончания платного доступа месячный лимит зависит от других действующих прав. Предоплаченный баланс не сбрасывается ежемесячно и не имеет срока действия; пакет не пополняется каждый месяц и остаётся привязанным к партитуре. Сохранённый доступ не означает достаточный остаток кредитов для нового задания." },
  ],
};

export function getPricingIntroCopy(locale: SupportedLocale): PricingIntroCopy {
  return intro[locale];
}

export function getCreditGuideCopy(locale: SupportedLocale): CreditGuideCopy {
  return guides[locale];
}

export function getPurchaseFaqs(locale: SupportedLocale): readonly PurchaseFaq[] {
  return purchaseFaqs[locale];
}
