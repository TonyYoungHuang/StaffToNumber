export type SupportCategory = "payment" | "activation" | "job" | "privacy" | "general";

export type CopyrightComplaintStatus =
  | "received"
  | "validating"
  | "info_required"
  | "reviewing"
  | "actioned"
  | "rejected"
  | "closed";

export type SupportFormCategoryCopy = {
  label: string;
  helper: string;
  subject: string;
};

export type SupportFormCopy = {
  eyebrow: string;
  title: string;
  body: string;
  categoryLabel: string;
  categoryAriaLabel: string;
  nameLabel: string;
  contactEmailLabel: string;
  accountEmailLabel: string;
  orderReferenceLabel: string;
  jobReferenceLabel: string;
  subjectLabel: string;
  messageLabel: string;
  messageHint: string;
  honeypotLabel: string;
  submitting: string;
  submit: string;
  emailAction: string;
  emailFallback: string;
  successSent: string;
  successPreview: string;
  successFailed: string;
  categories: Readonly<Record<SupportCategory, SupportFormCategoryCopy>>;
};

export type CopyrightComplaintFormCopy = {
  submitTitle: string;
  submitBody: string;
  submitFormAriaLabel: string;
  name: string;
  email: string;
  organization: string;
  relationship: string;
  owner: string;
  agent: string;
  work: string;
  workHint: string;
  targets: string;
  targetsHint: string;
  evidence: string;
  evidenceHint: string;
  action: string;
  goodFaith: string;
  accuracy: string;
  signature: string;
  honeypotLabel: string;
  submit: string;
  submitting: string;
  receiptTitle: string;
  receiptStatus: string;
  receiptBody: string;
  receiptAriaLabel: string;
  due: string;
  trackTitle: string;
  trackBody: string;
  trackFormAriaLabel: string;
  reference: string;
  access: string;
  lookup: string;
  lookingUp: string;
  current: string;
  actionTaken: string;
  history: string;
  emptyHistory: string;
  statuses: Readonly<Record<CopyrightComplaintStatus, string>>;
};

export type PageMetadataCopy = {
  title: string;
  description: string;
  keywords: readonly string[];
  socialImageAlt: string;
};

export type CopyStep = readonly [step: string, title: string, body: string];
export type CopyMetric = readonly [label: string, value: string, body: string];
export type CopyPair = readonly [title: string, body: string];

export type SupportPageCopy = {
  metadata: PageMetadataCopy;
  schemaName: string;
  schemaContactType: string;
  hero: {
    eyebrow: string;
    title: string;
    body: string;
    submitAction: string;
    faqAction: string;
    checkoutAction: string;
  };
  form: SupportFormCopy;
  workflows: {
    eyebrow: string;
    title: string;
    items: readonly [CopyStep, CopyStep, CopyStep];
  };
  evidence: {
    eyebrow: string;
    title: string;
    status: string;
    points: readonly [string, string, string, string];
  };
  boundary: {
    eyebrow: string;
    title: string;
    body: string;
    metrics: readonly [CopyMetric, CopyMetric, CopyMetric];
  };
  after: {
    eyebrow: string;
    title: string;
    body: string;
    aboutAction: string;
    privacyAction: string;
    termsAction: string;
  };
  final: {
    title: string;
    body: string;
    formAction: string;
    faqAction: string;
    checkoutAction: string;
  };
};

export type CopyrightPageCopy = {
  metadata: PageMetadataCopy;
  hero: { eyebrow: string; title: string; body: string };
  faqTitle: string;
  faqs: readonly [CopyPair, CopyPair, CopyPair];
  form: CopyrightComplaintFormCopy;
};

export type LegalSection = {
  title: string;
  points: readonly string[];
};

export type PrivacyPageCopy = {
  metadata: PageMetadataCopy;
  hero: {
    eyebrow: string;
    title: string;
    body: string;
    updatedPrefix: string;
    termsAction: string;
  };
  sections: readonly LegalSection[];
  contact: {
    title: string;
    body: string;
    note: string;
    action: string;
  };
  related: {
    eyebrow: string;
    title: string;
    body: string;
    aboutAction: string;
    termsAction: string;
    checkoutAction: string;
  };
  continue: {
    eyebrow: string;
    title: string;
    body: string;
    supportAction: string;
    homeAction: string;
  };
};

export type TermsPageCopy = {
  metadata: PageMetadataCopy;
  hero: {
    eyebrow: string;
    title: string;
    body: string;
    updatedPrefix: string;
    privacyAction: string;
  };
  sections: readonly LegalSection[];
  purchase: {
    title: string;
    body: string;
    note: string;
    supportAction: string;
  };
  related: {
    eyebrow: string;
    title: string;
    body: string;
    privacyAction: string;
    copyrightAction: string;
    aboutAction: string;
    checkoutAction: string;
  };
  help: {
    eyebrow: string;
    title: string;
    body: string;
    supportAction: string;
    homeAction: string;
  };
};

export type LegalReviewNoticeCopy = {
  eyebrow: string;
  title: string;
  body: string;
  ariaLabel: string;
};

export type SupportLegalLocalization = {
  openGraphLocale: string;
  homeBreadcrumb: string;
  legalReviewNotice: LegalReviewNoticeCopy;
  support: SupportPageCopy;
  copyright: CopyrightPageCopy;
  privacy: PrivacyPageCopy;
  terms: TermsPageCopy;
};
