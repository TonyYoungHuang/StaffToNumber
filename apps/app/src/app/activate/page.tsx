import type { Metadata } from "next";
import { AuthShell } from "../../components/AuthShell";
import { ActivationForm } from "../../components/ActivationForm";
import { getAuthMessages } from "../../lib/auth-messages";
import { getBillingMessages } from "../../lib/billing-messages";
import { readAppLocale } from "../../lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readAppLocale();
  const { page } = getBillingMessages(locale).activation;
  return { title: page.title, description: page.description };
}

export default async function ActivatePage() {
  const locale = await readAppLocale();
  const shellCopy = getAuthMessages(locale).shell;
  const copy = getBillingMessages(locale);

  return (
    <AuthShell
      title={copy.activation.page.title}
      description={copy.activation.page.description}
      copy={shellCopy}
    >
      {copy.reviewNotice ? <p className="micro-copy">{copy.reviewNotice}</p> : null}
      <ActivationForm copy={copy.activation.form} />
    </AuthShell>
  );
}
