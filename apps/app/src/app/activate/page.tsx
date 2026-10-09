import type { Metadata } from "next";
import { AuthShell } from "../../components/AuthShell";
import { EntitlementGate } from "../../components/EntitlementGate";
import { ActivationForm } from "../../components/ActivationForm";
import { getAuthMessages } from "../../lib/auth-messages";
import { getBillingMessages } from "../../lib/billing-messages";
import { readAppLocale } from "../../lib/locale";
import { ShopActivation } from "../../components/ShopActivation";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readAppLocale();
  const { page } = getBillingMessages(locale).activation;
  return { title: page.title, description: page.description };
}

export default async function ActivatePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const locale = await readAppLocale();
  const shellCopy = getAuthMessages(locale).shell;
  const copy = getBillingMessages(locale);

  if (params.shop === "1") return <ShopActivation authCopy={getAuthMessages("zh-CN").form} activationCopy={getBillingMessages("zh-CN").activation.form} returnTo={typeof params.next === "string" ? params.next : undefined} />;

  return (
    <AuthShell
      title={copy.activation.page.title}
      description={copy.activation.page.description}
      copy={shellCopy}
    >
      {copy.reviewNotice ? <p className="micro-copy">{copy.reviewNotice}</p> : null}
      <EntitlementGate allowFreePreview copy={getAuthMessages(locale).entitlement}><ActivationForm copy={copy.activation.form} returnTo={typeof params.next === "string" ? params.next : undefined} /></EntitlementGate>
    </AuthShell>
  );
}
