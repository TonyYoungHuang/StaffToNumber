import type { SupportedLocale } from "@score/i18n";

const policy = {
  en: ["Request a full refund through support within 14 days of payment. Any full refund or chargeback revokes lifetime access.", "Annual upgrade price", "Your unused paid annual time is credited at checkout. The final credit is calculated when checkout starts; annual renewal stops only after lifetime payment is confirmed."],
  "zh-CN": ["付款后 14 天内可通过客服申请全额退款。任何全额退款或拒付都会撤销终身权益。", "年度用户升级价", "已付费年度周期的剩余价值将在结账时抵扣，最终折抵金额以发起结账时计算为准。终身付款确认后才停止年度续费。"],
  "zh-TW": ["付款後 14 天內可透過客服申請全額退款。任何全額退款或拒付都會撤銷終身權益。", "年度用戶升級價", "已付費年度週期的剩餘價值將於結帳時折抵，最終金額以開始結帳時計算為準。終身付款確認後才停止年度續費。"],
  ja: ["支払いから14日以内にサポートへ全額返金を申請できます。全額返金またはチャージバックにより永久アクセスは取り消されます。", "年間プランからのアップグレード料金", "支払い済み年間期間の未使用分を決済時に差し引きます。確定額は決済開始時に計算され、永久版の支払い確認後に年間プランの自動更新を停止します。"],
  ko: ["결제 후 14일 이내에 고객지원으로 전액 환불을 요청할 수 있습니다. 전액 환불 또는 지불 거절 시 평생 이용 권한이 취소됩니다.", "연간 요금제 업그레이드 가격", "결제한 연간 이용 기간의 잔여 가치를 결제 시 차감합니다. 최종 차감액은 결제 시작 시 계산하며 평생 요금제 결제 확인 후에만 연간 자동 갱신을 중단합니다."],
  fr: ["Demandez un remboursement intégral au support dans les 14 jours suivant le paiement. Tout remboursement intégral ou toute rétrofacturation révoque l’accès à vie.", "Prix de passage du forfait annuel à l’accès à vie", "La valeur restante de votre période annuelle payée est déduite au paiement. Le crédit final est calculé au début du paiement ; le renouvellement annuel s’arrête uniquement après confirmation du paiement de l’accès à vie."],
  es: ["Solicita un reembolso completo a soporte dentro de los 14 días posteriores al pago. Cualquier reembolso completo o contracargo revoca el acceso de por vida.", "Precio de mejora del plan anual", "El valor restante de tu periodo anual pagado se descuenta al pagar. El crédito final se calcula al iniciar el pago; la renovación anual se detiene solo tras confirmar el pago del acceso de por vida."],
  de: ["Beantragen Sie innerhalb von 14 Tagen nach Zahlung eine vollständige Erstattung beim Support. Jede vollständige Erstattung oder Rückbuchung widerruft den lebenslangen Zugang.", "Upgrade-Preis für Jahresabonnenten", "Der Restwert Ihres bezahlten Jahreszeitraums wird beim Bezahlen angerechnet. Die endgültige Gutschrift wird beim Start der Zahlung berechnet; die jährliche Verlängerung endet erst nach bestätigter Zahlung des lebenslangen Zugangs."],
  ru: ["Запросите полный возврат через поддержку в течение 14 дней после оплаты. Любой полный возврат или оспаривание платежа с возвратом средств прекращает постоянный доступ.", "Цена перехода с годового плана", "Остаточная стоимость оплаченного годового периода вычитается при оплате. Итоговая скидка рассчитывается при начале оплаты; ежегодное продление прекращается только после подтверждения оплаты постоянного доступа."],
} as const satisfies Record<SupportedLocale, readonly string[]>;

export function getLifetimePolicy(locale: SupportedLocale) {
  const text = policy[locale];
  return { refund: text[0], upgradePrice: text[1], upgrade: text[2] };
}
