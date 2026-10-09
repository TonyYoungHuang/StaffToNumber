import Link from "next/link";
import { getFlowMessages } from "../../lib/flow-messages";
import { EntitlementGate } from "../../components/EntitlementGate";
import { JobsManager } from "../../components/JobsManager";
import { getAuthMessages } from "../../lib/auth-messages";
import { readAppLocale } from "../../lib/locale";
import { getWorkspaceMessages } from "../../lib/workspace-messages";

export default async function JobsPage() {
  const locale = await readAppLocale();
  const entitlementCopy = getAuthMessages(locale).entitlement;
  const messages = getWorkspaceMessages(locale);
  const copy = messages.pages.jobs;

  return (
    <section className="container page-shell">
      <div className="page-banner">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 className="page-title">{copy.title}</h1>
        <p className="body-copy large">{copy.body}</p>
      </div>
      <Link href="/scores" className="button button-primary">{getFlowMessages(locale).resume}</Link>
      <details className="flow-details"><summary>{getFlowMessages(locale).legacy}</summary>
        <EntitlementGate allowFreePreview copy={entitlementCopy}><JobsManager copy={messages.jobs} /></EntitlementGate>
      </details>
    </section>
  );
}
