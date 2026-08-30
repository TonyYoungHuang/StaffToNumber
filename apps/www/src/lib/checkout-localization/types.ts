import type { PaymentOrderStatus } from "@score/shared";

export type CheckoutStartCopy = Readonly<{
  badge: string;
  eyebrow: string;
  title: string;
  body: string;
  email: string;
  emailPlaceholder: string;
  emailHelp: string;
  provider: string;
  stripeTitle: string;
  stripeBody: string;
  paddleTitle: string;
  paddleBody: string;
  button: string;
  loading: string;
  activate: string;
  accessLabel: string;
  accessValue: string;
  accessBody: string;
  deliveryLabel: string;
  deliveryValue: string;
  deliveryBody: string;
  supportLabel: string;
  supportValue: string;
  supportBody: string;
  nextTitle: string;
  nextSteps: readonly string[];
  contact: string;
}>;

export type CheckoutStatusCopy = Readonly<{
  pendingBadge: string;
  paidBadge: string;
  stalledBadge: string;
  pendingTitle: string;
  pendingBody: string;
  paidTitle: string;
  paidBody: string;
  subscriptionPaidTitle: string;
  subscriptionPaidBody: string;
  stalledTitle: string;
  stalledBody: string;
  missingTitle: string;
  missingBody: string;
  errorTitle: string;
  errorBody: string;
  activationCode: string;
  orderStatus: string;
  provider: string;
  email: string;
  redeem: string;
  openSubscription: string;
  registerSubscription: string;
  retry: string;
  home: string;
  contact: string;
  nextTitle: string;
  paidSteps: readonly string[];
  subscriptionPaidSteps: readonly string[];
  pendingSteps: readonly string[];
  stalledSteps: readonly string[];
  statuses: Readonly<Record<PaymentOrderStatus, string>>;
  providers: Readonly<{ stripe: string; paddle: string }>;
}>;

export type CheckoutCancelCopy = Readonly<{
  badge: string;
  title: string;
  body: string;
  retry: string;
  activate: string;
  home: string;
  contact: string;
  stateLabel: string;
  stateValue: string;
  stateBody: string;
  altLabel: string;
  altValue: string;
  altBody: string;
  noteLabel: string;
  noteValue: string;
  noteBody: string;
  nextTitle: string;
  nextSteps: readonly string[];
}>;

export type PaddleCheckoutCopy = Readonly<{
  title: string;
  body: string;
  missing: string;
  config: string;
  returnUrl: string;
  unavailable: string;
  openFailed: string;
}>;

export type CheckoutPageCopy = Readonly<{
  metadataTitle: string;
  metadataDescription: string;
  supportTitle: string;
  supportBody: string;
  supportAction: string;
}>;

export type CheckoutMessages = Readonly<{
  translationNotice: string;
  start: CheckoutStartCopy;
  status: CheckoutStatusCopy;
  cancel: CheckoutCancelCopy;
  paddle: PaddleCheckoutCopy;
  successPage: CheckoutPageCopy & Readonly<{ missingTitle: string; missingBody: string }>;
  cancelPage: CheckoutPageCopy;
  paddlePage: Readonly<{ metadataTitle: string; metadataDescription: string }>;
}>;
