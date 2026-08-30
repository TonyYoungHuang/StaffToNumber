import type { PricingPlanCode, PricingPlanDisplay } from "@score/shared";

export type HomepagePair = readonly [title: string, body: string];
export type HomepageTriple = readonly [eyebrow: string, title: string, body: string];
export type HomepageCapability = readonly [title: string, body: string, href: string];

export type HomepagePageCopy = {
  schemaDescription: string;
  heroKicker: string;
  heroTitle: readonly [string, string];
  heroIntro: readonly [string, string, string];
  heroPoints: readonly [HomepagePair, HomepagePair, HomepagePair];
  heroCases: string;
  facts: readonly [HomepagePair, HomepagePair, HomepagePair];
  stepsKicker: string;
  stepsTitle: string;
  steps: readonly [HomepagePair, HomepagePair, HomepagePair];
  casesKicker: string;
  casesTitle: string;
  casesBody: string;
  demosKicker: string;
  demosTitle: string;
  demosBody: string;
  demosProof: string;
  demosAction: string;
  demos: readonly [HomepagePair, HomepagePair, HomepagePair, HomepagePair];
  cases: readonly [HomepageTriple, HomepageTriple, HomepageTriple];
  caseAction: string;
  engineKicker: string;
  engineTitle: string;
  engineBody: string;
  capabilityProof: string;
  pipeline: readonly [HomepagePair, HomepagePair, HomepagePair];
  capabilities: readonly [HomepageCapability, HomepageCapability, HomepageCapability, HomepageCapability, HomepageCapability];
  trustKicker: string;
  trustTitle: string;
  trust: readonly [HomepagePair, HomepagePair, HomepagePair, HomepagePair];
  pricingKicker: string;
  pricingTitle: string;
  pricingBody: string;
  pricingPromoLabel: string;
  pricingPromoValue: string;
  creditPlanGridLabel: string;
  creditPlanCardLabels: {
    creditUsage: string;
    includedCapabilities: string;
    benefitsAndResources: string;
  };
  creditRulesKicker: string;
  creditRulesTitle: string;
  creditRulesBody: string;
  creditRules: readonly [HomepageTriple, HomepageTriple, HomepageTriple];
  priceNote: string;
  faqKicker: string;
  faqTitle: string;
  faqs: readonly [HomepagePair, HomepagePair, HomepagePair, HomepagePair, HomepagePair];
  finalKicker: string;
  finalTitle: string;
  finalAction: string;
};

export type HomepageMediaCopy = {
  caseAlts: readonly [string, string, string];
  demoAlts: readonly [string, string, string, string];
  scoreSamples: readonly [HomepagePair, HomepagePair, HomepagePair, HomepagePair, HomepagePair];
};

export type HomepageWorkbenchModeCopy = {
  label: string;
  title: string;
  body: string;
  action: string;
  unavailableAction?: string;
};

export type HomepageWorkbenchCopy = {
  modes: {
    recognize: HomepageWorkbenchModeCopy;
    process: HomepageWorkbenchModeCopy;
    transcribe: HomepageWorkbenchModeCopy;
  };
  checking: string;
  signedIn: string;
  signInFirst: string;
  authTitle: string;
  authBody: string;
  login: string;
  register: string;
  email: string;
  password: string;
  submitting: string;
  authFailed: string;
  close: string;
  uploading: string;
  queued: string;
  processing: string;
  completed: string;
  failed: string;
  cancelled: string;
  candidateTitle: string;
  candidateBody: string;
  previewLoading: string;
  openProject: string;
  retry: string;
  invalidFile: string;
  uploadFailed: string;
  workbenchLabel: string;
  workbenchBadge: string;
  taskTypeLabel: string;
  experimentalLabel: string;
  supportedFormatsLabel: string;
  availableToolsLabel: string;
  tools: readonly [HomepagePair, HomepagePair, HomepagePair, HomepagePair, HomepagePair, HomepagePair];
};

export type HomepagePlanTranslation = Omit<PricingPlanDisplay, "code" | "price" | "featured">;
export type HomepagePlanTranslations = Readonly<Record<PricingPlanCode, HomepagePlanTranslation>>;

export type HomepageLocalization = {
  page: HomepagePageCopy;
  media: HomepageMediaCopy;
  workbench: HomepageWorkbenchCopy;
  plans: HomepagePlanTranslations;
};
