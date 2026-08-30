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
      <EntitlementGate copy={entitlementCopy}>
        <JobsManager copy={messages.jobs} />
      </EntitlementGate>
    </section>
  );
}
