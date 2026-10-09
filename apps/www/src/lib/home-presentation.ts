import type { SupportedLocale } from "@score/i18n";

const copy: Record<SupportedLocale, { title: string; body: string; credits: string }> = {
  en: { title: "Start with your score", body: "Upload a PDF or score image to scan, edit and transpose.", credits: "10 credits · One score" },
  "zh-CN": { title: "开始处理你的乐谱", body: "上传 PDF 或乐谱图片，识谱、编辑、移调，一站完成。", credits: "10 个积分 · 1 首乐谱" },
  "zh-TW": { title: "開始處理你的樂譜", body: "上傳 PDF 或樂譜圖片，辨識、編輯、移調，一站完成。", credits: "10 個點數 · 1 首樂譜" },
  ja: { title: "楽譜から始めましょう", body: "PDFや楽譜画像をアップロードして、認識・編集・移調。", credits: "10クレジット · 1曲" },
  ko: { title: "내 악보로 시작하세요", body: "PDF나 악보 이미지를 올려 인식, 편집, 조옮김을 시작하세요.", credits: "10 크레딧 · 악보 1곡" },
  fr: { title: "Commencez avec votre partition", body: "Importez un PDF ou une image pour reconnaître, modifier et transposer les notes.", credits: "10 crédits · 1 partition" },
  es: { title: "Empieza con tu partitura", body: "Sube un PDF o una imagen para reconocer, editar y transponer las notas.", credits: "10 créditos · 1 partitura" },
  de: { title: "Starten Sie mit Ihrer Partitur", body: "PDF oder Notenbild hochladen, Noten erkennen, bearbeiten und transponieren.", credits: "10 Credits · 1 Partitur" },
  ru: { title: "Начните со своей партитуры", body: "Загрузите PDF или изображение нот для распознавания, редактирования и транспонирования.", credits: "10 кредитов · 1 партитура" },
};

export const getHomePresentationCopy = (locale: SupportedLocale) => copy[locale];
