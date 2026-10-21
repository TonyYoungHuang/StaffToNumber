import { getLifetimeQueueMessage, type SupportedLocale } from "@score/i18n";
import type { PricingPlanDisplay } from "./index.ts";

export const LIFETIME_PRESENTATION_PLAN = "converter-pro-lifetime";

const copy = {
  en: ["Lifetime access", "Lifetime", "One-time payment", "Unlimited for life", "Pay once. Keep Converter Pro permanently.", "Unlimited score recognition for life", "Unlimited editing, transposition and playback for life", "Unlimited score and audio exports for life", "All Converter Pro features for life", "Permanent access · no expiry", "No recurring payments", "Choose lifetime access"],
  "zh-CN": ["永久使用", "终身版", "一次性付款", "终身不限量", "一次付款，永久使用 Converter Pro。", "终身不限量识谱", "终身不限量编辑、移调与播放", "终身不限量乐谱与音频导出", "终身使用全部 Converter Pro 功能", "永久权限 · 无到期时间", "无需续费", "选择终身版"],
  "zh-TW": ["永久使用", "終身版", "一次性付款", "終身不限量", "一次付款，永久使用 Converter Pro。", "終身不限量識譜", "終身不限量編輯、移調與播放", "終身不限量樂譜與音訊匯出", "終身使用全部 Converter Pro 功能", "永久權限 · 無到期時間", "無需續費", "選擇終身版"],
  ja: ["永久アクセス", "永久版", "1回払い", "永久に無制限", "一度の支払いで Converter Pro を永久に利用。", "楽譜認識が永久に無制限", "編集・移調・再生が永久に無制限", "楽譜・音声の書き出しが永久に無制限", "Converter Pro の全機能を永久に利用", "永久アクセス・有効期限なし", "継続課金なし", "永久版を選ぶ"],
  ko: ["영구 이용", "평생 요금제", "일회성 결제", "평생 무제한", "한 번 결제로 Converter Pro를 영구 이용하세요.", "평생 무제한 악보 인식", "평생 무제한 편집·조옮김·재생", "평생 무제한 악보·오디오 내보내기", "모든 Converter Pro 기능 평생 이용", "영구 이용 · 만료 없음", "정기 결제 없음", "평생 요금제 선택"],
  fr: ["Accès à vie", "À vie", "Paiement unique", "Illimité à vie", "Payez une fois. Gardez Converter Pro à vie.", "Reconnaissance de partitions illimitée à vie", "Édition, transposition et lecture illimitées à vie", "Exports de partitions et audio illimités à vie", "Toutes les fonctions Converter Pro à vie", "Accès permanent · sans expiration", "Aucun paiement récurrent", "Choisir l’accès à vie"],
  es: ["Acceso de por vida", "De por vida", "Pago único", "Ilimitado de por vida", "Paga una vez. Conserva Converter Pro para siempre.", "Reconocimiento de partituras ilimitado de por vida", "Edición, transposición y reproducción ilimitadas de por vida", "Exportación de partituras y audio ilimitada de por vida", "Todas las funciones Converter Pro de por vida", "Acceso permanente · sin caducidad", "Sin pagos recurrentes", "Elegir acceso de por vida"],
  de: ["Dauerhafter Zugang", "Lebenslang", "Einmalzahlung", "Lebenslang unbegrenzt", "Einmal zahlen. Converter Pro dauerhaft nutzen.", "Lebenslang unbegrenzte Notenerkennung", "Lebenslang unbegrenzt bearbeiten, transponieren und abspielen", "Lebenslang unbegrenzte Noten- und Audioexporte", "Alle Converter Pro Funktionen lebenslang", "Dauerhafter Zugang · kein Ablauf", "Keine wiederkehrenden Zahlungen", "Lebenslangen Zugang wählen"],
  ru: ["Постоянный доступ", "Навсегда", "Разовый платёж", "Безлимит навсегда", "Заплатите один раз. Пользуйтесь Converter Pro всегда.", "Безлимитное распознавание нот навсегда", "Безлимитное редактирование, транспонирование и воспроизведение", "Безлимитный экспорт нот и аудио навсегда", "Все функции Converter Pro навсегда", "Постоянный доступ · без срока действия", "Без повторных платежей", "Выбрать постоянный доступ"],
} as const satisfies Record<SupportedLocale, readonly string[]>;

export function presentLifetimePlan(locale: SupportedLocale, plan: PricingPlanDisplay): PricingPlanDisplay {
  if (plan.code !== LIFETIME_PRESENTATION_PLAN) return plan;
  const text = copy[locale];
  return { ...plan, badge: text[0], cycle: text[1], unitPrice: text[2], credits: text[3],
    audience: text[4], benefits: text.slice(5, 9), resources: [text[9], text[10]], cta: text[11] };
}

export function presentPricingPlans(locale: SupportedLocale, plans: readonly PricingPlanDisplay[]): readonly PricingPlanDisplay[] {
  const order = ["free", "starter-monthly", "converter-pro-monthly", "starter-annual", LIFETIME_PRESENTATION_PLAN];
  return plans.map(plan => presentLifetimePlan(locale, plan.code === "converter-pro-annual" ? { ...plan, code: LIFETIME_PRESENTATION_PLAN } : plan)).sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code));
}

export function getLifetimeCopy(locale: SupportedLocale) {
  const text = copy[locale];
  return { name: `Converter Pro · ${text[1]}`, unlimited: text[3], permanent: text[9], payment: text[2], queueLimit: getLifetimeQueueMessage(locale) };
}
