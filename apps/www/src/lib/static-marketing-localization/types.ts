export type MarketingPair = readonly [title: string, body: string];
export type MarketingMetric = readonly [label: string, value: string, body: string];
export type MarketingStep = readonly [step: string, title: string, body: string];

export type MarketingMetadataCopy = {
  title: string;
  description: string;
  keywords: readonly string[];
  socialImageAlt: string;
};

export type AboutPageCopy = {
  metadata: MarketingMetadataCopy;
  registrationLabel: string;
  hero: {
    eyebrow: string;
    title: string;
    body: string;
    checkoutAction: string;
    appAction: string;
    supportAction: string;
  };
  position: {
    eyebrow: string;
    title: string;
    body: string;
    steps: readonly [MarketingStep, MarketingStep, MarketingStep];
  };
  audience: {
    eyebrow: string;
    title: string;
    metrics: readonly [MarketingMetric, MarketingMetric, MarketingMetric];
  };
  support: {
    eyebrow: string;
    title: string;
    body: string;
    steps: readonly [MarketingStep, MarketingStep, MarketingStep];
    operatorAriaLabel: string;
    serviceBrandLabel: string;
    canonicalWebsitePrefix: string;
    customerSupportLabel: string;
    customerSupportBody: string;
    legalOperatorLabel: string;
    legalOperatorFallback: string;
    requestAction: string;
    privacyAction: string;
    termsAction: string;
  };
  commerce: {
    eyebrow: string;
    availableTitle: string;
    pendingTitle: string;
    availableStatus: string;
    pendingStatus: string;
    availableBody: string;
    pendingBody: string;
    mainlandStatus: string;
    mainlandAvailableBody: string;
    mainlandPendingBody: string;
    registerAction: string;
    checkoutAction: string;
  };
  useCases: {
    eyebrow: string;
    title: string;
    body: string;
    items: readonly [MarketingPair, MarketingPair, MarketingPair];
  };
  startingPoints: {
    eyebrow: string;
    title: string;
    metrics: readonly [MarketingMetric, MarketingMetric, MarketingMetric];
  };
  learnMore: {
    eyebrow: string;
    title: string;
    body: string;
    privacyAction: string;
    termsAction: string;
    checkoutAction: string;
  };
  next: {
    eyebrow: string;
    title: string;
    body: string;
    homeAction: string;
    appAction: string;
  };
};

export type CheckoutConditionalFaqItem = {
  question: string;
  availableAnswer: string;
  pendingAnswer: string;
};

export type FaqPageCopy = {
  metadata: MarketingMetadataCopy;
  hero: {
    eyebrow: string;
    title: string;
    body: string;
    checkoutAction: string;
    supportPageAction: string;
    contactAction: string;
  };
  groups: readonly [
    {
      title: string;
      items: readonly [MarketingPair, CheckoutConditionalFaqItem, CheckoutConditionalFaqItem];
    },
    { title: string; items: readonly [MarketingPair, MarketingPair, MarketingPair] },
    { title: string; items: readonly [MarketingPair, MarketingPair, MarketingPair] },
  ];
  workflow: {
    eyebrow: string;
    title: string;
    body: string;
    metrics: readonly [MarketingMetric, MarketingMetric, MarketingMetric];
    scannerAction: string;
    converterAction: string;
  };
  verification: {
    eyebrow: string;
    title: string;
    steps: readonly [MarketingStep, MarketingStep, MarketingStep];
  };
  next: {
    eyebrow: string;
    title: string;
    supportAction: string;
    requestAction: string;
    aboutAction: string;
    checkoutAction: string;
  };
  related: {
    eyebrow: string;
    title: string;
    body: string;
    privacyAction: string;
    termsAction: string;
    supportAction: string;
  };
};

export type ResolvedFaqGroup = {
  title: string;
  items: readonly { question: string; answer: string }[];
};

export type ReadingGuidePageCopy = {
  metadata: MarketingMetadataCopy;
  eyebrow: string;
  title: string;
  intro: string;
  basicsEyebrow: string;
  summaryTitle: string;
  summaryBody: string;
  concepts: readonly [MarketingPair, MarketingPair, MarketingPair, MarketingPair];
  orderEyebrow: string;
  stepsTitle: string;
  stepsBody: string;
  steps: readonly [MarketingPair, MarketingPair, MarketingPair, MarketingPair, MarketingPair];
  symbolsEyebrow: string;
  symbolsTitle: string;
  symbolsBody: string;
  symbols: readonly [MarketingPair, MarketingPair, MarketingPair, MarketingPair];
  practiceEyebrow: string;
  practiceTitle: string;
  practiceBody: string;
  editAction: string;
  scanAction: string;
  playAction: string;
  faqEyebrow: string;
  faqTitle: string;
  faqs: readonly [MarketingPair, MarketingPair, MarketingPair];
};

export type NumberedNotationPageCopy = {
  metadata: MarketingMetadataCopy;
  eyebrow: string;
  title: string;
  intro: string;
  directionOneEyebrow: string;
  staffTitle: string;
  staffBody: string;
  staffAction: string;
  directionTwoEyebrow: string;
  jianpuTitle: string;
  jianpuBody: string;
  jianpuAction: string;
  modelTitle: string;
  modelBody: string;
  limitsTitle: string;
  limitsBody: string;
  faqEyebrow: string;
  faqTitle: string;
  faqs: readonly [MarketingPair, MarketingPair];
};

export type StaticMarketingLocalization = {
  openGraphLocale: string;
  homeBreadcrumb: string;
  about: AboutPageCopy;
  faq: FaqPageCopy;
  readingGuide: ReadingGuidePageCopy;
  numberedNotation: NumberedNotationPageCopy;
};
