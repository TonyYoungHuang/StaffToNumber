import type { SupportedLocale } from "@score/i18n";
import { SCORE_TASKS, type ScoreTask } from "@score/shared";

type ScoreTaskMessages = {
  tasks: Record<ScoreTask, string>;
  body: string;
  chooseFile: string;
  existing: string;
  target: string;
  shift: string;
};
const catalogs: Record<SupportedLocale, readonly string[]> = {
  en: ["Continue scanning", "Continue transposing", "Continue converting to Jianpu", "Continue entering Jianpu", "Continue editing", "Continue playback", "Continue exporting", "Choose your source file or an existing score to continue this task.", "Continue: choose a score file", "Choose an existing score", "Selected key: {target}", "Selected shift: {value} semitones"],
  "zh-CN": ["继续扫描", "继续移调", "继续转换为简谱", "继续输入简谱", "继续编辑", "继续播放", "继续导出", "选择原文件或已有乐谱，继续刚才的任务。", "继续：选择乐谱文件", "选择已有乐谱", "已选目标调：{target}", "已选移调：{value} 个半音"],
  "zh-TW": ["繼續掃描", "繼續移調", "繼續轉換為簡譜", "繼續輸入簡譜", "繼續編輯", "繼續播放", "繼續匯出", "選擇原檔案或已有樂譜，繼續剛才的任務。", "繼續：選擇樂譜檔案", "選擇已有樂譜", "已選目標調：{target}", "已選移調：{value} 個半音"],
  ja: ["スキャンを続ける", "移調を続ける", "数字譜への変換を続ける", "数字譜の入力を続ける", "編集を続ける", "再生を続ける", "書き出しを続ける", "元のファイルまたは保存済みの楽譜を選んで作業を続けてください。", "続ける：楽譜ファイルを選択", "保存済みの楽譜を選ぶ", "選択した調：{target}", "選択した移調幅：{value} 半音"],
  ko: ["스캔 계속하기", "조옮김 계속하기", "숫자악보 변환 계속하기", "숫자악보 입력 계속하기", "편집 계속하기", "재생 계속하기", "내보내기 계속하기", "원본 파일이나 저장된 악보를 선택하여 작업을 계속하세요.", "계속: 악보 파일 선택", "저장된 악보 선택", "선택한 조: {target}", "선택한 조옮김: {value} 반음"],
  de: ["Scannen fortsetzen", "Transponieren fortsetzen", "Jianpu-Konvertierung fortsetzen", "Jianpu-Eingabe fortsetzen", "Bearbeitung fortsetzen", "Wiedergabe fortsetzen", "Export fortsetzen", "Wählen Sie die Quelldatei oder eine gespeicherte Partitur, um diese Aufgabe fortzusetzen.", "Weiter: Notendatei auswählen", "Gespeicherte Partitur auswählen", "Gewählte Tonart: {target}", "Gewählte Verschiebung: {value} Halbtöne"],
  fr: ["Continuer la numérisation", "Continuer la transposition", "Continuer la conversion en Jianpu", "Continuer la saisie du Jianpu", "Continuer la modification", "Continuer la lecture", "Continuer l’export", "Choisissez le fichier source ou une partition enregistrée pour poursuivre cette tâche.", "Continuer : choisir une partition", "Choisir une partition enregistrée", "Tonalité choisie : {target}", "Décalage choisi : {value} demi-tons"],
  es: ["Continuar el escaneo", "Continuar la transposición", "Continuar la conversión a Jianpu", "Continuar la entrada de Jianpu", "Continuar la edición", "Continuar la reproducción", "Continuar la exportación", "Elige el archivo original o una partitura guardada para continuar esta tarea.", "Continuar: elegir una partitura", "Elegir una partitura guardada", "Tonalidad elegida: {target}", "Cambio elegido: {value} semitonos"],
  ru: ["Продолжить сканирование", "Продолжить транспонирование", "Продолжить перевод в цифровую нотацию", "Продолжить ввод цифровой нотации", "Продолжить редактирование", "Продолжить воспроизведение", "Продолжить экспорт", "Выберите исходный файл или сохранённую партитуру, чтобы продолжить задачу.", "Продолжить: выбрать файл партитуры", "Выбрать сохранённую партитуру", "Выбранная тональность: {target}", "Выбранный сдвиг: {value} полутонов"],
};

export function getScoreTaskMessages(locale: SupportedLocale): ScoreTaskMessages {
  const values = catalogs[locale];
  return {
    tasks: Object.fromEntries(SCORE_TASKS.map((task, index) => [task, values[index]])) as Record<ScoreTask, string>,
    body: values[7], chooseFile: values[8], existing: values[9], target: values[10], shift: values[11],
  };
}
