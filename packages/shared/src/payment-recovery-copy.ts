export type PaymentVerificationStatus = "waiting_payment" | "waiting_fulfillment" | "ready" | "verification_failed" | "fulfillment_failed" | "failed" | "cancelled" | "refunded";

export type PaymentVerification = { status: PaymentVerificationStatus; retryable: boolean };

export function getPaymentRecoveryCopy(locale: string) {
  const chinese = locale.toLowerCase().startsWith("zh");
  return chinese ? {
    preparingFailed: "支付准备失败。请重试；这会核对并复用原订单，不会重复创建付款。",
    providerBuilding: "此支付方式尚未开放，请稍后再试或选择其他支付方式。",
    waiting_payment: "正在等待支付平台确认付款。若已付款，请核对原订单，不要再次付款。",
    waiting_fulfillment: "付款已确认，正在开通权益。暂时无需再次付款。",
    ready: "付款和权益已确认。",
    verification_failed: "暂时无法核验付款状态。请重试核验原订单；不要再次付款。",
    fulfillment_failed: "付款已确认，但权益开通失败。请重试开通原订单；仍失败时请联系支持。",
    failed: "此订单处理失败。请核对订单或联系支持后再付款。",
    cancelled: "此付款订单已取消。",
    refunded: "此付款已退款，权益未开通。",
    pollingStopped: "自动核验已暂停。可以重试核验原订单；若已付款，请不要再次付款。",
    accessFailed: "付款已确认，但账户权益尚未就绪或核验失败。请重试开通原订单；不要再次付款。",
    retry: "重试核验 / 开通原订单",
  } : {
    preparingFailed: "Payment preparation failed. Retry to check and reuse the original order without creating another payment.",
    providerBuilding: "This payment method is not available yet. Try later or choose another payment method.",
    waiting_payment: "Waiting for the payment provider to confirm payment. If you have paid, recheck this order instead of paying again.",
    waiting_fulfillment: "Payment is confirmed and access is being activated. You do not need to pay again.",
    ready: "Payment and access are confirmed.",
    verification_failed: "Payment verification is temporarily unavailable. Retry verification of this order; do not pay again.",
    fulfillment_failed: "Payment is confirmed, but access activation failed. Retry activation of this order, or contact support if it still fails.",
    failed: "This order could not be processed. Check the order or contact support before paying again.",
    cancelled: "This payment order was cancelled.",
    refunded: "This payment was refunded and access is not active.",
    pollingStopped: "Automatic verification has paused. Retry verification of this order. If you have paid, do not pay again.",
    accessFailed: "Payment is confirmed, but account access is not ready or could not be verified. Retry activation of this order; do not pay again.",
    retry: "Retry verification / activate this order",
  };
}
