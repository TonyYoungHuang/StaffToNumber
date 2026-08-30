import type { PaymentProvider, PricingPlanCode } from "@score/shared";

export const BILLING_SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "paused",
  "unpaid",
  "incomplete",
  "cancelled",
] as const;

export const BILLING_INVOICE_STATUSES = ["draft", "open", "paid", "failed", "void", "refunded"] as const;
export const BILLING_QUOTA_TIERS = ["free", "starter", "converter-pro"] as const;

export type BillingSubscriptionStatus = (typeof BILLING_SUBSCRIPTION_STATUSES)[number];
export type BillingInvoiceStatus = (typeof BILLING_INVOICE_STATUSES)[number];
export type BillingQuotaTier = (typeof BILLING_QUOTA_TIERS)[number];

export type BillingPlanMessages = {
  names: Record<"free" | "starter" | "converter-pro", string>;
  cycles: Record<"lifetime" | "monthly" | "annual", string>;
  badges: Record<PricingPlanCode, string>;
  audiences: Record<PricingPlanCode, string>;
  ctas: Record<PricingPlanCode, string>;
  unitPriceTemplate: string;
  freeUnitPriceTemplate: string;
  creditsTemplate: string;
  freeCreditsTemplate: string;
  benefits: {
    freeProject: string;
    moreThanFreeProject: string;
    starterIncluded: string;
    starterMonthlyIncluded: string;
    converterMonthlyIncluded: string;
    editor: string;
    practice: string;
    conversion: string;
    exports: string;
    freeExports: string;
  };
  resources: {
    monthlyCredits: string;
    monthlyCreditsReset: string;
    storage: string;
    personalLibrary: string;
    monthlyRenewal: string;
    annualSavings: string;
    freeLibrary: string;
    noCard: string;
  };
};

export type ActivationFormCopy = {
  eyebrow: string;
  title: string;
  body: string;
  devSeed: string;
  devSeedFootnote: string;
  codeLabel: string;
  codePlaceholder: string;
  submit: string;
  submitting: string;
  fillDemo: string;
  loginFirst: string;
  required: string;
  success: string;
  footnote: string;
  fallbackError: string;
};

export type CheckoutClientCopy = {
  checkoutEyebrow: string;
  title: string;
  body: string;
  provider: string;
  plan: string;
  individual: string;
  school: string;
  organization: string;
  organizationPlaceholder: string;
  noOrganizations: string;
  seats: string;
  seatsHelp: string;
  stripeTitle: string;
  stripeLiveBody: string;
  stripeBuildingBody: string;
  paddleTitle: string;
  paddleLiveBody: string;
  paddleBuildingBody: string;
  available: string;
  building: string;
  waiting: string;
  button: string;
  intentButton: string;
  loading: string;
  checking: string;
  signInEyebrow: string;
  signInTitle: string;
  signInBody: string;
  signInPoints: readonly [string, string, string];
  selectedPlan: string;
  accountNote: string;
  intentNote: string;
  providerBuildingTemplate: string;
  notificationFailed: string;
  fallbackError: string;
};

export type BillingManagerCopy = {
  loading: string;
  fallbackError: string;
  signIn: string;
  creditEyebrow: string;
  availableCredits: string;
  creditUnit: string;
  creditSummaryTemplate: string;
  creditUsage: string;
  storage: string;
  quotaNote: string;
  freeEyebrow: string;
  noPaidTitle: string;
  freeBody: string;
  unlock: string;
  subscriptionsEyebrow: string;
  subscriptionsTitle: string;
  manageStripe: string;
  managingStripe: string;
  noSubscriptions: string;
  currentPeriodEndsTemplate: string;
  noFixedEnd: string;
  renewalFailed: string;
  cancellationScheduled: string;
  seatsTemplate: string;
  cancel: string;
  canceling: string;
  cancelSuccess: string;
  memberEmail: string;
  memberEmailPlaceholder: string;
  assignSeat: string;
  assigningSeat: string;
  revoke: string;
  revoking: string;
  invoicesEyebrow: string;
  invoicesTitle: string;
  noInvoices: string;
  invoicePaidTemplate: string;
  invoiceDueTemplate: string;
  invoiceFailedTemplate: string;
  refundedTemplate: string;
  viewInvoice: string;
  amountPending: string;
  subscriptionStatuses: Record<BillingSubscriptionStatus, string>;
  invoiceStatuses: Record<BillingInvoiceStatus, string>;
  quotaTiers: Record<BillingQuotaTier, string>;
  providers: Record<PaymentProvider, string>;
};

export type BillingMessageCatalog = {
  reviewNotice: string;
  activation: {
    page: { title: string; description: string };
    form: ActivationFormCopy;
  };
  checkout: {
    unavailable: {
      eyebrow: string;
      title: string;
      body: string;
      continueFree: string;
    };
    page: {
      eyebrow: string;
      title: string;
      body: string;
      promoLabel: string;
      promoValue: string;
      planNote: string;
    };
    selector: {
      plansAria: string;
      selectedPlan: string;
      continueTemplate: string;
      freeEyebrow: string;
      freeTitle: string;
      freeBody: string;
      freeCta: string;
      creditUsage: string;
      includedCapabilities: string;
      benefitsAndResources: string;
    };
    client: CheckoutClientCopy;
    status: {
      loading: string;
      pendingTitle: string;
      pendingBody: string;
      successTitle: string;
      successBody: string;
      cancelledTitle: string;
      cancelledBody: string;
      failedTitle: string;
      failedBody: string;
      scores: string;
      jobs: string;
      fallbackError: string;
    };
  };
  billing: {
    page: { eyebrow: string; title: string; body: string };
    manager: BillingManagerCopy;
  };
  plans: BillingPlanMessages;
};
