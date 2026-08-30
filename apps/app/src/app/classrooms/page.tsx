import type { Metadata } from "next";
import { ClassroomsManager } from "../../components/ClassroomsManager";
import { EducationOperationsPanel } from "../../components/EducationOperationsPanel";
import { EducationOrganizationManager } from "../../components/EducationOrganizationManager";
import { EntitlementGate } from "../../components/EntitlementGate";
import { getAuthMessages } from "../../lib/auth-messages";
import { readAppLocale } from "../../lib/locale";
import { EducationMessagesProvider } from "../../lib/education-messages/client";
import { getEducationMessages } from "../../lib/education-messages";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readAppLocale();
  const copy = getEducationMessages(locale).pages.classrooms;
  return { title: copy.metadataTitle, description: copy.metadataDescription };
}

export default async function ClassroomsPage() {
  const locale = await readAppLocale();
  const messages = getEducationMessages(locale);
  const copy = messages.pages.classrooms;
  const entitlementCopy = getAuthMessages(locale).entitlement;
  return (
    <section className="container page-shell">
      <div className="page-banner">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 className="page-title">{copy.title}</h1>
        <p className="body-copy large">{copy.body}</p>
      </div>
      <EntitlementGate deniedMode="panel" copy={entitlementCopy}>
        <EducationMessagesProvider locale={locale} messages={messages}>
          <div className="page-stack"><EducationOrganizationManager /><ClassroomsManager /><EducationOperationsPanel /></div>
        </EducationMessagesProvider>
      </EntitlementGate>
    </section>
  );
}
