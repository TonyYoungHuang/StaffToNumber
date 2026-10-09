import type { FeatureOnPageContent } from "../feature-on-page";

type Pair = readonly [string, string];
export type LocalizedToolCopy = {
  title: string;
  description: string;
  h1: string;
  intro: string;
  moduleTitle: string;
  modules: Pair[];
  workflowTitle: string;
  workflow: Pair[];
  details: Pair[];
  faq: Pair[];
  // Alternating prose and linked phrases; each link stays in the active language.
  links: Array<string | readonly [text: string, href: string]>;
};

export function tool(copy: LocalizedToolCopy, faqTitle: string): FeatureOnPageContent {
  const entries = (items: Pair[]) => items.map(([title, body]) => ({ title, body }));
  return {
    h1: copy.h1, intro: copy.intro, moduleTitle: copy.moduleTitle,
    moduleDescriptions: copy.modules.map(([, body]) => body), workflowTitle: copy.workflowTitle,
    faqTitle, faq: copy.faq.map(([question, answer]) => ({ question, answer })),
    nextSteps: copy.links.map(part => typeof part === "string" ? { text: part } : { text: part[0], href: part[1] }),
    page: { title: copy.title, description: copy.description, modules: copy.modules.map(([title]) => title), workflow: entries(copy.workflow), details: entries(copy.details) },
  };
}
